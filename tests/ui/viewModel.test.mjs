// Tests for public/js/overlap-ui/viewModel.mjs (Story S13, step A): the pure view-models behind the overlap
// screens and the insurer action list. Runs under jsc; the module itself must stay free of DOM, Node,
// storage, timers and nondeterminism.
//
// Real-catalog tests deliberately never pin WHICH flags exist or fire (other stories add flags in parallel,
// DECISIONS S5-14). They check structure, ordering and agreement with the engine. Exact flag content is
// tested against the fixture catalog (tests/fixtures/catalog.mjs), which no other story changes.
import { suite, assert } from '../harness.mjs';
import {
  overlapSections, overlapScreenIds, screenIds, progressPercent, policiesSummary, applyAnswer, actionListViewModel, actionListText,
  ENTRY_SCREEN_ID, OVERLAP_SCREEN_PREFIX, ACTIONS_SCREEN_ID, BUCKET_LABELS, BUCKET_DESCRIPTIONS,
  INFO_NOTE, EMPTY_TITLE, EMPTY_MESSAGE, EMPHASIS_LABEL, TEXT_HEADLINE,
} from '../../public/js/overlap-ui/viewModel.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { SECTIONS } from '../../public/js/overlap/data/questions/index.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import { evaluate } from '../../public/js/overlap/engine/evaluate.mjs';
import { evaluateCondition } from '../../public/js/overlap/engine/conditions.mjs';
import FIXTURE from '../fixtures/catalog.mjs';
import { deepFreeze, copy, recordReads } from '../helpers/purity.mjs';
import { findForbidden, codeOnly, importsOf, resolveSpec } from '../helpers/sourceScan.mjs';

const MODULE_PATH = 'public/js/overlap-ui/viewModel.mjs';

// ---------------------------------------------------------------------------------------------------------
// Fixtures: plain answers. Q1 (`policies`) holds the ticked policies, every other key is the user's own tap.
// ---------------------------------------------------------------------------------------------------------
const ans = (policies, more = {}) => ({ policies, ...more });
const ids = (list) => list.map((x) => x.id);
const json = (v) => JSON.stringify(v); // unsorted on purpose: key order must be deterministic too

const H_EMPTY = {}; // nothing answered yet: Q1 is the only question
const H_AUTO_HOME = ans(['auto', 'home']);
const H_RENTER = ans(['renters']);
const H_HEALTH = ans(['health']);
const H_UMBRELLA_ONLY = ans(['umbrella']);
const H_PARENT = ans(['home', 'renters']); // owns the home and pays for a child's renters policy
const H_FULL = ans(['auto', 'home', 'renters', 'umbrella', 'health', 'motorcycle', 'boat', 'rental_car', 'towing', 'phone', 'accidental_death']);
const ALL_SECTION_IDS = SECTIONS.map((s) => s.id);

// ---------------------------------------------------------------------------------------------------------
// The module is pure: source scan
// ---------------------------------------------------------------------------------------------------------
suite('viewModel: the module is pure (source scan)', (t) => {
  const canRead = typeof read === 'function';

  t('no DOM, Node, storage, timer, network or nondeterministic globals in the code', () => {
    if (!canRead) return;
    const found = findForbidden(codeOnly(read(MODULE_PATH), false));
    assert.equal(found, null, found ? `forbidden "${found}" in ${MODULE_PATH}` : '');
  });

  t('imports only relative .mjs modules under public/js/overlap/', () => {
    if (!canRead) return;
    const specs = importsOf(read(MODULE_PATH));
    assert.equal(specs.length > 0, true, 'the module imports the engine');
    for (const spec of specs) {
      assert.equal(spec.startsWith('.') && spec.endsWith('.mjs'), true, `relative .mjs import: ${spec}`);
      const target = resolveSpec(MODULE_PATH, spec);
      assert.equal(target.startsWith('public/js/overlap/'), true, `${spec} resolves to ${target}, outside public/js/overlap/`);
    }
  });

  t('the scanner used here really catches the globals it is meant to catch', () => {
    assert.equal(findForbidden(codeOnly("const a = localStorage.getItem('x'); // fine: document\n", false)), 'localStorage');
    assert.equal(findForbidden(codeOnly('const b = `${Date.now()}`;', false)), 'Date');
    assert.equal(findForbidden(codeOnly('const c = prompt("name");', false)), 'prompt');
    assert.equal(findForbidden(codeOnly("const s = 'document and Date and fetch'; // window\nconst p = question.prompt;", false)), null);
    assert.deepEqual(importsOf("import a from '../x/a.mjs';\nexport { b } from './b.mjs';"), ['../x/a.mjs', './b.mjs']);
    assert.equal(resolveSpec('public/js/overlap-ui/viewModel.mjs', '../overlap/engine/session.mjs'), 'public/js/overlap/engine/session.mjs');
  });
});

// ---------------------------------------------------------------------------------------------------------
// overlapSections
// ---------------------------------------------------------------------------------------------------------
suite('overlapSections: which sections, in what order', (t) => {
  t('a household that told us nothing sees only the always-shown first section, Q1', () => {
    assert.deepEqual(ids(overlapSections(H_EMPTY)), ['start']);
    assert.deepEqual(ids(overlapSections(ans(['none']))), ['start']);
  });

  t('sections follow the SECTIONS order and only appear with at least one visible question', () => {
    assert.deepEqual(ids(overlapSections(H_AUTO_HOME)), ['start', 'auto_gaps', 'home_exclusions', 'deductible']);
    assert.deepEqual(ids(overlapSections(H_RENTER)), ['start', 'renters']);
    assert.deepEqual(ids(overlapSections(H_HEALTH)), ['start', 'health', 'deductible']);
    assert.deepEqual(ids(overlapSections(H_UMBRELLA_ONLY)), ['start', 'umbrella_stack', 'umbrella_scope']);
    assert.deepEqual(ids(overlapSections(H_PARENT)), ['start', 'renters', 'home_exclusions', 'deductible']);
    assert.deepEqual(ids(overlapSections(H_FULL)), ALL_SECTION_IDS);
  });

  t('a section with no visible question is left out even when it has a gate that looks open', () => {
    // An umbrella alone: umbrella_vehicles needs a motorcycle or boat, so it never appears.
    assert.equal(ids(overlapSections(H_UMBRELLA_ONLY)).includes('umbrella_vehicles'), false);
    // Add a boat and it does.
    assert.equal(ids(overlapSections(ans(['umbrella', 'boat']))).includes('umbrella_vehicles'), true);
  });

  t('each section carries its id, title and reason from SECTIONS, its questions, and a complete flag', () => {
    for (const s of overlapSections(H_FULL)) {
      const def = SECTIONS.find((d) => d.id === s.id);
      assert.deepEqual(Object.keys(s), ['id', 'title', 'reason', 'questions', 'complete']);
      assert.equal(s.title, def.title);
      assert.equal(s.reason, def.reason);
      assert.equal(s.questions.length > 0, true);
      assert.equal(typeof s.complete, 'boolean');
    }
  });

  t('sections list the questions of that section, visible ones only, in catalog order', () => {
    const snap = ans(['auto', 'home']);
    const auto = overlapSections(snap).find((s) => s.id === 'auto_gaps');
    // gap coverage needs a loan or lease, collision needs a paid-off cheap car, the UM/UIM limit needs a yes
    assert.deepEqual(ids(auto.questions), ['auto_financing', 'auto_value', 'auto_um_uim', 'auto_rental_reimbursement']);
    const loan = overlapSections(ans(['auto', 'home'], { auto_financing: 'loan' })).find((s) => s.id === 'auto_gaps');
    assert.deepEqual(ids(loan.questions), ['auto_financing', 'auto_value', 'auto_gap_coverage', 'auto_um_uim', 'auto_rental_reimbursement']);
    const cheap = overlapSections(ans(['auto', 'home'], { auto_financing: 'paid_off', auto_value: 'under_3000' })).find((s) => s.id === 'auto_gaps');
    assert.deepEqual(ids(cheap.questions), ['auto_financing', 'auto_value', 'auto_collision', 'auto_um_uim', 'auto_rental_reimbursement']);
  });

  t('answers can open a new section: an umbrella plus a boat adds the vehicles section and its questions', () => {
    const secs = overlapSections(ans(['umbrella', 'boat']));
    const vehicles = secs.find((s) => s.id === 'umbrella_vehicles');
    assert.deepEqual(ids(vehicles.questions), ['boat_liability', 'umbrella_min_boat']);
  });

  t('the renters section opens for a homeowner who also ticks Renters (a parent paying for a child\'s policy)', () => {
    assert.equal(ids(overlapSections(ans(['home']))).includes('renters'), false);
    const secs = overlapSections(ans(['home', 'renters']));
    assert.equal(ids(secs).includes('renters'), true);
    assert.deepEqual(ids(secs.find((s) => s.id === 'renters').questions), ['renters_for']);
  });
});

