// Privacy-safe answer counting (Story S15).
//
// What leaves the page, when a provider is switched on: an event NAME from a fixed list and, for two of the
// events, a LABEL that is an id from the question and flag catalog ("auto_liability=250_500", or a flag id).
// Nothing else: no identifier, no timestamp, no count of taps, no timings, no free text and no figure (the page
// has nothing to type; every answer is a pick from a closed list). The page sets no cookies and uses no browser
// storage (tests/ui/analytics.test.mjs scans the whole page for both).
//
// Two layers, both in this file:
//
//   1. A PURE core (jsc-testable): buildEvent / checkEvent (the allowlist), resolveProvider (the validated
//      settings), the per-provider call shapes, and createTracker (queue, dedupe, "only when loaded").
//   2. A thin DOM side: loadProviderScript, which adds ONE <script> element, from a fixed per-provider address,
//      and only when a provider is set; and startAnalytics, which wires the two together for a real page.
//
// This module never reaches for a global. The browser objects it needs (window, document) arrive in `env`, the
// way dom.mjs takes its elements, so it loads and runs unchanged under jsc and a test hands it fakes.
//
// With provider 'none' (the default, js/config.mjs) nothing is loaded, nothing is listened to and nothing is sent.
import { CATALOG } from '../overlap/data/catalog.mjs';
import { ANALYTICS_CONFIG } from '../config.mjs';

/** The only event names that can ever be sent. */
export const EVENT_NAMES = Object.freeze(['answer', 'flag_shown', 'list_copied', 'list_printed']);

/** The providers the page can talk to. 'none' is the default. */
export const PROVIDERS = Object.freeze(['none', 'plausible', 'fathom', 'zaraz']);

/**
 * The address of each provider's script. Fixed here on purpose: it is not read from js/config.mjs, so a typo
 * or an edited setting cannot make the page load some other script. Zaraz has none: Cloudflare adds it.
 */
export const PROVIDER_SCRIPTS = Object.freeze({
  plausible: 'https://plausible.io/js/script.js',
  fathom: 'https://cdn.usefathom.com/script.js',
  zaraz: null,
});

function deepFreeze(x) {
  if (x !== null && typeof x === 'object') {
    Object.freeze(x);
    for (const k of Object.keys(x)) deepFreeze(x[k]);
  }
  return x;
}

/**
 * The hosts public/_headers must allow once a provider is switched on (CSP directive -> sources). A test keeps
 * this, the table in docs/OPEN-ITEMS.md (S15-1), js/config.mjs and public/_headers in step. Plausible's entries
 * come from reading its script; Fathom's are a precaution (OPEN-ITEMS S15-1 says which part is unconfirmed);
 * Zaraz needs none because Cloudflare serves it from the site's own address.
 */
export const PROVIDER_CSP = deepFreeze({
  plausible: { 'script-src': ['https://plausible.io'], 'connect-src': ['https://plausible.io'] },
  fathom: { 'script-src': ['https://cdn.usefathom.com'], 'connect-src': ['https://cdn.usefathom.com'], 'img-src': ['https://cdn.usefathom.com'] },
  zaraz: {},
});

// ---------------------------------------------------------------------------------------------------------
// The allowlist
// ---------------------------------------------------------------------------------------------------------

const SNAKE_ID = /^[a-z0-9_]{1,64}$/;   // question and option ids
const KEBAB_ID = /^[a-z0-9-]{1,64}$/;   // flag ids

