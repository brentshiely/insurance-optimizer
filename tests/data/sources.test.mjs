// Story S3b: tests for the source registry (public/js/overlap/data/sources.mjs) and its tie to the verified
// research (research/*.mjs) and to the real catalog. Pure data checks; runs under jsc and Node.
// jsc has no URL global, so URLs are parsed with a regex. The registry's source text is read with the jsc
// global read(), guarded so other runtimes skip only that one test.
import { test, assert } from '../harness.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import DEFAULT_SOURCES from '../../public/js/overlap/data/sources.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { validateCatalog } from '../../public/js/overlap/engine/validate.mjs';
import umbrella from '../../research/umbrella-liability-stack.mjs';
import auto from '../../research/auto-coverages.mjs';
import home from '../../research/home-and-renters.mjs';
import health from '../../research/health-supplemental.mjs';
import other from '../../research/other-bucket.mjs';

const RESEARCH = [umbrella, auto, home, health, other];

// Verification date of this pass. lastVerified may never be later than this; it is a fixed constant (not the
// clock) so the suite stays deterministic. Raise it when the research is re-verified.
const TODAY = '2026-10-10';

// Authority allowlist (host or any subdomain), per SPEC "Sources and authority". Changing it is an owner decision.
const ALLOWED_HOSTS = [
  'iii.org', 'naic.org', 'insureuonline.org', 'fema.gov', 'floodsmart.gov', 'irs.gov', 'healthcare.gov',
  'cms.gov', 'hhs.gov', 'dol.gov', 'ftc.gov', 'consumerfinance.gov', 'federalreserve.gov',
  'insurance-research.org', 'consumerfed.org', 'kff.org',
];
// Commercial insurers, agencies and comparison sites: never an authority for a recommendation.
const FORBIDDEN_HOSTS = [
  'progressive.com', 'statefarm.com', 'allstate.com', 'geico.com', 'policygenius.com', 'valuepenguin.com',
  'nerdwallet.com', 'bankrate.com', 'thezebra.com', 'insurancejournal.com',
];

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const FIELDS = ['id', 'publisher', 'title', 'url', 'lastVerified'];

// ---------------------------------------------------------------- helpers
function isText(v) { return typeof v === 'string' && v.trim().length > 0; }

