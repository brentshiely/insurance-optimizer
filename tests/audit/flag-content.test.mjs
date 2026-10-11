// Story S12 audit: every item the engine can show is complete.
//
// SPEC "Output: the insurer action list": each item has a background, the ask, a one-line reason and a source, and "no flag
// ships without a source". This audit checks that over the catalog as written and over every distinct rendering the scenarios
// and the sweep (tests/audit/corpus.mjs) can produce, so a text function that returns an empty string for one answer, or a
// flag that cites a source the registry does not have, is caught however rarely the answer is given.
//
// Pure data checks; runs under jsc and Node.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { BUCKETS, KINDS, EMPHASES, DOMAINS } from '../../public/js/overlap/engine/constants.mjs';
import { CARDS } from '../../public/js/overlap/data/cards.mjs';
import { FIXTURE_CARDS } from '../fixtures/otherCards.mjs';
import { evaluate } from '../../public/js/overlap/engine/evaluate.mjs';
import SCENARIOS from '../scenarios/scenarios.mjs';
import { everything, scenarioRuns, sweepRuns, householdRuns, flagsOf } from './corpus.mjs';
import { DROP_EVIDENCE, NOT_FOR_A_DROP, hasEvidence } from './evidence.mjs';
import { phoneVariant, umbrellaGaps } from './variants.mjs';

// The same fixed "verification day" as tests/data/sources.test.mjs: a source can never be verified later than this.
const TODAY = '2026-10-10';
const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const FIELDS = ['title', 'background', 'ask', 'reason'];
const HTTPS = /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#]\S*)?$/;
const MAX_REASON_LENGTH = 250;

function isIsoDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= dim;
}

const text = (v) => typeof v === 'string' && v.trim().length > 0;

// The policy a Drop flag is about: the household must have ticked it (a Drop is about something the person pays for).
const DROP_POLICY = {
  'auto-collision-older-car': 'auto', 'other-rental-car-waiver': 'rental_car', 'other-towing-roadside-duplicate': 'towing',
  'other-travel-insurance-overlap': 'travel', 'other-extended-warranty-overlap': 'warranty',
};
// The catalog with the fixture card table: the real table is empty until Stories S4b and S11b (DECISIONS D14).
const WITH_FIXTURE = { ...CATALOG, cards: FIXTURE_CARDS };
const allRuns = (catalog) => scenarioRuns(catalog).concat(sweepRuns(catalog), householdRuns(catalog));

suite('flag audit: the catalog as written', (t) => {
  t('every flag has the fields the contract needs, a kebab-case id, and a unique id', () => {
    const ids = CATALOG.flags.map((f) => f.id);
    assert.ok(ids.length >= 32, `only ${ids.length} flags`);
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], 'duplicate flag ids');
    for (const f of CATALOG.flags) {
      assert.match(f.id, KEBAB, `${f.id} id`);
      assert.ok(BUCKETS.includes(f.bucket), `${f.id} bucket ${f.bucket}`);
      assert.ok(KINDS.includes(f.kind), `${f.id} kind ${f.kind}`);
      assert.ok(DOMAINS.includes(f.domain), `${f.id} domain ${f.domain}`);
      assert.equal(typeof f.applies, 'function', `${f.id} applies`);
      for (const field of FIELDS) assert.ok(typeof f[field] === 'function' || text(f[field]), `${f.id}.${field} must be text or a function`);
    }
  });

  t('every flag cites at least one source, each one is in the registry, and none is cited twice by the same flag', () => {
    for (const f of CATALOG.flags) {
      assert.ok(Array.isArray(f.sourceIds) && f.sourceIds.length >= 1, `${f.id} has no source (no flag ships without one)`);
      assert.deepEqual(f.sourceIds.filter((id, i) => f.sourceIds.indexOf(id) !== i), [], `${f.id} cites a source twice`);
      for (const id of f.sourceIds) assert.ok(Object.prototype.hasOwnProperty.call(SOURCES, id), `${f.id} cites "${id}", which the registry does not have`);
    }
  });

  t('every source a flag cites carries the four things the page shows: publisher, title, an https link, and a real last-verified date', () => {
    const cited = new Set(CATALOG.flags.reduce((all, f) => all.concat(f.sourceIds), []));
    assert.ok(cited.size >= 50, `only ${cited.size} distinct sources cited`);
    for (const id of cited) {
      const s = SOURCES[id];
      assert.equal(s.id, id, `${id}: id must equal its key`);
      assert.ok(text(s.publisher), `${id}: publisher`);
      assert.ok(text(s.title), `${id}: title`);
      assert.match(s.url, HTTPS, `${id}: url ${s.url}`);
      assert.ok(isIsoDate(s.lastVerified), `${id}: lastVerified ${s.lastVerified} is not a real date`);
      assert.ok(s.lastVerified <= TODAY, `${id}: lastVerified ${s.lastVerified} is in the future`);
    }
  });
});

