// Story R1 step A: Q1, "Which policies do you have?", is a real asked question (id `policies`) in its own first
// section, and everything downstream is gated on it. These tests pin the SPEC's option list and order, the exclusive
// "None of these", the gating of every other question for every combination of Q1 ticks (with an independent oracle),
// what the answer is pruned to, and that `other_items`, `renters_with_home` and the host adapter are gone.
// Pure data checks over the real catalog; runs under jsc and Node.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { QUESTIONS, SECTIONS } from '../../public/js/overlap/data/questions/index.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import { createContext, evaluate } from '../../public/js/overlap/engine/evaluate.mjs';
import { validateCatalog } from '../../public/js/overlap/engine/validate.mjs';
import { evaluateCondition, conditionRefs } from '../../public/js/overlap/engine/conditions.mjs';
import { POLICY_IDS, POLICIES_QUESTION_ID } from '../../public/js/overlap/engine/constants.mjs';
import { importsOf, resolveSpec } from '../helpers/sourceScan.mjs';

const session = createSession(CATALOG);
const q1 = session.getQuestion('policies');
const visibleIds = (answers) => session.visibleQuestions(answers).map((q) => q.id);
const canRead = typeof read === 'function';

// SPEC "Question flow and branching", Q1: Auto, Home, Renters, Umbrella, Health, motorcycle and boat (named later in
// the SPEC as selectable in Q1), then the Other-bucket items in the order the SPEC lists them (rental car, towing,
// travel, phone, extended warranty, accidental death).
const SPEC_ORDER = [
  'auto', 'home', 'renters', 'umbrella', 'health', 'motorcycle', 'boat',
  'rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death',
];

// ======================================================================================================
suite('Q1 policies: the question itself', (t) => {
  t('is the first question of the catalog and sits alone in its own first section "start"', () => {
    assert.equal(QUESTIONS[0].id, 'policies');
    assert.equal(CATALOG.questions[0].id, 'policies');
    assert.equal(POLICIES_QUESTION_ID, 'policies');
    assert.equal(QUESTIONS.filter((q) => q.section === 'start').length, 1);
    assert.equal(QUESTIONS[0].section, 'start');
    assert.equal(SECTIONS[0].id, 'start');
    assert.equal(SECTIONS[0].showIf, null, 'the first section is always shown');
    assert.equal(typeof SECTIONS[0].reason === 'string' && SECTIONS[0].reason.length > 40, true, 'a reason line');
  });

  t('is a multi question that is always shown, with no Not sure (you know which policies you have)', () => {
    assert.equal(q1.type, 'multi');
    assert.equal(q1.showIf, null);
    assert.equal(q1.allowNotSure, false);
    assert.equal(q1.options.some((o) => o.id === 'not_sure'), false);
    assert.equal(q1.domain, 'core');
    assert.equal(q1.prompt, 'Which policies do you have?');
  });

  t('its options are exactly the SPEC list in SPEC order, then an exclusive "None of these"', () => {
    assert.deepEqual(q1.options.map((o) => o.id), [...SPEC_ORDER, 'none']);
    const none = q1.options[q1.options.length - 1];
    assert.equal(none.label, 'None of these');
    assert.equal(none.exclusive, true);
    for (const o of q1.options.slice(0, -1)) assert.equal(o.exclusive, undefined, `${o.id} is a plain tick`);
  });

  t('every option has a plain-language label, and the policy options are exactly the policy ids the DSL accepts', () => {
    for (const o of q1.options) assert.equal(typeof o.label === 'string' && o.label.trim().length >= 5, true, o.id);
    assert.deepEqual(q1.options.slice(0, -1).map((o) => o.id).sort(), POLICY_IDS.slice().sort());
  });

  t('the renters tick says it also covers a policy bought for a child living away from home', () => {
    assert.match(q1.options.find((o) => o.id === 'renters').label, /child/);
  });

  t('the whole catalog still validates with Q1 in it', () => {
    assert.deepEqual(validateCatalog(CATALOG).errors, []);
  });

  t('every holds condition and every section gate reads Q1 only through holds, never as an answer', () => {
    for (const q of QUESTIONS) {
      if (q.showIf === null) continue;
      for (const r of conditionRefs(q.showIf).answers) assert.notEqual(r.qid, 'policies', `${q.id} reads policies as an answer`);
    }
    for (const s of SECTIONS) {
      if (s.showIf === null) continue;
      assert.deepEqual(conditionRefs(s.showIf).answers, [], `${s.id} gate reads an answer`);
    }
  });
});

