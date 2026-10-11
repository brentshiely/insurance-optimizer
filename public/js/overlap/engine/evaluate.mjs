// The evaluation entry point: answers + catalog -> Results. Pure and deterministic.
//
//   evaluate(answers, catalog = default) -> {
//     flags: { raise: ResultFlag[], drop: ResultFlag[], question: ResultFlag[] },
//     stack: LiabilityStack | null,
//     meta:  { visibleQuestionIds: string[], answeredCount: number },
//   }
//
// Steps: prune answers to visible questions -> build the context flags read -> ask every flag whether
// it applies -> render the text of those that do (templates resolved, sources looked up) -> order by
// bucket, then priority ascending, then id. Inputs are never mutated; identical inputs give
// deep-equal results.
import CATALOG from '../data/catalog.mjs';
import { createSession } from './session.mjs';
import { holdsPolicy } from './conditions.mjs';
import { resolveText } from './render.mjs';
import { computeLiabilityStack } from './liabilityStack.mjs';
import { BUCKETS, EMPHASES, CARDS_QUESTION_ID, BENEFIT_PRESENT, NOT_SURE } from './constants.mjs';
import { isPlainObject, hasOwn, clonePlain, deepFreeze, compareStrings, describe } from './util.mjs';

const DEFAULT_PRIORITY = 100;
const TEXT_FIELDS = ['title', 'background', 'ask', 'reason'];

// ctx: the read-only view of the (pruned) answers that flag rules and text functions receive.
// `answers` must already be pruned; it is frozen here.
function buildContext(session, answers, catalog) {
  deepFreeze(answers);
  const cardTable = isPlainObject(catalog.cards) ? catalog.cards : {};

  // The question, but only when it has an answer (pruned answers exist only for visible questions).
  const answered = (qid) => {
    const q = session.getQuestion(qid);
    return q !== undefined && hasOwn(answers, qid) ? q : undefined;
  };

  let selectedCards;
  const cardList = () => {
    if (selectedCards === undefined) {
      const q = answered(CARDS_QUESTION_ID);
      const found = {};
      if (q && q.type === 'multi') {
        for (const optionId of answers[CARDS_QUESTION_ID]) {
          const option = q.options.find((o) => o.id === optionId);
          const cardId = option && isPlainObject(option.value) && typeof option.value.cardId === 'string'
            ? option.value.cardId
            : optionId.replace(/_/g, '-');
          if (hasOwn(cardTable, cardId)) found[cardId] = cardTable[cardId];
        }
      }
      selectedCards = Object.keys(found).sort(compareStrings).map((id) => deepFreeze(clonePlain(found[id])));
    }
    return selectedCards;
  };

  const ctx = {
    holds: (policyId) => holdsPolicy(answers, policyId),
    answer: (qid) => (answered(qid) ? answers[qid] : undefined),
    is: (qid, optionId) => answered(qid) !== undefined && answers[qid] === optionId,
    includes: (qid, optionId) => answered(qid) !== undefined && Array.isArray(answers[qid]) && answers[qid].includes(optionId),
    isNotSure: (qid) => {
      if (answered(qid) === undefined) return false;
      const v = answers[qid];
      return v === NOT_SURE || (Array.isArray(v) && v.includes(NOT_SURE));
    },
    option: (qid) => {
      const q = answered(qid);
      if (!q) return undefined;
      const v = answers[qid];
      return q.type === 'multi'
        ? v.map((id) => q.options.find((o) => o.id === id))
        : q.options.find((o) => o.id === v);
    },
    cards: () => cardList().slice(),
    cardsWith: (benefitKey) => cardList().filter((card) => isPlainObject(card.benefits)
      && hasOwn(card.benefits, benefitKey)
      && isPlainObject(card.benefits[benefitKey])
      && BENEFIT_PRESENT.includes(card.benefits[benefitKey].status)),
    stack: null,
  };
  ctx.stack = deepFreeze(computeLiabilityStack(ctx));
  return Object.freeze(ctx);
}

/** The context flags receive, for the given answers (pruned first). Exposed for tests and tooling. */
export function createContext(answers, catalog = CATALOG) {
  const session = createSession(catalog);
  return buildContext(session, session.prune(answers), catalog);
}

