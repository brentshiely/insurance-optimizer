// Fast, runtime-independent guard for the browser golden master (tests/browser/). It does NOT drive the
// app (that needs a browser: open tests/browser/golden.html); it checks that the scenario data and the
// recorded goldens are well formed, consistent with each other and with the real question catalog, that between
// them they reach every screen, every question and every Q1 policy, and that no screen of the retired prototype
// has come back.
import { test, assert } from '../harness.mjs';
import scenarios from './scenarios.mjs';
import { OPS, validateStep, diffLines, goldenFileText } from './runner.mjs';
import { QUESTIONS, SECTIONS } from '../../public/js/overlap/data/questions/index.mjs';
import { POLICY_IDS } from '../../public/js/overlap/engine/constants.mjs';
import { STACK_HEADING, STATUS_SENTENCES, EMPTY_NOTE } from '../../public/js/overlap-ui/stackView.mjs';
import { ENTRY_HEADING, NEEDS_HINT_Q1 } from '../../public/js/overlap-ui/screens.mjs';
import { EMPTY_TITLE } from '../../public/js/overlap-ui/viewModel.mjs';

const canRead = typeof read === 'function';   // jsc only; skipped under other runtimes
const steps = (pred) => scenarios.flatMap(s => s.steps).filter(pred);
const byId = (id) => scenarios.find(s => s.id === id);
const policyTaps = (scn) => scn.steps.filter(s => s.op === 'policies').flatMap(s => s.ids);
const answerPairs = (scn) => scn.steps.filter(s => s.op === 'answer').flatMap(s => s.list);

function parseGolden(text) {
  const marker = 'export default ';
  return JSON.parse(text.slice(text.indexOf(marker) + marker.length).trim().replace(/;$/, ''));
}
const goldenOf = (id) => parseGolden(read(`tests/browser/golden/${id}.mjs`));
const lastText = (id) => { const g = goldenOf(id); return g[g.length - 1].text; };
const stageOf = (text) => text.slice(text.indexOf('== stage ==\n') + 12, text.indexOf('\n== known =='));
const knownOf = (text) => text.slice(text.indexOf('\n== known ==\n') + 13, text.indexOf('\n== progress =='));
const progressOf = (text) => Number(text.slice(text.indexOf('\n== progress ==\n') + 16).replace('%', ''));
const isEntry = (text) => stageOf(text).startsWith(ENTRY_HEADING + '\n');
const isQ1 = (text) => stageOf(text).startsWith('Step 1\nYour policies\n');
const isQuestionScreen = (text) => /^Step \d+( of \d+)?\n/.test(stageOf(text));
const isActions = (text) => stageOf(text).startsWith('Your insurer action list\n');

// ---- the scenario data ----------------------------------------------------------------------------------------------
test('browser scenarios: well-formed plain data, at least 12', () => {
  assert.ok(Array.isArray(scenarios) && scenarios.length >= 12, 'at least 12 scenarios');
  const ids = new Set();
  for (const s of scenarios) {
    assert.match(s.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `scenario id ${s.id}`);
    assert.ok(!ids.has(s.id), `duplicate scenario id ${s.id}`);
    ids.add(s.id);
    assert.ok(typeof s.title === 'string' && s.title.length > 10, `${s.id} needs a title`);
    assert.ok(Array.isArray(s.steps) && s.steps.length > 0, `${s.id} needs steps`);
    s.steps.forEach((st, i) => assert.equal(validateStep(st), null, `${s.id} step ${i + 1}`));
    assert.equal(JSON.stringify(JSON.parse(JSON.stringify(s))), JSON.stringify(s), `${s.id} is plain JSON data`);
  }
});

test('browser scenarios: the ops are exactly the ones the new flow has, each with a definition', () => {
  assert.deepEqual(Object.keys(OPS).sort(), ['answer', 'back', 'click', 'next', 'policies', 'restart']);
  for (const [name, def] of Object.entries(OPS)) {
    assert.ok(Array.isArray(def.need), `${name}.need`);
    assert.equal(typeof def.run, 'function', `${name}.run`);
  }
  assert.equal(validateStep({ op: 'nope' }), 'unknown op "nope"');
  assert.equal(validateStep({ op: 'click' }), 'op "click" needs "sel"');
  for (const gone of ['state', 'pickState', 'opt', 'extra', 'qual', 'field', 'umb', 'scan', 'set']) {
    assert.equal(validateStep({ op: gone }), `unknown op "${gone}"`, `${gone} belonged to the prototype`);
  }
});

