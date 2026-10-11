// Flags for the umbrella core (Story S6): auto and home liability under the umbrella.
// Each flag follows the Flag contract in docs/ARCHITECTURE.md; only Story S6 edits this file.
//
// All four flags read the liability stack (`ctx.stack`, engine/liabilityStack.mjs), which compares the limits
// the user told us with what their umbrella requires and records Not sure as "unknown". A Raise therefore
// fires only on a known shortfall, and `umbrella-limits-unconfirmed` is the Question twin for Not sure.
// No flag here fires without an umbrella (the stack is null then, and each flag checks ctx.holds too).
//
// Wording is bound by the research gaps (docs/QUESTION-FLAG-PLAN.md section 6, DECISIONS S3a-umbrella-1, S6-2):
// no source says what happens when a limit underneath is below the umbrella's requirement, so the Raise copy
// asks and says so, and never claims the umbrella is void. Triple-I's "about $300,000 home, about $250,000 auto"
// is a yardstick for a $1 million umbrella, never a rule. No flag is a Drop (nothing supports cutting primary
// liability once an umbrella exists). No state is named.
import { stackFindings } from '../../engine/liabilityStack.mjs';

const findingFor = (ctx, type, layerId) => stackFindings(ctx.stack, type).find((f) => f.layer === layerId);
const what = (finding) => finding.layerLabel.toLowerCase();
// "has 100/300" for an exact limit, "has a limit lower than 100/300" for the "Lower than" rung.
const hasPhrase = (finding) => (finding.limitIsCeiling ? `a limit ${finding.limitText}` : finding.limitText);

