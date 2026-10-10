// Flags for the "umbrellaScope" domain group (Story S7): is the umbrella the right size and shape?
// SPEC "Umbrella scope and adequacy"; the plan is docs/QUESTION-FLAG-PLAN.md (S7 block), the choices are
// DECISIONS S7-*. Each flag follows the Flag contract in docs/ARCHITECTURE.md. Only the owning story edits this file.
//
//   umbrella-smaller-than-exposure   Raise     the umbrella is no bigger than the exposure band the user picked
//   umbrella-size-unconfirmed        Question  the umbrella amount or the exposure band is Not sure
//   umbrella-um-uim-extension        Question  ask whether the umbrella extends uninsured / underinsured motorist cover
//   umbrella-scope-exclusions        Question  ask what the umbrella excludes; strong with a side business
//
// Rules shared by all four:
// - Every flag names the umbrella policy it is about (ctx.holds('umbrella')) and never fires on a missing answer
//   unless the plan says so (only the exclusions flag does, because it is for everyone who holds an umbrella).
// - Coarse bands only. The exposure answer is a range the user picked, used only in the browser to drive the flag.
//   The text may repeat the user's own range back to them, never a figure, and never a multiple of net worth.
// - Where the research found no authoritative support (docs/DECISIONS.md S3a-umbrella-2, gaps 4 and 12 in
//   research/umbrella-liability-stack.mjs) the copy asks; it does not assert. Nothing here names a state.

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const lowerFirst = (s) => (s.length > 0 ? s.charAt(0).toLowerCase() + s.slice(1) : s);

// How the exposure bands read inside a sentence ("could stand to lose ..."). A band this table does not know
// (a catalog change) falls back to its own label with the first letter lower-cased, so the flag still renders.
const BAND_PHRASE = {
  '1m_3m': 'between $1 million and $3 million',
  over_3m: 'more than $3 million',
};

function bandPhrase(option) {
  return Object.prototype.hasOwnProperty.call(BAND_PHRASE, option.id) ? BAND_PHRASE[option.id] : lowerFirst(option.label);
}

// The two answers the size flags compare, or null when either is Not sure, missing or has no usable value.
function sizeInputs(ctx) {
  if (ctx.isNotSure('umbrella_limit') || ctx.isNotSure('umbrella_exposure')) return null;
  const limit = ctx.option('umbrella_limit');
  const exposure = ctx.option('umbrella_exposure');
  if (!limit || !exposure) return null;
  if (!isNumber(limit.value) || !exposure.value || !isNumber(exposure.value.min)) return null;
  return { limit, exposure };
}

const WHAT_HAPPENS = {
  limit: 'You were not sure how big your umbrella is.',
  exposure: 'You were not sure how much you could stand to lose in a lawsuit.',
  both: 'You were not sure how big your umbrella is, or how much you could stand to lose in a lawsuit.',
};

const WHAT_TO_DO = {
  limit: 'Look for your umbrella\'s limit on its declarations page (the summary page of the policy), or ask your agent.',
  exposure: 'Add up your savings, investments and property, and compare the total with your liability limits. Then ask your agent whether your umbrella is big enough for that.',
};