suite('flag audit: every rendering', (t) => {
  t('the corpus is real: more distinct renderings than flags, from the scenarios and the sweep', () => {
    assert.ok(everything().length > CATALOG.flags.length * 2, `only ${everything().length} distinct renderings`);
  });

  t('every rendering has a non-empty title, background, ask and reason', () => {
    const empty = [];
    for (const { flag, run } of everything()) {
      for (const field of FIELDS) if (!text(flag[field])) empty.push(`${flag.id} (${run.id}) ${field}`);
    }
    assert.deepEqual(empty, [], 'empty text');
  });

  t('the background is a real explanation and the ask a real action: neither is a stub', () => {
    const stubs = [];
    for (const { flag, run } of everything()) {
      if (flag.background.length < 150) stubs.push(`${flag.id} (${run.id}) background is ${flag.background.length} characters`);
      if (flag.ask.length < 60) stubs.push(`${flag.id} (${run.id}) ask is ${flag.ask.length} characters`);
    }
    assert.deepEqual(stubs, []);
  });

  t('the reason is one line the person can say to their insurer: a single line, short, spoken in the first person', () => {
    const bad = [];
    for (const { flag, run } of everything()) {
      const r = flag.reason;
      if (/[\r\n]/.test(r)) bad.push(`${flag.id} (${run.id}) reason has a line break`);
      if (r.length > MAX_REASON_LENGTH) bad.push(`${flag.id} (${run.id}) reason is ${r.length} characters, over ${MAX_REASON_LENGTH}`);
      if (!/\b(I|my|me|I'm|I've)\b/.test(r)) bad.push(`${flag.id} (${run.id}) reason is not in the first person: "${r}"`);
    }
    assert.deepEqual(bad, []);
  });

  t('every rendering carries at least one source, each with the same five fields as the registry', () => {
    const bad = [];
    for (const { flag, run } of everything()) {
      if (!Array.isArray(flag.sources) || flag.sources.length === 0) { bad.push(`${flag.id} (${run.id}) has no source`); continue; }
      for (const s of flag.sources) {
        const reg = SOURCES[s.id];
        if (!reg) { bad.push(`${flag.id} (${run.id}) shows source ${s.id}, which the registry does not have`); continue; }
        if (Object.keys(s).sort().join(',') !== ['id', 'lastVerified', 'publisher', 'title', 'url'].join(',')) bad.push(`${flag.id}: source ${s.id} has fields ${Object.keys(s).join(',')}`);
        for (const field of ['publisher', 'title', 'url', 'lastVerified']) if (s[field] !== reg[field]) bad.push(`${flag.id}: source ${s.id} ${field} differs from the registry`);
      }
    }
    assert.deepEqual(bad, []);
  });

  t('a rendering names its flag correctly: bucket (the declared one, or one the flag lists in alternateBuckets), kind, domain and emphasis agree with the catalog', () => {
    const byId = new Map(CATALOG.flags.map((f) => [f.id, f]));
    const bad = [];
    for (const { flag, run } of everything()) {
      const declared = byId.get(flag.id);
      if (!declared) { bad.push(`${flag.id} (${run.id}) is not in the catalog`); continue; }
      const buckets = [declared.bucket].concat(declared.alternateBuckets || []);
      if (!buckets.includes(flag.bucket)) bad.push(`${flag.id} (${run.id}) bucket ${flag.bucket}, the catalog allows ${buckets.join(', ')}`);
      if (flag.kind !== declared.kind) bad.push(`${flag.id} (${run.id}) kind ${flag.kind} vs ${declared.kind}`);
      if (flag.domain !== declared.domain) bad.push(`${flag.id} (${run.id}) domain ${flag.domain} vs ${declared.domain}`);
      if (!EMPHASES.includes(flag.emphasis)) bad.push(`${flag.id} (${run.id}) emphasis ${flag.emphasis}`);
    }
    assert.deepEqual(bad, []);
  });

  t('a Drop is only ever shown for something the person said they pay for, never from Not sure alone', () => {
    // SPEC: Drop is "duplicated coverage they are paying for twice". Every Drop flag is gated on a policy the person ticked in Q1.
    const dropFlags = CATALOG.flags.filter((f) => f.bucket === 'drop').map((f) => f.id);
    assert.ok(dropFlags.length >= 4, `only ${dropFlags.length} Drop flags`);
    const policyOf = DROP_POLICY;
    for (const id of dropFlags) assert.ok(policyOf[id], `${id}: add the policy it requires to this table (a Drop must be about something the person holds)`);
    for (const { flag, run } of everything()) {
      if (flag.bucket !== 'drop') continue;
      assert.ok(run.answers.policies.includes(policyOf[flag.id]), `${flag.id} shown (${run.id}) without ${policyOf[flag.id]} ticked`);
    }
  });
});

