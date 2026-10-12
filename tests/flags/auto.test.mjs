// Story S8: tests for the auto coverage-gap flags (public/js/overlap/data/flags/auto.mjs).
// Everything runs through the REAL catalog: answers are plain answers, the way the page builds them (Q1, `policies`,
// holds what the user ticked; every other key is the user's own tap on a closed list), then evaluate().
// Other stories' flags live in the same real catalog and may also fire on these answers, so every assertion looks
// only at the five S8 flags (filtered by id) and never pins what else is in a bucket.
// Pure data checks; runs under jsc and Node. jsc has no URL/console: nothing here uses them.
import { suite, assert } from '../harness.mjs';
import AUTO from '../../public/js/overlap/data/flags/auto.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { FLAGS } from '../../public/js/overlap/data/flags/index.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { evaluate, createContext } from '../../public/js/overlap/engine/evaluate.mjs';
import { validateCatalog } from '../../public/js/overlap/engine/validate.mjs';
import PLAN from '../fixtures/flagPlan.mjs';
import autoResearch from '../../research/auto-coverages.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';


// ---------------------------------------------------------------- the plan rows this story owns
const PLAN_ROWS = PLAN.flags.filter((f) => f.story === 'S8');
const MINE = AUTO.map((f) => f.id);
const flagById = (id) => AUTO.find((f) => f.id === id);

// ---------------------------------------------------------------- building answers
// One car, nothing else: Q1 (`policies`) is ['auto']. `o` holds the user's answers by question id; `held` replaces
// the Q1 ticks (for example [] for a household with no car).
const answersFor = (o, held = ['auto']) => ({ ...o, policies: held.slice() });
const run = (o, held) => evaluate(answersFor(o, held));
const ctxFor = (o, held) => createContext(answersFor(o, held));

/** Only the S8 flags a result contains: { id: ResultFlag }, plus their ids in result order (bucket, priority, id). */
function mineIn(result) {
  const byId = {};
  const order = [];
  for (const bucket of ['raise', 'drop', 'question']) {
    for (const f of result.flags[bucket]) {
      if (MINE.includes(f.id)) { byId[f.id] = f; order.push(f.id); }
    }
  }
  return { byId, order };
}
const firedIds = (o, held) => mineIn(run(o, held)).order;
const rendered = (id, o, held) => mineIn(run(o, held)).byId[id];

/** Drops undefined entries so a matrix can say "unanswered" with undefined. */
const clean = (pairs) => {
  const o = {};
  for (const k of Object.keys(pairs)) if (pairs[k] !== undefined) o[k] = pairs[k];
  return o;
};

// ---------------------------------------------------------------- copy rules (the same ones the question tests use)
const STATES = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington state|west virginia|wisconsin|wyoming)\b/i;
const BANNED = /home equity|next screen|generic pattern|todo|tbd|lorem|\{\{|\}\}|—|–/i;
const TEXT_FIELDS = ['title', 'background', 'ask', 'reason'];
const sentenceBreaks = (s) => (s.match(/[.!?](\s|$)/g) || []).length;

// ---------------------------------------------------------------- one scenario per situation of every flag
// Each is a realistic set of answers for a household with one car and nothing else.
const LOAN_NEWER = { auto_financing: 'loan', auto_value: '10000_24999' };
const LEASE_NEWER = { auto_financing: 'lease', auto_value: '25000_plus' };
const SCENARIOS = [
  { flag: 'auto-um-uim-check', situation: 'none', o: { auto_um_uim: 'no' } },
  { flag: 'auto-um-uim-check', situation: 'unsure', o: { auto_um_uim: 'not_sure' } },
  { flag: 'auto-um-uim-check', situation: 'low', o: { auto_um_uim: 'yes', auto_um_uim_limit: 'lower' } },
  { flag: 'auto-um-uim-check', situation: 'limit_unsure', o: { auto_um_uim: 'yes', auto_um_uim_limit: 'not_sure' } },
  { flag: 'auto-gap-coverage-missing', situation: 'loan', o: { ...LOAN_NEWER, auto_gap_coverage: 'no' } },
  { flag: 'auto-gap-coverage-missing', situation: 'lease', o: { ...LEASE_NEWER, auto_gap_coverage: 'no' } },
  { flag: 'auto-gap-coverage-confirm', situation: 'loan', o: { ...LOAN_NEWER, auto_gap_coverage: 'not_sure' } },
  { flag: 'auto-gap-coverage-confirm', situation: 'lease', o: { ...LEASE_NEWER, auto_gap_coverage: 'not_sure' } },
  { flag: 'auto-rental-reimbursement-check', situation: 'yes', o: { auto_rental_reimbursement: 'yes' } },
  { flag: 'auto-rental-reimbursement-check', situation: 'no', o: { auto_rental_reimbursement: 'no' } },
  { flag: 'auto-rental-reimbursement-check', situation: 'unsure', o: { auto_rental_reimbursement: 'not_sure' } },
  { flag: 'auto-collision-older-car', situation: 'only', o: { auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'yes' } },
];
const textsOf = (flagId) => SCENARIOS.filter((s) => s.flag === flagId).map((s) => ({ ...s, flagOut: rendered(s.flag, s.o) }));
const allTexts = (flagId) => {
  const out = [];
  for (const s of textsOf(flagId)) for (const k of TEXT_FIELDS) out.push(s.flagOut[k]);
  return out.join('\n');
};

