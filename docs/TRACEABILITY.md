# Traceability: SPEC to code and tests

Every requirement in `docs/SPEC.md`, section by section and bullet by bullet, with where it is built and which test proves it, or why it is not. Written in Story S16 (ship readiness) by reading the code and the tests, not from memory of the stories.

**How to read it.** Row ids are SPEC line numbers (`L48` is line 48 of `docs/SPEC.md`; a bullet with several requirements gets `L48.1`, `L48.2`, and so on). The SPEC is frozen, so the numbers do not move. Paths are repo-relative. A test cited as `tests/x.test.mjs (suite "name")` means the suite or test of that name in that file; a file with no name is cited for its whole subject. Flag, question, option and source ids are written in code font, and `tests/audit/traceability.test.mjs` checks that every one exists, that every cited file exists, that every DECISIONS and OPEN-ITEMS id exists, that each SPEC line has a row, and that every flag and question in the catalog appears here. A requirement that has no row, or a row that names something that is not there, fails the suite.

**Status vocabulary** (the status cell holds one or more, separated by semicolons):

| Status | Meaning |
|---|---|
| BUILT | Implemented as the SPEC words it, and tested. |
| DEVIATION | Implemented, but not exactly as the SPEC words it. The DECISIONS entry says what was done and why. |
| DEFERRED (D14) | Needs the credit-card lookup table, which is deferred (DECISIONS D14). The structure is built and tested; the data is not. OPEN-ITEMS `S16-7` lists the exact steps to resume. |
| OWNER ACTION | Something only the owner can do (a decision, an account, a deploy). The OPEN-ITEMS entry says what. |
| OUT OF V1 | The SPEC itself defers it (fast-follow). A test checks that it is absent. |
| CONTEXT | Background in the SPEC that asks for nothing to be built. |

**Result of the audit (DECISIONS S16-1).** No requirement of the SPEC is missing. Every difference between the SPEC and the product is either a deviation with a DECISIONS entry (the sourcing rules, the "Not sure" rule, over-buying as a Question, the extra "Lower than" rung and others) or part of the deferred card work. The gaps the audit did find, and how each was closed, are in DECISIONS S16-1 to S16-6.

## 1. What this is and why (SPEC lines 6 to 20)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L6 | A personalized, static explainer: a fixed question-and-answer decision tree, no document upload, no AI at runtime. | BUILT | `public/index.html`, `public/js/app.js`, `public/js/overlap/data/questions/index.mjs`, `public/js/overlap/data/catalog.mjs`. | `tests/ui/screens.test.mjs` (the entry screen promises only taps, nothing typed, nothing uploaded); `tests/data/questions.test.mjs` (closed lists, no input-like fields); `tests/audit/scenarios.test.mjs` (suite "determinism"). |
| L10 | Understand the portfolio as a whole; surface overlap (paying twice) and gaps; say specifically what to take to the insurer. | BUILT | `public/js/overlap/engine/evaluate.mjs`, `public/js/overlap-ui/viewModel.mjs` (`actionListViewModel`). | `tests/audit/coverage.test.mjs` (every flag fires in some scenario, all three buckets); `tests/ui/viewModel.test.mjs`. |
| L12 | The core insight: owning insurance is not being insured, and the overlap side is the same portfolio seen the other way. | BUILT | A framing, carried by the gap items (`umbrella-home-below-required-min`, `auto-um-uim-check`, `auto-gap-coverage-missing`, `home-sewer-backup-missing`, `home-flood-no-separate-policy`) and the overlap items (the Drops); the entry headline in `public/js/overlap-ui/screens.mjs` (`ENTRY_HEADING`). | `tests/audit/coverage.test.mjs`; `tests/ui/screens.test.mjs` (suite "the entry screen"). |
| L14 | Three deliberate design choices (header of L16 to L18). | CONTEXT | See L16, L17 and L18. | none needed |
| L16 | No declarations-page upload; teach by example and ask light questions. | BUILT | No file input exists anywhere; every question is a pick from a closed list and its help text says where to find the figure (for example `auto_liability`: "Look for numbers like 100/300 on the summary page"); `public/_headers` turns the camera off. | `tests/ui/screens.test.mjs` (entry screen has no field, file picker or style attribute); `tests/data/questions.test.mjs` (suite "closed lists, no free text, no typed figures, Not sure rules"); `tests/ui/analytics.test.mjs` (suite "CSP: public/_headers"). |
| L17 | No AI at runtime; a fixed tree that is cheap to build, easy to test and gives every user the same quality of answer. | BUILT | The pure engine under `public/js/overlap/` (`public/js/overlap/engine/evaluate.mjs`, `public/js/overlap/engine/session.mjs`, `data/flags/`); the page makes no network call. | `tests/engine/purity.test.mjs` (no DOM, Node, network or random in the engine); `tests/ui/analytics.test.mjs` (suite "page sources": no `fetch`, no `XMLHttpRequest`, no beacon, no storage); `tests/audit/scenarios.test.mjs` (same answers, same output). |
| L18 | The payoff is action: the user leaves knowing what to raise, drop or question. | BUILT | The Raise / Drop / Question list (`actionListHtml` in `public/js/overlap-ui/screens.mjs`); each item says what to ask and gives a line to say. | `tests/ui/screens.test.mjs` (suite "actionListHtml: the real catalog"); `tests/ui/viewModel.test.mjs` (suite "actionListViewModel"). |
| L20.1 | A year-round overlap-and-trim audit across auto, home, umbrella and the credit-card layer; not an open-enrollment tool. | BUILT | Nothing in the flow (`public/js/overlap-ui/screens.mjs`), the questions or any non-health flag (`public/js/overlap/data/flags/`) mentions open enrollment or a season. | `tests/audit/traceability.test.mjs` (suite "SPEC invariants": open enrollment is mentioned only by health flags and by nothing else a person can read). |
| L20.2 | The health branch may nod to open enrollment (supplemental policies, HSA versus FSA elections), and never moves toward plan adequacy. | BUILT | `OPEN_ENROLLMENT_NOTE` and `OPEN_ENROLLMENT_SOURCE_IDS` in `public/js/overlap/data/flags/health.mjs`, used by `health-supplemental-boltons`, `health-hsa-nudge` and `deductible-exceeds-cushion-health`; the note says employers set their own dates and names the HealthCare.gov window with its plan year (DECISIONS S3a-health-4). | `tests/flags/health-deductible.test.mjs` (the open-enrollment nod uses only sourced facts; the framing appears only in health copy; the tool never judges plan adequacy, network or whether a plan is good). |

