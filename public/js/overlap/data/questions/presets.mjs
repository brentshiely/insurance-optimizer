// Shared option ladders and bands for the question catalog. Pure data builders: each function returns
// fresh objects, so no two questions share an option object.
//
// Value conventions (also in docs/ARCHITECTURE.md "Question", and docs/QUESTION-FLAG-PLAN.md):
//   split liability limit   { perPerson, perAccident }   whole dollars
//   single dollar amount    a number                      whole dollars
//   band                    { min, max }                  whole dollars, BOTH ENDS INCLUSIVE, max null = open ended.
//                           Bands of one question are contiguous: next.min === previous.max + 1, first min is 0.
// "Not sure" never has a value; the engine appends it.

const split = (id, perPersonThousands, perAccidentThousands) => ({
  id,
  label: `${perPersonThousands}/${perAccidentThousands}`,
  value: { perPerson: perPersonThousands * 1000, perAccident: perAccidentThousands * 1000 },
});

const band = (id, label, min, max) => ({ id, label, value: { min, max } });

/**
 * SPEC presets for what an umbrella REQUIRES underneath it (auto, motorcycle, boat): 100/300, 250/500, 500/500.
 * No "lower than" rung: this is what the umbrella asks of the other policy, not a limit the user holds, and a
 * user whose umbrella lists something off the ladder taps Not sure.
 */
export const liabilityOptions = () => [
  split('100_300', 100, 300),
  split('250_500', 250, 500),
  split('500_500', 500, 500),
];

/**
 * The USER'S OWN liability limit (auto, motorcycle, boat, and the auto UM/UIM limit, which is written the same
 * way): the same ladder with a first rung for "lower than 100/300". Finding a limit that is too low is the point
 * of the tool, so the ladder must be able to say so (DECISIONS S5-13). The value of that rung is the LARGEST
 * limit it can mean (just under 100/300), so "certainly below X" is "value < X" for every rung above it.
 */
export const liabilityLimitOptions = () => [
  {
    id: 'lower',
    label: 'Lower than 100/300',
    value: { perPerson: 99999, perAccident: 299999 },
  },
  ...liabilityOptions(),
];

/**
 * Home personal-liability limit: the SPEC presets with a first rung for "lower than $300,000", because the
 * research says home liability limits generally start at about $100,000 (S3a-home-3). Its value is the largest
 * limit it can mean, as above.
 */
export const homeLiabilityOptions = () => [
  { id: 'lower', label: 'Lower than $300,000', value: 299999 },
  { id: '300k', label: '$300,000', value: 300000 },
  { id: '500k', label: '$500,000', value: 500000 },
  { id: '1m', label: '$1 million', value: 1000000 },
];

/** Savings cushion and every deductible share these three bands (edges chosen so they compare cleanly). */
export const moneyBandOptions = () => [
  band('under_1000', 'Under $1,000', 0, 999),
  band('1000_4999', '$1,000 to $4,999', 1000, 4999),
  band('5000_plus', '$5,000 or more', 5000, null),
];

/** Umbrella exposure: coarse on purpose, a range is all we ever collect. */
export const exposureOptions = () => [
  band('under_1m', 'Under $1 million', 0, 999999),
  band('1m_3m', '$1 million to $3 million', 1000000, 3000000),
  band('over_3m', 'Over $3 million', 3000001, null),
];

/** Rough worth of the user's newest car. */
export const carValueOptions = () => [
  band('under_3000', 'Under $3,000', 0, 2999),
  band('3000_9999', '$3,000 to $9,999', 3000, 9999),
  band('10000_24999', '$10,000 to $24,999', 10000, 24999),
  band('25000_plus', '$25,000 or more', 25000, null),
];

/** A plain yes / no pair. Use with allowNotSure: true for the usual yes / no / not sure. */
export const yesNoOptions = () => [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
];
