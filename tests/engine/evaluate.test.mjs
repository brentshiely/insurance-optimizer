import { suite, assert } from '../harness.mjs';
import { evaluate, createContext } from '../../public/js/overlap/engine/evaluate.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import { computeLiabilityStack } from '../../public/js/overlap/engine/liabilityStack.mjs';
import DEFAULT_CATALOG from '../../public/js/overlap/data/catalog.mjs';
import FIXTURE from '../fixtures/catalog.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';

const ev = (answers, catalog = FIXTURE) => evaluate(answers, catalog);
const flagIds = (r, bucket) => r.flags[bucket].map((f) => f.id);

// A catalog derived from the fixture with a single extra/changed flag, for error-path tests.
function withFlag(overrides) {
  const cat = copy(FIXTURE);
  cat.flags = [{
    id: 'probe-flag', domain: 'core', bucket: 'question', kind: 'education', priority: 1,
    title: 'T', applies: () => ({}), background: 'B', ask: 'A', reason: 'R', sourceIds: ['fixture-iii'],
    ...overrides,
  }];
  return cat;
}

const SCENARIO_A = {
  policies: ['auto', 'home', 'umbrella'],
  umbrella_limit: '1m', auto_liability: '100_300', home_liability: '300k', umbrella_ext_um: 'no',
};

suite('evaluate: results shape and content', (t) => {
  t('empty answers on the fixture produce empty buckets, a null stack, and only unconditional questions', () => {
    assert.deepEqual(ev({}), {
      flags: { raise: [], drop: [], question: [] },
      stack: null,
      meta: { visibleQuestionIds: ['assets_band'], answeredCount: 0 },
    });
  });
  t('undefined / null / garbage answers behave like empty answers', () => {
    const empty = ev({});
    assert.deepEqual(ev(undefined), empty);
    assert.deepEqual(ev(null), empty);
    assert.deepEqual(ev('nope'), empty);
  });
  t('the default catalog is used when none is passed (empty today, but valid)', () => {
    assert.deepEqual(evaluate({}), {
      flags: { raise: [], drop: [], question: [] },
      stack: null,
      meta: { visibleQuestionIds: [], answeredCount: 0 },
    });
    assert.deepEqual(evaluate({}), evaluate({}, DEFAULT_CATALOG));
  });
  t('umbrella scenario: three Raise flags in bucket, priority, id order', () => {
    const r = ev(SCENARIO_A);
    assert.deepEqual(flagIds(r, 'raise'), ['umbrella-um-missing', 'umbrella-auto-below-attach', 'umbrella-home-below-min']);
    assert.deepEqual(flagIds(r, 'drop'), []);
    assert.deepEqual(flagIds(r, 'question'), []);
  });
  t('a rendered flag has exactly the ResultFlag fields, with templates and function text resolved', () => {
    const f = ev(SCENARIO_A).flags.raise[1];
    assert.deepEqual(Object.keys(f), ['id', 'bucket', 'domain', 'kind', 'title', 'emphasis', 'background', 'ask', 'reason', 'sources']);
    assert.equal(f.id, 'umbrella-auto-below-attach');
    assert.equal(f.bucket, 'raise');
    assert.equal(f.domain, 'umbrella');
    assert.equal(f.kind, 'cross-policy');
    assert.equal(f.emphasis, 'strong');
    assert.equal(f.title, 'Raise your auto liability to match your umbrella');
    assert.equal(f.background, 'Your auto policy pays up to 100/300 before the umbrella steps in, which is below what umbrellas usually require.');
    assert.equal(f.ask, 'Ask your agent what auto limit your umbrella requires, and raise 100/300 to meet it.');
    assert.equal(f.reason, 'My umbrella needs a higher underlying auto limit than 100/300.');
  });
  t('sources are resolved to full entries in sourceIds order', () => {
    const f = ev(SCENARIO_A).flags.raise[2];
    assert.equal(f.id, 'umbrella-home-below-min');
    assert.deepEqual(f.sources, [
      { id: 'fixture-iii', publisher: 'Fixture Publisher One', title: 'Fixture umbrella explainer', url: 'https://example.org/fixtures/umbrella', lastVerified: '2026-10-10' },
      { id: 'fixture-naic', publisher: 'Fixture Publisher Two', title: 'Fixture consumer guide', url: 'https://example.org/fixtures/consumer-guide', lastVerified: '2026-09-30' },
    ]);
  });
  t('emphasis defaults to normal when applies() does not set it', () => {
    assert.equal(ev(SCENARIO_A).flags.raise[2].emphasis, 'normal');
  });
  t('meta lists visible question ids in catalog order and counts answered visible questions', () => {
    assert.deepEqual(ev(SCENARIO_A).meta, {
      visibleQuestionIds: ['umbrella_limit', 'auto_liability', 'home_liability', 'umbrella_ext_um', 'umbrella_um_detail', 'umbrella_side_business'],
      answeredCount: 4,
    });
  });
  t('not_sure drives a Question flag', () => {
    const r = ev({ policies: ['umbrella'], umbrella_limit: 'not_sure' });
    assert.deepEqual(flagIds(r, 'raise'), []);
    assert.deepEqual(flagIds(r, 'question'), ['umbrella-limit-not-sure']);
    assert.equal(r.flags.question[0].title, 'Find out your umbrella limit');
  });
  t('multi answers and function-built vars: health scenario with and without the cost answer', () => {
    const base = { policies: ['health'], supplements: ['accident', 'critical_illness'] };
    const r1 = ev(base);
    assert.deepEqual(flagIds(r1, 'question'), ['supplement-bolt-ons', 'education-hsa']);
    assert.equal(r1.flags.question[0].background, 'You pay an amount you did not say a month for an accident policy.');
    const r2 = ev({ ...base, supplement_cost: 'under_50' });
    assert.equal(r2.flags.question[0].background, 'You pay Under $50 a month for an accident policy.');
  });
  t('a flag whose applies() returns true applies with defaults', () => {
    const r = ev({ policies: ['health'] });
    assert.deepEqual(flagIds(r, 'question'), ['education-hsa']);
    assert.equal(r.flags.question[0].emphasis, 'normal');
  });
  t('a flag that does not apply is absent (applies false or null)', () => {
    const r = ev({ policies: ['umbrella', 'auto', 'home'], umbrella_limit: '1m', auto_liability: '500_500', home_liability: '1m' });
    assert.deepEqual(flagIds(r, 'raise'), []);
  });
  t('the stack is whatever computeLiabilityStack returns (null until S6)', () => {
    assert.equal(computeLiabilityStack({}), null);
    assert.equal(ev(SCENARIO_A).stack, null);
  });
});