test('browser scenarios: the answer and policies ops need non-empty lists of strings', () => {
  assert.equal(validateStep({ op: 'answer', list: [['auto_value', 'not_sure']] }), null);
  assert.equal(validateStep({ op: 'answer' }), 'op "answer" needs "list"');
  for (const bad of [[], 'x', [['a']], [['a', 'b', 'c']], [['a', 1]], [['', 'b']], [null]]) {
    assert.match(validateStep({ op: 'answer', list: bad }), /needs a non-empty list/, JSON.stringify(bad));
  }
  assert.equal(validateStep({ op: 'policies', ids: ['none'] }), null);
  assert.equal(validateStep({ op: 'policies' }), 'op "policies" needs "ids"');
  for (const bad of [[], 'auto', [1], [''], [null], {}]) {
    assert.match(validateStep({ op: 'policies', ids: bad }), /needs a non-empty list of policy ids/, JSON.stringify(bad));
  }
});

test('browser scenarios: every tap names a real question and one of its options (or Not sure where offered)', () => {
  const byQ = new Map(QUESTIONS.map(q => [q.id, q]));
  const check = (scn, qid, oid) => {
    const q = byQ.get(qid);
    assert.ok(q, `${scn.id}: unknown question ${qid}`);
    const valid = q.options.map(o => o.id).concat(q.allowNotSure ? ['not_sure'] : []);
    assert.ok(valid.includes(oid), `${scn.id}: ${qid} has no option ${oid} (${valid.join(', ')})`);
  };
  for (const scn of scenarios) {
    for (const id of policyTaps(scn)) check(scn, 'policies', id);
    for (const [qid, oid] of answerPairs(scn)) check(scn, qid, oid);
    for (const [qid] of answerPairs(scn)) assert.notEqual(qid, 'policies', `${scn.id}: Q1 is tapped with the policies op`);
  }
});

test('browser scenarios: nothing from the prototype is left to drive (no state, own/rent, dependents, vehicles, sample numbers, files)', () => {
  const text = JSON.stringify(scenarios);
  assert.equal(/data-state|data-umb|data-qual|data-x\b|"field"|"scan"|"pickState"|"extra"|"qual"/.test(text), false);
  assert.equal(/"(Own|Rent|Both|Yes|No)"|"3\+"|assets300|roadsideAlt|"cushion"/.test(text), false);
});

test('browser scenarios: cover the required matrix of households', () => {
  const ids = scenarios.map(s => s.id);
  // nothing held: Q1 answered with None of these, then the list
  assert.ok(ids.includes('nothing-held') && policyTaps(byId('nothing-held')).slice(-1)[0] === 'none');
  // each of the 13 policies on its own
  for (const p of POLICY_IDS) {
    const solo = scenarios.filter(s => { const t = policyTaps(s); return t.length === 1 && t[0] === p; });
    assert.ok(solo.length >= 1, `a scenario with ${p} as the only policy`);
  }
  const sameSet = (scn, list) => { const t = [...new Set(policyTaps(scn))].sort(); return JSON.stringify(t) === JSON.stringify([...list].sort()); };
  assert.ok(sameSet(byId('auto-home'), ['auto', 'home']), 'auto + home');
  for (const id of ['umbrella-low-limits', 'umbrella-matching-limits', 'umbrella-high-limits']) assert.ok(sameSet(byId(id), ['auto', 'home', 'umbrella']), `${id}: auto + home + umbrella`);
  assert.ok(sameSet(byId('moto-boat-umbrella'), ['motorcycle', 'boat', 'umbrella']), 'motorcycle + boat + umbrella');
  assert.ok(sameSet(byId('renters-college-child'), ['home', 'renters']) && answerPairs(byId('renters-college-child')).some(([q, o]) => q === 'renters_for' && o === 'child_away'), 'a parent paying for a student\'s renters policy');
  const health = byId('health-supplemental-hsa');
  for (const o of ['accident', 'critical_illness', 'hospital_indemnity', 'cancer']) assert.ok(answerPairs(health).some(([q, v]) => q === 'health_supplemental' && v === o), `bolt-on ${o}`);
  assert.ok(answerPairs(health).some(([q, v]) => q === 'health_hsa' && v === 'hdhp_hsa'), 'an HSA');
  assert.ok(sameSet(byId('other-bucket-all'), ['rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death']), 'every Other-bucket item');
  assert.ok(sameSet(byId('everything-ticked'), POLICY_IDS), 'all thirteen at once');
  // limits below, at and above what the umbrella asks for
  const pair = (id, a, b) => { const p = answerPairs(byId(id)); return [p.find(x => x[0] === a)[1], p.find(x => x[0] === b)[1]]; };
  assert.deepEqual(pair('umbrella-low-limits', 'auto_liability', 'umbrella_min_auto'), ['lower', '250_500']);
  assert.deepEqual(pair('umbrella-matching-limits', 'auto_liability', 'umbrella_min_auto'), ['250_500', '250_500']);
  assert.deepEqual(pair('umbrella-high-limits', 'auto_liability', 'umbrella_min_auto'), ['500_500', '100_300']);
  // the special flows
  assert.ok(steps(s => s.op === 'restart').length >= 1, 'a Start over replay');
  const change = byId('change-q1-after-back').steps.map(s => s.op);
  const firstBack = change.indexOf('back');
  assert.ok(firstBack > 0 && change.slice(firstBack).includes('policies'), 'Q1 is changed after going Back');
  const nsAnswers = answerPairs(byId('not-sure-everywhere')).filter(([, o]) => o === 'not_sure');
  assert.ok(nsAnswers.length >= 25, `Not sure is tapped ${nsAnswers.length} times`);
});

