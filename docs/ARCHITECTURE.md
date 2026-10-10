# Architecture

How the Insurance Overlap & Trim work is built **into the existing Coverage Check app** (this repo, deployed from `public/` to Cloudflare Pages project `coverage-check`). `docs/SPEC.md` is the product spec for the new work; `coverage-check-wizard-handoff.md` holds the existing app's principles, which still apply. Where a story finalizes or changes a contract, it MUST update this file in the same commit.

## What exists, what we add

- **Existing (keep working, keep its look):** the wizard in `public/index.html`: state picker, own/rent, dependents, vehicles, motor extras, qualifiers, per-policy screens with editable numbers, state-driven findings with citations, umbrella screen, summary, light/dark theme, the "Prototype telemetry" panel (local only).
- **Added by this work:** a pure, tested **overlap engine** (decision tree, flags, liability stack, source registry, credit-card table) and new wizard screens that feed it, ending in the spec's **insurer action list** (Raise / Drop / Question, each with Background, Ask, one-line Reason, Source).

## Principles

- **Additive and behavior-preserving.** Existing screens and findings keep behaving identically unless a story explicitly changes them. A browser golden-master (S1) guards this.
- **No AI/LLM at runtime.** Fixed decision tree; identical answers give byte-identical output.
- **No personal data stored or sent.** No cookies, `localStorage`, `sessionStorage`, IndexedDB, URL/query/hash state, or network calls carrying answers. Answers live in memory only. Analytics (S15) sends only closed-list labels.
- **Pure core.** Everything under `public/js/overlap/` is pure ES2022: no DOM, no Node APIs, and none of `URL`, `console`, `setTimeout`, `structuredClone`, `fetch`. It runs unchanged under macOS `jsc`, Node, and browsers. Only `public/js/app.js` and `public/js/overlap-ui/**` touch the DOM.
- **State-neutral overlap flags.** The host app asks for a state, but overlap flags never branch on it and never name one (SPEC "Sources and authority"). Refer generically to "your state's department of insurance". Existing state-driven findings are unchanged.
- **The engine never reads policy-screen numbers.** Per-policy screen fields are editable sample defaults the user may never have touched. The engine reads only (a) coarse categorical answers the host already collects and (b) its own closed-list questions with a "Not sure" option. No silent defaults.
- **Every flag is sourced.** A flag with no resolvable source fails validation and the suite. Overlap sources follow SPEC "Sources and authority" (non-commercial; no insurer/agency/comparison sites). Existing `SRC` entries in `app.js` that are commercial are logged in `docs/OPEN-ITEMS.md`, not silently changed.
- **Zero build, zero dependencies** for the site. `wrangler` stays a dev dependency used only by `npm run deploy`, which this work never runs.

## Environment and testing

