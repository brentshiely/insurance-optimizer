# Research index (story S3a)

Compact index of the verified research for the people writing questions and flags in later stories (S3b, S5, S6 to S11). The five `research/*.mjs` files are the source of truth; this page mirrors them, and `tests/research/research.test.mjs` fails if the two drift apart (ids, order, confidence, source lists, titles, URLs, gaps). Nothing under `research/` is deployed.

**Status.** Every source was fetched and read on 2026-10-10 and independently re-fetched by a verifier the same day; every source below has `verification.status: verified` and `lastVerified: 2026-10-10`. Claims are paraphrased. Items that could not be supported are listed under Gaps in each domain, never silently assumed.

| Domain | File | Sources | Facts | Design inputs | Gaps | Removed or trimmed |
|---|---|---|---|---|---|---|
| Umbrella and liability stack | `research/umbrella-liability-stack.mjs` | 17 | 19 | 14 | 13 | 10 |
| Auto coverages | `research/auto-coverages.mjs` | 21 | 25 | 9 | 9 | 2 |
| Home and renters | `research/home-and-renters.mjs` | 26 | 32 | 10 | 9 | 2 |
| Health and supplemental | `research/health-supplemental.mjs` | 24 | 28 | 11 | 11 | 6 |
| Other bucket (rental car, roadside, travel, phone, warranty, AD&D) | `research/other-bucket.mjs` | 13 | 25 | 10 | 13 | 20 |
| **Total** | | **101** | **129** | | **55** | **40** |

101 source entries cover 89 distinct URLs (10 URLs appear in more than one file, always under the same id).

## Rules for question and flag authors

1. **Cite by source id.** A flag's `sourceIds` must come from the Sources tables below. S3b registers them deduplicated by URL; where one URL is used in several files it already has one id everywhere (see Sources shared by more than one file).
2. **Keep the hedges.** Claims say "generally", "usually", "may" on purpose. Confidence is the researcher's rating: `medium` means weaker support (for example a single source, an inference or an illustration), so read that fact's `caveats` in the file before using it.
3. **Design inputs are guidance, not sources.** An item in a design input is sourced only through the `factIds` it lists. Items labelled derived, product judgement or not sourced in the file must be worded as questions.
4. **State-neutral.** Never name a state and never state how many states do something. Say "your state's department of insurance" where a point varies by state.
5. **Dates and years travel with figures.** Quote a statistic with its year and publisher (for example the Insurance Research Council 2023 uninsured-driver figure). HDHP, out-of-pocket and HealthCare.gov dates are year-specific.
6. **Removed material is not fact.** Entries under Removed or trimmed are kept only so the owner can reinstate them if a host is added to the allowlist. Do not cite them and do not reuse their wording.
7. **Named-card claims are not here.** Anything about a particular credit card comes only from the issuer's own guide in the card table (stories S4a and S4b).

### Source allowlist applied

Source hosts (or subdomains) must be one of: iii.org, naic.org (including content.naic.org), insureuonline.org, fema.gov, floodsmart.gov, irs.gov, healthcare.gov, cms.gov, hhs.gov, dol.gov, ftc.gov (including consumer.ftc.gov), consumerfinance.gov, federalreserve.gov, insurance-research.org, consumerfed.org, kff.org. Commercial insurers, agencies and comparison sites (for example progressive.com, statefarm.com, allstate.com, geico.com, policygenius.com, valuepenguin.com, nerdwallet.com, bankrate.com, thezebra.com, insurancejournal.com) are forbidden. The test enforces both lists. Sources on other hosts that the researchers had fetched and verified (consumerreports.org, opm.gov, gao.gov, reginfo.gov and one state regulator) were removed; see DECISIONS S3a entries.

## Where to look, by story

| Story | Read first | Design inputs (file: keys) |
|---|---|---|
| S3b (source registry) | Register every source in the Sources tables below, deduplicated by URL. Ids are already identical wherever a URL repeats (see Shared sources). | - |
| S5 (question catalog) | Preset tiers and bands, and where no tier is sourced. | `umbrella-liability-stack`: `umbrellaLimitTiers`, `autoLiabilityFormat`, `homeLiabilityTiers`, `exposureBands`; `auto-coverages`: `limitTiers`; `home-and-renters`: `homeLiabilityTiers`; `health-supplemental`: `deductibleVsCushion`; `other-bucket`: `noSourcedLimitTiers` |
| S6 (liability stack, umbrella core flags) | Underlying requirements, preset comparison, other vehicles, what is unsourced about a shortfall. | `umbrella-liability-stack`: `typicalUnderlyingRequirement`, `underlyingRequirementsAreInsurerSpecific`, `presetComparisonToTypicalRequirement`, `homeLiabilityTiers`, `otherVehiclesUnderUmbrella`, `primaryLiabilityTradeoff`, `gapConsequenceCopy` |
| S7 (umbrella scope and adequacy) | Exposure bands, UM/UIM on the umbrella, exclusions to ask about. | `umbrella-liability-stack`: `exposureBands`, `umUimOnUmbrella`, `scopeExclusionsToAsk` |
| S8 (auto coverage gaps) | Uninsured-driver statistic, UM/UIM wording, gap, rental reimbursement, collision/comprehensive drop test. | `auto-coverages`: `uninsuredDriverStatistic`, `uninsuredOrUnderinsuredCombined`, `umUimStateNeutralCopyRule`, `gapCoverageGate`, `rentalReimbursementPrompt`, `collisionComprehensiveDropRule` |
| S9 (home exclusions and renters) | Sewer backup, flood, student and renters rules, earth movement (fast-follow). | `home-and-renters`: `sewerBackupRules`, `floodRules`, `studentAndRentersRules`, `earthMovementRules`, `waterDamageSublimit`, `statePhrasing` |
| S10 (health and deductible vs cushion) | Medical-rider overlap, supplemental bolt-ons, short-term plans, HSA nudge, cushion bands, open enrollment. | `health-supplemental`: `scope`, `medicalRiderOverlap`, `supplementalBoltOns`, `shortTermPlans`, `hsaNudge`, `deductibleVsCushion`, `openEnrollmentFraming`, `plannedFlagSourcePicks`; `auto-coverages`: `medPayOverlapWithHealth`; `home-and-renters`: `medPayVersusHealthInsurance`, `medicalPaymentsToOthers` |
| S11 (other bucket) | Rental car, roadside, travel, warranty, AD&D, generic card statements; the phone flag has no sourced facts. | `other-bucket`: `rentalCar`, `roadsideAndTowing`, `travelInsurance`, `phoneProtection`, `extendedWarranties`, `addVersusTermLife`, `creditCardCrossReference`, `datedFiguresDoNotQuote`; `auto-coverages`: `roadsideOverlap` |

## Sources shared by more than one file

| id | files | url |
|---|---|---|
| `iii-auto-insurance-basics` | `auto-coverages`, `health-supplemental` | <https://www.iii.org/article/auto-insurance-basics-understanding-your-coverage> |
| `iii-boat-insurance-and-safety` | `umbrella-liability-stack`, `other-bucket` | <https://www.iii.org/article/boat-insurance-and-safety> |
| `iii-protect-yourself-uninsured-motorists` | `umbrella-liability-stack`, `auto-coverages` | <https://www.iii.org/article/protect-yourself-against-uninsured-motorists> |
| `iii-rental-car-insurance` | `auto-coverages`, `other-bucket` | <https://www.iii.org/article/rental-car-insurance> |
| `iii-standard-homeowners-coverage` | `home-and-renters`, `health-supplemental` | <https://www.iii.org/article/what-is-covered-by-standard-homeowners-insurance> |
| `iii-what-is-umbrella-liability-policy` | `umbrella-liability-stack`, `home-and-renters` | <https://www.iii.org/article/what-is-an-umbrella-liability-policy> |
| `naic-consumer-insight-right-protection` | `auto-coverages`, `other-bucket` | <https://content.naic.org/article/consumer-insight-does-your-vehicle-have-right-protection-best-practices-buying-auto-insurance> |
| `naic-coordination-of-benefits-model-regulation` | `auto-coverages`, `health-supplemental` | <https://content.naic.org/sites/default/files/model-law-120.pdf> |
| `naic-glossary` | `umbrella-liability-stack`, `other-bucket` | <https://content.naic.org/glossary-insurance-terms> |
| `naic-what-does-auto-insurance-cover` | `umbrella-liability-stack`, `auto-coverages`, `health-supplemental`, `other-bucket` | <https://content.naic.org/article/what-you-should-know-about-auto-insurance-coverage> |

## 1. Umbrella and liability stack (`umbrella-liability-stack`)

File `research/umbrella-liability-stack.mjs`. Retrieved 2026-10-10. 17 sources, 19 facts, 14 design inputs, 13 gaps, 10 removed or trimmed entries.

### Sources

| id | publisher | title | type | url |
|---|---|---|---|---|
| `naic-whats-umbrella-policy` | National Association of Insurance Commissioners | What’s an Umbrella Policy? | regulator | <https://content.naic.org/article/whats-umbrella-policy> |
| `naic-glossary` | National Association of Insurance Commissioners | Glossary of Insurance Terms | regulator | <https://content.naic.org/glossary-insurance-terms> |
| `naic-homeowners-shopping-tool` | National Association of Insurance Commissioners | A Shopping Tool for Homeowners Insurance | regulator | <https://content.naic.org/sites/default/files/committees_c_trans_read_wg_related_shopping_tool_singles.pdf> |
| `naic-auto-shopping-tool` | National Association of Insurance Commissioners | NAIC Consumer Shopping Tool for Auto Insurance | regulator | <https://content.naic.org/sites/default/files/inline-files/topic_transparency_readability_consumer_auto_tool.pdf> |
| `naic-what-does-auto-insurance-cover` | National Association of Insurance Commissioners | What Does Auto Insurance Cover? | regulator | <https://content.naic.org/article/what-you-should-know-about-auto-insurance-coverage> |
| `naic-annual-insurance-checkup` | National Association of Insurance Commissioners | Your Annual Insurance Check-up | regulator | <https://content.naic.org/article/consumer-insight-your-annual-insurance-check> |
| `naic-pools-hot-tubs-backyard` | National Association of Insurance Commissioners | Protecting Your Home: Coverage for Pools, Hot Tubs and Backyard Toys | regulator | <https://content.naic.org/article/consumer-insight-protecting-your-home-coverage-pools-hot-tubs-and-backyard-toys> |
| `naic-summer-safety-insured` | National Association of Insurance Commissioners | Summer Safety: Are You Insured for Summer Fun? | regulator | <https://content.naic.org/article/consumer-insight-summer-safety-are-you-insured-summer-fun> |
| `naic-jir-social-media-underwriting` | National Association of Insurance Commissioners (Journal of Insurance Regulation) | Social Media as a Factor in Personal Injury Underwriting: Risk, Rate and Regulation | regulator | <https://content.naic.org/sites/default/files/inline-files/JIR-ZA-39-01-EL_0.pdf> |
| `iii-what-is-umbrella-liability-policy` | Insurance Information Institute | What is an umbrella liability policy? | industry-nonprofit | <https://www.iii.org/article/what-is-an-umbrella-liability-policy> |
| `iii-should-i-purchase-umbrella` | Insurance Information Institute | Should I purchase an umbrella liability policy? | industry-nonprofit | <https://www.iii.org/article/should-i-purchase-an-umbrella-liability-policy> |
| `iii-homebuyers-handbook` | Insurance Information Institute | Homebuyers Insurance Handbook | industry-nonprofit | <https://www.iii.org/sites/default/files/docs/pdf/2023_triple-i_homeowners_insurance_handbook.pdf> |
| `iii-business-vehicle-insurance` | Insurance Information Institute | Business Vehicle Insurance | industry-nonprofit | <https://www.iii.org/publication/insuring-your-business-small-business-owners-guide-to-insurance/specific-coverages/business-vehicle-insurance> |
| `iii-insuring-home-business` | Insurance Information Institute | Insuring Your Home Business | industry-nonprofit | <https://www.iii.org/article/insuring-your-home-business> |
| `iii-boat-insurance-and-safety` | Insurance Information Institute | Boat insurance and safety | industry-nonprofit | <https://www.iii.org/article/boat-insurance-and-safety> |
| `iii-motorcycle-insurance` | Insurance Information Institute | Motorcycle insurance | industry-nonprofit | <https://www.iii.org/article/motorcycle-insurance> |
| `iii-protect-yourself-uninsured-motorists` | Insurance Information Institute | Protect yourself against uninsured motorists | industry-nonprofit | <https://www.iii.org/article/protect-yourself-against-uninsured-motorists> |

### Facts

