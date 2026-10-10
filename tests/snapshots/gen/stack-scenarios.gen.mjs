// Prints named stack scenarios (full model and rendered S6 flags) as JSON for scripts/update-snapshots.sh
// (-> tests/snapshots/stack-scenarios.snap.mjs).
import { buildStackScenarios } from '../builders/umbrellaCoreFlags.mjs';
import { serialize } from '../../harness.mjs';

const out = serialize(buildStackScenarios());
if (typeof print === 'function') print(out); else console.log(out);
