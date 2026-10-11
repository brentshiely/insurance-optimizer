// Which wording of a flag a household's answers should get, worked out from the answers alone (Story S12, DECISIONS S12-10 and S12-11). Not a
// *.test.mjs file, so scripts/test.sh does not run it directly; the audits import it. Written apart from the flags on purpose: the
// audits compare what a flag says with what the household's own answers call for, so they must not read the answer from the flag.
//
//   phoneVariant(policies)    'neither' | 'home' | 'renters' | 'both': which of a home and a renters policy the household holds,
//                             that is, which places besides a card the phone item may send it to
//   UMBRELLA_LAYERS           the four policies that can sit under an umbrella, with the question for the household's own limit and
//                             the one for what its umbrella requires
//   umbrellaGaps(answers)     null without an umbrella; otherwise { held, ownUnknown, requiredUnknown }: the layers held, those whose
//                             OWN limit is Not sure and those whose REQUIREMENT is Not sure
//   umbrellaGapKind(answers)  'none' | 'own' (only own limits are Not sure) | 'required' (only requirements are) | 'both'
//   umbrellaGapShape(answers) the same, with 'both' split into 'both-one-layer' (every layer with a gap has both numbers Not sure,
//                             or there is a single such layer) and 'both-two-layers' (one layer's own limit is Not sure and another
//                             layer's requirement is)
//
// Pure; runs under jsc and Node.

export const UMBRELLA_LAYERS = [
  { policy: 'auto', limit: 'auto_liability', required: 'umbrella_min_auto' },
  { policy: 'home', limit: 'home_liability', required: 'umbrella_min_home' },
  { policy: 'motorcycle', limit: 'motorcycle_liability', required: 'umbrella_min_motorcycle' },
  { policy: 'boat', limit: 'boat_liability', required: 'umbrella_min_boat' },
];

export function phoneVariant(policies) {
  const home = policies.includes('home');
  const renters = policies.includes('renters');
  if (home && renters) return 'both';
  if (home) return 'home';
  return renters ? 'renters' : 'neither';
}

export function umbrellaGaps(answers) {
  const policies = answers.policies || [];
  if (!policies.includes('umbrella')) return null;
  const held = UMBRELLA_LAYERS.filter((l) => policies.includes(l.policy));
  return {
    held,
    ownUnknown: held.filter((l) => answers[l.limit] === 'not_sure'),
    requiredUnknown: held.filter((l) => answers[l.required] === 'not_sure'),
  };
}

export function umbrellaGapKind(answers) {
  const gaps = umbrellaGaps(answers);
  if (gaps === null) return 'none';
  const { ownUnknown, requiredUnknown } = gaps;
  if (ownUnknown.length > 0 && requiredUnknown.length > 0) return 'both';
  if (ownUnknown.length > 0) return 'own';
  return requiredUnknown.length > 0 ? 'required' : 'none';
}

export function umbrellaGapShape(answers) {
  const kind = umbrellaGapKind(answers);
  if (kind !== 'both') return kind;
  const { ownUnknown, requiredUnknown } = umbrellaGaps(answers);
  const sameLayers = ownUnknown.length === requiredUnknown.length && ownUnknown.every((l) => requiredUnknown.includes(l));
  return sameLayers ? 'both-one-layer' : 'both-two-layers';
}
