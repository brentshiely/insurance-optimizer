// Story S5: tests for the question catalog (public/js/overlap/data/questions/*.mjs), the wizard sections, and
// the question-to-flag plan (tests/fixtures/flagPlan.mjs, docs/QUESTION-FLAG-PLAN.md).
// Pure data checks over the real catalog; runs under jsc and Node. jsc has no URL/console: nothing here uses them.
// The plan document is read with the jsc global read(), guarded so other runtimes skip only those tests.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { QUESTIONS, SECTIONS } from '../../public/js/overlap/data/questions/index.mjs';
import { CARD_CHOICES, cardOptionId } from '../../public/js/overlap/data/questions/cards.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { validateCatalog } from '../../public/js/overlap/engine/validate.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import { evaluate, createContext } from '../../public/js/overlap/engine/evaluate.mjs';
import { deriveAnswers } from '../../public/js/overlap/engine/adapter.mjs';
import { checkCondition, conditionRefs, evaluateCondition } from '../../public/js/overlap/engine/conditions.mjs';
import { POLICY_IDS, OTHER_ITEM_POLICY_IDS, DOMAINS, BUCKETS, KINDS, CARDS_QUESTION_ID } from '../../public/js/overlap/engine/constants.mjs';
import PLAN from '../fixtures/flagPlan.mjs';
import umbrellaResearch from '../../research/umbrella-liability-stack.mjs';
import autoResearch from '../../research/auto-coverages.mjs';
import homeResearch from '../../research/home-and-renters.mjs';
import healthResearch from '../../research/health-supplemental.mjs';
import otherResearch from '../../research/other-bucket.mjs';

const canRead = typeof read === 'function';
const session = createSession(CATALOG);
const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const OPTION_SNAKE = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const qids = QUESTIONS.map((q) => q.id);
const resolved = (id) => session.getQuestion(id);
const optionIds = (id) => resolved(id).options.map((o) => o.id);
const optionLabels = (id) => resolved(id).options.map((o) => o.label);
const sectionOf = (id) => resolved(id).section;
const visibleIds = (answers) => session.visibleQuestions(answers).map((q) => q.id);

// ---- building host-like snapshots, so the traversals run through the real adapter ----------------------
function snapshotFor(policies, otherItems) {
  const has = (p) => policies.includes(p);
  const snap = { a: {}, extras: [], q: {}, p: {}, o: {} };
  if (has('auto')) snap.a.veh = '2';
  if (has('home') && has('renters')) snap.a.home = 'Both';
  else if (has('home')) snap.a.home = 'Own';
  else if (has('renters')) snap.a.home = 'Rent';
  if (has('health')) snap.q.health = 'Yes';
  if (has('umbrella')) snap.p.umbrella = { hasUmbrella: 'Yes' };
  if (has('motorcycle')) snap.extras.push('Motorcycle');
  if (has('boat')) snap.extras.push('Boat');
  if (otherItems && otherItems.length > 0) snap.o.other_items = otherItems.slice();
  return snap;
}
const answersFor = (policies, otherItems, more) => ({ ...deriveAnswers(snapshotFor(policies, otherItems)), ...(more || {}) });
const idsFor = (policies, otherItems, more) => visibleIds(answersFor(policies, otherItems, more));

// ======================================================================================================
suite('questions: the catalog as a whole', (t) => {
  t('validateCatalog passes with the real catalog (questions, sections, sources and cards together)', () => {
    const r = validateCatalog(CATALOG);
    assert.deepEqual(r.errors, []);
    assert.equal(r.ok, true);
  });

  t('QUESTIONS is the catalog\'s questions array, in display order, with unique snake_case ids', () => {
    assert.equal(CATALOG.questions, QUESTIONS);
    assert.equal(new Set(qids).size, qids.length);
    for (const id of qids) assert.match(id, SNAKE, `question id ${id}`);
    assert.equal(qids.includes('policies'), false, 'policies is derived, never asked');
  });

  t('the catalog has the expected questions in the expected order', () => {
    assert.deepEqual(qids, [
      'other_items',
      'umbrella_limit', 'auto_liability', 'umbrella_min_auto', 'home_liability', 'umbrella_min_home',
      'motorcycle_liability', 'umbrella_min_motorcycle', 'boat_liability', 'umbrella_min_boat',
      'umbrella_exposure', 'umbrella_um_uim', 'side_business',
      'auto_financing', 'auto_value', 'auto_gap_coverage', 'auto_collision', 'auto_um_uim', 'auto_um_uim_limit', 'auto_rental_reimbursement',
      'renters_for', 'renters_child_housing',
      'auto_medpay', 'health_hsa', 'health_supplemental', 'health_short_term',
      'home_sewer_backup', 'home_flood_policy',
      'deductible_auto', 'deductible_home', 'deductible_health', 'emergency_cushion',
      'cards', 'card_usual_payment',
      'phone_bill_on_card', 'roadside_sources', 'towing_vehicle_policy', 'term_life',
    ]);
  });

  t('question count per section is pinned (update on purpose when a question is added or removed)', () => {
    const counts = {};
    for (const q of QUESTIONS) counts[q.section] = (counts[q.section] || 0) + 1;
    assert.deepEqual(counts, {
      extras: 1, umbrella_stack: 5, umbrella_vehicles: 4, umbrella_scope: 3, auto_gaps: 7, renters: 2,
      health: 4, home_exclusions: 2, deductible: 4, cards: 2, extras_detail: 4,
    });
    assert.equal(QUESTIONS.length, 38);
  });

  t('every question has only the allowed fields, a known domain and a non-empty prompt and help', () => {
    const allowed = ['id', 'domain', 'section', 'type', 'prompt', 'help', 'options', 'allowNotSure', 'showIf'];
    for (const q of QUESTIONS) {
      for (const k of Object.keys(q)) assert.includes(allowed, k, `${q.id} has unexpected field "${k}"`);
      assert.includes(DOMAINS, q.domain, `${q.id} domain`);
      assert.equal(typeof q.prompt === 'string' && q.prompt.trim().length > 10, true, `${q.id} prompt`);
      assert.equal(typeof q.help === 'string' && q.help.trim().length > 10, true, `${q.id} help`);
      assert.equal(typeof q.allowNotSure, 'boolean', `${q.id} states allowNotSure explicitly`);
      assert.equal(q.showIf === null || typeof q.showIf === 'object', true, `${q.id} states showIf explicitly`);
    }
  });

  t('copy: no state is named, no "home equity", no AI or "next screen" wording, no em dashes, no placeholders', () => {
    const states = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington state|west virginia|wisconsin|wyoming)\b/i;
    const banned = /home equity|next screen|generic pattern|todo|tbd|lorem|\{\{|\}\}|\u2014|\u2013/i;
    const texts = [];
    for (const q of QUESTIONS) {
      texts.push([q.id, q.prompt], [q.id, q.help]);
      for (const o of q.options) texts.push([`${q.id}.${o.id}`, o.label]);
    }
    for (const s of SECTIONS) texts.push([s.id, s.title], [s.id, s.reason]);
    for (const c of CARD_CHOICES) texts.push([c.id, c.name]);
    for (const [where, text] of texts) {
      assert.equal(states.test(text), false, `${where} names a state: ${text}`);
      assert.equal(banned.test(text), false, `${where} has banned wording: ${text}`);
    }
  });

  t('copy: the collision help does not narrow collision to crashes the user causes (it pays whoever is at fault)', () => {
    const help = session.getQuestion('auto_collision').help;
    assert.equal(/you cause|your fault|caused by you/i.test(help), false, `auto_collision.help narrows collision to your own crashes: ${help}`);
    assert.equal(/whoever is at fault/i.test(help), true, 'auto_collision.help says fault does not matter');
  });

  t('nothing the host app already derives is asked again (own/rent, vehicles, extras, health yes/no, umbrella yes/no)', () => {
    const derivedPolicies = ['auto', 'home', 'renters', 'health', 'umbrella', 'motorcycle', 'boat'];
    for (const q of QUESTIONS) {
      assert.equal(derivedPolicies.includes(q.id), false, `${q.id} duplicates a derived policy`);
      assert.equal(/own or rent|do you (own|rent) your|how many (cars|vehicles)|anything else with a motor|do you (carry|have) (an )?umbrella|do you have health insurance/i.test(q.prompt), false, `${q.id} asks something the host derives: ${q.prompt}`);
    }
    // The six Other-bucket policy ids are asked once, in other_items, and nowhere else.
    const asked = QUESTIONS.filter((q) => q.options.some((o) => OTHER_ITEM_POLICY_IDS.includes(o.id)));
    assert.deepEqual(asked.map((q) => q.id), ['other_items']);
  });
});

