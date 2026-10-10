// Text rendering for flag copy. Pure.
//
// Flag text fields are strings, or functions (ctx, vars) => string. Strings may contain
// {{name}} tokens that are filled from `vars`. An unresolved or malformed token is an error,
// never silently left in the output.
import { hasOwn, describe } from './util.mjs';

const TOKEN = /\{\{([^{}]*)\}\}/g;
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Lists syntax problems in a template (malformed tokens, stray braces). Does not look at vars. */
export function templateProblems(str) {
  const problems = [];
  const re = new RegExp(TOKEN.source, 'g');
  let m;
  while ((m = re.exec(str)) !== null) {
    if (!NAME.test(m[1].trim())) problems.push(`malformed template token "${m[0]}"`);
  }
  const leftover = str.replace(new RegExp(TOKEN.source, 'g'), '');
  if (leftover.includes('{{') || leftover.includes('}}')) problems.push('stray "{{" or "}}" in template');
  return problems;
}

/** Replaces {{name}} tokens using `vars` (own properties; strings or finite numbers). Throws on any problem. */
export function renderTemplate(str, vars) {
  if (typeof str !== 'string') throw new TypeError(`template must be a string, got ${describe(str)}`);
  const v = vars === undefined || vars === null ? {} : vars;
  const problems = templateProblems(str);
  if (problems.length > 0) throw new Error(`Malformed template token in ${describe(str)}: ${problems.join('; ')}`);
  return str.replace(new RegExp(TOKEN.source, 'g'), (whole, inner) => {
    const name = inner.trim();
    if (!hasOwn(v, name) || v[name] === undefined || v[name] === null) {
      throw new Error(`Unresolved template token {{${name}}} in ${describe(str)}`);
    }
    const value = v[name];
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    throw new Error(`Template variable "${name}" must be a string or a number, got ${describe(value)}`);
  });
}

/**
 * Resolves a flag text field. `field` is a string or a function (ctx, vars) => string; either way the
 * final text is passed through renderTemplate, so a token left in a function's output is also an error.
 */
export function resolveText(field, ctx, vars) {
  const v = vars === undefined || vars === null ? {} : vars;
  const raw = typeof field === 'function' ? field(ctx, v) : field;
  if (typeof raw !== 'string') {
    throw new TypeError(`Text must be a string or a function that returns a string, got ${describe(raw)}`);
  }
  return renderTemplate(raw, v);
}
