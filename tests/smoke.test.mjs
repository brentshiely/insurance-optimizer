import { test, assert } from './harness.mjs';

test('harness: assertions behave', () => {
  assert.equal(1 + 1, 2);
  assert.deepEqual({ b: 2, a: 1 }, { a: 1, b: 2 });
  assert.throws(() => { throw new Error('boom'); }, /boom/);
});

test('runtime: ES2022 features available in the shared runtime', () => {
  assert.equal([1, 2, 3].at(-1), 3);
  assert.equal(Object.hasOwn({ a: 1 }, 'a'), true);
  assert.equal('a-b'.replaceAll('-', '+'), 'a+b');
  class A { #x = 1; get x() { return this.#x; } }
  assert.equal(new A().x, 1);
});