suite('overlapSections: question shape, kinds and options', (t) => {
  const question = (snap, sectionId, qid) => overlapSections(snap).find((s) => s.id === sectionId).questions.find((q) => q.id === qid);

  t('a question has exactly the documented fields', () => {
    const q = question(H_EMPTY, 'start', 'policies');
    assert.deepEqual(Object.keys(q), ['id', 'prompt', 'help', 'kind', 'options', 'answered', 'allAnswered']);
    assert.deepEqual(Object.keys(q.options[0]), ['id', 'label', 'selected']);
  });

  t('Q1, the multi question, lists its options in catalog order, with none selected before any answer', () => {
    const q = question(H_EMPTY, 'start', 'policies');
    assert.equal(q.kind, 'multi');
    assert.deepEqual(ids(q.options), ['auto', 'home', 'renters', 'umbrella', 'health', 'motorcycle', 'boat', 'rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death', 'none']);
    assert.deepEqual(q.options.map((o) => o.selected), q.options.map(() => false));
    assert.equal(q.answered, false);
    assert.equal(q.allAnswered, false);
    assert.equal(q.prompt, CATALOG.questions.find((x) => x.id === 'policies').prompt);
    assert.equal(q.help, CATALOG.questions.find((x) => x.id === 'policies').help);
  });

  t('a yes/no question is kind "yesno" with Yes, No and Not sure, Not sure last', () => {
    const q = question(H_AUTO_HOME, 'home_exclusions', 'home_sewer_backup');
    assert.equal(q.kind, 'yesno');
    assert.deepEqual(ids(q.options), ['yes', 'no', 'not_sure']);
    assert.deepEqual(q.options.map((o) => o.label), ['Yes', 'No', 'Not sure']);
  });

  t('a yes/no question without Not sure is still "yesno" (side_business)', () => {
    const q = question(ans(['umbrella']), 'umbrella_scope', 'side_business');
    assert.equal(q.kind, 'yesno');
    assert.deepEqual(ids(q.options), ['yes', 'no']);
  });

  t('a single question with its own choices is kind "single", Not sure last', () => {
    const q = question(H_AUTO_HOME, 'auto_gaps', 'auto_financing');
    assert.equal(q.kind, 'single');
    assert.deepEqual(ids(q.options), ['lease', 'loan', 'paid_off']); // no Not sure on this one (DECISIONS S5-8)
    const v = question(H_AUTO_HOME, 'auto_gaps', 'auto_value');
    assert.equal(v.kind, 'single');
    assert.equal(v.options[v.options.length - 1].id, 'not_sure');
    assert.deepEqual(ids(v.options), ['under_3000', '3000_9999', '10000_24999', '25000_plus', 'not_sure']);
  });

  t('a limit question starts with the "lower" rung and ends with Not sure', () => {
    const q = question(ans(['auto', 'umbrella']), 'umbrella_stack', 'auto_liability');
    assert.deepEqual(ids(q.options), ['lower', '100_300', '250_500', '500_500', 'not_sure']);
    assert.equal(q.options[0].label, 'Lower than 100/300');
  });

  t('a multi question with an exclusive Not sure keeps it last (roadside sources)', () => {
    const q = question(ans(['towing']), 'extras_detail', 'roadside_sources');
    assert.equal(q.kind, 'multi');
    assert.equal(q.options[q.options.length - 1].id, 'not_sure');
    assert.equal(q.options[q.options.length - 1].label, 'Not sure');
  });

  t('selected reflects a single answer, a multi answer and Not sure', () => {
    const snap = ans(['auto', 'home', 'towing', 'travel'], { auto_financing: 'loan', auto_um_uim: 'not_sure', auto_value: '3000_9999' });
    const secs = overlapSections(snap);
    const pick = (sid, qid) => secs.find((s) => s.id === sid).questions.find((x) => x.id === qid);
    const q1 = pick('start', 'policies');
    assert.deepEqual(q1.options.filter((o) => o.selected).map((o) => o.id), ['auto', 'home', 'towing', 'travel']);
    assert.equal(q1.answered, true);
    assert.equal(q1.allAnswered, true);
    const fin = pick('auto_gaps', 'auto_financing');
    assert.deepEqual(fin.options.map((o) => o.selected), [false, true, false]);
    const um = pick('auto_gaps', 'auto_um_uim');
    assert.deepEqual(um.options.map((o) => [o.id, o.selected]), [['yes', false], ['no', false], ['not_sure', true]]);
    assert.equal(pick('auto_gaps', 'auto_rental_reimbursement').answered, false);
  });

  t('stale and invalid answers are ignored: hidden questions, unknown options, unknown keys', () => {
    // home_sewer_backup is hidden for a renter; the single value is unknown; the last key is not a question
    const snap = ans(['renters'], { home_sewer_backup: 'yes', renters_for: 'nonsense', bogus_question: 'x' });
    const secs = overlapSections(snap);
    assert.deepEqual(ids(secs), ['start', 'renters']);
    const q = secs[1].questions[0];
    assert.equal(q.id, 'renters_for');
    assert.equal(q.answered, false);
    assert.deepEqual(q.options.map((o) => o.selected), [false, false]);
    assert.equal(secs[0].questions[0].answered, true, 'Q1 itself is valid');
  });

  t('a multi answer of the wrong shape (a string) is ignored, so Q1 reads as unanswered and nothing else opens', () => {
    const secs = overlapSections({ policies: 'towing', roadside_sources: ['club'] });
    assert.deepEqual(ids(secs), ['start']);
    assert.equal(secs[0].questions[0].answered, false);
    assert.deepEqual(secs[0].questions[0].options.map((o) => o.selected), secs[0].questions[0].options.map(() => false));
  });
});

suite('overlapSections: complete', (t) => {
  t('complete only when every visible question of the section is answered', () => {
    const get = (o) => overlapSections(ans(['home'], o)).find((s) => s.id === 'home_exclusions');
    assert.equal(get({}).complete, false);
    assert.equal(get({ home_sewer_backup: 'yes' }).complete, false);
    assert.equal(get({ home_sewer_backup: 'yes', home_flood_policy: 'not_sure' }).complete, true);
  });

  t('answering a question that opens a follow-up makes the section incomplete again', () => {
    const o = { auto_financing: 'loan', auto_value: '3000_9999', auto_um_uim: 'no', auto_rental_reimbursement: 'yes' };
    const snap = (x) => ans(['auto'], x);
    const auto = (x) => overlapSections(snap(x)).find((s) => s.id === 'auto_gaps');
    // a loan opens the gap-coverage question, which is not answered yet
    assert.equal(auto(o).complete, false);
    assert.equal(auto({ ...o, auto_gap_coverage: 'yes' }).complete, true);
    // a yes on UM/UIM opens its limit question
    assert.equal(auto({ ...o, auto_gap_coverage: 'yes', auto_um_uim: 'yes' }).complete, false);
    assert.equal(auto({ ...o, auto_gap_coverage: 'yes', auto_um_uim: 'yes', auto_um_uim_limit: '250_500' }).complete, true);
  });

  t('the start section (Q1) is complete once anything, including "None of these", is chosen', () => {
    const start = (o) => overlapSections(o).find((s) => s.id === 'start');
    assert.equal(start({}).complete, false);
    assert.equal(start({ policies: ['none'] }).complete, true);
    assert.equal(start({ policies: ['travel'] }).complete, true);
  });

  t('allAnswered on a question always equals answered', () => {
    for (const s of overlapSections(ans(['auto', 'home'], { auto_financing: 'loan' }))) {
      for (const q of s.questions) assert.equal(q.allAnswered, q.answered);
    }
  });
});

// A sweep over many households, checked against oracles that do not share code with the view-model. Each household
// is a set of Q1 ticks (the policies are the only answers: they alone decide which sections and questions appear).
let sweepCache = null;
function sweep() {
  if (sweepCache) return sweepCache;
  const homes = [[], ['home'], ['renters'], ['home', 'renters']];
  const otherSets = [[], ['rental_car'], ['towing'], ['phone'], ['accidental_death'], ['travel'], ['warranty'], ['travel', 'warranty']];
  const out = [];
  for (const home of homes) {
    for (const car of [false, true]) {
      for (const health of [false, true]) {
        for (const umbrella of [false, true]) {
          for (const moto of [false, true]) {
            for (const boat of [false, true]) {
              for (const other of otherSets) {
                out.push(ans([].concat(
                  home, car ? ['auto'] : [], health ? ['health'] : [], umbrella ? ['umbrella'] : [],
                  moto ? ['motorcycle'] : [], boat ? ['boat'] : [], other,
                )));
              }
            }
          }
        }
      }
    }
  }
  sweepCache = out.map((snap) => ({ snap, sections: overlapSections(snap) }));
  return sweepCache;
}

suite('overlapSections: sweep over 2,048 households against the engine', (t) => {
  t('the sections shown are exactly the SECTIONS whose gate is true, in SECTIONS order', () => {
    // Independent oracle: evaluate each section's own gate against the answers (only Q1 is answered, which is all
    // the section gates read).
    for (const { snap, sections } of sweep()) {
      const expected = SECTIONS.filter((s) => s.showIf === null || evaluateCondition(s.showIf, { answers: snap })).map((s) => s.id);
      assert.deepEqual(ids(sections), expected, `household ${json(snap)}`);
    }
  });

  t('the questions shown are exactly the engine\'s visible questions, grouped by section, in catalog order', () => {
    const session = createSession(CATALOG);
    for (const { snap, sections } of sweep()) {
      const visible = session.visibleQuestions(snap);
      const shown = [];
      for (const s of sections) {
        for (const q of s.questions) {
          assert.equal(visible.find((v) => v.id === q.id).section, s.id, `${q.id} is listed under the wrong section`);
          shown.push(q.id);
        }
      }
      // grouping by section keeps the catalog order inside a section; across sections it follows SECTIONS,
      // which is also the catalog order (questions of a section are contiguous)
      assert.deepEqual(shown, ids(visible), `household ${json(snap)}`);
    }
  });

  t('every question is well formed: kind matches the catalog, Not sure is last, labels are present, no duplicates', () => {
    const seen = {};
    for (const { snap, sections } of sweep()) {
      for (const s of sections) {
        assert.equal(s.questions.length > 0, true);
        for (const q of s.questions) {
          const def = CATALOG.questions.find((x) => x.id === q.id);
          seen[q.id] = true;
          assert.equal(q.prompt, def.prompt);
          assert.equal(typeof q.help, 'string');
          assert.equal(q.help.length > 0, true, `${q.id} help`);
          const base = def.options.map((o) => o.id);
          const shownIds = ids(q.options);
          assert.equal(new Set(shownIds).size, shownIds.length, `${q.id} repeats an option`);
          const withoutNotSure = shownIds.filter((x) => x !== 'not_sure');
          assert.deepEqual(withoutNotSure, base, `${q.id} options differ from the catalog`);
          if (def.allowNotSure) assert.equal(shownIds[shownIds.length - 1], 'not_sure', `${q.id}: Not sure must be last`);
          else assert.equal(shownIds.includes('not_sure'), false, `${q.id} has no Not sure`);
          // the sweep answers only Q1, so that is the only question with anything selected
          const ticked = q.id === 'policies' ? snap.policies : [];
          for (const o of q.options) {
            assert.equal(typeof o.label === 'string' && o.label.length > 0, true, `${q.id}.${o.id} label`);
            assert.equal(o.selected, ticked.includes(o.id), `${q.id}.${o.id} selected`);
          }
          assert.equal(q.answered, ticked.length > 0, `${q.id} answered`);
          const expectedKind = def.type === 'multi' ? 'multi' : (withoutNotSure.length === 2 && withoutNotSure[0] === 'yes' && withoutNotSure[1] === 'no' ? 'yesno' : 'single');
          assert.equal(q.kind, expectedKind, `${q.id} kind`);
        }
      }
    }
    // the sweep reaches most of the 38 questions without answering anything (the rest need an answer to open)
    assert.equal(Object.keys(seen).length >= 26, true, `sweep reached only ${Object.keys(seen).length} questions`);
  });
});

