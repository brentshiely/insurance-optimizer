// Prints which items each scenario shows (ids and text versions) as JSON for scripts/update-snapshots.sh
// (-> tests/snapshots/scenario-flags.snap.mjs).
import { buildScenarioFlags } from '../builders/scenarios.mjs';
import { serialize } from '../../harness.mjs';

const out = serialize(buildScenarioFlags());
if (typeof print === 'function') print(out); else console.log(out);