test('browser scenarios: between them they tap every question of the catalog, every Q1 option and every ladder rung of the limit questions', () => {
  const tapped = new Set(scenarios.flatMap(s => answerPairs(s).map(([q]) => q)));
  for (const q of QUESTIONS) if (q.id !== 'policies') assert.ok(tapped.has(q.id), `no scenario answers ${q.id}`);
  const q1 = QUESTIONS.find(q => q.id === 'policies');
  const ticked = new Set(scenarios.flatMap(policyTaps));
  for (const o of q1.options) assert.ok(ticked.has(o.id), `no scenario taps ${o.id} in Q1`);
  const options = (qid) => new Set(scenarios.flatMap(s => answerPairs(s)).filter(([q]) => q === qid).map(([, o]) => o));
  for (const qid of ['auto_liability', 'home_liability', 'umbrella_limit', 'umbrella_exposure', 'deductible_auto', 'emergency_cushion', 'auto_financing', 'auto_value']) {
    const q = QUESTIONS.find(x => x.id === qid);
    for (const o of q.options) assert.ok(options(qid).has(o.id), `no scenario picks ${qid} = ${o.id}`);
  }
});

// ---- the recorded goldens ---------------------------------------------------------------------------------------------
test('browser goldens: one well-formed golden per scenario, byte for byte what record mode writes, and none left over', () => {
  if (!canRead) return;
  for (const s of scenarios) {
    const text = read(`tests/browser/golden/${s.id}.mjs`);
    const golden = parseGolden(text);
    assert.equal(golden.length, s.steps.length + 1, `${s.id}: golden has one entry for the load plus one per step`);
    golden.forEach((g, i) => {
      assert.equal(g.step, i, `${s.id}: step numbering`);
      assert.ok(g.text.startsWith('== stage ==\n') && g.text.includes('\n== known ==\n') && /\n== progress ==\n\d+(\.\d)?%$/.test(g.text), `${s.id} step ${i}: text shape`);
    });
    assert.equal(text, goldenFileText(s.id, golden), `${s.id}: file is exactly what record mode writes`);
  }
});

test('browser goldens: every scenario starts on the entry screen, goes to Q1 first, and ends on the insurer action list', () => {
  if (!canRead) return;
  for (const s of scenarios) {
    const g = goldenOf(s.id).map(x => x.text);
    assert.ok(isEntry(g[0]), `${s.id}: the first screen is the entry screen`);
    assert.ok(stageOf(g[0]).includes('[Get started]'), `${s.id}: entry has Get started`);
    assert.ok(isQ1(g[1]), `${s.id}: Get started leads to Q1 and nothing else`);
    assert.includes(g[1], '\nWhich policies do you have?\n', `${s.id}: Q1 is asked`);
    assert.ok(isActions(g[g.length - 1]), `${s.id}: ends on the insurer action list`);
    assert.includes(g[g.length - 1], 'not a licensed agent or broker', `${s.id}: the not-advice note`);
    assert.includes(g[g.length - 1], 'Your answers stay on this page and are not saved.', `${s.id}: the privacy line`);
    assert.includes(g[g.length - 1], '[Back] [Start over]', `${s.id}: Back and Start over under the list`);
  }
});

