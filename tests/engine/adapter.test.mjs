import { suite, assert } from '../harness.mjs';
import { deriveAnswers } from '../../public/js/overlap/engine/adapter.mjs';
import { deepFreeze, copy, recordReads } from '../helpers/purity.mjs';

const policies = (snapshot) => deriveAnswers(snapshot).policies;

suite('adapter: one test per row of the ARCHITECTURE table', (t) => {
  // auto: a.veh is "1", "2" or "3+"
  t('auto: a.veh "1"', () => assert.deepEqual(policies({ a: { veh: '1' } }), ['auto']));
  t('auto: a.veh "2"', () => assert.deepEqual(policies({ a: { veh: '2' } }), ['auto']));
  t('auto: a.veh "3+"', () => assert.deepEqual(policies({ a: { veh: '3+' } }), ['auto']));
  t('auto: not for a.veh "0"', () => assert.deepEqual(policies({ a: { veh: '0' } }), []));
  // home: a.home is "Own" or "Both"
  t('home: a.home "Own"', () => assert.deepEqual(policies({ a: { home: 'Own' } }), ['home']));
  t('home: a.home "Both"', () => assert.deepEqual(policies({ a: { home: 'Both' } }), ['home', 'renters']));
  t('home: not for a.home "Rent"', () => assert.deepEqual(policies({ a: { home: 'Rent' } }), ['renters']));
  // renters: a.home is "Rent" or "Both"
  t('renters: a.home "Rent"', () => assert.deepEqual(policies({ a: { home: 'Rent' } }), ['renters']));
  t('renters: a.home "Both"', () => assert.equal(policies({ a: { home: 'Both' } }).includes('renters'), true));
  t('renters: not for a.home "Own"', () => assert.equal(policies({ a: { home: 'Own' } }).includes('renters'), false));
  // health: q.health === "Yes"
  t('health: q.health "Yes"', () => assert.deepEqual(policies({ q: { health: 'Yes' } }), ['health']));
  t('health: not for q.health "No"', () => assert.deepEqual(policies({ q: { health: 'No' } }), []));
  // umbrella: p.umbrella.hasUmbrella === "Yes"
  t('umbrella: p.umbrella.hasUmbrella "Yes"', () => assert.deepEqual(policies({ p: { umbrella: { hasUmbrella: 'Yes' } } }), ['umbrella']));
  t('umbrella: not for "No"', () => assert.deepEqual(policies({ p: { umbrella: { hasUmbrella: 'No', limit: 1000000 } } }), []));
  // motorcycle / boat: extras includes "Motorcycle" / "Boat"
  t('motorcycle: extras includes "Motorcycle"', () => assert.deepEqual(policies({ extras: ['Motorcycle'] }), ['motorcycle']));
  t('boat: extras includes "Boat"', () => assert.deepEqual(policies({ extras: ['Boat'] }), ['boat']));
  t('motorcycle and boat together', () => assert.deepEqual(policies({ extras: ['Boat', 'Motorcycle'] }), ['boat', 'motorcycle']));
  t('Jet ski, RV, ATV and E-bike are out of v1 scope and add no policies', () => {
    assert.deepEqual(policies({ extras: ['Jet ski', 'RV', 'ATV', 'E-bike'] }), []);
  });
  // rental_car, towing, travel, phone, warranty, accidental_death: o.other_items
  for (const id of ['rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death']) {
    t(`${id}: from o.other_items`, () => assert.deepEqual(policies({ o: { other_items: [id] } }), [id]));
  }
  t('other_items entries that are not Other-bucket policies do not become policies', () => {
    assert.deepEqual(policies({ o: { other_items: ['auto', 'umbrella', 'bogus', 'not_sure', 'health'] } }), []);
  });
  t('other_items combined with derived policies are sorted together and deduplicated', () => {
    const out = policies({
      a: { veh: '2', home: 'Both' }, q: { health: 'Yes' }, extras: ['Boat'],
      o: { other_items: ['warranty', 'rental_car', 'towing', 'rental_car'] },
    });
    assert.deepEqual(out, ['auto', 'boat', 'health', 'home', 'rental_car', 'renters', 'towing', 'warranty']);
  });
  t('the order of other_items does not change the derived policies', () => {
    const a = deriveAnswers({ o: { other_items: ['travel', 'phone', 'towing'] } });
    const b = deriveAnswers({ o: { other_items: ['towing', 'travel', 'phone'] } });
    assert.deepEqual(a.policies, b.policies);
    assert.deepEqual(a.policies, ['phone', 'towing', 'travel']);
    // The other_items answer itself is passed through as given; the session canonicalizes it later.
    assert.deepEqual(a.other_items, ['travel', 'phone', 'towing']);
  });
});

