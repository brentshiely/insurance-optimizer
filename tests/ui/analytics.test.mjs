// Tests for Story S15: privacy-safe analytics, the Content-Security-Policy and the page statements.
//
//   - public/js/overlap-ui/analytics.mjs : the allowlist (every way an event can be refused), labels only from
//     catalog ids, no free text or figures, bands only for adequacy and cushion, provider 'none' sends nothing,
//     each provider's call shape (with fake provider functions), the settings default, the tracker's rules.
//   - Source scans over everything the page loads: no network calls, no storage, no cookies, no extra resources.
//   - public/_headers : the CSP for the default setup has no third-party host, the provider table covers all
//     three providers, and the file, js/config.mjs and the table in docs/OPEN-ITEMS.md agree.
//   - The wording of the privacy line and the not-advice note, and where the page uses them.
//
// Everything runs under jsc. Tests that read files are skipped where read() does not exist (Node).
import { suite, assert } from '../harness.mjs';
import {
  EVENT_NAMES, PROVIDERS, PROVIDER_SCRIPTS, PROVIDER_CSP, buildEvent, checkEvent, resolveProvider, isCounting,
  createTracker, startAnalytics, loadProviderScript, becameSelected, flagIdsOf,
} from '../../public/js/overlap-ui/analytics.mjs';
import { ANALYTICS_CONFIG } from '../../public/js/config.mjs';
import {
  esc, privacyLine, entryNoteHtml, actionListHtml, actionListErrorHtml, PRIVACY_LINE, PRIVACY_LINE_NONE,
  PRIVACY_LINE_COUNTING, ENTRY_NOTE,
} from '../../public/js/overlap-ui/screens.mjs';
import { actionListViewModel } from '../../public/js/overlap-ui/viewModel.mjs';
import { CATALOG } from '../../public/js/overlap/data/catalog.mjs';
import FIXTURE from '../fixtures/catalog.mjs';
import scenarios from '../browser/scenarios.mjs';
import { codeOnly, importsOf, resolveSpec } from '../helpers/sourceScan.mjs';

const canRead = typeof read === 'function';
const ANALYTICS_PATH = 'public/js/overlap-ui/analytics.mjs';

// ---------------------------------------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------------------------------------
function fakeWindow() {
  const calls = [];
  return {
    calls,
    plausible: (...args) => { calls.push(['plausible', args]); },
    fathom: { trackEvent: (...args) => { calls.push(['fathom.trackEvent', args]); } },
    zaraz: { track: (...args) => { calls.push(['zaraz.track', args]); } },
  };
}

function fakeDocument() {
  const created = [];
  const appended = [];
  return {
    created,
    appended,
    head: { appendChild(el) { appended.push(el); return el; } },
    createElement(tag) {
      const el = { tag, attrs: {}, setAttribute(k, v) { el.attrs[k] = String(v); } };
      created.push(el);
      return el;
    },
  };
}

const PLAUSIBLE_CFG = { provider: 'plausible', plausible: { domain: 'example.com' }, fathom: { siteId: '' }, zaraz: {} };
const FATHOM_CFG = { provider: 'fathom', plausible: { domain: '' }, fathom: { siteId: 'ABCDEFGH' }, zaraz: {} };
const ZARAZ_CFG = { provider: 'zaraz', plausible: { domain: '' }, fathom: { siteId: '' }, zaraz: {} };
const NONE_CFG = { provider: 'none', plausible: { domain: 'example.com' }, fathom: { siteId: 'ABCDEFGH' }, zaraz: {} };

const ANSWER = { questionId: 'auto_liability', optionId: '250_500' };
const FIX_ANSWER = { questionId: 'auto_liability', optionId: '250_500' };   // the fixture catalog has this one too

/** A tracker on a fake page; the real catalog. */
function trackerFor(config, catalog) {
  const win = fakeWindow();
  const doc = fakeDocument();
  const tracker = createTracker({ config, catalog, env: { window: win, document: doc } });
  return { tracker, win, doc };
}

