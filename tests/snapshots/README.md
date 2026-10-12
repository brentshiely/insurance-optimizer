# Snapshots

A snapshot is a committed copy of some deterministic output, so a change to the engine, the catalog or the copy shows up as a diff somebody has to read. They are built by Story S6 and used by every later story that wants one. Story S12 added the scenario matrix and its two snapshots (see "The scenario matrix" below).

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
| `scenario-flags.snap.mjs` | `builders/scenarios.mjs` (`buildScenarioFlags`) | Story S12: for every scenario in `tests/scenarios/scenarios.mjs`, which items the action list shows (flag ids per bucket, in `evaluate()` order, each with a text version `id@NN` and "(strong)" where the emphasis is strong), the liability stack's layer statuses, and how many visible questions were answered. |
| `scenario-texts.snap.mjs` | `builders/scenarios.mjs` (`buildScenarioTexts`) | Story S12: every distinct wording of every flag that any scenario reaches, in full (title, emphasis, background, ask, reason, source ids), keyed `flag-id@NN`. |

## The scenario matrix (Story S12)

`tests/scenarios/scenarios.mjs` is a list of named households, each `{ id, answers }` where `answers` is a plain answers object exactly as the page keeps it: `policies` (Q1) plus a tap on a closed list for every question those ticks make visible. A scenario is just answers. The file covers auto only, auto + home, an umbrella over auto, home and both (every limit and required-minimum family, including "lower than the lowest tier", over-buying and Not sure), motorcycle and boat with and without an umbrella, renters only, a parent's home with a child's renters policy (dorm, off campus, Not sure), health only, every Other-bucket item with and without a card, accidental death with every answer about life insurance, "Not sure" everywhere, "nothing held", and households that hold all thirteen policies (worst case, best case, an old paid-off car).

Rules every scenario follows (tests in `tests/audit/scenarios.test.mjs` and `tests/audit/coverage.test.mjs`):

- unique kebab-case `id`; plain data only;
- **canonical**: `session.prune(answers)` returns the same answers, so Q1 is in the question's own order and nothing answers a hidden question;
- **complete**: every question the ticks make visible is answered, as it must be before the page lets anyone reach the action list;
- across the file: every policy is ticked, every option of every question is chosen at least once, every question that offers Not sure is answered Not sure somewhere, and every flag fires at least once. When a story adds a flag, a question or an option, the coverage tests fail and name what is missing; add a scenario for it.

### The two scenario snapshots, and why they look the way they do

Full text of every flag in every scenario would repeat the same paragraphs over and over. Instead `scenario-texts` holds each distinct rendering once, under `flag-id@NN` (numbered per flag by first appearance), and `scenario-flags` is a compact table of which household sees which items. A copy change therefore shows up once, in `scenario-texts`, and the failing test prints only the entries that differ. A wording that no scenario reaches is not in the snapshot; the audits scan a much wider corpus for those (below). A rendering's bucket is part of its version, so a flag that ever moves between buckets shows up as a new wording. The scenarios are evaluated with the real card table, which is empty until Stories S4b and S11b, so no snapshot names a card; `flag-content.test.mjs` and `cards.test.mjs` read the fixture card table too.

### Reading a failure

1. `scripts/test.sh audit` and read which entries differ. A change to `scenario-flags` means a household now sees different items (a new flag, a changed trigger, a changed emphasis). A change to `scenario-texts` means wording changed.
2. Decide whether you meant it. If not, you found a bug; fix it.
3. If you did, run `scripts/update-snapshots.sh scenario` (both files), read `git diff tests/snapshots`, and say why in `docs/DECISIONS.md` if it is not obvious. A copy change usually also changes a browser golden: re-record deliberately (`tests/browser/README.md`).

## The audits (Story S12)

`tests/audit/*.test.mjs` check the whole catalog, not one story's flags. They read a corpus built by `tests/audit/corpus.mjs`: the scenarios, a one-question-at-a-time sweep from three of them (plus every deductible and cushion band combination, every subset of roadside sources and extra health policies, and every subset of the policies whose wording changes), and 1,500 random complete households from a fixed seed. Every distinct wording in it is scanned.

