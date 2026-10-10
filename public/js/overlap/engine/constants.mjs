// Shared closed lists and reserved ids for the overlap engine. Pure data, no imports.

/** Reserved option id appended to a question when `allowNotSure` is true. */
export const NOT_SURE = 'not_sure';

/** Key in `answers` that holds the derived set of policy ids (see adapter.mjs). Not a question. */
export const POLICIES_KEY = 'policies';

/** Convention: the multi question that records which credit cards the user carries (ctx.cards()). */
export const CARDS_QUESTION_ID = 'cards';

export const BUCKETS = ['raise', 'drop', 'question'];
export const KINDS = ['cross-policy', 'within-policy', 'education'];
export const EMPHASES = ['normal', 'strong'];
export const QUESTION_TYPES = ['single', 'multi'];
export const DOMAINS = ['core', 'umbrella', 'auto', 'home', 'renters', 'health', 'vehicles', 'deductible', 'other', 'cards'];

/** Policy ids that can appear in the derived `policies` answer (ARCHITECTURE adapter table), sorted. */
export const POLICY_IDS = [
  'accidental_death', 'auto', 'boat', 'health', 'home', 'motorcycle', 'phone',
  'rental_car', 'renters', 'towing', 'travel', 'umbrella', 'warranty',
];

/** The subset of POLICY_IDS the user selects in the `other_items` question (host `o.other_items`). */
export const OTHER_ITEM_POLICY_IDS = ['rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death'];

/** Benefit keys every card entry must carry (ARCHITECTURE "Card"). */
export const CARD_BENEFIT_KEYS = ['rentalCar', 'tripProtection', 'cellPhone', 'extendedWarranty', 'purchaseProtection', 'roadside'];
export const BENEFIT_STATUSES = ['primary', 'secondary', 'yes', 'none', 'unverified'];
/** Statuses that count as "the card has this benefit" for ctx.cardsWith(). 'unverified' and 'none' do not. */
export const BENEFIT_PRESENT = ['primary', 'secondary', 'yes'];
