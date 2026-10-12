// Tests for Story S20 (progress: say where you are and how many steps are left): stepPlan, stepRange, the step wording,
// progressState, the claim that the total is fixed by Q1 alone, and how the screens, the in-place patch and the page
// carry them. Runs under jsc.
//
// The real-catalog tests never pin WHICH sections exist (other stories may add some): they compare the fast code with
// the slow, obviously correct way (tests/helpers/steps.mjs walks every set of policies through the engine).
import { suite, assert } from '../harness.mjs';
import {
  stepPlan, stepPlanFromSections, stepRange, stepLabel, stepEyebrow, stepsLine, progressState, progressPercent,
  overlapSections, screenIds, applyAnswer, FINISH_LABEL, NOT_STARTED_LABEL, STEPS_LINE_EMPTY, STEPS_LINE_NONE,
  ACTIONS_SCREEN_ID,
} from '../../public/js/overlap-ui/viewModel.mjs';
import {
  overlapScreenHtml, overlapScreenKey, overlapStepTexts, finishLabelHtml, entryScreenHtml, entryStepsLine, ENTRY_HOW, esc,
} from '../../public/js/overlap-ui/screens.mjs';
import { patchOverlapScreen } from '../../public/js/overlap-ui/dom.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { SECTIONS } from '../../public/js/overlap/data/questions/index.mjs';
import { conditionRefs } from '../../public/js/overlap/engine/conditions.mjs';
import FIXTURE from '../fixtures/catalog.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';
import { bruteForce, bruteRange, bruteSectionsFor, sectionIdsOf, seeded } from '../helpers/steps.mjs';

const canRead = typeof read === 'function';
const ans = (policies, more = {}) => ({ policies, ...more });
const BACK = '<button class="link" data-act="back">Back</button>';
// The catalog as the page uses it (the view-model adds the section list to the real catalog).
const REAL = { questions: CATALOG.questions, flags: CATALOG.flags, sources: CATALOG.sources, cards: CATALOG.cards, sections: SECTIONS };
const ALL_POLICIES = bruteForce(REAL).policyIds;
const STATES = /Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming/;

