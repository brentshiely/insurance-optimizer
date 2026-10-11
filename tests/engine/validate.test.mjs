import { test, suite, assert } from '../harness.mjs';
import { validateCatalog, assertValidCatalog } from '../../public/js/overlap/engine/validate.mjs';
import FIXTURE from '../fixtures/catalog.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';

// Mutates a copy of the fixture, validates, and returns the result.
const check = (mutate) => {
  const c = copy(FIXTURE);
  mutate(c);
  return validateCatalog(c);
};
const q = (c, id) => c.questions.find((x) => x.id === id);
const f = (c, id) => c.flags.find((x) => x.id === id);

// Asserts the catalog is rejected with an error matching `re` (and that the fixture alone is clean).
function rejects(label, mutate, re) {
  test(`validate rejects: ${label}`, () => {
    const r = check(mutate);
    assert.equal(r.ok, false, 'expected the catalog to be rejected');
    assert.ok(r.errors.some((e) => re.test(e)), `expected an error matching ${re}, got:\n${r.errors.join('\n')}`);
  });
}

suite('validate: accepts good catalogs', (t) => {
  t('the fixture catalog is valid', () => {
    const r = validateCatalog(FIXTURE);
    assert.deepEqual(r.errors, []);
    assert.equal(r.ok, true);
  });
  t('a catalog with no cards key is valid (cards are optional) when no question names a card', () => {
    const r = check((c) => { delete c.cards; c.questions = c.questions.filter((x) => x.id !== 'cards'); });
    assert.equal(r.ok, true, r.errors.join('\n'));
    assert.equal(check((c) => { delete c.cards; }).ok, false, 'the cards question names card-alpha, which would no longer exist');
  });
  t('an empty catalog is valid', () => {
    assert.equal(validateCatalog({ questions: [], flags: [], sources: {}, cards: {} }).ok, true);
  });
  t('does not mutate a deeply frozen catalog', () => {
    const r = validateCatalog(deepFreeze(copy(FIXTURE)));
    assert.equal(r.ok, true);
  });
  t('assertValidCatalog returns the catalog when valid', () => {
    assert.equal(assertValidCatalog(FIXTURE), FIXTURE);
  });
  t('allowNotSure questions may reference not_sure in conditions', () => {
    const r = check((c) => { q(c, 'umbrella_ext_um').showIf = { answer: 'umbrella_limit', is: 'not_sure' }; });
    assert.equal(r.ok, true, r.errors.join('\n'));
  });
});

suite('validate: catalog shape', (t) => {
  t('non-object catalog', () => {
    assert.equal(validateCatalog(null).ok, false);
    assert.equal(validateCatalog(undefined).ok, false);
    assert.equal(validateCatalog([]).ok, false);
  });
  rejects('questions is not an array', (c) => { c.questions = {}; }, /catalog\.questions must be an array/);
  rejects('flags is not an array', (c) => { c.flags = null; }, /catalog\.flags must be an array/);
  rejects('sources is an array instead of an object keyed by id', (c) => { c.sources = []; }, /catalog\.sources must be an object keyed by source id/);
  rejects('sources is missing', (c) => { delete c.sources; }, /catalog\.sources must be an object/);
  rejects('cards is an array', (c) => { c.cards = []; }, /catalog\.cards must be an object keyed by card id/);
});

suite('validate: unique ids', (t) => {
  rejects('duplicate question ids', (c) => { c.questions.push(copy(q(c, 'umbrella_limit'))); }, /duplicate question id "umbrella_limit"/);
  rejects('duplicate flag ids', (c) => { c.flags.push(copy(c.flags[0])); }, /duplicate flag id "umbrella-auto-below-attach"/);
  rejects('duplicate option ids within a question', (c) => { q(c, 'umbrella_limit').options.push({ id: '1m', label: 'Again' }); }, /duplicate option id "1m"/);
  rejects('a source whose id differs from its key', (c) => { c.sources['fixture-iii'].id = 'something-else'; }, /source "fixture-iii": id must equal its key/);
  rejects('a card whose id differs from its key', (c) => { c.cards['card-alpha'].id = 'card-zeta'; }, /card "card-alpha": id must equal its key/);
  t('the same option id in two different questions is fine', () => {
    assert.equal(check(() => {}).ok, true); // '1m' appears in umbrella_limit and home_liability
  });
});