// ======================================================================================================
suite('S8 auto flags: the file matches the plan', (t) => {
  t('the plan has exactly five S8 rows, all in the auto file', () => {
    assert.equal(PLAN_ROWS.length, 5);
    for (const row of PLAN_ROWS) assert.equal(row.file, 'auto', row.id);
  });

  t('the flags in auto.mjs are exactly the plan rows for S8: same ids and same buckets', () => {
    assert.deepEqual(AUTO.map((f) => f.id), PLAN_ROWS.map((r) => r.id));
    assert.deepEqual(AUTO.map((f) => f.bucket), PLAN_ROWS.map((r) => r.bucket));
    assert.deepEqual(AUTO.map((f) => `${f.id}:${f.bucket}`), [
      'auto-um-uim-check:question',
      'auto-gap-coverage-missing:raise',
      'auto-gap-coverage-confirm:question',
      'auto-rental-reimbursement-check:question',
      'auto-collision-older-car:drop',
    ]);
  });

  t('kind, domain and priority also equal the plan, and priorities sit inside the S8 range', () => {
    const [lo, hi] = PLAN.ranges.S8;
    for (const row of PLAN_ROWS) {
      const f = flagById(row.id);
      assert.equal(f.kind, row.kind, `${row.id} kind`);
      assert.equal(f.domain, row.domain, `${row.id} domain`);
      assert.equal(f.priority, row.priority, `${row.id} priority`);
      assert.equal(f.priority >= lo && f.priority <= hi, true, `${row.id} priority in range`);
    }
  });

  t('the S8 flags are the ones the real catalog holds (flags/index.mjs picks up the file)', () => {
    for (const f of AUTO) assert.equal(FLAGS.includes(f), true, `${f.id} is in the real catalog`);
    assert.equal(CATALOG.flags.filter((f) => MINE.includes(f.id)).length, 5);
    // No other file defines an S8 id.
    assert.equal(new Set(CATALOG.flags.map((f) => f.id)).size, CATALOG.flags.length, 'flag ids are unique catalog-wide');
  });

  t('validateCatalog passes on the real catalog with the S8 flags in it', () => {
    const r = validateCatalog(CATALOG);
    assert.deepEqual(r.errors, []);
    assert.equal(r.ok, true);
  });

  t('every flag has a function applies(), the four text fields, and at least one source', () => {
    for (const f of AUTO) {
      assert.equal(typeof f.applies, 'function', f.id);
      for (const k of TEXT_FIELDS) {
        assert.equal(typeof f[k] === 'function' || (typeof f[k] === 'string' && f[k].trim().length > 0), true, `${f.id}.${k}`);
      }
      assert.equal(Array.isArray(f.sourceIds) && f.sourceIds.length >= 1, true, `${f.id} sourceIds`);
    }
  });

  t('flags stay inside the plan: every cited source resolves and is one the plan lists for that flag', () => {
    for (const f of AUTO) {
      const row = PLAN_ROWS.find((r) => r.id === f.id);
      assert.equal(new Set(f.sourceIds).size, f.sourceIds.length, `${f.id} cites a source twice`);
      for (const sid of f.sourceIds) {
        assert.notEqual(SOURCES[sid], undefined, `${f.id}: ${sid} is not in the registry`);
        assert.includes(row.sourceIds, sid, `${f.id}: ${sid} is not one of the plan's sources for this flag`);
      }
    }
  });

  t('the questions the plan says each flag reads are all visible for a household that can trigger it', () => {
    const answersThatOpenTheGates = {
      'auto-um-uim-check': { auto_um_uim: 'yes' },
      'auto-gap-coverage-missing': LOAN_NEWER,
      'auto-gap-coverage-confirm': LOAN_NEWER,
      'auto-rental-reimbursement-check': {},
      'auto-collision-older-car': { auto_financing: 'paid_off', auto_value: 'under_3000' },
    };
    for (const row of PLAN_ROWS) {
      const visible = new Set(run(answersThatOpenTheGates[row.id]).meta.visibleQuestionIds);
      for (const q of row.questions) assert.equal(visible.has(q), true, `${row.id}: ${q} is visible`);
      assert.deepEqual(row.holds, ['auto'], `${row.id} reads only the auto policy`);
    }
  });
});

// ======================================================================================================
suite('S8 auto flags: nothing fires without an auto policy or without answers', (t) => {
  t('the context holds exactly what Q1 says: a car, a car and a home, or nothing', () => {
    assert.equal(ctxFor({}).holds('auto'), true);
    assert.equal(ctxFor({}, []).holds('auto'), false);
    const both = ctxFor({}, ['home', 'auto']);
    assert.equal(both.holds('auto'), true);
    assert.equal(both.holds('home'), true);
    assert.deepEqual(both.answer('policies'), ['auto', 'home'], 'Q1 is stored in option order');
  });

  t('a household with a car and no answers gets none of the five flags', () => {
    assert.deepEqual(firedIds({}), []);
  });

  t('answers left over from an auto policy that is gone (no car) are pruned and fire nothing', () => {
    const everything = { auto_financing: 'loan', auto_value: '10000_24999', auto_gap_coverage: 'no', auto_um_uim: 'no', auto_rental_reimbursement: 'no' };
    assert.deepEqual(firedIds(everything, []), []);
    assert.deepEqual(firedIds({ auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'yes' }, []), []);
  });

  t('applies() itself requires the auto policy, even when the answers are present in the ctx', () => {
    for (const f of AUTO) {
      const ctx = ctxFor({}, []);
      assert.equal(f.applies(ctx), false, f.id);
    }
  });
});