export default [
  {
    id: 'umbrella-smaller-than-exposure',
    domain: 'umbrella',
    bucket: 'raise',
    kind: 'cross-policy',
    priority: 110,
    title: 'Raise your umbrella to cover what a lawsuit could take',
    // Compares band edges, never a guess (docs/QUESTION-FLAG-PLAN.md section 1). Fires when the umbrella is not larger
    // than the LOWEST amount the exposure band can mean (umbrella <= band minimum): 1 million against 1 to 3 million or
    // over 3 million fires, 2 million against 1 to 3 million does not. Strong when it is below every dollar in the band
    // (umbrella < band minimum), normal when it only equals the band's lower edge (DECISIONS S7-1). Not sure on either
    // input never fires a Raise; umbrella-size-unconfirmed covers it.
    applies(ctx) {
      if (!ctx.holds('umbrella')) return false;
      const inputs = sizeInputs(ctx);
      if (inputs === null) return false;
      const umbrella = inputs.limit.value;
      const lowEdge = inputs.exposure.value.min;
      if (umbrella > lowEdge) return false;
      const belowWholeBand = umbrella < lowEdge;
      return {
        emphasis: belowWholeBand ? 'strong' : 'normal',
        vars: {
          umbrella: inputs.limit.label,
          exposure: bandPhrase(inputs.exposure),
          comparison: belowWholeBand
            ? 'Your umbrella is smaller than everything in that range.'
            : 'Your umbrella is no bigger than the low end of that range.',
        },
      };
    },
    background: 'An umbrella is a separate policy that adds liability coverage (the part that pays when you are legally responsible for hurting someone or damaging their property) on top of your home and auto policies. It starts paying once the liability limit underneath it is used up. A simple test from the Insurance Information Institute (Triple-I): do you hold property, investments or savings worth more than your liability limits? You told us you have a {{umbrella}} umbrella and could stand to lose {{exposure}}. {{comparison}} That range is a rough guide, not a prediction of what a court would award.',
    ask: 'Ask your agent what a higher umbrella limit would cost, and whether your umbrella plus the liability underneath it is enough for the range you picked. Tell your agent if you have a pool, rent out property, or have a dog or a teen driver at home, since Triple-I lists those as things that can lead to lawsuits. The final call is yours.',
    reason: 'I have a {{umbrella}} umbrella and could stand to lose {{exposure}} in a lawsuit, so I want a price on a higher limit.',
    sourceIds: ['iii-homebuyers-handbook', 'iii-should-i-purchase-umbrella', 'naic-homeowners-shopping-tool'],
  },

  {
    id: 'umbrella-size-unconfirmed',
    domain: 'umbrella',
    bucket: 'question',
    kind: 'education',
    priority: 120,
    title: 'Check that your umbrella is the right size',
    // The Question twin of the Raise: fires when the umbrella amount, the exposure band, or both are Not sure
    // (the Raise cannot be decided). Silent when both are known, and on a missing answer.
    applies(ctx) {
      if (!ctx.holds('umbrella')) return false;
      const limitUnsure = ctx.isNotSure('umbrella_limit');
      const exposureUnsure = ctx.isNotSure('umbrella_exposure');
      if (!limitUnsure && !exposureUnsure) return false;
      if (limitUnsure && exposureUnsure) {
        return { vars: { whatHappened: WHAT_HAPPENS.both, whatToDo: `${WHAT_TO_DO.limit} ${WHAT_TO_DO.exposure}` } };
      }
      const which = limitUnsure ? 'limit' : 'exposure';
      return { vars: { whatHappened: WHAT_HAPPENS[which], whatToDo: WHAT_TO_DO[which] } };
    },
    background: '{{whatHappened}} We need both to tell whether your umbrella is big enough: how big it is, and roughly what a lawsuit could cost you. A simple test from the Insurance Information Institute (Triple-I): do you hold property, investments or savings worth more than your liability limits (the most your auto and home policies will pay if you are legally responsible)? If so, your limits deserve a closer look with your agent. Triple-I also lists owning a pool, renting out property, and having a dog or a teen driver at home as things that can lead to lawsuits.',
    ask: '{{whatToDo}}',
    reason: 'I am not sure my umbrella is the right size for what I could lose, so I want to check it.',
    sourceIds: ['iii-homebuyers-handbook', 'iii-should-i-purchase-umbrella'],
  },

  {
    id: 'umbrella-um-uim-extension',
    domain: 'umbrella',
    bucket: 'question',
    kind: 'within-policy',
    priority: 130,
    title: (ctx) => (ctx.is('umbrella_um_uim', 'no')
      ? 'Ask if your umbrella can add uninsured and underinsured motorist coverage'
      : 'Ask whether your umbrella extends uninsured and underinsured motorist coverage'),
    // The question is shown only with an umbrella and an auto policy. Fires on "no" (ask whether it can be added) and
    // on Not sure (ask whether it extends it at all); silent on "yes" and on a missing answer. No authoritative source
    // says whether umbrellas include this cover by default or by endorsement (S3a-umbrella-2), so the copy never does.
    applies(ctx) {
      if (!ctx.holds('umbrella') || !ctx.holds('auto')) return false;
      return ctx.is('umbrella_um_uim', 'no') || ctx.isNotSure('umbrella_um_uim');
    },
    background: 'Uninsured and underinsured motorist coverage (UM/UIM) is an auto coverage that pays you and your passengers when the driver who hurt you has no insurance, drove off, or has too little to cover your loss. How much you have, and whether it is required, varies by state and by policy, and your state\'s department of insurance can tell you what applies to you. An umbrella is liability protection, so it responds when you are legally responsible for hurting someone else. UM/UIM is different, because it pays you. Whether your umbrella extends it depends on its own wording. If it does not, the UM/UIM limit on your auto policy is the most that coverage would pay you, and a serious injury could run past it.',
    ask: (ctx) => (ctx.is('umbrella_um_uim', 'no')
      ? 'Ask your agent whether uninsured and underinsured motorist coverage can be added to your umbrella, and what it would cost. If it cannot, ask what the uninsured and underinsured limit on your auto policy is, so you know the most you could collect.'
      : 'Ask your agent, or check your umbrella policy, whether it extends uninsured and underinsured motorist coverage. If it does not, ask whether it can be added and what it would cost.'),
    reason: (ctx) => (ctx.is('umbrella_um_uim', 'no')
      ? 'I want to know whether uninsured and underinsured motorist coverage can be added to my umbrella.'
      : 'I want to know whether my umbrella extends uninsured and underinsured motorist coverage, and if not, whether it can.'),
    sourceIds: [
      'naic-auto-shopping-tool',
      'iii-protect-yourself-uninsured-motorists',
      'naic-what-does-auto-insurance-cover',
      'naic-whats-umbrella-policy',
      'iii-what-is-umbrella-liability-policy',
    ],
  },

  {
    id: 'umbrella-scope-exclusions',
    domain: 'umbrella',
    bucket: 'question',
    kind: 'within-policy',
    priority: 140,
    title: (ctx) => (ctx.is('side_business', 'yes')
      ? 'Ask whether your umbrella covers your side business'
      : 'Ask what your umbrella leaves out'),
    // For everyone who holds an umbrella: ask what it excludes. Strong with a side business, because business activity
    // is the exclusion most likely to matter to them. `side_business` has no Not sure option. Contractual liability is
    // left out (unsourced, S3a-umbrella gap 4) and the intentional-acts point is kept to the personal-injury part.
    applies(ctx) {
      if (!ctx.holds('umbrella')) return false;
      return { emphasis: ctx.is('side_business', 'yes') ? 'strong' : 'normal' };
    },
    background: (ctx) => (ctx.is('side_business', 'yes')
      ? 'You said you have a side business or side gig. A personal umbrella is liability protection (it pays when you are legally responsible for hurting someone or damaging their property), and it typically leaves out claims that come from a business. It covers business-related liability only when the policies underneath it do, and your home policy usually does not cover liability from a business run at home. Whether a side gig counts as a business depends on how each policy defines it, so it is a question for your agent, not something to assume either way.'
      : 'An umbrella is extra liability protection, which pays when you are legally responsible for hurting someone or damaging their property. It is not a promise to cover everything. Regulators\' consumer guidance says it does not pay to repair your own home or car, and lists punitive damages (money a court orders on top of the harm itself, to punish bad conduct) as not covered. Umbrellas typically leave out claims that come from a business. They also often add personal injury coverage for claims like libel and slander (false statements that hurt someone\'s reputation), but the forms differ by insurer, so check what yours includes and leaves out.'),
    ask: (ctx) => (ctx.is('side_business', 'yes')
      ? 'Tell your agent what your side business or side gig is and ask: does my umbrella cover claims that come from it? Ask too whether the policies underneath it, like your home and auto, cover it, because the umbrella follows what they cover. Then ask what else your umbrella leaves out.'
      : 'Ask your agent for a plain list of what your umbrella excludes. In particular, ask whether it covers anything that comes from a business or side gig, whether it includes personal injury claims like libel and slander, and what that part leaves out, such as harm done on purpose.'),
    reason: (ctx) => (ctx.is('side_business', 'yes')
      ? 'I have a side business, and I want to know whether my umbrella covers claims that come from it.'
      : 'I want to know exactly what my umbrella leaves out, so I know where I would be on my own.'),
    sourceIds: [
      'iii-business-vehicle-insurance',
      'iii-insuring-home-business',
      'naic-jir-social-media-underwriting',
      'naic-whats-umbrella-policy',
      'iii-what-is-umbrella-liability-policy',
    ],
  },
];
