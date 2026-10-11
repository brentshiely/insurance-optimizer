// DOM-string builders for the wizard's screens (Story S13, step B; R1 step B made them the whole page).
//
// Everything here turns the plain view-model objects from viewModel.mjs into HTML STRINGS. Nothing touches
// the DOM, the clock, storage or the network, so it runs (and is unit-tested) under macOS jsc as well as in
// the browser. app.js sets the strings as innerHTML; dom.mjs holds the few behaviours that need real elements
// (patching answers in place, focus, copy, print).
//
// Every piece of text from the catalog or the engine goes through esc(), and a source link is only built for
// an https URL. The markup uses the app's classes (.chips/.chip, .qrow/.yn2, .item, .tag, .src, .foot, .primary,
// .link, .ghost) and the ovl- / oq- / al- / stk- classes in css/app.css. It writes no style attribute, so the
// page's Content-Security-Policy needs no 'unsafe-inline' for styles.
//
//   entryScreenHtml(counting)                         the entry screen: what this is, the not-advice note, the privacy line
//   overlapScreenHtml(sections, screenId, backHtml, stackVm?)   one `ovl:<section>` screen (questions + Continue),
//                                                     with the umbrella stack drawing (Story S14) when given
//   questionHtml(question)                            one question as a labelled group of toggle buttons
//   actionListHtml(vm, counting, stackVm?)            the "Your insurer action list" section, with the stack when given
//   actionsFootHtml(backHtml)                         the Back and Start over row under the action list
//   stackBodyHtml(stackVm) / stackLiveText(stackVm)   what dom.mjs puts in the stack drawing and its live region
//   knownHtml(summary)                                the items of the "Your policies" panel, from policiesSummary()
//   entryNoteHtml(counting)                           the not-advice note and privacy line
//   privacyLine(counting)                             the privacy line (which one depends on whether answers are counted)
import {
  BUCKET_LABELS, EMPHASIS_LABEL, INFO_NOTE, OVERLAP_SCREEN_PREFIX,
} from './viewModel.mjs';
import { stackViewHtml } from './stackView.mjs';

/**
 * The privacy lines (Story S15). Which one the page shows follows whether a counting provider is switched on
 * (js/config.mjs): with the default, 'none', nothing is counted or sent, and the page must not claim otherwise;
 * with a provider set, it says plainly that answers are counted anonymously. The passed flag comes from
 * isCounting(ANALYTICS_CONFIG) in analytics.mjs; this module stays free of any import beyond the view-model.
 */
export const PRIVACY_LINE_NONE = 'Your answers stay on this page and are not saved. Nothing about them is counted or sent anywhere. Close or refresh the page and they are gone.';
export const PRIVACY_LINE_COUNTING = 'Answers are counted anonymously. We count which options were chosen, and visits to this page, never who you are, and there are no cookies. Your answers are never stored against a person. You type nothing here, so no names, numbers or other details are sent. Close or refresh the page and your answers are gone.';

/** The default line (nothing is counted). */
export const PRIVACY_LINE = PRIVACY_LINE_NONE;

/** The line for the current setup: `counting` is true when answers are counted anonymously. */
export function privacyLine(counting) {
  return counting === true ? PRIVACY_LINE_COUNTING : PRIVACY_LINE_NONE;
}

/** The informational-not-advice note for the entry screen (the action list has the longer INFO_NOTE). */
export const ENTRY_NOTE = 'This is general information, not insurance advice, and this tool is not a licensed agent or broker.';

/** The entry screen. It promises only what the flow does: closed-list taps, nothing typed, nothing uploaded. */
export const ENTRY_HEADING = 'Your insurance has never been looked at as a whole. We built the thing that does.';
export const ENTRY_INTRO = 'No name, no email, no sales call. Just a few taps about what you have, with nothing to type and nothing to upload.';
export const ENTRY_HOW = 'Tick the policies you have. We ask a few quick questions about only those, then give you a list of what to raise, drop or ask your insurer about.';

/** Intro line above the action list. */
export const LIST_INTRO = 'Take this list to your insurer or agent. Each item says why it matters, what to ask and what to say.';

/** Hint under a Continue button that is still disabled. */
export const NEEDS_HINT = 'Answer every question to continue. Where it is offered, Not sure is a fine answer.';

/** The same hint on Q1's screen, which has no Not sure: the way forward is a tick, or None of these. */
export const NEEDS_HINT_Q1 = 'Tick at least one policy, or None of these, to continue.';

