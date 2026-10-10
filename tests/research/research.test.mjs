// Story S3a: shape, authority and consistency tests for the verified research files (research/*.mjs)
// and for research/INDEX.md, which mirrors them. Pure data checks; runs under jsc and Node.
// jsc has no URL global, so URLs are parsed with a regex. INDEX.md is read with the jsc global read(),
// guarded so the other runtimes skip only that group.
import { test, assert } from '../harness.mjs';
import umbrella from '../../research/umbrella-liability-stack.mjs';
import auto from '../../research/auto-coverages.mjs';
import home from '../../research/home-and-renters.mjs';
import health from '../../research/health-supplemental.mjs';
import other from '../../research/other-bucket.mjs';

const FILES = [
  { path: 'research/umbrella-liability-stack.mjs', data: umbrella },
  { path: 'research/auto-coverages.mjs', data: auto },
  { path: 'research/home-and-renters.mjs', data: home },
  { path: 'research/health-supplemental.mjs', data: health },
  { path: 'research/other-bucket.mjs', data: other },
];

// Verification date of this research pass. lastVerified may never be later than this; it is a fixed
// constant (not the clock) so the suite stays deterministic.
const TODAY = '2026-10-10';

// Authority allowlist (host or any subdomain). Changing it is an owner decision; see docs/DECISIONS.md S3a entries.
const ALLOWED_HOSTS = [
  'iii.org', 'naic.org', 'insureuonline.org', 'fema.gov', 'floodsmart.gov', 'irs.gov', 'healthcare.gov',
  'cms.gov', 'hhs.gov', 'dol.gov', 'ftc.gov', 'consumerfinance.gov', 'federalreserve.gov',
  'insurance-research.org', 'consumerfed.org', 'kff.org',
];
// Commercial insurers, agencies and comparison sites: never an authority for a recommendation (SPEC).
const FORBIDDEN_HOSTS = [
  'progressive.com', 'statefarm.com', 'allstate.com', 'geico.com', 'policygenius.com', 'valuepenguin.com',
  'nerdwallet.com', 'bankrate.com', 'thezebra.com', 'insurancejournal.com',
];
// Which authorityType values a host family may carry (catches a mislabelled source).
const AUTHORITY_BY_HOST = {
  'iii.org': ['industry-nonprofit'],
  'naic.org': ['regulator'],
  'insureuonline.org': ['regulator'],
  'fema.gov': ['government'],
  'floodsmart.gov': ['government'],
  'irs.gov': ['government'],
  'healthcare.gov': ['government'],
  'cms.gov': ['government'],
  'hhs.gov': ['government'],
  'dol.gov': ['government'],
  'ftc.gov': ['government'],
  'consumerfinance.gov': ['government'],
  'federalreserve.gov': ['government'],
  'insurance-research.org': ['research-org'],
  'consumerfed.org': ['consumer-org'],
  'kff.org': ['research-org'],
};
const AUTHORITY_TYPES = ['regulator', 'government', 'industry-nonprofit', 'research-org', 'consumer-org'];
const CONFIDENCE = ['high', 'medium', 'low'];
// Why an entry sits under `rejected` (the two entries written before the allowlist pass carry no code).
const REASON_CODES = ['host-not-allowlisted', 'sole-source-removed', 'source-removed-claim-trimmed', 'source-removed-claim-folded'];

// The same page is cited from several research files. These are the only allowed cross-file repeats; each is
// one URL with one id (and identical publisher and title) everywhere. Add a source id here when a new repeat is intended.
const DOCUMENTED_SHARED_SOURCE_IDS = [
  'iii-auto-insurance-basics',
  'iii-boat-insurance-and-safety',
  'iii-protect-yourself-uninsured-motorists',
  'iii-rental-car-insurance',
  'iii-standard-homeowners-coverage',
  'iii-what-is-umbrella-liability-policy',
  'naic-consumer-insight-right-protection',
  'naic-coordination-of-benefits-model-regulation',
  'naic-glossary',
  'naic-what-does-auto-insurance-cover',
];

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATE_NAMES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida',
  'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
  'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska',
  'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas',
  'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
];

