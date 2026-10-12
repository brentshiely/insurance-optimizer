// Tests for public/js/overlap-ui/dom.mjs (Story S13, step B). The functions take the elements and browser
// objects they need as arguments, so they run here against small stand-ins (jsc has no DOM). That the real
// elements behave the same is checked in the Browser pane: patching in place was compared with a fresh
// render over 2,400 random taps (see DECISIONS S13-7), and Copy was used with a real click.
import { suite, assert } from '../harness.mjs';
import {
  patchOverlapScreen, restoreFocus, focusHeading, copyText, printList, COPY_OK, COPY_FAILED,
} from '../../public/js/overlap-ui/dom.mjs';
import { overlapScreenKey } from '../../public/js/overlap-ui/screens.mjs';
import { overlapSections } from '../../public/js/overlap-ui/viewModel.mjs';
import { findForbidden, codeOnly, importsOf } from '../helpers/sourceScan.mjs';

// Plain answers: Q1 (`policies`) holds the ticks, the rest is the user's own taps.
const ans = (policies, more = {}) => ({ policies, ...more });

// A stand-in for a text element: remembers its text and how many times it was written (Story S20).
function fakeText(text = '') {
  let value = text;
  return { writes: 0, get textContent() { return value; }, set textContent(v) { value = v; this.writes += 1; } };
}

// ---------------------------------------------------------------------------------------------------------
// A stand-in for the rendered screen: just enough of the element API that patchOverlapScreen uses.
// ---------------------------------------------------------------------------------------------------------
function fakeEl(attrs = {}) {
  const classes = new Set((attrs.class || '').split(' ').filter(Boolean));
  const attributes = { ...attrs };
  delete attributes.class;
  return {
    disabled: false,
    hidden: false,
    classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }, has: (n) => classes.has(n) },
    setAttribute(k, v) { attributes[k] = String(v); },
    getAttribute(k) { return k in attributes ? attributes[k] : null; },
    focused: 0,
    focusArgs: null,
    focus(arg) { this.focused += 1; this.focusArgs = arg; },
  };
}

// Builds the stage the way overlapScreenHtml would: body (with its key), the Continue button, the hint, and a
// button per option, all initially unselected and Continue disabled.
function fakeScreen(sections, screenId) {
  const key = overlapScreenKey(sections, screenId);
  const isQ1 = screenId === 'ovl:start';
  const section = sections.find((s) => 'ovl:' + s.id === screenId);
  const buttons = new Map();
  for (const q of section.questions) for (const o of q.options) buttons.set(q.id + '/' + o.id, fakeEl({ 'aria-pressed': 'false', 'data-oq': q.id, 'data-ov': o.id }));
  const body = {
    getAttribute: (k) => (k === 'data-ovl-key' ? key : null),
    querySelector(sel) {
      const m = /^button\[data-oq="([^"]+)"\]\[data-ov="([^"]+)"\]$/.exec(sel);
      return m ? buttons.get(m[1] + '/' + m[2]) || null : null;
    },
    querySelectorAll(sel) { return sel === 'button[data-oq]' ? Array.from(buttons.values()) : []; },
  };
  const next = fakeEl({ id: 'ovl-next' });
  next.disabled = true;
  const hint = fakeEl({ id: 'ovl-hint' });
  // every question screen has a step label; only Q1 has the live line under the list (Story S20)
  const step = fakeText('old label');
  const line = isQ1 ? fakeText('old line') : null;
  const els = { '#ovl-body': body, '#ovl-next': next, '#ovl-hint': hint, '#ovl-step': step, '#ovl-steps': line };
  return { stage: { querySelector: (sel) => els[sel] || null }, buttons, body, next, hint, step, line };
}

