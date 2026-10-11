// Story S12 audit: does the scenario matrix reach everything the catalog can say or ask?
//
// When a story adds a flag, a question or an option, these tests fail until a scenario in tests/scenarios/scenarios.mjs
// uses it, so nothing ships that no household in the matrix ever sees. Each failure names exactly what is missing.
//
// Pure data checks; runs under jsc and Node.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { POLICY_IDS, NOT_SURE } from '../../public/js/overlap/engine/constants.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import SCENARIOS from '../scenarios/scenarios.mjs';
import { CARDS } from '../../public/js/overlap/data/cards.mjs';
import { FIXTURE_CARDS } from '../fixtures/otherCards.mjs';
import { scenarioRuns, flagsOf, BUCKETS } from './corpus.mjs';
import { DROP_EVIDENCE, hasEvidence } from './evidence.mjs';
import { phoneVariant, umbrellaGapShape } from './variants.mjs';

const session = createSession(CATALOG);
// The same catalog with the fixture card table: the real table is empty (DECISIONS D14), so a household whose card confirms a
// benefit can only be reached this way until Stories S4b and S11b fill it.
const WITH_FIXTURE = { ...CATALOG, cards: FIXTURE_CARDS };
const answerList = (value) => (Array.isArray(value) ? value : [value]);

