# Architecture

How the Insurance Overlap & Trim work is built **into the existing Coverage Check app** (this repo, deployed from `public/` to Cloudflare Pages project `coverage-check`). `docs/SPEC.md` is the product spec for the new work; `coverage-check-wizard-handoff.md` holds the existing app's principles, which still apply. Where a story finalizes or changes a contract, it MUST update this file in the same commit.

## What exists, what we add

- **Existing (keep working, keep its look):** the wizard (shell `public/index.html`, logic `public/js/app.js`, styles `public/css/app.css`): state picker, own/rent, dependents, vehicles, motor extras, qualifiers, per-policy screens with editable numbers, state-driven findings with citations, umbrella screen, summary, light/dark theme, the "Prototype telemetry" panel (local only).
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
- **Browser tests (UI stories).** Each story works in its own git worktree and serves it with its own static server on its own port (`python3 -m http.server <port> --bind 127.0.0.1` from the worktree root; the app is at `/public/index.html`) and drives it from its own Browser pane tab (`tabs_create`, then pass that `tabId` on every call; never touch other tabs). `tests/browser/golden.html` replays scripted scenarios through the real app in a same-origin iframe, compares each screen's text with recorded goldens, and writes `GOLDEN: PASS` or `GOLDEN: FAIL ...` into `<pre id="result">` (read it with `get_page_text`). Volatile text (seconds, tap counts) is normalized. S1 defines the mechanics and documents them in `tests/browser/README.md`: `<pre id="result">` starts as `GOLDEN: RUNNING` (poll until it changes), then its first line is exactly `GOLDEN: PASS` or `GOLDEN: FAIL <scenarioId> step <n>` (step 0 = initial load, step k = after the k-th entry of the scenario's `steps`); a filtered run (`?only=`) reports `GOLDEN: PASS-PARTIAL`, which is not a full pass. Scenarios are plain data in `tests/browser/scenarios.mjs`; goldens are `tests/browser/golden/<id>.mjs` and change only deliberately (README, "Re-recording").
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
            constants.mjs util.mjs        (internal: closed lists, reserved ids, tiny helpers)
    data/   sources.mjs cards.mjs catalog.mjs questions/index.mjs flags/{index,umbrella,umbrellaScope,vehicles,auto,home,renters,health,deductible,other}.mjs
  js/overlap-ui/                 NEW DOM code for the new screens (questions, action list, stack view, analytics)
docs/                            SPEC (frozen), ARCHITECTURE, STORIES, PROGRESS, DECISIONS, OPEN-ITEMS
research/                        verified research (.mjs), inputs to sources, cards, flag copy (not deployed)
tests/                           harness, unit tests (tests/engine/), fixtures/ (fixture catalog), helpers/ (purity helpers), scenarios, snapshots, browser/
scripts/                         test.sh, serve.sh, update-snapshots.sh
coverage-check-wizard-handoff.md existing app principles (kept)
```

**How the shell loads the app (S1).** `index.html` holds markup and metadata only. It links `css/app.css` in `<head>` and loads `js/app.js` with `<script type="module">` at the end of `<body>`. Both paths are relative, so the site works with `public/` as the web root (Cloudflare Pages, `npm run preview`). Module scripts need http(s): the page does not work from `file://`. `app.js` is still one IIFE around the original wizard code (the split moved it verbatim), so nothing is imported or exported yet; later stories add `import` lines at the top of `app.js` for `js/overlap/` and `js/overlap-ui/`. There is no inline `<script>` or `<style>` left, but four inline `style="..."` attributes remain (see DECISIONS S1-6, for S15's CSP).

## Core data contracts

### Host state and the adapter
The host keeps its state object `S`. S1 adds `S.o` (overlap answers keyed by question id; starts as `{}` and is rebuilt as `{}` by "Start over"; nothing reads it until S13). `adapter.mjs` exports `deriveAnswers(snapshot)` where `snapshot = { a, extras, q, p, o }` (plain copies of `S.a`, `S.extras`, `S.q`, `S.p`, `S.o`; `state` is deliberately excluded). It returns the engine's `answers` and is pure and unit-tested. Derived `policies` (multi) answer:

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

