// Small pure helpers shared by the engine modules. No DOM, no Node APIs.

export function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/** Deep copy of plain JSON-like data. Functions are kept by reference. */
export function clonePlain(v) {
  if (Array.isArray(v)) return v.map(clonePlain);
  if (isPlainObject(v)) {
    const out = {};
    for (const k of Object.keys(v)) out[k] = clonePlain(v[k]);
    return out;
  }
  return v;
}

/** Freezes plain data in place and returns it. Functions are left alone. */
export function deepFreeze(v) {
  if (Array.isArray(v) || isPlainObject(v)) {
    for (const k of Object.keys(v)) deepFreeze(v[k]);
    Object.freeze(v);
  }
  return v;
}

/** Locale-independent string comparison (code-unit order) so sorting is identical everywhere. */
export function compareStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Short, safe rendering of a value for error messages. */
export function describe(v) {
  let s;
  if (typeof v === 'function') s = '[function]';
  else if (v === undefined) s = 'undefined';
  else {
    try { s = JSON.stringify(v); } catch (e) { s = String(v); }
    if (s === undefined) s = String(v);
  }
  return s.length > 120 ? `${s.slice(0, 117)}...` : s;
}

const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const OPTION_SNAKE = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/** Question ids: snake_case starting with a letter. */
export const isSnakeId = (s) => typeof s === 'string' && SNAKE.test(s);
/** Option ids: snake_case, may start with a digit (e.g. "250_500", "1m"). */
export const isOptionId = (s) => typeof s === 'string' && OPTION_SNAKE.test(s);
/** Flag, source and card ids: kebab-case starting with a letter. */
export const isKebabId = (s) => typeof s === 'string' && KEBAB.test(s);