// ======================================================================================================
suite('questions: sections', (t) => {
  const sectionIds = SECTIONS.map((s) => s.id);

  t('SECTIONS is the ordered list [{ id, title, reason, showIf }] with unique snake_case ids', () => {
    assert.deepEqual(sectionIds, [
      'extras', 'umbrella_stack', 'umbrella_vehicles', 'umbrella_scope', 'auto_gaps', 'renters', 'health',
      'home_exclusions', 'deductible', 'cards', 'extras_detail',
    ]);
    assert.equal(new Set(sectionIds).size, sectionIds.length);
    for (const s of SECTIONS) {
      assert.deepEqual(Object.keys(s).sort(), ['id', 'reason', 'showIf', 'title']);
      assert.match(s.id, SNAKE);
      assert.equal(typeof s.title === 'string' && s.title.trim().length > 0, true, `${s.id} title`);
    }
  });

  t('every section carries a reason tied to something the user already told us', () => {
    for (const s of SECTIONS) {
      assert.equal(typeof s.reason === 'string' && s.reason.length > 40, true, `${s.id} reason`);
      assert.match(s.reason, /\bYou (have )?told us\b/, `${s.id} reason must refer to what the user told us`);
    }
  });

  t('every question belongs to a defined section, and each section\'s questions are contiguous in display order', () => {
    for (const q of QUESTIONS) assert.includes(sectionIds, q.section, `${q.id} section`);
    const order = [];
    for (const q of QUESTIONS) if (order[order.length - 1] !== q.section) order.push(q.section);
    assert.deepEqual(order, sectionIds, 'sections appear once each, in SECTIONS order');
    for (const s of SECTIONS) assert.equal(QUESTIONS.some((q) => q.section === s.id), true, `${s.id} has questions`);
  });

  t('section gates are well-formed conditions over known policy ids; only the renters section also reads the Q1 answer (S5-15)', () => {
    for (const s of SECTIONS) {
      if (s.showIf === null) continue;
      assert.deepEqual(checkCondition(s.showIf), [], `${s.id} showIf`);
      const refs = conditionRefs(s.showIf);
      for (const p of refs.holds) assert.includes(POLICY_IDS, p, `${s.id} references unknown policy ${p}`);
      if (s.id === 'renters') {
        // The host derives renters from "rent" or "both" alone, so a homeowner's renters policy for a child can only
        // come from the always-shown other_items question (the Q1 equivalent). No other section may read an answer.
        assert.deepEqual(refs.answers, [{ qid: 'other_items', form: 'includes', optionIds: ['renters_with_home'] }], 'renters section reads exactly the renters_with_home tick');
      } else {
        assert.deepEqual(refs.answers, [], `${s.id}: a section gate reads policies only, never answers`);
      }
    }
  });

  t('a section has a visible question exactly when its gate is true (1,280 policy and extras combinations)', () => {
    const base = ['auto', 'home', 'renters', 'health', 'umbrella', 'motorcycle', 'boat'];
    const extrasSets = [
      [], ['rental_car'], ['towing'], ['travel'], ['phone'], ['warranty'], ['accidental_death'], OTHER_ITEM_POLICY_IDS,
      ['renters_with_home'], [...OTHER_ITEM_POLICY_IDS, 'renters_with_home'],
    ];
    let checked = 0;
    for (let mask = 0; mask < (1 << base.length); mask++) {
      const policies = base.filter((_, i) => (mask >> i) & 1);
      for (const extras of extrasSets) {
        const answers = answersFor(policies, extras);
        const visible = new Set(visibleIds(answers));
        for (const s of SECTIONS) {
          const hasVisible = QUESTIONS.some((q) => q.section === s.id && visible.has(q.id));
          const gate = s.showIf === null ? true : evaluateCondition(s.showIf, { answers });
          assert.equal(hasVisible, gate, `section ${s.id} with ${policies.join('+') || 'no policies'} and extras [${extras.join(',')}]`);
        }
        checked++;
      }
    }
    assert.equal(checked, 1280);
  });
});

// ======================================================================================================
suite('questions: presets match the SPEC where it specifies them', (t) => {
  t('other_items: the six Other-bucket ids the adapter folds into policies, a renters tick for homeowners, and an exclusive "none"', () => {
    const q = resolved('other_items');
    assert.equal(q.type, 'multi');
    assert.deepEqual(optionIds('other_items'), [...OTHER_ITEM_POLICY_IDS, 'renters_with_home', 'none']);
    assert.equal(q.options.find((o) => o.id === 'none').exclusive, true);
    assert.equal(q.showIf, null, 'always shown');
  });

  t('renters_with_home is an answer, never a policy: the adapter does not fold it, so holds("renters") stays host-derived (S5-15)', () => {
    assert.equal(OTHER_ITEM_POLICY_IDS.includes('renters_with_home'), false);
    assert.equal(POLICY_IDS.includes('renters_with_home'), false);
    const out = deriveAnswers({ a: { home: 'Own' }, o: { other_items: ['renters_with_home'] } });
    assert.deepEqual(out.policies, ['home'], 'a homeowner who ticks the renters policy still does not hold "renters"');
    assert.deepEqual(out.other_items, ['renters_with_home'], 'the tick is passed through as the answer to other_items');
    assert.match(optionLabels('other_items').find((l) => /renters/i.test(l)), /home you own/, 'the label says it is for someone who owns their home');
  });

  t('auto liability: lower than 100/300, then 100/300, 250/500, 500/500, then not sure (split-limit values)', () => {
    assert.deepEqual(optionLabels('auto_liability'), ['Lower than 100/300', '100/300', '250/500', '500/500', 'Not sure']);
    assert.deepEqual(optionIds('auto_liability'), ['lower', '100_300', '250_500', '500_500', 'not_sure']);
    assert.deepEqual(resolved('auto_liability').options.slice(0, 4).map((o) => o.value), [
      { perPerson: 99999, perAccident: 299999 },
      { perPerson: 100000, perAccident: 300000 },
      { perPerson: 250000, perAccident: 500000 },
      { perPerson: 500000, perAccident: 500000 },
    ]);
  });

  t('umbrella limit: 1 million, 2 million, 5 million, not sure', () => {
    assert.deepEqual(optionLabels('umbrella_limit'), ['$1 million', '$2 million', '$5 million', 'Not sure']);
    assert.deepEqual(resolved('umbrella_limit').options.slice(0, 3).map((o) => o.value), [1000000, 2000000, 5000000]);
  });

  t('home liability: lower than 300,000, then 300,000, 500,000, 1 million, then not sure', () => {
    assert.deepEqual(optionLabels('home_liability'), ['Lower than $300,000', '$300,000', '$500,000', '$1 million', 'Not sure']);
    assert.deepEqual(optionIds('home_liability'), ['lower', '300k', '500k', '1m', 'not_sure']);
    assert.deepEqual(resolved('home_liability').options.slice(0, 4).map((o) => o.value), [299999, 300000, 500000, 1000000]);
  });

  t('umbrella\'s required home minimum: 300,000, 500,000, not sure (no other choices)', () => {
    assert.deepEqual(optionLabels('umbrella_min_home'), ['$300,000', '$500,000', 'Not sure']);
    assert.deepEqual(resolved('umbrella_min_home').options.slice(0, 2).map((o) => o.value), [300000, 500000]);
  });

  t('the user\'s own limit on motorcycle, boat and the auto UM/UIM coverage use the same ladder as auto liability, "lower than" rung included', () => {
    for (const id of ['motorcycle_liability', 'boat_liability', 'auto_um_uim_limit']) {
      assert.deepEqual(resolved(id).options, resolved('auto_liability').options, `${id} uses the same limit ladder as auto`);
    }
  });

  t('what the umbrella requires on auto, motorcycle and boat is the plain SPEC ladder: 100/300, 250/500, 500/500, no "lower than" rung', () => {
    for (const id of ['umbrella_min_auto', 'umbrella_min_motorcycle', 'umbrella_min_boat']) {
      assert.deepEqual(optionIds(id), ['100_300', '250_500', '500_500', 'not_sure'], id);
      assert.deepEqual(resolved(id).options.slice(0, 3), resolved('auto_liability').options.slice(1, 4), `${id} matches the top three limit rungs`);
    }
  });

  t('a limit question can say "lower than the lowest tier", because finding a too-low limit is the point (S5-13)', () => {
    const lowerRungs = {
      auto_liability: 'umbrella_min_auto', motorcycle_liability: 'umbrella_min_motorcycle', boat_liability: 'umbrella_min_boat',
      auto_um_uim_limit: null, home_liability: 'umbrella_min_home',
    };
    for (const [limitId, minId] of Object.entries(lowerRungs)) {
      const options = resolved(limitId).options;
      assert.equal(options[0].id, 'lower', `${limitId} starts with the lower rung`);
      assert.match(options[0].label, /^Lower than /, `${limitId} label`);
      assert.equal(options.filter((o) => o.id === 'lower').length, 1, `${limitId} has one lower rung`);
      assert.match(resolved(limitId).help, /lower than .* pick the first choice/, `${limitId} help tells the user which choice to pick`);
      if (minId === null) continue;
      // The lower rung is certainly below every minimum the umbrella question offers, so a Raise can fire on it.
      const lower = options[0].value;
      for (const req of resolved(minId).options.filter((o) => o.id !== 'not_sure')) {
        if (typeof lower === 'number') assert.equal(lower < req.value, true, `${limitId} lower rung is below ${minId} ${req.id}`);
        else {
          assert.equal(lower.perPerson < req.value.perPerson, true, `${limitId} lower rung per person is below ${minId} ${req.id}`);
          assert.equal(lower.perAccident < req.value.perAccident, true, `${limitId} lower rung per accident is below ${minId} ${req.id}`);
        }
      }
    }
  });

  t('no umbrella-minimum question has a "lower than" rung (the umbrella names what it requires, or the user taps Not sure)', () => {
    for (const id of ['umbrella_min_auto', 'umbrella_min_home', 'umbrella_min_motorcycle', 'umbrella_min_boat']) {
      assert.equal(optionIds(id).includes('lower'), false, id);
    }
  });

  t('umbrella exposure: under 1 million, 1 to 3 million, over 3 million, not sure (coarse bands only)', () => {
    assert.deepEqual(optionLabels('umbrella_exposure'), ['Under $1 million', '$1 million to $3 million', 'Over $3 million', 'Not sure']);
    assert.equal(resolved('umbrella_exposure').type, 'single');
  });

  t('umbrella UM/UIM and side business: yes / no (UM/UIM also has not sure; side business is a plain gate)', () => {
    assert.deepEqual(optionLabels('umbrella_um_uim'), ['Yes', 'No', 'Not sure']);
    assert.deepEqual(optionLabels('side_business'), ['Yes', 'No']);
  });

  t('auto gate questions: lease or finance, and a rough value band', () => {
    assert.deepEqual(optionIds('auto_financing'), ['lease', 'loan', 'paid_off']);
    assert.deepEqual(optionLabels('auto_value'), ['Under $3,000', '$3,000 to $9,999', '$10,000 to $24,999', '$25,000 or more', 'Not sure']);
  });

  t('auto gap questions: UM/UIM yes/no/not sure then a limit; gap, rental and collision are yes/no/not sure', () => {
    for (const id of ['auto_um_uim', 'auto_gap_coverage', 'auto_rental_reimbursement', 'auto_collision']) {
      assert.deepEqual(optionIds(id), ['yes', 'no', 'not_sure'], id);
    }
    assert.deepEqual(optionLabels('auto_um_uim_limit'), ['Lower than 100/300', '100/300', '250/500', '500/500', 'Not sure']);
  });

  t('renters: for you or for a child away from home', () => {
    assert.deepEqual(optionIds('renters_for'), ['me', 'child_away']);
    assert.deepEqual(optionIds('renters_child_housing'), ['dorm', 'off_campus', 'not_sure']);
  });

  t('health: HDHP with an HSA, the four bolt-ons plus none (multi), and a short-term plan', () => {
    assert.deepEqual(optionIds('health_hsa'), ['hdhp_hsa', 'hdhp_only', 'neither', 'not_sure']);
    const supp = resolved('health_supplemental');
    assert.equal(supp.type, 'multi');
    assert.deepEqual(supp.options.map((o) => o.id), ['accident', 'critical_illness', 'hospital_indemnity', 'cancer', 'none', 'not_sure']);
    assert.equal(supp.options.find((o) => o.id === 'none').exclusive, true);
    assert.equal(supp.options.find((o) => o.id === 'not_sure').exclusive, true);
    assert.deepEqual(optionIds('health_short_term'), ['yes', 'no', 'not_sure']);
    assert.deepEqual(optionIds('auto_medpay'), ['yes', 'no', 'not_sure']);
  });

  t('home exclusions (DECISIONS D8): sewer backup on the policy and a separate flood policy, yes / no / not sure', () => {
    assert.deepEqual(optionIds('home_sewer_backup'), ['yes', 'no', 'not_sure']);
    assert.deepEqual(optionIds('home_flood_policy'), ['yes', 'no', 'not_sure']);
  });

  t('emergency cushion: under 1,000, 1,000 to 4,999, 5,000 or more, not sure (the $5,000 edge is explicit)', () => {
    assert.deepEqual(optionLabels('emergency_cushion'), ['Under $1,000', '$1,000 to $4,999', '$5,000 or more', 'Not sure']);
  });

  t('deductibles for auto, home and health use the same bands as the cushion', () => {
    for (const id of ['deductible_auto', 'deductible_home', 'deductible_health']) {
      assert.deepEqual(resolved(id).options, resolved('emergency_cushion').options, id);
    }
  });

  t('Other-bucket detail questions', () => {
    assert.deepEqual(optionIds('phone_bill_on_card'), ['yes', 'no', 'not_sure']);
    assert.deepEqual(optionIds('roadside_sources'), ['auto_policy', 'club', 'card', 'car_maker', 'other', 'not_sure']);
    assert.deepEqual(optionIds('towing_vehicle_policy'), ['yes', 'no', 'not_sure']);
    assert.deepEqual(optionIds('term_life'), ['own', 'work_only', 'none', 'not_sure']);
    assert.deepEqual(optionIds('card_usual_payment'), ['yes', 'no', 'not_sure']);
  });
});

