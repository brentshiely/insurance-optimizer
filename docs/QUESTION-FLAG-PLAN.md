# Question and flag plan

Which question each flag reads: the contract between the question catalog (`public/js/overlap/data/questions/`) and the flags written against it (S6 umbrella core and other vehicles, S7 umbrella scope and adequacy, S8 auto gaps, S9 home exclusions and renters, S10 health and deductible-vs-cushion, S11 Other bucket; the story ids are how the flag files and DECISIONS entries are named). Read it with `docs/ARCHITECTURE.md` (engine contracts), `docs/DECISIONS.md` (entries `S5-*` explain every choice here, `S3a-*` bind flag wording) and `research/INDEX.md` (fact and source ids).

The same plan exists as data in `tests/fixtures/flagPlan.mjs`. `tests/data/questions.test.mjs` checks that this document, that fixture and the real catalog agree, so a change to one without the others fails the suite. The section table, the question table, the planned-flags table and the per-flag blocks below are the machine-checked parts; edit them and the fixture together.

## 1. How to read answers

Flags read the pruned, frozen `ctx` (ARCHITECTURE "Context"). Reading a question that is hidden or unanswered returns `undefined` or `false`; it never throws. Which policies the user has comes from Q1, the asked question `policies`; read it with `ctx.holds(policyId)`. A flag that calls `ctx.holds` lists `policies` first among its questions.

```js
ctx.holds('auto')                              // ticked in Q1 (the `policies` question)
ctx.is('auto_financing', 'paid_off')           // single question
ctx.includes('health_supplemental', 'cancer')  // multi question
ctx.isNotSure('home_flood_policy')             // true for 'not_sure' (single) or an array containing it (multi)
ctx.option('emergency_cushion').value          // { min, max } of the chosen option; undefined if unanswered
```

**Not sure.** Check `ctx.isNotSure(qid)` before reading `.value`: the Not sure option has no value. A Raise flag never fires on Not sure (it cannot assert a gap it does not know about); each Raise in the plan has a Question twin that fires on Not sure, or says so in its trigger. A Drop flag fires only on something the user said they have (a ticked extra, or a "yes"). Most questions say Not sure is allowed; the few that do not (`policies`, `side_business`, `auto_financing`, `renters_for`, `cards`) are listed with reasons in DECISIONS S5-8.

**Hidden questions.** Every question carries its own complete gate, so a flag may read it without re-checking the gate. A flag should still name the policy it is about with `ctx.holds(...)`, so the condition reads clearly and the flag cannot fire for someone who does not hold it.

**Value shapes.** Option `value` is machine-comparable and the label is display only.

| Shape | Questions | Meaning |
|---|---|---|
| number | `umbrella_limit`, `home_liability`, `umbrella_min_home` | whole dollars |
| split limit `{ perPerson, perAccident }` | `auto_liability`, `umbrella_min_auto`, `motorcycle_liability`, `umbrella_min_motorcycle`, `boat_liability`, `umbrella_min_boat`, `auto_um_uim_limit` | whole dollars; "below" a requirement means `perPerson` or `perAccident` is lower, "above" means either is higher |
| band `{ min, max }` | `umbrella_exposure`, `auto_value`, `deductible_auto`, `deductible_home`, `deductible_health`, `emergency_cushion` | whole dollars, both ends inclusive, `max: null` is open ended; the bands of one question start at 0, touch and never overlap |

A user's own limit can be "lower than the lowest tier", because finding a limit that is too low is the point of the tool (DECISIONS S5-13). The first rung (id `lower`) of `auto_liability`, `motorcycle_liability`, `boat_liability` and `auto_um_uim_limit` is "Lower than 100/300" and carries the largest limit it can mean, `{ perPerson: 99999, perAccident: 299999 }`; the first rung of `home_liability` is "Lower than $300,000" and carries `299999`. So "certainly below X" is always "value < X", and a `lower` answer is below every minimum the umbrella questions offer: it is a known limit (not Not sure), so a Raise can fire on it. The umbrella-minimum questions (`umbrella_min_auto`, `umbrella_min_home`, `umbrella_min_motorcycle`, `umbrella_min_boat`) have no `lower` rung.

**Comparing conservatively.** Never compare a band with a single guess; compare edges.

```js
const certainlyBelow = (a, b) => a.max !== null && a.max < b.min;      // every dollar in a is under every dollar in b
const deductibleExceedsCushion = (d, c) => c.max !== null && d.min > c.max;  // 5000_plus cushion never flags
const umbrellaNotLargerThanExposure = (umbrellaDollars, exposure) => umbrellaDollars <= exposure.min;
```

**Wording.** Plain, second person, jargon defined in a clause, state-neutral ("your state's department of insurance", never a state name, never a count of states), no "home equity", no em dashes. Where research found no authoritative support, the flag is worded as a question and the "Wording" line of its block says exactly what must not be asserted. Every flag cites only the source ids listed for it (each is a source of one of its listed facts) and never writes a URL.

**Cards (DECISIONS D14).** The credit-card table is empty until the deferred card work is done (OPEN-ITEMS S16-7). The `cards` question offers 12 intended cards as static choices (`CARD_CHOICES`, `questions/cards.mjs`); `ctx.cards()` is `[]` for them today. S11 builds and tests card-aware wording against fixture cards and stays generic with the real, empty table.

## 2. Sections

The wizard groups questions into sections, one screen each, in this order. `SECTIONS` in `questions/index.mjs` also holds each section's `title`, `reason` (tied to what the user already told us) and `showIf`. A section shows exactly when at least one of its questions is visible; the test checks that for all 8,192 combinations of the thirteen Q1 ticks.

<!-- section-table:start -->
| Section | Questions | Title | Shown when |
|---|---|---|---|
| `start` | 1 | Your policies | always |
| `umbrella_stack` | 5 | What sits under your umbrella | holds `umbrella` |
| `umbrella_vehicles` | 4 | Your motorcycle or boat under the umbrella | holds `umbrella` and (holds `motorcycle` or holds `boat`) |
| `umbrella_scope` | 3 | What your umbrella covers | holds `umbrella` |
| `auto_gaps` | 7 | A closer look at your auto policy | holds `auto` |
| `renters` | 2 | Your renters policy | holds `renters` |
| `health` | 4 | Your health insurance and the extras around it | holds `health` |
| `home_exclusions` | 2 | What your home policy leaves out | holds `home` |
| `deductible` | 4 | What you would pay first | holds `auto` or holds `home` or holds `health` |
| `cards` | 2 | Your credit cards | holds `rental_car` or holds `towing` or holds `travel` or holds `phone` or holds `warranty` |
| `extras_detail` | 4 | A little more about your extras | holds `phone` or holds `towing` or holds `accidental_death` |
<!-- section-table:end -->

## 3. Questions

Display order. "Option ids" lists every id including `not_sure` where the question allows it. "Shown when" is the full gate. "Read by" lists the planned flags (section 4) that read the question.

