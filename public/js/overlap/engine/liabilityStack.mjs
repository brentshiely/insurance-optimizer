// Liability stack model: the liability limits on the user's auto, home, motorcycle and boat policies
// sitting under their umbrella, compared with what the umbrella says it needs underneath. Pure.
//
//   computeLiabilityStack(ctx) -> LiabilityStack | null
//
// `ctx` is the evaluation context built in evaluate.mjs. When this runs, `ctx.stack` is still null;
// evaluate() stores the return value as `ctx.stack` (what flags read) and as `results.stack` (what the
// Story S14 visualization renders). The full model is documented in docs/ARCHITECTURE.md "LiabilityStack"
// and the rules behind it in docs/DECISIONS.md (S6-1 to S6-6).
//
// The model is plain, self-describing data (labels, statuses, numbers, sentences): no functions, no
// undefined, nothing shared between calls. It reads only the user's own closed-list answers (the limit and
// "what does your umbrella require" questions), never the host app's policy-screen numbers (DECISIONS D10).
//
// It never asserts more than the research supports (DECISIONS S3a-umbrella-1, S6-2): it reports how a limit
// compares with the requirement the user gave us, and it says nothing about what an umbrella insurer would
// do with a limit that falls short. Not sure, unanswered and unreadable inputs give status "unknown".

export const STACK_VERSION = 1;

/** Option id of the first rung of every limit question: "Lower than 100/300" or "Lower than $300,000" (DECISIONS S5-13). */
export const LOWER_OPTION_ID = 'lower';

/** Underlying layers, bottom of the stack first. The order is fixed so the model is stable. */
export const LAYER_IDS = ['auto', 'home', 'motorcycle', 'boat'];

/** Closed list of layer statuses. */
export const STACK_STATUSES = ['ok', 'below_required', 'above_required', 'unknown'];

const STATUS_LABELS = {
  ok: "Meets your umbrella's requirement",
  below_required: "Below your umbrella's requirement",
  above_required: "Above your umbrella's requirement",
  unknown: 'Not confirmed',
};

// The questions each layer reads. `shape` is how the option values are written: a split limit
// { perPerson, perAccident } (auto-style) or a single dollar amount (home).
const LAYER_DEFS = [
  { id: 'auto', label: 'Auto liability', policyText: 'auto policy', limitQuestion: 'auto_liability', requiredQuestion: 'umbrella_min_auto', shape: 'split' },
  { id: 'home', label: 'Home liability', policyText: 'home policy', limitQuestion: 'home_liability', requiredQuestion: 'umbrella_min_home', shape: 'single' },
  { id: 'motorcycle', label: 'Motorcycle liability', policyText: 'motorcycle policy', limitQuestion: 'motorcycle_liability', requiredQuestion: 'umbrella_min_motorcycle', shape: 'split' },
  { id: 'boat', label: 'Boat liability', policyText: 'boat policy', limitQuestion: 'boat_liability', requiredQuestion: 'umbrella_min_boat', shape: 'split' },
];

const ATTACHMENT_NOTE = 'An umbrella pays only after the liability limit on the policy underneath has been used up, so each limit below is where the umbrella can start to pay for that policy. Your umbrella insurer sets the minimum it wants underneath.';

// Insurance Information Institute (Triple-I) pages behind ATTACHMENT_NOTE (research facts
// umbrella-attaches-after-underlying-exhausted and umbrella-underlying-requirements-insurer-specific).
const MODEL_SOURCE_IDS = ['iii-what-is-umbrella-liability-policy', 'iii-should-i-purchase-umbrella', 'iii-homebuyers-handbook'];

const isMoney = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;

/** The option value as a usable amount for this shape, or null when it is not one. */
function toAmount(value, shape) {
  if (shape === 'single') return isMoney(value) ? value : null;
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && isMoney(value.perPerson) && isMoney(value.perAccident)) {
    return { perPerson: value.perPerson, perAccident: value.perAccident };
  }
  return null;
}

