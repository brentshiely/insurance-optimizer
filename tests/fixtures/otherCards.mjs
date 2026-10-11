// A FIXTURE credit card table for testing the Other-bucket flags (Story S11). The real CARDS table is empty
// until Stories S4b and S11b (DECISIONS D14), so card-aware wording is built and tested against this table only.
//
// None of this is real card data. Each entry is keyed by the id of one of the 12 intended cards, because the
// real `cards` question maps its options to card ids by name (option `chase_sapphire_preferred` -> card id
// `chase-sapphire-preferred`), so a test catalog can inject this table without touching the question. The
// content is invented and unmistakable: every name starts with "Fixture Card", every guide URL is on the
// reserved example.org, and the `unverified` and `none` summaries carry markers that must never appear in any
// text a flag produces (the tests search for them).
//
//   alpha  (chase-sapphire-preferred)  rentalCar primary, tripProtection yes, extendedWarranty yes, roadside secondary
//   beta   (amex-platinum)             rentalCar secondary, cellPhone yes, roadside yes; trip protection unverified
//   gamma  (citi-double-cash)          every benefit `none`
//   delta  (wells-fargo-active-cash)   every benefit `unverified`
//   epsilon (capital-one-venture)      rentalCar yes (neither primary nor secondary), everything else unverified

/** Text that appears only in `unverified` and `none` summaries; no rendered flag may contain it. */
export const UNVERIFIED_MARKER = 'FIXTURE-UNVERIFIED-MARKER';
export const NONE_MARKER = 'FIXTURE-NONE-MARKER';

const benefit = (status, summary, conditions) => (conditions ? { status, summary, conditions } : { status, summary });
const unverified = () => benefit('unverified', `Not confirmed from the issuer guide (${UNVERIFIED_MARKER}).`);
const none = () => benefit('none', `No such benefit (${NONE_MARKER}).`);

export const FIXTURE_CARDS = {
  'chase-sapphire-preferred': {
    id: 'chase-sapphire-preferred', name: 'Fixture Card Alpha', issuer: 'Fixture Bank', lastVerified: '2026-10-01',
    guideUrl: 'https://example.org/fixtures/alpha-guide',
    benefits: {
      rentalCar: benefit('primary', 'Fixture rental car damage coverage.', 'Decline the rental company waiver and charge the whole rental to the card.'),
      tripProtection: benefit('yes', 'Fixture trip cancellation cover.'),
      cellPhone: unverified(),
      extendedWarranty: benefit('yes', 'Fixture warranty extension.'),
      purchaseProtection: unverified(),
      roadside: benefit('secondary', 'Fixture roadside help.'),
    },
  },
  'amex-platinum': {
    id: 'amex-platinum', name: 'Fixture Card Beta', issuer: 'Fixture Bank', lastVerified: '2026-09-15',
    guideUrl: 'https://example.org/fixtures/beta-guide',
    benefits: {
      rentalCar: benefit('secondary', 'Fixture secondary rental coverage.'),
      tripProtection: unverified(),
      cellPhone: benefit('yes', 'Fixture phone protection.', 'The monthly phone bill must be paid with the card.'),
      extendedWarranty: none(),
      purchaseProtection: unverified(),
      roadside: benefit('yes', 'Fixture roadside help.'),
    },
  },
  'citi-double-cash': {
    id: 'citi-double-cash', name: 'Fixture Card Gamma', issuer: 'Fixture Bank', lastVerified: '2026-10-02',
    guideUrl: 'https://example.org/fixtures/gamma-guide',
    benefits: {
      rentalCar: none(), tripProtection: none(), cellPhone: none(),
      extendedWarranty: none(), purchaseProtection: none(), roadside: none(),
    },
  },
  'wells-fargo-active-cash': {
    id: 'wells-fargo-active-cash', name: 'Fixture Card Delta', issuer: 'Fixture Bank', lastVerified: '2026-10-03',
    guideUrl: 'https://example.org/fixtures/delta-guide',
    benefits: {
      rentalCar: unverified(), tripProtection: unverified(), cellPhone: unverified(),
      extendedWarranty: unverified(), purchaseProtection: unverified(), roadside: unverified(),
    },
  },
  'capital-one-venture': {
    id: 'capital-one-venture', name: 'Fixture Card Epsilon', issuer: 'Fixture Bank', lastVerified: '2026-10-04',
    guideUrl: 'https://example.org/fixtures/epsilon-guide',
    benefits: {
      rentalCar: benefit('yes', 'Fixture rental coverage, type not stated.'),
      tripProtection: unverified(), cellPhone: unverified(),
      extendedWarranty: unverified(), purchaseProtection: unverified(), roadside: unverified(),
    },
  },
};

export default FIXTURE_CARDS;
