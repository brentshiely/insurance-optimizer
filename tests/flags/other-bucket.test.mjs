// Story S11: tests for the Other-bucket flags (public/js/overlap/data/flags/other.mjs).
//
// What is tested
//   * the flag set equals the plan rows for S11 (ids, buckets, kinds, domains, priorities, sources) and the
//     real catalog validates;
//   * per flag: fires when it should, stays silent when it should not, every Not sure fallback, emphasis rules,
//     the branch wording, sources resolve, no unresolved tokens;
//   * card wording against a FIXTURE card table (tests/fixtures/otherCards.mjs). The real CARDS table is empty
//     until Stories S4b and S11b (DECISIONS D14), so card naming, strong emphasis, "unverified is never asserted"
//     and the freshness caution are proved here, never against real card claims. With no table (or the empty
//     real one) the flags must stay generic: no card named, normal emphasis;
//   * sweeps over many policy and answer combinations: copy rules (no state, no placeholder, no dash, no
//     acronym left undefined), no card named without a table, determinism, inputs never mutated, and the questions each flag reads stay inside
//     the plan;
//   * one end-to-end evaluate() per flag on the real catalog with plain answers (Q1, `policies`, holds the ticks).
//
// Pure data checks; runs under jsc and Node (no URL, console, Date or Intl).
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import FLAGS, { CARD_CAUTION } from '../../public/js/overlap/data/flags/other.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { CARDS } from '../../public/js/overlap/data/cards.mjs';
import { CARD_CHOICES } from '../../public/js/overlap/data/questions/cards.mjs';
import { evaluate, createContext } from '../../public/js/overlap/engine/evaluate.mjs';
import { validateCatalog } from '../../public/js/overlap/engine/validate.mjs';
import PLAN from '../fixtures/flagPlan.mjs';
import { FIXTURE_CARDS, UNVERIFIED_MARKER, NONE_MARKER } from '../fixtures/otherCards.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';

// ---------------------------------------------------------------------------------------------------
// Catalogs and helpers
// ---------------------------------------------------------------------------------------------------

const NO_CARDS = { ...CATALOG, cards: {} };          // generic wording, whatever the real table holds
const WITH_CARDS = { ...CATALOG, cards: FIXTURE_CARDS }; // card-aware wording

const RENTAL = 'other-rental-car-waiver';
const TOWING = 'other-towing-roadside-duplicate';
const VEHICLE = 'other-vehicle-towing-check';
const TRAVEL = 'other-travel-insurance-overlap';
const PHONE = 'other-phone-insurance-card';
const WARRANTY = 'other-extended-warranty-overlap';
const ADD = 'other-add-on-term-life';
const ALL_IDS = [RENTAL, TOWING, VEHICLE, TRAVEL, PHONE, WARRANTY, ADD];

// Option ids of the `cards` question for the fixture cards (card id with hyphens turned into underscores).
const ALPHA = 'chase_sapphire_preferred'; // rentalCar primary, tripProtection yes, extendedWarranty yes, roadside secondary
const BETA = 'amex_platinum';             // rentalCar secondary, cellPhone yes, roadside yes
const GAMMA = 'citi_double_cash';         // every benefit none
const DELTA = 'wells_fargo_active_cash';  // every benefit unverified
const EPS = 'capital_one_venture';        // rentalCar yes
const cardIdOf = (optionId) => optionId.replace(/_/g, '-');
const CONFIRMED = ['primary', 'secondary', 'yes'];
// 'unknown' for a card the question offers but the fixture table does not have (the flags treat it as not confirmed).
const statusOf = (optionId, key) => {
  const card = FIXTURE_CARDS[cardIdOf(optionId)];
  return card ? card.benefits[key].status : 'unknown';
};
const nameOf = (optionId) => FIXTURE_CARDS[cardIdOf(optionId)].name;
const isConfirmed = (optionId, key) => CONFIRMED.includes(statusOf(optionId, key));
const realCards = (set) => set.filter((c) => c !== 'other_none');

// Plain answers. Q1 (`policies`) holds what the user ticked; every other key is the user's own tap on a closed list.
// By default the household owns a home and has one car (BASE). `rest.base` replaces that list and `rest.plus` adds
// policies on top of it (for example a motorcycle).
const BASE = ['auto', 'home'];
const plain = (policies, more) => ({ policies: policies.slice(), ...(more || {}) });
const run = (answers, catalog = CATALOG) => evaluate(answers, catalog);
const allFlags = (r) => [...r.flags.raise, ...r.flags.drop, ...r.flags.question];
const find = (r, id) => allFlags(r).find((f) => f.id === id);
const otherIds = (r) => allFlags(r).map((f) => f.id).filter((id) => ALL_IDS.includes(id));
const textOf = (f) => [f.title, f.background, f.ask, f.reason].join('\n');

// Shorthand scenario builders
// `list` is the Other-bucket items ticked in Q1 ('none' ticks nothing).
const items = (list, more = {}, rest = {}) => plain([...(rest.base || BASE), ...(rest.plus || []), ...list.filter((id) => id !== 'none')], more);
const withCards = (set, usual) => {
  const o = { cards: set };
  if (usual !== undefined && !set.includes('other_none')) o.card_usual_payment = usual;
  return o;
};

const STATE_NAMES = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington state|west virginia|wisconsin|wyoming|district of columbia)\b/i;
const BANNED = /home equity|next screen|generic pattern|todo|tbd|lorem|placeholder|\{\{|\}\}|—|–|undefined|NaN|\[object/i;
const CARD_WORDS = /chase|amex|american express|citi\b|wells fargo|capital one|sapphire|freedom|venture|platinum|fixture/i;

// Acronyms and organisation short names a reader may not know (DECISIONS S11-7). Each text must stand alone, so the
// first time an acronym appears in it, it must be defined right there: either "Full Name (ACR, one-clause gloss)"
// or "ACR (expansion)". AAA is a household brand name used as an example, not a term of the trade.
const ACRONYM = /\b(?:[A-Z]{2,}(?:&[A-Z]+)?|Triple-I)\b/g;
const KNOWN_BRANDS = ['AAA'];
function undefinedAcronyms(text) {
  const bad = [];
  const seen = [];
  ACRONYM.lastIndex = 0;
  let m;
  while ((m = ACRONYM.exec(text)) !== null) {
    const acr = m[0];
    if (seen.includes(acr) || KNOWN_BRANDS.includes(acr)) continue;
    seen.push(acr);
    const forward = new RegExp(`[A-Z][A-Za-z]*(?: [A-Za-z]+)+ \\(${acr}, [^)]{10,}\\)`).exec(text);
    const afterFull = forward ? forward.index + forward[0].indexOf('(') + 1 : -1;
    const reverse = /^ \([a-z][^)]{10,}\)/.test(text.slice(m.index + acr.length));
    if (afterFull !== m.index && !reverse) bad.push(acr);
  }
  return bad;
}

// ---------------------------------------------------------------------------------------------------
// 1. The flag set and the plan
// ---------------------------------------------------------------------------------------------------