// ======================================================================================================
suite('questions: closed lists, no free text, no typed figures, Not sure rules', (t) => {
  t('only single and multi questions with closed option lists; no input-like fields anywhere', () => {
    for (const q of QUESTIONS) {
      assert.includes(['single', 'multi'], q.type, q.id);
      assert.equal(Array.isArray(q.options) && q.options.length >= 2, true, `${q.id} needs at least two choices`);
      for (const o of q.options) {
        assert.deepEqual(Object.keys(o).filter((k) => !['id', 'label', 'value', 'exclusive'].includes(k)), [], `${q.id}.${o.id} fields`);
        assert.match(o.id, OPTION_SNAKE, `${q.id}.${o.id}`);
        assert.equal(typeof o.label === 'string' && o.label.length > 0, true, `${q.id}.${o.id} label`);
      }
      assert.equal(JSON.stringify(q).includes('placeholder'), false, `${q.id} must not define a text input`);
    }
  });

  t('no prompt asks for a typed figure: wording asks for a range, a preset or a yes/no', () => {
    for (const q of QUESTIONS) {
      assert.equal(/\b(type|enter|write|exact (number|amount|figure))\b/i.test(q.prompt), false, `${q.id}: ${q.prompt}`);
    }
    // The exposure question is the sensitive one: it must say a range is enough.
    assert.match(resolved('umbrella_exposure').help, /never ask for an exact number/);
  });

  t('Not sure is offered everywhere except these questions, each of which has a reason', () => {
    const without = QUESTIONS.filter((q) => !q.allowNotSure).map((q) => q.id);
    // other_items: unticked means no, and "None of these" is explicit. side_business, auto_financing,
    // renters_for: you know the answer. cards: the cards in your wallet; "another card or none" covers the rest.
    assert.deepEqual(without, ['other_items', 'side_business', 'auto_financing', 'renters_for', 'cards']);
    for (const q of QUESTIONS) {
      const ids = optionIds(q.id);
      assert.equal(ids.includes('not_sure'), q.allowNotSure, `${q.id} not_sure matches allowNotSure`);
      assert.equal(ids.filter((i) => i === 'not_sure').length <= 1, true);
    }
  });

  t('authors never list not_sure themselves (the engine appends it last)', () => {
    for (const q of QUESTIONS) {
      assert.equal(q.options.some((o) => o.id === 'not_sure'), false, q.id);
    }
    for (const q of session.questions) {
      if (q.allowNotSure) assert.equal(q.options[q.options.length - 1].id, 'not_sure', q.id);
    }
  });

  t('multi questions have exactly the exclusive options expected (none / other_none / not_sure)', () => {
    const exclusive = {};
    for (const q of session.questions) {
      if (q.type !== 'multi') continue;
      exclusive[q.id] = q.options.filter((o) => o.exclusive).map((o) => o.id);
    }
    assert.deepEqual(exclusive, {
      other_items: ['none'],
      health_supplemental: ['none', 'not_sure'],
      cards: ['other_none'],
      roadside_sources: ['not_sure'],
    });
  });
});