## 2. Scope for v1 (SPEC lines 24 to 28)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L24 | In scope: Auto, Home, Renters, Umbrella, Health (narrow), and the Other bucket: rental car, towing/roadside, travel, phone, extended warranties, AD&D on term life. | BUILT | Q1 (`policies`) offers all of them: `public/js/overlap/data/questions/policies.mjs`; one flag or flag group each (see sections 4 and 5). | `tests/data/policies.test.mjs` (suite "Q1 policies: the question itself"); `tests/audit/spec-checklist.test.mjs` (every Q1 policy is mapped to a SPEC line). |
| L26.1 | Health never does plan adequacy, network or plan comparison. | BUILT | No health question asks about the plan's quality; the deductible is a coarse band used only for the cushion check (`deductible_health`). | `tests/flags/health-deductible.test.mjs` (the tool never judges plan adequacy, network, or whether a plan is good). |
| L26.2 | Health is exactly three things: the medical-rider overlap, the supplemental bolt-on trims (accident, critical illness, hospital indemnity, cancer, short-term plans, HSA/FSA) and the deductible-vs-cushion check. | BUILT | `health-auto-medpay-overlap`; `health-supplemental-boltons`, `health-short-term-plan-alongside`, `health-hsa-nudge`; `deductible-exceeds-cushion-health` (all in `public/js/overlap/data/flags/health.mjs` and `deductible.mjs`). | `tests/flags/health-deductible.test.mjs`; `tests/audit/spec-checklist.test.mjs` (every health flag is mapped). |
| L28.1 | Scope is about where policy types interact, so the engine focuses on the interactions, not a checklist per policy. | BUILT | Cross-policy flags (`kind: 'cross-policy'`) read two or more policies: the umbrella stack, renters against home, health against auto, rental car against auto. | `tests/audit/spec-checklist.test.mjs` (suite "the table"); `tests/audit/households.test.mjs` (a flag fires only for a household that holds its policies). |
| L28.2 | Within-policy exceptions worth surfacing: sewer backup and flood (home); uninsured motorist, loan/lease gap, over-insured older cars (auto). | BUILT | `home-sewer-backup-missing`, `home-flood-no-separate-policy` in `public/js/overlap/data/flags/home.mjs`; `auto-um-uim-check`, `auto-gap-coverage-missing`, `auto-gap-coverage-confirm`, `auto-collision-older-car` in `public/js/overlap/data/flags/auto.mjs`; all `kind: 'within-policy'`. | `tests/audit/spec-checklist.test.mjs` (the six flags the SPEC calls within-policy are declared within-policy). |

## 3. Core logic: the interactions to encode (SPEC lines 32 to 38)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L32 | Overlaps and gaps exist only between policies the user holds, so the engine branches off the set they select. | BUILT | `{ holds: id }` conditions and `ctx.holds(id)` read Q1 (`policies`) in `public/js/overlap/engine/conditions.mjs`; every question and flag is gated on it. | `tests/data/policies.test.mjs` (suite "gating of every downstream question, per combination of ticks": all 8,192 tick combinations); `tests/audit/households.test.mjs` (1,500 random households). |
| L34.1 | Auto + Home + Umbrella: the umbrella sets minimum underlying limits; flag under-buying (gap below the attachment point). | BUILT | `computeLiabilityStack` in `public/js/overlap/engine/liabilityStack.mjs`; Raise flags `umbrella-home-below-required-min`, `umbrella-auto-below-required-min` in `public/js/overlap/data/flags/umbrella.mjs`. | `tests/engine/liabilityStack.test.mjs`; `tests/flags/umbrella-core.test.mjs` (all 1,200 combinations of the core ladder). |
| L34.2 | Flag over-buying liability on auto or home when the umbrella already covers it. | DEVIATION (DECISIONS S6-6) | `umbrella-primary-liability-overbought` is a Question, never a Drop: no authoritative source says to cut primary limits under an umbrella, and the ask ends "Do not lower any limit below the minimum your umbrella requires". | `tests/flags/umbrella-core.test.mjs` (suite "umbrella-primary-liability-overbought"); `tests/audit/spec-checklist.test.mjs` (row "flow-stack-logic"). |
| L34.3 | Not sure on a limit must not drop the user out of the flow. | BUILT | `umbrella-limits-unconfirmed` is the Question twin of the Raises and says which number to go and get (DECISIONS S6-4, S12-11). | `tests/flags/umbrella-core.test.mjs` (suite "umbrella-limits-unconfirmed"); `tests/audit/flag-content.test.mjs` (the unconfirmed-limits item sends the household to the right place). |
| L35 | Renters + Homeowners: a student's renters policy often duplicates a parent's homeowners off-premises cover. | BUILT | `renters-child-vs-parents-home` in `public/js/overlap/data/flags/renters.mjs`, reached by ticking Home and Renters and saying the policy is for a child (DECISIONS R1-4). | `tests/flags/home-renters.test.mjs` (suite "renters-child-vs-parents-home"); browser goldens `renters-college-child` and `renters-college-off-campus`. |
| L36 | The Other bucket: quick wins (rental car, travel, phone, warranties, AD&D), cross-referenced with the auto policy and the user's cards. | BUILT; DEFERRED (D14) | Seven flags in `public/js/overlap/data/flags/other.mjs`. The auto-policy half is built; the card half reads the card table through `ctx.cards()` and is generic while the table is empty. | `tests/flags/other-bucket.test.mjs`; `tests/audit/cards.test.mjs`. |
| L38 | Credit card benefit data lives in its own lookup table keyed by card. | BUILT; DEFERRED (D14) | The table and its contract: `public/js/overlap/data/cards.mjs` (`CARDS`, keyed by card id), `ctx.cards()` / `ctx.cardsWith()` in `public/js/overlap/engine/evaluate.mjs`, validation in `public/js/overlap/engine/validate.mjs`. The table is empty; the research is not done (OPEN-ITEMS `S16-7`). | `tests/engine/catalog.test.mjs`; `tests/engine/validate.test.mjs`; `tests/audit/cards.test.mjs` (suite "card audit: the rules, against the fixture table"; fixture cards in `tests/fixtures/otherCards.mjs`). |

## 4. Question flow and branching (SPEC lines 42 to 122)