suite('evaluate: pruning means stale answers never leak into results', (t) => {
  t('an answer to a hidden question does not fire its flag', () => {
    // umbrella_um_detail would fire 'stale-probe', but its gate (ext_um = no) is false here.
    const r = ev({ policies: ['umbrella'], umbrella_limit: '1m', umbrella_ext_um: 'yes', umbrella_um_detail: 'can_add' });
    assert.deepEqual(flagIds(r, 'question'), []);
    assert.equal(r.meta.answeredCount, 2);
  });
  t('the same answer fires the flag once its gate opens', () => {
    const r = ev({ policies: ['umbrella'], umbrella_limit: '1m', umbrella_ext_um: 'no', umbrella_um_detail: 'can_add' });
    assert.deepEqual(flagIds(r, 'question'), ['stale-probe']);
  });
  t('dropping the umbrella removes every umbrella-chain flag even though the answers remain', () => {
    const r = ev({ policies: ['auto'], umbrella_limit: 'not_sure', auto_liability: '100_300', umbrella_ext_um: 'no', umbrella_um_detail: 'can_add' });
    assert.deepEqual(r.flags, { raise: [], drop: [], question: [] });
    assert.deepEqual(r.meta, { visibleQuestionIds: ['assets_band'], answeredCount: 0 });
  });
  t('unknown option ids are treated as unanswered', () => {
    const r = ev({ policies: ['umbrella', 'auto'], umbrella_limit: '1m', auto_liability: '999_999' });
    assert.deepEqual(flagIds(r, 'raise'), []);
    assert.equal(r.meta.answeredCount, 1);
  });
});

