// A small fixture catalog that exercises every engine code path. All content is obviously fake test
// data (example.org is reserved for documentation); none of it is shown to users.
//
//   umbrella_limit ─┬─ umbrella_ext_um ── umbrella_um_detail      gated chain (holds → answered → is)
//                   └─ umbrella_side_business                     `in`
//   auto_liability, home_liability                                 `all` of two `holds`
//   supplements ── supplement_cost                                 multi + exclusive + `includes`
//   assets_band                                                    `not`
//   cards                                                          multi, `any`, card lookup
export const SOURCES = {
  'fixture-iii': {
    id: 'fixture-iii', publisher: 'Fixture Publisher One', title: 'Fixture umbrella explainer',
    url: 'https://example.org/fixtures/umbrella', lastVerified: '2026-10-10',
  },
  'fixture-naic': {
    id: 'fixture-naic', publisher: 'Fixture Publisher Two', title: 'Fixture consumer guide',
    url: 'https://example.org/fixtures/consumer-guide', lastVerified: '2026-09-30',
  },
  'fixture-issuer': {
    id: 'fixture-issuer', publisher: 'Fixture Bank', title: 'Fixture card benefits guide',
    url: 'https://example.org/fixtures/card-guide', lastVerified: '2026-10-01',
  },
};

const benefit = (status, summary, conditions) => (conditions ? { status, summary, conditions } : { status, summary });
const unverified = () => benefit('unverified', 'Not confirmed from the issuer guide.');

export const CARDS = {
  'card-alpha': {
    id: 'card-alpha', name: 'Fixture Card Alpha', issuer: 'Fixture Bank', lastVerified: '2026-10-01',
    guideUrl: 'https://example.org/fixtures/alpha-guide',
    benefits: {
      rentalCar: benefit('primary', 'Primary rental car coverage.', 'Decline the rental company coverage.'),
      tripProtection: unverified(),
      cellPhone: benefit('none', 'No cell phone protection.'),
      extendedWarranty: unverified(),
      purchaseProtection: unverified(),
      roadside: benefit('secondary', 'Pays after other coverage.'),
    },
  },
  'card-beta': {
    id: 'card-beta', name: 'Fixture Card Beta', issuer: 'Fixture Bank', lastVerified: '2026-10-02',
    guideUrl: 'https://example.org/fixtures/beta-guide',
    benefits: {
      rentalCar: unverified(),
      tripProtection: benefit('yes', 'Trip cancellation coverage.'),
      cellPhone: benefit('yes', 'Cell phone protection when the bill is paid with the card.'),
      extendedWarranty: benefit('none', 'No extended warranty.'),
      purchaseProtection: unverified(),
      roadside: unverified(),
    },
  },
};