const lowerFirst = (s) => (s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1));

/**
 * One answer, normalized: { state, label, text, amount, ceiling }.
 * state: "known" (a usable value), "not_sure", "unanswered" (hidden or not answered yet) or "unreadable"
 * (the option has no usable value for this shape, which only a catalog authoring slip can cause).
 * ceiling: the "Lower than ..." rung, whose amount is the LARGEST limit it can mean, not the limit itself.
 */
function readAnswer(ctx, questionId, shape) {
  if (ctx.answer(questionId) === undefined) return { state: 'unanswered', label: 'Not answered yet', text: 'not answered yet', amount: null, ceiling: false };
  if (ctx.isNotSure(questionId)) return { state: 'not_sure', label: 'Not sure', text: 'not sure', amount: null, ceiling: false };
  const option = ctx.option(questionId);
  const label = option !== null && typeof option === 'object' && typeof option.label === 'string' ? option.label : 'Unreadable';
  const amount = option !== null && typeof option === 'object' ? toAmount(option.value, shape) : null;
  if (amount === null) return { state: 'unreadable', label, text: lowerFirst(label), amount: null, ceiling: false };
  const ceiling = option.id === LOWER_OPTION_ID;
  return { state: 'known', label, text: ceiling ? lowerFirst(label) : label, amount, ceiling };
}

/** 'below' | 'equal' | 'above' for two amounts of the same shape. Below wins when a split limit is lower on either number. */
function compare(limit, required, shape) {
  if (shape === 'single') return limit < required ? 'below' : limit > required ? 'above' : 'equal';
  if (limit.perPerson < required.perPerson || limit.perAccident < required.perAccident) return 'below';
  if (limit.perPerson > required.perPerson || limit.perAccident > required.perAccident) return 'above';
  return 'equal';
}

function judge(limit, required, shape) {
  if (limit.state !== 'known' || required.state !== 'known') return 'unknown';
  const c = compare(limit.amount, required.amount, shape);
  // A "Lower than ..." limit is only an upper bound. It is certainly below a requirement that sits above that
  // bound; against anything else the real limit could be on either side, so we do not guess (DECISIONS S6-2).
  if (limit.ceiling) return c === 'below' ? 'below_required' : 'unknown';
  return c === 'below' ? 'below_required' : c === 'above' ? 'above_required' : 'ok';
}

function shortBy(limit, required, shape, status) {
  if (status !== 'below_required' || limit.ceiling) return null;
  if (shape === 'single') return required.amount - limit.amount;
  return {
    perPerson: Math.max(0, required.amount.perPerson - limit.amount.perPerson),
    perAccident: Math.max(0, required.amount.perAccident - limit.amount.perAccident),
  };
}

function summarize(def, limit, required, status) {
  const what = def.label.toLowerCase();
  if (status === 'ok') return `Your ${what} limit is ${limit.text}, which matches the ${required.text} your umbrella asks for.`;
  if (status === 'below_required') return `Your ${what} limit is ${limit.text}, but your umbrella asks for ${required.text}.`;
  if (status === 'above_required') return `Your ${what} limit is ${limit.text}, which is more than the ${required.text} your umbrella asks for.`;
  const limitNotSure = limit.state === 'not_sure';
  const requiredNotSure = required.state === 'not_sure';
  if (limitNotSure && requiredNotSure) return `You were not sure of your ${what} limit or of what your umbrella asks for, so we cannot compare them.`;
  if (limitNotSure) return `You were not sure of your ${what} limit, so we cannot compare it with what your umbrella asks for.`;
  if (requiredNotSure && limit.state === 'known') return `You were not sure what your umbrella asks for on your ${def.policyText}, so we cannot compare it with your ${limit.text} limit.`;
  if (limit.state === 'unanswered' || required.state === 'unanswered') return `We do not have both numbers for your ${what} yet, so we cannot compare them.`;
  return `We cannot tell from your answers whether your ${what} limit meets what your umbrella asks for.`;
}