// ======================================================================================================
suite('S8 auto flags: auto-um-uim-check (Question)', (t) => {
  const flag = flagById('auto-um-uim-check');
  const applies = (o) => flag.applies(ctxFor(o));

  t('no fires; Not sure fires; each with the matching situation', () => {
    assert.deepEqual(applies({ auto_um_uim: 'no' }), { vars: { situation: 'none' } });
    assert.deepEqual(applies({ auto_um_uim: 'not_sure' }), { vars: { situation: 'unsure' } });
  });

  t('yes with a limit lower than 100/300 fires; yes with a Not sure limit fires', () => {
    assert.deepEqual(applies({ auto_um_uim: 'yes', auto_um_uim_limit: 'lower' }), { vars: { situation: 'low' } });
    assert.deepEqual(applies({ auto_um_uim: 'yes', auto_um_uim_limit: 'not_sure' }), { vars: { situation: 'limit_unsure' } });
  });

  t('yes with 100/300 or higher stays silent', () => {
    for (const limit of ['100_300', '250_500', '500_500']) {
      assert.equal(applies({ auto_um_uim: 'yes', auto_um_uim_limit: limit }), false, limit);
      assert.deepEqual(firedIds({ auto_um_uim: 'yes', auto_um_uim_limit: limit }), [], limit);
    }
  });

  t('yes with the limit not answered yet stays silent (a missing answer never fires)', () => {
    assert.equal(applies({ auto_um_uim: 'yes' }), false);
    assert.equal(applies({}), false);
  });

  t('the limit comparison reads the option value, not just its id: only the rung below 100/300 counts', () => {
    // The ladder is lower (just under 100/300), 100/300, 250/500, 500/500. Exactly one rung is below the yardstick.
    const ids = ['lower', '100_300', '250_500', '500_500'];
    const fires = ids.filter((id) => applies({ auto_um_uim: 'yes', auto_um_uim_limit: id }) !== false);
    assert.deepEqual(fires, ['lower']);
  });

  t('an old limit answer is ignored once the user flips UM/UIM to no (pruned): the situation is none, not low', () => {
    assert.deepEqual(applies({ auto_um_uim: 'no', auto_um_uim_limit: 'lower' }), { vars: { situation: 'none' } });
    assert.deepEqual(applies({ auto_um_uim: 'not_sure', auto_um_uim_limit: 'lower' }), { vars: { situation: 'unsure' } });
  });

  t('end to end: Question bucket, normal emphasis, five fields of text, sources resolved', () => {
    const f = rendered('auto-um-uim-check', { auto_um_uim: 'no' });
    assert.equal(f.bucket, 'question');
    assert.equal(f.domain, 'auto');
    assert.equal(f.kind, 'within-policy');
    assert.equal(f.emphasis, 'normal');
    assert.equal(f.title, 'Ask your insurer about adding uninsured and underinsured motorist coverage');
    assert.equal(f.sources.length, 6);
    assert.equal(f.sources[0].id, 'irc-2025-one-in-three-uninsured-underinsured');
    assert.deepEqual(Object.keys(f), ['id', 'bucket', 'domain', 'kind', 'title', 'emphasis', 'background', 'ask', 'reason', 'sources']);
  });

  t('the four situations each get their own title, ask and reason, and the title says what to do', () => {
    const out = textsOf('auto-um-uim-check').map((s) => s.flagOut);
    assert.equal(out.length, 4);
    assert.equal(new Set(out.map((f) => f.ask)).size, 4);
    assert.equal(new Set(out.map((f) => f.reason)).size, 4);
    assert.equal(new Set(out.map((f) => f.background)).size, 4);
    assert.equal(new Set(out.map((f) => f.title)).size, 3, 'the two limit situations share a title');
    for (const f of out) assert.match(f.title, /^(Ask|Find out|Check) /);
  });

  t('the statistic carries its publisher and year, matches the research, and never says "one in eight"', () => {
    const stat = autoResearch.designInputs.uninsuredDriverStatistic;
    const rounded = `about ${Math.round(stat.percentOfDrivers)}%`;
    for (const s of textsOf('auto-um-uim-check')) {
      const text = s.flagOut.background;
      assert.includes(text, stat.publisher, s.situation);
      assert.includes(text, String(stat.dataYear), s.situation);
      assert.includes(text, rounded, s.situation);
      assert.includes(text, stat.roundedWords, s.situation);
      assert.includes(text, 'U.S. drivers', s.situation);
    }
    assert.equal(/one in eight|1 in 8|12\.6/i.test(allTexts('auto-um-uim-check')), false);
  });

  t('the statistic is attributed to the Insurance Research Council in the sources, and its entry is the 2025 IRC release', () => {
    const f = rendered('auto-um-uim-check', { auto_um_uim: 'no' });
    const irc = f.sources.filter((s) => s.publisher === 'Insurance Research Council');
    assert.equal(irc.length, 1);
    assert.equal(irc[0].id, 'irc-2025-one-in-three-uninsured-underinsured');
    const fact = autoResearch.facts.find((x) => x.id === 'uninsured-share-latest-irc');
    assert.includes(fact.sourceIds, irc[0].id, 'the research fact for the statistic cites this source');
  });

  t('requirements are said to vary and send the user to their own state department of insurance; no state or count is named', () => {
    for (const s of textsOf('auto-um-uim-check')) {
      assert.includes(s.flagOut.background, "differ from state to state, so your state's department of insurance", s.situation);
      assert.equal(/\b\d+ states\b|\bmost states\b|\bsome states\b|\btwenty\b/i.test(s.flagOut.background), false, `${s.situation}: no count of states`);
    }
  });

  t('no limit tier is recommended: 100/300 is only a point of comparison, and nothing is said about matching liability limits or cost', () => {
    const low = textsOf('auto-um-uim-check').find((s) => s.situation === 'low').flagOut;
    assert.includes(low.background, 'only as a point of comparison, not as a recommended amount');
    const all = allTexts('auto-um-uim-check');
    assert.equal(/should (have|carry|match)|match(ing)? (it to )?your liability|usually inexpensive|cheap|recommend(ed)? (that|limit)/i.test(all.replace('not as a recommended amount', '')), false);
  });

  t('the car-damage question is asked in every situation (UMPD is separate and varies), never asserted', () => {
    for (const s of textsOf('auto-um-uim-check')) {
      assert.includes(s.flagOut.ask, 'damage to your car', s.situation);
      assert.includes(s.flagOut.ask, 'separately', s.situation);
    }
  });

  t('the Not sure fallback for the main answer sends the user to their policy summary page', () => {
    const unsure = textsOf('auto-um-uim-check').find((s) => s.situation === 'unsure').flagOut;
    assert.includes(unsure.ask, 'declarations page');
    assert.includes(unsure.ask, 'UM/UIM');
  });
});