suite('overlapSections: purity and determinism', (t) => {
  t('same answers, same result, byte for byte (key order included)', () => {
    assert.equal(json(overlapSections(H_FULL)), json(overlapSections(H_FULL)));
    assert.equal(json(overlapSections(copy(H_FULL))), json(overlapSections(H_FULL)));
  });

  t('does not mutate deeply frozen answers', () => {
    const frozen = deepFreeze(copy(H_FULL));
    const before = json(frozen);
    const result = overlapSections(frozen);
    assert.equal(json(frozen), before);
    assert.deepEqual(ids(result), ALL_SECTION_IDS);
  });

  t('returns fresh objects: editing a result changes nothing later', () => {
    const baseline = json(overlapSections(H_FULL));
    const first = overlapSections(H_FULL);
    first[0].questions[0].options[0].selected = !first[0].questions[0].options[0].selected;
    first[0].questions[0].options.pop();
    first[0].title = 'changed';
    first.pop();
    const second = overlapSections(H_FULL);
    assert.equal(json(second), baseline);
    assert.equal(second.length, ALL_SECTION_IDS.length);
  });

  t('reads only the answers to questions, never a state or any other key', () => {
    const log = [];
    overlapSections(recordReads({ ...H_FULL, state: 'CA', secret: 'x' }, log));
    const top = log.filter((k) => !k.includes('.') && !k.includes('#'));
    const questionIds = CATALOG.questions.map((q) => q.id);
    for (const k of top) assert.includes(questionIds, k, `unexpected read of answers.${k}`);
    assert.equal(top.includes('state'), false);
    assert.equal(top.includes('secret'), false);
    assert.deepEqual(overlapSections({ ...H_FULL, state: 'CA' }), overlapSections({ ...H_FULL, state: 'FL' }));
  });

  t('copes with missing or malformed answers (treated as absent)', () => {
    assert.deepEqual(ids(overlapSections(undefined)), ['start']);
    assert.deepEqual(ids(overlapSections(null)), ['start']);
    assert.deepEqual(ids(overlapSections({})), ['start']);
    assert.deepEqual(ids(overlapSections('x')), ['start']);
    assert.deepEqual(ids(overlapSections(5)), ['start']);
    assert.deepEqual(ids(overlapSections([])), ['start']);
    assert.deepEqual(ids(overlapSections({ a: 'x', extras: 'Boat', q: [], p: 5, o: 'no' })), ['start']);
  });
});

suite('overlapSections: with a catalog argument', (t) => {
  const umbrellaHost = ans(['auto', 'home', 'health', 'umbrella']);

  t('without a sections list, sections come from the questions in first-appearance order', () => {
    const secs = overlapSections(umbrellaHost, FIXTURE);
    // Q1 comes first; umbrella_scope questions need an answer to umbrella_limit; core needs no umbrella; other needs a card item
    assert.deepEqual(ids(secs), ['start', 'umbrella', 'health']);
    assert.deepEqual(ids(secs[0].questions), ['policies']);
    assert.deepEqual(ids(secs[1].questions), ['umbrella_limit', 'auto_liability', 'home_liability']);
    assert.equal(secs[0].title, 'Start');
    assert.equal(secs[1].title, 'Umbrella');
    assert.equal(secs[1].reason, '');
    const opened = overlapSections({ ...umbrellaHost, umbrella_limit: '1m' }, FIXTURE);
    assert.deepEqual(ids(opened), ['start', 'umbrella', 'umbrella_scope', 'health']);
    assert.equal(opened[2].title, 'Umbrella scope');
  });

  t('with an explicit sections list, its order and wording win', () => {
    const catalog = {
      ...FIXTURE,
      sections: [
        { id: 'health', title: 'Health first', reason: 'Because health.' },
        { id: 'umbrella', title: 'Then umbrella', reason: 'Because umbrella.' },
      ],
    };
    const secs = overlapSections(umbrellaHost, catalog);
    assert.deepEqual(ids(secs), ['health', 'umbrella']);
    assert.deepEqual(secs.map((s) => [s.title, s.reason]), [['Health first', 'Because health.'], ['Then umbrella', 'Because umbrella.']]);
  });

  t('a multi question with an exclusive option and Not sure keeps Not sure last, and kinds follow the catalog', () => {
    const secs = overlapSections(umbrellaHost, FIXTURE);
    const supplements = secs[2].questions[0];
    assert.equal(supplements.kind, 'multi');
    assert.deepEqual(ids(supplements.options), ['accident', 'critical_illness', 'hospital_indemnity', 'none_of_these', 'not_sure']);
    const limit = secs[1].questions[0];
    assert.equal(limit.kind, 'single');
    const opened = overlapSections({ ...umbrellaHost, umbrella_limit: '1m' }, FIXTURE);
    const side = opened[2].questions.find((q) => q.id === 'umbrella_side_business');
    assert.equal(side.kind, 'yesno');
    assert.deepEqual(ids(side.options), ['yes', 'no']);
    const detail = overlapSections({ ...umbrellaHost, umbrella_limit: '1m', umbrella_ext_um: 'no' }, FIXTURE)[2].questions.find((q) => q.id === 'umbrella_um_detail');
    assert.equal(detail.kind, 'single'); // two choices, but not yes/no
  });
});

suite('overlapSections: kind and option order for unusual questions (mini catalog)', (t) => {
  const q = (id, options, extra = {}) => ({ id, domain: 'core', section: 'mini', type: 'single', prompt: `Prompt for ${id}?`, options, allowNotSure: false, showIf: null, ...extra });
  const opt = (id, label = id) => ({ id, label });
  const MINI = {
    questions: [
      q('yes_no_only', [opt('yes', 'Yes'), opt('no', 'No')]),
      q('yes_unsure', [opt('yes', 'Yes'), opt('unsure', 'Unsure')]),
      q('no_then_yes', [opt('no', 'No'), opt('yes', 'Yes')]),
      q('yes_no_maybe', [opt('yes', 'Yes'), opt('no', 'No'), opt('maybe', 'Maybe')]),
      q('one_choice', [opt('yes', 'Yes')]),
      // an explicit Not sure listed in the middle (the engine appends its own at the end, but an author's stays put
      // in the catalog, so the view-model has to put it last itself)
      q('misplaced_not_sure', [opt('yes', 'Yes'), opt('not_sure', 'Not sure'), opt('no', 'No')], { allowNotSure: true }),
      q('multi_misplaced', [opt('a', 'A'), opt('not_sure', 'Not sure'), opt('b', 'B')], { type: 'multi', allowNotSure: true }),
    ],
    flags: [],
    sources: {},
  };
  const byId = () => {
    const out = {};
    for (const qq of overlapSections({}, MINI)[0].questions) out[qq.id] = qq;
    return out;
  };

  t('only Yes then No (optionally followed by Not sure) is "yesno"', () => {
    const v = byId();
    assert.equal(v.yes_no_only.kind, 'yesno');
    assert.equal(v.yes_unsure.kind, 'single');
    assert.equal(v.no_then_yes.kind, 'single');
    assert.equal(v.yes_no_maybe.kind, 'single');
    assert.equal(v.one_choice.kind, 'single');
    assert.equal(v.misplaced_not_sure.kind, 'yesno');
    assert.equal(v.multi_misplaced.kind, 'multi');
  });

  t('Not sure is moved to the end whatever its place in the catalog, and the other options keep their order', () => {
    const v = byId();
    assert.deepEqual(ids(v.misplaced_not_sure.options), ['yes', 'no', 'not_sure']);
    assert.deepEqual(ids(v.multi_misplaced.options), ['a', 'b', 'not_sure']);
    assert.deepEqual(ids(v.no_then_yes.options), ['no', 'yes']);
  });

  t('a question with no help text gets an empty string, never undefined', () => {
    const v = byId();
    assert.equal(v.yes_no_only.help, '');
    assert.equal(typeof v.yes_no_only.help, 'string');
  });

  t('the stand-in section title is built from the section id', () => {
    const [section] = overlapSections({}, MINI);
    assert.equal(section.id, 'mini');
    assert.equal(section.title, 'Mini');
    assert.equal(section.reason, '');
  });
});

