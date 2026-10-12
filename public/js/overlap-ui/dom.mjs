// The few behaviours of the overlap screens that need real elements (Story S13, step B). Markup comes from
// screens.mjs; the view-models come from viewModel.mjs. Each function takes the elements or the browser
// objects it needs as arguments, so it can be exercised with small stand-ins under jsc (tests/ui/dom.test.mjs)
// and nothing here reaches for a global. No browser storage is used anywhere.
//
//   patchOverlapScreen(stage, sections, screenId, stackVm?)   update answers (and the stack drawing, the step label and Q1's live line) in place; false = do a full re-render
//   restoreFocus(stage, questionId, optionId)       put focus back on the option that was just used
//   focusHeading(stage)                             move focus to the screen's heading
//   copyText(text, env, done)                       clipboard write with a textarea fallback
//   printList(win)                                  open the print dialog
import { overlapScreenKey, overlapStepTexts, sectionIdOf, stackBodyHtml, stackLiveText } from './screens.mjs';

/**
 * Updates the pressed state of every option, the Continue button and the hint under it WITHOUT replacing the
 * elements, so keyboard focus, the scroll position and a screen reader's place all stay put. Returns false
 * (and changes nothing) when the screen's shape differs from what is on the page (a different set of
 * questions or a different "N of M", or a stack drawing that the page has and the caller no longer wants, or
 * the other way round), in which case the caller renders the whole screen again.
 *
 * Story S20: Q1's key has no total, so ticking policies lands here, and how many steps there are changes with the ticks.
 * The step label above the heading and Q1's live line under the list are therefore rewritten in place from
 * overlapStepTexts(), and only when their text differs, so a screen reader hears the live line when it really changes
 * and nothing is drawn again.
 *
 * `stackVm` (Story S14) is stackViewModel(...) for the screens that draw the umbrella and the limits under it:
 * the drawing is replaced with the new one, and its live region (a separate element that is never replaced) is
 * given the new one-line summary only when that summary changed, so a screen reader announces real changes only.
 */
export function patchOverlapScreen(stage, sections, screenId, stackVm) {
  const body = stage.querySelector('#ovl-body');
  const next = stage.querySelector('#ovl-next');
  const hint = stage.querySelector('#ovl-hint');
  if (!body || !next || !hint) return false;
  const stackBody = stage.querySelector('#stk-body');
  const stackLive = stage.querySelector('#stk-live');
  if (stackVm ? (!stackBody || !stackLive) : (stackBody || stackLive)) return false;
  const key = overlapScreenKey(sections, screenId);
  if (key === null || body.getAttribute('data-ovl-key') !== key) return false;
  const sid = sectionIdOf(screenId);
  const section = sections.find((s) => s.id === sid);
  if (!section) return false;
  const texts = overlapStepTexts(sections, screenId);
  const stepLabel = stage.querySelector('#ovl-step');
  const stepsLine = stage.querySelector('#ovl-steps');
  if (!texts || !stepLabel || (texts.line === null ? stepsLine : !stepsLine)) return false;
  let optionCount = 0;
  const buttons = [];
  for (const q of section.questions) {
    for (const o of q.options) {
      optionCount += 1;
      const btn = body.querySelector('button[data-oq="' + q.id + '"][data-ov="' + o.id + '"]');
      if (!btn) return false;
      buttons.push([btn, o.selected]);
    }
  }
  if (body.querySelectorAll('button[data-oq]').length !== optionCount) return false;
  for (const [btn, on] of buttons) {
    btn.classList.toggle('sel', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  next.disabled = !section.complete;
  hint.hidden = section.complete;
  if (stepLabel.textContent !== texts.eyebrow) stepLabel.textContent = texts.eyebrow;
  if (stepsLine && stepsLine.textContent !== texts.line) stepsLine.textContent = texts.line;
  if (stackVm) {
    stackBody.innerHTML = stackBodyHtml(stackVm);
    const sentence = stackLiveText(stackVm);
    if (stackLive.textContent !== sentence) stackLive.textContent = sentence;
  }
  return true;
}

/** Focus the option button for (questionId, optionId) if it is on the page; never scrolls. */
export function restoreFocus(stage, questionId, optionId) {
  const btn = stage.querySelector('button[data-oq="' + questionId + '"][data-ov="' + optionId + '"]');
  if (btn) btn.focus({ preventScroll: true });
  return !!btn;
}

/** Move focus to the heading marked data-focus (it has tabindex="-1"), so a keyboard or screen reader user lands on the new screen. */
export function focusHeading(stage) {
  const h = stage.querySelector('[data-focus]');
  if (h) h.focus();
  return !!h;
}

// The older way to copy: select the text of a hidden textarea and run the "copy" command.
function legacyCopy(text, doc) {
  if (!doc || !doc.body || typeof doc.execCommand !== 'function') return false;
  const ta = doc.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.setAttribute('aria-hidden', 'true');
  ta.tabIndex = -1;
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '-9999px';
  doc.body.appendChild(ta);
  const before = doc.activeElement;
  let ok = false;
  try {
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    ok = !!doc.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  doc.body.removeChild(ta);
  if (before && typeof before.focus === 'function') {
    try { before.focus({ preventScroll: true }); } catch (e) { /* the page keeps working without it */ }
  }
  return ok;
}

/**
 * Copies `text` and calls `done(true)` or `done(false)` once. Uses navigator.clipboard.writeText when it exists
 * (it needs a secure page and a user tap, both true for the Copy button), and falls back to the textarea
 * method when it is missing or refuses. `env` is { navigator, document }; both may be absent.
 */
export function copyText(text, env, done) {
  const nav = env && env.navigator;
  const fallback = () => done(legacyCopy(text, env && env.document));
  if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
    let pending;
    try {
      pending = nav.clipboard.writeText(text);
    } catch (e) {
      fallback();
      return;
    }
    if (pending && typeof pending.then === 'function') {
      pending.then(() => done(true), fallback);
      return;
    }
    done(true);
    return;
  }
  fallback();
}

export const COPY_OK = 'Copied. You can paste it into a note or an email.';
export const COPY_FAILED = 'We could not copy it from here. Select the list on the page and copy it by hand, or use Print my list.';

/** Opens the browser's print dialog; the print stylesheet prints only the action list. */
export function printList(win) {
  win.print();
}