### 4.1 The tree and Q1 (lines 42 to 44)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L42.1 | A fixed decision tree; Q1 drives every downstream branch; every later question appears only when its policy or item was ticked in Q1. | BUILT | `showIf` gates built from `holds` in `public/js/overlap/data/questions/gates.mjs`; sections in `public/js/overlap/data/questions/sections.mjs`. | `tests/data/questions.test.mjs` (suites "every non-derived question is gated per the SPEC", "the exact visible questions for policy combinations (traversal)", "reachability"); `tests/data/policies.test.mjs` (gating, 8,192 combinations). |
| L42.2 | Where answers come from a short list, offer presets to tap, never a blank field. | BUILT | Every question is `single` or `multi` with listed options, tapped as buttons (`questionHtml` in `public/js/overlap-ui/screens.mjs`). | `tests/data/questions.test.mjs` (suite "closed lists, no free text, no typed figures, Not sure rules"); `tests/ui/screens.test.mjs` (suite "questionHtml"). |
| L42.3 | Always include a "not sure" option so the user stays in the flow. | DEVIATION (DECISIONS S5-8) | The engine appends `not_sure` to every question that allows it (all but five): `public/js/overlap/engine/session.mjs`. The five without it are `policies`, `side_business`, `auto_financing`, `renters_for` and `cards`, where the user knows the answer or the list has its own "none" choice. | `tests/data/questions.test.mjs` (suite "closed lists, no free text, no typed figures, Not sure rules" pins the list of exceptions); `tests/ui/screens.test.mjs` (suite "overlap screens can always be completed (Continue never deadlocks)"). |
| L44 | Q1 "Which policies do you have?": Auto, Home, Renters, Umbrella, Health and the Other items; it gates everything below. | DEVIATION (DECISIONS D1 and R1-1) | `public/js/overlap/data/questions/policies.mjs`: the SPEC's list in the SPEC's order, plus `motorcycle`, `boat` and `towing` (which later sections need to be selectable in Q1) and an exclusive `none`. Each label is in the app's voice and defines its one piece of jargon in a clause (DECISIONS R1-1). | `tests/data/policies.test.mjs` (Q1's options exactly, in order); `tests/browser/golden-shape.test.mjs` (Q1 lists the SPEC options in the SPEC order); `tests/audit/spec-checklist.test.mjs`. |

### 4.2 Auto + Home + Umbrella core (lines 46 to 52)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L46 | Appears if Umbrella is selected. | BUILT | Section `umbrella_stack` gated on `holds('umbrella')` (`public/js/overlap/data/questions/umbrellaStack.mjs`). | `tests/data/questions.test.mjs` (traversal). |
| L48.1 | Auto liability limit, asked in the SPEC's words, presets 100/300, 250/500, 500/500, not sure. | BUILT | `auto_liability` (`public/js/overlap/data/questions/umbrellaStack.mjs`); asked when both an umbrella and an auto policy are ticked. | `tests/data/questions.test.mjs` (suite "presets match the SPEC where it specifies them"). |
| L48.2 | (Beyond the SPEC's presets.) A limit lower than 100/300 needs an honest answer. | DEVIATION (DECISIONS S5-13) | A first rung `lower` ("Lower than 100/300") on `auto_liability`, `motorcycle_liability`, `boat_liability` and `auto_um_uim_limit`, and "Lower than $300,000" on `home_liability`; its value is the largest limit it can mean. | `tests/data/questions.test.mjs` (the `lower` rung is first, unique, below every minimum offered); `tests/engine/liabilityStack.test.mjs`. |
| L49 | Umbrella limit, presets 1 million, 2 million, 5 million, not sure. | BUILT | `umbrella_limit` (`public/js/overlap/data/questions/umbrellaStack.mjs`). | `tests/data/questions.test.mjs` (suite "presets match the SPEC where it specifies them"). |
| L50 | Home liability limit in the SPEC's words, presets 300,000, 500,000, 1 million, not sure. | BUILT; DEVIATION (DECISIONS S5-13) | `home_liability`, with the extra `lower` rung described under L48.2. | `tests/data/questions.test.mjs` (presets). |
| L51 | Umbrella's required home minimum, presets 300,000, 500,000, not sure. | BUILT | `umbrella_min_home` (no `lower` rung: it records what the umbrella asks, not a limit the user holds). | `tests/data/questions.test.mjs` (presets; no minimum question has a `lower` rung). |
| L52.1 | Compare auto and home limits against the umbrella attachment point; flag over- and under-buying. | BUILT; DEVIATION (DECISIONS S5-2) | The SPEC specifies only the home minimum, so `umbrella_min_auto` is asked too (otherwise the auto limit has nothing to be compared with). Under-buying is a Raise; over-buying is a Question (L34.2). | `tests/engine/liabilityStack.test.mjs`; `tests/flags/umbrella-core.test.mjs`. |
| L52.2 | A home limit below the umbrella's required minimum is a Raise item. | BUILT | `umbrella-home-below-required-min` (bucket `raise`, strong when the limit is lower than $300,000). The copy asks and does not claim the umbrella is void, because no source says what happens (DECISIONS S3a-umbrella-1). | `tests/flags/umbrella-core.test.mjs`; `tests/audit/spec-checklist.test.mjs` (the buckets the SPEC names). |

### 4.3 Umbrella scope and adequacy (lines 54 to 61)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L54 | Appears if Umbrella is selected. | BUILT | Section `umbrella_scope` gated on `holds('umbrella')` (`public/js/overlap/data/questions/umbrellaScope.mjs`). | `tests/data/questions.test.mjs` (traversal). |
| L56 | A standard umbrella is liability only and does nothing for your own property; this branch checks the umbrella's size and shape. | BUILT | The section reason and the exclusions flag's background say so (`public/js/overlap/data/questions/sections.mjs`, `public/js/overlap/data/flags/umbrellaScope.mjs`). | `tests/flags/umbrella-scope.test.mjs` (suite "copy quality across every text branch"). |
| L58 | Adequacy against exposure, coarse bands (under 1 million, 1 to 3 million, over 3 million, not sure), never a typed figure; a 1 million umbrella against a larger exposure is a Raise. | BUILT; DEVIATION (DECISIONS S5-10) | `umbrella_exposure` (the prompt says "what your home is worth beyond what you still owe on it" where the SPEC says "home equity", a phrase the copy rules ban); `umbrella-smaller-than-exposure` (Raise) and `umbrella-size-unconfirmed` (the Question twin for Not sure); band edges compared, never a guess (DECISIONS S7-1). | `tests/flags/umbrella-scope.test.mjs` (a full grid of umbrella amount by exposure band); `tests/data/questions.test.mjs` (bands contiguous, inclusive). |
| L59 | Uninsured/underinsured motorist on the umbrella: ask whether it extends UM/UIM and, if not, whether it can be added. | DEVIATION (DECISIONS S7-3) | `umbrella_um_uim` (asked when an umbrella and an auto policy are both ticked, because UM/UIM is an auto coverage) and `umbrella-um-uim-extension`. It asks; it never says "many umbrellas do not include it by default", which no source supports. | `tests/flags/umbrella-scope.test.mjs` (suite "umbrella-um-uim-extension"). |
| L60 | Scope exclusions (business or side-gig activity, personal-injury limits): ask what the umbrella excludes, stronger with a side business. | BUILT | `side_business`; `umbrella-scope-exclusions` (strong when `side_business` is `yes`). | `tests/flags/umbrella-scope.test.mjs` (suite "umbrella-scope-exclusions"). |
| L61 | Not stored: the adequacy answer is a coarse band that drives the flag in the browser; analytics records only which band. | BUILT | Bands only (`umbrella_exposure`); nothing is stored; the analytics allowlist can name only a catalog option id (`public/js/overlap-ui/analytics.mjs`). | `tests/ui/analytics.test.mjs` (adequacy and cushion answers are band-only); `tests/ui/no-storage.test.mjs`. |

### 4.4 Auto coverage gaps (lines 63 to 70)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L63 | Appears if Auto is selected. | BUILT | Section `auto_gaps` gated on `holds('auto')` (`public/js/overlap/data/questions/autoGaps.mjs`). | `tests/data/questions.test.mjs` (traversal). |
| L65 | Two gate questions drive the four gaps: lease or finance, and how old or valuable the car is. | BUILT; DEVIATION (DECISIONS S5-4) | `auto_financing` and `auto_value` (value bands, not age). They are about the user's newest car, because the engine is not told the vehicle count. | `tests/data/questions.test.mjs` (gates of `auto_gap_coverage` and `auto_collision`). |
| L67 | Uninsured / underinsured motorist: roughly one in eight drivers is uninsured; ask whether the policy includes it and at what limit. | DEVIATION (DECISIONS S3a-auto-1) | `auto_um_uim`, `auto_um_uim_limit`, `auto-um-uim-check`. The statistic is the Insurance Research Council's latest dated figure (about 15% in 2023), not the undated "one in eight". | `tests/flags/auto.test.mjs` (suites "auto-um-uim-check (Question)" and "the uninsured-driver statistic"); `tests/audit/spec-checklist.test.mjs` (the text carries the figure's year and cites the IRC). |
| L68 | Gap coverage, gated on finance-or-lease; a Raise for a loan on a newer car; irrelevant when owned outright. | BUILT | `auto_gap_coverage` (asked only for a loan or lease), `auto-gap-coverage-missing` (Raise), `auto-gap-coverage-confirm` (Question twin for Not sure); silent for a car certainly worth under $3,000. | `tests/flags/auto.test.mjs` (suite "the gap coverage pair"). |
| L69 | Rental reimbursement: does the policy pay for a rental while the car is in the shop. | BUILT | `auto_rental_reimbursement`, `auto-rental-reimbursement-check` (one text per answer). | `tests/flags/auto.test.mjs` (suite "auto-rental-reimbursement-check (Question)"). |
| L70 | Collision / comprehensive on an older car, gated on low value; a Drop candidate. | BUILT | `auto_collision` (asked only for a paid-off car worth under $3,000), `auto-collision-older-car` (bucket `drop`). | `tests/flags/auto.test.mjs` (suite "auto-collision-older-car (Drop)"). |