// ---------------------------------------------------------------------------------------------------------
// overlapScreenIds
// ---------------------------------------------------------------------------------------------------------
suite('overlapScreenIds', (t) => {
  t('the constants are the screen id conventions', () => {
    assert.equal(OVERLAP_SCREEN_PREFIX, 'ovl:');
    assert.equal(ACTIONS_SCREEN_ID, 'actions');
  });

  t('one ovl:<section> id per section, then "actions" last', () => {
    assert.deepEqual(overlapScreenIds(H_EMPTY), ['ovl:start', 'actions']);
    assert.deepEqual(overlapScreenIds(H_AUTO_HOME), ['ovl:start', 'ovl:auto_gaps', 'ovl:home_exclusions', 'ovl:deductible', 'actions']);
    assert.deepEqual(overlapScreenIds(H_FULL), ALL_SECTION_IDS.map((id) => `ovl:${id}`).concat(['actions']));
  });

  t('for every household in the sweep: ids match the sections, are unique, and "actions" is last', () => {
    for (const { snap, sections } of sweep()) {
      const screens = overlapScreenIds(snap);
      assert.deepEqual(screens, sections.map((s) => `ovl:${s.id}`).concat(['actions']));
      assert.equal(screens[screens.length - 1], 'actions');
      assert.equal(new Set(screens).size, screens.length);
    }
  });

  t('answers that open or close sections change the list', () => {
    const base = ans(['home']);
    assert.equal(overlapScreenIds(base).includes('ovl:renters'), false);
    assert.equal(overlapScreenIds(ans(['home', 'renters'])).includes('ovl:renters'), true);
    assert.equal(overlapScreenIds(ans(['home', 'phone'])).includes('ovl:cards'), true);
  });

  t('pure and deterministic; works with a catalog argument; frozen input is fine', () => {
    assert.deepEqual(overlapScreenIds(H_FULL), overlapScreenIds(copy(H_FULL)));
    assert.deepEqual(overlapScreenIds(deepFreeze(copy(H_FULL))), overlapScreenIds(H_FULL));
    assert.deepEqual(overlapScreenIds(ans(['health']), FIXTURE), ['ovl:start', 'ovl:health', 'ovl:core', 'actions']);
    assert.deepEqual(overlapScreenIds(null), ['ovl:start', 'actions']);
  });
});

// ---------------------------------------------------------------------------------------------------------
// screenIds, progressPercent, policiesSummary (R1 step B: the page is these screens and nothing else)
// ---------------------------------------------------------------------------------------------------------
suite('screenIds: the entry screen, Q1, the sections that apply, then the action list', (t) => {
  t('the entry id is "entry" and is first; with nothing answered the page is entry, Q1, actions', () => {
    assert.equal(ENTRY_SCREEN_ID, 'entry');
    assert.deepEqual(screenIds(H_EMPTY), ['entry', 'ovl:start', 'actions']);
    assert.deepEqual(screenIds(undefined), ['entry', 'ovl:start', 'actions']);
  });

  t('is exactly the entry id followed by overlapScreenIds, for every household in the sweep', () => {
    for (const { snap } of sweep()) assert.deepEqual(screenIds(snap), ['entry'].concat(overlapScreenIds(snap)));
  });

  t('ticking policies in Q1 adds the sections that apply, in the catalog order, Q1\'s first; "None of these" leaves only Q1', () => {
    assert.deepEqual(screenIds(H_AUTO_HOME), ['entry', 'ovl:start', 'ovl:auto_gaps', 'ovl:home_exclusions', 'ovl:deductible', 'actions']);
    assert.deepEqual(screenIds(ans(['none'])), ['entry', 'ovl:start', 'actions']);
    assert.deepEqual(screenIds(H_FULL), ['entry'].concat(ALL_SECTION_IDS.map((id) => `ovl:${id}`), ['actions']));
  });

  t('is pure: frozen input is fine, the input is not changed, and a catalog argument is used', () => {
    const frozen = deepFreeze(copy(H_FULL));
    assert.deepEqual(screenIds(frozen), screenIds(H_FULL));
    assert.deepEqual(screenIds(ans(['health']), FIXTURE), ['entry', 'ovl:start', 'ovl:health', 'ovl:core', 'actions']);
  });
});

suite('progressPercent: the bar does not move while Q1 is open, then spreads the rest evenly', (t) => {
  const five = ['entry', 'ovl:start', 'ovl:a', 'ovl:b', 'actions'];

  t('the entry screen and Q1 are at 0, so ticking policies (which changes how many screens follow) cannot make the bar jump', () => {
    for (const ids of [screenIds(H_EMPTY), screenIds(H_AUTO_HOME), screenIds(H_FULL)]) {
      assert.equal(progressPercent(ids, 0), 0);
      assert.equal(progressPercent(ids, 1), 0);
    }
  });

  t('the action list is 100 and the screens between are evenly spread', () => {
    assert.equal(progressPercent(five, 4), 100);
    assert.equal(progressPercent(five, 2), 33.3);
    assert.equal(progressPercent(five, 3), 66.7);
    assert.equal(progressPercent(['entry', 'ovl:start', 'actions'], 2), 100);
  });

  t('rises with every step forward along any path, and stays within 0 to 100', () => {
    for (const { snap } of sweep()) {
      const ids = screenIds(snap);
      let last = -1;
      ids.forEach((_, i) => {
        const pct = progressPercent(ids, i);
        assert.equal(pct >= 0 && pct <= 100, true);
        assert.equal(pct >= last, true, `${i}: ${pct} after ${last}`);
        last = pct;
      });
      assert.equal(last, 100);
    }
  });

  t('copes with out-of-range and malformed input', () => {
    assert.equal(progressPercent(five, -3), 0);
    assert.equal(progressPercent(five, 99), 100);
    assert.equal(progressPercent(five, 1.5), 0);
    assert.equal(progressPercent(five, 'x'), 0);
    assert.equal(progressPercent([], 0), 0);
    assert.equal(progressPercent(['entry'], 0), 0);
    assert.equal(progressPercent(undefined, 2), 0);
  });
});

suite('policiesSummary: what Q1 says, for the "Your policies" panel', (t) => {
  t('nothing answered is not "None of these"', () => {
    assert.deepEqual(policiesSummary({}), { answered: false, none: false, held: [] });
    assert.deepEqual(policiesSummary(null), { answered: false, none: false, held: [] });
  });

  t('"None of these" is answered, holds nothing and is flagged', () => {
    assert.deepEqual(policiesSummary(ans(['none'])), { answered: true, none: true, held: [] });
  });

  t('lists the ticked policies in Q1\'s order with short labels (the option label up to its first comma)', () => {
    const sum = policiesSummary(ans(['phone', 'umbrella', 'auto', 'accidental_death', 'warranty']));
    assert.deepEqual(sum.held.map((p) => p.id), ['auto', 'umbrella', 'phone', 'warranty', 'accidental_death']);
    assert.deepEqual(sum.held.map((p) => p.label), [
      'Auto insurance', 'Umbrella insurance', 'Phone insurance',
      'Extended warranties on electronics or appliances', 'Accidental death coverage',
    ]);
    assert.equal(sum.answered, true);
    assert.equal(sum.none, false);
  });

  t('every Q1 option has a short, comma-free label that reads as a name', () => {
    const q1 = CATALOG.questions.find((q) => q.id === 'policies');
    for (const o of q1.options) {
      if (o.exclusive) continue;
      const label = policiesSummary(ans([o.id])).held[0].label;
      assert.equal(label.length > 0 && label.length <= 50, true, `${o.id}: "${label}"`);
      assert.equal(label.includes(','), false, o.id);
    }
  });

  t('stale and unknown ids are dropped like everywhere else, and ticking none with others keeps only "None of these"', () => {
    assert.deepEqual(policiesSummary(ans(['auto', 'nope'])).held.map((p) => p.id), ['auto']);
    assert.deepEqual(policiesSummary(ans(['auto', 'none'])), { answered: true, none: true, held: [] });
    assert.deepEqual(policiesSummary({ policies: 'auto' }), { answered: false, none: false, held: [] });
  });

  t('is pure: frozen input is fine, and a catalog argument is used', () => {
    assert.deepEqual(policiesSummary(deepFreeze(copy(H_FULL))), policiesSummary(H_FULL));
    assert.deepEqual(policiesSummary(ans(['health']), FIXTURE).held.map((p) => p.id), ['health']);
  });
});

// ---------------------------------------------------------------------------------------------------------
// applyAnswer
// ---------------------------------------------------------------------------------------------------------
suite('applyAnswer: single questions', (t) => {
  t('sets an answer, and a different tap replaces it', () => {
    const first = applyAnswer(H_AUTO_HOME, 'auto_financing', 'loan');
    assert.deepEqual(first, { policies: ['auto', 'home'], auto_financing: 'loan' });
    const second = applyAnswer(first, 'auto_financing', 'lease');
    assert.deepEqual(second, { policies: ['auto', 'home'], auto_financing: 'lease' });
  });

  t('tapping the answer that is already chosen keeps it', () => {
    const snap = { ...H_AUTO_HOME, auto_financing: 'loan' };
    assert.deepEqual(applyAnswer(snap, 'auto_financing', 'loan'), { policies: ['auto', 'home'], auto_financing: 'loan' });
  });

  t('Not sure is an ordinary answer on a single question', () => {
    assert.deepEqual(applyAnswer(H_AUTO_HOME, 'auto_value', 'not_sure'), { policies: ['auto', 'home'], auto_value: 'not_sure' });
  });

  t('keeps the other answers', () => {
    const snap = { ...H_AUTO_HOME, auto_value: '3000_9999', home_sewer_backup: 'no' };
    assert.deepEqual(applyAnswer(snap, 'auto_financing', 'loan'), { policies: ['auto', 'home'], auto_financing: 'loan', auto_value: '3000_9999', home_sewer_backup: 'no' });
  });
});

