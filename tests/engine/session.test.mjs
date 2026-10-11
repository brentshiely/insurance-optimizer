import { suite, assert } from '../harness.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import FIXTURE, { POLICIES_QUESTION } from '../fixtures/catalog.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';

const session = () => createSession(FIXTURE);
const ids = (qs) => qs.map((q) => q.id);

suite('session: not_sure is appended automatically', (t) => {
  t('single question with allowNotSure gets a trailing not_sure option', () => {
    const q = session().getQuestion('umbrella_limit');
    assert.deepEqual(q.options.map((o) => o.id), ['1m', '2m', '5m', 'not_sure']);
    assert.deepEqual(q.options[3], { id: 'not_sure', label: 'Not sure' });
  });
  t('multi question gets an exclusive not_sure option', () => {
    const q = session().getQuestion('supplements');
    const last = q.options[q.options.length - 1];
    assert.deepEqual(last, { id: 'not_sure', label: 'Not sure', exclusive: true });
  });
  t('no not_sure when allowNotSure is false or absent', () => {
    assert.equal(session().getQuestion('umbrella_um_detail').options.some((o) => o.id === 'not_sure'), false);
    assert.equal(session().getQuestion('cards').options.some((o) => o.id === 'not_sure'), false);
    const bare = createSession({ questions: [{ id: 'q', domain: 'core', section: 's', type: 'single', prompt: 'p', options: [{ id: 'a', label: 'A' }], showIf: null }] });
    assert.equal(bare.getQuestion('q').options.length, 1);
  });
  t('does not duplicate an explicit not_sure option and does not mutate the catalog', () => {
    const cat = deepFreeze(copy(FIXTURE));
    const s = createSession(cat);
    assert.equal(s.getQuestion('umbrella_limit').options.filter((o) => o.id === 'not_sure').length, 1);
    assert.equal(cat.questions.find((q) => q.id === 'umbrella_limit').options.length, 3, 'source question still has 3 options');
    const withExplicit = createSession({ questions: [{ id: 'q', domain: 'core', section: 's', type: 'single', prompt: 'p', allowNotSure: true, options: [{ id: 'a', label: 'A' }, { id: 'not_sure', label: 'Dunno' }] }] });
    assert.equal(withExplicit.getQuestion('q').options.filter((o) => o.id === 'not_sure').length, 1);
  });
  t('resolved questions are frozen copies, so callers cannot corrupt the catalog', () => {
    const q = session().getQuestion('home_liability');
    assert.throws(() => { q.options[0].value = 1; }, /read.?only|frozen|not extensible|Cannot/i);
    assert.equal(FIXTURE.questions.find((q) => q.id === 'home_liability').options[0].value, 300000);
  });
  t('showIf defaults to null', () => {
    const s = createSession({ questions: [{ id: 'q', domain: 'core', section: 's', type: 'single', prompt: 'p', options: [{ id: 'a', label: 'A' }] }] });
    assert.equal(s.getQuestion('q').showIf, null);
    assert.deepEqual(ids(s.visibleQuestions({})), ['q']);
  });
});

