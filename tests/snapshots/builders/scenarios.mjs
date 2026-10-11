// Builders for the Story S12 scenario snapshots (see tests/snapshots/README.md for the mechanism).
//
// Every scenario in tests/scenarios/scenarios.mjs is evaluated with the real engine and the real catalog, and the
// results are recorded in two files:
//
//   scenario-flags.snap.mjs   buildScenarioFlags()   per scenario: the flags that fire, as ids, in the order evaluate()
//                                                    returns them, each pointing at its text version (`id@03`), with
//                                                    "(strong)" where the emphasis is strong; the liability stack's layer
//                                                    statuses; how many visible questions were answered.
//   scenario-texts.snap.mjs   buildScenarioTexts()   every distinct rendering of every flag, in full: title, emphasis,
//                                                    background, ask, reason and the ids of its sources.
//
// Why two files, and why not the full text of every flag in every scenario. A flag has a handful of wordings and the
// scenarios show the same wording to many households, so full text per scenario would repeat the same paragraphs again and
// again: a file nobody can review, and a diff where one reworded sentence shows up in every scenario that shows it. Recording
// each distinct rendering once, under a stable key, keeps the full text of every wording that any scenario can reach (a
// copy change is a visible diff in one place, and the test prints only the entries that changed) while the per-scenario file
// stays compact enough to read as a table of "which household sees which items". A wording that no scenario reaches is not in
// the snapshot; the audits in tests/audit/ scan the broader sweep and the random households for those.
//
// Text versions are numbered per flag in order of first appearance (scenario order, then evaluate() order), padded to two
// digits so the keys sort. They are labels, not hashes: editing the text of a version changes only that entry, and
// a scenario changes only when the version it shows changes (a new wording, or the same wording now shown to a different
// household). Two renderings are the same version when bucket, title, emphasis, background, ask, reason and source ids are equal (the bucket
// is part of it so that a flag moving between buckets shows up as a new wording, not as a silent change).
//
// Builders are deterministic (no dates, no randomness) and the generators in tests/snapshots/gen/ print their output with
// serialize(), so the files are stable byte for byte.
import { evaluate } from '../../../public/js/overlap/engine/evaluate.mjs';
import SCENARIOS from '../../scenarios/scenarios.mjs';

const BUCKETS = ['raise', 'drop', 'question'];

const two = (n) => (n < 10 ? `0${n}` : String(n));

// One pass over the scenarios: the results, plus a table of distinct renderings keyed `flag-id@NN`.
function runAll() {
  const versions = {};          // flag id -> [fingerprint, ...] (index + 1 is the version number)
  const texts = {};             // 'flag-id@NN' -> the rendering
  const runs = [];
  for (const scenario of SCENARIOS) {
    const result = evaluate(scenario.answers);
    const shown = {};
    for (const bucket of BUCKETS) {
      shown[bucket] = result.flags[bucket].map((flag) => {
        const sourceIds = flag.sources.map((s) => s.id);
        const fingerprint = JSON.stringify([bucket, flag.title, flag.emphasis, flag.background, flag.ask, flag.reason, sourceIds]);
        const list = (versions[flag.id] = versions[flag.id] || []);
        let index = list.indexOf(fingerprint);
        if (index === -1) {
          list.push(fingerprint);
          index = list.length - 1;
          texts[`${flag.id}@${two(index + 1)}`] = {
            bucket,
            emphasis: flag.emphasis,
            title: flag.title,
            background: flag.background,
            ask: flag.ask,
            reason: flag.reason,
            sources: sourceIds,
          };
        }
        return `${flag.id}@${two(index + 1)}${flag.emphasis === 'strong' ? ' (strong)' : ''}`;
      });
    }
    runs.push({ id: scenario.id, result, shown });
  }
  return { runs, texts };
}

// "auto ok, home below_required" (layer statuses in the model's order), or null without an umbrella.
function stackLine(stack) {
  if (stack === null) return null;
  if (stack.layers.length === 0) return 'umbrella only';
  return stack.layers.map((layer) => `${layer.id} ${layer.status}`).join(', ');
}

export function buildScenarioFlags() {
  const { runs } = runAll();
  const scenarios = {};
  for (const { id, result, shown } of runs) {
    scenarios[id] = {
      questions: `${result.meta.answeredCount} of ${result.meta.visibleQuestionIds.length} answered`,
      stack: stackLine(result.stack),
      raise: shown.raise,
      drop: shown.drop,
      question: shown.question,
    };
  }
  return {
    about: 'Which items each scenario in tests/scenarios/scenarios.mjs shows, in evaluate() order. "id@NN" is a text version: look it up in scenario-texts.snap.mjs. Generated by scripts/update-snapshots.sh.',
    scenarios,
  };
}

export function buildScenarioTexts() {
  const { texts } = runAll();
  return {
    about: 'Every distinct rendering of every flag that any scenario in tests/scenarios/scenarios.mjs reaches, in full. Keys are "flag-id@NN", numbered by first appearance. Generated by scripts/update-snapshots.sh.',
    texts,
  };
}
