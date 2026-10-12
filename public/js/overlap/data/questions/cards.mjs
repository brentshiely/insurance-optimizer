// Section "cards": which credit cards the user carries (DECISIONS D2). Shown only when the user holds an
// Other-bucket item that a card sometimes already covers (rental car, towing, travel, phone, warranty).
//
// The credit-card table is deferred (DECISIONS D14), so the choices are a STATIC list of the 12 intended
// cards. CARD_CHOICES is the single place that list lives. Story S4b/S11b later checks that every id here
// exists in CARDS; until then nothing ties them together on purpose.
//
// Each card option's id is the card id with hyphens turned into underscores (option ids are snake_case).
// The engine maps it back the same way (ctx.cards() falls back to `optionId.replace(/_/g, '-')`), so the
// options deliberately carry NO `value.cardId`: validateCatalog rejects a cardId that is not in CARDS, and
// the table is empty until S4b. Do not add `value.cardId` here before S4b has filled the table.
import { gCardLinked } from './gates.mjs';
import { yesNoOptions } from './presets.mjs';

/** The 12 intended cards, in display order. `id` is kebab-case (the future CARDS key); `name` is display text. */
export const CARD_CHOICES = [
  { id: 'chase-sapphire-preferred', name: 'Chase Sapphire Preferred' },
  { id: 'chase-sapphire-reserve', name: 'Chase Sapphire Reserve' },
  { id: 'chase-freedom-unlimited', name: 'Chase Freedom Unlimited' },
  { id: 'chase-freedom-flex', name: 'Chase Freedom Flex' },
  { id: 'amex-platinum', name: 'American Express Platinum' },
  { id: 'amex-gold', name: 'American Express Gold' },
  { id: 'amex-blue-cash-preferred', name: 'American Express Blue Cash Preferred' },
  { id: 'amex-blue-cash-everyday', name: 'American Express Blue Cash Everyday' },
  { id: 'citi-double-cash', name: 'Citi Double Cash' },
  { id: 'wells-fargo-active-cash', name: 'Wells Fargo Active Cash' },
  { id: 'capital-one-venture-x', name: 'Capital One Venture X' },
  { id: 'capital-one-venture', name: 'Capital One Venture' },
];

/** The option id for a card id: hyphens to underscores (kebab-case card id to snake_case option id). */
export const cardOptionId = (cardId) => cardId.replace(/-/g, '_');

export default [
  {
    id: 'cards',
    domain: 'cards',
    section: 'cards',
    type: 'multi',
    prompt: 'Which of these credit cards do you carry?',
    help: 'Some cards come with perks that overlap with the extras you picked, like rental car coverage or trip protection. We only use this to point you to the right fine print.',
    // No "Not sure": the cards in your wallet are known, and "Another card, or no credit card" covers the rest.
    allowNotSure: false,
    showIf: gCardLinked(),
    options: [
      ...CARD_CHOICES.map((card) => ({ id: cardOptionId(card.id), label: card.name })),
      { id: 'other_none', label: 'Another card, or no credit card', exclusive: true },
    ],
  },
  {
    id: 'card_usual_payment',
    domain: 'cards',
    section: 'cards',
    type: 'single',
    prompt: 'When you rent a car, book a trip, or buy electronics, do you usually pay with one of those cards?',
    help: 'A card\'s perks usually only apply to what you charge to that card.',
    allowNotSure: true,
    showIf: { all: [{ answered: 'cards' }, { not: { answer: 'cards', includes: 'other_none' } }] },
    options: yesNoOptions(),
  },
];