test('browser goldens: Q1 lists the SPEC options in the SPEC order, then None of these, and Continue waits for an answer', () => {
  if (!canRead) return;
  const q1 = QUESTIONS.find(q => q.id === 'policies');
  const text = stageOf(goldenOf('nothing-held')[1].text);
  const buttons = Array.from(text.matchAll(/\[(\*?)([^\]]+)\]/g)).map(m => m[2]);
  assert.deepEqual(buttons, q1.options.map(o => o.label).concat(['Back', 'Continue (disabled)']));
  assert.includes(text, NEEDS_HINT_Q1);
  // the SPEC's Q1 order (docs/SPEC.md: Auto, Home, Renters, Umbrella, Health, the vehicles it names later, then the Other bucket)
  assert.deepEqual(q1.options.map(o => o.id), ['auto', 'home', 'renters', 'umbrella', 'health', 'motorcycle', 'boat', 'rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death', 'none']);
});

test('browser goldens: the "Your policies" panel follows Q1 on every screen', () => {
  if (!canRead) return;
  for (const s of scenarios) {
    const g = goldenOf(s.id);
    assert.equal(knownOf(g[0].text), 'Nothing ticked yet', `${s.id}: nothing ticked on the entry screen`);
    assert.equal(knownOf(g[1].text), 'Nothing ticked yet', `${s.id}: nothing ticked on a fresh Q1`);
  }
  const g = goldenOf('only-auto').map(x => knownOf(x.text));
  assert.equal(g[2], 'Auto insurance');
  assert.equal(g[g.length - 1], 'Auto insurance');
  assert.equal(knownOf(lastText('nothing-held')), 'None of these');
  assert.equal(knownOf(lastText('everything-ticked')).split('\n').length, 13, 'all thirteen policies are listed');
});

test('browser goldens: the progress bar stays at 0 on the entry screen and Q1, ends at 100 on the list, and never goes backwards except through Back or Start over', () => {
  if (!canRead) return;
  for (const s of scenarios) {
    const g = goldenOf(s.id);
    assert.equal(progressOf(g[0].text), 0, `${s.id}: entry`);
    assert.equal(progressOf(g[1].text), 0, `${s.id}: Q1`);
    for (const x of g) if (isQ1(x.text)) assert.equal(progressOf(x.text), 0, `${s.id} step ${x.step}: Q1 is always 0 (ticking changes how many screens follow)`);
    assert.equal(progressOf(g[g.length - 1].text), 100, `${s.id}: the list`);
    g.forEach((x, i) => {
      if (i === 0) return;
      const op = s.steps[i - 1].op;
      if (op === 'back' || op === 'restart') return;
      assert.ok(progressOf(x.text) >= progressOf(g[i - 1].text), `${s.id} step ${i}: progress went backwards on ${op}`);
    });
  }
});

test('browser goldens: no screen of the retired prototype is recorded anywhere', () => {
  if (!canRead) return;
  const forbidden = [
    'Which state are you in', 'Choose a state', 'Do you own or rent your home?', 'Does anyone rely on your income?', 'How many vehicles in your household?',
    'Anything else with a motor?', 'A few easy ones', 'Based on what you told us', 'Your coverage, checked', 'overspending', 'Paying twice', 'Underprotected',
    'Looks right', 'Prototype', 'sample numbers', 'Editable', 'Take a photo', 'Choose a file', 'Add a real declarations page', 'telemetry', 'What we know',
    'Overlap check', 'Overlap questions', 'Extras you may be paying for', 'taps,',
  ];
  for (const s of scenarios) {
    for (const g of goldenOf(s.id)) for (const word of forbidden) assert.ok(!g.text.includes(word), `${s.id} step ${g.step} mentions "${word}"`);
  }
});