suite('adapter: ignores what it must not read', (t) => {
  t('ignores state', () => {
    const base = { a: { veh: '1', home: 'Own' }, extras: [], q: {}, p: {}, o: {} };
    assert.deepEqual(deriveAnswers({ ...base, state: 'CA' }), deriveAnswers(base));
    assert.deepEqual(deriveAnswers({ ...base, state: 'FL' }), deriveAnswers({ ...base, state: 'MO' }));
  });
  t('never reads state: the snapshot is only touched through a, extras, q, p, o', () => {
    const log = [];
    deriveAnswers(recordReads({ state: 'CA', a: { veh: '1' }, extras: ['Boat'], q: { health: 'Yes' }, p: { umbrella: { hasUmbrella: 'Yes' } }, o: { other_items: ['towing'] }, secret: 'x' }, log));
    const top = log.filter((k) => !k.includes('.') && !k.includes('#'));
    for (const k of top) assert.includes(['a', 'extras', 'q', 'p', 'o'], k, `unexpected read of snapshot.${k}`);
    assert.equal(log.some((k) => k === 'state' || k === 'secret'), false);
  });
  t('ignores p.auto.liability (and every other policy-screen number)', () => {
    const base = { a: { veh: '1' } };
    const withNumbers = {
      a: { veh: '1' },
      p: {
        auto: { liability: 500, collision: true, premium: 1800 },
        home: { liability: 1000, dwelling: 400000 },
        umbrella: { hasUmbrella: 'No', limit: 5000000 },
        renters: { liability: 300 },
      },
    };
    assert.deepEqual(deriveAnswers(withNumbers), deriveAnswers(base));
  });
  t('reads only p.umbrella.hasUmbrella from p, only a.home/a.veh from a, only q.health from q', () => {
    const log = [];
    deriveAnswers(recordReads({
      a: { home: 'Own', veh: '2', dep: 'Yes' },
      extras: ['Boat'],
      q: { health: 'Yes', cushion: 'Yes', assets300: 'Yes' },
      p: { auto: { liability: 100 }, home: { liability: 300 }, umbrella: { hasUmbrella: 'Yes', limit: 2000000 } },
      o: {},
    }, log));
    const reads = (prefix) => log.filter((k) => k.startsWith(`${prefix}.`)).map((k) => k.slice(prefix.length + 1).split('.')[0]);
    assert.deepEqual([...new Set(reads('a'))].sort(), ['home', 'veh']);
    assert.deepEqual([...new Set(reads('q'))].sort(), ['health']);
    assert.deepEqual([...new Set(reads('p'))].sort(), ['umbrella']);
    assert.deepEqual([...new Set(log.filter((k) => k.startsWith('p.umbrella.')).map((k) => k.split('.')[2]))].sort(), ['hasUmbrella']);
  });
  t('a getter that throws on p.auto.liability is never triggered', () => {
    const p = { umbrella: { hasUmbrella: 'Yes' }, auto: {} };
    Object.defineProperty(p.auto, 'liability', { enumerable: true, get() { throw new Error('read p.auto.liability'); } });
    assert.deepEqual(policies({ p }), ['umbrella']);
  });
  t('only the host\'s exact values count', () => {
    assert.deepEqual(policies({ a: { veh: 1, home: 'own' }, q: { health: 'yes' }, p: { umbrella: { hasUmbrella: true } }, extras: ['motorcycle', 'boat'] }), []);
  });
});

