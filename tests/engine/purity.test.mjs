// Source scan: the pure core under public/js/overlap/ must not touch the DOM, Node APIs, or the
// globals missing from macOS jsc (URL, console, setTimeout, structuredClone, fetch), nor anything
// nondeterministic (Date, Math.random, Intl). Runs only where jsc's read() exists.
import { suite, assert } from '../harness.mjs';

const ROOT = 'public/js/overlap/';
const ENGINE = ['adapter', 'conditions', 'constants', 'evaluate', 'liabilityStack', 'render', 'session', 'util', 'validate'].map((n) => `${ROOT}engine/${n}.mjs`);

const FORBIDDEN = /\b(window|document|navigator|location|localStorage|sessionStorage|indexedDB|process|require|Buffer|URL|URLSearchParams|console|setTimeout|setInterval|setImmediate|queueMicrotask|structuredClone|fetch|XMLHttpRequest|globalThis|Intl|Date|performance|eval|Function)\b|Math\.random|import\s*\(/;

// Removes comments, and (unless keepStrings) the contents of string/template literals, so that prose
// and URLs inside strings are not mistaken for code. Handles ${...} inside template literals.
function codeOnly(src, keepStrings) {
  let out = '';
  const modes = [];  // 'tpl' | 'expr'
  const depths = []; // brace depth for each 'expr'
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    const mode = modes[modes.length - 1];
    if (mode === 'tpl') {
      if (c === '\\') { if (keepStrings) out += c + (d || ''); i += 2; continue; }
      if (c === '`') { modes.pop(); out += '`'; i++; continue; }
      if (c === '$' && d === '{') { modes.push('expr'); depths.push(0); out += '${'; i += 2; continue; }
      if (keepStrings) out += c;
      i++;
      continue;
    }
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === "'" || c === '"') {
      out += c;
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') { if (keepStrings) out += src[i] + (src[i + 1] || ''); i += 2; continue; }
        if (keepStrings) out += src[i];
        i++;
      }
      out += c;
      i++;
      continue;
    }
    if (c === '`') { modes.push('tpl'); out += '`'; i++; continue; }
    if (mode === 'expr') {
      if (c === '{') depths[depths.length - 1]++;
      else if (c === '}') {
        if (depths[depths.length - 1] === 0) { modes.pop(); depths.pop(); out += '}'; i++; continue; }
        depths[depths.length - 1]--;
      }
    }
    out += c;
    i++;
  }
  return out;
}

function importsOf(src) {
  const code = codeOnly(src, true);
  const specs = [];
  const re = /(?:^|[\s;])(?:import|export)\b[^;'"`]*?\bfrom\s*(['"])([^'"]+)\1|(?:^|[\s;])import\s*(['"])([^'"]+)\3/g;
  let m;
  while ((m = re.exec(code)) !== null) specs.push(m[2] || m[4]);
  return specs;
}

function resolve(fromFile, spec) {
  const parts = fromFile.split('/').slice(0, -1);
  for (const seg of spec.split('/')) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') parts.pop(); else parts.push(seg);
  }
  return parts.join('/');
}

// Every file reachable from the engine modules and the default catalog through relative imports.
function collect() {
  const seen = {};
  const order = [];
  const queue = [...ENGINE, `${ROOT}data/catalog.mjs`];
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen[file]) continue;
    seen[file] = read(file);
    order.push(file);
    for (const spec of importsOf(seen[file])) {
      if (spec.startsWith('.')) queue.push(resolve(file, spec));
    }
  }
  return { files: order, sources: seen };
}

const canRead = typeof read === 'function';

suite('purity: source scan of the pure core', (t) => {
  t('the scanner itself strips comments and string contents but keeps code', () => {
    const code = codeOnly("const a = 'document'; // window\n/* fetch */ const b = `x ${console} y`; const c = \"URL\";", false);
    assert.equal(/document|window|fetch|URL/.test(code), false);
    assert.equal(/console/.test(code), true, 'code inside ${} is still scanned');
    assert.deepEqual(importsOf("import { a } from './a.mjs';\nexport { b } from '../b.mjs';\nimport './c.mjs';\n// import x from './no.mjs'\n"), ['./a.mjs', '../b.mjs', './c.mjs']);
  });

  t('the module graph is discovered (engine files plus whatever the catalog imports)', () => {
    if (!canRead) return;
    const { files } = collect();
    for (const f of ENGINE) assert.includes(files, f);
    assert.includes(files, `${ROOT}data/catalog.mjs`);
    assert.includes(files, `${ROOT}data/flags/index.mjs`);
    assert.includes(files, `${ROOT}data/questions/index.mjs`);
    assert.includes(files, `${ROOT}data/sources.mjs`);
    assert.includes(files, `${ROOT}data/cards.mjs`);
    assert.equal(files.filter((f) => f.startsWith(`${ROOT}data/flags/`)).length >= 10, true, 'index + nine domain files');
  });

  t('no forbidden globals or nondeterminism in any pure module', () => {
    if (!canRead) return;
    const { files, sources } = collect();
    for (const f of files) {
      const code = codeOnly(sources[f], false);
      const m = FORBIDDEN.exec(code);
      assert.equal(m, null, `${f} uses forbidden "${m && m[0]}"`);
    }
  });

  t('imports are relative .mjs modules inside public/js/overlap/ (no bare, remote, or JSON imports)', () => {
    if (!canRead) return;
    const { files, sources } = collect();
    for (const f of files) {
      for (const spec of importsOf(sources[f])) {
        assert.equal(spec.startsWith('./') || spec.startsWith('../'), true, `${f} imports "${spec}" (must be relative)`);
        assert.equal(spec.endsWith('.mjs'), true, `${f} imports "${spec}" (must be an .mjs module)`);
        assert.equal(resolve(f, spec).startsWith(ROOT), true, `${f} imports "${spec}" outside ${ROOT}`);
      }
    }
  });

  t('no module imports from tests/ or from the host app', () => {
    if (!canRead) return;
    const { files, sources } = collect();
    for (const f of files) {
      for (const spec of importsOf(sources[f])) {
        assert.equal(/tests|app\.js|overlap-ui/.test(spec), false, `${f} imports "${spec}"`);
      }
    }
  });
});
