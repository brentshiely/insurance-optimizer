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
- Snapshots (mechanism built by S6, `tests/snapshots/README.md`): `tests/snapshots/*.snap.mjs` (`export default <plain data>`), compared with `assertSnapshot`. Each snapshot has a generator `tests/snapshots/gen/<name>.gen.mjs` that prints the data as JSON with `print()` (via `serialize()` from the harness, so key order is stable), usually built by a function in `tests/snapshots/builders/` that the test also calls. `scripts/update-snapshots.sh [--check] [name]` runs every generator under jsc and writes the matching `.snap.mjs`; regenerate only deliberately, and any snapshot diff must be explainable by the story.
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
    data/   sources.mjs cards.mjs catalog.mjs questions/{index,sections,gates,presets,extras,umbrellaStack,umbrellaVehicles,umbrellaScope,autoGaps,renters,health,homeExclusions,deductible,cards,extrasDetail}.mjs flags/{index,umbrella,umbrellaScope,vehicles,auto,home,renters,health,deductible,other}.mjs
  js/overlap-ui/                 NEW code for the new screens: viewModel.mjs (pure view-models), screens.mjs (pure HTML-string builders), dom.mjs (element behaviours), later the stack view and analytics
docs/                            SPEC (frozen), ARCHITECTURE, STORIES, PROGRESS, DECISIONS, OPEN-ITEMS, QUESTION-FLAG-PLAN (question catalog to flag stories contract)
research/                        verified research (.mjs), inputs to sources, cards, flag copy (not deployed)
tests/                           harness, unit tests (tests/engine/, tests/research/, tests/data/), fixtures/ (fixture catalog, flagPlan), helpers/ (purity helpers), scenarios, snapshots, browser/
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
  section: 'extras'|'umbrella_stack'|...,  // which wizard screen groups it (final list under "Question catalog (S5)")
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

### Question catalog (built by S5)
`data/questions/index.mjs` assembles `QUESTIONS` (38 questions, display order) from one file per section and exports `SECTIONS` (defined in `sections.mjs`). Shared builders live in `gates.mjs` (condition shorthand) and `presets.mjs` (option ladders and bands); they only return plain data. The full plan, including the question-to-flag contract for S6 to S11, is `docs/QUESTION-FLAG-PLAN.md`; its tables are checked against the catalog by `tests/data/questions.test.mjs`.

| Section id | File | Questions | Shown when |
|---|---|---|---|
| `extras` | `extras.mjs` | `other_items` | always |
| `umbrella_stack` | `umbrellaStack.mjs` | `umbrella_limit`, `auto_liability`, `umbrella_min_auto`, `home_liability`, `umbrella_min_home` | holds `umbrella` |
| `umbrella_vehicles` | `umbrellaVehicles.mjs` | `motorcycle_liability`, `umbrella_min_motorcycle`, `boat_liability`, `umbrella_min_boat` | `umbrella` and (`motorcycle` or `boat`) |
| `umbrella_scope` | `umbrellaScope.mjs` | `umbrella_exposure`, `umbrella_um_uim`, `side_business` | holds `umbrella` |
| `auto_gaps` | `autoGaps.mjs` | `auto_financing`, `auto_value`, `auto_gap_coverage`, `auto_collision`, `auto_um_uim`, `auto_um_uim_limit`, `auto_rental_reimbursement` | holds `auto` |
| `renters` | `renters.mjs` | `renters_for`, `renters_child_housing` | holds `renters`, or `other_items` includes `renters_with_home` |
| `health` | `health.mjs` | `auto_medpay`, `health_hsa`, `health_supplemental`, `health_short_term` | holds `health` |
| `home_exclusions` | `homeExclusions.mjs` | `home_sewer_backup`, `home_flood_policy` | holds `home` |
| `deductible` | `deductible.mjs` | `deductible_auto`, `deductible_home`, `deductible_health`, `emergency_cushion` | `auto`, `home` or `health` |
| `cards` | `cards.mjs` | `cards`, `card_usual_payment` | any card-linked Other item (`rental_car`, `towing`, `travel`, `phone`, `warranty`) |
| `extras_detail` | `extrasDetail.mjs` | `phone_bill_on_card`, `roadside_sources`, `towing_vehicle_policy`, `term_life` | `phone`, `towing` or `accidental_death` |