<!-- question-table:start -->
| Question | Section | Type | Option ids | Shown when | Read by |
|---|---|---|---|---|---|
| `policies` | `start` | multi | `auto`, `home`, `renters`, `umbrella`, `health`, `motorcycle`, `boat`, `rental_car`, `towing`, `travel`, `phone`, `warranty`, `accidental_death`, `none` | always | `umbrella-home-below-required-min`, `umbrella-auto-below-required-min`, `umbrella-primary-liability-overbought`, `umbrella-limits-unconfirmed`, `umbrella-motorcycle-below-required-min`, `umbrella-boat-below-required-min`, `umbrella-smaller-than-exposure`, `umbrella-size-unconfirmed`, `umbrella-um-uim-extension`, `umbrella-scope-exclusions`, `auto-um-uim-check`, `auto-gap-coverage-missing`, `auto-gap-coverage-confirm`, `auto-rental-reimbursement-check`, `auto-collision-older-car`, `home-sewer-backup-missing`, `home-flood-no-separate-policy`, `renters-child-vs-parents-home`, `health-auto-medpay-overlap`, `health-supplemental-boltons`, `health-hsa-nudge`, `health-short-term-plan-alongside`, `deductible-exceeds-cushion-auto`, `deductible-exceeds-cushion-home`, `deductible-exceeds-cushion-health`, `other-rental-car-waiver`, `other-towing-roadside-duplicate`, `other-vehicle-towing-check`, `other-travel-insurance-overlap`, `other-phone-insurance-card`, `other-extended-warranty-overlap`, `other-add-on-term-life` |
| `umbrella_limit` | `umbrella_stack` | single | `1m`, `2m`, `5m`, `not_sure` | holds `umbrella` | `umbrella-smaller-than-exposure`, `umbrella-size-unconfirmed` |
| `auto_liability` | `umbrella_stack` | single | `lower`, `100_300`, `250_500`, `500_500`, `not_sure` | holds `umbrella` and holds `auto` | `umbrella-auto-below-required-min`, `umbrella-primary-liability-overbought`, `umbrella-limits-unconfirmed` |
| `umbrella_min_auto` | `umbrella_stack` | single | `100_300`, `250_500`, `500_500`, `not_sure` | holds `umbrella` and holds `auto` | `umbrella-auto-below-required-min`, `umbrella-primary-liability-overbought`, `umbrella-limits-unconfirmed` |
| `home_liability` | `umbrella_stack` | single | `lower`, `300k`, `500k`, `1m`, `not_sure` | holds `umbrella` and holds `home` | `umbrella-home-below-required-min`, `umbrella-primary-liability-overbought`, `umbrella-limits-unconfirmed` |
| `umbrella_min_home` | `umbrella_stack` | single | `300k`, `500k`, `not_sure` | holds `umbrella` and holds `home` | `umbrella-home-below-required-min`, `umbrella-primary-liability-overbought`, `umbrella-limits-unconfirmed` |
| `motorcycle_liability` | `umbrella_vehicles` | single | `lower`, `100_300`, `250_500`, `500_500`, `not_sure` | holds `umbrella` and holds `motorcycle` | `umbrella-limits-unconfirmed`, `umbrella-motorcycle-below-required-min` |
| `umbrella_min_motorcycle` | `umbrella_vehicles` | single | `100_300`, `250_500`, `500_500`, `not_sure` | holds `umbrella` and holds `motorcycle` | `umbrella-limits-unconfirmed`, `umbrella-motorcycle-below-required-min` |
| `boat_liability` | `umbrella_vehicles` | single | `lower`, `100_300`, `250_500`, `500_500`, `not_sure` | holds `umbrella` and holds `boat` | `umbrella-limits-unconfirmed`, `umbrella-boat-below-required-min` |
| `umbrella_min_boat` | `umbrella_vehicles` | single | `100_300`, `250_500`, `500_500`, `not_sure` | holds `umbrella` and holds `boat` | `umbrella-limits-unconfirmed`, `umbrella-boat-below-required-min` |
| `umbrella_exposure` | `umbrella_scope` | single | `under_1m`, `1m_3m`, `over_3m`, `not_sure` | holds `umbrella` | `umbrella-smaller-than-exposure`, `umbrella-size-unconfirmed` |
| `umbrella_um_uim` | `umbrella_scope` | single | `yes`, `no`, `not_sure` | holds `umbrella` and holds `auto` | `umbrella-um-uim-extension` |
| `side_business` | `umbrella_scope` | single | `yes`, `no` | holds `umbrella` | `umbrella-scope-exclusions` |
| `auto_financing` | `auto_gaps` | single | `lease`, `loan`, `paid_off` | holds `auto` | `auto-gap-coverage-missing`, `auto-gap-coverage-confirm`, `auto-collision-older-car` |
| `auto_value` | `auto_gaps` | single | `under_3000`, `3000_9999`, `10000_24999`, `25000_plus`, `not_sure` | holds `auto` | `auto-gap-coverage-missing`, `auto-gap-coverage-confirm`, `auto-collision-older-car` |
| `auto_gap_coverage` | `auto_gaps` | single | `yes`, `no`, `not_sure` | holds `auto` and `auto_financing` is `loan` or `lease` | `auto-gap-coverage-missing`, `auto-gap-coverage-confirm` |
| `auto_collision` | `auto_gaps` | single | `yes`, `no`, `not_sure` | holds `auto` and `auto_financing` is `paid_off` and `auto_value` is `under_3000` | `auto-collision-older-car`, `deductible-exceeds-cushion-auto`, `other-rental-car-waiver` |
| `auto_um_uim` | `auto_gaps` | single | `yes`, `no`, `not_sure` | holds `auto` | `auto-um-uim-check` |
| `auto_um_uim_limit` | `auto_gaps` | single | `lower`, `100_300`, `250_500`, `500_500`, `not_sure` | holds `auto` and `auto_um_uim` is `yes` | `auto-um-uim-check` |
| `auto_rental_reimbursement` | `auto_gaps` | single | `yes`, `no`, `not_sure` | holds `auto` | `auto-rental-reimbursement-check` |
| `renters_for` | `renters` | single | `me`, `child_away` | holds `renters` | `renters-child-vs-parents-home` |
| `renters_child_housing` | `renters` | single | `dorm`, `off_campus`, `not_sure` | holds `home` and `renters_for` is `child_away` | `renters-child-vs-parents-home` |
| `auto_medpay` | `health` | single | `yes`, `no`, `not_sure` | holds `health` and holds `auto` | `health-auto-medpay-overlap` |
| `health_hsa` | `health` | single | `hdhp_hsa`, `hdhp_only`, `neither`, `not_sure` | holds `health` | `health-hsa-nudge` |
| `health_supplemental` | `health` | multi | `accident`, `critical_illness`, `hospital_indemnity`, `cancer`, `none`, `not_sure` | holds `health` | `health-supplemental-boltons` |
| `health_short_term` | `health` | single | `yes`, `no`, `not_sure` | holds `health` | `health-short-term-plan-alongside` |
| `home_sewer_backup` | `home_exclusions` | single | `yes`, `no`, `not_sure` | holds `home` | `home-sewer-backup-missing` |
| `home_flood_policy` | `home_exclusions` | single | `yes`, `no`, `not_sure` | holds `home` | `home-flood-no-separate-policy` |
| `deductible_auto` | `deductible` | single | `under_1000`, `1000_4999`, `5000_plus`, `not_sure` | holds `auto` | `deductible-exceeds-cushion-auto` |
| `deductible_home` | `deductible` | single | `under_1000`, `1000_4999`, `5000_plus`, `not_sure` | holds `home` | `deductible-exceeds-cushion-home` |
| `deductible_health` | `deductible` | single | `under_1000`, `1000_4999`, `5000_plus`, `not_sure` | holds `health` | `deductible-exceeds-cushion-health` |
| `emergency_cushion` | `deductible` | single | `under_1000`, `1000_4999`, `5000_plus`, `not_sure` | holds `auto` or holds `home` or holds `health` | `health-supplemental-boltons`, `deductible-exceeds-cushion-auto`, `deductible-exceeds-cushion-home`, `deductible-exceeds-cushion-health` |
| `cards` | `cards` | multi | `chase_sapphire_preferred`, `chase_sapphire_reserve`, `chase_freedom_unlimited`, `chase_freedom_flex`, `amex_platinum`, `amex_gold`, `amex_blue_cash_preferred`, `amex_blue_cash_everyday`, `citi_double_cash`, `wells_fargo_active_cash`, `capital_one_venture_x`, `capital_one_venture`, `other_none` | holds `rental_car` or holds `towing` or holds `travel` or holds `phone` or holds `warranty` | `other-rental-car-waiver`, `other-towing-roadside-duplicate`, `other-travel-insurance-overlap`, `other-phone-insurance-card`, `other-extended-warranty-overlap` |
| `card_usual_payment` | `cards` | single | `yes`, `no`, `not_sure` | `cards` is answered and not (`cards` includes `other_none`) | `other-rental-car-waiver`, `other-travel-insurance-overlap`, `other-extended-warranty-overlap` |
| `phone_bill_on_card` | `extras_detail` | single | `yes`, `no`, `not_sure` | holds `phone` | `other-phone-insurance-card` |
| `roadside_sources` | `extras_detail` | multi | `auto_policy`, `club`, `card`, `car_maker`, `other`, `not_sure` | holds `towing` | `other-towing-roadside-duplicate`, `other-vehicle-towing-check` |
| `towing_vehicle_policy` | `extras_detail` | single | `yes`, `no`, `not_sure` | holds `towing` and (holds `motorcycle` or holds `boat`) | `other-vehicle-towing-check` |
| `term_life` | `extras_detail` | single | `own`, `work_only`, `none`, `not_sure` | holds `accidental_death` | `other-add-on-term-life` |
<!-- question-table:end -->