function buildLayer(ctx, def) {
  const limit = readAnswer(ctx, def.limitQuestion, def.shape);
  const required = readAnswer(ctx, def.requiredQuestion, def.shape);
  const status = judge(limit, required, def.shape);
  return {
    limit,
    required,
    layer: {
      id: def.id,
      label: def.label,
      policyText: def.policyText,
      limitShape: def.shape,
      limit: limit.amount,
      limitLabel: limit.label,
      limitText: limit.text,
      limitIsCeiling: limit.ceiling,
      limitAnswer: limit.state,
      required: required.amount,
      requiredLabel: required.label,
      requiredText: required.text,
      requiredAnswer: required.state,
      status,
      statusLabel: STATUS_LABELS[status],
      shortBy: shortBy(limit, required, def.shape, status),
      summary: summarize(def, limit, required, status),
    },
  };
}

function findingsFor(layer) {
  const core = {
    layer: layer.id,
    layerLabel: layer.label,
    policyText: layer.policyText,
    limitLabel: layer.limitLabel,
    limitText: layer.limitText,
    limitIsCeiling: layer.limitIsCeiling,
    requiredLabel: layer.requiredLabel,
    requiredText: layer.requiredText,
  };
  const out = [];
  if (layer.status === 'below_required') out.push({ id: `${layer.id}-below-required`, type: 'below_required', ...core, notSure: [] });
  if (layer.status === 'above_required') out.push({ id: `${layer.id}-above-required`, type: 'above_required', ...core, notSure: [] });
  const notSure = [];
  if (layer.limitAnswer === 'not_sure') notSure.push('limit');
  if (layer.requiredAnswer === 'not_sure') notSure.push('required');
  if (notSure.length > 0) out.push({ id: `${layer.id}-unconfirmed`, type: 'unconfirmed', ...core, notSure });
  return out;
}

/**
 * The findings of one type, in layer order. Safe on a missing stack (returns []), so a flag can write
 * `stackFindings(ctx.stack, 'below_required')` without checking for null first.
 */
export function stackFindings(stack, type) {
  if (stack === null || typeof stack !== 'object' || !Array.isArray(stack.findings)) return [];
  return stack.findings.filter((f) => f !== null && typeof f === 'object' && f.type === type);
}

/**
 * Builds the liability stack from the evaluation context, or returns null when there is nothing to model:
 * no umbrella is held, or `ctx` is not an evaluation context. With an umbrella and no underlying policy the
 * stack is the umbrella alone (`layers` is empty). A held policy whose questions are unanswered is still a
 * layer, with status "unknown".
 */
export function computeLiabilityStack(ctx) {
  if (ctx === null || typeof ctx !== 'object') return null;
  if (typeof ctx.holds !== 'function' || typeof ctx.answer !== 'function'
    || typeof ctx.isNotSure !== 'function' || typeof ctx.option !== 'function') return null;
  if (!ctx.holds('umbrella')) return null;

  const umbrella = readAnswer(ctx, 'umbrella_limit', 'single');
  const layers = [];
  const findings = [];
  const counts = {};
  for (const status of STACK_STATUSES) counts[status] = 0;
  for (const def of LAYER_DEFS) {
    if (!ctx.holds(def.id)) continue;
    const built = buildLayer(ctx, def);
    layers.push(built.layer);
    counts[built.layer.status] += 1;
    for (const f of findingsFor(built.layer)) findings.push(f);
  }

  return {
    version: STACK_VERSION,
    umbrella: {
      id: 'umbrella',
      label: 'Umbrella',
      limit: umbrella.amount,
      limitLabel: umbrella.label,
      limitAnswer: umbrella.state,
    },
    layers,
    counts,
    findings,
    attachmentNote: ATTACHMENT_NOTE,
    sourceIds: MODEL_SOURCE_IDS.slice(),
  };
}
