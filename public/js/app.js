// Coverage Check: the page. A small ES module around the components in js/overlap-ui/ and the engine in js/overlap/.
//
// The flow is the one in docs/SPEC.md: an entry screen, Q1 ("Which policies do you have?"), one screen for each
// question section that applies to what was ticked there, and the insurer action list (Raise / Drop / Question).
//
// State is two things, both in memory only: `answers` (one plain object, Q1 included: { questionId: optionId or
// [optionIds] }) and `index` (which screen is showing). Everything else is worked out from them on every render by the
// pure view-models. Nothing is stored, read back or put in the URL, and nothing is typed or uploaded.
import {
  overlapSections, applyAnswer, actionListViewModel, actionListText, liabilityStackModel, stackForScreen,
  screenIds, progressPercent, policiesSummary, ENTRY_SCREEN_ID, ACTIONS_SCREEN_ID,
} from './overlap-ui/viewModel.mjs';
import { stackViewModel } from './overlap-ui/stackView.mjs';
import { entryScreenHtml, overlapScreenHtml, actionListHtml, actionListErrorHtml, actionsFootHtml, knownHtml } from './overlap-ui/screens.mjs';
import { patchOverlapScreen, restoreFocus, focusHeading, copyText, printList, COPY_OK, COPY_FAILED } from './overlap-ui/dom.mjs';
import { startAnalytics, becameSelected, flagIdsOf } from './overlap-ui/analytics.mjs';
import { ANALYTICS_CONFIG } from './config.mjs';

const stage = document.getElementById('stage');
const known = document.getElementById('known');
const progress = document.getElementById('progress');
const bar = document.getElementById('bar');

// Anonymous answer counting (Story S15). With the default provider, "none", this adds nothing to the page and sends
// nothing. Only answers to the questions, the flags shown and Copy / Print ever reach it.
const analytics = startAnalytics({ window, document }, ANALYTICS_CONFIG);

let answers = {};
let index = 0;

const backHtml = () => (index > 0 ? '<button class="link" data-act="back">Back</button>' : '<span></span>');

// The umbrella and the limits under it (Story S14): drawn on the screens that ask for them and in the action list.
// Built from the engine's liability stack only; null (nothing drawn) when no umbrella is held.
function stackFor(screenId) {
  try {
    return stackViewModel(screenId === ACTIONS_SCREEN_ID ? liabilityStackModel(answers) : stackForScreen(answers, screenId));
  } catch (err) {
    console.error('Could not build the umbrella and limits drawing', err);
    return null;
  }
}

// The action list screen. If building the list ever throws, a short error panel replaces it and the rest of the page keeps working.
function actionsHtml() {
  let list;
  try {
    const vm = actionListViewModel(answers);
    flagIdsOf(vm).forEach((flagId) => analytics.emit('flag_shown', { flagId }));
    list = actionListHtml(vm, analytics.counting, stackFor(ACTIONS_SCREEN_ID));
  } catch (err) {
    console.error('Could not build the insurer action list', err);
    list = actionListErrorHtml(analytics.counting);
  }
  return list + actionsFootHtml(backHtml());
}

function screenHtml(id) {
  if (id === ENTRY_SCREEN_ID) return entryScreenHtml(analytics.counting);
  if (id === ACTIONS_SCREEN_ID) return actionsHtml();
  return overlapScreenHtml(overlapSections(answers), id, backHtml(), stackFor(id));
}

function showPolicies() {
  known.innerHTML = knownHtml(policiesSummary(answers));
}

function render() {
  const all = screenIds(answers);
  index = Math.max(0, Math.min(index, all.length - 1));
  stage.innerHTML = screenHtml(all[index]);
  const pct = progressPercent(all, index);
  bar.style.width = pct + '%';
  progress.setAttribute('aria-valuenow', String(Math.round(pct)));
  showPolicies();
}

// Keyboard and screen reader users land on the heading of the new screen.
function go(n) {
  index = n;
  render();
  focusHeading(stage);
}

// One tap on an option. The screen is patched in place when its shape is unchanged; otherwise (a follow-up opened or
// closed) it is drawn again and focus goes back to the option just used.
function answer(questionId, optionId) {
  const before = answers;
  answers = applyAnswer(answers, questionId, optionId);
  if (becameSelected(before, answers, questionId, optionId)) analytics.emit('answer', { questionId, optionId });
  const id = screenIds(answers)[index];
  if (patchOverlapScreen(stage, overlapSections(answers), id, stackFor(id))) {
    showPolicies();
  } else {
    render();
    restoreFocus(stage, questionId, optionId);
  }
}

function copyList() {
  const status = document.getElementById('al-status');
  let text = null;
  try {
    text = actionListText(actionListViewModel(answers));
  } catch (err) {
    console.error('Could not build the list to copy', err);
  }
  if (text === null) {
    if (status) status.textContent = COPY_FAILED;
    return;
  }
  copyText(text, { navigator, document }, (ok) => {
    const el = document.getElementById('al-status');
    if (el) el.textContent = ok ? COPY_OK : COPY_FAILED;
    if (ok) analytics.emit('list_copied');
  });
}

stage.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.oq) {
    answer(b.dataset.oq, b.dataset.ov);
    return;
  }
  switch (b.dataset.act) {
    case 'next': go(index + 1); break;
    case 'back': go(index - 1); break;
    case 'print': analytics.emit('list_printed'); printList(window); break;
    case 'copy': copyList(); break;
    case 'restart': analytics.reset(); answers = {}; go(0); break;
    default: break;
  }
});

render();
