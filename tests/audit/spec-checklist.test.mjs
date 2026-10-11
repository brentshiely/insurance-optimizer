// Story S12: the SPEC checklist. Every line of docs/SPEC.md under "Core logic", "Question flow and branching", "Output: the
// insurer action list" and "Sources and authority" is mapped, in the table below, to the flags and questions that implement it
// (or to the tests that enforce it, or marked explicitly out of v1). The test fails when
//
//   * a line of those SPEC sections has no row (a requirement nobody mapped);
//   * a row names a flag, question or policy the catalog does not have (a typo, or something removed);
//   * a flag, question or Q1 policy in the catalog is in no row (an addition nobody mapped: add it to the row it belongs to,
//     so every addition is a conscious decision);
//   * an anchor quotes text that is not in the SPEC (the SPEC is frozen; the table must not drift from it);
//   * a bucket the SPEC names (Raise for a home limit below the umbrella minimum, Drop for a duplicated rental waiver, ...)
//     differs from the flag's, unless the row cites the DECISIONS entry that changed it;
//   * a fast-follow item (earth movement, water-damage sub-limits, RV, ATV, jet ski) has crept into the catalog.
//
// Row fields
//   id         short unique name for the row
//   anchors    text copied from the SPEC line(s) the row covers; a SPEC line is covered when it contains an anchor
//   status     'v1'          built; names flags and/or questions and/or Q1 policies
//              'structural'  a rule about the whole product or output (no single flag); `checks` lists the test files that enforce it
//              'out-of-v1'   named in the SPEC as fast-follow; `absent` lists id words that must appear nowhere in the catalog
//   flags, questions, policies   ids that implement the line
//   buckets    { flagId: 'raise' | 'drop' | 'question' } where the SPEC names the bucket
//   decision   DECISIONS entry id(s) that record a deviation from, or a reading of, the SPEC line
//   sourceHosts  hosts (or parent domains) the SPEC names for this kind of claim; every listed flag must cite one
//   textIncludes a string the SPEC says the text must carry (a year), found in some rendering of every listed flag
//   checks     test files (repo-relative); they must exist
//   note       one line saying how the line is met, for the reader of this table
//
// Pure data checks; the SPEC and DECISIONS files are read with jsc's read() and those checks are skipped where it is missing.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { POLICY_IDS } from '../../public/js/overlap/engine/constants.mjs';
import { everything } from './corpus.mjs';

const U = 'umbrella-';
const OTHER_FLAGS = [
  'other-rental-car-waiver', 'other-towing-roadside-duplicate', 'other-vehicle-towing-check', 'other-travel-insurance-overlap',
  'other-phone-insurance-card', 'other-extended-warranty-overlap', 'other-add-on-term-life',
];
const SPEC_POLICIES = ['auto', 'home', 'renters', 'umbrella', 'health', 'rental_car', 'travel', 'phone', 'warranty', 'accidental_death'];

export const SPEC_SECTIONS = ['Core logic: the interactions to encode', 'Question flow and branching', 'Output: the insurer action list', 'Sources and authority'];

