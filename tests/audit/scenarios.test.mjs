// Story S12: the scenario matrix and its snapshots.
//
//   * the matrix itself: enough scenarios, plain data, each one exactly what the page could hold and complete;
//   * determinism: every scenario evaluated twice is deep-equal, whatever the key order, with frozen inputs, and nothing
//     leaks between calls;
//   * snapshots: scenario-flags (which items each scenario shows) and scenario-texts (every distinct wording, in full)
//     compared with what the engine produces now. A mismatch means the engine, the catalog or the copy changed: read the
//     difference, and if it is intended run scripts/update-snapshots.sh (tests/snapshots/README.md).
//
// Pure data checks; runs under jsc and Node.
import { suite, assert, assertSnapshot, serialize } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { evaluate } from '../../public/js/overlap/engine/evaluate.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import SCENARIOS from '../scenarios/scenarios.mjs';
import { buildScenarioFlags, buildScenarioTexts } from '../snapshots/builders/scenarios.mjs';
import FLAGS_SNAPSHOT from '../snapshots/scenario-flags.snap.mjs';
import TEXTS_SNAPSHOT from '../snapshots/scenario-texts.snap.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';
import { scenarioRuns } from './corpus.mjs';

const MIN_SCENARIOS = 40;
const session = createSession(CATALOG);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// True for data the page could have produced by JSON: strings, arrays and plain objects only.
function isPlainData(v) {
  if (typeof v === 'string') return true;
  if (Array.isArray(v)) return v.every(isPlainData);
  if (v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) return Object.keys(v).every((k) => isPlainData(v[k]));
  return false;
}

// assertSnapshot over a snapshot whose entries are keyed by name (`scenarios` or `texts`), but showing only the entries that
// differ, so a one-word copy change prints one entry instead of the whole file.
function assertSnapshotByKey(actual, expected, field, label) {
  const a = actual[field];
  const e = expected[field];
  const changed = Array.from(new Set(Object.keys(a).concat(Object.keys(e)))).filter((key) => serialize(a[key]) !== serialize(e[key])).sort();
  const pick = (source) => changed.reduce((out, key) => { if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key]; return out; }, {});
  assertSnapshot(pick(a), pick(e), `${label}: ${changed.length} ${field} entries differ (${changed.slice(0, 8).join(', ')}${changed.length > 8 ? ', ...' : ''})`);
  assertSnapshot({ ...actual, [field]: {} }, { ...expected, [field]: {} }, label);
}

suite('scenario matrix', (t) => {
  t(`there are at least ${MIN_SCENARIOS} scenarios and their ids are unique kebab-case`, () => {
    assert.ok(SCENARIOS.length >= MIN_SCENARIOS, `only ${SCENARIOS.length} scenarios`);
    const ids = SCENARIOS.map((s) => s.id);
    for (const id of ids) assert.match(id, KEBAB, `scenario id "${id}"`);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(dupes, [], 'duplicate scenario ids');
  });

  t('a scenario is exactly { id, answers } and answers is plain data with Q1 (policies) as an array', () => {
    for (const s of SCENARIOS) {
      assert.deepEqual(Object.keys(s).sort(), ['answers', 'id'], `${s.id} keys`);
      assert.ok(isPlainData(s.answers), `${s.id}: answers must be plain data (strings, arrays, plain objects)`);
      assert.ok(Array.isArray(s.answers.policies) && s.answers.policies.length > 0, `${s.id}: answers.policies must be a non-empty array`);
    }
  });

  t('every scenario holds exactly what the page could hold: nothing is pruned, nothing is out of order', () => {
    for (const s of SCENARIOS) {
      // prune() drops unknown ids, answers to hidden questions and wrong shapes, and puts a multi answer in the question's option order.
      assertSnapshot(session.prune(s.answers), s.answers, `${s.id} (what the page would keep)`);
    }
  });

  t('every scenario answers every question its ticks make visible (Continue is disabled until a screen is complete)', () => {
    for (const run of scenarioRuns()) {
      const unanswered = run.result.meta.visibleQuestionIds.filter((qid) => !Object.prototype.hasOwnProperty.call(run.answers, qid));
      assert.deepEqual(unanswered, [], `${run.id}: visible but unanswered`);
      assert.equal(run.result.meta.answeredCount, run.result.meta.visibleQuestionIds.length, `${run.id}: answeredCount`);
    }
  });

  t('"None of these" holds nothing at all: the empty result, with the one question answered', () => {
    const run = scenarioRuns().find((r) => r.id === 'nothing-held');
    assert.ok(run, 'a scenario named nothing-held exists');
    assert.deepEqual(run.answers, { policies: ['none'] });
    assert.deepEqual(run.result.flags, { raise: [], drop: [], question: [] });
    assert.equal(run.result.stack, null);
    assert.deepEqual(run.result.meta.visibleQuestionIds, ['policies']);
  });
});