| id | topic | claim (short) | sources | confidence |
|---|---|---|---|---|
| `umbrella-is-liability-only` | What a personal umbrella policy is | A personal umbrella is extra liability protection, including defense costs, above your auto, home and renters (or condo/co-op) liability limits; your policy wording controls. | `naic-whats-umbrella-policy`, `naic-glossary`, `iii-what-is-umbrella-liability-policy` | high |
| `umbrella-not-own-property-or-punitive` | Umbrella does not cover your own property | An umbrella does not pay to repair your own home or car (NAIC hail example), and NAIC lists punitive damages as not covered. | `naic-whats-umbrella-policy` | high |
| `umbrella-attaches-after-underlying-exhausted` | How an umbrella attaches | An umbrella pays only after the underlying policy's liability limit is used up; it adds to those policies and does not replace them. | `iii-what-is-umbrella-liability-policy`, `iii-should-i-purchase-umbrella`, `iii-homebuyers-handbook`, `naic-glossary` | high |
| `umbrella-typical-limit-1m-or-more` | Typical umbrella amounts | Umbrellas are usually sold with limits of $1 million or more (NAIC); only that floor is sourced, the rest of the preset list is a product choice. | `naic-homeowners-shopping-tool` | high |
| `umbrella-underlying-minimums-typical` | Required underlying limits (typical figures) | Triple-I: most insurers want about $250,000 auto and $300,000 home liability before selling a $1 million umbrella; the auto figure's format is unspecified. | `iii-should-i-purchase-umbrella`, `iii-what-is-umbrella-liability-policy`, `iii-homebuyers-handbook` | high |
| `umbrella-underlying-requirements-insurer-specific` | Requirements vary by insurer | The typical figures are what 'most insurers' want, so each insurer sets its own requirement and limits below it may have to be raised first (inferred). | `iii-should-i-purchase-umbrella`, `iii-homebuyers-handbook` | medium |
| `higher-underlying-limits-lower-umbrella-cost` | Trade-off when adjusting primary liability | More underlying liability coverage means a cheaper umbrella (Triple-I handbook); nothing is sourced on cutting primary limits. | `iii-homebuyers-handbook` | medium |
| `um-uim-is-auto-policy-coverage` | What UM/UIM is | UM/UIM is an auto coverage that pays you and your passengers when the at-fault driver has no or too little insurance; rules vary by state; nothing sourced on umbrellas. | `naic-auto-shopping-tool`, `iii-protect-yourself-uninsured-motorists`, `naic-what-does-auto-insurance-cover` | high |
| `umbrella-business-activity-excluded` | Umbrella exclusion: business activity | A personal umbrella typically excludes claims from a business endeavor and covers business liability only if the underlying policy does. | `iii-business-vehicle-insurance`, `iii-insuring-home-business`, `naic-jir-social-media-underwriting` | high |
| `umbrella-personal-injury-coverage-varies` | Umbrella: personal injury (libel and slander) coverage | Umbrellas often add personal-injury (libel and slander) cover that homeowners policies usually need an endorsement for; forms vary, so ask. | `iii-what-is-umbrella-liability-policy`, `naic-jir-social-media-underwriting` | medium |
| `umbrella-intentional-acts-excluded` | Umbrella exclusion: intentional acts | One NAIC-published journal article: personal-injury coverage carries an intentional-acts exclusion; not a full exclusion list. | `naic-jir-social-media-underwriting` | medium |
| `specialty-vehicles-need-their-own-policies` | Motorcycles, ATVs and RVs are outside a personal auto policy | A personal auto policy does not cover motorcycles, ATVs, off-road vehicles, RVs or commercial vehicles; each needs its own liability policy. | `naic-what-does-auto-insurance-cover`, `iii-motorcycle-insurance` | high |
| `boats-need-own-liability-and-sit-under-umbrella` | Boats and the umbrella | Homeowners policies give boats little liability protection, boat policies give broader cover, and NAIC puts the umbrella above home and boat limits. | `naic-summer-safety-insured`, `iii-boat-insurance-and-safety`, `naic-pools-hot-tubs-backyard` | high |
| `auto-liability-limit-format` | What auto liability numbers like 250/500 mean | Auto liability numbers like 25/50/15 are injury per person, injury per accident and property damage per accident, in thousands of dollars. | `naic-auto-shopping-tool` | high |
| `auto-state-minimums-vary` | State-required auto liability minimums vary | Most states require a minimum of auto liability and the amount varies; you pay anything above your limit; NAIC advises buying more than the minimum. | `naic-auto-shopping-tool` | high |
| `split-limits-vs-combined-single-limit` | Split limits versus combined single limit | Personal auto usually lists split limits; a combined single limit is one cap for injury and property damage together (one Triple-I page, medium). | `iii-business-vehicle-insurance` | medium |
| `home-liability-typical-amounts` | Typical homeowners personal-liability amounts | Home liability limits generally start near $100,000; Triple-I says consider $300,000 to $500,000; NAIC's example of a basic policy is $250,000. | `iii-homebuyers-handbook`, `naic-annual-insurance-checkup` | high |
| `umbrella-sizing-by-assets` | How much umbrella to buy | Triple-I's test for needing an umbrella: do you hold property, investments or savings worth more than your liability limits? No formula exists. | `iii-homebuyers-handbook` | medium |
| `lawsuit-exposure-factors` | Situations that raise lawsuit exposure | Triple-I lists owning a pool, renting out property, a dog and a teen driver as lifestyle risks that can lead to lawsuits. | `iii-should-i-purchase-umbrella` | high |

### Design inputs

| key | what it gives you | facts |
|---|---|---|
| `umbrellaLimitTiers` | Only the $1 million floor is sourced; 1M, 2M and 5M are product presets, not 'standard increments'. | `umbrella-typical-limit-1m-or-more` |
| `typicalUnderlyingRequirement` | Context for a $1M umbrella: about $250,000 auto and $300,000 home (Triple-I); the auto limit format is unspecified and a $500,000 home requirement is undocumented. | `umbrella-underlying-minimums-typical`, `umbrella-underlying-requirements-insurer-specific` |
| `underlyingRequirementsAreInsurerSpecific` | Copy must say requirements vary by insurer and tell users to check their umbrella's required-underlying schedule; 'not sure' is legitimate. | `umbrella-underlying-requirements-insurer-specific` |
| `presetComparisonToTypicalRequirement` | Derived, not sourced: how the 100/300, 250/500, 500/500 and home presets compare with the typical figures; S6 settles it in its own DECISIONS entry. | `umbrella-underlying-minimums-typical`, `auto-liability-limit-format` |
| `autoLiabilityFormat` | What 25/50/15-style numbers mean; spec presets show two numbers; no sourced baseline recommendation remains (Consumer Reports levels removed); offer 'not sure' for combined single limits. | `auto-liability-limit-format`, `auto-state-minimums-vary`, `split-limits-vs-combined-single-limit` |
| `homeLiabilityTiers` | Home liability anchors: 100,000 common start, 250,000 NAIC example, 300,000 typical umbrella prerequisite, 300,000 to 500,000 'consider'; spec presets are 300,000 / 500,000 / 1,000,000. | `home-liability-typical-amounts`, `umbrella-underlying-minimums-typical` |
| `exposureBands` | Spec bands (under 1M / 1 to 3M / over 3M / not sure) have no numeric authority; keep them coarse, call them a rough guide, never collect a figure; Triple-I's asset test is the only guidance. | `umbrella-sizing-by-assets`, `lawsuit-exposure-factors` |
| `umUimOnUmbrella` | Question item only: ask whether the umbrella extends UM/UIM and can add it; do not assert a default exclusion or that endorsements exist (no source). | `um-uim-is-auto-policy-coverage`, `umbrella-is-liability-only` |
| `scopeExclusionsToAsk` | Sourced: business activity (typically excluded; stronger emphasis with a side business), own property, punitive damages, intentional acts (personal-injury part), personal injury varies; contractual liability is unsourced. | `umbrella-business-activity-excluded`, `umbrella-not-own-property-or-punitive`, `umbrella-intentional-acts-excluded`, `umbrella-personal-injury-coverage-varies` |
| `otherVehiclesUnderUmbrella` | Motorcycles/ATVs/RVs need their own policies, boats get limited homeowners liability, and the umbrella sits above boat limits; required underlying limits for these vehicles are unsourced, so ask. | `specialty-vehicles-need-their-own-policies`, `boats-need-own-liability-and-sit-under-umbrella` |
| `primaryLiabilityTradeoff` | More underlying liability makes the umbrella cheaper; nothing supports a Drop to cut primary limits, so use a Question item. | `higher-underlying-limits-lower-umbrella-cost`, `umbrella-underlying-minimums-typical` |
| `gapConsequenceCopy` | The 'shortfall voids the umbrella' rationale is unsourced; word the home-below-minimum Raise as 'confirm the umbrella still responds, and raise to its stated requirement'. | `umbrella-attaches-after-underlying-exhausted`, `umbrella-underlying-requirements-insurer-specific` |
| `stateNeutrality` | State minimums for auto liability and UM/UIM vary; cite NAIC and point to the user's own state department of insurance without naming a state. | `auto-state-minimums-vary`, `um-uim-is-auto-policy-coverage` |
| `authorityNotes` | Why the Consumer Reports sources were removed, how the NAIC journal article is used (medium), and which sources are PDFs. | - |

### Gaps

1. Consequence of an underlying limit below the umbrella's requirement or a lapsed underlying policy (the insured pays the gap; the umbrella pays only as if the required limit were in place): no fetched NAIC, Triple-I, Consumer Reports or federal page states this. The only sources found that do are insurance-education course PDFs on riskeducation.org (returned HTTP 404 when fetched, so not cited), plus trade, broker and commercial sites that are excluded by the authority rules.
2. Whether umbrellas include uninsured/underinsured motorist coverage by default or only by endorsement (and where available): no NAIC, Triple-I, Consumer Reports, CFA or Insurance Research Council page found addresses it; the only material found was from insurers, brokers, comparison sites and state court opinions. Left as a Question item with no factual assertion.
3. Standard umbrella increments and the usual maximum: NAIC says limits of $1 million or more; the Triple-I pages fetched give no increments or range, and sources that do (for example $1 million steps, up to $5 million or $10 million) were not authoritative or were not on the fetched page.
4. Contractual liability as an umbrella exclusion: no authoritative personal-umbrella source found (only commercial-umbrella commentary from non-authoritative sites).
5. Required underlying liability limits for motorcycles, boats and RVs, and any rule that they must match auto limits: not found in NAIC, Triple-I or Consumer Reports. Only supporting facts exist (these vehicles need their own policies and the umbrella sits above boat policies).
6. Typical auto requirement in split-limit or combined-single-limit form (for example 250/500 or a $500,000 combined single limit) and a property-damage figure: Triple-I says only 'about $250,000' of auto liability; the split-limit figures commonly quoted appear on insurer and broker sites only. A home umbrella requirement of $500,000 is likewise undocumented (only $300,000 is sourced).
7. Authoritative guidance on lowering primary auto or home liability once an umbrella is held: none found; Triple-I only says more underlying liability makes the umbrella cheaper.
8. A numeric rule for umbrella size (for example a multiple of net worth): no NAIC or Triple-I formula found; the only sourced guidance is Triple-I's qualitative test about assets worth more than your liability limits.
9. Combined single limit on personal auto policies: the NAIC glossary has no entry and Triple-I discusses it only for commercial auto, so the definition rests on one Triple-I page at medium confidence.
10. Consumer Federation of America and the Insurance Research Council were searched for umbrella-specific material and had none (their uninsured-driver statistics belong to the auto research file).
11. Recommended auto liability levels (such as 100/300/100 for most people and 250/500/250 for people with significant assets): the only source found was Consumer Reports, which is not on the S3a authority allowlist, so these levels are unsourced and must not appear as a recommendation.
12. Which assets a lawsuit judgment could reach (for example retirement accounts or home equity) and how to size an umbrella to assets: the only source found was Consumer Reports, which is not on the S3a authority allowlist, so nothing is asserted beyond Triple-I's qualitative test.
13. Pages from state insurance departments were deliberately not used, because the tool is state-neutral and must not cite or name a single state; one state-regulator page (mass.gov) was also unreachable (HTTP 403).

### Removed or trimmed

| id | kind | why |
|---|---|---|
| `cr-how-much-car-insurance` | source | Host www.consumerreports.org is not on the allowlist; original kept in the file for reinstatement. |
| `cr-get-insurance-you-need` | source | Host www.consumerreports.org is not on the allowlist; original kept in the file for reinstatement. |
| `cr-5-steps-protect-your-home` | source | Host www.consumerreports.org is not on the allowlist; original kept in the file for reinstatement. |
| `auto-liability-baseline-recommendations` | fact | Its claim was Consumer Reports' 100/300/100 and 250/500/250 recommendations plus NAIC's advice to buy more than the state minimum. Consumer Reports is not allowlisted; the NAIC half now lives in auto-state-minimums-vary. |
| `umbrella-underlying-requirements-insurer-specific` | fact-trimmed | Dropped source `cr-5-steps-protect-your-home`; the fact keeps its other sources. What the dropped source added: Consumer Reports' note that you may have to raise your auto and home liability limits before you can buy an umbrella. |
| `umbrella-personal-injury-coverage-varies` | fact-trimmed | Dropped source `cr-5-steps-protect-your-home`; the fact keeps its other sources. What the dropped source added: a second source for umbrellas covering libel and slander (Triple-I and the NAIC journal article still support the claim). |
| `auto-liability-limit-format` | fact-trimmed | Dropped source `cr-how-much-car-insurance`; the fact keeps its other sources. What the dropped source added: a second source for the three-number format (the NAIC tool still supports the claim). |
| `home-liability-typical-amounts` | fact-trimmed | Dropped source `cr-5-steps-protect-your-home`; the fact keeps its other sources. What the dropped source added: Consumer Reports' agreement that home liability limits usually start at $100,000 (Triple-I still supports it). |
| `umbrella-sizing-by-assets` | fact-trimmed | Dropped source `cr-get-insurance-you-need`, `cr-5-steps-protect-your-home`; the fact keeps its other sources. What the dropped source added: Consumer Reports' advice to size an umbrella to the assets above your home and auto liability limits, and its points that qualified retirement accounts are generally safe from judgments while home equity may be reachable in some states. |
| `lawsuit-exposure-factors` | fact-trimmed | Dropped source `cr-get-insurance-you-need`; the fact keeps its other sources. What the dropped source added: Consumer Reports' additions (boats as an exposure, and most umbrella claims coming from car crashes). |