suite('patchOverlapScreen: answers update in place', (t) => {
  const snap0 = ans(['auto', 'home']);
  const sections0 = overlapSections(snap0);
  const sid = 'ovl:auto_gaps';

  t('sets pressed state and class from the view-model, enables Continue and hides the hint when complete', () => {
    const o = { auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'yes', auto_um_uim: 'no', auto_rental_reimbursement: 'yes' };
    const sections = overlapSections(ans(['auto', 'home'], o));
    const screen = fakeScreen(sections, sid);
    assert.equal(patchOverlapScreen(screen.stage, sections, sid), true);
    const sec = sections.find((s) => 'ovl:' + s.id === sid);
    for (const q of sec.questions) for (const opt of q.options) {
      const b = screen.buttons.get(q.id + '/' + opt.id);
      assert.equal(b.getAttribute('aria-pressed'), opt.selected ? 'true' : 'false', `${q.id}/${opt.id}`);
      assert.equal(b.classList.has('sel'), opt.selected, `${q.id}/${opt.id} class`);
    }
    assert.equal(sec.complete, true);
    assert.equal(screen.next.disabled, false);
    assert.equal(screen.hint.hidden, true);
  });

  t('keeps Continue disabled and the hint showing while a question is unanswered', () => {
    const screen = fakeScreen(sections0, sid);
    screen.hint.hidden = true;
    assert.equal(patchOverlapScreen(screen.stage, sections0, sid), true);
    assert.equal(screen.next.disabled, true);
    assert.equal(screen.hint.hidden, false);
  });

  t('clears a selection that is no longer in the view-model', () => {
    const screen = fakeScreen(sections0, sid);
    const first = screen.buttons.get('auto_financing/loan');
    first.setAttribute('aria-pressed', 'true');
    first.classList.toggle('sel', true);
    assert.equal(patchOverlapScreen(screen.stage, sections0, sid), true);
    assert.equal(first.getAttribute('aria-pressed'), 'false');
    assert.equal(first.classList.has('sel'), false);
  });

  t('returns false and changes nothing when the screen has a different shape (a question opened or closed)', () => {
    const screen = fakeScreen(sections0, sid);
    const loan = overlapSections(ans(['auto', 'home'], { auto_financing: 'loan' }));
    assert.notEqual(overlapScreenKey(loan, sid), overlapScreenKey(sections0, sid));
    assert.equal(patchOverlapScreen(screen.stage, loan, sid), false);
    for (const b of screen.buttons.values()) assert.equal(b.getAttribute('aria-pressed'), 'false');
    assert.equal(screen.next.disabled, true);
  });

  t('returns false when the "N of M" changes (another section opened elsewhere) or the screen is another one', () => {
    const screen = fakeScreen(sections0, sid);
    const more = overlapSections(ans(['auto', 'home', 'health']));
    assert.equal(patchOverlapScreen(screen.stage, more, sid), false);
    assert.equal(patchOverlapScreen(screen.stage, sections0, 'ovl:deductible'), false);
    assert.equal(patchOverlapScreen(screen.stage, sections0, 'summary'), false);
  });

  t('returns false when the page does not hold an overlap screen, or a button is missing or extra', () => {
    assert.equal(patchOverlapScreen({ querySelector: () => null }, sections0, sid), false);
    const missing = fakeScreen(sections0, sid);
    missing.buttons.delete('auto_financing/loan');
    assert.equal(patchOverlapScreen(missing.stage, sections0, sid), false);
    const extra = fakeScreen(sections0, sid);
    extra.buttons.set('stray/x', fakeEl({ 'data-oq': 'stray', 'data-ov': 'x' }));
    assert.equal(patchOverlapScreen(extra.stage, sections0, sid), false);
  });
});

suite('focus helpers', (t) => {
  t('restoreFocus focuses the option button without scrolling, and reports whether it found one', () => {
    const btn = fakeEl();
    const stage = { querySelector: (sel) => (sel === 'button[data-oq="q"][data-ov="o"]' ? btn : null) };
    assert.equal(restoreFocus(stage, 'q', 'o'), true);
    assert.equal(btn.focused, 1);
    assert.deepEqual(btn.focusArgs, { preventScroll: true });
    assert.equal(restoreFocus(stage, 'q', 'gone'), false);
  });

  t('focusHeading focuses the element marked data-focus', () => {
    const h = fakeEl();
    const stage = { querySelector: (sel) => (sel === '[data-focus]' ? h : null) };
    assert.equal(focusHeading(stage), true);
    assert.equal(h.focused, 1);
    assert.equal(focusHeading({ querySelector: () => null }), false);
  });
});

// ---------------------------------------------------------------------------------------------------------
// copyText. A "thenable" that calls back at once stands in for the clipboard promise, so the tests stay synchronous.
// ---------------------------------------------------------------------------------------------------------
const resolved = { then(ok) { ok(); } };
const rejected = { then(ok, fail) { fail(new Error('denied')); } };

function fakeDoc({ execResult = true, throwOnExec = false, hasBody = true } = {}) {
  const log = { created: [], appended: 0, removed: 0, exec: [], selected: 0 };
  const active = fakeEl();
  const doc = {
    log,
    activeElement: active,
    execCommand(cmd) { log.exec.push(cmd); if (throwOnExec) throw new Error('no'); return execResult; },
    createElement(tag) {
      const ta = fakeEl();
      ta.tag = tag;
      ta.style = {};
      ta.select = () => { log.selected += 1; };
      ta.setSelectionRange = () => {};
      log.created.push(ta);
      return ta;
    },
    body: hasBody ? { appendChild() { log.appended += 1; }, } : null,
  };
  if (hasBody) doc.body.removeChild = () => { log.removed += 1; };
  doc.active = active;
  return doc;
}

