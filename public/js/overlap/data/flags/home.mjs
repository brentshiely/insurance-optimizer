// Flags for the "home" domain (Story S9): within-policy gaps on the home policy itself, regardless of what else the
// user owns (SPEC "Common home-policy exclusions"). Both are Question items, and per DECISIONS D8 both are gated by a
// yes / no / not sure question, so they fire only for "no" and "not sure" and informed users are not nagged.
//
//   home-sewer-backup-missing   reads home_sewer_backup   ("no": strong emphasis, "not sure": normal)
//   home-flood-no-separate-policy   reads home_flood_policy   (normal emphasis for both)
//
// Copy rules (docs/QUESTION-FLAG-PLAN.md section 5 and the DECISIONS S3a-home entries):
//   - state-neutral: no state is named, and nothing says what any state requires;
//   - no price or typical limit for sewer backup (none is sourced): "small extra cost" at most, and the ask is for the
//     cost and the limit; a flood policy is "no substitute" for backup coverage, never "never pays";
//   - flood: the exclusion is how policies are written, not a claim about the user's own risk; the claims statistic
//     carries its years and what it counts; federal limits are left to "confirm at floodsmart.gov";
//   - earth movement and water-damage sub-limits are fast-follow and are not built here.
// Every claim below rests on the facts listed for the flag in docs/QUESTION-FLAG-PLAN.md; sources are cited by id.

// 'no', 'not_sure', or null when the flag should stay silent. Reads only the home policy and the one gate question.
const variantFor = (ctx, questionId) => {
  if (!ctx.holds('home')) return null;
  if (ctx.is(questionId, 'no')) return 'no';
  if (ctx.isNotSure(questionId)) return 'not_sure';
  return null;
};

// Text functions run only for a flag that applies; the Not sure wording (which asks the user to check first) is the
// safe fallback if one is ever called for any other variant.
const pick = (table, variant) => (variant === 'no' ? table.no : table.not_sure);

// ---- home-sewer-backup-missing --------------------------------------------------------------------------

const SEWER_DEFINITION = 'Sewer and drain backup is when sewage or water comes back up through your drains or sewer line and damages your floors, walls and belongings.';
const SEWER_FLOOD_NOTE = 'A flood policy would not fill the gap: the federal flood program pays for sewer backup only when the backup is a direct result of a flood.';
const SEWER_ADD_ON = 'which most insurers offer for a small extra cost';
const SEWER_SUMP = 'whether it covers sump pump overflow, which many policies leave out, if you have a sump pump (the pump that keeps a basement dry)';

const SEWER = {
  no: {
    title: 'Ask about adding sewer and drain backup coverage',
    background: `${SEWER_DEFINITION} A typical home policy does not cover it, and you told us yours does not. ${SEWER_FLOOD_NOTE} The usual fix is an add-on to your home policy, called an endorsement or rider, ${SEWER_ADD_ON}.`,
    ask: `Ask your insurer or agent for a quote to add sewer and drain backup coverage to your home policy, and ask three things: what it would cost, the most it would pay (the limit), and ${SEWER_SUMP}.`,
    reason: 'My home policy does not cover sewer or drain backup, so I want a quote to add it and a limit I can count on.',
  },
  not_sure: {
    title: 'Find out if your home policy covers sewer and drain backup',
    background: `${SEWER_DEFINITION} A typical home policy does not cover it, but some policies include it, so the only way to know is to check yours. ${SEWER_FLOOD_NOTE} Where it is missing, the usual fix is an add-on to your home policy, called an endorsement or rider, ${SEWER_ADD_ON}.`,
    ask: `Ask your insurer or agent whether your home policy has sewer and drain backup coverage; it may be listed as water backup. If it does, ask for the limit and ${SEWER_SUMP}. If it does not, ask for a quote to add it and what the limit would be.`,
    reason: 'A typical home policy leaves out sewer and drain backup, so I want to confirm whether mine covers it and at what limit.',
  },
};

// ---- home-flood-no-separate-policy ----------------------------------------------------------------------