## 2. Auto coverages (`auto-coverages`)

File `research/auto-coverages.mjs`. Retrieved 2026-10-10. 21 sources, 25 facts, 9 design inputs, 9 gaps, 2 removed or trimmed entries.

### Sources

| id | publisher | title | type | url |
|---|---|---|---|---|
| `iii-protect-yourself-uninsured-motorists` | Insurance Information Institute | Protect yourself against uninsured motorists | industry-nonprofit | <https://www.iii.org/article/protect-yourself-against-uninsured-motorists> |
| `iii-compulsory-auto-uninsured-motorists` | Insurance Information Institute | Background on: Compulsory Auto/Uninsured Motorists | industry-nonprofit | <https://www.iii.org/article/background-on-compulsory-auto-uninsured-motorists> |
| `iii-facts-uninsured-motorists` | Insurance Information Institute | Facts + Statistics: Uninsured motorists | industry-nonprofit | <https://www.iii.org/fact-statistic/facts-statistics-uninsured-motorists> |
| `iii-blog-irc-one-in-three-2023` | Insurance Information Institute | IRC report reveals that one in three drivers were either uninsured or underinsured in 2023. | industry-nonprofit | <https://www.iii.org/blog/irc-report-reveals-that-one-in-three-drivers-were-either-uninsured-or-underinsured-in-2023> |
| `irc-2025-one-in-three-uninsured-underinsured` | Insurance Research Council | One in Three Drivers are Either Uninsured or Underinsured in the U.S, Exposing Themselves and Other Drivers to Significant Financial Risk, New IRC Study Shows | research-org | <https://insurance-research.org/news/one-three-drivers-are-either-uninsured-or-underinsured-us-exposing-themselves-and-other> |
| `irc-2023-uninsured-14-percent-in-2022` | Insurance Research Council | 14 Percent of U.S. Drivers Were Uninsured in 2022, IRC Estimates | research-org | <https://www.insurance-research.org/news-releases/2023-10> |
| `irc-2021-one-in-eight-uninsured` | Insurance Research Council | One in Eight Drivers Uninsured | research-org | <https://insurance-research.org/sites/default/files/2025-03/UM%20NR%20032221.pdf> |
| `naic-uninsured-motorists` | National Association of Insurance Commissioners | Uninsured Motorists | regulator | <https://content.naic.org/insurance-topics/uninsured-motorists> |
| `naic-what-does-auto-insurance-cover` | National Association of Insurance Commissioners | What Does Auto Insurance Cover? | regulator | <https://content.naic.org/article/what-you-should-know-about-auto-insurance-coverage> |
| `naic-consumers-guide-auto-2022` | National Association of Insurance Commissioners | A Consumer's Guide to Auto Insurance | regulator | <https://content.naic.org/sites/default/files/publication-aut-pp-consumer-auto.pdf> |
| `naic-shopping-tool-auto-2023` | National Association of Insurance Commissioners | A Shopping Tool for Auto Insurance | regulator | <https://content.naic.org/sites/default/files/consumer-auto-shopping-tool.pdf> |
| `naic-consumer-insight-right-protection` | National Association of Insurance Commissioners | Does your vehicle have the right protection? Best practices for buying auto insurance | regulator | <https://content.naic.org/article/consumer-insight-does-your-vehicle-have-right-protection-best-practices-buying-auto-insurance> |
| `naic-coordination-of-benefits-model-regulation` | National Association of Insurance Commissioners | Coordination of Benefits Model Regulation | regulator | <https://content.naic.org/sites/default/files/model-law-120.pdf> |
| `iii-what-is-gap-insurance` | Insurance Information Institute | What is gap insurance? | industry-nonprofit | <https://www.iii.org/article/what-is-gap-insurance> |
| `cfpb-what-is-gap-insurance` | Consumer Financial Protection Bureau | What is Guaranteed Asset Protection (GAP) insurance? | government | <https://www.consumerfinance.gov/ask-cfpb/what-is-guaranteed-asset-protection-gap-insurance-en-797/> |
| `cfpb-gap-required-by-lender` | Consumer Financial Protection Bureau | Am I required to purchase an extended warranty, Guaranteed Asset Protection (GAP) insurance, or credit insurance from a lender or dealer to get an auto loan? | government | <https://www.consumerfinance.gov/ask-cfpb/am-i-required-to-purchase-an-extended-warranty-or-guaranteed-asset-protection-gap-insurance-from-a-lender-or-dealer-to-get-an-auto-loan-en-807/> |
| `iii-nine-ways-lower-auto-costs` | Insurance Information Institute | Nine ways to lower your auto insurance costs | industry-nonprofit | <https://www.iii.org/article/nine-ways-to-lower-your-auto-insurance-costs> |
| `iii-collision-comprehensive` | Insurance Information Institute | What is covered by collision and comprehensive auto insurance? | industry-nonprofit | <https://www.iii.org/article/what-is-covered-by-collision-and-comprehensive-auto-insurance> |
| `iii-how-much-auto-coverage` | Insurance Information Institute | How much auto coverage do I need? | industry-nonprofit | <https://www.iii.org/article/how-much-auto-coverage-do-i-need> |
| `iii-auto-insurance-basics` | Insurance Information Institute | Auto insurance basics—understanding your coverage | industry-nonprofit | <https://www.iii.org/article/auto-insurance-basics-understanding-your-coverage> |
| `iii-rental-car-insurance` | Insurance Information Institute | Rental car insurance | industry-nonprofit | <https://www.iii.org/article/rental-car-insurance> |

### Facts

| id | topic | claim (short) | sources | confidence |
|---|---|---|---|---|
| `um-uim-what-they-pay` | Uninsured / underinsured motorist coverage: what it is | UM pays you and your passengers when the at-fault driver is uninsured or hit-and-run; UIM pays toward the shortfall when their limits are too low. | `naic-consumers-guide-auto-2022`, `naic-shopping-tool-auto-2023`, `naic-what-does-auto-insurance-cover`, `iii-protect-yourself-uninsured-motorists` | high |
| `um-property-damage-separate` | Uninsured motorist property damage | Damage to your car from an uninsured driver is a separate UMPD coverage; availability varies by state and insurer. | `iii-protect-yourself-uninsured-motorists`, `naic-shopping-tool-auto-2023` | high |
| `um-uim-requirements-vary-by-state` | UM/UIM varies by state | Whether UM/UIM is required, its minimums and how it works vary by state; sources conflict on counts, so give none and point to the state insurance department. | `iii-compulsory-auto-uninsured-motorists`, `naic-what-does-auto-insurance-cover`, `naic-consumers-guide-auto-2022`, `naic-shopping-tool-auto-2023`, `iii-facts-uninsured-motorists` | high |
| `uninsured-share-latest-irc` | Share of uninsured drivers (latest IRC figure) | IRC: 15.4% of drivers (more than one in seven) were uninsured in 2023; state range 5.7% to 28.2%; an estimate, and no newer edition was found. | `irc-2025-one-in-three-uninsured-underinsured`, `iii-facts-uninsured-motorists`, `iii-blog-irc-one-in-three-2023`, `naic-uninsured-motorists` | high |
| `uninsured-share-one-in-eight-is-dated` | Where 'one in eight' comes from | 'One in eight' is the IRC's 12.6% estimate for 2019 (released March 2021) and Triple-I repeats it with no year; use the latest dated IRC figure. | `irc-2021-one-in-eight-uninsured`, `iii-protect-yourself-uninsured-motorists`, `irc-2025-one-in-three-uninsured-underinsured` | high |
| `uninsured-underinsured-combined-2023` | Uninsured plus underinsured drivers | IRC: 33.4% of drivers were uninsured or underinsured in 2023, up 10 points from 2017; Triple-I's summary puts underinsured alone at 18.0%. | `irc-2025-one-in-three-uninsured-underinsured`, `iii-blog-irc-one-in-three-2023` | high |
| `uninsured-share-revised-between-editions` | IRC estimates are restated between editions | The IRC restates a year between editions (2019: 12.6% then 11.6%; 2022: 14.0% then 15.2%), so quote one edition only. | `irc-2021-one-in-eight-uninsured`, `irc-2023-uninsured-14-percent-in-2022`, `iii-facts-uninsured-motorists` | high |
| `optional-coverages-priced-separately` | Auto coverages are priced separately and some may already be on your policy | An auto policy is a bundle of separately priced coverages; some may be included automatically unless you opt out; adding coverages raises the premium. | `naic-consumers-guide-auto-2022` | medium |
| `gap-what-it-covers` | Gap insurance: what it covers | Gap insurance pays the difference between the car's value and what you still owe on the loan or lease; it does not replace collision or comprehensive. | `iii-what-is-gap-insurance`, `cfpb-what-is-gap-insurance`, `naic-what-does-auto-insurance-cover`, `naic-shopping-tool-auto-2023` | high |
| `gap-when-it-matters` | Gap insurance: when it matters | Gap matters when you owe more than the car is worth: down payment under 20%, loan of 60 months or longer, negative equity, a lease; most new cars lose about 20% in a year. | `iii-what-is-gap-insurance`, `cfpb-what-is-gap-insurance` | high |
| `gap-lease-and-lender-requirements` | Gap insurance: lease and lender requirements | A lease generally requires gap and builds it into payments; for a loan it is usually not required unless the contract says so; lenders more often require collision and comprehensive. | `iii-what-is-gap-insurance`, `iii-auto-insurance-basics`, `cfpb-gap-required-by-lender`, `cfpb-what-is-gap-insurance`, `iii-collision-comprehensive` | high |
| `gap-where-to-buy-and-cautions` | Gap insurance: where to buy and cautions | Gap is sold by dealers, lenders and insurers; insurers usually charge less (Triple-I) and prices vary (CFPB); rolling it into the loan adds interest; optional gap can be cancelled. | `iii-what-is-gap-insurance`, `cfpb-what-is-gap-insurance`, `naic-shopping-tool-auto-2023` | medium |
| `rental-reimbursement-what-it-pays` | Rental reimbursement: what it pays for | Rental reimbursement pays a capped daily amount for a limited number of days while your car is repaired after a covered loss; it is optional. | `naic-shopping-tool-auto-2023`, `naic-what-does-auto-insurance-cover`, `naic-consumer-insight-right-protection` | high |
| `rental-reimbursement-limit-example` | Rental reimbursement: example limits | NAIC's worked example is $20 per day up to $600 total; an illustration, not a typical limit. | `naic-consumer-insight-right-protection` | medium |
| `dropping-collision-comp-affects-rental-coverage` | Dropping collision/comprehensive and rental cars | Your collision and comprehensive generally extend to a personal-use rental, so dropping them may leave a rental unprotected (one source). | `iii-rental-car-insurance` | medium |
| `collision-comp-ten-times-premium-rule` | Rule of thumb for dropping collision/comprehensive | Rule of thumb: if the car is worth less than ten times the premium, collision/comprehensive may not be cost effective (premium of 10% or more of value). | `iii-nine-ways-lower-auto-costs`, `naic-consumers-guide-auto-2022` | high |
| `collision-comp-pays-market-value-only` | What collision and comprehensive can pay | Collision and comprehensive pay repair cost or actual cash value minus the deductible, so on an old car the payout is capped by its low value. | `naic-shopping-tool-auto-2023`, `iii-how-much-auto-coverage`, `naic-consumer-insight-right-protection` | high |
| `collision-comp-lender-requirement` | Who can drop collision/comprehensive | State law does not require collision or comprehensive, but lenders and lessors usually do until the loan is paid off; dropping is an option only for a car owned outright. | `naic-consumers-guide-auto-2022`, `naic-shopping-tool-auto-2023`, `iii-collision-comprehensive`, `iii-auto-insurance-basics` | high |
| `collision-comp-drop-loss-caution` | Cost of dropping coverage | If you drop them you pay for theft, animal-strike and crash repairs or replacement yourself (follows from NAIC definitions, medium). | `naic-shopping-tool-auto-2023`, `naic-consumers-guide-auto-2022` | medium |
| `deductible-trade-off-alternative` | Raising the deductible instead of dropping coverage | A higher deductible lowers the premium (Triple-I: $200 to $500 could cut cost 15 to 30%, $1,000 up to 40% or more); choose one you can afford. | `iii-nine-ways-lower-auto-costs`, `iii-how-much-auto-coverage`, `naic-consumers-guide-auto-2022` | medium |
| `medpay-what-it-pays` | Medical payments (MedPay): what it is | MedPay pays treatment for you and your passengers regardless of fault (NAIC: may extend to funeral costs and pedestrians); PIP in no-fault states also pays lost wages. | `naic-shopping-tool-auto-2023`, `naic-what-does-auto-insurance-cover`, `naic-consumer-insight-right-protection`, `iii-auto-insurance-basics` | high |
| `medpay-pip-state-variation` | MedPay / PIP varies by state | Some states require MedPay or PIP and some do not; give no count and point to the state insurance department. | `naic-consumers-guide-auto-2022`, `naic-what-does-auto-insurance-cover`, `iii-auto-insurance-basics` | high |
| `medpay-health-insurance-coordination` | MedPay and health insurance overlap | NAIC model coordination-of-benefits rule treats auto med pay as an overlapping plan that would normally pay first unless state law says otherwise; it does not show MedPay pays health deductibles. | `naic-coordination-of-benefits-model-regulation` | medium |
| `roadside-towing-what-it-is` | Auto towing / roadside coverage | Towing/roadside is an optional add-on that reimburses a tow or lockout when your car is disabled and raises the premium. | `naic-shopping-tool-auto-2023`, `naic-what-does-auto-insurance-cover`, `naic-consumers-guide-auto-2022` | high |
| `roadside-overlaps-memberships` | Roadside coverage overlap | NAIC: AAA or other memberships may already include some of the same towing and road-service coverage, so check before paying for both. | `naic-consumer-insight-right-protection` | medium |

