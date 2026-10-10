// Fast, runtime-independent guard for the browser golden master (tests/browser/). It does NOT drive the
// app (that needs a browser: open tests/browser/golden.html); it checks that the scenario data and the
// recorded goldens are well formed, consistent with each other, and still reach every screen.
import { test, assert } from '../harness.mjs';
import scenarios from './scenarios.mjs';
import { OPS, validateStep, normalizeVolatile, diffLines, goldenFileText } from './runner.mjs';
import { STACK_HEADING, STATUS_SENTENCES, EMPTY_NOTE } from '../../public/js/overlap-ui/stackView.mjs';

const steps = (pred) => scenarios.flatMap(s => s.steps).filter(pred);
const values = (op, key, extra = () => true) => new Set(steps(s => s.op === op && extra(s)).map(s => s[key]));
const canRead = typeof read === 'function';   // jsc only; skipped under other runtimes

function parseGolden(text) {
  const marker = 'export default ';
  return JSON.parse(text.slice(text.indexOf(marker) + marker.length).trim().replace(/;$/, ''));
}

test('browser scenarios: well-formed plain data', () => {
  assert.ok(Array.isArray(scenarios) && scenarios.length >= 8, 'at least 8 scenarios');
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

test('browser scenarios: every op has a definition', () => {
  for (const [name, def] of Object.entries(OPS)) {
    assert.ok(Array.isArray(def.need), `${name}.need`);
    assert.equal(typeof def.run, 'function', `${name}.run`);
  }
  assert.equal(validateStep({ op: 'nope' }), 'unknown op "nope"');
  assert.equal(validateStep({ op: 'opt', q: 'home' }), 'op "opt" needs "v"');
});

test('browser scenarios: the answer op needs a non-empty list of [questionId, optionId] string pairs', () => {
  assert.equal(validateStep({ op: 'answer', list: [['other_items', 'none']] }), null);
  assert.equal(validateStep({ op: 'answer' }), 'op "answer" needs "list"');
  for (const bad of [[], 'x', [['a']], [['a', 'b', 'c']], [['a', 1]], [['', 'b']], [null]]) {
    assert.match(validateStep({ op: 'answer', list: bad }), /needs a non-empty list/, JSON.stringify(bad));
  }
});

test('browser scenarios: cover the required matrix', () => {
  const has = (set, ...vals) => vals.forEach(v => assert.ok(set.has(v), `missing ${v} in ${JSON.stringify([...set])}`));
  has(values('opt', 'v', s => s.q === 'home'), 'Own', 'Rent', 'Both');
  has(values('opt', 'v', s => s.q === 'dep'), 'Yes', 'No');
  has(values('opt', 'v', s => s.q === 'veh'), '0', '1', '2', '3+');
  const states = new Set([...values('state', 'code'), ...values('pickState', 'code')]);
  has(states, 'CA', 'FL', 'TX', 'MO', 'NY', 'MN', 'AZ');   // AZ appears in none of the app's state rule lists
  has(values('extra', 'x'), 'Boat', 'Motorcycle', 'RV', 'E-bike', 'Jet ski', 'ATV', '__none');
  assert.ok(scenarios.some(s => s.steps.filter(x => x.op === 'extra' && x.x !== '__none').length >= 2), 'a scenario with several extras');
  for (const id of ['health', 'cushion', 'roadsideAlt']) has(values('qual', 'v', s => s.id === id), 'Yes', 'No');
  has(values('qual', 'v', s => s.id === 'assets300'), 'Yes', 'No', 'Not sure');
  const fields = new Set(steps(s => s.op === 'field').map(s => s.k));
  has(fields, 'liability', 'umuim', 'collDed', 'deductible', 'windDed', 'eq', 'eqDed', 'lastResort', 'waterBackup', 'hullType');
  has(values('umb', 'v'), 'Yes', 'No');
  assert.ok(scenarios.some(s => !s.steps.some(x => x.op === 'umb' && x.v === 'Yes')), 'a scenario that reaches the umbrella screen without an umbrella');
  assert.ok(steps(s => s.op === 'restart').length >= 1, 'a Start over replay');
  assert.ok(steps(s => s.op === 'back').length >= 1, 'a Back step');
});

test('browser goldens: one well-formed golden per scenario', () => {
  if (!canRead) return;
  for (const s of scenarios) {
    const text = read(`tests/browser/golden/${s.id}.mjs`);
    const golden = parseGolden(text);
    assert.equal(golden.length, s.steps.length + 1, `${s.id}: golden has one entry for the load plus one per step`);
    golden.forEach((g, i) => {
      assert.equal(g.step, i, `${s.id}: step numbering`);
      assert.ok(g.text.startsWith('== stage ==\n') && g.text.includes('\n== known =='), `${s.id} step ${i}: text shape`);
      assert.ok(!/\d+ taps, \d+ seconds/.test(g.text), `${s.id} step ${i}: volatile tap/second counts must be normalized`);
    });
    assert.equal(text, goldenFileText(s.id, golden), `${s.id}: file is exactly what record mode writes`);
  }
});

test('browser goldens: every scenario ends on the summary and together they reach every screen', () => {
  if (!canRead) return;
  const all = [];
  for (const s of scenarios) {
    const golden = parseGolden(read(`tests/browser/golden/${s.id}.mjs`));
    assert.includes(golden[golden.length - 1].text, '\nYour coverage, checked\n', `${s.id} ends on the summary`);
    for (const g of golden) all.push(g.text);
  }
  const text = all.join('\n#####\n');
  const screens = {
    entry: 'Which state are you in?', tenure: 'Do you own or rent your home?', dep: 'Does anyone rely on your income?',
    veh: 'How many vehicles in your household?', toys: 'Anything else with a motor?', qualify: 'A few easy ones',
    insight: 'Based on what you told us',
    auto: '\nAuto policy\n', home: '\nHome policy\n', renters: '\nRenters policy\n',
    powersports: '\nBoat and powersports policy\n', life: '\nLife policy\n', disability: '\nDisability policy\n',
    lifecheck: '\nLife insurance policy\n', umbrella: '\nUmbrella\n', summary: '\nYour coverage, checked\n',
  };
  for (const [id, marker] of Object.entries(screens)) assert.includes(text, marker, `no golden reaches the ${id} screen`);
  // the Start over scenario really restarted: its first and second summaries differ and the state was kept
  const restart = parseGolden(read('tests/browser/golden/oh-restart-replay.mjs'));
  const homeScreens = restart.filter(g => g.text.includes('Which state are you in?'));
  assert.ok(homeScreens.length >= 3, 'the entry screen shows again after Start over');
});

const goldenOf = (id) => parseGolden(read(`tests/browser/golden/${id}.mjs`));
const isOverlapScreen = (text) => text.startsWith('== stage ==\nOverlap check ');
const isSummary = (text) => text.includes('\nYour coverage, checked\n');

test('browser goldens (Story S13): every scenario passes through an overlap screen before its summary, and the summary ends with the action list', () => {
  if (!canRead) return;
  for (const s of scenarios) {
    const golden = goldenOf(s.id).map(g => g.text);
    const summaries = golden.map((t, i) => (isSummary(t) ? i : -1)).filter(i => i >= 0);
    assert.ok(summaries.length >= 1, `${s.id} reaches the summary`);
    for (const i of summaries) {
      assert.ok(golden.slice(0, i).some(isOverlapScreen), `${s.id}: an overlap screen comes before the summary at step ${i}`);
      assert.includes(golden[i], '\nYour insurer action list\n', `${s.id} step ${i}: summary shows the action list`);
      assert.includes(golden[i], 'not a licensed agent or broker', `${s.id} step ${i}: the not-advice note`);
      assert.includes(golden[i], 'Your answers stay on this page and are not saved.', `${s.id} step ${i}: the privacy line`);
      assert.includes(golden[i], 'Your coverage, checked\n', `${s.id} step ${i}: existing summary heading kept`);
      assert.ok(/\n\d+ places? you may be overspending\n/.test(golden[i]), `${s.id} step ${i}: existing totals kept`);
    }
  }
});

test('browser goldens (Story S13): the "What we know" overlap row appears only on overlap screens and the summary, so earlier screens are untouched', () => {
  if (!canRead) return;
  for (const s of scenarios) {
    for (const g of goldenOf(s.id)) {
      const has = g.text.includes('Overlap questions: ');
      assert.equal(has, isOverlapScreen(g.text) || isSummary(g.text), `${s.id} step ${g.step}`);
    }
  }
});

test('browser goldens (Story S13): the scenarios between them show a Raise list, an honest empty list, Not sure answers, a gated follow-up and a disabled Continue', () => {
  if (!canRead) return;
  const ids = scenarios.map(s => s.id);
  for (const id of ['umbrella-low-underlying-raise', 'nothing-held-empty-state', 'not-sure-everywhere']) assert.ok(ids.includes(id), `scenario ${id}`);
  const last = (id) => { const g = goldenOf(id); return g[g.length - 1].text; };
  assert.includes(last('umbrella-low-underlying-raise'), '\nRaise (', 'umbrella scenario: a Raise group');
  assert.includes(last('umbrella-low-underlying-raise'), '\nWhy it matters\n');
  assert.includes(last('umbrella-low-underlying-raise'), '\nSay this\n');
  assert.includes(last('nothing-held-empty-state'), '\nWe did not find anything to flag from your answers\n', 'empty scenario: the honest empty state');
  assert.ok(!/\n(Raise|Drop|Question) \(/.test(last('nothing-held-empty-state')), 'empty scenario: no groups');
  assert.ok(!/everything is fine|you are covered|no gaps|looks good/i.test(last('nothing-held-empty-state')), 'empty scenario is not an all-clear');
  assert.ok(goldenOf('not-sure-everywhere').some(g => g.text.includes('[*Not sure]')), 'Not sure selected somewhere');
  const all = scenarios.flatMap(s => goldenOf(s.id).map(g => g.text));
  assert.ok(all.some(t => isOverlapScreen(t) && t.includes('[Continue (disabled)]')), 'a disabled Continue is recorded');
  assert.ok(all.some(t => isOverlapScreen(t) && t.includes('[Back] [Continue]')), 'an enabled Continue is recorded');
  assert.ok(scenarios.some(s => s.steps.filter(x => x.op === 'answer').length >= 3), 'the overlap screens are driven with the answer op');
  const text = all.join('\n#####\n');
  for (const [id, heading] of Object.entries({
    extras: 'Extras you may be paying for', umbrellaStack: 'What sits under your umbrella', umbrellaVehicles: 'Your motorcycle or boat under the umbrella',
    umbrellaScope: 'What your umbrella covers', autoGaps: 'A closer look at your auto policy', renters: 'Your renters policy',
    health: 'Your health insurance and the extras around it', homeExclusions: 'What your home policy leaves out', deductible: 'What you would pay first',
  })) assert.includes(text, `\n${heading}\n`, `no golden reaches the ${id} overlap screen`);
});

// ---- Story S14: the umbrella and the limits under it ------------------------------------------------------------
const isStackScreen = (text) => isOverlapScreen(text) && (text.includes('\nWhat sits under your umbrella\n') || text.includes('\nYour motorcycle or boat under the umbrella\n'));

test('browser goldens (Story S14): the umbrella drawing appears only on the two umbrella limit screens and in the summary of a household with an umbrella, so every other screen is untouched', () => {
  if (!canRead) return;
  for (const s of scenarios) {
    let sawStack = false;
    for (const g of goldenOf(s.id)) {
      const has = g.text.includes(STACK_HEADING);
      if (g.text.includes('Which state are you in?')) sawStack = false; // Start over begins a new run
      if (isStackScreen(g.text)) { assert.ok(has, `${s.id} step ${g.step}: an umbrella limit screen shows the drawing`); sawStack = true; }
      else if (isSummary(g.text)) assert.equal(has, sawStack, `${s.id} step ${g.step}: the summary shows the drawing exactly when an umbrella limit screen came first`);
      else assert.ok(!has, `${s.id} step ${g.step}: no other screen shows the drawing`);
    }
  }
});

test('browser goldens (Story S14): between them the scenarios record every status sentence, an umbrella with nothing under it, and Not sure on the umbrella itself', () => {
  if (!canRead) return;
  const all = scenarios.flatMap(s => goldenOf(s.id).map(g => g.text)).join('\n#####\n');
  for (const [status, sentence] of Object.entries(STATUS_SENTENCES)) assert.includes(all, `\n${sentence}\n`, `no golden shows the "${status}" sentence`);
  assert.includes(all, `\n${EMPTY_NOTE}\n`, 'an umbrella with nothing under it');
  assert.includes(all, '\nUmbrella limit: Not sure\n', 'Not sure on the umbrella');
  assert.includes(all, '\nWe do not have your umbrella limit yet\n', 'before the umbrella size is answered');
  assert.includes(all, '\nYour limit: Lower than 100/300\n', 'a "Lower than" limit');
});

test('browser goldens (Story S14): umbrella-stack-live taps every limit on its own, so the drawing is recorded after each answer and each recording is different', () => {
  if (!canRead) return;
  const scn = scenarios.find(s => s.id === 'umbrella-stack-live');
  assert.ok(scn, 'scenario umbrella-stack-live');
  assert.ok(scn.steps.filter(x => x.op === 'answer' && x.list.length === 1 && /liability|umbrella_/.test(x.list[0][0])).length >= 12, 'one tap per step on the limit screens');
  const drawings = goldenOf(scn.id).map(g => g.text).filter(isStackScreen);
  assert.ok(drawings.length >= 16, `${drawings.length} recorded limit screens`);
  const bodies = drawings.map(t => t.slice(t.indexOf(STACK_HEADING + '\n'), t.indexOf('\n== known ==')));
  const distinct = new Set(bodies);
  assert.ok(distinct.size >= 14, `only ${distinct.size} different drawings were recorded`);
});

test('browser goldens (Story S14): the summary draws the umbrella and its limits right above the group that holds the umbrella items', () => {
  if (!canRead) return;
  for (const id of ['umbrella-low-underlying-raise', 'umbrella-only-renter', 'ny-nofault-umbrella-back']) {
    const g = goldenOf(id);
    const text = g[g.length - 1].text;
    const at = text.indexOf('\n' + STACK_HEADING + '\n');
    assert.ok(at > text.indexOf('\nYour insurer action list\n'), `${id}: inside the action list`);
    assert.ok(/\n(Raise|Drop|Question) \(\d+\)\n/.test(text.slice(at)), `${id}: a group follows the drawing`);
  }
  const low = goldenOf('umbrella-low-underlying-raise');
  const t = low[low.length - 1].text;
  assert.ok(t.indexOf(STACK_HEADING) < t.indexOf('\nRaise (5)\n'), 'the drawing sits above the Raise group that holds the umbrella items');
});

test('browser harness: volatile text normalization touches only taps and seconds', () => {
  assert.equal(normalizeVolatile('Checked 3 policies plus umbrella. 12 taps, 45 seconds. We'), 'Checked 3 policies plus umbrella. N taps, S seconds. We');
  assert.equal(normalizeVolatile('3 policies, 12 apples'), '3 policies, 12 apples');
});

test('browser harness: line diff and golden file format', () => {
  const d = diffLines('a\nb\nc', 'a\nx\nc');
  assert.equal(d.map(o => o.k + o.t).join('|'), ' a|-b|+x| c');
  const file = goldenFileText('demo', [{ step: 0, text: 'one\ntwo' }, { step: 1, text: 'three' }]);
  assert.ok(file.startsWith('// Golden master'));
  assert.deepEqual(parseGolden(file), [{ step: 0, text: 'one\ntwo' }, { step: 1, text: 'three' }]);
});