suite('other bucket: the flag set matches the plan', (t) => {
  const rows = PLAN.flags.filter((f) => f.story === 'S11');

  t('exports exactly the seven planned flags, in plan order', () => {
    assert.deepEqual(FLAGS.map((f) => f.id), ALL_IDS);
    assert.deepEqual(rows.map((r) => r.id), ALL_IDS);
  });

  t('ids, buckets, kinds, domains, priorities and sources equal the plan rows for S11', () => {
    assert.deepEqual(FLAGS.map((f) => f.id).sort(), rows.map((r) => r.id).sort(), 'no flag missing and none extra');
    for (const row of rows) {
      const flag = FLAGS.find((f) => f.id === row.id);
      assert.equal(flag.bucket, row.bucket, `${row.id} bucket`);
      assert.equal(flag.kind, row.kind, `${row.id} kind`);
      assert.equal(flag.domain, row.domain, `${row.id} domain`);
      assert.equal(flag.priority, row.priority, `${row.id} priority`);
      assert.deepEqual([...flag.sourceIds].sort(), [...row.sourceIds].sort(), `${row.id} sources`);
      assert.equal(row.file, 'other');
    }
  });

  t('the buckets are the ones the plan gives: drop for rental, roadside, travel, warranty; question for the vehicle check, phone, AD&D', () => {
    const bucketOf = {};
    FLAGS.forEach((f) => { bucketOf[f.id] = f.bucket; });
    assert.deepEqual(bucketOf, {
      [RENTAL]: 'drop', [TOWING]: 'drop', [VEHICLE]: 'question', [TRAVEL]: 'drop',
      [PHONE]: 'question', [WARRANTY]: 'drop', [ADD]: 'question',
    });
  });

  t('every flag has the contract fields and priorities stay inside S11\'s range 500 to 599, unique', () => {
    const seen = {};
    for (const f of FLAGS) {
      assert.match(f.id, /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, `${f.id} is kebab-case`);
      assert.equal(typeof f.applies, 'function', `${f.id} applies`);
      for (const field of ['title', 'background', 'ask', 'reason']) {
        assert.equal(typeof f[field] === 'string' || typeof f[field] === 'function', true, `${f.id} ${field}`);
      }
      assert.equal(f.priority >= 500 && f.priority <= 599, true, `${f.id} priority range`);
      assert.equal(seen[f.priority], undefined, `${f.id} priority is unique`);
      seen[f.priority] = true;
      assert.equal(f.sourceIds.length >= 1, true, `${f.id} needs a source`);
      for (const sid of f.sourceIds) assert.notEqual(SOURCES[sid], undefined, `${f.id}: unknown source ${sid}`);
    }
  });

  t('the real catalog validates, and so does the catalog with the fixture cards', () => {
    const real = validateCatalog(CATALOG);
    assert.deepEqual(real.errors, []);
    const fixture = validateCatalog(WITH_CARDS);
    assert.deepEqual(fixture.errors, []);
  });

  t('the fixture cards are unmistakably fake and cover every status (so the card tests mean something)', () => {
    const statuses = {};
    for (const card of Object.values(FIXTURE_CARDS)) {
      assert.match(card.name, /^Fixture Card /);
      assert.match(card.guideUrl, /^https:\/\/example\.org\//);
      for (const b of Object.values(card.benefits)) statuses[b.status] = true;
    }
    assert.deepEqual(Object.keys(statuses).sort(), ['none', 'primary', 'secondary', 'unverified', 'yes']);
    // every fixture card id is one the real cards question offers
    const offered = CARD_CHOICES.map((c) => c.id);
    for (const id of Object.keys(FIXTURE_CARDS)) assert.includes(offered, id);
  });

  t('while the real card table is empty, nothing in the real catalog names a card; when S11b fills it this test steps aside', () => {
    if (Object.keys(CARDS).length > 0) return; // S11b: real-data scenarios replace this check
    const r = run(items(['rental_car', 'travel', 'warranty', 'phone', 'towing'], {
      ...withCards([ALPHA, BETA], 'yes'),
      roadside_sources: ['club', 'card'],
    }));
    for (const f of allFlags(r)) {
      assert.equal(CARD_WORDS.test(textOf(f)), false, `${f.id} names a card: ${textOf(f)}`);
      assert.equal(f.emphasis, 'normal', `${f.id} emphasis with an empty card table`);
    }
  });
});

// ---------------------------------------------------------------------------------------------------
// 2. Rental car
// ---------------------------------------------------------------------------------------------------

suite('other-rental-car-waiver', (t) => {
  const rental = (more = {}, rest = {}) => items(['rental_car'], more, rest);
  // A cheap, paid-off car makes `auto_collision` visible.
  const cheapCar = (collision) => ({ auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: collision });

  t('fires only when rental car insurance is ticked', () => {
    assert.notEqual(find(run(rental()), RENTAL), undefined);
    for (const list of [[], ['none'], ['towing'], ['travel', 'phone', 'warranty', 'accidental_death']]) {
      assert.equal(find(run(items(list)), RENTAL), undefined, JSON.stringify(list));
    }
  });

  t('is a Drop and, with no card named, uses the generic wording at normal emphasis', () => {
    const f = find(run(rental(), NO_CARDS), RENTAL);
    assert.equal(f.bucket, 'drop');
    assert.equal(f.emphasis, 'normal');
    assert.includes(f.background, 'If you carry a credit card, check its current benefits guide');
    assert.includes(f.background, 'usually secondary');
    assert.includes(f.ask, 'in writing');
    assert.includes(f.background, CARD_CAUTION);
  });

  t('says what the sources support: the waiver is not insurance, your own policy generally applies, you can owe the repair bill', () => {
    const f = find(run(rental()), RENTAL);
    assert.includes(f.background, 'is not technically insurance');
    assert.includes(f.background, 'generally apply to a rental you use for personal trips');
    assert.includes(f.background, "sometimes up to the car's full value");
    assert.includes(f.background, 'decline the rental company\'s waiver');
  });

  t('quotes no price (the NAIC per-day figures are undated)', () => {
    for (const opts of [rental(), rental({}, { base: ['home'] }), rental(withCards([ALPHA], 'yes'))]) {
      assert.equal(/\$|per day|a day/i.test(textOf(find(run(opts, WITH_CARDS), RENTAL))), false);
    }
  });

  t('the user\'s own policy: with a car the text relies on collision and comprehensive; with no car or no collision it warns instead', () => {
    const withCar = find(run(rental()), RENTAL);
    assert.includes(withCar.background, 'collision and comprehensive');
    assert.equal(withCar.background.includes('did not tell us about a car insurance policy'), false);

    const noCar = find(run(rental({}, { base: ['home'] })), RENTAL);
    assert.includes(noCar.background, 'You did not tell us about a car insurance policy');
    assert.includes(noCar.ask, 'find out what would pay');
    assert.includes(noCar.reason, 'what would pay if a rental car were damaged');

    const noCollision = find(run(rental(cheapCar('no'))), RENTAL);
    assert.includes(noCollision.background, 'do not carry collision and comprehensive');
    assert.includes(noCollision.ask, 'Ask your car insurer whether anything on your policy extends to a rental car');

    for (const answer of ['yes', 'not_sure']) {
      const f = find(run(rental(cheapCar(answer))), RENTAL);
      assert.notEqual(f, undefined, `collision ${answer} still fires`);
      assert.equal(f.background.includes('do not carry collision'), false, `collision ${answer} is not treated as "no"`);
    }
  });

  t('a held card with a confirmed rental benefit is named, with its own words, its status gloss and the date we checked', () => {
    const f = find(run(rental(withCards([ALPHA], 'yes')), WITH_CARDS), RENTAL);
    assert.includes(f.background, 'Our notes on Fixture Card Alpha (last checked October 1, 2026)');
    assert.includes(f.background, 'Fixture rental car damage coverage.');
    assert.includes(f.background, 'listed as primary, which means it pays before your own insurance');
    assert.includes(f.background, 'Conditions: Decline the rental company waiver and charge the whole rental to the card.');
    const beta = find(run(rental(withCards([BETA], 'yes')), WITH_CARDS), RENTAL);
    assert.includes(beta.background, 'listed as secondary, which means it pays only after your own insurance');
    assert.includes(beta.background, 'last checked September 15, 2026');
    const eps = find(run(rental(withCards([EPS], 'yes')), WITH_CARDS), RENTAL);
    assert.includes(eps.background, 'Our notes on Fixture Card Epsilon');
    assert.equal(/listed as (primary|secondary)/.test(eps.background), false, 'a plain yes is neither primary nor secondary');
  });

  t('strong only when a held card confirms the benefit AND the user usually pays with their cards AND their own policy can be relied on', () => {
    const strong = find(run(rental(withCards([ALPHA], 'yes')), WITH_CARDS), RENTAL);
    assert.equal(strong.emphasis, 'strong');
    assert.includes(strong.ask, 'put your next rental on Fixture Card Alpha and decline the waiver');
    for (const usual of ['no', 'not_sure', undefined]) {
      assert.equal(find(run(rental(withCards([ALPHA], usual)), WITH_CARDS), RENTAL).emphasis, 'normal', `usual payment ${usual}`);
    }
    // softer when the user holds no car policy, or says they have no collision on a cheap paid-off car
    assert.equal(find(run(rental(withCards([ALPHA], 'yes'), { base: ['home'] }), WITH_CARDS), RENTAL).emphasis, 'normal');
    assert.equal(find(run(rental({ ...withCards([ALPHA], 'yes'), ...cheapCar('no') }), WITH_CARDS), RENTAL).emphasis, 'normal');
    assert.equal(find(run(rental({ ...withCards([ALPHA], 'yes'), ...cheapCar('yes') }), WITH_CARDS), RENTAL).emphasis, 'strong');
    // Not sure never raises emphasis, and a Not sure collision answer does not lower it either
    assert.equal(find(run(rental({ ...withCards([ALPHA], 'yes'), ...cheapCar('not_sure') }), WITH_CARDS), RENTAL).emphasis, 'strong');
  });

  t('a card whose rental benefit is unverified is never asserted; it becomes "check whether ... in its current benefits guide"', () => {
    const f = find(run(rental(withCards([DELTA], 'yes')), WITH_CARDS), RENTAL);
    assert.equal(f.emphasis, 'normal', 'unverified never raises emphasis');
    assert.includes(f.background, 'Check whether Fixture Card Delta includes rental car coverage in its current benefits guide.');
    assert.equal(f.background.includes('Our notes on Fixture Card Delta'), false);
    assert.equal(textOf(f).includes(UNVERIFIED_MARKER), false);
  });

  t('a card with no rental benefit (status none) is not mentioned and never raises emphasis', () => {
    const f = find(run(rental(withCards([GAMMA], 'yes')), WITH_CARDS), RENTAL);
    assert.equal(f.emphasis, 'normal');
    assert.equal(textOf(f).includes('Fixture Card Gamma'), false);
    assert.equal(textOf(f).includes(NONE_MARKER), false);
    assert.includes(f.background, 'the card you carry', 'falls back to the generic sentence');
  });

  t('several cards: the confirmed one is named, the unverified one is a question, the no-benefit one is silent', () => {
    const f = find(run(rental(withCards([ALPHA, BETA, GAMMA, DELTA], 'yes')), WITH_CARDS), RENTAL);
    assert.includes(f.background, 'Our notes on Fixture Card Alpha');
    assert.includes(f.background, 'Our notes on Fixture Card Beta');
    assert.includes(f.background, 'Check whether Fixture Card Delta includes');
    assert.equal(textOf(f).includes('Gamma'), false);
    assert.includes(f.ask, 'put your next rental on one of Fixture Card Beta and Fixture Card Alpha'); // cards are ordered by card id
  });

  t('when the user does not usually pay with these cards the text says the rental would have to go on the card', () => {
    const f = find(run(rental(withCards([ALPHA], 'no')), WITH_CARDS), RENTAL);
    assert.includes(f.background, 'you usually do not pay with these cards');
    assert.includes(f.background, 'put the rental on the card');
  });

  t('a listed card the table does not know is not named and the wording says "the card you carry"', () => {
    const f = find(run(rental(withCards([ALPHA], 'yes')), NO_CARDS), RENTAL);
    assert.equal(f.emphasis, 'normal');
    assert.includes(f.background, 'for the card you carry');
    assert.equal(CARD_WORDS.test(textOf(f)), false);
  });

  t('another card or no card (other_none) hides the usual-payment question and keeps the generic wording', () => {
    const f = find(run(rental(withCards(['other_none'])), WITH_CARDS), RENTAL);
    assert.equal(f.emphasis, 'normal');
    assert.includes(f.background, 'If you carry a credit card, check its current benefits guide');
  });
});

// ---------------------------------------------------------------------------------------------------
// 3. Towing and roadside: duplicate sources
// ---------------------------------------------------------------------------------------------------

suite('other-towing-roadside-duplicate', (t) => {
  const towing = (sources, more = {}, rest = {}) => items(['towing'], { roadside_sources: sources, ...more }, rest);

  t('fires with two or more counted sources, in any pairing', () => {
    const counted = ['auto_policy', 'club', 'card', 'car_maker'];
    for (let i = 0; i < counted.length; i++) {
      for (let j = i + 1; j < counted.length; j++) {
        const f = find(run(towing([counted[i], counted[j]])), TOWING);
        assert.notEqual(f, undefined, `${counted[i]} + ${counted[j]}`);
        assert.equal(f.bucket, 'drop');
      }
    }
    assert.notEqual(find(run(towing(counted)), TOWING), undefined);
    assert.notEqual(find(run(towing(['auto_policy', 'club', 'other'])), TOWING), undefined, 'other is simply ignored');
  });

  t('stays silent with fewer than two counted sources, with only "something else", Not sure, or no answer', () => {
    for (const sources of [['club'], ['card'], ['other'], ['club', 'other'], ['not_sure']]) {
      assert.equal(find(run(towing(sources)), TOWING), undefined, JSON.stringify(sources));
    }
    assert.equal(find(run(items(['towing'])), TOWING), undefined, 'roadside_sources unanswered');
  });

  t('stays silent when towing is not ticked even if the follow-up answer is still in memory', () => {
    const r = run(items(['travel'], { roadside_sources: ['club', 'card'] }));
    assert.equal(find(r, TOWING), undefined);
  });

  t('names the sources the user ticked, in plain words and question order', () => {
    const f = find(run(towing(['car_maker', 'auto_policy', 'club', 'card'])), TOWING);
    assert.includes(f.background, 'a roadside add-on on your car insurance, an auto club membership, a credit card and roadside help that came with your car');
    const pair = find(run(towing(['club', 'car_maker'])), TOWING);
    assert.includes(pair.background, 'an auto club membership and roadside help that came with your car');
  });

  t('says only what the NAIC supports: an optional extra, memberships may already include some of it, plans differ; no price, limit or mileage', () => {
    const f = find(run(towing(['auto_policy', 'club'])), TOWING);
    assert.includes(f.background, 'optional extra');
    assert.includes(f.background, 'may already include some of the same help');
    assert.includes(f.background, 'Plans differ');
    assert.equal(/\$|mile|per year|a year/i.test(textOf(f)), false);
    assert.includes(f.ask, 'take the add-on off your car policy');
    const noAddOn = find(run(towing(['club', 'car_maker'])), TOWING);
    assert.equal(noAddOn.ask.includes('take the add-on off'), false);
    assert.includes(noAddOn.ask, 'cancel the one you would use least');
  });

  t('generic wording and normal emphasis with no card table', () => {
    const f = find(run(towing(['club', 'card'], withCards([ALPHA])), NO_CARDS), TOWING);
    assert.equal(f.emphasis, 'normal');
    assert.includes(f.background, 'for the card you carry');
    assert.includes(f.background, CARD_CAUTION);
    assert.equal(CARD_WORDS.test(textOf(f)), false);
  });

  t('strong only when the user ticked a card as a source AND a held card confirms roadside help; the card is named', () => {
    const f = find(run(towing(['club', 'card'], withCards([BETA])), WITH_CARDS), TOWING);
    assert.equal(f.emphasis, 'strong');
    assert.includes(f.background, 'Our notes on Fixture Card Beta');
    assert.includes(f.ask, 'Read the current benefits guide for Fixture Card Beta');
    assert.includes(f.background, CARD_CAUTION);
    // a confirmed card does not make a one-source answer fire, and does not matter if "card" was not ticked
    assert.equal(find(run(towing(['club'], withCards([BETA])), WITH_CARDS), TOWING), undefined);
    assert.equal(find(run(towing(['club', 'auto_policy'], withCards([BETA])), WITH_CARDS), TOWING).emphasis, 'normal');
    // unverified or no-benefit cards never raise emphasis
    for (const card of [DELTA, GAMMA, EPS]) {
      assert.equal(find(run(towing(['club', 'card'], withCards([card])), WITH_CARDS), TOWING).emphasis, 'normal', card);
    }
    const delta = find(run(towing(['club', 'card'], withCards([DELTA])), WITH_CARDS), TOWING);
    assert.includes(delta.background, 'Check whether Fixture Card Delta includes roadside help in its current benefits guide.');
    assert.equal(textOf(delta).includes(UNVERIFIED_MARKER), false);
  });

  t('without a card in the answer the card caution is not forced on text that never mentions a card', () => {
    const f = find(run(towing(['auto_policy', 'club']), WITH_CARDS), TOWING);
    assert.equal(f.background.includes('Card benefits change'), false);
    assert.equal(/credit card|your card/i.test(textOf(f)), false);
  });
});

// ---------------------------------------------------------------------------------------------------
// 4. Towing on a motorcycle or boat policy
// ---------------------------------------------------------------------------------------------------

suite('other-vehicle-towing-check', (t) => {
  const MOTO = { plus: ['motorcycle'] };
  const BOAT = { plus: ['boat'] };
  const BOTH = { plus: ['motorcycle', 'boat'] };
  const scenario = (answer, rest, more = {}) => items(['towing'], { towing_vehicle_policy: answer, ...more }, rest);

  t('fires on yes and on Not sure, as a Question, for a motorcycle, a boat or both', () => {
    for (const rest of [MOTO, BOAT, BOTH]) {
      for (const answer of ['yes', 'not_sure']) {
        const f = find(run(scenario(answer, rest)), VEHICLE);
        assert.notEqual(f, undefined, `${JSON.stringify(rest)} ${answer}`);
        assert.equal(f.bucket, 'question');
        assert.equal(f.emphasis, 'normal');
      }
    }
  });

  t('stays silent on no, with no answer, with no motorcycle or boat, and without a towing plan', () => {
    assert.equal(find(run(scenario('no', MOTO)), VEHICLE), undefined);
    assert.equal(find(run(items(['towing'], {}, MOTO)), VEHICLE), undefined, 'unanswered');
    assert.equal(find(run(scenario('yes', {})), VEHICLE), undefined, 'no motorcycle or boat');
    assert.equal(find(run(items(['travel'], { towing_vehicle_policy: 'yes' }, MOTO)), VEHICLE), undefined, 'no towing plan');
  });

  t('the title and text name the right vehicle', () => {
    assert.equal(find(run(scenario('yes', MOTO)), VEHICLE).title, 'Check where the towing help on your motorcycle comes from');
    assert.equal(find(run(scenario('yes', BOAT)), VEHICLE).title, 'Check where the towing help on your boat comes from');
    assert.equal(find(run(scenario('yes', BOTH)), VEHICLE).title, 'Check where the towing help on your motorcycle or boat comes from');
    assert.includes(find(run(scenario('yes', BOTH)), VEHICLE).reason, 'the towing plan on my motorcycle or boat');
  });

  t('asserts only the sourced points: a car policy does not cover motorcycles; Triple-I lists towing on boat policies; no duplication is claimed', () => {
    const moto = find(run(scenario('yes', MOTO)), VEHICLE);
    assert.includes(moto.background, 'does not cover motorcycles');
    assert.equal(moto.background.includes('boat policy'), false, 'a motorcycle-only text does not mention boats');
    const boat = find(run(scenario('yes', BOAT)), VEHICLE);
    assert.includes(boat.background, 'Insurance Information Institute (Triple-I, an insurance industry research group) lists towing after an accident among the common and optional coverages on a boat policy');
    assert.equal(boat.background.includes('motorcycles'), false, 'a boat-only text does not claim anything about motorcycles');
    assert.equal(boat.background.includes('does not cover boats'), false, 'no source says a car policy excludes boats');
    for (const f of [moto, boat]) {
      assert.includes(f.background, 'a question to ask, not a verdict');
      assert.equal(/you are paying twice|duplicate|duplicates/i.test(textOf(f)), false);
    }
  });

  t('the ask differs: yes asks what the plan covers; Not sure first asks whether the plan is on that policy', () => {
    const yes = find(run(scenario('yes', MOTO)), VEHICLE);
    assert.includes(yes.ask, 'Ask the company that insures your motorcycle exactly what its towing coverage includes');
    const unsure = find(run(scenario('not_sure', MOTO)), VEHICLE);
    assert.includes(unsure.ask, 'First find out whether your towing plan is on your motorcycle policy');
    assert.equal(unsure.ask.includes('Ask the company that insures'), false);
  });

  t('it points at the club and card the user said they have, and always carries the card caution because it always names a card as a possible source', () => {
    const both = find(run(scenario('yes', BOAT, { roadside_sources: ['club', 'card'] })), VEHICLE);
    assert.includes(both.ask, 'Also ask your auto club and the credit card whether the help reaches your boat at all');
    const clubOnly = find(run(scenario('yes', BOAT, { roadside_sources: ['club'] })), VEHICLE);
    assert.includes(clubOnly.ask, 'Also ask your auto club whether the help reaches your boat at all');
    const neither = find(run(scenario('yes', BOAT)), VEHICLE);
    assert.includes(neither.ask, 'Also ask any auto club or credit card that gives you roadside help');
    for (const f of [both, clubOnly, neither]) assert.includes(f.background, CARD_CAUTION);
  });

  t('a held card never changes it: no card is named and emphasis stays normal', () => {
    const f = find(run(scenario('yes', BOAT, { ...withCards([BETA], 'yes'), roadside_sources: ['card', 'club'] }), WITH_CARDS), VEHICLE);
    assert.equal(f.emphasis, 'normal');
    assert.equal(CARD_WORDS.test(textOf(f)), false);
  });
});

// ---------------------------------------------------------------------------------------------------
// 5. Travel insurance
// ---------------------------------------------------------------------------------------------------

suite('other-travel-insurance-overlap', (t) => {
  const travel = (more = {}, rest = {}) => items(['travel'], more, rest);

  t('fires only when travel insurance is ticked, as a Drop', () => {
    const f = find(run(travel()), TRAVEL);
    assert.equal(f.bucket, 'drop');
    for (const list of [[], ['none'], ['rental_car', 'towing', 'phone', 'warranty', 'accidental_death']]) {
      assert.equal(find(run(items(list)), TRAVEL), undefined);
    }
  });

  t('generic wording: compare covered reasons with the card, home or renters policy and life insurance; cost share; medical caution', () => {
    const f = find(run(travel()), TRAVEL);
    assert.equal(f.emphasis, 'normal');
    assert.includes(f.background, 'usually costs about 5% to 10% of the trip price');
    assert.includes(f.background, 'Some credit cards include trip cancellation');
    assert.includes(f.background, 'home or renters policy usually covers belongings lost or stolen while you travel');
    assert.includes(f.background, 'may duplicate your life insurance');
    assert.includes(f.background, 'your health plan may not cover care abroad');
    assert.includes(f.background, 'If you carry a credit card, check its current benefits guide');
    assert.includes(f.ask, 'trip protection terms, including the reasons it covers and its limits');
    assert.includes(f.ask, 'Ask your health insurer whether it covers you abroad before you give up medical coverage');
  });

  t('never promises that a card covers a trip', () => {
    for (const opts of [travel(), travel(withCards([ALPHA], 'yes'))]) {
      const f = find(run(opts, WITH_CARDS), TRAVEL);
      assert.equal(/your card (covers|will cover|definitely)|no need for (travel )?insurance|you do not need travel insurance/i.test(textOf(f)), false);
      assert.includes(f.background, CARD_CAUTION);
    }
  });

  t('strong only when a held card confirms trip protection AND the user usually pays with their cards', () => {
    const strong = find(run(travel(withCards([ALPHA], 'yes')), WITH_CARDS), TRAVEL);
    assert.equal(strong.emphasis, 'strong');
    assert.includes(strong.background, 'Our notes on Fixture Card Alpha (last checked October 1, 2026) show that its benefits guide lists trip protection');
    assert.includes(strong.ask, 'Read the current benefits guide for Fixture Card Alpha');
    for (const usual of ['no', 'not_sure', undefined]) {
      assert.equal(find(run(travel(withCards([ALPHA], usual)), WITH_CARDS), TRAVEL).emphasis, 'normal', `usual ${usual}`);
    }
    for (const card of [BETA, GAMMA, DELTA]) {
      assert.equal(find(run(travel(withCards([card], 'yes')), WITH_CARDS), TRAVEL).emphasis, 'normal', `${card} has no confirmed trip protection`);
    }
  });

  t('an unverified trip protection benefit is a question, never a claim', () => {
    const f = find(run(travel(withCards([BETA], 'yes')), WITH_CARDS), TRAVEL);
    assert.includes(f.background, 'Check whether Fixture Card Beta includes trip protection in its current benefits guide.');
    assert.equal(f.background.includes('Our notes on Fixture Card Beta'), false);
    assert.equal(textOf(f).includes(UNVERIFIED_MARKER), false);
  });

  t('the usual-payment line follows the answer', () => {
    assert.includes(find(run(travel(withCards([ALPHA], 'yes')), WITH_CARDS), TRAVEL).background, 'You told us you usually pay with one of these cards.');
    assert.includes(find(run(travel(withCards([ALPHA], 'no')), WITH_CARDS), TRAVEL).background, 'put the trip on the card');
    assert.includes(find(run(travel(withCards([ALPHA], 'not_sure')), WITH_CARDS), TRAVEL).background, "Check whether the card's coverage applies only to what you charge to it.");
  });
});

// ---------------------------------------------------------------------------------------------------
// 6. Phone insurance
// ---------------------------------------------------------------------------------------------------

suite('other-phone-insurance-card', (t) => {
  const phone = (more = {}, rest = {}) => items(['phone'], more, rest);

  t('fires only when phone insurance is ticked, as a Question', () => {
    const f = find(run(phone()), PHONE);
    assert.equal(f.bucket, 'question');
    for (const list of [[], ['none'], ['rental_car', 'towing', 'travel', 'warranty', 'accidental_death']]) {
      assert.equal(find(run(items(list)), PHONE), undefined);
    }
  });

  t('generic wording asks; it asserts nothing about phone plans or card terms, and keeps the carrier plan until cover is confirmed', () => {
    const f = find(run(phone()), PHONE);
    assert.equal(f.emphasis, 'normal');
    assert.includes(f.background, 'If you carry a credit card, check its current benefits guide for cell phone protection');
    assert.includes(f.ask, 'Ask the issuer of any card you carry whether it protects your phone and what it requires');
    assert.includes(f.ask, 'Keep the carrier plan until one of them confirms coverage');
    assert.equal(/deductible of \$|\$\d|per year|claims a year|lost phone|refurbished/i.test(textOf(f)), false, 'no Consumer Reports claims');
  });

  t('the home and renters sentence follows the policies the user holds', () => {
    assert.includes(find(run(phone({}, { base: ['auto', 'home'] })), PHONE).background, 'Your homeowners policy generally covers your belongings');
    assert.includes(find(run(phone({}, { base: ['auto', 'renters'] })), PHONE).background, 'Your renters policy generally covers your belongings');
    assert.includes(find(run(phone({}, { base: ['auto', 'home', 'renters'] })), PHONE).background, 'Your homeowners or renters policy generally covers your belongings');
    assert.equal(find(run(phone({}, { base: ['auto'] })), PHONE).background.includes('generally covers your belongings'), false, 'neither policy held');
    const f = find(run(phone()), PHONE);
    assert.includes(f.background, 'Ask whether it covers a phone and what you would pay out of pocket first');
  });

  t('the bill answer: yes points at the card the bill is on; no and Not sure add nothing, because no allowlisted source says what a card requires for phone cover', () => {
    const background = (bill) => find(run(phone(bill === undefined ? {} : { phone_bill_on_card: bill }), NO_CARDS), PHONE).background;
    assert.includes(background('yes'), 'You said your phone bill is already charged to a credit card, so that card is the first one to check.');
    assert.equal(background(undefined).includes('first one to check'), false);
    for (const bill of ['no', 'not_sure']) {
      assert.equal(background(bill), background(undefined), `bill ${bill} changes the generic background`);
    }
  });

  t('generic wording never says how a card ties phone cover to the bill, for any bill answer (research: cellPhone has no generic support)', () => {
    const CLAIM = /depend|has to be charged|have to be charged|must be (charged|paid)|only if you pay|which card the monthly|how the bill is paid/i;
    for (const bill of ['yes', 'no', 'not_sure', undefined]) {
      const f = find(run(phone(bill === undefined ? {} : { phone_bill_on_card: bill }), NO_CARDS), PHONE);
      assert.equal(CLAIM.test(textOf(f)), false, `bill ${bill}: ${textOf(f)}`);
      assert.includes(f.ask, 'Ask the issuer of any card you carry whether it protects your phone and what it requires. Ask your home or renters insurer');
    }
  });

  t('strong, with the "route the bill through the card" move, only for a confirmed cellPhone benefit AND a bill already on a card', () => {
    const f = find(run(phone({ ...withCards([BETA]), phone_bill_on_card: 'yes' }), WITH_CARDS), PHONE);
    assert.equal(f.emphasis, 'strong');
    assert.includes(f.background, 'Our notes on Fixture Card Beta (last checked September 15, 2026) show that its benefits guide lists cell phone protection');
    assert.includes(f.background, 'Conditions: The monthly phone bill must be paid with the card.');
    assert.includes(f.ask, 'Make sure your phone bill is charged to Fixture Card Beta');
    assert.includes(f.ask, 'ask your carrier to cancel the protection plan');
    assert.includes(f.ask, 'swap the carrier\'s plan for the card\'s coverage, not to cancel and go without');
    assert.includes(f.reason, 'swap the carrier plan for that coverage');
  });

  t('the bill answer does not say which card: the reason is conditional, and the ask says so unless the confirmed card is the only one ticked', () => {
    const run1 = (cards, catalog = WITH_CARDS) => find(run(phone({ ...withCards(cards), phone_bill_on_card: 'yes' }), catalog), PHONE);
    const WHICH = 'You told us your phone bill is on a credit card, but not which one. ';

    // The confirmed card is the only one ticked: the bill can only be on it, so the ask stays direct.
    const only = run1([BETA]);
    assert.equal(only.reason, 'If my phone bill is charged to Fixture Card Beta, I want to swap the carrier plan for that coverage instead of paying twice.');
    assert.equal(only.ask.includes('not which one'), false);
    assert.equal(only.ask.startsWith('Make sure your phone bill is charged to Fixture Card Beta'), true);

    // Another card is ticked too (no benefit, unverified, a card the table does not know, or an unconfirmed phone benefit):
    // the bill may be on that one, so the ask says we do not know and the reason is still conditional.
    for (const others of [[GAMMA], [DELTA], [ALPHA], ['chase_freedom_flex'], [GAMMA, DELTA]]) {
      const f = run1([BETA, ...others]);
      const label = JSON.stringify(others);
      assert.equal(f.emphasis, 'strong', `${label}: the emphasis rule is unchanged`);
      assert.includes(f.ask, WHICH + 'Make sure your phone bill is charged to Fixture Card Beta, and read that card\'s current benefits guide', label);
      assert.includes(f.ask, 'ask your carrier to cancel the protection plan', label);
      assert.equal(f.reason, 'If my phone bill is charged to Fixture Card Beta, I want to swap the carrier plan for that coverage instead of paying twice.', label);
      assert.equal(f.ask.includes('Fixture Card Gamma'), false, `${label}: a no-benefit card is not mentioned`);
    }
  });

  t('two held cards with a confirmed phone benefit are offered as a choice, never as the card the bill is on', () => {
    const second = { ...FIXTURE_CARDS['capital-one-venture'], benefits: { ...FIXTURE_CARDS['capital-one-venture'].benefits, cellPhone: { status: 'secondary', summary: 'Fixture second phone cover.' } } };
    const twoPhoneCards = { ...CATALOG, cards: { ...FIXTURE_CARDS, 'capital-one-venture': second } };
    const f = find(run(phone({ ...withCards([BETA, EPS]), phone_bill_on_card: 'yes' }), twoPhoneCards), PHONE);
    assert.equal(f.emphasis, 'strong');
    assert.includes(f.ask, 'You told us your phone bill is on a credit card, but not which one. Make sure your phone bill is charged to one of Fixture Card Beta and Fixture Card Epsilon');
    assert.equal(f.reason, 'If my phone bill is charged to one of Fixture Card Beta and Fixture Card Epsilon, I want to swap the carrier plan for that coverage instead of paying twice.');
  });

  t('a bill not on a card, or Not sure, or no answer: the card is named but the move is only a conditional question and emphasis stays normal', () => {
    for (const bill of ['no', 'not_sure', undefined]) {
      const more = { ...withCards([BETA]) };
      if (bill !== undefined) more.phone_bill_on_card = bill;
      const f = find(run(phone(more), WITH_CARDS), PHONE);
      assert.equal(f.emphasis, 'normal', `bill ${bill}`);
      assert.includes(f.ask, 'whether paying your phone bill with the card turns its phone coverage on');
      assert.includes(f.ask, 'If it does, the move is to put the bill on that card and then cancel the carrier\'s plan');
      assert.includes(f.ask, 'Keep the carrier\'s plan until the card\'s coverage is confirmed');
      assert.equal(f.ask.includes('ask your carrier to cancel the protection plan'), false, 'the move is not stated as an action');
    }
  });

  t('no confirmed card benefit means no strong emphasis, whatever the bill answer', () => {
    for (const card of [ALPHA, GAMMA, DELTA]) {
      const f = find(run(phone({ ...withCards([card]), phone_bill_on_card: 'yes' }), WITH_CARDS), PHONE);
      assert.equal(f.emphasis, 'normal', card);
    }
    const alpha = find(run(phone({ ...withCards([ALPHA]), phone_bill_on_card: 'yes' }), WITH_CARDS), PHONE);
    assert.includes(alpha.background, 'Check whether Fixture Card Alpha includes cell phone protection in its current benefits guide.');
    assert.equal(textOf(alpha).includes(UNVERIFIED_MARKER), false);
  });

  t('with no card table the wording stays generic even when the bill is on a card', () => {
    const f = find(run(phone({ ...withCards([BETA], 'yes'), phone_bill_on_card: 'yes' }), NO_CARDS), PHONE);
    assert.equal(f.emphasis, 'normal');
    assert.equal(CARD_WORDS.test(textOf(f)), false);
    assert.includes(f.background, 'for the card you carry');
  });

  t('the card_usual_payment answer (about rentals, trips and electronics) does not move the phone flag', () => {
    const base = { ...withCards([BETA], 'yes'), phone_bill_on_card: 'no' };
    const other = { ...withCards([BETA], 'no'), phone_bill_on_card: 'no' };
    assert.deepEqual(find(run(phone(base), WITH_CARDS), PHONE), find(run(phone(other), WITH_CARDS), PHONE));
  });
});

// ---------------------------------------------------------------------------------------------------
// 7. Extended warranties
// ---------------------------------------------------------------------------------------------------

suite('other-extended-warranty-overlap', (t) => {
  const warranty = (more = {}, rest = {}) => items(['warranty'], more, rest);

  t('fires only when extended warranties are ticked, as a Drop', () => {
    const f = find(run(warranty()), WARRANTY);
    assert.equal(f.bucket, 'drop');
    for (const list of [[], ['none'], ['rental_car', 'towing', 'travel', 'phone', 'accidental_death']]) {
      assert.equal(find(run(items(list)), WARRANTY), undefined);
    }
  });

  t('generic wording is the FTC value test: separate, may repeat the product warranty, hidden costs, savings; no claim about cards', () => {
    const f = find(run(warranty()), WARRANTY);
    assert.equal(f.emphasis, 'normal');
    assert.includes(f.background, "the product's own warranty may already cover the same repairs for the same period");
    assert.includes(f.background, 'hidden costs such as deductibles, per-repair fees and shipping');
    assert.includes(f.background, 'setting the money aside in savings');
    assert.includes(f.background, 'If you carry a credit card, check its current benefits guide for an extended warranty benefit');
    assert.includes(f.ask, 'who stands behind the contract');
    assert.includes(f.ask, "Check whether the card you would pay with extends the manufacturer's warranty");
    assert.equal(/many cards extend|most cards extend|cards usually extend/i.test(textOf(f)), false, 'no unverified generic card claim');
    assert.equal(/rarely|nearly every case|never worth/i.test(textOf(f)), false, 'does not overstate the FTC');
  });

  t('strong only for a confirmed extendedWarranty benefit AND a usual card payment; the card is named', () => {
    const f = find(run(warranty(withCards([ALPHA], 'yes')), WITH_CARDS), WARRANTY);
    assert.equal(f.emphasis, 'strong');
    assert.includes(f.background, 'Our notes on Fixture Card Alpha');
    assert.includes(f.background, 'lists an extended warranty benefit');
    assert.includes(f.ask, 'Read the current benefits guide for Fixture Card Alpha');
    for (const usual of ['no', 'not_sure', undefined]) {
      assert.equal(find(run(warranty(withCards([ALPHA], usual)), WITH_CARDS), WARRANTY).emphasis, 'normal', `usual ${usual}`);
    }
    for (const card of [BETA, GAMMA, DELTA]) {
      assert.equal(find(run(warranty(withCards([card], 'yes')), WITH_CARDS), WARRANTY).emphasis, 'normal', card);
    }
  });

  t('a card with no extended warranty (none) is not mentioned; an unverified one is a question', () => {
    const none = find(run(warranty(withCards([BETA], 'yes')), WITH_CARDS), WARRANTY);
    assert.equal(textOf(none).includes('Fixture Card Beta'), false);
    const delta = find(run(warranty(withCards([DELTA], 'yes')), WITH_CARDS), WARRANTY);
    assert.includes(delta.background, 'Check whether Fixture Card Delta includes an extended warranty benefit in its current benefits guide.');
  });
});

// ---------------------------------------------------------------------------------------------------
// 8. Accidental death coverage next to life insurance
// ---------------------------------------------------------------------------------------------------

suite('other-add-on-term-life', (t) => {
  const add = (term, more = {}, rest = {}) => items(['accidental_death'], term === undefined ? more : { term_life: term, ...more }, rest);

  t('fires for each term_life answer, as a Question', () => {
    for (const term of ['own', 'work_only', 'none', 'not_sure']) {
      const f = find(run(add(term)), ADD);
      assert.notEqual(f, undefined, term);
      assert.equal(f.bucket, 'question');
      assert.equal(f.emphasis, 'normal');
    }
  });

  t('is silent without an accidental death item and while term_life is unanswered', () => {
    assert.equal(find(run(add(undefined)), ADD), undefined, 'unanswered');
    for (const list of [[], ['none'], ['rental_car', 'towing', 'travel', 'phone', 'warranty']]) {
      assert.equal(find(run(items(list, { term_life: 'own' })), ADD), undefined, JSON.stringify(list));
    }
  });

  t('every branch gives the sourced definition and says to read the policy for exclusions', () => {
    for (const term of ['own', 'work_only', 'none', 'not_sure']) {
      const f = find(run(add(term)), ADD);
      assert.includes(f.background, 'pays a stated amount only when an accident, or certain kinds of accident, causes a death or a loss');
      assert.includes(f.background, 'a term policy, for example, pays if you die during its term');
      assert.includes(f.background, 'Read your policy for how it defines an accident and for its exclusions');
    }
  });

  t('own: asks whether the term life already covers what the AD&D is for', () => {
    const f = find(run(add('own')), ADD);
    assert.includes(f.background, 'you have a life insurance policy of your own');
    assert.includes(f.background, 'yours may already pay if an accident causes your death');
    assert.includes(f.background, 'Some accidental death riders on a life policy pay two or three times the regular benefit');
    assert.includes(f.background, 'It may also pay for certain non-fatal losses, which a policy that pays only when you die would not');
    assert.includes(f.ask, 'whether your term life policy already covers what this accidental death coverage is for');
    assert.includes(f.ask, 'what the accidental death coverage pays for beyond it (including any non-fatal losses)');
    assert.includes(f.reason, 'I already have life insurance');
    assert.includes(f.reason, 'including any non-fatal losses');
  });

  // Fix after verification (DECISIONS S11-9): the own branch first said AD&D adds money "only for that one
  // narrow case", which hides that the NAIC definition covers dismemberment (a non-fatal loss) too.
  t('never shrinks the coverage to a death-only "narrow case": a loss stays in view in every branch', () => {
    const sentencesOf = (text) => text.match(/[^.?!]+[.?!]?/g) || [];
    for (const term of ['own', 'work_only', 'none', 'not_sure']) {
      const f = find(run(add(term, { }, {})), ADD);
      const text = textOf(f);
      assert.equal(/narrow case|one case|only that one|just one case/i.test(text), false, `${term}: the extra payout is not "one narrow case"`);
      // Any sentence that says the coverage pays only when/for a death must also name a loss.
      for (const part of ['background', 'ask', 'reason']) {
        for (const sentence of sentencesOf(f[part])) {
          if (/\bonly\b[^.?!]*\bdeath\b/i.test(sentence)) {
            assert.equal(/\bloss/i.test(sentence), true, `${term} ${part}: "${sentence.trim()}" says only a death without naming a loss`);
          }
        }
      }
      // The definition (non-fatal loss included) is in every branch's background.
      assert.includes(f.background, 'causes a death or a loss');
    }
    // The branches that talk about what the coverage pays name the non-fatal losses to ask about.
    assert.includes(find(run(add('own')), ADD).ask, 'non-fatal losses');
    assert.includes(find(run(add('not_sure')), ADD).ask, 'including any non-fatal losses');
    assert.includes(find(run(add('none')), ADD).ask, 'for which losses');
    assert.includes(find(run(add('none')), ADD).background, 'causes a death or a loss');
  });

  t('work_only: employer life is modest and tied to the job; asks whether total coverage is enough', () => {
    const f = find(run(add('work_only')), ADD);
    assert.includes(f.background, 'generally covers about one to two years of pay');
    assert.includes(f.background, 'ends if your job situation changes');
    assert.includes(f.ask, 'whether it and any accidental death coverage through work end if you leave');
    assert.includes(f.ask, 'whether your total life coverage is enough');
    assert.equal(/accidental death coverage (always )?ends with (the|your) job/i.test(textOf(f)), false, 'employer AD&D ending with the job is unsourced and only asked');
  });

  t('none: AD&D is not a substitute for regular life insurance', () => {
    const f = find(run(add('none')), ADD);
    assert.includes(f.background, 'is not a substitute for it');
    assert.includes(f.ask, 'what regular life insurance would cost and whether you need it');
  });

  t('Not sure: asks what life coverage exists', () => {
    const f = find(run(add('not_sure')), ADD);
    assert.includes(f.background, 'You were not sure what regular life insurance you have');
    assert.includes(f.ask, 'what life insurance you have, through work or on your own');
    assert.equal(f.ask.includes('still needed'), false, 'the question is what the extra buys for its price, not whether it is needed');
    assert.includes(f.ask, 'whether it is worth its price');
  });

  t('never tells the user to drop it, and states no figure', () => {
    for (const term of ['own', 'work_only', 'none', 'not_sure']) {
      const f = find(run(add(term, {}, {})), ADD);
      assert.equal(/\bdrop\b|get rid of|cancel it|redundant|no matter what|regardless of (the )?cause|whatever the cause/i.test(textOf(f)), false, term);
      assert.equal(/\$/.test(textOf(f)), false, term);
    }
  });

  t('adds the travel duplicate sentence only when travel insurance is also held', () => {
    const without = find(run(add('own')), ADD);
    assert.equal(without.background.includes('travel insurance'), false);
    const withTravel = find(run(items(['accidental_death', 'travel'], { term_life: 'own' })), ADD);
    assert.includes(withTravel.background, 'If your travel insurance includes accidental death coverage, the Insurance Information Institute (Triple-I, an insurance industry research group) says that can duplicate your life insurance too.');
  });

  t('a held card changes nothing: no card is named and the card caution is not forced on it', () => {
    const f = find(run(items(['accidental_death', 'warranty'], { term_life: 'own', ...withCards([ALPHA], 'yes') }), WITH_CARDS), ADD);
    assert.equal(CARD_WORDS.test(textOf(f)), false);
    assert.equal(f.background.includes('Card benefits change'), false);
  });
});

// ---------------------------------------------------------------------------------------------------
// 9. Card matrix: every card-linked flag across card sets and payment answers
// ---------------------------------------------------------------------------------------------------

suite('other bucket: card wording across card and payment combinations', (t) => {
  const CARD_SETS = [[], [ALPHA], [BETA], [GAMMA], [DELTA], [EPS], [ALPHA, DELTA], [BETA, GAMMA, EPS], [ALPHA, BETA, GAMMA, DELTA, EPS], ['other_none']];
  const USUAL = [undefined, 'yes', 'no', 'not_sure'];

  // The flags whose emphasis follows "a held card confirms the benefit AND the user usually pays with their cards".
  const PAYMENT_FLAGS = [
    { id: RENTAL, item: 'rental_car', key: 'rentalCar' },
    { id: TRAVEL, item: 'travel', key: 'tripProtection' },
    { id: WARRANTY, item: 'warranty', key: 'extendedWarranty' },
  ];

  for (const spec of PAYMENT_FLAGS) {
    t(`${spec.id}: emphasis, naming, unverified and caution over every card set and payment answer`, () => {
      for (const set of CARD_SETS) {
        for (const usual of USUAL) {
          const label = `${JSON.stringify(set)} usual=${usual}`;
          const f = find(run(items([spec.item], set.length ? withCards(set, usual) : {}), WITH_CARDS), spec.id);
          const held = realCards(set);
          const confirmed = held.filter((c) => isConfirmed(c, spec.key));
          const unverified = held.filter((c) => statusOf(c, spec.key) === 'unverified');
          const none = held.filter((c) => statusOf(c, spec.key) === 'none');
          const usualYes = usual === 'yes' && !set.includes('other_none') && set.length > 0;
          assert.equal(f.emphasis, confirmed.length > 0 && usualYes ? 'strong' : 'normal', label);
          const text = textOf(f);
          for (const c of confirmed) assert.includes(f.background, `Our notes on ${nameOf(c)}`, label);
          for (const c of unverified) {
            assert.includes(text, nameOf(c), label);
            assert.equal(f.background.includes(`Our notes on ${nameOf(c)}`), false, `${label}: unverified is never asserted`);
          }
          for (const c of none) assert.equal(text.includes(nameOf(c)), false, `${label}: a no-benefit card is not mentioned`);
          assert.equal(text.includes(UNVERIFIED_MARKER) || text.includes(NONE_MARKER), false, label);
          assert.includes(f.background, CARD_CAUTION, label);
          if (confirmed.length === 0 && unverified.length === 0) {
            assert.equal(f.background.includes('Our notes on'), false, label);
            assert.equal(/If you carry a credit card, check its current benefits guide|for the card you carry/.test(f.background), true, label);
          }
        }
      }
    });
  }

  // card_usual_payment says "I usually pay with one of the cards I ticked", not which one, and the paragraph names
  // only the cards whose benefit is confirmed. The text must not put a named card in the user's mouth (DECISIONS S11-8).
  // FREEDOM_FLEX is a card the question offers but the fixture table does not know.
  const FREEDOM_FLEX = 'chase_freedom_flex';
  const byCardId = (a, b) => (cardIdOf(a) < cardIdOf(b) ? -1 : 1);
  const joinOr = (names) => (names.length <= 2 ? names.join(' or ') : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`);

  for (const spec of PAYMENT_FLAGS) {
    t(`${spec.id}: "usually pay" is worded from what the answer says, over every card set, mixed sets included`, () => {
      const sets = [...CARD_SETS, [ALPHA, GAMMA], [ALPHA, FREEDOM_FLEX], [BETA, DELTA, FREEDOM_FLEX], [FREEDOM_FLEX], [ALPHA, BETA]];
      for (const set of sets) {
        const held = realCards(set);
        const confirmed = held.filter((c) => isConfirmed(c, spec.key)).sort(byCardId);
        const label = `${JSON.stringify(set)}`;
        const f = find(run(items([spec.item], set.length ? withCards(set, 'yes') : {}), WITH_CARDS), spec.id);
        const background = f.background;
        const everyHeldNamed = confirmed.length > 0 && confirmed.length === held.length;
        if (confirmed.length === 0) {
          assert.equal(background.includes('usually pay'), false, `${label}: no named card, no payment sentence`);
        } else if (everyHeldNamed) {
          assert.includes(background, 'You told us you usually pay with one of these cards.', label);
          assert.equal(background.includes('one of the cards you carry'), false, label);
        } else {
          assert.includes(background, `You told us you usually pay with one of the cards you carry; this only helps if that is ${joinOr(confirmed.map(nameOf))}.`, label);
          assert.equal(background.includes('one of these cards'), false, `${label}: "these cards" would claim every ticked card is one we named`);
        }
        // Whatever the card mix, the user is never quoted as paying with a card that is named.
        assert.equal(/pay with (Fixture|the Fixture)/.test(background), false, label);
        // The emphasis rule itself is unchanged: a confirmed card and "yes".
        assert.equal(f.emphasis, confirmed.length > 0 ? 'strong' : 'normal', label);
      }
    });
  }

  t('the "no" and Not sure payment lines claim nothing about which card, with a mixed card set', () => {
    for (const spec of PAYMENT_FLAGS) {
      const no = find(run(items([spec.item], withCards([ALPHA, GAMMA], 'no')), WITH_CARDS), spec.id).background;
      assert.includes(no, 'you usually do not pay with these cards');
      assert.equal(no.includes('only helps if that is'), false);
      const unsure = find(run(items([spec.item], withCards([ALPHA, GAMMA], 'not_sure')), WITH_CARDS), spec.id).background;
      assert.includes(unsure, "Check whether the card's coverage applies only to what you charge to it.");
      assert.equal(unsure.includes('usually pay'), false);
    }
  });

  t('phone: emphasis follows the confirmed cellPhone benefit and a bill on a card, over every card set and bill answer', () => {
    for (const set of CARD_SETS) {
      for (const bill of [undefined, 'yes', 'no', 'not_sure']) {
        const more = {};
        if (set.length) more.cards = set;
        if (bill !== undefined) more.phone_bill_on_card = bill;
        const label = `${JSON.stringify(set)} bill=${bill}`;
        const f = find(run(items(['phone'], more), WITH_CARDS), PHONE);
        const confirmed = realCards(set).filter((c) => isConfirmed(c, 'cellPhone'));
        assert.equal(f.emphasis, confirmed.length > 0 && bill === 'yes' ? 'strong' : 'normal', label);
        assert.includes(f.background, CARD_CAUTION, label);
        const moveStated = f.ask.includes('ask your carrier to cancel the protection plan');
        assert.equal(moveStated, confirmed.length > 0 && bill === 'yes', `${label}: the move is stated only for a confirmed benefit and a bill on a card`);
        assert.equal(textOf(f).includes(UNVERIFIED_MARKER) || textOf(f).includes(NONE_MARKER), false, label);
        // The reason is the user's own voice: it never says "my card lists ... and my bill is on it". It is conditional.
        assert.equal(f.reason.startsWith('If my phone bill is charged to '), confirmed.length > 0 && bill === 'yes', label);
        assert.equal(/my card lists|is on it\b/i.test(f.reason), false, label);
      }
    }
  });

  t('roadside: strong only when a card was ticked as a source and a held card confirms it', () => {
    for (const set of CARD_SETS) {
      for (const sources of [['club', 'card'], ['club', 'auto_policy'], ['card', 'car_maker']]) {
        const more = { roadside_sources: sources };
        if (set.length) more.cards = set;
        const f = find(run(items(['towing'], more), WITH_CARDS), TOWING);
        const confirmed = realCards(set).filter((c) => isConfirmed(c, 'roadside'));
        assert.equal(f.emphasis, sources.includes('card') && confirmed.length > 0 ? 'strong' : 'normal', `${JSON.stringify(set)} ${JSON.stringify(sources)}`);
        assert.equal(textOf(f).includes(UNVERIFIED_MARKER) || textOf(f).includes(NONE_MARKER), false);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------
// 10. Sweeps over many combinations
// ---------------------------------------------------------------------------------------------------

// A deterministic grid: every subset of the six Other items, four times over, each with a different mix of extras,
// home, car, cards and follow-up answers. The mix comes from a fixed hash of the scenario number (no randomness,
// so a failure names a reproducible scenario).
function scenarios() {
  const names = ['rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death'];
  const axes = {
    cards: [[], [ALPHA], [BETA], [GAMMA], [DELTA], [EPS], [ALPHA, DELTA], [BETA, GAMMA, EPS], ['other_none']],
    usual: ['yes', 'no', 'not_sure', undefined],
    roadside: [['auto_policy', 'club'], ['club'], ['card', 'car_maker'], ['other'], ['not_sure'], ['auto_policy', 'club', 'card', 'car_maker'], undefined],
    vehicle: ['yes', 'no', 'not_sure', undefined],
    bill: ['yes', 'no', 'not_sure', undefined],
    term: ['own', 'work_only', 'none', 'not_sure', undefined],
    collision: ['no', 'yes', 'not_sure', undefined],
    financing: ['loan', 'paid_off', 'paid_off'],
    value: ['under_3000', '3000_9999', 'under_3000'],
    extras: [[], ['motorcycle'], ['boat'], ['motorcycle', 'boat']],
    home: [['home'], ['renters'], ['home', 'renters'], []],
    car: [[], ['auto'], ['auto'], ['auto']],
  };
  const out = [];
  let n = 0;
  for (let mask = 0; mask < 64; mask++) {
    for (let variant = 0; variant < 4; variant++) {
      const pick = (key, salt) => {
        const list = axes[key];
        const h = ((n + 1) * 2654435761 + salt * 40503) % 4294967296;
        return list[Math.floor((h / 4294967296) * list.length)];
      };
      const list = names.filter((_, i) => (mask & (1 << i)) !== 0);
      const o = {};
      const set = pick('cards', 1);
      if (set.length) o.cards = set;
      const optional = { card_usual_payment: pick('usual', 2), roadside_sources: pick('roadside', 3), towing_vehicle_policy: pick('vehicle', 4), phone_bill_on_card: pick('bill', 5), term_life: pick('term', 6), auto_collision: pick('collision', 7) };
      for (const key of Object.keys(optional)) if (optional[key] !== undefined) o[key] = optional[key];
      o.auto_financing = pick('financing', 8);
      o.auto_value = pick('value', 9);
      out.push({
        label: `#${n} ${list.join('+') || 'none'} cards=${JSON.stringify(set)}`,
        opts: plain([...pick('home', 10), ...pick('car', 11), ...pick('extras', 12), ...list], o),
      });
      n++;
    }
  }
  return out;
}

