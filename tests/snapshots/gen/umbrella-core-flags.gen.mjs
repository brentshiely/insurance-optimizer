// Prints which S6 flags fire over the whole ladder as JSON for scripts/update-snapshots.sh
// (-> tests/snapshots/umbrella-core-flags.snap.mjs).
import { buildUmbrellaCoreFlags } from '../builders/umbrellaCoreFlags.mjs';
import { serialize } from '../../harness.mjs';

const out = serialize(buildUmbrellaCoreFlags());
if (typeof print === 'function') print(out); else console.log(out);
