// Flags for the "auto" domain group: within-policy gaps and trims on the auto policy itself (Story S8, SPEC
// "Auto coverage gaps"). Five flags, all kind "within-policy", priorities 210 to 250:
//   auto-um-uim-check                question  uninsured / underinsured motorist coverage and its limit
//   auto-gap-coverage-missing        raise     loan or lease on a newer car, user says no gap coverage
//   auto-gap-coverage-confirm        question  same gate, user is not sure (the Question twin of the Raise)
//   auto-rental-reimbursement-check  question  rental while the car is repaired, one text per answer
//   auto-collision-older-car         drop      paid-off, low-value car that still carries collision + comprehensive
//
// How they read answers (docs/QUESTION-FLAG-PLAN.md section 1): only closed-list answers, never policy-screen
// numbers. A missing answer never fires a flag. "Not sure" fires only a Question (a Raise or Drop cannot assert
// what the user does not know). The auto gate questions are about the user's NEWEST car (DECISIONS S5-4).
//
// Copy rules: plain second person, jargon defined in a clause, state-neutral (no state is named and no count of
// states is given), no dashes. Where the research recorded a gap the text asks instead of asserting
// (docs/QUESTION-FLAG-PLAN.md section 6): no limit tier is recommended (100/300 is a yardstick only), no gap price,
// no vehicle-age rule, and a lender is never said to require gap on a loan. Emphasis is "normal" for every flag:
// the catalog does not collect what would justify escalating (down payment, loan length, the premium), DECISIONS S8-1.
//
// Variants: applies() puts which situation the user is in into vars.situation (or vars.financing) and the text
// fields are functions that pick the matching wording. Each text is one string per situation, so the whole
// wording of a flag can be read in one place below.

// ---------------------------------------------------------------- shared helpers

// The latest Insurance Research Council uninsured-driver estimate. One dated figure from one edition only
// (DECISIONS S3a-auto-1, research/auto-coverages.mjs designInputs.uninsuredDriverStatistic: 15.4 percent in 2023).
// A test ties these words to the research file, so refreshing the research without this copy fails the suite.
const UNINSURED = {
  publisher: 'Insurance Research Council',
  year: 2023,
  rounded: 'about 15%',
  words: 'more than one in seven',
};

// 100/300 is a yardstick for "lower than the usual first rung", not a recommendation: no authoritative source
// gives UM/UIM tiers (DECISIONS S3a-auto-5, S8-3).
const UM_REFERENCE = { perPerson: 100000, perAccident: 300000 };

// Gap coverage and the older-car check are about a car worth $3,000 or more / under $3,000 (the `under_3000` band).
const LOW_VALUE_DOLLARS = 3000;

/** Chooses the text for the situation applies() put in vars (a missing key is a bug the suite would catch). */
const bySituation = (table, key = 'situation') => (ctx, vars) => table[vars[key]];

/** True when the chosen option is a band whose top edge is under `dollars` (certainly under; Not sure has no value). */
const certainlyUnder = (option, dollars) => Boolean(option)
  && typeof option.value === 'object' && option.value !== null
  && option.value.max !== null && option.value.max < dollars;

/** True when the chosen split limit is lower than the UM/UIM yardstick on either number. */
const belowReference = (option) => Boolean(option)
  && typeof option.value === 'object' && option.value !== null
  && (option.value.perPerson < UM_REFERENCE.perPerson || option.value.perAccident < UM_REFERENCE.perAccident);

/**
 * "loan" or "lease" when the newest car is financed or leased AND is not certainly worth under $3,000 (a Not sure
 * value still counts), otherwise null. Never true for an owned-outright car or when either answer is missing.
 */
function gapSituation(ctx) {
  if (!ctx.holds('auto')) return null;
  const financing = ctx.answer('auto_financing');
  if (financing !== 'loan' && financing !== 'lease') return null;
  if (ctx.answer('auto_value') === undefined) return null;
  if (certainlyUnder(ctx.option('auto_value'), LOW_VALUE_DOLLARS)) return null;
  return financing;
}

// ---------------------------------------------------------------- auto-um-uim-check

const UM_WHAT = 'Uninsured motorist coverage pays you and your passengers when a driver with no insurance, or a hit-and-run driver, causes the crash. Underinsured motorist coverage steps in when the at-fault driver has insurance but their limits are too low to cover your losses.';
const UM_STAT = `The ${UNINSURED.publisher} estimated that ${UNINSURED.rounded} of U.S. drivers, ${UNINSURED.words}, had no insurance in ${UNINSURED.year}.`;
const UM_STATE = "Whether this coverage is required, and the minimum amounts, differ from state to state, so your state's department of insurance can tell you the rules where you live.";
const UM_CAR_DAMAGE = 'Also ask whether damage to your car from an uninsured driver is covered separately, because that is usually a different coverage and what is offered varies.';