Contract details fixed by S5:
- **Sections.** `SECTIONS = [{ id, title, reason, showIf }]` in display order; `id` is the `section` of its questions, `reason` is plain text tied to what the user already told us, `showIf` is a Condition over policies (`holds`) or `null`. The one exception is `renters`, whose gate also reads the always-shown `other_items` answer `renters_with_home` (see below); no other section gate reads an answer. Questions of one section are contiguous in `QUESTIONS`. Every question carries its own complete `showIf` (the engine never reads sections); the tests prove a section has a visible question exactly when its `showIf` is true. The host (S13) renders one `ovl:<section>` screen per section with a visible question.
- **`other_items`** is the always-shown Q1 equivalent. Its option ids are the six Other-bucket policy ids the adapter folds into `policies`, then `renters_with_home`, then an exclusive `none`; it has no Not sure. `renters_with_home` ("a renters policy on top of a home you own, like one you pay for so a child at college has coverage") is an answer only: the adapter does not fold it, so `ctx.holds('renters')` stays host-derived (a.home is Rent or Both). It exists because the host derives renters from rent or both alone, which would otherwise leave out the SPEC's headline Renters + Homeowners case, a parent who owns their home and pays for a student's renters policy (DECISIONS S5-15). Flags about that case read `ctx.holds('home')` and `renters_for`, never `ctx.holds('renters')`.
- **Option `value` shapes.** A number (whole dollars: `umbrella_limit`, `home_liability`, `umbrella_min_home`); a split limit `{ perPerson, perAccident }` (auto-style presets 100/300, 250/500, 500/500, used by `umbrella_min_auto`, `umbrella_min_motorcycle`, `umbrella_min_boat`, and, with an extra first rung `lower` "Lower than 100/300" whose value is the largest limit it can mean, `{ perPerson: 99999, perAccident: 299999 }`, by the user's own `auto_liability`, `motorcycle_liability`, `boat_liability` and `auto_um_uim_limit`; `home_liability` likewise gets a first rung `lower` "Lower than $300,000" = 299999, while the umbrella-minimum questions have no `lower` rung); or a band `{ min, max }` (`umbrella_exposure`, `auto_value`, `deductible_*`, `emergency_cushion`). Bands are whole dollars with both ends inclusive, `max: null` is open ended, the first starts at 0 and the next `min` is the previous `max` plus one. Inside a question every option has the same shape, and Not sure never has a value (flags check `ctx.isNotSure(qid)` first). Compare band edges, never a guess: "certainly below" is `a.max !== null && a.max < b.min`; a deductible exceeds the cushion when `cushion.max !== null && deductible.min > cushion.max`.
- **`cards`** uses a static list: `CARD_CHOICES` (12 `{ id (kebab-case), name }`, exported from `questions/cards.mjs`) plus an exclusive `other_none`. Option ids are the card ids with hyphens turned into underscores, which is how `ctx.cards()` maps them back, so the options carry no `value.cardId` while `CARDS` is empty (`validateCatalog` rejects a `cardId` not in `CARDS`). S4b/S11b verify the ids against `CARDS`.
- **Not sure.** Offered on every question except `other_items`, `side_business`, `auto_financing`, `renters_for` and `cards` (reasons in DECISIONS S5-8).
- **Gates.** A gate refers only to questions earlier in display order (a test enforces it). Because visibility is transitive, a question that reads another question's answer is hidden whenever that question is hidden, so gates only read questions that are visible whenever the reader should be: `auto_gap_coverage` and `auto_collision` read `auto_financing` and `auto_value` (always visible with an auto policy), `auto_um_uim_limit` reads `auto_um_uim`, `renters_for` reads `other_items` (always visible, so the read hides nothing), `renters_child_housing` reads `renters_for`, and `card_usual_payment` reads `cards`. A gate must never reference two questions that can be hidden for different users (the user would then never see it), which is why `renters_for` is the single root of the renters chain: it is visible exactly when a renters policy exists (the host's or the homeowner's tick), and the follow-up needs only `holds('home')` and `renters_for` is `child_away`.

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

**Sources (built by S3b).** `public/js/overlap/data/sources.mjs` holds the registry: 89 entries, one per distinct URL, sorted by id, built from every `verification.status: "verified"` source in the five non-card research files (`research/*.mjs`; the 101 research entries collapse to 89 because S3a already gave a repeated page one id everywhere, so no id was merged or remapped). Each entry has exactly `id`, `publisher`, `title`, `url`, `lastVerified` (the research's `authorityType` and `verification` fields stay in `research/` and are not shipped). A flag cites a source by putting its registry id in `sourceIds`; `evaluate` turns each id into a `{ id, publisher, title, url, lastVerified }` entry on the result flag, and `validateCatalog` fails any id that is not in `SOURCES`. Flag authors pick ids from the Sources tables in `research/INDEX.md` (or the facts' `sourceIds`), never invent one, and never write a URL into a flag. Only authority hosts from SPEC "Sources and authority" appear (iii.org, naic.org, insureuonline.org, fema.gov, floodsmart.gov, irs.gov, healthcare.gov, cms.gov, hhs.gov, dol.gov, ftc.gov, consumerfinance.gov, federalreserve.gov, insurance-research.org, consumerfed.org, kff.org, including subdomains), and none of the commercial insurer, agency or comparison sites. `tests/data/sources.test.mjs` enforces the shape, unique ids and URLs, both host lists, that the registry equals the verified research sources field for field, that every research fact's `sourceIds` resolve, and that the real catalog passes `validateCatalog`. To add a source: verify it, add it to the right research file (and `research/INDEX.md`) first, then add the same entry here. Credit-card sources live in `data/cards.mjs` (`guideUrl`), not here.

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
- `ctx.stack`: `computeLiabilityStack(ctx)`, run once while the ctx is built (`ctx.stack` is `null` during that call). `null` unless the user holds an umbrella; otherwise the LiabilityStack model below, frozen with the ctx. Flags read it through `stackFindings(ctx.stack, type)` (exported by `engine/liabilityStack.mjs`, safe on `null`).

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

### Health and deductible flags (built by S10)
`data/flags/health.mjs` (4 flags) and `data/flags/deductible.mjs` (3 flags) are all Question-bucket flags in the S10 priority range 410 to 470. They never judge plan adequacy and never read a policy-screen number. Conventions other code can rely on:
- **Firing rule per flag** (details in DECISIONS `S10-2` to `S10-7`): a flag never fires on an unanswered question; Not sure is handled flag by flag as `docs/QUESTION-FLAG-PLAN.md` says (the MedPay and supplemental flags fire on it with its own wording, the HSA, short-term and deductible flags do not, except that a Not sure cushion fires the deductible flags at normal emphasis when the deductible band starts at $1,000 or more).
- **Deductible-vs-cushion** compares band edges only (`deductible.min > cushion.max`; a `5000_plus` cushion never fires). `strong` emphasis means the bands prove the deductible is above the cushion; `normal` means it could be (cushion Not sure) or, for the other flags, the default. The flag text mentions band labels only.
- **Open-enrollment wording** lives in one place: `flags/health.mjs` exports the named `OPEN_ENROLLMENT_NOTE` and `OPEN_ENROLLMENT_SOURCE_IDS`, and `flags/deductible.mjs` imports them for its health flag. A flags file may export named helpers like this; the default export stays the array `flags/index.mjs` reads. The sentence is health-only: the auto and home deductible flags never use it, and it carries its plan year (OPEN-ITEMS `S10-1`).
- **Dated copy** (a plan year, an "As of" month, an HSA threshold year, the Federal Reserve survey year) is always written with its date in the text so it stays true when read later; the files that hold it are listed in OPEN-ITEMS `S10-1`.

### Card (`data/cards.mjs`)
Keyed by card id: `{ id, name, issuer, lastVerified, guideUrl, benefits: { rentalCar, tripProtection, cellPhone, extendedWarranty, purchaseProtection, roadside } }`, each benefit `{ status: 'primary'|'secondary'|'yes'|'none'|'unverified', summary, conditions? }`. `unverified` is never presented as fact. The UI always tells users to check their own card's current benefits guide.

Validation (S2): `data/cards.mjs` exports a **named** `CARDS` object keyed by card id (`id === key`, kebab-case); `name`, `issuer` non-empty, `lastVerified` a real date, `guideUrl` https, and `benefits` must contain all six keys above (use `status: 'unverified'` for anything not confirmed from the issuer's guide), each with a valid `status`, a non-empty `summary` and optional string `conditions`. Extra benefit keys are allowed if they have the same shape. The `cards` catalog part is optional for validation.

### LiabilityStack (built by S6)
One engine, `computeLiabilityStack(ctx)` in `engine/liabilityStack.mjs`, builds the model that flags consume as `ctx.stack` and that the Story S14 visualization renders as `results.stack`. It is plain, self-describing data (labels, statuses, numbers, one sentence per layer; no functions, no `undefined`, nothing shared between calls) and reads only the user's own closed-list answers, never the host's policy-screen numbers (DECISIONS D10, S6-1).

**When it exists.** `null` unless `ctx.holds('umbrella')` (or when `ctx` is not an evaluation context). With an umbrella and no underlying policy it is the umbrella alone (`layers: []`).

```js
{
  version: 1,
  umbrella: { id: 'umbrella', label: 'Umbrella', limit: 1000000 | null, limitLabel: '$1 million' | 'Not sure' | 'Not answered yet', limitAnswer: 'known' | 'not_sure' | 'unanswered' | 'unreadable' },
  layers: [   // one per held underlying policy, always in the order auto, home, motorcycle, boat
    {
      id: 'auto', label: 'Auto liability', policyText: 'auto policy',
      limitShape: 'split' | 'single',                        // auto, motorcycle, boat are split; home is a single amount
      limit: { perPerson, perAccident } | number | null,     // dollars; null unless limitAnswer is 'known'
      limitLabel: '100/300',  limitText: '100/300',          // as shown in the question / ready for the middle of a sentence ("lower than 100/300")
      limitIsCeiling: false,                                 // true only for the "Lower than ..." rung
      limitAnswer: 'known' | 'not_sure' | 'unanswered' | 'unreadable',
      required: { ... } | number | null,  requiredLabel, requiredText, requiredAnswer,   // what the umbrella asks for underneath, same shapes
      status: 'ok' | 'below_required' | 'above_required' | 'unknown',
      statusLabel: "Meets your umbrella's requirement" | "Below your umbrella's requirement" | "Above your umbrella's requirement" | 'Not confirmed',
      shortBy: null | number | { perPerson, perAccident },   // exact difference, only when below_required and the limit is exact
      summary: 'Your auto liability limit is 100/300, but your umbrella asks for 250/500.',
    },
  ],
  counts: { ok, below_required, above_required, unknown },   // number of layers in each status
  findings: [   // what flags consume, in layer order
    { id: 'auto-below-required', type: 'below_required' | 'above_required' | 'unconfirmed', layer: 'auto', layerLabel, policyText,
      limitLabel, limitText, limitIsCeiling, requiredLabel, requiredText, notSure: [] | ['limit'] | ['required'] | ['limit', 'required'] },
  ],
  attachmentNote: 'An umbrella pays only after the liability limit on the policy underneath has been used up, ...',
  sourceIds: ['iii-what-is-umbrella-liability-policy', 'iii-should-i-purchase-umbrella', 'iii-homebuyers-handbook'],   // sources for attachmentNote; look them up in SOURCES
}
```

**Attachment point.** An umbrella pays only after the liability limit of the policy underneath has been used up (research fact `umbrella-attaches-after-underlying-exhausted`; it adds to the underlying policy and does not replace it). So the *attachment point* of a layer is that layer's own liability limit (`layer.limit`): the amount of that policy's coverage that has to be used up before the umbrella can start to pay for that policy. For a split limit like 250/500 there are two: per person and per accident. The *required minimum* (`layer.required`) is the attachment point the umbrella insurer expects, as the user read it off their umbrella; each insurer sets its own (research fact `umbrella-underlying-requirements-insurer-specific`). The model compares the two. It deliberately says nothing about what an umbrella insurer does in the stretch between a limit below the requirement and the requirement itself, because no authoritative source states it (DECISIONS S3a-umbrella-1, S6-2), and it adds no "total protection" figure for the same reason.

**Status.** `ok`: the limit equals the requirement. `below_required`: the limit is certainly lower (for a split limit, lower on either number). `above_required`: not below, and higher on either number. `unknown`: the limit or the requirement is Not sure, unanswered or unreadable, or a ceiling cannot be placed against the requirement. A "Lower than ..." answer is a ceiling (`limitIsCeiling`): its `limit` is the largest limit the rung can mean (299,999, or 99,999/299,999), so it is `below_required` against every requirement the catalog offers and `unknown` against anything at or under the ceiling. Not sure never gives a verdict: it gives `unknown` and an `unconfirmed` finding naming which part is Not sure (`notSure`). Unanswered gives `unknown` and no finding. The umbrella's own size does not change any layer.

**Findings are what flags read.** `below_required` feeds the four Raise flags, `above_required` (auto and home only) feeds the over-buying Question, and `unconfirmed` feeds the Not sure Question; see `docs/QUESTION-FLAG-PLAN.md` S6. Other exports: `stackFindings(stack, type)`, `STACK_STATUSES`, `LAYER_IDS`, `LOWER_OPTION_ID`, `STACK_VERSION`.

**Inputs.** Per layer, the matching pair of questions: `auto_liability` / `umbrella_min_auto`, `home_liability` / `umbrella_min_home`, `motorcycle_liability` / `umbrella_min_motorcycle`, `boat_liability` / `umbrella_min_boat`; the umbrella object reads `umbrella_limit`. The first rung (id `lower`) of each limit question is the ceiling convention (DECISIONS S5-13).

### Research files (`research/*.mjs`, S3a)
Five domain files (`umbrella-liability-stack`, `auto-coverages`, `home-and-renters`, `health-supplemental`, `other-bucket`), each `export default { domain, retrievedOn, sources, facts, designInputs, rejected, gaps }` (plain data, not deployed). A source is `{ id, publisher, title, url, authorityType, lastVerified, verification: { status: 'verified', checkedOn, note } }`; a fact is `{ id, topic, claim, sourceIds, confidence: 'high'|'medium'|'low', caveats }` and may cite only sources in its own file. Every source URL is https on an allowlisted authority host (none on the forbidden commercial list), one URL has one id everywhere, fact ids are unique across files, and `designInputs` lists the facts behind each hint in `factIds`. `rejected` keeps removed or trimmed items (with their original objects) so they can be reinstated. `research/INDEX.md` is the lookup table for flag and question authors and is checked against the files by `tests/research/research.test.mjs`. S3b builds `data/sources.mjs` from the `sources` arrays, deduplicated by URL.

## UI integration (S13)
`order()` in `app.js` gains overlap screens after the existing income-protection policies and before `summary`: one `ovl:<section>` screen per section that has visible questions (generic question renderer built from the catalog, using existing classes `.opts/.opt`, `.chips/.chip`, `.qrow/.yn2`, `.item`, `.tag`, `.src`), then the action list (rendered inside the `summary` screen, see step B below). Rendering and event handling for those screens live in `js/overlap-ui/`. The existing `umbrella` screen is kept as-is; it supplies `hasUmbrella`.

**View-model (S13 step A, `js/overlap-ui/viewModel.mjs`).** Pure, like `js/overlap/` (no DOM, Node, storage, timers, clock or randomness; it imports only from `js/overlap/`; `tests/ui/viewModel.test.mjs` scans its source for that), so the DOM code only turns plain objects into markup and clicks into `applyAnswer` calls. Every function takes the host **snapshot** `{ a, extras, q, p, o }` (plain copies of `S.a`, `S.extras`, `S.q`, `S.p`, `S.o`; never `state`) and an optional last argument `catalog` that tests use (the UI never passes one). Results are fresh plain objects, identical input gives byte-identical output, inputs are never mutated.

| Export | Returns |
|---|---|
| `overlapSections(snapshot)` | Ordered sections that have at least one visible question: `[{ id, title, reason, questions: [{ id, prompt, help, kind, options: [{ id, label, selected }], answered, allAnswered }], complete }]`. Order is `SECTIONS` order; questions are the section's visible questions in catalog order. `kind` is `'multi'`, `'yesno'` (own choices exactly Yes then No, with or without Not sure) or `'single'`; Not sure, when offered, is the last option; `help` is `''` when a question has none. `answered` (`allAnswered` is the same value) means a valid answer is stored (for a multi question, any tick including "None of these"); `complete` means every visible question of the section is answered. The wizard must not block Continue on `complete`: every flag copes with a missing answer. |
| `overlapScreenIds(snapshot)` | `['ovl:<sectionId>', ..., 'actions']`, one per section from `overlapSections`, `'actions'` always last. Constants `OVERLAP_SCREEN_PREFIX` (`'ovl:'`) and `ACTIONS_SCREEN_ID`. |
| `applyAnswer(snapshot, questionId, optionId)` | A new `o` with one tap applied: single question, the option replaces the answer (tapping the chosen one keeps it); multi question, the option is toggled, an exclusive option (e.g. "None of these", Not sure) clears the others and ticking another clears it, an emptied answer is removed. Then every answer to a question that is no longer visible, and every key that is not a question, is dropped (the host policies come from the snapshot, so umbrella answers survive taps elsewhere); the result is in catalog order, never has a `policies` key, and does not store a tap on a question that is not asked. Throws on an unknown question or option id. It takes the snapshot, not just `o`, because visibility depends on the policies the host derives from `a`, `extras`, `q` and `p`. Use it as `S.o = applyAnswer(snapshot(), qid, optId)`. |
| `actionListViewModel(snapshot)` | `{ groups: [{ bucket, label, description, items, count }], total, empty, emptyTitle, emptyMessage }`. Groups are in the order Raise, Drop, Question and only exist when they have items; each item is `{ id, title, background, ask, reason, emphasis, sources: [{ publisher, title, url, lastVerified }] }` in the engine's order. When nothing fired, `groups` is `[]`, `empty` is true and `emptyTitle` / `emptyMessage` hold the honest empty-state wording (both `null` otherwise): the list never says or implies everything is fine. |
| `actionListText(vm)` | Plain text of that view-model for the clipboard: a header line that says the list is informational and not advice, an informational note, an item count, then each group and item as title, "Why it matters", "What to ask", "Say this" and the source(s) with url and last-verified date. The date the text was made is never included, so the output is deterministic. An empty list prints the empty-state wording instead. |

Shared wording the page can reuse: `TEXT_HEADLINE`, `INFO_NOTE`, `EMPTY_TITLE`, `EMPTY_MESSAGE`, `EMPHASIS_LABEL` (shown beside items with `emphasis: 'strong'`), `BUCKET_LABELS`, `BUCKET_DESCRIPTIONS`. All plain ASCII and state-neutral. The privacy line is not here: S15 settles what analytics it may mention.

**DOM wiring (S13 step B).** Three files in `js/overlap-ui/` and a few surgical edits in `app.js`.

- `screens.mjs` (pure, no DOM: it builds HTML strings, so it is unit-tested under jsc; imports only `viewModel.mjs`). `overlapScreenHtml(sections, screenId, backHtml)` is one `ovl:<section>` screen: an "Overlap check N of M" eyebrow, the section title as `<h2 id="ovl-heading" tabindex="-1" data-focus>`, the reason, one group per visible question, a hint and a Continue button that is disabled until every visible question on the screen is answered. A question is a `role="group"` named by its prompt (`aria-labelledby`) and described by its help text; a Yes / No question uses the existing `.qrow` + `.yn2`, anything else `.chips` (`chips stack`, one per line, when a label is long); every option is a `type="button"` toggle with `class="sel"` AND `aria-pressed`, carrying `data-oq="<questionId>" data-ov="<optionId>"`. `actionListHtml(vm)` is the `Your insurer action list` section (counts, intro, the `INFO_NOTE` not-advice note, Copy / Print buttons and the `role="status"` line `#al-status`, then a group per bucket with an `.item` per flag: bucket tag in text, title, Why it matters, What to ask, Say this, Source(s) as "publisher, linked title (https only, `target="_blank" rel="noopener"`, visually hidden "(opens in a new tab)"), last verified date", `Higher priority` for `emphasis: 'strong'`), the honest empty state (no buttons) and `PRIVACY_LINE`. Everything from the catalog or engine goes through `esc()`. `SCREEN_LABELS` holds the short telemetry names (a test keeps it equal to the section ids).
- `dom.mjs` (takes every element or browser object as an argument; no storage, timers or network). `patchOverlapScreen(stage, sections, screenId)` updates pressed state, Continue and the hint in place when the screen's shape (`data-ovl-key`: section, "N of M", question ids) is unchanged and returns false otherwise; `restoreFocus`, `focusHeading`, `copyText(text, { navigator, document }, done)` (clipboard API, textarea + `execCommand` fallback, `done(true|false)` once) and `printList(win)`.
- `app.js` (imports the three modules above before the IIFE). `snapshot()` is a plain copy of `S.a, S.extras, S.q, S.p, S.o`. `order()` appends `overlapIds()` (the view-model's `ovl:*` ids; its trailing `actions` id is NOT a screen) after the income-protection policies and before `summary`; `screenLabel` maps them; `render()` dispatches `ovl:*` to `overlapScreenHtml` and the summary appends `actionListSection()` (the existing totals and text unchanged, the action list below them, then the existing footer). A click on `[data-oq]` runs `S.o = applyAnswer(snapshot(), q, o)`, then patches in place (and refreshes "What we know") or, when the shape changed (a follow-up opened or closed, "N of M" changed), re-renders and puts focus back on the same option. `go()` moves focus to the heading of an overlap screen, and of the summary when arriving from one; no other screen's focus behaviour changed. `data-act="copy"` / `"print"` call `copyText` (status in `#al-status`: copied, or could not copy) and `printList(window)`. "Start over" already rebuilds `S.o` as `{}`. The "What we know" panel gets an "Overlap questions: answered / visible" row only on the overlap screens and the summary, so earlier screens render exactly as before. If building the list throws, the summary shows a short error panel and logs `console.error`; the rest of the page keeps working.
- `css/app.css` adds `.oq*`, `.ovl-foot`, `.al-*`, `.vh` (visually hidden), `.tag.raise` / `.tag.drop` / `.tag.question` (Raise like `under`, Drop like `twice`, Question like `info`) and an `@media print` block that hides everything except `.actionlist` (and its buttons), forces a light palette, avoids breaking an item across pages and prints each link's address. Option controls are at least 44px tall; unselected option borders use `--muted` (at least 3:1) and a selected option shows a check mark in text. `tests/ui/screens.test.mjs` checks the contrast of the pairs used (4.5:1) in light and dark by reading the palette from the CSS.
- Tests: `tests/ui/screens.test.mjs`, `tests/ui/dom.test.mjs`, `tests/ui/no-storage.test.mjs` (no `localStorage`, `sessionStorage`, `indexedDB` or `document.cookie` in `index.html` or any module it loads, found by following its imports). Browser goldens: `tests/browser/` now has an `answer` op and 17 scenarios that pass through the overlap screens (README "Story S13 re-record").

## Analytics (S15)
Provider-pluggable adapter (`none` default, `plausible`, `fathom`, `zaraz`). Events are `{ name, label }` only; `name` from a fixed allowlist, `label` a `questionId=optionId` or `flagId` string from closed lists. No identifiers, cookies, free text, or precise figures; adequacy and cushion are band ids only. The adapter refuses anything outside the allowlist, and a test enforces it. The existing local-only telemetry panel is unchanged and never transmitted.

## Parallel build rules
- Stories are developed in separate git worktrees and merged to `main` serially (rebase, full suite, fast-forward, push).
- Own your files: each story edits only the files its description names. Shared append-only logs (`docs/DECISIONS.md`, `docs/OPEN-ITEMS.md`) use git's union merge (see `.gitattributes`); number your entries with your story id (e.g. `S6-1`), not the next global D-number.
- Flag files are per domain (`flags/{umbrella,umbrellaScope,vehicles,auto,home,renters,health,deductible,other}.mjs`); only the owning story edits one. `flags/index.mjs` is created once by S2 and already concatenates all nine; nobody else edits it.
- Data module export contract (what `data/catalog.mjs` imports): `questions/index.mjs` exports named `QUESTIONS` (array, display order) and `SECTIONS` (ordered `[{ id, title, reason, showIf }]`); `sources.mjs` exports named `SOURCES` (object keyed by id); `cards.mjs` exports named `CARDS` (object keyed by id; extra helper exports are fine); each `flags/<domain>.mjs` has an array as its **default** export. A story that replaces one of these files keeps that export shape (a default export alongside the named one is harmless). `catalog.mjs` and `flags/index.mjs` are not edited.
- `tests/engine/purity.test.mjs` scans every module reachable from the engine files and `data/catalog.mjs` for forbidden globals (DOM, Node, `URL`, `console`, timers, `structuredClone`, `fetch`, `Date`, `Math.random`, `Intl`), non-relative or non-`.mjs` imports; new data files are covered automatically once the catalog imports them.

## Conventions
- IDs: questions/options `snake_case`; flags/sources/cards `kebab-case`.
- Copy: plain language, second person, jargon defined in a clause, matches the existing app's voice (see handoff principle 5). No "home equity", "next screen", "generic patterns".
- Dates: ISO `YYYY-MM-DD`; `lastVerified` is the day the page was actually fetched and read.
- Every story: tests added, `scripts/test.sh` green (and browser tests for UI stories), `docs/PROGRESS.md` updated, `docs/DECISIONS.md` updated for any deviation, then committed and pushed to `main`.
