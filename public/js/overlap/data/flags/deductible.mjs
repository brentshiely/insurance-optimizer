// Flags for the "deductible" domain group (Story S10): the deductible-vs-emergency-cushion check, one Question
// flag each for auto, home and health. It is a practical check, never a judgment on a plan: it compares the
// bill a claim could hand you with the cash you say you could reach, and words the answer as "build up your
// cash cushion, or reconsider the deductible - your choice" (SPEC "Deductible vs. emergency cushion").
//
// How the bands are compared (docs/QUESTION-FLAG-PLAN.md "Comparing conservatively"; DECISIONS S10-3). Both
// questions use the same three whole-dollar bands, so the rule compares band EDGES, never a guess inside a band:
//   known cushion       fires, STRONG, when deductible.min > cushion.max (every dollar of the deductible band is
//                       above every dollar of the cushion band). A $5,000-or-more cushion (max null) never fires.
//   cushion Not sure    fires, NORMAL, when deductible.min is $1,000 or more (the deductible could exceed the
//                       cushion, and we do not know). Asks the user to work out their cash.
//   deductible Not sure or either answer missing   never fires.
// Strong means "certain from the bands you gave us"; normal means "possible, we do not know". Only the bands
// (their labels) are ever mentioned in the text, never a figure the user typed (there is none).
//
// The health flag may nod to open enrollment (health copy only); the auto and home flags never do. Wind, hail
// and earthquake deductibles are often a percentage of the home's value, so the home flag raises that as its own
// ask rather than folding it into the dollar band (research designInput deductibleVsCushion).
import { OPEN_ENROLLMENT_NOTE, OPEN_ENROLLMENT_SOURCE_IDS } from './health.mjs';

// A Not sure cushion only prompts when the deductible band starts at or above this many dollars.
const NOT_SURE_FLOOR = 1000;

// Federal Reserve 2025 survey, adults who named the most they could cover from savings alone (research fact
// shed-savings-only-largest-expense-2025: our sums of the Fed's rows, rounded). Only the cushion bands that can
// fire are listed: a $5,000-or-more cushion never does.
const SAVINGS_ONLY_2025 = {
  under_1000: { share: 39, range: 'under $1,000' },
  '1000_4999': { share: 23, range: '$1,000 to $4,999' },
};

const usd = (n) => `$${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const isBand = (o) => o !== undefined && o !== null && typeof o.value === 'object' && o.value !== null && typeof o.value.min === 'number';

// The decision for one policy. Returns null (do not fire) or { emphasis, vars }.
function check(ctx, policyId, deductibleQuestion) {
  if (!ctx.holds(policyId)) return null;
  if (ctx.isNotSure(deductibleQuestion)) return null;
  const deductible = ctx.option(deductibleQuestion);
  if (!isBand(deductible)) return null;
  const vars = { deductible: lowerFirst(deductible.label), floor: usd(deductible.value.min) };

  if (ctx.isNotSure('emergency_cushion')) {
    return deductible.value.min >= NOT_SURE_FLOOR ? { emphasis: 'normal', vars } : null;
  }
  const cushion = ctx.option('emergency_cushion');
  if (!isBand(cushion)) return null;
  if (cushion.value.max !== null && deductible.value.min > cushion.value.max) {
    return { emphasis: 'strong', vars: { ...vars, cushion: lowerFirst(cushion.label) } };
  }
  return null;
}

const CHOICE = 'and the choice is yours: build up your cash cushion, or reconsider the deductible.';
const FIRST_STEP = 'First work out roughly how much cash you could get to within a few days.';

// One "For context" sentence: the Federal Reserve's surprise-bill share for this kind of bill and, when the cushion
// is known, the share of adults whose savings-only capacity fell in the user's cushion band. Always dated and
// attributed, and only context: it is never used to decide whether the flag fires.
function context(ctx, surprise) {
  const row = ctx.isNotSure('emergency_cushion') ? undefined : SAVINGS_ONLY_2025[ctx.answer('emergency_cushion')];
  const lead = `For context, in the Federal Reserve's 2025 survey, ${surprise} in the past year`;
  return row
    ? `${lead}, and about ${row.share}% of adults said the most they could cover from savings alone was ${row.range}.`
    : `${lead}.`;
}

