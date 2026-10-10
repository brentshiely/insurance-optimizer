// Builders for the Story S6 snapshots. Each function returns plain data; tests/snapshots/gen/*.gen.mjs print it
// and scripts/update-snapshots.sh writes it to tests/snapshots/<name>.snap.mjs. Tests rebuild the data and compare
// it with the committed snapshot (assertSnapshot). Not a *.test.mjs file, so scripts/test.sh does not run it directly.
//
// This file: the liability stack model over every preset combination of the core ladder.
//   umbrella limit (1m, 2m, 5m, not_sure) x auto limit (lower, 100_300, 250_500, 500_500, not_sure)
//   x umbrella's auto requirement (100_300, 250_500, 500_500, not_sure) x home limit (lower, 300k, 500k, 1m, not_sure)
//   x umbrella's home requirement (300k, 500k, not_sure) = 1,200 combinations,
// plus every motorcycle and boat limit against every requirement.
//
// To keep the file reviewable the model is stored normalized: each distinct layer object once (a layer depends only on
// its own limit and requirement answers, and the builder throws if it ever depends on anything else, such as the
// umbrella size), each distinct umbrella object once, and one summary line per combination.
import { createContext } from '../../../public/js/overlap/engine/evaluate.mjs';
import { serialize } from '../../harness.mjs';

export const UMBRELLA_LIMITS = ['1m', '2m', '5m', 'not_sure'];
export const AUTO_LIMITS = ['lower', '100_300', '250_500', '500_500', 'not_sure'];
export const AUTO_REQUIREMENTS = ['100_300', '250_500', '500_500', 'not_sure'];
export const HOME_LIMITS = ['lower', '300k', '500k', '1m', 'not_sure'];
export const HOME_REQUIREMENTS = ['300k', '500k', 'not_sure'];

export const stackFor = (answers) => createContext(answers).stack;

/** Calls fn(answers, key) for each of the 1,200 core combinations; `key` is "umbrella|autoLimit|autoReq|homeLimit|homeReq". */
export function eachCoreCombination(fn) {
  for (const u of UMBRELLA_LIMITS) for (const al of AUTO_LIMITS) for (const ar of AUTO_REQUIREMENTS) for (const hl of HOME_LIMITS) for (const hr of HOME_REQUIREMENTS) {
    fn({
      policies: ['auto', 'home', 'umbrella'],
      umbrella_limit: u,
      auto_liability: al,
      umbrella_min_auto: ar,
      home_liability: hl,
      umbrella_min_home: hr,
    }, [u, al, ar, hl, hr].join('|'));
  }
}

function keepOnce(bucket, key, value, what) {
  if (!Object.prototype.hasOwnProperty.call(bucket, key)) bucket[key] = value;
  else if (serialize(bucket[key]) !== serialize(value)) throw new Error(`${what} ${key} changed with an answer it should not depend on`);
}

export function buildStackMatrix() {
  const umbrellas = {};
  const layers = { auto: {}, home: {}, motorcycle: {}, boat: {} };
  const combinations = {};
  eachCoreCombination((answers, key) => {
    const s = stackFor(answers);
    keepOnce(umbrellas, answers.umbrella_limit, s.umbrella, 'umbrella');
    keepOnce(layers.auto, `${answers.auto_liability}|${answers.umbrella_min_auto}`, s.layers[0], 'auto layer');
    keepOnce(layers.home, `${answers.home_liability}|${answers.umbrella_min_home}`, s.layers[1], 'home layer');
    const findings = s.findings.map((f) => f.id).join(', ') || 'none';
    combinations[key] = `auto ${s.layers[0].status} | home ${s.layers[1].status} | findings: ${findings}`;
  });
  for (const l of AUTO_LIMITS) for (const r of AUTO_REQUIREMENTS) {
    const m = stackFor({ policies: ['motorcycle', 'umbrella'], umbrella_limit: '1m', motorcycle_liability: l, umbrella_min_motorcycle: r });
    keepOnce(layers.motorcycle, `${l}|${r}`, m.layers[0], 'motorcycle layer');
    const b = stackFor({ policies: ['boat', 'umbrella'], umbrella_limit: '1m', boat_liability: l, umbrella_min_boat: r });
    keepOnce(layers.boat, `${l}|${r}`, b.layers[0], 'boat layer');
  }
  return {
    about: 'Liability stack over every preset combination. Combination keys read: umbrella size | auto limit | umbrella auto requirement | home limit | umbrella home requirement. Layer keys read: limit | requirement.',
    umbrellas,
    layers,
    combinations,
  };
}
