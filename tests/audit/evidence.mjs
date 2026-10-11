// What counts as "evidence of a duplicate" for a Drop (Story S12, DECISIONS S12-8). Not a *.test.mjs file, so scripts/test.sh does
// not run it directly; the audits import it.
//
// The SPEC defines Drop as "duplicated coverage they are paying for twice". A Drop that tells the household a coverage may be
// worth buying, or that shows no sign of any second source, contradicts its own bucket. So every Drop flag has a rule here that
// says, from the answers and the card table alone, what already covers the same thing. The rules are written out again on purpose
// (they are NOT read from the flags): the audits compare what a flag does with what this file says it should do, with no
// exceptions (a flag that does not meet its rule is fixed, DECISIONS S12-9 and S12-10).
//
//   hasEvidence(flagId, answers, cardTable)   -> prunes the answers first, then applies DROP_EVIDENCE[flagId]: true when something the
//                                                household told us, or the card table confirms, already covers what the flag is about
//   cardsOf(answers, cardTable)               -> the table entries for the cards the household ticked
//
// Pure; runs under jsc and Node.
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { BENEFIT_PRESENT } from '../../public/js/overlap/engine/constants.mjs';

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const list = (answers, qid) => (Array.isArray(answers[qid]) ? answers[qid] : []);
const holds = (answers, id) => list(answers, 'policies').includes(id);

/** The card-table entries for the cards ticked in `answers.cards` (option id = card id with underscores). */
export function cardsOf(answers, cardTable) {
  return list(answers, 'cards').map((id) => id.replace(/_/g, '-')).filter((id) => has(cardTable, id)).map((id) => cardTable[id]);
}

const statusOf = (card, key) => (card.benefits && card.benefits[key] && card.benefits[key].status) || 'unverified';
const confirmedCard = (answers, cardTable, key) => cardsOf(answers, cardTable).some((c) => BENEFIT_PRESENT.includes(statusOf(c, key)));

const session = createSession(CATALOG);
// The newest car is certainly worth under $3,000 when its chosen value band tops out below that.
const carCertainlyUnder3000 = (answers) => {
  const option = session.getQuestion('auto_value').options.find((o) => o.id === answers.auto_value);
  return Boolean(option) && typeof option.value === 'object' && option.value !== null && option.value.max !== null && option.value.max < 3000;
};

// The SPEC's two Other-bucket lines that name a card ("paid with a card that includes trip protection", "paid with a card that extends
// the manufacturer's warranty") need the household to say it usually pays with its cards. Not sure or No is a reason to ask, not
// a duplicate.
const paysWithCards = (a) => a.card_usual_payment === 'yes';

export const DROP_EVIDENCE = {
  // Paid off, worth under $3,000, and the household says it still pays for collision and comprehensive.
  'auto-collision-older-car': (a) => holds(a, 'auto') && a.auto_financing === 'paid_off' && carCertainlyUnder3000(a) && a.auto_collision === 'yes',
  // The household's own car policy (it has not said it lacks collision and comprehensive), or a card the table says pays first and
  // the household usually pays with.
  'other-rental-car-waiver': (a, table) => (holds(a, 'auto') && a.auto_collision !== 'no')
    || (paysWithCards(a) && cardsOf(a, table).some((c) => statusOf(c, 'rentalCar') === 'primary')),
  // The household itself named two or more sources of roadside help.
  'other-towing-roadside-duplicate': (a) => ['auto_policy', 'club', 'card', 'car_maker'].filter((id) => list(a, 'roadside_sources').includes(id)).length >= 2,
  // A ticked card the table confirms has the benefit, and the household usually pays with its cards.
  'other-travel-insurance-overlap': (a, table) => paysWithCards(a) && confirmedCard(a, table, 'tripProtection'),
  'other-extended-warranty-overlap': (a, table) => paysWithCards(a) && confirmedCard(a, table, 'extendedWarranty'),
};

/**
 * True when something already covers what `flagId` is about. Reads the answers the way the engine does, pruned to the questions the
 * ticks make visible: a stray answer to a question the household never saw (the sweep adds some on purpose) counts for nothing.
 */
export const hasEvidence = (flagId, answers, cardTable) => DROP_EVIDENCE[flagId](session.prune(answers), cardTable);

/**
 * Words a Drop must never use: they tell the reader the opposite of "you are paying twice" (that the coverage may be worth
 * buying, or may be all that stands between them and a bill). A Question may say them.
 */
export const NOT_FOR_A_DROP = [/worth buying/i, /only thing standing/i, /may be the only/i];