suite('validate: flags', (t) => {
  rejects('flag bucket not in raise|drop|question', (c) => { f(c, 'umbrella-um-missing').bucket = 'keep'; }, /flag "umbrella-um-missing": bucket must be one of raise, drop, question/);
  rejects('flag bucket missing', (c) => { delete f(c, 'umbrella-um-missing').bucket; }, /flag "umbrella-um-missing": bucket must be one of/);
  rejects('flag alternateBuckets is not an array', (c) => { f(c, 'umbrella-um-missing').alternateBuckets = 'question'; }, /flag "umbrella-um-missing": alternateBuckets must be a non-empty list of different buckets/);
  rejects('flag alternateBuckets is empty', (c) => { f(c, 'umbrella-um-missing').alternateBuckets = []; }, /flag "umbrella-um-missing": alternateBuckets must be a non-empty list/);
  rejects('flag alternateBuckets names something that is not a bucket', (c) => { f(c, 'umbrella-um-missing').alternateBuckets = ['keep']; }, /flag "umbrella-um-missing": alternateBuckets must be a non-empty list/);
  rejects('flag alternateBuckets repeats a bucket', (c) => { f(c, 'umbrella-um-missing').alternateBuckets = ['drop', 'drop']; }, /flag "umbrella-um-missing": alternateBuckets must be a non-empty list/);
  rejects('flag alternateBuckets includes the flag\'s own bucket', (c) => { f(c, 'umbrella-um-missing').alternateBuckets = [f(c, 'umbrella-um-missing').bucket]; }, /flag "umbrella-um-missing": alternateBuckets must be a non-empty list/);
  t('alternateBuckets is optional, and a list of other buckets is accepted', () => {
    assert.equal(check((c) => { delete f(c, 'umbrella-um-missing').alternateBuckets; }).ok, true);
    assert.equal(check((c) => { f(c, 'umbrella-um-missing').alternateBuckets = ['raise', 'drop'].filter((b) => b !== f(c, 'umbrella-um-missing').bucket); }).ok, true);
  });
  rejects('flag kind invalid', (c) => { f(c, 'umbrella-um-missing').kind = 'other-kind'; }, /flag "umbrella-um-missing": kind must be one of cross-policy, within-policy, education/);
  rejects('flag domain invalid', (c) => { f(c, 'umbrella-um-missing').domain = 'pets'; }, /flag "umbrella-um-missing": domain must be one of/);
  rejects('flag with zero sourceIds', (c) => { f(c, 'umbrella-um-missing').sourceIds = []; }, /flag "umbrella-um-missing": needs at least one sourceId/);
  rejects('flag with sourceIds missing', (c) => { delete f(c, 'umbrella-um-missing').sourceIds; }, /flag "umbrella-um-missing": needs at least one sourceId/);
  rejects('flag with sourceIds not an array', (c) => { f(c, 'umbrella-um-missing').sourceIds = 'fixture-naic'; }, /flag "umbrella-um-missing": sourceIds must be an array/);
  rejects('flag citing an unknown source', (c) => { f(c, 'umbrella-um-missing').sourceIds = ['fixture-naic', 'ghost-source']; }, /flag "umbrella-um-missing": cites unknown source "ghost-source"/);
  rejects('flag priority not a finite number', (c) => { f(c, 'umbrella-um-missing').priority = '10'; }, /flag "umbrella-um-missing": priority must be a finite number/);
  rejects('flag applies is not a function', (c) => { f(c, 'umbrella-um-missing').applies = 'yes'; }, /flag "umbrella-um-missing": applies must be a function/);
  for (const field of ['title', 'background', 'ask', 'reason']) {
    rejects(`flag ${field} is a number`, (c) => { f(c, 'umbrella-um-missing')[field] = 5; }, new RegExp(`flag "umbrella-um-missing": ${field} must be a non-empty string or a function`));
    rejects(`flag ${field} is missing`, (c) => { delete f(c, 'umbrella-um-missing')[field]; }, new RegExp(`flag "umbrella-um-missing": ${field} must be a non-empty string or a function`));
    rejects(`flag ${field} is an empty string`, (c) => { f(c, 'umbrella-um-missing')[field] = ''; }, new RegExp(`flag "umbrella-um-missing": ${field} must be a non-empty string or a function`));
  }
  rejects('flag text with a malformed template token', (c) => { f(c, 'umbrella-um-missing').background = 'Broken {{ not valid }}'; }, /flag "umbrella-um-missing": background has a malformed template/);
  t('function text fields are accepted', () => {
    assert.equal(check((c) => { f(c, 'umbrella-um-missing').ask = () => 'Ask.'; }).ok, true);
  });
  t('priority is optional', () => {
    assert.equal(check((c) => { delete f(c, 'umbrella-um-missing').priority; }).ok, true);
  });
});

