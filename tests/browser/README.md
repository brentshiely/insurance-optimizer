# Browser golden master

A regression net for the wizard. It replays scripted user journeys through the **real page** in a hidden
same-origin iframe, captures the visible text of every screen along the way, and compares it with text
recorded earlier. If a change alters what a user reads, which controls are on a screen, which ones are
selected, or which screens follow which answers, the replay fails and prints the exact line that differs.

The goldens guard the flow in `docs/SPEC.md`: entry screen, Q1 ("Which policies do you have?"), only the
question sections that apply to what was ticked, then the insurer action list. They were recorded from the page
as it stands after Story R1 replaced the prototype (DECISIONS D15). Nothing here describes the old prototype.

## Run the replay

1. Serve the repo root (not `public/`; the page lives in `tests/` and loads the app from `/public/`):

   ```bash
   PORT=8200 scripts/serve.sh            # or: python3 -m http.server 8200 --bind 127.0.0.1
   ```

2. Open `http://127.0.0.1:8200/tests/browser/golden.html`.
3. Wait about a minute and a half, with the tab in front (a browser tab that is not visible throttles timers and
   can take several times as long). Read `<pre id="result">`: its first line is `GOLDEN: RUNNING` until the run
   ends, then exactly one of:

   - `GOLDEN: PASS`
   - `GOLDEN: FAIL <scenarioId> step <n>` followed by a readable diff of the first failing step
   - `GOLDEN: PASS-PARTIAL ...` (a filtered run, see `only=` below; never counts as a full pass)

   From the Browser pane, read it with `javascript_tool` (`document.getElementById("result").textContent`) or
   `get_page_text`. A visible list of scenarios (PASS / FAIL per scenario) sits under the result.
4. Also read the browser console: there should be no errors or warnings. The harness itself fails a scenario if
   the page calls `console.error` / `console.warn` or throws after it has loaded.

Page options (query string):

| option | meaning |
|---|---|
| `only=a,b` | run just these scenario ids (the result is then `GOLDEN: PASS-PARTIAL`) |
| `app=<url>` | page to load instead of `../../public/index.html` (must be same-origin) |
| `pool=<n>` | scenarios replayed at the same time, default 3 (each has its own iframe) |
| `record=1` | record instead of compare (see "Re-recording") |

Run it **twice** after any change and expect the same result: the replay is deterministic. It waits 250 ms after
every step and then until the page has stopped changing.

**A blank page at step 0.** Each iframe fetches the page's few dozen module files at once, and a plain
`python3 -m http.server` can drop connections when several iframes do that together, which leaves the page
blank ("the app did not render anything into #stage"). The harness therefore loads a scenario up to three times
before it reports that; a genuine load error (a syntax error, a missing file) fails all three. If a replay still
reports it, run again with `pool=1` or `pool=2`.

**Behind the page's Content-Security-Policy** (`scripts/serve.py`, Cloudflare Pages) the harness cannot run:
`frame-ancestors 'none'` blocks its same-origin iframe. Replay and record on a plain static server.

## Reading a failure

```
GOLDEN: FAIL only-auto step 5
...
step 5: {"op":"answer","list":[["auto_value","10000_24999"], ... ]}
problem: the screen text differs from the golden

--- expected (golden)
+++ actual (this run)
  Do you have gap coverage on that car?
- [Yes] [No] [Not sure]
+ [Yes] [*No] [Not sure]
```

- **Step numbers.** Step 0 is the initial load (the entry screen). Step *k* is the screen after the *k*-th entry
  of the scenario's `steps` (1-based), so the `step` in the report is the position in `scenarios.mjs`.
- `-` lines are in the golden, `+` lines are what the page showed now; unmarked lines are context.
- `driver error: no element matches ...` means the page no longer has the control a user would tap, which is
  itself a regression (or the scenario is out of date).

## What is captured

For each step, three parts, in this order:

- `== stage ==`: the text of `#stage`, the card that holds the current screen.
- `== known ==`: the text of `#known`, the "Your policies" panel (what Q1 says you hold).
- `== progress ==`: the progress bar's value, as a percentage (`aria-valuenow`). The bar is 0 on the entry screen
  and on Q1 (how many screens follow depends on what is ticked), 100 on the action list, and spread evenly between.

Text is taken from the DOM, independent of CSS, one logical line per block, whitespace collapsed. Controls are
written out so their state is part of the text: buttons as `[Auto insurance, ...]`, selected ones (the `sel`
class, or `aria-pressed="true"`) as `[*...]`, disabled ones as `[Continue (disabled)]`; links as `label <href>`, so
every citation URL is checked. **Nothing is normalized or hidden:** nothing on the page changes from run to run (no
timer, tap count or date). If volatile text ever appears, add a normalizer in `runner.mjs` and say so here.

Not captured on purpose: colours, layout and CSS, focus, the light and dark themes, the bars and icons of the
umbrella drawing (SVG is skipped; the sentences and numbers that say the same thing are captured). A change that only
moves or edits CSS must be checked separately in the Browser pane, in light and dark and at 375px wide.

The harness drives the page **only** through DOM clicks on the buttons a user would use:
`button[data-oq][data-ov]` for every answer (Q1 included) and `button[data-act]` for Get started, Continue, Back,
Start over, Copy and Print.

## Scenarios