suite('other bucket: organisation names and acronyms are spelled out', (t) => {
  t('the check itself: an undefined, half-defined or undefined-by-order acronym is caught, a defined one and a brand name pass', () => {
    assert.deepEqual(undefinedAcronyms('The NAIC calls it an optional extra.'), ['NAIC']);
    assert.deepEqual(undefinedAcronyms('The National Association of Insurance Commissioners (NAIC) calls it an optional extra.'), ['NAIC'], 'no gloss');
    assert.deepEqual(undefinedAcronyms('Triple-I lists towing. The Insurance Information Institute (Triple-I, an insurance industry research group) agrees.'), ['Triple-I'], 'used before it is defined');
    assert.deepEqual(undefinedAcronyms('The FTC warns of costs. The FTC also says to ask.'), ['FTC']);
    assert.deepEqual(undefinedAcronyms('Often called AD&D pays only for accidents.'), ['AD&D']);
    assert.deepEqual(undefinedAcronyms('The National Association of Insurance Commissioners (NAIC, a group of state insurance regulators) calls it an extra. The NAIC also says plans differ.'), []);
    assert.deepEqual(undefinedAcronyms('Often called AD&D (accidental death and dismemberment), it pays for accidents. AD&D differs by policy.'), []);
    assert.deepEqual(undefinedAcronyms('An auto club such as AAA may include some of the same help.'), []);
  });

  t('each organisation is named in full with a one-clause gloss on its first mention in every flag that cites it', () => {
    const NAIC_DEF = 'The National Association of Insurance Commissioners (NAIC, a group of state insurance regulators)';
    const TRIPLE_I_DEF = 'Insurance Information Institute (Triple-I, an insurance industry research group)';
    const FTC_DEF = 'the Federal Trade Commission (FTC, a federal consumer protection agency)';
    const bg = (opts, id) => find(run(opts, NO_CARDS), id).background;
    assert.includes(bg(items(['towing'], { roadside_sources: ['auto_policy', 'club'] }), TOWING), NAIC_DEF);
    assert.includes(bg(items(['towing'], { towing_vehicle_policy: 'yes' }, { plus: ['motorcycle'] }), VEHICLE), NAIC_DEF);
    assert.includes(bg(items(['towing'], { towing_vehicle_policy: 'yes' }, { plus: ['boat'] }), VEHICLE), `The ${TRIPLE_I_DEF}`);
    assert.includes(bg(items(['travel']), TRAVEL), NAIC_DEF);
    assert.includes(bg(items(['warranty']), WARRANTY), FTC_DEF);
    assert.includes(bg(items(['accidental_death'], { term_life: 'work_only' }), ADD), NAIC_DEF);
    assert.includes(bg(items(['accidental_death', 'travel'], { term_life: 'own' }), ADD), `the ${TRIPLE_I_DEF}`);
  });

  t('no acronym is left undefined in the title, background, ask or reason of any flag, in any branch, on either catalog', () => {
    const extras = [[], ['motorcycle'], ['boat'], ['motorcycle', 'boat']];
    const sets = [];
    for (const list of [['rental_car'], ['towing'], ['travel'], ['phone'], ['warranty'], ['accidental_death'], ['accidental_death', 'travel'], ['towing', 'rental_car', 'travel', 'phone', 'warranty', 'accidental_death']]) {
      for (const term of ['own', 'work_only', 'none', 'not_sure']) {
        for (const x of extras) {
          sets.push(items(list, { term_life: term, roadside_sources: ['auto_policy', 'club', 'card'], towing_vehicle_policy: 'yes', phone_bill_on_card: 'yes', cards: [ALPHA, BETA] }, { plus: x }));
        }
      }
    }
    let checked = 0;
    for (const opts of sets) {
      for (const catalog of [NO_CARDS, WITH_CARDS]) {
        for (const f of allFlags(run(opts, catalog))) {
          if (!ALL_IDS.includes(f.id)) continue;
          for (const field of ['title', 'background', 'ask', 'reason']) {
            assert.deepEqual(undefinedAcronyms(f[field]), [], `${f.id} ${field}: ${f[field]}`);
            checked++;
          }
        }
      }
    }
    assert.equal(checked > 500, true, 'the sweep reached the flags');
  });
});