### Design inputs

| key | what it gives you | facts |
|---|---|---|
| `uninsuredDriverStatistic` | Use exactly one dated IRC figure: 15.4% of drivers uninsured in 2023 (state range 5.7% to 28.2%, no state names); it replaces 'one in eight' (IRC 12.6%, 2019). | `uninsured-share-latest-irc`, `uninsured-share-one-in-eight-is-dated`, `uninsured-share-revised-between-editions` |
| `uninsuredOrUnderinsuredCombined` | IRC 2023: 33.4% uninsured or underinsured; Triple-I's summary gives 18.0% underinsured alone. | `uninsured-underinsured-combined-2023` |
| `umUimStateNeutralCopyRule` | Say UM/UIM requirements and minimums vary by state; never count or name states; UMPD is separate. | `um-uim-requirements-vary-by-state`, `um-property-damage-separate` |
| `limitTiers` | No sourced limit tiers for UM/UIM, MedPay or towing; only NAIC's illustrative rental example ($20 a day, $600) and Triple-I's $500 / $1,000 deductible examples; tiers are a product decision with 'not sure'. | `rental-reimbursement-limit-example`, `deductible-trade-off-alternative` |
| `collisionComprehensiveDropRule` | Drop test: car worth under ten times the premium and no loan or lease; ask whether the person could absorb the loss; a higher deductible is the alternative; dropping may remove rental-car cover; no sourced vehicle-age trigger. | `collision-comp-ten-times-premium-rule`, `collision-comp-pays-market-value-only`, `collision-comp-lender-requirement`, `collision-comp-drop-loss-caution`, `deductible-trade-off-alternative`, `dropping-collision-comp-affects-rental-coverage` |
| `gapCoverageGate` | Ask only when the car is financed or leased (risk markers: down payment under 20%, 60+ month term, negative equity); no prompt for a car owned outright; never say a lender requires gap on a loan. | `gap-what-it-covers`, `gap-when-it-matters`, `gap-lease-and-lender-requirements`, `gap-where-to-buy-and-cautions` |
| `rentalReimbursementPrompt` | Capped daily amount for limited days while your car is repaired; optional; check the daily and total caps on your policy. | `rental-reimbursement-what-it-pays`, `rental-reimbursement-limit-example`, `optional-coverages-priced-separately` |
| `medPayOverlapWithHealth` | MedPay and health cover can overlap; ask both insurers; never claim MedPay pays a health deductible or say which plan pays first. | `medpay-what-it-pays`, `medpay-pip-state-variation`, `medpay-health-insurance-coordination` |
| `roadsideOverlap` | An auto towing add-on may duplicate an auto club or other membership; card benefits come from the card research only. | `roadside-towing-what-it-is`, `roadside-overlaps-memberships` |

### Gaps

