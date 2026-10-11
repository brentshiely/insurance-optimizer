// Story S12 audit: 1,500 random complete households (tests/audit/corpus.mjs, a fixed seed).
//
// The named scenarios are chosen; these are not, so they find what nobody thought to write down: an answer combination that
// makes a text function throw, two flags with the same id, a flag that fires for a household that does not hold the policy it
// is about, a result that depends on key order. The wording of everything they reach is scanned by the copy, content and card
// audits (they read these households through everything()).
//
// Pure data checks; runs under jsc and Node.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { evaluate } from '../../public/js/overlap/engine/evaluate.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import { householdRuns, HOUSEHOLD_COUNT, flagsOf } from './corpus.mjs';

const session = createSession(CATALOG);

// The policies a household must hold, all of them, before a flag may be shown (a flag is "about" these). `any` is a list of
// policies of which at least one must be held. A new flag has to be added here: the first test fails until it is.
const REQUIRES = {
  'umbrella-home-below-required-min': { all: ['umbrella', 'home'] },
  'umbrella-auto-below-required-min': { all: ['umbrella', 'auto'] },
  'umbrella-primary-liability-overbought': { all: ['umbrella'], any: ['auto', 'home'] },
  'umbrella-limits-unconfirmed': { all: ['umbrella'] },
  'umbrella-motorcycle-below-required-min': { all: ['umbrella', 'motorcycle'] },
  'umbrella-boat-below-required-min': { all: ['umbrella', 'boat'] },
  'umbrella-smaller-than-exposure': { all: ['umbrella'] },
  'umbrella-size-unconfirmed': { all: ['umbrella'] },
  'umbrella-um-uim-extension': { all: ['umbrella', 'auto'] },
  'umbrella-scope-exclusions': { all: ['umbrella'] },
  'auto-um-uim-check': { all: ['auto'] },
  'auto-gap-coverage-missing': { all: ['auto'] },
  'auto-gap-coverage-confirm': { all: ['auto'] },
  'auto-rental-reimbursement-check': { all: ['auto'] },
  'auto-collision-older-car': { all: ['auto'] },
  'home-sewer-backup-missing': { all: ['home'] },
  'home-flood-no-separate-policy': { all: ['home'] },
  'renters-child-vs-parents-home': { all: ['renters', 'home'] },
  'health-auto-medpay-overlap': { all: ['health', 'auto'] },
  'health-supplemental-boltons': { all: ['health'] },
  'health-hsa-nudge': { all: ['health'] },
  'health-short-term-plan-alongside': { all: ['health'] },
  'deductible-exceeds-cushion-auto': { all: ['auto'] },
  'deductible-exceeds-cushion-home': { all: ['home'] },
  'deductible-exceeds-cushion-health': { all: ['health'] },
  'other-rental-car-waiver': { all: ['rental_car'] },
  'other-towing-roadside-duplicate': { all: ['towing'] },
  'other-vehicle-towing-check': { all: ['towing'], any: ['motorcycle', 'boat'] },
  'other-travel-insurance-overlap': { all: ['travel'] },
  'other-phone-insurance-card': { all: ['phone'] },
  'other-extended-warranty-overlap': { all: ['warranty'] },
  'other-add-on-term-life': { all: ['accidental_death'] },
};

const allowed = (id, held) => {
  const rule = REQUIRES[id];
  return rule.all.every((p) => held.includes(p)) && (!rule.any || rule.any.some((p) => held.includes(p)));
};

suite('random households', (t) => {
  t('the households are real: 1,500 different complete households that between them tick every policy', () => {
    const runs = householdRuns();
    assert.equal(runs.length, HOUSEHOLD_COUNT);
    const distinctAnswers = new Set(runs.map((r) => JSON.stringify(r.answers)));
    assert.ok(distinctAnswers.size > 1400, `only ${distinctAnswers.size} different households`);
    const ticked = new Set(runs.reduce((all, r) => all.concat(r.answers.policies), []));
    for (const id of session.getQuestion('policies').options.map((o) => o.id)) assert.ok(ticked.has(id), `no household ticks ${id}`);
    const fired = runs.reduce((n, r) => n + flagsOf(r.result).length, 0);
    assert.ok(fired > 3000, `only ${fired} items shown across the households`);
  });

  t('every household is exactly what the page could hold and answers every question it can see', () => {
    for (const r of householdRuns()) {
      assert.deepEqual(session.prune(r.answers), r.answers, `${r.id} is not canonical`);
      assert.equal(r.result.meta.answeredCount, r.result.meta.visibleQuestionIds.length, `${r.id} left a visible question open`);
    }
  });

  t('every flag in the catalog is in the REQUIRES table of this file, and the table names no flag the catalog lacks', () => {
    const ids = CATALOG.flags.map((f) => f.id);
    assert.deepEqual(ids.filter((id) => !REQUIRES[id]), [], 'flags missing from REQUIRES (say which policies each is about)');
    assert.deepEqual(Object.keys(REQUIRES).filter((id) => !ids.includes(id)), [], 'REQUIRES names flags that do not exist');
  });

  t('a flag is shown only to a household that holds the policies it is about', () => {
    const wrong = [];
    for (const r of householdRuns()) {
      for (const f of flagsOf(r.result)) if (!allowed(f.id, r.answers.policies)) wrong.push(`${r.id}: ${f.id} shown with ${r.answers.policies.join(',')}`);
    }
    assert.deepEqual(wrong.slice(0, 10), []);
  });

  t('no item is shown twice, and "None of these" shows nothing', () => {
    for (const r of householdRuns()) {
      const ids = flagsOf(r.result).map((f) => f.id);
      assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], `${r.id} shows an item twice`);
      if (r.answers.policies[0] === 'none') assert.equal(ids.length, 0, `${r.id}: None of these must show nothing`);
    }
    assert.ok(householdRuns().some((r) => r.answers.policies[0] === 'none'), 'no household ticks None of these');
  });

  t('evaluating a household again, or with its answers in another key order, gives the same result', () => {
    for (const r of householdRuns()) {
      const reversed = {};
      for (const key of Object.keys(r.answers).reverse()) reversed[key] = r.answers[key];
      assert.deepEqual(evaluate(reversed), r.result, `${r.id}: key order changed the result`);
      assert.deepEqual(evaluate(r.answers), r.result, `${r.id}: a second evaluation differs`);
    }
  });

  t('the liability stack exists exactly when an umbrella is held, with one layer per underlying policy held', () => {
    for (const r of householdRuns()) {
      const held = r.answers.policies;
      if (!held.includes('umbrella')) { assert.equal(r.result.stack, null, `${r.id}: a stack without an umbrella`); continue; }
      assert.ok(r.result.stack, `${r.id}: no stack with an umbrella`);
      assert.deepEqual(r.result.stack.layers.map((l) => l.id), ['auto', 'home', 'motorcycle', 'boat'].filter((p) => held.includes(p)), `${r.id}: layers`);
    }
  });
});