suite('determinism', (t) => {
  t('each scenario evaluated twice gives deep-equal results', () => {
    for (const s of SCENARIOS) assert.deepEqual(evaluate(s.answers), evaluate(s.answers), s.id);
  });

  t('the same answers in another key order, and Q1 ticked in another order, give the same result', () => {
    for (const s of SCENARIOS) {
      const reversed = {};
      for (const key of Object.keys(s.answers).reverse()) {
        reversed[key] = key === 'policies' ? s.answers.policies.slice().reverse() : s.answers[key];
      }
      assert.deepEqual(evaluate(reversed), evaluate(s.answers), `${s.id}: key order or tick order changed the result`);
    }
  });

  t('evaluating deep-frozen answers works and does not change them', () => {
    for (const s of SCENARIOS) {
      const frozen = deepFreeze(copy(s.answers));
      const result = evaluate(frozen);
      assert.deepEqual(frozen, s.answers, `${s.id}: answers were changed`);
      assert.deepEqual(result, evaluate(s.answers), `${s.id}: frozen input changed the result`);
    }
  });

  t('results are fresh: changing one result does not change the next evaluation', () => {
    for (const s of SCENARIOS) {
      const before = evaluate(s.answers);
      const spoiled = evaluate(s.answers);
      for (const bucket of ['raise', 'drop', 'question']) {
        for (const flag of spoiled.flags[bucket]) { flag.title = 'changed'; flag.sources.length = 0; flag.sources.push('junk'); }
      }
      spoiled.flags.raise.length = 0;
      spoiled.meta.visibleQuestionIds.length = 0;
      if (spoiled.stack) spoiled.stack.layers.length = 0;
      assert.deepEqual(evaluate(s.answers), before, `${s.id}: a mutated result leaked into a later evaluation`);
    }
  });

  t('items come out in the documented order: bucket, then priority, then id', () => {
    const priority = new Map(CATALOG.flags.map((f) => [f.id, typeof f.priority === 'number' ? f.priority : 100]));
    for (const run of scenarioRuns()) {
      for (const bucket of ['raise', 'drop', 'question']) {
        const list = run.result.flags[bucket];
        for (let i = 1; i < list.length; i++) {
          const a = list[i - 1];
          const b = list[i];
          const ordered = priority.get(a.id) < priority.get(b.id) || (priority.get(a.id) === priority.get(b.id) && a.id < b.id);
          assert.ok(ordered, `${run.id}: ${a.id} before ${b.id} in ${bucket}`);
        }
        for (const f of list) assert.equal(f.bucket, bucket, `${run.id}: ${f.id} is in the wrong bucket`);
      }
    }
  });
});

suite('scenario snapshots', (t) => {
  t('scenario-flags: which items every scenario shows is unchanged (scripts/update-snapshots.sh scenario-flags)', () => {
    assertSnapshotByKey(buildScenarioFlags(), FLAGS_SNAPSHOT, 'scenarios', 'scenario-flags');
  });

  t('scenario-texts: every distinct wording the scenarios reach is unchanged (scripts/update-snapshots.sh scenario-texts)', () => {
    assertSnapshotByKey(buildScenarioTexts(), TEXTS_SNAPSHOT, 'texts', 'scenario-texts');
  });

  t('the snapshots hold every scenario and a wording for everything they point at, and nothing else', () => {
    const recorded = Object.keys(FLAGS_SNAPSHOT.scenarios);
    assert.deepEqual(recorded.slice().sort(), SCENARIOS.map((s) => s.id).sort(), 'scenario-flags must list exactly the scenarios');
    const versions = Object.keys(TEXTS_SNAPSHOT.texts);
    assert.ok(versions.length > 0, 'scenario-texts is empty');
    const pointedAt = new Set();
    for (const id of recorded) {
      for (const bucket of ['raise', 'drop', 'question']) {
        for (const entry of FLAGS_SNAPSHOT.scenarios[id][bucket]) {
          const key = entry.replace(/ \(strong\)$/, '');
          pointedAt.add(key);
          assert.ok(TEXTS_SNAPSHOT.texts[key], `${id} points at ${key}, which scenario-texts does not hold`);
          assert.equal(TEXTS_SNAPSHOT.texts[key].bucket, bucket, `${id}: ${key} is in the wrong bucket`);
          assert.equal(entry.endsWith(' (strong)'), TEXTS_SNAPSHOT.texts[key].emphasis === 'strong', `${id}: ${key} emphasis marker`);
        }
      }
    }
    assert.deepEqual(versions.filter((k) => !pointedAt.has(k)), [], 'wordings no scenario shows');
  });

  t('every flag in the catalog has at least one full wording in scenario-texts, with all four text parts and a source', () => {
    const recordedFlags = new Set(Object.keys(TEXTS_SNAPSHOT.texts).map((k) => k.split('@')[0]));
    assert.deepEqual(CATALOG.flags.map((f) => f.id).filter((id) => !recordedFlags.has(id)), [], 'flags with no recorded wording');
    for (const key of Object.keys(TEXTS_SNAPSHOT.texts)) {
      const w = TEXTS_SNAPSHOT.texts[key];
      for (const part of ['title', 'background', 'ask', 'reason']) assert.ok(typeof w[part] === 'string' && w[part].trim().length > 0, `${key}.${part} is empty`);
      assert.ok(Array.isArray(w.sources) && w.sources.length >= 1, `${key} has no source`);
    }
  });

  t('the snapshots were not shrunk: the same breadth as the matrix', () => {
    assert.ok(Object.keys(FLAGS_SNAPSHOT.scenarios).length >= MIN_SCENARIOS);
    let shown = 0;
    for (const id of Object.keys(FLAGS_SNAPSHOT.scenarios)) {
      const s = FLAGS_SNAPSHOT.scenarios[id];
      shown += s.raise.length + s.drop.length + s.question.length;
    }
    assert.ok(shown >= CATALOG.flags.length, `${shown} items shown in all, fewer than the ${CATALOG.flags.length} flags in the catalog`);
  });
});