suite('evaluate: card cross-reference', (t) => {
  const run = (cards) => ev({ policies: ['rental_car'], ...(cards ? { cards } : {}) });
  t('a held card with the benefit makes the Drop flag strong and names the card', () => {
    const f = run(['card_alpha']).flags.drop[0];
    assert.equal(f.id, 'card-rental-duplicate');
    assert.equal(f.emphasis, 'strong');
    assert.equal(f.background, 'Your auto policy and Fixture Card Alpha may already cover a rental car.');
  });
  t('a card id that is not given a cardId falls back to the kebab-case form of the option id', () => {
    const ctx = createContext({ policies: ['rental_car'], cards: ['card_beta'] }, FIXTURE);
    assert.deepEqual(ctx.cards().map((c) => c.id), ['card-beta']);
  });
  t('an unverified benefit is never treated as present', () => {
    const f = run(['card_beta']).flags.drop[0];
    assert.equal(f.emphasis, 'normal');
    assert.equal(f.background, 'Your auto policy and your credit card may already cover a rental car.');
  });
  t('"none of these" and no card answer both fall back to the generic wording', () => {
    assert.equal(run(['none_of_these']).flags.drop[0].emphasis, 'normal');
    assert.equal(run(undefined).flags.drop[0].emphasis, 'normal');
  });
  t('several cards: only those with the benefit count, ordered by card id', () => {
    const ctx = createContext({ policies: ['rental_car'], cards: ['card_beta', 'card_alpha'] }, FIXTURE);
    assert.deepEqual(ctx.cards().map((c) => c.id), ['card-alpha', 'card-beta']);
    assert.deepEqual(ctx.cardsWith('rentalCar').map((c) => c.id), ['card-alpha']);
    assert.deepEqual(ctx.cardsWith('tripProtection').map((c) => c.id), ['card-beta']);
    assert.deepEqual(ctx.cardsWith('cellPhone').map((c) => c.id), ['card-beta']);
    assert.deepEqual(ctx.cardsWith('roadside').map((c) => c.id), ['card-alpha'], 'secondary counts as present');
    assert.deepEqual(ctx.cardsWith('extendedWarranty'), [], 'none and unverified do not');
    assert.deepEqual(ctx.cardsWith('noSuchBenefit'), []);
  });
  t('a stale card answer is ignored when the cards question is not visible', () => {
    const ctx = createContext({ policies: ['auto'], cards: ['card_alpha'] }, FIXTURE);
    assert.deepEqual(ctx.cards(), []);
  });
  t('a flag with a function-only rule: phone insurance applies on holds alone', () => {
    const r = ev({ policies: ['phone'] });
    assert.deepEqual(flagIds(r, 'drop'), ['phone-insurance-duplicate']);
  });
});

suite('evaluate: ctx helpers', (t) => {
  const A = { policies: ['umbrella', 'auto', 'health'], umbrella_limit: '2m', auto_liability: 'not_sure', supplements: ['accident', 'not_sure'] };
  const ctx = createContext({ ...A, supplements: ['accident', 'critical_illness'] }, FIXTURE);
  t('holds', () => {
    assert.equal(ctx.holds('umbrella'), true);
    assert.equal(ctx.holds('boat'), false);
  });
  t('answer: single, multi, and undefined for unanswered / hidden / unknown / policies', () => {
    assert.equal(ctx.answer('umbrella_limit'), '2m');
    assert.deepEqual(ctx.answer('supplements'), ['accident', 'critical_illness']);
    assert.equal(ctx.answer('home_liability'), undefined, 'visible? no - home not held');
    assert.equal(ctx.answer('umbrella_ext_um'), undefined, 'visible but unanswered');
    assert.equal(ctx.answer('nope'), undefined);
    assert.equal(ctx.answer('policies'), undefined);
  });
  t('is / includes', () => {
    assert.equal(ctx.is('umbrella_limit', '2m'), true);
    assert.equal(ctx.is('umbrella_limit', '1m'), false);
    assert.equal(ctx.is('supplements', 'accident'), false, 'is() is for single questions');
    assert.equal(ctx.includes('supplements', 'accident'), true);
    assert.equal(ctx.includes('supplements', 'cancer'), false);
    assert.equal(ctx.includes('umbrella_limit', '2m'), false, 'includes() is for multi questions');
  });
  t('isNotSure for single and multi answers', () => {
    assert.equal(ctx.isNotSure('auto_liability'), true);
    assert.equal(ctx.isNotSure('umbrella_limit'), false);
    const c2 = createContext({ policies: ['health'], supplements: ['not_sure'] }, FIXTURE);
    assert.equal(c2.isNotSure('supplements'), true);
  });
  t('option: the chosen option (with value) for single, an array of options for multi', () => {
    assert.equal(ctx.option('umbrella_limit').value, 2000000);
    assert.equal(ctx.option('umbrella_limit').label, '$2 million');
    assert.deepEqual(ctx.option('supplements').map((o) => o.id), ['accident', 'critical_illness']);
    assert.deepEqual(ctx.option('auto_liability'), { id: 'not_sure', label: 'Not sure' });
    assert.equal(ctx.option('umbrella_ext_um'), undefined);
  });
  t('reading hidden / unanswered / unknown questions never throws', () => {
    for (const qid of ['home_liability', 'umbrella_ext_um', 'nope', 'policies', '', undefined, 5]) {
      assert.equal(ctx.answer(qid), undefined);
      assert.equal(ctx.is(qid, 'x'), false);
      assert.equal(ctx.includes(qid, 'x'), false);
      assert.equal(ctx.isNotSure(qid), false);
      assert.equal(ctx.option(qid), undefined);
    }
    assert.equal(ctx.holds(undefined), false);
  });
  t('ctx.stack is present (null until S6) and the ctx is frozen', () => {
    assert.equal(ctx.stack, null);
    assert.equal(Object.isFrozen(ctx), true);
  });
  t('values handed to flags cannot be used to alter the catalog', () => {
    assert.throws(() => { ctx.option('umbrella_limit').value = 1; }, /read.?only|frozen|not extensible|Cannot/i);
    assert.throws(() => { ctx.answer('supplements').push('x'); }, /frozen|not extensible|Cannot|read.?only/i);
    assert.equal(FIXTURE.questions[0].options[1].value, 2000000);
  });
  t('createContext prunes first', () => {
    const c = createContext({ policies: ['auto'], umbrella_limit: '2m' }, FIXTURE);
    assert.equal(c.answer('umbrella_limit'), undefined);
    assert.equal(c.holds('auto'), true);
  });
});

