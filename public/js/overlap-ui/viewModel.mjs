// View-models for the overlap screens and the insurer action list (Story S13, step A; R1 step A moved them onto
// plain answers). PURE: no DOM, no Node APIs, no storage, no timers, no clock, no randomness. Runs unchanged under
// macOS jsc, Node and browsers. The DOM code in this folder turns these plain objects into markup and clicks back
// into calls to applyAnswer; nothing here knows about elements.
//
// Every function takes the ANSWERS object, `{ [questionId]: optionId | optionId[] }`, the same thing `evaluate()`
// takes. Q1 is an ordinary entry in it: `answers.policies` is the list of ticked policies (docs/ARCHITECTURE.md
// "Answers"). Every function also takes an optional last argument `catalog` (default: the real catalog) so tests can
// run against a fixture; the UI never passes one.
//
//   overlapSections(answers)               ordered wizard sections that have at least one visible question
//   overlapScreenIds(answers)              ['ovl:<sectionId>', ..., 'actions']
//   screenIds(answers)                     every screen of the wizard: ['entry', 'ovl:<sectionId>', ..., 'actions']
//   progressPercent(ids, index)            width of the progress bar for the screen at `index`
//   policiesSummary(answers)               the policies ticked in Q1, for the "Your policies" panel
//   applyAnswer(answers, qid, optionId)    new answers with that tap applied and stale answers pruned
//   actionListViewModel(answers)           Raise / Drop / Question groups with the rendered flag text
//   actionListText(vm)                     plain text of that list for the clipboard
//   liabilityStackModel(answers)           the engine's umbrella/limits model (Story S14), or null without an umbrella
//   stackForScreen(answers, screenId)      that model on the screens that draw it, else null
//
// Results are fresh plain objects (never the engine's or the catalog's own), so callers may edit them.
// Identical input gives byte-identical output. Inputs are never mutated.
import CATALOG from '../overlap/data/catalog.mjs';
import { SECTIONS } from '../overlap/data/questions/index.mjs';
import { createSession } from '../overlap/engine/session.mjs';
import { evaluate, createContext } from '../overlap/engine/evaluate.mjs';
import { NOT_SURE, POLICIES_QUESTION_ID } from '../overlap/engine/constants.mjs';

/** Screen ids for the page's screen order: the entry screen, one `ovl:<sectionId>` per section, then `actions` last. */
export const ENTRY_SCREEN_ID = 'entry';
export const OVERLAP_SCREEN_PREFIX = 'ovl:';
export const ACTIONS_SCREEN_ID = 'actions';

/**
 * The sections whose screens draw the umbrella and the limits under it (Story S14): the ones that ask the limit
 * questions the engine's LiabilityStack is built from. The stack itself is drawn by stackView.mjs.
 */
export const STACK_SECTION_IDS = ['umbrella_stack', 'umbrella_vehicles'];

/** The three action-list groups, in display order, with their headings (SPEC "Output: the insurer action list"). */
export const BUCKET_LABELS = { raise: 'Raise', drop: 'Drop', question: 'Question' };
export const BUCKET_DESCRIPTIONS = {
  raise: 'Limits that look too low, or gaps in your coverage to close.',
  drop: 'Coverage you may be paying for twice.',
  question: 'Things to ask your insurer or agent, because the right answer depends on your situation.',
};

/** Shown beside an item the engine marked `emphasis: 'strong'`. */
export const EMPHASIS_LABEL = 'Higher priority';

/** Wording shared by the page and the clipboard text. Plain ASCII, state-neutral. */
export const TEXT_HEADLINE = 'Insurance action list (informational only, not insurance advice)';
export const INFO_NOTE = 'This list is general information, not insurance advice, and this tool is not a licensed agent or broker. It is based only on the answers you gave, so it can miss things. Check your own policy documents, and talk to your insurer or agent before you change any coverage.';

/** The honest empty state: nothing was flagged, which is not the same as nothing being wrong. */
export const EMPTY_TITLE = 'We did not find anything to flag from your answers';
export const EMPTY_MESSAGE = 'That does not mean your coverage is complete or that nothing is wrong. This tool only checks the questions you answered and the overlaps and gaps it knows about, so it cannot see everything in your policies. If you skipped questions or chose Not sure, answering them may add items here. For a full review, ask your insurer or agent, or your state\'s department of insurance.';