const FED_SOURCE_IDS = ['fed-shed-2025-savings-and-investments', 'fed-shed-2025-economic-hardships'];

export default [
  // ------------------------------------------------------------------------------------------------------
  {
    id: 'deductible-exceeds-cushion-auto',
    domain: 'deductible',
    bucket: 'question',
    kind: 'cross-policy',
    priority: 450,
    title: 'Weigh your auto deductible against the cash you could reach',
    // Silent when the user dropped collision (auto_collision is No): without collision there is no collision
    // deductible. The collision question is asked only for a paid-off car worth under $3,000, so for everyone
    // else it is hidden and this check reads only the deductible and the cushion.
    applies(ctx) {
      if (ctx.is('auto_collision', 'no')) return false;
      return check(ctx, 'auto', 'deductible_auto') || false;
    },
    background: (ctx, vars) => [
      'A deductible is the part of a claim you pay before your insurer pays, and a bigger deductible generally means a lower premium. That trade only works if you can cover the deductible on the day you need it.',
      ctx.isNotSure('emergency_cushion')
        ? `You told us your collision deductible is ${vars.deductible}, so a claim could cost you at least ${vars.floor} up front, and you were not sure how much you could cover from savings.`
        : `You told us your collision deductible is ${vars.deductible} and that you could cover ${vars.cushion} from savings, so a claim could cost you more up front than you have set aside.`,
      ctx.isNotSure('emergency_cushion')
        ? `This is not a verdict on your policy. It is a way to check that the bill a claim could hand you matches the cash you have, ${CHOICE}`
        : `This is not a verdict on your policy. It is a gap between the bill a claim could hand you and the cash you have, ${CHOICE}`,
      context(ctx, '30% of adults had a major unexpected vehicle repair or replacement bill'),
    ].join(' '),
    ask: (ctx, vars) => (ctx.isNotSure('emergency_cushion')
      ? `${FIRST_STEP} If it is less than ${vars.floor}, you can build up cash toward your deductible, or ask your agent what your premium would be at a lower collision deductible. Then choose a deductible you could pay tomorrow.`
      : 'You can build up cash toward your deductible, or ask your agent what your premium would be at a lower collision deductible and which options your policy offers. Then choose a deductible you could pay tomorrow.'),
    reason: (ctx) => (ctx.isNotSure('emergency_cushion')
      ? 'I want to be sure I could pay my collision deductible, so I want to see what a lower deductible would cost.'
      : 'I could not cover my collision deductible from savings today, so I want to see what a lower deductible would cost.'),
    sourceIds: ['iii-understanding-your-insurance-deductibles', 'naic-tips-saving-on-auto-insurance', ...FED_SOURCE_IDS],
  },

  // ------------------------------------------------------------------------------------------------------
  {
    id: 'deductible-exceeds-cushion-home',
    domain: 'deductible',
    bucket: 'question',
    kind: 'cross-policy',
    priority: 460,
    title: 'Weigh your home deductible against the cash you could reach',
    // Cites the Insurance Information Institute only (the NAIC deductible page the plan also lists is about
    // collision and comprehensive on a car, DECISIONS S10-5). The percentage-deductible note is the research's
    // caution that a dollar band can understate wind, hail and earthquake deductibles.
    applies: (ctx) => check(ctx, 'home', 'deductible_home') || false,
    background: (ctx, vars) => [
      'A deductible is the part of a claim you pay before your insurer pays, and a bigger deductible generally means a lower premium. That trade only works if you can cover the deductible on the day you need it.',
      ctx.isNotSure('emergency_cushion')
        ? `You told us your home policy's deductible is ${vars.deductible}, so a claim could cost you at least ${vars.floor} up front, and you were not sure how much you could cover from savings.`
        : `You told us your home policy's deductible is ${vars.deductible} and that you could cover ${vars.cushion} from savings, so a claim could cost you more up front than you have set aside.`,
      ctx.isNotSure('emergency_cushion')
        ? `This is not a verdict on your policy. It is a way to check that the bill a claim could hand you matches the cash you have, ${CHOICE}`
        : `This is not a verdict on your policy. It is a gap between the bill a claim could hand you and the cash you have, ${CHOICE}`,
      'Wind, hail and earthquake claims often carry a percentage deductible instead of a dollar one (typically 1% to 5% for wind or hail, and 2% to 20% of the home\'s replacement value for earthquake, depending on location), so those claims can cost far more than the standard deductible you gave us.',
      context(ctx, '22% of adults had a major unexpected house or appliance repair bill'),
    ].join(' '),
    ask: (ctx, vars) => (ctx.isNotSure('emergency_cushion')
      ? `${FIRST_STEP} If it is less than ${vars.floor}, you can build up cash toward your deductible, or ask your agent what your premium would be at a lower deductible. Also ask whether you have a percentage deductible for wind, hail or earthquake, and what that works out to in dollars for your home.`
      : 'You can build up cash toward your deductible, or ask your agent what your premium would be at a lower deductible. Also ask whether you have a percentage deductible for wind, hail or earthquake, and what that works out to in dollars for your home. Then choose a deductible you could pay tomorrow.'),
    reason: (ctx) => (ctx.isNotSure('emergency_cushion')
      ? 'I want to be sure I could pay my home deductible, so I want to see what a lower deductible would cost.'
      : 'I could not cover my home deductible from savings today, so I want to see what a lower deductible would cost.'),
    sourceIds: ['iii-understanding-your-insurance-deductibles', ...FED_SOURCE_IDS],
  },

  // ------------------------------------------------------------------------------------------------------
  {
    id: 'deductible-exceeds-cushion-health',
    domain: 'deductible',
    bucket: 'question',
    kind: 'cross-policy',
    priority: 470,
    title: 'Weigh your health deductible against the cash you could reach',
    // Never judges the plan, its network or whether it is good. The health deductible is not the worst case (the
    // out-of-pocket maximum is), which the copy says without asking about it. The premium trade-off sentence is
    // left out here: the sources for it (III, NAIC) are about auto and home. Open-enrollment nod: health copy only.
    applies: (ctx) => check(ctx, 'health', 'deductible_health') || false,
    background: (ctx, vars) => [
      'A deductible is what you pay for covered health care before your plan starts to pay.',
      ctx.isNotSure('emergency_cushion')
        ? `You told us your health plan's deductible is ${vars.deductible}, so a covered medical bill could cost you at least ${vars.floor} up front, and you were not sure how much you could cover from savings.`
        : `You told us your health plan's deductible is ${vars.deductible} and that you could cover ${vars.cushion} from savings, so a medical bill could cost you more up front than you have set aside.`,
      'Your plan\'s out-of-pocket maximum (the most you pay for covered care in a plan year) can be higher than the deductible, so a bad year could cost more, and we are not asking about that.',
      ctx.isNotSure('emergency_cushion')
        ? `This is not a verdict on your plan. It is a way to check that a medical bill could be matched by the cash you have, ${CHOICE}`
        : `This is not a verdict on your plan. It is a gap between a medical bill and the cash you have, ${CHOICE}`,
      context(ctx, '21% of adults had an unexpected major medical expense'),
    ].join(' '),
    ask: (ctx, vars) => (ctx.isNotSure('emergency_cushion')
      ? `${FIRST_STEP} If it is less than ${vars.floor}, you can build up cash toward the deductible, or ask your insurer or benefits office what plan options with a lower deductible would cost and what your out-of-pocket maximum is. ${OPEN_ENROLLMENT_NOTE}`
      : `Ask your insurer or benefits office what your deductible and out-of-pocket maximum are for the coming year, and what plan options with a lower deductible would cost. You can also build up cash toward the deductible. ${OPEN_ENROLLMENT_NOTE}`),
    reason: (ctx) => (ctx.isNotSure('emergency_cushion')
      ? 'I want to be sure I could pay my health plan deductible, so I want to compare options with a lower deductible.'
      : 'I could not cover my health plan deductible from savings today, so I want to compare options with a lower deductible.'),
    sourceIds: [
      'healthcare-gov-glossary-deductible',
      'healthcare-gov-glossary-out-of-pocket-maximum',
      ...FED_SOURCE_IDS,
      ...OPEN_ENROLLMENT_SOURCE_IDS,
    ],
  },
];