// ======================================================================================================
suite('questions: comparable option values (numbers, split limits and { min, max } bands)', (t) => {
  const shapeOf = (v) => {
    if (typeof v === 'number') return 'number';
    if (v && typeof v === 'object' && 'perPerson' in v) return 'split';
    if (v && typeof v === 'object' && 'min' in v) return 'band';
    return 'other';
  };

  t('inside one question every valued option has the same value shape, and no option mixes in an unvalued one', () => {
    for (const q of QUESTIONS) {
      const valued = q.options.filter((o) => o.value !== undefined);
      if (valued.length === 0) continue;
      assert.equal(valued.length, q.options.length, `${q.id}: if one option has a value, all do`);
      const shapes = new Set(valued.map((o) => shapeOf(o.value)));
      assert.equal(shapes.size, 1, `${q.id} mixes value shapes`);
      assert.equal(shapes.has('other'), false, `${q.id} has a value that is not a number, split limit or band`);
    }
  });

  t('the valued questions are exactly the limit, exposure, value and money-band questions', () => {
    const valued = QUESTIONS.filter((q) => q.options.some((o) => o.value !== undefined)).map((q) => `${q.id}:${shapeOf(q.options[0].value)}`);
    assert.deepEqual(valued, [
      'umbrella_limit:number', 'auto_liability:split', 'umbrella_min_auto:split', 'home_liability:number', 'umbrella_min_home:number',
      'motorcycle_liability:split', 'umbrella_min_motorcycle:split', 'boat_liability:split', 'umbrella_min_boat:split',
      'umbrella_exposure:band', 'auto_value:band', 'auto_um_uim_limit:split',
      'deductible_auto:band', 'deductible_home:band', 'deductible_health:band', 'emergency_cushion:band',
    ]);
  });

  t('bands are whole-dollar, both ends inclusive, start at 0, are contiguous and non-overlapping, and end open', () => {
    const bandQuestions = QUESTIONS.filter((q) => q.options.every((o) => shapeOf(o.value) === 'band'));
    assert.deepEqual(bandQuestions.map((q) => q.id), ['umbrella_exposure', 'auto_value', 'deductible_auto', 'deductible_home', 'deductible_health', 'emergency_cushion']);
    for (const q of bandQuestions) {
      const bands = q.options.map((o) => o.value);
      assert.equal(bands[0].min, 0, `${q.id} starts at 0`);
      assert.equal(bands[bands.length - 1].max, null, `${q.id} ends open (max null)`);
      bands.forEach((b, i) => {
        assert.equal(Number.isInteger(b.min) && b.min >= 0, true, `${q.id} band ${i} min`);
        if (i < bands.length - 1) {
          assert.equal(Number.isInteger(b.max) && b.max >= b.min, true, `${q.id} band ${i} max`);
          assert.equal(bands[i + 1].min, b.max + 1, `${q.id}: band ${i + 1} must start right after band ${i} (no gap, no overlap)`);
        }
        assert.deepEqual(Object.keys(b).sort(), ['max', 'min']);
      });
    }
  });

  t('the cushion\'s edges are the SPEC\'s 1,000 and 5,000, with the 5,000 edge made explicit', () => {
    assert.deepEqual(resolved('emergency_cushion').options.slice(0, 3).map((o) => o.value), [
      { min: 0, max: 999 }, { min: 1000, max: 4999 }, { min: 5000, max: null },
    ]);
  });

  t('exposure bands: under 1 million, 1 to 3 million inclusive, over 3 million', () => {
    assert.deepEqual(resolved('umbrella_exposure').options.slice(0, 3).map((o) => o.value), [
      { min: 0, max: 999999 }, { min: 1000000, max: 3000000 }, { min: 3000001, max: null },
    ]);
  });

  t('split-limit ladders rise strictly and a per-accident limit is never below its per-person limit', () => {
    for (const id of ['auto_liability', 'umbrella_min_auto', 'motorcycle_liability', 'umbrella_min_motorcycle', 'boat_liability', 'umbrella_min_boat', 'auto_um_uim_limit']) {
      const values = resolved(id).options.filter((o) => o.id !== 'not_sure').map((o) => o.value);
      values.forEach((v, i) => {
        assert.equal(v.perAccident >= v.perPerson, true, `${id} rung ${i}`);
        if (i > 0) assert.equal(v.perPerson > values[i - 1].perPerson, true, `${id} rung ${i} rises`);
      });
    }
  });

  t('single-amount ladders rise strictly', () => {
    for (const id of ['umbrella_limit', 'home_liability', 'umbrella_min_home']) {
      const values = resolved(id).options.filter((o) => o.id !== 'not_sure').map((o) => o.value);
      values.forEach((v, i) => { if (i > 0) assert.equal(v > values[i - 1], true, `${id} rises`); });
    }
  });

  t('"Not sure" never carries a value, so a flag must check isNotSure before reading .value', () => {
    for (const q of session.questions) {
      const ns = q.options.find((o) => o.id === 'not_sure');
      if (ns) assert.equal('value' in ns, false, q.id);
    }
  });

  t('the engine hands a flag the chosen option\'s value (a band here) through ctx.option', () => {
    const ctx = createContext({ policies: ['auto', 'home'], emergency_cushion: '1000_4999', deductible_home: '5000_plus' });
    assert.deepEqual(ctx.option('emergency_cushion').value, { min: 1000, max: 4999 });
    assert.deepEqual(ctx.option('deductible_home').value, { min: 5000, max: null });
    assert.equal(ctx.option('deductible_home').value.min > ctx.option('emergency_cushion').value.max, true, 'the deductible-vs-cushion comparison is expressible');
    const unsure = createContext({ policies: ['auto'], emergency_cushion: 'not_sure' });
    assert.equal(unsure.isNotSure('emergency_cushion'), true);
    assert.equal(unsure.option('emergency_cushion').value, undefined);
  });
});

// ======================================================================================================
suite('questions: every non-derived question is gated per the SPEC', (t) => {
  const H = (p) => ({ holds: p });
  const UMB_AUTO = { all: [H('umbrella'), H('auto')] };
  const UMB_HOME = { all: [H('umbrella'), H('home')] };
  const UMB_MOTO = { all: [H('umbrella'), H('motorcycle')] };
  const UMB_BOAT = { all: [H('umbrella'), H('boat')] };
  const GATES = {
    other_items: null,
    umbrella_limit: H('umbrella'),
    auto_liability: UMB_AUTO,
    umbrella_min_auto: UMB_AUTO,
    home_liability: UMB_HOME,
    umbrella_min_home: UMB_HOME,
    motorcycle_liability: UMB_MOTO,
    umbrella_min_motorcycle: UMB_MOTO,
    boat_liability: UMB_BOAT,
    umbrella_min_boat: UMB_BOAT,
    umbrella_exposure: H('umbrella'),
    umbrella_um_uim: UMB_AUTO,
    side_business: H('umbrella'),
    auto_financing: H('auto'),
    auto_value: H('auto'),
    auto_gap_coverage: { all: [H('auto'), { answer: 'auto_financing', in: ['loan', 'lease'] }] },
    auto_collision: { all: [H('auto'), { answer: 'auto_financing', is: 'paid_off' }, { answer: 'auto_value', is: 'under_3000' }] },
    auto_um_uim: H('auto'),
    auto_um_uim_limit: { all: [H('auto'), { answer: 'auto_um_uim', is: 'yes' }] },
    auto_rental_reimbursement: H('auto'),
    renters_for: { any: [H('renters'), { answer: 'other_items', includes: 'renters_with_home' }] },
    renters_child_housing: { all: [H('home'), { answer: 'renters_for', is: 'child_away' }] },
    auto_medpay: { all: [H('health'), H('auto')] },
    health_hsa: H('health'),
    health_supplemental: H('health'),
    health_short_term: H('health'),
    home_sewer_backup: H('home'),
    home_flood_policy: H('home'),
    deductible_auto: H('auto'),
    deductible_home: H('home'),
    deductible_health: H('health'),
    emergency_cushion: { any: [H('auto'), H('home'), H('health')] },
    cards: { any: [H('rental_car'), H('towing'), H('travel'), H('phone'), H('warranty')] },
    card_usual_payment: { all: [{ answered: 'cards' }, { not: { answer: 'cards', includes: 'other_none' } }] },
    phone_bill_on_card: H('phone'),
    roadside_sources: H('towing'),
    towing_vehicle_policy: { all: [H('towing'), { any: [H('motorcycle'), H('boat')] }] },
    term_life: H('accidental_death'),
  };

  t('the expected gate table covers exactly the catalog\'s questions', () => {
    assert.deepEqual(Object.keys(GATES), qids);
  });

  for (const id of Object.keys(GATES)) {
    t(`${id} is gated exactly as the SPEC and the plan say`, () => {
      assert.deepEqual(QUESTIONS.find((q) => q.id === id).showIf, GATES[id]);
    });
  }

  t('only other_items is always shown', () => {
    assert.deepEqual(QUESTIONS.filter((q) => q.showIf === null).map((q) => q.id), ['other_items']);
  });

  t('every gate is well-formed, reads known policies, and references real options of real questions', () => {
    for (const q of QUESTIONS) {
      if (q.showIf === null) continue;
      assert.deepEqual(checkCondition(q.showIf), [], q.id);
      const refs = conditionRefs(q.showIf);
      for (const p of refs.holds) assert.includes(POLICY_IDS, p, `${q.id} gate reads unknown policy ${p}`);
      for (const r of refs.answers) {
        assert.equal(qids.indexOf(r.qid) < qids.indexOf(q.id), true, `${q.id} gate reads ${r.qid}, which must come earlier in display order`);
        for (const oid of r.optionIds) assert.includes(optionIds(r.qid), oid, `${q.id} gate uses unknown option ${r.qid}.${oid}`);
      }
    }
  });
});

