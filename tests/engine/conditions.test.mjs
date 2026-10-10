import { test, suite, assert } from '../harness.mjs';
import { evaluateCondition, checkCondition, conditionRefs } from '../../public/js/overlap/engine/conditions.mjs';
import { deepFreeze } from '../helpers/purity.mjs';

const env = (answers) => ({ answers });
const ANSWERS = {
  policies: ['auto', 'home', 'umbrella'],
  auto_limit: '250_500',
  extras: ['accident', 'cancer'],
  other: 'not_sure',
};

suite('conditions: every form', (t) => {
  t('holds: true when the derived policies include the id', () => {
    assert.equal(evaluateCondition({ holds: 'auto' }, env(ANSWERS)), true);
  });
  t('holds: false when absent, and false when policies is missing', () => {
    assert.equal(evaluateCondition({ holds: 'boat' }, env(ANSWERS)), false);
    assert.equal(evaluateCondition({ holds: 'auto' }, env({})), false);
    assert.equal(evaluateCondition({ holds: 'auto' }, env({ policies: 'auto' })), false);
  });
  t('answered: true for a single answer, a multi answer and not_sure', () => {
    assert.equal(evaluateCondition({ answered: 'auto_limit' }, env(ANSWERS)), true);
    assert.equal(evaluateCondition({ answered: 'extras' }, env(ANSWERS)), true);
    assert.equal(evaluateCondition({ answered: 'other' }, env(ANSWERS)), true);
  });
  t('answered: false for absent, undefined, null and empty array', () => {
    assert.equal(evaluateCondition({ answered: 'nope' }, env(ANSWERS)), false);
    assert.equal(evaluateCondition({ answered: 'x' }, env({ x: undefined })), false);
    assert.equal(evaluateCondition({ answered: 'x' }, env({ x: null })), false);
    assert.equal(evaluateCondition({ answered: 'x' }, env({ x: [] })), false);
  });
  t('answered: inherited object keys never count as answers', () => {
    assert.equal(evaluateCondition({ answered: 'constructor' }, env({})), false);
    assert.equal(evaluateCondition({ answered: 'toString' }, env({})), false);
  });
  t('answer is: matches a single answer only', () => {
    assert.equal(evaluateCondition({ answer: 'auto_limit', is: '250_500' }, env(ANSWERS)), true);
    assert.equal(evaluateCondition({ answer: 'auto_limit', is: '100_300' }, env(ANSWERS)), false);
    assert.equal(evaluateCondition({ answer: 'missing', is: '100_300' }, env(ANSWERS)), false);
    assert.equal(evaluateCondition({ answer: 'extras', is: 'accident' }, env(ANSWERS)), false, 'multi answer is not "is"');
  });
  t('answer is: can match not_sure', () => {
    assert.equal(evaluateCondition({ answer: 'other', is: 'not_sure' }, env(ANSWERS)), true);
  });
  t('answer in: any-of for a single answer', () => {
    assert.equal(evaluateCondition({ answer: 'auto_limit', in: ['100_300', '250_500'] }, env(ANSWERS)), true);
    assert.equal(evaluateCondition({ answer: 'auto_limit', in: ['100_300', '500_500'] }, env(ANSWERS)), false);
    assert.equal(evaluateCondition({ answer: 'missing', in: ['a'] }, env(ANSWERS)), false);
    assert.equal(evaluateCondition({ answer: 'extras', in: ['accident'] }, env(ANSWERS)), false, 'multi answer is not "in"');
  });
  t('answer includes: membership in a multi answer only', () => {
    assert.equal(evaluateCondition({ answer: 'extras', includes: 'cancer' }, env(ANSWERS)), true);
    assert.equal(evaluateCondition({ answer: 'extras', includes: 'hospital' }, env(ANSWERS)), false);
    assert.equal(evaluateCondition({ answer: 'missing', includes: 'x' }, env(ANSWERS)), false);
    assert.equal(evaluateCondition({ answer: 'auto_limit', includes: '250_500' }, env(ANSWERS)), false, 'single answer is not "includes"');
  });
  t('all: true only when every child is true', () => {
    assert.equal(evaluateCondition({ all: [{ holds: 'auto' }, { holds: 'home' }] }, env(ANSWERS)), true);
    assert.equal(evaluateCondition({ all: [{ holds: 'auto' }, { holds: 'boat' }] }, env(ANSWERS)), false);
  });
  t('any: true when at least one child is true', () => {
    assert.equal(evaluateCondition({ any: [{ holds: 'boat' }, { holds: 'home' }] }, env(ANSWERS)), true);
    assert.equal(evaluateCondition({ any: [{ holds: 'boat' }, { holds: 'travel' }] }, env(ANSWERS)), false);
  });
  t('not: negates', () => {
    assert.equal(evaluateCondition({ not: { holds: 'boat' } }, env(ANSWERS)), true);
    assert.equal(evaluateCondition({ not: { holds: 'auto' } }, env(ANSWERS)), false);
    assert.equal(evaluateCondition({ not: { answered: 'missing' } }, env(ANSWERS)), true);
  });
  t('nested all/any/not compose', () => {
    const cond = {
      all: [
        { holds: 'umbrella' },
        { any: [{ answer: 'auto_limit', is: '100_300' }, { not: { answer: 'extras', includes: 'hospital' } }] },
        { not: { all: [{ holds: 'boat' }, { holds: 'travel' }] } },
      ],
    };
    assert.equal(evaluateCondition(cond, env(ANSWERS)), true);
    assert.equal(evaluateCondition({ not: cond }, env(ANSWERS)), false);
    assert.equal(evaluateCondition({ all: [cond, { holds: 'boat' }] }, env(ANSWERS)), false);
  });
  t('always returns a real boolean', () => {
    assert.equal(typeof evaluateCondition({ holds: 'auto' }, env(ANSWERS)), 'boolean');
    assert.equal(typeof evaluateCondition({ answer: 'x', is: 'y' }, env({})), 'boolean');
    assert.equal(typeof evaluateCondition({ answered: 'x' }, env({})), 'boolean');
  });
});