### 4.5 Renters (lines 72 to 75)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L72 | Appears if Renters is selected. | BUILT | Section `renters` gated on `holds('renters')` (`public/js/overlap/data/questions/renters.mjs`). | `tests/data/questions.test.mjs` (traversal). |
| L74 | "Is this renters policy for you, or for a child who lives away from home, like at college?" | BUILT | `renters_for` (no Not sure: you know whose belongings you insured). | `tests/data/questions.test.mjs`; browser goldens `only-renters`, `renters-college-child`. |
| L75 | If for a child away at college: a Question item asking whether the parent's homeowners already covers the child's belongings off-premises. | BUILT; DEVIATION (DECISIONS S16-3) | `renters_child_housing` (dorm or off campus, asked when Home is also ticked) and `renters-child-vs-parents-home`, always a Question, worded "generally" and "may". A student who rents and answers "For me" is not asked about their parents; the SPEC's flow asks the person paying, and covering the student is a design call (OPEN-ITEMS `S16-10`). | `tests/flags/home-renters.test.mjs` (suite "renters-child-vs-parents-home"); browser goldens `renters-college-child`, `renters-college-off-campus`, `not-sure-everywhere`. |

### 4.6 Health medical-rider overlap (lines 77 to 82)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L77 | Appears if Health is selected. | BUILT | Section `health` gated on `holds('health')` (`public/js/overlap/data/questions/health.mjs`). | `tests/data/questions.test.mjs` (traversal). |
| L79 | This is not health-plan pricing; it is only the overlap with the auto and home medical riders. | BUILT | `health-auto-medpay-overlap` makes no claim about the plan. | `tests/flags/health-deductible.test.mjs` (suite "health-auto-medpay-overlap"; no plan-adequacy language). |
| L81 | "Do you have health insurance?" | BUILT | Answered by ticking Health in Q1 (`policies`). | `tests/data/policies.test.mjs`. |
| L82 | If yes: a Question item on auto MedPay and home medical-payments-to-others, worth asking whether they are still needed. | DEVIATION (DECISIONS S3a-home-2) | `auto_medpay` (asked with Health and Auto) and `health-auto-medpay-overlap` (asks both insurers). Home medical payments to others covers guests, not your household, so the text says it is not part of the overlap. | `tests/flags/health-deductible.test.mjs` (suite "health-auto-medpay-overlap": home medical payments is background only). |

### 4.7 Other vehicles: motorcycle and boat (lines 84 to 91)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L84 | Appears if selected in Q1 and relevant when an Umbrella is also held. | BUILT | Section `umbrella_vehicles` gated on an umbrella plus a motorcycle or boat (`public/js/overlap/data/questions/umbrellaVehicles.mjs`). | `tests/data/questions.test.mjs` (traversal); browser goldens `only-motorcycle`, `only-boat`, `moto-boat-umbrella`, `moto-boat-full-stack`. |
| L86 | The umbrella needs minimum liability limits on each vehicle, not just auto and home. | BUILT | `umbrella_min_motorcycle`, `umbrella_min_boat`; one layer each in the stack model. | `tests/engine/liabilityStack.test.mjs` (status of a motorcycle or boat layer over the whole ladder). |
| L88 | Motorcycle or boat liability limit, captured the same preset way as auto; low liability under a large umbrella is a Raise. | BUILT | `motorcycle_liability`, `boat_liability`; `umbrella-motorcycle-below-required-min`, `umbrella-boat-below-required-min` (bucket `raise`, `public/js/overlap/data/flags/vehicles.mjs`). | `tests/flags/umbrella-core.test.mjs` (suite "umbrella-motorcycle-below-required-min and umbrella-boat-below-required-min"). |
| L89 | Towing/roadside on a motorcycle or boat policy often duplicates auto roadside or a card benefit: Drop. | DEVIATION (DECISIONS S3a-other-7) | `towing_vehicle_policy` and `other-vehicle-towing-check`, a Question: sources show only that a car policy does not reach these vehicles, nothing shows these plans usually repeat each other. | `tests/flags/other-bucket.test.mjs` (suite "other-vehicle-towing-check"). |
| L91 | RV, ATV and jet ski are fast-follow, not v1. | OUT OF V1 (DECISIONS D11) | Absent from Q1 (`public/js/overlap/data/questions/policies.mjs`), the questions and the flags. | `tests/audit/spec-checklist.test.mjs` (suite "fast-follow items are out of v1"). |

