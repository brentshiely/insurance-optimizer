// Helpers for tests that scan a module's source text for forbidden globals and non-relative imports.
// Not a *.test.mjs file, so scripts/test.sh does not run it directly. (tests/engine/purity.test.mjs keeps its
// own copy of the same scanner for the engine graph; this one serves the UI view-model tests.)

/** Globals and APIs a pure module must not touch: DOM, Node, storage, timers, network, nondeterminism. */
export const FORBIDDEN_GLOBALS = /\b(window|document|navigator|location|history|localStorage|sessionStorage|indexedDB|process|require|Buffer|URL|URLSearchParams|console|setTimeout|setInterval|setImmediate|queueMicrotask|requestAnimationFrame|structuredClone|fetch|XMLHttpRequest|globalThis|Intl|Date|performance|eval|Function)\b|Math\.random|import\s*\(/;

/** Browser dialogs, matched only as calls (so a property such as `question.prompt` is not mistaken for window.prompt). */
export const DIALOG_CALLS = /(^|[^.\w$])(alert|confirm|prompt)\s*\(/;

/** The first forbidden thing in already-stripped code (see codeOnly), or null. */
export function findForbidden(code) {
  const m = FORBIDDEN_GLOBALS.exec(code) || DIALOG_CALLS.exec(code);
  return m ? (m[2] || m[0]).trim() : null;
}

/**
 * Removes comments and (unless keepStrings) the contents of string and template literals, so that prose
 * and URLs inside strings are not mistaken for code. Code inside ${...} of a template literal is kept.
 */
export function codeOnly(src, keepStrings) {
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

/** Module specifiers a source file imports or re-exports from (static forms only). */
export function importsOf(src) {
  const code = codeOnly(src, true);
  const specs = [];
  const re = /(?:^|[\s;])(?:import|export)\b[^;'"`]*?\bfrom\s*(['"])([^'"]+)\1|(?:^|[\s;])import\s*(['"])([^'"]+)\3/g;
  let m;
  while ((m = re.exec(code)) !== null) specs.push(m[2] || m[4]);
  return specs;
}

/** Resolves a relative specifier against the file that imports it; returns a path with no dot segments. */
export function resolveSpec(fromFile, spec) {
  const parts = fromFile.split('/').slice(0, -1);
  for (const seg of spec.split('/')) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') parts.pop(); else parts.push(seg);
  }
  return parts.join('/');
}
