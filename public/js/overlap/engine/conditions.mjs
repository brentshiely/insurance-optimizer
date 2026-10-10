// Condition DSL: evaluation, structural checking, and reference extraction. Pure.
//
// Forms (data, serializable):
//   { holds: 'auto' }                    derived `policies` includes this id
//   { answered: 'qid' }                  the question has an answer (including 'not_sure')
//   { answer: 'qid', is: 'optId' }       single question equals the option
//   { answer: 'qid', in: ['a','b'] }     single question equals any of the options
//   { answer: 'qid', includes: 'optId' } multi question's answer contains the option
//   { all: [c...] } { any: [c...] }      non-empty lists
//   { not: c }
//
// Evaluation reads `env.answers` only. Visibility (a question hidden because a question it
// references is itself hidden) is handled by the session, not here.
import { isPlainObject, hasOwn, describe } from './util.mjs';

/** Returns a list of human-readable problems with `cond` (empty when well-formed). Never throws. */
export function checkCondition(cond) {
  const errors = [];
  walk(cond, '$', errors);
  return errors;
}

function nonEmptyString(v) {
  return typeof v === 'string' && v.length > 0;
}

function onlyKeys(c, allowed, path, errors) {
  for (const k of Object.keys(c)) {
    if (!allowed.includes(k)) errors.push(`${path}: unexpected key "${k}" (allowed here: ${allowed.join(', ')})`);
  }
}

function walk(c, path, errors) {
  if (!isPlainObject(c)) {
    errors.push(`${path}: a condition must be an object, got ${describe(c)}`);
    return;
  }
  if (Object.keys(c).length === 0) {
    errors.push(`${path}: empty condition object`);
    return;
  }
  if (hasOwn(c, 'holds')) {
    onlyKeys(c, ['holds'], path, errors);
    if (!nonEmptyString(c.holds)) errors.push(`${path}: "holds" must be a non-empty string policy id, got ${describe(c.holds)}`);
  } else if (hasOwn(c, 'answered')) {
    onlyKeys(c, ['answered'], path, errors);
    if (!nonEmptyString(c.answered)) errors.push(`${path}: "answered" must be a non-empty string question id, got ${describe(c.answered)}`);
  } else if (hasOwn(c, 'answer')) {
    onlyKeys(c, ['answer', 'is', 'in', 'includes'], path, errors);
    if (!nonEmptyString(c.answer)) errors.push(`${path}: "answer" must be a non-empty string question id, got ${describe(c.answer)}`);
    const present = ['is', 'in', 'includes'].filter((k) => hasOwn(c, k));
    if (present.length !== 1) {
      errors.push(`${path}: an "answer" condition needs exactly one of "is", "in", "includes" (found ${present.length})`);
    } else if (present[0] === 'is' && !nonEmptyString(c.is)) {
      errors.push(`${path}: "is" must be a non-empty string option id, got ${describe(c.is)}`);
    } else if (present[0] === 'includes' && !nonEmptyString(c.includes)) {
      errors.push(`${path}: "includes" must be a non-empty string option id, got ${describe(c.includes)}`);
    } else if (present[0] === 'in' && !(Array.isArray(c.in) && c.in.length > 0 && c.in.every(nonEmptyString))) {
      errors.push(`${path}: "in" must be a non-empty array of strings, got ${describe(c.in)}`);
    }
  } else if (hasOwn(c, 'all') || hasOwn(c, 'any')) {
    const key = hasOwn(c, 'all') ? 'all' : 'any';
    onlyKeys(c, [key], path, errors);
    if (!Array.isArray(c[key]) || c[key].length === 0) {
      errors.push(`${path}: "${key}" must be a non-empty array of conditions, got ${describe(c[key])}`);
    } else {
      c[key].forEach((child, i) => walk(child, `${path}.${key}[${i}]`, errors));
    }
  } else if (hasOwn(c, 'not')) {
    onlyKeys(c, ['not'], path, errors);
    walk(c.not, `${path}.not`, errors);
  } else {
    errors.push(`${path}: unknown condition form with keys ${Object.keys(c).map((k) => `"${k}"`).join(', ')} (expected holds, answered, answer, all, any or not)`);
  }
}

function isAnswered(v) {
  return v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0);
}

function evalNode(c, answers) {
  if (hasOwn(c, 'holds')) return Array.isArray(answers.policies) && answers.policies.includes(c.holds);
  if (hasOwn(c, 'answered')) return hasOwn(answers, c.answered) && isAnswered(answers[c.answered]);
  if (hasOwn(c, 'answer')) {
    const v = hasOwn(answers, c.answer) ? answers[c.answer] : undefined;
    if (hasOwn(c, 'is')) return typeof v === 'string' && v === c.is;
    if (hasOwn(c, 'in')) return typeof v === 'string' && c.in.includes(v);
    return Array.isArray(v) && v.includes(c.includes);
  }
  if (hasOwn(c, 'all')) return c.all.every((child) => evalNode(child, answers));
  if (hasOwn(c, 'any')) return c.any.some((child) => evalNode(child, answers));
  return !evalNode(c.not, answers);
}

/**
 * Evaluates a condition against `env = { answers }`. Throws an Error naming the problem and the
 * offending condition if the condition is malformed (the whole tree is checked first, so a bad
 * branch is reported even when an earlier branch would have short-circuited).
 */
export function evaluateCondition(cond, env) {
  const errors = checkCondition(cond);
  if (errors.length > 0) throw new Error(`Malformed condition: ${errors.join('; ')} (condition: ${describe(cond)})`);
  if (!env || !isPlainObject(env.answers)) throw new Error('evaluateCondition needs env.answers (an answers object)');
  return evalNode(cond, env.answers);
}

/**
 * Lists what a well-formed condition refers to:
 *   { answers: [{ qid, form: 'is'|'in'|'includes'|'answered', optionIds: string[] }], holds: string[] }
 * in document order. Assumes the condition passed checkCondition().
 */
export function conditionRefs(cond) {
  const refs = { answers: [], holds: [] };
  collect(cond, refs);
  return refs;
}

function collect(c, refs) {
  if (hasOwn(c, 'holds')) refs.holds.push(c.holds);
  else if (hasOwn(c, 'answered')) refs.answers.push({ qid: c.answered, form: 'answered', optionIds: [] });
  else if (hasOwn(c, 'answer')) {
    if (hasOwn(c, 'is')) refs.answers.push({ qid: c.answer, form: 'is', optionIds: [c.is] });
    else if (hasOwn(c, 'in')) refs.answers.push({ qid: c.answer, form: 'in', optionIds: c.in.slice() });
    else refs.answers.push({ qid: c.answer, form: 'includes', optionIds: [c.includes] });
  } else if (hasOwn(c, 'all')) c.all.forEach((child) => collect(child, refs));
  else if (hasOwn(c, 'any')) c.any.forEach((child) => collect(child, refs));
  else if (hasOwn(c, 'not')) collect(c.not, refs);
}