suite('copyText', (t) => {
  const run = (text, env) => {
    const calls = [];
    copyText(text, env, (ok) => calls.push(ok));
    return calls;
  };

  t('uses navigator.clipboard.writeText when it is there, and reports success once', () => {
    const written = [];
    const nav = { clipboard: { writeText: (x) => { written.push(x); return resolved; } } };
    const doc = fakeDoc();
    assert.deepEqual(run('my list', { navigator: nav, document: doc }), [true]);
    assert.deepEqual(written, ['my list']);
    assert.equal(doc.log.created.length, 0, 'no textarea needed');
  });

  t('falls back to the textarea method when the clipboard API refuses', () => {
    const nav = { clipboard: { writeText: () => rejected } };
    const doc = fakeDoc();
    assert.deepEqual(run('my list', { navigator: nav, document: doc }), [true]);
    assert.deepEqual(doc.log.exec, ['copy']);
    assert.equal(doc.log.created[0].tag, 'textarea');
    assert.equal(doc.log.created[0].value, 'my list');
  });

  t('falls back when writeText throws, or when there is no clipboard API at all', () => {
    const doc1 = fakeDoc();
    assert.deepEqual(run('x', { navigator: { clipboard: { writeText() { throw new Error('blocked'); } } }, document: doc1 }), [true]);
    assert.deepEqual(doc1.log.exec, ['copy']);
    const doc2 = fakeDoc();
    assert.deepEqual(run('x', { navigator: {}, document: doc2 }), [true]);
    assert.deepEqual(doc2.log.exec, ['copy']);
    const doc3 = fakeDoc();
    assert.deepEqual(run('x', { document: doc3 }), [true]);
  });

  t('the textarea is hidden from assistive tech, selected, removed afterwards, and focus goes back where it was', () => {
    const doc = fakeDoc();
    run('x', { navigator: {}, document: doc });
    const ta = doc.log.created[0];
    assert.equal(ta.getAttribute('aria-hidden'), 'true');
    assert.equal(ta.getAttribute('readonly'), '');
    assert.equal(doc.log.selected, 1);
    assert.equal(doc.log.appended, 1);
    assert.equal(doc.log.removed, 1);
    assert.equal(doc.active.focused, 1, 'focus returned to the element that had it');
  });

  t('reports false when the fallback fails, throws, or cannot run', () => {
    assert.deepEqual(run('x', { navigator: {}, document: fakeDoc({ execResult: false }) }), [false]);
    const throwing = fakeDoc({ throwOnExec: true });
    assert.deepEqual(run('x', { navigator: {}, document: throwing }), [false]);
    assert.equal(throwing.log.removed, 1, 'the textarea is still removed');
    assert.deepEqual(run('x', { navigator: {}, document: fakeDoc({ hasBody: false }) }), [false]);
    assert.deepEqual(run('x', { navigator: {}, document: {} }), [false]);
    assert.deepEqual(run('x', {}), [false]);
    assert.deepEqual(run('x', undefined), [false]);
  });

  t('calls done exactly once even when the clipboard promise has no then()', () => {
    const nav = { clipboard: { writeText: () => undefined } };
    assert.deepEqual(run('x', { navigator: nav, document: fakeDoc() }), [true]);
  });

  t('the two status messages are plain, ASCII, and different', () => {
    for (const msg of [COPY_OK, COPY_FAILED]) assert.equal(/^[\x20-\x7e]+$/.test(msg), true);
    assert.notEqual(COPY_OK, COPY_FAILED);
    assert.match(COPY_OK, /^Copied/);
    assert.match(COPY_FAILED, /Print my list/);
  });
});

suite('printList', (t) => {
  t('opens the print dialog once', () => {
    let n = 0;
    printList({ print() { n += 1; } });
    assert.equal(n, 1);
  });
});

suite('dom.mjs: no storage, imports only its sibling', (t) => {
  const canRead = typeof read === 'function';
  t('the code uses no browser storage, network or timers', () => {
    if (!canRead) return;
    const code = codeOnly(read('public/js/overlap-ui/dom.mjs'), false);
    for (const word of ['localStorage', 'sessionStorage', 'indexedDB', 'fetch', 'XMLHttpRequest', 'setTimeout', 'setInterval']) assert.equal(code.includes(word), false, word);
    assert.equal(/document\.cookie/.test(code), false);
    // It reaches for no global DOM object: every element and browser object arrives as an argument.
    const found = findForbidden(code.replace(/\bdocument\b/g, '').replace(/\bnavigator\b/g, ''));
    assert.equal(found, null, found || '');
  });
  t('imports only ./screens.mjs', () => {
    if (!canRead) return;
    assert.deepEqual(importsOf(read('public/js/overlap-ui/dom.mjs')), ['./screens.mjs']);
  });
});