Built behavior of `deriveAnswers(snapshot)` (`engine/adapter.mjs`):
- Returns a fresh plain object: every `o.*` entry copied by question id (`undefined`/`null` skipped; arrays cloned; no filtering, pruning unknown keys is the session's job) plus `policies`, a sorted, duplicate-free string array. `o.other_items` is both passed through as an answer and folded into `policies` (only the six Other-bucket ids count). An `o.policies` key, if present, is ignored: `policies` is always derived.
- Reads only `snapshot.{a,extras,q,p,o}`; from them only `a.home`, `a.veh`, `q.health`, `p.umbrella.hasUmbrella`, `extras` membership and `o`. Only the host's exact values count (`"Own"`, `"3+"`, `"Yes"`, `"Motorcycle"` ...). Missing, `null` or wrongly typed parts count as absent. Never mutates the snapshot. Tests record every property read to prove this.

### Answers
Plain JSON `{ [questionId]: optionId | optionId[] }`, plus the derived `policies` array (reserved key, not a question; `holds` conditions and `ctx.holds` read it). Single questions hold one option id, multi questions an array. Unanswered = key absent. `'not_sure'` is the reserved option id for "Not sure". Only closed-list option ids exist; no free text anywhere.

Pruning (`session.prune`, run first by `evaluate`) returns a new answers object holding only valid answers to visible questions: unknown option ids, wrong shapes (array for a single question, string for a multi) and keys that are not questions are dropped; a multi answer is put in the question's option order, deduplicated, an exclusive option (e.g. "None of these", `not_sure`) wins over the others, and an empty multi answer counts as unanswered; `policies` is kept, deduplicated and sorted.

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

Details fixed by S2 (`engine/session.mjs`, `engine/validate.mjs`):
- `createSession(catalog)` resolves each question into a deep-frozen copy; with `allowNotSure` it appends `{ id:'not_sure', label:'Not sure' }` (for `type:'multi'` also `exclusive:true`). Authors never list `not_sure` themselves (validation rejects it). Conditions may refer to `not_sure` only on a question with `allowNotSure`.
- `exclusive: true` on a multi option means picking it clears the other options and picking another clears it (e.g. "None of these").
- `domain` is one of the `DOMAINS` list in `engine/constants.mjs` (the ten values above). `section` is a snake_case string. Question and option ids are snake_case (option ids may start with a digit, e.g. `250_500`, `1m`). `showIf` may be omitted (same as `null`).
- The multi question with id **`cards`** is the card question (`CARDS_QUESTION_ID`). Each of its options names a card via `value: { cardId: 'chase-sapphire-preferred' }`; an option without `value.cardId` falls back to its id with `_` turned into `-`. Non-card options (e.g. "None of these") simply match no card. Validation checks every `value.cardId` exists in `cards`.

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

Built behavior (`engine/conditions.mjs`):
- `evaluateCondition(cond, env)` with `env = { answers }` (the answers object, including `policies`). Returns a boolean. `is`/`in` match only single (string) answers, `includes` only multi (array) answers, `answered` is true for any non-empty answer including `not_sure`; unanswered or inherited keys are never matches.
- Malformed conditions throw an `Error` ("Malformed condition: ...") naming the path of every problem. The whole tree is checked before evaluating, so a bad branch is reported even if an earlier branch would short-circuit. Rejected: non-objects, empty objects, unknown forms, extra keys, `answer` without exactly one of `is`/`in`/`includes`, non-string ids, empty `in`, empty or non-array `all`/`any`.
- Also exported: `checkCondition(cond) -> string[]` (problems, never throws) and `conditionRefs(cond) -> { answers: [{ qid, form, optionIds }], holds: [policyId] }`, used by the session and by validation.
- Session visibility rules: a reference to a question that does not exist hides the question (validation reports it); a condition cycle throws "Condition cycle between questions: a -> b -> a" (validation reports it first). A `not` gate whose referenced question is hidden is hidden too (transitivity wins).
- Session API (`createSession(catalog)`): `questions`, `getQuestion(qid)`, `isVisible(qid, answers)`, `visibleQuestions(answers)`, `prune(answers)`, `setAnswer(answers, qid, value)`, `toggleOption(answers, qid, optionId)` (multi only), `clearAnswer(answers, qid)`, `nextUnanswered(answers, section?)`. The three change helpers return new objects, never mutate their input, throw on unknown question or option ids, and deliberately do not prune other answers (so a user flipping a gate back and forth keeps what they entered; `evaluate` prunes). `nextUnanswered` returns the first visible, unanswered question in catalog order (optionally within one section) or `null`.

### Source (registry entry) - required fields
```js
{ id:'iii-umbrella', publisher:'Insurance Information Institute', title:'...', url:'https://...', lastVerified:'2026-10-10' }
```
All four required; `url` https (with a dotted host); `lastVerified` a real `YYYY-MM-DD` date (month and leap years checked). `data/sources.mjs` exports the registry as a **named** `SOURCES` object keyed by source id, with `id === key`.

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

Built behavior (`engine/evaluate.mjs`, `engine/render.mjs`, `engine/validate.mjs`):
- `title`, `background`, `ask` and `reason` are each a non-empty string or `(ctx, vars) => string`, all handled the same way (so `title` may also use `{{var}}`). A function's returned text also goes through token resolution, so a token left in it is an error. Tokens are `{{name}}` (name = letters, digits, underscore, not starting with a digit; spaces inside the braces allowed); values must be strings or finite numbers; format numbers into strings yourself. Malformed tokens (`{{}}`, `{{a b}}`, stray `{{`/`}}`) are errors.
- `applies(ctx)` may return `false`, `null`, `true` (shorthand for `{}`) or `{ emphasis?, vars? }`. Returning `undefined` (a forgotten `return`), a string or an array throws, naming the flag. `emphasis` defaults to `'normal'`.
- `priority` is optional (a finite number; default 100 when absent). Lower sorts first.
- Errors while evaluating a flag are rethrown with the flag id (and field) in the message. A flag that does not apply is never rendered, so only flags that fire can hit render errors; `validateCatalog` catches the static problems earlier.
- `domain` must be one of the question `domain` values; `kind` one of `cross-policy | within-policy | education`.

### Context (`ctx`)
`ctx.holds(policyId)`, `ctx.answer(qid)`, `ctx.is(qid, optId)`, `ctx.includes(qid, optId)`, `ctx.isNotSure(qid)`, `ctx.option(qid)` (chosen option object, `.value` available), `ctx.cards()` (selected CARDS entries), `ctx.cardsWith(benefitKey)`, `ctx.stack` (LiabilityStack model or null). Reading a non-visible/unanswered question returns `undefined`/`false`; it never throws.

Built behavior (`createContext(answers, catalog = default)` in `engine/evaluate.mjs` builds the same ctx that `evaluate` passes to flags; it prunes first). The ctx and everything it hands out are frozen, so a flag cannot alter answers or the catalog by accident.
- `ctx.answer(qid)`: the option id (single) or array of option ids (multi); `undefined` for unanswered, hidden or unknown questions, and for `'policies'` (use `holds`).
- `ctx.is(qid, optId)` is for single questions and `ctx.includes(qid, optId)` for multi; each is `false` for the other kind.
- `ctx.isNotSure(qid)` is true when the answer is `not_sure` (single) or includes it (multi).
- `ctx.option(qid)`: single -> the chosen option object (with `.value`, or the `{ id:'not_sure', label:'Not sure' }` option); multi -> an array of the chosen option objects; `undefined` when unanswered. Check `isNotSure` before reading `.value`.
- `ctx.cards()`: the card entries chosen in the `cards` question (see Question), ordered by card id, as frozen copies; `[]` when none. `ctx.cardsWith(benefitKey)`: those whose `benefits[benefitKey].status` is `primary`, `secondary` or `yes`. `unverified` and `none` never count; a flag that wants to mention an unverified benefit must read `ctx.cards()` itself and never state it as fact.
- `ctx.stack`: `computeLiabilityStack(ctx)`, run once while the ctx is built (`ctx.stack` is `null` during that call). A stub returning `null` until S6.

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

Built behavior: `evaluate(answers, catalog = default catalog)` (`engine/evaluate.mjs`). All three buckets are always present (possibly empty). `meta.visibleQuestionIds` is in catalog order and `answeredCount` counts visible questions with a valid answer. `sources` are fresh copies with exactly the five fields, in `sourceIds` order. The result is built from fresh objects, so callers may mutate it. Input answers and catalog are never mutated (tests deep-freeze both). `stack` is a copy of `ctx.stack`.

`engine/validate.mjs`: `validateCatalog(catalog) -> { ok, errors: string[] }` (never throws; reports every problem) and `assertValidCatalog(catalog)` (returns the catalog, or throws one `Error` listing all problems). Beyond the contract it also checks: option ids unique per question and never an explicit `not_sure`; every `showIf` well formed, referencing existing questions and option ids, a form that matches the question type (`is`/`in` single, `includes` multi), known policy ids in `holds`, and no cycles; id conventions (questions/options snake_case, flags/sources/cards kebab-case); flag `domain`, `kind`, `bucket`, optional numeric `priority`, text fields, `applies` a function, `sourceIds` non-empty and existing; `id === key` for sources and cards.

### Card (`data/cards.mjs`)
Keyed by card id: `{ id, name, issuer, lastVerified, guideUrl, benefits: { rentalCar, tripProtection, cellPhone, extendedWarranty, purchaseProtection, roadside } }`, each benefit `{ status: 'primary'|'secondary'|'yes'|'none'|'unverified', summary, conditions? }`. `unverified` is never presented as fact. The UI always tells users to check their own card's current benefits guide.

Validation (S2): `data/cards.mjs` exports a **named** `CARDS` object keyed by card id (`id === key`, kebab-case); `name`, `issuer` non-empty, `lastVerified` a real date, `guideUrl` https, and `benefits` must contain all six keys above (use `status: 'unverified'` for anything not confirmed from the issuer's guide), each with a valid `status`, a non-empty `summary` and optional string `conditions`. Extra benefit keys are allowed if they have the same shape. The `cards` catalog part is optional for validation.

### LiabilityStack
One engine, `computeLiabilityStack(input)` (S6), documented here when it lands. Models underlying policies (auto, home, motorcycle, boat) and the umbrella: limits, required minimums, per-layer status (`ok`, `below_required`, `above_required`, `unknown`). Flags consume `ctx.stack`; the visualization (S14) renders the same model.

### Research files (`research/*.mjs`, S3a)
Five domain files (`umbrella-liability-stack`, `auto-coverages`, `home-and-renters`, `health-supplemental`, `other-bucket`), each `export default { domain, retrievedOn, sources, facts, designInputs, rejected, gaps }` (plain data, not deployed). A source is `{ id, publisher, title, url, authorityType, lastVerified, verification: { status: 'verified', checkedOn, note } }`; a fact is `{ id, topic, claim, sourceIds, confidence: 'high'|'medium'|'low', caveats }` and may cite only sources in its own file. Every source URL is https on an allowlisted authority host (none on the forbidden commercial list), one URL has one id everywhere, fact ids are unique across files, and `designInputs` lists the facts behind each hint in `factIds`. `rejected` keeps removed or trimmed items (with their original objects) so they can be reinstated. `research/INDEX.md` is the lookup table for flag and question authors and is checked against the files by `tests/research/research.test.mjs`. S3b builds `data/sources.mjs` from the `sources` arrays, deduplicated by URL.

## UI integration (S13)
`order()` in `app.js` gains overlap screens after the existing income-protection policies and before `summary`: one `ovl:<section>` screen per section that has visible questions (generic question renderer built from the catalog, using existing classes `.opts/.opt`, `.chips/.chip`, `.qrow/.yn2`, `.item`, `.tag`, `.src`), then the action list. Rendering and event handling for those screens live in `js/overlap-ui/`. The existing `umbrella` screen is kept as-is; it supplies `hasUmbrella`.

## Analytics (S15)
Provider-pluggable adapter (`none` default, `plausible`, `fathom`, `zaraz`). Events are `{ name, label }` only; `name` from a fixed allowlist, `label` a `questionId=optionId` or `flagId` string from closed lists. No identifiers, cookies, free text, or precise figures; adequacy and cushion are band ids only. The adapter refuses anything outside the allowlist, and a test enforces it. The existing local-only telemetry panel is unchanged and never transmitted.

## Parallel build rules
- Stories are developed in separate git worktrees and merged to `main` serially (rebase, full suite, fast-forward, push).
- Own your files: each story edits only the files its description names. Shared append-only logs (`docs/DECISIONS.md`, `docs/OPEN-ITEMS.md`) use git's union merge (see `.gitattributes`); number your entries with your story id (e.g. `S6-1`), not the next global D-number.
- Flag files are per domain (`flags/{umbrella,umbrellaScope,vehicles,auto,home,renters,health,deductible,other}.mjs`); only the owning story edits one. `flags/index.mjs` is created once by S2 and already concatenates all nine; nobody else edits it.
- Data module export contract (what `data/catalog.mjs` imports): `questions/index.mjs` exports named `QUESTIONS` (array); `sources.mjs` exports named `SOURCES` (object keyed by id); `cards.mjs` exports named `CARDS` (object keyed by id; extra helper exports are fine); each `flags/<domain>.mjs` has an array as its **default** export. A story that replaces one of these files keeps that export shape (a default export alongside the named one is harmless). `catalog.mjs` and `flags/index.mjs` are not edited.
- `tests/engine/purity.test.mjs` scans every module reachable from the engine files and `data/catalog.mjs` for forbidden globals (DOM, Node, `URL`, `console`, timers, `structuredClone`, `fetch`, `Date`, `Math.random`, `Intl`), non-relative or non-`.mjs` imports; new data files are covered automatically once the catalog imports them.

## Conventions
- IDs: questions/options `snake_case`; flags/sources/cards `kebab-case`.
- Copy: plain language, second person, jargon defined in a clause, matches the existing app's voice (see handoff principle 5). No "home equity", "next screen", "generic patterns".
- Dates: ISO `YYYY-MM-DD`; `lastVerified` is the day the page was actually fetched and read.
- Every story: tests added, `scripts/test.sh` green (and browser tests for UI stories), `docs/PROGRESS.md` updated, `docs/DECISIONS.md` updated for any deviation, then committed and pushed to `main`.
