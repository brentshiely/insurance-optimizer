// Catalog validation. Pure. The suite (and any tooling) runs this over the real catalog; a catalog
// that fails here must not ship.
//
//   validateCatalog(catalog) -> { ok, errors: string[] }     never throws, reports every problem
//   assertValidCatalog(catalog) -> catalog                   throws one Error listing all problems
//
// Checks: unique ids per kind; id conventions; every flag has a valid bucket, kind and domain, text
// that is a non-empty string or a function, and at least one sourceId that exists; every source has a
// publisher, title, https url and a real YYYY-MM-DD lastVerified; every showIf is well formed and
// references existing questions, existing option ids (including not_sure only where allowed), policy
// ids from the known list, a form that matches the question type, and no cycles; options are unique
// per question and never an explicit not_sure; card entries have the contract's shape.
import {
  BUCKETS, KINDS, DOMAINS, QUESTION_TYPES, POLICY_IDS, NOT_SURE,
  CARD_BENEFIT_KEYS, BENEFIT_STATUSES,
} from './constants.mjs';
import { checkCondition, conditionRefs } from './conditions.mjs';
import { templateProblems } from './render.mjs';
import { isPlainObject, hasOwn, isSnakeId, isOptionId, isKebabId, describe } from './util.mjs';

const nonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const HTTPS_URL = /^https:\/\/[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(:\d+)?([/?#]\S*)?$/;

function isHttpsUrl(v) {
  return typeof v === 'string' && HTTPS_URL.test(v);
}

function isIsoDate(v) {
  if (typeof v !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day <= daysInMonth;
}

function validateSources(sources, errors) {
  if (!isPlainObject(sources)) {
    errors.push('catalog.sources must be an object keyed by source id');
    return;
  }
  for (const key of Object.keys(sources)) {
    const s = sources[key];
    if (!isKebabId(key)) errors.push(`source id "${key}" must be kebab-case (lowercase letters, digits and hyphens, starting with a letter)`);
    if (!isPlainObject(s)) { errors.push(`source "${key}": must be an object`); continue; }
    if (s.id !== key) errors.push(`source "${key}": id must equal its key (found ${describe(s.id)})`);
    if (!nonEmptyString(s.publisher)) errors.push(`source "${key}": publisher must be a non-empty string`);
    if (!nonEmptyString(s.title)) errors.push(`source "${key}": title must be a non-empty string`);
    if (!isHttpsUrl(s.url)) errors.push(`source "${key}": url must be an https URL, got ${describe(s.url)}`);
    if (!isIsoDate(s.lastVerified)) errors.push(`source "${key}": lastVerified must be a real date in YYYY-MM-DD form, got ${describe(s.lastVerified)}`);
  }
}

function validateCards(cards, errors) {
  if (cards === undefined) return;
  if (!isPlainObject(cards)) {
    errors.push('catalog.cards must be an object keyed by card id');
    return;
  }
  for (const key of Object.keys(cards)) {
    const c = cards[key];
    if (!isKebabId(key)) errors.push(`card id "${key}" must be kebab-case (lowercase letters, digits and hyphens, starting with a letter)`);
    if (!isPlainObject(c)) { errors.push(`card "${key}": must be an object`); continue; }
    if (c.id !== key) errors.push(`card "${key}": id must equal its key (found ${describe(c.id)})`);
    if (!nonEmptyString(c.name)) errors.push(`card "${key}": name must be a non-empty string`);
    if (!nonEmptyString(c.issuer)) errors.push(`card "${key}": issuer must be a non-empty string`);
    if (!isIsoDate(c.lastVerified)) errors.push(`card "${key}": lastVerified must be a real date in YYYY-MM-DD form, got ${describe(c.lastVerified)}`);
    if (!isHttpsUrl(c.guideUrl)) errors.push(`card "${key}": guideUrl must be an https URL, got ${describe(c.guideUrl)}`);
    if (!isPlainObject(c.benefits)) { errors.push(`card "${key}": benefits must be an object`); continue; }
    for (const bk of CARD_BENEFIT_KEYS) {
      if (!hasOwn(c.benefits, bk)) errors.push(`card "${key}": benefit "${bk}" is missing (use status "unverified" if it is not confirmed)`);
    }
    for (const bk of Object.keys(c.benefits)) {
      const b = c.benefits[bk];
      if (!isPlainObject(b)) { errors.push(`card "${key}": benefit "${bk}" must be an object`); continue; }
      if (!BENEFIT_STATUSES.includes(b.status)) errors.push(`card "${key}": benefit "${bk}": status must be one of ${BENEFIT_STATUSES.join(', ')}, got ${describe(b.status)}`);
      if (!nonEmptyString(b.summary)) errors.push(`card "${key}": benefit "${bk}": summary must be a non-empty string`);
      if (b.conditions !== undefined && typeof b.conditions !== 'string') errors.push(`card "${key}": benefit "${bk}": conditions must be a string when present`);
    }
  }
}

function validateQuestionShape(q, index, errors) {
  if (!isPlainObject(q)) { errors.push(`question #${index + 1} must be an object`); return null; }
  if (!nonEmptyString(q.id)) { errors.push(`question #${index + 1}: id must be a non-empty string`); return null; }
  const id = q.id;
  if (!isSnakeId(id)) errors.push(`question id "${id}" must be snake_case (lowercase letters, digits and underscores, starting with a letter)`);
  if (!DOMAINS.includes(q.domain)) errors.push(`question "${id}": domain must be one of ${DOMAINS.join(', ')}, got ${describe(q.domain)}`);
  if (!isSnakeId(q.section)) errors.push(`question "${id}": section must be a snake_case string, got ${describe(q.section)}`);
  if (!QUESTION_TYPES.includes(q.type)) errors.push(`question "${id}": type must be "single" or "multi", got ${describe(q.type)}`);
  if (!nonEmptyString(q.prompt)) errors.push(`question "${id}": prompt must be a non-empty string`);
  if (q.help !== undefined && typeof q.help !== 'string') errors.push(`question "${id}": help must be a string when present`);
  if (q.allowNotSure !== undefined && typeof q.allowNotSure !== 'boolean') errors.push(`question "${id}": allowNotSure must be a boolean when present`);
  if (!Array.isArray(q.options) || q.options.length === 0) {
    errors.push(`question "${id}": options must be a non-empty array`);
  } else {
    const seen = {};
    q.options.forEach((o, i) => {
      if (!isPlainObject(o)) { errors.push(`question "${id}": option #${i + 1} must be an object`); return; }
      if (!nonEmptyString(o.id)) { errors.push(`question "${id}": option #${i + 1}: id must be a non-empty string`); return; }
      if (o.id === NOT_SURE) errors.push(`question "${id}": option id "${NOT_SURE}" is reserved; set allowNotSure: true instead of listing it`);
      else if (!isOptionId(o.id)) errors.push(`question "${id}": option id "${o.id}" must be snake_case (lowercase letters, digits and underscores)`);
      if (hasOwn(seen, o.id)) errors.push(`question "${id}": duplicate option id "${o.id}"`);
      seen[o.id] = true;
      if (!nonEmptyString(o.label)) errors.push(`question "${id}": option "${o.id}" needs a non-empty label`);
      if (o.exclusive !== undefined && typeof o.exclusive !== 'boolean') errors.push(`question "${id}": option "${o.id}": exclusive must be a boolean when present`);
    });
  }
  return id;
}

// Option ids a condition may refer to for this question (includes not_sure only when allowed).
function optionIdsOf(q) {
  const ids = Array.isArray(q.options) ? q.options.filter((o) => isPlainObject(o) && typeof o.id === 'string').map((o) => o.id) : [];
  if (q.allowNotSure === true) ids.push(NOT_SURE);
  return ids;
}

function validateShowIf(q, byId, errors, edges) {
  if (q.showIf === undefined || q.showIf === null) return;
  const problems = checkCondition(q.showIf);
  if (problems.length > 0) {
    for (const p of problems) errors.push(`question "${q.id}": showIf: ${p}`);
    return;
  }
  const refs = conditionRefs(q.showIf);
  for (const pid of refs.holds) {
    if (!POLICY_IDS.includes(pid)) errors.push(`question "${q.id}": showIf references unknown policy id "${pid}" (known: ${POLICY_IDS.join(', ')})`);
  }
  for (const ref of refs.answers) {
    const target = byId.get(ref.qid);
    if (!target) {
      errors.push(`question "${q.id}": showIf references unknown question "${ref.qid}"`);
      continue;
    }
    edges.get(q.id).push(ref.qid);
    if (ref.form === 'includes' && target.type !== 'multi') {
      errors.push(`question "${q.id}": showIf uses "includes" on single question "${ref.qid}" (use "is" or "in")`);
    }
    if ((ref.form === 'is' || ref.form === 'in') && target.type === 'multi') {
      errors.push(`question "${q.id}": showIf uses "${ref.form}" on multi question "${ref.qid}" (use "includes")`);
    }
    const known = optionIdsOf(target);
    for (const oid of ref.optionIds) {
      if (!known.includes(oid)) errors.push(`question "${q.id}": showIf references unknown option "${oid}" of question "${ref.qid}"`);
    }
  }
}

// Depth-first search over question -> referenced-question edges; reports each back edge once.
function findCycles(edges, errors) {
  const state = new Map(); // 1 = on the current path, 2 = finished
  const path = [];
  function visit(id) {
    state.set(id, 1);
    path.push(id);
    for (const next of edges.get(id)) {
      if (state.get(next) === 1) {
        errors.push(`condition cycle: ${path.slice(path.indexOf(next)).concat(next).join(' -> ')}`);
      } else if (!state.has(next)) {
        visit(next);
      }
    }
    path.pop();
    state.set(id, 2);
  }
  for (const id of edges.keys()) if (!state.has(id)) visit(id);
}

function validateQuestions(questions, cards, errors) {
  if (!Array.isArray(questions)) {
    errors.push('catalog.questions must be an array');
    return;
  }
  const byId = new Map();
  const shaped = [];
  questions.forEach((q, i) => {
    const id = validateQuestionShape(q, i, errors);
    if (id === null) return;
    if (byId.has(id)) errors.push(`duplicate question id "${id}"`);
    else byId.set(id, q);
    shaped.push(q);
  });
  const edges = new Map();
  for (const id of byId.keys()) edges.set(id, []);
  for (const q of shaped) {
    if (byId.get(q.id) === q) validateShowIf(q, byId, errors, edges);
  }
  findCycles(edges, errors);

  // Options of the cards question that name a card must name one that exists.
  const cardTable = isPlainObject(cards) ? cards : {};
  for (const q of shaped) {
    if (q.id !== 'cards' || !Array.isArray(q.options)) continue;
    for (const o of q.options) {
      if (isPlainObject(o) && isPlainObject(o.value) && o.value.cardId !== undefined && !hasOwn(cardTable, o.value.cardId)) {
        errors.push(`question "cards": option "${o.id}" value.cardId ${describe(o.value.cardId)} is not in cards`);
      }
    }
  }
}

function validateFlags(flags, sources, errors) {
  if (!Array.isArray(flags)) {
    errors.push('catalog.flags must be an array');
    return;
  }
  const seen = {};
  flags.forEach((fl, i) => {
    if (!isPlainObject(fl)) { errors.push(`flag #${i + 1} must be an object`); return; }
    if (!nonEmptyString(fl.id)) { errors.push(`flag #${i + 1}: id must be a non-empty string`); return; }
    const id = fl.id;
    if (!isKebabId(id)) errors.push(`flag id "${id}" must be kebab-case (lowercase letters, digits and hyphens, starting with a letter)`);
    if (hasOwn(seen, id)) errors.push(`duplicate flag id "${id}"`);
    seen[id] = true;
    if (!BUCKETS.includes(fl.bucket)) errors.push(`flag "${id}": bucket must be one of ${BUCKETS.join(', ')}, got ${describe(fl.bucket)}`);
    if (!KINDS.includes(fl.kind)) errors.push(`flag "${id}": kind must be one of ${KINDS.join(', ')}, got ${describe(fl.kind)}`);
    if (!DOMAINS.includes(fl.domain)) errors.push(`flag "${id}": domain must be one of ${DOMAINS.join(', ')}, got ${describe(fl.domain)}`);
    if (fl.priority !== undefined && !(typeof fl.priority === 'number' && Number.isFinite(fl.priority))) {
      errors.push(`flag "${id}": priority must be a finite number when present, got ${describe(fl.priority)}`);
    }
    if (typeof fl.applies !== 'function') errors.push(`flag "${id}": applies must be a function`);
    for (const field of ['title', 'background', 'ask', 'reason']) {
      const v = fl[field];
      if (typeof v === 'function') continue;
      if (!nonEmptyString(v)) { errors.push(`flag "${id}": ${field} must be a non-empty string or a function`); continue; }
      for (const p of templateProblems(v)) errors.push(`flag "${id}": ${field} has a malformed template: ${p}`);
    }
    if (fl.sourceIds === undefined || (Array.isArray(fl.sourceIds) && fl.sourceIds.length === 0)) {
      errors.push(`flag "${id}": needs at least one sourceId`);
    } else if (!Array.isArray(fl.sourceIds)) {
      errors.push(`flag "${id}": sourceIds must be an array of source ids, got ${describe(fl.sourceIds)}`);
    } else {
      for (const sid of fl.sourceIds) {
        if (typeof sid !== 'string' || !isPlainObject(sources) || !hasOwn(sources, sid)) {
          errors.push(`flag "${id}": cites unknown source ${describe(sid)}`);
        }
      }
    }
  });
}

export function validateCatalog(catalog) {
  const errors = [];
  if (!isPlainObject(catalog)) {
    return { ok: false, errors: ['catalog must be an object with questions, flags, sources and cards'] };
  }
  validateSources(catalog.sources, errors);
  validateCards(catalog.cards, errors);
  validateQuestions(catalog.questions, catalog.cards, errors);
  validateFlags(catalog.flags, catalog.sources, errors);
  return { ok: errors.length === 0, errors };
}

export function assertValidCatalog(catalog) {
  const { ok, errors } = validateCatalog(catalog);
  if (!ok) {
    throw new Error(`Invalid catalog (${errors.length} error${errors.length === 1 ? '' : 's'}):\n- ${errors.join('\n- ')}`);
  }
  return catalog;
}