### 4.8 Health supplemental overlap (lines 93 to 99)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L93 | Appears if Health is selected. | BUILT | Section `health` (`public/js/overlap/data/questions/health.mjs`). | `tests/data/questions.test.mjs` (traversal). |
| L95 | Still not plan adequacy; the deductible is asked only as a coarse band for the cushion check. | BUILT | `deductible_health` in section `deductible`; no network, quality or adequacy question or text. | `tests/flags/health-deductible.test.mjs` (the tool never judges plan adequacy). |
| L97 | Supplemental bolt-ons (accident, critical illness, hospital indemnity, cancer): a Question-to-Drop item about whether the narrow payout is worth the premium. | DEVIATION (DECISIONS S3a-health-2) | `health_supplemental`, `health-supplemental-boltons` (a Question). "Often redundant" is the SPEC's claim, not a sourced fact, so the text states only what the sources say, tied to the product they describe (DECISIONS S10-9), and asks. | `tests/flags/health-deductible.test.mjs` (suite "health-supplemental-boltons"). |
| L98 | HSA/FSA leakage: a light nudge, a single Question item, no plan shopping. | DEVIATION (DECISIONS S3a-health-5) | `health_hsa`, `health-hsa-nudge`. No source says HSAs are "commonly underused", so it states the three federal tax advantages (with a year on every dollar threshold it gives) and asks. | `tests/flags/health-deductible.test.mjs` (suite "health-hsa-nudge"). |
| L99 | A short-term or supplemental medical plan next to an ACA or employer plan: a Question on whether the second is still needed. | BUILT | `health_short_term`, `health-short-term-plan-alongside` (prints no duration; the federal rules are in flux, DECISIONS S3a-health-1). | `tests/flags/health-deductible.test.mjs` (suite "health-short-term-plan-alongside"). |

### 4.9 Common home-policy exclusions (lines 101 to 107)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L101 | Appears if Home is selected. | BUILT | Section `home_exclusions` gated on `holds('home')` (`public/js/overlap/data/questions/homeExclusions.mjs`). | `tests/data/questions.test.mjs` (traversal). |
| L103 | Within-policy gaps, each a Question item with the background-and-ask treatment. | BUILT | `public/js/overlap/data/flags/home.mjs`; both flags are `kind: 'within-policy'`, bucket `question`. | `tests/flags/home-renters.test.mjs`; `tests/audit/spec-checklist.test.mjs`. |
| L105 | Sewer / drain backup, the flagship: ask whether water/sewer backup is on the policy. | DEVIATION (DECISIONS D8) | `home_sewer_backup` (yes, no, not sure) and `home-sewer-backup-missing`, which fires on "no" (strong) and "not sure" so informed users are not nagged. | `tests/flags/home-renters.test.mjs` (suite "home-sewer-backup-missing"). |
| L106 | Flood: never covered by homeowners; ask about flood exposure and separate coverage. | DEVIATION (DECISIONS D8) | `home_flood_policy` and `home-flood-no-separate-policy`, sourced to FEMA and floodsmart.gov. | `tests/flags/home-renters.test.mjs` (suite "home-flood-no-separate-policy"); `tests/audit/spec-checklist.test.mjs` (sourceHosts). |
| L107 | Earth movement and water-damage sub-limits are fast-follow. | OUT OF V1 (DECISIONS S3a-home-1) | Absent from `public/js/overlap/data/questions/homeExclusions.mjs` and `public/js/overlap/data/flags/home.mjs`. | `tests/audit/spec-checklist.test.mjs` (suite "fast-follow items are out of v1"). |

### 4.10 Deductible vs. emergency cushion (line 109 to 111)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L109 | Appears if Auto, Home or Health is selected. | BUILT | Section `deductible` gated on any of the three (`public/js/overlap/data/questions/deductible.mjs`). | `tests/data/questions.test.mjs` (traversal). |
| L111.1 | Ask each deductible as a coarse band and one cushion question as bands (under 1,000, 1,000 to 5,000, over 5,000, not sure); never a diagnosis of the plan. | BUILT; DEVIATION (DECISIONS S5-3) | `deductible_auto`, `deductible_home`, `deductible_health`, `emergency_cushion`, all with the same three bands; the SPEC's edges are made exact: under $1,000, $1,000 to $4,999, $5,000 or more. | `tests/data/questions.test.mjs` (comparable option values; bands contiguous and inclusive). |
| L111.2 | If a deductible exceeds what they could absorb, that is a flag: build the cushion or reconsider the deductible, their choice. | BUILT | `deductible-exceeds-cushion-auto`, `deductible-exceeds-cushion-home`, `deductible-exceeds-cushion-health`; band edges compared, strong when certain (DECISIONS S10-3). | `tests/flags/health-deductible.test.mjs` (suite "deductible-exceeds-cushion: the band matrix"). |
| L111.3 | Store only the bands; analytics records the band only. | BUILT | The answer is a band option id; the analytics allowlist in `public/js/overlap-ui/analytics.mjs` accepts nothing else. | `tests/ui/analytics.test.mjs`; `tests/ui/no-storage.test.mjs`. |