// Plain wording rules for everything a person reads in this story: ASCII, no dash characters, no placeholders, no state.
function plain(text, where) {
  assert.equal(/^[\x20-\x7e]*$/.test(text), true, `ASCII only (${where}): ${text}`);
  assert.equal(/[-_]/.test(text), false, `no dash characters (${where}): ${text}`);
  assert.equal(/\{\{|\}\}|TODO|undefined|NaN|\[object/.test(text), false, `no placeholder (${where}): ${text}`);
  assert.equal(STATES.test(text), false, `no state named (${where}): ${text}`);
}

// ---------------------------------------------------------------------------------------------------------
suite('stepPlan: the question steps for the answers, and the list as the finish', (t) => {
  t('with nothing answered the plan is Q1 alone and Q1 is not answered yet', () => {
    const p = stepPlan({});
    assert.deepEqual(p.steps.map((s) => s.id), ['start']);
    assert.equal(p.total, 1);
    assert.equal(p.answered, false);
    assert.equal(p.ticked, 0);
    assert.equal(p.none, false);
    assert.deepEqual(p.steps[0], { number: 1, id: 'start', screenId: 'ovl:start', title: SECTIONS[0].title });
    assert.deepEqual(p.finish, { screenId: 'actions', label: 'Your list' });
    assert.deepEqual(stepPlan(undefined), p);
    assert.deepEqual(stepPlan(null), p);
  });

  t('Q1 plus each section that applies, numbered from 1 in screen order; the action list is the finish and is not a step', () => {
    const p = stepPlan(ans(['auto', 'home']));
    assert.deepEqual(p.steps.map((s) => s.id), ['start', 'auto_gaps', 'home_exclusions', 'deductible']);
    assert.deepEqual(p.steps.map((s) => s.number), [1, 2, 3, 4]);
    assert.equal(p.total, 4);
    assert.equal(p.answered, true);
    assert.equal(p.ticked, 2);
    assert.equal(p.steps.some((s) => s.screenId === ACTIONS_SCREEN_ID), false, 'the list is not a numbered step');
    assert.equal(p.finish.screenId, ACTIONS_SCREEN_ID);
    assert.equal(FINISH_LABEL, 'Your list');
  });

  t('"None of these" is one step (Q1) and then the list; it ticks no policy', () => {
    const p = stepPlan(ans(['none']));
    assert.equal(p.total, 1);
    assert.equal(p.answered, true);
    assert.equal(p.none, true);
    assert.equal(p.ticked, 0);
  });

  t('the steps are exactly the screens between the entry screen and the list (the promised total is the real number of screens)', () => {
    const households = [{}, ans(['none']), ans(['motorcycle']), ans(['auto']), ans(['auto', 'home', 'umbrella']), ans(ALL_POLICIES),
      ans(['home', 'renters']), ans(['umbrella', 'boat']), ans(['phone', 'towing', 'travel'])];
    for (const h of households) {
      const p = stepPlan(h);
      const ids = screenIds(h);
      assert.equal(p.total, ids.length - 2, JSON.stringify(h));
      assert.deepEqual(p.steps.map((s) => s.screenId), ids.slice(1, -1), JSON.stringify(h));
      assert.equal(ids[ids.length - 1], p.finish.screenId);
    }
  });

  t('counts ticked policies once, ignores unknown ids and stale answers, and does not care about the order of the ticks', () => {
    assert.equal(stepPlan(ans(['auto', 'auto', 'nope'])).ticked, 1);
    assert.deepEqual(stepPlan(ans(['umbrella', 'auto', 'home'])), stepPlan(ans(['home', 'umbrella', 'auto'])));
    assert.equal(stepPlan(ans(['auto'], { umbrella_limit: '1m' })).total, stepPlan(ans(['auto'])).total, 'an answer to a question that is not asked changes nothing');
    assert.equal(stepPlan(ans(['auto', 'none'])).none, true, 'none wins over the others, as everywhere');
  });

  t('is pure: a frozen input is fine, the result is fresh, the same input gives the same result byte for byte', () => {
    const h = ans(['auto', 'home', 'health']);
    const frozen = deepFreeze(copy(h));
    assert.equal(JSON.stringify(stepPlan(frozen)), JSON.stringify(stepPlan(h)));
    const first = stepPlan(h);
    first.steps.pop();
    first.total = 99;
    assert.equal(stepPlan(h).total, 5);
    assert.equal(stepPlan(h).steps.length, 5);
  });

  t('a catalog argument is used (the fixture has its own sections)', () => {
    const p = stepPlan(ans(['health']), FIXTURE);
    assert.deepEqual(p.steps.map((s) => s.id), ['start', 'health', 'core']);
    assert.equal(p.total, 3);
  });

  t('stepPlanFromSections gives the same plan as stepPlan, and copes with junk', () => {
    for (const h of [{}, ans(['none']), ans(['auto', 'home']), ans(ALL_POLICIES), ans(['motorcycle', 'boat'])]) {
      assert.deepEqual(stepPlanFromSections(overlapSections(h)), stepPlan(h), JSON.stringify(h));
    }
    for (const junk of [undefined, null, 'x', 7, {}]) {
      const p = stepPlanFromSections(junk);
      assert.equal(p.total, 0);
      assert.equal(p.answered, false);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('stepRange: the fewest and the most steps, over every non-empty set of policies', (t) => {
  t('equals the slow way (every set walked through the engine) for the real catalog', () => {
    const slow = bruteRange(REAL);
    const r = stepRange();
    assert.equal(r.min, slow.min);
    assert.equal(r.max, slow.max);
    assert.equal(r.sets, slow.sets);
    assert.equal(r.sets, (1 << ALL_POLICIES.length) - 1, 'all 2^13 - 1 sets');
  });

  t('the most steps is the number of sections (a household that holds everything sees every section), and the fewest is at least 1 (Q1 itself)', () => {
    const r = stepRange();
    assert.equal(r.max, SECTIONS.length);
    assert.equal(r.min >= 1, true);
    assert.equal(r.min <= r.max, true);
  });

  t('equals the slow way for the fixture catalog too (which has no section list)', () => {
    const slow = bruteRange(FIXTURE);
    const r = stepRange(FIXTURE);
    assert.equal(r.min, slow.min);
    assert.equal(r.max, slow.max);
    assert.equal(r.sets, slow.sets);
  });

  t('the total for "None of these" is the total of the plan for it (Q1, then straight to the list)', () => {
    assert.equal(stepRange().none, stepPlan(ans(['none'])).total);
    assert.equal(stepRange().none, 1);
    assert.equal(stepRange(FIXTURE).none, stepPlan(ans(['none']), FIXTURE).total);
  });

  t('every household\'s total lies within the range, and the range\'s ends are reached by some household', () => {
    const r = stepRange();
    const totals = bruteForce(REAL).sets.map((s) => s.sections.length);
    assert.equal(Math.min.apply(null, totals), r.min);
    assert.equal(Math.max.apply(null, totals), r.max);
    // and the page's own plan agrees with the slow count on a spread of sets (every 37th, plus the two ends)
    const sets = bruteForce(REAL).sets;
    const picks = [0, sets.length - 1];
    for (let i = 5; i < sets.length; i += 37) picks.push(i);
    for (const i of picks) assert.equal(stepPlan(ans(sets[i].ticked)).total, sets[i].sections.length, JSON.stringify(sets[i].ticked));
  });

  t('returns a fresh object each time and caches the work', () => {
    const a = stepRange();
    a.min = 99;
    a.max = 0;
    const b = stepRange();
    assert.notEqual(b.min, 99);
    assert.deepEqual(stepRange(), b);
    assert.deepEqual(stepRange(FIXTURE), stepRange(FIXTURE));
  });

  t('a catalog with no policies question has one screen: the range is that one', () => {
    const tiny = {
      questions: [{ id: 'only', domain: 'core', section: 'a', type: 'single', prompt: 'Which?', options: [{ id: 'x', label: 'X' }], allowNotSure: false, showIf: null }],
      flags: [], sources: {}, cards: {},
    };
    assert.deepEqual(stepRange(tiny), { min: 1, max: 1, none: 1, sets: 0 });
  });
});

// ---------------------------------------------------------------------------------------------------------
// Every household, not a sample: stepPlan, stepEyebrow and stepsLine are checked against the slow count (the engine's own
// visible questions, walked for every one of the 2^13 - 1 = 8,191 non-empty sets of policies) for the real catalog and for
// the fixture catalog. The expected words are spelled out here from the slow count alone, so a total or a policy count that
// is off by one for ANY set fails (including the 13 sets with exactly 12 ticked policies and the one with 13).
// ---------------------------------------------------------------------------------------------------------
function checkEverySet(catalog, name) {
  const slow = bruteForce(catalog);
  assert.equal(slow.sets.length, (1 << slow.policyIds.length) - 1, `${name}: every non-empty set is covered`);
  const sizes = {};
  let checked = 0;
  const check = (ticked, expectedSections, expectedTicked, where) => {
    const h = ans(ticked);
    const total = expectedSections.length;
    const plan = stepPlan(h, catalog);
    // the total is the real number of screens, and the steps are those screens, in order (the entry screen and the list are not steps)
    assert.equal(plan.total, total, `${where}: total`);
    assert.equal(plan.steps.length, total, `${where}: steps listed`);
    assert.equal(plan.total, screenIds(h, catalog).length - 2, `${where}: total is the number of screens between the entry screen and the list`);
    assert.deepEqual(plan.steps.map((s) => s.id), expectedSections, `${where}: the steps are the sections that apply`);
    assert.deepEqual(plan.steps.map((s) => s.number), expectedSections.map((_, i) => i + 1), `${where}: numbered 1 to N`);
    assert.equal(plan.ticked, expectedTicked, `${where}: ticked`);
    assert.equal(plan.none, false, `${where}: none`);
    assert.equal(plan.answered, true, `${where}: answered`);
    // Q1's live line: the policy count and the total, spelled out from the slow count
    const policies = expectedTicked === 1 ? '1 policy' : expectedTicked + ' policies';
    const steps = total === 1 ? 'this is the only step' : 'there are ' + total + ' steps in all';
    assert.equal(stepsLine(plan), 'You ticked ' + policies + ', so ' + steps + ', then your list.', `${where}: Q1 line`);
    // every step's label: k of N, k never above N, and only the last one says the list is next
    for (let k = 1; k <= total; k++) {
      const eyebrow = stepEyebrow(plan, k);
      assert.equal(eyebrow, 'Step ' + k + ' of ' + total + (k === total ? ', then your list' : ''), `${where}: label ${k}`);
      const m = /^Step (\d+) of (\d+)/.exec(eyebrow);
      assert.equal(m !== null && Number(m[1]) <= Number(m[2]), true, `${where}: k never exceeds N (${eyebrow})`);
    }
    for (const s of plan.steps) assert.equal(s.number <= plan.total, true, `${where}: step ${s.number} of ${plan.total}`);
    sizes[total] = (sizes[total] || 0) + 1;
    checked += 1;
  };
  for (const set of slow.sets) check(set.ticked, set.sections, set.ticked.length, `${name} ticked ${JSON.stringify(set.ticked)}`);
  // the two ends the sets leave out: nothing answered (Q1 alone, no total yet) and "None of these" (Q1, then the list). What
  // is left to show is whatever the engine says is visible without any tick (a catalog may have questions that need none).
  for (const h of [{}, ans([]), ans(['none']), ans(['none'], { umbrella_limit: '1m' })]) {
    const expectedSections = bruteSectionsFor(catalog, h);
    assert.equal(expectedSections[0], slow.sectionIds[0], `${name} ${JSON.stringify(h)}: Q1 is always there`);
    const plan = stepPlan(h, catalog);
    assert.equal(plan.total, expectedSections.length, `${name} ${JSON.stringify(h)}: total`);
    assert.deepEqual(plan.steps.map((s) => s.id), expectedSections, `${name} ${JSON.stringify(h)}: steps`);
    assert.equal(plan.total, screenIds(h, catalog).length - 2, `${name} ${JSON.stringify(h)}: screens`);
    assert.equal(plan.ticked, 0);
    const none = h.policies !== undefined && h.policies[0] === 'none';
    assert.equal(plan.none, none);
    assert.equal(plan.answered, h.policies !== undefined && h.policies.length > 0, `${name} ${JSON.stringify(h)}: answered`);
    for (let k = 1; k <= plan.total; k++) {
      const label = plan.answered ? 'Step ' + k + ' of ' + plan.total + (k === plan.total ? ', then your list' : '') : (k === 1 ? 'Step 1' : 'Step ' + k + ' of ' + plan.total + (k === plan.total ? ', then your list' : ''));
      assert.equal(stepEyebrow(plan, k), label, `${name} ${JSON.stringify(h)}: label ${k}`);
    }
    assert.equal(stepsLine(plan), none ? STEPS_LINE_NONE : STEPS_LINE_EMPTY, `${name} ${JSON.stringify(h)}: Q1 line`);
  }
  return { checked, sizes };
}

suite('stepPlan, stepEyebrow and stepsLine over every set of policies (8,191 sets), real and fixture catalogs', (t) => {
  t('real catalog: for every set, the total is the real number of screens, the policy count is right, k never exceeds N', () => {
    const { checked, sizes } = checkEverySet(REAL, 'real');
    assert.equal(checked, 8191);
    const r = stepRange();
    for (const key of Object.keys(sizes)) assert.equal(Number(key) >= r.min && Number(key) <= r.max, true, `a total of ${key} lies within the range`);
    assert.equal(sizes[r.min] > 0 && sizes[r.max] > 0, true, 'both ends of the range are reached by some set');
  });

  t('fixture catalog (it has its own sections): the same, for every set', () => {
    const { checked, sizes } = checkEverySet(FIXTURE, 'fixture');
    assert.equal(checked, 8191);
    const r = stepRange(FIXTURE);
    for (const key of Object.keys(sizes)) assert.equal(Number(key) >= r.min && Number(key) <= r.max, true, `a total of ${key} lies within the range`);
    assert.equal(sizes[r.min] > 0 && sizes[r.max] > 0, true, 'both ends of the range are reached by some set');
  });

  t('the sets with 12 and 13 ticked policies are covered (they were the ones a spot check could miss)', () => {
    const sets = bruteForce(REAL).sets;
    const twelve = sets.filter((s) => s.ticked.length === 12);
    const thirteen = sets.filter((s) => s.ticked.length === 13);
    assert.equal(twelve.length, 13);
    assert.equal(thirteen.length, 1);
    for (const s of twelve.concat(thirteen)) {
      const plan = stepPlan(ans(s.ticked));
      assert.equal(plan.total, s.sections.length, JSON.stringify(s.ticked));
      assert.equal(plan.ticked, s.ticked.length, JSON.stringify(s.ticked));
      assert.equal(stepsLine(plan).indexOf('You ticked ' + s.ticked.length + ' policies, so there are ' + s.sections.length + ' steps in all'), 0, stepsLine(plan));
    }
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('step wording: "Step k of N", the last step says the list is next, and Q1\'s live line', (t) => {
  t('stepLabel says "Step 2 of 4", or just "Step 2" while the total is not known', () => {
    assert.equal(stepLabel(2, 4), 'Step 2 of 4');
    assert.equal(stepLabel(1, 1), 'Step 1 of 1');
    assert.equal(stepLabel(1, null), 'Step 1');
    assert.equal(stepLabel(1, undefined), 'Step 1');
  });

  t('stepEyebrow: Q1 before a tick is just "Step 1"; every step then has its total; only the last one says the list is next', () => {
    assert.equal(stepEyebrow(stepPlan({}), 1), 'Step 1');
    const p = stepPlan(ans(['auto', 'home']));
    assert.deepEqual(p.steps.map((s) => stepEyebrow(p, s.number)), ['Step 1 of 4', 'Step 2 of 4', 'Step 3 of 4', 'Step 4 of 4, then your list']);
    assert.equal(stepEyebrow(stepPlan(ans(['none'])), 1), 'Step 1 of 1, then your list');
    assert.equal(stepEyebrow(stepPlan(ans(['motorcycle'])), 1), 'Step 1 of 1, then your list');
  });

  t('Q1\'s live line has a plain sentence for nothing ticked, None of these, one policy, many policies and a single step', () => {
    assert.equal(stepsLine(stepPlan({})), 'Tick what you have and we will show how many steps there are.');
    assert.equal(stepsLine(stepPlan({})), STEPS_LINE_EMPTY);
    assert.equal(stepsLine(stepPlan(ans(['none']))), 'You chose None of these, so you go straight to your list.');
    assert.equal(stepsLine(stepPlan(ans(['none']))), STEPS_LINE_NONE);
    assert.equal(stepsLine(stepPlan(ans(['auto']))), 'You ticked 1 policy, so there are 3 steps in all, then your list.');
    assert.equal(stepsLine(stepPlan(ans(['auto', 'home', 'umbrella']))), 'You ticked 3 policies, so there are 6 steps in all, then your list.');
    assert.equal(stepsLine(stepPlan(ans(['motorcycle']))), 'You ticked 1 policy, so this is the only step, then your list.');
    assert.equal(stepsLine(stepPlan(ans(['motorcycle', 'boat']))), 'You ticked 2 policies, so this is the only step, then your list.');
  });

  t('the line follows the plan: its numbers are the plan\'s numbers for every set in a spread of sets', () => {
    const sets = bruteForce(REAL).sets;
    for (let i = 0; i < sets.length; i += 53) {
      const p = stepPlan(ans(sets[i].ticked));
      const line = stepsLine(p);
      assert.equal(line.indexOf('You ticked ' + sets[i].ticked.length + (sets[i].ticked.length === 1 ? ' policy' : ' policies')), 0, line);
      if (sets[i].sections.length === 1) assert.equal(line.includes('this is the only step'), true, line);
      else assert.equal(line.includes('there are ' + sets[i].sections.length + ' steps in all'), true, line);
    }
  });

  t('all the wording is plain: ASCII, no dash characters, no placeholder, no state, and short enough to wrap to two lines on a phone', () => {
    const lines = [STEPS_LINE_EMPTY, STEPS_LINE_NONE, FINISH_LABEL, NOT_STARTED_LABEL];
    for (let ticked = 1; ticked <= 13; ticked++) {
      for (let total = 1; total <= 14; total++) {
        lines.push(stepsLine({ answered: true, none: false, ticked, total, finish: { label: FINISH_LABEL } }));
        for (let k = 1; k <= total; k++) lines.push(stepEyebrow({ answered: true, total, finish: { label: FINISH_LABEL } }, k));
      }
    }
    for (const line of lines) {
      plain(line, 'step wording');
      assert.equal(line.length <= 75, true, `fits two lines at 375px: ${line}`);
    }
  });

  t('singular and plural are right: never "1 policies", "1 steps in all" or "2 policy"', () => {
    for (let ticked = 1; ticked <= 13; ticked++) {
      for (let total = 1; total <= 14; total++) {
        const line = stepsLine({ answered: true, none: false, ticked, total, finish: { label: FINISH_LABEL } });
        assert.equal(/\b1 policies\b|\b1 steps\b/.test(line), false, line);
        assert.equal(/\b[2-9]\d* policy\b|\b1\d+ policy\b/.test(line), false, line);
        if (total === 1) assert.equal(/\d+ steps? in all/.test(line), false, line);
      }
    }
  });

  t('the entry line uses the real range: it names the computed fewest and most, and follows a different range', () => {
    const r = stepRange();
    const line = entryStepsLine();
    assert.equal(line.includes('between ' + r.min + ' and ' + r.max + ' short steps'), true, line);
    assert.equal(line, entryStepsLine(r));
    assert.equal(entryStepsLine({ min: 3, max: 7 }).includes('between 3 and 7 short steps'), true);
    assert.equal(entryStepsLine({ min: 2, max: 2 }), 'It takes 2 short steps, and then you get your list.');
    assert.equal(entryStepsLine({ min: 1, max: 1 }), 'It takes 1 short step, and then you get your list.');
    assert.equal(entryStepsLine({ min: 1, max: 12 }).includes('between 1 and 12 short steps'), true);
    assert.equal(/depending on which policies you have/.test(line), true);
    assert.equal(/as soon as you tick them/.test(line), true);
    assert.equal(/your list/.test(line), true, 'says the list comes after the steps');
    for (const x of [line, entryStepsLine({ min: 3, max: 7 }), entryStepsLine({ min: 1, max: 1 })]) plain(x, 'entry line');
  });

  t('the entry line is computed from the catalog: nothing in screens.mjs spells out the numbers', () => {
    if (!canRead) return;
    const code = read('public/js/overlap-ui/screens.mjs').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.equal(/between\s+\d/.test(code), false, 'no number is typed after "between"');
    assert.equal(/\bshort steps?\b/.test(code), true, 'the line is there, built from the range');
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('progressState: the bar and its words come from the same numbers', (t) => {
  const households = [{}, ans(['none']), ans(['motorcycle']), ans(['auto']), ans(['auto', 'home']), ans(['auto', 'home', 'umbrella']), ans(ALL_POLICIES), ans(['health', 'phone'])];

  t('entry screen: not started, 0; Q1 with nothing ticked: "Step 1", 0 and no total yet', () => {
    const entry = progressState({}, 0);
    assert.deepEqual(entry, { kind: 'entry', number: null, total: null, done: 0, percent: 0, text: 'Not started' });
    assert.deepEqual(progressState({}, 1), { kind: 'question', number: 1, total: null, done: 0, percent: 0, text: 'Step 1' });
  });

  t('a worked example: auto and home is 4 steps, so Step 2 is 25 percent, Step 4 is 75 percent and the list is 100', () => {
    const h = ans(['auto', 'home']);
    assert.deepEqual(progressState(h, 1), { kind: 'question', number: 1, total: 4, done: 0, percent: 0, text: 'Step 1 of 4' });
    assert.deepEqual(progressState(h, 2), { kind: 'question', number: 2, total: 4, done: 1, percent: 25, text: 'Step 2 of 4' });
    assert.deepEqual(progressState(h, 3), { kind: 'question', number: 3, total: 4, done: 2, percent: 50, text: 'Step 3 of 4' });
    assert.deepEqual(progressState(h, 4), { kind: 'question', number: 4, total: 4, done: 3, percent: 75, text: 'Step 4 of 4, then your list' });
    assert.deepEqual(progressState(h, 5), { kind: 'finish', number: null, total: 4, done: 4, percent: 100, text: 'Your list' });
  });

  t('the width is exactly what progressPercent gave before: completed steps over the steps in all, on every screen of every household', () => {
    for (const h of households) {
      const ids = screenIds(h);
      ids.forEach((_, i) => assert.equal(progressState(h, i).percent, progressPercent(ids, i), `${JSON.stringify(h)} screen ${i}`));
    }
  });

  t('the words are the screen\'s own label, and a step number never exceeds the total', () => {
    for (const h of households) {
      const ids = screenIds(h);
      const sections = overlapSections(h);
      ids.forEach((id, i) => {
        const p = progressState(h, i);
        if (i === 0) assert.equal(p.text, NOT_STARTED_LABEL);
        else if (id === ACTIONS_SCREEN_ID) assert.equal(p.text, FINISH_LABEL);
        else {
          assert.equal(p.text, overlapStepTexts(sections, id).eyebrow, `${JSON.stringify(h)} ${id}`);
          if (p.total !== null) assert.equal(p.number <= p.total, true, `${p.text}`);
          assert.equal(p.number, i);
          assert.equal(p.done, i - 1);
        }
      });
    }
  });

  t('rises with every step forward, is 0 to 100, ends at 100 on the list and says "Your list" there', () => {
    for (const h of households) {
      const ids = screenIds(h);
      let last = -1;
      ids.forEach((_, i) => {
        const p = progressState(h, i);
        assert.equal(p.percent >= 0 && p.percent <= 100, true);
        assert.equal(p.percent >= last, true);
        last = p.percent;
      });
      const end = progressState(h, ids.length - 1);
      assert.equal(end.percent, 100);
      assert.equal(end.kind, 'finish');
      assert.equal(end.text, 'Your list');
      assert.equal(end.done, end.total);
    }
  });

  t('the last question step says the list is next, and only that step does', () => {
    for (const h of households) {
      const ids = screenIds(h);
      ids.forEach((_, i) => {
        const p = progressState(h, i);
        if (p.kind !== 'question') return;
        assert.equal(p.text.endsWith(', then your list'), p.total !== null && p.number === p.total, p.text);
      });
    }
  });

  t('an index outside the screens is clamped, as the page does, and junk is the entry screen', () => {
    const h = ans(['auto', 'home']);
    assert.equal(progressState(h, 99).kind, 'finish');
    assert.equal(progressState(h, -4).kind, 'entry');
    assert.equal(progressState(h, 1.5).kind, 'entry');
    assert.equal(progressState(h, 'x').kind, 'entry');
  });

  t('is pure: frozen input is fine and the same input gives the same result', () => {
    const h = ans(['auto', 'home']);
    assert.equal(JSON.stringify(progressState(deepFreeze(copy(h)), 2)), JSON.stringify(progressState(h, 2)));
  });
});

// ---------------------------------------------------------------------------------------------------------
// The total is fixed by Q1 alone (the stability claim).
// ---------------------------------------------------------------------------------------------------------
// A three-valued reading of a gate: 1 = true whatever else is answered, 0 = false whatever else is answered, 2 = depends on
// answers to other questions. A policy tick is known; every answer-based condition is "depends".
const YES = 1;
const NO = 0;
const DEPENDS = 2;
function reading(cond, ticked) {
  if (cond === null || cond === undefined) return YES;
  if (Object.prototype.hasOwnProperty.call(cond, 'holds')) return ticked.indexOf(cond.holds) >= 0 ? YES : NO;
  if (Object.prototype.hasOwnProperty.call(cond, 'answer') || Object.prototype.hasOwnProperty.call(cond, 'answered')) return DEPENDS;
  if (Object.prototype.hasOwnProperty.call(cond, 'all')) {
    let out = YES;
    for (const c of cond.all) { const v = reading(c, ticked); if (v === NO) return NO; if (v === DEPENDS) out = DEPENDS; }
    return out;
  }
  if (Object.prototype.hasOwnProperty.call(cond, 'any')) {
    let out = NO;
    for (const c of cond.any) { const v = reading(c, ticked); if (v === YES) return YES; if (v === DEPENDS) out = DEPENDS; }
    return out;
  }
  const v = reading(cond.not, ticked);
  return v === DEPENDS ? DEPENDS : (v === YES ? NO : YES);
}

// Is the question certainly visible (certain), or possibly visible (possible), for these ticks, over every possible set of
// other answers? The engine hides a question whose gate reads a hidden question, so both readings need every question the gate
// reads to be certain (respectively possible) as well.
function visibility(questions, ticked) {
  const byId = {};
  for (const q of questions) byId[q.id] = q;
  const memo = { certain: {}, possible: {} };
  const walk = (kind, qid) => {
    if (Object.prototype.hasOwnProperty.call(memo[kind], qid)) return memo[kind][qid];
    memo[kind][qid] = false; // a cycle would be a catalog error; treat as not visible
    const q = byId[qid];
    const v = q === undefined ? NO : reading(q.showIf, ticked);
    let ok = kind === 'certain' ? v === YES : v !== NO;
    if (ok && q.showIf) for (const r of conditionRefs(q.showIf).answers) if (!walk(kind, r.qid)) { ok = false; break; }
    memo[kind][qid] = ok;
    return ok;
  };
  return { certain: (qid) => walk('certain', qid), possible: (qid) => walk('possible', qid) };
}

suite('the total is fixed by Q1 alone: no later answer can change how many steps there are', (t) => {
  t('PROOF over all 8,191 sets: a section is certainly shown exactly when it is possibly shown, whatever else is answered', () => {
    const questions = CATALOG.questions;
    const slow = bruteForce(REAL);
    const checkSet = (ticked, expectedSections) => {
      const v = visibility(questions, ticked);
      const certainly = [];
      const possibly = [];
      for (const id of slow.sectionIds) {
        const qs = questions.filter((q) => q.section === id);
        if (qs.some((q) => v.certain(q.id))) certainly.push(id);
        if (qs.some((q) => v.possible(q.id))) possibly.push(id);
      }
      assert.deepEqual(possibly, certainly, `ticked ${JSON.stringify(ticked)}: some section can appear or vanish depending on later answers`);
      assert.deepEqual(certainly, expectedSections, `ticked ${JSON.stringify(ticked)}: the proof disagrees with the engine`);
    };
    for (const s of slow.sets) checkSet(s.ticked, s.sections);
    checkSet(['none'], ['start']);
    checkSet([], ['start']);
  });

  t('the proof does catch a catalog where the total can change: in the fixture, the umbrella details screen only opens once the umbrella size is answered, and the plan then follows the real screens', () => {
    const slow = bruteForce(FIXTURE);
    const onlyUmbrella = slow.sets.find((s) => s.ticked.join() === 'umbrella');
    const v = visibility(FIXTURE.questions, onlyUmbrella.ticked);
    const scope = FIXTURE.questions.filter((q) => q.section === 'umbrella_scope').map((q) => q.id);
    assert.equal(scope.some((id) => v.possible(id)), true, 'the section is possible');
    assert.equal(scope.some((id) => v.certain(id)), false, 'but not certain: every one of its questions waits for an answer');
    // the page's plan is always the real count of screens, so a label drawn after the answer is right
    const before = ans(['umbrella']);
    const after = applyAnswer(before, 'umbrella_limit', '1m', FIXTURE);
    assert.equal(stepPlan(before, FIXTURE).total, screenIds(before, FIXTURE).length - 2);
    assert.equal(stepPlan(after, FIXTURE).total, screenIds(after, FIXTURE).length - 2);
    assert.equal(stepPlan(before, FIXTURE).steps.some((st) => st.id === 'umbrella_scope'), false);
    assert.equal(stepPlan(after, FIXTURE).steps.some((st) => st.id === 'umbrella_scope'), true);
    assert.equal(stepPlan(after, FIXTURE).total, stepPlan(before, FIXTURE).total + 1);
  });

  t('RANDOM WALKS through the real taps: after Q1 is answered, the total never changes as later questions are answered, changed and Not-sured', () => {
    const rand = seeded(20201010);
    const sets = bruteForce(REAL).sets;
    let taps = 0;
    for (let h = 0; h < 70; h++) {
      const set = sets[rand(sets.length)];
      let answers = ans(set.ticked);
      const total = set.sections.length;
      assert.equal(stepPlan(answers).total, total);
      for (let step = 0; step < 22; step++) {
        const open = overlapSections(answers).flatMap((s) => s.questions).filter((q) => q.id !== 'policies');
        if (open.length === 0) break;
        const q = open[rand(open.length)];
        const o = q.options[rand(q.options.length)];
        answers = applyAnswer(answers, q.id, o.id);
        taps += 1;
        assert.equal(stepPlan(answers).total, total, `ticked ${JSON.stringify(set.ticked)} after ${q.id} = ${o.id}`);
        assert.equal(screenIds(answers).length - 2, total, 'and the number of screens is the same number');
      }
    }
    assert.equal(taps > 600, true, 'the walks tapped ' + taps + ' answers');
  });

  t('answering every question with its first, last and Not sure option leaves the total alone', () => {
    const sets = bruteForce(REAL).sets;
    for (const set of [sets[sets.length - 1], sets[0], sets[sets.length >> 1], sets[1234], sets[4000]]) {
      for (const pick of ['first', 'last']) {
        let answers = ans(set.ticked);
        for (let guard = 0; guard < 80; guard++) {
          const open = overlapSections(answers).flatMap((s) => s.questions).find((q) => !q.answered);
          if (!open) break;
          answers = applyAnswer(answers, open.id, pick === 'first' ? open.options[0].id : open.options[open.options.length - 1].id);
          assert.equal(stepPlan(answers).total, set.sections.length);
        }
      }
    }
  });

  t('changing Q1 after going Back updates the total to the new ticks, and only the ticks decide it', () => {
    let answers = ans(['auto', 'home', 'umbrella']);
    const before = stepPlan(answers).total;
    answers = applyAnswer(answers, 'auto_financing', 'loan');
    assert.equal(stepPlan(answers).total, before);
    answers = applyAnswer(answers, 'policies', 'umbrella'); // untick the umbrella
    const without = stepPlan(answers).total;
    assert.equal(without < before, true);
    assert.equal(without, bruteForce(REAL).sets.find((s) => s.ticked.join() === ['auto', 'home'].join()).sections.length);
    answers = applyAnswer(answers, 'policies', 'umbrella'); // tick it again
    assert.equal(stepPlan(answers).total, before);
    answers = applyAnswer(answers, 'policies', 'none');
    assert.equal(stepPlan(answers).total, 1);
  });

  t('a screen\'s position in the plan never moves while answers are given on it (the same step number, the same title)', () => {
    let answers = ans(['auto', 'home']);
    const plan = stepPlan(answers);
    for (const [q, o] of [['auto_financing', 'loan'], ['auto_gap_coverage', 'yes'], ['auto_value', 'not_sure'], ['auto_um_uim', 'yes'], ['home_sewer_backup', 'no']]) {
      answers = applyAnswer(answers, q, o);
      assert.deepEqual(stepPlan(answers), plan);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('screens: the step label, Q1\'s live line, the finish label and the entry line', (t) => {
  const sectionsOf = (h) => overlapSections(h);

  t('every question screen has a step label that a screen reader hears with the heading, and says the same as the progress bar', () => {
    const h = ans(['auto', 'home']);
    const sections = sectionsOf(h);
    for (const s of sections) {
      const html = overlapScreenHtml(sections, 'ovl:' + s.id, BACK);
      const texts = overlapStepTexts(sections, 'ovl:' + s.id);
      assert.equal(html.startsWith('<h3 class="pt" id="ovl-step" aria-live="off">' + esc(texts.eyebrow) + '</h3>'), true, s.id);
      assert.equal(html.includes('<h2 id="ovl-heading" tabindex="-1" data-focus aria-describedby="ovl-step">' + esc(s.title) + '</h2>'), true, s.id);
      assert.equal(texts.eyebrow, progressState(h, screenIds(h).indexOf('ovl:' + s.id)).text, s.id);
    }
  });

  t('the last question step says the list comes next, in the label', () => {
    const sections = sectionsOf(ans(['auto', 'home']));
    const last = sections[sections.length - 1];
    assert.equal(overlapScreenHtml(sections, 'ovl:' + last.id, BACK).includes('>Step 4 of 4, then your list</h3>'), true);
    assert.equal(overlapScreenHtml(sections, 'ovl:' + sections[1].id, BACK).includes('>Step 2 of 4</h3>'), true);
  });

  t('Q1 with nothing ticked says "Step 1" and holds the live line, with its invitation to tick', () => {
    const html = overlapScreenHtml(sectionsOf({}), 'ovl:start', BACK);
    assert.equal(html.includes('>Step 1</h3>'), true);
    assert.equal(html.includes('<p class="small ovl-steps" id="ovl-steps" role="status">' + esc(STEPS_LINE_EMPTY) + '</p>'), true);
  });

  t('Q1 with ticks says "Step 1 of N" and the line gives the count; the live line sits under the list, above the hint and the Continue row', () => {
    const h = ans(['auto', 'home', 'umbrella']);
    const html = overlapScreenHtml(sectionsOf(h), 'ovl:start', BACK);
    const n = stepPlan(h).total;
    assert.equal(html.includes('>Step 1 of ' + n + '</h3>'), true);
    assert.equal(html.includes('role="status">You ticked 3 policies, so there are ' + n + ' steps in all, then your list.</p>'), true);
    const at = (x) => html.indexOf(x);
    assert.equal(at('id="ovl-body"') < at('id="ovl-steps"') && at('id="ovl-steps"') < at('id="ovl-hint"') && at('id="ovl-hint"') < at('id="ovl-next"'), true);
    assert.equal(html.includes('You chose None of these'), false);
    assert.equal(overlapScreenHtml(sectionsOf(ans(['none'])), 'ovl:start', BACK).includes('role="status">' + esc(STEPS_LINE_NONE) + '</p>'), true);
    assert.equal(overlapScreenHtml(sectionsOf(ans(['none'])), 'ovl:start', BACK).includes('>Step 1 of 1, then your list</h3>'), true);
  });

  t('only Q1 has the live line; no other screen has one', () => {
    const sections = sectionsOf(ans(ALL_POLICIES));
    sections.forEach((s, i) => {
      const html = overlapScreenHtml(sections, 'ovl:' + s.id, BACK);
      assert.equal(html.includes('id="ovl-steps"'), i === 0, s.id);
    });
  });

  t('Q1\'s key has no total, so ticking policies does not change it and the screen is patched, not drawn again; later screens\' keys do carry it', () => {
    const none = sectionsOf({});
    const some = sectionsOf(ans(['auto', 'home', 'umbrella']));
    assert.equal(overlapScreenKey(none, 'ovl:start'), overlapScreenKey(some, 'ovl:start'));
    assert.notEqual(overlapScreenKey(sectionsOf(ans(['auto'])), 'ovl:auto_gaps'), overlapScreenKey(sectionsOf(ans(['auto', 'home'])), 'ovl:auto_gaps'));
  });

  t('overlapStepTexts is null for anything that is not a section screen', () => {
    const sections = sectionsOf(ans(['auto']));
    assert.equal(overlapStepTexts(sections, 'actions'), null);
    assert.equal(overlapStepTexts(sections, 'entry'), null);
    assert.equal(overlapStepTexts(sections, 'ovl:nope'), null);
    assert.equal(overlapStepTexts(sections, 'ovl:auto_gaps').line, null);
    assert.equal(overlapStepTexts(sections, 'ovl:start').line, stepsLine(stepPlan(ans(['auto']))));
  });

  t('the action list is labelled as the finish, not as a step', () => {
    assert.equal(finishLabelHtml(), '<h3 class="pt">Your list</h3>');
    assert.equal(/Step/.test(finishLabelHtml()), false);
  });

  t('the entry screen carries the real range line, between the preview and the trust line', () => {
    const r = stepRange();
    for (const counting of [false, true]) {
      const html = entryScreenHtml(counting);
      const line = '<p>' + esc(entryStepsLine(r)) + '</p>';
      assert.equal(html.includes(line), true);
      assert.equal(html.includes('between ' + r.min + ' and ' + r.max + ' short steps'), true);
      assert.equal(html.indexOf('entry-list') < html.indexOf(line) && html.indexOf(line) < html.indexOf(esc(ENTRY_HOW)), true);
    }
    // handed another range, the screen says that range: the numbers are not typed into the page
    assert.equal(entryScreenHtml(false, { min: 4, max: 9 }).includes('between 4 and 9 short steps'), true);
  });

  t('the page carries no "Step k of N" with k above N anywhere the screens can produce it', () => {
    const sets = bruteForce(REAL).sets;
    for (let i = 0; i < sets.length; i += 61) {
      const h = ans(sets[i].ticked);
      const sections = sectionsOf(h);
      const texts = [];
      sections.forEach((s) => texts.push(overlapScreenHtml(sections, 'ovl:' + s.id, BACK)));
      screenIds(h).forEach((_, k) => texts.push(progressState(h, k).text));
      for (const text of texts) {
        for (const m of text.matchAll(/Step (\d+) of (\d+)/g)) assert.equal(Number(m[1]) <= Number(m[2]) && Number(m[1]) >= 1, true, m[0]);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------
// dom.mjs: Q1's words are patched in place.
// ---------------------------------------------------------------------------------------------------------
function fakeText(text) {
  let value = text;
  return { writes: 0, get textContent() { return value; }, set textContent(v) { value = v; this.writes += 1; } };
}
function fakeEl(attrs = {}) {
  const classes = new Set();
  const attributes = { ...attrs };
  return {
    disabled: false,
    hidden: false,
    classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }, has: (n) => classes.has(n) },
    setAttribute(k, v) { attributes[k] = String(v); },
    getAttribute(k) { return k in attributes ? attributes[k] : null; },
  };
}
// The stage as overlapScreenHtml draws it for `sections`: body with its key, every option button, Continue, hint, step label and (Q1 only) the live line.
function fakeStage(sections, screenId, parts = {}) {
  const section = sections.find((s) => 'ovl:' + s.id === screenId);
  const key = overlapScreenKey(sections, screenId);
  const buttons = new Map();
  for (const q of section.questions) for (const o of q.options) buttons.set(q.id + '/' + o.id, fakeEl({ 'aria-pressed': 'false' }));
  const body = {
    getAttribute: (k) => (k === 'data-ovl-key' ? key : null),
    querySelector(sel) { const m = /^button\[data-oq="([^"]+)"\]\[data-ov="([^"]+)"\]$/.exec(sel); return m ? buttons.get(m[1] + '/' + m[2]) || null : null; },
    querySelectorAll(sel) { return sel === 'button[data-oq]' ? Array.from(buttons.values()) : []; },
  };
  const label = parts.label === false ? null : fakeText('stale label');
  const line = parts.line === false || (parts.line === undefined && screenId !== 'ovl:start') ? null : fakeText('stale line');
  const els = { '#ovl-body': body, '#ovl-next': fakeEl(), '#ovl-hint': fakeEl(), '#ovl-step': label, '#ovl-steps': line };
  return { stage: { querySelector: (sel) => els[sel] || null }, label, line };
}

suite('patchOverlapScreen: Q1\'s step label and live line change in place as policies are ticked', (t) => {
  t('writes the label and the line from the sections, so the count follows each tick without drawing the screen again', () => {
    const none = overlapSections({});
    const screen = fakeStage(none, 'ovl:start');
    assert.equal(patchOverlapScreen(screen.stage, none, 'ovl:start'), true);
    assert.equal(screen.label.textContent, 'Step 1');
    assert.equal(screen.line.textContent, STEPS_LINE_EMPTY);
    let answers = {};
    for (const [id, count] of [['auto', 1], ['home', 2], ['umbrella', 3]]) {
      answers = applyAnswer(answers, 'policies', id);
      const sections = overlapSections(answers);
      assert.equal(overlapScreenKey(sections, 'ovl:start'), overlapScreenKey(none, 'ovl:start'), 'Q1 is patched in place, never drawn again');
      assert.equal(patchOverlapScreen(screen.stage, sections, 'ovl:start'), true);
      assert.equal(screen.label.textContent, 'Step 1 of ' + stepPlan(answers).total);
      assert.equal(screen.line.textContent, 'You ticked ' + count + (count === 1 ? ' policy' : ' policies') + ', so there are ' + stepPlan(answers).total + ' steps in all, then your list.');
    }
    answers = applyAnswer(answers, 'policies', 'none');
    assert.equal(patchOverlapScreen(screen.stage, overlapSections(answers), 'ovl:start'), true);
    assert.equal(screen.label.textContent, 'Step 1 of 1, then your list');
    assert.equal(screen.line.textContent, STEPS_LINE_NONE);
    answers = applyAnswer(answers, 'policies', 'none'); // untick
    assert.equal(patchOverlapScreen(screen.stage, overlapSections(answers), 'ovl:start'), true);
    assert.equal(screen.label.textContent, 'Step 1');
    assert.equal(screen.line.textContent, STEPS_LINE_EMPTY);
  });

  t('writes a text only when it changed, so a screen reader hears the line once per real change', () => {
    const sections = overlapSections(ans(['auto', 'home']));
    const screen = fakeStage(sections, 'ovl:start');
    patchOverlapScreen(screen.stage, sections, 'ovl:start');
    patchOverlapScreen(screen.stage, sections, 'ovl:start');
    patchOverlapScreen(screen.stage, sections, 'ovl:start');
    assert.equal(screen.label.writes, 1);
    assert.equal(screen.line.writes, 1);
    const more = overlapSections(ans(['auto', 'home', 'health']));
    patchOverlapScreen(screen.stage, more, 'ovl:start');
    assert.equal(screen.line.writes, 2);
  });

  t('a later screen\'s label is already right, so the patch leaves it alone', () => {
    const sections = overlapSections(ans(['auto', 'home']));
    const screen = fakeStage(sections, 'ovl:auto_gaps');
    screen.label.textContent = 'Step 2 of 4';
    const writes = screen.label.writes;
    assert.equal(patchOverlapScreen(screen.stage, sections, 'ovl:auto_gaps'), true);
    assert.equal(screen.label.writes, writes);
    assert.equal(screen.line, null);
  });

  t('returns false (so the screen is drawn again) when the label is missing, when Q1 lacks its line, or when another screen has one', () => {
    const sections = overlapSections(ans(['auto', 'home']));
    assert.equal(patchOverlapScreen(fakeStage(sections, 'ovl:start', { label: false }).stage, sections, 'ovl:start'), false);
    assert.equal(patchOverlapScreen(fakeStage(sections, 'ovl:start', { line: false }).stage, sections, 'ovl:start'), false);
    assert.equal(patchOverlapScreen(fakeStage(sections, 'ovl:auto_gaps', { line: true }).stage, sections, 'ovl:auto_gaps'), false);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The page: markup, wiring and stylesheet.
// ---------------------------------------------------------------------------------------------------------
suite('the page: an accessible progress bar that app.js drives from progressState, with no style attribute', (t) => {
  t('index.html has the progress bar as role=progressbar with a name, aria-valuemin, aria-valuemax, aria-valuenow and aria-valuetext, and no style attribute', () => {
    if (!canRead) return;
    const html = read('public/index.html');
    const bar = /<div[^>]*id="progress"[^>]*>/.exec(html)[0];
    for (const attr of ['role="progressbar"', 'aria-label="Progress"', 'aria-valuemin="0"', 'aria-valuemax="100"', 'aria-valuenow="0"', 'aria-valuetext="Not started"']) assert.equal(bar.includes(attr), true, attr);
    assert.equal(/\sstyle=/.test(html), false, 'no style attribute in the markup');
  });

  t('app.js sets the width through the style API and aria-valuenow and aria-valuetext from the one progressState call', () => {
    if (!canRead) return;
    const src = read('public/js/app.js');
    const body = /function showProgress\(\) \{[\s\S]*?\n\}/.exec(src)[0];
    assert.equal(body.includes('progressState(answers, index)'), true);
    assert.equal(body.includes("bar.style.width = p.percent + '%'"), true);
    assert.equal(body.includes("setAttribute('aria-valuenow', String(Math.round(p.percent)))"), true);
    assert.equal(body.includes("setAttribute('aria-valuetext', p.text)"), true);
    assert.equal(/progressPercent/.test(src), false, 'the old per-index width is no longer used by the page');
    assert.equal(/\bstyle\s*=/.test(src.replace(/\.style\.width\s*=/g, '')), false, 'no style attribute written by the page');
  });

  t('the bar is redrawn on every render and after every tap that is patched in place (Q1\'s words change with the ticks)', () => {
    if (!canRead) return;
    const src = read('public/js/app.js');
    const render = /function render\(\) \{[\s\S]*?\n\}/.exec(src)[0];
    assert.equal(render.includes('showProgress()'), true);
    const answerFn = /function answer\([\s\S]*?\n\}/.exec(src)[0];
    assert.equal(/patchOverlapScreen[\s\S]*showPolicies\(\);\s*showProgress\(\);/.test(answerFn), true);
  });

  t('the list screen is drawn with the "Your list" label above it, outside the printed section', () => {
    if (!canRead) return;
    const src = read('public/js/app.js');
    assert.equal(src.includes('return finishLabelHtml() + list + actionsFootHtml(backHtml());'), true);
  });

  t('the stylesheet holds two lines of space for Q1\'s live line, keeps the bar\'s width animation off for reduced motion, and keeps the focus ring', () => {
    if (!canRead) return;
    const css = read('public/css/app.css');
    const rule = /\.ovl-steps\{([^}]*)\}/.exec(css);
    assert.equal(rule !== null, true, '.ovl-steps rule');
    assert.equal(/min-height:3em/.test(rule[1]), true, 'two 13px lines at 1.5 line height are 3em');
    assert.equal(/prefers-reduced-motion:reduce\)\{\*\{transition:none!important\}/.test(css), true);
    assert.equal(css.includes(':focus-visible{outline:3px solid var(--accent);outline-offset:2px}'), true, 'the focus ring is unchanged');
    assert.equal(/\.ovl-steps\{[^}]*(animation|transition)/.test(css), false, 'nothing animates when the line changes');
  });
});