function joinList(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// What `umbrella-limits-unconfirmed` should send the household to do (DECISIONS S12-11). The flag fires when either number of a
// layer is Not sure, but the two gaps are closed in different places: a Not sure on what the UMBRELLA requires is closed by
// getting the required-underlying-limits list from the agent, and a Not sure on the household's OWN limit is closed by reading
// it off its own policy's summary page (the declarations page). Telling a household that stated what its umbrella requires to
// get that list again, when its own limits are what is missing, sends it to look for what it already gave us.
//   own       a Not sure on at least one of the household's own limits, and no Not sure on a requirement
//   required  a Not sure on at least one requirement, and no Not sure on an own limit
//   both      at least one of each (the same layer, or different layers)
// Everything here is read from the liability stack, so it follows the answers and nothing else.
const POLICIES = (findings) => `your ${joinList(findings.map((f) => f.policyText.replace(/ policy$/, '')))} ${findings.length > 1 ? 'policies' : 'policy'}`;
const REQUIRED_LIST = 'for the list of required underlying limits on your umbrella (look for a heading like "required underlying limits")';
const IF_LOWER = 'raise it, and ask what the umbrella does while a limit is short';

function unconfirmedPlan(ctx) {
  const unconfirmed = stackFindings(ctx.stack, 'unconfirmed');
  const layerOf = (f) => ctx.stack.layers.find((l) => l.id === f.layer);
  const ownUnknown = unconfirmed.filter((f) => f.notSure.includes('limit'));
  const requirementUnknown = unconfirmed.filter((f) => f.notSure.includes('required'));

  if (ownUnknown.length > 0 && requirementUnknown.length === 0) {
    // What the umbrella asks for is known, so the numbers go in the ask. (Only a test or tool that skips the requirement question
    // leaves one unanswered; then the ask says "what your umbrella asks for" and gives no number.)
    const several = ownUnknown.length > 1;
    const known = ownUnknown.every((f) => layerOf(f).requiredAnswer === 'known');
    const compare = (() => {
      if (!known) return `${several ? 'each' : 'it'} with what your umbrella asks for`;
      if (!several) return `it with the ${ownUnknown[0].requiredText} your umbrella asks for`;
      return `${joinList(ownUnknown.map((f) => `your ${f.layer} limit with the ${f.requiredText}`))} your umbrella asks for`;
    })();
    return {
      kind: 'own',
      title: 'Get the liability limits from your own policies',
      ask: `Check the summary page of ${POLICIES(ownUnknown)}, called the declarations page, for ${several ? 'the liability limit on each' : 'its liability limit'}, then compare ${compare}. `
        + `If ${several ? 'any of them is' : 'it is'} lower, ${IF_LOWER}. If you cannot find ${several ? 'a limit' : 'the limit'} there, ask your agent to read it to you.`,
      reason: 'I want to confirm my own liability limits meet what my umbrella asks for.',
    };
  }

  if (ownUnknown.length === 0) {
    // The household's own limits are what it told us, so say them back; only a limit that was never answered still needs the policy.
    const told = requirementUnknown.filter((f) => layerOf(f).limitAnswer === 'known').map((f) => `your ${f.layer} limit is ${f.limitText}`);
    const compareWith = told.length === requirementUnknown.length
      ? `the limits you told us about: ${joinList(told)}`
      : 'the liability limit on each policy underneath. Your own limits are on the summary page of each policy, called the declarations page';
    return {
      kind: 'required',
      title: 'Get the underlying limits your umbrella requires from your agent',
      ask: `Ask your agent ${REQUIRED_LIST}, then compare it with ${compareWith}. If any of your limits is lower than the list asks for, ${IF_LOWER}.`,
      reason: 'I want the list of underlying limits my umbrella requires so I can check it against my policies.',
    };
  }

  return {
    kind: 'both',
    title: 'Get your own liability limits and what your umbrella requires',
    ask: `Ask your agent ${REQUIRED_LIST}. Then check the summary page of ${POLICIES(ownUnknown)}, called the declarations page, for your own liability limit and compare the two. `
      + `If any of your limits is lower than the list asks for, ${IF_LOWER}.`,
    reason: 'I want to confirm my own liability limits and get the list of limits my umbrella requires so I can compare them.',
  };
}

export default [
  {
    id: 'umbrella-home-below-required-min',
    domain: 'umbrella',
    bucket: 'raise',
    kind: 'cross-policy',
    priority: 10,
    title: 'Raise your home liability limit to what your umbrella asks for',
    applies(ctx) {
      if (!ctx.holds('umbrella') || !ctx.holds('home')) return false;
      const f = findingFor(ctx, 'below_required', 'home');
      if (!f) return false;
      // Below the $300,000 that Triple-I says most insurers want under a $1 million umbrella: two sources agree, so stronger.
      const yardstick = f.limitIsCeiling
        ? ' For a $1 million umbrella, the Insurance Information Institute says most insurers want about $300,000 of home liability, and yours is lower than that.'
        : '';
      return {
        emphasis: f.limitIsCeiling ? 'strong' : 'normal',
        vars: { limit: f.limitText, has: hasPhrase(f), required: f.requiredText, yardstick },
      };
    },
    background: "Your home policy's liability limit is the most it pays if someone is hurt on your property or you are held responsible for harm to someone else. An umbrella is extra liability coverage that starts paying only after that limit is used up, and umbrella insurers set a minimum for what has to be underneath. You told us yours asks for {{required}} and your home policy has {{has}}.{{yardstick}} We found no published rule for what happens when the limit underneath is below that minimum, so the safe move is to close the gap rather than find out during a claim.",
    ask: 'Ask your agent: "What would it cost to raise my home liability to {{required}}?" and "Until I do, will my umbrella still respond the way I expect if I am sued?" Then raise the limit to at least {{required}} and keep the answers in writing.',
    reason: 'My umbrella asks for {{required}} of liability on my home policy and mine is {{limit}}, so I want it raised to match.',
    sourceIds: ['iii-should-i-purchase-umbrella', 'iii-what-is-umbrella-liability-policy', 'iii-homebuyers-handbook'],
  },
  {
    id: 'umbrella-auto-below-required-min',
    domain: 'umbrella',
    bucket: 'raise',
    kind: 'cross-policy',
    priority: 20,
    title: 'Raise your auto liability limit to what your umbrella asks for',
    applies(ctx) {
      if (!ctx.holds('umbrella') || !ctx.holds('auto')) return false;
      const f = findingFor(ctx, 'below_required', 'auto');
      if (!f) return false;
      // Always normal emphasis: Triple-I's "about $250,000" for auto has no stated format (per person, split or combined).
      return { vars: { limit: f.limitText, has: hasPhrase(f), required: f.requiredText } };
    },
    background: 'Auto liability limits are usually written as three numbers, like 250/500/100: the most for one person you hurt, the most for everyone you hurt in one accident, and the most for property damage, in thousands of dollars. This tool asks only about the first two. An umbrella is extra liability coverage that starts paying only after those limits are used up, and umbrella insurers set a minimum for what has to be underneath. You told us yours asks for {{required}} and your auto policy has {{has}}. As a rough yardstick, the Insurance Information Institute says most insurers want about $250,000 of auto liability under a $1 million umbrella, but it does not say how that number is split and each insurer sets its own. We found no published rule for what happens when the limit underneath is below that minimum, so the safe move is to close the gap rather than find out during a claim.',
    ask: 'Ask your agent: "What would it cost to raise my auto liability to {{required}}?" and "Until I do, will my umbrella still respond the way I expect if I cause a serious accident?" Then raise the limit to at least {{required}} and keep the answers in writing.',
    reason: 'My umbrella asks for {{required}} of liability on my auto policy and mine is {{limit}}, so I want it raised to match.',
    sourceIds: ['iii-should-i-purchase-umbrella', 'iii-what-is-umbrella-liability-policy', 'naic-auto-shopping-tool'],
  },
  {
    id: 'umbrella-primary-liability-overbought',
    domain: 'umbrella',
    bucket: 'question',
    kind: 'cross-policy',
    priority: 50,
    title: 'Ask whether your extra {{layers}} liability is worth keeping',
    applies(ctx) {
      if (!ctx.holds('umbrella')) return false;
      const above = stackFindings(ctx.stack, 'above_required').filter((f) => f.layer === 'auto' || f.layer === 'home');
      if (above.length === 0) return false;
      return {
        vars: {
          layers: joinList(above.map((f) => f.layer)),
          detail: above.map((f) => `Your ${what(f)} limit is ${f.limitText} and your umbrella asks for ${f.requiredText}.`).join(' '),
        },
      };
    },
    background: 'An umbrella is extra liability coverage that starts paying only after the limits underneath are used up, and yours sets a minimum for what has to be there. {{detail}} Carrying more than that can be a good choice: the Insurance Information Institute says the more liability you carry underneath, the cheaper your umbrella tends to be. It also means you pay for extra coverage on the policy underneath, so it is fair to ask what that extra costs. We found no source that says to cut the underlying limits once you have an umbrella, so this is a question to ask, not a recommendation.',
    ask: 'Ask your agent what the extra {{layers}} liability adds to your premium and whether it lowers what you pay for the umbrella. Do not lower any limit below the minimum your umbrella requires, and check with your umbrella insurer before changing anything.',
    reason: 'I carry more {{layers}} liability than my umbrella requires, and I want to know if the extra is worth what it costs.',
    sourceIds: ['iii-homebuyers-handbook', 'iii-should-i-purchase-umbrella'],
  },
  {
    id: 'umbrella-limits-unconfirmed',
    domain: 'umbrella',
    bucket: 'question',
    kind: 'cross-policy',
    priority: 60,
    title: (ctx) => unconfirmedPlan(ctx).title,
    applies(ctx) {
      if (!ctx.holds('umbrella')) return false;
      const unconfirmed = stackFindings(ctx.stack, 'unconfirmed');
      if (unconfirmed.length === 0) return false;
      const limits = unconfirmed.filter((f) => f.notSure.includes('limit')).map((f) => `your ${what(f)} limit`);
      const requirements = unconfirmed.filter((f) => f.notSure.includes('required')).map((f) => f.policyText.replace(/ policy$/, ''));
      const parts = [];
      if (limits.length > 0) parts.push(joinList(limits));
      if (requirements.length > 0) parts.push(`${limits.length > 0 ? 'and about ' : ''}what your umbrella asks for on your ${joinList(requirements)} ${requirements.length > 1 ? 'policies' : 'policy'}`);
      // A limit below the lowest choice we offered, with the umbrella's requirement unknown: the likeliest gap (DECISIONS S6-3).
      const likeliest = unconfirmed.filter((f) => f.limitIsCeiling && f.notSure.includes('required'));
      const low = likeliest
        .map((f) => ` Your ${what(f)} limit is ${f.limitText}, which is the likeliest place for a gap, and what your umbrella requires is the one thing left to confirm.`)
        .join('');
      return { emphasis: likeliest.length > 0 ? 'strong' : 'normal', vars: { items: parts.join(', '), low } };
    },
    background: 'The Insurance Information Institute describes the usual underlying limits as what most insurers want, so your umbrella insurer may ask for something different, and not being sure of yours is fine. You were not sure about {{items}}, so we cannot tell whether your limits meet what your umbrella asks for. An umbrella is extra liability coverage that starts paying only after the limits underneath are used up.{{low}}',
    ask: (ctx) => unconfirmedPlan(ctx).ask,
    reason: (ctx) => unconfirmedPlan(ctx).reason,
    sourceIds: ['iii-should-i-purchase-umbrella', 'iii-homebuyers-handbook'],
  },
];