### 4.11 Other bucket (lines 113 to 122)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L113 | Each item appears only if selected in Q1. | BUILT | Each Other item is a Q1 tick (its label restates the SPEC's question as a statement, for example "Phone insurance, a monthly fee to cover a lost, stolen or broken phone"); `cards`, `card_usual_payment`, `phone_bill_on_card`, `roadside_sources`, `towing_vehicle_policy`, `term_life` are gated on the ticks they belong to. | `tests/data/questions.test.mjs` (traversal); `tests/data/policies.test.mjs`. |
| L115 | Most point back to a card the user carries: cross-reference the card table and name the card when possible. | DEFERRED (D14) | `cards` (a static list of the 12 intended cards, `CARD_CHOICES` in `public/js/overlap/data/questions/cards.mjs`) and `card_usual_payment`; `public/js/overlap/data/flags/other.mjs` names a card only when the table has it and confirms the benefit, and always says to check the card's current benefits guide (`CARD_CAUTION`). With the real table empty the wording is generic. | `tests/audit/cards.test.mjs`; `tests/flags/other-bucket.test.mjs` (suite "card wording across card and payment combinations", against fixture cards). |
| L117 | Rental car: "likely Drop (duplicated by auto policy and/or card)"; stronger if they carry a card with rental coverage. | DEVIATION (DECISIONS S12-9); DEFERRED (D14) | `other-rental-car-waiver`: a Drop when the household has a car policy it has not said lacks collision and comprehensive (or a card that pays first and that it uses), otherwise a Question. "Stronger with a card" needs the card table. | `tests/flags/other-bucket.test.mjs` (suite "other-rental-car-waiver"); `tests/audit/flag-content.test.mjs` (suite "a Drop is a duplicate"). |
| L118 | Towing / roadside: duplication between auto towing, a roadside plan (AAA) and a card's roadside benefit; Drop if duplicated. | BUILT; DEFERRED (D14) | `roadside_sources` and `other-towing-roadside-duplicate` (a Drop when two or more of the user's own sources are ticked; strong when one of them is a credit card and a ticked card is confirmed to have roadside help, which needs the card table). | `tests/flags/other-bucket.test.mjs` (suite "other-towing-roadside-duplicate"). |
| L119 | Travel insurance: if yes and paid with a card that includes trip protection, likely Drop. | DEVIATION (DECISIONS S12-9); DEFERRED (D14) | `other-travel-insurance-overlap`: a Drop only when the card table confirms trip protection on a ticked card and the user usually pays with it; otherwise a Question, which is every household while the table is empty. | `tests/flags/other-bucket.test.mjs` (suite "other-travel-insurance-overlap"); `tests/audit/coverage.test.mjs`. |
| L120 | Phone insurance: check the card's cellphone protection and whether the bill runs through that card; the trim move is often to route the bill through the card, not simply cancel. | DEVIATION (DECISIONS S11-2); DEFERRED (D14) | `phone_bill_on_card` and `other-phone-insurance-card`, a Question: no allowlisted source describes phone plans or card phone cover, so it asks. The "swap the carrier plan for the card" move appears only for a card the table confirms. | `tests/flags/other-bucket.test.mjs` (suite "other-phone-insurance-card"). |
| L121 | Extended warranties: if yes and paid with a card that extends the manufacturer's warranty, likely Drop. | DEVIATION (DECISIONS S12-9); DEFERRED (D14) | `other-extended-warranty-overlap`, filed like travel (L119). | `tests/flags/other-bucket.test.mjs` (suite "other-extended-warranty-overlap"). |
| L122 | Accidental death (AD&D): includes the employer rider; a Question, because the answer depends on total life cover. | BUILT | `term_life` and `other-add-on-term-life` (a Question; four branches: own policy, only through a job, none, not sure). | `tests/flags/other-bucket.test.mjs` (suite "other-add-on-term-life"). |

## 5. Output: the insurer action list (SPEC lines 126 to 139)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L126 | A personalized list specific to the policies and answers given, each item phrased as an action for the insurer. | BUILT | `actionListViewModel` (`public/js/overlap-ui/viewModel.mjs`); every flag's `ask` is an action. | `tests/ui/viewModel.test.mjs`; `tests/audit/flag-content.test.mjs` (every rendering has a non-empty title, background, ask and reason). |
| L128 | Raise: limits too low or gaps to close. | BUILT | Bucket `raise`, group label and description in `viewModel.mjs` (`BUCKET_LABELS`, `BUCKET_DESCRIPTIONS`). | `tests/audit/coverage.test.mjs` (every bucket is reached); `tests/audit/spec-checklist.test.mjs`. |
| L129 | Drop: duplicated coverage they are paying for twice. | BUILT | Bucket `drop`; every Drop must have evidence of a duplicate (`tests/audit/evidence.mjs`). | `tests/audit/flag-content.test.mjs` (suite "a Drop is a duplicate"). |
| L130 | Question: items to ask their agent where the right answer depends on their specifics. | BUILT | Bucket `question`. | `tests/audit/coverage.test.mjs`. |
| L132 | Each item has four parts, in this order. | BUILT | `itemHtml` in `public/js/overlap-ui/screens.mjs` ("Why it matters", "What to ask", "Say this", "Source"); the same order in `actionListText`. | `tests/ui/screens.test.mjs` (suite "actionListHtml: the real catalog"); `tests/ui/viewModel.test.mjs` (suite "actionListText: the clipboard text"). |
| L134 | Background: a short plain-language explanation so the user can hold their own if the agent pushes back. | BUILT | `background` on every flag. | `tests/audit/flag-content.test.mjs` (every rendering has one); `tests/audit/copy.test.mjs` (plain copy, no placeholders, no state names). |
| L135 | The ask: the specific question or action to take to the insurer. | BUILT | `ask` on every flag. | `tests/audit/flag-content.test.mjs`. |
| L136 | The one-line reason they can repeat to the insurer. | BUILT | `reason` on every flag, first person, shown as "Say this". | `tests/audit/flag-content.test.mjs` (a non-empty one-line first-person reason). |
| L137 | The source: a citation to an authoritative third-party source, shown with the item; no flag ships without one. | BUILT | `sourceIds` on every flag, resolved from `public/js/overlap/data/sources.mjs` into publisher, title, link and last-verified date. | `tests/engine/validate.test.mjs` (a flag with no or unknown source fails validation); `tests/audit/flag-content.test.mjs`; `tests/ui/screens.test.mjs` (source lines). |
| L139 | The background is the core of the value. | BUILT | See L134; the background is shown in full on the page and in the copied and printed list, never collapsed (OPEN-ITEMS `S13-7`). | `tests/audit/flag-content.test.mjs`. |