suite('evaluate: deterministic ordering', (t) => {
  const mk = (id, bucket, priority) => ({
    id, domain: 'core', bucket, kind: 'education', ...(priority === undefined ? {} : { priority }),
    title: id, applies: () => true, background: 'b', ask: 'a', reason: 'r', sourceIds: ['fixture-iii'],
  });
  const catalogWith = (flags) => ({ ...copy(FIXTURE), flags });
  const order = (r) => [...flagIds(r, 'raise'), ...flagIds(r, 'drop'), ...flagIds(r, 'question')];

  t('buckets are separate; within a bucket priority ascending (numeric), then id', () => {
    const flags = [
      mk('c-last', 'raise', 10), mk('a-first', 'raise', 10), mk('b-mid', 'raise', 2),
      mk('d', 'drop', 5), mk('q', 'question', 1), mk('big', 'raise', 100), mk('neg', 'raise', -1),
    ];
    const r = evaluate({}, catalogWith(flags));
    assert.deepEqual(flagIds(r, 'raise'), ['neg', 'b-mid', 'a-first', 'c-last', 'big']);
    assert.deepEqual(flagIds(r, 'drop'), ['d']);
    assert.deepEqual(flagIds(r, 'question'), ['q']);
  });
  t('a flag without a priority sorts as priority 100', () => {
    const r = evaluate({}, catalogWith([mk('zz-none', 'raise'), mk('aa-late', 'raise', 101), mk('mm-early', 'raise', 99)]));
    assert.deepEqual(flagIds(r, 'raise'), ['mm-early', 'zz-none', 'aa-late']);
  });
  t('input flag order does not matter', () => {
    const flags = copy(FIXTURE.flags);
    const answers = { ...SCENARIO_A, policies: ['auto', 'home', 'umbrella', 'rental_car', 'phone', 'health'], supplements: ['accident'] };
    const forward = ev(answers, catalogWith(flags));
    const reversed = ev(answers, catalogWith(flags.slice().reverse()));
    assert.deepEqual(forward, reversed);
    assert.ok(order(forward).length >= 6, 'scenario fires several flags');
  });
  t('answer key order and policies order do not matter', () => {
    const a = { policies: ['umbrella', 'auto', 'home'], umbrella_limit: '1m', auto_liability: '100_300', home_liability: '300k', umbrella_ext_um: 'no' };
    const b = { umbrella_ext_um: 'no', home_liability: '300k', auto_liability: '100_300', umbrella_limit: '1m', policies: ['home', 'auto', 'umbrella'] };
    assert.deepEqual(ev(a), ev(b));
  });
});