const umUimCheck = {
  id: 'auto-um-uim-check',
  domain: 'auto',
  bucket: 'question',
  kind: 'within-policy',
  priority: 210,
  title: bySituation({
    none: 'Ask your insurer about adding uninsured and underinsured motorist coverage',
    unsure: 'Find out whether your policy has uninsured and underinsured motorist coverage',
    low: 'Check the limit on your uninsured and underinsured motorist coverage',
    limit_unsure: 'Check the limit on your uninsured and underinsured motorist coverage',
  }),
  applies(ctx) {
    if (!ctx.holds('auto')) return false;
    if (ctx.is('auto_um_uim', 'no')) return { vars: { situation: 'none' } };
    if (ctx.isNotSure('auto_um_uim')) return { vars: { situation: 'unsure' } };
    if (ctx.is('auto_um_uim', 'yes')) {
      // The limit is asked only after a yes. Unanswered stays silent; Not sure asks; a known limit is compared
      // with the 100/300 yardstick, and 100/300 or higher is silent.
      if (ctx.isNotSure('auto_um_uim_limit')) return { vars: { situation: 'limit_unsure' } };
      if (belowReference(ctx.option('auto_um_uim_limit'))) return { vars: { situation: 'low' } };
    }
    return false;
  },
  background: bySituation({
    none: `You told us your auto policy does not include uninsured and underinsured motorist coverage. ${UM_WHAT} ${UM_STAT} ${UM_STATE}`,
    unsure: `You weren't sure whether your auto policy includes uninsured and underinsured motorist coverage. ${UM_WHAT} ${UM_STAT} ${UM_STATE}`,
    low: `You told us the limit on your uninsured and underinsured motorist coverage is lower than 100/300. We use 100/300 only as a point of comparison, not as a recommended amount. A limit is the most the coverage will pay, so a low one can leave you short after a serious injury. ${UM_WHAT} ${UM_STAT} ${UM_STATE}`,
    limit_unsure: `You told us you have uninsured and underinsured motorist coverage but weren't sure of the limit. A limit is the most the coverage will pay, so it matters most after a serious injury. ${UM_WHAT} ${UM_STAT} ${UM_STATE}`,
  }),
  ask: bySituation({
    none: `Ask your insurer whether uninsured and underinsured motorist coverage is on your policy, what it would cost to add, and what limits you can choose. ${UM_CAR_DAMAGE}`,
    unsure: `Look for "uninsured motorist" or "UM/UIM" on the summary page of your policy, called the declarations page. If you don't see it, ask your insurer whether you have it and at what limit. ${UM_CAR_DAMAGE}`,
    low: `Ask your insurer what your uninsured and underinsured motorist limit is, what higher limits are available, and what raising it would cost. ${UM_CAR_DAMAGE}`,
    limit_unsure: `Ask your insurer what your uninsured and underinsured motorist limit is and what a higher limit would cost. ${UM_CAR_DAMAGE}`,
  }),
  reason: bySituation({
    none: 'I want to know what it would cost to add uninsured and underinsured motorist coverage, so my policy pays me if a driver with no insurance, or too little, injures me.',
    unsure: 'I want to confirm whether my policy includes uninsured and underinsured motorist coverage, and at what limit.',
    low: 'I want to know what it would cost to raise my uninsured and underinsured motorist limit, in case a driver with no insurance, or too little, seriously injures me.',
    limit_unsure: 'I want to confirm my uninsured and underinsured motorist limit and what a higher one would cost.',
  }),
  sourceIds: [
    'irc-2025-one-in-three-uninsured-underinsured',
    'naic-uninsured-motorists',
    'naic-shopping-tool-auto-2023',
    'iii-protect-yourself-uninsured-motorists',
    'naic-consumers-guide-auto-2022',
    'iii-compulsory-auto-uninsured-motorists',
  ],
};

// ---------------------------------------------------------------- auto-gap-coverage-missing (Raise)

const GAP_LOAN_WHAT = 'If your newest car is totaled or stolen, a regular collision or comprehensive claim pays what the car was worth, not what you still owe. Gap coverage pays the difference. It does not replace collision or comprehensive.';
const GAP_LEASE_WHAT = 'If your leased car is totaled or stolen, insurance pays what the car was worth, which can be less than what you still owe on the lease. Gap coverage pays the difference.';

