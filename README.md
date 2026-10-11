# Coverage Check

A short question flow that shows a household where its insurance overlaps (paying twice) or leaves gaps, and ends in a list of what to **raise**, **drop** or **question** with the insurer.

You tick the policies you have. The page asks a few quick questions about only those, every one a pick from a short list with "Not sure" wherever it makes sense, and then gives you the insurer action list. Each item has the background (why it matters, so you can hold your own if an agent pushes back), what to ask, a one-line reason you can repeat, and a citation to an authoritative source (NAIC, Insurance Information Institute, FEMA, federal agencies and similar), with the date it was last checked.

It is a fixed decision tree. No AI at runtime, no account, nothing typed, nothing uploaded, nothing stored. The product is defined by [docs/SPEC.md](docs/SPEC.md) and by nothing else: the earlier prototype of this site was discarded, see [docs/DECISIONS.md](docs/DECISIONS.md) D15. Its handoff document is kept for history in [docs/archive/](docs/archive/coverage-check-prototype-handoff.md).

## The flow

1. **Entry screen**: what this is, the "not insurance advice" note and the privacy line.
2. **Q1, "Which policies do you have?"**: auto, home, renters, umbrella, health, motorcycle, boat, and the "Other" items (rental car, towing or roadside, travel, phone, extended warranties, accidental death), or "None of these".
3. **Only the relevant sections**, each with a one-line reason tied to what you ticked: umbrella limits, motorcycle or boat under the umbrella, umbrella scope, auto gaps, renters, health extras, home exclusions, deductibles against your cash cushion, credit cards, and extras detail. The umbrella screens draw the liability stack (the umbrella on top of the limits under it).
4. **The insurer action list**, grouped Raise / Drop / Question, with Copy and Print.

Back, Continue and Start over work throughout, and the progress bar follows the screens that apply to you.

## Run, test, preview

The site is plain HTML, CSS and ES modules under `public/`: no build step and no dependencies. It must be served over http(s); opening `public/index.html` from disk does not work, because browsers block module scripts on `file://`.

```bash
npm run preview                 # serves public/ at http://127.0.0.1:8765/
python3 scripts/serve.py public # same, but applies public/_headers (the Content-Security-Policy), port 8766
npm test                        # unit tests: macOS JavaScriptCore (jsc), or Node if present (scripts/test.sh [filter])
```

There is no Node on the author's machine, so the unit tests run under `jsc`. The pure core (`public/js/overlap/`) avoids the DOM, Node APIs, `URL`, `console`, timers, `structuredClone` and `fetch` so it runs unchanged there, in Node and in browsers.

**Browser goldens.** `tests/browser/` replays 26 scripted journeys through the real page and compares every screen's text with recorded goldens, so a change to what a user reads or can do fails loudly. Serve the repo root (`python3 -m http.server 8200 --bind 127.0.0.1`), open `http://127.0.0.1:8200/tests/browser/golden.html` and read the result; [tests/browser/README.md](tests/browser/README.md) has the details, including how to re-record after a deliberate change.

## Layout

```
public/                  deployed as-is
  index.html             thin shell: brand line, the screen area, the "Your policies" panel
  css/app.css            all styles (light and dark themes, print rules for the list)
  js/app.js              the page: two pieces of state (the answers and the screen index) around the modules below
  js/config.mjs          site settings the owner edits (the analytics provider, default none)
  js/overlap-ui/         view-models, HTML-string builders, DOM helpers, the stack drawing, analytics
  js/overlap/            the pure engine: question catalog, flags, liability stack, source registry
  _headers               Cloudflare Pages headers: the Content-Security-Policy and friends
docs/                    SPEC (frozen), ARCHITECTURE, DECISIONS, OPEN-ITEMS, STORIES, PROGRESS, QUESTION-FLAG-PLAN, archive/
research/                verified research (sources and facts) behind the flags (not deployed)
tests/                   unit tests, fixtures, snapshots, browser goldens
scripts/                 test.sh, serve.sh, serve.py, update-snapshots.sh
```

## Changing the content

- **A flag** (an item that can appear on the list): add it to the matching file in `public/js/overlap/data/flags/`, with `background`, `ask`, `reason` and at least one `sourceIds` entry. A flag without a source fails the tests. The contract is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Flag"); add its scenario tests under `tests/flags/`.
- **A question**: add it to the section file in `public/js/overlap/data/questions/` (closed list, a `showIf` gate that reads Q1 through `holds` or an earlier answer, "Not sure" unless there is a reason not to), update [docs/QUESTION-FLAG-PLAN.md](docs/QUESTION-FLAG-PLAN.md), and add it to a browser scenario (a test fails until every question is answered by one).
- **A source**: verify the page by reading it, add it to the right `research/*.mjs` file and `research/INDEX.md`, then to `public/js/overlap/data/sources.mjs`. Only authority sources allowed by SPEC "Sources and authority" pass the tests.
- **A Q1 policy**: add the option to `public/js/overlap/data/questions/policies.mjs` and its id to `POLICY_IDS` in `public/js/overlap/engine/constants.mjs`; tests pin the order and the SPEC list.

After any change that alters what a user reads, run `npm test`, replay the browser goldens, and re-record only the scenarios the change is meant to alter.

## Privacy

Answers live in memory on the page and nowhere else: no cookies, no `localStorage`, no `sessionStorage`, no IndexedDB, nothing in the URL, no network call that carries an answer (tests scan every file the page loads for these). The page asks for no name, address or email, and nothing is typed or uploaded. Optional anonymous counting (Plausible, Fathom or Cloudflare Zaraz) is **off** by default; when an owner turns it on it can send only the name of an event and a closed-list label such as `auto_liability=250_500`, never an identifier or a figure, and the privacy line on the page changes to say so. See ARCHITECTURE "Analytics (S15)".

## Deploy

Hosted on Cloudflare Pages, project `coverage-check`. Deploys are manual and are never run by automated work:

```bash
npm install
npm run deploy
```

Pushing to the repository does not deploy.