// ======================================================================================================
suite('questions: the exact visible questions for policy combinations (traversal)', (t) => {
  t('1. auto only', () => {
    assert.deepEqual(idsFor(['auto']), [
      'other_items', 'auto_financing', 'auto_value', 'auto_um_uim', 'auto_rental_reimbursement', 'deductible_auto', 'emergency_cushion',
    ]);
  });

  t('2. auto + home', () => {
    assert.deepEqual(idsFor(['auto', 'home']), [
      'other_items', 'auto_financing', 'auto_value', 'auto_um_uim', 'auto_rental_reimbursement',
      'home_sewer_backup', 'home_flood_policy', 'deductible_auto', 'deductible_home', 'emergency_cushion',
    ]);
  });

  t('3. auto + home + umbrella', () => {
    assert.deepEqual(idsFor(['auto', 'home', 'umbrella']), [
      'other_items',
      'umbrella_limit', 'auto_liability', 'umbrella_min_auto', 'home_liability', 'umbrella_min_home',
      'umbrella_exposure', 'umbrella_um_uim', 'side_business',
      'auto_financing', 'auto_value', 'auto_um_uim', 'auto_rental_reimbursement',
      'home_sewer_backup', 'home_flood_policy', 'deductible_auto', 'deductible_home', 'emergency_cushion',
    ]);
  });

  t('4. renters only: no deductible, no home questions, no child-housing question', () => {
    assert.deepEqual(idsFor(['renters']), ['other_items', 'renters_for']);
  });

  t('5. health only: no MedPay question without an auto policy', () => {
    assert.deepEqual(idsFor(['health']), [
      'other_items', 'health_hsa', 'health_supplemental', 'health_short_term', 'deductible_health', 'emergency_cushion',
    ]);
  });

  t('6. motorcycle + boat + umbrella: vehicle limits and minimums appear, auto and home questions do not', () => {
    assert.deepEqual(idsFor(['motorcycle', 'boat', 'umbrella']), [
      'other_items', 'umbrella_limit',
      'motorcycle_liability', 'umbrella_min_motorcycle', 'boat_liability', 'umbrella_min_boat',
      'umbrella_exposure', 'side_business',
    ]);
  });

  t('7. everything (every derived policy and every Other-bucket item)', () => {
    assert.deepEqual(idsFor(['auto', 'home', 'renters', 'health', 'umbrella', 'motorcycle', 'boat'], OTHER_ITEM_POLICY_IDS), [
      'other_items',
      'umbrella_limit', 'auto_liability', 'umbrella_min_auto', 'home_liability', 'umbrella_min_home',
      'motorcycle_liability', 'umbrella_min_motorcycle', 'boat_liability', 'umbrella_min_boat',
      'umbrella_exposure', 'umbrella_um_uim', 'side_business',
      'auto_financing', 'auto_value', 'auto_um_uim', 'auto_rental_reimbursement',
      'renters_for', 'auto_medpay', 'health_hsa', 'health_supplemental', 'health_short_term',
      'home_sewer_backup', 'home_flood_policy',
      'deductible_auto', 'deductible_home', 'deductible_health', 'emergency_cushion',
      'cards', 'phone_bill_on_card', 'roadside_sources', 'towing_vehicle_policy', 'term_life',
    ]);
  });

  t('8. nothing but Other-bucket items (no main policies)', () => {
    assert.deepEqual(idsFor([], OTHER_ITEM_POLICY_IDS), [
      'other_items', 'cards', 'phone_bill_on_card', 'roadside_sources', 'term_life',
    ]);
  });

  t('9. no policies and no items: only the always-shown question', () => {
    assert.deepEqual(idsFor([]), ['other_items']);
    assert.deepEqual(idsFor([], ['none']), ['other_items']);
  });

  t('10. auto + health: the MedPay overlap question appears', () => {
    assert.deepEqual(idsFor(['auto', 'health']), [
      'other_items', 'auto_financing', 'auto_value', 'auto_um_uim', 'auto_rental_reimbursement',
      'auto_medpay', 'health_hsa', 'health_supplemental', 'health_short_term', 'deductible_auto', 'deductible_health', 'emergency_cushion',
    ]);
  });

  t('11. each Other-bucket item opens only its own follow-ups (cards only for card-linked items)', () => {
    assert.deepEqual(idsFor([], ['accidental_death']), ['other_items', 'term_life']);
    assert.deepEqual(idsFor([], ['travel']), ['other_items', 'cards']);
    assert.deepEqual(idsFor([], ['warranty']), ['other_items', 'cards']);
    assert.deepEqual(idsFor([], ['rental_car']), ['other_items', 'cards']);
    assert.deepEqual(idsFor([], ['phone']), ['other_items', 'cards', 'phone_bill_on_card']);
    assert.deepEqual(idsFor([], ['towing']), ['other_items', 'cards', 'roadside_sources']);
    assert.deepEqual(idsFor(['motorcycle'], ['towing']), ['other_items', 'cards', 'roadside_sources', 'towing_vehicle_policy']);
    assert.deepEqual(idsFor(['boat'], ['towing']), ['other_items', 'cards', 'roadside_sources', 'towing_vehicle_policy']);
    assert.deepEqual(idsFor(['motorcycle', 'boat'], ['rental_car']), ['other_items', 'cards']);
  });

  t('12. an umbrella with only a boat shows the boat questions only', () => {
    assert.deepEqual(idsFor(['umbrella', 'boat']), ['other_items', 'umbrella_limit', 'boat_liability', 'umbrella_min_boat', 'umbrella_exposure', 'side_business']);
  });

  t('13. no umbrella means no umbrella questions, even with every underlying policy', () => {
    const ids = idsFor(['auto', 'home', 'motorcycle', 'boat']);
    for (const id of ['umbrella_limit', 'auto_liability', 'umbrella_min_auto', 'home_liability', 'umbrella_min_home', 'motorcycle_liability', 'boat_liability', 'umbrella_exposure', 'umbrella_um_uim', 'side_business']) {
      assert.equal(ids.includes(id), false, id);
    }
  });

  t('14. the host\'s own "Both" (own and rent) shows home and renters questions together', () => {
    assert.deepEqual(idsFor(['home', 'renters']), [
      'other_items', 'renters_for', 'home_sewer_backup', 'home_flood_policy', 'deductible_home', 'emergency_cushion',
    ]);
  });

  t('15. a homeowner with no renters of their own gets no renters question until they tick the renters policy (S5-15)', () => {
    assert.deepEqual(idsFor(['home']), [
      'other_items', 'home_sewer_backup', 'home_flood_policy', 'deductible_home', 'emergency_cushion',
    ]);
    assert.deepEqual(idsFor(['home'], ['renters_with_home']), [
      'other_items', 'renters_for', 'home_sewer_backup', 'home_flood_policy', 'deductible_home', 'emergency_cushion',
    ]);
  });

  t('16. the headline case: a parent who owns their home and pays for a child\'s renters policy reaches the dorm / off-campus question', () => {
    const parent = (more) => idsFor(['home'], ['renters_with_home'], more);
    assert.deepEqual(parent({ renters_for: 'child_away' }), [
      'other_items', 'renters_for', 'renters_child_housing', 'home_sewer_backup', 'home_flood_policy', 'deductible_home', 'emergency_cushion',
    ]);
    // "For me" is a real answer for a homeowner with a renters policy of their own: no parent overlap to ask about.
    assert.equal(parent({ renters_for: 'me' }).includes('renters_child_housing'), false);
    assert.equal(parent({}).includes('renters_child_housing'), false, 'not asked until renters_for is answered');
  });

  t('17. a renter with no home policy never reaches the child-housing question, ticked or not (nothing to overlap with)', () => {
    assert.deepEqual(idsFor(['renters'], [], { renters_for: 'child_away' }), ['other_items', 'renters_for']);
    assert.deepEqual(idsFor(['renters'], ['renters_with_home'], { renters_for: 'child_away' }), ['other_items', 'renters_for']);
  });
});