Notes on the questions that need them:

- `umbrella_min_auto`, `umbrella_min_motorcycle`, `umbrella_min_boat` are additions to the SPEC's home minimum so every underlying limit has a requirement to be compared against (DECISIONS S5-2). Each insurer sets its own, so Not sure is expected.
- `auto_*` gate questions are about the user's newest car (DECISIONS S5-4). `auto_collision` is asked only for a paid-off car worth under $3,000; `auto_gap_coverage` only for a loan or lease.
- `renters_child_housing`, `auto_medpay`, `health_hsa`'s middle option and `card_usual_payment` go beyond the brief's list and are justified in DECISIONS S5-6.
- Renters in Q1 also covers a renters policy a homeowner pays for so a child at college has coverage, so a parent who owns their home reaches `renters_for`, the SPEC's headline Renters + Homeowners case, by ticking Home and Renters (DECISIONS S5-15, R1-4). A flag about that case reads `ctx.holds('home')` and `renters_for`; `renters_for` is visible exactly when Renters is ticked.
- Not covered: a student's own renters policy against their parents' home policy (a student who rents and answers `me` is not asked about their parents). See OPEN-ITEMS S5-5.
- Not asked on purpose: a renters liability limit, RV/ATV/jet ski (DECISIONS D11), a third property-damage number, premiums, anything Q1 already asks.

## 4. Planned flags

32 flags. `Bucket` is the flag's declared (usual) bucket: `other-rental-car-waiver`, `other-travel-insurance-overlap` and `other-extended-warranty-overlap` are declared `drop` and are filed as a Question when nothing already covers the same thing (`alternateBuckets`, DECISIONS S12-9; the machine-checked table below keeps the declared bucket). `Questions read` are asked questions; `Policies held` are policy ids read with `ctx.holds` (ticked in Q1). `Status` `conditional` means the flag cannot ship until its condition (in its block) is met. Priorities are unique across the plan and lower sorts first inside a bucket.

<!-- flag-table:start -->
| Flag | Story | File | Bucket | Kind | Domain | Priority | Status | Questions read | Policies held |
|---|---|---|---|---|---|---|---|---|---|
| `umbrella-home-below-required-min` | S6 | `umbrella` | raise | cross-policy | umbrella | 10 | planned | `policies`, `home_liability`, `umbrella_min_home` | `umbrella`, `home` |
| `umbrella-auto-below-required-min` | S6 | `umbrella` | raise | cross-policy | umbrella | 20 | planned | `policies`, `auto_liability`, `umbrella_min_auto` | `umbrella`, `auto` |
| `umbrella-primary-liability-overbought` | S6 | `umbrella` | question | cross-policy | umbrella | 50 | planned | `policies`, `auto_liability`, `umbrella_min_auto`, `home_liability`, `umbrella_min_home` | `umbrella` |
| `umbrella-limits-unconfirmed` | S6 | `umbrella` | question | cross-policy | umbrella | 60 | planned | `policies`, `auto_liability`, `umbrella_min_auto`, `home_liability`, `umbrella_min_home`, `motorcycle_liability`, `umbrella_min_motorcycle`, `boat_liability`, `umbrella_min_boat` | `umbrella` |
| `umbrella-motorcycle-below-required-min` | S6 | `vehicles` | raise | cross-policy | vehicles | 30 | planned | `policies`, `motorcycle_liability`, `umbrella_min_motorcycle` | `umbrella`, `motorcycle` |
| `umbrella-boat-below-required-min` | S6 | `vehicles` | raise | cross-policy | vehicles | 40 | planned | `policies`, `boat_liability`, `umbrella_min_boat` | `umbrella`, `boat` |
| `umbrella-smaller-than-exposure` | S7 | `umbrellaScope` | raise | cross-policy | umbrella | 110 | planned | `policies`, `umbrella_limit`, `umbrella_exposure` | `umbrella` |
| `umbrella-size-unconfirmed` | S7 | `umbrellaScope` | question | education | umbrella | 120 | planned | `policies`, `umbrella_limit`, `umbrella_exposure` | `umbrella` |
| `umbrella-um-uim-extension` | S7 | `umbrellaScope` | question | within-policy | umbrella | 130 | planned | `policies`, `umbrella_um_uim` | `umbrella`, `auto` |
| `umbrella-scope-exclusions` | S7 | `umbrellaScope` | question | within-policy | umbrella | 140 | planned | `policies`, `side_business` | `umbrella` |
| `auto-um-uim-check` | S8 | `auto` | question | within-policy | auto | 210 | planned | `policies`, `auto_um_uim`, `auto_um_uim_limit` | `auto` |
| `auto-gap-coverage-missing` | S8 | `auto` | raise | within-policy | auto | 220 | planned | `policies`, `auto_financing`, `auto_value`, `auto_gap_coverage` | `auto` |
| `auto-gap-coverage-confirm` | S8 | `auto` | question | within-policy | auto | 230 | planned | `policies`, `auto_financing`, `auto_value`, `auto_gap_coverage` | `auto` |
| `auto-rental-reimbursement-check` | S8 | `auto` | question | within-policy | auto | 240 | planned | `policies`, `auto_rental_reimbursement` | `auto` |
| `auto-collision-older-car` | S8 | `auto` | drop | within-policy | auto | 250 | planned | `policies`, `auto_financing`, `auto_value`, `auto_collision` | `auto` |
| `home-sewer-backup-missing` | S9 | `home` | question | within-policy | home | 310 | planned | `policies`, `home_sewer_backup` | `home` |
| `home-flood-no-separate-policy` | S9 | `home` | question | within-policy | home | 320 | planned | `policies`, `home_flood_policy` | `home` |
| `renters-child-vs-parents-home` | S9 | `renters` | question | cross-policy | renters | 330 | planned | `policies`, `renters_for`, `renters_child_housing` | `home` |
| `health-auto-medpay-overlap` | S10 | `health` | question | cross-policy | health | 410 | planned | `policies`, `auto_medpay` | `health`, `auto` |
| `health-supplemental-boltons` | S10 | `health` | question | cross-policy | health | 420 | planned | `policies`, `health_supplemental`, `emergency_cushion` | `health` |
| `health-hsa-nudge` | S10 | `health` | question | education | health | 430 | planned | `policies`, `health_hsa` | `health` |
| `health-short-term-plan-alongside` | S10 | `health` | question | cross-policy | health | 440 | planned | `policies`, `health_short_term` | `health` |
| `deductible-exceeds-cushion-auto` | S10 | `deductible` | question | cross-policy | deductible | 450 | planned | `policies`, `deductible_auto`, `emergency_cushion`, `auto_collision` | `auto` |
| `deductible-exceeds-cushion-home` | S10 | `deductible` | question | cross-policy | deductible | 460 | planned | `policies`, `deductible_home`, `emergency_cushion` | `home` |
| `deductible-exceeds-cushion-health` | S10 | `deductible` | question | cross-policy | deductible | 470 | planned | `policies`, `deductible_health`, `emergency_cushion` | `health` |
| `other-rental-car-waiver` | S11 | `other` | drop | cross-policy | other | 510 | planned | `policies`, `cards`, `card_usual_payment`, `auto_collision` | `rental_car`, `auto` |
| `other-towing-roadside-duplicate` | S11 | `other` | drop | cross-policy | other | 520 | planned | `policies`, `roadside_sources`, `cards` | `towing` |
| `other-vehicle-towing-check` | S11 | `other` | question | cross-policy | other | 530 | planned | `policies`, `towing_vehicle_policy`, `roadside_sources` | `towing`, `motorcycle`, `boat` |
| `other-travel-insurance-overlap` | S11 | `other` | drop | cross-policy | other | 540 | planned | `policies`, `cards`, `card_usual_payment` | `travel` |
| `other-phone-insurance-card` | S11 | `other` | question | cross-policy | other | 550 | planned | `policies`, `phone_bill_on_card`, `cards` | `phone`, `home`, `renters` |
| `other-extended-warranty-overlap` | S11 | `other` | drop | cross-policy | other | 560 | planned | `policies`, `cards`, `card_usual_payment` | `warranty` |
| `other-add-on-term-life` | S11 | `other` | question | cross-policy | other | 570 | planned | `policies`, `term_life` | `accidental_death`, `travel` |
<!-- flag-table:end -->