export const QUESTIONS = [
  {
    id: 'umbrella_limit', domain: 'umbrella', section: 'umbrella', type: 'single',
    prompt: 'How big is your umbrella policy?', help: 'Look for the "limit" on the umbrella page.',
    options: [
      { id: '1m', label: '$1 million', value: 1000000 },
      { id: '2m', label: '$2 million', value: 2000000 },
      { id: '5m', label: '$5 million', value: 5000000 },
    ],
    allowNotSure: true,
    showIf: { holds: 'umbrella' },
  },
  {
    id: 'auto_liability', domain: 'auto', section: 'umbrella', type: 'single',
    prompt: 'What is the most your auto policy pays if you are at fault?',
    options: [
      { id: '100_300', label: '100/300', value: { perPerson: 100000, perAccident: 300000 } },
      { id: '250_500', label: '250/500', value: { perPerson: 250000, perAccident: 500000 } },
      { id: '500_500', label: '500/500', value: { perPerson: 500000, perAccident: 500000 } },
    ],
    allowNotSure: true,
    showIf: { all: [{ holds: 'umbrella' }, { holds: 'auto' }] },
  },
  {
    id: 'home_liability', domain: 'home', section: 'umbrella', type: 'single',
    prompt: 'What is the most your home policy pays if someone is hurt on your property?',
    options: [
      { id: '300k', label: '$300,000', value: 300000 },
      { id: '500k', label: '$500,000', value: 500000 },
      { id: '1m', label: '$1 million', value: 1000000 },
    ],
    allowNotSure: true,
    showIf: { all: [{ holds: 'umbrella' }, { holds: 'home' }] },
  },
  {
    id: 'umbrella_ext_um', domain: 'umbrella', section: 'umbrella_scope', type: 'single',
    prompt: 'Does your umbrella extend uninsured motorist coverage?',
    options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
    allowNotSure: true,
    showIf: { answered: 'umbrella_limit' },
  },
  {
    id: 'umbrella_um_detail', domain: 'umbrella', section: 'umbrella_scope', type: 'single',
    prompt: 'Can it be added?',
    options: [{ id: 'can_add', label: 'Yes, it can be added' }, { id: 'cannot_add', label: 'No' }],
    allowNotSure: false,
    showIf: { answer: 'umbrella_ext_um', is: 'no' },
  },
  {
    id: 'umbrella_side_business', domain: 'umbrella', section: 'umbrella_scope', type: 'single',
    prompt: 'Do you run a side business?',
    options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
    allowNotSure: false,
    showIf: { answer: 'umbrella_limit', in: ['1m', '2m'] },
  },
  {
    id: 'supplements', domain: 'health', section: 'health', type: 'multi',
    prompt: 'Which extra health policies do you pay for?',
    options: [
      { id: 'accident', label: 'Accident' },
      { id: 'critical_illness', label: 'Critical illness' },
      { id: 'hospital_indemnity', label: 'Hospital indemnity' },
      { id: 'none_of_these', label: 'None of these', exclusive: true },
    ],
    allowNotSure: true,
    showIf: { holds: 'health' },
  },
  {
    id: 'supplement_cost', domain: 'health', section: 'health', type: 'single',
    prompt: 'About how much do you pay a month for the accident policy?',
    options: [
      { id: 'under_50', label: 'Under $50', value: { min: 0, max: 49 } },
      { id: '50_plus', label: '$50 or more', value: { min: 50, max: 100000 } },
    ],
    allowNotSure: false,
    showIf: { answer: 'supplements', includes: 'accident' },
  },
  {
    id: 'assets_band', domain: 'core', section: 'core', type: 'single',
    prompt: 'Roughly how much could you lose in a lawsuit?',
    options: [
      { id: 'under_1m', label: 'Under $1 million', value: { min: 0, max: 999999 } },
      { id: 'over_1m', label: '$1 million or more', value: { min: 1000000, max: 100000000 } },
    ],
    allowNotSure: true,
    showIf: { not: { holds: 'umbrella' } },
  },
  {
    id: 'cards', domain: 'cards', section: 'other', type: 'multi',
    prompt: 'Which credit cards do you carry?',
    options: [
      { id: 'card_alpha', label: 'Fixture Card Alpha', value: { cardId: 'card-alpha' } },
      { id: 'card_beta', label: 'Fixture Card Beta' },
      { id: 'none_of_these', label: 'None of these', exclusive: true },
    ],
    allowNotSure: false,
    showIf: { any: [{ holds: 'rental_car' }, { holds: 'travel' }, { holds: 'phone' }] },
  },
];