// ======================================================================================================
suite('questions: answer-driven branches (the second level of the tree)', (t) => {
  const withAuto = (more) => idsFor(['auto'], [], more);

  t('leased or financed newest car: gap coverage is asked, collision is not', () => {
    for (const financing of ['loan', 'lease']) {
      const ids = withAuto({ auto_financing: financing, auto_value: '10000_24999' });
      assert.equal(ids.includes('auto_gap_coverage'), true, financing);
      assert.equal(ids.includes('auto_collision'), false, financing);
    }
  });

  t('owned outright and worth under $3,000: collision and comprehensive is asked, gap is not', () => {
    const ids = withAuto({ auto_financing: 'paid_off', auto_value: 'under_3000' });
    assert.equal(ids.includes('auto_collision'), true);
    assert.equal(ids.includes('auto_gap_coverage'), false);
  });

  t('owned outright but worth more, or value not sure: collision is not asked', () => {
    for (const value of ['3000_9999', '10000_24999', '25000_plus', 'not_sure']) {
      assert.equal(withAuto({ auto_financing: 'paid_off', auto_value: value }).includes('auto_collision'), false, value);
    }
  });

  t('a financed cheap car: lender rules mean collision is not asked even though the value is low', () => {
    assert.equal(withAuto({ auto_financing: 'loan', auto_value: 'under_3000' }).includes('auto_collision'), false);
  });

  t('the UM/UIM limit is asked only after "yes"', () => {
    assert.equal(withAuto({ auto_um_uim: 'yes' }).includes('auto_um_uim_limit'), true);
    for (const v of ['no', 'not_sure']) assert.equal(withAuto({ auto_um_uim: v }).includes('auto_um_uim_limit'), false, v);
    assert.equal(withAuto({}).includes('auto_um_uim_limit'), false);
  });

  t('the child-housing question needs a renters policy (the host\'s or the homeowner\'s tick), a home policy and "for a child"', () => {
    const child = { renters_for: 'child_away' };
    // The host\'s own renters policy (a.home "Both"): the one household that held both policies before S5-15.
    assert.equal(idsFor(['renters', 'home'], [], child).includes('renters_child_housing'), true);
    assert.equal(idsFor(['renters', 'home'], [], { renters_for: 'me' }).includes('renters_child_housing'), false);
    // A homeowner (host "Own") who ticks the renters policy: the SPEC\'s main audience, a parent paying for a student.
    assert.equal(idsFor(['home'], ['renters_with_home'], child).includes('renters_child_housing'), true);
    assert.equal(idsFor(['home'], ['renters_with_home'], { renters_for: 'me' }).includes('renters_child_housing'), false);
    // No home policy, so no parent\'s policy to overlap with.
    assert.equal(idsFor(['renters'], [], child).includes('renters_child_housing'), false);
    assert.equal(idsFor(['renters'], ['renters_with_home'], child).includes('renters_child_housing'), false);
    // A homeowner who did not tick the renters policy is never asked who it is for, so a stale answer is pruned.
    assert.equal(idsFor(['home'], [], child).includes('renters_child_housing'), false, 'no renters policy');
    assert.equal(idsFor(['home'], [], child).includes('renters_for'), false, 'no renters policy');
  });

  t('unticking the renters policy removes the renters questions and prunes their answers (a homeowner flips the tick back)', () => {
    const on = { ...answersFor(['home'], ['renters_with_home']), renters_for: 'child_away', renters_child_housing: 'dorm' };
    const kept = session.prune(on);
    assert.equal(kept.renters_for, 'child_away');
    assert.equal(kept.renters_child_housing, 'dorm');
    const off = { ...on, other_items: ['none'] };
    const gone = session.prune(off);
    assert.equal('renters_for' in gone, false);
    assert.equal('renters_child_housing' in gone, false);
    assert.equal(evaluate(off).meta.visibleQuestionIds.includes('renters_for'), false);
  });

  t('the card-payment question needs a card from the list; "another card, or no credit card" skips it', () => {
    const ctx = ['rental_car', 'travel'];
    assert.equal(idsFor([], ctx).includes('card_usual_payment'), false, 'cards not answered yet');
    assert.equal(idsFor([], ctx, { cards: ['chase_sapphire_preferred'] }).includes('card_usual_payment'), true);
    assert.equal(idsFor([], ctx, { cards: ['citi_double_cash', 'amex_gold'] }).includes('card_usual_payment'), true);
    assert.equal(idsFor([], ctx, { cards: ['other_none'] }).includes('card_usual_payment'), false);
  });

  t('stale answers are pruned when a gate flips (loan to paid off drops the gap answer)', () => {
    const before = { ...answersFor(['auto'], []), auto_financing: 'loan', auto_value: '10000_24999', auto_gap_coverage: 'no' };
    assert.equal(session.prune(before).auto_gap_coverage, 'no');
    const after = { ...before, auto_financing: 'paid_off' };
    assert.equal('auto_gap_coverage' in session.prune(after), false);
    assert.equal(evaluate(after).meta.visibleQuestionIds.includes('auto_gap_coverage'), false);
  });

  t('removing a policy removes its questions and answers (umbrella off drops the umbrella branch)', () => {
    const on = { ...answersFor(['auto', 'umbrella'], []), auto_liability: '100_300', umbrella_limit: '1m' };
    assert.equal(session.prune(on).umbrella_limit, '1m');
    const off = { ...on, policies: ['auto'] };
    const kept = session.prune(off);
    assert.equal('umbrella_limit' in kept, false);
    assert.equal('auto_liability' in kept, false);
  });

  t('nextUnanswered walks a section in order', () => {
    const answers = answersFor(['auto', 'home', 'umbrella'], []);
    assert.equal(session.nextUnanswered(answers).id, 'other_items');
    assert.equal(session.nextUnanswered(answers, 'umbrella_stack').id, 'umbrella_limit');
    const next = session.setAnswer(answers, 'umbrella_limit', '1m');
    assert.equal(session.nextUnanswered(next, 'umbrella_stack').id, 'auto_liability');
  });

  t('evaluate() on the real catalog reports the same visible questions and answered count', () => {
    const answers = { ...answersFor(['auto', 'home', 'umbrella'], ['rental_car']), umbrella_limit: '1m', auto_liability: 'not_sure' };
    const r = evaluate(answers);
    assert.deepEqual(r.meta.visibleQuestionIds, visibleIds(answers));
    assert.equal(r.meta.answeredCount, 3);
    // Shape only. Which flags fire on these answers belongs to the flag stories (S6 to S11), which edit only their
    // own files, so this catalog test must not depend on how many flags are registered.
    assert.deepEqual(Object.keys(r.flags), ['raise', 'drop', 'question']);
    for (const bucket of Object.keys(r.flags)) assert.ok(Array.isArray(r.flags[bucket]), `flags.${bucket} is an array`);
  });
});

// ======================================================================================================
// Reachability: for every question (and for every set of questions a planned flag reads) there is some
// assignment of the policies and gate answers that makes them all visible. A small solver over exactly the
// variables the gates mention, independent of the hand-written scenarios above.
function gatherVars(targetIds) {
  const holds = new Set();
  const gateQuestions = new Map();
  const seen = new Set();
  const visit = (qid) => {
    if (seen.has(qid)) return;
    seen.add(qid);
    const q = session.getQuestion(qid);
    if (!q || !q.showIf) return;
    const refs = conditionRefs(q.showIf);
    refs.holds.forEach((h) => holds.add(h));
    for (const r of refs.answers) { gateQuestions.set(r.qid, session.getQuestion(r.qid)); visit(r.qid); }
  };
  targetIds.forEach(visit);
  return { holds: Array.from(holds).sort(), gateQuestions: Array.from(gateQuestions.values()) };
}

function choicesFor(q) {
  const ids = q.options.map((o) => o.id);
  return [undefined].concat(q.type === 'multi' ? ids.map((id) => [id]) : ids);
}

function findCoVisible(targetIds) {
  const { holds, gateQuestions } = gatherVars(targetIds);
  const lists = gateQuestions.map(choicesFor);
  let total = (1 << holds.length);
  for (const l of lists) total *= l.length;
  if (total > 400000) throw new Error(`too many cases (${total}) to search for ${targetIds.join(', ')}`);
  for (let mask = (1 << holds.length) - 1; mask >= 0; mask--) {
    const policies = holds.filter((_, i) => (mask >> i) & 1);
    const idx = lists.map(() => 0);
    for (;;) {
      const answers = { policies };
      gateQuestions.forEach((q, i) => { if (lists[i][idx[i]] !== undefined) answers[q.id] = lists[i][idx[i]]; });
      const visible = new Set(visibleIds(answers));
      if (targetIds.every((id) => visible.has(id))) return answers;
      let k = 0;
      while (k < idx.length) {
        idx[k]++;
        if (idx[k] < lists[k].length) break;
        idx[k] = 0;
        k++;
      }
      if (k === idx.length) break;
    }
  }
  return null;
}

suite('questions: reachability', (t) => {
  t('every question can be made visible by some answer set', () => {
    for (const id of qids) {
      const found = findCoVisible([id]);
      assert.notEqual(found, null, `${id} can never be shown`);
    }
  });

  t('the solver is honest: it finds nothing for a contradictory pair', () => {
    // auto_gap_coverage needs a loan or lease; auto_collision needs the car paid off.
    assert.equal(findCoVisible(['auto_gap_coverage', 'auto_collision']), null);
  });

  t('the union of the hand-written traversals covers every question too (belt and braces)', () => {
    const seen = new Set();
    const add = (ids) => ids.forEach((i) => seen.add(i));
    add(idsFor(['auto', 'home', 'renters', 'health', 'umbrella', 'motorcycle', 'boat'], OTHER_ITEM_POLICY_IDS));
    add(idsFor(['auto'], [], { auto_financing: 'loan', auto_value: '10000_24999', auto_um_uim: 'yes' }));
    add(idsFor(['auto'], [], { auto_financing: 'paid_off', auto_value: 'under_3000' }));
    add(idsFor(['renters', 'home'], [], { renters_for: 'child_away' }));
    add(idsFor(['home'], ['renters_with_home'], { renters_for: 'child_away' }));
    add(idsFor([], ['rental_car'], { cards: ['amex_gold'] }));
    add(idsFor(['motorcycle'], ['towing']));
    assert.deepEqual(qids.filter((id) => !seen.has(id)), []);
  });
});

