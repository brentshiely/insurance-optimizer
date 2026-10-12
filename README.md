# Coverage Check

A short question flow that shows a household where its insurance overlaps (paying twice) or leaves gaps, and ends in a list of what to **raise**, **drop** or **question** with the insurer.

You tick the policies you have. The page asks a few quick questions about only those, every one a pick from a short list with "Not sure" wherever it makes sense, and then gives you the insurer action list. Each item has the background (why it matters, so you can hold your own if an agent pushes back), what to ask, a one-line reason you can repeat, and a citation to an authoritative source (NAIC, Insurance Information Institute, FEMA, federal agencies and similar), with the date it was last checked.

It is a fixed decision tree. No AI at runtime, no account, nothing typed, nothing uploaded, nothing stored. The product is defined by [docs/SPEC.md](docs/SPEC.md) and by nothing else; [docs/TRACEABILITY.md](docs/TRACEABILITY.md) maps every requirement in it to the code and the tests, and says which are deferred or deviate and why.

**Status.** Built and tested, not deployed. The credit-card lookup table is deferred (the card questions and the card-aware wording are built, the table of card benefits is empty, so card wording is generic): [docs/DECISIONS.md](docs/DECISIONS.md) D14, and the steps to finish it in [docs/OPEN-ITEMS.md](docs/OPEN-ITEMS.md) `S16-7`. What only the owner can do before launch (licensing check, analytics choice, deploy) is the first section of that file.

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
npm test                        # the unit suite: macOS JavaScriptCore (jsc), or Node if present (scripts/test.sh [filter])
scripts/update-snapshots.sh     # rewrite the committed snapshots after a deliberate change (--check only compares)
```

There is no Node on the author's machine, so the unit tests run under `jsc`. The pure core (`public/js/overlap/`) avoids the DOM, Node APIs, `URL`, `console`, timers, `structuredClone` and `fetch` so it runs unchanged there, in Node and in browsers.

### Testing tiers

| Tier | What it is | How to run it |
|---|---|---|
| Unit | The engine (conditions, session, evaluation, validation, the liability stack), the question catalog, every flag file, the source registry, the research files, the view-models, the HTML builders and the analytics adapter (`tests/engine/`, `tests/data/`, `tests/flags/`, `tests/research/`, `tests/ui/`). | `npm test`, or `scripts/test.sh audit` for one folder |
| Snapshots | The stack model over every limit combination, the scenario matrix (which household sees which items, and every distinct wording they reach), the stack drawing (`tests/snapshots/`). | `scripts/update-snapshots.sh --check`; regenerate only deliberately ([tests/snapshots/README.md](tests/snapshots/README.md)) |
| Audits | Rules over the whole catalog: every flag is triggered by a scenario and sourced, no placeholder or state name in any text, a Drop always has evidence of a duplicate, 1,500 random households, every SPEC line mapped, and the traceability document checked against the SPEC (`tests/audit/`). | part of `npm test` |
| Browser goldens | 32 scripted journeys replayed through the real page, comparing every screen's text with recorded goldens (`tests/browser/`). | serve the repo root (`python3 -m http.server 8200 --bind 127.0.0.1`), open `http://127.0.0.1:8200/tests/browser/golden.html` in a tab that is in front and read the result; [tests/browser/README.md](tests/browser/README.md) has the details, including how to re-record after a deliberate change |

The unit tiers need no browser. The goldens need one, and they cannot run behind the page's Content-Security-Policy, so replay them on a plain static server.

## Layout

```
public/                  deployed as-is
  index.html             thin shell: brand line, the screen area, the "Your policies" panel
  css/app.css            all styles (light and dark themes, print rules for the list)
  js/app.js              the page: two pieces of state (the answers and the screen index) around the modules below
  js/config.mjs          site settings the owner edits (the analytics provider, default none)
  js/overlap-ui/         view-models, HTML-string builders, DOM helpers, the stack drawing, analytics
  js/overlap/            the pure engine: question catalog, flags, liability stack, source registry, card table
  _headers               Cloudflare Pages headers: the Content-Security-Policy and friends
docs/                    SPEC (frozen), TRACEABILITY, ARCHITECTURE, DECISIONS, OPEN-ITEMS, QUESTION-FLAG-PLAN, STORIES and PROGRESS (the build history), archive/
research/                verified research (sources and facts) behind the flags (not deployed)
tests/                   unit tests, fixtures, the scenario matrix, audits, snapshots, browser goldens
scripts/                 test.sh, serve.sh, serve.py, update-snapshots.sh
```

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) is the design: the data contracts, the engine, the page, the liability stack, analytics and the CSP.

## How the content is organized

Everything a person reads is plain data under `public/js/overlap/data/`, read by a small pure engine. Nothing in the data touches the DOM.

