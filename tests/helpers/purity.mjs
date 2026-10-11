// Test helpers for proving functions are pure: freeze inputs deeply, copy fixtures, spy on reads.
// Not a *.test.mjs file, so scripts/test.sh does not run it directly.

/** Deep-freezes plain data in place (functions are left alone) and returns it. */
export function deepFreeze(v) {
  if (v !== null && typeof v === 'object') {
    for (const k of Object.keys(v)) deepFreeze(v[k]);
    Object.freeze(v);
  }
  return v;
}

/** Deep copy of plain data; functions are kept by reference (catalog flags hold functions). */
export function copy(v) {
  if (Array.isArray(v)) return v.map(copy);
  if (v !== null && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = copy(v[k]);
    return o;
  }
  return v;
}

/**
 * Wraps an object in a Proxy that records every property key read from it (and from nested objects,
 * under dotted paths) into `log`. Used to prove a view-model reads only the answers it is allowed to.
 */
export function recordReads(obj, log, path = '') {
  if (obj === null || typeof obj !== 'object') return obj;
  return new Proxy(obj, {
    get(target, key, receiver) {
      if (typeof key === 'symbol') return Reflect.get(target, key, receiver);
      const full = path ? `${path}.${key}` : key;
      log.push(full);
      return recordReads(Reflect.get(target, key, receiver), log, full);
    },
    has(target, key) {
      if (typeof key !== 'symbol') log.push(path ? `${path}.${key}` : key);
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      log.push(`${path || '<root>'}#keys`);
      return Reflect.ownKeys(target);
    },
  });
}
