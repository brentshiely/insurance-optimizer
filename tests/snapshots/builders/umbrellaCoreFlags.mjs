// Builders for the Story S6 flag snapshots (see stackMatrix.mjs for the mechanism).
//   buildUmbrellaCoreFlags(): which of the six S6 flags fire, with their emphasis, on every one of the 1,200 core
//   combinations and on every motorcycle and boat limit against every requirement.
//   buildStackScenarios(): the full stack model and the fully rendered S6 flags for a few named households, so a change
//   to the copy or to the model shows up as a reviewable diff.
// Only S6's own flags are recorded, so flags other stories add later (for example S7's umbrella scope flags, which fire for
// every umbrella holder) never change these snapshots.
import { evaluate } from '../../../public/js/overlap/engine/evaluate.mjs';
import UMBRELLA_FLAGS from '../../../public/js/overlap/data/flags/umbrella.mjs';
import VEHICLE_FLAGS from '../../../public/js/overlap/data/flags/vehicles.mjs';
import { AUTO_LIMITS, AUTO_REQUIREMENTS, eachCoreCombination } from './stackMatrix.mjs';

const S6_IDS = UMBRELLA_FLAGS.concat(VEHICLE_FLAGS).map((f) => f.id);

const s6Flags = (result) => ['raise', 'drop', 'question']
  .reduce((all, bucket) => all.concat(result.flags[bucket].map((f) => ({ ...f, bucket }))), [])
  .filter((f) => S6_IDS.includes(f.id));

const line = (flags) => {
  const part = (bucket) => {
    const list = flags.filter((f) => f.bucket === bucket).map((f) => (f.emphasis === 'strong' ? `${f.id} (strong)` : f.id));
    return list.length === 0 ? '' : `${bucket}: ${list.join(', ')}`;
  };
  return ['raise', 'drop', 'question'].map(part).filter((p) => p !== '').join(' | ') || 'none';
};

export function buildUmbrellaCoreFlags() {
  const combinations = {};
  eachCoreCombination((answers, key) => { combinations[key] = line(s6Flags(evaluate(answers))); });
  const motorcycle = {};
  const boat = {};
  for (const l of AUTO_LIMITS) for (const r of AUTO_REQUIREMENTS) {
    motorcycle[`${l}|${r}`] = line(s6Flags(evaluate({ policies: ['motorcycle', 'umbrella'], umbrella_limit: '1m', motorcycle_liability: l, umbrella_min_motorcycle: r })));
    boat[`${l}|${r}`] = line(s6Flags(evaluate({ policies: ['boat', 'umbrella'], umbrella_limit: '1m', boat_liability: l, umbrella_min_boat: r })));
  }
  return {
    about: 'S6 flags fired per combination, in the order evaluate() returns them (bucket, then priority). Combination keys read: umbrella size | auto limit | umbrella auto requirement | home limit | umbrella home requirement. Vehicle keys read: limit | requirement.',
    combinations,
    motorcycle,
    boat,
  };
}

const SCENARIOS = [
  ['home-short-of-500k', { policies: ['auto', 'home', 'umbrella'], umbrella_limit: '1m', auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '500k' }],
  ['everything-matches', { policies: ['auto', 'home', 'umbrella'], umbrella_limit: '2m', auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '500k' }],
  ['lower-than-the-lowest-tier', { policies: ['auto', 'home', 'umbrella'], umbrella_limit: '1m', auto_liability: 'lower', umbrella_min_auto: '100_300', home_liability: 'lower', umbrella_min_home: '300k' }],
  ['carrying-more-than-required', { policies: ['auto', 'home', 'umbrella'], umbrella_limit: '5m', auto_liability: '500_500', umbrella_min_auto: '250_500', home_liability: '1m', umbrella_min_home: '500k' }],
  ['not-sure-mix', { policies: ['auto', 'home', 'umbrella'], umbrella_limit: 'not_sure', auto_liability: '100_300', umbrella_min_auto: 'not_sure', home_liability: 'lower', umbrella_min_home: 'not_sure' }],
  ['motorcycle-and-boat', { policies: ['auto', 'boat', 'home', 'motorcycle', 'umbrella'], umbrella_limit: '1m', auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '500k', motorcycle_liability: 'lower', umbrella_min_motorcycle: '250_500', boat_liability: '100_300', umbrella_min_boat: '500_500' }],
  ['umbrella-only', { policies: ['umbrella'], umbrella_limit: '1m' }],
  ['no-umbrella', { policies: ['auto', 'home'], auto_liability: '100_300', umbrella_min_auto: '250_500' }],
];

export function buildStackScenarios() {
  const out = {};
  for (const [name, answers] of SCENARIOS) {
    const result = evaluate(answers);
    out[name] = {
      answers,
      stack: result.stack,
      flags: s6Flags(result).map((f) => ({
        id: f.id,
        bucket: f.bucket,
        emphasis: f.emphasis,
        title: f.title,
        background: f.background,
        ask: f.ask,
        reason: f.reason,
        sourceIds: f.sources.map((s) => s.id),
      })),
    };
  }
  return out;
}