suite('session: visibility', (t) => {
  t('with no policies only Q1 and the unconditional / negated questions show', () => {
    assert.deepEqual(ids(session().visibleQuestions({})), ['policies', 'assets_band']);
  });
  t('visibleQuestions keeps catalog order', () => {
    const a = { policies: ['umbrella', 'auto', 'home', 'health'] };
    assert.deepEqual(ids(session().visibleQuestions(a)), ['policies', 'umbrella_limit', 'auto_liability', 'home_liability', 'supplements']);
  });
  t('a gated chain opens one step at a time', () => {
    const s = session();
    const base = { policies: ['umbrella'] };
    assert.deepEqual(ids(s.visibleQuestions(base)), ['policies', 'umbrella_limit']);
    const a1 = { ...base, umbrella_limit: '1m' };
    assert.deepEqual(ids(s.visibleQuestions(a1)), ['policies', 'umbrella_limit', 'umbrella_ext_um', 'umbrella_side_business']);
    const a2 = { ...a1, umbrella_ext_um: 'no' };
    assert.deepEqual(ids(s.visibleQuestions(a2)), ['policies', 'umbrella_limit', 'umbrella_ext_um', 'umbrella_um_detail', 'umbrella_side_business']);
    const a3 = { ...a1, umbrella_ext_um: 'yes' };
    assert.deepEqual(ids(s.visibleQuestions(a3)), ['policies', 'umbrella_limit', 'umbrella_ext_um', 'umbrella_side_business']);
  });
  t('`in` gate: a 5m umbrella skips the side-business question', () => {
    const a = { policies: ['umbrella'], umbrella_limit: '5m' };
    assert.equal(session().isVisible('umbrella_side_business', a), false);
    assert.equal(session().isVisible('umbrella_side_business', { ...a, umbrella_limit: '2m' }), true);
  });
  t('not_sure counts as an answer for `answered` gates', () => {
    const a = { policies: ['umbrella'], umbrella_limit: 'not_sure' };
    assert.equal(session().isVisible('umbrella_ext_um', a), true);
    assert.equal(session().isVisible('umbrella_side_business', a), false, 'not_sure is neither 1m nor 2m');
  });
  t('multi `includes` gate', () => {
    const s = session();
    assert.equal(s.isVisible('supplement_cost', { policies: ['health'], supplements: ['accident', 'critical_illness'] }), true);
    assert.equal(s.isVisible('supplement_cost', { policies: ['health'], supplements: ['critical_illness'] }), false);
    assert.equal(s.isVisible('supplement_cost', { policies: ['health'] }), false);
  });
  t('`not` gate flips with holds', () => {
    assert.equal(session().isVisible('assets_band', { policies: ['auto'] }), true);
    assert.equal(session().isVisible('assets_band', { policies: ['umbrella'] }), false);
  });
  t('`any` gate', () => {
    const s = session();
    assert.equal(s.isVisible('cards', { policies: ['travel'] }), true);
    assert.equal(s.isVisible('cards', { policies: ['phone'] }), true);
    assert.equal(s.isVisible('cards', { policies: ['auto'] }), false);
  });
  t('unknown question ids are not visible', () => {
    assert.equal(session().isVisible('nope', { policies: ['auto'] }), false);
    assert.equal(session().isVisible('other_items', { policies: ['auto'] }), false);
  });
  t('Q1 (policies) is an ordinary question that is always visible', () => {
    assert.equal(session().isVisible('policies', {}), true);
    assert.equal(session().isVisible('policies', { policies: ['auto'] }), true);
    assert.equal(session().isVisible('policies', { policies: ['none'] }), true);
  });
  t('a `holds` gate counts as a read of Q1: with no Q1 in the catalog the gated question is hidden', () => {
    const q = { id: 'q', domain: 'core', section: 's', type: 'single', prompt: 'p', options: [{ id: 'a', label: 'A' }], showIf: { not: { holds: 'auto' } } };
    assert.equal(createSession({ questions: [q] }).isVisible('q', { policies: [] }), false, 'no policies question, so nothing can be read');
    assert.equal(createSession({ questions: [POLICIES_QUESTION, q] }).isVisible('q', { policies: ['boat'] }), true);
    assert.equal(createSession({ questions: [POLICIES_QUESTION, q] }).isVisible('q', { policies: ['auto'] }), false);
  });
  t('visibility is transitive: stale upstream answers do not open downstream questions', () => {
    // The user once held an umbrella and answered the chain, then deselected the umbrella.
    const stale = { policies: ['auto'], umbrella_limit: '1m', umbrella_ext_um: 'no', umbrella_um_detail: 'can_add' };
    const s = session();
    assert.equal(s.isVisible('umbrella_limit', stale), false);
    assert.equal(s.isVisible('umbrella_ext_um', stale), false, 'its own gate (answered umbrella_limit) is true, but umbrella_limit is hidden');
    assert.equal(s.isVisible('umbrella_um_detail', stale), false, 'two hops from the hidden root');
  });
  t('transitive visibility also hides `not` gates that reference a hidden question', () => {
    const cat = {
      questions: [
        POLICIES_QUESTION,
        { id: 'root', domain: 'core', section: 's', type: 'single', prompt: 'p', options: [{ id: 'a', label: 'A' }], showIf: { holds: 'auto' } },
        { id: 'child', domain: 'core', section: 's', type: 'single', prompt: 'p', options: [{ id: 'a', label: 'A' }], showIf: { not: { answered: 'root' } } },
      ],
    };
    const s = createSession(cat);
    assert.equal(s.isVisible('child', { policies: ['auto'] }), true, 'root visible and unanswered');
    assert.equal(s.isVisible('child', { policies: ['auto'], root: 'a' }), false, 'root answered');
    assert.equal(s.isVisible('child', { policies: ['boat'] }), false, 'root hidden, so child hidden even though root is unanswered');
  });
  t('a gate referencing a question that does not exist hides the question', () => {
    const s = createSession({ questions: [{ id: 'q', domain: 'core', section: 's', type: 'single', prompt: 'p', options: [{ id: 'a', label: 'A' }], showIf: { answered: 'ghost' } }] });
    assert.equal(s.isVisible('q', { ghost: 'a' }), false);
  });
  t('a condition cycle throws a clear error instead of recursing forever', () => {
    const s = createSession({
      questions: [
        { id: 'a_q', domain: 'core', section: 's', type: 'single', prompt: 'p', options: [{ id: 'x', label: 'X' }], showIf: { answered: 'b_q' } },
        { id: 'b_q', domain: 'core', section: 's', type: 'single', prompt: 'p', options: [{ id: 'x', label: 'X' }], showIf: { answered: 'a_q' } },
      ],
    });
    assert.throws(() => s.visibleQuestions({}), /cycle/i);
  });
  t('a malformed showIf fails when the session is created', () => {
    assert.throws(() => createSession({ questions: [{ id: 'q', domain: 'core', section: 's', type: 'single', prompt: 'p', options: [{ id: 'a', label: 'A' }], showIf: { answer: 'x' } }] }), /Malformed condition/);
  });
  t('duplicate question ids fail when the session is created', () => {
    const q = { id: 'q', domain: 'core', section: 's', type: 'single', prompt: 'p', options: [{ id: 'a', label: 'A' }] };
    assert.throws(() => createSession({ questions: [q, q] }), /duplicate question id "q"/);
  });
  t('createSession needs a catalog with questions', () => {
    assert.throws(() => createSession(undefined), /questions array/);
    assert.throws(() => createSession({}), /questions array/);
  });
});