suite('validate: sources', (t) => {
  for (const field of ['publisher', 'title', 'url', 'lastVerified']) {
    rejects(`source missing ${field}`, (c) => { delete c.sources['fixture-iii'][field]; }, new RegExp(`source "fixture-iii": ${field} must be`));
  }
  rejects('source with an empty publisher', (c) => { c.sources['fixture-iii'].publisher = ''; }, /source "fixture-iii": publisher must be a non-empty string/);
  rejects('source that is not an object', (c) => { c.sources['fixture-iii'] = 'https://example.org'; }, /source "fixture-iii": must be an object/);
  rejects('source key that is not kebab-case', (c) => { c.sources.Bad_Key = { ...c.sources['fixture-iii'], id: 'Bad_Key' }; }, /source id "Bad_Key" must be kebab-case/);
  for (const url of ['http://example.org/x', 'ftp://example.org/x', 'example.org/x', 'https://', 'https://localhost/x', 'https://exa mple.org', 'https://example.org/a b', '', 'javascript:alert(1)']) {
    rejects(`source url ${JSON.stringify(url)}`, (c) => { c.sources['fixture-iii'].url = url; }, /source "fixture-iii": url must be an https URL/);
  }
  rejects('source url that is not a string', (c) => { c.sources['fixture-iii'].url = 42; }, /source "fixture-iii": url must be an https URL/);
  for (const date of ['10/10/2026', '2026-1-1', '2026-13-01', '2026-00-10', '2026-02-30', '2026-04-31', '2026-02-29', '2100-02-29', '2026-10-32', '2026-10-00', '', '2026-10-10T00:00', ' 2026-10-10']) {
    rejects(`source lastVerified ${JSON.stringify(date)}`, (c) => { c.sources['fixture-iii'].lastVerified = date; }, /source "fixture-iii": lastVerified must be a real date/);
  }
  rejects('source lastVerified that is a number', (c) => { c.sources['fixture-iii'].lastVerified = 20261010; }, /lastVerified must be a real date/);
  t('real https URLs and leap-day dates are accepted', () => {
    const r = check((c) => {
      c.sources['fixture-iii'].url = 'https://www.example.org:8443/a/b-c?x=1&y=2#frag';
      c.sources['fixture-naic'].lastVerified = '2024-02-29';
      c.sources['fixture-issuer'].lastVerified = '2000-02-29';
    });
    assert.equal(r.ok, true, r.errors.join('\n'));
  });
});

