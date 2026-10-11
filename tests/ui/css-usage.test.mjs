// Dead-CSS guard (Story R1, step B). The stylesheet was cut down to the rules the page can use; this keeps it that way.
//
// Every class and id that a selector in public/css/app.css names must be written somewhere the page's own code can
// produce it: public/index.html, public/js/app.js or a module under public/js/overlap-ui/ (found by following the imports
// from index.html, as the no-storage and analytics scans do), as a whole word in code or in a string (comments are
// ignored, so a class mentioned only in prose does not count). The catalog and engine under public/js/overlap/ are not
// searched: they are prose and data, and a class name that merely appears in a sentence there does not make it used.
//
// It is a text check, so it is deliberately a little generous: a class whose name is also an ordinary word used in some
// string will pass. What it cannot excuse is a rule whose class appears nowhere at all. Class names that the code builds
// by joining pieces ("stk-" plus a row kind) are listed in DYNAMIC with the reason; add to it only the same way.
// Runs under jsc (read() is guarded).
import { suite, assert } from '../harness.mjs';
import { importsOf, resolveSpec, codeOnly } from '../helpers/sourceScan.mjs';

const canRead = typeof read === 'function';

// Classes the code writes as pieces, so they never appear whole in a string.
const DYNAMIC = {
  'stk-umbrella': "rowHtml in stackView.mjs writes 'stk-row stk-' + row.kind, and the kind is 'umbrella'",
  'stk-layer': "rowHtml in stackView.mjs writes 'stk-row stk-' + row.kind, and the kind is 'layer'",
};

/** The selectors of a stylesheet's rules (comments removed), one entry per comma-separated selector. */
function selectorsOf(css) {
  // comments out, and an at-rule's prelude ("@media (max-width:480px){") out so only the rules inside it are read
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@[a-z-]+[^{;]*\{/g, '');
  const out = [];
  for (const m of plain.matchAll(/([^{};]+)\{/g)) {
    for (const s of m[1].split(',')) {
      const t = s.trim();
      if (t !== '' && !/^\d+%$|^from$|^to$/.test(t)) out.push(t);
    }
  }
  return out;
}

/** Class and id names a list of selectors mentions. */
function namesIn(selectors) {
  const classes = new Set();
  const ids = new Set();
  for (const sel of selectors) {
    for (const m of sel.matchAll(/\.([A-Za-z_][\w-]*)/g)) classes.add(m[1]);
    for (const m of sel.matchAll(/#([A-Za-z_][\w-]*)/g)) ids.add(m[1]);
  }
  return { classes, ids };
}

/** index.html plus every module reachable from the scripts it loads, without the catalog and engine (prose and data). */
function pageFiles() {
  const html = read('public/index.html');
  const files = ['public/index.html'];
  const queue = [];
  for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) queue.push(resolveSpec('public/index.html', m[1]));
  const seen = new Set();
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    if (path.indexOf('public/js/overlap/') === 0) continue;
    files.push(path);
    for (const spec of importsOf(read(path))) queue.push(resolveSpec(path, spec));
  }
  return files;
}

/** The text the page's own code and markup can produce, comments removed. */
function pageText() {
  return pageFiles().map((p) => (p.endsWith('.html') ? read(p).replace(/<!--[\s\S]*?-->/g, '') : codeOnly(read(p), true))).join('\n');
}

const has = (text, name) => new RegExp('(?<![\\w-])' + name.replace(/[-]/g, '\\-') + '(?![\\w-])').test(text);

suite('css: the selector scanner reads rules, not values or comments', (t) => {
  t('finds each comma-separated selector, including inside @media, and ignores comments and values', () => {
    const css = '/* .gone{} */ .a, .b .c{margin:.5em;transition:width .25s}\n@media (max-width:480px){.d{x:1}}\n#e>.f:hover{y:2}';
    assert.deepEqual(selectorsOf(css), ['.a', '.b .c', '.d', '#e>.f:hover']);
    const { classes, ids } = namesIn(selectorsOf(css));
    assert.deepEqual(Array.from(classes).sort(), ['a', 'b', 'c', 'd', 'f']);
    assert.deepEqual(Array.from(ids), ['e']);
  });

  t('the word test is whole-word and understands hyphens', () => {
    assert.equal(has('class="stk-row stk-x"', 'stk-row'), true);
    assert.equal(has('class="stk-rows"', 'stk-row'), false);
    assert.equal(has('class="pre-chip"', 'chip'), false);
    assert.equal(has("'chip' + ' sel'", 'sel'), true);
  });
});

suite('css: every class and id in the stylesheet has a user', (t) => {
  t('the walk reaches the shell, the page module and the UI modules', () => {
    if (!canRead) return;
    const files = pageFiles();
    for (const must of ['public/index.html', 'public/js/app.js', 'public/js/overlap-ui/screens.mjs', 'public/js/overlap-ui/stackView.mjs', 'public/js/overlap-ui/viewModel.mjs']) {
      assert.equal(files.includes(must), true, must);
    }
    assert.equal(files.some((p) => p.indexOf('public/js/overlap/') === 0), false, 'the catalog and engine are not searched');
  });

  t('no class or id selector names something the page cannot produce', () => {
    if (!canRead) return;
    const text = pageText();
    const { classes, ids } = namesIn(selectorsOf(read('public/css/app.css')));
    assert.equal(classes.size > 40, true, 'the scanner found ' + classes.size + ' classes; it is probably broken');
    const dead = [];
    for (const c of classes) if (!has(text, c) && !Object.prototype.hasOwnProperty.call(DYNAMIC, c)) dead.push('.' + c);
    for (const i of ids) if (!has(text, i)) dead.push('#' + i);
    assert.deepEqual(dead, [], 'dead CSS (delete the rule, or add the class to DYNAMIC with the reason): ' + dead.join(' '));
  });

  t('every class in DYNAMIC is still in the stylesheet, so the list cannot go stale', () => {
    if (!canRead) return;
    const { classes } = namesIn(selectorsOf(read('public/css/app.css')));
    for (const c of Object.keys(DYNAMIC)) assert.equal(classes.has(c), true, c + ' is in DYNAMIC but no rule uses it any more');
  });

  t('the rules of the retired prototype are gone: map, policy fields, toggles, totals, scan box, telemetry table, big answer buttons', () => {
    if (!canRead) return;
    const css = read('public/css/app.css');
    for (const gone of ['.usmap', '.policy-grid', '.fields', '.field ', '.toggle', '.totals', '.total', '.scanbox', '.scanned', '.opts', '.opt{', '.opt ', '.verdict', '.state{', '.tag.over', '.tag.ok', '.tag.info', '.tag.twice', '.tag.under']) {
      assert.equal(css.includes(gone), false, gone);
    }
    assert.equal(/(^|\n)(table|td|select|input\[type=number\])[{,\s]/.test(css), false, 'no element rules for the old tables and fields');
    assert.equal(/--(over|over-bg|ok-bg):/.test(css), false, 'no palette entries only the retired rules used');
  });
});