suite('session: prune', (t) => {
  t('drops answers to non-visible questions (transitively)', () => {
    const stale = { policies: ['auto'], umbrella_limit: '1m', umbrella_ext_um: 'no', umbrella_um_detail: 'can_add', auto_liability: '100_300' };
    assert.deepEqual(session().prune(stale), { policies: ['auto'] });
  });
  t('keeps answers whose chain is fully visible', () => {
    const a = { policies: ['auto', 'umbrella'], umbrella_limit: '1m', umbrella_ext_um: 'no', umbrella_um_detail: 'can_add', auto_liability: '100_300' };
    assert.deepEqual(session().prune(a), a);
  });
  t('drops a downstream answer when its own gate stops matching', () => {
    const a = { policies: ['umbrella'], umbrella_limit: '1m', umbrella_ext_um: 'yes', umbrella_um_detail: 'can_add' };
    assert.deepEqual(session().prune(a), { policies: ['umbrella'], umbrella_limit: '1m', umbrella_ext_um: 'yes' });
  });
  t('drops unknown option ids on single questions', () => {
    const out = session().prune({ policies: ['umbrella'], umbrella_limit: '7m' });
    assert.deepEqual(out, { policies: ['umbrella'] });
  });
  t('an unknown option id that was gating downstream questions stops gating them', () => {
    const out = session().prune({ policies: ['umbrella'], umbrella_limit: '7m', umbrella_ext_um: 'no' });
    assert.deepEqual(out, { policies: ['umbrella'] });
  });
  t('keeps not_sure only where it is allowed', () => {
    const out = session().prune({ policies: ['umbrella'], umbrella_limit: 'not_sure', umbrella_ext_um: 'no', umbrella_um_detail: 'not_sure' });
    assert.deepEqual(out, { policies: ['umbrella'], umbrella_limit: 'not_sure', umbrella_ext_um: 'no' });
  });
  t('multi answers: filters unknown ids, dedupes, uses option order, drops empties', () => {
    const s = session();
    assert.deepEqual(s.prune({ policies: ['health'], supplements: ['hospital_indemnity', 'bogus', 'accident', 'accident'] }).supplements, ['accident', 'hospital_indemnity']);
    assert.deepEqual(s.prune({ policies: ['health'], supplements: ['bogus'] }), { policies: ['health'] });
    assert.deepEqual(s.prune({ policies: ['health'], supplements: [] }), { policies: ['health'] });
  });
  t('multi answers: an exclusive option wins over the others', () => {
    const s = session();
    assert.deepEqual(s.prune({ policies: ['health'], supplements: ['accident', 'none_of_these'] }).supplements, ['none_of_these']);
    assert.deepEqual(s.prune({ policies: ['health'], supplements: ['accident', 'not_sure'] }).supplements, ['not_sure']);
  });
  t('drops answers of the wrong shape', () => {
    const s = session();
    assert.deepEqual(s.prune({ policies: ['umbrella'], umbrella_limit: ['1m'] }), { policies: ['umbrella'] }, 'array for a single question');
    assert.deepEqual(s.prune({ policies: ['health'], supplements: 'accident' }), { policies: ['health'] }, 'string for a multi question');
    assert.deepEqual(s.prune({ policies: ['umbrella'], umbrella_limit: 1000000 }), { policies: ['umbrella'] }, 'number');
    assert.deepEqual(s.prune({ policies: ['umbrella'], umbrella_limit: null }), { policies: ['umbrella'] }, 'null');
  });
  t('drops keys that are not questions; policies is a question (Q1), so it is kept', () => {
    assert.deepEqual(session().prune({ policies: ['auto'], mystery: 'x' }), { policies: ['auto'] });
  });
  t('policies is normalized like any multi question: known option ids only, deduped, in option order', () => {
    assert.deepEqual(session().prune({ policies: ['home', 'auto', 'home', 3, null, 'flood'] }).policies, ['auto', 'home']);
    assert.deepEqual(session().prune({ policies: ['umbrella', 'auto', 'none'] }).policies, ['none'], 'the exclusive None of these wins');
  });
  t('policies that is not an array is dropped; absent policies stays absent', () => {
    assert.deepEqual(session().prune({ policies: 'auto' }), {});
    assert.deepEqual(session().prune({}), {});
  });
  t('tolerates undefined, null and non-object answers', () => {
    assert.deepEqual(session().prune(undefined), {});
    assert.deepEqual(session().prune(null), {});
    assert.deepEqual(session().prune('x'), {});
    assert.deepEqual(session().prune([]), {});
  });
  t('is idempotent', () => {
    const a = { policies: ['umbrella', 'health', 'auto'], umbrella_limit: '2m', umbrella_ext_um: 'no', umbrella_um_detail: 'bogus', supplements: ['none_of_these', 'accident'], junk: 1 };
    const once = session().prune(a);
    assert.deepEqual(session().prune(once), once);
  });
  t('returns new objects and arrays; mutating the result does not touch the input', () => {
    const input = { policies: ['health'], supplements: ['accident'] };
    const out = session().prune(input);
    assert.notEqual(out, input);
    assert.notEqual(out.supplements, input.supplements);
    out.supplements.push('x');
    out.policies.push('y');
    assert.deepEqual(input, { policies: ['health'], supplements: ['accident'] });
  });
  t('does not mutate a deeply frozen input or catalog', () => {
    const input = deepFreeze({ policies: ['umbrella', 'auto'], umbrella_limit: '1m', supplements: ['x', 'accident'], junk: { a: [1] } });
    const cat = deepFreeze(copy(FIXTURE));
    const out = createSession(cat).prune(input);
    assert.deepEqual(out, { policies: ['auto', 'umbrella'], umbrella_limit: '1m' });
  });
});

