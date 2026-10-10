// Reusable gate conditions for the question catalog (plain data, see docs/ARCHITECTURE.md "Condition DSL").
// Every question carries its own complete gate; these are only shorthand so the same rule is spelled once.
// The functions return a fresh object each time, so no two questions share (or can alter) one condition.

const holds = (policyId) => ({ holds: policyId });
const all = (...list) => ({ all: list });
const any = (...list) => ({ any: list });

/** True when the user holds this policy (derived `policies`, see the adapter table). */
export const gHolds = (policyId) => holds(policyId);

/**
 * A renters policy the user pays for: the host's own (a.home "Rent" or "Both", derived as `holds('renters')`) or one a
 * homeowner ticked in `other_items`. The tick is read as an answer, not as a policy, because the adapter folds only the six
 * Other-bucket ids into `policies` (DECISIONS S5-15). `other_items` is always visible, so reading it never hides anything.
 */
export const gRentersPolicy = () => any(holds('renters'), { answer: 'other_items', includes: 'renters_with_home' });

/** Umbrella branch: the umbrella plus one underlying policy. */
export const gUmbrellaAnd = (policyId) => all(holds('umbrella'), holds(policyId));

/** Umbrella branch: the umbrella plus a motorcycle or a boat. */
export const gUmbrellaAndAnyVehicle = () => all(holds('umbrella'), any(holds('motorcycle'), holds('boat')));

/** Any of the Other-bucket items whose coverage a credit card may already provide. */
export const gCardLinked = () => any(
  holds('rental_car'), holds('towing'), holds('travel'), holds('phone'), holds('warranty'),
);

/** Auto, home or health: the three policies that carry a deductible in the deductible-vs-cushion check. */
export const gDeductibleHolder = () => any(holds('auto'), holds('home'), holds('health'));

/** The auto policy plus a single-answer gate on another question. */
export const gAutoAnd = (...conditions) => all(holds('auto'), ...conditions);

/** Shorthand for { answer, is } and { answer, in }. */
export const gIs = (questionId, optionId) => ({ answer: questionId, is: optionId });
export const gIn = (questionId, optionIds) => ({ answer: questionId, in: optionIds });
