// Source scan (Story S13): the app uses no browser storage. Answers live in memory only (ARCHITECTURE
// "Principles"; handoff principle 1 and 2), so none of localStorage, sessionStorage, indexedDB or
// document.cookie may appear anywhere the page loads from.
//
// The files scanned are the ones the page really loads: public/index.html, the script it names, and every
// module reachable from it through static imports (so a new file is covered as soon as something imports it).
// The text is scanned raw, comments included, on purpose: a comment that mentions one of these is a signal
// to reword it ("browser storage") rather than a gap in the check. Runs under jsc (read() is guarded).
import { suite, assert } from '../harness.mjs';
import { importsOf, resolveSpec } from '../helpers/sourceScan.mjs';

const canRead = typeof read === 'function';
const FORBIDDEN = /localStorage|sessionStorage|indexedDB|document\.cookie/;
const FORBIDDEN_NAMES = ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie'];

/** First forbidden storage word in `text`, or null. */
function storageUse(text) {
  const m = FORBIDDEN.exec(text);
  return m ? m[0] : null;
}

/** public/index.html plus every module reachable from the scripts it loads, as repo-relative paths. */
function loadedFiles() {
  const html = read('public/index.html');
  const files = ['public/index.html'];
  const queue = [];
  for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) queue.push(resolveSpec('public/index.html', m[1]));
  const seen = new Set();
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    files.push(path);
    for (const spec of importsOf(read(path))) queue.push(resolveSpec(path, spec));
  }
  return files;
}

suite('no browser storage (source scan)', (t) => {
  t('the scanner catches each forbidden API and ignores look-alikes', () => {
    for (const name of FORBIDDEN_NAMES) assert.equal(storageUse(`const x = ${name}.get('a');`), name);
    assert.equal(storageUse('window.localStorage.setItem("a", "b")'), 'localStorage');
    assert.equal(storageUse('indexedDB.open("x")'), 'indexedDB');
    assert.equal(storageUse('const cookie = 1; // a cookie banner; storage of nothing'), null);
  });

  t('the page loads app.js and the overlap modules, so the scan below covers them', () => {
    if (!canRead) return;
    const files = loadedFiles();
    for (const must of [
      'public/index.html', 'public/js/app.js', 'public/js/overlap-ui/viewModel.mjs', 'public/js/overlap-ui/screens.mjs',
      'public/js/overlap-ui/dom.mjs', 'public/js/overlap/data/catalog.mjs', 'public/js/overlap/engine/evaluate.mjs',
    ]) assert.equal(files.includes(must), true, `${must} is reached from index.html`);
    assert.equal(files.length > 30, true, `only ${files.length} files reached; the import walk is broken`);
    assert.equal(new Set(files).size, files.length, 'each file once');
  });

  t('none of localStorage, sessionStorage, indexedDB or document.cookie appears in index.html or any module it loads', () => {
    if (!canRead) return;
    for (const path of loadedFiles()) {
      const found = storageUse(read(path));
      assert.equal(found, null, `${path} mentions ${found}`);
    }
  });

  t('the same holds for every JavaScript file the overlap work adds under public/js (named explicitly, in case one is not imported yet)', () => {
    if (!canRead) return;
    for (const path of ['public/js/app.js', 'public/js/overlap-ui/viewModel.mjs', 'public/js/overlap-ui/screens.mjs', 'public/js/overlap-ui/dom.mjs']) {
      const found = storageUse(read(path));
      assert.equal(found, null, `${path} mentions ${found}`);
    }
  });

  t('the page never writes to the URL either: no history or location writes in the app or the overlap UI', () => {
    if (!canRead) return;
    for (const path of ['public/js/app.js', 'public/js/overlap-ui/viewModel.mjs', 'public/js/overlap-ui/screens.mjs', 'public/js/overlap-ui/dom.mjs']) {
      const text = read(path);
      assert.equal(/history\.(pushState|replaceState)|location\.(hash|search|href)\s*=|location\.(assign|replace)\(/.test(text), false, path);
    }
  });
});
