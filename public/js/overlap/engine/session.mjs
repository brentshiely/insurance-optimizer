// Question session: resolves a catalog's questions, decides which are visible for a set of answers,
// prunes stale answers, and offers pure helpers for changing answers. Pure; never mutates inputs.
//
//   const s = createSession(catalog);
//   s.visibleQuestions(answers)   // resolved questions, catalog order
//   s.prune(answers)              // answers restricted to visible questions and known option ids
//
// A question is visible iff its `showIf` holds AND every question that `showIf` references is itself
// visible (transitive). A `{ holds }` condition reads Q1, the ordinary asked question `policies`, so it counts as
// a reference to that question. Reading is always done on a sanitized view of the answers (unknown option ids
// and wrong shapes removed), so visibility and prune() can never disagree.
import { NOT_SURE, POLICIES_QUESTION_ID } from './constants.mjs';
import { evaluateCondition, checkCondition, conditionRefs } from './conditions.mjs';
import { isPlainObject, hasOwn, clonePlain, deepFreeze, describe } from './util.mjs';

const NOT_SURE_LABEL = 'Not sure';

function resolveQuestion(q) {
  const out = clonePlain(q);
  if (!hasOwn(out, 'showIf') || out.showIf === undefined) out.showIf = null;
  if (out.allowNotSure && !out.options.some((o) => o.id === NOT_SURE)) {
    out.options.push(out.type === 'multi'
      ? { id: NOT_SURE, label: NOT_SURE_LABEL, exclusive: true }
      : { id: NOT_SURE, label: NOT_SURE_LABEL });
  }
  return deepFreeze(out);
}