suite('other bucket: sweeps over policy and answer combinations', (t) => {
  const GRID = scenarios();

  t('the grid is large and exercises every flag on both catalogs', () => {
    assert.equal(GRID.length, 256);
    const fired = {};
    for (const s of GRID) {
      for (const catalog of [NO_CARDS, WITH_CARDS]) {
        for (const id of otherIds(run(s.opts, catalog))) fired[id] = true;
      }
    }
    assert.deepEqual(Object.keys(fired).sort(), [...ALL_IDS].sort());
  });

  t('copy rules: no state, placeholder, token, dash, dollar figure or "undefined", and every text is non-empty; emphasis is normal or strong', () => {
    for (const s of GRID) {
      for (const catalog of [NO_CARDS, WITH_CARDS]) {
        for (const f of allFlags(run(s.opts, catalog))) {
          if (!ALL_IDS.includes(f.id)) continue;
          for (const field of ['title', 'background', 'ask', 'reason']) {
            assert.equal(typeof f[field] === 'string' && f[field].trim().length > 20, true, `${s.label} ${f.id} ${field}`);
            assert.equal(STATE_NAMES.test(f[field]), false, `${s.label} ${f.id} ${field} names a state: ${f[field]}`);
            assert.equal(BANNED.test(f[field]), false, `${s.label} ${f.id} ${field} has banned wording: ${f[field]}`);
            assert.equal(/\$\d/.test(f[field]), false, `${s.label} ${f.id} ${field} has a dollar figure`);
            assert.deepEqual(undefinedAcronyms(f[field]), [], `${s.label} ${f.id} ${field} uses an acronym with no definition: ${f[field]}`);
          }
          assert.includes(['normal', 'strong'], f.emphasis);
          assert.equal(/\s{2,}/.test(textOf(f).replace(/\n/g, ' ')), false, `${s.label} ${f.id} has doubled spaces`);
        }
      }
    }
  });

  t('sources: each result flag carries exactly its sourceIds, resolved from the registry', () => {
    for (const s of GRID) {
      for (const f of allFlags(run(s.opts, WITH_CARDS))) {
        if (!ALL_IDS.includes(f.id)) continue;
        const flag = FLAGS.find((x) => x.id === f.id);
        assert.deepEqual(f.sources.map((x) => x.id), flag.sourceIds, `${s.label} ${f.id}`);
        for (const src of f.sources) {
          assert.deepEqual(src, { id: src.id, publisher: SOURCES[src.id].publisher, title: SOURCES[src.id].title, url: SOURCES[src.id].url, lastVerified: SOURCES[src.id].lastVerified });
        }
      }
    }
  });

  t('without a card table no card is ever named and no emphasis is strong, whatever cards the user ticked', () => {
    for (const s of GRID) {
      for (const f of allFlags(run(s.opts, NO_CARDS))) {
        if (!ALL_IDS.includes(f.id)) continue;
        assert.equal(CARD_WORDS.test(textOf(f)), false, `${s.label} ${f.id} names a card`);
        assert.equal(f.emphasis, 'normal', `${s.label} ${f.id}`);
      }
    }
  });

  t('with the fixture table an unverified or no-benefit entry is never asserted, and no URL is ever written into the text', () => {
    for (const s of GRID) {
      for (const f of allFlags(run(s.opts, WITH_CARDS))) {
        if (!ALL_IDS.includes(f.id)) continue;
        const text = textOf(f);
        assert.equal(text.includes(UNVERIFIED_MARKER) || text.includes(NONE_MARKER), false, `${s.label} ${f.id}`);
        assert.equal(/https?:|example\.org|www\./i.test(text), false, `${s.label} ${f.id} writes a URL into the text`);
        assert.equal(/Our notes on Fixture Card Gamma/.test(text), false, 'a card with every benefit none has no claim to make');
      }
    }
  });

  t('wherever a card is mentioned the freshness caution is present', () => {
    for (const s of GRID) {
      for (const f of allFlags(run(s.opts, WITH_CARDS))) {
        if (!ALL_IDS.includes(f.id)) continue;
        if (/Our notes on|Check whether Fixture Card|credit card|card you carry|card you would/.test(f.background + ' ' + f.ask)) {
          assert.includes(f.background, CARD_CAUTION, `${s.label} ${f.id}`);
        }
      }
    }
  });

  t('deterministic: the same answers give deep-equal results, and neither answers nor catalog are mutated', () => {
    const frozenReal = deepFreeze(copy(NO_CARDS));
    const frozenFixture = deepFreeze(copy(WITH_CARDS));
    GRID.forEach((s, i) => {
      if (i % 5 !== 0) return;
      const answers = deepFreeze(copy(s.opts));
      for (const catalog of [frozenReal, frozenFixture]) {
        const first = evaluate(answers, catalog);
        const second = evaluate(answers, catalog);
        assert.deepEqual(first, second, s.label);
      }
    });
  });

  t('the questions and policies each flag reads stay inside the plan row (so the plan tables stay true)', () => {
    const rows = {};
    PLAN.flags.filter((f) => f.story === 'S11').forEach((r) => { rows[r.id] = r; });
    const read = {};
    ALL_IDS.forEach((id) => { read[id] = { q: {}, holds: {} }; });
    for (const s of GRID) {
      for (const catalog of [NO_CARDS, WITH_CARDS]) {
        const ctx = createContext(s.opts, catalog);
        for (const flag of FLAGS) {
          const log = read[flag.id];
          const spy = {
            holds: (p) => { log.holds[p] = true; return ctx.holds(p); },
            answer: (q) => { log.q[q] = true; return ctx.answer(q); },
            is: (q, o) => { log.q[q] = true; return ctx.is(q, o); },
            includes: (q, o) => { log.q[q] = true; return ctx.includes(q, o); },
            isNotSure: (q) => { log.q[q] = true; return ctx.isNotSure(q); },
            option: (q) => { log.q[q] = true; return ctx.option(q); },
            cards: () => { log.q.cards = true; return ctx.cards(); },
            cardsWith: (k) => { log.q.cards = true; return ctx.cardsWith(k); },
            stack: ctx.stack,
          };
          const result = flag.applies(spy);
          if (!result) continue;
          const vars = result === true ? {} : (result.vars || {});
          for (const field of ['title', 'background', 'ask', 'reason']) {
            if (typeof flag[field] === 'function') flag[field](spy, vars);
          }
        }
      }
    }
    for (const id of ALL_IDS) {
      const allowedQuestions = rows[id].questions;
      for (const q of Object.keys(read[id].q)) assert.includes(allowedQuestions, q, `${id} reads question ${q} that the plan does not list`);
      for (const p of Object.keys(read[id].holds)) assert.includes(rows[id].holds, p, `${id} reads policy ${p} that the plan does not list`);
      // and it reads every policy the plan says it does
      for (const p of rows[id].holds) assert.equal(read[id].holds[p], true, `${id} never reads policy ${p}`);
    }
  });
});