### Ownership

| Story | Priority range | Flag files it owns | Also owns |
|---|---|---|---|
| S6 | 0 to 99 | `flags/umbrella.mjs`, `flags/vehicles.mjs` | `engine/liabilityStack.mjs` |
| S7 | 100 to 199 | `flags/umbrellaScope.mjs` | |
| S8 | 200 to 299 | `flags/auto.mjs` | |
| S9 | 300 to 399 | `flags/home.mjs`, `flags/renters.mjs` | |
| S10 | 400 to 499 | `flags/health.mjs`, `flags/deductible.mjs` | |
| S11 | 500 to 599 | `flags/other.mjs` | |

Only the owning story edits its files. Each flag story may add flags beyond this plan (inside its range), may split or merge planned flags if it logs why in its own DECISIONS entry (`S6-1`, `S7-1`, ...), and must keep every flag sourced. If a story needs an answer this catalog does not collect, it logs the need in `docs/OPEN-ITEMS.md` rather than editing `questions/`.

## 5. Flag details

Each block repeats the machine-checked fields. "Wording" is binding: it records what the research could not support.

### S6 Umbrella core and other vehicles (`flags/umbrella.mjs`, `flags/vehicles.mjs`, `engine/liabilityStack.mjs`)

#### `umbrella-home-below-required-min`

- Bucket and kind: raise, cross-policy (domain umbrella, priority 10, file `umbrella`, planned)
- Reads: questions `policies`, `home_liability`, `umbrella_min_home`; policies `umbrella`, `home`
- Trigger: Fires when both answers are known and the home liability limit is below the umbrella's required home minimum (for example 300,000 against a 500,000 minimum, or "Lower than $300,000" against any minimum); if either is Not sure it does not fire and umbrella-limits-unconfirmed covers it.
- Facts: `umbrella-attaches-after-underlying-exhausted`, `umbrella-underlying-minimums-typical`, `umbrella-underlying-requirements-insurer-specific`, `home-liability-typical-amounts`
- Sources: `iii-should-i-purchase-umbrella`, `iii-what-is-umbrella-liability-policy`, `iii-homebuyers-handbook`
- Wording: No authoritative source says what happens when an underlying limit is below the umbrella requirement (DECISIONS S3a-umbrella-1). Word it as: ask whether the umbrella still responds as expected and raise the limit to the umbrella's stated requirement. Never say a shortfall voids the umbrella.

#### `umbrella-auto-below-required-min`

- Bucket and kind: raise, cross-policy (domain umbrella, priority 20, file `umbrella`, planned)
- Reads: questions `policies`, `auto_liability`, `umbrella_min_auto`; policies `umbrella`, `auto`
- Trigger: Fires when both answers are known and the auto liability limit is below the umbrella's required auto minimum (for example 100/300 against 250/500, or "Lower than 100/300" against any minimum); if either is Not sure it does not fire and umbrella-limits-unconfirmed covers it.
- Facts: `umbrella-underlying-minimums-typical`, `umbrella-underlying-requirements-insurer-specific`, `auto-liability-limit-format`, `auto-state-minimums-vary`
- Sources: `iii-should-i-purchase-umbrella`, `iii-what-is-umbrella-liability-policy`, `naic-auto-shopping-tool`
- Wording: Same consequence gap as the home flag (S3a-umbrella-1). Triple-I's about 250,000 auto figure has no stated format (per person, split or combined), so it is context only and never a rule; requirements are insurer-specific.

#### `umbrella-primary-liability-overbought`

- Bucket and kind: question, cross-policy (domain umbrella, priority 50, file `umbrella`, planned)
- Reads: questions `policies`, `auto_liability`, `umbrella_min_auto`, `home_liability`, `umbrella_min_home`; policies `umbrella`
- Trigger: Fires when a known auto or home liability limit is above the umbrella's known required minimum (for example 500/500 against 250/500, or 1 million against 500,000); asks whether the extra primary liability is worth its premium; never fires on Not sure.
- Facts: `higher-underlying-limits-lower-umbrella-cost`, `umbrella-underlying-minimums-typical`
- Sources: `iii-homebuyers-handbook`, `iii-should-i-purchase-umbrella`
- Wording: Nothing authoritative supports cutting primary liability once an umbrella exists, and more underlying liability makes the umbrella cheaper (S3a-umbrella gap 7). This is a Question, never a Drop.

#### `umbrella-limits-unconfirmed`

- Bucket and kind: question, cross-policy (domain umbrella, priority 60, file `umbrella`, planned)
- Reads: questions `policies`, `auto_liability`, `umbrella_min_auto`, `home_liability`, `umbrella_min_home`, `motorcycle_liability`, `umbrella_min_motorcycle`, `boat_liability`, `umbrella_min_boat`; policies `umbrella`
- Trigger: Fires when the user holds an umbrella and any visible limit or required-minimum question in the stack is Not sure, so a Raise could not be decided; asks them to get the umbrella's required-underlying schedule from their agent.
- Facts: `umbrella-underlying-requirements-insurer-specific`, `umbrella-attaches-after-underlying-exhausted`
- Sources: `iii-should-i-purchase-umbrella`, `iii-homebuyers-handbook`
- Wording: Requirements are insurer-specific, so Not sure is a legitimate answer (research designInput underlyingRequirementsAreInsurerSpecific). Do not guess a requirement for the user. When the user's own limit is "Lower than" the lowest tier and the minimum is Not sure, say so plainly: a limit that low is the likeliest gap, and the umbrella's requirement is the one thing to confirm with the agent.

#### `umbrella-motorcycle-below-required-min`

- Bucket and kind: raise, cross-policy (domain vehicles, priority 30, file `vehicles`, planned)
- Reads: questions `policies`, `motorcycle_liability`, `umbrella_min_motorcycle`; policies `umbrella`, `motorcycle`
- Trigger: Fires when both answers are known and the motorcycle liability limit is below the umbrella's required motorcycle minimum (a "Lower than 100/300" limit is below every minimum offered); if either is Not sure it does not fire and umbrella-limits-unconfirmed covers it.
- Facts: `specialty-vehicles-need-their-own-policies`, `umbrella-underlying-requirements-insurer-specific`
- Sources: `naic-what-does-auto-insurance-cover`, `iii-motorcycle-insurance`, `iii-should-i-purchase-umbrella`
- Wording: No authoritative source gives required underlying limits for motorcycles (S3a-umbrella gap 5). Phrase it as asking what the umbrella requires for the motorcycle, with the typical home and auto figures as context only.

#### `umbrella-boat-below-required-min`

- Bucket and kind: raise, cross-policy (domain vehicles, priority 40, file `vehicles`, planned)
- Reads: questions `policies`, `boat_liability`, `umbrella_min_boat`; policies `umbrella`, `boat`
- Trigger: Fires when both answers are known and the boat liability limit is below the umbrella's required boat minimum (a "Lower than 100/300" limit is below every minimum offered); if either is Not sure it does not fire and umbrella-limits-unconfirmed covers it.
- Facts: `boats-need-own-liability-and-sit-under-umbrella`, `umbrella-underlying-requirements-insurer-specific`
- Sources: `iii-boat-insurance-and-safety`, `naic-summer-safety-insured`, `iii-should-i-purchase-umbrella`
- Wording: No authoritative source gives required underlying limits for boats (S3a-umbrella gap 5); ask what the umbrella requires. The sourced part is that boats need their own liability coverage and the umbrella sits above it.

### S7 Umbrella scope and adequacy (`flags/umbrellaScope.mjs`)

#### `umbrella-smaller-than-exposure`