suite('scenario coverage: flags', (t) => {
  t('every flag in the catalog is shown by at least one scenario', () => {
    const shown = new Set();
    for (const run of scenarioRuns()) for (const f of flagsOf(run.result)) shown.add(f.id);
    const unreached = CATALOG.flags.map((f) => f.id).filter((id) => !shown.has(id));
    assert.deepEqual(unreached, [], `flags no scenario triggers (add a scenario to tests/scenarios/scenarios.mjs): ${unreached.join(', ')}`);
  });

  t('every item a scenario shows is a flag the catalog has, in the bucket the flag declares or one it lists in alternateBuckets', () => {
    const allowed = new Map(CATALOG.flags.map((f) => [f.id, [f.bucket].concat(f.alternateBuckets || [])]));
    for (const catalog of [CATALOG, WITH_FIXTURE]) {
      for (const run of scenarioRuns(catalog)) {
        for (const f of flagsOf(run.result)) {
          assert.ok(allowed.has(f.id), `${run.id} shows ${f.id}, which is not in the catalog`);
          assert.ok(allowed.get(f.id).includes(f.bucket), `${run.id}: ${f.id} is in ${f.bucket}, the catalog allows ${allowed.get(f.id).join(', ')}`);
        }
      }
    }
  });

  t('all three buckets are exercised, each by flags the catalog declares in it and by more than one scenario', () => {
    for (const bucket of BUCKETS) {
      const inCatalog = CATALOG.flags.filter((f) => f.bucket === bucket).map((f) => f.id);
      assert.ok(inCatalog.length > 0, `the catalog declares no ${bucket} flag`);
      const scenariosWithBucket = scenarioRuns().filter((run) => run.result.flags[bucket].length > 0);
      assert.ok(scenariosWithBucket.length > 1, `${bucket}: shown by ${scenariosWithBucket.length} scenario(s)`);
      // A flag that is a Drop only with a duplicate (travel, warranties) cannot be one while the real card table is empty, so a Drop
      // counts as reached on the real catalog or on the one with the fixture cards.
      const reached = new Set();
      for (const catalog of [CATALOG, WITH_FIXTURE]) {
        for (const run of scenarioRuns(catalog)) for (const f of run.result.flags[bucket]) reached.add(f.id);
      }
      assert.deepEqual(inCatalog.filter((id) => !reached.has(id)), [], `${bucket} flags no scenario reaches`);
    }
  });

  t('a flag that can be filed in another bucket (alternateBuckets) is shown in each of its buckets by at least one scenario, on the real card table or the fixture one', () => {
    const missing = [];
    for (const flag of CATALOG.flags.filter((f) => Array.isArray(f.alternateBuckets))) {
      for (const bucket of [flag.bucket].concat(flag.alternateBuckets)) {
        const shown = [CATALOG, WITH_FIXTURE].some((catalog) => scenarioRuns(catalog).some((run) => run.result.flags[bucket].some((f) => f.id === flag.id)));
        if (!shown) missing.push(`${flag.id} is never a ${bucket}`);
      }
      // With the real table the flag is a Question for every scenario without a car policy to rely on, so the Question side is real data.
      assert.ok(scenarioRuns().some((run) => run.result.flags.question.some((f) => f.id === flag.id)), `${flag.id}: no scenario files it as a Question on the real card table`);
    }
    assert.deepEqual(missing, [], 'add scenarios to tests/scenarios/scenarios.mjs');
  });

  t('every wording of a flag whose text follows the household\'s answers is reached by a scenario: the phone item for each combination of home and renters, and the unconfirmed-limits item for each gap (DECISIONS S12-10 and S12-11)', () => {
    const seen = new Set();
    for (const run of scenarioRuns()) {
      for (const f of flagsOf(run.result)) {
        if (f.id === 'other-phone-insurance-card') seen.add(`the phone item, holding ${phoneVariant(run.answers.policies)} of home and renters`);
        if (f.id === 'umbrella-limits-unconfirmed') seen.add(`the unconfirmed-limits item, gap: ${umbrellaGapShape(run.answers)}`);
      }
    }
    const wanted = [
      ...['neither', 'home', 'renters', 'both'].map((v) => `the phone item, holding ${v} of home and renters`),
      ...['own', 'required', 'both-one-layer', 'both-two-layers'].map((g) => `the unconfirmed-limits item, gap: ${g}`),
    ];
    assert.deepEqual(wanted.filter((w) => !seen.has(w)), [], 'add a scenario to tests/scenarios/scenarios.mjs for each');
  });

  t('every Drop flag is reached by a household with evidence of a duplicate and by one without, so the evidence rules in tests/audit/evidence.mjs are exercised both ways (DECISIONS S12-8, S12-9)', () => {
    const drops = CATALOG.flags.filter((f) => f.bucket === 'drop').map((f) => f.id);
    assert.deepEqual(drops.slice().sort(), Object.keys(DROP_EVIDENCE).sort(), 'a Drop flag without an evidence rule, or a rule without a Drop flag');
    const policyOf = { 'auto-collision-older-car': 'auto', 'other-rental-car-waiver': 'rental_car', 'other-towing-roadside-duplicate': 'towing', 'other-travel-insurance-overlap': 'travel', 'other-extended-warranty-overlap': 'warranty' };
    const missing = [];
    for (const id of drops) {
      for (const [label, catalog, table] of [['the real card table', CATALOG, CARDS], ['the fixture card table', WITH_FIXTURE, FIXTURE_CARDS]]) {
        const holders = SCENARIOS.filter((s) => s.answers.policies.includes(policyOf[id]));
        const yes = holders.filter((s) => hasEvidence(id, s.answers, table));
        const no = holders.filter((s) => !hasEvidence(id, s.answers, table));
        // The real table is empty, so only the "without" side is required there; the fixture table must reach both.
        if (catalog === WITH_FIXTURE && yes.length === 0) missing.push(`${id}: no scenario with evidence of a duplicate (${label})`);
        if (no.length === 0) missing.push(`${id}: no scenario without evidence of a duplicate (${label})`);
        // A flag that can be a Question too (rental car, travel, warranties): a scenario with evidence shows it as a Drop, one without as a Question.
        if (Array.isArray(CATALOG.flags.find((f) => f.id === id).alternateBuckets)) {
          const bucketIn = (scenario) => {
            const run = scenarioRuns(catalog).find((r) => r.id === scenario.id);
            return ['drop', 'question', 'raise'].find((b) => run.result.flags[b].some((f) => f.id === id));
          };
          for (const s of yes) if (bucketIn(s) !== 'drop') missing.push(`${id}: ${s.id} has a duplicate but it is a ${bucketIn(s)} (${label})`);
          for (const s of no) if (bucketIn(s) !== 'question') missing.push(`${id}: ${s.id} has no duplicate but it is a ${bucketIn(s)} (${label})`);
        }
      }
    }
    assert.deepEqual(missing, [], 'add scenarios to tests/scenarios/scenarios.mjs');
  });

  t('both emphasis levels are exercised, and a scenario shows a Raise, a Drop and a Question together', () => {
    const emphases = new Set();
    for (const run of scenarioRuns()) for (const f of flagsOf(run.result)) emphases.add(f.emphasis);
    assert.deepEqual(Array.from(emphases).sort(), ['normal', 'strong']);
    const all = scenarioRuns().filter((run) => BUCKETS.every((b) => run.result.flags[b].length > 0));
    assert.ok(all.length > 0, 'no scenario shows all three buckets at once');
  });

  t('quiet households exist: with policies held and answers given, some scenarios raise no Raise item and no Drop item', () => {
    const quiet = scenarioRuns().filter((run) => run.result.flags.raise.length === 0 && run.result.flags.drop.length === 0 && run.answers.policies[0] !== 'none');
    assert.ok(quiet.length >= 3, `only ${quiet.length} scenarios without a Raise or Drop item`);
  });
});