export function createSession(catalog) {
  if (!catalog || !Array.isArray(catalog.questions)) {
    throw new Error('createSession needs a catalog with a questions array');
  }
  const questions = catalog.questions.map(resolveQuestion);
  const byId = new Map();
  const refs = new Map(); // qid -> question ids its showIf references
  for (const q of questions) {
    if (byId.has(q.id)) throw new Error(`duplicate question id "${q.id}"`);
    byId.set(q.id, q);
    if (q.showIf) {
      const errors = checkCondition(q.showIf);
      if (errors.length > 0) throw new Error(`Malformed condition in showIf of question "${q.id}": ${errors.join('; ')}`);
      const found = conditionRefs(q.showIf);
      const ids = found.answers.map((r) => r.qid);
      if (found.holds.length > 0 && !ids.includes(POLICIES_QUESTION_ID)) ids.push(POLICIES_QUESTION_ID);
      refs.set(q.id, ids);
    } else {
      refs.set(q.id, []);
    }
  }
  Object.freeze(questions);

  function need(qid) {
    const q = byId.get(qid);
    if (!q) throw new Error(`Unknown question "${qid}"`);
    return q;
  }

  // Canonical form of a multi answer: known ids only, option order, no duplicates, an exclusive
  // option (e.g. "None of these", "Not sure") wins over the others. Empty result means unanswered.
  function cleanMulti(q, value) {
    const picked = q.options.filter((o) => value.includes(o.id)).map((o) => o.id);
    if (picked.length === 0) return undefined;
    const exclusive = q.options.find((o) => o.exclusive && picked.includes(o.id));
    return exclusive && picked.length > 1 ? [exclusive.id] : picked;
  }

  function cleanAnswer(q, value) {
    if (q.type === 'multi') return Array.isArray(value) ? cleanMulti(q, value) : undefined;
    return typeof value === 'string' && q.options.some((o) => o.id === value) ? value : undefined;
  }

  // Sanitized copy: known questions with valid answers (Q1, `policies`, is one of them like any other).
  function normalize(answers) {
    const src = isPlainObject(answers) ? answers : {};
    const out = {};
    for (const q of questions) {
      if (!hasOwn(src, q.id)) continue;
      const v = cleanAnswer(q, src[q.id]);
      if (v !== undefined) out[q.id] = v;
    }
    return out;
  }

  // Map qid -> boolean for every question, computed against sanitized answers.
  function visibility(norm) {
    const state = new Map(); // qid -> true | false | 'visiting'
    const env = { answers: norm };
    function visit(qid, trail) {
      const q = byId.get(qid);
      if (!q) return false; // a gate that references a missing question hides the question (validateCatalog flags it)
      if (state.has(qid)) {
        const s = state.get(qid);
        if (s === 'visiting') throw new Error(`Condition cycle between questions: ${trail.concat(qid).join(' -> ')}`);
        return s;
      }
      state.set(qid, 'visiting');
      let visible = true;
      if (q.showIf) {
        for (const ref of refs.get(qid)) {
          if (!visit(ref, trail.concat(qid))) { visible = false; break; }
        }
        if (visible) visible = evaluateCondition(q.showIf, env);
      }
      state.set(qid, visible);
      return visible;
    }
    for (const q of questions) visit(q.id, []);
    return state;
  }

  function copyAnswers(answers) {
    return isPlainObject(answers) ? clonePlain(answers) : {};
  }

  return {
    /** All resolved questions in catalog order (frozen; `not_sure` already appended). */
    questions,

    getQuestion(qid) {
      return byId.get(qid);
    },

    isVisible(qid, answers) {
      if (!byId.has(qid)) return false;
      return visibility(normalize(answers)).get(qid) === true;
    },

    visibleQuestions(answers) {
      const vis = visibility(normalize(answers));
      return questions.filter((q) => vis.get(q.id) === true);
    },

    /** New answers object holding only valid answers to visible questions. */
    prune(answers) {
      const norm = normalize(answers);
      const vis = visibility(norm);
      const out = {};
      for (const q of questions) {
        if (vis.get(q.id) === true && hasOwn(norm, q.id)) out[q.id] = norm[q.id];
      }
      return out;
    },

    /**
     * Returns a copy of `answers` with the question's answer set. Single: `value` is an option id.
     * Multi: `value` is an array of option ids (normalized; empty clears). Throws on unknown ids.
     * Does not prune other answers, so toggling a gate back and forth keeps what the user entered.
     */
    setAnswer(answers, qid, value) {
      const q = need(qid);
      const out = copyAnswers(answers);
      if (q.type === 'multi') {
        if (!Array.isArray(value)) throw new Error(`Question "${qid}" is a multi question; pass an array of option ids, got ${describe(value)}`);
        for (const id of value) {
          if (!q.options.some((o) => o.id === id)) throw new Error(`Unknown option ${describe(id)} for question "${qid}"`);
        }
        const clean = cleanMulti(q, value);
        if (clean === undefined) delete out[qid]; else out[qid] = clean;
        return out;
      }
      if (Array.isArray(value)) throw new Error(`Question "${qid}" is a single question; pass one option id, got ${describe(value)}`);
      if (!q.options.some((o) => o.id === value)) throw new Error(`Unknown option ${describe(value)} for question "${qid}"`);
      out[qid] = value;
      return out;
    },

    /** Multi questions only: adds or removes one option, honoring exclusive options. */
    toggleOption(answers, qid, optionId) {
      const q = need(qid);
      if (q.type !== 'multi') throw new Error(`toggleOption is for multi questions; "${qid}" is a single question`);
      const opt = q.options.find((o) => o.id === optionId);
      if (!opt) throw new Error(`Unknown option ${describe(optionId)} for question "${qid}"`);
      const src = isPlainObject(answers) ? answers : {};
      const current = hasOwn(src, qid) && Array.isArray(src[qid]) ? cleanMulti(q, src[qid]) || [] : [];
      let next;
      if (current.includes(optionId)) next = current.filter((id) => id !== optionId);
      else if (opt.exclusive) next = [optionId];
      else next = current.filter((id) => !q.options.find((o) => o.id === id).exclusive).concat(optionId);
      const out = copyAnswers(answers);
      const clean = cleanMulti(q, next);
      if (clean === undefined) delete out[qid]; else out[qid] = clean;
      return out;
    },

    clearAnswer(answers, qid) {
      need(qid);
      const out = copyAnswers(answers);
      delete out[qid];
      return out;
    },

    /** First visible, unanswered question in catalog order (optionally within one section), or null. */
    nextUnanswered(answers, section) {
      const norm = normalize(answers);
      const vis = visibility(norm);
      const found = questions.find((q) => vis.get(q.id) === true && !hasOwn(norm, q.id)
        && (section === undefined || q.section === section));
      return found || null;
    },
  };
}