suite('validate: questions', (t) => {
  rejects('question id not snake_case', (c) => { q(c, 'umbrella_limit').id = 'UmbrellaLimit'; }, /question id "UmbrellaLimit" must be snake_case/);
  rejects('question id with a hyphen', (c) => { q(c, 'umbrella_limit').id = 'umbrella-limit'; }, /question id "umbrella-limit" must be snake_case/);
  rejects('question domain invalid', (c) => { q(c, 'umbrella_limit').domain = 'pets'; }, /question "umbrella_limit": domain must be one of/);
  rejects('question section invalid', (c) => { q(c, 'umbrella_limit').section = 'Not Snake'; }, /question "umbrella_limit": section must be a snake_case string/);
  rejects('question type invalid', (c) => { q(c, 'umbrella_limit').type = 'radio'; }, /question "umbrella_limit": type must be "single" or "multi"/);
  rejects('question prompt missing', (c) => { delete q(c, 'umbrella_limit').prompt; }, /question "umbrella_limit": prompt must be a non-empty string/);
  rejects('question help not a string', (c) => { q(c, 'umbrella_limit').help = 5; }, /question "umbrella_limit": help must be a string/);
  rejects('question allowNotSure not a boolean', (c) => { q(c, 'umbrella_limit').allowNotSure = 'yes'; }, /question "umbrella_limit": allowNotSure must be a boolean/);
  rejects('question with no options', (c) => { q(c, 'umbrella_limit').options = []; }, /question "umbrella_limit": options must be a non-empty array/);
  rejects('question options not an array', (c) => { q(c, 'umbrella_limit').options = 'x'; }, /question "umbrella_limit": options must be a non-empty array/);
  rejects('explicit not_sure option', (c) => { q(c, 'umbrella_limit').options.push({ id: 'not_sure', label: 'Not sure' }); }, /question "umbrella_limit": option id "not_sure" is reserved/);
  rejects('option id not snake_case', (c) => { q(c, 'umbrella_limit').options[0].id = 'One-Million'; }, /question "umbrella_limit": option id "One-Million" must be snake_case/);
  rejects('option without a label', (c) => { delete q(c, 'umbrella_limit').options[0].label; }, /question "umbrella_limit": option "1m" needs a non-empty label/);
  rejects('option exclusive not a boolean', (c) => { q(c, 'supplements').options[0].exclusive = 'yes'; }, /question "supplements": option "accident": exclusive must be a boolean/);
  rejects('question that is not an object', (c) => { c.questions.push('x'); }, /question #\d+ must be an object/);
  rejects('showIf that is not a valid condition', (c) => { q(c, 'umbrella_ext_um').showIf = { answer: 'umbrella_limit' }; }, /question "umbrella_ext_um": showIf: .*exactly one of/);
  t('showIf null or absent is fine', () => {
    assert.equal(check((c) => { q(c, 'umbrella_ext_um').showIf = null; delete q(c, 'umbrella_um_detail').showIf; }).ok, true);
  });
  t('an option id may start with a digit', () => {
    assert.equal(check((c) => { q(c, 'umbrella_limit').options.push({ id: '10m', label: '$10 million' }); }).ok, true);
  });
});

suite('validate: showIf references', (t) => {
  rejects('dangling question reference (answered)', (c) => { q(c, 'umbrella_ext_um').showIf = { answered: 'ghost_question' }; }, /question "umbrella_ext_um": showIf references unknown question "ghost_question"/);
  rejects('dangling question reference (answer is)', (c) => { q(c, 'umbrella_ext_um').showIf = { answer: 'ghost_question', is: 'a' }; }, /showIf references unknown question "ghost_question"/);
  rejects('dangling question reference nested in all/any/not', (c) => { q(c, 'umbrella_ext_um').showIf = { all: [{ holds: 'umbrella' }, { not: { any: [{ answered: 'ghost_question' }] } }] }; }, /showIf references unknown question "ghost_question"/);
  rejects('unknown option id in `is`', (c) => { q(c, 'umbrella_um_detail').showIf = { answer: 'umbrella_ext_um', is: 'maybe' }; }, /question "umbrella_um_detail": showIf references unknown option "maybe" of question "umbrella_ext_um"/);
  rejects('unknown option id in `in`', (c) => { q(c, 'umbrella_side_business').showIf = { answer: 'umbrella_limit', in: ['1m', '9m'] }; }, /showIf references unknown option "9m" of question "umbrella_limit"/);
  rejects('unknown option id in `includes`', (c) => { q(c, 'supplement_cost').showIf = { answer: 'supplements', includes: 'cancer' }; }, /showIf references unknown option "cancer" of question "supplements"/);
  rejects('not_sure referenced where the question does not allow it', (c) => { q(c, 'umbrella_side_business').showIf = { answer: 'umbrella_um_detail', is: 'not_sure' }; }, /showIf references unknown option "not_sure" of question "umbrella_um_detail"/);
  rejects('`is` used on a multi question', (c) => { q(c, 'supplement_cost').showIf = { answer: 'supplements', is: 'accident' }; }, /showIf uses "is" on multi question "supplements"/);
  rejects('`in` used on a multi question', (c) => { q(c, 'supplement_cost').showIf = { answer: 'supplements', in: ['accident'] }; }, /showIf uses "in" on multi question "supplements"/);
  rejects('`includes` used on a single question', (c) => { q(c, 'umbrella_um_detail').showIf = { answer: 'umbrella_ext_um', includes: 'no' }; }, /showIf uses "includes" on single question "umbrella_ext_um"/);
  rejects('holds with an unknown policy id', (c) => { q(c, 'umbrella_limit').showIf = { holds: 'umbrela' }; }, /question "umbrella_limit": showIf references unknown policy id "umbrela"/);
  t('a reference to a later question is fine (order does not matter)', () => {
    // assets_band is declared after umbrella_limit and does not depend on it, so this is not a cycle.
    const r = check((c) => { q(c, 'umbrella_limit').showIf = { all: [{ holds: 'umbrella' }, { not: { answered: 'assets_band' } }] }; });
    assert.equal(r.ok, true, r.errors.join('\n'));
  });
});

suite('validate: Q1, the policies question (R1 step A)', (t) => {
  rejects('a holds gate in a catalog that has no policies question', (c) => { c.questions = c.questions.filter((x) => x.id !== 'policies'); }, /showIf uses holds, which reads the "policies" question \(Q1\), but the catalog has no such question/);
  rejects('Q1 that is a single question', (c) => { q(c, 'policies').type = 'single'; }, /question "policies" \(Q1\): must be a multi question/);
  rejects('Q1 that is gated', (c) => { q(c, 'policies').showIf = { answered: 'assets_band' }; }, /question "policies" \(Q1\): must be always shown/);
  rejects('Q1 that offers Not sure', (c) => { q(c, 'policies').allowNotSure = true; }, /question "policies" \(Q1\): must not offer Not sure/);
  rejects('Q1 with an ordinary option that is not a policy id', (c) => { q(c, 'policies').options.splice(1, 0, { id: 'flood', label: 'Flood insurance' }); }, /question "policies" \(Q1\): option "flood" is not a policy id/);
  t('a holds gate on Q1 itself is reported as both a gated Q1 and a cycle (holds reads Q1)', () => {
    const r = check((c) => { q(c, 'policies').showIf = { holds: 'auto' }; });
    assert.ok(r.errors.some((e) => /must be always shown/.test(e)), r.errors.join('\n'));
    assert.ok(r.errors.some((e) => /condition cycle: policies -> policies/.test(e)), r.errors.join('\n'));
  });
  t('Q1 may carry any exclusive option id for its "None of these" tick', () => {
    const r = check((c) => { q(c, 'policies').options.find((o) => o.exclusive).id = 'nothing_here'; });
    assert.equal(r.ok, true, r.errors.join('\n'));
  });
  t('a catalog with no holds gate needs no Q1', () => {
    const r = check((c) => {
      c.questions = c.questions.filter((x) => x.id === 'assets_band');
      c.questions[0].showIf = null;
      c.flags = [];
    });
    assert.equal(r.ok, true, r.errors.join('\n'));
  });
  t('a holds gate counts as an edge to Q1 in cycle detection, and is not a cycle by itself', () => {
    assert.equal(validateCatalog(FIXTURE).ok, true);
  });
});

suite('validate: condition cycles', (t) => {
  rejects('a question that references itself', (c) => { q(c, 'umbrella_ext_um').showIf = { answered: 'umbrella_ext_um' }; }, /condition cycle: umbrella_ext_um -> umbrella_ext_um/);
  rejects('two questions that reference each other', (c) => {
    q(c, 'umbrella_limit').showIf = { answered: 'umbrella_ext_um' };
  }, /condition cycle: .*umbrella_limit.*umbrella_ext_um/);
  rejects('a three-question cycle', (c) => {
    q(c, 'umbrella_limit').showIf = { answered: 'umbrella_um_detail' };
  }, /condition cycle: /);
  rejects('a cycle through a not/any wrapper', (c) => {
    q(c, 'umbrella_limit').showIf = { not: { any: [{ holds: 'umbrella' }, { answer: 'umbrella_side_business', in: ['1m'] }] } };
  }, /condition cycle: /);
  t('the cycle error names the questions in order', () => {
    const r = check((c) => { q(c, 'umbrella_limit').showIf = { answered: 'umbrella_um_detail' }; });
    const cyc = r.errors.find((e) => /condition cycle/.test(e));
    assert.match(cyc, /condition cycle: umbrella_limit -> umbrella_um_detail -> umbrella_ext_um -> umbrella_limit/);
  });
  t('a diamond (two paths to one question) is not a cycle', () => {
    // um_detail now depends on ext_um AND side_business, which both depend on umbrella_limit.
    const r = check((c) => {
      q(c, 'umbrella_um_detail').showIf = { all: [{ answer: 'umbrella_ext_um', is: 'no' }, { answer: 'umbrella_side_business', is: 'yes' }] };
    });
    assert.equal(r.ok, true, r.errors.join('\n'));
  });
});

suite('validate: id conventions', (t) => {
  rejects('flag id not kebab-case (underscore)', (c) => { f(c, 'umbrella-um-missing').id = 'umbrella_um_missing'; }, /flag id "umbrella_um_missing" must be kebab-case/);
  rejects('flag id not kebab-case (uppercase)', (c) => { f(c, 'umbrella-um-missing').id = 'Umbrella-Missing'; }, /flag id "Umbrella-Missing" must be kebab-case/);
  rejects('flag id missing', (c) => { delete f(c, 'umbrella-um-missing').id; }, /flag #\d+: id must be a non-empty string/);
  rejects('card id not kebab-case', (c) => { c.cards.Card_Gamma = { ...c.cards['card-alpha'], id: 'Card_Gamma' }; }, /card id "Card_Gamma" must be kebab-case/);
  rejects('flag that is not an object', (c) => { c.flags.push(7); }, /flag #\d+ must be an object/);
});

suite('validate: cards', (t) => {
  rejects('card without a name', (c) => { delete c.cards['card-alpha'].name; }, /card "card-alpha": name must be a non-empty string/);
  rejects('card without an issuer', (c) => { delete c.cards['card-alpha'].issuer; }, /card "card-alpha": issuer must be a non-empty string/);
  rejects('card with a bad lastVerified', (c) => { c.cards['card-alpha'].lastVerified = '2026-02-30'; }, /card "card-alpha": lastVerified must be a real date/);
  rejects('card with an http guideUrl', (c) => { c.cards['card-alpha'].guideUrl = 'http://example.org/g'; }, /card "card-alpha": guideUrl must be an https URL/);
  rejects('card without benefits', (c) => { delete c.cards['card-alpha'].benefits; }, /card "card-alpha": benefits must be an object/);
  rejects('card missing a required benefit key', (c) => { delete c.cards['card-alpha'].benefits.roadside; }, /card "card-alpha": benefit "roadside" is missing/);
  rejects('benefit with an invalid status', (c) => { c.cards['card-alpha'].benefits.rentalCar.status = 'maybe'; }, /card "card-alpha": benefit "rentalCar": status must be one of primary, secondary, yes, none, unverified/);
  rejects('benefit without a summary', (c) => { delete c.cards['card-alpha'].benefits.rentalCar.summary; }, /card "card-alpha": benefit "rentalCar": summary must be a non-empty string/);
  rejects('benefit with non-string conditions', (c) => { c.cards['card-alpha'].benefits.rentalCar.conditions = 5; }, /card "card-alpha": benefit "rentalCar": conditions must be a string/);
  rejects('benefit that is not an object', (c) => { c.cards['card-alpha'].benefits.rentalCar = 'primary'; }, /card "card-alpha": benefit "rentalCar" must be an object/);
  rejects('card that is not an object', (c) => { c.cards['card-alpha'] = null; }, /card "card-alpha": must be an object/);
  rejects('cards question option pointing at an unknown card', (c) => { q(c, 'cards').options[0].value.cardId = 'ghost-card'; }, /question "cards": option "card_alpha" value\.cardId "ghost-card" is not in cards/);
  t('an extra benefit key with a valid shape is allowed', () => {
    assert.equal(check((c) => { c.cards['card-alpha'].benefits.baggage = { status: 'unverified', summary: 'Not confirmed.' }; }).ok, true);
  });
});

suite('validate: assertValidCatalog and error reporting', (t) => {
  t('throws and lists every error, not just the first', () => {
    const c = copy(FIXTURE);
    f(c, 'umbrella-um-missing').sourceIds = [];
    delete c.sources['fixture-iii'].url;
    q(c, 'umbrella_ext_um').showIf = { answered: 'ghost_question' };
    let message = '';
    try { assertValidCatalog(c); } catch (e) { message = e.message; }
    assert.match(message, /Invalid catalog \(3 errors\)/);
    assert.match(message, /needs at least one sourceId/);
    assert.match(message, /url must be an https URL/);
    assert.match(message, /unknown question "ghost_question"/);
  });
  t('uses singular wording for a single error', () => {
    const c = copy(FIXTURE);
    c.sources['fixture-iii'].url = 'http://example.org';
    assert.throws(() => assertValidCatalog(c), /Invalid catalog \(1 error\)/);
  });
  t('errors is an array of strings; ok matches errors.length', () => {
    const r = check((c) => { c.flags.push(copy(c.flags[0])); });
    assert.equal(Array.isArray(r.errors), true);
    assert.equal(r.errors.every((e) => typeof e === 'string'), true);
    assert.equal(r.ok, r.errors.length === 0);
  });
  t('validation is deterministic', () => {
    const run = () => check((c) => { c.flags.push(copy(c.flags[0])); delete c.sources['fixture-iii'].title; });
    assert.deepEqual(run(), run());
  });
});
