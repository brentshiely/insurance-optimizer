# Browser golden master

A regression net for the wizard UI. It replays scripted user journeys through the **real app** in a hidden
same-origin iframe, captures the visible text of every screen along the way, and compares it with text
recorded earlier. If a refactor (or any later story) changes what a user sees, the replay fails and prints
the exact line that differs.

The goldens were recorded from the ORIGINAL inline version of `public/index.html` (before Story 1 split it
into `public/css/app.css` and `public/js/app.js`). A passing replay therefore means "the app still shows
exactly what it showed before". Story S13 then re-recorded them deliberately to add the overlap screens and
the insurer action list; every earlier screen still reads exactly as originally recorded (see "Story S13
re-record" below for the proof).

## Run the replay

1. Serve the repo root (not `public/`; the page lives in `tests/` and loads the app from `/public/`):

   ```bash
   PORT=8200 scripts/serve.sh            # or: python3 -m http.server 8200 --bind 127.0.0.1
   ```

2. Open `http://127.0.0.1:8200/tests/browser/golden.html`.
3. Wait about a minute (a browser tab that is not visible throttles timers and can take two to three times as long). Read `<pre id="result">`: its first line is `GOLDEN: RUNNING` until the run ends, then
   exactly one of:

   - `GOLDEN: PASS`
   - `GOLDEN: FAIL <scenarioId> step <n>` followed by a readable diff of the first failing step
   - `GOLDEN: PASS-PARTIAL ...` (a filtered run, see `only=` below; never counts as a full pass)

   From the Browser pane, poll with `javascript_tool`
   (`document.getElementById("result").textContent`) or read it with `get_page_text`. A visible list of
   scenarios (PASS / FAIL per scenario) sits under the result.
4. Also read the browser console: there should be no errors or warnings. The harness itself fails a scenario
   if the app calls `console.error`/`console.warn` or throws after loading.

Page options (query string):

| option | meaning |
|---|---|
| `only=a,b` | run just these scenario ids (the result is then `GOLDEN: PASS-PARTIAL`) |
| `app=<url>` | page to load instead of `../../public/index.html` (must be same-origin) |
| `pool=<n>` | scenarios replayed at the same time, default 6 (each has its own iframe) |
| `record=1` | record instead of compare (see below) |

Run it **twice** after any change and expect the same result: the replay is deterministic. It waits 250 ms
after every step (the app uses a 140 ms timeout on some clicks) and then until the page has stopped
changing; steps that only navigate after a timer also wait until the screen text actually changes.

## Reading a failure

```
GOLDEN: FAIL ca-own-family step 17
...
step 17: {"op":"next"}
problem: the screen text differs from the golden

--- expected (golden)
+++ actual (this run)
  Underprotected Your home liability limit ...
- Underprotected Water and sewer backup is excluded from most standard home policies ...
+ Underprotected Water and sewer backup is excluded from most standard homeowner policies ...
```

- **Step numbers.** Step 0 is the initial load. Step *k* is the screen after the *k*-th entry of the
  scenario's `steps` (1-based), so the `step` shown in the report is the position in `scenarios.mjs`.
- `-` lines are in the golden, `+` lines are what the app showed now; unmarked lines are context.
- `driver error: no element matches ...` means the app no longer has the control a user would click, which
  is itself a regression (or the scenario is out of date).

## What is captured

For each step the text of `#stage` (the wizard card) and `#known` (the "What we know" panel), nothing else.

- Text is taken from the DOM, independent of CSS, one logical line per block, whitespace collapsed.
- Controls are written out so their state is part of the text: buttons as `[Own]`, selected ones (the `sel`
  class, or `aria-pressed="true"` as on the overlap screens) as `[*Own]`, disabled ones as
  `[Continue (disabled)]`; selects as `{select: current | options: a | b}`;
  number inputs as `{input number: 5000}`; links as `label <href>` (so citation URLs are checked).
- The **only** volatile text is the summary's "`<n>` taps, `<n>` seconds", normalized to
  `N taps, S seconds`. Nothing else is hidden or ignored.
- Not captured on purpose: the progress bar, the "Prototype telemetry" panel, colors, layout and CSS, focus,
  the light/dark theme. The net proves what the user reads and which controls are selected, not how it looks.
  A change that only moves or edits CSS must be checked separately (for a pure move, diff the extracted CSS
  against the original text; otherwise look at it in the Browser pane in light and dark).
- Goldens assume an `en-US` browser locale (the app formats numbers with `toLocaleString()`).

The harness drives the app **only** through DOM events on the elements a user would use
(`[data-state]`, `#st`, `button[data-q][data-v]`, `button[data-x]`, `button[data-qual][data-v]`,
`button[data-act]`, `[data-p][data-k]` fields and toggles, `[data-umb]`, the file inputs, and, on the overlap
screens, `button[data-oq][data-ov]`).

## Scenarios

`scenarios.mjs` is plain data; the op list is documented at its top and implemented in `runner.mjs` (`OPS`).
Generic `click` and `set` ops let later stories drive new screens, and the `answer` op (Story S13)
taps a list of `[questionId, optionId]` overlap options in one step (Continue is a separate `next`, and stays
disabled until every visible question on the screen is answered). 17 scenarios, 590 captured screens (each
reaches the summary, which now ends with the insurer action list):

| id | covers |
|---|---|
| `ca-own-family` | CA, own, dependents, 2 vehicles, none; earthquake + FAIR Plan, UM below liability, medical payments, SDI, life/disability |
| `fl-own-wind-boat-moto` | FL via dropdown, own, boat + motorcycle (jet ski toggled off), Not sure; wind %, Citizens, boat valuation, lifecheck |
| `tx-rent-3veh-moto-rv` | TX, rent, 3+ vehicles, motorcycle + RV; renters edits, umbrella with an auto floor gap |
| `mo-both-quake-ebike` | MO, own and rent, 0 vehicles, e-bike; New Madrid quake, last-resort, water backup |
| `ny-nofault-umbrella-back` | NY no-fault, "None of these", umbrella floor gap fixed by going Back twice |
| `mn-nofault-rent-boat` | MN no-fault, rent, 2 vehicles, boat + e-bike; PIP minimum, UM minimum, medpay 0 |
| `az-defaults-none` | AZ (no special rules), every default untouched, every quick-check No |
| `oh-restart-replay` | OH via dropdown, file adds, then **Start over** and a second, different run |
| `ut-boat-mandate` | UT no-fault + boat law + quake state, boat + jet ski liability below the minimum |
| `ar-jetski-newmadrid` | AR boat law + New Madrid, jet ski + ATV, uninsured |
| `mi-nofault-rent-dep` | MI own PIP text, dropdown cleared and re-picked, rent, dependents |
| `tx-own-twia` | TX own, windstorm percentage without savings, TWIA last-resort |
| `la-own-citizens` | LA own, windstorm with savings, Citizens last-resort |
| `co-rent-di-gap` | CO paid-leave program with no dollar figure, no long-term disability |
| `umbrella-low-underlying-raise` | OK, own, motorcycle, umbrella held with auto, home and motorcycle limits below what it asks: Raise and Question items |
| `nothing-held-empty-state` | NH, rent, nothing else: the honest empty list (no Copy or Print buttons, no all-clear wording) |
| `not-sure-everywhere` | OK, own, 2 vehicles, umbrella: Not sure to every overlap question that offers it (eight Question items) |

The overlap answers in the 14 older scenarios are varied on purpose (limits above, at and below what the
umbrella asks, lease / loan / paid off, every deductible and cushion band, a tick and an untick on the extras
screen, a gated follow-up that opens after one tap, a homeowner who pays for a child's renters policy, Not sure).
No scenario ticks a card-linked extra, so the `cards` and `extras_detail` screens are not recorded: the card
scenario belongs to S16, and S11 changes what those answers produce.

Across them: own / rent / both; dependents yes / no; vehicles 0 / 1 / 2 / 3+; extras none and several
(Boat, Jet ski, RV, Motorcycle, ATV, E-bike); the quick-check answers Yes / No / Not sure; edits to
liability, UM/UIM, medical payments, deductibles, wind %, earthquake coverage and deductible, last-resort,
water backup, hull valuation, dwelling, belongings, premium and percent fields; the umbrella screen with and without an umbrella; Back;
Start over. `tests/browser/golden-shape.test.mjs` (run by `scripts/test.sh`) checks the matrix and that the
goldens reach every screen, so a lost scenario is caught without a browser.

## Re-recording (deliberate changes only)

**Goldens change only deliberately, and the reason is written down.** Never re-record to make a failing
refactor pass: a refactor must reproduce the existing goldens exactly. Re-record only when a story is
*supposed* to change what users see (for example S13 adds the overlap screens), and then:

1. Update `scenarios.mjs` if the journey changes (new `next` steps for new screens, new scenarios).
2. Record. With the helper (recommended, no copying by hand):

   ```bash
   python3 tests/browser/record-server.py 8200     # serves the repo root AND accepts golden writes
   # open http://127.0.0.1:8200/tests/browser/golden.html?record=1&post=1
   ```

   `record-server.py` binds to 127.0.0.1, only writes `tests/browser/golden/<id>.mjs`, and refuses
   cross-origin posts. Use `&only=<id>` to re-record a single scenario.

   Without the helper: open `golden.html?record=1`. The page prints the JSON for every scenario into
   `<pre id="record">` (`{ "<id>": [{ "step": 0, "text": "..." }, ...] }`). Write each scenario to
   `tests/browser/golden/<id>.mjs` in the exact format `goldenFileText()` in `runner.mjs` produces (the unit
   test compares the file byte for byte).
3. Review `git diff tests/browser/golden`. The diff must contain exactly the changes the story intends and
   nothing else (S13's was only the new screens, see below). Explain it in `docs/DECISIONS.md` and the commit.
   A line diff is noisy when steps are inserted (every later entry's `"step": n` label is renumbered), so
   compare the recorded `text` of the old file (`git show <commit before the change>:tests/browser/golden/<id>.mjs`)
   with the new one, entry by entry, after taking out the inserted screens.
4. Replay twice and expect `GOLDEN: PASS` both times, then run `scripts/test.sh`.

If you remove or rename a scenario, delete its golden file as well.

## Story S13 re-record

Story S13 added the overlap screens (one per applicable section, between the income-protection policies and
the summary) and the "Your insurer action list" section at the bottom of the summary. Every old scenario now
answers those screens before its summary. The goldens were compared against the ones at the commit before the
story, on the recorded text (not the `step` labels, which shift after an insertion):

- **325 of the 340 old screens are byte-identical**: everything before the overlap screens, and, in
  `oh-restart-replay`, everything after Start over up to the second summary. This holds because the
  "What we know" panel, which is part of every capture, shows its new "Overlap questions: a / b" row only on
  the overlap screens and the summary.
- **The other 15 are the summary screens** (one per old scenario, two in `oh-restart-replay`). Each keeps every
  old line, in the same order, and gains only the "Your insurer action list" section (between "Add a real
  declarations page..." and "[Start over]") and that one "Overlap questions" row.
- **164 entries are new**, all overlap screens (answers, Continue disabled then enabled, gated follow-ups,
  Not sure), and **three new scenarios** add 86 screens (590 in all).

So the diff is only inserted new-screen steps plus the summary screen content. A passing replay of the old
scenarios' early steps is therefore still the proof that the existing screens did not change. Because the
summary now shows the real flag copy, a later story that edits that copy or adds a flag that fires in one of
these scenarios (S10, S11, S12) must re-record the affected summary steps deliberately, and say so.

### Re-record after S10 (integration)

S10's health and deductible flags merged after S13 was written and fire in 11 of the 17 scenarios, so one summary
screen in each of those scenarios was re-recorded (DECISIONS S13-13). The change is only added Question items
and the new count in the list's first line; every line before the "Your insurer action list" heading and from
"[Start over]" on is unchanged. S11 and S12 should expect the same.

### Re-record after S15

S15 added two lines to the entry screen (the not-advice sentence and the privacy line, under the state picker) and
replaced the privacy line at the foot of the action list with one that follows the analytics setting. The goldens
were re-recorded; of 590 entries, 37 (every screen that shows the entry page) gain exactly those two lines before
"[Get started ...]", 18 summaries (one per scenario, two in `oh-restart-replay`) swap the old privacy line for the new one,
and 535 are byte-identical (DECISIONS S15-8). The line depends on `provider` in `public/js/config.mjs`: choosing a
provider changes it, so the goldens must be re-recorded again then (`tests/ui/analytics.test.mjs` fails until they are).
The app's CSP (`public/_headers`, `frame-ancestors 'none'`) blocks this harness's iframe, so replay and record on a plain
static server as above, not behind `scripts/serve.py`.

## Files

| file | role |
|---|---|
| `golden.html` | the page: loads the scenarios, runs them, writes `#result`, the scenario list, and `#record` |
| `runner.mjs` | step ops (including `answer`), text capture, iframe driving, diff, report |
| `scenarios.mjs` | the scenarios (plain data) |
| `golden/<id>.mjs` | recorded goldens, `export default [{ step, text }, ...]` |
| `record-server.py` | optional dev helper for re-recording |
| `golden-shape.test.mjs` | fast jsc test of scenario/golden shape and screen coverage |

The harness re-fetches the app and everything it references with `cache: "reload"` before each run, so a
plain `python3 -m http.server` (which sends no cache headers) cannot make a replay test stale code.