`scenarios.mjs` is plain data; the ops are documented at its top and implemented in `runner.mjs` (`OPS`):
`policies` (tap Q1 options), `answer` (tap `[questionId, optionId]` pairs in one step; a tap that opens a follow-up
question makes it available to the next tap in the same list), `next`, `back`, `restart`, and a generic `click`.
Continue stays disabled on a screen until every visible question on it is answered, so each screen is one
`answer` step (or two, where the half-answered screen is worth recording) and one `next`. 26 scenarios, 281
captured screens; each starts on the entry screen and ends on the action list.

| id | covers |
|---|---|
| `nothing-held` | Q1 "None of these" (clears an earlier tick) goes straight to the honest empty list: no groups, no Copy or Print, no all-clear wording |
| `only-auto` | auto alone: a loan opens the gap question, UM/UIM yes opens its limit, deductible against cushion |
| `only-home` | home alone: sewer backup, flood, deductible |
| `only-renters` | renters alone, for yourself: one question, an empty list |
| `only-umbrella` | umbrella alone: its size, exposure band, side business, with nothing underneath to compare (the drawing's empty note) |
| `only-health` | health alone, a regular plan with no extras: the narrow questions, an empty list |
| `only-motorcycle`, `only-boat` | no follow-up questions without an umbrella, so Q1 goes straight to the list |
| `only-rental-car`, `only-towing`, `only-travel`, `only-phone`, `only-warranty`, `only-accidental-death` | each Other-bucket item alone: the cards question, the follow-ups that belong to it, a one-item list |
| `auto-home` | auto and home with no umbrella: a paid-off cheap car opens the collision question; Not sure on one question |
| `umbrella-low-limits`, `umbrella-matching-limits`, `umbrella-high-limits` | auto, home and umbrella with limits below, at and above what the umbrella asks for: the drawing and the Raise / Question items |
| `moto-boat-umbrella` | a motorcycle and a boat under an umbrella, each with its own limit; no auto or home to compare |
| `renters-college-child` | a parent who owns a home and pays for a child's renters policy at college: the dorm follow-up |
| `health-supplemental-hsa` | auto and health with an HSA, all four bolt-on policies and a short-term plan |
| `other-bucket-all` | every Other-bucket item at once: two cards, a phone bill on a card, two roadside sources, term life |
| `not-sure-everywhere` | ten policies ticked and Not sure to every question that offers it |
| `change-q1-after-back` | going Back to Q1 and changing it: unticking the umbrella drops its answers, ticking it again does not bring them back, the auto answers stay |
| `start-over` | Start over from the list clears Q1, the panel and the progress, and a second, different run reaches its own list |
| `everything-ticked` | all thirteen policies and every question answered: every section of the flow, then the longest list |

Between them the scenarios tap every question of the catalog, every Q1 option and every rung of the main limit and
band ladders. `golden-shape.test.mjs` (run by `scripts/test.sh`, no browser needed) checks that against the real
catalog, so a lost scenario, a renamed option or an unanswered question is caught without a browser, and that no
screen of the retired prototype has come back.

## Re-recording (deliberate changes only)

**Goldens change only deliberately, and the reason is written down.** Never re-record to make a failing change
pass: if you did not mean to change what users see, the change is wrong. Re-record when a change is *supposed* to
alter a screen (new or reworded flag copy, a new question, a new screen), and then:

1. Update `scenarios.mjs` if the journey changes (a new question must be answered by some scenario).
2. Record. With the helper (recommended, no copying by hand):

   ```bash
   python3 tests/browser/record-server.py 8200     # serves the repo root AND accepts golden writes
   # open http://127.0.0.1:8200/tests/browser/golden.html?record=1&post=1
   ```

   `record-server.py` binds to 127.0.0.1, only writes `tests/browser/golden/<id>.mjs`, and refuses cross-origin
   writes. Use `&only=<id>` to re-record one scenario and `&pool=1` if a scenario reports a blank page. A
   recording writes files only when every scenario recorded without an error.

   Without the helper: open `golden.html?record=1`. The page prints the JSON for every scenario into
   `<pre id="record">` (`{ "<id>": [{ "step": 0, "text": "..." }, ...] }`). Write each scenario to
   `tests/browser/golden/<id>.mjs` in the exact format `goldenFileText()` in `runner.mjs` produces (the unit
   test compares the file byte for byte).
3. Review `git diff tests/browser/golden`. The diff must contain exactly the changes the story intends and
   nothing else. Explain it in `docs/DECISIONS.md` and the commit.
4. Replay twice on a plain static server and expect `GOLDEN: PASS` both times, then run `scripts/test.sh`.

Because the action lists carry the real flag copy, any change to the copy of a flag that fires in a scenario
fails that scenario until it is re-recorded. That is intended: the diff shows the new wording where a user will
read it.

If you remove or rename a scenario, delete its golden file as well. The privacy line on the entry screen and the
action list follows the analytics provider in `public/js/config.mjs`, so choosing a provider changes it and the
goldens must be re-recorded then (`tests/ui/analytics.test.mjs` fails until they are).

## Files

| file | role |
|---|---|
| `golden.html` | the page: loads the scenarios, runs them, writes `#result`, the scenario list, and `#record` |
| `runner.mjs` | step ops, text capture, iframe driving, diff, report |
| `scenarios.mjs` | the scenarios (plain data) |
| `golden/<id>.mjs` | recorded goldens, `export default [{ step, text }, ...]` |
| `record-server.py` | optional dev helper for re-recording |
| `golden-shape.test.mjs` | fast jsc test of scenario and golden shape, coverage and the flow's invariants |

The harness re-fetches the page and everything it references with `cache: "reload"` before each run, so a plain
`python3 -m http.server` (which sends no cache headers) cannot make a replay test stale code.