// ---------------------------------------------------------------- helpers
function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
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
function allowedDomainOf(host) { return ALLOWED_HOSTS.find((d) => host === d || host.endsWith('.' + d)); }
function normUrl(u) { return u.split('#')[0].replace(/\/+$/, ''); }

function check(errors, title) {
  if (errors.length) assert.fail(`${title} (${errors.length}):\n  ${errors.join('\n  ')}`);
}

function allStrings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (isObject(v)) Object.keys(v).forEach((k) => allStrings(v[k], out));
  return out;
}

// Every fact id listed under any key named factIds / *FactIds, anywhere in a value.
function collectFactRefs(v, path, out) {
  if (Array.isArray(v)) v.forEach((x, i) => collectFactRefs(x, `${path}[${i}]`, out));
  else if (isObject(v)) {
    for (const k of Object.keys(v)) {
      if (/factids$/i.test(k)) {
        if (!Array.isArray(v[k])) out.push({ path: `${path}.${k}`, bad: true });
        else v[k].forEach((id) => out.push({ path: `${path}.${k}`, id }));
      }
      collectFactRefs(v[k], `${path}.${k}`, out);
    }
  }
  return out;
}

function factIdsUnder(v) {
  const ids = [];
  collectFactRefs(v, 'x', []).forEach((r) => { if (!r.bad && !ids.includes(r.id)) ids.push(r.id); });
  return ids;
}

const allSources = FILES.flatMap((f) => (Array.isArray(f.data.sources) ? f.data.sources.map((s) => ({ file: f.data.domain, s })) : []));

// ---------------------------------------------------------------- helper self-tests
test('research helpers: hostname matching is exact-or-subdomain, never a substring', () => {
  assert.ok(hostIn('naic.org', ['naic.org']));
  assert.ok(hostIn('content.naic.org', ['naic.org']));
  assert.ok(hostIn('consumer.ftc.gov', ['ftc.gov']));
  assert.ok(!hostIn('notnaic.org', ['naic.org']));
  assert.ok(!hostIn('naic.org.example.com', ['naic.org']));
  assert.ok(!hostIn('fakeiii.org', ['iii.org']));
  assert.ok(hostIn('www.progressive.com', FORBIDDEN_HOSTS));
  assert.ok(hostIn('progressive.com', FORBIDDEN_HOSTS));
  assert.ok(!hostIn('www.iii.org', FORBIDDEN_HOSTS));
});

test('research helpers: https URL parser and date validator', () => {
  assert.equal(parseHttps('https://www.iii.org/article/x').host, 'www.iii.org');
  assert.equal(parseHttps('https://content.naic.org:443/a?b=1#c').host, 'content.naic.org');
  assert.equal(parseHttps('http://www.iii.org/x'), null);
  assert.equal(parseHttps('https://user@www.iii.org/x'), null);
  assert.equal(parseHttps('https://www.iii.org/a b'), null);
  assert.equal(parseHttps('https://localhost/x'), null);
  assert.equal(parseHttps('//www.iii.org/x'), null);
  assert.ok(isIsoDate('2026-10-10'));
  assert.ok(isIsoDate('2024-02-29'));
  assert.ok(!isIsoDate('2026-02-29'));
  assert.ok(!isIsoDate('2026-13-01'));
  assert.ok(!isIsoDate('2026-1-1'));
  assert.ok(!isIsoDate('10/10/2026'));
});

test('research lists: the allowlist and the forbidden list do not overlap', () => {
  const errors = [];
  for (const a of ALLOWED_HOSTS) {
    if (hostIn(a, FORBIDDEN_HOSTS)) errors.push(`${a} is on both lists`);
    if (!(a in AUTHORITY_BY_HOST)) errors.push(`${a} has no authorityType rule`);
  }
  for (const k of Object.keys(AUTHORITY_BY_HOST)) if (!ALLOWED_HOSTS.includes(k)) errors.push(`${k} has an authorityType rule but is not allowlisted`);
  check(errors, 'host lists');
});

