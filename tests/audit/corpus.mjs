// The text corpus the Story S12 audits read. Not a *.test.mjs file, so scripts/test.sh does not run it directly.
//
//   scenarioRuns(catalog?)    every named scenario (tests/scenarios/scenarios.mjs), evaluated: [{ id, answers, result }]
//   sweepRuns(catalog?)       a broader set of answers built from three of those scenarios, used only to scan wording:
//                               * each question, one option at a time, on top of three bases that open different follow-ups;
//                               * every combination of the three deductibles and the cushion (4 x 4 x 4 x 4);
//                               * every subset of the roadside sources and of the extra health policies;
//                               * every subset of the policies whose wording changes with them (home, renters, motorcycle,
//                                 boat, towing, travel, phone, accidental death).
//   householdRuns(catalog?)   1,500 random complete households (a fixed seed, so the same ones every run): a random set of policies,
//                             then a random answer to every question those ticks make visible, the way a person would reach
//                             the action list. The sweep above varies one thing at a time; flag text is also built from several
//                             answers at once (which extras, which limits are Not sure, which policies are held), so these
//                             reach combinations of wordings the sweep cannot.
//                             Together these reach far more wordings than the scenarios alone; the audits that scan text (copy,
//                             content, cards) read all three through everything(), and the audits that count scenarios
//                             (coverage, snapshots) read the scenarios only.
//   distinct(runs)           the distinct renderings in some runs: [{ key, flag, run }], one per different piece of text
//   flagsOf(result)          the result's flags as one list, in evaluate() order, each with its bucket
//
// Runs are computed once per catalog and kept (the suite imports this file from several tests).
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { evaluate } from '../../public/js/overlap/engine/evaluate.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import SCENARIOS from '../scenarios/scenarios.mjs';

export const BUCKETS = ['raise', 'drop', 'question'];

export const flagsOf = (result) => BUCKETS.reduce((all, bucket) => all.concat(result.flags[bucket].map((f) => ({ ...f, bucket }))), []);

const scenarioCache = new Map();
const sweepCache = new Map();
const householdCache = new Map();

export function scenarioRuns(catalog = CATALOG) {
  if (!scenarioCache.has(catalog)) {
    scenarioCache.set(catalog, SCENARIOS.map((s) => ({ id: s.id, answers: s.answers, result: evaluate(s.answers, catalog) })));
  }
  return scenarioCache.get(catalog);
}

const clone = (v) => JSON.parse(JSON.stringify(v));
const scenario = (id) => {
  const found = SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`corpus: no scenario "${id}"`);
  return found.answers;
};

// Every subset of `ids`, as arrays in the order given.
function subsets(ids) {
  const out = [];
  for (let mask = 0; mask < (1 << ids.length); mask++) out.push(ids.filter((_, i) => (mask >> i) & 1));
  return out;
}

// The three scenarios the sweep starts from. Each ticks all thirteen policies and answers everything, and they differ in the
// answers that open follow-ups: a financed car and a child in a dorm; a paid-off car worth under $3,000; Not sure everywhere.
const BASE_IDS = ['everything-ticked-worst-case', 'everything-ticked-with-an-old-paid-off-car', 'not-sure-everywhere'];

export function sweepRuns(catalog = CATALOG) {
  if (sweepCache.has(catalog)) return sweepCache.get(catalog);
  const session = createSession(catalog);
  const runs = [];
  const add = (id, answers) => runs.push({ id, answers, result: evaluate(answers, catalog) });
  const bases = BASE_IDS.map((id) => [id, scenario(id)]);

  // One question at a time. An answer to a question the base leaves hidden is pruned, so it changes nothing; that is fine.
  for (const [baseId, base] of bases) {
    for (const q of session.questions) {
      if (q.id === 'policies') continue;
      for (const o of q.options) {
        add(`${baseId} + ${q.id}=${o.id}`, { ...clone(base), [q.id]: q.type === 'multi' ? [o.id] : o.id });
      }
    }
  }

  const worst = clone(scenario(BASE_IDS[0]));
  const bands = ['under_1000', '1000_4999', '5000_plus', 'not_sure'];
  for (const a of bands) for (const h of bands) for (const m of bands) for (const c of bands) {
    add(`deductibles ${a}/${h}/${m} cushion ${c}`, { ...clone(worst), deductible_auto: a, deductible_home: h, deductible_health: m, emergency_cushion: c });
  }
  for (const picked of subsets(['auto_policy', 'club', 'card', 'car_maker', 'other'])) {
    if (picked.length > 0) add(`roadside ${picked.join('+')}`, { ...clone(worst), roadside_sources: picked });
  }
  for (const picked of subsets(['accident', 'critical_illness', 'hospital_indemnity', 'cancer'])) {
    if (picked.length > 0) add(`supplemental ${picked.join('+')}`, { ...clone(worst), health_supplemental: picked });
  }
  const textPolicies = ['home', 'renters', 'motorcycle', 'boat', 'towing', 'travel', 'phone', 'accidental_death'];
  for (const dropped of subsets(textPolicies)) {
    const kept = worst.policies.filter((p) => !dropped.includes(p));
    add(`without ${dropped.join('+') || 'nothing'}`, { ...clone(worst), policies: kept });
  }

  sweepCache.set(catalog, runs);
  return runs;
}

