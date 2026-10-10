// Story S7: tests for the umbrella scope and adequacy flags (public/js/overlap/data/flags/umbrellaScope.mjs).
//
// Flags under test (docs/QUESTION-FLAG-PLAN.md, S7 block):
//   umbrella-smaller-than-exposure   raise     the umbrella is no bigger than the exposure band
//   umbrella-size-unconfirmed        question  the umbrella amount or the exposure band is Not sure
//   umbrella-um-uim-extension        question  the umbrella may not extend uninsured / underinsured motorist cover
//   umbrella-scope-exclusions        question  ask what the umbrella excludes; strong with a side business
//
// Everything runs against the REAL catalog and the real engine. Answers come through the real adapter
// (deriveAnswers), so the derived `policies` array is the one the wizard would build. Other stories add flags to
// the same catalog in parallel, so these tests look up the four S7 flags by id and never assert the size or
// the full contents of a result bucket. Runs under jsc and Node; nothing here uses URL, console or timers.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import S7_FLAGS from '../../public/js/overlap/data/flags/umbrellaScope.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { validateCatalog } from '../../public/js/overlap/engine/validate.mjs';
import { evaluate, createContext } from '../../public/js/overlap/engine/evaluate.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import { deriveAnswers } from '../../public/js/overlap/engine/adapter.mjs';
import { resolveText } from '../../public/js/overlap/engine/render.mjs';
import { BUCKETS } from '../../public/js/overlap/engine/constants.mjs';
import PLAN from '../fixtures/flagPlan.mjs';
import umbrellaResearch from '../../research/umbrella-liability-stack.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';

const RAISE = 'umbrella-smaller-than-exposure';
const UNCONFIRMED = 'umbrella-size-unconfirmed';
const UM_UIM = 'umbrella-um-uim-extension';
const EXCLUSIONS = 'umbrella-scope-exclusions';
const IDS = [RAISE, UNCONFIRMED, UM_UIM, EXCLUSIONS];
const TEXT_FIELDS = ['title', 'background', 'ask', 'reason'];

const flagById = (id) => S7_FLAGS.find((f) => f.id === id);
const session = createSession(CATALOG);

// ---- answers through the real adapter ------------------------------------------------------------------
// A host-like snapshot: an owner with a car and a home, with or without an umbrella, plus the user's own
// overlap answers (`o`). The derived `policies` array comes from deriveAnswers, never from the test.
function snapshot({ umbrella = true, auto = true, home = true, o = {} } = {}) {
  const snap = { a: {}, extras: [], q: {}, p: {}, o: { ...o } };
  if (auto) snap.a.veh = '2';
  if (home) snap.a.home = 'Own';
  snap.p.umbrella = { hasUmbrella: umbrella ? 'Yes' : 'No' };
  return snap;
}
const answersFor = (o, opts) => deriveAnswers(snapshot({ ...(opts || {}), o }));

// applies() on a real context (the engine prunes first, exactly as evaluate does). false/null -> null.
function applied(id, o, opts) {
  const result = flagById(id).applies(createContext(answersFor(o, opts)));
  if (result === false || result === null) return null;
  return result === true ? {} : result;
}
const fires = (id, o, opts) => applied(id, o, opts) !== null;

// The rendered flag from a full evaluate(), looked up by id across the three buckets (undefined if absent).
function rendered(id, o, opts) {
  const r = evaluate(answersFor(o, opts));
  for (const bucket of BUCKETS) {
    const hit = r.flags[bucket].find((f) => f.id === id);
    if (hit) return hit;
  }
  return undefined;
}
const bucketOf = (id, o, opts) => {
  const r = evaluate(answersFor(o, opts));
  return BUCKETS.find((b) => r.flags[b].some((f) => f.id === id));
};
const allText = (f) => TEXT_FIELDS.map((k) => f[k]).join('\n');

const STATE_NAMES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
];

// Every answer set that exercises a different text branch of an S7 flag. Used by the copy-quality tests.
const BRANCHES = [
  { name: 'raise at the band edge (1m vs 1m_3m)', id: RAISE, o: { umbrella_limit: '1m', umbrella_exposure: '1m_3m' } },
  { name: 'raise below the whole band (1m vs over_3m)', id: RAISE, o: { umbrella_limit: '1m', umbrella_exposure: 'over_3m' } },
  { name: 'raise below the whole band (2m vs over_3m)', id: RAISE, o: { umbrella_limit: '2m', umbrella_exposure: 'over_3m' } },
  { name: 'unconfirmed, umbrella amount Not sure', id: UNCONFIRMED, o: { umbrella_limit: 'not_sure', umbrella_exposure: '1m_3m' } },
  { name: 'unconfirmed, exposure Not sure', id: UNCONFIRMED, o: { umbrella_limit: '2m', umbrella_exposure: 'not_sure' } },
  { name: 'unconfirmed, both Not sure', id: UNCONFIRMED, o: { umbrella_limit: 'not_sure', umbrella_exposure: 'not_sure' } },
  { name: 'um/uim, answered no', id: UM_UIM, o: { umbrella_um_uim: 'no' } },
  { name: 'um/uim, Not sure', id: UM_UIM, o: { umbrella_um_uim: 'not_sure' } },
  { name: 'exclusions, side business', id: EXCLUSIONS, o: { side_business: 'yes' } },
  { name: 'exclusions, no side business', id: EXCLUSIONS, o: { side_business: 'no' } },
  { name: 'exclusions, side business unanswered', id: EXCLUSIONS, o: {} },
];
const RENDERED_BRANCHES = BRANCHES.map((b) => ({ ...b, flag: rendered(b.id, b.o) }));