// ======================================================================================================
suite('Q1 policies: what the answer is pruned to, and what holds reads', (t) => {
  const prune = (policies) => session.prune({ policies }).policies;

  t('a tick list is stored in SPEC order without duplicates, whatever order it arrives in', () => {
    assert.deepEqual(prune(['boat', 'auto', 'umbrella', 'auto', 'home']), ['auto', 'home', 'umbrella', 'boat']);
    assert.deepEqual(prune(SPEC_ORDER.slice().reverse()), SPEC_ORDER);
  });

  t('unknown ids are dropped, and a list with nothing valid in it counts as unanswered', () => {
    assert.deepEqual(prune(['auto', 'flood', 3, null, 'other_items']), ['auto']);
    assert.equal('policies' in session.prune({ policies: ['flood'] }), false);
    assert.equal('policies' in session.prune({ policies: [] }), false);
  });

  t('"None of these" wins over any other tick', () => {
    assert.deepEqual(prune(['auto', 'none', 'home']), ['none']);
    assert.deepEqual(prune(['none']), ['none']);
  });

  t('a string, a number or an object is not an answer to a multi question', () => {
    for (const bad of ['auto', 5, { auto: true }, null]) assert.equal('policies' in session.prune({ policies: bad }), false, JSON.stringify(bad));
  });

  t('tapping options: ticking adds, ticking again removes, "None of these" clears the rest and the rest clear it', () => {
    let a = {};
    a = session.toggleOption(a, 'policies', 'home');
    a = session.toggleOption(a, 'policies', 'auto');
    assert.deepEqual(a.policies, ['auto', 'home'], 'kept in SPEC order');
    a = session.toggleOption(a, 'policies', 'none');
    assert.deepEqual(a.policies, ['none']);
    a = session.toggleOption(a, 'policies', 'umbrella');
    assert.deepEqual(a.policies, ['umbrella'], 'ticking a policy clears "None of these"');
    a = session.toggleOption(a, 'policies', 'umbrella');
    assert.equal('policies' in a, false, 'an emptied answer is removed');
    assert.throws(() => session.toggleOption({}, 'policies', 'not_sure'), /Unknown option/);
    assert.throws(() => session.toggleOption({}, 'policies', 'other_items'), /Unknown option/);
  });

  t('ctx.holds reads the ticks: true for a ticked policy, false for the rest, and never true for "none"', () => {
    const ctx = createContext({ policies: ['auto', 'umbrella'] });
    for (const id of SPEC_ORDER) assert.equal(ctx.holds(id), id === 'auto' || id === 'umbrella', id);
    const nothing = createContext({ policies: ['none'] });
    for (const id of [...SPEC_ORDER, 'none']) assert.equal(nothing.holds(id), false, `none ticked: ${id}`);
    const unanswered = createContext({});
    for (const id of SPEC_ORDER) assert.equal(unanswered.holds(id), false, `unanswered: ${id}`);
  });

  t('ctx.answer, ctx.includes and ctx.is treat policies like any other asked question', () => {
    const ctx = createContext({ policies: ['home', 'auto'] });
    assert.deepEqual(ctx.answer('policies'), ['auto', 'home']);
    assert.equal(ctx.includes('policies', 'home'), true);
    assert.equal(ctx.includes('policies', 'boat'), false);
    assert.equal(ctx.is('policies', 'home'), false, 'is() is for single questions');
    assert.equal(ctx.isNotSure('policies'), false);
    assert.deepEqual(ctx.option('policies').map((o) => o.id), ['auto', 'home']);
  });

  t('a condition { holds } reads the same ticks, and the answers object needs no other key', () => {
    const answers = { policies: ['auto', 'home'] };
    assert.equal(evaluateCondition({ holds: 'auto' }, { answers }), true);
    assert.equal(evaluateCondition({ holds: 'boat' }, { answers }), false);
    assert.equal(evaluateCondition({ holds: 'auto' }, { answers: {} }), false);
    assert.equal(evaluateCondition({ holds: 'none' }, { answers: { policies: ['none'] } }), false);
  });

  t('Q1 is always visible, even with nothing answered', () => {
    assert.equal(session.isVisible('policies', {}), true);
    assert.equal(session.isVisible('policies', { policies: ['none'] }), true);
    assert.deepEqual(visibleIds({}), ['policies']);
  });

  t('nextUnanswered starts at Q1 and moves on once it is answered', () => {
    assert.equal(session.nextUnanswered({}).id, 'policies');
    assert.equal(session.nextUnanswered({ policies: ['none'] }), null);
    assert.equal(session.nextUnanswered({ policies: ['umbrella'] }).id, 'umbrella_limit');
  });
});

