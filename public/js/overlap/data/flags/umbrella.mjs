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
    title: 'Get the underlying limits your umbrella requires from your agent',
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
    ask: 'Ask your agent for the list of required underlying limits on your umbrella (look for a heading like "required underlying limits"), then compare it with the liability limit on each policy underneath. Your own limits are on the summary page of each policy, called the declarations page. If any of your limits is lower than the list asks for, raise it, and ask what the umbrella does while a limit is short.',
    reason: 'I want the list of underlying limits my umbrella requires so I can check it against my policies.',
    sourceIds: ['iii-should-i-purchase-umbrella', 'iii-homebuyers-handbook'],
  },
];