const FLOOD_EXCLUSION = 'Standard home policies do not cover flood damage, whether or not your home is in a mapped flood zone';
const FLOOD_NOT_RISK = 'The exclusion is how the policies are written, not a prediction about your home.';
const FLOOD_WHERE = 'Flood coverage comes from the federal National Flood Insurance Program (an agent can quote it) or from private insurers, which may offer higher limits or broader coverage.';
const FLOOD_OUTSIDE = 'Flood losses are not limited to high-risk areas: about 29 percent of claims to the National Flood Insurance Program from 2014 to 2024 came from outside the areas mapped as high risk.';
const FLOOD_WAIT = 'A new federal flood policy usually does not start until 30 days after you buy it, and some private policies have the same wait, so do not wait for a storm warning.';
const FLOOD_LIMITS = 'The federal limits can change, so confirm them at floodsmart.gov.';

const FLOOD = {
  no: {
    title: 'Ask about a separate flood policy',
    background: `${FLOOD_EXCLUSION}, and you told us you have no separate flood policy. ${FLOOD_NOT_RISK} ${FLOOD_WHERE} ${FLOOD_OUTSIDE} ${FLOOD_WAIT}`,
    ask: `Ask your agent what flood risk they see for your address, and get quotes for a separate flood policy from the federal program and from private insurers. For each, ask what it would cost, how much it would pay for your home and for your belongings, and when it would start. ${FLOOD_LIMITS}`,
    reason: 'My home policy does not cover flood, so I want to know my flood risk and what a separate flood policy would cost and pay.',
  },
  not_sure: {
    title: 'Check whether you have a separate flood policy',
    background: `${FLOOD_EXCLUSION}, so you need a separate flood policy to be covered. ${FLOOD_NOT_RISK} ${FLOOD_WHERE} ${FLOOD_OUTSIDE} ${FLOOD_WAIT}`,
    ask: `Check your policy papers or ask your agent whether you have a separate flood policy. If you do not, ask what flood risk they see for your address, then get quotes from the federal program and from private insurers, including what each would cost, how much it would pay for your home and for your belongings, and when it would start. ${FLOOD_LIMITS}`,
    reason: 'Home policies do not cover flood, so I want to confirm whether I have a separate flood policy and, if not, what one would cost.',
  },
};

export default [
  {
    id: 'home-sewer-backup-missing',
    domain: 'home',
    bucket: 'question',
    kind: 'within-policy',
    priority: 310,
    // Fires on "no" (strong: the user's own answer confirms the gap) and "not sure" (normal); silent on "yes" and unanswered.
    applies: (ctx) => {
      const variant = variantFor(ctx, 'home_sewer_backup');
      if (variant === null) return false;
      return { emphasis: variant === 'no' ? 'strong' : 'normal' };
    },
    title: (ctx) => pick(SEWER, variantFor(ctx, 'home_sewer_backup')).title,
    background: (ctx) => pick(SEWER, variantFor(ctx, 'home_sewer_backup')).background,
    ask: (ctx) => pick(SEWER, variantFor(ctx, 'home_sewer_backup')).ask,
    reason: (ctx) => pick(SEWER, variantFor(ctx, 'home_sewer_backup')).reason,
    sourceIds: [
      'naic-homeowners-topic',
      'iii-disasters-covered-homeowners',
      'iii-water-damage-protection',
      'iii-sewer-backups',
      'naic-homeowners-shopping-tips',
      'naic-endorsement-rider',
      'floodsmart-home',
    ],
  },
  {
    id: 'home-flood-no-separate-policy',
    domain: 'home',
    bucket: 'question',
    kind: 'within-policy',
    priority: 320,
    // Fires on "no" and "not sure" at normal emphasis: the exclusion is certain, the user's own flood risk is not known.
    applies: (ctx) => variantFor(ctx, 'home_flood_policy') !== null,
    title: (ctx) => pick(FLOOD, variantFor(ctx, 'home_flood_policy')).title,
    background: (ctx) => pick(FLOOD, variantFor(ctx, 'home_flood_policy')).background,
    ask: (ctx) => pick(FLOOD, variantFor(ctx, 'home_flood_policy')).ask,
    reason: (ctx) => pick(FLOOD, variantFor(ctx, 'home_flood_policy')).reason,
    sourceIds: [
      'iii-flood-insurance',
      'naic-flood-insurance',
      'floodsmart-home',
      'fema-nfip-waiting-period',
      'floodsmart-flood-risk',
      'iii-disasters-covered-homeowners',
    ],
  },
];