- Bucket and kind: raise, cross-policy (domain umbrella, priority 110, file `umbrellaScope`, planned)
- Reads: questions `policies`, `umbrella_limit`, `umbrella_exposure`; policies `umbrella`
- Trigger: Fires when both are answered and the umbrella amount is at or below the lower edge of the exposure band (umbrella value <= exposure min), so 1 million against 1 to 3 million or over 3 million fires and 2 million against 1 to 3 million does not (S7 may refine the edge rule in its own DECISIONS entry); if either is Not sure it does not fire and umbrella-size-unconfirmed covers it.
- Facts: `umbrella-sizing-by-assets`, `lawsuit-exposure-factors`, `umbrella-typical-limit-1m-or-more`
- Sources: `iii-homebuyers-handbook`, `iii-should-i-purchase-umbrella`, `naic-homeowners-shopping-tool`
- Wording: The bands have no numeric authority (S3a-umbrella-5); the only sourced test is Triple-I's qualitative one (do your assets exceed your liability limits). Call the band a rough guide, never print or ask for a figure, and never state a multiple of net worth.

#### `umbrella-size-unconfirmed`

- Bucket and kind: question, education (domain umbrella, priority 120, file `umbrellaScope`, planned)
- Reads: questions `policies`, `umbrella_limit`, `umbrella_exposure`; policies `umbrella`
- Trigger: Fires when the user holds an umbrella and either the umbrella amount or the exposure band is Not sure: suggests the asset test (do your savings, investments and property add up to more than your liability limits) and asking the agent.
- Facts: `umbrella-sizing-by-assets`, `lawsuit-exposure-factors`
- Sources: `iii-homebuyers-handbook`, `iii-should-i-purchase-umbrella`
- Wording: Which assets a judgment could reach is unsourced (S3a-umbrella gap 12); do not say retirement accounts are safe or home value is reachable.

#### `umbrella-um-uim-extension`

- Bucket and kind: question, within-policy (domain umbrella, priority 130, file `umbrellaScope`, planned)
- Reads: questions `policies`, `umbrella_um_uim`; policies `umbrella`, `auto`
- Trigger: Fires when umbrella_um_uim is no (ask whether it can be added) or Not sure (ask whether the umbrella extends uninsured and underinsured motorist coverage); silent on yes.
- Facts: `um-uim-is-auto-policy-coverage`, `umbrella-is-liability-only`
- Sources: `naic-auto-shopping-tool`, `iii-protect-yourself-uninsured-motorists`, `naic-what-does-auto-insurance-cover`, `naic-whats-umbrella-policy`, `iii-what-is-umbrella-liability-policy`
- Wording: No authoritative source says whether umbrellas include UM/UIM by default or by endorsement (S3a-umbrella-2). Ask; never say umbrellas exclude it by default or that an endorsement exists. Requirements vary by state: name no state.

#### `umbrella-scope-exclusions`

- Bucket and kind: question, within-policy (domain umbrella, priority 140, file `umbrellaScope`, planned)
- Reads: questions `policies`, `side_business`; policies `umbrella`
- Trigger: Fires for everyone who holds an umbrella (ask what it excludes); emphasis is strong when side_business is yes. The question has no Not sure option.
- Facts: `umbrella-business-activity-excluded`, `umbrella-not-own-property-or-punitive`, `umbrella-intentional-acts-excluded`, `umbrella-personal-injury-coverage-varies`
- Sources: `iii-business-vehicle-insurance`, `iii-insuring-home-business`, `naic-jir-social-media-underwriting`, `naic-whats-umbrella-policy`, `iii-what-is-umbrella-liability-policy`
- Wording: Contractual liability as an exclusion is unsourced (S3a-umbrella gap 4); leave it out. The intentional-acts exclusion is sourced only for the personal-injury part. Ask what the umbrella excludes rather than diagnosing.

### S8 Auto coverage gaps (`flags/auto.mjs`)

#### `auto-um-uim-check`

- Bucket and kind: question, within-policy (domain auto, priority 210, file `auto`, planned)
- Reads: questions `policies`, `auto_um_uim`, `auto_um_uim_limit`; policies `auto`
- Trigger: Fires when auto_um_uim is no or Not sure, or when it is yes and auto_um_uim_limit is lower than 100/300 or Not sure; silent for yes with 100/300 or higher.
- Facts: `um-uim-what-they-pay`, `um-uim-requirements-vary-by-state`, `uninsured-share-latest-irc`, `um-property-damage-separate`
- Sources: `naic-consumers-guide-auto-2022`, `naic-shopping-tool-auto-2023`, `iii-protect-yourself-uninsured-motorists`, `irc-2025-one-in-three-uninsured-underinsured`, `iii-compulsory-auto-uninsured-motorists`, `naic-uninsured-motorists`
- Wording: Cite the dated Insurance Research Council figure (about 15% of drivers uninsured in 2023), never "one in eight" (S3a-auto-1). Say requirements and minimums vary by state and name none (S3a-auto-2). No sourced limit tiers: the 100/300 rung is a product preset (S3a-auto-5).

#### `auto-gap-coverage-missing`

- Bucket and kind: raise, within-policy (domain auto, priority 220, file `auto`, planned)
- Reads: questions `policies`, `auto_financing`, `auto_value`, `auto_gap_coverage`; policies `auto`
- Trigger: Fires when the newest car is leased or financed, auto_gap_coverage is no, and auto_value is not under_3000 (a Not sure value still fires); never fires for an owned-outright car; a Not sure gap answer is handled by auto-gap-coverage-confirm.
- Facts: `gap-what-it-covers`, `gap-when-it-matters`, `gap-lease-and-lender-requirements`, `gap-where-to-buy-and-cautions`
- Sources: `iii-what-is-gap-insurance`, `cfpb-what-is-gap-insurance`, `cfpb-gap-required-by-lender`, `naic-shopping-tool-auto-2023`
- Wording: Never say a lender requires gap on a loan (it is usually required only on a lease or when the contract says so). No gap price is sourced. A lease usually builds gap into the payments, so a lease plus "no" is a reason to check the lease paperwork.

#### `auto-gap-coverage-confirm`

- Bucket and kind: question, within-policy (domain auto, priority 230, file `auto`, planned)
- Reads: questions `policies`, `auto_financing`, `auto_value`, `auto_gap_coverage`; policies `auto`
- Trigger: Fires when the newest car is leased or financed, auto_value is not under_3000, and auto_gap_coverage is Not sure: ask the lender, dealer, lease paperwork or agent whether gap coverage is in place.
- Facts: `gap-what-it-covers`, `gap-when-it-matters`, `gap-lease-and-lender-requirements`
- Sources: `iii-what-is-gap-insurance`, `cfpb-what-is-gap-insurance`, `cfpb-gap-required-by-lender`
- Wording: Same limits as auto-gap-coverage-missing; this one only asks.

#### `auto-rental-reimbursement-check`

- Bucket and kind: question, within-policy (domain auto, priority 240, file `auto`, planned)
- Reads: questions `policies`, `auto_rental_reimbursement`; policies `auto`
- Trigger: Fires for every answer with text by answer: yes (check the daily and total caps), no (ask whether it is worth adding), Not sure (ask whether you have it and what the caps are).
- Facts: `rental-reimbursement-what-it-pays`, `rental-reimbursement-limit-example`, `optional-coverages-priced-separately`
- Sources: `naic-shopping-tool-auto-2023`, `naic-what-does-auto-insurance-cover`, `naic-consumer-insight-right-protection`, `naic-consumers-guide-auto-2022`
- Wording: NAIC's $20 a day, $600 total example is an illustration, not a typical limit (S3a-auto-5): say so or leave it out.

#### `auto-collision-older-car`

- Bucket and kind: drop, within-policy (domain auto, priority 250, file `auto`, planned)
- Reads: questions `policies`, `auto_financing`, `auto_value`, `auto_collision`; policies `auto`
- Trigger: Fires when the newest car is owned outright, auto_value is under_3000 and auto_collision is yes; a Not sure collision answer produces no flag (it cannot support a Drop).
- Facts: `collision-comp-ten-times-premium-rule`, `collision-comp-pays-market-value-only`, `collision-comp-lender-requirement`, `collision-comp-drop-loss-caution`, `deductible-trade-off-alternative`, `dropping-collision-comp-affects-rental-coverage`
- Sources: `iii-nine-ways-lower-auto-costs`, `naic-consumers-guide-auto-2022`, `naic-shopping-tool-auto-2023`, `iii-how-much-auto-coverage`, `naic-consumer-insight-right-protection`, `iii-collision-comprehensive`, `iii-rental-car-insurance`
- Wording: No sourced vehicle-age trigger (S3a-auto gap 7); the only sourced test is "worth less than ten times the premium", and we do not ask the premium, so tell the user to apply it with their agent. Mention the option of a higher deductible instead, and that dropping collision and comprehensive may leave a rental car unprotected.