export const FLAGS = [
  {
    id: 'umbrella-auto-below-attach', domain: 'umbrella', bucket: 'raise', kind: 'cross-policy', priority: 10,
    title: 'Raise your auto liability to match your umbrella',
    applies: (ctx) => ctx.holds('umbrella') && ctx.holds('auto') && ctx.is('auto_liability', '100_300')
      ? { emphasis: 'strong', vars: { autoLimit: ctx.option('auto_liability').label } }
      : false,
    background: 'Your auto policy pays up to {{autoLimit}} before the umbrella steps in, which is below what umbrellas usually require.',
    ask: (ctx, vars) => `Ask your agent what auto limit your umbrella requires, and raise ${vars.autoLimit} to meet it.`,
    reason: 'My umbrella needs a higher underlying auto limit than {{autoLimit}}.',
    sourceIds: ['fixture-iii'],
  },
  {
    id: 'umbrella-home-below-min', domain: 'umbrella', bucket: 'raise', kind: 'cross-policy', priority: 10,
    title: 'Raise your home liability to your umbrella\'s minimum',
    applies: (ctx) => ctx.holds('umbrella') && ctx.holds('home') && ctx.is('home_liability', '300k')
      ? { vars: { homeLimit: ctx.option('home_liability').label } }
      : null,
    background: 'Your home policy is at {{homeLimit}}. A gap below the umbrella minimum can leave a claim uncovered.',
    ask: 'Ask your agent to raise your home liability to the umbrella minimum.',
    reason: 'A gap below the required minimum can void umbrella coverage.',
    sourceIds: ['fixture-iii', 'fixture-naic'],
  },
  {
    id: 'umbrella-um-missing', domain: 'umbrella', bucket: 'raise', kind: 'within-policy', priority: 1,
    title: 'Ask to add uninsured motorist coverage to your umbrella',
    applies: (ctx) => ctx.is('umbrella_ext_um', 'no'),
    background: 'Many umbrellas leave out uninsured motorist coverage.',
    ask: 'Ask whether it can be added.',
    reason: 'A serious injury caused by an uninsured driver can exceed my auto limit.',
    sourceIds: ['fixture-naic'],
  },
  {
    id: 'card-rental-duplicate', domain: 'other', bucket: 'drop', kind: 'cross-policy', priority: 20,
    title: 'Stop paying for rental car insurance',
    applies: (ctx) => {
      if (!ctx.holds('rental_car')) return false;
      const cards = ctx.cardsWith('rentalCar');
      return cards.length > 0
        ? { emphasis: 'strong', vars: { cardName: cards[0].name } }
        : { vars: { cardName: 'your credit card' } };
    },
    background: 'Your auto policy and {{cardName}} may already cover a rental car.',
    ask: 'Check {{cardName}} benefits guide, then decline the rental counter coverage.',
    reason: 'I am already covered, so I am declining the extra coverage.',
    sourceIds: ['fixture-issuer'],
  },
  {
    id: 'phone-insurance-duplicate', domain: 'other', bucket: 'drop', kind: 'cross-policy', priority: 30,
    title: 'Check your phone insurance',
    applies: (ctx) => ctx.holds('phone'),
    background: 'Some cards cover your phone when you pay the bill with them.',
    ask: 'Check your card guide before paying the carrier for phone insurance.',
    reason: 'I may already have this coverage through my card.',
    sourceIds: ['fixture-issuer'],
  },
  {
    id: 'umbrella-limit-not-sure', domain: 'umbrella', bucket: 'question', kind: 'within-policy', priority: 5,
    title: 'Find out your umbrella limit',
    applies: (ctx) => ctx.isNotSure('umbrella_limit'),
    background: 'You were not sure how big your umbrella is.',
    ask: 'Ask your agent for the limit on your umbrella.',
    reason: 'I want to know how much my umbrella pays.',
    sourceIds: ['fixture-iii'],
  },
  {
    id: 'supplement-bolt-ons', domain: 'health', bucket: 'question', kind: 'cross-policy', priority: 10,
    title: 'Ask whether your extra health policies are worth it',
    applies: (ctx) => {
      if (!ctx.holds('health') || !ctx.includes('supplements', 'accident')) return false;
      return { vars: { costBand: ctx.option('supplement_cost') ? ctx.option('supplement_cost').label : 'an amount you did not say' } };
    },
    background: 'You pay {{costBand}} a month for an accident policy.',
    ask: 'Ask whether your main plan already covers what this pays for.',
    reason: 'It pays a fixed amount for a narrow event.',
    sourceIds: ['fixture-naic'],
  },
  {
    id: 'education-hsa', domain: 'health', bucket: 'question', kind: 'education', priority: 50,
    title: 'Look into an HSA',
    applies: (ctx) => ctx.holds('health') ? true : false,
    background: 'An HSA has a tax advantage that is often underused.',
    ask: 'Ask your benefits office whether you qualify.',
    reason: 'I want to know if an HSA fits my plan.',
    sourceIds: ['fixture-naic'],
  },
  {
    id: 'stale-probe', domain: 'umbrella', bucket: 'question', kind: 'within-policy', priority: 90,
    title: 'Probe for stale answers',
    applies: (ctx) => ctx.is('umbrella_um_detail', 'can_add'),
    background: 'This only applies when the follow-up question is visible.',
    ask: 'Ask.',
    reason: 'Because.',
    sourceIds: ['fixture-iii'],
  },
  {
    id: 'never-applies', domain: 'core', bucket: 'drop', kind: 'education', priority: 1,
    title: 'Never shown',
    applies: () => false,
    background: 'x', ask: 'x', reason: 'x',
    sourceIds: ['fixture-iii'],
  },
];


const CATALOG = { questions: QUESTIONS, flags: FLAGS, sources: SOURCES, cards: CARDS };
export default CATALOG;