suite('scenario coverage: policies and answers', (t) => {
  t('every policy in Q1 is ticked in at least one scenario, and so is "None of these"', () => {
    const ticked = new Set();
    for (const s of SCENARIOS) for (const id of s.answers.policies) ticked.add(id);
    assert.deepEqual(POLICY_IDS.filter((id) => !ticked.has(id)), [], 'policies no scenario ticks');
    assert.ok(ticked.has('none'), 'no scenario ticks "None of these"');
  });

  t('policy combinations: auto only, auto + home, an umbrella with each of auto / home / both, motorcycle + boat, renters only, health only', () => {
    const has = (pred) => SCENARIOS.some((s) => pred(s.answers.policies));
    const only = (list) => (p) => p.length === list.length && list.every((id) => p.includes(id));
    assert.ok(has(only(['auto'])), 'auto only');
    assert.ok(has(only(['auto', 'home'])), 'auto + home');
    assert.ok(has(only(['auto', 'home', 'umbrella'])), 'auto + home + umbrella');
    assert.ok(has(only(['auto', 'umbrella'])), 'auto + umbrella');
    assert.ok(has(only(['home', 'umbrella'])), 'home + umbrella');
    assert.ok(has(only(['umbrella'])), 'umbrella alone');
    assert.ok(has(only(['motorcycle', 'boat'])), 'motorcycle + boat without an umbrella');
    assert.ok(has((p) => p.includes('motorcycle') && p.includes('boat') && p.includes('umbrella')), 'motorcycle + boat + umbrella');
    assert.ok(has(only(['renters'])), 'renters only');
    assert.ok(has(only(['home', 'renters'])), 'home + renters');
    assert.ok(has(only(['health'])), 'health only');
    assert.ok(has((p) => p.includes('auto') && p.includes('health')), 'auto + health');
    assert.ok(has((p) => POLICY_IDS.every((id) => p.includes(id))), 'all thirteen at once');
  });

  t('every option of every question is chosen by at least one scenario', () => {
    const chosen = {};
    for (const s of SCENARIOS) {
      for (const qid of Object.keys(s.answers)) {
        chosen[qid] = chosen[qid] || new Set();
        for (const optionId of answerList(s.answers[qid])) chosen[qid].add(optionId);
      }
    }
    const missing = [];
    for (const q of session.questions) {
      for (const o of q.options) if (!(chosen[q.id] && chosen[q.id].has(o.id))) missing.push(`${q.id}=${o.id}`);
    }
    assert.deepEqual(missing, [], `question options no scenario chooses (add a scenario): ${missing.join(', ')}`);
  });

  t('every question that offers Not sure is answered Not sure by at least one scenario', () => {
    const withNotSure = session.questions.filter((q) => q.options.some((o) => o.id === NOT_SURE));
    assert.ok(withNotSure.length > 20, `only ${withNotSure.length} questions offer Not sure`);
    const missing = withNotSure.filter((q) => !SCENARIOS.some((s) => answerList(s.answers[q.id]).includes(NOT_SURE))).map((q) => q.id);
    assert.deepEqual(missing, [], `questions never answered Not sure: ${missing.join(', ')}`);
  });

  t('a scenario answers Not sure to every Not sure question it can reach at once', () => {
    const run = scenarioRuns().find((r) => r.id === 'not-sure-everywhere');
    assert.ok(run, 'a scenario named not-sure-everywhere exists');
    const visible = run.result.meta.visibleQuestionIds;
    const stillSure = visible.filter((qid) => {
      const q = session.getQuestion(qid);
      return q.options.some((o) => o.id === NOT_SURE) && !answerList(run.answers[qid]).includes(NOT_SURE);
    });
    assert.deepEqual(stillSure, [], `visible questions that offer Not sure but were not answered with it: ${stillSure.join(', ')}`);
    assert.equal(run.answers.policies.length, POLICY_IDS.length, 'all thirteen policies ticked');
  });

  t('the Other bucket items are exercised with a card ticked and with none (the real card table is empty, so no card is named yet)', () => {
    const cardItems = ['rental_car', 'towing', 'travel', 'phone', 'warranty'];
    for (const item of cardItems) {
      const mine = SCENARIOS.filter((s) => s.answers.policies.includes(item));
      const withCard = mine.filter((s) => Array.isArray(s.answers.cards) && s.answers.cards.some((c) => c !== 'other_none'));
      const withNone = mine.filter((s) => Array.isArray(s.answers.cards) && s.answers.cards.length === 1 && s.answers.cards[0] === 'other_none');
      assert.ok(withCard.length > 0, `${item}: no scenario with a card ticked`);
      assert.ok(withNone.length > 0, `${item}: no scenario with "Another card, or no card"`);
    }
  });

  t('accidental death is exercised with every answer about regular life insurance', () => {
    const answered = new Set(SCENARIOS.filter((s) => s.answers.policies.includes('accidental_death')).map((s) => s.answers.term_life));
    for (const option of ['own', 'work_only', 'none', 'not_sure']) assert.ok(answered.has(option), `term_life=${option} with accidental death`);
  });

  t('the gate answers that switch whole branches on and off are each exercised both ways', () => {
    const has = (qid, optionId, predicate) => SCENARIOS.some((s) => answerList(s.answers[qid]).includes(optionId) && (!predicate || predicate(s.answers)));
    // A newer financed or leased car opens the gap question; an old paid-off car opens the collision question.
    assert.ok(has('auto_financing', 'loan') && has('auto_financing', 'lease') && has('auto_financing', 'paid_off'), 'every way to own the car');
    assert.ok(has('auto_collision', 'yes') && has('auto_collision', 'no'), 'collision yes and no');
    // A homeowner paying for a child's renters policy opens the housing question; a renter paying for themselves does not.
    assert.ok(has('renters_for', 'child_away', (a) => a.policies.includes('home')), 'child away, parent owns a home');
    assert.ok(has('renters_for', 'child_away', (a) => !a.policies.includes('home')), 'child away, no home policy');
    assert.ok(has('renters_for', 'me', (a) => a.policies.includes('home')), 'renters for me, with a home policy');
    // Side business both ways, UM/UIM on the umbrella both ways.
    assert.ok(has('side_business', 'yes') && has('side_business', 'no'), 'side business yes and no');
    assert.ok(has('umbrella_um_uim', 'yes') && has('umbrella_um_uim', 'no'), 'umbrella UM/UIM yes and no');
  });
});