### S9 Home exclusions and renters (`flags/home.mjs`, `flags/renters.mjs`)

#### `home-sewer-backup-missing`

- Bucket and kind: question, within-policy (domain home, priority 310, file `home`, planned)
- Reads: questions `policies`, `home_sewer_backup`; policies `home`
- Trigger: Fires when home_sewer_backup is no or Not sure (DECISIONS D8); silent for yes so informed users are not nagged.
- Facts: `water-backup-excluded-standard`, `water-backup-policies-vary`, `water-backup-add-by-endorsement`, `water-backup-flood-policy-nuance`, `sump-pump-overflow-mold-excluded`
- Sources: `iii-disasters-covered-homeowners`, `iii-water-damage-protection`, `iii-sewer-backups`, `naic-homeowners-topic`, `naic-endorsement-rider`, `floodsmart-home`, `naic-homeowners-shopping-tips`
- Wording: No price or typical limit is sourced (S3a-7): "nominal cost" at most, and ask about the limit. A flood policy is not a substitute for backup coverage. Name no state.

#### `home-flood-no-separate-policy`

- Bucket and kind: question, within-policy (domain home, priority 320, file `home`, planned)
- Reads: questions `policies`, `home_flood_policy`; policies `home`
- Trigger: Fires when home_flood_policy is no or Not sure (DECISIONS D8); silent for yes.
- Facts: `flood-excluded-homeowners`, `flood-nfip-and-private`, `flood-waiting-period`, `flood-claims-outside-high-risk`
- Sources: `iii-flood-insurance`, `naic-flood-insurance`, `floodsmart-home`, `fema-nfip-waiting-period`, `floodsmart-flood-risk`, `iii-disasters-covered-homeowners`
- Wording: Flood is excluded from standard home and renters policies; NFIP limits must say "confirm at floodsmart.gov"; any statistic carries its years (about 29 percent of claims from 2014 to 2024 came from outside high-risk zones). Name no state.

#### `renters-child-vs-parents-home`

- Bucket and kind: question, cross-policy (domain renters, priority 330, file `renters`, planned)
- Reads: questions `policies`, `renters_for`, `renters_child_housing`; policies `home`
- Trigger: Fires when renters_for is child_away and the user holds a home policy. renters_for is asked of anyone who ticked Renters in Q1, which includes a homeowner who ticked Home as well and pays for a child's policy (DECISIONS S5-15, R1-4); the flag reads the home policy and renters_for. Dorm asks whether the home policy already covers the child's belongings (the renters policy may be redundant), off_campus says the home policy likely does not reach and asks them to confirm the renters policy is still right, Not sure asks both; never a Drop.
- Facts: `student-dorm-covered-by-parents`, `student-dorm-limit`, `student-off-campus-not-covered`, `school-landlord-insurance-not-covering-belongings`, `student-renters-decision-factors`
- Sources: `iii-college-student-losses`, `naic-renters-college-2024`, `naic-renters-college-students`, `iii-am-i-covered`, `iii-renters-insurance`
- Wording: Use "generally" and "may" (S3a-home-4). Never state 10 percent as a rule (it is one undated brochure). Never a Drop; a separate renters policy is a thing to confirm.

### S10 Health and deductible vs cushion (`flags/health.mjs`, `flags/deductible.mjs`)

#### `health-auto-medpay-overlap`

- Bucket and kind: question, cross-policy (domain health, priority 410, file `health`, planned)
- Reads: questions `policies`, `auto_medpay`; policies `health`, `auto`
- Trigger: Fires when auto_medpay is yes or Not sure; silent for no. Asks both insurers how the two work together after a crash and whether the auto coverage is still needed.
- Facts: `auto-medpay-pip-definition`, `auto-medpay-coordination-of-benefits-model`, `medpay-health-insurance-coordination`, `home-medical-payments-to-others-guests-only`
- Sources: `naic-what-does-auto-insurance-cover`, `iii-auto-insurance-basics`, `naic-coordination-of-benefits-model-regulation`, `iii-standard-homeowners-coverage`
- Wording: Never say which coverage pays first, that MedPay pays a health deductible or copay, or that MedPay is required or optional (S3a-auto-4, S3a-8). Home "medical payments to others" covers guests, not your own household, so it is background at most, never a duplicate (S3a-home-2). Name no state.

#### `health-supplemental-boltons`

- Bucket and kind: question, cross-policy (domain health, priority 420, file `health`, planned)
- Reads: questions `policies`, `health_supplemental`, `emergency_cushion`; policies `health`
- Trigger: Fires when health_supplemental includes accident, critical_illness, hospital_indemnity or cancer; emphasis strong when emergency_cushion is 5000_plus; a Not sure answer fires a softer check of paycheck deductions; silent for none.
- Facts: `fixed-indemnity-not-substitute-for-comprehensive-coverage`, `supplemental-product-types-federal-categories`, `limited-benefit-plans-marketed-as-comprehensive`, `hsa-compatible-with-limited-supplemental-coverage`
- Sources: `cms-stldi-fixed-indemnity-fact-sheet-2024`, `dol-aca-faqs-part-72`, `ftc-open-enrollment-scams-2025`, `irs-pub-969-2025`
- Wording: Do not say these policies are often redundant or duplicate the main plan (S3a-health-2); state only the sourced definition (a set cash payout, not a substitute for comprehensive coverage) and ask whether the narrow payout is worth the premium. Open-enrollment nods use only sourced dates and say employers set their own (S3a-health-4).

#### `health-hsa-nudge`