// ======================================================================================================
// An oracle for "which questions are visible given ONLY the Q1 ticks", written as set logic, not as conditions.
// Questions whose gate also needs an answer to an earlier question (auto_gap_coverage, auto_collision,
// auto_um_uim_limit, renters_child_housing, card_usual_payment) are hidden until that answer exists.
function rulesFor(has) {
  const any = (...ids) => ids.some(has);
  return {
    policies: true,
    umbrella_limit: has('umbrella'),
    auto_liability: has('umbrella') && has('auto'),
    umbrella_min_auto: has('umbrella') && has('auto'),
    home_liability: has('umbrella') && has('home'),
    umbrella_min_home: has('umbrella') && has('home'),
    motorcycle_liability: has('umbrella') && has('motorcycle'),
    umbrella_min_motorcycle: has('umbrella') && has('motorcycle'),
    boat_liability: has('umbrella') && has('boat'),
    umbrella_min_boat: has('umbrella') && has('boat'),
    umbrella_exposure: has('umbrella'),
    umbrella_um_uim: has('umbrella') && has('auto'),
    side_business: has('umbrella'),
    auto_financing: has('auto'),
    auto_value: has('auto'),
    auto_gap_coverage: false,
    auto_collision: false,
    auto_um_uim: has('auto'),
    auto_um_uim_limit: false,
    auto_rental_reimbursement: has('auto'),
    renters_for: has('renters'),
    renters_child_housing: false,
    auto_medpay: has('health') && has('auto'),
    health_hsa: has('health'),
    health_supplemental: has('health'),
    health_short_term: has('health'),
    home_sewer_backup: has('home'),
    home_flood_policy: has('home'),
    deductible_auto: has('auto'),
    deductible_home: has('home'),
    deductible_health: has('health'),
    emergency_cushion: any('auto', 'home', 'health'),
    cards: any('rental_car', 'towing', 'travel', 'phone', 'warranty'),
    card_usual_payment: false,
    phone_bill_on_card: has('phone'),
    roadside_sources: has('towing'),
    towing_vehicle_policy: has('towing') && any('motorcycle', 'boat'),
    term_life: has('accidental_death'),
  };
}
const oracle = (has) => QUESTIONS.map((q) => q.id).filter((id) => rulesFor(has)[id] === true);