function isIsoDate(s) {
  if (typeof s !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return d <= dim;
}

// https URL with a lowercase dotted host, optional port, optional path/query/fragment, no userinfo, no spaces.
function parseHttps(u) {
  if (typeof u !== 'string') return null;
  const m = /^https:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?::\d+)?(?:[\/?#]\S*)?$/.exec(u);
  return m ? { host: m[1] } : null;
}
function hostIn(host, domains) { return domains.some((d) => host === d || host.endsWith('.' + d)); }
function normUrl(u) { return u.split('#')[0].replace(/\/+$/, ''); }

function check(errors, title) {
  if (errors.length) assert.fail(`${title} (${errors.length}):\n  ${errors.join('\n  ')}`);
}

const ids = Object.keys(SOURCES);

// Every research source, tagged with the file it came from.
const researchSources = RESEARCH.flatMap((f) => f.sources.map((s) => ({ file: f.domain, s })));
const researchById = {};
researchSources.forEach(({ s }) => { if (!researchById[s.id]) researchById[s.id] = s; });

// ---------------------------------------------------------------- helper self-tests
test('source registry helpers: hostname matching is exact-or-subdomain, never a substring', () => {
  assert.ok(hostIn('naic.org', ALLOWED_HOSTS));
  assert.ok(hostIn('content.naic.org', ALLOWED_HOSTS));
  assert.ok(hostIn('consumer.ftc.gov', ALLOWED_HOSTS));
  assert.ok(hostIn('www.iii.org', ALLOWED_HOSTS));
  assert.ok(!hostIn('notnaic.org', ALLOWED_HOSTS));
  assert.ok(!hostIn('naic.org.example.com', ALLOWED_HOSTS));
  assert.ok(!hostIn('fakeiii.org', ALLOWED_HOSTS));
  assert.ok(!hostIn('consumerreports.org', ALLOWED_HOSTS));
  assert.ok(hostIn('www.progressive.com', FORBIDDEN_HOSTS));
  assert.ok(hostIn('progressive.com', FORBIDDEN_HOSTS));
  assert.ok(!hostIn('www.iii.org', FORBIDDEN_HOSTS));
});

test('source registry helpers: https URL parser, URL normaliser and date validator', () => {
  assert.equal(parseHttps('https://www.iii.org/article/x').host, 'www.iii.org');
  assert.equal(parseHttps('https://content.naic.org:443/a?b=1#c').host, 'content.naic.org');
  assert.equal(parseHttps('http://www.iii.org/x'), null);
  assert.equal(parseHttps('https://user@www.iii.org/x'), null);
  assert.equal(parseHttps('https://www.iii.org/a b'), null);
  assert.equal(parseHttps('https://localhost/x'), null);
  assert.equal(parseHttps('//www.iii.org/x'), null);
  assert.equal(normUrl('https://www.iii.org/x/#frag'), 'https://www.iii.org/x');
  assert.equal(normUrl('https://www.iii.org/x'), 'https://www.iii.org/x');
  assert.ok(isIsoDate('2026-10-10'));
  assert.ok(isIsoDate('2024-02-29'));
  assert.ok(!isIsoDate('2026-02-29'));
  assert.ok(!isIsoDate('2026-13-01'));
  assert.ok(!isIsoDate('2026-1-1'));
  assert.ok(!isIsoDate('10/10/2026'));
});

test('source registry lists: the allowlist and the forbidden list do not overlap', () => {
  const errors = ALLOWED_HOSTS.filter((a) => hostIn(a, FORBIDDEN_HOSTS)).map((a) => `${a} is on both lists`);
  check(errors, 'host lists');
});

// ---------------------------------------------------------------- registry shape
test('source registry: SOURCES is a non-empty plain object and the default export is the same object', () => {
  assert.ok(SOURCES !== null && typeof SOURCES === 'object' && !Array.isArray(SOURCES), 'SOURCES must be an object keyed by id');
  assert.equal(DEFAULT_SOURCES, SOURCES);
  assert.ok(ids.length > 0, 'registry must not be empty');
});

test('source registry: every entry has exactly publisher, title, https url, a real lastVerified date and an id equal to its key', () => {
  const errors = [];
  for (const key of ids) {
    const s = SOURCES[key];
    const at = `source "${key}"`;
    if (s === null || typeof s !== 'object' || Array.isArray(s)) { errors.push(`${at}: not an object`); continue; }
    for (const f of FIELDS) if (!(f in s)) errors.push(`${at}: missing ${f}`);
    for (const f of Object.keys(s)) if (!FIELDS.includes(f)) errors.push(`${at}: unexpected field ${f}`);
    if (!KEBAB.test(key)) errors.push(`${at}: key must be kebab-case`);
    if (s.id !== key) errors.push(`${at}: id ${JSON.stringify(s.id)} must equal its key`);
    if (!isText(s.publisher)) errors.push(`${at}: publisher must be text`);
    if (!isText(s.title)) errors.push(`${at}: title must be text`);
    if (!parseHttps(s.url)) errors.push(`${at}: url must be an https URL with a lowercase dotted host, got ${JSON.stringify(s.url)}`);
    if (!isIsoDate(s.lastVerified)) errors.push(`${at}: lastVerified must be a real YYYY-MM-DD date, got ${JSON.stringify(s.lastVerified)}`);
    else if (s.lastVerified > TODAY) errors.push(`${at}: lastVerified ${s.lastVerified} is after ${TODAY}`);
  }
  check(errors, 'registry entries');
});

test('source registry: entries are sorted by id', () => {
  const errors = [];
  for (let i = 1; i < ids.length; i++) if (!(ids[i - 1] < ids[i])) errors.push(`${ids[i - 1]} is listed before ${ids[i]}`);
  check(errors, 'ordering');
});

test('source registry: ids are unique and URLs are unique (ignoring a fragment or trailing slash)', () => {
  const errors = [];
  const seenId = {}, seenUrl = {};
  for (const key of ids) {
    const s = SOURCES[key];
    if (seenId[s.id]) errors.push(`duplicate id ${s.id}`);
    seenId[s.id] = true;
    const u = typeof s.url === 'string' ? normUrl(s.url) : '';
    if (seenUrl[u]) errors.push(`duplicate URL ${s.url}: ${seenUrl[u]} and ${key}`);
    seenUrl[u] = key;
  }
  check(errors, 'duplicates');
});

test('source registry: the file defines each id once (an object literal would silently drop a repeated key)', () => {
  if (typeof read !== 'function') return; // runtime has no read(); the other registry tests still run
  const text = read('public/js/overlap/data/sources.mjs');
  const keys = [];
  const re = /^ {2}"([^"]+)": \{$/gm;
  let m;
  while ((m = re.exec(text))) keys.push(m[1]);
  const errors = [];
  const seen = {};
  keys.forEach((k) => { if (seen[k]) errors.push(`key "${k}" is written more than once`); seen[k] = true; });
  if (keys.length !== ids.length) errors.push(`the file writes ${keys.length} keys but the registry holds ${ids.length}`);
  check(errors, 'source text');
});

// ---------------------------------------------------------------- authority
test('source registry: every URL is on the authority allowlist', () => {
  const errors = [];
  for (const key of ids) {
    const p = parseHttps(SOURCES[key].url);
    if (!p) continue; // reported by the shape test
    if (!hostIn(p.host, ALLOWED_HOSTS)) errors.push(`${key}: host ${p.host} is not on the allowlist`);
  }
  check(errors, 'allowlist');
});