const BUCKET_ORDER = ['raise', 'drop', 'question'];

// The default catalog plus the section list the UI needs (the engine itself never reads sections).
const DEFAULT_CATALOG = {
  questions: CATALOG.questions,
  flags: CATALOG.flags,
  sources: CATALOG.sources,
  cards: CATALOG.cards,
  sections: SECTIONS,
};

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// The catalog's sections, or, for a catalog without a `sections` list, one section per `section` id in the
// order the ids first appear in the questions (a stand-in title; the real catalog always has the list).
function sectionList(catalog) {
  if (Array.isArray(catalog.sections)) return catalog.sections;
  const seen = {};
  const out = [];
  for (const q of catalog.questions) {
    if (hasOwn(seen, q.section)) continue;
    seen[q.section] = true;
    out.push({ id: q.section, title: q.section.charAt(0).toUpperCase() + q.section.slice(1).replace(/_/g, ' '), reason: '' });
  }
  return out;
}

// A yes/no question is one whose own choices are exactly Yes and No (Not sure may follow).
function kindOf(question) {
  if (question.type === 'multi') return 'multi';
  const own = question.options.filter((o) => o.id !== NOT_SURE).map((o) => o.id);
  return own.length === 2 && own[0] === 'yes' && own[1] === 'no' ? 'yesno' : 'single';
}

// Catalog order, except that Not sure is always last.
function orderedOptions(question) {
  return question.options.filter((o) => o.id !== NOT_SURE).concat(question.options.filter((o) => o.id === NOT_SURE));
}

function questionView(question, answers) {
  const picked = hasOwn(answers, question.id) ? answers[question.id] : undefined;
  const selected = question.type === 'multi'
    ? (id) => Array.isArray(picked) && picked.includes(id)
    : (id) => picked === id;
  const answered = picked !== undefined; // pruned answers hold only valid, non-empty answers
  return {
    id: question.id,
    prompt: question.prompt,
    help: typeof question.help === 'string' ? question.help : '',
    kind: kindOf(question),
    options: orderedOptions(question).map((o) => ({ id: o.id, label: o.label, selected: selected(o.id) })),
    answered,
    allAnswered: answered,
  };
}

/**
 * The wizard sections to show, in order, each with its visible questions.
 *
 *   [{ id, title, reason, questions: [{ id, prompt, help, kind, options: [{ id, label, selected }],
 *                                        answered, allAnswered }], complete }]
 *
 * A section appears only when at least one of its questions is visible for the answers (the engine's
 * transitive visibility, over the answers pruned to what is asked). With nothing answered that is the first section
 * only: Q1, "Which policies do you have?". `kind` is 'multi' for tick-many
 * questions, 'yesno' for Yes / No (/ Not sure) questions and 'single' for any other pick-one question;
 * Not sure, when offered, is always the last option. `answered` / `allAnswered` say the question has a
 * valid answer (a multi question counts once anything, including "None of these", is ticked). `complete`
 * says every visible question of the section is answered; the wizard should not block on it, because every
 * flag handles a missing answer.
 */
export function overlapSections(answers, catalog = DEFAULT_CATALOG) {
  const session = createSession(catalog);
  const pruned = session.prune(answers);
  const visible = session.visibleQuestions(pruned);
  const out = [];
  for (const section of sectionList(catalog)) {
    const questions = visible.filter((q) => q.section === section.id).map((q) => questionView(q, pruned));
    if (questions.length === 0) continue;
    out.push({
      id: section.id,
      title: section.title,
      reason: section.reason,
      questions,
      complete: questions.every((q) => q.answered),
    });
  }
  return out;
}

/** Screen ids for the page's screen order: `ovl:<sectionId>` for each section with a visible question, then 'actions'. */
export function overlapScreenIds(answers, catalog = DEFAULT_CATALOG) {
  return overlapSections(answers, catalog).map((s) => OVERLAP_SCREEN_PREFIX + s.id).concat([ACTIONS_SCREEN_ID]);
}