## 6. Sources and authority (SPEC lines 143 to 153)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L143 | Every flag stores a source (publisher, title, URL, last-verified date) in its data entry, and the UI renders it beside each item. | BUILT | `public/js/overlap/data/sources.mjs` (89 entries), `sourceIds` on each flag, `sourceHtml` in `screens.mjs`. | `tests/data/sources.test.mjs`; `tests/audit/sources.test.mjs`; `tests/engine/validate.test.mjs`. |
| L145 | Authoritative, non-commercial sources matched to the claim. | BUILT | Every cited page was fetched and read by a researcher and re-checked by a verifier (`research/INDEX.md` and the five files under `research/`). | `tests/research/research.test.mjs`; `tests/data/sources.test.mjs` (the registry equals the verified research, field for field). |
| L147 | Definitions and coverage explanations: the Insurance Information Institute and the NAIC. | BUILT | Most flags cite `iii-*` and `naic-*` registry sources. | `tests/data/sources.test.mjs` (host allowlist). |
| L148 | Regulatory facts: the NAIC; the tool does not ask for a state and names none; where a point varies by state, point to the user's own state's insurance department generically. | BUILT | No state question exists (`public/js/overlap/data/questions/index.mjs` lists them all); copy says "your state's department of insurance". | `tests/audit/copy.test.mjs` (no flag, question, option or section names a state, by name, code or abbreviation); `tests/data/questions.test.mjs`. |
| L149 | Flood: FEMA and the National Flood Insurance Program (floodsmart.gov). | BUILT | `home-flood-no-separate-policy` cites `floodsmart-home`, `fema-nfip-waiting-period`, `floodsmart-flood-risk`. | `tests/audit/spec-checklist.test.mjs` (every listed flag cites one of the named hosts). |
| L150 | Uninsured-driver statistics: the Insurance Research Council or the Consumer Federation of America, citing the year. | BUILT | `auto-um-uim-check` cites `irc-2025-one-in-three-uninsured-underinsured` and its text says "in 2023". | `tests/flags/auto.test.mjs` (the statistic ties to the research file); `tests/audit/spec-checklist.test.mjs` (textIncludes the year). |
| L151 | Credit card benefit claims: the issuer's own current benefits guide, cited per card, with a last-verified date. | DEFERRED (D14) | No card claim is made while the table is empty. The card entry shape requires `guideUrl` and `lastVerified` (`public/js/overlap/engine/validate.mjs`). A result flag lists registry sources only, so a card's guide link is not shown beside the item yet (OPEN-ITEMS `S11-2`). | `tests/audit/cards.test.mjs`; `tests/engine/validate.test.mjs`. |
| L153 | Do not cite insurers, agencies or comparison sites as the authority; a commercial source only for a fact about its own product. | BUILT | The registry `public/js/overlap/data/sources.mjs` holds only verified pages on allowlisted authority hosts; a host allowlist and a forbidden-host list are applied to the research and to the registry. | `tests/data/sources.test.mjs` (every URL is on the allowlist; none on the forbidden list, not even inside a query string); `tests/audit/sources.test.mjs`. |

## 7. Build notes and open items (SPEC lines 157 to 172)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L157 | Header ("For Claude Code"). | CONTEXT | none | none needed |
| L159 | A fixed decision tree with branching logic; no AI or LLM call at runtime. | BUILT | See L17: `public/js/overlap/engine/evaluate.mjs`. | `tests/engine/purity.test.mjs`; `tests/ui/analytics.test.mjs` (suite "page sources"). |
| L160 | Keep the liability stack as a single reusable engine and visualization, reused across branches. | BUILT | One engine, `computeLiabilityStack` in `public/js/overlap/engine/liabilityStack.mjs`; one drawing, `stackViewModel` and `stackViewHtml` in `public/js/overlap-ui/stackView.mjs`, used on the two umbrella limit screens and in the action list. | `tests/engine/liabilityStack.test.mjs`; `tests/ui/stackView.test.mjs`; browser goldens `umbrella-low-limits`, `umbrella-matching-limits`, `umbrella-high-limits`, `moto-boat-umbrella`, `moto-boat-full-stack`. |
| L161 | Deterministic and testable; each policy combination gives the same output every time, so outputs can be snapshot-tested. | BUILT | Pure engine; snapshots in `tests/snapshots/` (scenario flags and texts, the stack matrix, the stack view); `scripts/update-snapshots.sh`. | `tests/audit/scenarios.test.mjs` (suites "determinism" and "scenario snapshots"); `tests/engine/evaluate.test.mjs`. |
| L162 | Credit card benefits live in their own lookup table keyed by card, separate from the policy logic. | BUILT; DEFERRED (D14) | `public/js/overlap/data/cards.mjs`, separate from `flags/` and `questions/`; empty until the research is done. | `tests/engine/catalog.test.mjs`; `tests/audit/cards.test.mjs`. |
| L164 | Header ("Open items to settle before or during build"). | CONTEXT | See L166 to L172. | none needed |
| L166 | The precise preset tiers and the "not sure" fallback for each limit question. | BUILT; OWNER ACTION (OPEN-ITEMS S5-2) | Tiers in `public/js/overlap/data/questions/presets.mjs` (DECISIONS S5-3, S5-13); Not sure leaves a layer "unknown" and fires the Question twin, never a Raise (DECISIONS S6-4). The tiers are product choices with no source, for the owner to review before launch. | `tests/data/questions.test.mjs` (suite "presets match the SPEC where it specifies them"); `tests/engine/liabilityStack.test.mjs` (suite "Not sure and missing answers never produce a verdict"). |
| L167 | The precise auto/home/umbrella liability-stack rules (attachment points, common tiers). | BUILT | The attachment point is a layer's own limit; status compares it with the minimum the user's umbrella states (DECISIONS S6-2, S6-3); documented in `docs/ARCHITECTURE.md` ("LiabilityStack"). | `tests/engine/liabilityStack.test.mjs` (the whole preset ladder, 1,200 combinations in `tests/flags/umbrella-core.test.mjs`). |
| L168 | Credit card lookup table (settled approach): seed by popularity and richness of overlapping benefits; a first tranche of about a dozen cards. | DEFERRED (D14) | The 12 intended cards are listed as static choices (DECISIONS D3, S5-7). Verified research exists for 8 of them on the unmerged branch `story/S4a`; the four American Express cards remain. Resume steps: OPEN-ITEMS `S16-7`. | `tests/data/questions.test.mjs` (suite "the credit-card choices (static until the card table lands, DECISIONS D14)"). |
| L169 | Freshness caveat: each card entry needs a last-verified date, and the tool points users to their own benefits guide. | BUILT; DEFERRED (D14) | `lastVerified` is required on every card entry by `public/js/overlap/engine/validate.mjs`; `CARD_CAUTION` in `public/js/overlap/data/flags/other.mjs` ends every text that mentions a card. The re-verification process is OPEN-ITEMS `S16-8`. | `tests/engine/validate.test.mjs`; `tests/audit/cards.test.mjs` (a pointer to the benefits guide whenever a card is named). |
| L170.1 | Build target: a single static page on Cloudflare Pages; zero backend; no data storage; answers never leave the browser as personal data. | BUILT; OWNER ACTION (OPEN-ITEMS S16-4) | `public/` is the whole site (`public/_headers` carries the Content-Security-Policy); `npm run deploy` publishes it and is manual. | `tests/ui/no-storage.test.mjs`; `tests/ui/analytics.test.mjs` (suites "page sources" and "CSP: public/_headers"). |
| L170.2 | Analytics: aggregate totals of each answer only, anonymous, cookieless events with the answer as a label and no identifier; a tool that supports custom events (Plausible, Fathom or Zaraz). | DEVIATION (DECISIONS D4); OWNER ACTION (OPEN-ITEMS S16-3) | `public/js/overlap-ui/analytics.mjs` and `public/js/config.mjs`: provider-pluggable, switched off by default; the owner picks a provider and adds its hosts to the policy. | `tests/ui/analytics.test.mjs` (allowlist of events and labels, per-provider call shapes, fail-closed settings, one count per run). |
| L170.3 | The page states plainly that answers are counted anonymously and never stored against a person. | DEVIATION (DECISIONS S15-1) | `privacyLine(counting)` in `public/js/overlap-ui/screens.mjs` shows the "counted anonymously" line when a provider is on and "not saved, nothing counted or sent" when none is, so the page never claims counting that is not happening. | `tests/ui/analytics.test.mjs` (suite "page statements: the privacy line and the not-advice note"). |
| L171 | Licensing check: confirm whether Minnesota insurance producer licensing applies before charging anyone or recommending carriers. | OWNER ACTION (OPEN-ITEMS S16-2) | Nothing in the tool charges, collects leads or recommends a carrier; the check is the owner's. | none; an owner decision. |
| L172 | Timing (health branch only): open enrollment, roughly October to early December, is the peak window for the health supplemental branch. | OWNER ACTION (OPEN-ITEMS S16-5) | The health copy nods to open enrollment (L20.2); deploying inside the window is the owner's call. | `tests/flags/health-deductible.test.mjs` (the open-enrollment nod). |