// ======================================================================================================
suite('S8 auto flags: the gap coverage pair (Raise, and its Question twin)', (t) => {
  const missing = flagById('auto-gap-coverage-missing');
  const confirm = flagById('auto-gap-coverage-confirm');

  const FINANCING = [undefined, 'loan', 'lease', 'paid_off'];
  const VALUES = [undefined, 'under_3000', '3000_9999', '10000_24999', '25000_plus', 'not_sure'];
  const GAP = [undefined, 'yes', 'no', 'not_sure'];

  t('financed + newer car + no gap coverage => the Raise fires, for a loan and for a lease', () => {
    assert.deepEqual(missing.applies(ctxFor({ ...LOAN_NEWER, auto_gap_coverage: 'no' })), { vars: { financing: 'loan' } });
    assert.deepEqual(missing.applies(ctxFor({ ...LEASE_NEWER, auto_gap_coverage: 'no' })), { vars: { financing: 'lease' } });
    assert.deepEqual(firedIds({ ...LOAN_NEWER, auto_gap_coverage: 'no' }), ['auto-gap-coverage-missing']);
  });

  t('owned outright => neither gap flag fires, whatever else is said', () => {
    for (const value of VALUES) {
      for (const gap of GAP) {
        const ids = firedIds(clean({ auto_financing: 'paid_off', auto_value: value, auto_gap_coverage: gap }));
        assert.equal(ids.includes('auto-gap-coverage-missing') || ids.includes('auto-gap-coverage-confirm'), false, `${value}/${gap}`);
      }
    }
  });

  t('a low-value car (under $3,000) never gets a gap flag, loan or lease', () => {
    for (const financing of ['loan', 'lease']) {
      for (const gap of ['no', 'not_sure']) {
        const o = { auto_financing: financing, auto_value: 'under_3000', auto_gap_coverage: gap };
        assert.deepEqual(firedIds(o), [], `${financing}/${gap}`);
      }
    }
  });

  t('a Not sure car value still fires (it cannot rule the gap out): Raise on no, Question on Not sure', () => {
    assert.deepEqual(firedIds({ auto_financing: 'loan', auto_value: 'not_sure', auto_gap_coverage: 'no' }), ['auto-gap-coverage-missing']);
    assert.deepEqual(firedIds({ auto_financing: 'lease', auto_value: 'not_sure', auto_gap_coverage: 'not_sure' }), ['auto-gap-coverage-confirm']);
  });

  t('a Not sure gap answer never raises: only the Question twin fires', () => {
    const o = { ...LOAN_NEWER, auto_gap_coverage: 'not_sure' };
    assert.equal(missing.applies(ctxFor(o)), false);
    assert.deepEqual(confirm.applies(ctxFor(o)), { vars: { financing: 'loan' } });
    assert.deepEqual(firedIds(o), ['auto-gap-coverage-confirm']);
  });

  t('yes (already covered) and an unanswered gap question fire neither', () => {
    assert.deepEqual(firedIds({ ...LOAN_NEWER, auto_gap_coverage: 'yes' }), []);
    assert.deepEqual(firedIds({ ...LEASE_NEWER, auto_gap_coverage: 'yes' }), []);
    assert.deepEqual(firedIds({ ...LOAN_NEWER }), []);
  });

  t('missing answers never fire: no financing answer, or no car-value answer', () => {
    assert.deepEqual(firedIds({ auto_gap_coverage: 'no' }), []);
    assert.deepEqual(firedIds({ auto_financing: 'loan', auto_gap_coverage: 'no' }), []);
    assert.deepEqual(firedIds({ auto_value: '10000_24999', auto_gap_coverage: 'no' }), []);
  });

  t('full matrix (4 financing x 6 values x 4 gap answers): each flag fires exactly when the gate and the answer say so', () => {
    let checked = 0;
    for (const financing of FINANCING) {
      for (const value of VALUES) {
        for (const gap of GAP) {
          const ids = firedIds(clean({ auto_financing: financing, auto_value: value, auto_gap_coverage: gap }));
          const gate = (financing === 'loan' || financing === 'lease') && value !== undefined && value !== 'under_3000';
          const label = `${financing}/${value}/${gap}`;
          assert.equal(ids.includes('auto-gap-coverage-missing'), gate && gap === 'no', `missing ${label}`);
          assert.equal(ids.includes('auto-gap-coverage-confirm'), gate && gap === 'not_sure', `confirm ${label}`);
          assert.equal(ids.includes('auto-gap-coverage-missing') && ids.includes('auto-gap-coverage-confirm'), false, `never both ${label}`);
          checked++;
        }
      }
    }
    assert.equal(checked, 96);
  });

  t('a stale gap answer is pruned when the car turns out to be owned outright', () => {
    assert.deepEqual(firedIds({ auto_financing: 'paid_off', auto_value: '10000_24999', auto_gap_coverage: 'no' }), []);
  });

  t('end to end: the Raise sits in the raise bucket, the twin in question; both normal emphasis', () => {
    const r = run({ ...LOAN_NEWER, auto_gap_coverage: 'no' });
    assert.deepEqual(r.flags.raise.map((f) => f.id).filter((id) => MINE.includes(id)), ['auto-gap-coverage-missing']);
    const m = r.flags.raise.find((f) => f.id === 'auto-gap-coverage-missing');
    assert.equal(m.bucket, 'raise');
    assert.equal(m.emphasis, 'normal');
    assert.equal(m.title, 'Ask about adding gap coverage to your financed car');
    const r2 = run({ ...LEASE_NEWER, auto_gap_coverage: 'not_sure' });
    const c = r2.flags.question.find((f) => f.id === 'auto-gap-coverage-confirm');
    assert.equal(c.bucket, 'question');
    assert.equal(c.emphasis, 'normal');
    assert.equal(c.title, 'Find out whether your leased car has gap coverage');
  });

  t('a lease plus "no" is worded as a reason to check the lease paperwork first, not as a loan add-on', () => {
    const f = rendered('auto-gap-coverage-missing', { ...LEASE_NEWER, auto_gap_coverage: 'no' });
    assert.match(f.title, /^Confirm your leased car/);
    assert.includes(f.background, 'Leases generally require it');
    assert.includes(f.ask, 'Check your lease paperwork first');
    assert.includes(f.ask, 'leasing company');
    assert.equal(/roll it into the loan|sales contract/i.test(f.ask), false, 'no loan-only advice in the lease text');
  });

  t('a loan is never said to require gap: the text says a dealer or lender generally cannot make you buy it unless the contract says so', () => {
    const f = rendered('auto-gap-coverage-missing', { ...LOAN_NEWER, auto_gap_coverage: 'no' });
    assert.includes(f.ask, 'A dealer or lender generally cannot make you buy gap unless your sales contract explicitly says so');
    for (const s of ['loan', 'lease']) {
      for (const id of ['auto-gap-coverage-missing', 'auto-gap-coverage-confirm']) {
        const out = rendered(id, { auto_financing: s, auto_value: '10000_24999', auto_gap_coverage: id.endsWith('missing') ? 'no' : 'not_sure' });
        const text = TEXT_FIELDS.map((k) => out[k]).join(' ');
        assert.equal(/(lender|dealer|bank)s?\s+(will\s+)?(requires?|demands?|insists?)/i.test(text), false, `${id}/${s}: a lender is said to require gap`);
        assert.equal(/required (by|for) (your|a) (lender|loan)/i.test(text), false, `${id}/${s}: gap said to be required for a loan`);
      }
    }
  });

  t('no gap price is stated anywhere (none is sourced); prices are said to vary, so compare', () => {
    const text = allTexts('auto-gap-coverage-missing') + '\n' + allTexts('auto-gap-coverage-confirm');
    assert.equal(/\$\s?\d/.test(text), false, 'no dollar figure');
    assert.includes(allTexts('auto-gap-coverage-missing'), 'prices vary widely');
    assert.includes(allTexts('auto-gap-coverage-confirm'), 'prices vary widely');
  });

  t('a depreciation claim is only made about NEW cars, as the research fact says; the catalog has no model year, so no "most cars" generality', () => {
    // research fact gap-when-it-matters: "New cars lose value quickly, with most losing about 20 percent within a year."
    // The flags fire for a car of any age (not certainly under $3,000), so an unqualified claim could be false for a used car.
    const fact = autoResearch.facts.find((x) => x.id === 'gap-when-it-matters');
    assert.includes(fact.claim, 'New cars lose value quickly, with most losing about 20 percent within a year');
    const text = allTexts('auto-gap-coverage-missing') + '\n' + allTexts('auto-gap-coverage-confirm');
    assert.equal(/\b(most|many|all|every)\s+(cars|vehicles|autos)\b/i.test(text), false, 'no unqualified "most cars" claim');
    const sentences = text.split(/[.!?]\s+/);
    const depreciation = sentences.filter((s) => /\blos(e|es|ing|t)\b[^.]*\bvalue\b|\bvalue\b[^.]*\blos(e|es|ing|t)\b|\bdepreciat/i.test(s));
    assert.equal(depreciation.length > 0, true, 'the loan text still carries the depreciation point');
    for (const s of depreciation) assert.equal(/\bnew car/i.test(s), true, `a depreciation sentence must be about new cars: ${s}`);
    const loan = rendered('auto-gap-coverage-missing', { ...LOAN_NEWER, auto_gap_coverage: 'no' });
    assert.includes(loan.background, 'A new car loses value quickly, and most lose about 20 percent of their value within a year.');
  });

  t('the gap definition is the sourced one: pays the difference, does not replace collision or comprehensive', () => {
    const f = rendered('auto-gap-coverage-missing', { ...LOAN_NEWER, auto_gap_coverage: 'no' });
    assert.includes(f.background, 'pays what the car was worth, not what you still owe');
    assert.includes(f.background, 'Gap coverage pays the difference');
    assert.includes(f.background, 'does not replace collision or comprehensive');
    assert.includes(f.background, 'less than 20 percent down');
  });

  t('the Question twin only asks: it points to the loan or lease paperwork, the lender or dealer, and the insurer', () => {
    const loan = rendered('auto-gap-coverage-confirm', { ...LOAN_NEWER, auto_gap_coverage: 'not_sure' });
    assert.includes(loan.ask, 'loan and sales paperwork');
    assert.includes(loan.ask, 'lender or dealer');
    assert.includes(loan.ask, 'A dealer or lender generally cannot make you buy gap unless your sales contract explicitly says so');
    assert.includes(loan.ask, 'auto insurer');
    const lease = rendered('auto-gap-coverage-confirm', { ...LEASE_NEWER, auto_gap_coverage: 'not_sure' });
    assert.includes(lease.ask, 'lease paperwork');
    assert.includes(lease.ask, 'leasing company');
  });

  t('the twin has its own sources (a subset of the Raise sources) and the Raise carries the extra NAIC one', () => {
    assert.deepEqual(confirm.sourceIds, ['iii-what-is-gap-insurance', 'cfpb-what-is-gap-insurance', 'cfpb-gap-required-by-lender']);
    assert.deepEqual(missing.sourceIds, ['iii-what-is-gap-insurance', 'cfpb-what-is-gap-insurance', 'cfpb-gap-required-by-lender', 'naic-shopping-tool-auto-2023']);
  });
});

