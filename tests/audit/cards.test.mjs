// Story S12 audit: credit cards in the wording.
//
// SPEC "Build notes": card benefits change, so the tool must never treat its card data as authoritative and must never
// present a benefit it has not confirmed as fact. The rules checked here, over every flag text the scenarios and a sweep can
// produce:
//   1. A card is named only if the card table has it. The real table is empty until Stories S4b and S11b (DECISIONS D14),
//      so with the real catalog no text may name a card or an issuer; once the table has entries the same rule lets
//      exactly those through.
//   2. A card is named for a benefit only if the table says the benefit is confirmed (status primary, secondary or yes). A
//      card whose status is `none` is not mentioned for it. A card whose status is `unverified` appears only in a sentence
//      that tells the reader to check ("Check whether ... includes ... in its current benefits guide"), never as having it.
//   3. Text taken from an `unverified` or `none` entry (the fixture marks those summaries) never reaches the reader.
//   4. Any text that names a card also points the reader to the card's current benefits guide.
//
// The real table has nothing to audit yet, so rules 2 to 4 run against the fixture table in tests/fixtures/otherCards.mjs
// (five invented cards, one of each status mix, keyed by real card ids so the unmodified `cards` question maps to them) over
// every combination of those cards, and run against the real table too from the day it has entries. Pure data checks; runs
// under jsc and Node.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { CARDS } from '../../public/js/overlap/data/cards.mjs';
import { CARD_CHOICES, cardOptionId } from '../../public/js/overlap/data/questions/cards.mjs';
import { evaluate } from '../../public/js/overlap/engine/evaluate.mjs';
import { BENEFIT_PRESENT, CARD_BENEFIT_KEYS } from '../../public/js/overlap/engine/constants.mjs';
import { FIXTURE_CARDS, UNVERIFIED_MARKER, NONE_MARKER } from '../fixtures/otherCards.mjs';
import SCENARIOS from '../scenarios/scenarios.mjs';
import { everything, flagsOf } from './corpus.mjs';

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// Which card benefit each flag talks about when it talks about a card.
const BENEFIT_OF_FLAG = {
  'other-rental-car-waiver': 'rentalCar',
  'other-towing-roadside-duplicate': 'roadside',
  'other-vehicle-towing-check': 'roadside',
  'other-travel-insurance-overlap': 'tripProtection',
  'other-phone-insurance-card': 'cellPhone',
  'other-extended-warranty-overlap': 'extendedWarranty',
};

const ISSUER_WORDS = [/\bChase\b/, /\bAmerican Express\b/, /\bAmex\b/, /\bCiti\b/, /\bWells Fargo\b/, /\bCapital One\b/];

const WITH_FIXTURE = { ...CATALOG, cards: FIXTURE_CARDS };

const sentences = (text) => text.match(/[^.!?]+[.!?]+/g) || [text];
const allText = (flag) => [flag.title, flag.background, flag.ask, flag.reason].join('\n');

// Every card the audit knows by name: the intended cards from the question (with the table's own name when it has the card)
// and any card the table holds that the question does not offer.
function knownCards(table) {
  const out = new Map();
  for (const c of CARD_CHOICES) out.set(c.id, { id: c.id, names: [c.name] });
  for (const id of Object.keys(table)) {
    const entry = out.get(id) || { id, names: [] };
    if (table[id].name && !entry.names.includes(table[id].name)) entry.names.push(table[id].name);
    out.set(id, entry);
  }
  return Array.from(out.values());
}