export const CHECKLIST = [
  // ---------------------------------------------------------------------------------------------- Core logic
  { id: 'core-holds-only', anchors: ['Overlaps and gaps only exist between policies the user actually holds'], status: 'structural',
    questions: ['policies'], checks: ['tests/data/questions.test.mjs', 'tests/audit/coverage.test.mjs'],
    note: 'Every question and flag is gated on Q1 (holds); the question tests walk all 8,192 tick combinations.' },
  { id: 'core-auto-home-umbrella', anchors: ['**Auto + Home + Umbrella.**'], status: 'v1',
    flags: [U + 'home-below-required-min', U + 'auto-below-required-min', U + 'primary-liability-overbought', U + 'limits-unconfirmed'],
    questions: ['umbrella_limit', 'auto_liability', 'home_liability', 'umbrella_min_auto', 'umbrella_min_home'],
    note: 'Under-buying is a Raise, over-buying a Question, Not sure a Question that asks for the underlying-limit schedule.' },
  { id: 'core-renters-homeowners', anchors: ['**Renters + Homeowners.**'], status: 'v1',
    flags: ['renters-child-vs-parents-home'], questions: ['renters_for', 'renters_child_housing'], policies: ['renters'],
    note: 'Reached by ticking Home and Renters and saying the renters policy is for a child away from home.', decision: 'R1-4' },
  { id: 'core-other-bucket', anchors: ['**The "Other" bucket.**'], status: 'v1',
    flags: OTHER_FLAGS, questions: ['cards', 'card_usual_payment', 'phone_bill_on_card', 'roadside_sources', 'towing_vehicle_policy', 'term_life'],
    policies: ['rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death'],
    note: 'One flag per item (towing has a second for motorcycle and boat policies), card questions only when a card-linked item is ticked.' },
  { id: 'core-card-table', anchors: ['Separate data source to build: credit card benefit data'], status: 'structural',
    questions: ['cards', 'card_usual_payment'], decision: 'D14',
    checks: ['tests/audit/cards.test.mjs', 'tests/engine/catalog.test.mjs'],
    note: 'The card lookup table is its own module (data/cards.mjs, keyed by card); it is empty until Stories S4b and S11b, so card wording is generic and tested on fixture cards.' },

  // ---------------------------------------------------------------------------------------------- Question flow: Q1
  { id: 'flow-tree', anchors: ['A fixed decision tree. Q1 sets which policies the user holds'], status: 'structural',
    questions: ['policies'], checks: ['tests/data/questions.test.mjs', 'tests/audit/scenarios.test.mjs'],
    note: 'Fixed tree, presets plus a "Not sure" option on every question that can take one, no AI call; identical answers give identical output (determinism tests).' },
  { id: 'flow-q1', anchors: ['**Q1. Which policies do you have?**'], status: 'v1',
    questions: ['policies'], policies: SPEC_POLICIES.concat(['motorcycle', 'boat', 'towing']), decision: 'D1',
    note: 'The SPEC lists ten items; motorcycle, boat and towing are ticks too because later sections are gated on them (D1).' },

  // ---------------------------------------------------------------------------------------------- Question flow: Auto + Home + Umbrella core
  { id: 'flow-stack-auto-limit', anchors: ['- Auto liability limit.'], status: 'v1', questions: ['auto_liability', 'umbrella_min_auto'], decision: 'S5-2',
    note: 'The umbrella minimum is asked for auto too, so each limit has something to be compared with.' },
  { id: 'flow-stack-umbrella-limit', anchors: ['- Umbrella limit.'], status: 'v1', questions: ['umbrella_limit'] },
  { id: 'flow-stack-home-limit', anchors: ['- Home liability limit.'], status: 'v1', questions: ['home_liability'] },
  { id: 'flow-stack-home-minimum', anchors: ["- Umbrella's required home minimum."], status: 'v1', questions: ['umbrella_min_home'] },
  { id: 'flow-stack-logic', anchors: ['- Logic: compare auto and home limits against the umbrella attachment point'], status: 'v1',
    flags: [U + 'home-below-required-min', U + 'auto-below-required-min', U + 'primary-liability-overbought', U + 'limits-unconfirmed'],
    buckets: { [U + 'home-below-required-min']: 'raise' }, decision: 'S6-6',
    note: 'A home limit below the umbrella minimum is a Raise; over-buying is a Question, never a Drop, because no source supports cutting primary liability.' },

  // ---------------------------------------------------------------------------------------------- Question flow: Umbrella scope and adequacy
  { id: 'flow-scope-intro', anchors: ['The core logic above only checks whether the underlying limits are high enough to attach'], status: 'structural',
    checks: ['tests/flags/umbrella-scope.test.mjs'], note: 'Introduces the adequacy, UM/UIM and exclusions bullets below; a standard umbrella is liability only and the copy says so.' },
  { id: 'flow-scope-adequacy', anchors: ['- Adequacy vs. exposure.'], status: 'v1',
    flags: [U + 'smaller-than-exposure', U + 'size-unconfirmed'], questions: ['umbrella_exposure'], buckets: { [U + 'smaller-than-exposure']: 'raise' },
    note: 'Coarse bands only; a umbrella no larger than the low end of the band is a Raise, Not sure is a Question.' },
  { id: 'flow-scope-um-uim', anchors: ['- Uninsured/underinsured motorist on the umbrella.'], status: 'v1',
    flags: [U + 'um-uim-extension'], questions: ['umbrella_um_uim'], decision: 'S7-3',
    note: 'Asks whether the umbrella extends UM/UIM; asserts nothing about what umbrellas include by default.' },
  { id: 'flow-scope-exclusions', anchors: ['- Scope exclusions.'], status: 'v1',
    flags: [U + 'scope-exclusions'], questions: ['side_business'], note: 'Stronger emphasis with a side business.' },
  { id: 'flow-scope-not-stored', anchors: ['- Not stored: the adequacy answer is a coarse band'], status: 'structural',
    questions: ['umbrella_exposure'], checks: ['tests/ui/analytics.test.mjs', 'tests/ui/no-storage.test.mjs'],
    note: 'Bands are the only values; analytics records only a band id; nothing is stored.' },

  // ---------------------------------------------------------------------------------------------- Question flow: Auto coverage gaps
  { id: 'flow-auto-intro', anchors: ['Like the home exclusions, these are within-policy gaps and trims on the auto policy itself'], status: 'v1',
    questions: ['auto_financing', 'auto_value'], note: 'The two gate questions: lease or finance, and how old or valuable.' },
  { id: 'flow-auto-um-uim', anchors: ['- Uninsured / underinsured motorist.'], status: 'v1',
    flags: ['auto-um-uim-check'], questions: ['auto_um_uim', 'auto_um_uim_limit'], decision: 'S3a-auto-1',
    note: 'Cites the latest dated Insurance Research Council figure instead of "one in eight".' },
  { id: 'flow-auto-gap', anchors: ['- Gap coverage (loan/lease).'], status: 'v1',
    flags: ['auto-gap-coverage-missing', 'auto-gap-coverage-confirm'], questions: ['auto_gap_coverage'], buckets: { 'auto-gap-coverage-missing': 'raise' } },
  { id: 'flow-auto-rental', anchors: ['- Rental reimbursement.'], status: 'v1',
    flags: ['auto-rental-reimbursement-check'], questions: ['auto_rental_reimbursement'] },
  { id: 'flow-auto-collision', anchors: ['- Collision / comprehensive on an older car.'], status: 'v1',
    flags: ['auto-collision-older-car'], questions: ['auto_collision'], buckets: { 'auto-collision-older-car': 'drop' } },

  // ---------------------------------------------------------------------------------------------- Question flow: Renters
  { id: 'flow-renters-for', anchors: ['- "Is this renters policy for you, or for a child who lives away from home'], status: 'v1', questions: ['renters_for'] },
  { id: 'flow-renters-child', anchors: ['- If child-away-at-college: Question item.'], status: 'v1',
    flags: ['renters-child-vs-parents-home'], questions: ['renters_child_housing'], buckets: { 'renters-child-vs-parents-home': 'question' } },

  // ---------------------------------------------------------------------------------------------- Question flow: Health
  { id: 'flow-health-intro', anchors: ['This is NOT full health-plan pricing.'], status: 'structural',
    checks: ['tests/flags/health-deductible.test.mjs'], note: 'No flag judges plan adequacy, network or price (health flag tests).' },
  { id: 'flow-health-have', anchors: ['- "Do you have health insurance?"'], status: 'v1', policies: ['health'], questions: ['policies'],
    note: 'Answered by ticking Health in Q1.' },
  { id: 'flow-health-medpay', anchors: ['- If yes: Question item on auto MedPay and home medical-payments-to-others coverage'], status: 'v1',
    flags: ['health-auto-medpay-overlap'], questions: ['auto_medpay'], buckets: { 'health-auto-medpay-overlap': 'question' }, decision: 'S3a-home-2',
    note: 'Home medical payments to others covers guests, not the household, so it is background at most, never a duplicate.' },

  // ---------------------------------------------------------------------------------------------- Question flow: Other vehicles
  { id: 'flow-vehicles-intro', anchors: ['These sit under the umbrella exactly like auto does'], status: 'v1',
    questions: ['umbrella_min_motorcycle', 'umbrella_min_boat'], note: 'Each vehicle gets its own umbrella minimum.' },
  { id: 'flow-vehicles-limit', anchors: ['- Motorcycle or boat liability limit, captured the same preset way as auto.'], status: 'v1',
    flags: [U + 'motorcycle-below-required-min', U + 'boat-below-required-min'], questions: ['motorcycle_liability', 'boat_liability', 'umbrella_min_motorcycle', 'umbrella_min_boat'],
    buckets: { [U + 'motorcycle-below-required-min']: 'raise', [U + 'boat-below-required-min']: 'raise' } },
  { id: 'flow-vehicles-towing', anchors: ['- Towing / roadside on a motorcycle or boat policy often duplicates auto roadside'], status: 'v1',
    flags: ['other-vehicle-towing-check'], questions: ['towing_vehicle_policy'], buckets: { 'other-vehicle-towing-check': 'question' }, decision: 'S3a-other-7',
    note: 'The SPEC says Drop; nothing authoritative says these plans usually duplicate, so it is a Question (S3a-other-7).' },
  { id: 'flow-vehicles-fast-follow', anchors: ['Fast-follow, not v1: RV, ATV, and jet ski'], status: 'out-of-v1',
    absent: ['rv', 'atv', 'jet', 'ski'], decision: 'D11', note: 'RV, ATV and jet ski are not in Q1 and have no question or flag.' },

  // ---------------------------------------------------------------------------------------------- Question flow: Health supplemental
  { id: 'flow-supplemental-intro', anchors: ['Still NOT plan adequacy.'], status: 'v1',
    flags: ['deductible-exceeds-cushion-health'], questions: ['deductible_health'], checks: ['tests/flags/health-deductible.test.mjs'],
    note: 'The deductible is asked only as a coarse band for the deductible-vs-cushion check, never as a verdict on the plan.' },
  { id: 'flow-supplemental-boltons', anchors: ['- Supplemental bolt-ons.'], status: 'v1',
    flags: ['health-supplemental-boltons'], questions: ['health_supplemental'], decision: 'S3a-health-2',
    note: 'A Question that states only the sourced definition and asks whether the narrow payout is worth the premium.' },
  { id: 'flow-supplemental-hsa', anchors: ['- HSA/FSA leakage'], status: 'v1',
    flags: ['health-hsa-nudge'], questions: ['health_hsa'], decision: 'S3a-health-5', note: 'A single Question item, no plan shopping.' },
  { id: 'flow-supplemental-short-term', anchors: ['- Short-term or supplemental medical plans duplicating an ACA plan.'], status: 'v1',
    flags: ['health-short-term-plan-alongside'], questions: ['health_short_term'], decision: 'S10-4' },

  // ---------------------------------------------------------------------------------------------- Question flow: Home exclusions
  { id: 'flow-home-intro', anchors: ['A different kind of flag from everything else here.'], status: 'structural',
    checks: ['tests/flags/home-renters.test.mjs'], note: 'Within-policy flags; each is a Question item with the background-and-ask treatment.' },
  { id: 'flow-home-sewer', anchors: ['- Sewer / drain backup.'], status: 'v1',
    flags: ['home-sewer-backup-missing'], questions: ['home_sewer_backup'], buckets: { 'home-sewer-backup-missing': 'question' }, decision: 'D8' },
  { id: 'flow-home-flood', anchors: ['- Flood. Never covered by homeowners'], status: 'v1',
    flags: ['home-flood-no-separate-policy'], questions: ['home_flood_policy'], buckets: { 'home-flood-no-separate-policy': 'question' }, decision: 'D8' },
  { id: 'flow-home-fast-follow', anchors: ['- Fast-follow siblings: earth movement'], status: 'out-of-v1',
    absent: ['earth', 'earthquake', 'sinkhole', 'sublimit', 'sublimits'], decision: 'S3a-home-1',
    note: 'Earth movement and water-damage sub-limits have no question or flag.' },

  // ---------------------------------------------------------------------------------------------- Question flow: Deductible vs cushion
  { id: 'flow-deductible', anchors: ['A cross-policy check of a different kind.'], status: 'v1',
    flags: ['deductible-exceeds-cushion-auto', 'deductible-exceeds-cushion-home', 'deductible-exceeds-cushion-health'],
    questions: ['deductible_auto', 'deductible_home', 'deductible_health', 'emergency_cushion'], decision: 'S10-3',
    note: 'Coarse bands only; band edges are compared, never a guess.' },

  // ---------------------------------------------------------------------------------------------- Question flow: Other bucket
  { id: 'flow-other-intro', anchors: ['Most point back to a credit card the user already carries'], status: 'v1',
    questions: ['cards', 'card_usual_payment'], decision: 'D14', checks: ['tests/audit/cards.test.mjs'],
    note: 'Names a card only when the card table has it and says to check the current benefits guide; generic until the table is filled.' },
  { id: 'flow-other-rental', anchors: ['- Rental car. "When you rent a car'], status: 'v1',
    flags: ['other-rental-car-waiver'], policies: ['rental_car'], buckets: { 'other-rental-car-waiver': 'drop' }, decision: 'S12-9',
    checks: ['tests/audit/flag-content.test.mjs', 'tests/audit/coverage.test.mjs'],
    note: 'A Drop when the car policy (not known to lack collision and comprehensive) or a card that pays first and that the household uses duplicates it (the SPEC: "likely Drop (duplicated by auto policy and/or card)"); a Question for everyone else (DECISIONS S12-9).' },
  { id: 'flow-other-towing', anchors: ['- Towing / roadside. Duplication between auto towing coverage'], status: 'v1',
    flags: ['other-towing-roadside-duplicate'], policies: ['towing'], questions: ['roadside_sources'], buckets: { 'other-towing-roadside-duplicate': 'drop' } },
  { id: 'flow-other-travel', anchors: ['- Travel insurance. "When you book a trip'], status: 'v1',
    flags: ['other-travel-insurance-overlap'], policies: ['travel'], buckets: { 'other-travel-insurance-overlap': 'drop' }, decision: 'S12-9',
    checks: ['tests/audit/flag-content.test.mjs', 'tests/audit/coverage.test.mjs'],
    note: 'A Drop only when the household\'s card is confirmed to include trip protection and it says it usually pays with its cards (the SPEC: "paid with a card that includes trip protection"); a Question otherwise, which is every household while the card table is empty (DECISIONS S12-9).' },
  { id: 'flow-other-phone', anchors: ['- Phone insurance. "Do you pay a monthly fee'], status: 'v1',
    flags: ['other-phone-insurance-card'], policies: ['phone'], questions: ['phone_bill_on_card'], buckets: { 'other-phone-insurance-card': 'question' }, decision: 'S11-2',
    note: 'No authoritative source describes phone plans or card phone cover, so this asks instead of telling the user to drop it.' },
  { id: 'flow-other-warranty', anchors: ['- Extended warranties. "When you buy electronics'], status: 'v1',
    flags: ['other-extended-warranty-overlap'], policies: ['warranty'], buckets: { 'other-extended-warranty-overlap': 'drop' }, decision: 'S12-9',
    checks: ['tests/audit/flag-content.test.mjs', 'tests/audit/coverage.test.mjs'],
    note: 'A Drop only when the household\'s card is confirmed to extend the manufacturer\'s warranty and it says it usually pays with its cards (the SPEC: "paid with a card that extends the manufacturer\'s warranty"); a Question otherwise, which is every household while the card table is empty (DECISIONS S12-9).' },
  { id: 'flow-other-add', anchors: ['- Accidental death (AD&D).'], status: 'v1',
    flags: ['other-add-on-term-life'], policies: ['accidental_death'], questions: ['term_life'], buckets: { 'other-add-on-term-life': 'question' } },

  // ---------------------------------------------------------------------------------------------- Output
  { id: 'output-intro', anchors: ['At the end, the user gets a personalized list'], status: 'structural',
    checks: ['tests/ui/viewModel.test.mjs', 'tests/audit/scenarios.test.mjs'], note: 'The action list is built from the same evaluate() the scenarios run.' },
  { id: 'output-raise', anchors: ['- **Raise**: coverage limits that are too low'], status: 'v1',
    flags: [U + 'home-below-required-min'], buckets: { [U + 'home-below-required-min']: 'raise' }, checks: ['tests/audit/coverage.test.mjs'] },
  { id: 'output-drop', anchors: ['- **Drop**: duplicated coverage'], status: 'v1',
    flags: ['other-rental-car-waiver'], buckets: { 'other-rental-car-waiver': 'drop' }, checks: ['tests/audit/coverage.test.mjs', 'tests/audit/flag-content.test.mjs'],
    note: 'Every Drop has evidence of a duplicate (tests/audit/evidence.mjs), enforced over every wording; items with no known duplicate are Questions.' },
  { id: 'output-question', anchors: ['- **Question**: items to ask their agent'], status: 'v1',
    flags: ['home-sewer-backup-missing'], buckets: { 'home-sewer-backup-missing': 'question' }, checks: ['tests/audit/coverage.test.mjs'] },
  { id: 'output-parts-order', anchors: ['Each item has these parts, in this order:'], status: 'structural',
    checks: ['tests/ui/screens.test.mjs', 'tests/ui/viewModel.test.mjs'], note: 'Background, the ask, the reason ("Say this"), then the source, in the page and in the copied text.' },
  { id: 'output-background', anchors: ['- **Background**:'], status: 'structural', checks: ['tests/audit/flag-content.test.mjs'] },
  { id: 'output-ask', anchors: ['- **The ask**:'], status: 'structural', checks: ['tests/audit/flag-content.test.mjs'] },
  { id: 'output-reason', anchors: ['- **The one-line reason**'], status: 'structural', checks: ['tests/audit/flag-content.test.mjs'] },
  { id: 'output-source', anchors: ['- **The source.**'], status: 'structural',
    checks: ['tests/audit/flag-content.test.mjs', 'tests/audit/sources.test.mjs', 'tests/engine/validate.test.mjs'], note: 'No flag ships without a source; the validator and the audits fail it.' },
  { id: 'output-background-value', anchors: ['The background is what turns the user from someone parroting a script'], status: 'structural',
    checks: ['tests/audit/flag-content.test.mjs'] },

  // ---------------------------------------------------------------------------------------------- Sources and authority
  { id: 'sources-field', anchors: ['Every flag stores a source citation in its data entry'], status: 'structural',
    checks: ['tests/engine/validate.test.mjs', 'tests/audit/flag-content.test.mjs', 'tests/ui/screens.test.mjs'],
    note: 'Publisher, title, URL and last-verified date, rendered beside each item.' },
  { id: 'sources-authoritative', anchors: ['Use authoritative, non-commercial sources wherever possible'], status: 'structural',
    checks: ['tests/data/sources.test.mjs', 'tests/audit/sources.test.mjs'] },
  { id: 'sources-definitions', anchors: ['- Coverage explanations and definitions'], status: 'structural',
    checks: ['tests/data/sources.test.mjs'], note: 'Triple-I and NAIC hosts are on the registry allowlist.' },
  { id: 'sources-regulatory', anchors: ['- Regulatory and general facts: the NAIC'], status: 'structural',
    checks: ['tests/audit/copy.test.mjs'], note: 'No flag, question or section names a state; copy says "your state\'s department of insurance".' },
  { id: 'sources-flood', anchors: ['- Flood exclusion and flood coverage: FEMA'], status: 'v1',
    flags: ['home-flood-no-separate-policy'], sourceHosts: ['floodsmart.gov', 'fema.gov'] },
  { id: 'sources-uninsured', anchors: ['- Uninsured-driver statistics:'], status: 'v1',
    flags: ['auto-um-uim-check'], sourceHosts: ['insurance-research.org', 'consumerfed.org'], textIncludes: '2023', decision: 'S3a-auto-1',
    note: 'The figure is the Insurance Research Council\'s and the text carries its year.' },
  { id: 'sources-cards', anchors: ["- Credit card benefit claims: the issuer's own current benefits guide"], status: 'structural',
    decision: 'D14', checks: ['tests/audit/cards.test.mjs'], note: 'Card claims come only from the card table; none is made while the table is empty.' },
  { id: 'sources-avoid-commercial', anchors: ['Avoid citing insurers, agencies, or affiliate/comparison sites'], status: 'structural',
    checks: ['tests/data/sources.test.mjs'] },
];

