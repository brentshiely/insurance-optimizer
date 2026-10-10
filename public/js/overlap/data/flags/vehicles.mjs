// Flags for the "vehicles" domain group (Story S6): motorcycle and boat liability under the umbrella.
// Each flag follows the Flag contract in docs/ARCHITECTURE.md; only Story S6 edits this file.
//
// Both read the liability stack (`ctx.stack`, engine/liabilityStack.mjs) and fire only on a known shortfall:
// a Not sure on either number leaves the layer "unknown", and `umbrella-limits-unconfirmed` (flags/umbrella.mjs)
// is the Question twin. Research found no authoritative required underlying limit for motorcycles or boats
// (research gap 5, DECISIONS S3a-umbrella-3), so the copy sends the user to their umbrella's own number, in writing,
// and states no figure of its own. No state is named.
import { stackFindings } from '../../engine/liabilityStack.mjs';

const hasPhrase = (finding) => (finding.limitIsCeiling ? `a limit ${finding.limitText}` : finding.limitText);

function belowRequired(ctx, layerId) {
  if (!ctx.holds('umbrella') || !ctx.holds(layerId)) return false;
  const f = stackFindings(ctx.stack, 'below_required').find((x) => x.layer === layerId);
  if (!f) return false;
  return { vars: { limit: f.limitText, has: hasPhrase(f), required: f.requiredText } };
}

export default [
  {
    id: 'umbrella-motorcycle-below-required-min',
    domain: 'vehicles',
    bucket: 'raise',
    kind: 'cross-policy',
    priority: 30,
    title: 'Raise your motorcycle liability limit to what your umbrella asks for',
    applies: (ctx) => belowRequired(ctx, 'motorcycle'),
    background: "A car policy does not cover a motorcycle, so a motorcycle needs its own liability policy, and that policy's limit is what pays first if you hurt someone while riding. An umbrella is extra liability coverage that starts paying only after the limits underneath are used up. You told us your umbrella asks for {{required}} on your motorcycle policy and yours has {{has}}. We found no published standard for what an umbrella should require on a motorcycle, so your umbrella's own number is the one to go by, and it is worth confirming in writing.",
    ask: 'Ask your agent: "What does my umbrella require on my motorcycle policy? Please put it in writing." and "What would it cost to raise my motorcycle liability to {{required}}?" Then raise the limit to at least what your umbrella requires.',
    reason: 'My umbrella asks for {{required}} on my motorcycle policy and mine is {{limit}}, so I want it raised to match.',
    sourceIds: ['naic-what-does-auto-insurance-cover', 'iii-motorcycle-insurance', 'iii-should-i-purchase-umbrella'],
  },
  {
    id: 'umbrella-boat-below-required-min',
    domain: 'vehicles',
    bucket: 'raise',
    kind: 'cross-policy',
    priority: 40,
    title: 'Raise your boat liability limit to what your umbrella asks for',
    applies: (ctx) => belowRequired(ctx, 'boat'),
    background: "A home policy usually gives a boat little or no liability protection, so most of a boat's liability coverage comes from the boat's own policy. An umbrella is extra liability coverage that starts paying only after the limits underneath are used up, and the Insurance Information Institute notes that boat owners may want one. You told us your umbrella asks for {{required}} on your boat policy and yours has {{has}}. We found no published standard for what an umbrella should require on a boat, so your umbrella's own number is the one to go by, and it is worth confirming in writing.",
    ask: 'Ask your agent: "What does my umbrella require on my boat policy? Please put it in writing." and "What would it cost to raise my boat liability to {{required}}?" Then raise the limit to at least what your umbrella requires.',
    reason: 'My umbrella asks for {{required}} on my boat policy and mine is {{limit}}, so I want it raised to match.',
    sourceIds: ['iii-boat-insurance-and-safety', 'naic-summer-safety-insured', 'iii-should-i-purchase-umbrella'],
  },
];