suite('applyAnswer: Q1 and the other multi questions, with exclusive options', (t) => {
  const apply = (answers, qid, opt) => applyAnswer(answers, qid, opt);

  t('a tap adds an option, a second tap removes it, and an emptied answer is removed entirely', () => {
    const on = apply({}, 'policies', 'travel');
    assert.deepEqual(on, { policies: ['travel'] });
    const off = apply(on, 'policies', 'travel');
    assert.deepEqual(off, {});
    assert.equal(Object.prototype.hasOwnProperty.call(off, 'policies'), false);
  });

  t('the stored order is the option order, whatever order the taps came in', () => {
    const a = apply(apply({}, 'policies', 'phone'), 'policies', 'travel');
    const b = apply(apply({}, 'policies', 'travel'), 'policies', 'phone');
    assert.deepEqual(a, { policies: ['travel', 'phone'] });
    assert.equal(json(a), json(b));
  });

  t('an exclusive option ("None of these") clears the others', () => {
    const picked = apply(apply({}, 'policies', 'travel'), 'policies', 'phone');
    assert.deepEqual(apply(picked, 'policies', 'none'), { policies: ['none'] });
  });

  t('picking another option clears the exclusive one', () => {
    const none = apply({}, 'policies', 'none');
    assert.deepEqual(apply(none, 'policies', 'towing'), { policies: ['towing'] });
  });

  t('tapping an exclusive option again removes it', () => {
    const none = apply({}, 'policies', 'none');
    assert.deepEqual(apply(none, 'policies', 'none'), {});
  });

  t('Not sure on a multi question is exclusive too (roadside sources)', () => {
    const tow = { policies: ['towing'] };
    const club = apply(tow, 'roadside_sources', 'club');
    assert.deepEqual(club, { policies: ['towing'], roadside_sources: ['club'] });
    const card = apply(club, 'roadside_sources', 'card');
    assert.deepEqual(card.roadside_sources, ['club', 'card']);
    const unsure = apply(card, 'roadside_sources', 'not_sure');
    assert.deepEqual(unsure.roadside_sources, ['not_sure']);
    assert.deepEqual(apply(unsure, 'roadside_sources', 'club').roadside_sources, ['club']);
  });

  t('the exclusive card choice ends the card follow-up', () => {
    const answers = { policies: ['rental_car'], cards: ['amex_gold', 'citi_double_cash'], card_usual_payment: 'yes' };
    assert.deepEqual(apply(answers, 'cards', 'other_none'), { policies: ['rental_car'], cards: ['other_none'] });
  });
});

suite('applyAnswer: pruning answers that are no longer asked', (t) => {
  t('changing a gate answer removes the follow-up answers that disappear', () => {
    const snap = ans(['auto', 'home'], { auto_financing: 'loan', auto_gap_coverage: 'no', auto_value: '3000_9999' });
    // paid off: the gap-coverage question is no longer asked, so its answer goes
    assert.deepEqual(applyAnswer(snap, 'auto_financing', 'paid_off'), { policies: ['auto', 'home'], auto_financing: 'paid_off', auto_value: '3000_9999' });
  });

  t('a cheaper car opens the collision question but its answer stays empty until given', () => {
    const snap = ans(['auto'], { auto_financing: 'paid_off', auto_value: '3000_9999', auto_collision: 'yes' });
    // collision was hidden (value over 3,000), so the stale answer is dropped as soon as anything is applied
    assert.deepEqual(applyAnswer(snap, 'auto_rental_reimbursement', 'yes'), { policies: ['auto'], auto_financing: 'paid_off', auto_value: '3000_9999', auto_rental_reimbursement: 'yes' });
    const cheap = applyAnswer(snap, 'auto_value', 'under_3000');
    assert.deepEqual(cheap, { policies: ['auto'], auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'yes' });
  });

  t('unticking a policy removes the answers that only that policy opened', () => {
    const snap = ans(['phone'], { phone_bill_on_card: 'yes', cards: ['amex_gold'], card_usual_payment: 'yes' });
    assert.deepEqual(applyAnswer(snap, 'policies', 'phone'), {});
  });

  t('answers still opened by another policy are kept', () => {
    const snap = ans(['phone', 'travel'], { phone_bill_on_card: 'yes', cards: ['amex_gold'], card_usual_payment: 'yes' });
    // phone goes, travel stays: the phone follow-up goes, the card questions stay (travel is card-linked)
    assert.deepEqual(applyAnswer(snap, 'policies', 'phone'), { policies: ['travel'], cards: ['amex_gold'], card_usual_payment: 'yes' });
  });

  t('uses Q1: umbrella answers survive an unrelated tap while Umbrella is ticked', () => {
    const snap = ans(['auto', 'umbrella'], { umbrella_limit: '1m', auto_liability: 'lower', umbrella_exposure: 'over_3m' });
    assert.deepEqual(applyAnswer(snap, 'auto_liability', '250_500'), { policies: ['auto', 'umbrella'], umbrella_limit: '1m', auto_liability: '250_500', umbrella_exposure: 'over_3m' });
    assert.deepEqual(applyAnswer(snap, 'policies', 'travel'), { policies: ['auto', 'umbrella', 'travel'], umbrella_limit: '1m', auto_liability: 'lower', umbrella_exposure: 'over_3m' });
  });

  t('and drops them when Umbrella is not ticked, or is unticked', () => {
    const snap = ans(['auto'], { umbrella_limit: '1m', auto_liability: 'lower' });
    assert.deepEqual(applyAnswer(snap, 'policies', 'travel'), { policies: ['auto', 'travel'] });
    const held = ans(['auto', 'umbrella'], { umbrella_limit: '1m', auto_liability: 'lower' });
    assert.deepEqual(applyAnswer(held, 'policies', 'umbrella'), { policies: ['auto'] });
    // and ticking it again does not bring the dropped answers back
    assert.deepEqual(applyAnswer(applyAnswer(held, 'policies', 'umbrella'), 'policies', 'umbrella'), { policies: ['auto', 'umbrella'] });
  });

  t('"None of these" in Q1 drops everything that follows', () => {
    const snap = ans(['auto', 'home'], { auto_financing: 'loan', home_sewer_backup: 'no' });
    assert.deepEqual(applyAnswer(snap, 'policies', 'none'), { policies: ['none'] });
  });

  t('an answer to a question that is not asked is not stored', () => {
    assert.deepEqual(applyAnswer(H_EMPTY, 'auto_liability', '100_300'), {}); // no umbrella, no auto
    assert.deepEqual(applyAnswer(H_AUTO_HOME, 'auto_gap_coverage', 'yes'), { policies: ['auto', 'home'] }); // needs a loan or lease first
    assert.deepEqual(applyAnswer(ans(['towing']), 'roadside_sources', 'club'), { policies: ['towing'], roadside_sources: ['club'] });
  });

  t('keys that are not questions never survive', () => {
    const snap = ans(['auto'], { auto_financing: 'loan', mystery: 'x', state: 'CA' });
    const out = applyAnswer(snap, 'auto_value', 'not_sure');
    assert.deepEqual(out, { policies: ['auto'], auto_financing: 'loan', auto_value: 'not_sure' });
    assert.equal(Object.prototype.hasOwnProperty.call(out, 'mystery'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out, 'state'), false);
  });

  t('the result is in catalog order whatever order the answers were given in', () => {
    const snap = ans(['auto']);
    const x = applyAnswer(applyAnswer(snap, 'auto_value', '3000_9999'), 'auto_financing', 'loan');
    const y = applyAnswer(applyAnswer(snap, 'auto_financing', 'loan'), 'auto_value', '3000_9999');
    assert.equal(json(x), json(y));
    assert.deepEqual(Object.keys(x), ['policies', 'auto_financing', 'auto_value']);
  });

  t('stale hidden answers present before the tap are cleaned too', () => {
    const snap = ans(['auto'], { home_sewer_backup: 'yes', auto_financing: 'loan' });
    assert.deepEqual(applyAnswer(snap, 'auto_value', 'not_sure'), { policies: ['auto'], auto_financing: 'loan', auto_value: 'not_sure' });
  });

  t('what applyAnswer returns shows up in the sections', () => {
    let snap = ans(['auto']);
    snap = applyAnswer(snap, 'auto_financing', 'lease');
    const auto = overlapSections(snap).find((s) => s.id === 'auto_gaps');
    assert.equal(auto.questions.find((q) => q.id === 'auto_financing').options.find((o) => o.id === 'lease').selected, true);
    assert.equal(ids(auto.questions).includes('auto_gap_coverage'), true);
    // applying the same tap again is a no-op
    assert.equal(json(applyAnswer(snap, 'auto_financing', 'lease')), json(snap));
  });
});

