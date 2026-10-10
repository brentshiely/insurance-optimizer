// Flags for the "health" domain group (Story S10). Four Question flags, all in the narrow health scope of the
// SPEC: the auto medical-payments overlap, supplemental bolt-ons, the HSA nudge, and a short-term plan next to a
// main plan. They NEVER judge plan adequacy (no network, no "is this plan good enough"); they define terms and
// give the user something to ask. Every claim rests on the verified research in research/health-supplemental.mjs
// (and the MedPay facts in research/auto-coverages.mjs); where the research recorded a gap the copy is a question
// to ask, not an assertion (DECISIONS S3a-health-1, -2, -4, -5, S3a-auto-4, S3a-home-2, S10-*).
//
// Reading answers (docs/QUESTION-FLAG-PLAN.md): a hidden or unanswered question reads as absent, so no flag
// here fires on a missing answer; Not sure is handled exactly as the plan says, flag by flag. State-neutral:
// where a point varies by state the copy says so and points to "your state's department of insurance".
//
// Open enrollment is a health-only framing (SPEC "Scope"): only sourced facts are used (employers set their
// own dates; the HealthCare.gov window for the stated plan year). It is refreshed each fall (OPEN-ITEMS S10-1).

/**
 * The one open-enrollment nod used by the health flags (and by the health-deductible flag in deductible.mjs).
 * Sourced to healthcare-gov-dates-and-deadlines and healthcare-gov-glossary-open-enrollment. It names its plan
 * year, never claims a typical employer window, and says employers set their own dates.
 */
export const OPEN_ENROLLMENT_NOTE = 'If open enrollment is coming up at your job or on the Marketplace, this is a good moment to ask. Your employer sets its own open enrollment dates, so check with them. On HealthCare.gov, open enrollment for 2027 coverage runs November 1 to January 15.';

/** Source ids behind OPEN_ENROLLMENT_NOTE, appended to any flag whose text includes it. */
export const OPEN_ENROLLMENT_SOURCE_IDS = ['healthcare-gov-dates-and-deadlines', 'healthcare-gov-glossary-open-enrollment'];

// How each bolt-on option reads inside a sentence ("accident and cancer insurance").
const KIND_PHRASE = {
  accident: 'accident',
  critical_illness: 'critical illness',
  hospital_indemnity: 'hospital indemnity',
  cancer: 'cancer',
};

const joinList = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

// The bolt-on kinds the user ticked, in the question's option order ('none' and 'not_sure' are not kinds).
function ticked(ctx) {
  const answer = ctx.answer('health_supplemental');
  return Array.isArray(answer) ? answer.filter((id) => Object.prototype.hasOwnProperty.call(KIND_PHRASE, id)) : [];
}

// What the sources say about each bolt-on kind, kept apart on purpose (DECISIONS S10-9). Only hospital indemnity and
// other fixed indemnity coverage is described by the CMS fact sheet as paying a set cash amount and as "not a
// substitute for comprehensive coverage". Accident, cancer (specified disease) and critical illness appear in
// the Labor/HHS/Treasury FAQ only as federal excepted-benefit categories, with nothing on how they pay, so for
// those kinds the copy asks how the user's own policy pays and never asserts it.
const INDEMNITY_NOTE = 'Hospital indemnity and other fixed indemnity policies pay you a set amount of cash, and federal regulators say that kind of coverage is not a substitute for comprehensive health coverage.';
const OTHER_KINDS_NOTE = 'Accident, cancer and critical illness policies are different products. They may pay you a set amount of cash when a covered event happens or they may work another way, so check how yours pays.';
const EXCEPTED_NOTE = 'Federal law generally treats these policies as add-ons that fall outside most of the rules for major medical plans, so they sit alongside your main plan, not in place of it.';

const SEE_DECLARATIONS = 'You can find it on the summary page of your policy, called the declarations page.';

// Home "medical payments to others" is background only: it pays guests hurt at your home, so it is not an overlap
// with the user's own health plan (DECISIONS S3a-home-2).
const HOME_MED_PAY_NOTE = 'Homeowners policies have a similar-sounding add-on, medical payments to others, but it pays for guests hurt at your home, not for your own household, so it is not part of this overlap.';