// Returns the applies() result as an object ({} for a bare `true`), or null when the flag does not apply.
function runApplies(flag, ctx) {
  if (typeof flag.applies !== 'function') throw new Error(`flag "${flag.id}": applies must be a function`);
  let result;
  try {
    result = flag.applies(ctx);
  } catch (e) {
    throw new Error(`flag "${flag.id}": applies() threw: ${e && e.message ? e.message : e}`);
  }
  if (result === false || result === null) return null;
  if (result === true) return {};
  if (result === undefined) {
    throw new Error(`flag "${flag.id}": applies() returned undefined; return false, null, true or { emphasis?, vars? }`);
  }
  if (!isPlainObject(result)) {
    throw new Error(`flag "${flag.id}": applies() must return false, null, true or an object, got ${describe(result)}`);
  }
  return result;
}

// The bucket this household's item goes in: the flag's own `bucket`, unless applies() asked for another one that the flag
// lists in `alternateBuckets` (a flag that is a Drop only when something already covers the same thing, and a Question
// when nothing is known to). Naming a bucket the flag did not declare is an error, so it cannot happen by accident.
function bucketOf(flag, result) {
  if (result.bucket === undefined) return flag.bucket;
  if (!BUCKETS.includes(result.bucket)) throw new Error(`flag "${flag.id}": applies() bucket must be one of ${BUCKETS.join(', ')}, got ${describe(result.bucket)}`);
  if (result.bucket !== flag.bucket && !(Array.isArray(flag.alternateBuckets) && flag.alternateBuckets.includes(result.bucket))) {
    throw new Error(`flag "${flag.id}": applies() returned bucket "${result.bucket}", which the flag does not list in alternateBuckets`);
  }
  return result.bucket;
}

function renderFlag(flag, ctx, result, sources) {
  if (!BUCKETS.includes(flag.bucket)) throw new Error(`flag "${flag.id}": bucket must be one of ${BUCKETS.join(', ')}, got ${describe(flag.bucket)}`);
  const bucket = bucketOf(flag, result);
  const emphasis = result.emphasis === undefined ? 'normal' : result.emphasis;
  if (!EMPHASES.includes(emphasis)) throw new Error(`flag "${flag.id}": emphasis must be one of ${EMPHASES.join(', ')}, got ${describe(emphasis)}`);
  const rawVars = result.vars === undefined ? {} : result.vars;
  if (!isPlainObject(rawVars)) throw new Error(`flag "${flag.id}": vars must be an object, got ${describe(rawVars)}`);
  const vars = deepFreeze(clonePlain(rawVars));

  const text = {};
  for (const field of TEXT_FIELDS) {
    try {
      text[field] = resolveText(flag[field], ctx, vars);
    } catch (e) {
      throw new Error(`flag "${flag.id}" field "${field}": ${e && e.message ? e.message : e}`);
    }
  }

  if (!Array.isArray(flag.sourceIds) || flag.sourceIds.length === 0) {
    throw new Error(`flag "${flag.id}": needs at least one source`);
  }
  const resolved = flag.sourceIds.map((sid) => {
    if (!isPlainObject(sources) || !hasOwn(sources, sid)) throw new Error(`flag "${flag.id}" cites unknown source "${sid}"`);
    const s = sources[sid];
    return { id: sid, publisher: s.publisher, title: s.title, url: s.url, lastVerified: s.lastVerified };
  });

  return {
    id: flag.id,
    bucket,
    domain: flag.domain,
    kind: flag.kind,
    title: text.title,
    emphasis,
    background: text.background,
    ask: text.ask,
    reason: text.reason,
    sources: resolved,
  };
}

export function evaluate(answers, catalog = CATALOG) {
  const session = createSession(catalog);
  const pruned = session.prune(answers);
  const ctx = buildContext(session, pruned, catalog);

  const entries = { raise: [], drop: [], question: [] };
  for (const flag of Array.isArray(catalog.flags) ? catalog.flags : []) {
    const result = runApplies(flag, ctx);
    if (result === null) continue;
    const rendered = renderFlag(flag, ctx, result, catalog.sources);
    const priority = typeof flag.priority === 'number' && Number.isFinite(flag.priority) ? flag.priority : DEFAULT_PRIORITY;
    entries[rendered.bucket].push({ priority, flag: rendered });
  }

  const byPriorityThenId = (a, b) => (a.priority - b.priority) || compareStrings(a.flag.id, b.flag.id);
  const flags = {};
  for (const bucket of BUCKETS) flags[bucket] = entries[bucket].sort(byPriorityThenId).map((e) => e.flag);

  const visibleQuestionIds = session.visibleQuestions(pruned).map((q) => q.id);
  return {
    flags,
    stack: ctx.stack === null ? null : clonePlain(ctx.stack),
    meta: {
      visibleQuestionIds,
      answeredCount: visibleQuestionIds.filter((id) => hasOwn(pruned, id)).length,
    },
  };
}
