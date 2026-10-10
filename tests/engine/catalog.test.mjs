import { suite, assert } from '../harness.mjs';
import CATALOG, { CATALOG as NAMED_CATALOG } from '../../public/js/overlap/data/catalog.mjs';
import { QUESTIONS } from '../../public/js/overlap/data/questions/index.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { CARDS } from '../../public/js/overlap/data/cards.mjs';
import { FLAGS } from '../../public/js/overlap/data/flags/index.mjs';
import umbrella from '../../public/js/overlap/data/flags/umbrella.mjs';
import umbrellaScope from '../../public/js/overlap/data/flags/umbrellaScope.mjs';
import vehicles from '../../public/js/overlap/data/flags/vehicles.mjs';
import auto from '../../public/js/overlap/data/flags/auto.mjs';
import home from '../../public/js/overlap/data/flags/home.mjs';
import renters from '../../public/js/overlap/data/flags/renters.mjs';
import health from '../../public/js/overlap/data/flags/health.mjs';
import deductible from '../../public/js/overlap/data/flags/deductible.mjs';
import other from '../../public/js/overlap/data/flags/other.mjs';
import { validateCatalog, assertValidCatalog } from '../../public/js/overlap/engine/validate.mjs';
import { evaluate } from '../../public/js/overlap/engine/evaluate.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import { deriveAnswers } from '../../public/js/overlap/engine/adapter.mjs';
import FIXTURE from '../fixtures/catalog.mjs';

const FLAG_FILES = { umbrella, umbrellaScope, vehicles, auto, home, renters, health, deductible, other };

suite('real catalog', (t) => {
  t('data/catalog.mjs has the four parts the engine expects', () => {
    assert.equal(CATALOG, NAMED_CATALOG, 'default and named exports are the same object');
    assert.equal(CATALOG.questions, QUESTIONS);
    assert.equal(CATALOG.flags, FLAGS);
    assert.equal(CATALOG.sources, SOURCES);
    assert.equal(CATALOG.cards, CARDS);
    assert.equal(Array.isArray(CATALOG.questions), true);
    assert.equal(Array.isArray(CATALOG.flags), true);
    assert.equal(typeof CATALOG.sources, 'object');
    assert.equal(typeof CATALOG.cards, 'object');
  });
  t('the real catalog validates (it may be empty, but it must be valid)', () => {
    const r = validateCatalog(CATALOG);
    assert.deepEqual(r.errors, []);
    assert.equal(r.ok, true);
    assert.equal(assertValidCatalog(CATALOG), CATALOG);
  });
  t('all nine per-domain flag files export an array as their default', () => {
    assert.deepEqual(Object.keys(FLAG_FILES), ['umbrella', 'umbrellaScope', 'vehicles', 'auto', 'home', 'renters', 'health', 'deductible', 'other']);
    for (const name of Object.keys(FLAG_FILES)) {
      assert.equal(Array.isArray(FLAG_FILES[name]), true, `${name}.mjs default export must be an array`);
    }
  });
  t('flags/index.mjs is exactly the concatenation of the nine files', () => {
    const all = Object.values(FLAG_FILES).reduce((acc, list) => acc.concat(list), []);
    assert.equal(FLAGS.length, all.length);
    assert.deepEqual(FLAGS.map((f) => f.id), all.map((f) => f.id));
  });
  t('every flag in the real catalog (once any exist) is unique across files', () => {
    const ids = FLAGS.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  t('a session can be created over the real catalog and evaluate() runs on it', () => {
    const s = createSession(CATALOG);
    assert.deepEqual(s.visibleQuestions({}).length >= 0, true);
    const r = evaluate({});
    assert.deepEqual(r.flags, { raise: [], drop: [], question: [] });
    assert.equal(r.stack, null);
  });
  t('the real catalog evaluates for any policy combination without throwing', () => {
    const combos = [[], ['auto'], ['auto', 'home', 'umbrella'], ['health', 'renters', 'boat', 'motorcycle', 'rental_car', 'travel', 'phone', 'warranty', 'towing', 'accidental_death']];
    for (const policies of combos) evaluate({ policies });
  });
});

suite('integration: host snapshot -> adapter -> engine (fixture catalog)', (t) => {
  const snapshot = {
    state: 'MN',
    a: { home: 'Own', veh: '2', dep: 'Yes' },
    extras: [],
    q: { health: 'No' },
    p: { umbrella: { hasUmbrella: 'Yes', limit: 1000000 }, auto: { liability: 999 } },
    o: { umbrella_limit: '1m', auto_liability: '100_300', home_liability: '300k', umbrella_ext_um: 'no' },
  };
  t('derived answers drive the same flags as hand-written answers', () => {
    const answers = deriveAnswers(snapshot);
    assert.deepEqual(answers.policies, ['auto', 'home', 'umbrella']);
    const r = evaluate(answers, FIXTURE);
    assert.deepEqual(r.flags.raise.map((f) => f.id), ['umbrella-um-missing', 'umbrella-auto-below-attach', 'umbrella-home-below-min']);
  });
  t('state and policy-screen numbers have no effect on the results', () => {
    const base = evaluate(deriveAnswers(snapshot), FIXTURE);
    const other = evaluate(deriveAnswers({ ...snapshot, state: 'FL', p: { umbrella: { hasUmbrella: 'Yes', limit: 5 }, auto: { liability: 1 } } }), FIXTURE);
    assert.deepEqual(base, other);
  });
  t('dropping the umbrella on the host screen silently removes the umbrella branch', () => {
    const r = evaluate(deriveAnswers({ ...snapshot, p: { umbrella: { hasUmbrella: 'No' } } }), FIXTURE);
    assert.deepEqual(r.flags, { raise: [], drop: [], question: [] });
  });
  t('Other-bucket selections flow through o.other_items into policies and the cards branch', () => {
    const answers = deriveAnswers({ o: { other_items: ['rental_car'], cards: ['card_alpha'] } });
    const r = evaluate(answers, FIXTURE);
    assert.equal(r.flags.drop[0].id, 'card-rental-duplicate');
    assert.equal(r.flags.drop[0].emphasis, 'strong');
  });
});