/**
 * Every screen of the wizard, in order: the entry screen, Q1's screen (`ovl:start`), one `ovl:<sectionId>` for each
 * other section that has a visible question for these answers, and `actions` (the insurer action list) last.
 * Nothing answered gives ['entry', 'ovl:start', 'actions']; ticking policies in Q1 adds the sections that apply.
 */
export function screenIds(answers, catalog = DEFAULT_CATALOG) {
  return [ENTRY_SCREEN_ID].concat(overlapScreenIds(answers, catalog));
}

/**
 * How far along the progress bar is on the screen at `index` of `ids` (from screenIds), 0 to 100 with one decimal.
 * The entry screen and Q1 are 0, because how many screens follow Q1 depends on what is ticked there, and a bar that
 * jumped around while you tick would mislead; the action list is 100; the screens between are spread evenly.
 */
export function progressPercent(ids, index) {
  const last = Array.isArray(ids) ? ids.length - 1 : 0;
  if (last < 2 || !Number.isInteger(index) || index <= 1) return 0;
  if (index >= last) return 100;
  return Math.round(((index - 1) / (last - 1)) * 1000) / 10;
}

/**
 * The policies ticked in Q1 for the "Your policies" panel.
 *
 *   { answered, none, held: [{ id, label }] }
 *
 * `answered` is true once Q1 has an answer; `none` is true when it is "None of these"; `held` lists the ticked
 * policies in Q1's order, each with a short label: the option's label up to its first comma ("Auto insurance,
 * for a car or truck you drive" gives "Auto insurance"), so a new Q1 option needs nothing added here.
 */
export function policiesSummary(answers, catalog = DEFAULT_CATALOG) {
  const session = createSession(catalog);
  const q1 = session.getQuestion(POLICIES_QUESTION_ID);
  const pruned = session.prune(answers);
  const picked = q1 && Array.isArray(pruned[POLICIES_QUESTION_ID]) ? pruned[POLICIES_QUESTION_ID] : [];
  const held = [];
  let none = false;
  if (q1) {
    for (const o of q1.options) {
      if (!picked.includes(o.id)) continue;
      if (o.exclusive === true) none = true;
      else held.push({ id: o.id, label: o.label.split(',')[0] });
    }
  }
  return { answered: picked.length > 0, none, held };
}

/**
 * One tap on an option, as a new answers object.
 *
 *   single question   the tapped option replaces the answer (tapping the chosen option keeps it)
 *   multi question    the tapped option is added, or removed if it was ticked; an exclusive option ("None of
 *                     these", "Not sure") clears the others, and ticking another option clears it; an
 *                     emptied answer is removed
 *
 * Then every answer to a question that is no longer asked is dropped, and so is anything that is not a
 * question, so the result holds only valid answers to visible questions, in catalog order (multi answers in
 * option order). Q1 is one of them: ticking "Umbrella" opens the umbrella questions, unticking it drops their
 * answers. A tap on a question that is not asked is therefore not stored. Throws on an unknown question
 * or option id (a programming error, not a user action).
 */
export function applyAnswer(answers, qid, optionId, catalog = DEFAULT_CATALOG) {
  const session = createSession(catalog);
  const current = isObject(answers) ? answers : {};
  const question = session.getQuestion(qid);
  if (!question) throw new Error(`Unknown question "${qid}"`);
  const next = question.type === 'multi'
    ? session.toggleOption(current, qid, optionId)
    : session.setAnswer(current, qid, optionId);
  return session.prune(next);
}

function itemView(flag) {
  return {
    id: flag.id,
    title: flag.title,
    background: flag.background,
    ask: flag.ask,
    reason: flag.reason,
    emphasis: flag.emphasis,
    sources: flag.sources.map((s) => ({ publisher: s.publisher, title: s.title, url: s.url, lastVerified: s.lastVerified })),
  };
}

