import { suite, assert } from '../harness.mjs';
import { renderTemplate, resolveText, templateProblems } from '../../public/js/overlap/engine/render.mjs';
import { deepFreeze } from '../helpers/purity.mjs';

suite('render: renderTemplate', (t) => {
  t('returns a string with no tokens unchanged', () => {
    assert.equal(renderTemplate('Plain text, no tokens.', {}), 'Plain text, no tokens.');
    assert.equal(renderTemplate('', {}), '');
  });
  t('resolves a single token', () => {
    assert.equal(renderTemplate('Your limit is {{limit}}.', { limit: '$300,000' }), 'Your limit is $300,000.');
  });
  t('resolves several different tokens and repeated tokens', () => {
    assert.equal(
      renderTemplate('{{a}} and {{b}} and {{a}} again', { a: 'one', b: 'two' }),
      'one and two and one again',
    );
  });
  t('allows whitespace inside the braces', () => {
    assert.equal(renderTemplate('{{ limit }} / {{limit }}', { limit: 'X' }), 'X / X');
  });
  t('formats numbers with String()', () => {
    assert.equal(renderTemplate('{{n}} cars, {{z}} boats', { n: 3, z: 0 }), '3 cars, 0 boats');
  });
  t('treats an empty-string value as resolved', () => {
    assert.equal(renderTemplate('[{{x}}]', { x: '' }), '[]');
  });
  t('does not re-scan substituted values, and is safe with $ patterns', () => {
    assert.equal(renderTemplate('{{x}}', { x: '{{y}}' }), '{{y}}');
    assert.equal(renderTemplate('cost {{x}}', { x: '$& $1 $$' }), 'cost $& $1 $$');
  });
  t('works with frozen vars and does not mutate them', () => {
    const vars = deepFreeze({ a: 'A' });
    assert.equal(renderTemplate('{{a}}', vars), 'A');
    assert.deepEqual(vars, { a: 'A' });
  });
  t('vars may be omitted when the template has no tokens', () => {
    assert.equal(renderTemplate('no tokens'), 'no tokens');
    assert.equal(renderTemplate('no tokens', null), 'no tokens');
  });
});

suite('render: unresolved or malformed tokens throw', (t) => {
  t('missing variable', () => {
    assert.throws(() => renderTemplate('Hello {{name}}', {}), /Unresolved template token \{\{name\}\}/);
  });
  t('missing variable when vars is omitted', () => {
    assert.throws(() => renderTemplate('Hello {{name}}'), /Unresolved template token \{\{name\}\}/);
  });
  t('one unresolved among several resolved still throws', () => {
    assert.throws(() => renderTemplate('{{a}} {{b}}', { a: 'x' }), /\{\{b\}\}/);
  });
  t('undefined and null values count as unresolved', () => {
    assert.throws(() => renderTemplate('{{a}}', { a: undefined }), /Unresolved/);
    assert.throws(() => renderTemplate('{{a}}', { a: null }), /Unresolved/);
  });
  t('inherited object properties are not variables', () => {
    assert.throws(() => renderTemplate('{{toString}}', {}), /Unresolved/);
    assert.throws(() => renderTemplate('{{constructor}}', {}), /Unresolved/);
  });
  t('non string/number values are rejected', () => {
    assert.throws(() => renderTemplate('{{a}}', { a: true }), /must be a string or a number/);
    assert.throws(() => renderTemplate('{{a}}', { a: ['x'] }), /must be a string or a number/);
    assert.throws(() => renderTemplate('{{a}}', { a: NaN }), /must be a string or a number/);
    assert.throws(() => renderTemplate('{{a}}', { a: Infinity }), /must be a string or a number/);
  });
  t('malformed tokens', () => {
    assert.throws(() => renderTemplate('x {{}} y', {}), /Malformed template token/);
    assert.throws(() => renderTemplate('x {{a b}} y', { a: '1' }), /Malformed template token/);
    assert.throws(() => renderTemplate('x {{1a}} y', { '1a': '1' }), /Malformed template token/);
    assert.throws(() => renderTemplate('x {{a y', { a: '1' }), /Malformed template/);
    assert.throws(() => renderTemplate('x a}} y', { a: '1' }), /Malformed template/);
  });
  t('a non-string template is a TypeError', () => {
    assert.throws(() => renderTemplate(42, {}), /template must be a string/);
    assert.throws(() => renderTemplate(undefined, {}), /template must be a string/);
  });
});

suite('render: templateProblems', (t) => {
  t('returns no problems for clean text and for well-formed tokens', () => {
    assert.deepEqual(templateProblems('no tokens'), []);
    assert.deepEqual(templateProblems('a {{b}} c {{ d_1 }}'), []);
  });
  t('reports malformed and stray braces', () => {
    assert.equal(templateProblems('a {{}} b').length, 1);
    assert.equal(templateProblems('a {{b c}} b').length, 1);
    assert.equal(templateProblems('a {{b').length, 1);
    assert.equal(templateProblems('a b}}').length, 1);
  });
});

suite('render: resolveText', (t) => {
  const ctx = deepFreeze({ tag: 'ctx' });
  t('a string field is rendered with vars', () => {
    assert.equal(resolveText('Limit: {{l}}', ctx, { l: '1M' }), 'Limit: 1M');
  });
  t('a function field is called with (ctx, vars) and its result is rendered', () => {
    const f = (c, v) => `${c.tag} has {{l}} and ${v.l}`;
    assert.equal(resolveText(f, ctx, { l: '1M' }), 'ctx has 1M and 1M');
  });
  t('a function field may return plain text with no tokens', () => {
    assert.equal(resolveText(() => 'fixed', ctx, {}), 'fixed');
  });
  t('vars default to an empty object', () => {
    assert.equal(resolveText('x', ctx), 'x');
    assert.equal(resolveText((c, v) => `n=${Object.keys(v).length}`, ctx), 'n=0');
  });
  t('an unresolved token in a string field throws', () => {
    assert.throws(() => resolveText('{{missing}}', ctx, {}), /Unresolved template token \{\{missing\}\}/);
  });
  t('an unresolved token left in a function result throws', () => {
    assert.throws(() => resolveText(() => 'oops {{missing}}', ctx, {}), /Unresolved template token \{\{missing\}\}/);
  });
  t('a function that returns a non-string throws', () => {
    assert.throws(() => resolveText(() => 5, ctx, {}), /string or a function that returns a string/);
    assert.throws(() => resolveText(() => undefined, ctx, {}), /string or a function that returns a string/);
  });
  t('a field that is neither string nor function throws', () => {
    assert.throws(() => resolveText(5, ctx, {}), /string or a function that returns a string/);
    assert.throws(() => resolveText(null, ctx, {}), /string or a function that returns a string/);
    assert.throws(() => resolveText({}, ctx, {}), /string or a function that returns a string/);
  });
});