suite('adapter: o.* passes through as answers', (t) => {
  t('copies every o.* answer by question id', () => {
    const o = { other_items: ['towing'], auto_liability: '250_500', supplements: ['accident', 'not_sure'], umbrella_limit: 'not_sure' };
    const out = deriveAnswers({ o });
    assert.deepEqual(out.auto_liability, '250_500');
    assert.deepEqual(out.supplements, ['accident', 'not_sure']);
    assert.equal(out.umbrella_limit, 'not_sure');
    assert.deepEqual(out.other_items, ['towing'], 'other_items is also an answer to the other_items question');
    assert.deepEqual(out.policies, ['towing']);
  });
  t('the full answers object is exactly o.* plus the derived policies', () => {
    assert.deepEqual(
      deriveAnswers({ a: { veh: '1' }, o: { auto_liability: '100_300' } }),
      { auto_liability: '100_300', policies: ['auto'] },
    );
  });
  t('arrays are copied, not shared with the snapshot', () => {
    const o = { supplements: ['accident'], other_items: ['towing'] };
    const out = deriveAnswers({ o });
    assert.notEqual(out.supplements, o.supplements);
    assert.notEqual(out.other_items, o.other_items);
    out.supplements.push('x');
    out.other_items.push('y');
    assert.deepEqual(o, { supplements: ['accident'], other_items: ['towing'] });
  });
  t('the derived policies always win over an o.policies key', () => {
    assert.deepEqual(deriveAnswers({ a: { veh: '1' }, o: { policies: ['boat', 'umbrella'] } }).policies, ['auto']);
  });
  t('undefined and null answers in o are skipped (unanswered = key absent)', () => {
    const out = deriveAnswers({ o: { a_q: undefined, b_q: null, c_q: 'x' } });
    assert.deepEqual(Object.keys(out).sort(), ['c_q', 'policies']);
  });
  t('keys are not filtered: pruning unknown ones is the session\'s job', () => {
    assert.equal(deriveAnswers({ o: { whatever: 'x' } }).whatever, 'x');
  });
});

suite('adapter: tolerance and purity', (t) => {
  t('missing or malformed snapshot parts give an empty derivation', () => {
    for (const snap of [undefined, null, {}, 'x', 5, [], { a: null }, { a: 'Own' }, { extras: null }, { extras: 'Boat' }, { extras: { 0: 'Boat' } },
      { q: undefined }, { p: null }, { p: { umbrella: null } }, { p: { umbrella: 'Yes' } }, { p: 'x' }, { o: null }, { o: [] }, { o: 'x' }]) {
      assert.deepEqual(deriveAnswers(snap), { policies: [] }, `snapshot ${JSON.stringify(snap)}`);
    }
  });
  t('each missing part is independent of the others', () => {
    assert.deepEqual(deriveAnswers({ a: { veh: '2' } }), { policies: ['auto'] });
    assert.deepEqual(deriveAnswers({ extras: ['Boat'] }), { policies: ['boat'] });
    assert.deepEqual(deriveAnswers({ o: { other_items: 'towing' } }).policies, [], 'a non-array other_items adds no policies');
    assert.deepEqual(deriveAnswers({ a: { veh: '1' }, p: null, q: null, o: null, extras: null }), { policies: ['auto'] });
  });
  t('does not mutate a deeply frozen snapshot', () => {
    const snap = deepFreeze({
      state: 'MO', a: { home: 'Both', veh: '3+', dep: 'Yes' }, extras: ['Boat', 'RV'], q: { health: 'Yes' },
      p: { umbrella: { hasUmbrella: 'Yes', limit: 1000000 }, auto: { liability: 100 } },
      o: { other_items: ['rental_car', 'phone'], supplements: ['accident'] },
    });
    const before = JSON.stringify(snap);
    const out = deriveAnswers(snap);
    assert.equal(JSON.stringify(snap), before);
    assert.deepEqual(out.policies, ['auto', 'boat', 'health', 'home', 'phone', 'rental_car', 'renters', 'umbrella']);
  });
  t('same snapshot twice gives deep-equal answers; each call returns a fresh object', () => {
    const snap = { a: { veh: '1' }, o: { other_items: ['towing'] } };
    const x = deriveAnswers(snap);
    const y = deriveAnswers(snap);
    assert.deepEqual(x, y);
    assert.notEqual(x, y);
    assert.notEqual(x.policies, y.policies);
  });
  t('the copy helper used by the tests does not change the result', () => {
    const snap = { a: { veh: '1' }, o: { x: ['y'] } };
    assert.deepEqual(deriveAnswers(copy(snap)), deriveAnswers(snap));
  });
});
