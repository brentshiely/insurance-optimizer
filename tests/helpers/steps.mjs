// Test helper (Story S20): the slow, obviously correct way to count the steps of a catalog, used to check the fast
// stepRange() and the claims about the total. Not a *.test.mjs file, so scripts/test.sh does not run it directly.
//
// bruteForce(catalog) walks EVERY non-empty set of policies Q1 offers (2^13 - 1 = 8,191 for the real catalog) through
// the engine's own session and records which sections have a visible question. About two seconds under jsc, so it is
// computed once per catalog and shared by every test file that asks.
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import { POLICIES_QUESTION_ID } from '../../public/js/overlap/engine/constants.mjs';

const cache = new WeakMap();

/** The section ids of a catalog in screen order: its `sections` list, or the order the questions first name them. */
export function sectionIdsOf(catalog) {
  if (Array.isArray(catalog.sections)) return catalog.sections.map((s) => s.id);
  const out = [];
  for (const q of catalog.questions) if (out.indexOf(q.section) < 0) out.push(q.section);
  return out;
}

/**
 * `{ policyIds, sectionIds, sets }`: `sets[i]` is `{ ticked: [policy ids], sections: [section ids with a visible question,
 * in screen order] }` for the i-th non-empty set (bit j of i + 1 is the j-th policy). The number of steps for a set is
 * `sets[i].sections.length`.
 */
export function bruteForce(catalog) {
  if (cache.has(catalog)) return cache.get(catalog);
  const session = createSession(catalog);
  const q1 = session.getQuestion(POLICIES_QUESTION_ID);
  const policyIds = q1.options.filter((o) => o.exclusive !== true).map((o) => o.id);
  const sectionIds = sectionIdsOf(catalog);
  const sets = [];
  for (let mask = 1; mask < (1 << policyIds.length); mask++) {
    const ticked = policyIds.filter((_, i) => (mask & (1 << i)) !== 0);
    const shown = {};
    for (const q of session.visibleQuestions({ [POLICIES_QUESTION_ID]: ticked })) shown[q.section] = true;
    sets.push({ ticked, sections: sectionIds.filter((id) => shown[id] === true) });
  }
  const out = { policyIds, sectionIds, sets };
  cache.set(catalog, out);
  return out;
}

/**
 * The section ids (in screen order) that have a visible question for these answers, straight from the engine's session:
 * the slow way to count the steps of ONE household, for answers that are not a plain set of ticks (nothing answered, "None of these").
 */
export function bruteSectionsFor(catalog, answers) {
  const session = createSession(catalog);
  const shown = {};
  for (const q of session.visibleQuestions(session.prune(answers))) shown[q.section] = true;
  return sectionIdsOf(catalog).filter((id) => shown[id] === true);
}

/** Fewest and most steps over the brute-force sets. */
export function bruteRange(catalog) {
  const { sets } = bruteForce(catalog);
  let min = Infinity;
  let max = 0;
  for (const s of sets) {
    if (s.sections.length < min) min = s.sections.length;
    if (s.sections.length > max) max = s.sections.length;
  }
  return { min, max, sets: sets.length };
}

/** A small deterministic random generator (the tests may not use Math.random): returns a function giving integers below n. */
export function seeded(seed) {
  let s = seed >>> 0;
  return (n) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return Math.floor((s / 4294967296) * n);
  };
}