/**
 * The insurer action list for the answers.
 *
 *   { groups: [{ bucket: 'raise'|'drop'|'question', label, description,
 *                items: [{ id, title, background, ask, reason, emphasis, sources: [{ publisher, title, url, lastVerified }] }],
 *                count }],
 *     total, empty, emptyTitle, emptyMessage }
 *
 * Groups come in the order Raise, Drop, Question and only exist when they have items; items keep the engine's
 * order (priority, then id). When nothing fired, `groups` is empty, `empty` is true and `emptyTitle` /
 * `emptyMessage` hold the honest empty-state wording (both are null otherwise).
 */
export function actionListViewModel(answers, catalog = DEFAULT_CATALOG) {
  const results = evaluate(answers, catalog);
  const groups = [];
  let total = 0;
  for (const bucket of BUCKET_ORDER) {
    const flags = results.flags[bucket];
    if (!flags || flags.length === 0) continue;
    const items = flags.map(itemView);
    groups.push({ bucket, label: BUCKET_LABELS[bucket], description: BUCKET_DESCRIPTIONS[bucket], items, count: items.length });
    total += items.length;
  }
  const empty = total === 0;
  return {
    groups,
    total,
    empty,
    emptyTitle: empty ? EMPTY_TITLE : null,
    emptyMessage: empty ? EMPTY_MESSAGE : null,
  };
}

/**
 * The engine's LiabilityStack for the answers (docs/ARCHITECTURE.md "LiabilityStack"), as a fresh plain object, or
 * null when no umbrella is held. Only the stack is built (no flags are evaluated). stackView.mjs turns it into
 * what the page draws; nothing else is read from the answers for that.
 */
export function liabilityStackModel(answers, catalog = DEFAULT_CATALOG) {
  const stack = createContext(answers, catalog).stack;
  return stack === null ? null : JSON.parse(JSON.stringify(stack));
}

/**
 * The stack for one overlap screen: the model on the screens listed in STACK_SECTION_IDS (when an umbrella is
 * held), null on every other screen id. The screens call this after every tap, so the drawing follows the answers.
 */
export function stackForScreen(answers, screenId, catalog = DEFAULT_CATALOG) {
  if (typeof screenId !== 'string' || screenId.indexOf(OVERLAP_SCREEN_PREFIX) !== 0) return null;
  if (STACK_SECTION_IDS.indexOf(screenId.slice(OVERLAP_SCREEN_PREFIX.length)) < 0) return null;
  return liabilityStackModel(answers, catalog);
}

function sourceLine(s) {
  return `${s.publisher}, "${s.title}", ${s.url} (last verified ${s.lastVerified})`;
}

function itemLines(item, number) {
  const lines = [`${number}. ${item.title}`];
  if (item.emphasis === 'strong') lines.push(EMPHASIS_LABEL);
  lines.push(`Why it matters: ${item.background}`);
  lines.push(`What to ask: ${item.ask}`);
  lines.push(`Say this: ${item.reason}`);
  const sources = Array.isArray(item.sources) ? item.sources : [];
  if (sources.length === 1) {
    lines.push(`Source: ${sourceLine(sources[0])}`);
  } else if (sources.length > 1) {
    lines.push('Sources:');
    for (const s of sources) lines.push(`- ${sourceLine(s)}`);
  }
  return lines.join('\n');
}

/**
 * Plain text of an action-list view-model, for the clipboard. A header line says the list is informational
 * and not advice. The date it was made is deliberately NOT included (the output stays the same every time);
 * only each source's last-verified date appears. No markup: blank lines between blocks, "\n" newlines, no
 * trailing newline. An empty list prints the honest empty-state wording instead of items.
 */
export function actionListText(vm) {
  const groups = isObject(vm) && Array.isArray(vm.groups) ? vm.groups : [];
  const blocks = [[TEXT_HEADLINE, INFO_NOTE].join('\n')];
  if (groups.length === 0) {
    blocks.push([EMPTY_TITLE, EMPTY_MESSAGE].join('\n'));
    return blocks.join('\n\n');
  }
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  blocks.push(`Items: ${total} (${groups.map((g) => `${g.label} ${g.items.length}`).join(', ')})`);
  for (const g of groups) {
    blocks.push(`${g.label.toUpperCase()} (${g.items.length})\n${g.description}`);
    g.items.forEach((item, i) => blocks.push(itemLines(item, i + 1)));
  }
  return blocks.join('\n\n');
}