// DECISIONS S12-8, S12-9, S12-10 and S12-11. Rules the flags must meet.
//
// The SPEC defines Drop as "duplicated coverage they are paying for twice", so an item filed under Drop has to have something that
// already covers the same thing (rules in tests/audit/evidence.mjs, written out separately from the flags) and its text must not
// tell the reader the opposite. More rules come from reading every distinct wording the corpus can produce: a text must not send a
// household to something it did not say it has (a card it did not tick, a home or renters policy it does not hold), and must not
// ask a household for something it already told us.
//
// Every rule is enforced over the scenarios, the sweep and the random households, on the real card table and on the fixture one,
// with NO exceptions: a flag that breaks a rule is fixed in the same change, whichever story wrote it (an earlier version of this
// file kept an allow-list for one such flag, which let shipped wording that contradicted the household's answers stay; it was
// removed, DECISIONS S12-10).
const TABLES = [['real card table', CATALOG, CARDS], ['fixture card table', WITH_FIXTURE, FIXTURE_CARDS]];

const PHONE_ID = 'other-phone-insurance-card';
const UMBRELLA_UNCONFIRMED_ID = 'umbrella-limits-unconfirmed';
const PRIMARY_CARD = /pays before your own insurance/i;
const USUALLY_SECONDARY = /usually secondary/i;
const wordsOf = (flag) => [flag.title, flag.background, flag.ask, flag.reason].join('\n');

// Each finder returns [{ flagId, message }] for one catalog and card table. The sanity counts keep a finder from going quiet.
const RULE_TEXT = {
  'drop-without-evidence': 'a household shown a Drop has something that already covers the same thing (evidence.mjs)',
  'bucket-follows-evidence': 'rental car, travel and warranties are a Drop exactly when the household has something that already covers them, and a Question otherwise',
  'drop-says-worth-buying': 'no Drop says the coverage may be worth buying or may be all that stands between the household and a bill',
  'primary-card-and-usually-secondary': 'a text that says a card pays before your own insurance does not also say card rental cover is usually secondary',
  'card-reason-without-a-card': 'a reason (the line the household says to its insurer) speaks of "my card" only when the household ticked a card',
  'phone-text-names-only-what-is-held': 'the phone item names a home policy, a renters policy or "two places" only when the household holds one, and its title names exactly the policies it holds',
  'umbrella-asks-for-what-is-missing': 'when a household is Not sure of its own limits but gave what its umbrella requires, the umbrella item sends it to its own policies, not to the agent for the requirements list, and the other way round',
};

// The flags that are a Drop only when something already covers the same thing, and a Question when nothing is known to.
const FILED_BY_EVIDENCE = CATALOG.flags.filter((f) => f.bucket === 'drop' && (f.alternateBuckets || []).includes('question')).map((f) => f.id);

// ---- the phone item: which places it names ------------------------------------------------------------------------------------
// "away from home" is how Triple-I describes what a home or renters policy covers (a phone carried out of the house), not a policy.
const AWAY_FROM_HOME = /away[- ]from[- ]home/gi;
const HOME_WORDS = /\bhome\b|homeowners/i;
const RENTERS_WORDS = /\brenters?\b/i;
const TWO_PLACES = /two places/i;

