// Tiny dependency-free test harness. Runs unchanged under macOS jsc, Node, and browsers.
// Tests are synchronous. Usage:
//   import { test, assert } from './harness.mjs';
//   test('adds', () => { assert.equal(1 + 1, 2); });
const log = typeof print === 'function' ? print : (...a) => console.log(...a);
const registry = [];
let currentFile = '';

export function test(name, fn) { registry.push({ name, fn }); }
export function suite(name, fn) { fn((n, f) => test(`${name} > ${n}`, f)); }

function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = stable(v[k]);
    return o;
  }
  return v;
}
export function serialize(v) { return JSON.stringify(stable(v), null, 2); }

function fail(msg, extra) { throw new Error(extra === undefined ? msg : `${msg}\n${extra}`); }

export const assert = {
  ok(v, msg = 'expected truthy') { if (!v) fail(msg); },
  equal(a, b, msg = '') { if (a !== b) fail(`${msg} expected ${serialize(b)} but got ${serialize(a)}`.trim()); },
  notEqual(a, b, msg = '') { if (a === b) fail(`${msg} expected values to differ: ${serialize(a)}`.trim()); },
  deepEqual(a, b, msg = '') {
    const x = serialize(a), y = serialize(b);
    if (x !== y) fail(`${msg} deepEqual failed`.trim(), `--- expected\n${y}\n--- actual\n${x}`);
  },
  includes(haystack, needle, msg = '') {
    const ok = typeof haystack === 'string' ? haystack.includes(needle) : Array.isArray(haystack) && haystack.includes(needle);
    if (!ok) fail(`${msg} expected ${serialize(haystack)} to include ${serialize(needle)}`.trim());
  },
  match(str, re, msg = '') { if (!re.test(str)) fail(`${msg} expected ${JSON.stringify(str)} to match ${re}`.trim()); },
  throws(fn, re, msg = '') {
    let err = null;
    try { fn(); } catch (e) { err = e; }
    if (!err) fail(`${msg} expected function to throw`.trim());
    if (re && !re.test(String(err && err.message))) fail(`${msg} threw ${JSON.stringify(String(err.message))}, expected match ${re}`.trim());
  },
  fail(msg = 'explicit failure') { fail(msg); },
};

// Snapshot helper: compares against a module-exported expected value. Snapshots live in
// tests/snapshots/*.snap.mjs as `export default <JSON>`; regenerate with scripts/update-snapshots.sh.
export function assertSnapshot(actual, expected, label = 'snapshot') {
  const x = serialize(actual), y = serialize(expected);
  if (x !== y) fail(`${label} mismatch`, `--- expected\n${y}\n--- actual\n${x}`);
}

export function runAll() {
  let passed = 0, failed = 0;
  const failures = [];
  for (const t of registry) {
    try { t.fn(); passed++; }
    catch (e) { failed++; failures.push({ name: t.name, message: String(e && e.message ? e.message : e) }); }
  }
  for (const f of failures) log(`FAIL  ${f.name}\n      ${f.message.split('\n').join('\n      ')}`);
  log(`${passed} passed, ${failed} failed, ${registry.length} total`);
  if (failed) { log('RESULT: FAILED'); throw new Error(`${failed} test(s) failed`); }
  log('RESULT: PASS');
}