suite('session: setAnswer, toggleOption, clearAnswer', (t) => {
  t('setAnswer returns a new object with the answer set and leaves the input alone', () => {
    const input = deepFreeze({ policies: ['umbrella'] });
    const out = session().setAnswer(input, 'umbrella_limit', '2m');
    assert.deepEqual(out, { policies: ['umbrella'], umbrella_limit: '2m' });
    assert.notEqual(out, input);
    assert.deepEqual(input, { policies: ['umbrella'] });
  });
  t('setAnswer replaces an existing answer', () => {
    const out = session().setAnswer({ umbrella_limit: '1m' }, 'umbrella_limit', '5m');
    assert.equal(out.umbrella_limit, '5m');
  });
  t('setAnswer accepts not_sure when allowed and rejects it when not', () => {
    assert.equal(session().setAnswer({}, 'umbrella_limit', 'not_sure').umbrella_limit, 'not_sure');
    assert.throws(() => session().setAnswer({}, 'umbrella_um_detail', 'not_sure'), /Unknown option "not_sure"/);
  });
  t('setAnswer does not prune other (stale) answers, so users can flip a gate back and forth', () => {
    const out = session().setAnswer({ policies: ['auto'], umbrella_ext_um: 'no' }, 'auto_liability', '250_500');
    assert.deepEqual(out, { policies: ['auto'], umbrella_ext_um: 'no', auto_liability: '250_500' });
  });
  t('setAnswer validates the question and the value', () => {
    assert.throws(() => session().setAnswer({}, 'nope', 'a'), /Unknown question "nope"/);
    assert.throws(() => session().setAnswer({}, 'other_items', ['auto']), /Unknown question "other_items"/);
    assert.throws(() => session().setAnswer({}, 'umbrella_limit', '9m'), /Unknown option "9m"/);
    assert.throws(() => session().setAnswer({}, 'umbrella_limit', ['1m']), /single question/);
    assert.throws(() => session().setAnswer({}, 'supplements', 'accident'), /multi question/);
    assert.throws(() => session().setAnswer({}, 'supplements', ['bogus']), /Unknown option "bogus"/);
  });
  t('setAnswer on a multi question normalizes order, duplicates and exclusivity; empty clears', () => {
    const s = session();
    assert.deepEqual(s.setAnswer({}, 'supplements', ['hospital_indemnity', 'accident', 'accident']).supplements, ['accident', 'hospital_indemnity']);
    assert.deepEqual(s.setAnswer({}, 'supplements', ['accident', 'none_of_these']).supplements, ['none_of_these']);
    assert.deepEqual(s.setAnswer({ supplements: ['accident'] }, 'supplements', []), {});
  });
  t('toggleOption adds and removes options on a multi question', () => {
    const s = session();
    let a = s.toggleOption({}, 'supplements', 'critical_illness');
    assert.deepEqual(a, { supplements: ['critical_illness'] });
    a = s.toggleOption(a, 'supplements', 'accident');
    assert.deepEqual(a, { supplements: ['accident', 'critical_illness'] });
    a = s.toggleOption(a, 'supplements', 'critical_illness');
    assert.deepEqual(a, { supplements: ['accident'] });
    a = s.toggleOption(a, 'supplements', 'accident');
    assert.deepEqual(a, {}, 'toggling off the last option clears the answer');
  });
  t('toggleOption: picking an exclusive option clears the rest, and picking another clears the exclusive one', () => {
    const s = session();
    let a = s.toggleOption({ supplements: ['accident', 'critical_illness'] }, 'supplements', 'none_of_these');
    assert.deepEqual(a, { supplements: ['none_of_these'] });
    a = s.toggleOption(a, 'supplements', 'accident');
    assert.deepEqual(a, { supplements: ['accident'] });
    a = s.toggleOption(a, 'supplements', 'not_sure');
    assert.deepEqual(a, { supplements: ['not_sure'] });
  });
  t('toggleOption validates and refuses single questions; input is not mutated', () => {
    const input = deepFreeze({ supplements: ['accident'] });
    assert.throws(() => session().toggleOption(input, 'umbrella_limit', '1m'), /multi/);
    assert.throws(() => session().toggleOption(input, 'supplements', 'bogus'), /Unknown option "bogus"/);
    assert.throws(() => session().toggleOption(input, 'nope', 'x'), /Unknown question/);
    const out = session().toggleOption(input, 'supplements', 'critical_illness');
    assert.deepEqual(input, { supplements: ['accident'] });
    assert.deepEqual(out, { supplements: ['accident', 'critical_illness'] });
  });
  t('clearAnswer removes one key and leaves the rest; input is not mutated', () => {
    const input = deepFreeze({ policies: ['umbrella'], umbrella_limit: '1m', umbrella_ext_um: 'no' });
    const out = session().clearAnswer(input, 'umbrella_limit');
    assert.deepEqual(out, { policies: ['umbrella'], umbrella_ext_um: 'no' });
    assert.deepEqual(input, { policies: ['umbrella'], umbrella_limit: '1m', umbrella_ext_um: 'no' });
  });
  t('clearAnswer on an unanswered question is a no-op copy; unknown question throws', () => {
    const out = session().clearAnswer({ policies: ['auto'] }, 'umbrella_limit');
    assert.deepEqual(out, { policies: ['auto'] });
    assert.throws(() => session().clearAnswer({}, 'nope'), /Unknown question "nope"/);
  });
  t('helpers tolerate undefined answers', () => {
    assert.deepEqual(session().setAnswer(undefined, 'umbrella_limit', '1m'), { umbrella_limit: '1m' });
    assert.deepEqual(session().clearAnswer(undefined, 'umbrella_limit'), {});
    assert.deepEqual(session().toggleOption(undefined, 'supplements', 'accident'), { supplements: ['accident'] });
  });
});