// What is wrong with one rendering of the phone item for a household that ticked `policies`; [] when nothing is.
function phoneProblems(flag, policies) {
  const home = policies.includes('home');
  const renters = policies.includes('renters');
  const problems = [];
  const body = [flag.background, flag.ask, flag.reason].join('\n').replace(AWAY_FROM_HOME, '');
  if (!home && HOME_WORDS.test(`${flag.title}\n${body}`)) problems.push('speaks of a home policy the household did not tick');
  if (!renters && RENTERS_WORDS.test(`${flag.title}\n${body}`)) problems.push('speaks of a renters policy the household did not tick');
  if (!home && !renters && TWO_PLACES.test(body)) problems.push('says "two places" when the household has only its card to check');
  // The title is the same for every path (a named card, a bill on a card), so it must name exactly what the household holds.
  if (home && !HOME_WORDS.test(flag.title)) problems.push('has a title that leaves out the home policy the household holds');
  if (renters && !RENTERS_WORDS.test(flag.title)) problems.push('has a title that leaves out the renters policy the household holds');
  return problems;
}

// ---- the umbrella item: which gap the household has ---------------------------------------------------------------------------
// The gap is read from the household's answers (tests/audit/variants.mjs), not from the stack, so the rule does not depend on the
// code it checks.

// Sends the household to the agent for the list of what the umbrella requires underneath ...
const ASKS_FOR_THE_REQUIRED_LIST = /list of (?:the )?(?:required|underlying)|required underlying|underlying limits (?:your|my) umbrella|limits (?:your|my) umbrella requires/i;
// ... or to the household's own policy for its own limit.
const LOOKS_UP_OWN_LIMITS = /declarations page|summary page|\bown (?:liability )?limits?\b/i;

const optionLabel = (catalog, questionId, optionId) => {
  const q = catalog.questions.find((x) => x.id === questionId);
  const o = q && q.options.find((x) => x.id === optionId);
  return o ? o.label : undefined;
};

// What is wrong with one rendering of umbrella-limits-unconfirmed for this household; [] when nothing is. `kind` says which case it was.
function umbrellaProblems(flag, answers, catalog = CATALOG) {
  const gaps = umbrellaGaps(answers);
  if (gaps === null) return { kind: 'none', problems: [] };
  const { ownUnknown, requiredUnknown } = gaps;
  const problems = [];
  const text = `${flag.title}\n${flag.ask}\n${flag.reason}`;
  if (ownUnknown.length > 0 && requiredUnknown.length === 0) {
    // Its own limit is what is missing. It gave us what the umbrella requires, so the item must not ask for that list again ...
    if (ASKS_FOR_THE_REQUIRED_LIST.test(text)) problems.push('sends a household that stated what its umbrella requires to the agent for the requirements list');
    // ... it must send it to its own policy, and say what that limit is to be compared with.
    if (!LOOKS_UP_OWN_LIMITS.test(flag.ask)) problems.push('does not send the household to its own policy for its own limit');
    for (const l of ownUnknown) {
      const label = optionLabel(catalog, l.required, answers[l.required]);
      if (label !== undefined && !flag.ask.includes(label)) problems.push(`does not say the ${label} the household told us its umbrella requires on its ${l.policy} policy`);
    }
    return { kind: 'own', problems };
  }
  if (requiredUnknown.length > 0 && ownUnknown.length === 0) {
    // The requirements list is what is missing and its own limits are known, so the item must not send it to look up its own limits.
    if (!ASKS_FOR_THE_REQUIRED_LIST.test(flag.ask)) problems.push('does not ask the agent for the requirements list');
    if (requiredUnknown.every((l) => answers[l.limit] !== undefined)) {
      if (LOOKS_UP_OWN_LIMITS.test(text)) problems.push('sends a household that gave its own limits to look them up again');
    }
    return { kind: 'required', problems };
  }
  if (ownUnknown.length > 0 && requiredUnknown.length > 0) {
    if (!ASKS_FOR_THE_REQUIRED_LIST.test(flag.ask)) problems.push('does not ask the agent for the requirements list');
    if (!LOOKS_UP_OWN_LIMITS.test(flag.ask)) problems.push('does not send the household to its own policy for its own limit');
    return { kind: 'both', problems };
  }
  return { kind: 'none', problems };
}