const LONG_LABEL = 30; // an option label longer than this makes the choices stack, one per line

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// A source link is built only for https URLs; anything else is shown as plain text.
function isHttps(url) {
  return typeof url === 'string' && /^https:\/\/[^\s"'<>]+$/.test(url);
}

/** Section id of an `ovl:<section>` screen id, or null. */
export function sectionIdOf(screenId) {
  return typeof screenId === 'string' && screenId.indexOf(OVERLAP_SCREEN_PREFIX) === 0 ? screenId.slice(OVERLAP_SCREEN_PREFIX.length) : null;
}

// One toggle button. State is both a class (the app's existing look) and aria-pressed (what assistive tech reads).
function optionButton(qid, o, base) {
  const cls = (base + (o.selected ? ' sel' : '')).trim();
  return '<button type="button"' + (cls !== '' ? ' class="' + cls + '"' : '') + ' aria-pressed="' + (o.selected ? 'true' : 'false') +
    '" data-oq="' + esc(qid) + '" data-ov="' + esc(o.id) + '">' + esc(o.label) + '</button>';
}

/**
 * One question: its prompt names the group of buttons (role="group" + aria-labelledby), the help text is the
 * group's description, and each option is a toggle button carrying data-oq / data-ov for the click handler.
 * Yes / No questions use the app's .qrow / .yn2 row; others use .chips (stacked when a label is long).
 */
export function questionHtml(q) {
  const label = 'oq-' + q.id;
  const help = 'oq-' + q.id + '-h';
  const hasHelp = q.help !== '' || q.kind === 'multi';
  const helpHtml = hasHelp
    ? '<span class="small oq-help" id="' + help + '">' + (q.help !== '' ? esc(q.help) : '') +
      (q.kind === 'multi' ? (q.help !== '' ? ' ' : '') + 'Tap all that apply.' : '') + '</span>'
    : '';
  const aria = ' role="group" aria-labelledby="' + label + '"' + (hasHelp ? ' aria-describedby="' + help + '"' : '');
  if (q.kind === 'yesno') {
    return '<div class="qrow oq" data-qid="' + esc(q.id) + '"><div class="oq-text"><p id="' + label + '">' + esc(q.prompt) + '</p>' + helpHtml + '</div>' +
      '<div class="yn2"' + aria + '>' + q.options.map((o) => optionButton(q.id, o, '')).join('') + '</div></div>';
  }
  const stack = q.options.some((o) => o.label.length > LONG_LABEL);
  return '<div class="oq oq-block" data-qid="' + esc(q.id) + '"><p class="oq-prompt" id="' + label + '">' + esc(q.prompt) + '</p>' + helpHtml +
    '<div class="chips' + (stack ? ' stack' : '') + '"' + aria + '>' + q.options.map((o) => optionButton(q.id, o, 'chip')).join('') + '</div></div>';
}

// "Step 2 of 4". Q1 (the first section) says only "Step 1": how many steps follow depends on what is ticked there,
// so a total on that screen would change under the reader's finger.
function stepText(index, total) {
  return index === 0 ? 'Step 1' : 'Step ' + (index + 1) + ' of ' + total;
}

// What must be equal before an answer can be patched in place: same screen, same position, same questions.
// Q1's key has no total (its eyebrow has none), so ticking policies patches in place and does not redraw the screen.
function screenKey(section, position, total) {
  return section.id + '|' + position + '|' + (position === 1 ? '' : total) + '|' + section.questions.map((q) => q.id).join(',');
}

/** The stack drawing for a view-model from stackViewModel(), or '' when there is none. */
export function stackBodyHtml(stackVm) {
  return stackVm ? stackViewHtml(stackVm, { idPrefix: 'stk' }) : '';
}

/** The sentence a screen reader hears when the drawing changes (stackViewModel().ariaSummary), or ''. */
export function stackLiveText(stackVm) {
  return stackVm && typeof stackVm.ariaSummary === 'string' ? stackVm.ariaSummary : '';
}

// The umbrella stack on an overlap screen. The live region is a separate, stable element that already holds the
// summary when the screen is drawn (so nothing is announced on arrival) and that dom.mjs rewrites only when an answer
// changes the drawing, because a screen reader announces text that changes inside an existing region, not a region
// that is replaced. The drawing itself is aria-live="off": #stage is a polite live region (index.html), and without
// this a tap would read the whole redrawn stack aloud on top of the one-line summary.
function stackBlockHtml(stackVm) {
  return '<div class="stk-wrap"><p class="vh" id="stk-live" role="status">' + esc(stackLiveText(stackVm)) + '</p><div id="stk-body" aria-live="off">' + stackBodyHtml(stackVm) + '</div></div>';
}

/**
 * One overlap screen. `sections` is overlapSections(answers), `screenId` is 'ovl:<sectionId>', `backHtml` is
 * the Back control (app.js decides whether there is one). Continue is disabled until every visible question
 * on the screen has an answer. `stackVm` (optional) is stackViewModel(...) for the screens that draw the umbrella
 * and the limits under it; it goes below the questions and is redrawn in place as they are answered. Returns ''
 * when the screen id does not match a section.
 */
export function overlapScreenHtml(sections, screenId, backHtml, stackVm) {
  const sid = sectionIdOf(screenId);
  const index = sections.findIndex((s) => s.id === sid);
  if (index < 0) return '';
  const section = sections[index];
  return '<h3 class="pt">' + stepText(index, sections.length) + '</h3>' +
    '<h2 id="ovl-heading" tabindex="-1" data-focus>' + esc(section.title) + '</h2>' +
    (section.reason !== '' ? '<p class="sub">' + esc(section.reason) + '</p>' : '') +
    '<div class="oqs" id="ovl-body" data-ovl-key="' + esc(screenKey(section, index + 1, sections.length)) + '">' +
      section.questions.map(questionHtml).join('') + '</div>' +
    (stackVm ? stackBlockHtml(stackVm) : '') +
    '<p class="small oq-needs" id="ovl-hint"' + (section.complete ? ' hidden' : '') + '>' + esc(index === 0 ? NEEDS_HINT_Q1 : NEEDS_HINT) + '</p>' +
    '<div class="row spread foot ovl-foot">' + backHtml + '<button type="button" class="primary" id="ovl-next" data-act="next" aria-describedby="ovl-hint"' +
      (section.complete ? '' : ' disabled') + '>Continue</button></div>';
}

/** The screen key dom.mjs compares to decide between patching answers in place and a full re-render. */
export function overlapScreenKey(sections, screenId) {
  const sid = sectionIdOf(screenId);
  const index = sections.findIndex((s) => s.id === sid);
  return index < 0 ? null : screenKey(sections[index], index + 1, sections.length);
}

function sourceHtml(s) {
  const title = isHttps(s.url)
    ? '<a class="src" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '<span class="vh"> (opens in a new tab)</span></a>'
    : esc(s.title);
  return '<li>' + esc(s.publisher) + ', ' + title + ', <span class="al-ver">last verified ' + esc(s.lastVerified) + '</span></li>';
}

function itemHtml(bucket, item) {
  return '<li class="item al-item" id="al-' + esc(item.id) + '">' +
    '<span><span class="tag ' + esc(bucket) + '">' + esc(BUCKET_LABELS[bucket]) + '</span></span>' +
    '<div class="al-body"><h4 class="al-t">' + esc(item.title) + '</h4>' +
      (item.emphasis === 'strong' ? '<p class="al-strong">' + esc(EMPHASIS_LABEL) + '</p>' : '') +
      '<div class="al-part"><p class="al-label">Why it matters</p><p>' + esc(item.background) + '</p></div>' +
      '<div class="al-part"><p class="al-label">What to ask</p><p>' + esc(item.ask) + '</p></div>' +
      '<div class="al-part"><p class="al-label">Say this</p><p>' + esc(item.reason) + '</p></div>' +
      '<div class="al-part"><p class="al-label">' + (item.sources.length === 1 ? 'Source' : 'Sources') + '</p>' +
        '<ul class="al-srcs">' + item.sources.map(sourceHtml).join('') + '</ul></div>' +
    '</div></li>';
}

function groupHtml(g) {
  return '<div class="al-group" data-bucket="' + esc(g.bucket) + '">' +
    '<h3 class="al-gh">' + esc(g.label) + ' <span class="al-n">(' + g.count + ')</span></h3>' +
    '<p class="small">' + esc(g.description) + '</p>' +
    '<ol class="list al-list">' + g.items.map((item) => itemHtml(g.bucket, item)).join('') + '</ol></div>';
}

/** Two short lines on the entry screen: not advice, and what happens to your answers. */
export function entryNoteHtml(counting) {
  return '<div class="entry-notes"><p class="small">' + esc(ENTRY_NOTE) + '</p><p class="small">' + esc(privacyLine(counting)) + '</p></div>';
}

// The policy icons on the entry screen, drawn as they usually live: scattered, never lined up. The tilt of each is a
// CSS rule (.caco span:nth-child), not a style attribute.
const ENTRY_ICONS = [
  '<path d="M5 16.5V12l2.4-5h9.2L19 12v4.5"/><path d="M5 12h14"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/><path d="M9.1 17h5.8"/>',
  '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>',
  '<circle cx="8" cy="15" r="3.6"/><path d="M10.6 12.4 20 3M17.2 5.8l2.4 2.4M14.4 8.6l2 2"/>',
  '<path d="M3 15h18l-3 4.5H6z"/><path d="M12 15V3.5"/><path d="M12 5.5 18.5 13H12"/>',
  '<path d="M12 20s-7.5-4.6-7.5-10.2A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7.5 2.2C19.5 15.4 12 20 12 20z"/>',
  '<path d="M3 12.5a9 9 0 0 1 18 0H3z"/><path d="M12 12.5v5.5a2 2 0 0 0 4 0M12 3.5v1"/>',
];

/**
 * The entry screen: the policy icons, what this is in a sentence, how it goes, the not-advice note and the privacy
 * line (`counting` picks which one), and the button that starts it. The heading takes focus when the screen is
 * shown again by Start over.
 */
export function entryScreenHtml(counting) {
  return '<div class="caco" aria-hidden="true">' + ENTRY_ICONS.map((d) => '<span><svg viewBox="0 0 24 24">' + d + '</svg></span>').join('') + '</div>' +
    '<h1 id="entry-heading" tabindex="-1" data-focus>' + esc(ENTRY_HEADING) + '</h1>' +
    '<p class="sub">' + esc(ENTRY_INTRO) + '</p>' +
    '<p>' + esc(ENTRY_HOW) + '</p>' +
    entryNoteHtml(counting) +
    '<div class="row spread foot"><span></span><button type="button" class="primary" data-act="next">Get started</button></div>';
}

/** The items of the "Your policies" panel (policiesSummary() from the view-model): what was ticked in Q1, or what has not been yet. */
export function knownHtml(summary) {
  if (!summary || !summary.answered) return '<li class="known-none">Nothing ticked yet</li>';
  if (summary.none) return '<li class="known-none">None of these</li>';
  return summary.held.map((p) => '<li>' + esc(p.label) + '</li>').join('');
}

/** The row under the action list: Back to change an answer, and Start over. */
export function actionsFootHtml(backHtml) {
  return '<div class="row spread foot ovl-foot">' + backHtml + '<button type="button" class="link" data-act="restart">Start over</button></div>';
}

// An item is about the umbrella when its id says so (every umbrella flag, including the motorcycle and boat ones, starts with it).
const isUmbrellaItem = (item) => typeof item.id === 'string' && item.id.indexOf('umbrella-') === 0;

/**
 * "Your insurer action list": counts, the not-advice note, Copy / Print buttons and the status line the copy
 * button writes to (both left out when there is nothing to copy), the Raise / Drop / Question groups, and the
 * privacy line (`counting` picks which one; see privacyLine). An empty list prints the honest empty state and never says everything is fine.
 *
 * `stackVm` (optional, Story S14) is stackViewModel(...) for a household with an umbrella. It is drawn directly above
 * the first group that holds an umbrella item, so it sits next to the items it explains (above the first group when
 * no umbrella item fired, below the empty-state message for an empty list), and it prints with the list.
 */
export function actionListHtml(vm, counting, stackVm) {
  const counts = vm.groups.map((g) => g.count + ' ' + g.label).join(', ');
  const stackHtml = stackVm ? '<div class="al-stack">' + stackViewHtml(stackVm, { idPrefix: 'al-stk' }) + '</div>' : '';
  const at = Math.max(0, vm.groups.findIndex((g) => g.items.some(isUmbrellaItem)));
  return '<section class="actionlist" id="actionlist" aria-labelledby="al-h">' +
    '<h2 id="al-h" tabindex="-1" data-focus>Your insurer action list</h2>' +
    (vm.empty ? '' : '<p>' + vm.total + (vm.total === 1 ? ' item' : ' items') + ' to take to your insurer: ' + esc(counts) + '.</p>') +
    '<p class="sub">' + esc(LIST_INTRO) + '</p>' +
    '<p class="small al-note">' + esc(INFO_NOTE) + '</p>' +
    (vm.empty ? '' :
      '<div class="al-actions"><button type="button" class="ghost" data-act="copy">Copy my list</button>' +
      '<button type="button" class="ghost" data-act="print">Print my list</button></div>' +
      '<p class="small al-status" id="al-status" role="status"></p>') +
    (vm.empty
      ? '<div class="finding al-empty"><h3 class="al-gh">' + esc(vm.emptyTitle) + '</h3><p>' + esc(vm.emptyMessage) + '</p></div>' + stackHtml
      : vm.groups.map((g, i) => (i === at ? stackHtml : '') + groupHtml(g)).join('')) +
    '<p class="small al-privacy">' + esc(privacyLine(counting)) + '</p>' +
  '</section>';
}

/** Shown in place of the list if building it ever throws, so the summary above it still works. */
export function actionListErrorHtml(counting) {
  return '<section class="actionlist" id="actionlist" aria-labelledby="al-h"><h2 id="al-h" tabindex="-1" data-focus>Your insurer action list</h2>' +
    '<div class="finding al-empty"><p>We could not build your list this time. Your answers are still on this page, so you can go back and try again, or start over.</p></div>' +
    '<p class="small al-privacy">' + esc(privacyLine(counting)) + '</p></section>';
}
