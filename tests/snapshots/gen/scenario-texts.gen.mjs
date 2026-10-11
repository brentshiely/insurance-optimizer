// Prints every distinct rendering of every flag the scenarios reach, in full, as JSON for scripts/update-snapshots.sh
// (-> tests/snapshots/scenario-texts.snap.mjs).
import { buildScenarioTexts } from '../builders/scenarios.mjs';
import { serialize } from '../../harness.mjs';

const out = serialize(buildScenarioTexts());
if (typeof print === 'function') print(out); else console.log(out);
