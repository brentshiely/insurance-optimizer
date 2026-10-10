// Prints the stack matrix as JSON for scripts/update-snapshots.sh (-> tests/snapshots/stack-matrix.snap.mjs).
import { buildStackMatrix } from '../builders/stackMatrix.mjs';
import { serialize } from '../../harness.mjs';

const out = serialize(buildStackMatrix());
if (typeof print === 'function') print(out); else console.log(out);