export const HOUSEHOLD_COUNT = 1500;
const HOUSEHOLD_SEED = 20261010;

/**
 * Random complete households: [{ id, answers, result }], `count` of them, always the same for the same seed. The answers are
 * built through the session, so each is exactly what the page could hold: a random tick of Q1 (about one in twenty is "None of
 * these"), then every visible question answered at random, again and again until no new question appears.
 */
export function householdRuns(catalog = CATALOG, count = HOUSEHOLD_COUNT, seed = HOUSEHOLD_SEED) {
  const key = `${count}/${seed}`;
  if (!householdCache.has(catalog)) householdCache.set(catalog, new Map());
  const byKey = householdCache.get(catalog);
  if (byKey.has(key)) return byKey.get(key);

  const session = createSession(catalog);
  let state = seed >>> 0;
  const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const pick = (list) => list[Math.floor(next() * list.length)];
  const policyIds = session.getQuestion('policies').options.filter((o) => !o.exclusive).map((o) => o.id);

  const runs = [];
  for (let i = 0; i < count; i++) {
    const answers = { policies: next() < 0.05 ? ['none'] : policyIds.filter(() => next() < 0.45) };
    if (answers.policies.length === 0) answers.policies = [pick(policyIds)];
    for (let round = 0; round < 20; round++) {
      const open = session.visibleQuestions(session.prune(answers)).filter((q) => !Object.prototype.hasOwnProperty.call(answers, q.id));
      if (open.length === 0) break;
      for (const q of open) {
        if (q.type === 'single') { answers[q.id] = pick(q.options).id; continue; }
        const exclusive = q.options.filter((o) => o.exclusive);
        if (exclusive.length > 0 && next() < 0.25) { answers[q.id] = [pick(exclusive).id]; continue; }
        const ordinary = q.options.filter((o) => !o.exclusive);
        let chosen = ordinary.filter(() => next() < 0.4).map((o) => o.id);
        if (chosen.length === 0) chosen = [pick(ordinary).id];
        answers[q.id] = chosen;
      }
    }
    const kept = session.prune(answers);
    runs.push({ id: `household ${i + 1}`, answers: kept, result: evaluate(kept, catalog) });
  }
  byKey.set(key, runs);
  return runs;
}

const fingerprint = (f) => JSON.stringify([f.id, f.bucket, f.domain, f.kind, f.title, f.emphasis, f.background, f.ask, f.reason, f.sources]);

/** The distinct renderings in `runs`: one entry per different piece of text, with the first run that showed it. */
export function distinct(runs) {
  const seen = new Map();
  for (const run of runs) {
    for (const flag of flagsOf(run.result)) {
      const key = fingerprint(flag);
      if (!seen.has(key)) seen.set(key, { key, flag, run });
    }
  }
  return Array.from(seen.values());
}

/** Distinct renderings across the scenarios, the sweep and the random households (memoized per catalog). */
const everythingCache = new Map();
export function everything(catalog = CATALOG) {
  if (!everythingCache.has(catalog)) {
    everythingCache.set(catalog, distinct(scenarioRuns(catalog).concat(sweepRuns(catalog), householdRuns(catalog))));
  }
  return everythingCache.get(catalog);
}

/** All the visible text of the question catalog, as [label, text] pairs: prompts, help, option labels, section titles and reasons. */
export function questionTexts(catalog = CATALOG, sections) {
  const out = [];
  for (const q of catalog.questions) {
    out.push([`question ${q.id} prompt`, q.prompt]);
    if (q.help) out.push([`question ${q.id} help`, q.help]);
    for (const o of q.options) out.push([`question ${q.id} option ${o.id}`, o.label]);
  }
  for (const s of sections || []) {
    out.push([`section ${s.id} title`, s.title]);
    out.push([`section ${s.id} reason`, s.reason]);
  }
  return out;
}
