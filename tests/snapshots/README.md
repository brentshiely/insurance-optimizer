# Snapshots

A snapshot is a committed copy of some deterministic output, so a change to the engine, the catalog or the copy shows up as a diff somebody has to read. They are built by Story S6 and used by every later story that wants one (S12 adds the scenario matrix).

## How it works

```
tests/snapshots/
  gen/<name>.gen.mjs        prints the data as JSON with print()          (run by scripts/update-snapshots.sh)
  builders/*.mjs            functions that build the data; shared by the generator and the test
  <name>.snap.mjs           generated: "export default <json>;"           (committed, never edited by hand)
```

- A **builder** is an ordinary module that calls the real engine and returns plain data (strings, numbers, arrays, objects). Keep it deterministic: no dates, no randomness. Put it in `builders/` so the test can import it without running the generator.
- A **generator** imports a builder, turns the data into JSON with `serialize()` from `tests/harness.mjs` (keys sorted, two-space indent, so the file is stable) and prints it with `print()`. It prints nothing else.
- `scripts/update-snapshots.sh` runs every `gen/*.gen.mjs` under macOS `jsc` (Node if jsc is missing) and writes `<name>.snap.mjs` with a one-line "generated, do not edit" comment. A generator that exits with an error, or prints something that is not JSON, fails the run and leaves the old snapshot alone.
- A **test** imports the snapshot and the builder and compares: `assertSnapshot(buildX(), SNAP, 'x')` (from `tests/harness.mjs`). A mismatch prints both sides.

## Commands

```
scripts/update-snapshots.sh              rewrite every snapshot whose output changed
scripts/update-snapshots.sh stack        only snapshots whose name contains "stack"
scripts/update-snapshots.sh --check      write nothing; exit 1 and list snapshots that are out of date
scripts/test.sh                          the suite compares every snapshot (a stale one fails)
```

## Changing a snapshot on purpose

1. Make the change (engine, catalog, copy).
2. Run `scripts/test.sh`; the stale snapshot tests fail and show the difference.
3. Run `scripts/update-snapshots.sh`, then read `git diff tests/snapshots`. Every difference must be explained by your change. If one is not, you found a bug: fix it instead of accepting it.
4. Say in `docs/DECISIONS.md` why the output changed when the reason is not obvious from the story.

Never regenerate to make a red test go green without reading the diff.

## Adding a snapshot

1. Add `builders/<thing>.mjs` exporting `buildThing()`.
2. Add `gen/<name>.gen.mjs` (copy one of the existing three: import the builder, `serialize`, print).
3. Run `scripts/update-snapshots.sh <name>` and commit the new `<name>.snap.mjs`.
4. Import both in a `*.test.mjs` and call `assertSnapshot`. Also assert something cheap about the snapshot itself (how many entries it holds, that each case you care about appears), so an empty or shrunken snapshot cannot pass silently.

Snapshots should record only what your story owns. A flag story snapshots its own flags (filter by flag id), not "every flag that fires", because other stories add flags that fire on the same answers.

## Snapshots in the repo

| File | Built by | What it records |
|---|---|---|
| `stack-matrix.snap.mjs` | `builders/stackMatrix.mjs` | The liability stack over every preset combination: 4 umbrella sizes x 5 auto limits x 4 auto requirements x 5 home limits x 3 home requirements (1,200 combinations, each with its layer statuses and findings), plus every motorcycle and boat limit against every requirement. Layer and umbrella objects are stored once each; the builder throws if a layer ever depends on an answer other than its own two. |
| `umbrella-core-flags.snap.mjs` | `builders/umbrellaCoreFlags.mjs` | Which of the six S6 flags fire (and at what emphasis) on the same 1,200 combinations and on every vehicle limit against every requirement. |
| `stack-scenarios.snap.mjs` | `builders/umbrellaCoreFlags.mjs` | The full stack model and the fully rendered S6 flag copy for eight named households, so a wording change is a visible diff. |
| `stack-view.snap.mjs` | `builders/stackView.mjs` | Story S14: what the liability stack drawing shows (view-model and HTML) for the same eight named households: sentences, icons, bar lengths and markup. |