// ---------------------------------------------------------------- per-file tests
for (const { path, data } of FILES) {
  const label = `research ${path.replace('research/', '').replace('.mjs', '')}`;

  test(`${label}: file shape`, () => {
    const errors = [];
    const required = ['domain', 'retrievedOn', 'sources', 'facts', 'designInputs', 'rejected', 'gaps'];
    for (const k of required) if (!(k in data)) errors.push(`missing top-level key ${k}`);
    for (const k of Object.keys(data)) if (!required.includes(k)) errors.push(`unexpected top-level key ${k}`);
    if (!isText(data.domain) || !KEBAB.test(data.domain)) errors.push('domain must be kebab-case text');
    else if (path !== `research/${data.domain}.mjs`) errors.push(`domain ${data.domain} does not match the file name`);
    if (!isIsoDate(data.retrievedOn)) errors.push('retrievedOn must be a valid YYYY-MM-DD date');
    else if (data.retrievedOn > TODAY) errors.push(`retrievedOn ${data.retrievedOn} is after ${TODAY}`);
    if (!Array.isArray(data.sources) || data.sources.length === 0) errors.push('sources must be a non-empty array');
    if (!Array.isArray(data.facts) || data.facts.length === 0) errors.push('facts must be a non-empty array');
    if (!isObject(data.designInputs) || Object.keys(data.designInputs).length === 0) errors.push('designInputs must be a non-empty object');
    if (!Array.isArray(data.rejected)) errors.push('rejected must be an array');
    if (!Array.isArray(data.gaps) || data.gaps.length === 0) errors.push('gaps must be a non-empty array');
    else data.gaps.forEach((g, i) => { if (!isText(g)) errors.push(`gaps[${i}] must be non-empty text`); });
    check(errors, 'file shape');
  });

  test(`${label}: every source has the required fields and is verified`, () => {
    const errors = [];
    const keys = ['id', 'publisher', 'title', 'url', 'authorityType', 'lastVerified', 'verification'];
    data.sources.forEach((s, i) => {
      const at = `sources[${i}] (${s && s.id})`;
      if (!isObject(s)) { errors.push(`${at}: not an object`); return; }
      for (const k of keys) if (!(k in s)) errors.push(`${at}: missing ${k}`);
      for (const k of Object.keys(s)) if (!keys.includes(k)) errors.push(`${at}: unexpected field ${k}`);
      if (!isText(s.id) || !KEBAB.test(s.id)) errors.push(`${at}: id must be kebab-case`);
      if (!isText(s.publisher)) errors.push(`${at}: publisher must be text`);
      if (!isText(s.title)) errors.push(`${at}: title must be text`);
      if (!parseHttps(s.url)) errors.push(`${at}: url must be an https URL with a lowercase host`);
      if (!AUTHORITY_TYPES.includes(s.authorityType)) errors.push(`${at}: authorityType ${s.authorityType} not one of ${AUTHORITY_TYPES.join(', ')}`);
      if (!isIsoDate(s.lastVerified)) errors.push(`${at}: lastVerified must be a valid YYYY-MM-DD date`);
      else if (s.lastVerified > TODAY) errors.push(`${at}: lastVerified ${s.lastVerified} is after ${TODAY}`);
      const v = s.verification;
      if (!isObject(v)) errors.push(`${at}: verification must be an object`);
      else {
        if (v.status !== 'verified') errors.push(`${at}: verification.status is ${JSON.stringify(v.status)}, must be "verified"`);
        if (!isIsoDate(v.checkedOn)) errors.push(`${at}: verification.checkedOn must be a valid date`);
        else if (v.checkedOn > TODAY) errors.push(`${at}: verification.checkedOn ${v.checkedOn} is after ${TODAY}`);
        else if (v.checkedOn !== s.lastVerified) errors.push(`${at}: lastVerified ${s.lastVerified} differs from verification.checkedOn ${v.checkedOn}`);
        if (!isText(v.note)) errors.push(`${at}: verification.note must be text`);
      }
    });
    check(errors, 'sources');
  });

  test(`${label}: source ids and URLs are unique within the file`, () => {
    const errors = [];
    const ids = {}, urls = {};
    for (const s of data.sources) {
      if (ids[s.id]) errors.push(`duplicate source id ${s.id}`);
      ids[s.id] = true;
      const u = typeof s.url === 'string' ? normUrl(s.url) : '';
      if (urls[u]) errors.push(`duplicate source URL ${s.url} (${urls[u]} and ${s.id})`);
      urls[u] = s.id;
    }
    check(errors, 'duplicates');
  });

  test(`${label}: every source URL is on the authority allowlist and none is on the forbidden list`, () => {
    const errors = [];
    for (const s of data.sources) {
      const p = parseHttps(s.url);
      if (!p) continue; // reported by the field test
      if (hostIn(p.host, FORBIDDEN_HOSTS)) errors.push(`${s.id}: forbidden host ${p.host}`);
      const dom = allowedDomainOf(p.host);
      if (!dom) errors.push(`${s.id}: host ${p.host} is not on the allowlist`);
      else if (!AUTHORITY_BY_HOST[dom].includes(s.authorityType)) errors.push(`${s.id}: authorityType ${s.authorityType} does not fit ${dom} (expected ${AUTHORITY_BY_HOST[dom].join(' or ')})`);
    }
    check(errors, 'hosts');
  });

  test(`${label}: every fact has the required fields and cites verified sources from its own file`, () => {
    const errors = [];
    const keys = ['id', 'topic', 'claim', 'sourceIds', 'confidence', 'caveats'];
    const sourceById = {};
    data.sources.forEach((s) => { sourceById[s.id] = s; });
    const rejectedSourceIds = data.rejected.filter((r) => r && r.kind === 'source').map((r) => r.id);
    const seen = {};
    data.facts.forEach((f, i) => {
      const at = `facts[${i}] (${f && f.id})`;
      if (!isObject(f)) { errors.push(`${at}: not an object`); return; }
      for (const k of keys) if (!(k in f)) errors.push(`${at}: missing ${k}`);
      for (const k of Object.keys(f)) if (!keys.includes(k)) errors.push(`${at}: unexpected field ${k}`);
      if (!isText(f.id) || !KEBAB.test(f.id)) errors.push(`${at}: id must be kebab-case`);
      else if (seen[f.id]) errors.push(`${at}: duplicate fact id within the file`);
      seen[f.id] = true;
      if (!isText(f.topic)) errors.push(`${at}: topic must be text`);
      if (!isText(f.claim) || f.claim.trim().length < 30) errors.push(`${at}: claim must be a real sentence (30+ characters)`);
      if (!CONFIDENCE.includes(f.confidence)) errors.push(`${at}: confidence ${JSON.stringify(f.confidence)} not one of ${CONFIDENCE.join('|')}`);
      if (!isText(f.caveats)) errors.push(`${at}: caveats must be text`);
      if (!Array.isArray(f.sourceIds) || f.sourceIds.length < 1) errors.push(`${at}: sourceIds must list at least one source`);
      else {
        const uniq = {};
        f.sourceIds.forEach((sid) => {
          if (uniq[sid]) errors.push(`${at}: sourceIds repeats ${sid}`);
          uniq[sid] = true;
          if (rejectedSourceIds.includes(sid)) errors.push(`${at}: cites rejected source ${sid}`);
          const s = sourceById[sid];
          if (!s) errors.push(`${at}: cites ${sid}, which is not a source in this file`);
          else if (!s.verification || s.verification.status !== 'verified') errors.push(`${at}: cites unverified source ${sid}`);
        });
      }
    });
    check(errors, 'facts');
  });

  test(`${label}: every source is used by at least one fact`, () => {
    const cited = {};
    data.facts.forEach((f) => (f.sourceIds || []).forEach((sid) => { cited[sid] = true; }));
    const errors = data.sources.filter((s) => !cited[s.id]).map((s) => `${s.id} is cited by no fact`);
    check(errors, 'unused sources');
  });

  test(`${label}: design inputs only point at facts (and sources) that exist`, () => {
    const errors = [];
    const factIds = {};
    data.facts.forEach((f) => { factIds[f.id] = true; });
    const sourceIds = {};
    data.sources.forEach((s) => { sourceIds[s.id] = true; });
    collectFactRefs(data.designInputs, 'designInputs', []).forEach((r) => {
      if (r.bad) errors.push(`${r.path} must be an array of fact ids`);
      else if (!factIds[r.id]) errors.push(`${r.path} lists unknown fact id ${r.id}`);
    });
    const picks = data.designInputs.plannedFlagSourcePicks;
    if (picks) {
      Object.keys(picks).forEach((k) => {
        if (Array.isArray(picks[k])) picks[k].forEach((sid) => { if (!sourceIds[sid]) errors.push(`plannedFlagSourcePicks.${k} lists unknown source id ${sid}`); });
      });
    }
    check(errors, 'design input references');
  });

  test(`${label}: rejected entries are well formed and nothing live depends on them`, () => {
    const errors = [];
    const sourceIds = {}, factById = {};
    data.sources.forEach((s) => { sourceIds[s.id] = true; });
    data.facts.forEach((f) => { factById[f.id] = f; });
    const rejectedSourceIds = data.rejected.filter((r) => r && r.kind === 'source').map((r) => r.id);
    const seen = {};
    data.rejected.forEach((r, i) => {
      const at = `rejected[${i}] (${r && r.id})`;
      if (!isObject(r)) { errors.push(`${at}: not an object`); return; }
      if (!['source', 'fact', 'fact-trimmed'].includes(r.kind)) errors.push(`${at}: kind ${JSON.stringify(r.kind)} not one of source|fact|fact-trimmed`);
      if (!isText(r.id) || !KEBAB.test(r.id)) errors.push(`${at}: id must be kebab-case`);
      if (!isText(r.reason)) errors.push(`${at}: reason must be text`);
      const key = `${r.kind}:${r.id}`;
      if (seen[key]) errors.push(`${at}: duplicate rejected entry`);
      seen[key] = true;
      if (r.kind === 'source') {
        if (sourceIds[r.id]) errors.push(`${at}: is rejected but still listed in sources`);
        data.facts.forEach((f) => { if ((f.sourceIds || []).includes(r.id)) errors.push(`${at}: still cited by fact ${f.id}`); });
      }
      if (r.kind === 'fact' && factById[r.id]) errors.push(`${at}: is rejected but still listed in facts`);
      if (r.kind === 'fact-trimmed') {
        const f = factById[r.id];
        if (!f) errors.push(`${at}: trimmed fact does not exist in facts`);
        if (!Array.isArray(r.removedSourceIds) || r.removedSourceIds.length === 0) errors.push(`${at}: removedSourceIds must list the dropped sources`);
        else r.removedSourceIds.forEach((sid) => {
          if (sourceIds[sid]) errors.push(`${at}: removed source ${sid} is still in sources`);
          if (f && (f.sourceIds || []).includes(sid)) errors.push(`${at}: fact still cites removed source ${sid}`);
        });
      }
      if (r.reasonCode !== undefined && !REASON_CODES.includes(r.reasonCode)) errors.push(`${at}: unknown reasonCode ${JSON.stringify(r.reasonCode)}`);
      if (r.reasonCode === 'source-removed-claim-folded') {
        if (r.kind !== 'fact') errors.push(`${at}: source-removed-claim-folded applies to facts`);
        else if (!isObject(r.original) || r.original.id !== r.id) errors.push(`${at}: original must be the removed fact object`);
        else if (!(r.original.sourceIds || []).some((sid) => rejectedSourceIds.includes(sid))) errors.push(`${at}: original cites no rejected source in this file`);
      }
      if (r.reasonCode === 'host-not-allowlisted') {
        const p = r.original && parseHttps(r.original.url);
        if (r.kind !== 'source') errors.push(`${at}: host-not-allowlisted applies to sources`);
        else if (!isObject(r.original) || r.original.id !== r.id) errors.push(`${at}: original must be the removed source object`);
        else if (!p) errors.push(`${at}: original.url is not a valid https URL`);
        else if (allowedDomainOf(p.host)) errors.push(`${at}: host ${p.host} is now on the allowlist, so reinstate this source or change the reason`);
      }
      if (r.reasonCode === 'sole-source-removed') {
        if (r.kind !== 'fact') errors.push(`${at}: sole-source-removed applies to facts`);
        else if (!isObject(r.original) || r.original.id !== r.id) errors.push(`${at}: original must be the removed fact object`);
        else (r.original.sourceIds || []).forEach((sid) => { if (!rejectedSourceIds.includes(sid)) errors.push(`${at}: original cites ${sid}, which is not a rejected source in this file`); });
      }
    });
    check(errors, 'rejected');
  });

  test(`${label}: no state names in fact topics, claims or design-input copy, and no placeholder text`, () => {
    const errors = [];
    const stateRe = new RegExp('\\b(' + STATE_NAMES.join('|') + ')\\b');
    data.facts.forEach((f) => {
      [['topic', f.topic], ['claim', f.claim]].forEach(([k, v]) => {
        const m = stateRe.exec(v || '');
        if (m) errors.push(`fact ${f.id} ${k} names a state (${m[1]})`);
      });
    });
    allStrings(data.designInputs).forEach((s) => {
      const m = stateRe.exec(s);
      if (m) errors.push(`designInputs text names a state (${m[1]}): ${s.slice(0, 80)}`);
    });
    const text = JSON.stringify(data);
    const ph = /\b(TODO|TBD|FIXME|lorem ipsum)\b/i.exec(text);
    if (ph) errors.push(`placeholder text found: ${ph[0]}`);
    const lower = text.toLowerCase();
    FORBIDDEN_HOSTS.forEach((h) => { if (lower.includes(h)) errors.push(`forbidden host ${h} is mentioned in the file`); });
    check(errors, 'text hygiene');
  });
}