// --------------------------------------------------------------------------------------------------- helpers

const hasRead = typeof read === 'function';
const STATUSES = ['v1', 'structural', 'out-of-v1'];
const BUCKET_NAMES = ['raise', 'drop', 'question'];

/** The lines of the named `##` sections that carry content: [{ line, section, text }], headings and blank lines skipped. */
export function specUnits(specText, sections = SPEC_SECTIONS) {
  const units = [];
  let section = null;
  specText.split('\n').forEach((text, i) => {
    if (text.startsWith('## ')) { section = text.slice(3).trim(); return; }
    if (text.startsWith('# ') || text.startsWith('### ')) return;
    if (section !== null && sections.includes(section) && text.trim() !== '') units.push({ line: i + 1, section, text });
  });
  return units;
}

/** The SPEC units no row covers (no row has an anchor inside the unit's text). */
export function unmapped(units, rows) {
  return units.filter((u) => !rows.some((r) => r.anchors.some((a) => u.text.includes(a))));
}

/** The anchors that appear in none of the units. */
export function danglingAnchors(units, rows) {
  const dangling = [];
  for (const r of rows) for (const a of r.anchors) if (!units.some((u) => u.text.includes(a))) dangling.push(`${r.id}: "${a}"`);
  return dangling;
}

const words = (id) => id.split(/[-_]/);
const host = (url) => (/^https:\/\/([^/?#:]+)/.exec(url) || [])[1] || '';
const hostIn = (h, domains) => domains.some((d) => h === d || h.endsWith(`.${d}`));

const flagIds = CATALOG.flags.map((f) => f.id);
const questionIds = CATALOG.questions.map((q) => q.id);
const policyQuestion = CATALOG.questions.find((q) => q.id === 'policies');
const q1Options = policyQuestion.options.map((o) => o.id).filter((id) => id !== 'none');

const mapped = (field) => CHECKLIST.reduce((all, r) => all.concat(r[field] || []), []);

// --------------------------------------------------------------------------------------------------- tests

suite('SPEC checklist: the table', (t) => {
  t('rows are well formed: unique ids, a status, anchors, and the fields their status needs', () => {
    const ids = CHECKLIST.map((r) => r.id);
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], 'duplicate row ids');
    for (const r of CHECKLIST) {
      assert.ok(STATUSES.includes(r.status), `${r.id}: status ${r.status}`);
      assert.ok(Array.isArray(r.anchors) && r.anchors.length > 0 && r.anchors.every((a) => typeof a === 'string' && a.length >= 8), `${r.id}: anchors`);
      const named = (r.flags || []).length + (r.questions || []).length + (r.policies || []).length;
      if (r.status === 'v1') assert.ok(named > 0, `${r.id}: a v1 row must name the flags, questions or policies that implement it`);
      if (r.status === 'structural') assert.ok(Array.isArray(r.checks) && r.checks.length > 0, `${r.id}: a structural row must list the test files that enforce it`);
      if (r.status === 'out-of-v1') {
        assert.equal(named, 0, `${r.id}: an out-of-v1 row names no flag, question or policy`);
        assert.ok(Array.isArray(r.absent) && r.absent.length > 0, `${r.id}: an out-of-v1 row lists the id words that must be absent`);
        assert.ok(r.decision, `${r.id}: an out-of-v1 row cites the DECISIONS entry that defers it`);
      }
      for (const [id, bucket] of Object.entries(r.buckets || {})) {
        assert.ok(BUCKET_NAMES.includes(bucket), `${r.id}: bucket ${bucket}`);
        assert.ok((r.flags || []).includes(id), `${r.id}: buckets names ${id}, which the row does not map`);
      }
    }
  });

  t('every id a row names exists: flags, questions, Q1 policies', () => {
    const missing = [];
    for (const r of CHECKLIST) {
      for (const id of r.flags || []) if (!flagIds.includes(id)) missing.push(`${r.id}: flag ${id}`);
      for (const id of r.questions || []) if (!questionIds.includes(id)) missing.push(`${r.id}: question ${id}`);
      for (const id of r.policies || []) if (!q1Options.includes(id)) missing.push(`${r.id}: Q1 policy ${id}`);
    }
    assert.deepEqual(missing, [], 'names the catalog does not have');
  });

  t('every flag in the catalog is mapped to a SPEC line (an addition must be a conscious one)', () => {
    const covered = new Set(mapped('flags'));
    const loose = flagIds.filter((id) => !covered.has(id));
    assert.deepEqual(loose, [], `flags in no row: add each to the row for the SPEC line it implements, or add a row: ${loose.join(', ')}`);
  });

  t('every question in the catalog is mapped to a SPEC line', () => {
    const covered = new Set(mapped('questions'));
    const loose = questionIds.filter((id) => !covered.has(id));
    assert.deepEqual(loose, [], `questions in no row: ${loose.join(', ')}`);
  });

  t('every policy Q1 offers is mapped to a SPEC line, and the SPEC\'s ten are all offered', () => {
    const covered = new Set(mapped('policies'));
    assert.deepEqual(q1Options.filter((id) => !covered.has(id)), [], 'Q1 options in no row');
    assert.deepEqual(q1Options.slice().sort(), POLICY_IDS.slice().sort(), 'Q1 options and POLICY_IDS agree');
    for (const id of SPEC_POLICIES) assert.ok(q1Options.includes(id), `the SPEC names ${id} in Q1`);
  });

  t('the buckets the SPEC names are the buckets the flags have, except where a DECISIONS entry says otherwise', () => {
    const declared = new Map(CATALOG.flags.map((f) => [f.id, f.bucket]));
    const wrong = [];
    for (const r of CHECKLIST) for (const [id, bucket] of Object.entries(r.buckets || {})) if (declared.get(id) !== bucket) wrong.push(`${r.id}: ${id} is ${declared.get(id)}, the row expects ${bucket}`);
    assert.deepEqual(wrong, []);
    // The Raise / Drop / Question the SPEC states outright, spelled out once more here so a bucket change cannot slip through a row edit.
    assert.equal(declared.get(U + 'home-below-required-min'), 'raise', 'SPEC: a home limit below the umbrella minimum is a Raise');
    assert.equal(declared.get(U + 'motorcycle-below-required-min'), 'raise', 'SPEC: low motorcycle liability under an umbrella is a Raise');
    assert.equal(declared.get(U + 'boat-below-required-min'), 'raise', 'SPEC: low boat liability under an umbrella is a Raise');
    assert.equal(declared.get(U + 'smaller-than-exposure'), 'raise', 'SPEC: a umbrella smaller than the exposure is a Raise');
    assert.equal(declared.get('auto-gap-coverage-missing'), 'raise', 'SPEC: missing gap coverage on a financed car is a Raise');
    assert.equal(declared.get('auto-collision-older-car'), 'drop', 'SPEC: collision on an old car is a Drop candidate');
    for (const id of ['other-rental-car-waiver', 'other-towing-roadside-duplicate', 'other-travel-insurance-overlap', 'other-extended-warranty-overlap']) {
      assert.equal(declared.get(id), 'drop', `SPEC: ${id} is a Drop`);
    }
    // ... but the SPEC makes rental car, travel insurance and warranties a Drop only when something duplicates them (a car policy or a card), so
    // those three can also be a Question, and the other Drops cannot (DECISIONS S12-9).
    const alternates = CATALOG.flags.filter((f) => f.alternateBuckets !== undefined).map((f) => `${f.id}:${f.alternateBuckets.join(',')}`).sort();
    assert.deepEqual(alternates, ['other-extended-warranty-overlap:question', 'other-rental-car-waiver:question', 'other-travel-insurance-overlap:question']);
    for (const id of ['home-sewer-backup-missing', 'home-flood-no-separate-policy', 'renters-child-vs-parents-home', 'health-auto-medpay-overlap', 'other-add-on-term-life']) {
      assert.equal(declared.get(id), 'question', `SPEC: ${id} is a Question item`);
    }
  });

  t('the flags the SPEC calls within-policy (sewer, flood, the four auto gaps) are declared within-policy', () => {
    // SPEC: "common within-policy gaps (sewer backup and flood on a home policy; uninsured-motorist, loan/lease gap, ...)".
    const kindOf = new Map(CATALOG.flags.map((f) => [f.id, f.kind]));
    for (const id of ['home-sewer-backup-missing', 'home-flood-no-separate-policy', 'auto-um-uim-check', 'auto-gap-coverage-missing', 'auto-rental-reimbursement-check', 'auto-collision-older-car']) {
      assert.equal(kindOf.get(id), 'within-policy', id);
    }
  });
});

suite('SPEC checklist: fast-follow items are out of v1', (t) => {
  t('no flag, question, option or policy id carries a word from an out-of-v1 row (earth movement, water-damage sub-limits, RV, ATV, jet ski)', () => {
    const rows = CHECKLIST.filter((r) => r.status === 'out-of-v1');
    assert.ok(rows.length >= 2, 'the SPEC defers at least two items (vehicles and home siblings)');
    const ids = flagIds.concat(questionIds, CATALOG.questions.reduce((all, q) => all.concat(q.options.map((o) => o.id)), []));
    for (const r of rows) {
      const hits = ids.filter((id) => words(id).some((w) => r.absent.includes(w)));
      assert.deepEqual(hits, [], `${r.id} is out of v1 but the catalog has: ${hits.join(', ')}`);
    }
  });

  t('the fast-follow rows cover what the SPEC defers: RV, ATV, jet ski, earth movement, water-damage sub-limits', () => {
    const absent = CHECKLIST.filter((r) => r.status === 'out-of-v1').reduce((all, r) => all.concat(r.absent), []);
    for (const word of ['rv', 'atv', 'jet', 'ski', 'earth', 'sinkhole', 'sublimit']) assert.ok(absent.includes(word), `no out-of-v1 row watches for "${word}"`);
  });
});

suite('SPEC checklist: the sources rows', (t) => {
  t('a row that names a kind of source is met: each of its flags cites a source on one of the named hosts', () => {
    const byId = new Map(CATALOG.flags.map((f) => [f.id, f]));
    let checked = 0;
    for (const r of CHECKLIST) {
      if (!r.sourceHosts) continue;
      for (const id of r.flags) {
        const hosts = byId.get(id).sourceIds.map((sid) => host(SOURCES[sid].url));
        assert.ok(hosts.some((h) => hostIn(h, r.sourceHosts)), `${r.id}: ${id} cites ${hosts.join(', ')}, none of ${r.sourceHosts.join(', ')}`);
        checked++;
      }
    }
    assert.ok(checked >= 2, 'no sources row was checked');
  });

  t('a row that says the text carries a figure\'s year is met: some rendering of each of its flags has it', () => {
    let checked = 0;
    for (const r of CHECKLIST) {
      if (!r.textIncludes) continue;
      for (const id of r.flags) {
        const found = everything().some((e) => e.flag.id === id && [e.flag.title, e.flag.background, e.flag.ask, e.flag.reason].join(' ').includes(r.textIncludes));
        assert.ok(found, `${r.id}: no rendering of ${id} contains "${r.textIncludes}"`);
        checked++;
      }
    }
    assert.ok(checked >= 1);
  });
});

suite('SPEC checklist: against the SPEC file', (t) => {
  t('every line of the four SPEC sections is covered by a row', () => {
    if (!hasRead) return; // no read(): skipped, as the other source-reading tests do
    const units = specUnits(read('docs/SPEC.md'));
    assert.ok(units.length >= 60, `only ${units.length} SPEC lines found; the section titles may have changed`);
    const loose = unmapped(units, CHECKLIST).map((u) => `line ${u.line} (${u.section}): ${u.text.slice(0, 90)}`);
    assert.deepEqual(loose, [], 'SPEC lines no row covers (add a row to tests/audit/spec-checklist.test.mjs)');
  });

  t('every anchor quotes the SPEC: none is left over from text that no longer exists', () => {
    if (!hasRead) return;
    const units = specUnits(read('docs/SPEC.md'));
    assert.deepEqual(danglingAnchors(units, CHECKLIST), []);
  });

  t('all four sections were found', () => {
    if (!hasRead) return;
    const units = specUnits(read('docs/SPEC.md'));
    for (const s of SPEC_SECTIONS) assert.ok(units.some((u) => u.section === s), `no lines found under "${s}"`);
  });

  t('every DECISIONS entry a row cites exists in docs/DECISIONS.md', () => {
    if (!hasRead) return;
    const decisions = read('docs/DECISIONS.md');
    const cited = new Set();
    for (const r of CHECKLIST) if (r.decision) cited.add(r.decision);
    assert.ok(cited.size >= 10, `only ${cited.size} decisions cited`);
    const missing = Array.from(cited).filter((id) => !decisions.includes(`**${id} - `));
    assert.deepEqual(missing, [], 'decision ids not found in docs/DECISIONS.md');
  });

  t('every test file a structural row relies on exists', () => {
    if (!hasRead) return;
    const missing = [];
    for (const r of CHECKLIST) {
      for (const file of r.checks || []) {
        let text = '';
        try { text = read(file); } catch (e) { text = ''; }
        if (text.length === 0) missing.push(`${r.id}: ${file}`);
      }
    }
    assert.deepEqual(missing, []);
  });
});

suite('SPEC checklist: the checker can fail', (t) => {
  const spec = '## Question flow and branching\n\n- Alpha thing. Details.\n- Beta thing. More.\n\n## Elsewhere\n\n- Ignored line.\n';
  t('specUnits reads only the named sections and skips headings and blank lines', () => {
    const units = specUnits(spec, ['Question flow and branching']);
    assert.deepEqual(units.map((u) => u.text), ['- Alpha thing. Details.', '- Beta thing. More.']);
  });

  t('a SPEC line with no row is reported, and an anchor with no SPEC line is reported', () => {
    const units = specUnits(spec, ['Question flow and branching']);
    const rows = [{ id: 'a', anchors: ['- Alpha thing.'] }, { id: 'z', anchors: ['- Gone thing.'] }];
    assert.deepEqual(unmapped(units, rows).map((u) => u.text), ['- Beta thing. More.']);
    assert.deepEqual(danglingAnchors(units, rows), ['z: "- Gone thing."']);
  });
});