// ---------------------------------------------------------------------------------------------------
// 11. End to end: real catalog, plain answers (Q1 holds the ticks)
// ---------------------------------------------------------------------------------------------------

suite('other bucket: end to end on the real catalog', (t) => {
  // Each scenario is a set of plain answers. No card is ticked, so these hold whatever the real card table contains.
  const place = (r, id) => (['raise', 'drop', 'question'].find((b) => r.flags[b].some((f) => f.id === id)));

  t('rental car: a homeowner with one car who pays for rental coverage gets a Drop with the generic card wording', () => {
    const answers = items(['rental_car']);
    assert.includes(answers.policies, 'rental_car');
    const r = evaluate(answers);
    assert.equal(place(r, RENTAL), 'drop');
    const f = find(r, RENTAL);
    assert.equal(f.emphasis, 'normal');
    assert.deepEqual(f.sources.map((s) => s.id), ['iii-rental-car-insurance', 'ftc-renting-a-car', 'naic-consumer-auto-insurance']);
    assert.equal(f.sources[0].url, SOURCES['iii-rental-car-insurance'].url);
    assert.includes(r.meta.visibleQuestionIds, 'cards');
  });

  t('towing: two sources of roadside help give a Drop', () => {
    const r = evaluate(items(['towing'], { roadside_sources: ['auto_policy', 'club'], cards: ['other_none'] }));
    assert.equal(place(r, TOWING), 'drop');
    assert.equal(find(r, TOWING).emphasis, 'normal');
    assert.equal(place(r, VEHICLE), undefined, 'no motorcycle or boat, so the vehicle question is not asked');
  });

  t('motorcycle or boat towing: a Question, not a Drop', () => {
    const r = evaluate(items(['towing'], { towing_vehicle_policy: 'yes', roadside_sources: ['other'] }, { plus: ['boat'] }));
    assert.equal(place(r, VEHICLE), 'question');
    assert.equal(place(r, TOWING), undefined, '"something else" alone is not a duplicate');
    assert.equal(find(r, VEHICLE).title, 'Check where the towing help on your boat comes from');
  });

  t('travel: a Drop whose generic text compares what the user already has', () => {
    const r = evaluate(items(['travel'], { cards: ['other_none'] }));
    assert.equal(place(r, TRAVEL), 'drop');
    assert.equal(find(r, TRAVEL).emphasis, 'normal');
  });

  t('phone: a Question that asks about the card and the home policy', () => {
    const r = evaluate(items(['phone'], { phone_bill_on_card: 'yes', cards: ['other_none'] }));
    assert.equal(place(r, PHONE), 'question');
    assert.includes(find(r, PHONE).background, 'Your homeowners policy generally covers your belongings');
    assert.deepEqual(find(r, PHONE).sources.map((s) => s.id), ['iii-standard-homeowners-coverage', 'iii-renters-insurance']);
  });

  t('extended warranty: a Drop built on the FTC value test', () => {
    const r = evaluate(items(['warranty'], { cards: ['other_none'] }));
    assert.equal(place(r, WARRANTY), 'drop');
    assert.deepEqual(find(r, WARRANTY).sources.map((s) => s.id), ['ftc-extended-warranties-service-contracts', 'ftc-warranties']);
  });

  t('accidental death: a Question that changes with the life insurance answer', () => {
    const own = evaluate(items(['accidental_death'], { term_life: 'own' }));
    assert.equal(place(own, ADD), 'question');
    const work = evaluate(items(['accidental_death'], { term_life: 'work_only' }));
    assert.notEqual(find(own, ADD).ask, find(work, ADD).ask);
    assert.equal(find(own, ADD).sources.length, 4);
  });

  t('everything ticked: the Drops come out in priority order, the Questions after, nothing else from this bucket', () => {
    const r = evaluate(items(['rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death'], {
      cards: ['other_none'],
      roadside_sources: ['auto_policy', 'club'],
      towing_vehicle_policy: 'not_sure',
      phone_bill_on_card: 'no',
      term_life: 'none',
    }, { plus: ['motorcycle'] }));
    assert.deepEqual(r.flags.drop.filter((f) => ALL_IDS.includes(f.id)).map((f) => f.id), [RENTAL, TOWING, TRAVEL, WARRANTY]);
    assert.deepEqual(r.flags.question.filter((f) => ALL_IDS.includes(f.id)).map((f) => f.id), [VEHICLE, PHONE, ADD]);
    assert.deepEqual(r.flags.raise.filter((f) => ALL_IDS.includes(f.id)), []);
  });

  t('nothing ticked: no flag from this bucket', () => {
    for (const list of [[], ['none']]) {
      const r = evaluate(items(list));
      assert.deepEqual(otherIds(r), []);
    }
    assert.deepEqual(otherIds(evaluate(plain(BASE))), [], 'no Other-bucket item ticked');
    assert.deepEqual(otherIds(evaluate({})), [], 'Q1 unanswered');
  });
});