suite('applyAnswer: random walks through the real wizard', (t) => {
  // A fixed pseudo-random sequence of taps, each on a question and option the sections currently offer. After
  // every tap the stored answers, the sections and the engine must all agree.
  function walk(start, taps, seed) {
    const session = createSession(CATALOG);
    let state = seed;
    const next = (n) => { state = (state * 1664525 + 1013904223) % 4294967296; return state % n; };
    let snap = deepFreeze(copy(start));
    const trail = [];
    for (let i = 0; i < taps; i += 1) {
      const questions = [];
      for (const s of overlapSections(snap)) for (const q of s.questions) questions.push(q);
      const q = questions[next(questions.length)];
      const opt = q.options[next(q.options.length)];
      const before = json(snap);
      const o = applyAnswer(snap, q.id, opt.id);
      assert.equal(json(snap), before, 'the answers were changed');
      trail.push(`${q.id}=${opt.id}`);
      snap = deepFreeze(copy(o));

      const visible = session.visibleQuestions(snap);
      const visibleIds = visible.map((v) => v.id);
      // 1. only valid answers to questions that are asked (Q1, policies, included), in catalog order
      assert.equal(visibleIds[0], 'policies', 'Q1 is always asked, first');
      for (const key of Object.keys(o)) assert.includes(visibleIds, key, `${key} is stored but not asked (after ${trail.join(', ')})`);
      assert.deepEqual(Object.keys(o), visibleIds.filter((id) => Object.prototype.hasOwnProperty.call(o, id)), 'catalog order');
      // 2. the sections show exactly what is stored
      for (const s of overlapSections(snap)) {
        for (const view of s.questions) {
          const stored = o[view.id];
          const shown = view.options.filter((x) => x.selected).map((x) => x.id);
          assert.deepEqual(shown, stored === undefined ? [] : [].concat(stored), `${view.id} after ${trail.join(', ')}`);
          assert.equal(view.answered, stored !== undefined);
        }
      }
      // 3. the tapped option is now shown as chosen, unless it was a multi tap that switched it off or the question closed
      const stillAsked = visibleIds.includes(q.id);
      if (stillAsked && q.kind !== 'multi') assert.equal(o[q.id], opt.id);
      // 4. the screen list follows the sections
      assert.deepEqual(overlapScreenIds(snap), overlapSections(snap).map((s) => `ovl:${s.id}`).concat(['actions']));
      // 5. a single tap repeated changes nothing
      if (q.kind !== 'multi' && stillAsked) assert.equal(json(applyAnswer(snap, q.id, opt.id)), json(o));
      // 6. the action list can be built (and turned into text) for every state the walk reaches, so no flag
      //    throws on a combination a user can really produce
      if (i % 5 === 0) {
        const vm = actionListViewModel(snap);
        const text = actionListText(vm);
        assert.equal(vm.total, vm.groups.reduce((n, g) => n + g.items.length, 0));
        assert.equal(vm.empty, vm.total === 0);
        for (const g of vm.groups) for (const item of g.items) assert.equal(text.includes(item.title), true, `${item.id} missing from the text`);
      }
    }
    return snap;
  }

  const starts = [
    ['everything held', H_FULL],
    ['auto and home', H_AUTO_HOME],
    ['umbrella over auto and home', ans(['auto', 'home', 'umbrella'])],
    ['a parent paying for a student', H_PARENT],
    ['nothing held', H_EMPTY],
  ];
  for (const [name, start] of starts) {
    t(`300 taps from "${name}" keep the answers, sections and engine in step, and replay identically`, () => {
      const first = walk(start, 300, 12345);
      const second = walk(start, 300, 12345);
      assert.equal(json(first), json(second));
    });
  }

  t('different seeds explore different answers (the walk is not a no-op)', () => {
    const a = walk(H_FULL, 120, 1);
    const b = walk(H_FULL, 120, 2);
    assert.equal(json(a) === json(b), false);
    assert.equal(Object.keys(a).length >= 5, true, `walk answered only ${Object.keys(a).length} questions`);
  });
});

suite('applyAnswer: errors, purity and the catalog argument', (t) => {
  t('an unknown question or option id throws', () => {
    assert.throws(() => applyAnswer(H_EMPTY, 'no_such_question', 'yes'), /Unknown question/);
    assert.throws(() => applyAnswer(H_EMPTY, 'policies', 'no_such_option'), /Unknown option/);
    assert.throws(() => applyAnswer(H_EMPTY, 'other_items', 'travel'), /Unknown question/, 'other_items no longer exists');
    assert.throws(() => applyAnswer(H_EMPTY, 'policies', 'renters_with_home'), /Unknown option/, 'nor does its renters tick');
    assert.throws(() => applyAnswer(H_AUTO_HOME, 'auto_value', 'no_such_option'), /Unknown option/);
    assert.throws(() => applyAnswer(H_AUTO_HOME, 'auto_value', undefined), /Unknown option/);
  });

  t('returns a new object and never touches deeply frozen answers', () => {
    const snap = deepFreeze(copy(ans(['auto', 'travel'], { auto_financing: 'loan' })));
    const before = json(snap);
    const out = applyAnswer(snap, 'policies', 'phone');
    assert.equal(json(snap), before);
    assert.notEqual(out, snap);
    assert.deepEqual(out, { policies: ['auto', 'travel', 'phone'], auto_financing: 'loan' });
    out.policies.push('x'); // the result is mutable and shares nothing with the input
    assert.deepEqual(snap.policies, ['auto', 'travel']);
  });

  t('deterministic: the same call twice gives equal results', () => {
    const snap = ans(['auto', 'travel']);
    assert.equal(json(applyAnswer(snap, 'policies', 'phone')), json(applyAnswer(copy(snap), 'policies', 'phone')));
  });

  t('keys that are not questions (a state, a secret) never change the result and are never returned', () => {
    const noisy = { ...H_FULL, state: 'CA', secret: 'x' };
    const out = applyAnswer(noisy, 'policies', 'travel');
    assert.equal(json(out), json(applyAnswer(H_FULL, 'policies', 'travel')));
    assert.equal(Object.prototype.hasOwnProperty.call(out, 'state'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out, 'secret'), false);
    assert.equal(json(applyAnswer({ ...H_FULL, state: 'CA' }, 'policies', 'travel')), json(applyAnswer({ ...H_FULL, state: 'FL' }, 'policies', 'travel')));
  });

  t('copes with missing answers (treated as nothing answered yet)', () => {
    assert.deepEqual(applyAnswer(undefined, 'policies', 'travel'), { policies: ['travel'] });
    assert.deepEqual(applyAnswer({}, 'policies', 'travel'), { policies: ['travel'] });
    assert.deepEqual(applyAnswer(null, 'policies', 'travel'), { policies: ['travel'] });
    assert.deepEqual(applyAnswer({ policies: ['auto'] }, 'auto_value', 'not_sure'), { policies: ['auto'], auto_value: 'not_sure' });
  });

  t('works against another catalog (fixture): multi toggles, exclusive, pruning of dependents', () => {
    const snap = ans(['health']);
    const one = applyAnswer(snap, 'supplements', 'accident', FIXTURE);
    assert.deepEqual(one, { policies: ['health'], supplements: ['accident'] });
    const two = applyAnswer(one, 'supplements', 'critical_illness', FIXTURE);
    assert.deepEqual(two, { policies: ['health'], supplements: ['accident', 'critical_illness'] });
    const cost = applyAnswer(two, 'supplement_cost', 'under_50', FIXTURE);
    assert.deepEqual(cost, { policies: ['health'], supplements: ['accident', 'critical_illness'], supplement_cost: 'under_50' });
    // removing "accident" closes the cost question, so its answer goes
    assert.deepEqual(applyAnswer(cost, 'supplements', 'accident', FIXTURE), { policies: ['health'], supplements: ['critical_illness'] });
    // an exclusive option wins
    assert.deepEqual(applyAnswer(cost, 'supplements', 'none_of_these', FIXTURE), { policies: ['health'], supplements: ['none_of_these'] });
    assert.deepEqual(applyAnswer(cost, 'supplements', 'not_sure', FIXTURE), { policies: ['health'], supplements: ['not_sure'] });
    // unticking Health in Q1 closes the whole branch
    assert.deepEqual(applyAnswer(cost, 'policies', 'health', FIXTURE), {});
  });
});

// ---------------------------------------------------------------------------------------------------------
// actionListViewModel
// ---------------------------------------------------------------------------------------------------------
const FIX_ALL = ans(['auto', 'home', 'health', 'umbrella', 'rental_car', 'phone'], {
  cards: ['card_alpha'],
  umbrella_limit: 'not_sure', auto_liability: '100_300', home_liability: '300k', umbrella_ext_um: 'no',
  supplements: ['accident'], supplement_cost: 'under_50',
});
const ITEM_KEYS = ['id', 'title', 'background', 'ask', 'reason', 'emphasis', 'sources'];
const SOURCE_KEYS = ['publisher', 'title', 'url', 'lastVerified'];
const GROUP_KEYS = ['bucket', 'label', 'description', 'items', 'count'];

suite('actionListViewModel: shape and content (fixture catalog)', (t) => {
  const vm = actionListViewModel(FIX_ALL, FIXTURE);

  t('groups come in the order Raise, Drop, Question, each with a label, description, items and count', () => {
    assert.deepEqual(vm.groups.map((g) => g.bucket), ['raise', 'drop', 'question']);
    assert.deepEqual(vm.groups.map((g) => g.label), ['Raise', 'Drop', 'Question']);
    for (const g of vm.groups) {
      assert.deepEqual(Object.keys(g), GROUP_KEYS);
      assert.equal(g.label, BUCKET_LABELS[g.bucket]);
      assert.equal(g.description, BUCKET_DESCRIPTIONS[g.bucket]);
      assert.equal(g.count, g.items.length);
    }
    assert.deepEqual(vm.groups.map((g) => g.count), [3, 2, 3]);
    assert.equal(vm.total, 8);
    assert.equal(vm.empty, false);
    assert.equal(vm.emptyTitle, null);
    assert.equal(vm.emptyMessage, null);
    assert.deepEqual(Object.keys(vm), ['groups', 'total', 'empty', 'emptyTitle', 'emptyMessage']);
  });

  t('items inside a group are ordered by priority, then id (the engine order)', () => {
    assert.deepEqual(ids(vm.groups[0].items), ['umbrella-um-missing', 'umbrella-auto-below-attach', 'umbrella-home-below-min']);
    assert.deepEqual(ids(vm.groups[1].items), ['card-rental-duplicate', 'phone-insurance-duplicate']);
    assert.deepEqual(ids(vm.groups[2].items), ['umbrella-limit-not-sure', 'supplement-bolt-ons', 'education-hsa']);
  });

  t('an item has exactly the documented fields, with the engine\'s rendered text', () => {
    const item = vm.groups[0].items[1];
    assert.deepEqual(Object.keys(item), ITEM_KEYS);
    assert.equal(item.title, 'Raise your auto liability to match your umbrella');
    assert.equal(item.background, 'Your auto policy pays up to 100/300 before the umbrella steps in, which is below what umbrellas usually require.');
    assert.equal(item.ask, 'Ask your agent what auto limit your umbrella requires, and raise 100/300 to meet it.');
    assert.equal(item.reason, 'My umbrella needs a higher underlying auto limit than 100/300.');
    assert.equal(item.emphasis, 'strong');
    assert.equal(vm.groups[0].items[2].emphasis, 'normal');
  });

  t('sources keep publisher, title, url and last-verified date, in the flag\'s order, and nothing else', () => {
    const two = vm.groups[0].items[2].sources;
    assert.deepEqual(two, [
      { publisher: 'Fixture Publisher One', title: 'Fixture umbrella explainer', url: 'https://example.org/fixtures/umbrella', lastVerified: '2026-10-10' },
      { publisher: 'Fixture Publisher Two', title: 'Fixture consumer guide', url: 'https://example.org/fixtures/consumer-guide', lastVerified: '2026-09-30' },
    ]);
    for (const g of vm.groups) for (const item of g.items) for (const s of item.sources) assert.deepEqual(Object.keys(s), SOURCE_KEYS);
  });

  t('every item has non-empty text and at least one source', () => {
    for (const g of vm.groups) {
      for (const item of g.items) {
        for (const k of ['id', 'title', 'background', 'ask', 'reason']) assert.equal(typeof item[k] === 'string' && item[k].length > 0, true, `${item.id}.${k}`);
        assert.includes(['normal', 'strong'], item.emphasis);
        assert.equal(item.sources.length >= 1, true, `${item.id} needs a source`);
      }
    }
  });

  t('card-aware items carry the engine\'s strong emphasis through', () => {
    const rental = vm.groups[1].items[0];
    assert.equal(rental.emphasis, 'strong');
    assert.equal(rental.background, 'Your auto policy and Fixture Card Alpha may already cover a rental car.');
  });
});