function isPlainObject(x) {
  if (x === null || typeof x !== 'object' || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

function hasExactlyKeys(obj, keys) {
  const own = Object.keys(obj);
  return own.length === keys.length && keys.every((k) => own.includes(k));
}

function findById(list, id) {
  if (!Array.isArray(list)) return null;
  for (const item of list) if (item && item.id === id) return item;
  return null;
}

function answerLabel(payload, catalog) {
  if (!isPlainObject(payload) || !hasExactlyKeys(payload, ['questionId', 'optionId'])) return null;
  const questionId = payload.questionId;
  const optionId = payload.optionId;
  // Strings in the shape of an id only: a typed figure (a number, or "500000"), a sentence or a name never passes.
  if (typeof questionId !== 'string' || typeof optionId !== 'string') return null;
  if (!SNAKE_ID.test(questionId) || !SNAKE_ID.test(optionId)) return null;
  const q = findById(catalog.questions, questionId);
  // Closed list only: a tick-one or tick-many question that offers a fixed set of options.
  if (!q || (q.type !== 'single' && q.type !== 'multi') || !Array.isArray(q.options) || q.options.length === 0) return null;
  const offered = q.options.some((o) => o && o.id === optionId) || (optionId === 'not_sure' && q.allowNotSure === true);
  return offered ? questionId + '=' + optionId : null;
}

function flagLabel(payload, catalog) {
  if (!isPlainObject(payload) || !hasExactlyKeys(payload, ['flagId'])) return null;
  const flagId = payload.flagId;
  if (typeof flagId !== 'string' || !KEBAB_ID.test(flagId)) return null;
  return findById(catalog.flags, flagId) ? flagId : null;
}

/**
 * Validates one event and returns `{ name, label }`, or null when it is not allowed. Never throws.
 *
 *   'answer'       payload { questionId, optionId }: both ids must exist in the catalog, the question must be a
 *                  closed list, and the option must be one of its options (or Not sure where it is offered).
 *                  label = "questionId=optionId".
 *   'flag_shown'   payload { flagId }: the id of a flag in the catalog. label = flagId.
 *   'list_copied'  no payload (undefined, null or {}). label = ''.
 *   'list_printed' no payload. label = ''.
 *
 * Anything else is refused: another name, a payload with extra keys (an identifier, a time, a count), an id the
 * catalog does not have, a number or a sentence where an id belongs. `catalog` defaults to the real catalog;
 * tests pass a fixture.
 */
export function buildEvent(name, payload, catalog) {
  try {
    const cat = catalog === undefined ? CATALOG : catalog;
    if (typeof name !== 'string' || !EVENT_NAMES.includes(name)) return null;
    let label;
    if (name === 'answer') label = answerLabel(payload, cat);
    else if (name === 'flag_shown') label = flagLabel(payload, cat);
    else label = payload === undefined || payload === null || (isPlainObject(payload) && Object.keys(payload).length === 0) ? '' : null;
    return label === null ? null : Object.freeze({ name, label });
  } catch (e) {
    return null;
  }
}

/**
 * Checks an event that is already in `{ name, label }` form (what track() receives): it must be exactly what
 * buildEvent would have produced for the same ids. Returns a fresh clean event, or null. Never throws.
 */
export function checkEvent(event, catalog) {
  try {
    if (!isPlainObject(event) || !hasExactlyKeys(event, ['name', 'label'])) return null;
    const name = event.name;
    const label = event.label;
    if (typeof name !== 'string' || typeof label !== 'string') return null;
    let payload;
    if (name === 'answer') {
      const i = label.indexOf('=');
      if (i < 1 || label.indexOf('=', i + 1) !== -1) return null;
      payload = { questionId: label.slice(0, i), optionId: label.slice(i + 1) };
    } else if (name === 'flag_shown') {
      payload = { flagId: label };
    } else {
      if (label !== '') return null;
      payload = undefined;
    }
    const built = buildEvent(name, payload, catalog);
    return built !== null && built.label === label ? built : null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Settings and provider calls
// ---------------------------------------------------------------------------------------------------------

const SITE_DOMAIN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i; // a bare host, no scheme, path or port
const FATHOM_SITE_ID = /^[A-Za-z0-9]{1,32}$/;

/**
 * Turns js/config.mjs into the settings the tracker uses: `{ provider, scriptUrl, attrs }`. Anything that is
 * not usable (an unknown provider, a missing or malformed site name) becomes provider 'none', so a wrong
 * setting means "count nothing", never "load something unexpected". Never throws.
 */
export function resolveProvider(config) {
  const none = { provider: 'none', scriptUrl: null, attrs: {} };
  try {
    if (!isPlainObject(config)) return none;
    if (config.provider === 'plausible') {
      const domain = isPlainObject(config.plausible) ? config.plausible.domain : undefined;
      return typeof domain === 'string' && SITE_DOMAIN.test(domain)
        ? { provider: 'plausible', scriptUrl: PROVIDER_SCRIPTS.plausible, attrs: { 'data-domain': domain } } : none;
    }
    if (config.provider === 'fathom') {
      const siteId = isPlainObject(config.fathom) ? config.fathom.siteId : undefined;
      return typeof siteId === 'string' && FATHOM_SITE_ID.test(siteId)
        ? { provider: 'fathom', scriptUrl: PROVIDER_SCRIPTS.fathom, attrs: { 'data-site': siteId } } : none;
    }
    if (config.provider === 'zaraz') return { provider: 'zaraz', scriptUrl: null, attrs: {} };
    return none;
  } catch (e) {
    return none;
  }
}

/** True when answers will be counted (a usable provider is set). The page's privacy line follows this. */
export function isCounting(config) {
  return resolveProvider(config).provider !== 'none';
}

// The provider's own function, read from the page at the moment of the call (never kept).
function apiOf(win) {
  return win ? { plausible: win.plausible, fathom: win.fathom, zaraz: win.zaraz } : {};
}

// One call per event, in each provider's own shape. `event` has already passed checkEvent. An event with no
// label is sent by name alone. Returns true when the provider's function was called.
function sendToProvider(provider, event, api) {
  try {
    const hasLabel = event.label !== '';
    if (provider === 'plausible') {
      if (typeof api.plausible !== 'function') return false;
      if (hasLabel) api.plausible(event.name, { props: { label: event.label } });
      else api.plausible(event.name);
      return true;
    }
    if (provider === 'fathom') {
      if (!api.fathom || typeof api.fathom.trackEvent !== 'function') return false;
      api.fathom.trackEvent(hasLabel ? event.name + ':' + event.label : event.name);
      return true;
    }
    if (provider === 'zaraz') {
      if (!api.zaraz || typeof api.zaraz.track !== 'function') return false;
      if (hasLabel) api.zaraz.track(event.name, { label: event.label });
      else api.zaraz.track(event.name);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------------
// The tracker
// ---------------------------------------------------------------------------------------------------------

const MAX_QUEUE = 100;

/**
 * The counter for one page. `opts` = { config, catalog, env: { window, document } }; each part defaults
 * (config.mjs, the real catalog, no browser).
 *
 *   tracker.counting      true when a usable provider is set
 *   tracker.provider      'none' | 'plausible' | 'fathom' | 'zaraz'
 *   tracker.start()       loads the provider's script (one <script> element) when there is one; a no-op for 'none'
 *   tracker.track(event)  event = { name, label }; re-checked against the catalog; returns true when it was sent
 *                         or queued until the script has loaded, false when nothing was sent
 *   tracker.emit(name, payload)  buildEvent then track
 *   tracker.reset()       forgets what was already counted (a new run of the wizard)
 *   tracker.state()       'off' | 'pending' | 'ready' | 'failed' (for tests and debugging)
 *
 * Rules: with provider 'none' every method does nothing. An event is passed to the provider only after its
 * script has loaded (Zaraz, which Cloudflare adds itself, is called when its function exists). The same event
 * is counted once per run, so tapping an answer twice, or reaching the action list twice, does not count twice
 * and the number of taps cannot be read from the counts. Nothing here throws.
 */
export function createTracker(opts) {
  const o = opts || {};
  const catalog = o.catalog === undefined ? CATALOG : o.catalog;
  const settings = resolveProvider(o.config === undefined ? ANALYTICS_CONFIG : o.config);
  const env = o.env || {};
  const sent = new Set();
  let queue = [];
  let started = false;
  let state = settings.provider === 'none' ? 'off' : (settings.scriptUrl === null ? 'ready' : 'pending');

  function dispatch(event) {
    return sendToProvider(settings.provider, event, apiOf(env.window));
  }
  function onLoad() {
    if (state !== 'pending') return;
    state = 'ready';
    const waiting = queue;
    queue = [];
    for (const event of waiting) dispatch(event);
  }
  function onError() {
    state = 'failed';
    queue = [];
  }

  const tracker = {
    provider: settings.provider,
    counting: settings.provider !== 'none',
    state() { return state; },
    start() {
      if (state !== 'pending' || started) return state;
      started = true;
      if (!loadProviderScript(env.document, settings, onLoad, onError)) onError();
      return state;
    },
    track(event) {
      try {
        const clean = checkEvent(event, catalog);
        if (clean === null || state === 'off' || state === 'failed') return false;
        const key = clean.name + ' ' + clean.label;
        if (sent.has(key)) return false;
        if (state === 'pending') {
          if (queue.length >= MAX_QUEUE) return false;
          sent.add(key);
          queue.push(clean);
          return true;
        }
        if (!dispatch(clean)) return false;
        sent.add(key);
        return true;
      } catch (e) {
        return false;
      }
    },
    emit(name, payload) {
      const event = buildEvent(name, payload, catalog);
      return event === null ? false : tracker.track(event);
    },
    reset() { sent.clear(); },
  };
  return tracker;
}

// ---------------------------------------------------------------------------------------------------------
// The DOM side
// ---------------------------------------------------------------------------------------------------------

/**
 * Adds the provider's script to the page: ONE <script> element, with the address fixed in PROVIDER_SCRIPTS and
 * only the one attribute that provider needs (data-domain or data-site). `doc` is the page's document. Returns
 * false (and adds nothing) when there is no script to load or the address is not one of the fixed ones.
 */
export function loadProviderScript(doc, settings, onLoad, onError) {
  try {
    if (!settings || typeof settings.scriptUrl !== 'string' || !doc || typeof doc.createElement !== 'function') return false;
    if (!Object.keys(PROVIDER_SCRIPTS).some((k) => PROVIDER_SCRIPTS[k] === settings.scriptUrl)) return false;
    const el = doc.createElement('script');
    el.src = settings.scriptUrl;
    el.defer = true;
    for (const k of Object.keys(settings.attrs)) el.setAttribute(k, settings.attrs[k]);
    el.onload = onLoad;
    el.onerror = onError;
    (doc.head || doc.documentElement).appendChild(el);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * A tracker for a real page: `env` is { window, document }. With provider 'none' (the default) it does nothing at
 * all: no element is added, nothing is listened to, nothing is sent.
 */
export function startAnalytics(env, config, catalog) {
  const tracker = createTracker({ env, config, catalog });
  tracker.start();
  return tracker;
}

// ---------------------------------------------------------------------------------------------------------
// Small helpers the page uses to decide WHEN to emit
// ---------------------------------------------------------------------------------------------------------

function holds(answers, questionId, optionId) {
  if (!isPlainObject(answers) || !Object.prototype.hasOwnProperty.call(answers, questionId)) return false;
  const v = answers[questionId];
  return v === optionId || (Array.isArray(v) && v.includes(optionId));
}

/**
 * True when the tap that turned overlap answers `before` into `after` SELECTED this option. Unticking an
 * option, or tapping the one already chosen, is not a new answer and is not counted.
 */
export function becameSelected(before, after, questionId, optionId) {
  return holds(after, questionId, optionId) && !holds(before, questionId, optionId);
}

/** The ids of the flags shown in an action list view-model (viewModel.mjs actionListViewModel), in order. */
export function flagIdsOf(vm) {
  const ids = [];
  if (!vm || !Array.isArray(vm.groups)) return ids;
  for (const g of vm.groups) {
    if (!g || !Array.isArray(g.items)) continue;
    for (const item of g.items) if (item && typeof item.id === 'string') ids.push(item.id);
  }
  return ids;
}