export default [
  // ------------------------------------------------------------------------------------------------------
  {
    id: 'health-auto-medpay-overlap',
    domain: 'health',
    bucket: 'question',
    kind: 'cross-policy',
    priority: 410,
    title: 'Ask how your auto medical coverage works with your health plan',
    // Fires on Yes and on Not sure (the question exists so people with no auto medical coverage are not asked
    // anything); silent on No. Never says which coverage pays first, that it pays a health deductible or copay,
    // or that it is simply required or optional (all unsourced, DECISIONS S3a-auto-4). The "may not be able to
    // drop it" line matches the existing app's no-fault finding without naming a state. "No matter who caused the
    // crash" is stated only for states with no-fault rules, which is all the NAIC page says (DECISIONS S10-9).
    applies(ctx) {
      if (!ctx.holds('health') || !ctx.holds('auto')) return false;
      if (ctx.is('auto_medpay', 'yes') || ctx.isNotSure('auto_medpay')) return { emphasis: 'normal' };
      return false;
    },
    background: (ctx) => (ctx.isNotSure('auto_medpay')
      ? `You were not sure whether your auto policy pays medical bills for you and your passengers after a crash. That coverage is called medical payments (MedPay) on some policies and personal injury protection (PIP) on others. ${SEE_DECLARATIONS} If you have it, it can overlap with your health plan, which can also pay for crash injuries. How the two work together depends on your state's rules and the exact wording of both policies. Some states require this coverage, and if yours does you may not be able to drop it. ${HOME_MED_PAY_NOTE}`
      : `Your auto policy has coverage that pays medical bills for you and your passengers after a crash. Depending on your policy it may be called medical payments (MedPay) or personal injury protection (PIP). In states with no-fault rules, your own auto insurer pays for these injuries no matter who caused the crash. Your health plan can pay for crash injuries too, so the two can overlap. How they work together depends on your state's rules and the exact wording of both policies, so ask both insurers. Some states require this coverage, and if yours does you may not be able to drop it. ${HOME_MED_PAY_NOTE}`),
    ask: (ctx) => (ctx.isNotSure('auto_medpay')
      ? 'Ask your auto insurer whether your policy includes medical payments or PIP coverage and what it pays for. If it does, ask whether your state requires it, how it works alongside your health plan after a crash, and whether you still need it. Then ask your health insurer how it handles crash injuries when you also have auto medical coverage.'
      : 'Ask your auto insurer what your medical payments or PIP coverage pays for, whether your state requires you to carry it, and how it works alongside your health plan after a crash, including whether your policy has an option to coordinate the two. Your state\'s department of insurance can also tell you what your state requires. Then ask your health insurer the same thing from their side. If your state does not require it, ask what your premium would be without it and decide whether you still want it.'),
    reason: (ctx) => (ctx.isNotSure('auto_medpay')
      ? 'I have health insurance and want to know whether my auto policy also pays medical bills and how the two would work together.'
      : 'I have both health insurance and auto medical coverage, so I want to know how the two work together and whether I still need both.'),
    sourceIds: [
      'naic-what-does-auto-insurance-cover',
      'iii-auto-insurance-basics',
      'naic-coordination-of-benefits-model-regulation',
      'iii-standard-homeowners-coverage',
    ],
  },

  // ------------------------------------------------------------------------------------------------------
  {
    id: 'health-supplemental-boltons',
    domain: 'health',
    bucket: 'question',
    kind: 'cross-policy',
    priority: 420,
    title: 'Ask whether your extra health policies are worth their cost',
    // Fires when the user ticked accident, critical illness, hospital indemnity or cancer cover; strong when they
    // could also cover $5,000 or more from savings; a Not sure answer fires a softer pay-stub check; silent for
    // None and for no answer. Only sourced statements are made, each tied to the product its source describes:
    // hospital indemnity and other fixed indemnity coverage pays a set cash amount and is not a substitute for
    // comprehensive coverage; accident, cancer and critical illness policies are only named as different products
    // whose payout the user should check (DECISIONS S10-9). "Often redundant" is the SPEC's claim, not a sourced
    // one (DECISIONS S3a-health-2), so the copy asks whether the payout is worth the premium.
    applies(ctx) {
      if (!ctx.holds('health')) return false;
      const kinds = ticked(ctx);
      if (kinds.length > 0) {
        return {
          emphasis: ctx.is('emergency_cushion', '5000_plus') ? 'strong' : 'normal',
          vars: { kinds: joinList(kinds.map((id) => KIND_PHRASE[id])) },
        };
      }
      if (ctx.isNotSure('health_supplemental')) return { emphasis: 'normal' };
      return false;
    },
    background: (ctx, vars) => {
      if (ctx.isNotSure('health_supplemental')) {
        return `You were not sure whether you pay for any extra health policies. These are plans like accident, critical illness, hospital indemnity or cancer insurance that you can buy on top of your main health plan, each tied to one kind of event, like an accident, a hospital stay or a cancer diagnosis. ${INDEMNITY_NOTE} ${OTHER_KINDS_NOTE} You might pay for them through a paycheck deduction at work or on your own. ${EXCEPTED_NOTE}`;
      }
      const kinds = ticked(ctx);
      const parts = [
        `You told us you pay for ${vars.kinds} insurance on top of your main health plan.`,
        INDEMNITY_NOTE,
      ];
      if (kinds.some((id) => id !== 'hospital_indemnity')) parts.push(OTHER_KINDS_NOTE);
      parts.push(EXCEPTED_NOTE);
      parts.push('Some comprehensive-sounding health plan ads are really limited-benefit or discount plans, so it helps to know exactly what you bought.');
      if (ctx.is('emergency_cushion', '5000_plus')) {
        parts.push('You also said you could cover $5,000 or more from savings, which makes this a fair moment to ask whether the payout is worth the premium.');
      } else if (ctx.is('emergency_cushion', 'under_1000') || ctx.is('emergency_cushion', '1000_4999')) {
        parts.push('If a big bill would be hard to cover from savings, the payout may be a fair reason to keep it.');
      } else {
        parts.push('Whether a policy like this is worth its premium depends on your main plan and on how much you could cover yourself, and only you can weigh that.');
      }
      return parts.join(' ');
    },
    ask: (ctx) => (ctx.isNotSure('health_supplemental')
      ? `Look at your pay stub, your benefits summary, and your bank or card statements for lines like accident, critical illness, hospital indemnity or cancer insurance. If you find one, ask which events trigger a payout, whether it pays a set amount or repays specific costs, how much it pays, and what you pay in premiums over a year. ${OPEN_ENROLLMENT_NOTE}`
      : `Ask your benefits office or the company that sells it which events trigger a payout, whether it pays a set amount or repays specific costs, how much it pays, and what you pay in premiums over a year. Compare that with what your main plan and your savings already handle, and keep it only if the payout is worth the cost to you. ${OPEN_ENROLLMENT_NOTE}`),
    reason: (ctx, vars) => (ctx.isNotSure('health_supplemental')
      ? 'I want to check whether I am paying for any extra health policies before I decide whether they are worth keeping.'
      : `I pay for ${vars.kinds} insurance on top of my health plan, and I want to confirm what it pays and whether that is worth the premium.`),
    sourceIds: [
      'cms-stldi-fixed-indemnity-fact-sheet-2024',
      'dol-aca-faqs-part-72',
      'ftc-open-enrollment-scams-2025',
      ...OPEN_ENROLLMENT_SOURCE_IDS,
    ],
  },

  // ------------------------------------------------------------------------------------------------------
  {
    id: 'health-hsa-nudge',
    domain: 'health',
    bucket: 'question',
    kind: 'education',
    priority: 430,
    // Gated on what the user tells us (high-deductible plan with an HSA, or without one), never inferred from a
    // deductible band (eligibility is decided by the plan's terms, DECISIONS S3a-health-5). Silent for a regular
    // plan, for Not sure and for no answer. No usage statistic is sourced, so it never says HSAs are "underused";
    // federal tax advantages only, and every dollar threshold names its year.
    title: (ctx) => (ctx.is('health_hsa', 'hdhp_only')
      ? 'Ask whether your high-deductible plan can have a health savings account (HSA)'
      : 'Make sure you are using your HSA the way you intend'),
    applies(ctx) {
      if (!ctx.holds('health')) return false;
      if (ctx.is('health_hsa', 'hdhp_hsa') || ctx.is('health_hsa', 'hdhp_only')) return { emphasis: 'normal' };
      return false;
    },
    background: (ctx) => (ctx.is('health_hsa', 'hdhp_only')
      ? 'You told us your plan is a high-deductible plan but you do not have a health savings account (HSA). An HSA is a savings account for medical costs that belongs to you, and you can put money in it only with a qualifying high-deductible plan. Under federal tax rules, money you put in is tax-deductible, it grows without tax, and withdrawals for qualified medical costs are not taxed. Unused money carries over from year to year and goes with you if you change jobs. For 2026 the IRS minimum deductible for a qualifying plan is $1,700 for one person and $3,400 for a family; for 2027 it is $1,750 and $3,500. Meeting that minimum alone does not make a plan HSA-eligible, so the plan itself has to be checked.'
      : 'A health savings account (HSA) is a savings account for medical costs that belongs to you. Under federal tax rules, money you put in is tax-deductible (and money your employer puts in is left out of your taxable income), the money grows without tax, and withdrawals for qualified medical costs are not taxed. Unused money stays in the account from year to year and goes with you if you change jobs. A health flexible spending account (FSA) from an employer is different: it is mostly use-it-or-lose-it. These are federal tax rules; ask a tax professional how your state treats an HSA.'),
    ask: (ctx) => (ctx.is('health_hsa', 'hdhp_only')
      ? `Ask your plan administrator or benefits office whether your plan is HSA-eligible and, if it is, how to open an HSA and set up contributions. ${OPEN_ENROLLMENT_NOTE}`
      : `Ask your benefits office or HSA provider how much you are putting in now, whether your employer adds money, and whether the amount still fits your plans for next year. If you also have a health flexible spending account (FSA) at work, ask whether it affects your HSA. ${OPEN_ENROLLMENT_NOTE}`),
    reason: (ctx) => (ctx.is('health_hsa', 'hdhp_only')
      ? 'I have a high-deductible plan and no HSA, so I want to know whether my plan qualifies for one.'
      : 'I have an HSA, and I want to be sure I am using it the way I intend.'),
    sourceIds: [
      'irs-pub-969-2025',
      'healthcare-gov-glossary-hsa',
      'irs-rev-proc-2026-24',
      'irs-rev-proc-2025-19',
      ...OPEN_ENROLLMENT_SOURCE_IDS,
    ],
  },

  // ------------------------------------------------------------------------------------------------------
  {
    id: 'health-short-term-plan-alongside',
    domain: 'health',
    bucket: 'question',
    kind: 'cross-policy',
    priority: 440,
    title: 'Ask whether you still need your short-term health plan',
    // Fires only on a Yes. Wording follows the research as of 2026-10-10 (DECISIONS S3a-health-1): the federal
    // limits on how long these plans may last have changed and are being revised, so NO duration is ever printed;
    // whether holding both plans is allowed or wasteful is unsourced, so the copy only asks whether the second
    // plan is still needed. Re-check the "As of October 2026" sentence before launch and each fall (OPEN-ITEMS).
    applies(ctx) {
      if (!ctx.holds('health')) return false;
      return ctx.is('health_short_term', 'yes') ? { emphasis: 'normal' } : false;
    },
    background: 'A short-term plan is health coverage meant to be temporary, and it follows different rules from a regular health plan. The federal rules that stop regular plans from excluding pre-existing conditions generally do not apply to short-term plans, so a short-term plan may not cover them, is not required to cover essential health benefits such as maternity care, prescription drugs and mental health care, and can have annual and lifetime limits. Marketplace plans, by contrast, must cover pre-existing conditions and all 10 essential health benefit categories. As of October 2026, federal rules on how long short-term plans can last are in flux: in August 2025 the federal agencies said they would not prioritize enforcing the 2024 limits, and they plan to consider changing them. States set their own rules too, and some ban these plans.',
    ask: 'Ask whoever sold you the short-term plan, and your main plan\'s insurer or your benefits office, whether you still need it. Ask what it covers that your main plan does not, what it leaves out (including pre-existing conditions), and when it ends. Your state\'s department of insurance can tell you which rules apply where you live.',
    reason: 'I pay for a short-term plan on top of my main health plan, and I want to confirm what it adds and whether I still need it.',
    sourceIds: [
      'naic-stldi-topic',
      'cms-stldi-fixed-indemnity-fact-sheet-2024',
      'healthcare-gov-pre-existing-conditions',
      'healthcare-gov-what-marketplace-plans-cover',
      'dol-stldi-agencies-statement-2025',
    ],
  },
];