const gapCoverageMissing = {
  id: 'auto-gap-coverage-missing',
  domain: 'auto',
  bucket: 'raise',
  kind: 'within-policy',
  priority: 220,
  title: bySituation({
    loan: 'Ask about adding gap coverage to your financed car',
    lease: 'Confirm your leased car has gap coverage',
  }, 'financing'),
  applies(ctx) {
    const financing = gapSituation(ctx);
    if (financing === null || !ctx.is('auto_gap_coverage', 'no')) return false;
    return { vars: { financing } };
  },
  background: bySituation({
    loan: `${GAP_LOAN_WHAT} Gap coverage matters most if you put less than 20 percent down, took a loan of 60 months or longer, or rolled money you still owed on an old car into this loan. A new car loses value quickly, and most lose about 20 percent of their value within a year. You told us you do not have gap coverage.`,
    lease: `${GAP_LEASE_WHAT} Leases generally require it, and you told us you do not have it, so it is worth confirming that your lease does not already include it.`,
  }, 'financing'),
  ask: bySituation({
    loan: 'Ask your auto insurer what gap coverage (also called loan/lease coverage) would cost on this car, and compare it with the price the dealer or lender gives you, since prices vary widely. If you roll it into the loan, you borrow more and pay interest on it. A dealer or lender generally cannot make you buy gap unless your sales contract explicitly says so. If you owe less than the car is worth, you may not need it.',
    lease: "Check your lease paperwork first, since leases generally require gap coverage and yours may already have it. If you can't find it, ask the leasing company, then your auto insurer, whether gap coverage is in place and what it would cost to add.",
  }, 'financing'),
  reason: bySituation({
    loan: 'If my car is totaled, I want gap coverage to pay the difference between what it was worth and what I still owe.',
    lease: 'I want to confirm gap coverage is in place on my lease, so a total loss does not leave me owing the difference.',
  }, 'financing'),
  sourceIds: [
    'iii-what-is-gap-insurance',
    'cfpb-what-is-gap-insurance',
    'cfpb-gap-required-by-lender',
    'naic-shopping-tool-auto-2023',
  ],
};

// ---------------------------------------------------------------- auto-gap-coverage-confirm (Question twin)

const gapCoverageConfirm = {
  id: 'auto-gap-coverage-confirm',
  domain: 'auto',
  bucket: 'question',
  kind: 'within-policy',
  priority: 230,
  title: bySituation({
    loan: 'Find out whether your financed car has gap coverage',
    lease: 'Find out whether your leased car has gap coverage',
  }, 'financing'),
  applies(ctx) {
    const financing = gapSituation(ctx);
    if (financing === null || !ctx.isNotSure('auto_gap_coverage')) return false;
    return { vars: { financing } };
  },
  background: bySituation({
    loan: "You weren't sure whether you have gap coverage. If your newest car is totaled or stolen, a regular claim pays what the car was worth, not what you still owe, and gap coverage pays the difference. It can come from your auto insurer, the dealer or the lender, and it is also called guaranteed asset protection, or GAP.",
    lease: "You weren't sure whether you have gap coverage on your lease. If your leased car is totaled or stolen, insurance pays what the car was worth, which can be less than what you still owe on the lease, and gap coverage pays the difference. Leases generally require it, so yours may already include it.",
  }, 'financing'),
  ask: bySituation({
    loan: "Look through your loan and sales paperwork for gap coverage, then ask your lender or dealer whether you have it. A dealer or lender generally cannot make you buy gap unless your sales contract explicitly says so, so that contract is the place to look. Ask your auto insurer whether your policy includes it too. If you find you don't have it, ask what adding it would cost, since prices vary widely.",
    lease: 'Check your lease paperwork, or ask the leasing company, whether gap coverage is included. Ask your auto insurer whether your policy adds it too. If it is missing, ask what adding it would cost.',
  }, 'financing'),
  reason: bySituation({
    loan: 'I want to confirm whether gap coverage is in place on my car, and what it would cost to add if it is not.',
    lease: 'I want to confirm whether gap coverage is in place on my lease, and what it would cost to add if it is not.',
  }, 'financing'),
  sourceIds: [
    'iii-what-is-gap-insurance',
    'cfpb-what-is-gap-insurance',
    'cfpb-gap-required-by-lender',
  ],
};

// ---------------------------------------------------------------- auto-rental-reimbursement-check

const RENTAL_WHAT = 'Rental reimbursement pays a limited amount per day toward a rental car while your own car is being repaired after a covered claim. It is optional, and policies cap both the daily amount and the number of days. It is different from insurance for a car you rent on a trip.';
const RENTAL_TIED_TO_COLLISION = 'In some states this coverage is tied to your collision and comprehensive coverage instead, so check your own policy.';