suite('session: nextUnanswered', (t) => {
  t('walks the visible questions in order as they get answered', () => {
    const s = session();
    let a = { policies: ['umbrella', 'auto'] };
    assert.equal(s.nextUnanswered(a).id, 'umbrella_limit');
    a = s.setAnswer(a, 'umbrella_limit', '1m');
    assert.equal(s.nextUnanswered(a).id, 'auto_liability');
    a = s.setAnswer(a, 'auto_liability', 'not_sure');
    assert.equal(s.nextUnanswered(a).id, 'umbrella_ext_um');
    a = s.setAnswer(a, 'umbrella_ext_um', 'no');
    assert.equal(s.nextUnanswered(a).id, 'umbrella_um_detail');
    a = s.setAnswer(a, 'umbrella_um_detail', 'can_add');
    assert.equal(s.nextUnanswered(a).id, 'umbrella_side_business');
    a = s.setAnswer(a, 'umbrella_side_business', 'no');
    assert.equal(s.nextUnanswered(a), null);
  });
  t('can be limited to a section', () => {
    const s = session();
    const a = { policies: ['umbrella'], umbrella_limit: '1m' };
    assert.equal(s.nextUnanswered(a, 'umbrella'), null);
    assert.equal(s.nextUnanswered(a, 'umbrella_scope').id, 'umbrella_ext_um');
    assert.equal(s.nextUnanswered(a, 'nope'), null);
  });
  t('ignores hidden questions and stale answers', () => {
    assert.equal(session().nextUnanswered({ policies: ['health'], supplements: ['critical_illness'] }).id, 'assets_band', 'supplement_cost is hidden; assets_band is the only unanswered visible question');
  });
  t('returns the resolved question including the not_sure option', () => {
    const q = session().nextUnanswered({ policies: ['umbrella'] });
    assert.equal(q.options[q.options.length - 1].id, 'not_sure');
  });
  t('an invalid stored answer counts as unanswered', () => {
    assert.equal(session().nextUnanswered({ policies: ['umbrella'], umbrella_limit: 'bogus' }).id, 'umbrella_limit');
  });
});