- **Questions** (`data/questions/`): one file per wizard section, assembled by `questions/index.mjs`. Every question is a closed list (`single` or `multi`) with a `showIf` gate; Q1 (`policies.mjs`) is the first, and every other gate reads it through `{ holds: 'auto' }` or an earlier answer. "Not sure" is added by the engine wherever a question allows it. `sections.mjs` groups questions into screens and gives each its one-line reason.
- **Flags** (`data/flags/`): one file per domain (`umbrella`, `umbrellaScope`, `vehicles`, `auto`, `home`, `renters`, `health`, `deductible`, `other`), each a list of items with a bucket (`raise`, `drop`, `question`), an `applies(ctx)` function that reads answers, and `title`, `background`, `ask`, `reason` and `sourceIds`. A flag with no resolvable source fails validation.
- **Sources** (`data/sources.mjs`): the registry of 89 pages, each `{ id, publisher, title, url, lastVerified }`, built only from pages a researcher fetched and a verifier re-checked (`research/`, indexed in `research/INDEX.md`). A flag cites a source by id; it never writes a URL.
- **Cards** (`data/cards.mjs`): a table keyed by card id, `{ name, issuer, lastVerified, guideUrl, benefits }`, one status per benefit (`primary`, `secondary`, `yes`, `none`, `unverified`). It is empty today (deferred, D14). The `cards` question already offers 12 intended cards as static choices (`CARD_CHOICES` in `questions/cards.mjs`), and the Other-bucket flags name a card only when the table confirms the benefit, always with "check your card's current benefits guide".
- **The liability stack** (`engine/liabilityStack.mjs`): one model of the umbrella and the limits under it, read by the umbrella flags and drawn by `overlap-ui/stackView.mjs` on the umbrella screens and in the list.

## Changing the content

- **A flag** (an item that can appear on the list): add it to the matching file in `public/js/overlap/data/flags/` with `background`, `ask`, `reason` and at least one `sourceIds` entry (pick ids from `research/INDEX.md`). The contract is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Flag"). Then: its own tests under `tests/flags/`; a scenario that triggers it in `tests/scenarios/scenarios.mjs`; a row in `tests/audit/spec-checklist.test.mjs` (which SPEC line it implements) and in the `REQUIRES` table of `tests/audit/households.test.mjs` (which policies it is about); if it is a Drop, a rule in `tests/audit/evidence.mjs` saying what already covers it (a flag that may be a Drop for one household and a Question for another declares `alternateBuckets` and returns `bucket` from `applies`); a row in [docs/QUESTION-FLAG-PLAN.md](docs/QUESTION-FLAG-PLAN.md) and `tests/fixtures/flagPlan.mjs`; a row in [docs/TRACEABILITY.md](docs/TRACEABILITY.md) and its flag appendix. Regenerate the scenario snapshots (`scripts/update-snapshots.sh scenario`) and re-record the goldens it changes. The failure messages of the audits name what is missing.
- **A question**: add it to the section file in `public/js/overlap/data/questions/` (closed list, a `showIf` gate that reads Q1 through `holds` or an earlier answer, "Not sure" unless there is a reason not to), update [docs/QUESTION-FLAG-PLAN.md](docs/QUESTION-FLAG-PLAN.md) and `tests/fixtures/flagPlan.mjs`, add a row to TRACEABILITY, and answer it in a browser scenario (a test fails until every question is answered by one).
- **A source**: verify the page by reading it, add it to the right `research/*.mjs` file and `research/INDEX.md`, then to `public/js/overlap/data/sources.mjs`. Only authority sources allowed by SPEC "Sources and authority" pass the tests.
- **A Q1 policy**: add the option to `public/js/overlap/data/questions/policies.mjs` and its id to `POLICY_IDS` in `public/js/overlap/engine/constants.mjs`; tests pin the order and the SPEC list.
- **A credit card**: research it from the issuer's own current benefits guide (anything not confirmed there is `unverified`, never guessed) into a `research/cards-*.mjs` file, have a second reader re-check the guide, then add its entry to `CARDS` in `public/js/overlap/data/cards.mjs` with all six benefit keys, keyed by the same kebab-case id as its entry in `CARD_CHOICES` (the question's option id is that id with hyphens turned into underscores). Re-verify the table at least once a year: [docs/OPEN-ITEMS.md](docs/OPEN-ITEMS.md) `S16-8`.

After any change that alters what a user reads, run `npm test`, replay the browser goldens, and re-record only the scenarios the change is meant to alter.

## Privacy

Answers live in memory on the page and nowhere else: no cookies, no `localStorage`, no `sessionStorage`, no IndexedDB, nothing in the URL, no network call that carries an answer (tests scan every file the page loads for these). The page asks for no name, address or email, and nothing is typed or uploaded. Optional anonymous counting (Plausible, Fathom or Cloudflare Zaraz) is **off** by default; when an owner turns it on it can send only the name of an event and a closed-list label such as `auto_liability=250_500`, never an identifier or a figure, and the privacy line on the page changes to say so. See ARCHITECTURE "Analytics (S15)" and OPEN-ITEMS `S16-3`.

## Deploy

Hosted on Cloudflare Pages, project `coverage-check`. **Deploys are manual and never automatic**: pushing to the repository does not deploy, nothing in the tests or scripts deploys, and automated work on this project never runs the deploy command.

```bash
npm install
npm run deploy      # wrangler pages deploy public --project-name coverage-check
```

The first deploy replaces the old prototype that coverage-check.pages.dev serves today (its code is kept in git under the tags `prototype-coverage-check` and `prototype-extended-before-replacement`). Before you deploy, read the launch checklist, [docs/OPEN-ITEMS.md](docs/OPEN-ITEMS.md) `S16-1`. After it, check the live headers (`curl -sI https://coverage-check.pages.dev/`) and open the page with the browser console open.