suite('Q1 policies: gating of every downstream question, per combination of ticks', (t) => {
  t('the oracle has a rule for every question of the catalog, and only for those (a new question cannot slip past this test)', () => {
    assert.deepEqual(Object.keys(rulesFor(() => false)), QUESTIONS.map((q) => q.id));
  });

  t('all 8,192 combinations of the thirteen ticks open exactly the questions the oracle says, in catalog order', () => {
    let checked = 0;
    for (let mask = 0; mask < (1 << SPEC_ORDER.length); mask++) {
      const ticked = SPEC_ORDER.filter((_, i) => (mask >> i) & 1);
      const has = (id) => ticked.includes(id);
      assert.deepEqual(visibleIds({ policies: ticked }), oracle(has), `ticks: ${ticked.join(', ') || '(none)'}`);
      checked++;
    }
    assert.equal(checked, 8192);
  });

  t('nothing ticked, nothing answered, or "None of these": only Q1 is asked', () => {
    assert.deepEqual(visibleIds({}), ['policies']);
    assert.deepEqual(visibleIds({ policies: ['none'] }), ['policies']);
    assert.deepEqual(visibleIds({ policies: ['none', 'auto'] }), ['policies'], '"None of these" wins');
  });

  t('named households (SPEC walk-throughs)', () => {
    assert.deepEqual(visibleIds({ policies: ['auto'] }), [
      'policies', 'auto_financing', 'auto_value', 'auto_um_uim', 'auto_rental_reimbursement', 'deductible_auto', 'emergency_cushion',
    ]);
    assert.deepEqual(visibleIds({ policies: ['auto', 'home', 'umbrella'] }), [
      'policies',
      'umbrella_limit', 'auto_liability', 'umbrella_min_auto', 'home_liability', 'umbrella_min_home',
      'umbrella_exposure', 'umbrella_um_uim', 'side_business',
      'auto_financing', 'auto_value', 'auto_um_uim', 'auto_rental_reimbursement',
      'home_sewer_backup', 'home_flood_policy', 'deductible_auto', 'deductible_home', 'emergency_cushion',
    ]);
    assert.deepEqual(visibleIds({ policies: ['renters'] }), ['policies', 'renters_for']);
    assert.deepEqual(visibleIds({ policies: ['rental_car'] }), ['policies', 'cards']);
    assert.deepEqual(visibleIds({ policies: ['accidental_death'] }), ['policies', 'term_life']);
  });

  t('a parent who owns their home and pays for a child\'s renters policy ticks home and renters and reaches the dorm question', () => {
    const answers = { policies: ['home', 'renters'], renters_for: 'child_away' };
    assert.deepEqual(visibleIds(answers), [
      'policies', 'renters_for', 'renters_child_housing', 'home_sewer_backup', 'home_flood_policy', 'deductible_home', 'emergency_cushion',
    ]);
  });

  t('unticking a policy hides its questions and prunes their stale answers', () => {
    const on = { policies: ['auto', 'umbrella'], umbrella_limit: '1m', auto_liability: '100_300', auto_financing: 'loan' };
    assert.equal(session.prune(on).umbrella_limit, '1m');
    const off = { ...on, policies: ['auto'] };
    const kept = session.prune(off);
    assert.equal('umbrella_limit' in kept, false);
    assert.equal('auto_liability' in kept, false);
    assert.equal(kept.auto_financing, 'loan', 'what is still asked is kept');
    assert.equal(evaluate(off).meta.visibleQuestionIds.includes('umbrella_limit'), false);
    const none = session.prune({ ...on, policies: ['none'] });
    assert.deepEqual(none, { policies: ['none'] }, 'everything downstream is pruned');
  });

  t('answeredCount counts Q1 once it is answered', () => {
    assert.equal(evaluate({}).meta.answeredCount, 0);
    assert.equal(evaluate({ policies: ['none'] }).meta.answeredCount, 1);
    assert.equal(evaluate({ policies: ['auto'], auto_financing: 'loan' }).meta.answeredCount, 2);
  });
});

// ======================================================================================================
suite('other_items and the host adapter are gone (R1 step A)', (t) => {
  t('there is no other_items question and no renters_with_home option anywhere in the catalog', () => {
    assert.equal(session.getQuestion('other_items'), undefined);
    assert.equal(QUESTIONS.some((q) => q.id === 'other_items'), false);
    for (const q of QUESTIONS) assert.equal(q.options.some((o) => o.id === 'renters_with_home'), false, q.id);
  });

  t('no section is called "extras" any more (Q1 has its own section, "start")', () => {
    assert.equal(SECTIONS.some((s) => s.id === 'extras'), false);
    assert.equal(QUESTIONS.some((q) => q.section === 'extras'), false);
  });

  t('answers still carrying an other_items key are pruned as "not a question", and change nothing', () => {
    const base = evaluate({ policies: ['rental_car'] });
    const stale = evaluate({ policies: ['rental_car'], other_items: ['rental_car', 'travel'] });
    assert.deepEqual(stale, base);
    assert.equal('other_items' in session.prune({ policies: ['rental_car'], other_items: ['travel'] }), false);
  });

  t('no module reachable from the catalog or the view-models mentions other_items, renters_with_home or the adapter', () => {
    if (!canRead) return;
    const entries = [
      'public/js/overlap/data/catalog.mjs', 'public/js/overlap/engine/evaluate.mjs', 'public/js/overlap/engine/validate.mjs',
      'public/js/overlap-ui/viewModel.mjs',
    ];
    const seen = {};
    const queue = entries.slice();
    while (queue.length > 0) {
      const file = queue.shift();
      if (seen[file] !== undefined) continue;
      seen[file] = read(file);
      for (const spec of importsOf(seen[file])) if (spec.startsWith('.')) queue.push(resolveSpec(file, spec));
    }
    const files = Object.keys(seen);
    assert.equal(files.length > 30, true, `scanned ${files.length} modules`);
    for (const file of files) {
      assert.equal(/other_items|renters_with_home|deriveAnswers|engine\/adapter|adapter\.mjs/.test(seen[file]), false, `${file} still mentions a removed concept`);
    }
    assert.equal(files.some((f) => /adapter/.test(f)), false, 'no adapter module is reachable');
  });
});