// Checks one set of rendered flags against a card table. Returns { problems, named, hedged } so a caller can also prove the
// audit saw something.
function auditText(table, runs) {
  const problems = [];
  let named = 0;
  let hedged = 0;
  const cards = knownCards(table);
  for (const run of runs) {
    for (const flag of flagsOf(run.result)) {
      const text = allText(flag);
      const where = `${flag.id} (${run.id})`;
      if (text.includes(UNVERIFIED_MARKER) || text.includes(NONE_MARKER)) problems.push(`${where}: text from an unverified or none entry reached the reader`);
      const key = BENEFIT_OF_FLAG[flag.id];
      let namesACard = false;
      for (const card of cards) {
        for (const name of card.names) {
          if (!text.includes(name)) continue;
          namesACard = true;
          const entry = has(table, card.id) ? table[card.id] : null;
          if (!entry) { problems.push(`${where}: names ${name}, which the card table does not have`); continue; }
          if (!key) { problems.push(`${where}: names ${name} but is not a card flag`); continue; }
          const benefit = entry.benefits && entry.benefits[key];
          const status = benefit ? benefit.status : 'unverified';
          if (BENEFIT_PRESENT.includes(status)) { named++; continue; }
          if (status === 'none') { problems.push(`${where}: names ${name}, whose ${key} status is none`); continue; }
          // unverified (or missing): every sentence that names the card must be a "check whether" sentence.
          for (const sentence of sentences(text)) {
            if (!sentence.includes(name)) continue;
            if (/check whether/i.test(sentence)) hedged++;
            else problems.push(`${where}: asserts something about ${name} although its ${key} is ${status}: "${sentence.trim().slice(0, 120)}"`);
          }
        }
      }
      if (namesACard && !/benefits guide/i.test(text)) problems.push(`${where}: names a card without pointing to its current benefits guide`);
    }
  }
  return { problems, named, hedged };
}

// Every subset of `ids`, as arrays in the order given.
function subsets(ids) {
  const out = [];
  for (let mask = 0; mask < (1 << ids.length); mask++) out.push(ids.filter((_, i) => (mask >> i) & 1));
  return out;
}

// The household that ticks every card item, once for each given selection of cards and each answer about paying with them
// and about the phone bill.
function cardSweep(catalog, selections) {
  const base = SCENARIOS.find((s) => s.id === 'fixture-card-statuses-together').answers;
  const runs = [];
  for (const picked of selections) {
    for (const usual of ['yes', 'no', 'not_sure']) {
      for (const bill of ['yes', 'no', 'not_sure']) {
        const answers = { ...JSON.parse(JSON.stringify(base)), cards: picked.length > 0 ? picked : ['other_none'], card_usual_payment: usual, phone_bill_on_card: bill };
        runs.push({ id: `cards ${picked.join('+') || 'none'}, pays ${usual}, phone bill ${bill}`, answers, result: evaluate(answers, catalog) });
      }
    }
  }
  return runs;
}

const FIXTURE_OPTION_IDS = Object.keys(FIXTURE_CARDS).map(cardOptionId);
// With the real table (12 cards or more) every combination would be thousands of runs: none, each card alone, and all together.
const singlesAndAll = (ids) => [[]].concat(ids.map((id) => [id]), [ids]);

suite('card audit: the real card table', (t) => {
  t('the table is keyed by card id and every entry has the six benefits with a status the engine knows', () => {
    for (const id of Object.keys(CARDS)) {
      assert.equal(CARDS[id].id, id);
      for (const key of CARD_BENEFIT_KEYS) assert.ok(CARDS[id].benefits && CARDS[id].benefits[key], `${id} lacks ${key}`);
    }
  });

  t('no text in the scenarios or the sweep names a card or an issuer the table does not have (empty until S4b, DECISIONS D14)', () => {
    const corpus = everything();
    const bad = [];
    for (const { flag, run } of corpus) {
      const text = allText(flag);
      for (const card of knownCards(CARDS)) {
        if (has(CARDS, card.id)) continue;
        for (const name of card.names) if (text.includes(name)) bad.push(`${flag.id} (${run.id}) names ${name}`);
      }
      for (const re of ISSUER_WORDS) {
        const m = re.exec(text);
        if (!m) continue;
        const known = Object.keys(CARDS).some((id) => (CARDS[id].issuer || '').includes(m[0]) || (CARDS[id].name || '').includes(m[0]));
        if (!known) bad.push(`${flag.id} (${run.id}) names the issuer ${m[0]}`);
      }
    }
    assert.deepEqual(bad.slice(0, 15), []);
  });

  t('once the table has entries, every card the question offers is in it, and the same text rules hold for the real data', () => {
    if (Object.keys(CARDS).length === 0) return; // nothing to audit until Stories S4b and S11b
    const offered = CARD_CHOICES.map((c) => c.id);
    assert.deepEqual(offered.filter((id) => !has(CARDS, id)), [], 'cards the question offers that the table lacks');
    const result = auditText(CARDS, cardSweep(CATALOG, singlesAndAll(offered.map(cardOptionId))));
    assert.deepEqual(result.problems.slice(0, 15), []);
  });
});