// ======================================================================================================
suite('S8 auto flags: auto-rental-reimbursement-check (Question)', (t) => {
  const flag = flagById('auto-rental-reimbursement-check');

  t('fires for yes, no and Not sure, each with its own situation', () => {
    assert.deepEqual(flag.applies(ctxFor({ auto_rental_reimbursement: 'yes' })), { vars: { answer: 'yes' } });
    assert.deepEqual(flag.applies(ctxFor({ auto_rental_reimbursement: 'no' })), { vars: { answer: 'no' } });
    assert.deepEqual(flag.applies(ctxFor({ auto_rental_reimbursement: 'not_sure' })), { vars: { answer: 'unsure' } });
  });

  t('does not fire when the question is unanswered or the household has no car', () => {
    assert.equal(flag.applies(ctxFor({})), false);
    assert.deepEqual(firedIds({ auto_rental_reimbursement: 'yes' }, []), []);
  });

  t('is independent of the gate questions (financing and value do not change it)', () => {
    const base = firedIds({ auto_rental_reimbursement: 'no' });
    assert.deepEqual(base, ['auto-rental-reimbursement-check']);
    assert.deepEqual(firedIds({ auto_rental_reimbursement: 'no', auto_financing: 'loan', auto_value: '25000_plus' }), base);
    assert.deepEqual(firedIds({ auto_rental_reimbursement: 'no', auto_financing: 'paid_off', auto_value: 'under_3000' }), base);
  });

  t('each answer gets its own text, and every text names the daily and total caps', () => {
    const out = textsOf('auto-rental-reimbursement-check').map((s) => s.flagOut);
    assert.equal(out.length, 3);
    assert.equal(new Set(out.map((f) => f.title)).size, 3);
    assert.equal(new Set(out.map((f) => f.ask)).size, 3);
    assert.equal(new Set(out.map((f) => f.reason)).size, 3);
    for (const f of out) {
      assert.includes(f.ask.toLowerCase(), 'daily', f.title);
      assert.includes(f.ask.toLowerCase(), 'total', f.title);
      assert.includes(f.background, 'cap both the daily amount and the number of days', f.title);
    }
  });

  t('yes: check the caps; no: ask whether it is worth adding, framed as the user\'s call; Not sure: find out whether you have it', () => {
    const by = (situation) => textsOf('auto-rental-reimbursement-check').find((s) => s.situation === situation).flagOut;
    assert.match(by('yes').title, /^Check the limits/);
    assert.includes(by('yes').background, 'the thing to check is the caps');
    assert.match(by('no').title, /^Ask whether/);
    assert.includes(by('no').ask, 'Whether it is worth it is your call');
    assert.includes(by('no').background, 'priced separately and raises your premium');
    assert.match(by('unsure').title, /^Find out whether/);
    assert.includes(by('unsure').ask, 'whether you have rental reimbursement');
  });

  t('it is about a rental while the car is repaired, not a car rented on a trip, and may sit under collision and comprehensive', () => {
    for (const s of textsOf('auto-rental-reimbursement-check')) {
      assert.includes(s.flagOut.background, 'while your own car is being repaired', s.situation);
      assert.includes(s.flagOut.background, 'different from insurance for a car you rent on a trip', s.situation);
    }
    for (const situation of ['no', 'unsure']) {
      const f = textsOf('auto-rental-reimbursement-check').find((s) => s.situation === situation).flagOut;
      assert.includes(f.background, 'tied to your collision and comprehensive coverage instead', situation);
    }
  });

  t('the NAIC\'s example caps are an illustration, so no per-day or total amount is presented here', () => {
    const text = allTexts('auto-rental-reimbursement-check');
    assert.equal(/\$\s?\d/.test(text), false, 'no dollar figure');
  });

  t('end to end: Question bucket, normal emphasis, four NAIC sources in order', () => {
    const f = rendered('auto-rental-reimbursement-check', { auto_rental_reimbursement: 'no' });
    assert.equal(f.bucket, 'question');
    assert.equal(f.emphasis, 'normal');
    assert.deepEqual(f.sources.map((s) => s.id), [
      'naic-shopping-tool-auto-2023', 'naic-what-does-auto-insurance-cover', 'naic-consumer-insight-right-protection', 'naic-consumers-guide-auto-2022',
    ]);
    for (const s of f.sources) assert.equal(s.publisher, 'National Association of Insurance Commissioners');
  });
});