| File | What it enforces |
|---|---|
| `scenarios.test.mjs` | The matrix is well formed (at least 40 scenarios, canonical, complete); each scenario evaluated twice is deep-equal, whatever the key order or tick order, with frozen inputs, with no state leaking between calls; the two snapshots. |
| `coverage.test.mjs` | Every flag is triggered by a scenario (unreached flags are listed); all three buckets and both emphasis levels are exercised; every policy, option and Not sure answer is used; the Other-bucket items appear with and without a card. |
| `flag-content.test.mjs` | Every flag cites at least one source that resolves, with publisher, title, https link and a real last-verified date; every rendering has a non-empty title, background, ask and one-line first-person reason; renderings agree with the catalog (bucket too); a Drop is only for something the person ticked; a Drop has something that already covers it (rules in `evidence.mjs`) and, conversely, rental car, travel and warranties are a Drop exactly then and a Question otherwise, no Drop says its coverage may be worth buying, a text never says a card pays first and that card cover is usually secondary, no reason says "card" for a household that ticked none, the phone item names a home policy, a renters policy or "two places" only when the household holds one (and its title names exactly the policies it holds), and the unconfirmed-limits umbrella item sends a household that is Not sure of its own limits to its own policies, one that is Not sure what its umbrella requires to the agent for the list, and one that is Not sure of both to both. All of those hold with no exceptions (DECISIONS S12-9, S12-10 and S12-11); a flag that breaks one is fixed. |
| `copy.test.mjs` | No placeholder or unresolved text in any flag, question, option, section or source line (braces, square or angle brackets, `%s`, `${...}`, `...`, `N/A`, `???`, XXX, "placeholder", "coming soon", "to be determined", TODO, TBD, TBA, lorem, undefined, NaN, null, `[object`); no US state, District of Columbia, two-letter postal code ("MN") or older abbreviation ("Minn.") in any of them (DECISIONS S12-12); none of the interface phrases the prototype's reviews rejected ("home equity", "next screen", "generic patterns"); no dashes as punctuation; no stray whitespace; no multi-question help repeats the "all that apply" instruction the page adds itself. The scanners are tested against positive and negative samples. |
| `sources.test.mjs` | Every source a flag cites is in the registry; every registry source is used by a flag or a verified research fact (unused ones are listed); what a result shows is exactly the registry entry, in the flag's order. |
| `cards.test.mjs` | No text names a card or an issuer the card table does not have (the real table is empty until Stories S4b and S11b, DECISIONS D14); over all 32 combinations of the five fixture cards, a card with a `none` status is never named, an `unverified` benefit is only ever hedged ("Check whether ... includes ..."), marker text from unverified or none entries never reaches the reader, and any text that names a card points to the card's current benefits guide. When the real table has entries the same rules run on it. |
| `households.test.mjs` | 1,500 random households: no throw, no item shown twice, a flag is shown only to a household that holds the policies it is about, "None of these" shows nothing, results do not depend on key order, the liability stack exists exactly when an umbrella is held. |
| `spec-checklist.test.mjs` | Every line of docs/SPEC.md under Core logic, Question flow and branching, Output and Sources is mapped to the flags and questions that implement it (or to the tests that enforce it, or marked out of v1); every flag and question in the catalog is mapped to a SPEC line; buckets the SPEC names match; fast-follow items (RV, ATV, jet ski, earth movement, water-damage sub-limits) are absent. Adding a flag or question fails the test until you say which SPEC line it implements. |
| `traceability.test.mjs` | `docs/TRACEABILITY.md` (Story S16) against the SPEC, the catalog, the repo and the decision logs: every content line of the SPEC has a row, every status carries what it promises, every cited file and id exists, both appendices list every flag and question; plus the SPEC invariants with no test of their own (open enrollment is mentioned only by the health branch). |