suite('actionListViewModel: groups, counts and the empty state', (t) => {
  t('a bucket with no items has no group at all (nothing is shown as "all clear")', () => {
    const vm = actionListViewModel(ans(['health']), FIXTURE);
    assert.deepEqual(vm.groups.map((g) => g.bucket), ['question']);
    assert.deepEqual(ids(vm.groups[0].items), ['education-hsa']);
    assert.equal(vm.total, 1);
    assert.equal(vm.empty, false);
  });

  t('no flags at all is the honest empty state: no groups, total 0, and a message that does not say all is well', () => {
    const vm = actionListViewModel(H_EMPTY, FIXTURE);
    assert.deepEqual(vm, { groups: [], total: 0, empty: true, emptyTitle: EMPTY_TITLE, emptyMessage: EMPTY_MESSAGE });
  });

  t('empty and total agree, and groups are exactly the non-empty buckets, for the whole sweep (real catalog)', () => {
    let step = 0;
    for (const { snap } of sweep()) {
      step += 1;
      if (step % 16 !== 1) continue; // every 16th household keeps the run short; flags are slow to build
      const vm = actionListViewModel(snap);
      const results = evaluate(snap);
      const expected = ['raise', 'drop', 'question'].filter((b) => results.flags[b].length > 0);
      assert.deepEqual(vm.groups.map((g) => g.bucket), expected);
      assert.equal(vm.total, vm.groups.reduce((n, g) => n + g.count, 0));
      assert.equal(vm.empty, vm.total === 0);
      assert.equal(vm.emptyMessage === null, !vm.empty);
    }
  });

  t('the real catalog: every item mirrors the engine result field for field', () => {
    for (const snap of [H_EMPTY, H_AUTO_HOME, H_HEALTH, H_FULL, { ...H_FULL, umbrella_limit: '1m', auto_liability: 'lower', umbrella_min_auto: '250_500', home_liability: 'not_sure', umbrella_exposure: 'over_3m' }]) {
      const vm = actionListViewModel(snap);
      const results = evaluate(snap);
      for (const g of vm.groups) {
        assert.deepEqual(ids(g.items), ids(results.flags[g.bucket]));
        g.items.forEach((item, i) => {
          const f = results.flags[g.bucket][i];
          assert.deepEqual(Object.keys(item), ITEM_KEYS);
          for (const k of ['id', 'title', 'background', 'ask', 'reason', 'emphasis']) assert.equal(item[k], f[k], `${f.id}.${k}`);
          assert.deepEqual(item.sources, f.sources.map((s) => ({ publisher: s.publisher, title: s.title, url: s.url, lastVerified: s.lastVerified })));
          assert.equal(item.sources.length >= 1, true);
        });
      }
    }
  });

  t('a household that gives the umbrella flags something to say gets a Raise group first', () => {
    const snap = ans(['auto', 'home', 'umbrella'], { umbrella_limit: '1m', auto_liability: 'lower', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '500k' });
    const vm = actionListViewModel(snap);
    assert.equal(vm.empty, false);
    assert.equal(vm.groups[0].bucket, 'raise');
    assert.equal(vm.groups[0].items.length >= 1, true);
  });

  t('answers that were pruned (stale) do not produce items', () => {
    // a Raise for the home limit needs an umbrella; with Umbrella not ticked in Q1 the stale answers are ignored
    const stale = ans(['home'], { umbrella_limit: '1m', home_liability: 'lower', umbrella_min_home: '500k' });
    const clean = ans(['home']);
    assert.equal(json(actionListViewModel(stale)), json(actionListViewModel(clean)));
  });
});

suite('actionListViewModel: purity and determinism', (t) => {
  t('same answers, same view-model, byte for byte', () => {
    assert.equal(json(actionListViewModel(FIX_ALL, FIXTURE)), json(actionListViewModel(copy(FIX_ALL), FIXTURE)));
    assert.equal(json(actionListViewModel(H_FULL)), json(actionListViewModel(copy(H_FULL))));
  });

  t('does not mutate deeply frozen answers', () => {
    const frozen = deepFreeze(copy(FIX_ALL));
    const before = json(frozen);
    const vm = actionListViewModel(frozen, FIXTURE);
    assert.equal(json(frozen), before);
    assert.equal(vm.total, 8);
  });

  t('returns fresh objects: editing a result changes nothing later', () => {
    const first = actionListViewModel(FIX_ALL, FIXTURE);
    first.groups[0].items[0].title = 'changed';
    first.groups[0].items[0].sources.pop();
    first.groups.pop();
    first.total = 0;
    const second = actionListViewModel(FIX_ALL, FIXTURE);
    assert.notEqual(second.groups[0].items[0].title, 'changed');
    assert.equal(second.groups.length, 3);
    assert.equal(second.total, 8);
  });

  t('does not hand out the engine\'s or the catalog\'s own objects', () => {
    const vm = actionListViewModel(FIX_ALL, FIXTURE);
    vm.groups[0].items[2].sources[0].url = 'https://changed.example/';
    assert.equal(FIXTURE.sources['fixture-iii'].url, 'https://example.org/fixtures/umbrella');
    assert.equal(actionListViewModel(FIX_ALL, FIXTURE).groups[0].items[2].sources[0].url, 'https://example.org/fixtures/umbrella');
  });

  t('reads only the answers to questions, never a state or any other key', () => {
    const log = [];
    actionListViewModel(recordReads({ ...FIX_ALL, state: 'CA' }, log), FIXTURE);
    const top = log.filter((k) => !k.includes('.') && !k.includes('#'));
    const questionIds = FIXTURE.questions.map((q) => q.id);
    for (const k of top) assert.includes(questionIds, k, `unexpected read of answers.${k}`);
    assert.equal(top.includes('state'), false);
    assert.equal(json(actionListViewModel({ ...FIX_ALL, state: 'CA' }, FIXTURE)), json(actionListViewModel({ ...FIX_ALL, state: 'MN' }, FIXTURE)));
  });

  t('the order of the answer keys does not change the result', () => {
    const reversed = Object.keys(FIX_ALL).reverse().reduce((acc, k) => { acc[k] = FIX_ALL[k]; return acc; }, {});
    assert.equal(json(actionListViewModel(reversed, FIXTURE)), json(actionListViewModel(FIX_ALL, FIXTURE)));
  });
});

// ---------------------------------------------------------------------------------------------------------
// actionListText
// ---------------------------------------------------------------------------------------------------------
const DATE = /\b\d{4}-\d{2}-\d{2}\b/;

