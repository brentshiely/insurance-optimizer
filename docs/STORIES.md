# Story backlog

Executed strictly in order. A story is DONE only when: its acceptance criteria hold, `scripts/test.sh` is green (full suite, cumulative; plus the browser golden test for UI-touching stories), an independent verifier could not refute it, docs are updated, and it is committed and pushed to `main`. A failing story is never committed; the run halts instead.

Commit message: `Story N: <title>` + short body + the `Co-Authored-By` trailer. Never run `npm run deploy`.

**Parallel build.** Stories run concurrently in separate git worktrees whenever their dependencies allow, and are merged to `main` one at a time (rebase on latest `main`, full suite green, fast-forward, push). Dependencies:

```
S1 (none)   S2 (none)   S3a (none)   S4a (none, DEFERRED)
S3b <- S2, S3a        S4b <- S2, S4a (DEFERRED)        S5 <- S2, S3b
S6, S7, S8, S9, S10, S11 <- S5        S13 <- S1, S5, S6
S12 <- S6..S11        S14 <- S6, S13        S15 <- S13        S16 <- S12, S14, S15
S11b <- S4b, S11 (DEFERRED)
```

**Credit-card work is deferred (D14).** Researching card benefits requires fetching issuer sites (e.g. americanexpress.com) that trigger permission prompts the owner must approve at the machine. Stories S4a, S4b and S11b are therefore parked until the owner is present; the rest of the build does not depend on them. Until then the card table is empty, the `cards` question lists the intended cards as static choices, and card-aware flag wording is built and tested against fixture cards only. Partial verified research for 8 of the 12 cards is preserved on the unmerged branch `story/S4a`.

## S0 - Bootstrap on the Coverage Check base (done by hand)
Spec transcription, architecture, story backlog, dependency-free test harness (jsc/Node), `site-root` preview config. AC: `scripts/test.sh` passes; harness fails on a failing test and on a module load error.

## S1 - Safety net and modular split
Move the inline CSS to `public/css/app.css` and the inline script to `public/js/app.js` (ES module, loaded with `<script type="module">`), keeping `index.html` as the shell. Add `S.o = {}` to host state (also in the restart path). Build the browser golden-master harness (`tests/browser/`) and record goldens from the ORIGINAL inline version first, then refactor and prove identical output.
AC: At least 8 scenarios (own / rent / both; dependents yes/no; vehicles 0/1/3+; extras none/some; states incl. CA, FL, TX, MO, NY, a no-fault state) replay through every screen to the summary; goldens were recorded before the refactor and the refactored app reproduces them exactly (volatile text normalized); no console errors; `npm run preview` still serves it; nothing outside `public/` is needed at runtime; `tests/browser/README.md` documents record/replay. No behavior change.

## S2 - Engine core and adapter
`public/js/overlap/engine/{conditions,session,render,evaluate,validate,adapter}.mjs` per ARCHITECTURE.md, plus valid-but-empty `data/{sources,cards}.mjs`, `data/questions/index.mjs`, `data/flags/index.mjs` with per-domain files exporting `[]`, `data/catalog.mjs`, and a `liabilityStack.mjs` stub returning `null`.
AC: Condition DSL covers every form; visibility is transitive; pruning removes stale answers; `not_sure` auto-appended; templates resolve and throw on unresolved tokens; evaluate ordering deterministic and pure (same input twice deep-equal; input not mutated); `validateCatalog` rejects a flag with zero/unknown sources, missing source fields, non-https url, bad date, duplicate ids, dangling `showIf` references, unknown option ids in conditions; `deriveAnswers` implements the ARCHITECTURE table exactly (never reads policy-screen numbers, never reads state) with tests per row. Unit tests use a fixture catalog in `tests/fixtures/`. Modules run under jsc.

## S3a - Verified research (non-card)
Web-researched, adversarially verified fact sheets for: umbrella/liability stack, auto, home+renters, health, other bucket. `research/<domain>.mjs` (sources + paraphrased facts + design inputs + known gaps) and `research/INDEX.md`. No code dependencies.
AC: Every source URL was fetched and read by the researcher AND re-fetched by an independent verifier who confirms the page supports the attached claims; failed/unreachable/overreaching items removed or marked; sources satisfy the SPEC authority rules; `lastVerified` = actual verification date; no guessed URLs; `tests/research/*.test.mjs` validate file shape, https, dates, unique ids, an authority-domain allowlist and forbidden-host list, and that every fact cites sources that exist in its own file and are verified.

## S3b - Source registry
`public/js/overlap/data/sources.mjs` built only from verified sources in `research/*.mjs`.
AC: Registry holds only verified sources, deduplicated by URL; shape, https, date, id==key, allowlist tests; every research fact's sources resolve in the registry; the real catalog passes `validateCatalog`.

## S4a - Verified card research
About 12 popular, benefit-rich cards from issuers' own current benefits guides (rental car, trip protection, cellphone protection, extended warranty, purchase protection, roadside): `research/cards-*.mjs`. No code dependencies.
AC: Each card has `guideUrl` + `lastVerified` and each benefit a status; anything not confirmed from the issuer's current guide is `unverified` (never guessed); an independent verifier re-checks every card; shape tests.

## S4b - Credit card lookup table
`public/js/overlap/data/cards.mjs` with helpers (`cardsWithBenefit`, etc) built from the verified card research.
AC: Shape and helper tests; `unverified` never upgraded or asserted as fact; `CARD_DISCLAIMER` exists; the real catalog passes `validateCatalog`.