// ======================================================================================================
suite('S8 auto flags: auto-collision-older-car (Drop)', (t) => {
  const flag = flagById('auto-collision-older-car');
  const OWNED_LOW = { auto_financing: 'paid_off', auto_value: 'under_3000' };

  const FINANCING = [undefined, 'loan', 'lease', 'paid_off'];
  const VALUES = [undefined, 'under_3000', '3000_9999', '10000_24999', '25000_plus', 'not_sure'];
  const COLLISION = [undefined, 'yes', 'no', 'not_sure'];

  t('owned outright + worth under $3,000 + still paying for collision and comprehensive => the Drop fires', () => {
    assert.equal(flag.applies(ctxFor({ ...OWNED_LOW, auto_collision: 'yes' })), true);
    assert.deepEqual(firedIds({ ...OWNED_LOW, auto_collision: 'yes' }), ['auto-collision-older-car']);
  });

  t('a Not sure collision answer produces no flag (it cannot support a Drop); so does no', () => {
    assert.deepEqual(firedIds({ ...OWNED_LOW, auto_collision: 'not_sure' }), []);
    assert.deepEqual(firedIds({ ...OWNED_LOW, auto_collision: 'no' }), []);
    assert.deepEqual(firedIds({ ...OWNED_LOW }), []);
  });

  t('a financed or leased car never gets the Drop, and neither does a higher-value or Not sure value car', () => {
    for (const financing of ['loan', 'lease']) {
      assert.deepEqual(firedIds({ auto_financing: financing, auto_value: 'under_3000', auto_collision: 'yes' }), [], financing);
    }
    for (const value of ['3000_9999', '10000_24999', '25000_plus', 'not_sure']) {
      assert.deepEqual(firedIds({ auto_financing: 'paid_off', auto_value: value, auto_collision: 'yes' }), [], value);
    }
  });

  t('full matrix (4 financing x 6 values x 4 collision answers): fires exactly for paid off + under $3,000 + yes', () => {
    let checked = 0;
    for (const financing of FINANCING) {
      for (const value of VALUES) {
        for (const collision of COLLISION) {
          const ids = firedIds(clean({ auto_financing: financing, auto_value: value, auto_collision: collision }));
          const expected = financing === 'paid_off' && value === 'under_3000' && collision === 'yes';
          assert.equal(ids.includes('auto-collision-older-car'), expected, `${financing}/${value}/${collision}`);
          checked++;
        }
      }
    }
    assert.equal(checked, 96);
  });

  t('the Drop is a Drop-bucket item with a hedged title that asks about dropping, with normal emphasis', () => {
    const f = rendered('auto-collision-older-car', { ...OWNED_LOW, auto_collision: 'yes' });
    assert.equal(f.bucket, 'drop');
    assert.equal(f.kind, 'within-policy');
    assert.equal(f.emphasis, 'normal');
    assert.equal(f.title, 'Ask about dropping collision and comprehensive on your low-value car');
  });

  t('the wording is the sourced test, not an age rule: ten times the premium, applied with the agent', () => {
    const f = rendered('auto-collision-older-car', { ...OWNED_LOW, auto_collision: 'yes' });
    assert.includes(f.background, 'The Insurance Information Institute gives a rule of thumb');
    assert.includes(f.background, 'worth less than ten times the premium');
    assert.includes(f.background, 'may not be cost effective');
    assert.includes(f.ask, 'apply the ten-times rule with you');
    const text = TEXT_FIELDS.map((k) => f[k]).join(' ');
    assert.equal(/\b\d+[- ]years?[- ]old|older than \d|over \d+ years|10 years/i.test(text), false, 'no vehicle-age trigger');
  });

  t('it says the lender point and the owner\'s choice plainly, and that state law does not require the coverage', () => {
    const f = rendered('auto-collision-older-car', { ...OWNED_LOW, auto_collision: 'yes' });
    assert.includes(f.background, 'a lender usually requires them only until the loan is paid off');
    assert.includes(f.background, 'keeping them is your choice');
    assert.includes(f.background, 'State law does not require either one');
  });

  t('the safeguards are all there: a higher deductible instead, money set aside, could you replace the car, and the rental catch', () => {
    const f = rendered('auto-collision-older-car', { ...OWNED_LOW, auto_collision: 'yes' });
    assert.includes(f.ask, 'raising your deductible instead');
    assert.includes(f.ask, 'money set aside');
    assert.includes(f.ask, 'repair or replace the car yourself');
    assert.includes(f.ask, 'generally extends to a car you rent for personal trips');
    assert.includes(f.ask, 'may leave a rental unprotected');
    assert.includes(f.background, 'deductible (the part of a claim you pay first)');
  });

  t('no savings figures are quoted (none is sourced)', () => {
    const f = rendered('auto-collision-older-car', { ...OWNED_LOW, auto_collision: 'yes' });
    const text = TEXT_FIELDS.map((k) => f[k]).join(' ');
    assert.equal(/saves? \$|\$\s?\d+ (a|per) year|\d+ percent/i.test(text), false);
  });

  t('end to end: every source resolves to an authority publisher and the list matches the plan', () => {
    const f = rendered('auto-collision-older-car', { ...OWNED_LOW, auto_collision: 'yes' });
    assert.equal(f.sources.length, 7);
    assert.deepEqual(f.sources.map((s) => s.id), flag.sourceIds);
    const publishers = new Set(f.sources.map((s) => s.publisher));
    assert.deepEqual([...publishers].sort(), ['Insurance Information Institute', 'National Association of Insurance Commissioners']);
  });
});