// ---------------------------------------------------------------- cross-file tests
test('research: fact ids are unique across all five files', () => {
  const errors = [];
  const seen = {};
  for (const { data } of FILES) {
    for (const f of data.facts) {
      if (seen[f.id]) errors.push(`fact id ${f.id} appears in ${seen[f.id]} and ${data.domain}`);
      seen[f.id] = data.domain;
    }
  }
  check(errors, 'fact ids');
});

test('research: the five domains are all present and distinct', () => {
  assert.deepEqual(
    FILES.map((f) => f.data.domain),
    ['umbrella-liability-stack', 'auto-coverages', 'home-and-renters', 'health-supplemental', 'other-bucket'],
  );
});

test('research: a URL is repeated across files only as one documented shared source with one id', () => {
  const errors = [];
  const byUrl = {}, byId = {};
  allSources.forEach(({ file, s }) => {
    (byUrl[normUrl(s.url)] ||= []).push({ file, s });
    (byId[s.id] ||= []).push({ file, s });
  });
  const sharedIds = [];
  Object.keys(byUrl).forEach((u) => {
    const group = byUrl[u];
    if (group.length < 2) return;
    const first = group[0].s;
    group.forEach(({ file, s }) => {
      if (s.id !== first.id) errors.push(`URL ${u} has different ids: ${first.id} and ${s.id} (${file})`);
      if (s.publisher !== first.publisher || s.title !== first.title || s.authorityType !== first.authorityType) errors.push(`URL ${u}: ${s.id} differs in publisher, title or authorityType between files`);
    });
    const files = group.map((g) => g.file);
    if (new Set(files).size !== files.length) errors.push(`URL ${u} repeats inside one file`);
    sharedIds.push(first.id);
  });
  Object.keys(byId).forEach((id) => {
    const urls = new Set(byId[id].map((g) => normUrl(g.s.url)));
    if (urls.size > 1) errors.push(`source id ${id} points at ${urls.size} different URLs`);
  });
  check(errors, 'cross-file source consistency');
  assert.deepEqual(sharedIds.slice().sort(), DOCUMENTED_SHARED_SOURCE_IDS.slice().sort(), 'shared sources must match DOCUMENTED_SHARED_SOURCE_IDS');
});