suite('actionListText: the clipboard text', (t) => {
  const vm = actionListViewModel(FIX_ALL, FIXTURE);
  const text = actionListText(vm);
  const lines = text.split('\n');

  t('opens with a header line that says the list is informational and not advice', () => {
    assert.equal(lines[0], TEXT_HEADLINE);
    assert.match(lines[0], /informational/i);
    assert.match(lines[0], /not insurance advice/i);
    assert.equal(lines[1], INFO_NOTE);
  });

  t('does not say when it was generated: no date outside the sources\' last-verified dates, no "generated"', () => {
    const stripped = text.replace(/\(last verified \d{4}-\d{2}-\d{2}\)/g, '');
    assert.equal(DATE.test(stripped), false, 'a stray date');
    assert.equal(/\b(19|20)\d\d\b/.test(stripped), false, 'a stray year');
    assert.equal(/generated|created on|printed|today|as of/i.test(text), false);
    assert.equal(/\d{1,2}:\d{2}/.test(text), false, 'a time of day');
  });

  t('is deterministic: the same view-model always gives the same text', () => {
    assert.equal(actionListText(vm), text);
    assert.equal(actionListText(actionListViewModel(copy(FIX_ALL), FIXTURE)), text);
    assert.equal(actionListText(JSON.parse(JSON.stringify(vm))), text);
  });

  t('lists the groups in order with their counts, then each item in view-model order', () => {
    const at = (needle) => {
      const i = text.indexOf(needle);
      assert.equal(i >= 0, true, `missing: ${needle}`);
      return i;
    };
    const order = [at('RAISE (3)'), at('DROP (2)'), at('QUESTION (3)')];
    assert.equal(order[0] < order[1] && order[1] < order[2], true);
    for (const g of vm.groups) {
      let last = at(`${g.label.toUpperCase()} (${g.count})`);
      g.items.forEach((item, i) => {
        const here = at(`${i + 1}. ${item.title}`);
        assert.equal(here > last, true, `${item.id} out of order`);
        last = here;
      });
    }
    assert.match(text, /^Items: 8 \(Raise 3, Drop 2, Question 3\)$/m);
  });

  t('each item has its title, why it matters, what to ask, what to say ("Say this") and its source, in that order', () => {
    for (const g of vm.groups) {
      for (const item of g.items) {
        const start = text.indexOf(`. ${item.title}\n`);
        assert.equal(start >= 0, true, `${item.id} title`);
        const marks = ['Why it matters: ' + item.background, 'What to ask: ' + item.ask, 'Say this: ' + item.reason];
        let from = start;
        for (const mark of marks) {
          const i = text.indexOf(mark, from);
          assert.equal(i > from, true, `${item.id}: "${mark}" missing or out of order`);
          from = i;
        }
        const first = item.sources[0];
        const src = item.sources.length === 1 ? 'Source: ' : 'Sources:\n- ';
        const i = text.indexOf(`${src}${first.publisher}, "${first.title}", ${first.url} (last verified ${first.lastVerified})`, from);
        assert.equal(i > from, true, `${item.id} source line`);
        for (const s of item.sources) {
          assert.equal(text.includes(`${s.publisher}, "${s.title}", ${s.url} (last verified ${s.lastVerified})`), true, `${item.id}: ${s.url}`);
        }
      }
    }
  });

  t('marks stronger items with the higher-priority line, and only those', () => {
    const strong = vm.groups.reduce((n, g) => n + g.items.filter((i) => i.emphasis === 'strong').length, 0);
    assert.equal(strong, 2);
    assert.equal(lines.filter((l) => l === EMPHASIS_LABEL).length, strong);
    // the line sits directly under the item's title
    const i = lines.indexOf('1. Ask to add uninsured motorist coverage to your umbrella');
    assert.equal(lines[i + 1].startsWith('Why it matters:'), true);
    const j = lines.indexOf('2. Raise your auto liability to match your umbrella');
    assert.equal(lines[j + 1], EMPHASIS_LABEL);
  });

  t('plain text: unix newlines, no trailing spaces, no trailing newline, no markup', () => {
    assert.equal(text.includes('\r'), false);
    assert.equal(text, text.trimEnd());
    for (const line of lines) assert.equal(line, line.trimEnd(), `trailing space: "${line}"`);
    assert.equal(/\n{3,}/.test(text), false, 'at most one blank line in a row');
    assert.equal(/[<>*#]|\{\{|\}\}/.test(text), false);
  });

  t('a hand-built view-model renders in the documented layout (pins the format)', () => {
    const hand = {
      groups: [
        {
          bucket: 'raise', label: 'Raise', description: 'Limits that look too low.', count: 1,
          items: [{
            id: 'x', title: 'Raise X', background: 'Because X.', ask: 'Ask about X.', reason: 'I need X.', emphasis: 'strong',
            sources: [{ publisher: 'Pub One', title: 'Title One', url: 'https://example.org/one', lastVerified: '2026-01-02' }],
          }],
        },
        {
          bucket: 'question', label: 'Question', description: 'Things to ask.', count: 1,
          items: [{
            id: 'y', title: 'Ask Y', background: 'Because Y.', ask: 'Ask about Y.', reason: 'I wonder about Y.', emphasis: 'normal',
            sources: [
              { publisher: 'Pub Two', title: 'Title Two', url: 'https://example.org/two', lastVerified: '2026-03-04' },
              { publisher: 'Pub Three', title: 'Title Three', url: 'https://example.org/three', lastVerified: '2026-05-06' },
            ],
          }],
        },
      ],
      total: 2, empty: false, emptyTitle: null, emptyMessage: null,
    };
    const expected = [
      TEXT_HEADLINE,
      INFO_NOTE,
      '',
      'Items: 2 (Raise 1, Question 1)',
      '',
      'RAISE (1)',
      'Limits that look too low.',
      '',
      '1. Raise X',
      EMPHASIS_LABEL,
      'Why it matters: Because X.',
      'What to ask: Ask about X.',
      'Say this: I need X.',
      'Source: Pub One, "Title One", https://example.org/one (last verified 2026-01-02)',
      '',
      'QUESTION (1)',
      'Things to ask.',
      '',
      '1. Ask Y',
      'Why it matters: Because Y.',
      'What to ask: Ask about Y.',
      'Say this: I wonder about Y.',
      'Sources:',
      '- Pub Two, "Title Two", https://example.org/two (last verified 2026-03-04)',
      '- Pub Three, "Title Three", https://example.org/three (last verified 2026-05-06)',
    ].join('\n');
    assert.equal(actionListText(hand), expected);
    assert.equal(actionListText(deepFreeze(copy(hand))), expected, 'a frozen view-model is fine');
  });

  t('works on the real catalog\'s view-model too, with every item and source present', () => {
    const real = actionListViewModel(ans(['auto', 'home', 'umbrella'], {
      umbrella_limit: '1m', auto_liability: 'lower', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '500k',
    }));
    const out = actionListText(real);
    assert.equal(real.total >= 1, true);
    for (const g of real.groups) {
      for (const item of g.items) {
        for (const part of [item.title, item.background, item.ask, item.reason]) assert.equal(out.includes(part), true, `${item.id} text missing`);
        for (const s of item.sources) assert.equal(out.includes(s.url) && out.includes(s.lastVerified), true, `${item.id} source missing`);
      }
    }
    assert.equal(out, actionListText(real));
  });
});

suite('actionListText: the honest empty state', (t) => {
  const vm = actionListViewModel(H_EMPTY, FIXTURE);
  const text = actionListText(vm);

  t('says nothing was flagged, why that is not good news by itself, and who can review the real policies', () => {
    assert.equal(vm.empty, true);
    assert.deepEqual(text.split('\n'), [TEXT_HEADLINE, INFO_NOTE, '', EMPTY_TITLE, EMPTY_MESSAGE]);
    assert.match(EMPTY_TITLE, /did not find anything to flag/i);
    assert.match(EMPTY_MESSAGE, /does not mean/i);
    assert.match(EMPTY_MESSAGE, /skipped|Not sure/i);
    assert.match(EMPTY_MESSAGE, /your state's department of insurance/);
  });

  t('never claims everything is fine', () => {
    const claims = /everything is (fine|ok|okay)|all (good|clear|set)|you(?:'| a)re (fully |well |completely )?(covered|protected|set)|no (gaps|problems|issues|overlaps)|nothing (to worry|wrong with)|you are good|looks good|all clear|in good shape|well covered|fully covered|adequate/i;
    assert.equal(claims.test(EMPTY_TITLE), false);
    assert.equal(claims.test(EMPTY_MESSAGE), false);
    assert.equal(claims.test(text), false);
  });

  t('has no groups, counts or item lines', () => {
    assert.equal(/RAISE|DROP|QUESTION \(|Items:|Why it matters|What to ask|Say this/.test(text), false);
  });

  t('is deterministic and stays plain text', () => {
    assert.equal(actionListText(actionListViewModel(copy(H_EMPTY), FIXTURE)), text);
    assert.equal(text, text.trimEnd());
    assert.equal(text.includes('\r'), false);
  });

  t('the empty state of the real catalog (when nothing fires) uses the same wording', () => {
    const real = actionListViewModel(H_EMPTY);
    if (!real.empty) return; // a future flag may fire with no answers; then there is no empty state to check
    assert.equal(real.emptyTitle, EMPTY_TITLE);
    assert.equal(real.emptyMessage, EMPTY_MESSAGE);
    assert.equal(actionListText(real), text);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The module's own wording
// ---------------------------------------------------------------------------------------------------------
suite('viewModel: the module\'s own user-facing wording', (t) => {
  const STATES = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington state|west virginia|wisconsin|wyoming)\b/i;
  const BANNED = /home equity|next screen|generic pattern|todo|tbd|lorem|\{\{|\}\}|\u2014|\u2013/i;
  const copyStrings = [
    ['TEXT_HEADLINE', TEXT_HEADLINE], ['INFO_NOTE', INFO_NOTE], ['EMPTY_TITLE', EMPTY_TITLE], ['EMPTY_MESSAGE', EMPTY_MESSAGE],
    ['EMPHASIS_LABEL', EMPHASIS_LABEL],
    ...Object.keys(BUCKET_LABELS).map((k) => [`BUCKET_LABELS.${k}`, BUCKET_LABELS[k]]),
    ...Object.keys(BUCKET_DESCRIPTIONS).map((k) => [`BUCKET_DESCRIPTIONS.${k}`, BUCKET_DESCRIPTIONS[k]]),
  ];

  t('the bucket labels and descriptions cover exactly raise, drop and question', () => {
    assert.deepEqual(Object.keys(BUCKET_LABELS), ['raise', 'drop', 'question']);
    assert.deepEqual(Object.keys(BUCKET_DESCRIPTIONS), ['raise', 'drop', 'question']);
    assert.deepEqual(Object.keys(BUCKET_LABELS).map((k) => BUCKET_LABELS[k]), ['Raise', 'Drop', 'Question']);
  });

  t('plain ASCII, no state named, no dashes or placeholders, no template leftovers', () => {
    for (const [name, text] of copyStrings) {
      assert.equal(typeof text === 'string' && text.length > 0, true, name);
      assert.equal(/^[\x20-\x7E]+$/.test(text), true, `${name} has a non-ASCII or control character`);
      assert.equal(STATES.test(text), false, `${name} names a state`);
      assert.equal(BANNED.test(text), false, `${name} has banned wording`);
    }
  });

  t('the informational note says what the SPEC and the handoff require', () => {
    assert.match(INFO_NOTE, /not insurance advice/i);
    assert.match(INFO_NOTE, /not a licensed agent or broker/i);
    assert.match(INFO_NOTE, /answers you gave/i);
    assert.match(TEXT_HEADLINE, /informational/i);
  });

  t('descriptions use plain second-person wording and are short', () => {
    for (const k of Object.keys(BUCKET_DESCRIPTIONS)) {
      assert.equal(BUCKET_DESCRIPTIONS[k].length <= 120, true, `${k} description is long`);
    }
    assert.equal(INFO_NOTE.length <= 320, true, 'the note stays short');
    assert.equal(EMPTY_MESSAGE.length <= 460, true, 'the empty message stays short');
  });
});