suite('card audit: the rules, against the fixture table', (t) => {
  t('the fixture covers every case: confirmed (primary, secondary, yes), none, and unverified', () => {
    const statuses = new Set();
    for (const id of Object.keys(FIXTURE_CARDS)) for (const key of CARD_BENEFIT_KEYS) statuses.add(FIXTURE_CARDS[id].benefits[key].status);
    for (const status of ['primary', 'secondary', 'yes', 'none', 'unverified']) assert.ok(statuses.has(status), `fixture has no ${status} benefit`);
  });

  t('over all 32 combinations of the five fixture cards, no text asserts an unverified benefit, names a none card, or leaks a marker', () => {
    const runs = cardSweep(WITH_FIXTURE, subsets(FIXTURE_OPTION_IDS));
    assert.equal(runs.length, 32 * 9);
    const { problems, named, hedged } = auditText(FIXTURE_CARDS, runs);
    assert.deepEqual(problems.slice(0, 15), []);
    assert.ok(named > 100, `the audit saw a confirmed card named only ${named} times, so it is not looking at anything`);
    assert.ok(hedged > 100, `the audit saw an unverified card hedged only ${hedged} times, so it is not looking at anything`);
  });

  t('the named scenarios that tick cards give the same clean result with the fixture table', () => {
    const runs = SCENARIOS.filter((s) => Array.isArray(s.answers.cards)).map((s) => ({ id: s.id, answers: s.answers, result: evaluate(s.answers, WITH_FIXTURE) }));
    assert.ok(runs.length >= 15, `only ${runs.length} scenarios tick a cards question`);
    assert.deepEqual(auditText(FIXTURE_CARDS, runs).problems.slice(0, 15), []);
  });

  t('the audit can fail: it flags a stub that states an unverified benefit, a none card, a marker, an unknown card and a missing pointer', () => {
    const fake = (flag) => [{ id: 'fake', result: { flags: { raise: [], drop: [flag], question: [] } } }];
    const flag = (extra) => ({ id: 'other-rental-car-waiver', title: 'Title.', background: 'Body. Check your own benefits guide.', ask: 'Ask.', reason: 'My reason.', sources: [], ...extra });
    // Delta is all unverified, Gamma all none, Alpha confirmed (see tests/fixtures/otherCards.mjs).
    assert.ok(auditText(FIXTURE_CARDS, fake(flag({ background: 'Fixture Card Delta covers rental cars. Check your benefits guide.' }))).problems.length > 0, 'unverified asserted');
    assert.ok(auditText(FIXTURE_CARDS, fake(flag({ background: 'Fixture Card Gamma helps. Check your benefits guide.' }))).problems.length > 0, 'none card named');
    assert.ok(auditText(FIXTURE_CARDS, fake(flag({ ask: `Do it ${UNVERIFIED_MARKER}.` }))).problems.length > 0, 'marker leaked');
    assert.ok(auditText(FIXTURE_CARDS, fake(flag({ background: 'Chase Sapphire Reserve covers it. Check your benefits guide.' }))).problems.length > 0, 'card not in the table');
    assert.ok(auditText(FIXTURE_CARDS, fake(flag({ background: 'Fixture Card Alpha covers rentals.' }))).problems.length > 0, 'no pointer to the benefits guide');
    assert.deepEqual(auditText(FIXTURE_CARDS, fake(flag({ background: 'Fixture Card Alpha covers rentals. Check whether Fixture Card Delta includes it in its current benefits guide.' }))).problems, []);
  });

  t('the other-bucket flags with no card in the answers say nothing about any particular card', () => {
    const runs = SCENARIOS
      .filter((s) => Array.isArray(s.answers.cards) && s.answers.cards.length === 1 && s.answers.cards[0] === 'other_none')
      .map((s) => ({ id: s.id, answers: s.answers, result: evaluate(s.answers, WITH_FIXTURE) }));
    assert.ok(runs.length >= 8, `only ${runs.length} scenarios with no card`);
    for (const run of runs) {
      for (const f of flagsOf(run.result)) {
        for (const id of Object.keys(FIXTURE_CARDS)) assert.equal(allText(f).includes(FIXTURE_CARDS[id].name), false, `${run.id}: ${f.id} names ${FIXTURE_CARDS[id].name}`);
      }
    }
  });
});