test('research: a source rejected in one file is not live in another', () => {
  const errors = [];
  const liveIds = {}, liveUrls = {};
  allSources.forEach(({ s }) => { liveIds[s.id] = true; liveUrls[normUrl(s.url)] = s.id; });
  for (const { data } of FILES) {
    data.rejected.filter((r) => r.kind === 'source').forEach((r) => {
      if (liveIds[r.id]) errors.push(`${data.domain}: rejected source id ${r.id} is a live source elsewhere`);
      if (r.original && liveUrls[normUrl(r.original.url)]) errors.push(`${data.domain}: rejected source URL ${r.original.url} is live as ${liveUrls[normUrl(r.original.url)]}`);
    });
  }
  check(errors, 'rejected versus live');
});

// ---------------------------------------------------------------- INDEX.md mirrors the data
// Row cells are compared with the raw data; a literal "|" is written "\|" in the markdown.
function splitRow(line) {
  const cells = [];
  let cur = '';
  for (let i = 1; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cur += '|'; i++; continue; }
    if (ch === '|') { cells.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  return cells;
}
function sectionLines(lines, startTest, level) {
  const start = lines.findIndex(startTest);
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (lines[i].startsWith(level + ' ')) { end = i; break; }
  return lines.slice(start + 1, end);
}
function rowsOf(lines) { return lines.filter((l) => l.startsWith('|')).slice(2).map(splitRow); }
function numberTokens(s) { return (s.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((t) => t.replace(/,+$/, '')); }
const ticks = (s) => '`' + s + '`';
function unticks(cell) { return cell.split(', ').map((x) => x.replace(/^`|`$/g, '')); }

let indexText = null;
let indexError = null;
if (typeof read === 'function') {
  try { indexText = read('research/INDEX.md'); } catch (e) { indexError = String(e && e.message ? e.message : e); }
}
const indexLines = typeof indexText === 'string' ? indexText.split('\n') : null;

test('research/INDEX.md: exists and is readable', () => {
  if (typeof read !== 'function') return; // runtime has no read(); the other INDEX tests skip too
  assert.ok(indexLines, `research/INDEX.md could not be read: ${indexError}`);
  assert.ok(indexLines.length > 50, 'research/INDEX.md looks empty');
});

for (const { path, data } of FILES) {
  test(`research/INDEX.md mirrors ${path}`, () => {
    if (!indexLines) return;
    const errors = [];
    const section = sectionLines(indexLines, (l) => l.startsWith('## ') && l.includes(ticks(data.domain)), '##');
    if (!section) { check([`no "## ..." section for domain ${data.domain}`], 'INDEX section'); return; }

    // counts table at the top of the file
    const summaryRow = rowsOf(indexLines.filter((l) => l.startsWith('|'))).find((c) => c[1] === ticks(path));
    if (!summaryRow) errors.push(`summary table has no row for ${path}`);
    else {
      const want = [data.sources.length, data.facts.length, Object.keys(data.designInputs).length, data.gaps.length, data.rejected.length].map(String);
      if (summaryRow.slice(2, 7).join(',') !== want.join(',')) errors.push(`summary counts ${summaryRow.slice(2, 7).join('/')} differ from data ${want.join('/')}`);
    }

    // sources
    const srcLines = sectionLines(section, (l) => l === '### Sources', '###');
    const srcRows = srcLines ? rowsOf(srcLines) : [];
    if (srcRows.length !== data.sources.length) errors.push(`Sources table has ${srcRows.length} rows, data has ${data.sources.length}`);
    data.sources.forEach((s, i) => {
      const c = srcRows[i];
      if (!c) return;
      if (c[0] !== ticks(s.id)) errors.push(`Sources row ${i + 1}: id ${c[0]} should be ${ticks(s.id)}`);
      if (c[1] !== s.publisher) errors.push(`Sources ${s.id}: publisher differs`);
      if (c[2] !== s.title) errors.push(`Sources ${s.id}: title differs`);
      if (c[3] !== s.authorityType) errors.push(`Sources ${s.id}: type differs`);
      if (c[4] !== '<' + s.url + '>') errors.push(`Sources ${s.id}: url differs`);
    });

    // facts
    const factLines = sectionLines(section, (l) => l === '### Facts', '###');
    const factRows = factLines ? rowsOf(factLines) : [];
    if (factRows.length !== data.facts.length) errors.push(`Facts table has ${factRows.length} rows, data has ${data.facts.length}`);
    data.facts.forEach((f, i) => {
      const c = factRows[i];
      if (!c) return;
      if (c[0] !== ticks(f.id)) errors.push(`Facts row ${i + 1}: id ${c[0]} should be ${ticks(f.id)}`);
      if (c[1] !== f.topic) errors.push(`Facts ${f.id}: topic differs`);
      if (!isText(c[2]) || c[2].length > 300) errors.push(`Facts ${f.id}: short claim must be 1 to 300 characters`);
      else {
        const have = {};
        numberTokens(f.claim + ' ' + f.topic).forEach((t) => { have[t] = true; });
        numberTokens(c[2]).forEach((t) => { if (!have[t]) errors.push(`Facts ${f.id}: short claim has the number ${t}, which is not in the fact's claim or topic`); });
      }
      if (unticks(c[3]).join(',') !== f.sourceIds.join(',')) errors.push(`Facts ${f.id}: source list ${c[3]} differs from data`);
      if (c[4] !== f.confidence) errors.push(`Facts ${f.id}: confidence ${c[4]} should be ${f.confidence}`);
    });

    // design inputs
    const diLines = sectionLines(section, (l) => l === '### Design inputs', '###');
    const diRows = diLines ? rowsOf(diLines) : [];
    const diKeys = Object.keys(data.designInputs);
    if (diRows.length !== diKeys.length) errors.push(`Design inputs table has ${diRows.length} rows, data has ${diKeys.length}`);
    diKeys.forEach((k, i) => {
      const c = diRows[i];
      if (!c) return;
      if (c[0] !== ticks(k)) errors.push(`Design inputs row ${i + 1}: key ${c[0]} should be ${ticks(k)}`);
      if (!isText(c[1])) errors.push(`Design inputs ${k}: summary is empty`);
      const ids = factIdsUnder(data.designInputs[k]);
      const want = ids.length ? ids.map(ticks).join(', ') : '-';
      if (c[2] !== want) errors.push(`Design inputs ${k}: fact list ${c[2]} differs from data ${want}`);
    });

    // gaps (verbatim, in order)
    const gapLines = sectionLines(section, (l) => l === '### Gaps', '###');
    const gapItems = gapLines ? gapLines.filter((l) => /^\d+\. /.test(l)) : [];
    if (gapItems.length !== data.gaps.length) errors.push(`Gaps list has ${gapItems.length} items, data has ${data.gaps.length}`);
    data.gaps.forEach((g, i) => { if (gapItems[i] !== `${i + 1}. ${g}`) errors.push(`Gap ${i + 1} differs from the data`); });

    // removed or trimmed
    const rejLines = sectionLines(section, (l) => l === '### Removed or trimmed', '###');
    const rejRows = rejLines ? rowsOf(rejLines) : [];
    if (rejRows.length !== data.rejected.length) errors.push(`Removed table has ${rejRows.length} rows, data has ${data.rejected.length}`);
    data.rejected.forEach((r, i) => {
      const c = rejRows[i];
      if (!c) return;
      if (c[0] !== ticks(r.id) || c[1] !== r.kind) errors.push(`Removed row ${i + 1}: ${c[0]} ${c[1]} should be ${ticks(r.id)} ${r.kind}`);
      if (!isText(c[2])) errors.push(`Removed ${r.id}: why is empty`);
    });

    check(errors, `INDEX.md versus ${path}`);
  });
}

test('research/INDEX.md lists exactly the shared sources', () => {
  if (!indexLines) return;
  const section = sectionLines(indexLines, (l) => l === '## Sources shared by more than one file', '##');
  assert.ok(section, 'no "Sources shared by more than one file" section');
  const rows = rowsOf(section);
  const ids = rows.map((c) => c[0].replace(/^`|`$/g, ''));
  assert.deepEqual(ids.slice().sort(), DOCUMENTED_SHARED_SOURCE_IDS.slice().sort());
  const errors = [];
  rows.forEach((c) => {
    const id = c[0].replace(/^`|`$/g, '');
    const holders = allSources.filter((x) => x.s.id === id);
    if (unticks(c[1]).join(',') !== holders.map((x) => x.file).join(',')) errors.push(`${id}: files ${c[1]} differ from data`);
    if (holders.length && c[2] !== '<' + holders[0].s.url + '>') errors.push(`${id}: url differs from data`);
  });
  check(errors, 'shared sources table');
});