// ======================================================================================================
suite('S8 auto flags: all five together, ordering and the shared guarantees', (t) => {
  const EVERYTHING = {
    auto_financing: 'loan', auto_value: '10000_24999', auto_gap_coverage: 'no',
    auto_um_uim: 'no', auto_rental_reimbursement: 'no',
  };

  t('a financed newer car with several gaps: Raise first, then Questions in priority order; the Drop is absent', () => {
    const { order, byId } = mineIn(run(EVERYTHING));
    assert.deepEqual(order, ['auto-gap-coverage-missing', 'auto-um-uim-check', 'auto-rental-reimbursement-check']);
    assert.equal(byId['auto-gap-coverage-missing'].bucket, 'raise');
    assert.equal(byId['auto-collision-older-car'], undefined);
  });

  t('a paid-off cheap car: the Drop and the Questions; no gap flag', () => {
    const o = { auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'yes', auto_um_uim: 'not_sure', auto_rental_reimbursement: 'yes' };
    assert.deepEqual(firedIds(o), ['auto-collision-older-car', 'auto-um-uim-check', 'auto-rental-reimbursement-check']);
  });

  t('a well covered household fires none of the five', () => {
    const o = {
      auto_financing: 'loan', auto_value: '10000_24999', auto_gap_coverage: 'yes',
      auto_um_uim: 'yes', auto_um_uim_limit: '250_500', auto_rental_reimbursement: 'yes',
    };
    // The rental Question still asks about caps for a yes: that is by design, so it is the only one left.
    assert.deepEqual(firedIds({ ...o, auto_rental_reimbursement: undefined }), []);
    assert.deepEqual(firedIds(o), ['auto-rental-reimbursement-check']);
  });

  t('emphasis is normal for every flag over the whole scenario table (no escalation is justified by the answers)', () => {
    for (const s of SCENARIOS) assert.equal(rendered(s.flag, s.o).emphasis, 'normal', `${s.flag}/${s.situation}`);
    for (const f of AUTO) {
      for (const s of SCENARIOS.filter((x) => x.flag === f.id)) {
        const out = f.applies(ctxFor(s.o));
        assert.equal(out === true || (out && out.emphasis === undefined), true, `${f.id}/${s.situation} sets no emphasis`);
      }
    }
  });

  t('every scenario fires exactly its own flag, in the bucket the plan gives, and no other S8 flag', () => {
    for (const s of SCENARIOS) {
      assert.deepEqual(firedIds(s.o), [s.flag], `${s.flag}/${s.situation}`);
      const out = rendered(s.flag, s.o);
      assert.equal(out.bucket, PLAN_ROWS.find((r) => r.id === s.flag).bucket, s.flag);
    }
  });

  t('all twelve situations render title, background, ask and reason as non-empty text with no unresolved {{tokens}}', () => {
    assert.equal(SCENARIOS.length, 12);
    for (const s of SCENARIOS) {
      const out = rendered(s.flag, s.o);
      for (const k of TEXT_FIELDS) {
        assert.equal(typeof out[k], 'string', `${s.flag}/${s.situation}.${k}`);
        assert.equal(out[k].trim().length > 20, true, `${s.flag}/${s.situation}.${k} has text`);
        assert.equal(/\{\{|\}\}/.test(out[k]), false, `${s.flag}/${s.situation}.${k} has a token`);
      }
    }
  });

  t('copy rules: no state is named, no banned wording or dashes, plain second person', () => {
    for (const s of SCENARIOS) {
      const out = rendered(s.flag, s.o);
      for (const k of TEXT_FIELDS) {
        assert.equal(STATES.test(out[k]), false, `${s.flag}/${s.situation}.${k} names a state: ${out[k]}`);
        assert.equal(BANNED.test(out[k]), false, `${s.flag}/${s.situation}.${k} has banned wording: ${out[k]}`);
      }
    }
  });

  t('the reason is one sentence the user can repeat, spoken in the first person', () => {
    for (const s of SCENARIOS) {
      const reason = rendered(s.flag, s.o).reason;
      assert.equal(sentenceBreaks(reason), 1, `${s.flag}/${s.situation}: ${reason}`);
      assert.match(reason, /^(I|If my|My) /, `${s.flag}/${s.situation}: ${reason}`);
    }
  });

  t('the ask tells the user what to do or whom to ask', () => {
    for (const s of SCENARIOS) {
      const ask = rendered(s.flag, s.o).ask;
      assert.match(ask, /\b(Ask|Check|Look|ask)\b/, `${s.flag}/${s.situation}`);
    }
  });

  t('titles are action phrases that start with a verb', () => {
    for (const s of SCENARIOS) {
      assert.match(rendered(s.flag, s.o).title, /^(Ask|Find out|Check|Confirm) /, `${s.flag}/${s.situation}`);
    }
  });

  t('every rendered source has exactly the five registry fields, an https url and an authority publisher', () => {
    const ok = ['Insurance Information Institute', 'National Association of Insurance Commissioners', 'Consumer Financial Protection Bureau', 'Insurance Research Council'];
    for (const s of SCENARIOS) {
      const out = rendered(s.flag, s.o);
      assert.equal(out.sources.length >= 1, true, s.flag);
      for (const src of out.sources) {
        assert.deepEqual(Object.keys(src), ['id', 'publisher', 'title', 'url', 'lastVerified'], `${s.flag}/${src.id}`);
        assert.match(src.url, /^https:\/\/[a-z0-9.-]+\//, src.id);
        assert.includes(ok, src.publisher, `${s.flag}/${src.id}`);
        assert.deepEqual(src, SOURCES[src.id], `${s.flag}/${src.id} equals the registry entry`);
      }
    }
  });

  t('determinism: the same answers give deep-equal results, and the input answers are never touched', () => {
    for (const s of SCENARIOS) {
      const answers = deepFreeze(copy(answersFor(s.o)));
      const a = evaluate(answers);
      const b = evaluate(answers);
      assert.deepEqual(a, b, `${s.flag}/${s.situation}`);
    }
  });

  t('the text functions are pure: same ctx and vars give the same text, and two renders of a flag agree', () => {
    for (const s of SCENARIOS) {
      const flag = flagById(s.flag);
      const ctx = ctxFor(s.o);
      const first = flag.applies(ctx);
      const second = flag.applies(ctx);
      assert.deepEqual(first, second);
      const vars = first === true ? {} : first.vars;
      for (const k of TEXT_FIELDS) {
        const text = (v) => (typeof v === 'function' ? v(ctx, vars) : v);
        assert.equal(text(flag[k]), text(flag[k]), `${s.flag}/${s.situation}.${k}`);
      }
    }
  });

  t('the flag objects are plain data plus functions: no module state is changed by evaluating', () => {
    const before = JSON.stringify(AUTO.map((f) => ({ id: f.id, bucket: f.bucket, priority: f.priority, sourceIds: f.sourceIds })));
    for (const s of SCENARIOS) run(s.o);
    const after = JSON.stringify(AUTO.map((f) => ({ id: f.id, bucket: f.bucket, priority: f.priority, sourceIds: f.sourceIds })));
    assert.equal(after, before);
  });
});

// ======================================================================================================
suite('S8 auto flags: the uninsured-driver statistic, and staying in their own lane', (t) => {
  t('the UM/UIM flag quotes the research statistic\'s year and says "more than one in seven"', () => {
    const stat = autoResearch.designInputs.uninsuredDriverStatistic;
    assert.includes(allTexts('auto-um-uim-check'), `in ${stat.dataYear}.`);
    assert.includes(allTexts('auto-um-uim-check'), 'more than one in seven');
  });

  t('the auto flags stay in their own lane: no matching-limits advice, no roadside, no MedPay, no deductible savings (those belong to other flags)', () => {
    const all = SCENARIOS.map((s) => { const f = rendered(s.flag, s.o); return TEXT_FIELDS.map((k) => f[k]).join(' '); }).join('\n');
    assert.equal(/roadside|towing|medical payments|medpay|health plan|health insurance/i.test(all), false);
    assert.equal(/matching it to your liability|lower than the liability you carry/i.test(all), false);
    assert.equal(/\$\d+-\$\d+ a year/.test(all), false);
  });
});