## 8. Competitive landscape (SPEC lines 176 to 182)

| Line | Requirement | Status | Where implemented | Proof |
|---|---|---|---|---|
| L176-182 | The competitive scan (CoverCheck, CoverageCheckr, Coverage Cat) and where this product differs: no upload, action-oriented output with the words to say, and the card-duplication layer. | CONTEXT | The differentiators are L16 (no upload), L136 (the "Say this" line) and the card layer (L115, deferred). Nothing in the product names or links any competitor. | none needed |

## Appendix A. Every flag, and the SPEC line it implements

Bucket is the flag's declared (usual) bucket. `other-rental-car-waiver`, `other-travel-insurance-overlap` and `other-extended-warranty-overlap` are declared `drop` with `alternateBuckets: ['question']` and are filed as a Question when nothing already covers the same thing (DECISIONS S12-9). `docs/QUESTION-FLAG-PLAN.md` and `tests/fixtures/flagPlan.mjs` list those three as `drop`, which is the declared bucket, not a mistake.

| Flag | Bucket | SPEC line |
|---|---|---|
| `umbrella-home-below-required-min` | raise | L52.2 |
| `umbrella-auto-below-required-min` | raise | L34.1, L52.1 |
| `umbrella-primary-liability-overbought` | question | L34.2 |
| `umbrella-limits-unconfirmed` | question | L34.3 |
| `umbrella-motorcycle-below-required-min` | raise | L88 |
| `umbrella-boat-below-required-min` | raise | L88 |
| `umbrella-smaller-than-exposure` | raise | L58 |
| `umbrella-size-unconfirmed` | question | L58 |
| `umbrella-um-uim-extension` | question | L59 |
| `umbrella-scope-exclusions` | question | L60 |
| `auto-um-uim-check` | question | L67 |
| `auto-gap-coverage-missing` | raise | L68 |
| `auto-gap-coverage-confirm` | question | L68 |
| `auto-rental-reimbursement-check` | question | L69 |
| `auto-collision-older-car` | drop | L70 |
| `home-sewer-backup-missing` | question | L105 |
| `home-flood-no-separate-policy` | question | L106 |
| `renters-child-vs-parents-home` | question | L35, L75 |
| `health-auto-medpay-overlap` | question | L82 |
| `health-supplemental-boltons` | question | L97 |
| `health-hsa-nudge` | question | L98 |
| `health-short-term-plan-alongside` | question | L99 |
| `deductible-exceeds-cushion-auto` | question | L111.2 |
| `deductible-exceeds-cushion-home` | question | L111.2 |
| `deductible-exceeds-cushion-health` | question | L111.2 |
| `other-rental-car-waiver` | drop (or question) | L117 |
| `other-towing-roadside-duplicate` | drop | L118 |
| `other-vehicle-towing-check` | question | L89 |
| `other-travel-insurance-overlap` | drop (or question) | L119 |
| `other-phone-insurance-card` | question | L120 |
| `other-extended-warranty-overlap` | drop (or question) | L121 |
| `other-add-on-term-life` | question | L122 |

## Appendix B. Every question, and the SPEC line it implements

| Question | SPEC line |
|---|---|
| `policies` | L44, L81 |
| `umbrella_limit` | L49 |
| `auto_liability` | L48.1 |
| `umbrella_min_auto` | L52.1 |
| `home_liability` | L50 |
| `umbrella_min_home` | L51 |
| `motorcycle_liability`, `umbrella_min_motorcycle` | L88 |
| `boat_liability`, `umbrella_min_boat` | L88 |
| `umbrella_exposure` | L58 |
| `umbrella_um_uim` | L59 |
| `side_business` | L60 |
| `auto_financing`, `auto_value` | L65 |
| `auto_gap_coverage` | L68 |
| `auto_collision` | L70 |
| `auto_um_uim`, `auto_um_uim_limit` | L67 |
| `auto_rental_reimbursement` | L69 |
| `renters_for` | L74 |
| `renters_child_housing` | L75 |
| `auto_medpay` | L82 |
| `health_hsa` | L98 |
| `health_supplemental` | L97 |
| `health_short_term` | L99 |
| `home_sewer_backup` | L105 |
| `home_flood_policy` | L106 |
| `deductible_auto`, `deductible_home`, `deductible_health`, `emergency_cushion` | L111.1 |
| `cards`, `card_usual_payment` | L115 |
| `phone_bill_on_card` | L120 |
| `roadside_sources` | L118 |
| `towing_vehicle_policy` | L89 |
| `term_life` | L122 |

## Appendix C. Deferred work (D14) in one place

Every requirement marked DEFERRED above comes down to the same missing piece, the credit-card lookup table: L36 and L38 (the card half), L115 and L117 to L121 (naming a card, "stronger with a card"), L151, L162, L168 and L169. What works today with the table empty: the `cards` and `card_usual_payment` questions, the generic "check your card's current benefits guide" wording, and the whole card-aware path tested against invented fixture cards. OPEN-ITEMS `S16-7` has the steps to finish it.