test('source registry: no URL is on the forbidden commercial list, not even inside a query string', () => {
  const errors = [];
  for (const key of ids) {
    const s = SOURCES[key];
    const p = parseHttps(s.url);
    if (p && hostIn(p.host, FORBIDDEN_HOSTS)) errors.push(`${key}: forbidden host ${p.host}`);
    const lower = String(s.url).toLowerCase();
    FORBIDDEN_HOSTS.forEach((h) => { if (lower.includes(h)) errors.push(`${key}: URL mentions forbidden host ${h}`); });
  }
  check(errors, 'forbidden hosts');
});

// ---------------------------------------------------------------- ties to the research
test('source registry: every verified research source is in SOURCES, with identical fields', () => {
  const errors = [];
  researchSources.forEach(({ file, s }) => {
    if (!s.verification || s.verification.status !== 'verified') return; // unverified sources must stay out; checked below
    const r = SOURCES[s.id];
    if (!r) { errors.push(`${file}: verified source ${s.id} is missing from SOURCES`); return; }
    FIELDS.forEach((f) => { if (r[f] !== s[f]) errors.push(`${s.id}: ${f} differs from ${file} (${JSON.stringify(r[f])} vs ${JSON.stringify(s[f])})`); });
  });
  check(errors, 'research to registry');
});

test('source registry: SOURCES holds only verified research sources (nothing added by hand, nothing unverified)', () => {
  const errors = [];
  for (const key of ids) {
    const r = researchById[key];
    if (!r) errors.push(`${key} is not a source in any research file`);
    else if (!r.verification || r.verification.status !== 'verified') errors.push(`${key} is not verified in research (status ${r.verification && r.verification.status})`);
  }
  // A research URL that the registry holds under a different id would mean an id was merged without a mapping.
  const regByUrl = {};
  ids.forEach((k) => { regByUrl[normUrl(SOURCES[k].url)] = k; });
  researchSources.forEach(({ file, s }) => {
    const k = regByUrl[normUrl(s.url)];
    if (k && k !== s.id) errors.push(`${file}: ${s.id} is registered under a different id (${k})`);
  });
  check(errors, 'registry to research');
});

test('source registry: the registry has exactly one entry per distinct research URL', () => {
  const urls = {};
  researchSources.forEach(({ s }) => { urls[normUrl(s.url)] = true; });
  const distinct = Object.keys(urls).length;
  assert.equal(ids.length, distinct, `registry has ${ids.length} entries but research has ${distinct} distinct URLs`);
});

test('source registry: every research fact cites only sources that resolve in SOURCES', () => {
  const errors = [];
  RESEARCH.forEach((f) => {
    f.facts.forEach((fact) => {
      (fact.sourceIds || []).forEach((sid) => {
        if (!SOURCES[sid]) errors.push(`${f.domain}: fact ${fact.id} cites ${sid}, which is not in SOURCES`);
      });
    });
  });
  check(errors, 'fact sources');
});

test('source registry: planned flag source picks in the research design inputs resolve in SOURCES', () => {
  const errors = [];
  RESEARCH.forEach((f) => {
    const picks = f.designInputs && f.designInputs.plannedFlagSourcePicks;
    if (!picks) return;
    Object.keys(picks).forEach((k) => {
      if (Array.isArray(picks[k])) picks[k].forEach((sid) => { if (!SOURCES[sid]) errors.push(`${f.domain}: plannedFlagSourcePicks.${k} lists ${sid}, which is not in SOURCES`); });
    });
  });
  check(errors, 'planned source picks');
});

test('source registry: every registry source is cited by at least one research fact', () => {
  const cited = {};
  RESEARCH.forEach((f) => f.facts.forEach((fact) => (fact.sourceIds || []).forEach((sid) => { cited[sid] = true; })));
  check(ids.filter((k) => !cited[k]).map((k) => `${k} is cited by no research fact`), 'unused registry sources');
});

// ---------------------------------------------------------------- the real catalog
test('source registry: the real catalog uses this registry and passes validateCatalog', () => {
  assert.equal(CATALOG.sources, SOURCES);
  const r = validateCatalog(CATALOG);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test('source registry: every flag in the real catalog (once any exist) cites at least one source and only ids that resolve', () => {
  const errors = [];
  CATALOG.flags.forEach((fl) => {
    if (!Array.isArray(fl.sourceIds) || fl.sourceIds.length === 0) errors.push(`flag ${fl.id}: sourceIds must list at least one source`);
    else fl.sourceIds.forEach((sid) => { if (!SOURCES[sid]) errors.push(`flag ${fl.id}: sourceId ${sid} is not in SOURCES`); });
  });
  check(errors, 'flag sources');
});