const FINDERS = {
  'drop-without-evidence': (catalog, table) => {
    const found = [];
    let seen = 0;
    for (const run of allRuns(catalog)) {
      for (const flag of flagsOf(run.result)) {
        if (flag.bucket !== 'drop') continue;
        seen++;
        if (!hasEvidence(flag.id, run.answers, table)) found.push({ flagId: flag.id, message: `${flag.id} is a Drop for ${run.id}, with nothing that already covers it` });
      }
    }
    assert.ok(seen > 100, `the audit saw only ${seen} Drops`);
    return found;
  },
  // The converse of the rule above: when something does cover it, the item is a Drop (not left as a Question), and the flag always shows.
  'bucket-follows-evidence': (catalog, table) => {
    const found = [];
    let drops = 0;
    let questions = 0;
    for (const run of allRuns(catalog)) {
      const shown = flagsOf(run.result);
      for (const id of FILED_BY_EVIDENCE) {
        if (!run.answers.policies.includes(DROP_POLICY[id])) continue;
        const flag = shown.find((f) => f.id === id);
        const expected = hasEvidence(id, run.answers, table) ? 'drop' : 'question';
        if (expected === 'drop') drops++; else questions++;
        if (!flag) found.push({ flagId: id, message: `${id} is not shown for ${run.id}, which ticks ${DROP_POLICY[id]}` });
        else if (flag.bucket !== expected) found.push({ flagId: id, message: `${id} is a ${flag.bucket} for ${run.id}, expected a ${expected} (evidence: ${expected === 'drop'})` });
      }
    }
    assert.ok(questions > 100, `the audit saw only ${questions} households without evidence`);
    // The real card table is empty, so only the car policy can make rental a Drop there; the fixture table must show many more.
    assert.ok(drops > (catalog === WITH_FIXTURE ? 100 : 20), `the audit saw only ${drops} households with evidence`);
    return found;
  },
  'drop-says-worth-buying': (catalog) => {
    const found = [];
    let seen = 0;
    for (const { flag, run } of everything(catalog)) {
      if (flag.bucket !== 'drop') continue;
      seen++;
      for (const re of NOT_FOR_A_DROP) if (re.test(wordsOf(flag))) found.push({ flagId: flag.id, message: `${flag.id} (${run.id}) is a Drop and says ${re}` });
    }
    assert.ok(seen >= 10, `the audit saw only ${seen} distinct Drop wordings`);
    return found;
  },
  'primary-card-and-usually-secondary': (catalog) => {
    const found = [];
    let seen = 0;
    for (const { flag, run } of everything(catalog)) {
      const all = wordsOf(flag);
      if (PRIMARY_CARD.test(all)) seen++;
      if (PRIMARY_CARD.test(all) && USUALLY_SECONDARY.test(all)) found.push({ flagId: flag.id, message: `${flag.id} (${run.id}) says a card pays first and that card cover is usually secondary` });
    }
    // Only the fixture table has a card whose rental cover pays first; the real table is empty (DECISIONS D14).
    if (catalog === WITH_FIXTURE) assert.ok(seen >= 3, `the audit saw only ${seen} wordings that say a card pays first`);
    return found;
  },
  'card-reason-without-a-card': (catalog) => {
    const found = [];
    let seen = 0;
    for (const run of allRuns(catalog)) {
      const cards = Array.isArray(run.answers.cards) ? run.answers.cards.filter((c) => c !== 'other_none') : [];
      if (cards.length > 0) continue;
      for (const flag of flagsOf(run.result)) {
        if (!FILED_BY_EVIDENCE.includes(flag.id)) continue;
        seen++;
        if (/\bcard\b/i.test(flag.reason)) found.push({ flagId: flag.id, message: `${flag.id} (${run.id}) has the reason "${flag.reason}" for a household that ticked no card` });
      }
    }
    assert.ok(seen > 100, `the audit saw only ${seen} reasons for a household without a card`);
    return found;
  },
  'phone-text-names-only-what-is-held': (catalog) => {
    const found = [];
    const seen = { neither: 0, home: 0, renters: 0, both: 0 };
    for (const { flag, run } of everything(catalog)) {
      if (flag.id !== PHONE_ID) continue;
      const { policies } = run.answers;
      seen[phoneVariant(policies)]++;
      for (const problem of phoneProblems(flag, policies)) found.push({ flagId: flag.id, message: `${flag.id} (${run.id}) ${problem}` });
    }
    for (const k of Object.keys(seen)) assert.ok(seen[k] >= 3, `the audit saw only ${seen[k]} phone wordings for a household holding ${k} of home and renters`);
    return found;
  },
  'umbrella-asks-for-what-is-missing': (catalog) => {
    const found = [];
    const seen = { own: 0, required: 0, both: 0 };
    for (const run of allRuns(catalog)) {
      const flag = flagsOf(run.result).find((f) => f.id === UMBRELLA_UNCONFIRMED_ID);
      if (!flag) continue;
      const { kind, problems } = umbrellaProblems(flag, run.answers, catalog);
      if (seen[kind] !== undefined) seen[kind]++;
      for (const problem of problems) found.push({ flagId: flag.id, message: `${flag.id} (${run.id}, ${kind}) ${problem}` });
    }
    for (const k of Object.keys(seen)) assert.ok(seen[k] >= 5, `the audit saw only ${seen[k]} households whose gap is "${k}"`);
    return found;
  },
};