test('browser goldens: the honest empty list for nothing held, with no all-clear wording and no Copy or Print', () => {
  if (!canRead) return;
  for (const id of ['nothing-held', 'only-motorcycle', 'only-boat']) {
    const text = lastText(id);
    if (id === 'nothing-held') assert.includes(text, `\n${EMPTY_TITLE}\n`, 'empty scenario: the honest empty state');
    if (text.includes(EMPTY_TITLE)) {
      assert.ok(!/\n(Raise|Drop|Question) \(/.test(text), `${id}: no groups`);
      assert.ok(!text.includes('[Copy my list]') && !text.includes('[Print my list]'), `${id}: nothing to copy or print`);
      assert.ok(!/everything is fine|you are covered|no gaps|looks good/i.test(text), `${id} is not an all-clear`);
    }
  }
});

test('browser goldens: the scenarios between them show every group, a disabled and an enabled Continue, Not sure, and a half-answered screen that a tap completes', () => {
  if (!canRead) return;
  const all = scenarios.flatMap(s => goldenOf(s.id).map(g => g.text));
  const qs = all.filter(isQuestionScreen);
  assert.ok(qs.some(t => t.includes('[Continue (disabled)]')), 'a disabled Continue is recorded');
  assert.ok(qs.some(t => t.includes('[Back] [Continue]')), 'an enabled Continue is recorded');
  assert.ok(qs.some(t => t.includes('[*Not sure]')), 'Not sure selected somewhere');
  const text = all.filter(isActions).join('\n#####\n');
  for (const g of ['Raise', 'Drop', 'Question']) assert.ok(new RegExp(`\\n${g} \\(\\d+\\)\\n`).test(text), `a ${g} group is recorded`);
  assert.includes(text, '[Copy my list] [Print my list]');
  // a gated follow-up: tapping one answer opens the next question, and the screen before the tap does not have it
  const gap = goldenOf('only-auto');
  assert.ok(!gap[3].text.includes('Do you have gap coverage on that car?') && gap[4].text.includes('Do you have gap coverage on that car?'), 'a loan opens the gap question');
});

test('browser goldens: every question section of the flow is recorded, with its title and its "Step N of M" eyebrow', () => {
  if (!canRead) return;
  const all = scenarios.flatMap(s => goldenOf(s.id).map(g => g.text));
  const screens = all.filter(isQuestionScreen).map(stageOf);
  for (const sec of SECTIONS) {
    const seen = screens.filter(t => t.split('\n')[1] === sec.title);
    assert.ok(seen.length > 0, `no golden reaches the "${sec.title}" screen`);
    for (const t of seen) assert.ok(sec.id === 'start' ? t.startsWith('Step 1\n') : /^Step ([2-9]|1\d) of \d+\n/.test(t), `${sec.id}: eyebrow`);
  }
});

// ---- the stale-answer and Start over scenarios -----------------------------------------------------------------------------
test('browser goldens: changing Q1 after Back drops the answers to questions that closed, keeps the ones that stayed, and does not bring dropped ones back', () => {
  if (!canRead) return;
  const scn = byId('change-q1-after-back');
  const g = goldenOf(scn.id).map(x => x.text);
  const at = (n) => g[n];
  // before Back: the umbrella answers are selected on the umbrella screen
  const umbrellaScreens = g.filter(t => isQuestionScreen(t) && stageOf(t).includes('\nWhat sits under your umbrella\n'));
  assert.ok(umbrellaScreens.some(t => t.includes('[*$1 million]') && t.includes('[*250/500]')), 'the first umbrella answers were selected');
  // the Q1 change: umbrella unticked and home ticked, so the panel shows Auto and Homeowners but not Umbrella
  const i = scn.steps.findIndex((s, k) => s.op === 'policies' && scn.steps.slice(0, k).some(x => x.op === 'back'));
  const afterChange = knownOf(at(i + 1));
  assert.includes(afterChange, 'Auto insurance');
  assert.includes(afterChange, 'Homeowners insurance');
  assert.ok(!afterChange.includes('Umbrella insurance'), 'umbrella unticked');
  // the screen after it is auto, not umbrella: the umbrella screens are gone
  assert.includes(at(i + 2), '\nA closer look at your auto policy\n');
  // auto answers survive a second Q1 change that keeps auto
  const j = scn.steps.findIndex((s, k) => k > i && s.op === 'policies');
  assert.includes(at(j + 2), '\nWhat sits under your umbrella\n');   // j + 1 is Q1 with the umbrella ticked again, j + 2 is the screen after it
  assert.ok(!at(j + 2).includes('[*'), 'ticking the umbrella again does not bring the old umbrella answers back: nothing is selected');
  assert.includes(at(j + 2), '[Continue (disabled)]');
  const autoAgain = g.filter(t => isQuestionScreen(t) && stageOf(t).includes('\nA closer look at your auto policy\n'));
  assert.ok(autoAgain.length >= 2 && autoAgain[autoAgain.length - 1].includes('[*No, I own it outright]') && autoAgain[autoAgain.length - 1].includes('[Back] [Continue]'), 'the auto answers were kept and the screen is complete');
});

test('browser goldens: Start over clears Q1, the panel and the progress, and the second run starts from a blank Q1', () => {
  if (!canRead) return;
  const scn = byId('start-over');
  const g = goldenOf(scn.id);
  const r = scn.steps.findIndex(s => s.op === 'restart') + 1;
  assert.ok(isActions(g[r - 1].text), 'Start over is pressed on the list');
  assert.ok(isEntry(g[r].text), 'Start over shows the entry screen again');
  assert.equal(knownOf(g[r].text), 'Nothing ticked yet');
  assert.equal(progressOf(g[r].text), 0);
  assert.ok(isQ1(g[r + 1].text) && !g[r + 1].text.includes('[*'), 'the second Q1 has nothing ticked');
  assert.notEqual(stageOf(g[r - 1].text), stageOf(g[g.length - 1].text), 'the two lists differ');
  assert.ok(isActions(g[g.length - 1].text));
});

// ---- the umbrella drawing ----------------------------------------------------------------------------------------------
const isStackScreen = (text) => isQuestionScreen(text) && (stageOf(text).includes('\nWhat sits under your umbrella\n') || stageOf(text).includes('\nYour motorcycle or boat under the umbrella\n'));

test('browser goldens (liability stack): the drawing appears only on the two umbrella limit screens and in the list of a household with an umbrella', () => {
  if (!canRead) return;
  for (const s of scenarios) {
    const holdsUmbrella = policyTaps(s).includes('umbrella');
    let sawStack = false;
    goldenOf(s.id).forEach((g, i) => {
      const has = g.text.includes(STACK_HEADING);
      if (isEntry(g.text)) sawStack = false; // Start over begins a new run
      if (isStackScreen(g.text)) { assert.ok(has, `${s.id} step ${g.step}: an umbrella limit screen shows the drawing`); sawStack = true; }
      else if (isActions(g.text)) assert.equal(has, sawStack, `${s.id} step ${g.step}: the list shows the drawing exactly when an umbrella limit screen came first`);
      else assert.ok(!has, `${s.id} step ${g.step}: no other screen shows the drawing`);
    });
    if (!holdsUmbrella) assert.equal(sawStack, false, `${s.id}: no umbrella, no drawing`);
  }
});

test('browser goldens (liability stack): between them the scenarios record every status sentence, an umbrella with nothing under it, Not sure on the umbrella, and a "Lower than" limit', () => {
  if (!canRead) return;
  const all = scenarios.flatMap(s => goldenOf(s.id).map(g => g.text)).join('\n#####\n');
  for (const [status, sentence] of Object.entries(STATUS_SENTENCES)) assert.includes(all, `\n${sentence}\n`, `no golden shows the "${status}" sentence`);
  assert.includes(all, `\n${EMPTY_NOTE}\n`, 'an umbrella with nothing under it');
  assert.includes(all, '\nUmbrella limit: Not sure\n', 'Not sure on the umbrella');
  assert.includes(all, '\nWe do not have your umbrella limit yet\n', 'before the umbrella size is answered');
  assert.includes(all, '\nYour limit: Lower than 100/300\n', 'a "Lower than" limit');
});

test('browser goldens (liability stack): in the list the drawing sits inside the action list, right above the group that holds the umbrella items', () => {
  if (!canRead) return;
  for (const id of ['umbrella-low-limits', 'umbrella-matching-limits', 'umbrella-high-limits', 'only-umbrella']) {
    const text = lastText(id);
    const at = text.indexOf('\n' + STACK_HEADING + '\n');
    assert.ok(at > text.indexOf('\nYour insurer action list\n'), `${id}: inside the action list`);
    assert.ok(/\n(Raise|Drop|Question) \(\d+\)\n/.test(text.slice(at)), `${id}: a group follows the drawing`);
  }
  const t = lastText('umbrella-low-limits');
  assert.ok(t.indexOf(STACK_HEADING) < t.indexOf('\nRaise ('), 'the drawing sits above the Raise group that holds the umbrella items');
});

// ---- the harness itself --------------------------------------------------------------------------------------------------
test('browser harness: line diff and golden file format', () => {
  const d = diffLines('a\nb\nc', 'a\nx\nc');
  assert.equal(d.map(o => o.k + o.t).join('|'), ' a|-b|+x| c');
  const file = goldenFileText('demo', [{ step: 0, text: 'one\ntwo' }, { step: 1, text: 'three' }]);
  assert.ok(file.startsWith('// Golden master'));
  assert.deepEqual(parseGolden(file), [{ step: 0, text: 'one\ntwo' }, { step: 1, text: 'three' }]);
});
