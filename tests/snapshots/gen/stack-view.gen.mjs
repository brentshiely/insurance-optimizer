// Prints the stack drawing (view-model and HTML) for the named stack scenarios as JSON for scripts/update-snapshots.sh
// (-> tests/snapshots/stack-view.snap.mjs).
import { buildStackViews } from '../builders/stackView.mjs';
import { serialize } from '../../harness.mjs';

const out = serialize(buildStackViews());
if (typeof print === 'function') print(out); else console.log(out);