suite('conditions: malformed conditions throw clear errors', (t) => {
  const bad = (label, cond, re) => t(label, () => {
    assert.throws(() => evaluateCondition(cond, env(ANSWERS)), re);
  });
  bad('null', null, /must be an object/);
  bad('undefined', undefined, /must be an object/);
  bad('string', 'holds', /must be an object/);
  bad('array', [{ holds: 'auto' }], /must be an object/);
  bad('number', 5, /must be an object/);
  bad('empty object', {}, /empty condition/);
  bad('unknown form', { owns: 'auto' }, /unknown condition form/);
  bad('holds with a non-string', { holds: 5 }, /holds.*non-empty string/);
  bad('holds with an empty string', { holds: '' }, /holds.*non-empty string/);
  bad('answered with a non-string', { answered: ['a'] }, /answered.*non-empty string/);
  bad('answer with none of is/in/includes', { answer: 'q' }, /exactly one of "is", "in", "includes"/);
  bad('answer with two of is/in/includes', { answer: 'q', is: 'a', in: ['a'] }, /exactly one of "is", "in", "includes"/);
  bad('answer with a non-string qid', { answer: 7, is: 'a' }, /answer.*non-empty string/);
  bad('is with a non-string', { answer: 'q', is: 3 }, /"is".*non-empty string/);
  bad('in with a non-array', { answer: 'q', in: 'a' }, /"in".*non-empty array of strings/);
  bad('in with an empty array', { answer: 'q', in: [] }, /"in".*non-empty array of strings/);
  bad('in with a non-string member', { answer: 'q', in: ['a', 2] }, /"in".*non-empty array of strings/);
  bad('includes with a non-string', { answer: 'q', includes: ['a'] }, /"includes".*non-empty string/);
  bad('extra key beside holds', { holds: 'auto', foo: 1 }, /unexpected key "foo"/);
  bad('two forms at once', { holds: 'auto', answered: 'q' }, /unexpected key "answered"/);
  bad('answer with an unexpected key', { answer: 'q', is: 'a', then: 'b' }, /unexpected key "then"/);
  bad('all with a non-array', { all: { holds: 'auto' } }, /all.*non-empty array/);
  bad('all with an empty array', { all: [] }, /all.*non-empty array/);
  bad('any with an empty array', { any: [] }, /any.*non-empty array/);
  bad('not with an invalid child', { not: null }, /must be an object/);
  bad('a bad child deep inside names its path', { all: [{ holds: 'auto' }, { any: [{ holds: 'home' }, { answer: 'q' }] }] }, /\$\.all\[1\]\.any\[1\]/);
  bad('a bad later child is reported even when an earlier child short-circuits', { any: [{ holds: 'auto' }, { holds: 5 }] }, /holds.*non-empty string/);
  bad('a bad later child is reported even when an earlier child is false', { all: [{ holds: 'boat' }, { holds: 5 }] }, /holds.*non-empty string/);

  t('the error message includes the offending condition', () => {
    assert.throws(() => evaluateCondition({ answer: 'q' }, env({})), /\{"answer":"q"\}/);
  });
  t('env without an answers object throws', () => {
    assert.throws(() => evaluateCondition({ holds: 'auto' }, undefined), /env\.answers/);
    assert.throws(() => evaluateCondition({ holds: 'auto' }, {}), /env\.answers/);
    assert.throws(() => evaluateCondition({ holds: 'auto' }, { answers: [] }), /env\.answers/);
  });
});

suite('conditions: checkCondition and conditionRefs', (t) => {
  t('checkCondition returns no errors for valid conditions', () => {
    assert.deepEqual(checkCondition({ all: [{ holds: 'a' }, { not: { answer: 'q', includes: 'x' } }] }), []);
  });
  t('checkCondition reports every problem, not just the first', () => {
    const errors = checkCondition({ all: [{ holds: 5 }, { answer: 'q' }, {}] });
    assert.equal(errors.length, 3);
  });
  t('conditionRefs lists answer references with option ids and holds references', () => {
    const refs = conditionRefs({
      all: [
        { holds: 'umbrella' },
        { answer: 'a', is: 'x' },
        { any: [{ answer: 'b', in: ['y', 'z'] }, { not: { answer: 'c', includes: 'w' } }, { answered: 'd' }] },
      ],
    });
    assert.deepEqual(refs.holds, ['umbrella']);
    assert.deepEqual(refs.answers, [
      { qid: 'a', form: 'is', optionIds: ['x'] },
      { qid: 'b', form: 'in', optionIds: ['y', 'z'] },
      { qid: 'c', form: 'includes', optionIds: ['w'] },
      { qid: 'd', form: 'answered', optionIds: [] },
    ]);
  });
  t('does not mutate frozen conditions or answers', () => {
    const cond = deepFreeze({ all: [{ holds: 'auto' }, { answer: 'auto_limit', in: ['250_500'] }] });
    const answers = deepFreeze({ policies: ['auto'], auto_limit: '250_500' });
    assert.equal(evaluateCondition(cond, { answers }), true);
    assert.deepEqual(checkCondition(cond), []);
    conditionRefs(cond);
  });
});