// ======================================================================================================
suite('questions: the credit-card choices (static until the card table lands, DECISIONS D14)', (t) => {
  const EXPECTED = [
    'chase-sapphire-preferred', 'chase-sapphire-reserve', 'chase-freedom-unlimited', 'chase-freedom-flex',
    'amex-platinum', 'amex-gold', 'amex-blue-cash-preferred', 'amex-blue-cash-everyday',
    'citi-double-cash', 'wells-fargo-active-cash', 'capital-one-venture-x', 'capital-one-venture',
  ];

  t('CARD_CHOICES lists the 12 intended cards, with unique kebab-case ids and plain display names', () => {
    assert.deepEqual(CARD_CHOICES.map((c) => c.id), EXPECTED);
    assert.equal(new Set(CARD_CHOICES.map((c) => c.id)).size, 12);
    assert.equal(new Set(CARD_CHOICES.map((c) => c.name)).size, 12);
    for (const c of CARD_CHOICES) {
      assert.deepEqual(Object.keys(c).sort(), ['id', 'name']);
      assert.match(c.id, KEBAB, c.id);
      assert.equal(c.name.trim().length > 5, true, c.id);
    }
  });

  t('the cards question has exactly those cards as options, then the exclusive "another card, or no credit card"', () => {
    const q = resolved(CARDS_QUESTION_ID);
    assert.equal(q.type, 'multi');
    assert.deepEqual(q.options.map((o) => o.id), [...CARD_CHOICES.map((c) => cardOptionId(c.id)), 'other_none']);
    CARD_CHOICES.forEach((c, i) => {
      assert.equal(q.options[i].id, c.id.replace(/-/g, '_'));
      assert.equal(q.options[i].label, c.name);
    });
    const none = q.options[q.options.length - 1];
    assert.equal(none.exclusive, true);
    assert.equal(none.label, 'Another card, or no credit card');
  });

  t('the engine maps each option id back to its card id the way ctx.cards() does (hyphens for underscores)', () => {
    const q = resolved(CARDS_QUESTION_ID);
    q.options.slice(0, 12).forEach((o, i) => assert.equal(o.id.replace(/_/g, '-'), CARD_CHOICES[i].id));
  });

  t('options carry no value.cardId while the card table is empty (validateCatalog would reject unknown ids)', () => {
    for (const o of QUESTIONS.find((q) => q.id === 'cards').options) assert.equal('value' in o, false, o.id);
  });

  t('a chosen card is simply unknown to ctx.cards() until CARDS has it, and never breaks evaluation', () => {
    const ctx = createContext({ policies: ['rental_car'], cards: ['chase_sapphire_preferred'] });
    assert.deepEqual(ctx.cards(), []);
    assert.deepEqual(ctx.cardsWith('rentalCar'), []);
    assert.equal(ctx.includes('cards', 'chase_sapphire_preferred'), true);
  });
});

// ======================================================================================================
// The question-to-flag plan (tests/fixtures/flagPlan.mjs, docs/QUESTION-FLAG-PLAN.md).
const FLAGS = PLAN.flags;
const RESEARCH_FILES = [umbrellaResearch, autoResearch, homeResearch, healthResearch, otherResearch];
const FACTS = {};
for (const file of RESEARCH_FILES) for (const f of file.facts) FACTS[f.id] = f;
const STORIES = ['S6', 'S7', 'S8', 'S9', 'S10', 'S11'];

suite('flag plan: every question is read and every planned flag has what it needs', (t) => {
  t('stories, ranges and file ownership are exactly the agreed split', () => {
    assert.deepEqual(Object.keys(PLAN.ranges), STORIES);
    assert.deepEqual(PLAN.ranges, { S6: [0, 99], S7: [100, 199], S8: [200, 299], S9: [300, 399], S10: [400, 499], S11: [500, 599] });
    assert.deepEqual(PLAN.files, {
      S6: ['umbrella', 'vehicles'], S7: ['umbrellaScope'], S8: ['auto'], S9: ['home', 'renters'], S10: ['health', 'deductible'], S11: ['other'],
    });
    const all = [].concat(...Object.values(PLAN.files));
    assert.equal(new Set(all).size, 9, 'the nine flag files are each owned by exactly one story');
  });

  t('flag ids are unique kebab-case; buckets, kinds, domains, stories and files are valid', () => {
    const ids = FLAGS.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const f of FLAGS) {
      assert.match(f.id, KEBAB);
      assert.includes(BUCKETS, f.bucket, f.id);
      assert.includes(KINDS, f.kind, f.id);
      assert.includes(DOMAINS, f.domain, f.id);
      assert.includes(STORIES, f.story, f.id);
      assert.includes(PLAN.files[f.story], f.file, `${f.id}: file "${f.file}" is not owned by ${f.story}`);
      assert.includes(['planned', 'conditional'], f.status, f.id);
    }
  });

  t('priorities are numbers inside the owning story\'s range, and unique across the plan', () => {
    const seen = {};
    for (const f of FLAGS) {
      const [lo, hi] = PLAN.ranges[f.story];
      assert.equal(Number.isInteger(f.priority) && f.priority >= lo && f.priority <= hi, true, `${f.id} priority ${f.priority} outside ${f.story} range ${lo}-${hi}`);
      assert.equal(seen[f.priority], undefined, `priority ${f.priority} used by ${f.id} and ${seen[f.priority]}`);
      seen[f.priority] = f.id;
    }
  });

  t('the plan covers the SPEC inventory: every listed interaction has at least one planned flag', () => {
    const ids = FLAGS.map((f) => f.id);
    const need = [
      'umbrella-home-below-required-min', 'umbrella-auto-below-required-min', 'umbrella-motorcycle-below-required-min',
      'umbrella-boat-below-required-min', 'umbrella-primary-liability-overbought',
      'umbrella-smaller-than-exposure', 'umbrella-um-uim-extension', 'umbrella-scope-exclusions',
      'auto-um-uim-check', 'auto-gap-coverage-missing', 'auto-rental-reimbursement-check', 'auto-collision-older-car',
      'home-sewer-backup-missing', 'home-flood-no-separate-policy', 'renters-child-vs-parents-home',
      'health-auto-medpay-overlap', 'health-supplemental-boltons', 'health-hsa-nudge', 'health-short-term-plan-alongside',
      'deductible-exceeds-cushion-auto', 'deductible-exceeds-cushion-home', 'deductible-exceeds-cushion-health',
      'other-rental-car-waiver', 'other-towing-roadside-duplicate', 'other-vehicle-towing-check',
      'other-travel-insurance-overlap', 'other-phone-insurance-card', 'other-extended-warranty-overlap', 'other-add-on-term-life',
    ];
    for (const id of need) assert.includes(ids, id);
    assert.equal(FLAGS.length, 32);
  });

  t('every asked question is read by at least one planned flag', () => {
    const read = new Set();
    for (const f of FLAGS) f.questions.forEach((q) => read.add(q));
    assert.deepEqual(qids.filter((id) => !read.has(id)), []);
  });

  t('every question a planned flag reads exists, and every policy it reads is a known policy id', () => {
    for (const f of FLAGS) {
      assert.equal(f.questions.length > 0, true, `${f.id} reads no question`);
      assert.equal(new Set(f.questions).size, f.questions.length, `${f.id} lists a question twice`);
      for (const q of f.questions) assert.includes(qids, q, `${f.id} reads unknown question ${q}`);
      assert.equal(new Set(f.holds).size, f.holds.length);
      for (const p of f.holds) assert.includes(POLICY_IDS, p, `${f.id} reads unknown policy ${p}`);
    }
  });

  t('a flag that reads an Other-bucket policy id also lists other_items, the question those ids come from', () => {
    for (const f of FLAGS) {
      if (f.holds.some((p) => OTHER_ITEM_POLICY_IDS.includes(p))) assert.includes(f.questions, 'other_items', f.id);
    }
  });

  t('a flag\'s questions can be visible together (the answers it combines can all exist at once)', () => {
    for (const f of FLAGS) {
      const found = findCoVisible(f.questions);
      assert.notEqual(found, null, `${f.id}: ${f.questions.join(', ')} can never all be visible together`);
      for (const p of f.holds) {
        // The policies it reads must be consistent with some visible combination too.
        assert.includes(POLICY_IDS, p);
      }
    }
  });

  t('the renters-versus-home flag can fire for a parent who owns their home and has no renters policy in the host (S5-15)', () => {
    const f = FLAGS.find((x) => x.id === 'renters-child-vs-parents-home');
    const answers = answersFor(['home'], ['renters_with_home'], { renters_for: 'child_away' });
    assert.equal(answers.policies.includes('renters'), false, 'the host derived no renters policy for an owner');
    const visible = new Set(visibleIds(answers));
    for (const q of f.questions) assert.equal(visible.has(q), true, `${q} is visible for the parent`);
    // The flag must read the home policy and the answers, never holds("renters"): the host sets that for rent or both only.
    assert.deepEqual(f.holds, ['home']);
    assert.match(f.trigger, /renters_with_home/, 'the trigger says how a homeowner reaches renters_for');
    assert.match(f.trigger, /do not require ctx\.holds\('renters'\)/);
  });

  t('every fact id named exists in research/, and every source id is in the registry and is a source of one of the flag\'s facts', () => {
    for (const f of FLAGS) {
      if (f.status === 'planned') {
        assert.equal(f.factIds.length > 0, true, `${f.id} needs facts`);
        assert.equal(f.sourceIds.length > 0, true, `${f.id} needs at least one source (no flag ships without one)`);
      }
      const factSources = new Set();
      for (const fid of f.factIds) {
        assert.notEqual(FACTS[fid], undefined, `${f.id}: unknown research fact ${fid}`);
        FACTS[fid].sourceIds.forEach((s) => factSources.add(s));
      }
      for (const sid of f.sourceIds) {
        assert.notEqual(SOURCES[sid], undefined, `${f.id}: source ${sid} is not in the registry`);
        assert.equal(factSources.has(sid), true, `${f.id}: source ${sid} is not a source of any fact it lists`);
      }
    }
  });

  t('only the phone flag is conditional, and it has no facts or sources because none survive the authority rules', () => {
    const conditional = FLAGS.filter((f) => f.status === 'conditional');
    assert.deepEqual(conditional.map((f) => f.id), ['other-phone-insurance-card']);
    assert.deepEqual(conditional[0].factIds, []);
    assert.deepEqual(conditional[0].sourceIds, []);
  });

  t('every flag states a trigger and the wording its research gaps require; none names a state', () => {
    for (const f of FLAGS) {
      assert.equal(f.trigger.length > 30, true, `${f.id} trigger`);
      assert.equal(f.wording.length > 30, true, `${f.id} wording`);
      const states = /\b(minnesota|california|florida|texas|new york|missouri|ohio|michigan|utah|arkansas|louisiana|colorado|arizona)\b/i;
      assert.equal(states.test(f.trigger) || states.test(f.wording.replace(/name no state|names? no state/gi, '')), false, `${f.id} names a state`);
    }
  });

  t('every flag whose questions allow Not sure says what happens on Not sure', () => {
    for (const f of FLAGS) {
      const unsureAllowed = f.questions.some((q) => resolved(q).allowNotSure && q !== 'other_items');
      if (!unsureAllowed) continue;
      assert.match(f.trigger, /Not sure|not sure/, `${f.id}: trigger must say how Not sure is handled`);
    }
  });

  t('Raise flags that need a known answer never fire on Not sure and have a Question twin (limits, size, gap)', () => {
    const twins = {
      'umbrella-home-below-required-min': 'umbrella-limits-unconfirmed',
      'umbrella-auto-below-required-min': 'umbrella-limits-unconfirmed',
      'umbrella-motorcycle-below-required-min': 'umbrella-limits-unconfirmed',
      'umbrella-boat-below-required-min': 'umbrella-limits-unconfirmed',
      'umbrella-smaller-than-exposure': 'umbrella-size-unconfirmed',
      'auto-gap-coverage-missing': 'auto-gap-coverage-confirm',
    };
    const byId = {};
    FLAGS.forEach((f) => { byId[f.id] = f; });
    for (const raiseId of Object.keys(twins)) {
      assert.equal(byId[raiseId].bucket, 'raise', raiseId);
      assert.equal(byId[twins[raiseId]].bucket, 'question', twins[raiseId]);
      assert.equal(byId[twins[raiseId]].story, byId[raiseId].story, 'the twin belongs to the same story');
    }
  });
});