1. Consumer Federation of America uninsured-driver figure: no current national uninsured-driver rate from CFA was found. CFA's March 2014 release on uninsured drivers (consumerfed.org) gives affordability framing and a California ZIP-code analysis, with no national rate, so it was not used. The Insurance Research Council is the only source used for the statistic; no 2024 or later IRC uninsured figure was found as of 2026-10-10.
2. A Triple-I state auto affordability outlook (January 2026, https://www.iii.org/sites/default/files/docs/pdf/triple-i_nys_auto_affordability_outlook_01222026.pdf, read via PDF text extraction) quotes a 'U.S. average' of 12.3% uninsured and 16.4% underinsured, citing the IRC 2017-2023 edition. It conflicts with the IRC's own countrywide 15.4% for 2023 and I could not determine the aggregation behind it; not used. The verifier or owner may want to ask the IRC or Triple-I which figure is the countrywide rate.
3. No authoritative source found for typical limit tiers of uninsured/underinsured motorist coverage, MedPay, or towing/roadside add-ons, nor for any guidance that UM/UIM limits should match liability limits. Only NAIC's single rental example ($20 per day, $600 total) was found. The question catalog must treat tiers as a product decision with a Not sure option.
4. No authoritative (NAIC, III, federal) statement was found that MedPay pays the deductible or copays of a health plan, or how a health insurer treats a MedPay payment. The only regulator statement found is the NAIC model coordination-of-benefits drafting note (med pay normally pays first unless state law says otherwise). Insurer and comparison-site pages say more but are excluded by the authority rules.
5. Rental reimbursement: no authoritative source found for typical real-world daily or total limits beyond the single NAIC example, or for the rules when the other driver is at fault or the car is a total loss. A Triple-I page on rental replacement cars (iii.org/article/will-my-insurance-cover-renting-car-after-accident) returned 404 on fetch, so nothing from it is used.
6. Towing/roadside: no authoritative source found for typical limits or prices, and the NAIC pages used do not discuss credit card roadside benefits (those must come from issuer guides in the card research).
7. Collision/comprehensive: no Triple-I, NAIC or federal source was found for a vehicle-age trigger for dropping coverage; the only source (Consumer Reports) was rejected under the authority rules. The Triple-I ten-times-premium rule is the only sourced threshold. Triple-I and NAIC say lenders (and per the NAIC shopping tool, lessors) usually require both coverages.
8. Gap insurance price: Triple-I and the CFPB say prices vary and that insurers may charge less than dealers, but no authoritative typical price was used. The CFPB's description of the two product forms (insurance versus a lender 'waiver') was seen only in a search summary, not on a page I fetched, so it is not included.
9. How many states require UM/UIM: Triple-I counts about 20 jurisdictions, the NAIC 2022 guide says 'some states' and the NAIC 2023 shopping tool says 'most states'. These conflict, so no count is asserted and the copy rule is 'varies by state'.

### Removed or trimmed

| id | kind | why |
|---|---|---|
| `consumer-reports-how-much-car-insurance` | source | Consumer Reports is outside the SPEC authority families (and not on the allowlist); claims that leaned on it are covered by Triple-I or NAIC, or are single-source rules of thumb. |
| `collision-comp-age-trigger` | fact | Its only source (Consumer Reports, rejected) was the sole basis for a 10-year vehicle-age trigger; Triple-I and NAIC give no age rule. |

## 3. Home and renters (`home-and-renters`)

File `research/home-and-renters.mjs`. Retrieved 2026-10-10. 26 sources, 32 facts, 10 design inputs, 9 gaps, 2 removed or trimmed entries.

### Sources

| id | publisher | title | type | url |
|---|---|---|---|---|
| `iii-disasters-covered-homeowners` | Insurance Information Institute | Which disasters are covered by homeowners insurance? | industry-nonprofit | <https://www.iii.org/article/which-disasters-are-covered-by-homeowners-insurance> |
| `iii-standard-homeowners-coverage` | Insurance Information Institute | What is covered by standard homeowners insurance? | industry-nonprofit | <https://www.iii.org/article/what-is-covered-by-standard-homeowners-insurance> |
| `iii-house-personal-possessions` | Insurance Information Institute | Insurance for Your House and Personal Possessions | industry-nonprofit | <https://www.iii.org/article/insurance-for-your-house-and-personal-possessions> |
| `iii-sewer-backups` | Insurance Information Institute | Protect your house from sewer backups | industry-nonprofit | <https://www.iii.org/article/protect-your-house-from-sewer-backups> |
| `iii-water-damage-protection` | Insurance Information Institute | How to protect your home from water damage | industry-nonprofit | <https://www.iii.org/article/how-to-protect-your-home-from-water-damage> |
| `iii-flood-insurance` | Insurance Information Institute | Spotlight on: Flood insurance | industry-nonprofit | <https://www.iii.org/article/spotlight-on-flood-insurance> |
| `iii-earthquake-homeowners` | Insurance Information Institute | Earthquake insurance for homeowners | industry-nonprofit | <https://www.iii.org/article/earthquake-insurance-for-homeowners> |
| `iii-sinkholes` | Insurance Information Institute | Sinkholes and insurance | industry-nonprofit | <https://www.iii.org/article/sinkholes-and-insurance> |
| `iii-landslides-mudflow` | Insurance Information Institute | Insurance for landslides and mudflow | industry-nonprofit | <https://www.iii.org/article/insurance-for-landslides-and-mudflow> |
| `iii-am-i-covered` | Insurance Information Institute | Am I Covered? | industry-nonprofit | <https://www.iii.org/article/am-i-covered> |
| `iii-renters-insurance` | Insurance Information Institute | Renters Insurance | industry-nonprofit | <https://www.iii.org/article/renters-insurance> |
| `iii-college-student-losses` | Insurance Information Institute | Protecting your college student from on-campus losses | industry-nonprofit | <https://www.iii.org/article/protecting-your-college-student-from-on-campus-losses> |
| `iii-what-is-umbrella-liability-policy` | Insurance Information Institute | What is an umbrella liability policy? | industry-nonprofit | <https://www.iii.org/article/what-is-an-umbrella-liability-policy> |
| `naic-homeowners-topic` | National Association of Insurance Commissioners | Homeowners Insurance | regulator | <https://content.naic.org/insurance-topics/homeowners-insurance> |
| `naic-homeowners-shopping-tips` | National Association of Insurance Commissioners | Searching for a Homeowners Insurance Policy? Tips to Get the Most Value | regulator | <https://content.naic.org/article/consumer_insight_searching_homeowners_insurance_policy_tips_get_most_value.htm> |
| `naic-endorsement-rider` | National Association of Insurance Commissioners | What is an Insurance Endorsement or Rider? | regulator | <https://content.naic.org/article/consumer-insight-what-insurance-endorsement-or-rider> |
| `naic-understanding-policy` | National Association of Insurance Commissioners | Understanding Your Homeowners or Renter's Policy | regulator | <https://content.naic.org/article/consumer-insight-understanding-your-homeowners-or-renters-policy> |
| `naic-flood-insurance` | National Association of Insurance Commissioners | Flood Insurance | regulator | <https://content.naic.org/consumer/flood-insurance.htm> |
| `naic-earthquake-insurance` | National Association of Insurance Commissioners | Earthquake Insurance | regulator | <https://content.naic.org/cipr-topics/earthquake-insurance> |
| `naic-renters-college-2024` | National Association of Insurance Commissioners | Do I Need Renters Insurance For College? | regulator | <https://content.naic.org/article/do-i-need-renters-insurance-college> |
| `naic-renters-college-students` | National Association of Insurance Commissioners | Renters Insurance for College Students | regulator | <https://content.naic.org/article/consumer-insight-renters-insurance-college-students> |
| `fema-nfip-waiting-period` | FEMA | Waiting Period for Activating Flood Policy? | government | <https://www.fema.gov/faq/waiting-period-activating-flood-policy> |
| `floodsmart-home` | FEMA National Flood Insurance Program (FloodSmart) | Floodsmart \| The National Flood Insurance Program | government | <https://www.floodsmart.gov/> |
| `floodsmart-flood-risk` | FEMA National Flood Insurance Program (FloodSmart) | What is My Flood Risk \| The National Flood Insurance Program | government | <https://www.floodsmart.gov/flood-zones-and-maps/what-is-my-flood-risk> |
| `floodsmart-renew-policy` | FEMA National Flood Insurance Program (FloodSmart) | Renew a Policy \| National Flood Insurance Program | government | <https://www.floodsmart.gov/get-insured/renew-a-policy> |
| `floodsmart-agents-flood-101` | FEMA National Flood Insurance Program (FloodSmart) | Flood Insurance 101 \| The National Flood Insurance Program for Agents | government | <https://agents.floodsmart.gov/topics/flood-insurance-101> |

### Facts

| id | topic | claim (short) | sources | confidence |
|---|---|---|---|---|
| `water-backup-excluded-standard` | Sewer and drain backup: standard exclusion | A typical homeowners policy excludes sewer and drain backup, and Triple-I says flood insurance does not cover it either. | `iii-disasters-covered-homeowners` | high |
| `water-backup-policies-vary` | Sewer and drain backup: varies by policy | Some homeowners policies include backup cover but many do not, so check your own policy. | `iii-water-damage-protection`, `iii-disasters-covered-homeowners` | high |
| `water-backup-add-by-endorsement` | Sewer and drain backup: how to add it | Backup cover is added by endorsement (rider) or a separate product, for a nominal cost; NAIC lists it among common add-ons; no sourced price or limit. | `iii-disasters-covered-homeowners`, `iii-sewer-backups`, `naic-homeowners-topic`, `naic-homeowners-shopping-tips`, `naic-endorsement-rider` | high |
| `water-backup-flood-policy-nuance` | Sewer backup and flood policies | An NFIP policy pays sewer-backup damage only when it results directly from a flood, so a flood policy is not a substitute for backup cover (medium). | `floodsmart-home`, `iii-disasters-covered-homeowners` | medium |
| `sump-pump-overflow-mold-excluded` | Sump pump overflow (and mold) | NAIC: many policies exclude mold or sump pump overflow and an endorsement can add it; backup and sump pump overflow are rider examples. | `naic-endorsement-rider`, `naic-homeowners-shopping-tips` | high |
| `burst-pipe-covered-seepage-excluded` | Sudden water damage versus seepage | Burst pipes and wind-driven rain are generally covered; seepage is a maintenance exclusion under the common HO-3 form (medium). | `iii-water-damage-protection`, `iii-am-i-covered` | medium |
| `flood-excluded-homeowners` | Flood: homeowners exclusion | Standard homeowners and renters policies do not cover flood; it is bought separately through the NFIP or private insurers. | `iii-disasters-covered-homeowners`, `iii-flood-insurance`, `naic-flood-insurance`, `floodsmart-home` | high |
| `flood-nfip-and-private` | Flood: NFIP and private options | FEMA runs the NFIP and private insurers also sell flood cover, possibly with higher limits or broader coverage (NAIC). | `naic-flood-insurance`, `iii-flood-insurance`, `floodsmart-home` | high |
| `flood-nfip-limits` | Flood: NFIP coverage amounts | NFIP structure cover up to $250,000 and contents up to $100,000 for extra premium; confirm current limits at floodsmart.gov (medium). | `naic-flood-insurance`, `iii-flood-insurance` | medium |
| `flood-waiting-period` | Flood: 30-day waiting period | A new NFIP flood policy usually takes effect 30 days after purchase, also after a lapse; some private policies have the same wait. | `fema-nfip-waiting-period`, `floodsmart-agents-flood-101`, `floodsmart-renew-policy`, `naic-flood-insurance` | high |
| `flood-waiting-period-exceptions` | Flood: waiting period exceptions | The 30-day wait is shortened in some cases: mortgage-related purchases, a renewal-bill option, within 13 months of a map revision; NAIC: bought with a new home. | `floodsmart-agents-flood-101`, `naic-flood-insurance` | high |
| `flood-claims-outside-high-risk` | Flood: losses outside high-risk zones | About 29% (nearly one-third) of NFIP claims from 2014 to 2024 came from outside current high-risk flood zones. | `floodsmart-flood-risk`, `floodsmart-agents-flood-101`, `floodsmart-home`, `naic-flood-insurance` | high |
| `earthquake-excluded` | Earthquake: homeowners exclusion | Homeowners and renters policies exclude earthquake; cover is usually an endorsement, or a stand-alone policy. | `iii-earthquake-homeowners`, `naic-earthquake-insurance`, `naic-homeowners-shopping-tips`, `iii-disasters-covered-homeowners` | high |
| `earthquake-fire-following-covered` | Earthquake: fire afterward | Fire that follows an earthquake is generally covered, with extra living costs; the quake damage itself is not. | `iii-earthquake-homeowners` | high |
| `earthquake-deductible-percentage` | Earthquake: deductibles | Earthquake policies usually carry deductibles of 5 to 15 percent of the policy limit. | `iii-earthquake-homeowners` | high |
| `landslide-sinkhole-mudflow-excluded` | Landslide, sinkhole and mudflow | Landslide and sinkhole are excluded earth movement; mudflow is excluded but can be covered by flood insurance; earthquake policies do not cover landslides. | `iii-landslides-mudflow`, `iii-sinkholes`, `iii-disasters-covered-homeowners` | high |
| `sinkhole-coverage-varies-by-state` | Sinkhole coverage and state rules | Some states require insurers to offer optional sinkhole cover, so availability depends on where you live; keep copy state-neutral. | `iii-sinkholes` | high |
| `contents-percent-of-dwelling` | Contents coverage as a share of the dwelling limit | Contents cover is generally 50 to 70 percent of the dwelling insurance; valuables carry separate limits. | `iii-standard-homeowners-coverage`, `iii-house-personal-possessions` | high |
| `off-premises-belongings-covered` | Off-premises belongings | Contents cover extends to belongings away from home, described as covered anywhere in the world (undated sources). | `iii-standard-homeowners-coverage`, `iii-am-i-covered` | high |
| `off-premises-cap-ten-percent` | Off-premises limit | Some insurers cap off-premises belongings at 10% of the contents limit (Triple-I example: $25,000 gives up to $2,500). | `iii-standard-homeowners-coverage`, `iii-renters-insurance` | medium |
| `student-dorm-covered-by-parents` | Student in a dorm: parents' policy | A dorm student still in the parents' household generally has belongings covered by the parents' policy (NAIC: under 26, enrolled, on campus); the deductible applies. | `iii-college-student-losses`, `iii-renters-insurance`, `iii-am-i-covered`, `naic-renters-college-2024`, `naic-renters-college-students` | high |
| `student-dorm-limit` | Student in a dorm: how much is covered | Dorm cover is typically about 10% of the parents' contents limit (one undated Triple-I brochure); NAIC says only up to a specified amount. | `iii-am-i-covered`, `naic-renters-college-2024` | medium |
| `student-off-campus-not-covered` | Student off campus: parents' policy | A student living off campus is likely not covered by the parents' policy and probably needs their own renters policy. | `iii-college-student-losses`, `iii-renters-insurance`, `iii-am-i-covered`, `naic-renters-college-students` | high |
| `school-landlord-insurance-not-covering-belongings` | School or landlord insurance | Insurance carried by a school, landlord or property manager does not cover a student's personal items. | `naic-renters-college-2024` | high |
| `student-renters-decision-factors` | When a student's own renters policy is or is not needed | NAIC: consider renters insurance on or off campus because the parents' cover may pay only up to a set amount; weigh item value and replacement cost. | `naic-renters-college-2024`, `naic-renters-college-students` | high |
| `valuables-special-limits` | Valuables and electronics | Jewelry, furs, art and similar items usually have theft dollar limits; Triple-I suggests a floater or endorsement; costly electronics may be limited. | `iii-standard-homeowners-coverage`, `iii-college-student-losses` | high |
| `med-pay-what-it-is` | Medical payments to others: definition | Medical payments to others is no-fault cover: injured guests or neighbors can have bills paid without a liability claim against you. | `iii-standard-homeowners-coverage`, `iii-am-i-covered`, `naic-understanding-policy` | high |
| `med-pay-excludes-own-household` | Medical payments to others: who is not covered | Medical payments to others does not pay the medical bills of your own family or your pet. | `iii-standard-homeowners-coverage`, `iii-renters-insurance` | high |
| `med-pay-typical-amount` | Medical payments to others: typical amount | Triple-I: medical payments cover can generally be bought in amounts of $1,000 to $5,000 (stated on its renters page, medium). | `iii-renters-insurance` | medium |
| `liability-limits-start-100k` | Personal liability: typical starting amount | Homeowners liability limits generally start at about $100,000 (Triple-I's standard amount) and pay defense costs and court awards. | `iii-standard-homeowners-coverage`, `iii-am-i-covered`, `iii-renters-insurance` | high |
| `liability-umbrella-prerequisite` | Personal liability: amount insurers want before an umbrella | Most insurers want about $300,000 home and $250,000 auto liability before they sell an umbrella. | `iii-what-is-umbrella-liability-policy` | high |
| `liability-expert-suggested-300k` | Personal liability: suggested level | Triple-I notes some experts recommend at least $300,000 of liability protection (renters page, medium). | `iii-renters-insurance` | medium |

### Design inputs

| key | what it gives you | facts |
|---|---|---|
| `homeLiabilityTiers` | 100,000 typical start; about 300,000 before an umbrella; 500,000 and 1,000,000 are buyer-chosen presets with no sourced 'typical' status; keep 'not sure'. | `liability-limits-start-100k`, `liability-umbrella-prerequisite`, `liability-expert-suggested-300k` |
| `contentsAndOffPremises` | Contents 50 to 70 percent of dwelling; off-premises cap sometimes 10 percent ('some companies'); dorm student typically about 10 percent (one undated brochure); always hedged. | `contents-percent-of-dwelling`, `off-premises-cap-ten-percent`, `student-dorm-limit` |
| `medicalPaymentsToOthers` | Definition (guests, not your own household) and a $1,000 to $5,000 range from Triple-I's renters page. | `med-pay-typical-amount`, `med-pay-what-it-is`, `med-pay-excludes-own-household` |
| `medPayVersusHealthInsurance` | Home med-pay covers other people's injuries, so it does not duplicate your own health plan; the closer overlap is auto MedPay (auto file). | `med-pay-what-it-is`, `med-pay-excludes-own-household` |
| `floodRules` | Flood is excluded from standard policies; waiting period usually 30 days with exceptions; 29 percent of NFIP claims (2014 to 2024) came from outside high-risk zones; NFIP $250,000 structure and $100,000 contents (confirm at floodsmart.gov). | `flood-waiting-period`, `flood-waiting-period-exceptions`, `flood-claims-outside-high-risk`, `flood-nfip-limits`, `flood-excluded-homeowners`, `flood-nfip-and-private` |
| `sewerBackupRules` | Typical policies exclude backup but some include it; added by endorsement for a nominal cost (no price or limit); a flood policy is not a substitute; ask 'is backup cover on my policy' (yes / no / not sure gate). | `water-backup-excluded-standard`, `water-backup-flood-policy-nuance`, `water-backup-policies-vary`, `water-backup-add-by-endorsement`, `sump-pump-overflow-mold-excluded`, `burst-pipe-covered-seepage-excluded` |
| `earthMovementRules` | Earthquake, landslide, sinkhole and mudflow facts for the fast-follow; sinkhole availability varies by state, so stay state-neutral. | `earthquake-excluded`, `earthquake-fire-following-covered`, `earthquake-deductible-percentage`, `landslide-sinkhole-mudflow-excluded`, `sinkhole-coverage-varies-by-state` |
| `waterDamageSublimit` | Dropped: its only source was one state regulator's release (not allowlisted, names a state); ship only with an NAIC or Triple-I national source. | - |
| `studentAndRentersRules` | Table of student situations (dorm, off campus, valuables, school insurance) and how likely the parents' policy covers them; overlap is a Question item, never a Drop; always 'generally'. | `student-dorm-covered-by-parents`, `student-dorm-limit`, `student-off-campus-not-covered`, `valuables-special-limits`, `school-landlord-insurance-not-covering-belongings`, `student-renters-decision-factors` |
| `statePhrasing` | Say 'your policy' or 'your state's department of insurance'; never name a state in a flag. | - |

### Gaps

1. A current price or typical limit for a sewer or drain backup endorsement: III says only 'nominal cost'; the dollar ranges seen in search results came from insurer, agency or comparison sites and were not used.
2. Water-damage sub-limits: the only authoritative item found was one state regulator's news release, which was removed (host not on the allowlist, state-specific); there is no NAIC or III national statement and no typical sublimit amounts from a national source.
3. A homeowners-specific typical range for medical payments to others: the only figure ($1,000 to $5,000) is on III's renters page.
4. Authoritative 'typical' homeowners liability tiers above $300,000 (the SPEC presets 500,000 and 1,000,000): III describes only $100,000 as the usual start and about $300,000 as the umbrella prerequisite.
5. The standard ISO HO-3 sample form hosted by III (would show exact off-premises, student and exclusion wording) and the NAIC 'A Consumer's Guide to Home Insurance' PDF could not be read as text (one is encrypted, the other is a scanned image), so neither is cited.
6. FEMA's 'Myths and Facts About Flood Insurance' fact sheet and the NFIP 'Why Do I Need Flood Insurance?' brochure are PDFs that could not be read as text, so they are not cited; the FloodSmart web pages carry the same points.
7. Whether private flood policies' waiting periods differ from NFIP's: the NAIC says some private policies have a 30-day wait; no source on shorter waits was verified.
8. Any NAIC or III statement of which states mandate offering sewer or water backup endorsements: a search summary hinted that at least one state does, but no page was fetched, so nothing is recorded.
9. A current NFIP source stating the 13-month map-revision rule on a consumer (not agent) page: it appears only on the FloodSmart agents page.

### Removed or trimmed

| id | kind | why |
|---|---|---|
| `wa-oic-water-damage-sublimits` | source | Host insurance.wa.gov is not on the allowlist; original kept in the file for reinstatement. |
| `water-damage-sublimit-exists` | fact | Its only source was one state regulator's news release; that host is not on the S3a authority allowlist and citing it would put a state's name in the user-facing source line. See DECISIONS S3a-home-1. |

## 4. Health and supplemental (`health-supplemental`)

File `research/health-supplemental.mjs`. Retrieved 2026-10-10. 24 sources, 28 facts, 11 design inputs, 11 gaps, 6 removed or trimmed entries.

### Sources

| id | publisher | title | type | url |
|---|---|---|---|---|
| `healthcare-gov-glossary-deductible` | HealthCare.gov (U.S. Centers for Medicare & Medicaid Services) | Deductible - Glossary \| HealthCare.gov | government | <https://www.healthcare.gov/glossary/deductible/> |
| `healthcare-gov-glossary-out-of-pocket-maximum` | HealthCare.gov (U.S. Centers for Medicare & Medicaid Services) | Out-of-pocket maximum/limit - Glossary \| HealthCare.gov | government | <https://www.healthcare.gov/glossary/out-of-pocket-maximum-limit/> |
| `healthcare-gov-glossary-hsa` | HealthCare.gov (U.S. Centers for Medicare & Medicaid Services) | Health Savings Account (HSA) - Glossary \| HealthCare.gov | government | <https://www.healthcare.gov/glossary/health-savings-account-hsa/> |
| `healthcare-gov-glossary-open-enrollment` | HealthCare.gov (U.S. Centers for Medicare & Medicaid Services) | Open Enrollment Period - Glossary \| HealthCare.gov | government | <https://www.healthcare.gov/glossary/open-enrollment-period/> |
| `healthcare-gov-dates-and-deadlines` | HealthCare.gov (U.S. Centers for Medicare & Medicaid Services) | When can you get health insurance? \| HealthCare.gov | government | <https://www.healthcare.gov/quick-guide/dates-and-deadlines/> |
| `healthcare-gov-pre-existing-conditions` | HealthCare.gov (U.S. Centers for Medicare & Medicaid Services) | Marketplace health plans cover pre-existing conditions \| HealthCare.gov | government | <https://www.healthcare.gov/coverage/pre-existing-conditions/> |
| `healthcare-gov-what-marketplace-plans-cover` | HealthCare.gov (U.S. Centers for Medicare & Medicaid Services) | Find out what Marketplace health insurance plans cover \| HealthCare.gov | government | <https://www.healthcare.gov/coverage/what-marketplace-plans-cover/> |
| `cms-stldi-fixed-indemnity-fact-sheet-2024` | U.S. Centers for Medicare & Medicaid Services | Short-Term, Limited-Duration Insurance and Independent, Noncoordinated Excepted Benefits Coverage (CMS-9904-F) Fact Sheet | government | <https://www.cms.gov/newsroom/fact-sheets/short-term-limited-duration-insurance-and-independent-noncoordinated-excepted-benefits-coverage-cms> |
| `dol-aca-faqs-part-72` | U.S. Department of Labor (Employee Benefits Security Administration), with HHS and Treasury | FAQs about Affordable Care Act Implementation Part 72 | government | <https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/faqs/aca-part-72> |
| `dol-stldi-agencies-statement-2025` | U.S. Department of Labor (Employee Benefits Security Administration), with HHS and Treasury | Statement of U.S. Departments of Labor, Health and Human Services, and the Treasury regarding short-term, limited-duration insurance | government | <https://www.dol.gov/agencies/ebsa/laws-and-regulations/laws/affordable-care-act/for-employers-and-advisers/short-term-limited-duration-insurance/stldi-statement-08-07-2025> |
| `dol-stldi-resource-page` | U.S. Department of Labor (Employee Benefits Security Administration) | Short Term, Limited Duration Insurance \| U.S. Department of Labor | government | <https://www.dol.gov/agencies/ebsa/laws-and-regulations/laws/affordable-care-act/for-employers-and-advisers/short-term-limited-duration-insurance> |
| `naic-stldi-topic` | National Association of Insurance Commissioners | Short-Term Limited-Duration Health Plans | regulator | <https://content.naic.org/insurance-topics/short-term-limited-duration-health-plans> |
| `ftc-open-enrollment-scams-2025` | U.S. Federal Trade Commission (Consumer Advice) | How to avoid health insurance scams this open enrollment season | government | <https://consumer.ftc.gov/consumer-alerts/2025/12/how-avoid-health-insurance-scams-open-enrollment-season> |
| `irs-pub-969-2025` | Internal Revenue Service | Publication 969 (2025), Health Savings Accounts and Other Tax-Favored Health Plans | government | <https://www.irs.gov/publications/p969> |
| `irs-rev-proc-2025-19` | Internal Revenue Service | Rev. Proc. 2025-19 | government | <https://www.irs.gov/pub/irs-drop/rp-25-19.pdf> |
| `irs-rev-proc-2026-24` | Internal Revenue Service | Rev. Proc. 2026-24 | government | <https://www.irs.gov/pub/irs-drop/rp-26-24.pdf> |
| `iii-understanding-your-insurance-deductibles` | Insurance Information Institute | Understanding your insurance deductibles | industry-nonprofit | <https://www.iii.org/article/understanding-your-insurance-deductibles> |
| `naic-tips-saving-on-auto-insurance` | National Association of Insurance Commissioners | Tips for Saving on your Auto Insurance | regulator | <https://content.naic.org/article/consumer-insight-tips-saving-your-auto-insurance> |
| `fed-shed-2025-savings-and-investments` | Board of Governors of the Federal Reserve System | Report on the Economic Well-Being of U.S. Households in 2025 - May 2026: Savings and Investments | government | <https://www.federalreserve.gov/publications/2026-economic-well-being-of-us-households-in-2025-savings-investments.htm> |
| `fed-shed-2025-economic-hardships` | Board of Governors of the Federal Reserve System | Report on the Economic Well-Being of U.S. Households in 2025 - May 2026: Economic Hardships | government | <https://www.federalreserve.gov/publications/2026-economic-well-being-of-us-households-in-2025-economic-hardships.htm> |
| `naic-what-does-auto-insurance-cover` | National Association of Insurance Commissioners | What Does Auto Insurance Cover? | regulator | <https://content.naic.org/article/what-you-should-know-about-auto-insurance-coverage> |
| `iii-auto-insurance-basics` | Insurance Information Institute | Auto insurance basics—understanding your coverage | industry-nonprofit | <https://www.iii.org/article/auto-insurance-basics-understanding-your-coverage> |
| `iii-standard-homeowners-coverage` | Insurance Information Institute | What is covered by standard homeowners insurance? | industry-nonprofit | <https://www.iii.org/article/what-is-covered-by-standard-homeowners-insurance> |
| `naic-coordination-of-benefits-model-regulation` | National Association of Insurance Commissioners | Coordination of Benefits Model Regulation | regulator | <https://content.naic.org/sites/default/files/model-law-120.pdf> |

### Facts

| id | topic | claim (short) | sources | confidence |
|---|---|---|---|---|
| `fixed-indemnity-not-substitute-for-comprehensive-coverage` | Fixed and hospital indemnity coverage | Hospital and other fixed indemnity cover pays a set cash benefit; federal regulators say it is not a substitute for comprehensive coverage. | `cms-stldi-fixed-indemnity-fact-sheet-2024` | high |
| `supplemental-product-types-federal-categories` | Accident, cancer and critical-illness style products | Federal law: accident or disability-only cover is generally not health coverage; cancer/specified-disease and hospital/fixed indemnity policies are excepted benefits outside most ACA rules. | `dol-aca-faqs-part-72` | high |
| `limited-benefit-plans-marketed-as-comprehensive` | Limited-benefit plans around open enrollment | FTC warns that some comprehensive-sounding ads are really limited-benefit or discount plans and points to HealthCare.gov (medium). | `ftc-open-enrollment-scams-2025` | medium |
| `stldi-lacks-federal-aca-protections` | Short-term plans vs ACA and employer coverage | Short-term plans are generally outside federal protections on health-status discrimination, pre-existing exclusions and dollar limits; they may not cover pre-existing conditions or essential benefits. | `cms-stldi-fixed-indemnity-fact-sheet-2024`, `naic-stldi-topic` | high |
| `marketplace-plans-cover-preexisting-conditions-and-ehb` | What ACA Marketplace plans must cover | All Marketplace plans must cover pre-existing conditions and the 10 essential health benefit categories. | `healthcare-gov-pre-existing-conditions`, `healthcare-gov-what-marketplace-plans-cover` | high |
| `stldi-2024-rule-duration-limits` | Short-term plan duration: the 2024 federal rule as written | 2024 federal rule: initial term up to three months, four months in total, for plans sold on or after 2024-09-01; do NOT present as the current limit. | `cms-stldi-fixed-indemnity-fact-sheet-2024` | high |
| `stldi-2025-enforcement-pause` | Short-term plan duration: August 2025 enforcement statement | On 2025-08-07 the agencies said they will not prioritize enforcing the 2024 short-term plan definition and plan new rulemaking; states can differ. | `dol-stldi-agencies-statement-2025` | high |
| `stldi-federal-status-2026-10-10` | Short-term plan federal rules: status as of 2026-10-10 | As of 2026-10-10 Labor lists nothing newer than the August 2025 statement and NAIC expects a revised federal rule in 2026 (medium; re-check). | `dol-stldi-resource-page`, `naic-stldi-topic` | medium |
| `stldi-state-variation` | Short-term plans vary by state | Several states regulate or limit short-term plans and some ban them, so what you can buy depends on where you live. | `naic-stldi-topic` | high |
| `hsa-eligibility-requires-hdhp` | HSA eligibility | You can contribute to an HSA only with a high-deductible plan on the first of the month and no other disqualifying coverage, Medicare or dependent status. | `irs-pub-969-2025`, `healthcare-gov-glossary-hsa` | high |
| `hsa-hdhp-thresholds-2026-2027` | HDHP definition: dollar thresholds | HDHP thresholds: 2026 deductible at least $1,700/$3,400 and out-of-pocket max $8,500/$17,000; 2027 $1,750/$3,500 and $8,700/$17,400; year-specific. | `irs-rev-proc-2025-19`, `irs-rev-proc-2026-24` | high |
| `hsa-tax-advantages` | HSA tax advantages | HSA contributions are deductible, growth is untaxed and qualified withdrawals are tax-free; balances roll over and move with you (federal tax only). | `irs-pub-969-2025`, `healthcare-gov-glossary-hsa` | high |
| `hsa-compatible-with-limited-supplemental-coverage` | HSA and supplemental policies | Specific-disease or fixed-per-day hospital cover does not by itself block HSA contributions (medium). | `irs-pub-969-2025` | medium |
| `hsa-vs-health-fsa` | HSA vs FSA basic differences | A health FSA is employer-run and use-it-or-lose-it (2.5-month grace or $660 carryover in 2025, not both); an HSA is yours and carries over. | `irs-pub-969-2025` | high |
| `deductible-definition` | Deductible definition (health) | A deductible is what you pay for covered health services before your plan starts paying (HealthCare.gov $2,000 example). | `healthcare-gov-glossary-deductible` | high |
| `out-of-pocket-maximum-definition` | Out-of-pocket maximum definition | The out-of-pocket maximum is the most you pay for covered in-network care in a plan year; premiums and out-of-network care do not count. | `healthcare-gov-glossary-out-of-pocket-maximum` | high |
| `marketplace-out-of-pocket-limits-2026-2027` | Marketplace out-of-pocket limits | Marketplace out-of-pocket limits: up to $10,600 one person / $21,200 family in 2026; $12,000 / $24,000 in 2027 (medium). | `healthcare-gov-glossary-out-of-pocket-maximum` | medium |
| `deductible-premium-tradeoff-and-affordability` | Choosing a deductible you can absorb (auto and home) | A bigger deductible generally means a lower premium; Triple-I and NAIC say check you can absorb the larger share of a loss first. | `iii-understanding-your-insurance-deductibles`, `naic-tips-saving-on-auto-insurance` | high |
| `home-auto-deductible-forms-and-ranges` | How home deductibles are expressed | Triple-I: most home and renters insurers offer a minimum deductible of $500 or $1,000; wind/hail is often 1% to 5%; earthquake 2% to 20%. | `iii-understanding-your-insurance-deductibles` | high |
| `shed-400-expense-cash-2025` | Small emergency expense from cash or savings (2025 data) | Fed 2025 survey: 63% of adults would cover a $400 emergency with cash or equivalent, 12% could not pay it, and 55% have a three-month rainy-day fund. | `fed-shed-2025-savings-and-investments` | high |
| `shed-savings-only-largest-expense-2025` | How large an expense adults could cover from savings alone (2025 data) | Fed 2025: largest expense adults could cover from savings alone: under $1,000 for 39%, $1,000 to $4,999 for 23%, $5,000 or more for 38%. | `fed-shed-2025-savings-and-investments` | high |
| `shed-unexpected-medical-expense-2025` | Size and frequency of unexpected medical bills (2025 data) | Fed 2025: 21% of adults had an unexpected major medical expense (30% vehicle repair, 22% house or appliance); median about $1,000 to $1,999 across the three types. | `fed-shed-2025-economic-hardships` | high |
| `shed-skipped-care-and-medical-debt-2025` | Cost-related care avoidance and medical debt (2025 data) | Fed 2025: 26% of adults went without care they could not afford and 18% had medical debt. | `fed-shed-2025-economic-hardships` | high |
| `marketplace-open-enrollment-dates-2027` | HealthCare.gov Marketplace open enrollment | HealthCare.gov open enrollment for 2027 coverage runs November 1 to January 15; choose by December 15 for a January 1 start; later generally needs a special enrollment period. | `healthcare-gov-dates-and-deadlines`, `healthcare-gov-glossary-open-enrollment` | high |
| `employer-open-enrollment-set-by-employer` | Employer open enrollment timing | Job-based plans may have different open enrollment periods; check with your employer (no typical window is sourced). | `healthcare-gov-glossary-open-enrollment` | high |
| `auto-medpay-pip-definition` | Auto medical payments and PIP | Auto MedPay or PIP pays treatment for you and your passengers (PIP can add lost wages and funeral costs); many states require one; no-fault states pay regardless of fault. | `naic-what-does-auto-insurance-cover`, `iii-auto-insurance-basics` | high |
| `auto-medpay-coordination-of-benefits-model` | Auto med-pay and health plan coordination | NAIC model regulation counts auto med pay as a plan that can overlap with health cover; its drafting note says it would normally be primary unless state law says otherwise (medium). | `naic-coordination-of-benefits-model-regulation` | medium |
| `home-medical-payments-to-others-guests-only` | Home 'medical payments to others' | Home 'medical payments' pays guests, friends and neighbors hurt at your home, not your own family or pet, so it does not duplicate your health plan. | `iii-standard-homeowners-coverage` | high |

### Design inputs

| key | what it gives you | facts |
|---|---|---|
| `asOf` | Date the design inputs were last checked (2026-10-10). | - |
| `note` | Says these items are hints for the S5 questions and S10 flags, each listing its supporting facts. | - |
| `scope` | Never judge plan adequacy; facts support definitions, category differences and 'ask your insurer' prompts only. | `deductible-definition`, `out-of-pocket-maximum-definition` |
| `medicalRiderOverlap` | Auto MedPay/PIP is the real overlap with health cover; home med-pay covers guests only; do not state which pays first, whether it is required, or that it pays a health deductible; includes a suggested ask. | `auto-medpay-pip-definition`, `auto-medpay-coordination-of-benefits-model`, `home-medical-payments-to-others-guests-only` |
| `supplementalBoltOns` | May state: set cash payout, not a substitute for comprehensive coverage, the usual types. Do not state 'often redundant'; keep the Question-to-Drop shape (what it is, then is the payout worth the premium). | `fixed-indemnity-not-substitute-for-comprehensive-coverage`, `supplemental-product-types-federal-categories`, `limited-benefit-plans-marketed-as-comprehensive`, `hsa-compatible-with-limited-supplemental-coverage` |
| `shortTermPlans` | Outside federal ACA protections, may exclude pre-existing conditions, vary by state; never print a specific duration; state of play as of 2026-10-10, re-check before launch. | `stldi-lacks-federal-aca-protections`, `marketplace-plans-cover-preexisting-conditions-and-ehb`, `stldi-2024-rule-duration-limits`, `stldi-2025-enforcement-pause`, `stldi-federal-status-2026-10-10`, `stldi-state-variation` |
| `hsaNudge` | Gate on the user having a high-deductible plan with an HSA; three federal tax advantages, carryover, HSA vs FSA; thresholds are year-specific (2026 and 2027 included); no usage statistic is sourced. | `hsa-eligibility-requires-hdhp`, `hsa-hdhp-thresholds-2026-2027`, `hsa-tax-advantages`, `hsa-vs-health-fsa`, `hsa-compatible-with-limited-supplemental-coverage` |
| `deductibleVsCushion` | Fed survey shares for the cushion bands (39% / 23% / 38%; define the $5,000 edge), deductible anchors, percentage deductibles, and 'the deductible is not the worst case'; flag only as 'build the cushion or reconsider the deductible'. | `shed-savings-only-largest-expense-2025`, `shed-unexpected-medical-expense-2025`, `shed-400-expense-cash-2025`, `home-auto-deductible-forms-and-ranges`, `hsa-hdhp-thresholds-2026-2027`, `marketplace-out-of-pocket-limits-2026-2027`, `deductible-definition`, `out-of-pocket-maximum-definition`, `deductible-premium-tradeoff-and-affordability`, `shed-skipped-care-and-medical-debt-2025` |
| `openEnrollmentFraming` | Mention open enrollment only in health copy; Marketplace dates for 2027 are sourced; employers set their own dates (no typical window). | `marketplace-open-enrollment-dates-2027`, `employer-open-enrollment-set-by-employer`, `limited-benefit-plans-marketed-as-comprehensive` |
| `plannedFlagSourcePicks` | Suggested source ids per planned S10 flag, for S3b to register. | - |
| `stateNeutrality` | No state is treated as the authority; say 'your state's department of insurance'. | - |

### Gaps

1. Current federal short-term limited-duration insurance rule: could not confirm whether a 2026 proposed or final rule has been published. The Federal Register site blocked automated access and the Labor Department page lists nothing newer than the 2025-08-07 statement. A pending White House review record for proposed rule CMS-9881 (received 2026-05-30) exists on reginfo.gov, a host that is not on the allowlist, so it is not cited. The exact consumer notice wording from the 2024 rule was also not read.
2. No authoritative (non-commercial) source was found stating that accident, critical illness, cancer or hospital indemnity policies are 'often redundant' or 'frequently duplicate' good primary coverage plus savings. The SPEC says this; the product should phrase it as a question to ask, not a sourced fact.
3. No III or NAIC consumer page was found that defines accident, critical illness or hospital indemnity products in plain language. The federal categories come from the Labor/HHS/Treasury FAQ and the CMS fact sheet. An NAIC call-materials PDF titled 'Supplemental Benefits' turned out to be an industry trade-group presentation, so it was not used.
4. 'Critical illness' specifically is not named on any authoritative page that was read; it is covered only through the 'specified disease or illness' wording.
5. No authoritative source was found for a typical employer open enrollment window (the SPEC's 'roughly October to early December'). Only the statement that employers set their own dates was found. Medicare and federal-employee windows are out of scope and were not researched.
6. No authoritative source was found on whether holding a short-term plan together with an ACA or employer plan is allowed or what that means for tax credits, and the HealthCare.gov page on which plans count as minimum essential coverage could not be located.
7. No authoritative source was found saying which coverage pays first between auto MedPay and a private health plan. The only support is an NAIC model regulation drafting note; real outcomes depend on state law and policy wording.
8. No authoritative source was found saying auto MedPay can pay a health plan's deductible or copay.
9. No authoritative statistic was found on how many people could cover their specific health deductible from savings. The Federal Reserve data covers general emergency expenses, unexpected medical bills of any size, and savings-only capacity, not deductibles.
10. HSA state tax treatment was not researched; HSA statements are federal only. 2026 and 2027 HSA contribution limits exist in the IRS revenue procedures but are not needed by the product.
11. No allowlisted statistic supports 'the HSA tax advantage is commonly underused'. GAO usage data exists but gao.gov is not on the allowlist, so it is not cited (see rejected).

### Removed or trimmed

| id | kind | why |
|---|---|---|
| `reginfo-stldi-cms-9881-review` | source | Host www.reginfo.gov is not on the allowlist; original kept in the file for reinstatement. |
| `gao-hsa-report-25-107480` | source | Host files.gao.gov is not on the allowlist; original kept in the file for reinstatement. |
| `gao-who-benefits-from-hsas` | source | Host www.gao.gov is not on the allowlist; original kept in the file for reinstatement. |
| `hsa-use-evidence-gao` | fact | Both of its sources are GAO pages (gao.gov, files.gao.gov), which are not on the S3a authority allowlist. |
| `stldi-federal-status-2026-10-10` | fact-trimmed | Dropped source `reginfo-stldi-cms-9881-review`; the fact keeps its other sources. What the dropped source added: the statement that a proposed rule (CMS-9881) was received for White House review on 2026-05-30 and is listed as pending. |
| `hsa-tax-advantages` | fact-trimmed | Dropped source `gao-hsa-report-25-107480`; the fact keeps its other sources. What the dropped source added: the 20% additional tax on non-qualified withdrawals for people under 65 (GAO), plus GAO as a third source for the tax benefits. |

## 5. Other bucket (rental car, roadside, travel, phone, warranty, AD&D) (`other-bucket`)

File `research/other-bucket.mjs`. Retrieved 2026-10-10. 13 sources, 25 facts, 10 design inputs, 13 gaps, 20 removed or trimmed entries.

### Sources

| id | publisher | title | type | url |
|---|---|---|---|---|
| `iii-rental-car-insurance` | Insurance Information Institute | Rental car insurance | industry-nonprofit | <https://www.iii.org/article/rental-car-insurance> |
| `ftc-renting-a-car` | Federal Trade Commission | Renting a Car | government | <https://consumer.ftc.gov/articles/renting-car> |
| `naic-consumer-auto-insurance` | National Association of Insurance Commissioners | Auto Insurance | regulator | <https://content.naic.org/consumer/auto-insurance.htm> |
| `naic-what-does-auto-insurance-cover` | National Association of Insurance Commissioners | What Does Auto Insurance Cover? | regulator | <https://content.naic.org/article/what-you-should-know-about-auto-insurance-coverage> |
| `naic-consumer-insight-right-protection` | National Association of Insurance Commissioners | Does your vehicle have the right protection? Best practices for buying auto insurance | regulator | <https://content.naic.org/article/consumer-insight-does-your-vehicle-have-right-protection-best-practices-buying-auto-insurance> |
| `iii-boat-insurance-and-safety` | Insurance Information Institute | Boat insurance and safety | industry-nonprofit | <https://www.iii.org/article/boat-insurance-and-safety> |
| `naic-should-i-get-travel-insurance` | National Association of Insurance Commissioners | Should I Get Travel Insurance? | regulator | <https://content.naic.org/article/should-i-get-travel-insurance> |
| `iii-should-you-buy-travel-insurance` | Insurance Information Institute | Should you buy travel insurance? | industry-nonprofit | <https://www.iii.org/article/should-you-buy-travel-insurance> |
| `ftc-extended-warranties-service-contracts` | Federal Trade Commission | Extended Warranties and Service Contracts | government | <https://consumer.ftc.gov/articles/extended-warranties-and-service-contracts> |
| `ftc-warranties` | Federal Trade Commission | Warranties | government | <https://consumer.ftc.gov/articles/warranties> |
| `naic-glossary` | National Association of Insurance Commissioners | Glossary of Insurance Terms | regulator | <https://content.naic.org/glossary-insurance-terms> |
| `naic-consumer-life-insurance` | National Association of Insurance Commissioners | Life Insurance | regulator | <https://content.naic.org/consumer/life-insurance.htm> |
| `naic-life-insurance-roadmap` | National Association of Insurance Commissioners | Life Insurance Roadmap | regulator | <https://content.naic.org/article/consumer-insight-life-insurance-roadmap> |

### Facts

| id | topic | claim (short) | sources | confidence |
|---|---|---|---|---|
| `rental-waiver-what-it-is` | Rental car collision / loss damage waiver: what it is | A collision/loss damage waiver is not technically insurance; it relieves you of responsibility for rental damage or theft and can be voided by reckless or impaired driving. | `iii-rental-car-insurance`, `ftc-renting-a-car` | high |
| `rental-waiver-often-unneeded-if-covered` | Rental car waiver may duplicate coverage you already have | With collision and comprehensive on your own car you likely do not need the rental company's waiver (NAIC); check existing coverage first (FTC, Triple-I). | `naic-consumer-auto-insurance`, `ftc-renting-a-car`, `iii-rental-car-insurance` | high |
| `rental-personal-auto-usually-extends` | Personal auto policy and rentals | Your own auto coverage and deductibles generally apply to a personal-use rental; if you dropped collision or comprehensive you may not be covered. | `iii-rental-car-insurance`, `ftc-renting-a-car` | high |
| `rental-decline-without-cover-you-pay` | If you decline the waiver and nothing else covers the rental | If you decline the waiver and nothing else covers the rental you can owe the damage, sometimes up to the car's full value. | `ftc-renting-a-car` | high |
| `rental-card-coverage-usually-secondary` | Credit-card rental coverage is usually secondary and limited | Card rental benefits are usually secondary (pay after your own policy), may cover only your deductible and vary by issuer and card level; ask in writing. | `naic-consumer-auto-insurance`, `iii-rental-car-insurance` | high |
| `rental-card-requires-declining-waiver` | Card rental coverage usually requires declining the waiver | Many cards cover rental collision damage if you pay with the card, but you generally must decline the rental company's waiver (FTC). | `ftc-renting-a-car` | high |
| `rental-liability-state-minimum` | Liability at the rental counter | Rental companies provide only the state-minimum liability; your own higher limits generally apply; non-owners can buy non-owner liability (medium). | `iii-rental-car-insurance` | medium |
| `rental-counter-add-ons-and-costs` | Other rental-counter add-ons and what may already cover them | NAIC: your own liability, health/disability and home or renters cover may already cover rental-counter add-ons; rough per-day prices are given but undated (medium). | `naic-consumer-auto-insurance`, `iii-rental-car-insurance` | medium |
| `roadside-auto-policy-coverage` | Towing / roadside coverage on an auto policy | Roadside/towing on an auto policy reimburses a tow and similar costs when your car is disabled; NAIC calls it optional and separate; no sourced limits. | `naic-what-does-auto-insurance-cover`, `naic-consumer-insight-right-protection` | high |
| `roadside-memberships-may-overlap` | Auto clubs and other memberships may duplicate roadside cover | NAIC: AAA or other memberships may already include some towing and road-service coverage you could buy through your auto policy (medium). | `naic-consumer-insight-right-protection` | medium |
| `roadside-other-vehicles` | Roadside and towing for a motorcycle or boat | An auto policy's towing does not extend to motorcycles, ATVs, RVs or commercial vehicles; Triple-I lists towing among boat-policy coverages; ask, do not assume (medium). | `naic-what-does-auto-insurance-cover`, `iii-boat-insurance-and-safety` | medium |
| `travel-coverage-types` | What travel insurance covers | Travel policies can cover cancellation, interruption and delay, medical, evacuation, AD&D and baggage; Cancel for Any Reason is a costlier add-on that repays only part. | `naic-should-i-get-travel-insurance`, `iii-should-you-buy-travel-insurance` | high |
| `travel-cost-share` | What travel insurance costs | NAIC: travel insurance usually costs about 5% to 10% of the trip price. | `naic-should-i-get-travel-insurance` | high |
| `travel-credit-card-benefits-exist` | Credit-card trip protection may overlap a separate policy | Some cards include trip cancellation and lost-baggage cover; NAIC and Triple-I say check your card's policy; neither says what any card covers. | `naic-should-i-get-travel-insurance`, `iii-should-you-buy-travel-insurance` | high |
| `travel-other-existing-coverage` | Other coverage that may already apply when you travel | Home and renters policies usually cover belongings lost or stolen while traveling; health plans may not cover care abroad, so check both before relying on them. | `naic-should-i-get-travel-insurance`, `iii-should-you-buy-travel-insurance` | high |
| `travel-exclusions-and-limits` | Travel insurance exclusions to check | Each travel policy sets its own limits; ask about insurer approval for care, pre-existing conditions and dangerous activities, and buy early (named storms). | `naic-should-i-get-travel-insurance` | high |
| `travel-accidental-death-duplicate` | Travel accidental-death cover can duplicate life insurance | Triple-I: a travel policy's accidental-death benefit may duplicate your life insurance. | `iii-should-you-buy-travel-insurance` | high |
| `travel-waiver-not-insurance` | Cruise and tour cancellation waivers are not insurance | A cruise or tour cancellation waiver is not insurance: many restrictions, bought at booking, not regulated by state insurance departments. | `iii-should-you-buy-travel-insurance` | high |
| `warranty-extended-is-separate-and-may-overlap` | Extended warranties are optional extras that can overlap the warranty you already have | An extended warranty or service contract costs extra, is sold separately, and the product's own warranty may already cover the same repairs for the same period (FTC). | `ftc-extended-warranties-service-contracts`, `ftc-warranties` | high |
| `warranty-value-questions` | When an extended warranty is poor value | FTC: an extended warranty may not be worth it if repairs are unlikely or it adds nothing beyond the included warranty; check hidden costs; savings may be better. | `ftc-extended-warranties-service-contracts` | high |
| `add-definition-accident-only` | What accidental death and dismemberment (AD&D) coverage is | AD&D pays a stated benefit when an accident (or specified kinds of accident) causes death or dismemberment (NAIC glossary). | `naic-glossary` | high |
| `add-rider-pays-extra-for-accident` | Accidental death benefit rider | An accidental death rider on a life policy pays extra (some double or triple) for accidental death; check how the rider defines an accident. | `naic-consumer-life-insurance` | high |
| `term-life-pays-on-death-in-term` | What term life insurance pays | Term life pays the named beneficiaries if the insured dies during the term; NAIC pages attach no cause-of-death condition (medium; hedge, read exclusions). | `naic-consumer-life-insurance`, `naic-life-insurance-roadmap` | medium |
| `add-employer-coverage-ends-with-job` | Employer life coverage often ends when the job does | Employer-provided life insurance ends if your job situation changes, and retirees are not covered by a former employer's term policy (medium). | `naic-life-insurance-roadmap` | medium |
| `employer-life-typical-size` | Employer life insurance is often a modest amount | NAIC: employer life insurance generally covers about one to two years of pay, which may not cover a mortgage or student loans (medium). | `naic-life-insurance-roadmap` | medium |

### Design inputs

| key | what it gives you | facts |
|---|---|---|
| `rentalCar` | Check your own coverage before paying for the waiver (checklist: collision/comprehensive kept, personal use, card terms, liability limits); NAIC per-day add-on prices are rough and undated; card wording stays 'usually secondary'. | `rental-personal-auto-usually-extends`, `rental-card-coverage-usually-secondary`, `rental-card-requires-declining-waiver`, `rental-liability-state-minimum`, `rental-decline-without-cover-you-pay`, `rental-counter-add-ons-and-costs`, `rental-waiver-what-it-is`, `rental-waiver-often-unneeded-if-covered` |
| `roadsideAndTowing` | Towing is a separate auto-policy coverage and a club may already include some; motorcycle and boat towing is a question about that policy, a club or a card; no sourced limit tiers. | `roadside-auto-policy-coverage`, `roadside-memberships-may-overlap`, `roadside-other-vehicles` |
| `travelInsurance` | Overlaps to check: card trip protection, home/renters baggage cover, accidental death vs life insurance; travel medical is the likelier real gap; policies cost about 5 to 10 percent of trip price; never promise a card covers a trip. | `travel-cost-share`, `travel-coverage-types`, `travel-credit-card-benefits-exist`, `travel-other-existing-coverage`, `travel-exclusions-and-limits`, `travel-accidental-death-duplicate`, `travel-waiver-not-insurance` |
| `phoneProtection` | No sourced facts remain (Consumer Reports removed); a phone flag cannot ship from this file. | - |
| `extendedWarranties` | Optional, costs extra, can repeat the manufacturer's warranty, poor value if it adds nothing; four FTC questions; card extension claims only from the verified card table. | `warranty-extended-is-separate-and-may-overlap`, `warranty-value-questions` |
| `addVersusTermLife` | AD&D pays for accidents only; term life pays if you die during the term; employer life often ends with the job and is about one to two years of pay; bucket is Question, never 'drop it'. | `employer-life-typical-size`, `add-definition-accident-only`, `add-rider-pays-extra-for-accident`, `term-life-pays-on-death-in-term`, `add-employer-coverage-ends-with-job`, `travel-accidental-death-duplicate` |
| `creditCardCrossReference` | Generic card statements supported: rental coverage usually secondary and often needs the waiver declined; some cards include trip cover. No generic support for cellphone, extended warranty or roadside. | `rental-card-coverage-usually-secondary`, `rental-card-requires-declining-waiver`, `travel-credit-card-benefits-exist` |
| `stateNeutralCopyRule` | Where rules vary by state say 'ask your insurer or your state's department of insurance'; never name a state. | - |
| `datedFiguresDoNotQuote` | Do not quote the undated NAIC per-day rental add-on prices as fact (attribute and say 'roughly', or omit). | - |
| `noSourcedLimitTiers` | No sourced limit tiers for towing, roadside, phone or warranty cover; questions here are yes / no / not sure. | - |

### Gaps

1. Phone protection plans: no NAIC, Triple-I, FTC, CFPB or FCC page on carrier or manufacturer phone-protection plans was found (searches on those domains returned nothing relevant). The only material found was Consumer Reports, which is not on the S3a authority allowlist, so every phone fact was removed (see rejected).
2. Credit-card extended warranty: neither FTC warranty page mentions card warranty extensions and no CFPB page was found. The only source was Consumer Reports (not on the allowlist), so no generic card-extension statement is sourced.
3. Primary versus secondary card rental coverage: NAIC, Triple-I and the FTC support 'usually secondary' and 'often requires declining the waiver'. No consumer-agency page found names which cards are primary, so primary coverage for any card must come from the issuer's guide (story S4a). A state insurance regulator's page seen in search results says corporate cards may be primary, but it is specific to one state and was not fetched, so it is not used.
4. Rental coverage outside the United States and the effect of a rental claim on your own premium: neither Triple-I nor the FTC addresses these, and only commercial pages did, so nothing is asserted. Liability coverage on credit cards is also unaddressed by the sources.
5. Rental waiver price: Triple-I and the FTC give no price. The NAIC's roughly $10-$20 a day is undated, and older FTC-related figures seen in search summaries came from reproduced or state documents that were not fetched.
6. Towing and roadside: no authoritative source for typical limits, prices, mileage caps or whether labor is included on an auto-policy add-on. Triple-I's rental and auto-basics pages do not discuss roadside. Consumer Reports prices are 2023 and commercial-example based, so they are not used.
7. Roadside duplication: only the NAIC sentence about memberships supports the overlap. No allowlisted page says a credit-card roadside program duplicates an auto-policy add-on, or how the two coordinate.
8. Motorcycle and boat roadside: Triple-I's motorcycle page does not mention towing or roadside; its boat page lists towing after an accident among common and optional coverages without saying whether it is standard. Nothing authoritative says these usually duplicate car roadside or a card benefit (the spec's claim), so the flag should be a question.
9. Travel insurance: neither the NAIC nor Triple-I says that a card's trip protection makes a separate policy unnecessary, and no source gives card trip-protection limits or whether they are primary. Both only say to check the card. NAIC and Triple-I do not compare travel medical cover with card benefits. A third NAIC page (Globetrotting, 2016) was read but adds nothing beyond the two travel sources used and does not mention credit cards.
10. AD&D: no NAIC, Triple-I or federal consumer page was found that compares employer AD&D with term life directly. Triple-I's life insurance pages did not mention AD&D, riders or cause of death. The support is the NAIC glossary definition and the NAIC page on accidental death riders (federal-plan pages on opm.gov were found but removed because that host is not on the allowlist), so the 'AD&D on top of adequate term life is largely redundant' conclusion is the spec's judgement, supported only in part (travel accidental death 'may be duplicate', per Triple-I).
11. Term life 'regardless of cause': no allowlisted page states it in words (only OPM did, for the federal employees' plan, and opm.gov was removed). NAIC pages say a term policy pays if the insured dies during the term without attaching a cause condition. Contestability, suicide-clause and exclusion terms of real term policies were not found on an authoritative page (the NAIC Life Insurance Buyer's Guide PDF was found but its text could not be extracted with the tools available), so the copy must hedge.
12. Employer AD&D: no authoritative source found for how common employer AD&D riders are, typical amounts, whether private plans can be converted when you leave, or whether employer AD&D ends with the job (the only statements found were OPM's, for the federal plan, and opm.gov was removed).
13. A Triple-I page on rental replacement cars after an accident (also noted in the auto research) is not needed for this bucket and was not used.

### Removed or trimmed

| id | kind | why |
|---|---|---|
| `consumer-reports-roadside-assistance-plan` | source | Host www.consumerreports.org is not on the allowlist; original kept in the file for reinstatement. |
| `consumer-reports-smartphone-insurance` | source | Host www.consumerreports.org is not on the allowlist; original kept in the file for reinstatement. |
| `consumer-reports-credit-card-benefits` | source | Host www.consumerreports.org is not on the allowlist; original kept in the file for reinstatement. |
| `consumer-reports-extended-warranties` | source | Host www.consumerreports.org is not on the allowlist; original kept in the file for reinstatement. |
| `opm-fegli-faq-life-benefits-cause-of-death` | source | Host www.opm.gov is not on the allowlist; original kept in the file for reinstatement. |
| `opm-fegli-faq-add-retirement` | source | Host www.opm.gov is not on the allowlist; original kept in the file for reinstatement. |
| `opm-insurance-glossary` | source | Host www.opm.gov is not on the allowlist; original kept in the file for reinstatement. |
| `roadside-sellers-and-card-variation` | fact | Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist. |
| `roadside-insurer-addon-claims-check` | fact | Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist. |
| `phone-plan-fee-and-deductible` | fact | Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist. |
| `phone-card-protection-conditions` | fact | Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist. |
| `phone-home-renters-may-cover` | fact | Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist. |
| `phone-self-insure-test` | fact | Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist. |
| `warranty-card-extension` | fact | Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist. |
| `warranty-consumer-reports-advice` | fact | Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist. |
| `add-exclusions-federal-example` | fact | Its only source was the OPM insurance glossary (opm.gov), which is not on the S3a authority allowlist. |
| `roadside-memberships-may-overlap` | fact-trimmed | Dropped source `consumer-reports-roadside-assistance-plan`; the fact keeps its other sources. What the dropped source added: Consumer Reports' note that roadside help is sold by car makers, insurers, auto clubs and some credit-card programs. |
| `add-definition-accident-only` | fact-trimmed | Dropped source `opm-fegli-faq-life-benefits-cause-of-death`, `opm-insurance-glossary`; the fact keeps its other sources. What the dropped source added: the limb and eyesight examples and the statement that death or injury from other causes, such as illness, is not paid (OPM federal plan). |
| `term-life-pays-on-death-in-term` | fact-trimmed | Dropped source `opm-fegli-faq-life-benefits-cause-of-death`; the fact keeps its other sources. What the dropped source added: the federal employees' plan statement that the regular life benefit is payable regardless of the cause of death. |
| `add-employer-coverage-ends-with-job` | fact-trimmed | Dropped source `opm-fegli-faq-add-retirement`; the fact keeps its other sources. What the dropped source added: OPM's statement that federal AD&D coverage ends when employment ends and cannot be carried into retirement. |

Decisions that bind later stories are in `docs/DECISIONS.md` (entries starting `S3a-`). Owner follow-ups are in `docs/OPEN-ITEMS.md`.