- This machine has **no Node**. Unit tests run under macOS JavaScriptCore: `scripts/test.sh [path-substring]` (also `npm test`; falls back to Node if present). Runner: `tests/harness.mjs` (`test`, `suite`, `assert`, `assertSnapshot`, `serialize`). Synchronous tests, `tests/**/*.test.mjs`, auto-discovered.
- jsc has **no `URL`, `console`, `fetch`, `structuredClone`**; it has `print` and `read(path)`. Pure modules and tests must not use them.
- Data modules are `.mjs` with `export default <plain data>` (never `.json`) so tests can import them.
- **Browser tests (UI stories).** Serve the repo root with the `site-root` config in `.claude/launch.json` (`mcp__Claude_Browser__preview_start name:"site-root"`, http://127.0.0.1:8080) and drive pages with the Browser pane tools. The app is at `/public/index.html`. `tests/browser/golden.html` replays scripted scenarios through the real app in a same-origin iframe, compares each screen's text with recorded goldens, and writes `GOLDEN: PASS` or `GOLDEN: FAIL ...` into `<pre id="result">` (read it with `get_page_text`). Volatile text (seconds, tap counts) is normalized. S1 defines the mechanics and documents them in `tests/browser/README.md`.
- Snapshots: `tests/snapshots/*.snap.mjs` (`export default <plain data>`), compared with `assertSnapshot`. Regenerated only deliberately via `scripts/update-snapshots.sh`; any snapshot diff must be explainable by the story.
- `npm run deploy` publishes the live site. **Never run it.** Pushing to `main` does not deploy.

## Layout

```
public/                          (deployed as-is)
  index.html                     shell (S1: CSS and JS moved out)
  css/app.css                    existing styles + new component styles
  js/app.js                      existing wizard logic as an ES module; integration points for overlap
  js/overlap/                    NEW pure modules
    engine/ conditions.mjs session.mjs render.mjs evaluate.mjs validate.mjs liabilityStack.mjs adapter.mjs
    data/   sources.mjs cards.mjs catalog.mjs questions/*.mjs flags/*.mjs
  js/overlap-ui/                 NEW DOM code for the new screens (questions, action list, stack view, analytics)
docs/                            SPEC (frozen), ARCHITECTURE, STORIES, PROGRESS, DECISIONS, OPEN-ITEMS
research/                        verified research (.mjs), inputs to sources, cards, flag copy (not deployed)
tests/                           harness, unit tests, scenarios, snapshots, browser/
scripts/                         test.sh, serve.sh, update-snapshots.sh
coverage-check-wizard-handoff.md existing app principles (kept)
```

## Core data contracts

### Host state and the adapter
The host keeps its state object `S`. S1 adds `S.o` (overlap answers keyed by question id). `adapter.mjs` exports `deriveAnswers(snapshot)` where `snapshot = { a, extras, q, p, o }` (plain copies of `S.a`, `S.extras`, `S.q`, `S.p`, `S.o`; `state` is deliberately excluded). It returns the engine's `answers` and is pure and unit-tested. Derived `policies` (multi) answer:

| policy id | derived from host |
|---|---|
| `auto` | `a.veh` is "1", "2" or "3+" |
| `home` | `a.home` is "Own" or "Both" |
| `renters` | `a.home` is "Rent" or "Both" |
| `health` | `q.health === "Yes"` |
| `umbrella` | `p.umbrella.hasUmbrella === "Yes"` |
| `motorcycle` | `extras` includes "Motorcycle" |
| `boat` | `extras` includes "Boat" (Jet ski, RV, ATV, E-bike are v1 out of scope, per SPEC fast-follow) |
| `rental_car`, `towing`, `travel`, `phone`, `warranty`, `accidental_death` | the user's `o.other_items` selections |

All other answers are the user's own `o.*` selections. Policy-screen numbers (`p.auto.liability` etc.) are never read.

### Answers
Plain JSON `{ [questionId]: optionId | optionId[] }`, plus the derived `policies` array. Single questions hold one option id, multi questions an array. Unanswered = key absent. `'not_sure'` is the reserved option id for "Not sure". Only closed-list option ids exist; no free text anywhere.

### Question
```js
{
  id: 'auto_liability',            // snake_case, unique
  domain: 'core'|'umbrella'|'auto'|'home'|'renters'|'health'|'vehicles'|'deductible'|'other'|'cards',
  section: 'umbrella'|'auto'|...,  // which wizard screen groups it (S5 finalizes the list)
  type: 'single'|'multi',
  prompt: 'What is the most your auto policy will pay ...?',
  help: 'Where to find this / why we ask (plain language)',   // optional
  options: [{ id: '250_500', label: '250/500', value: { perPerson: 250000, perAccident: 500000 }, exclusive?: true }],
  allowNotSure: true,              // engine appends { id:'not_sure', label:'Not sure' }
  showIf: Condition | null,        // null = always shown (subject to its section being shown)
}
```
Option `value` carries machine-comparable data (numbers or `{min,max}` bands); labels are display only.

### Condition DSL (data, serializable)
```
{ holds: 'auto' }                           // derived `policies` includes this id
{ answer: 'qid', is: 'optId' }              // single
{ answer: 'qid', in: ['a','b'] }            // single, any-of
{ answer: 'qid', includes: 'optId' }        // multi
{ answered: 'qid' }
{ all: [c...] }  { any: [c...] }  { not: c }
```
A question is visible iff its `showIf` is true AND every question its `showIf` references is itself visible (transitive). `evaluate()` prunes answers to non-visible questions first, so stale answers never leak into results.

### Source (registry entry) - required fields
```js
{ id:'iii-umbrella', publisher:'Insurance Information Institute', title:'...', url:'https://...', lastVerified:'2026-10-10' }
```
All four required; `url` https; `lastVerified` `YYYY-MM-DD`.

### Flag
```js
{
  id: 'umbrella-home-below-required-min',   // kebab-case, unique
  domain, bucket: 'raise'|'drop'|'question',
  kind: 'cross-policy'|'within-policy'|'education',
  priority: 10,                              // lower sorts first within bucket; ties by id
  title: 'Raise your home liability to your umbrella\'s required minimum',
  applies(ctx): false | null | { emphasis?: 'normal'|'strong', vars?: {name: string|number} },
  background: string | (ctx, vars) => string,
  ask:        string | (ctx, vars) => string,
  reason:     string | (ctx, vars) => string,
  sourceIds: ['iii-umbrella', ...],          // >= 1, each must exist in SOURCES
}
```
Strings may contain `{{var}}` tokens resolved from `vars`; an unresolved token is an error. `applies` is pure and deterministic.

### Context (`ctx`)
`ctx.holds(policyId)`, `ctx.answer(qid)`, `ctx.is(qid, optId)`, `ctx.includes(qid, optId)`, `ctx.isNotSure(qid)`, `ctx.option(qid)` (chosen option object, `.value` available), `ctx.cards()` (selected CARDS entries), `ctx.cardsWith(benefitKey)`, `ctx.stack` (LiabilityStack model or null). Reading a non-visible/unanswered question returns `undefined`/`false`; it never throws.

### Results
```js
evaluate(answers) -> {
  flags: { raise: ResultFlag[], drop: ResultFlag[], question: ResultFlag[] },
  stack: LiabilityStack | null,
  meta: { visibleQuestionIds: string[], answeredCount: number }
}
// ResultFlag: { id, bucket, domain, kind, title, emphasis, background, ask, reason,
//               sources: [{ id, publisher, title, url, lastVerified }] }   // text fully rendered
```
Ordering: bucket, then `priority` ascending, then `id`. Same answers => deep-equal results.

### Card (`data/cards.mjs`)
Keyed by card id: `{ id, name, issuer, lastVerified, guideUrl, benefits: { rentalCar, tripProtection, cellPhone, extendedWarranty, purchaseProtection, roadside } }`, each benefit `{ status: 'primary'|'secondary'|'yes'|'none'|'unverified', summary, conditions? }`. `unverified` is never presented as fact. The UI always tells users to check their own card's current benefits guide.

### LiabilityStack
One engine, `computeLiabilityStack(input)` (S6), documented here when it lands. Models underlying policies (auto, home, motorcycle, boat) and the umbrella: limits, required minimums, per-layer status (`ok`, `below_required`, `above_required`, `unknown`). Flags consume `ctx.stack`; the visualization (S14) renders the same model.

## UI integration (S13)
`order()` in `app.js` gains overlap screens after the existing income-protection policies and before `summary`: one `ovl:<section>` screen per section that has visible questions (generic question renderer built from the catalog, using existing classes `.opts/.opt`, `.chips/.chip`, `.qrow/.yn2`, `.item`, `.tag`, `.src`), then the action list. Rendering and event handling for those screens live in `js/overlap-ui/`. The existing `umbrella` screen is kept as-is; it supplies `hasUmbrella`.

## Analytics (S15)
Provider-pluggable adapter (`none` default, `plausible`, `fathom`, `zaraz`). Events are `{ name, label }` only; `name` from a fixed allowlist, `label` a `questionId=optionId` or `flagId` string from closed lists. No identifiers, cookies, free text, or precise figures; adequacy and cushion are band ids only. The adapter refuses anything outside the allowlist, and a test enforces it. The existing local-only telemetry panel is unchanged and never transmitted.

## Conventions
- IDs: questions/options `snake_case`; flags/sources/cards `kebab-case`.
- Copy: plain language, second person, jargon defined in a clause, matches the existing app's voice (see handoff principle 5). No "home equity", "next screen", "generic patterns".
- Dates: ISO `YYYY-MM-DD`; `lastVerified` is the day the page was actually fetched and read.
- Every story: tests added, `scripts/test.sh` green (and browser tests for UI stories), `docs/PROGRESS.md` updated, `docs/DECISIONS.md` updated for any deviation, then committed and pushed to `main`.