// ---------------------------------------------------------------------------------------------------------
suite('analytics: the module is pure (no globals, no network, no storage)', (t) => {
  t('no DOM, Node, storage, timer, network or nondeterministic global in the code (the browser arrives in env)', () => {
    if (!canRead) return;
    const code = codeOnly(read(ANALYTICS_PATH), false);
    const bare = /(^|[^.\w$])(window|document|navigator|location|history|localStorage|sessionStorage|indexedDB|process|require|Buffer|URL|URLSearchParams|console|setTimeout|setInterval|setImmediate|queueMicrotask|requestAnimationFrame|structuredClone|fetch|XMLHttpRequest|WebSocket|EventSource|globalThis|Intl|Date|performance|eval|Function)\b|Math\.random|\bimport\s*\(|\bnew\s+(Image|Audio)\b|sendBeacon|document\.cookie/;
    const m = bare.exec(code);
    assert.equal(m, null, m ? `forbidden "${m[0].trim()}" in ${ANALYTICS_PATH}` : '');
  });

  t('imports only the catalog and the site settings', () => {
    if (!canRead) return;
    assert.deepEqual(importsOf(read(ANALYTICS_PATH)), ['../overlap/data/catalog.mjs', '../config.mjs']);
  });

  t('loads and runs under jsc with no browser at all (a tracker with no env still works and sends nothing)', () => {
    const tracker = createTracker({ config: PLAUSIBLE_CFG });
    assert.equal(tracker.start(), 'failed', 'no document, so the script cannot be added');
    assert.equal(tracker.emit('list_copied'), false);
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('analytics: the settings default to "none"', (t) => {
  t('js/config.mjs is plain data whose provider is none', () => {
    assert.equal(ANALYTICS_CONFIG.provider, 'none');
    assert.deepEqual(Object.keys(ANALYTICS_CONFIG).sort(), ['fathom', 'plausible', 'provider', 'zaraz']);
    assert.equal(ANALYTICS_CONFIG.plausible.domain, '');
    assert.equal(ANALYTICS_CONFIG.fathom.siteId, '');
    assert.equal(JSON.stringify(JSON.parse(JSON.stringify(ANALYTICS_CONFIG))), JSON.stringify(ANALYTICS_CONFIG), 'plain JSON data');
    assert.equal(PROVIDERS.includes(ANALYTICS_CONFIG.provider), true);
  });

  t('the default settings resolve to no provider: nothing to load, nothing counted', () => {
    assert.deepEqual(resolveProvider(ANALYTICS_CONFIG), { provider: 'none', scriptUrl: null, attrs: {} });
    assert.equal(isCounting(ANALYTICS_CONFIG), false);
  });

  t('the provider list is none plus the three providers the spec allows, each with a fixed script entry', () => {
    assert.deepEqual(Array.from(PROVIDERS), ['none', 'plausible', 'fathom', 'zaraz']);
    assert.deepEqual(Object.keys(PROVIDER_SCRIPTS).sort(), ['fathom', 'plausible', 'zaraz']);
    assert.equal(PROVIDER_SCRIPTS.zaraz, null, 'Cloudflare adds the Zaraz script; the page loads none');
    assert.match(PROVIDER_SCRIPTS.plausible, /^https:\/\/plausible\.io\//);
    assert.match(PROVIDER_SCRIPTS.fathom, /^https:\/\/cdn\.usefathom\.com\//);
  });

  t('good settings resolve to the provider, its fixed script address and its one attribute', () => {
    assert.deepEqual(resolveProvider(PLAUSIBLE_CFG), { provider: 'plausible', scriptUrl: PROVIDER_SCRIPTS.plausible, attrs: { 'data-domain': 'example.com' } });
    assert.deepEqual(resolveProvider(FATHOM_CFG), { provider: 'fathom', scriptUrl: PROVIDER_SCRIPTS.fathom, attrs: { 'data-site': 'ABCDEFGH' } });
    assert.deepEqual(resolveProvider(ZARAZ_CFG), { provider: 'zaraz', scriptUrl: null, attrs: {} });
    assert.deepEqual(resolveProvider(NONE_CFG), { provider: 'none', scriptUrl: null, attrs: {} });
    for (const cfg of [PLAUSIBLE_CFG, FATHOM_CFG, ZARAZ_CFG]) assert.equal(isCounting(cfg), true);
  });

  t('unusable settings fail closed to "none" (an unknown provider, a missing or malformed site name)', () => {
    const bad = [
      undefined, null, 'plausible', 42, [], {}, { provider: 'Plausible' }, { provider: 'google' }, { provider: 'plausible' },
      { provider: 'plausible', plausible: {} }, { provider: 'plausible', plausible: { domain: '' } },
      { provider: 'plausible', plausible: { domain: 'https://example.com' } },
      { provider: 'plausible', plausible: { domain: 'example.com/path' } },
      { provider: 'plausible', plausible: { domain: 'example.com:8080' } },
      { provider: 'plausible', plausible: { domain: 'exa mple.com' } },
      { provider: 'plausible', plausible: { domain: 'localhost' } },
      { provider: 'plausible', plausible: { domain: 'example.com"><script>' } },
      { provider: 'plausible', plausible: { domain: 42 } },
      { provider: 'fathom' }, { provider: 'fathom', fathom: { siteId: '' } }, { provider: 'fathom', fathom: { siteId: 'AB CD' } },
      { provider: 'fathom', fathom: { siteId: '"><script>' } }, { provider: 'fathom', fathom: { siteId: 7 } },
    ];
    for (const cfg of bad) {
      assert.deepEqual(resolveProvider(cfg), { provider: 'none', scriptUrl: null, attrs: {} }, JSON.stringify(cfg));
      assert.equal(isCounting(cfg), false);
    }
  });

  t('the script address is never taken from the settings', () => {
    const sneaky = { provider: 'plausible', scriptUrl: 'https://evil.example/x.js', plausible: { domain: 'example.com', scriptUrl: 'https://evil.example/y.js', src: 'https://evil.example/z.js' } };
    assert.equal(resolveProvider(sneaky).scriptUrl, PROVIDER_SCRIPTS.plausible);
    const doc = fakeDocument();
    assert.equal(loadProviderScript(doc, { scriptUrl: 'https://evil.example/x.js', attrs: {} }, () => {}, () => {}), false);
    assert.equal(loadProviderScript(doc, { scriptUrl: 'http://plausible.io/js/script.js', attrs: {} }, () => {}, () => {}), false);
    assert.equal(doc.created.length, 0, 'nothing was added to the page');
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('analytics: buildEvent allowlist (fixture catalog)', (t) => {
  const FX = FIXTURE;

  t('the four allowed names, and only those', () => {
    assert.deepEqual(Array.from(EVENT_NAMES), ['answer', 'flag_shown', 'list_copied', 'list_printed']);
  });

  t('an answer needs a question and one of its options; the label is "questionId=optionId"', () => {
    assert.deepEqual(buildEvent('answer', { questionId: 'auto_liability', optionId: '250_500' }, FX), { name: 'answer', label: 'auto_liability=250_500' });
    assert.deepEqual(buildEvent('answer', { questionId: 'supplements', optionId: 'accident' }, FX), { name: 'answer', label: 'supplements=accident' }, 'a tick-many question');
    assert.deepEqual(buildEvent('answer', { questionId: 'assets_band', optionId: 'over_1m' }, FX), { name: 'answer', label: 'assets_band=over_1m' }, 'a band');
  });

  t('Not sure is accepted only where the question offers it', () => {
    assert.deepEqual(buildEvent('answer', { questionId: 'auto_liability', optionId: 'not_sure' }, FX), { name: 'answer', label: 'auto_liability=not_sure' });
    assert.equal(buildEvent('answer', { questionId: 'umbrella_um_detail', optionId: 'not_sure' }, FX), null, 'allowNotSure is false there');
    assert.equal(buildEvent('answer', { questionId: 'cards', optionId: 'not_sure' }, FX), null);
  });

  t('a flag needs an id the catalog has; the label is the flag id', () => {
    assert.deepEqual(buildEvent('flag_shown', { flagId: 'umbrella-home-below-min' }, FX), { name: 'flag_shown', label: 'umbrella-home-below-min' });
    assert.deepEqual(buildEvent('flag_shown', { flagId: 'never-applies' }, FX), { name: 'flag_shown', label: 'never-applies' }, 'validity is about the catalog; whether it applies is not this module\'s business');
  });

  t('Copy and Print carry no payload and no label', () => {
    for (const name of ['list_copied', 'list_printed']) {
      for (const payload of [undefined, null, {}]) assert.deepEqual(buildEvent(name, payload, FX), { name, label: '' }, name);
    }
  });

  t('refuses every name that is not allowed', () => {
    const names = ['', 'click', 'pageview', 'ANSWER', 'Answer', ' answer', 'answer ', 'answers', 'flag-shown', 'flagShown', 'list_copy', 'list_copied2',
      '__proto__', 'constructor', 'toString', 'hasOwnProperty', 'answer\n', 'answer=x', 123, null, undefined, {}, [], ['answer'], true, () => 'answer'];
    for (const n of names) assert.equal(buildEvent(n, ANSWER, FX), null, String(typeof n === 'function' ? 'function' : JSON.stringify(n)));
    assert.equal(buildEvent(undefined, undefined, FX), null);
  });

  t('refuses an answer payload that is not exactly { questionId, optionId }', () => {
    const bad = [
      undefined, null, 'auto_liability=250_500', 42, true, [], [ 'auto_liability', '250_500' ], () => ({}),
      {}, { questionId: 'auto_liability' }, { optionId: '250_500' },
      { questionId: 'auto_liability', optionId: '250_500', userId: 'abc' },
      { questionId: 'auto_liability', optionId: '250_500', ts: 1760000000000 },
      { questionId: 'auto_liability', optionId: '250_500', taps: 7 },
      { questionId: 'auto_liability', optionId: '250_500', label: 'extra' },
      { questionId: 'auto_liability', optionId: '250_500', comment: 'my dog Rex' },
      { question: 'auto_liability', option: '250_500' }, { questionId: 'auto_liability', option: '250_500' },
    ];
    for (const p of bad) assert.equal(buildEvent('answer', p, FX), null, JSON.stringify(p));
  });

  t('refuses ids that are not strings (a number is never an option id)', () => {
    const bad = [
      { questionId: 250, optionId: '250_500' }, { questionId: 'auto_liability', optionId: 250500 },
      { questionId: 'auto_liability', optionId: 500000 }, { questionId: 'home_liability', optionId: 300000 },
      { questionId: null, optionId: '250_500' }, { questionId: 'auto_liability', optionId: null },
      { questionId: ['auto_liability'], optionId: '250_500' }, { questionId: 'auto_liability', optionId: ['250_500'] },
      { questionId: { id: 'auto_liability' }, optionId: '250_500' }, { questionId: 'auto_liability', optionId: { id: '250_500' } },
      { questionId: 'auto_liability', optionId: true }, { questionId: 'auto_liability', optionId: undefined },
    ];
    for (const p of bad) assert.equal(buildEvent('answer', p, FX), null, JSON.stringify(p));
  });

  t('refuses ids the catalog does not have, and an option that belongs to another question', () => {
    const bad = [
      { questionId: 'nope', optionId: '250_500' }, { questionId: 'auto_liability', optionId: 'nope' },
      { questionId: 'auto_liability', optionId: '1m' }, { questionId: 'umbrella_limit', optionId: '250_500' },
      { questionId: 'auto_liability', optionId: '' }, { questionId: '', optionId: '250_500' },
      { questionId: 'constructor', optionId: 'x' }, { questionId: '__proto__', optionId: 'x' },
      { questionId: 'length', optionId: '0' }, { questionId: 'umbrella_limit', optionId: 'constructor' },
      { questionId: 'auto_liability', optionId: 'toString' },
    ];
    for (const p of bad) assert.equal(buildEvent('answer', p, FX), null, JSON.stringify(p));
  });

  t('refuses free text: anything that is not an id in the catalog, whatever it looks like', () => {
    const bad = [
      'my dog Rex', 'Rex', 'I pay $140 a month', 'jane@example.com', '555-123-4567', '123 Main St', 'Jane Doe',
      '250/500', '250 500', '250_500 ', ' 250_500', '250_500\n', '250_500;drop', '250-500', '<script>', '250_500=1',
      'AUTO_LIABILITY', '250_500'.repeat(30), 'é',
    ];
    for (const text of bad) {
      assert.equal(buildEvent('answer', { questionId: 'auto_liability', optionId: text }, FX), null, 'option ' + JSON.stringify(text));
      assert.equal(buildEvent('answer', { questionId: text, optionId: '250_500' }, FX), null, 'question ' + JSON.stringify(text));
      assert.equal(buildEvent('flag_shown', { flagId: text }, FX), null, 'flag ' + JSON.stringify(text));
    }
  });

  t('refuses typed figures, in every shape', () => {
    const figures = ['500000', '1000000', '2500000', '1,000,000', '$300,000', '487233', '0', '12.5', '-1', 300000, 1e6];
    for (const f of figures) {
      for (const qid of ['home_liability', 'assets_band', 'umbrella_limit']) {
        assert.equal(buildEvent('answer', { questionId: qid, optionId: f }, FX), null, qid + ' ' + f);
      }
    }
    assert.equal(buildEvent('answer', { questionId: 'assets_band', optionId: 'over_1m', amount: 2500000 }, FX), null, 'a figure as an extra key');
    assert.equal(buildEvent('answer', { questionId: 'assets_band', optionId: 'over_1m', value: 2500000 }, FX), null);
  });

  t('refuses a question that is not a closed list (no options, wrong type)', () => {
    const odd = {
      questions: [
        { id: 'free_text', type: 'text', options: [{ id: 'x' }], allowNotSure: true },
        { id: 'no_options', type: 'single', options: [], allowNotSure: true },
        { id: 'missing_options', type: 'single' },
        { id: 'typeless', options: [{ id: 'x' }] },
        { id: 'fine', type: 'single', options: [{ id: 'x' }], allowNotSure: false },
      ],
      flags: [],
    };
    for (const qid of ['free_text', 'no_options', 'missing_options', 'typeless']) {
      assert.equal(buildEvent('answer', { questionId: qid, optionId: 'x' }, odd), null, qid);
      assert.equal(buildEvent('answer', { questionId: qid, optionId: 'not_sure' }, odd), null, qid + ' not sure');
    }
    assert.deepEqual(buildEvent('answer', { questionId: 'fine', optionId: 'x' }, odd), { name: 'answer', label: 'fine=x' });
    assert.equal(buildEvent('answer', { questionId: 'fine', optionId: 'not_sure' }, odd), null);
  });

  t('even an entry that IS in the catalog is refused when its id is not a plain id (free text cannot get in through a bad catalog)', () => {
    const messy = {
      questions: [
        { id: 'Free Text', type: 'single', options: [{ id: 'x' }], allowNotSure: false },
        { id: 'fine', type: 'single', options: [{ id: 'Rex the dog' }, { id: '$500,000' }, { id: '500000.5' }, { id: 'ok' }], allowNotSure: false },
      ],
      flags: [{ id: 'Flag One' }, { id: 'flag_underscore' }, { id: 'fine-flag' }],
    };
    assert.equal(buildEvent('answer', { questionId: 'Free Text', optionId: 'x' }, messy), null);
    for (const oid of ['Rex the dog', '$500,000', '500000.5']) assert.equal(buildEvent('answer', { questionId: 'fine', optionId: oid }, messy), null, oid);
    assert.deepEqual(buildEvent('answer', { questionId: 'fine', optionId: 'ok' }, messy), { name: 'answer', label: 'fine=ok' });
    for (const id of ['Flag One', 'flag_underscore']) assert.equal(buildEvent('flag_shown', { flagId: id }, messy), null, id);
    assert.deepEqual(buildEvent('flag_shown', { flagId: 'fine-flag' }, messy), { name: 'flag_shown', label: 'fine-flag' });
  });

  t('refuses a flag payload that is not exactly { flagId }, and an id the catalog does not have', () => {
    const bad = [
      undefined, null, 'umbrella-home-below-min', [], {}, { flagId: 'umbrella-home-below-min', extra: 1 },
      { flagId: 'umbrella-home-below-min', ts: 1 }, { flagId: 'nope' }, { flagId: '' }, { flagId: 5 }, { flagId: null },
      { flagId: ['umbrella-home-below-min'] }, { flagId: 'auto_liability' }, { flagId: 'umbrella_home_below_min' },
      { flagId: 'Umbrella-Home-Below-Min' }, { flagId: 'umbrella-home-below-min ' }, { id: 'umbrella-home-below-min' },
      { flagId: 'constructor' }, { flagId: '__proto__' },
    ];
    for (const p of bad) assert.equal(buildEvent('flag_shown', p, FX), null, JSON.stringify(p));
  });

  t('refuses a payload on Copy and Print (an identifier, a count, a time, text)', () => {
    const bad = [{ id: 'x' }, { count: 3 }, { items: 3 }, { ts: 1 }, { label: 'x' }, 'x', '', 0, 3, true, false, [], [1], ['x'], () => ({})];
    for (const name of ['list_copied', 'list_printed']) {
      for (const p of bad) assert.equal(buildEvent(name, p, FX), null, name + ' ' + (typeof p === 'function' ? 'function' : JSON.stringify(p)));
    }
  });

  t('refuses objects that are not plain (a class instance, a null-prototype object with extra keys, symbols as keys do not count)', () => {
    class Payload { constructor() { this.questionId = 'auto_liability'; this.optionId = '250_500'; } }
    assert.equal(buildEvent('answer', new Payload(), FX), null, 'a class instance');
    const o = Object.create(null);
    o.questionId = 'auto_liability';
    o.optionId = '250_500';
    assert.deepEqual(buildEvent('answer', o, FX), { name: 'answer', label: 'auto_liability=250_500' }, 'a null-prototype object with exactly the keys is plain data');
    o.extra = 1;
    assert.equal(buildEvent('answer', o, FX), null);
  });

  t('never throws, whatever it is given (a bad catalog, a payload with a throwing getter)', () => {
    const trap = {};
    Object.defineProperty(trap, 'questionId', { enumerable: true, get() { throw new Error('boom'); } });
    Object.defineProperty(trap, 'optionId', { enumerable: true, value: '250_500' });
    assert.equal(buildEvent('answer', trap, FX), null);
    for (const cat of [null, 5, 'x', [], {}, { questions: 'x', flags: 'y' }, { questions: [null, 5], flags: [null, 5] }, { questions: [{ id: 'auto_liability', type: 'single', options: [null, 5] }] }]) {
      assert.equal(buildEvent('answer', ANSWER, cat), null);
      assert.equal(buildEvent('flag_shown', { flagId: 'umbrella-home-below-min' }, cat), null);
    }
  });

  t('the result is frozen and a fresh object each time', () => {
    const a = buildEvent('answer', FIX_ANSWER, FX);
    const b = buildEvent('answer', FIX_ANSWER, FX);
    assert.equal(Object.isFrozen(a), true);
    assert.notEqual(a, b);
    assert.deepEqual(a, b);
  });

  t('defaults to the real catalog when none is passed', () => {
    assert.deepEqual(buildEvent('answer', ANSWER), { name: 'answer', label: 'auto_liability=250_500' });
    assert.equal(buildEvent('answer', { questionId: 'supplements', optionId: 'accident' }), null, 'a fixture-only question');
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('analytics: labels come only from the real catalog\'s ids', (t) => {
  const QUESTION_ID = /^[a-z0-9_]+$/;
  const FLAG_ID = /^[a-z0-9-]+$/;

  t('every option of every question (and Not sure where offered) gives exactly "questionId=optionId"', () => {
    let seen = 0;
    for (const q of CATALOG.questions) {
      const ids = q.options.map((o) => o.id).concat(q.allowNotSure ? ['not_sure'] : []);
      for (const oid of ids) {
        const e = buildEvent('answer', { questionId: q.id, optionId: oid });
        assert.deepEqual(e, { name: 'answer', label: q.id + '=' + oid }, q.id + ' ' + oid);
        assert.equal(QUESTION_ID.test(q.id) && QUESTION_ID.test(oid), true, 'ids are plain snake_case: ' + q.id + '=' + oid);
        assert.equal(e.label.split('=').length, 2, 'one "=" only');
        seen += 1;
      }
    }
    assert.equal(seen > 150, true, 'covered ' + seen + ' question and option pairs');
  });

  t('Not sure is refused on every question that does not offer it', () => {
    let seen = 0;
    for (const q of CATALOG.questions) {
      if (q.allowNotSure) continue;
      assert.equal(buildEvent('answer', { questionId: q.id, optionId: 'not_sure' }), null, q.id);
      seen += 1;
    }
    assert.equal(seen > 0, true);
  });

  t('an option of one question is refused on every other question that lacks it', () => {
    const own = new Map(CATALOG.questions.map((q) => [q.id, new Set(q.options.map((o) => o.id))]));
    const everyOption = Array.from(new Set(CATALOG.questions.flatMap((q) => q.options.map((o) => o.id))));
    for (const q of CATALOG.questions) {
      for (const oid of everyOption) {
        if (own.get(q.id).has(oid)) continue;
        assert.equal(buildEvent('answer', { questionId: q.id, optionId: oid }), null, q.id + '=' + oid);
      }
    }
  });

  t('every flag id gives exactly that id as the label', () => {
    assert.equal(CATALOG.flags.length > 0, true);
    for (const f of CATALOG.flags) {
      assert.deepEqual(buildEvent('flag_shown', { flagId: f.id }), { name: 'flag_shown', label: f.id }, f.id);
      assert.equal(FLAG_ID.test(f.id), true, 'flag ids are plain kebab-case: ' + f.id);
    }
  });

  t('a question id is never a flag id and a flag id is never a question id, so a label cannot be misread', () => {
    const q = new Set(CATALOG.questions.map((x) => x.id));
    for (const f of CATALOG.flags) assert.equal(q.has(f.id), false, f.id);
  });

  t('adequacy and deductible/cushion answers are bands: every option is a { min, max } range and only its id can be sent', () => {
    const bandQuestions = ['umbrella_exposure', 'emergency_cushion', 'deductible_auto', 'deductible_home', 'deductible_health'];
    for (const qid of bandQuestions) {
      const q = CATALOG.questions.find((x) => x.id === qid);
      assert.ok(q, qid + ' exists');
      for (const o of q.options) {
        assert.deepEqual(Object.keys(o.value).sort(), ['max', 'min'], qid + ' ' + o.id + ' is a band');
        const e = buildEvent('answer', { questionId: qid, optionId: o.id });
        assert.equal(e.label, qid + '=' + o.id, 'the label is the band\'s id, as the catalog names it');
        assert.equal(/^[a-z0-9_]+=[a-z0-9_]+$/.test(e.label), true);
      }
      // a typed figure for the same question is refused, as an id, a number, or an extra key
      for (const figure of ['2500000', '750', '12000', 2500000, 750]) {
        assert.equal(buildEvent('answer', { questionId: qid, optionId: figure }), null, qid + ' ' + figure);
      }
      assert.equal(buildEvent('answer', { questionId: qid, optionId: q.options[0].id, amount: 750 }), null);
    }
  });

  t('the host app\'s own screens are not in the catalog, so none of their fields can be named', () => {
    for (const hostField of ['state', 'liability', 'premium', 'deductible', 'dwelling', 'hasUmbrella', 'home', 'veh', 'dep', 'assets300', 'health', 'cushion']) {
      for (const text of ['Yes', 'No', 'Own', '3+', 'CA', '5000', '250000']) {
        assert.equal(buildEvent('answer', { questionId: hostField, optionId: text }), null, hostField + '=' + text);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('analytics: checkEvent re-validates an event in { name, label } form', (t) => {
  const FX = FIXTURE;

  t('accepts exactly what buildEvent produces, as a fresh equal object', () => {
    const cases = [
      ['answer', { questionId: 'auto_liability', optionId: '250_500' }], ['answer', { questionId: 'auto_liability', optionId: 'not_sure' }],
      ['flag_shown', { flagId: 'umbrella-home-below-min' }], ['list_copied', undefined], ['list_printed', undefined],
    ];
    for (const [name, payload] of cases) {
      const built = buildEvent(name, payload, FX);
      const checked = checkEvent({ name: built.name, label: built.label }, FX);
      assert.deepEqual(checked, built);
      assert.notEqual(checked, null);
    }
  });

  t('refuses anything else: other names, labels not from the catalog, free text, extra keys', () => {
    const bad = [
      undefined, null, 'answer', [], {}, { name: 'answer' }, { label: 'x' }, { name: 'answer', label: '' },
      { name: 'answer', label: 'auto_liability' }, { name: 'answer', label: '=250_500' }, { name: 'answer', label: 'auto_liability=' },
      { name: 'answer', label: 'auto_liability=250_500=1' }, { name: 'answer', label: 'auto_liability=250_500 ' },
      { name: 'answer', label: 'auto_liability=my dog Rex' }, { name: 'answer', label: 'auto_liability=500000' },
      { name: 'answer', label: 'nope=250_500' }, { name: 'answer', label: 'umbrella_limit=250_500' },
      { name: 'answer', label: 42 }, { name: 42, label: 'x' }, { name: 'click', label: 'x' }, { name: 'pageview', label: '' },
      { name: 'flag_shown', label: 'nope' }, { name: 'flag_shown', label: 'auto_liability=250_500' }, { name: 'flag_shown', label: '' },
      { name: 'list_copied', label: 'x' }, { name: 'list_printed', label: '1' },
      { name: 'answer', label: 'auto_liability=250_500', userId: 'abc' }, { name: 'answer', label: 'auto_liability=250_500', ts: 1 },
      { name: 'list_copied', label: '', count: 2 },
    ];
    for (const e of bad) assert.equal(checkEvent(e, FX), null, JSON.stringify(e));
  });

  t('never throws', () => {
    assert.equal(checkEvent({ name: 'answer', label: 'x' }, null), null);
    const trap = {};
    Object.defineProperty(trap, 'name', { enumerable: true, get() { throw new Error('boom'); } });
    Object.defineProperty(trap, 'label', { enumerable: true, value: '' });
    assert.equal(checkEvent(trap, FX), null);
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('analytics: provider "none" sends nothing and loads nothing', (t) => {
  t('with every fake provider present on the page, a full run of valid events calls none of them', () => {
    const { tracker, win, doc } = trackerFor(NONE_CFG);
    assert.equal(tracker.provider, 'none');
    assert.equal(tracker.counting, false);
    assert.equal(tracker.state(), 'off');
    assert.equal(tracker.start(), 'off');
    const sent = [
      tracker.emit('answer', ANSWER), tracker.emit('flag_shown', { flagId: CATALOG.flags[0].id }),
      tracker.emit('list_copied'), tracker.emit('list_printed'),
      tracker.track({ name: 'answer', label: 'auto_liability=250_500' }),
    ];
    assert.deepEqual(sent, [false, false, false, false, false]);
    assert.deepEqual(win.calls, []);
    assert.equal(doc.created.length, 0, 'no script element');
    assert.equal(doc.appended.length, 0);
  });

  t('the default setup does the same through startAnalytics (the call the page makes)', () => {
    const win = fakeWindow();
    const doc = fakeDocument();
    const tracker = startAnalytics({ window: win, document: doc });
    assert.equal(tracker.counting, false);
    assert.equal(tracker.emit('list_printed'), false);
    assert.deepEqual(win.calls, []);
    assert.equal(doc.created.length, 0);
  });

  t('an unusable provider setting behaves exactly like "none"', () => {
    for (const cfg of [{ provider: 'plausible' }, { provider: 'fathom', fathom: { siteId: '' } }, { provider: 'bogus' }, null]) {
      const { tracker, win, doc } = trackerFor(cfg);
      assert.equal(tracker.start(), 'off');
      assert.equal(tracker.emit('list_copied'), false);
      assert.deepEqual(win.calls, []);
      assert.equal(doc.created.length, 0);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('analytics: each provider\'s call shape (fake provider functions)', (t) => {
  const FLAG = CATALOG.flags[0].id;

  t('Plausible: one deferred script with data-domain, nothing sent until it has loaded, then plausible(name, { props: { label } })', () => {
    const { tracker, win, doc } = trackerFor(PLAUSIBLE_CFG);
    assert.equal(tracker.provider, 'plausible');
    assert.equal(tracker.counting, true);
    assert.equal(tracker.state(), 'pending');
    assert.equal(doc.created.length, 0, 'creating a tracker adds nothing; start() does');
    assert.equal(tracker.start(), 'pending');
    assert.equal(doc.created.length, 1);
    assert.equal(doc.appended.length, 1);
    const el = doc.created[0];
    assert.equal(el.tag, 'script');
    assert.equal(el.src, PROVIDER_SCRIPTS.plausible);
    assert.equal(el.defer, true);
    assert.deepEqual(el.attrs, { 'data-domain': 'example.com' });
    assert.equal(tracker.start(), 'pending', 'a second start adds no second script');
    assert.equal(doc.created.length, 1);

    assert.equal(tracker.emit('answer', ANSWER), true, 'queued');
    assert.equal(tracker.emit('list_copied'), true);
    assert.deepEqual(win.calls, [], 'the script has not loaded, so nothing is sent yet');

    el.onload();
    assert.equal(tracker.state(), 'ready');
    assert.deepEqual(win.calls, [
      ['plausible', ['answer', { props: { label: 'auto_liability=250_500' } }]],
      ['plausible', ['list_copied']],
    ]);

    assert.equal(tracker.emit('flag_shown', { flagId: FLAG }), true);
    assert.deepEqual(win.calls[2], ['plausible', ['flag_shown', { props: { label: FLAG } }]]);
    assert.equal(win.calls.length, 3);
  });

  t('Fathom: one deferred script with data-site, then fathom.trackEvent("name:label")', () => {
    const { tracker, win, doc } = trackerFor(FATHOM_CFG);
    tracker.start();
    const el = doc.created[0];
    assert.equal(el.src, PROVIDER_SCRIPTS.fathom);
    assert.equal(el.defer, true);
    assert.deepEqual(el.attrs, { 'data-site': 'ABCDEFGH' });
    assert.equal(tracker.emit('answer', ANSWER), true);
    assert.deepEqual(win.calls, []);
    el.onload();
    assert.deepEqual(win.calls, [['fathom.trackEvent', ['answer:auto_liability=250_500']]]);
    tracker.emit('list_printed');
    assert.deepEqual(win.calls[1], ['fathom.trackEvent', ['list_printed']]);
    tracker.emit('flag_shown', { flagId: FLAG });
    assert.deepEqual(win.calls[2], ['fathom.trackEvent', ['flag_shown:' + FLAG]]);
  });

  t('Zaraz: no script is loaded (Cloudflare adds it); zaraz.track(name, { label }) is called when it exists', () => {
    const { tracker, win, doc } = trackerFor(ZARAZ_CFG);
    assert.equal(tracker.state(), 'ready');
    assert.equal(tracker.start(), 'ready');
    assert.equal(doc.created.length, 0, 'the page adds no script for Zaraz');
    assert.equal(tracker.emit('answer', ANSWER), true);
    assert.deepEqual(win.calls, [['zaraz.track', ['answer', { label: 'auto_liability=250_500' }]]]);
    tracker.emit('list_copied');
    assert.deepEqual(win.calls[1], ['zaraz.track', ['list_copied']]);
  });

  t('an event is sent only to the configured provider, never to the others on the page', () => {
    for (const [cfg, expect] of [[PLAUSIBLE_CFG, 'plausible'], [FATHOM_CFG, 'fathom.trackEvent'], [ZARAZ_CFG, 'zaraz.track']]) {
      const { tracker, win, doc } = trackerFor(cfg);
      tracker.start();
      if (doc.created[0]) doc.created[0].onload();
      tracker.emit('answer', ANSWER);
      tracker.emit('list_printed');
      assert.equal(win.calls.length, 2);
      for (const c of win.calls) assert.equal(c[0], expect);
    }
  });

  t('what reaches a provider holds the event name and the label and nothing else', () => {
    const { tracker, win, doc } = trackerFor(PLAUSIBLE_CFG);
    tracker.start();
    doc.created[0].onload();
    tracker.emit('answer', ANSWER);
    const [, args] = win.calls[0];
    assert.equal(args.length, 2);
    assert.deepEqual(Object.keys(args[1]), ['props']);
    assert.deepEqual(Object.keys(args[1].props), ['label']);
    assert.equal(typeof args[0], 'string');
    assert.equal(typeof args[1].props.label, 'string');
  });

  t('nothing is sent when the provider\'s function is missing from the page (an ad blocker, a script that did not define it)', () => {
    for (const cfg of [PLAUSIBLE_CFG, FATHOM_CFG, ZARAZ_CFG]) {
      const doc = fakeDocument();
      const tracker = createTracker({ config: cfg, env: { window: {}, document: doc } });
      tracker.start();
      if (doc.created[0]) doc.created[0].onload();
      assert.equal(tracker.emit('answer', ANSWER), false);
    }
  });

  t('a provider function that throws never reaches the page', () => {
    const doc = fakeDocument();
    const win = { plausible() { throw new Error('provider broke'); } };
    const tracker = createTracker({ config: PLAUSIBLE_CFG, env: { window: win, document: doc } });
    tracker.start();
    doc.created[0].onload();
    assert.equal(tracker.emit('answer', ANSWER), false);
    assert.equal(tracker.emit('list_copied'), false);
  });

  t('a script that fails to load (blocked by the CSP or an ad blocker) ends counting quietly', () => {
    const { tracker, win, doc } = trackerFor(PLAUSIBLE_CFG);
    tracker.start();
    assert.equal(tracker.emit('answer', ANSWER), true, 'queued while loading');
    doc.created[0].onerror();
    assert.equal(tracker.state(), 'failed');
    doc.created[0].onload();   // a late load event does not bring it back
    assert.equal(tracker.state(), 'failed');
    assert.equal(tracker.emit('list_copied'), false);
    assert.deepEqual(win.calls, [], 'the queued event was dropped, not sent late');
  });

  t('a page with no document cannot load the script, and the tracker gives up cleanly', () => {
    const tracker = createTracker({ config: PLAUSIBLE_CFG, env: { window: fakeWindow() } });
    assert.equal(tracker.start(), 'failed');
    assert.equal(tracker.emit('answer', ANSWER), false);
  });

  t('the queue is capped, so a script that never loads cannot make the page hold events forever', () => {
    const { tracker } = trackerFor(PLAUSIBLE_CFG);
    tracker.start();
    let accepted = 0;
    for (const q of CATALOG.questions) {
      for (const o of q.options) if (tracker.emit('answer', { questionId: q.id, optionId: o.id })) accepted += 1;
    }
    assert.equal(accepted, 100);
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('analytics: the tracker only ever passes on events that are in the catalog', (t) => {
  t('track() re-checks an event handed to it directly', () => {
    const { tracker, win, doc } = trackerFor(FATHOM_CFG);
    tracker.start();
    doc.created[0].onload();
    const bad = [
      { name: 'answer', label: 'free text from a person' }, { name: 'answer', label: 'auto_liability=500000' },
      { name: 'pageview', label: '' }, { name: 'answer', label: 'auto_liability=250_500', userId: 'abc' },
      { name: 'flag_shown', label: 'not-a-flag' }, { name: 'list_copied', label: 'x' }, null, undefined, 'answer', 5,
    ];
    for (const e of bad) assert.equal(tracker.track(e), false, JSON.stringify(e));
    assert.deepEqual(win.calls, []);
    assert.equal(tracker.track({ name: 'answer', label: 'auto_liability=250_500' }), true);
    assert.equal(win.calls.length, 1);
  });

  t('emit() with an invalid payload sends nothing', () => {
    const { tracker, win, doc } = trackerFor(PLAUSIBLE_CFG);
    tracker.start();
    doc.created[0].onload();
    for (const [name, payload] of [['answer', { questionId: 'x', optionId: 'y' }], ['answer', 'free text'], ['click', {}], ['list_copied', { n: 1 }], ['flag_shown', { flagId: 'x' }]]) {
      assert.equal(tracker.emit(name, payload), false, name);
    }
    assert.deepEqual(win.calls, []);
  });

  t('uses the catalog it was given', () => {
    const win = fakeWindow();
    const doc = fakeDocument();
    const tracker = createTracker({ config: ZARAZ_CFG, catalog: FIXTURE, env: { window: win, document: doc } });
    assert.equal(tracker.emit('answer', { questionId: 'supplements', optionId: 'accident' }), true, 'a fixture question');
    assert.equal(tracker.emit('answer', { questionId: 'umbrella_exposure', optionId: 'under_1m' }), false, 'a real-catalog question the fixture lacks');
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('analytics: one count per event per run (taps cannot be counted)', (t) => {
  t('the same event twice is sent once; a different label is a different event', () => {
    const { tracker, win } = trackerFor(ZARAZ_CFG);
    assert.equal(tracker.emit('answer', ANSWER), true);
    assert.equal(tracker.emit('answer', ANSWER), false);
    assert.equal(tracker.emit('answer', { questionId: 'auto_liability', optionId: '100_300' }), true);
    assert.equal(tracker.emit('list_copied'), true);
    assert.equal(tracker.emit('list_copied'), false);
    assert.equal(win.calls.length, 3);
  });

  t('while the script loads, repeats are collapsed in the queue as well', () => {
    const { tracker, win, doc } = trackerFor(PLAUSIBLE_CFG);
    tracker.start();
    for (let i = 0; i < 5; i++) tracker.emit('answer', ANSWER);
    doc.created[0].onload();
    assert.equal(win.calls.length, 1);
  });

  t('reset() starts a new run: the same event counts again', () => {
    const { tracker, win } = trackerFor(ZARAZ_CFG);
    tracker.emit('answer', ANSWER);
    tracker.reset();
    assert.equal(tracker.emit('answer', ANSWER), true);
    assert.equal(win.calls.length, 2);
  });

  t('an event the provider could not take is not marked as counted, so it can be tried again', () => {
    const win = {};
    const tracker = createTracker({ config: ZARAZ_CFG, env: { window: win, document: fakeDocument() } });
    assert.equal(tracker.emit('answer', ANSWER), false);
    const calls = [];
    win.zaraz = { track: (...a) => calls.push(a) };
    assert.equal(tracker.emit('answer', ANSWER), true);
    assert.equal(calls.length, 1);
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('analytics: helpers the page uses to decide when to emit', (t) => {
  t('becameSelected: a single answer counts when it is chosen, not when it is tapped again', () => {
    assert.equal(becameSelected({}, { auto_liability: '250_500' }, 'auto_liability', '250_500'), true);
    assert.equal(becameSelected({ auto_liability: '250_500' }, { auto_liability: '250_500' }, 'auto_liability', '250_500'), false, 'same tap again');
    assert.equal(becameSelected({ auto_liability: '100_300' }, { auto_liability: '250_500' }, 'auto_liability', '250_500'), true, 'changed to it');
    assert.equal(becameSelected({ auto_liability: '250_500' }, { auto_liability: '100_300' }, 'auto_liability', '250_500'), false, 'changed away from it');
    assert.equal(becameSelected({}, {}, 'auto_liability', '250_500'), false, 'a tap that stored nothing');
  });

  t('becameSelected: a tick-many option counts when ticked, not when unticked', () => {
    assert.equal(becameSelected({}, { other_items: ['towing'] }, 'other_items', 'towing'), true);
    assert.equal(becameSelected({ other_items: ['towing'] }, { other_items: ['towing', 'travel'] }, 'other_items', 'travel'), true);
    assert.equal(becameSelected({ other_items: ['towing'] }, { other_items: ['towing', 'travel'] }, 'other_items', 'towing'), false, 'already ticked');
    assert.equal(becameSelected({ other_items: ['towing', 'travel'] }, { other_items: ['travel'] }, 'other_items', 'towing'), false, 'unticked');
    assert.equal(becameSelected({ other_items: ['towing'] }, { other_items: ['none'] }, 'other_items', 'none'), true, 'an exclusive option replaces the rest');
  });

  t('becameSelected copes with anything', () => {
    for (const x of [undefined, null, 5, 'x', []]) {
      assert.equal(becameSelected(x, x, 'q', 'o'), false);
      assert.equal(becameSelected(undefined, { q: 'o' }, 'q', 'o'), true);
    }
    assert.equal(becameSelected({}, { q: 'o' }, 'constructor', 'o'), false, 'inherited keys are not answers');
  });

  t('flagIdsOf lists the ids in the action list, in order', () => {
    const vm = actionListViewModel({
      a: { home: 'Own', veh: '1' }, extras: [], q: {}, p: { umbrella: { hasUmbrella: 'Yes' } },
      o: { umbrella_limit: '1m', auto_liability: 'lower', umbrella_min_auto: '250_500' },
    }, FIXTURE);
    const ids = flagIdsOf(vm);
    assert.deepEqual(ids, vm.groups.flatMap((g) => g.items.map((i) => i.id)));
    for (const id of ids) assert.notEqual(buildEvent('flag_shown', { flagId: id }, FIXTURE), null, id);
    for (const x of [undefined, null, 5, {}, { groups: 'x' }, { groups: [null, { items: 'x' }, { items: [null, { id: 5 }] }] }]) assert.deepEqual(flagIdsOf(x), []);
  });

  t('every id the real action list shows is a valid flag_shown label', () => {
    const vm = actionListViewModel({
      a: { home: 'Both', veh: '3+' }, extras: ['Motorcycle', 'Boat'], q: { health: 'Yes' }, p: { umbrella: { hasUmbrella: 'Yes' } },
      o: { umbrella_limit: '1m', auto_liability: 'lower', umbrella_min_auto: '250_500', home_liability: 'lower', umbrella_min_home: '300k' },
    });
    for (const id of flagIdsOf(vm)) assert.notEqual(buildEvent('flag_shown', { flagId: id }), null, id);
  });
});

// ---------------------------------------------------------------------------------------------------------
// Source scans over everything the page loads
// ---------------------------------------------------------------------------------------------------------
/** public/index.html plus every module reachable from the scripts it loads, plus the named extras. */
function loadedFiles(extra) {
  const html = read('public/index.html');
  const files = ['public/index.html'];
  const queue = [];
  for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) queue.push(resolveSpec('public/index.html', m[1]));
  for (const p of extra || []) queue.push(p);
  const seen = new Set();
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    files.push(path);
    for (const spec of importsOf(read(path))) queue.push(resolveSpec(path, spec));
  }
  return files;
}

suite('page sources: no network calls, no storage, no cookies, no extra resources', (t) => {
  const EXTRA = ['public/js/config.mjs', ANALYTICS_PATH];

  t('the walk reaches the app, the analytics module and the settings, and a lot of data', () => {
    if (!canRead) return;
    const files = loadedFiles(EXTRA);
    for (const must of ['public/index.html', 'public/js/app.js', ANALYTICS_PATH, 'public/js/config.mjs', 'public/js/overlap-ui/screens.mjs', 'public/js/overlap/data/catalog.mjs']) {
      assert.equal(files.includes(must), true, must);
    }
    assert.equal(files.length > 30, true, 'only ' + files.length + ' files reached; the import walk is broken');
    assert.equal(files.includes('public/js/app.js'), true);
  });

  t('app.js imports the analytics module, so the walk and the page agree', () => {
    if (!canRead) return;
    assert.equal(importsOf(read('public/js/app.js')).includes('./overlap-ui/analytics.mjs'), true);
    assert.equal(importsOf(read('public/js/app.js')).includes('./config.mjs'), true);
  });

  t('none of fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource, importScripts, dynamic import() or a tracking-pixel Image appears in code the page loads', () => {
    if (!canRead) return;
    const net = /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts)\b|\bnew\s+(Image|Audio)\b|\bimport\s*\(|navigator\.serviceWorker/;
    for (const path of loadedFiles(EXTRA).filter((p) => /\.(mjs|js)$/.test(p))) {
      const m = net.exec(codeOnly(read(path), false));
      assert.equal(m, null, m ? path + ' uses ' + m[0] : '');
    }
  });

  t('the provider-script loader is the only code that adds a script, frame, image or other loadable element', () => {
    if (!canRead) return;
    const creates = /createElement\(\s*['"`](script|iframe|frame|img|image|link|object|embed|audio|video|source|track|base|form)['"`]/i;
    const found = [];
    for (const path of loadedFiles(EXTRA).filter((p) => /\.(mjs|js)$/.test(p))) {
      const m = creates.exec(codeOnly(read(path), true));
      if (m) found.push(path + ':' + m[1].toLowerCase());
    }
    assert.deepEqual(found, [ANALYTICS_PATH + ':script']);
  });

  t('no module writes markup that loads anything: no script, iframe, img, link, object, embed, media, base, form or meta tag in any string', () => {
    if (!canRead) return;
    const tag = /<(script|iframe|frame|img|link|object|embed|audio|video|source|track|base|form|meta)[\s>\/]/i;
    for (const path of loadedFiles(EXTRA).filter((p) => /\.(mjs|js)$/.test(p) && p.indexOf('public/js/overlap/data/') !== 0)) {
      const m = tag.exec(codeOnly(read(path), true));
      assert.equal(m, null, m ? path + ' has markup with <' + m[1] : '');
    }
  });

  t('no cookie or browser storage anywhere the page loads: localStorage, sessionStorage, indexedDB, document.cookie, caches, openDatabase', () => {
    if (!canRead) return;
    const store = /localStorage|sessionStorage|indexedDB|document\.cookie|openDatabase|\bcaches\.(open|match)|cookieStore/;
    for (const path of loadedFiles(EXTRA)) {
      const m = store.exec(read(path));
      assert.equal(m, null, m ? path + ' mentions ' + m[0] : '');
    }
  });

  t('index.html loads only its own stylesheet and script, with no inline script, handler attribute, frame, form or base tag', () => {
    if (!canRead) return;
    const html = read('public/index.html');
    const scripts = Array.from(html.matchAll(/<script\b([^>]*)>/gi)).map((m) => m[1]);
    assert.deepEqual(scripts.map((a) => /\ssrc="([^"]+)"/.exec(a)[1]), ['js/app.js'], 'one script, by relative path');
    for (const a of scripts) assert.equal(/type="module"/.test(a), true);
    assert.equal(/<script\b[^>]*>\s*[^<\s]/i.test(html), false, 'no inline script body');
    assert.equal(/\son[a-z]+\s*=/i.test(html), false, 'no onclick-style attributes');
    assert.equal(/<(iframe|frame|object|embed|form|base|style|img|meta\s+http-equiv)\b/i.test(html), false);
    const links = Array.from(html.matchAll(/<link\b[^>]*>/gi)).map((m) => m[0]);
    assert.equal(links.length, 1);
    assert.equal(/rel="stylesheet"\s+href="css\/app\.css"/.test(links[0]), true);
    assert.equal(/(https?:)?\/\/[a-z]/i.test(html.replace(/<!DOCTYPE[^>]*>/i, '')), false, 'no absolute address in the shell');
  });

  t('the stylesheet pulls in nothing: no @import, no url() to another site', () => {
    if (!canRead) return;
    const css = read('public/css/app.css');
    assert.equal(/@import/i.test(css), false);
    assert.equal(/url\(\s*['"]?\s*(https?:)?\/\//i.test(css), false);
    assert.equal(/@font-face/i.test(css), false, 'no web fonts to allow');
  });

  t('app.js hands the counter only overlap answers, flag ids and Copy / Print: never the state, a policy-screen field or a typed number', () => {
    if (!canRead) return;
    const app = read('public/js/app.js');
    const calls = Array.from(app.matchAll(/analytics\.(\w+)\(([^;\n]*)/g));
    const emitted = new Set();
    for (const [, method, args] of calls) {
      assert.equal(['emit', 'reset'].includes(method) || method === 'counting', true, 'unexpected analytics.' + method);
      if (method !== 'emit') continue;
      const name = /^"(\w+)"/.exec(args);
      assert.ok(name, 'the event name is a literal: ' + args);
      emitted.add(name[1]);
      assert.equal(/\bS\./.test(args), false, 'no host state in an event: ' + args);
    }
    assert.deepEqual(Array.from(emitted).sort(), ['answer', 'flag_shown', 'list_copied', 'list_printed']);
    // an answer event is built from the tapped overlap option and nothing else
    const answerCalls = calls.filter(([, m, a]) => m === 'emit' && /^"answer"/.test(a));
    assert.equal(answerCalls.length, 1);
    assert.equal(/questionId:b\.dataset\.oq,optionId:b\.dataset\.ov/.test(answerCalls[0][2]), true);
    // ... and only inside the branch that handles an overlap question tap
    const at = app.indexOf('analytics.emit("answer"');
    const branch = app.lastIndexOf('if(b.dataset.', at);
    assert.equal(app.slice(branch).startsWith('if(b.dataset.oq){'), true, 'the answer event is inside the overlap-question branch');
    // the flag event takes ids from the action list view-model
    assert.equal(/flagIdsOf\(vm\)\.forEach\(function\(id\)\{analytics\.emit\("flag_shown",\{flagId:id\}\)\}\)/.test(app), true);
  });

  t('the page passes the counting state to the privacy line on both screens that show it', () => {
    if (!canRead) return;
    const app = read('public/js/app.js');
    assert.equal(app.includes('entryNoteHtml(analytics.counting)'), true);
    assert.equal(app.includes('actionListHtml(vm,analytics.counting,stk)'), true); // S14 adds the stack drawing as the third argument
    assert.equal(app.includes('actionListErrorHtml(analytics.counting)'), true);
    assert.equal(app.includes('startAnalytics({window:window,document:document},ANALYTICS_CONFIG)'), true);
  });
});

// ---------------------------------------------------------------------------------------------------------
// public/_headers: the Content-Security-Policy and the provider table
// ---------------------------------------------------------------------------------------------------------

/** Parses the Cloudflare Pages `_headers` format: [{ pattern, headers: [[name, value], ...] }]. Throws on a malformed line. */
function parseHeadersFile(text) {
  const rules = [];
  let current = null;
  text.split('\n').forEach((raw, i) => {
    if (raw.length > 2000) throw new Error('line ' + (i + 1) + ' is longer than Cloudflare allows (2000 characters)');
    if (raw.trim() === '' || raw.trim().startsWith('#')) return;
    if (!/^\s/.test(raw)) {
      assert.match(raw, /^\//, 'line ' + (i + 1) + ': a rule starts with a path');
      current = { pattern: raw.trim(), headers: [] };
      rules.push(current);
      return;
    }
    assert.ok(current, 'line ' + (i + 1) + ': a header before any rule');
    const at = raw.indexOf(':');
    assert.ok(at > 0, 'line ' + (i + 1) + ': expected Name: value');
    current.headers.push([raw.slice(0, at).trim(), raw.slice(at + 1).trim()]);
  });
  return rules;
}

/** 'default-src ...; script-src ...' -> { 'default-src': [...], ... }. */
function parseCsp(value) {
  const map = {};
  for (const part of value.split(';')) {
    const piece = part.trim();
    if (piece === '') continue;
    const words = piece.split(/\s+/);
    assert.equal(Object.prototype.hasOwnProperty.call(map, words[0]), false, 'a directive appears twice: ' + words[0]);
    map[words[0]] = words.slice(1);
  }
  return map;
}

const KEYWORD_SOURCES = ["'self'", "'none'", "'unsafe-inline'", 'data:'];

/**
 * What is wrong with `csp` for the chosen provider: any source that is not a keyword and not one of the provider's
 * hosts, and any host the provider needs that is missing. [] means fine.
 */
function cspProblems(csp, provider) {
  const needs = provider === 'none' ? {} : PROVIDER_CSP[provider];
  const problems = [];
  for (const [directive, sources] of Object.entries(csp)) {
    for (const s of sources) {
      if (KEYWORD_SOURCES.includes(s)) continue;
      if (needs[directive] && needs[directive].includes(s)) continue;
      problems.push('unexpected source ' + s + ' in ' + directive);
    }
  }
  for (const [directive, hosts] of Object.entries(needs)) {
    for (const h of hosts) {
      if (!(csp[directive] || []).includes(h)) problems.push('missing ' + h + ' in ' + directive);
    }
  }
  return problems;
}

suite('CSP: the helper that checks it (so the real check below cannot pass by accident)', (t) => {
  const base = { 'default-src': ["'self'"], 'script-src': ["'self'"], 'connect-src': ["'self'"], 'img-src': ["'self'", 'data:'] };
  const withHosts = (extra) => {
    const copy = JSON.parse(JSON.stringify(base));
    for (const [d, hosts] of Object.entries(extra)) copy[d] = (copy[d] || []).concat(hosts);
    return copy;
  };

  t('provider none: only keyword sources pass; any host, scheme or wildcard is a problem', () => {
    assert.deepEqual(cspProblems(base, 'none'), []);
    for (const s of ['https://plausible.io', 'https://cdn.usefathom.com', 'https://example.com', 'http://example.com', '*', 'https:', 'wss://x.example', '*.example.com', 'example.com']) {
      assert.equal(cspProblems(withHosts({ 'connect-src': [s] }), 'none').length, 1, s);
    }
  });

  t('each provider: its hosts must be present in the right directives and nothing else may be added', () => {
    for (const p of ['plausible', 'fathom', 'zaraz']) {
      const full = withHosts(PROVIDER_CSP[p]);
      assert.deepEqual(cspProblems(full, p), [], p);
      assert.equal(cspProblems(base, p).length, Object.values(PROVIDER_CSP[p]).reduce((n, h) => n + h.length, 0), p + ' missing hosts');
      assert.equal(cspProblems(withHosts({ 'script-src': ['https://evil.example'] }), p).length >= 1, true);
    }
    assert.equal(cspProblems(withHosts(PROVIDER_CSP.plausible), 'fathom').length > 0, true, 'Plausible\'s hosts do not satisfy Fathom');
    assert.equal(cspProblems(withHosts(PROVIDER_CSP.plausible), 'none').length > 0, true, 'a provider\'s hosts are not allowed while the setting is none');
  });
});

suite('CSP: the provider table', (t) => {
  t('covers all three providers, each with hosts in directives the policy has', () => {
    assert.deepEqual(Object.keys(PROVIDER_CSP).sort(), ['fathom', 'plausible', 'zaraz']);
    assert.deepEqual(Object.keys(PROVIDER_CSP).sort(), PROVIDERS.filter((p) => p !== 'none').sort());
    const directives = ['script-src', 'connect-src', 'img-src'];
    for (const [provider, table] of Object.entries(PROVIDER_CSP)) {
      for (const [directive, hosts] of Object.entries(table)) {
        assert.equal(directives.includes(directive), true, provider + ' ' + directive);
        for (const h of hosts) assert.match(h, /^https:\/\/[a-z0-9.-]+$/, provider + ' host: an https origin, no path, no wildcard');
      }
    }
    assert.deepEqual(PROVIDER_CSP.zaraz, {}, 'Zaraz is served from the site\'s own address');
  });

  t('a provider that loads a script has that script\'s origin in script-src', () => {
    for (const provider of ['plausible', 'fathom']) {
      const origin = /^(https:\/\/[^/]+)\//.exec(PROVIDER_SCRIPTS[provider])[1];
      assert.equal(PROVIDER_CSP[provider]['script-src'].includes(origin), true, provider);
    }
  });

  t('docs/OPEN-ITEMS.md S15-1 lists every provider and every host in the table', () => {
    if (!canRead) return;
    const doc = read('docs/OPEN-ITEMS.md');
    const start = doc.indexOf('- **S15-1');
    assert.equal(start >= 0, true, 'OPEN-ITEMS.md has an S15-1 entry');
    const rest = doc.slice(start + 3);
    const next = rest.indexOf('\n- **');
    const entry = next < 0 ? rest : rest.slice(0, next);
    for (const [provider, table] of Object.entries(PROVIDER_CSP)) {
      assert.equal(new RegExp(provider, 'i').test(entry), true, 'S15-1 names ' + provider);
      for (const [directive, hosts] of Object.entries(table)) {
        for (const h of hosts) {
          const row = entry.split('\n').find((line) => line.toLowerCase().includes(provider) && line.includes(h) && line.includes(directive));
          assert.ok(row, 'S15-1 has a row for ' + provider + ' that names ' + h + ' under ' + directive);
        }
      }
    }
  });
});

suite('CSP: public/_headers', (t) => {
  const rules = canRead ? parseHeadersFile(read('public/_headers')) : [];
  const headerOf = (name) => {
    const found = rules.flatMap((r) => r.headers).filter(([n]) => n.toLowerCase() === name.toLowerCase());
    return found.length === 1 ? found[0][1] : null;
  };

  t('is one rule for every path, within Cloudflare Pages\' limits, with the four headers the story asks for', () => {
    if (!canRead) return;
    assert.equal(rules.length, 1);
    assert.equal(rules[0].pattern, '/*');
    assert.equal(rules.length <= 100, true, 'at most 100 rules');
    assert.deepEqual(rules[0].headers.map(([n]) => n).sort(), ['Content-Security-Policy', 'Permissions-Policy', 'Referrer-Policy', 'X-Content-Type-Options']);
    assert.equal(headerOf('X-Content-Type-Options'), 'nosniff');
    assert.equal(headerOf('Referrer-Policy'), 'no-referrer');
  });

  t('Permissions-Policy turns off camera, microphone, geolocation and payment', () => {
    if (!canRead) return;
    const pp = headerOf('Permissions-Policy');
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment']) assert.equal(pp.includes(feature + '=()'), true, feature);
  });

  t('the CSP is the strict one: self only, no inline script, no eval, nothing wide open', () => {
    if (!canRead) return;
    const csp = parseCsp(headerOf('Content-Security-Policy'));
    assert.deepEqual(csp['default-src'], ["'self'"]);
    assert.deepEqual(csp['script-src'].filter((s) => s === "'self'" || s.indexOf('https://') === 0), csp['script-src'], 'script-src has self and provider hosts only');
    for (const bad of ["'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", "'strict-dynamic'", '*', 'https:', 'http:', 'data:', 'blob:']) {
      assert.equal(csp['script-src'].includes(bad), false, 'script-src must not have ' + bad);
    }
    assert.equal(csp['style-src'].includes("'self'"), true);
    assert.equal(csp['style-src'].includes("'unsafe-inline'"), true, 'the app writes style attributes (see the next test)');
    assert.deepEqual(csp['img-src'].filter((s) => s === "'self'" || s === 'data:' || s.indexOf('https://') === 0), csp['img-src']);
    assert.equal(csp['img-src'].includes("'self'") && csp['img-src'].includes('data:'), true);
    assert.equal(csp['connect-src'].includes("'self'"), true);
    assert.deepEqual(csp['object-src'], ["'none'"]);
    assert.deepEqual(csp['base-uri'], ["'none'"]);
    assert.deepEqual(csp['form-action'], ["'none'"]);
    assert.deepEqual(csp['frame-ancestors'], ["'none'"]);
  });

  t('while the provider is "none" the CSP contains no third-party host at all', () => {
    if (!canRead) return;
    if (ANALYTICS_CONFIG.provider !== 'none') return;   // the next test covers a chosen provider
    const csp = parseCsp(headerOf('Content-Security-Policy'));
    assert.deepEqual(cspProblems(csp, 'none'), []);
    for (const sources of Object.values(csp)) {
      for (const s of sources) assert.equal(KEYWORD_SOURCES.includes(s), true, 'only keyword sources: ' + s);
    }
    assert.equal(/https?:\/\/|\*|\.(com|io|net|org|dev)\b/i.test(headerOf('Content-Security-Policy')), false);
  });

  t('the CSP, js/config.mjs and the provider table agree: the chosen provider\'s hosts are allowed, and nothing else', () => {
    if (!canRead) return;
    const chosen = resolveProvider(ANALYTICS_CONFIG).provider;
    const csp = parseCsp(headerOf('Content-Security-Policy'));
    assert.deepEqual(cspProblems(csp, chosen), [], 'update public/_headers (docs/OPEN-ITEMS.md S15-1 has the table)');
  });

  t('style-src keeps \'unsafe-inline\' only while the app really writes style attributes (remove it when it stops)', () => {
    if (!canRead) return;
    const csp = parseCsp(headerOf('Content-Security-Policy'));
    let inline = 0;
    for (const path of loadedFiles(['public/js/config.mjs', ANALYTICS_PATH]).filter((p) => !/\/overlap\/data\//.test(p))) {
      inline += (read(path).match(/\sstyle="/g) || []).length;
    }
    if (inline === 0) assert.equal(csp['style-src'].includes("'unsafe-inline'"), false, 'no style attributes are left, so drop \'unsafe-inline\' (OPEN-ITEMS S15-3)');
    else assert.equal(csp['style-src'].includes("'unsafe-inline'"), true, inline + ' style attributes need it');
    assert.equal(/<style\b/i.test(read('public/index.html')), false, 'no inline <style> block');
  });

  t('the parser used here reads the Cloudflare format (self-check)', () => {
    const parsed = parseHeadersFile('# note\n/*\n  A: b\n  C: d: e\n\n/x\n  F: g\n');
    assert.deepEqual(parsed, [{ pattern: '/*', headers: [['A', 'b'], ['C', 'd: e']] }, { pattern: '/x', headers: [['F', 'g']] }]);
    assert.throws(() => parseHeadersFile('  A: b'), /header before any rule/);
    assert.throws(() => parseHeadersFile('/*\n  ' + 'x'.repeat(2000)), /longer than Cloudflare allows/);
    assert.deepEqual(parseCsp("a 'self'; b 'none' data:;"), { a: ["'self'"], b: ["'none'", 'data:'] });
    assert.throws(() => parseCsp("a 'self'; a 'none'"), /appears twice/);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The page statements
// ---------------------------------------------------------------------------------------------------------
suite('page statements: the privacy line and the not-advice note', (t) => {
  t('with nothing counted (the default) the line says nothing is counted or sent, and does not claim counting', () => {
    assert.equal(privacyLine(false), PRIVACY_LINE_NONE);
    assert.equal(PRIVACY_LINE, PRIVACY_LINE_NONE);
    assert.match(PRIVACY_LINE_NONE, /not saved/);
    assert.match(PRIVACY_LINE_NONE, /Nothing about them is counted or sent anywhere/);
    assert.equal(/counted anonymously/.test(PRIVACY_LINE_NONE), false, 'it must not claim counting that is not happening');
  });

  t('with a provider set the line says answers are counted anonymously, only which options, never who, no cookies, never stored against a person', () => {
    assert.equal(privacyLine(true), PRIVACY_LINE_COUNTING);
    assert.match(PRIVACY_LINE_COUNTING, /counted anonymously/);
    assert.match(PRIVACY_LINE_COUNTING, /which options were chosen/);
    assert.match(PRIVACY_LINE_COUNTING, /never who you are/);
    assert.match(PRIVACY_LINE_COUNTING, /no cookies/);
    assert.match(PRIVACY_LINE_COUNTING, /never stored against a person/);
    assert.match(PRIVACY_LINE_COUNTING, /numbers you type are never sent/);
  });

  t('only a real true selects the counting line', () => {
    for (const x of [false, undefined, null, 0, 1, 'true', 'yes', {}, []]) assert.equal(privacyLine(x), PRIVACY_LINE_NONE, String(x));
  });

  t('the entry screen note carries the not-advice sentence and the privacy line, escaped, and follows the setting', () => {
    const none = entryNoteHtml(false);
    const counting = entryNoteHtml(true);
    assert.equal(none.includes(esc(ENTRY_NOTE)), true);
    assert.equal(none.includes(esc(PRIVACY_LINE_NONE)), true);
    assert.equal(none.includes(esc(PRIVACY_LINE_COUNTING)), false);
    assert.equal(counting.includes(esc(ENTRY_NOTE)), true);
    assert.equal(counting.includes(esc(PRIVACY_LINE_COUNTING)), true);
    assert.equal(counting.includes(esc(PRIVACY_LINE_NONE)), false);
    assert.match(ENTRY_NOTE, /not insurance advice/);
    assert.match(ENTRY_NOTE, /not a licensed agent or broker/);
  });

  t('the action list and its error panel follow the setting too', () => {
    const vm = actionListViewModel({ a: { home: 'Own', veh: '1' }, extras: [], q: {}, p: {}, o: {} }, FIXTURE);
    assert.equal(actionListHtml(vm).includes(esc(PRIVACY_LINE_NONE)), true, 'default');
    assert.equal(actionListHtml(vm, false).includes(esc(PRIVACY_LINE_NONE)), true);
    assert.equal(actionListHtml(vm, true).includes(esc(PRIVACY_LINE_COUNTING)), true);
    assert.equal(actionListHtml(vm, true).includes(esc(PRIVACY_LINE_NONE)), false);
    assert.equal(actionListErrorHtml(true).includes(esc(PRIVACY_LINE_COUNTING)), true);
    assert.equal(actionListErrorHtml().includes(esc(PRIVACY_LINE_NONE)), true);
  });

  t('the browser goldens were recorded for the configured setting: the entry note and privacy line on the first screen, the privacy line on every summary', () => {
    if (!canRead) return;
    const counting = isCounting(ANALYTICS_CONFIG);
    const marker = 'export default ';
    for (const s of scenarios) {
      const text = read('tests/browser/golden/' + s.id + '.mjs');
      const golden = JSON.parse(text.slice(text.indexOf(marker) + marker.length).trim().replace(/;$/, ''));
      assert.equal(golden[0].text.includes(ENTRY_NOTE), true, s.id + ' step 0 has the not-advice note');
      assert.equal(golden[0].text.includes(privacyLine(counting)), true, s.id + ' step 0 has the privacy line');
      for (const g of golden) {
        if (g.text.indexOf('\nYour insurer action list\n') >= 0) assert.equal(g.text.includes(privacyLine(counting)), true, s.id + ' step ' + g.step);
      }
    }
  });
});