- Bucket and kind: question, education (domain health, priority 430, file `health`, planned)
- Reads: questions `policies`, `health_hsa`; policies `health`
- Trigger: Fires when health_hsa is hdhp_hsa (a light nudge about the HSA's tax advantages and carryover) or hdhp_only (ask whether the plan is HSA-eligible and an HSA can be opened); silent for neither and for Not sure.
- Facts: `hsa-eligibility-requires-hdhp`, `hsa-tax-advantages`, `hsa-vs-health-fsa`, `hsa-hdhp-thresholds-2026-2027`
- Sources: `irs-pub-969-2025`, `healthcare-gov-glossary-hsa`, `irs-rev-proc-2026-24`, `irs-rev-proc-2025-19`
- Wording: No usage statistic is sourced, so never say HSAs are "commonly underused" (S3a-health-5, S3a-2). Federal tax advantages only; date any threshold and name its year; never infer HSA eligibility from a deductible band.

#### `health-short-term-plan-alongside`

- Bucket and kind: question, cross-policy (domain health, priority 440, file `health`, planned)
- Reads: questions `policies`, `health_short_term`; policies `health`
- Trigger: Fires when health_short_term is yes; silent for no and for Not sure.
- Facts: `stldi-lacks-federal-aca-protections`, `marketplace-plans-cover-preexisting-conditions-and-ehb`, `stldi-state-variation`, `stldi-2025-enforcement-pause`
- Sources: `naic-stldi-topic`, `cms-stldi-fixed-indemnity-fact-sheet-2024`, `healthcare-gov-pre-existing-conditions`, `healthcare-gov-what-marketplace-plans-cover`, `dol-stldi-agencies-statement-2025`
- Wording: Never print a plan duration (3, 4, 12 or 36 months): say federal limits have changed and are being revised and point to the state department of insurance (S3a-health-1). Whether holding both plans is allowed or wasteful is unsourced; ask whether the second plan is still needed.

#### `deductible-exceeds-cushion-auto`

- Bucket and kind: question, cross-policy (domain deductible, priority 450, file `deductible`, planned)
- Reads: questions `policies`, `deductible_auto`, `emergency_cushion`, `auto_collision`; policies `auto`
- Trigger: Fires when the deductible band's lower edge is above the top of the cushion band (deductible min > cushion max; a 5000_plus cushion never fires); a Not sure deductible never fires; a Not sure cushion fires at normal emphasis when the deductible's lower edge is 1000 or more; it stays silent when auto_collision is no, because without collision there is no collision deductible.
- Facts: `deductible-premium-tradeoff-and-affordability`, `home-auto-deductible-forms-and-ranges`, `shed-savings-only-largest-expense-2025`, `shed-unexpected-medical-expense-2025`
- Sources: `iii-understanding-your-insurance-deductibles`, `naic-tips-saving-on-auto-insurance`, `fed-shed-2025-savings-and-investments`, `fed-shed-2025-economic-hardships`
- Wording: Frame as "build the cushion or reconsider the deductible", their choice; never a judgment on the policy. Federal Reserve shares are context only and carry their survey year (2025).

#### `deductible-exceeds-cushion-home`

- Bucket and kind: question, cross-policy (domain deductible, priority 460, file `deductible`, planned)
- Reads: questions `policies`, `deductible_home`, `emergency_cushion`; policies `home`
- Trigger: Same rule as deductible-exceeds-cushion-auto, using deductible_home: fires when the deductible's lower edge is above the top of the cushion band; a Not sure deductible never fires; a Not sure cushion fires at normal emphasis when the deductible's lower edge is 1000 or more.
- Facts: `deductible-premium-tradeoff-and-affordability`, `home-auto-deductible-forms-and-ranges`, `shed-savings-only-largest-expense-2025`, `shed-unexpected-medical-expense-2025`
- Sources: `iii-understanding-your-insurance-deductibles`, `naic-tips-saving-on-auto-insurance`, `fed-shed-2025-savings-and-investments`, `fed-shed-2025-economic-hardships`
- Wording: Wind, hail and earthquake deductibles are often a percentage of the home's value, so a dollar band can understate them; mention that and ask about the percentage deductible separately (research designInput deductibleVsCushion).

#### `deductible-exceeds-cushion-health`

- Bucket and kind: question, cross-policy (domain deductible, priority 470, file `deductible`, planned)
- Reads: questions `policies`, `deductible_health`, `emergency_cushion`; policies `health`
- Trigger: Same rule as deductible-exceeds-cushion-auto, using deductible_health: fires when the deductible's lower edge is above the top of the cushion band; a Not sure deductible never fires; a Not sure cushion fires at normal emphasis when the deductible's lower edge is 1000 or more.
- Facts: `deductible-definition`, `out-of-pocket-maximum-definition`, `shed-savings-only-largest-expense-2025`, `shed-unexpected-medical-expense-2025`
- Sources: `healthcare-gov-glossary-deductible`, `healthcare-gov-glossary-out-of-pocket-maximum`, `fed-shed-2025-savings-and-investments`, `fed-shed-2025-economic-hardships`
- Wording: Never judge plan adequacy, network or whether the plan is good. The most a person pays in a year can exceed the deductible (out-of-pocket maximum), and we do not ask about it. The open-enrollment nod is allowed in health copy only, with sourced dates.

### S11 Other bucket (`flags/other.mjs`)

#### `other-rental-car-waiver`

- Bucket and kind: drop, cross-policy (domain other, priority 510, file `other`, planned)
- Reads: questions `policies`, `cards`, `card_usual_payment`, `auto_collision`; policies `rental_car`, `auto`
- Trigger: Fires when rental_car is held; emphasis strong when a held card has a verified rentalCar benefit (ctx.cardsWith) and card_usual_payment is yes; softer when the user holds no auto policy or auto_collision is no (their own policy may not extend to a rental); Not sure answers never raise emphasis.
- Facts: `rental-waiver-what-it-is`, `rental-waiver-often-unneeded-if-covered`, `rental-personal-auto-usually-extends`, `rental-decline-without-cover-you-pay`, `rental-card-coverage-usually-secondary`, `rental-card-requires-declining-waiver`
- Sources: `iii-rental-car-insurance`, `ftc-renting-a-car`, `naic-consumer-auto-insurance`
- Wording: Say card rental coverage is "usually secondary" and ask the issuer for the terms in writing (S3a-other-1); name a card only from CARDS and upgrade the wording only for a verified primary entry. Do not quote the undated NAIC per-day prices as fact (S3a-other-6). The card_usual_payment answer says only that the user usually pays with one of the cards they ticked, so never word it as paying with a named card unless every ticked card is named; otherwise say it helps only if the card they use is a named one (DECISIONS S11-8).

#### `other-towing-roadside-duplicate`

- Bucket and kind: drop, cross-policy (domain other, priority 520, file `other`, planned)
- Reads: questions `policies`, `roadside_sources`, `cards`; policies `towing`
- Trigger: Fires when towing is held and roadside_sources includes two or more of auto_policy, club, card and car_maker (other and Not sure do not count); a card is named only when the card table supports it; with fewer sources it stays silent.
- Facts: `roadside-auto-policy-coverage`, `roadside-memberships-may-overlap`, `roadside-towing-what-it-is`, `roadside-overlaps-memberships`
- Sources: `naic-what-does-auto-insurance-cover`, `naic-consumer-insight-right-protection`, `naic-shopping-tool-auto-2023`
- Wording: Card roadside claims come only from the card table (S3a-3, S3a-9); no limits, prices or mileage caps are sourced. Say an auto club or other membership may already include some of the same help (NAIC).

#### `other-vehicle-towing-check`

- Bucket and kind: question, cross-policy (domain other, priority 530, file `other`, planned)
- Reads: questions `policies`, `towing_vehicle_policy`, `roadside_sources`; policies `towing`, `motorcycle`, `boat`
- Trigger: Fires when towing_vehicle_policy is yes or Not sure: asks whether the same help already comes from the car's roadside add-on, a club or a card. A Question, not a Drop (DECISIONS S3a-other-7 overrides the SPEC's Drop for this one).
- Facts: `roadside-other-vehicles`
- Sources: `naic-what-does-auto-insurance-cover`, `iii-boat-insurance-and-safety`
- Wording: Sources show only that an auto policy's towing does not extend to motorcycles and that Triple-I lists towing among boat coverages; nothing says these usually duplicate a car's roadside or a card benefit (S3a-other-7, gap 8). Ask; do not assert duplication.

#### `other-travel-insurance-overlap`