suite('evaluate: purity', (t) => {
  const BIG = { ...SCENARIO_A, policies: ['auto', 'health', 'home', 'phone', 'rental_car', 'umbrella'], supplements: ['accident'], supplement_cost: 'under_50', cards: ['card_alpha'], junk: 'x' };
  t('same input twice gives deep-equal results', () => {
    assert.deepEqual(ev(BIG), ev(BIG));
    assert.deepEqual(ev({}), ev({}));
  });
  t('does not mutate frozen answers or a frozen catalog', () => {
    const answers = deepFreeze(copy(BIG));
    const catalog = deepFreeze(copy(FIXTURE));
    const first = evaluate(answers, catalog);
    const second = evaluate(answers, catalog);
    assert.deepEqual(first, second);
    assert.deepEqual(answers, BIG);
    assert.deepEqual(catalog.questions, FIXTURE.questions);
  });
  t('results are fresh objects: editing one result never affects the next call or the catalog', () => {
    const r1 = ev(BIG);
    r1.flags.raise[0].title = 'MUTATED';
    r1.flags.raise[0].sources[0].url = 'https://mutated.example';
    r1.flags.raise.pop();
    r1.meta.visibleQuestionIds.push('x');
    const r2 = ev(BIG);
    assert.notEqual(r2.flags.raise[0].title, 'MUTATED');
    assert.equal(r2.flags.raise[0].sources[0].url.startsWith('https://example.org/'), true);
    assert.equal(r2.flags.raise.length, 3);
    assert.equal(FIXTURE.sources['fixture-naic'].url, 'https://example.org/fixtures/consumer-guide');
  });
  t('the session API is pure too: createSession does not touch a frozen catalog', () => {
    createSession(deepFreeze(copy(FIXTURE)));
  });
});

suite('evaluate: authoring errors fail loudly and name the flag', (t) => {
  t('unresolved template token names the flag and the field', () => {
    assert.throws(() => evaluate({}, withFlag({ background: 'Needs {{nope}}' })), /flag "probe-flag" field "background".*Unresolved template token \{\{nope\}\}/);
  });
  t('unresolved token inside a function-built text', () => {
    assert.throws(() => evaluate({}, withFlag({ ask: () => 'Ask about {{nope}}' })), /flag "probe-flag" field "ask".*\{\{nope\}\}/);
  });
  t('a text function that returns a non-string', () => {
    assert.throws(() => evaluate({}, withFlag({ reason: () => 42 })), /flag "probe-flag" field "reason"/);
  });
  t('a token supplied by vars resolves', () => {
    const r = evaluate({}, withFlag({ applies: () => ({ vars: { x: 7 } }), title: 'Count {{x}}' }));
    assert.equal(r.flags.question[0].title, 'Count 7');
  });
  t('unknown source id', () => {
    assert.throws(() => evaluate({}, withFlag({ sourceIds: ['ghost'] })), /flag "probe-flag" cites unknown source "ghost"/);
  });
  t('missing or empty sourceIds on an applying flag', () => {
    assert.throws(() => evaluate({}, withFlag({ sourceIds: [] })), /flag "probe-flag".*at least one source/);
    assert.throws(() => evaluate({}, withFlag({ sourceIds: undefined })), /flag "probe-flag".*at least one source/);
  });
  t('applies() returning undefined, a string, or an array', () => {
    assert.throws(() => evaluate({}, withFlag({ applies: () => undefined })), /flag "probe-flag".*returned undefined/);
    assert.throws(() => evaluate({}, withFlag({ applies: () => 'yes' })), /flag "probe-flag".*must return/);
    assert.throws(() => evaluate({}, withFlag({ applies: () => [] })), /flag "probe-flag".*must return/);
  });
  t('applies() that throws is wrapped with the flag id', () => {
    assert.throws(() => evaluate({}, withFlag({ applies: () => { throw new Error('kaboom'); } })), /flag "probe-flag".*applies\(\) threw: kaboom/);
  });
  t('applies missing', () => {
    assert.throws(() => evaluate({}, withFlag({ applies: undefined })), /flag "probe-flag".*applies must be a function/);
  });
  t('invalid emphasis, invalid bucket, invalid vars', () => {
    assert.throws(() => evaluate({}, withFlag({ applies: () => ({ emphasis: 'loud' }) })), /flag "probe-flag".*emphasis/);
    assert.throws(() => evaluate({}, withFlag({ bucket: 'keep' })), /flag "probe-flag".*bucket/);
    assert.throws(() => evaluate({}, withFlag({ applies: () => ({ vars: 'x' }) })), /flag "probe-flag".*vars/);
  });
  t('a flag that does not apply is never rendered, so its bad text does not matter', () => {
    const r = evaluate({}, withFlag({ applies: () => false, background: '{{nope}}', sourceIds: ['ghost'] }));
    assert.deepEqual(r.flags, { raise: [], drop: [], question: [] });
  });
  t('a catalog without questions is rejected', () => {
    assert.throws(() => evaluate({}, {}), /questions array/);
  });
  t('a catalog with no flags / sources / cards keys still evaluates', () => {
    const r = evaluate({ policies: ['auto'] }, { questions: copy(FIXTURE.questions) });
    assert.deepEqual(r.flags, { raise: [], drop: [], question: [] });
  });
});