## S11b - Card cross-reference activation (DEFERRED, runs after S4b)
With the real card table in place: every card id offered by the `cards` question exists in `CARDS` (or the question list is corrected), real-data scenarios for the other-bucket flags (named card, strong emphasis only for confirmed benefits, unverified never asserted), snapshot update, and golden scenarios with cards.
AC: tests above; no flag asserts an unverified benefit; S12 audits still green.

## S5 - Question catalog
The overlap decision tree from SPEC "Question flow and branching" as closed-list data in `data/questions/*.mjs`, adapted to the host app (the `cards` question uses a static list of the 12 intended cards because the card table is deferred; S4b later verifies the list against `CARDS`): `policies` is derived (see ARCHITECTURE adapter table); the asked Q1 equivalent is `other_items` plus the `cards` question. Every question has presets and `not_sure` as specified.
AC: Every SPEC question exists with the specified presets; each branch is gated per SPEC; every option id referenced by a condition exists; every question reachable; no free text; deductible and cushion bands carry comparable `{min,max}` values; sections defined for the wizard (which questions share a screen); tests walk the tree for several policy combinations and assert the exact visible question ids; `validateCatalog` passes.

## S6 - Liability stack engine and umbrella core flags
`computeLiabilityStack` and flags for auto/home/motorcycle/boat vs umbrella: under-buying (gap below attachment), over-buying, home below required minimum (Raise), motorcycle/boat low liability (Raise). Settles attachment rules and tiers (DECISIONS.md).
AC: Rules grounded in S3 research and cited; every flag sourced; scenario tests for each branch including `not_sure` fallbacks; snapshot of stack models over a matrix of limits; no flag fires when no umbrella is held.

## S7 - Umbrella scope and adequacy flags
Adequacy vs exposure band (Raise when umbrella < exposure), UM/UIM-on-umbrella, scope exclusions (stronger with a side business).
AC: As SPEC; coarse bands only; sourced; scenario tests.

## S8 - Auto coverage-gap flags
UM/UIM with a dated uninsured-driver statistic, loan/lease gap coverage (Raise), rental reimbursement, collision/comprehensive on an older car (Drop). Must not contradict the existing inline auto findings.
AC: Gates behave (financed + newer => gap; owned outright => none; low value => drop candidate); statistic cites its year and source; scenario tests.

## S9 - Home exclusions and renters flags
Sewer/drain backup, flood (gate questions per DECISIONS D8); renters vs a parent's homeowners for a child away at college.
AC: As SPEC; scenario tests; sourced to NAIC/III/FEMA-NFIP; consistent with the existing inline home findings.

## S10 - Health flags and deductible-vs-cushion
Medical-rider overlap (MedPay / home med-pay vs health), supplemental bolt-ons, HSA nudge, short-term vs ACA/employer plan, and the cross-policy deductible-vs-cushion check (auto/home/health).
AC: Never judges plan adequacy; open-enrollment framing only in health copy; bands only; scenario tests over every band combination; sourced; consistent with the existing no-fault-aware MedPay finding.

## S11 - Other-bucket flags with card cross-reference
(Card naming is built and tested against fixture cards; with the real table empty the wording is generic until S11b.) Rental car, towing/roadside (incl. motorcycle/boat), travel, phone, extended warranty, AD&D; name the user's card when the table supports it; always "check your card's current benefits guide"; stronger emphasis when a held card carries the benefit.
AC: Unverified card benefits never asserted; scenario tests across card/no-card combinations; sourced (NAIC/III/FTC for concepts, issuer guide for card claims).

## S12 - Snapshot and audit suite
Deterministic scenario matrix over policy combinations with snapshots; catalog audit tests.
AC: Every flag triggered by at least one scenario; every flag has >=1 valid source plus background, ask, reason; no unresolved `{{}}`, no state names, no "TODO"/placeholder text; every SPEC bullet maps to a flag or question (checklist test); `scripts/update-snapshots.sh` exists and is documented.

## S13 - UI: overlap screens and insurer action list
Wire the engine into the wizard: `ovl:*` section screens from the catalog, then the action list grouped Raise / Drop / Question with Background, Ask, Reason, Source (publisher, title, link, last verified), copy-to-clipboard and print, a short plain-language "informational, not insurance advice" note, and a privacy line. Existing summary totals retained. Pure view-model in `js/overlap-ui/` unit-tested.
AC: View-model tests; golden test updated deliberately (diff = only the new screens, documented); driven in the Browser pane through at least 3 scenarios incl. one with an umbrella (the card scenario is covered by S16, because the other-bucket flags land in parallel); keyboard operable, labelled controls, focus management, contrast in light and dark, usable at 375px; no storage APIs (grep test); no console errors.

## S14 - Liability stack visualization
Single reusable component rendering the LiabilityStack model, used in the umbrella section and the action list.
AC: Driven only by the model; ok/below/above/unknown shown with text, not color alone; verified in the Browser pane in light and dark; view-model tests.

## S15 - Privacy-safe analytics, CSP and disclaimer
Provider-pluggable (default `none`) allowlisted events with closed-list labels; `public/_headers` with a CSP; disclaimer and anonymous-counting statement on the page.
AC: Tests prove only allowlisted names/labels can be emitted, no free text or figures, bands only for adequacy/cushion; no cookies/storage; CSP restricts to self plus the configured provider and the page still works under it (Browser pane, no CSP violations in console).

## S16 - Ship readiness
Docs finalized (`DECISIONS.md`, `OPEN-ITEMS.md` incl. licensing check and the commercial-source note), `docs/TRACEABILITY.md` mapping every SPEC requirement to code/tests, final full-spec conformance audit, end-to-end Browser pane run-throughs, README updated.
AC: Every SPEC requirement traced; zero failing tests; no console errors; README accurate. Deploy is left to the owner (`npm run deploy`).