- Bucket and kind: drop, cross-policy (domain other, priority 540, file `other`, planned)
- Reads: questions `policies`, `cards`, `card_usual_payment`; policies `travel`
- Trigger: Fires when travel is held; the generic text asks them to compare the policy with what they already have (a card's trip protection, home or renters belongings cover, life insurance for accidental death); emphasis strong only when a held card has a verified tripProtection benefit and card_usual_payment is yes; a Not sure card_usual_payment never raises emphasis.
- Facts: `travel-coverage-types`, `travel-credit-card-benefits-exist`, `travel-other-existing-coverage`, `travel-exclusions-and-limits`, `travel-accidental-death-duplicate`, `travel-cost-share`
- Sources: `naic-should-i-get-travel-insurance`, `iii-should-you-buy-travel-insurance`
- Wording: No source says a card's trip protection makes a separate policy unnecessary (S3a-9): compare the covered reasons, note travel medical is the likelier real gap, never promise a card covers a trip, and with the card table empty keep the wording generic. The card_usual_payment answer says only that the user usually pays with one of the cards they ticked, so never word it as paying with a named card unless every ticked card is named; otherwise say it helps only if the card they use is a named one (DECISIONS S11-8).

#### `other-phone-insurance-card`

- Bucket and kind: question, cross-policy (domain other, priority 550, file `other`, planned)
- Reads: questions `policies`, `phone_bill_on_card`, `cards`; policies `phone`, `home`, `renters`
- Trigger: Fires when phone is held and asks whether a card or the home or renters policy already covers the phone; the "route the bill through the card" move (put the bill on the card, then cancel the carrier plan) is stated as an action only when the card table verifies a cellPhone benefit on a held card and phone_bill_on_card is yes, which also makes the emphasis strong (a Not sure phone_bill_on_card never triggers that move); with the real, empty card table the text stays generic.
- Facts: `off-premises-belongings-covered`, `off-premises-cap-ten-percent`
- Sources: `iii-standard-homeowners-coverage`, `iii-renters-insurance`
- Wording: No authoritative source describes phone protection plans or what a card's phone coverage requires (S3a-3, research gap 1), so the flag says none of that: it asks. The only sourced statement is Triple-I's that a home or renters policy generally covers belongings, including away from home, up to a limit that some insurers cap; ask whether a phone counts and what the deductible would be. Anything about a named card comes only from the card table. Shipped as a question-only flag (DECISIONS S11-2). The phone_bill_on_card answer does not say which card pays the bill, so the strong ask and reason are conditional on the bill being on the named card (DECISIONS S11-8).

#### `other-extended-warranty-overlap`

- Bucket and kind: drop, cross-policy (domain other, priority 560, file `other`, planned)
- Reads: questions `policies`, `cards`, `card_usual_payment`; policies `warranty`
- Trigger: Fires when warranty is held; the generic text uses the FTC value test (does it add anything beyond the warranty you already have, hidden costs, would savings be better); emphasis strong only when a held card has a verified extendedWarranty benefit and card_usual_payment is yes; a Not sure card_usual_payment never raises emphasis.
- Facts: `warranty-extended-is-separate-and-may-overlap`, `warranty-value-questions`
- Sources: `ftc-extended-warranties-service-contracts`, `ftc-warranties`
- Wording: Any card warranty-extension claim comes only from the card table (S3a-other-3); say "many cards extend the manufacturer's warranty; check yours" only if a verified entry supports it. The card_usual_payment answer says only that the user usually pays with one of the cards they ticked, so never word it as paying with a named card unless every ticked card is named; otherwise say it helps only if the card they use is a named one (DECISIONS S11-8).

#### `other-add-on-term-life`

- Bucket and kind: question, cross-policy (domain other, priority 570, file `other`, planned)
- Reads: questions `policies`, `term_life`; policies `accidental_death`, `travel`
- Trigger: Fires when accidental_death is held and term_life is answered (it stays silent while term_life is unanswered), with text by term_life: own (the term life may already pay for an accidental death, while the AD&D adds a further payout and may pay for non-fatal losses; ask whether the term life already covers what the AD&D is for, what the AD&D pays beyond it and whether that is worth the price), work_only (employer life is often modest and tied to the job; ask whether total coverage is enough), none (accidental death coverage is not a substitute for regular life insurance), Not sure (ask what life coverage exists, then what the AD&D pays beyond it); when travel is also held the text adds that a travel policy's accidental death coverage can duplicate life insurance too; never says "drop it".
- Facts: `add-definition-accident-only`, `add-rider-pays-extra-for-accident`, `term-life-pays-on-death-in-term`, `add-employer-coverage-ends-with-job`, `employer-life-typical-size`, `travel-accidental-death-duplicate`
- Sources: `naic-glossary`, `naic-consumer-life-insurance`, `naic-life-insurance-roadmap`, `iii-should-you-buy-travel-insurance`
- Wording: Use the DECISIONS S3a-2(c) background: regular life insurance pays if you die during the term, while accidental death coverage pays only when an accident causes the death or injury; read your policy for exclusions. Whether employer AD&D ends with the job is unsourced (only employer life insurance is); the conclusion that AD&D on top of adequate term life is largely redundant is the SPEC's judgement, so this stays a Question. Never describe the AD&D extra as covering only one narrow case: the NAIC definition covers death and/or dismemberment, so a non-fatal loss stays in view in every branch (S11-9).

## 6. Research gaps that bind wording

| Gap (DECISIONS entry) | What the flag must do instead | Flags |
|---|---|---|
| The consequence of an underlying limit below the umbrella's requirement is unsourced (`S3a-umbrella-1`) | Ask whether the umbrella still responds as expected and raise to the stated requirement; never say it voids the umbrella | S6 umbrella flags |
| Whether umbrellas include UM/UIM is unsourced (`S3a-umbrella-2`) | Ask; never say umbrellas exclude it by default | `umbrella-um-uim-extension` |
| Required underlying limits for motorcycles and boats are unsourced (`S3a-5`, `S3a-umbrella-3`) | Ask what the umbrella requires | `umbrella-motorcycle-below-required-min`, `umbrella-boat-below-required-min` |
| No numeric authority for exposure bands or umbrella size (`S3a-umbrella-5`) | Call the band a rough guide; Triple-I's qualitative asset test only | S7 adequacy flags |
| "One in eight" uninsured is stale (`S3a-auto-1`) | Cite the dated Insurance Research Council figure with its year | `auto-um-uim-check` |
| UM/UIM requirements differ by state (`S3a-auto-2`) | Say they vary; count and name no states | `auto-um-uim-check`, `umbrella-um-uim-extension`, `health-auto-medpay-overlap` |
| MedPay paying a health deductible, or paying first, is unsourced (`S3a-auto-4`) | Ask both insurers; never state either | `health-auto-medpay-overlap` |
| No sourced limit tiers for UM/UIM, MedPay or towing (`S3a-auto-5`, `S3a-6`) | Tiers are product presets; no citation for them | `auto-um-uim-check` |
| No vehicle-age trigger for dropping collision (`S3a-6`) | Use the ten-times-premium test and the owned-outright gate only | `auto-collision-older-car` |
| Home medical payments to others covers guests only (`S3a-home-2`) | Background at most; never a duplicate of the user's health plan | `health-auto-medpay-overlap` |
| Parent versus student cover is hedged (`S3a-home-4`) | "Generally" and "may"; never a Drop; no 10 percent rule | `renters-child-vs-parents-home` |
| No sewer backup price or limit, no water-damage sub-limit flag (`S3a-7`, `S3a-home-1`) | "Nominal cost" at most; sub-limit flag stays deferred | `home-sewer-backup-missing` |
| Short-term plan duration is in flux (`S3a-health-1`) | Never print a duration; say limits have changed and are being revised | `health-short-term-plan-alongside` |
| "Bolt-ons are often redundant" is the SPEC's claim, not a sourced fact (`S3a-health-2`) | State only the sourced definition and ask whether the payout is worth the premium | `health-supplemental-boltons` |
| Open-enrollment window for employers is unsourced (`S3a-health-4`) | Employers set their own dates; health copy only | S10 health flags |
| No HSA usage statistic is allowlisted (`S3a-health-5`, `S3a-2`) | No "commonly underused"; federal tax advantages only; date any threshold | `health-hsa-nudge` |
| Cushion bands and the $5,000 edge (`S3a-health-6`) | Fed shares are context only, with their year | S10 deductible flags |
| Card rental cover is usually secondary (`S3a-other-1`) | Say "usually secondary"; upgrade only for a verified primary entry | `other-rental-car-waiver` |
| Phone protection has no allowlisted source (`S3a-3`) | The phone flag only asks: it cites the Triple-I home and renters statement, makes no claim about phone plans or card terms, and names a card only from the card table (DECISIONS `S11-2`) | `other-phone-insurance-card` |
| Card warranty extension has no allowlisted source (`S3a-other-3`) | Card claims only from the verified card table | `other-extended-warranty-overlap` |
| Motorcycle and boat towing duplication is unsourced (`S3a-other-7`) | A Question, not the SPEC's Drop | `other-vehicle-towing-check` |
| AD&D "redundant on term life" is the SPEC's judgement (`S3a-other-4`, `S3a-2`) | Stays a Question; use the S3a-2(c) background wording | `other-add-on-term-life` |

## 7. What the tests enforce

- The real catalog passes `validateCatalog`; every question has a section; sections appear in order, contiguous.
- Presets match the SPEC where it specifies them; every other question's choices are pinned.
- Every question's gate is asserted exactly; exact visible-question lists for policy combinations and answer branches; every question and every flag's question set can be made visible.
- No free text, no typed figure; bands contiguous, whole-dollar and non-overlapping; value shapes consistent inside a question.
- Every question is read by at least one planned flag; every question a flag reads exists; each planned flag's facts exist in `research/`, its sources are in the registry and belong to those facts; priorities fall in the owner's range and are unique.
- This document's tables and blocks equal the catalog and the fixture.

Story S12 later adds the scenario matrix and snapshot audit over the real flags.