suite('flag audit: a Drop is a duplicate', (t) => {
  t('every Drop flag in the catalog has an evidence rule, and the table names no flag that is not a Drop', () => {
    const drops = CATALOG.flags.filter((f) => f.bucket === 'drop').map((f) => f.id);
    assert.deepEqual(drops.filter((id) => !DROP_EVIDENCE[id]), [], 'Drop flags with no rule in tests/audit/evidence.mjs (say what already covers it)');
    assert.deepEqual(Object.keys(DROP_EVIDENCE).filter((id) => !drops.includes(id)), [], 'evidence rules for flags that are not Drops');
  });

  t('the evidence rules follow the SPEC: travel and warranty need a confirmed card AND the household paying with its cards; rental needs the car policy or a card that pays first', () => {
    const table = FIXTURE_CARDS;
    const travel = (cards, pay) => hasEvidence('other-travel-insurance-overlap', { policies: ['travel'], cards, ...(pay ? { card_usual_payment: pay } : {}) }, table);
    const warranty = (cards, pay) => hasEvidence('other-extended-warranty-overlap', { policies: ['warranty'], cards, ...(pay ? { card_usual_payment: pay } : {}) }, table);
    const rental = (policies, cards, pay, extra) => hasEvidence('other-rental-car-waiver', { policies, cards, ...(pay ? { card_usual_payment: pay } : {}), ...extra }, table);
    assert.equal(travel(['chase_sapphire_preferred'], 'yes'), true);
    assert.equal(travel(['chase_sapphire_preferred'], 'no'), false, 'a card the household does not usually pay with is not a duplicate');
    assert.equal(travel(['chase_sapphire_preferred'], 'not_sure'), false, 'Not sure is not a duplicate');
    assert.equal(travel(['amex_platinum'], 'yes'), false, 'trip protection unverified on that card');
    assert.equal(travel(['other_none']), false);
    assert.equal(warranty(['chase_sapphire_preferred'], 'yes'), true);
    assert.equal(warranty(['chase_sapphire_preferred'], 'no'), false);
    assert.equal(warranty(['amex_platinum'], 'yes'), false, 'that card is listed as having no warranty extension');
    assert.equal(rental(['rental_car'], ['chase_sapphire_preferred'], 'yes'), true, 'a card that pays first, used by the household');
    assert.equal(rental(['rental_car'], ['chase_sapphire_preferred'], 'no'), false);
    assert.equal(rental(['rental_car'], ['amex_platinum'], 'yes'), false, 'a card that pays second is not enough without a car policy');
    assert.equal(rental(['rental_car'], ['other_none']), false);
    const oldCar = { auto_financing: 'paid_off', auto_value: 'under_3000' };
    assert.equal(rental(['auto', 'rental_car'], ['other_none'], null, { ...oldCar, auto_collision: 'yes' }), true, 'the car policy with collision');
    assert.equal(rental(['auto', 'rental_car'], ['other_none'], null, { ...oldCar, auto_collision: 'no' }), false, 'a car policy without collision and comprehensive');
  });

  t('the phrase scanners find what a Drop must not say, and what a paragraph must not say twice, and pass what is fine', () => {
    const hits = (text) => NOT_FOR_A_DROP.some((re) => re.test(text));
    assert.ok(hits('If nothing else covers the rental, the waiver may be worth buying for that trip.'));
    assert.ok(hits('the waiver may be the only thing standing between you and the repair bill'));
    assert.ok(hits('it may be the only protection you have'));
    assert.equal(hits('If both cover you, decline the waiver at the counter.'), false);
    assert.equal(hits('If they do not, find out what would pay before you decline anything.'), false);
    const both = (text) => PRIMARY_CARD.test(text) && USUALLY_SECONDARY.test(text);
    assert.ok(both('That coverage is usually secondary, meaning it pays only after your own car insurance. That coverage is listed as primary, which means it pays before your own insurance.'));
    assert.equal(both('That coverage is listed as primary, which means it pays before your own insurance.'), false);
    assert.equal(both('That coverage is usually secondary. That coverage is listed as secondary, which means it pays only after your own insurance.'), false);
  });

  t('the phone rule finds a home or renters policy, or "two places", that the household does not hold, and a title that leaves out one it does', () => {
    const NEW = {
      title: 'Check whether a card you carry already covers your phone',
      background: 'You told us you pay a monthly fee to insure your phone. Before you keep paying it, check whether a card you carry already covers the same phone.',
      ask: 'Ask the issuer of any card you carry whether it protects your phone and what it requires. Keep the carrier plan until it confirms coverage.',
      reason: 'I may already have coverage for my phone through a card, so I want to confirm that before I keep paying for a separate plan.',
    };
    assert.deepEqual(phoneProblems(NEW, ['phone']), [], 'a household with only its card is sent only to its card');
    const OLD = {
      title: 'Check whether a card or your home policy already covers your phone',
      background: 'Before you keep paying it, check two places that may already cover the same phone.',
      ask: 'Ask the issuer of any card you carry whether it protects your phone and what it requires. Ask your home or renters insurer whether a phone is covered.',
      reason: 'I may already have coverage for my phone through a card or my home or renters policy, so I want to confirm that.',
    };
    assert.ok(phoneProblems(OLD, ['phone']).length >= 3, 'the wording shipped before S12-10, for a household with neither policy');
    assert.ok(phoneProblems(OLD, ['phone', 'renters']).some((p) => /home policy the household did not tick/.test(p)), 'a renters-only household was told about a home policy');
    assert.ok(phoneProblems(OLD, ['phone', 'home']).some((p) => /renters policy the household did not tick/.test(p)), 'a home-only household was told about a renters policy');
    assert.ok(phoneProblems(NEW, ['phone', 'home']).some((p) => /title that leaves out the home policy/.test(p)), 'a title that ignores the home policy held');
    const HOME_ONLY = { ...NEW, title: 'Check whether a card or your home policy already covers your phone', background: `${NEW.background} Your homeowners policy generally covers things you carry away from home.` };
    assert.deepEqual(phoneProblems(HOME_ONLY, ['phone', 'home']), [], 'the phrase "away from home" is not a policy');
  });

  t('the umbrella rule sends each gap to the right place: own limits to its own policies, the requirements list to the agent, and both for both', () => {
    const answersOf = (id) => SCENARIOS.find((x) => x.id === id).answers;
    const TEXT_BEFORE_S12_11 = {
      title: 'Get the underlying limits your umbrella requires from your agent',
      ask: 'Ask your agent for the list of required underlying limits on your umbrella (look for a heading like "required underlying limits"), then compare it with the liability limit on each policy underneath. Your own limits are on the summary page of each policy, called the declarations page. If any of your limits is lower than the list asks for, raise it, and ask what the umbrella does while a limit is short.',
      reason: 'I want the list of underlying limits my umbrella requires so I can check it against my policies.',
    };
    const shown = (answers, fields) => {
      const changed = { ...CATALOG, flags: CATALOG.flags.map((f) => (f.id === UMBRELLA_UNCONFIRMED_ID ? { ...f, ...fields } : f)) };
      return flagsOf(evaluate(answers, changed)).find((f) => f.id === UMBRELLA_UNCONFIRMED_ID);
    };
    const check = (answers, fields) => umbrellaProblems(shown(answers, fields), answers);

    // Not sure of its own limits only (the household said what its umbrella requires): the old wording asked for that list again.
    const own = answersOf('stack-limits-not-sure');
    assert.equal(check(own, {}).kind, 'own');
    assert.deepEqual(check(own, {}).problems, [], 'the catalog as written');
    const oldOwn = check(own, TEXT_BEFORE_S12_11);
    assert.ok(oldOwn.problems.some((p) => /requirements list/.test(p)), `the old wording asked for the list: ${JSON.stringify(oldOwn)}`);
    assert.ok(oldOwn.problems.some((p) => /250\/500/.test(p)) && oldOwn.problems.some((p) => /\$500,000/.test(p)), 'and left out the figures the household gave');
    // A title or reason that asks for the list, with an otherwise good ask.
    const goodAsk = shown(own, {}).ask;
    assert.ok(check(own, { title: TEXT_BEFORE_S12_11.title, ask: goodAsk }).problems.length > 0, 'the title alone');
    assert.ok(check(own, { reason: TEXT_BEFORE_S12_11.reason, ask: goodAsk }).problems.length > 0, 'the reason alone');

    // Not sure of what the umbrella requires, with its own limits known: it must not be sent to look its own limits up again.
    const required = answersOf('stack-requirements-not-sure');
    assert.equal(check(required, {}).kind, 'required');
    assert.deepEqual(check(required, {}).problems, [], 'the catalog as written');
    assert.ok(check(required, { ask: 'Check the summary page of your auto and home policies, called the declarations page, for your liability limit.' }).problems.length >= 2, 'the "own" wording for a requirement gap');
    assert.ok(check(required, { reason: 'I want to confirm my own liability limits meet what my umbrella asks for.' }).problems.length > 0, 'the "own" reason for a requirement gap');

    // Both gaps: the item must cover both.
    const both = answersOf('stack-nothing-known');
    assert.equal(check(both, {}).kind, 'both');
    assert.deepEqual(check(both, {}).problems, [], 'the catalog as written');
    assert.ok(check(both, { ask: 'Ask your agent for the list of required underlying limits on your umbrella.' }).problems.length > 0, 'only the list');
    assert.ok(check(both, { ask: 'Check the summary page of your auto policy, called the declarations page, for your liability limit.' }).problems.length > 0, 'only the own limit');

    // A household without an umbrella has no gap to classify.
    assert.equal(umbrellaProblems({ title: 't', ask: 'a', reason: 'r' }, { policies: ['auto'] }).kind, 'none');
  });

  t('the rules also catch the shipped wording through the whole engine, not only through the scanners', () => {
    const answers = SCENARIOS.find((x) => x.id === 'phone-bill-and-card-use-not-sure').answers;
    const oldCatalog = { ...CATALOG, flags: CATALOG.flags.map((f) => (f.id === PHONE_ID ? { ...f, title: 'Check whether a card or your home policy already covers your phone' } : f)) };
    const phone = flagsOf(evaluate(answers, oldCatalog)).find((f) => f.id === PHONE_ID);
    assert.ok(phoneProblems(phone, answers.policies).length > 0, 'a title about a home policy for a household holding only a phone plan');
    const now = flagsOf(evaluate(answers)).find((f) => f.id === PHONE_ID);
    assert.deepEqual(phoneProblems(now, answers.policies), []);
  });
});

suite('flag audit: the rules hold over every wording', (t) => {
  t('every rule has a finder and a rule text, and there are no exceptions to any of them', () => {
    assert.deepEqual(Object.keys(RULE_TEXT).sort(), Object.keys(FINDERS).sort(), 'a finder without a rule text, or a rule text without a finder');
  });

  for (const rule of Object.keys(FINDERS)) {
    for (const [label, catalog, table] of TABLES) {
      t(`${label}: ${RULE_TEXT[rule]} (no exceptions)`, () => {
        assert.deepEqual(FINDERS[rule](catalog, table).slice(0, 10).map((f) => f.message), []);
      });
    }
  }
});