// ======================================================================================================
suite('S7 flags: the file matches the plan', (t) => {
  const planRows = PLAN.flags.filter((f) => f.story === 'S7');

  t('the plan has four S7 rows and the file holds exactly those flags (same ids, buckets, kinds, domains, priorities)', () => {
    assert.equal(planRows.length, 4);
    assert.deepEqual(S7_FLAGS.map((f) => f.id).sort(), planRows.map((f) => f.id).sort());
    for (const row of planRows) {
      const f = flagById(row.id);
      assert.ok(f, `${row.id} exists in flags/umbrellaScope.mjs`);
      assert.equal(row.file, 'umbrellaScope');
      assert.equal(f.bucket, row.bucket, `${row.id} bucket`);
      assert.equal(f.kind, row.kind, `${row.id} kind`);
      assert.equal(f.domain, row.domain, `${row.id} domain`);
      assert.equal(f.priority, row.priority, `${row.id} priority`);
    }
  });

  t('buckets: one Raise and three Questions, none a Drop', () => {
    assert.equal(flagById(RAISE).bucket, 'raise');
    assert.equal(flagById(UNCONFIRMED).bucket, 'question');
    assert.equal(flagById(UM_UIM).bucket, 'question');
    assert.equal(flagById(EXCLUSIONS).bucket, 'question');
  });

  t('priorities sit inside the S7 range (100 to 199), are unique and ascend in file order', () => {
    const [lo, hi] = PLAN.ranges.S7;
    const p = S7_FLAGS.map((f) => f.priority);
    for (const n of p) assert.ok(n >= lo && n <= hi, `${n} is in ${lo}..${hi}`);
    assert.equal(new Set(p).size, p.length);
    assert.deepEqual(p, p.slice().sort((a, b) => a - b));
  });

  t('every flag has the contract fields: kebab-case id, applies() and non-empty title, background, ask and reason', () => {
    for (const f of S7_FLAGS) {
      assert.match(f.id, /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
      assert.equal(typeof f.applies, 'function');
      for (const k of TEXT_FIELDS) {
        assert.ok(typeof f[k] === 'string' ? f[k].trim().length > 0 : typeof f[k] === 'function', `${f.id}.${k} is text or a function`);
      }
    }
  });

  t('each flag reads only the questions and policies the plan lists for it (spying on the context)', () => {
    for (const row of planRows) {
      const f = flagById(row.id);
      // Every answer set that touches this flag, so each branch of applies() and of the text functions runs.
      const sets = BRANCHES.filter((b) => b.id === row.id).map((b) => b.o);
      sets.push({}, { umbrella_limit: '5m', umbrella_exposure: 'under_1m', umbrella_um_uim: 'yes', side_business: 'no' });
      const readQuestions = new Set();
      const readPolicies = new Set();
      for (const o of sets) {
        const ctx = createContext(answersFor(o));
        const spy = {
          holds: (p) => { readPolicies.add(p); return ctx.holds(p); },
          answer: (q) => { readQuestions.add(q); return ctx.answer(q); },
          is: (q, v) => { readQuestions.add(q); return ctx.is(q, v); },
          includes: (q, v) => { readQuestions.add(q); return ctx.includes(q, v); },
          isNotSure: (q) => { readQuestions.add(q); return ctx.isNotSure(q); },
          option: (q) => { readQuestions.add(q); return ctx.option(q); },
          cards: () => ctx.cards(),
          cardsWith: (k) => ctx.cardsWith(k),
          stack: ctx.stack,
        };
        const result = f.applies(spy);
        if (result) for (const k of TEXT_FIELDS) resolveText(f[k], spy, result === true ? {} : result.vars || {});
      }
      for (const q of readQuestions) assert.includes(row.questions, q, `${row.id} reads ${q}`);
      for (const p of readPolicies) assert.includes(row.holds, p, `${row.id} checks policy ${p}`);
      for (const p of row.holds) assert.ok(readPolicies.has(p), `${row.id} names the policy it is about (${p}) with ctx.holds`);
    }
  });
});

// ======================================================================================================
suite('S7 flags: sources', (t) => {
  const factsById = {};
  for (const fact of umbrellaResearch.facts) factsById[fact.id] = fact;

  t('every flag cites at least one source, all unique and all in the registry', () => {
    for (const f of S7_FLAGS) {
      assert.ok(Array.isArray(f.sourceIds) && f.sourceIds.length >= 1, `${f.id} has sourceIds`);
      assert.equal(new Set(f.sourceIds).size, f.sourceIds.length, `${f.id} has no repeated source`);
      for (const sid of f.sourceIds) assert.ok(Object.prototype.hasOwnProperty.call(SOURCES, sid), `${f.id} cites unknown source ${sid}`);
    }
  });

  t('each flag cites exactly the source ids the plan lists for it', () => {
    for (const row of PLAN.flags.filter((f) => f.story === 'S7')) {
      assert.deepEqual(flagById(row.id).sourceIds.slice().sort(), row.sourceIds.slice().sort(), row.id);
    }
  });

  t('every cited source backs at least one of the research facts the plan names for the flag', () => {
    for (const row of PLAN.flags.filter((f) => f.story === 'S7')) {
      const backed = new Set();
      for (const factId of row.factIds) {
        assert.ok(factsById[factId], `${factId} exists in research/umbrella-liability-stack.mjs`);
        for (const sid of factsById[factId].sourceIds) backed.add(sid);
      }
      for (const sid of flagById(row.id).sourceIds) assert.ok(backed.has(sid), `${row.id}: ${sid} supports none of its facts`);
    }
  });

  t('rendered flags carry full source entries (publisher, title, https link, last verified) in sourceIds order', () => {
    for (const b of RENDERED_BRANCHES) {
      const f = flagById(b.id);
      assert.deepEqual(b.flag.sources.map((s) => s.id), f.sourceIds, b.name);
      for (const s of b.flag.sources) {
        assert.deepEqual(Object.keys(s), ['id', 'publisher', 'title', 'url', 'lastVerified']);
        assert.match(s.url, /^https:\/\//);
        assert.match(s.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(s.publisher.length > 0 && s.title.length > 0);
      }
    }
  });
});

// ======================================================================================================
suite('S7 flags: umbrella-smaller-than-exposure (Raise)', (t) => {
  const LIMITS = ['1m', '2m', '5m', 'not_sure', undefined];
  const EXPOSURES = ['under_1m', '1m_3m', 'over_3m', 'not_sure', undefined];
  // Written out by hand, not computed with the rule under test. Strong = the umbrella is smaller than every
  // dollar in the band; normal = it equals the band's lower edge, so it is no bigger than the least you could lose.
  const EXPECTED = {
    '1m|1m_3m': 'normal',
    '1m|over_3m': 'strong',
    '2m|over_3m': 'strong',
  };
  const pick = (limit, exposure) => {
    const o = {};
    if (limit !== undefined) o.umbrella_limit = limit;
    if (exposure !== undefined) o.umbrella_exposure = exposure;
    return o;
  };

  t('the full grid of umbrella amount x exposure band: fires exactly where expected, with the expected emphasis', () => {
    for (const limit of LIMITS) {
      for (const exposure of EXPOSURES) {
        const key = `${limit}|${exposure}`;
        const result = applied(RAISE, pick(limit, exposure));
        const expected = EXPECTED[key];
        if (expected === undefined) assert.equal(result, null, `${key} must not fire`);
        else {
          assert.ok(result !== null, `${key} must fire`);
          assert.equal(result.emphasis, expected, `${key} emphasis`);
        }
      }
    }
  });

  t('a 1 million umbrella against a 1 to 3 million exposure fires, and 2 million against the same band does not (the plan\'s own examples)', () => {
    assert.ok(fires(RAISE, { umbrella_limit: '1m', umbrella_exposure: '1m_3m' }));
    assert.equal(fires(RAISE, { umbrella_limit: '2m', umbrella_exposure: '1m_3m' }), false);
  });

  t('an umbrella at or above the top of the exposure band never fires, and nothing fires against "under 1 million"', () => {
    assert.equal(fires(RAISE, { umbrella_limit: '5m', umbrella_exposure: 'over_3m' }), false);
    assert.equal(fires(RAISE, { umbrella_limit: '1m', umbrella_exposure: 'under_1m' }), false);
  });

  t('Not sure on either input never fires a Raise (the Question twin covers it)', () => {
    for (const o of [
      { umbrella_limit: 'not_sure', umbrella_exposure: 'over_3m' },
      { umbrella_limit: '1m', umbrella_exposure: 'not_sure' },
      { umbrella_limit: 'not_sure', umbrella_exposure: 'not_sure' },
    ]) {
      assert.equal(fires(RAISE, o), false, JSON.stringify(o));
      assert.equal(fires(UNCONFIRMED, o), true, `twin fires for ${JSON.stringify(o)}`);
    }
  });

  t('a missing answer never fires it', () => {
    assert.equal(fires(RAISE, {}), false);
    assert.equal(fires(RAISE, { umbrella_limit: '1m' }), false);
    assert.equal(fires(RAISE, { umbrella_exposure: 'over_3m' }), false);
  });

  t('without an umbrella it is silent even when the umbrella answers are stale in the answers object', () => {
    const o = { umbrella_limit: '1m', umbrella_exposure: 'over_3m' };
    assert.equal(fires(RAISE, o, { umbrella: false }), false);
    assert.equal(rendered(RAISE, o, { umbrella: false }), undefined);
  });

  t('the strong text says the umbrella is smaller than the whole range; the normal text says it is no bigger than the low end', () => {
    const strong = rendered(RAISE, { umbrella_limit: '1m', umbrella_exposure: 'over_3m' });
    const normal = rendered(RAISE, { umbrella_limit: '1m', umbrella_exposure: '1m_3m' });
    assert.equal(strong.emphasis, 'strong');
    assert.equal(normal.emphasis, 'normal');
    assert.includes(strong.background, 'smaller than everything in that range');
    assert.includes(normal.background, 'no bigger than the low end of that range');
    assert.equal(strong.background.includes('no bigger than the low end'), false);
    assert.equal(normal.background.includes('smaller than everything'), false);
  });

  t('the text echoes the user\'s own coarse answers, as a range, and nothing more precise', () => {
    const edge = rendered(RAISE, { umbrella_limit: '1m', umbrella_exposure: '1m_3m' });
    assert.includes(edge.background, 'a $1 million umbrella');
    assert.includes(edge.background, 'between $1 million and $3 million');
    assert.includes(edge.reason, 'between $1 million and $3 million');
    const top = rendered(RAISE, { umbrella_limit: '2m', umbrella_exposure: 'over_3m' });
    assert.includes(top.background, 'a $2 million umbrella');
    assert.includes(top.background, 'more than $3 million');
    for (const f of [edge, top]) {
      const dollars = allText(f).match(/\$[\d,.]+( million)?/g) || [];
      for (const d of dollars) assert.includes(['$1 million', '$2 million', '$3 million'], d, `only band edges appear, found ${d}`);
    }
  });

  t('the text calls the range a rough guide, gives the Triple-I asset test, and never states a multiple of net worth', () => {
    const f = rendered(RAISE, { umbrella_limit: '1m', umbrella_exposure: 'over_3m' });
    const text = allText(f);
    assert.match(f.background, /rough guide/);
    assert.match(f.background, /property, investments or savings worth more than your liability limits/);
    assert.equal(/net worth|multiple|times (your|the)|retirement|home equity|safe from/i.test(text), false);
  });

  t('the Ask points at a quote for a higher limit and keeps the call with the user; the reason is something to say', () => {
    const f = rendered(RAISE, { umbrella_limit: '1m', umbrella_exposure: 'over_3m' });
    assert.match(f.ask, /higher umbrella limit would cost/);
    assert.match(f.ask, /the final call is yours|your call/i);
    assert.match(f.reason, /^I /);
  });

  t('the exposure phrase falls back to the option label for a band the flag has no wording for', () => {
    const cat = copy(CATALOG);
    const exposure = cat.questions.find((q) => q.id === 'umbrella_exposure');
    const last = exposure.options[exposure.options.length - 1];
    last.value = { min: 3000001, max: 10000000 };
    exposure.options.push({ id: 'over_10m', label: 'Over $10 million', value: { min: 10000001, max: null } });
    const r = evaluate(answersFor({ umbrella_limit: '5m', umbrella_exposure: 'over_10m' }), cat);
    const f = r.flags.raise.find((x) => x.id === RAISE);
    assert.ok(f, 'fires against the new band');
    assert.equal(f.emphasis, 'strong');
    assert.includes(f.background, 'over $10 million');
    assert.equal(f.background.includes('Over $10 million'), false, 'label is lower-cased inside the sentence');
  });
});

// ======================================================================================================
suite('S7 flags: umbrella-size-unconfirmed (Question, education)', (t) => {
  t('fires when the umbrella amount, the exposure band, or both are Not sure', () => {
    assert.ok(fires(UNCONFIRMED, { umbrella_limit: 'not_sure', umbrella_exposure: '1m_3m' }));
    assert.ok(fires(UNCONFIRMED, { umbrella_limit: '2m', umbrella_exposure: 'not_sure' }));
    assert.ok(fires(UNCONFIRMED, { umbrella_limit: 'not_sure', umbrella_exposure: 'not_sure' }));
  });

  t('fires on a Not sure even when the other answer has not been given yet', () => {
    assert.ok(fires(UNCONFIRMED, { umbrella_limit: 'not_sure' }));
    assert.ok(fires(UNCONFIRMED, { umbrella_exposure: 'not_sure' }));
  });

  t('does not fire when both are known (whatever the sizes), or when nothing is answered', () => {
    for (const limit of ['1m', '2m', '5m']) {
      for (const exposure of ['under_1m', '1m_3m', 'over_3m']) {
        assert.equal(fires(UNCONFIRMED, { umbrella_limit: limit, umbrella_exposure: exposure }), false, `${limit}|${exposure}`);
      }
    }
    assert.equal(fires(UNCONFIRMED, {}), false);
    assert.equal(fires(UNCONFIRMED, { umbrella_limit: '1m' }), false);
  });

  t('is silent without an umbrella, even with stale Not sure answers', () => {
    const o = { umbrella_limit: 'not_sure', umbrella_exposure: 'not_sure' };
    assert.equal(fires(UNCONFIRMED, o, { umbrella: false }), false);
    assert.equal(rendered(UNCONFIRMED, o, { umbrella: false }), undefined);
  });

  t('is a normal-emphasis flag in every case', () => {
    assert.equal(applied(UNCONFIRMED, { umbrella_limit: 'not_sure', umbrella_exposure: 'not_sure' }).emphasis || 'normal', 'normal');
  });

  t('the text names what the user was not sure about, in all three cases, and suggests the asset test and the agent', () => {
    const limitOnly = rendered(UNCONFIRMED, { umbrella_limit: 'not_sure', umbrella_exposure: '1m_3m' });
    const exposureOnly = rendered(UNCONFIRMED, { umbrella_limit: '2m', umbrella_exposure: 'not_sure' });
    const both = rendered(UNCONFIRMED, { umbrella_limit: 'not_sure', umbrella_exposure: 'not_sure' });
    assert.includes(limitOnly.background, 'You were not sure how big your umbrella is.');
    assert.equal(limitOnly.background.includes('how much you could stand to lose'), false);
    assert.includes(exposureOnly.background, 'You were not sure how much you could stand to lose in a lawsuit.');
    assert.equal(exposureOnly.background.includes('how big your umbrella is'), false);
    assert.includes(both.background, 'how big your umbrella is, or how much you could stand to lose');
    assert.match(limitOnly.ask, /declarations page/);
    assert.match(exposureOnly.ask, /savings, investments and property/);
    assert.match(both.ask, /declarations page/);
    assert.match(both.ask, /savings, investments and property/);
    for (const f of [limitOnly, exposureOnly, both]) {
      assert.match(f.background, /property, investments or savings worth more than your liability limits/);
      assert.match(f.ask, /agent/);
    }
  });

  t('it does not say which assets a judgment can reach (retirement accounts, home value)', () => {
    for (const b of RENDERED_BRANCHES.filter((x) => x.id === UNCONFIRMED)) {
      assert.equal(/retirement|401|IRA\b|safe from|can be taken|home equity|reachable/i.test(allText(b.flag)), false, b.name);
    }
  });
});

// ======================================================================================================
suite('S7 flags: umbrella-um-uim-extension (Question)', (t) => {
  t('fires on "no" and on Not sure, and stays silent on "yes"', () => {
    assert.ok(fires(UM_UIM, { umbrella_um_uim: 'no' }));
    assert.ok(fires(UM_UIM, { umbrella_um_uim: 'not_sure' }));
    assert.equal(fires(UM_UIM, { umbrella_um_uim: 'yes' }), false);
  });

  t('does not fire on a missing answer', () => {
    assert.equal(fires(UM_UIM, {}), false);
  });

  t('needs an auto policy: the question is hidden without one, so a stale answer is pruned and the flag is silent', () => {
    assert.equal(fires(UM_UIM, { umbrella_um_uim: 'no' }, { auto: false }), false);
    assert.equal(rendered(UM_UIM, { umbrella_um_uim: 'no' }, { auto: false }), undefined);
    assert.equal(session.isVisible('umbrella_um_uim', answersFor({}, { auto: false })), false);
  });

  t('needs an umbrella', () => {
    assert.equal(fires(UM_UIM, { umbrella_um_uim: 'no' }, { umbrella: false }), false);
    assert.equal(rendered(UM_UIM, { umbrella_um_uim: 'no' }, { umbrella: false }), undefined);
  });

  t('an owner with an umbrella but no home still gets it (only auto and umbrella matter)', () => {
    assert.ok(fires(UM_UIM, { umbrella_um_uim: 'no' }, { home: false }));
  });

  t('the "no" version asks whether it can be added; the Not sure version asks whether it extends it at all', () => {
    const no = rendered(UM_UIM, { umbrella_um_uim: 'no' });
    const unsure = rendered(UM_UIM, { umbrella_um_uim: 'not_sure' });
    assert.notEqual(no.title, unsure.title);
    assert.notEqual(no.ask, unsure.ask);
    assert.notEqual(no.reason, unsure.reason);
    assert.match(no.title, /^Ask if your umbrella can add/);
    assert.match(no.ask, /can be added to your umbrella/);
    assert.match(unsure.title, /^Ask whether your umbrella extends/);
    assert.match(unsure.ask, /whether it extends uninsured and underinsured motorist coverage/);
    assert.match(unsure.ask, /can be added/);
  });

  t('the background defines the coverage, says it is an auto coverage that pays the user, and ties the state point to the department of insurance', () => {
    for (const o of [{ umbrella_um_uim: 'no' }, { umbrella_um_uim: 'not_sure' }]) {
      const f = rendered(UM_UIM, o);
      assert.match(f.background, /auto coverage that pays you and your passengers/);
      assert.match(f.background, /no insurance|too little/);
      assert.match(f.background, /UM\/UIM/);
      assert.match(f.background, /varies by state/);
      assert.match(f.background, /your state's department of insurance/);
      assert.match(f.background, /liability/);
    }
  });

  t('wording guard (S3a-umbrella-2): never says umbrellas leave it out by default, "most umbrellas", or that an endorsement exists', () => {
    for (const b of RENDERED_BRANCHES.filter((x) => x.id === UM_UIM)) {
      const text = allText(b.flag);
      assert.equal(/by default|most umbrellas|many umbrellas|usually (exclude|leave)|typically (exclude|leave)|endorse|rider|add-on/i.test(text), false, b.name);
      assert.equal(/\bdoes not include\b|\bexcludes? (uninsured|UM)/i.test(text), false, b.name);
    }
  });

  t('the consequence is conditional ("if it does not"), never a fact about the user\'s umbrella', () => {
    const f = rendered(UM_UIM, { umbrella_um_uim: 'not_sure' });
    assert.match(f.background, /If it does not, the UM\/UIM limit on your auto policy is the most that coverage would pay you/);
  });
});

// ======================================================================================================
suite('S7 flags: umbrella-scope-exclusions (Question, strong with a side business)', (t) => {
  t('fires for everyone who holds an umbrella, whatever the side-business answer (even unanswered)', () => {
    assert.ok(fires(EXCLUSIONS, { side_business: 'yes' }));
    assert.ok(fires(EXCLUSIONS, { side_business: 'no' }));
    assert.ok(fires(EXCLUSIONS, {}));
  });

  t('fires for an umbrella holder with no auto and no home (it depends only on the umbrella)', () => {
    assert.ok(fires(EXCLUSIONS, { side_business: 'no' }, { auto: false, home: false }));
  });

  t('does not fire without an umbrella, including with a stale side-business answer', () => {
    assert.equal(fires(EXCLUSIONS, { side_business: 'yes' }, { umbrella: false }), false);
    assert.equal(rendered(EXCLUSIONS, { side_business: 'yes' }, { umbrella: false }), undefined);
  });

  t('emphasis is strong with a side business and normal otherwise', () => {
    assert.equal(applied(EXCLUSIONS, { side_business: 'yes' }).emphasis, 'strong');
    assert.equal(applied(EXCLUSIONS, { side_business: 'no' }).emphasis || 'normal', 'normal');
    assert.equal(applied(EXCLUSIONS, {}).emphasis || 'normal', 'normal');
    assert.equal(rendered(EXCLUSIONS, { side_business: 'yes' }).emphasis, 'strong');
    assert.equal(rendered(EXCLUSIONS, { side_business: 'no' }).emphasis, 'normal');
  });

  t('the question has no Not sure option, so there is no Not sure fallback to build', () => {
    const q = session.getQuestion('side_business');
    assert.deepEqual(q.options.map((o) => o.id), ['yes', 'no']);
    assert.equal(q.allowNotSure, false);
  });

  t('a side business changes the title, the background lead, the ask and the reason', () => {
    const strong = rendered(EXCLUSIONS, { side_business: 'yes' });
    const normal = rendered(EXCLUSIONS, { side_business: 'no' });
    assert.notEqual(strong.title, normal.title);
    assert.match(strong.title, /side business/);
    assert.match(strong.background, /^You said you have a side business or side gig\./);
    assert.match(strong.ask, /Tell your agent what your side business or side gig is/);
    assert.match(strong.reason, /I have a side business/);
    assert.equal(/side business|side gig/.test(normal.reason), false);
    assert.equal(/^You said/.test(normal.background), false);
  });

  t('business wording is the sourced one: typically excluded, covered only when the policies underneath cover it, and a question not a verdict', () => {
    for (const side of ['yes', 'no']) {
      const f = rendered(EXCLUSIONS, { side_business: side });
      assert.match(f.background, /typically leave(s)? out claims that come from a business/);
      assert.match(allText(f), /business/);
    }
    const strong = rendered(EXCLUSIONS, { side_business: 'yes' });
    assert.match(strong.background, /only when the policies underneath it do/);
    assert.match(strong.background, /depends on how each policy defines it/);
    assert.match(strong.ask, /the umbrella follows what they cover/);
  });

  t('the normal version lists the sourced exclusions to ask about: own property, punitive damages, personal injury (libel and slander)', () => {
    const f = rendered(EXCLUSIONS, { side_business: 'no' });
    assert.match(f.background, /does not pay to repair your own home or car/);
    assert.match(f.background, /punitive damages \(/);
    assert.match(f.background, /libel and slander \(/);
    assert.match(f.ask, /plain list of what your umbrella excludes/);
    assert.match(f.ask, /harm done on purpose/);
  });

  t('wording guard (S3a-umbrella gap 4): contractual liability is left out; nothing is diagnosed as a definite exclusion of the user\'s own policy', () => {
    for (const b of RENDERED_BRANCHES.filter((x) => x.id === EXCLUSIONS)) {
      const text = allText(b.flag);
      assert.equal(/contractual|contract liability|indemnif/i.test(text), false, b.name);
      assert.equal(/your umbrella (does not|won't|will not) cover/i.test(text), false, b.name);
    }
  });
});

// ======================================================================================================
suite('S7 flags: copy quality across every text branch', (t) => {
  t('every branch rendered a flag (sanity: the branch table is not stale)', () => {
    for (const b of RENDERED_BRANCHES) assert.ok(b.flag, `${b.name} should fire ${b.id}`);
    assert.equal(RENDERED_BRANCHES.length, 11);
  });

  t('no unresolved {{tokens}}, braces, placeholders or unfilled values in any rendered text', () => {
    for (const b of RENDERED_BRANCHES) {
      for (const k of TEXT_FIELDS) {
        const s = b.flag[k];
        assert.equal(typeof s, 'string');
        assert.ok(s.trim().length > 0, `${b.name} ${k} is not empty`);
        assert.equal(/\{\{|\}\}|\{|\}/.test(s), false, `${b.name} ${k} has a brace`);
        assert.equal(/undefined|null|NaN|\[object|TODO|TBD|lorem|placeholder|XXX/i.test(s), false, `${b.name} ${k} has a placeholder`);
      }
    }
  });

  t('flag source text contains no unresolved tokens before rendering either (templates with {{name}} are all filled by vars)', () => {
    for (const b of BRANCHES) {
      const result = applied(b.id, b.o);
      for (const k of TEXT_FIELDS) {
        const raw = flagById(b.id)[k];
        if (typeof raw !== 'string') continue;
        for (const m of raw.match(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g) || []) {
          const name = m.replace(/[{}\s]/g, '');
          assert.ok(result.vars && Object.prototype.hasOwnProperty.call(result.vars, name), `${b.name}: ${k} uses {{${name}}} with no var`);
        }
      }
    }
  });

  t('state-neutral: no state or territory name anywhere, and no count of states', () => {
    for (const b of RENDERED_BRANCHES) {
      const text = allText(b.flag);
      for (const name of STATE_NAMES) assert.equal(new RegExp(`\\b${name}\\b`).test(text), false, `${b.name} names ${name}`);
      assert.equal(/\b(\d+|several|some|most|many|a handful of|all) states\b/i.test(text), false, `${b.name} counts states`);
    }
  });

  t('house style: no em or en dashes, no "home equity", "next screen" or "generic patterns", no URLs', () => {
    for (const b of RENDERED_BRANCHES) {
      const text = allText(b.flag);
      assert.equal(/[–—]/.test(text), false, `${b.name} has a dash`);
      assert.equal(/home equity|next screen|generic patterns/i.test(text), false, b.name);
      assert.equal(/https?:|www\./i.test(text), false, `${b.name} has a URL`);
    }
  });

  t('titles are action phrases (Raise, Ask or Check)', () => {
    for (const b of RENDERED_BRANCHES) assert.match(b.flag.title, /^(Raise|Ask|Check) /, b.name);
  });

  t('Background and Ask speak to "you"; the Reason is one first-person sentence the user can repeat', () => {
    for (const b of RENDERED_BRANCHES) {
      assert.match(b.flag.background, /\byour?\b/i, `${b.name} background`);
      assert.match(b.flag.ask, /\byour?\b/i, `${b.name} ask`);
      assert.match(b.flag.reason, /^I /, `${b.name} reason starts with I`);
      assert.match(b.flag.reason, /[.]$/, `${b.name} reason ends with a period`);
      assert.equal(/[.!?]\s+\S/.test(b.flag.reason), false, `${b.name} reason is one sentence`);
      assert.ok(b.flag.reason.length <= 160, `${b.name} reason is short (${b.flag.reason.length})`);
    }
  });

  t('jargon is defined where it first appears (liability, UM/UIM, punitive damages, libel and slander, declarations page)', () => {
    const raise = rendered(RAISE, { umbrella_limit: '1m', umbrella_exposure: '1m_3m' });
    assert.match(raise.background, /liability coverage \(the part that pays when you are legally responsible/);
    const ask = rendered(UNCONFIRMED, { umbrella_limit: 'not_sure', umbrella_exposure: '1m_3m' });
    assert.match(ask.ask, /declarations page \(the summary page of the policy\)/);
    const uim = rendered(UM_UIM, { umbrella_um_uim: 'no' });
    const lower = uim.background.toLowerCase();
    assert.ok(lower.indexOf('uninsured and underinsured motorist coverage') >= 0, 'the full name is used');
    assert.ok(lower.indexOf('uninsured and underinsured motorist coverage') < lower.indexOf('um/uim'), 'full name before the abbreviation');
    const ex = rendered(EXCLUSIONS, { side_business: 'no' });
    assert.match(ex.background, /punitive damages \(money a court orders on top of the harm itself, to punish bad conduct\)/);
    assert.match(ex.background, /libel and slander \(false statements that hurt someone's reputation\)/);
  });

  t('nothing asserts that a shortfall voids the umbrella (S3a-umbrella-1) or gives a recommended limit level', () => {
    for (const b of RENDERED_BRANCHES) {
      assert.equal(/\bvoid|invalidat|nullif|100\/300|250\/500|500\/500/i.test(allText(b.flag)), false, b.name);
    }
  });

  t('background is short enough to read at a glance (under 130 words) and the Ask under 90', () => {
    const words = (s) => s.trim().split(/\s+/).length;
    for (const b of RENDERED_BRANCHES) {
      assert.ok(words(b.flag.background) <= 130, `${b.name} background is ${words(b.flag.background)} words`);
      assert.ok(words(b.flag.ask) <= 90, `${b.name} ask is ${words(b.flag.ask)} words`);
    }
  });
});

// ======================================================================================================
suite('S7 flags: end to end through evaluate() on the real catalog with real adapter answers', (t) => {
  t('umbrella-smaller-than-exposure: a 1 million umbrella and an over-3-million exposure produce a strong Raise', () => {
    const answers = answersFor({ umbrella_limit: '1m', umbrella_exposure: 'over_3m' });
    assert.includes(answers.policies, 'umbrella');
    const r = evaluate(answers);
    const f = r.flags.raise.find((x) => x.id === RAISE);
    assert.ok(f, 'in the raise bucket');
    assert.equal(f.bucket, 'raise');
    assert.equal(f.domain, 'umbrella');
    assert.equal(f.kind, 'cross-policy');
    assert.equal(f.emphasis, 'strong');
    assert.equal(f.title, 'Raise your umbrella to cover what a lawsuit could take');
    assert.deepEqual(f.sources.map((s) => s.id), flagById(RAISE).sourceIds);
    assert.equal(r.flags.question.some((x) => x.id === UNCONFIRMED), false, 'the Question twin stays quiet when both are known');
  });

  t('umbrella-size-unconfirmed: a Not sure on the exposure band produces the Question and no Raise', () => {
    const r = evaluate(answersFor({ umbrella_limit: '1m', umbrella_exposure: 'not_sure' }));
    const f = r.flags.question.find((x) => x.id === UNCONFIRMED);
    assert.ok(f, 'in the question bucket');
    assert.equal(f.bucket, 'question');
    assert.equal(f.kind, 'education');
    assert.equal(f.title, 'Check that your umbrella is the right size');
    assert.equal(r.flags.raise.some((x) => x.id === RAISE), false);
  });

  t('umbrella-um-uim-extension: "no" produces the Question; "yes" produces nothing', () => {
    const r = evaluate(answersFor({ umbrella_um_uim: 'no' }));
    const f = r.flags.question.find((x) => x.id === UM_UIM);
    assert.ok(f, 'in the question bucket');
    assert.equal(f.kind, 'within-policy');
    assert.equal(f.emphasis, 'normal');
    assert.equal(bucketOf(UM_UIM, { umbrella_um_uim: 'yes' }), undefined);
  });

  t('umbrella-scope-exclusions: a side business makes it strong; everyone with an umbrella gets it', () => {
    const strong = evaluate(answersFor({ side_business: 'yes' })).flags.question.find((x) => x.id === EXCLUSIONS);
    const normal = evaluate(answersFor({ side_business: 'no' })).flags.question.find((x) => x.id === EXCLUSIONS);
    assert.ok(strong && normal);
    assert.equal(strong.emphasis, 'strong');
    assert.equal(normal.emphasis, 'normal');
    assert.equal(strong.kind, 'within-policy');
    assert.equal(strong.title, 'Ask whether your umbrella covers your side business');
    assert.equal(normal.title, 'Ask what your umbrella leaves out');
  });

  t('a whole S7 section answered at once: the Question flags come out in priority order and none lands in Raise or Drop', () => {
    const o = { umbrella_limit: '1m', umbrella_exposure: 'not_sure', umbrella_um_uim: 'no', side_business: 'yes' };
    const r = evaluate(answersFor(o));
    const mine = r.flags.question.map((f) => f.id).filter((id) => IDS.includes(id));
    assert.deepEqual(mine, [UNCONFIRMED, UM_UIM, EXCLUSIONS]);
    assert.equal(r.flags.raise.some((f) => IDS.includes(f.id)), false);
    assert.equal(r.flags.drop.some((f) => IDS.includes(f.id)), false);
  });

  t('a Raise and the always-on exclusions Question together: the Raise sits in its own bucket', () => {
    const r = evaluate(answersFor({ umbrella_limit: '2m', umbrella_exposure: 'over_3m', side_business: 'no' }));
    assert.deepEqual(r.flags.raise.map((f) => f.id).filter((id) => IDS.includes(id)), [RAISE]);
    assert.deepEqual(r.flags.question.map((f) => f.id).filter((id) => IDS.includes(id)), [EXCLUSIONS]);
  });

  t('no S7 flag fires for a household without an umbrella, however the other answers look', () => {
    const o = { umbrella_limit: '1m', umbrella_exposure: 'over_3m', umbrella_um_uim: 'no', side_business: 'yes' };
    for (const opts of [{ umbrella: false }, { umbrella: false, auto: false }, { umbrella: false, home: false }]) {
      const r = evaluate(answersFor(o, opts));
      for (const bucket of BUCKETS) assert.equal(r.flags[bucket].some((f) => IDS.includes(f.id)), false, JSON.stringify(opts));
    }
    const empty = evaluate({});
    for (const bucket of BUCKETS) assert.equal(empty.flags[bucket].some((f) => IDS.includes(f.id)), false);
  });

  t('answers the adequacy flag reads are bands and option ids only: the result carries no figure from the user', () => {
    const answers = answersFor({ umbrella_limit: '1m', umbrella_exposure: 'over_3m' });
    assert.deepEqual(Object.keys(answers).sort(), ['policies', 'umbrella_exposure', 'umbrella_limit']);
    const f = evaluate(answers).flags.raise.find((x) => x.id === RAISE);
    assert.ok(f);
    assert.equal(/3000001|3,000,001|3000000|3,000,000|999999|999,999/.test(allText(f)), false, 'band edges are never printed as figures');
  });
});

// ======================================================================================================
suite('S7 flags: determinism, purity and catalog validity', (t) => {
  t('validateCatalog passes on the real catalog with the S7 flags in it', () => {
    const v = validateCatalog(CATALOG);
    assert.deepEqual(v.errors, []);
    assert.equal(v.ok, true);
    for (const id of IDS) assert.ok(CATALOG.flags.some((f) => f.id === id), `${id} is registered in the default catalog`);
  });

  t('the same answers give deep-equal results twice, for every branch', () => {
    for (const b of BRANCHES) {
      const answers = answersFor(b.o);
      assert.deepEqual(evaluate(answers), evaluate(answers), b.name);
    }
  });

  t('applies() gives the same answer on repeated calls with the same context', () => {
    for (const b of BRANCHES) {
      const ctx = createContext(answersFor(b.o));
      assert.deepEqual(flagById(b.id).applies(ctx), flagById(b.id).applies(ctx), b.name);
    }
  });

  t('deep-frozen answers are accepted and evaluate to the same result as unfrozen ones (inputs are not mutated)', () => {
    for (const b of BRANCHES) {
      const plain = evaluate(answersFor(b.o));
      const frozen = evaluate(deepFreeze(answersFor(b.o)));
      assert.deepEqual(frozen, plain, b.name);
    }
  });

  t('text functions are pure: rendering twice gives the same text', () => {
    for (const b of BRANCHES) {
      assert.deepEqual(rendered(b.id, b.o), rendered(b.id, b.o), b.name);
    }
  });

  t('the flag results never leak the catalog: mutating a result does not change the next evaluation', () => {
    const answers = answersFor({ umbrella_limit: '1m', umbrella_exposure: 'over_3m' });
    const first = evaluate(answers);
    first.flags.raise.find((f) => f.id === RAISE).title = 'changed';
    first.flags.raise.find((f) => f.id === RAISE).sources[0].url = 'changed';
    const second = evaluate(answers);
    assert.equal(second.flags.raise.find((f) => f.id === RAISE).title, 'Raise your umbrella to cover what a lawsuit could take');
    assert.match(second.flags.raise.find((f) => f.id === RAISE).sources[0].url, /^https:/);
  });
});