// ======================================================================================================
// docs/QUESTION-FLAG-PLAN.md must say what the fixture says. The document's tables and per-flag blocks are
// generated from the catalog and the fixture; these tests fail if either side is edited without the other.
function tokens(cell) {
  const out = [];
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(cell)) !== null) out.push(m[1]);
  return out;
}

function tableRows(doc, startMarker, endMarker) {
  const start = doc.indexOf(startMarker);
  const end = doc.indexOf(endMarker);
  if (start < 0 || end < 0 || end < start) return null;
  return doc.slice(start + startMarker.length, end).split('\n')
    .filter((line) => line.startsWith('| `'))
    .map((line) => line.split('|').slice(1, -1).map((c) => c.trim()));
}

suite('flag plan: docs/QUESTION-FLAG-PLAN.md matches the data', (t) => {
  const DOC_PATH = 'docs/QUESTION-FLAG-PLAN.md';
  const doc = canRead ? read(DOC_PATH) : '';

  t('the planned-flags table lists exactly the fixture\'s flags with the same story, file, bucket, kind, domain, priority, status, questions and policies', () => {
    if (!canRead) return;
    const rows = tableRows(doc, '<!-- flag-table:start -->', '<!-- flag-table:end -->');
    assert.notEqual(rows, null, 'flag-table markers missing');
    assert.equal(rows.length, FLAGS.length);
    rows.forEach((cells, i) => {
      const f = FLAGS[i];
      assert.deepEqual(tokens(cells[0]), [f.id], `row ${i + 1} id`);
      assert.equal(cells[1], f.story, `${f.id} story`);
      assert.deepEqual(tokens(cells[2]), [f.file], `${f.id} file`);
      assert.equal(cells[3], f.bucket, `${f.id} bucket`);
      assert.equal(cells[4], f.kind, `${f.id} kind`);
      assert.equal(cells[5], f.domain, `${f.id} domain`);
      assert.equal(cells[6], String(f.priority), `${f.id} priority`);
      assert.equal(cells[7], f.status, `${f.id} status`);
      assert.deepEqual(tokens(cells[8]), f.questions, `${f.id} questions`);
      assert.deepEqual(tokens(cells[9]), f.holds, `${f.id} holds`);
    });
  });

  t('each flag has a detail block whose trigger, facts and sources equal the fixture', () => {
    if (!canRead) return;
    for (const f of FLAGS) {
      const head = `#### \`${f.id}\``;
      const at = doc.indexOf(head);
      assert.notEqual(at, -1, `no detail block for ${f.id}`);
      const rest = doc.slice(at + head.length);
      const next = rest.search(/\n#{2,4} /);
      const block = next === -1 ? rest : rest.slice(0, next);
      const line = (label) => {
        const m = new RegExp(`^- ${label}: (.*)$`, 'm').exec(block);
        return m ? m[1] : null;
      };
      assert.equal(line('Trigger'), f.trigger, `${f.id} trigger`);
      assert.deepEqual(tokens(line('Facts') || ''), f.factIds, `${f.id} facts`);
      assert.deepEqual(tokens(line('Sources') || ''), f.sourceIds, `${f.id} sources`);
      assert.equal(line('Wording'), f.wording, `${f.id} wording`);
    }
  });

  t('the question table lists every question in display order with its real section, type and option ids, and the flags that read it', () => {
    if (!canRead) return;
    const rows = tableRows(doc, '<!-- question-table:start -->', '<!-- question-table:end -->');
    assert.notEqual(rows, null, 'question-table markers missing');
    assert.equal(rows.length, QUESTIONS.length);
    rows.forEach((cells, i) => {
      const q = session.questions[i];
      assert.deepEqual(tokens(cells[0]), [q.id], `row ${i + 1} id`);
      assert.deepEqual(tokens(cells[1]), [q.section], `${q.id} section`);
      assert.equal(cells[2], q.type, `${q.id} type`);
      assert.deepEqual(tokens(cells[3]), q.options.map((o) => o.id), `${q.id} option ids`);
      const readers = FLAGS.filter((f) => f.questions.includes(q.id)).map((f) => f.id);
      assert.deepEqual(tokens(cells[5]), readers, `${q.id} read by`);
    });
  });

  t('the document lists every section in order with its question count', () => {
    if (!canRead) return;
    const rows = tableRows(doc, '<!-- section-table:start -->', '<!-- section-table:end -->');
    assert.notEqual(rows, null, 'section-table markers missing');
    assert.equal(rows.length, SECTIONS.length);
    rows.forEach((cells, i) => {
      const s = SECTIONS[i];
      assert.deepEqual(tokens(cells[0]), [s.id]);
      assert.equal(cells[1], String(QUESTIONS.filter((q) => q.section === s.id).length), `${s.id} count`);
    });
  });
});