const rentalReimbursementCheck = {
  id: 'auto-rental-reimbursement-check',
  domain: 'auto',
  bucket: 'question',
  kind: 'within-policy',
  priority: 240,
  title: bySituation({
    yes: 'Check the limits on your rental car coverage',
    no: 'Ask whether rental car coverage is worth adding',
    unsure: 'Find out whether your policy pays for a rental car',
  }, 'answer'),
  applies(ctx) {
    if (!ctx.holds('auto')) return false;
    if (ctx.is('auto_rental_reimbursement', 'yes')) return { vars: { answer: 'yes' } };
    if (ctx.is('auto_rental_reimbursement', 'no')) return { vars: { answer: 'no' } };
    if (ctx.isNotSure('auto_rental_reimbursement')) return { vars: { answer: 'unsure' } };
    return false;
  },
  background: bySituation({
    yes: `You told us your policy would pay for a rental, so the thing to check is the caps. ${RENTAL_WHAT}`,
    no: `You told us your policy would not pay for a rental, so you would cover that cost yourself while your car is being repaired. ${RENTAL_WHAT} Like other optional coverages, it is priced separately and raises your premium, which is what you pay for the policy. ${RENTAL_TIED_TO_COLLISION}`,
    unsure: `You weren't sure whether your policy would pay for a rental. ${RENTAL_WHAT} ${RENTAL_TIED_TO_COLLISION}`,
  }, 'answer'),
  ask: bySituation({
    yes: 'Look at the rental line on the summary page of your policy, or ask your insurer: what is the daily limit, what is the total limit, and would that cover a rental for as long as a repair could take?',
    no: 'Ask your insurer what rental reimbursement would add to your premium and which daily and total limits you could choose. Whether it is worth it is your call: weigh the cost against what a rental would run for the days a repair could take.',
    unsure: 'Check the summary page of your policy, or ask your insurer, whether you have rental reimbursement and, if so, what the daily and total limits are.',
  }, 'answer'),
  reason: bySituation({
    yes: 'I have rental reimbursement and want to confirm the daily and total limits.',
    no: "I don't have rental reimbursement, so I want to know what it would cost and what it would pay.",
    unsure: 'I want to confirm whether my policy pays for a rental while my car is repaired, and what the limits are.',
  }, 'answer'),
  sourceIds: [
    'naic-shopping-tool-auto-2023',
    'naic-what-does-auto-insurance-cover',
    'naic-consumer-insight-right-protection',
    'naic-consumers-guide-auto-2022',
  ],
};

// ---------------------------------------------------------------- auto-collision-older-car (Drop)

const collisionOlderCar = {
  id: 'auto-collision-older-car',
  domain: 'auto',
  bucket: 'drop',
  kind: 'within-policy',
  priority: 250,
  title: 'Ask about dropping collision and comprehensive on your low-value car',
  applies(ctx) {
    // Owned outright, worth certainly under $3,000, and the user says they still pay for collision and comprehensive.
    // A Not sure collision answer cannot support a Drop, so it produces nothing.
    return ctx.holds('auto')
      && ctx.is('auto_financing', 'paid_off')
      && certainlyUnder(ctx.option('auto_value'), LOW_VALUE_DOLLARS)
      && ctx.is('auto_collision', 'yes');
  },
  background: 'Collision pays to repair your car after a crash, and comprehensive pays for things like theft or hitting an animal. Both pay for the repair or, if the car is totaled, what it was worth, minus your deductible (the part of a claim you pay first). On a car worth under $3,000, the most they can ever pay is small. State law does not require either one, and a lender usually requires them only until the loan is paid off. You told us your newest car is paid off, so keeping them is your choice. The Insurance Information Institute gives a rule of thumb: if your car is worth less than ten times the premium, the coverage may not be cost effective.',
  ask: 'Ask your insurer what collision and comprehensive cost you on this car, and ask them to apply the ten-times rule with you, since we do not know what you pay. If the coverage looks too expensive for what it could pay, ask what you would save by dropping one or both, or by raising your deductible instead, as long as you have the money set aside to pay it. Before you drop anything, make sure you could repair or replace the car yourself. Also remember that your own collision and comprehensive coverage generally extends to a car you rent for personal trips, so dropping them may leave a rental unprotected.',
  reason: 'My car is paid off and worth under $3,000, so I want to know whether collision and comprehensive are still worth what I pay for them.',
  sourceIds: [
    'iii-nine-ways-lower-auto-costs',
    'naic-consumers-guide-auto-2022',
    'naic-shopping-tool-auto-2023',
    'iii-how-much-auto-coverage',
    'naic-consumer-insight-right-protection',
    'iii-collision-comprehensive',
    'iii-rental-car-insurance',
  ],
};

export default [
  umUimCheck,
  gapCoverageMissing,
  gapCoverageConfirm,
  rentalReimbursementCheck,
  collisionOlderCar,
];
