# Insurance Overlap & Trim Explainer - Build Handoff

> Source of truth: Claude Doc "Insurance Overlap & Trim Explainer - Claude Code Handoff" (rev 34, 2026-10-10), https://claude.ai/artifact/PJUuh6jWcsSuanazmWzc4s
> This file is a faithful transcription of that doc. Do not edit it to "improve" the spec; record deviations and extensions in `docs/DECISIONS.md`.

A personalized, static web explainer that helps an individual see where their insurance policies overlap or leave gaps, ending in a concrete list of what to raise, drop, or question with their insurer. No document uploads. No AI runtime. A fixed question-and-answer decision tree.

## What this is and why

The product helps a person understand their own insurance portfolio as a whole, rather than shopping each policy in isolation. It surfaces where coverage overlaps (paying twice) and where gaps exist (uncovered exposure), then tells the user specifically what to take to their insurer.

The core insight: owning insurance is not the same as being insured. A person can hold a stack of policies and still not be protected, because a policy full of gaps, exclusions, and underlying-limit mismatches will not pay when they file a claim. The tool exists to reveal that difference, to show where what they own falls short of what they are actually covered against. The overlap-and-trim side is the same portfolio viewed from the other direction: where being insured means paying twice because policies duplicate each other. Both halves come from looking at the policies together rather than one at a time.

Three deliberate design choices:

- No declarations-page upload. Asking people to find and upload policy documents kills conversion and raises a trust barrier. The explainer teaches by example and asks light questions instead.
- No AI at runtime. The logic is relatively static, so a fixed decision tree is cheaper to build, easy to test, and gives every user the same quality answer.
- The payoff is action, not education. The user leaves knowing what to do with their insurance company: what to raise, what to drop, what to question.

The reason for the tool is the year-round overlap-and-trim audit across auto, home, umbrella, and the credit-card duplication layer. It is not an open-enrollment tool. Open enrollment matters only for the health branch: those bolt-on elections (supplemental policies, employer AD&D, voluntary life and disability, HSA versus FSA) are chosen during open enrollment, roughly October into early December, so the health branch is most useful then and its framing can nod to that moment. This is scoped to health and does not change the product's purpose or its timing anywhere else, and it still never moves the tool toward plan adequacy: no diagnosing deductibles, network, or whether a plan is good enough.

## Scope for v1

In scope: Auto, Home, Renters, Umbrella, and Health (narrow scope only, see below), plus an "Other" bucket covering rental car coverage, towing/roadside, travel insurance, phone insurance, extended warranties, and AD&D stacked on term life.

Health is in scope only narrowly. The tool never does health plan adequacy: no diagnosing network or whether a plan is good enough, because that needs the actual plan documents and is the plan-shopping rabbit hole. What is in scope is three things only: the medical-rider overlap between health and the auto/home medical riders, the supplemental bolt-on trims (accident, critical illness, hospital indemnity, cancer, short-term plans, HSA/FSA), and the deductible-vs-cushion check. Full health plan comparison stays out.

Note on value: scope is not about covering more policy types, it is about where types interact. Some combinations interact heavily and some barely at all, so the engine should focus on the interactions below rather than treating each policy as a standalone checklist. One exception: common within-policy gaps (sewer backup and flood on a home policy; uninsured-motorist, loan/lease gap, and over-insured older cars on an auto policy) are standalone flags worth surfacing even though they are not cross-policy interactions, because they are high-impact and widely misunderstood.

## Core logic: the interactions to encode

Overlaps and gaps only exist between policies the user actually holds, so the engine branches off the set they select. The high-value interactions:

- **Auto + Home + Umbrella.** The core of the product and where the large dollar amounts are. The umbrella sets minimum required liability limits on the underlying auto and home policies. Flag two cases: over-buying liability on auto or home when the umbrella already covers it, and under-buying it so there is a gap below where the umbrella attaches.
- **Renters + Homeowners.** A student's renters policy often duplicates a parent's homeowners off-premises coverage. Concrete, easy win.
- **The "Other" bucket.** Quick wins the user feels immediately: rental car coverage duplicated by the auto policy and/or a credit card, travel insurance duplicated by card benefits, phone insurance, extended warranties, and AD&D stacked on term life. Small dollars but common.

Separate data source to build: credit card benefit data (rental car, travel, purchase protection) is not on any policy document. It is publicly available per card but must be built as its own lookup table, keyed by card.

## Question flow and branching

A fixed decision tree. Q1 sets which policies the user holds and drives every downstream branch. Every later question appears only when the relevant policy or item was selected in Q1. Where answers come from a short list, offer presets to tap rather than a blank field, and always include a "not sure" option so the user stays in the flow.

**Q1. Which policies do you have?** Auto, Home, Renters, Umbrella, Health, and the Other-bucket items (rental car, travel insurance, phone insurance, extended warranties, accidental death). Gates everything below.

### Auto + Home + Umbrella core (appears if Umbrella selected)

- Auto liability limit. "What's the most your auto policy will pay if you're at fault in an accident, per person and per accident?" Presets: 100/300, 250/500, 500/500, not sure.
- Umbrella limit. Presets: 1 million, 2 million, 5 million, not sure.
- Home liability limit. "What's the most your home policy pays if someone's hurt on your property or you're liable?" Presets: 300,000, 500,000, 1 million, not sure.
- Umbrella's required home minimum. "What does your umbrella require as a minimum on your home policy?" Presets: 300,000, 500,000, not sure.
- Logic: compare auto and home limits against the umbrella attachment point (flag over- and under-buying), AND compare the home limit against the umbrella's required minimum. If the home limit falls below the required minimum, that's a Raise item, because a gap there can void umbrella coverage on a claim.

### Umbrella scope and adequacy (appears if Umbrella selected)

The core logic above only checks whether the underlying limits are high enough to attach. This branch checks whether the umbrella itself is the right size and shape. People assume an umbrella covers everything; a standard one is liability only, extends auto and home liability, and does nothing for their own property.

- Adequacy vs. exposure. "Roughly, how much would you stand to lose if you were sued, counting savings, home equity, and investments?" Presets as broad bands (under 1 million, 1 to 3 million, over 3 million, not sure), never a dollar figure typed in. Rule of thumb: umbrella should at least cover what a lawsuit could take, so a 1 million umbrella against a larger exposure is a Raise. Keep the bands coarse so no precise net-worth figure is ever collected or stored.
- Uninsured/underinsured motorist on the umbrella. The one people miss most. Many umbrellas do not include UM/UIM by default, so a serious injury caused by an uninsured driver blows past the auto UM limit with nothing above it. Question item: ask whether the umbrella extends UM/UIM, and if not, whether it can be added.
- Scope exclusions. Standard umbrellas commonly exclude business or side-gig activity and sometimes limit personal-injury coverage (libel, slander). Question item: ask what the umbrella excludes, flagged stronger for anyone with a side business. v1 asks the question rather than diagnosing; the point is to make the user aware the umbrella is not all-covering.
- Not stored: the adequacy answer is a coarse band used only to drive the flag in-browser, consistent with the no-personal-data rule. The analytics event records only which band, never a figure.

### Auto coverage gaps (appears if Auto selected)

Like the home exclusions, these are within-policy gaps and trims on the auto policy itself, independent of what else the user holds. Two gate questions drive all four: do you lease or finance this car, and roughly how old or valuable is it.

- Uninsured / underinsured motorist. Roughly one in eight drivers is uninsured, and this is the coverage that pays you when the at-fault driver has nothing or too little. Many people do not know whether they carry it. Question item: ask whether the policy includes uninsured and underinsured motorist coverage and at what limit.
- Gap coverage (loan/lease). Gated on finance-or-lease. If you total a financed car, the policy pays its depreciated value, which can be thousands less than what you still owe the lender. That shortfall is the gap. Raise item for anyone with a loan on a newer car; irrelevant for an owned-outright car.
- Rental reimbursement. Whether the policy pays for a rental while the car is in the shop after a covered claim. Small money, concrete "did you know you had this" moment. Question item.
- Collision / comprehensive on an older car. Gated on low vehicle value. If the car is worth only a couple thousand dollars, collision premiums over time can exceed what the coverage could ever pay out. Drop candidate, the auto equivalent of the over-insurance flags.

### Renters (appears if Renters selected)

- "Is this renters policy for you, or for a child who lives away from home, like at college?"
- If child-away-at-college: Question item. Ask whether the parent's homeowners already covers the child's belongings off-premises, since many policies cover a percentage and the renters policy may be redundant.

### Health medical-rider overlap (appears if Health selected)

This is NOT full health-plan pricing. It is the narrow overlap between health insurance and the medical riders on auto and home.

- "Do you have health insurance?"
- If yes: Question item on auto MedPay and home medical-payments-to-others coverage, worth asking whether they're still needed when decent health insurance already covers the same injuries.

### Other vehicles: motorcycle and boat (appears if selected in Q1, and relevant when Umbrella is also held)

These sit under the umbrella exactly like auto does, so the umbrella needs minimum liability limits on each of them too. The umbrella question is not just "auto and home," it is "every vehicle you own."

- Motorcycle or boat liability limit, captured the same preset way as auto. Compare against the umbrella attachment point and required underlying minimum. A motorcycle or boat with low liability under a large umbrella is the same gap flagged for home: a Raise item.
- Towing / roadside on a motorcycle or boat policy often duplicates auto roadside or a card benefit: Drop.

Fast-follow, not v1: RV, ATV, and jet ski follow the identical under-the-umbrella logic but are lower-frequency. Add them once the core proves it gets users, to avoid researching and testing more liability tiers and branches before there is demand.

### Health supplemental overlap (appears if Health selected)

Still NOT plan adequacy. The tool never diagnoses network, nor whether a plan is good enough, because that needs the actual plan documents and is the plan-shopping rabbit hole deliberately scoped out. It does ask the deductible, but only as a coarse band feeding the deductible-vs-cushion check above (can you absorb the bill), never as a judgment on the plan. This branch targets only the bolt-on policies people stack on top of real health insurance, which are the health equivalent of AD&D on term life: often redundant for someone with decent coverage and an emergency fund.

- Supplemental bolt-ons. "Do you pay for any extra health policies on top of your main one, like accident, critical illness, hospital indemnity, or cancer coverage?" These are often sold at open enrollment or by the likes of Aflac. If yes: Question-to-Drop item. Background that they pay a fixed cash benefit for a narrow event and frequently duplicate what good primary coverage plus savings already handle; the ask is whether the premium is worth the narrow payout given their main plan.
- HSA/FSA leakage (education flag, not a cash trim). If they have a high-deductible plan with an HSA, a light nudge that the HSA triple tax advantage is commonly underused. Keep it a single Question item and do not expand into plan-shopping.
- Short-term or supplemental medical plans duplicating an ACA plan. If someone holds both a real ACA/employer plan and a separate short-term plan, Question item on whether the second is still needed.

### Common home-policy exclusions (appears if Home selected)

A different kind of flag from everything else here. The rest of the engine finds interactions between policies; this finds within-policy gaps, holes inside the home policy itself regardless of what else the user owns. These are standard exclusions a homeowner is often unaware of, each surfaced as a Question item with the usual background-and-ask treatment.

- Sewer / drain backup. The flagship. Almost never covered by a standard homeowners policy and only added by a specific endorsement, so many people are exposed and do not know it. Cheap to add as an endorsement, devastating to skip. Ask the insurer whether water/sewer backup coverage is on the policy.
- Flood. Never covered by homeowners; needs separate flood coverage (NFIP or private). Ask whether the home has any flood exposure and whether separate coverage exists.
- Fast-follow siblings: earth movement (earthquake, sinkhole) and water-damage sub-limits. Add after sewer and flood prove out.

### Deductible vs. emergency cushion (appears if Auto, Home, or Health selected)

A cross-policy check of a different kind. It is not a judgment on whether a plan is good, which stays scoped out. It asks one practical thing: if you had to pay your deductible tomorrow, could you actually absorb it. A deductible is self-insurance by another name, so this is the same cushion-versus-exposure logic that drives keeping or dropping collision on an older car, or skipping a supplemental bolt-on. Ask the deductible on each policy the user holds (auto, home, health) as coarse preset bands, never a diagnosis of the plan, paired with one question about what they could cover out of pocket in an emergency, also as bands (under 1,000, 1,000 to 5,000, over 5,000, not sure). If any deductible exceeds what they could absorb, that is a flag: either build the cushion or reconsider the deductible, their choice. The point is to surface the gap between the bill a claim would hand them and the cash they have, never to say the plan is wrong. Store only the bands, consistent with the no-personal-data rule; analytics record band only.

### Other bucket (each appears only if selected in Q1)

Most point back to a credit card the user already carries; cross-reference the card lookup table and name the card when possible:

- Rental car. "When you rent a car, do you pay extra for the rental company's insurance?" If yes: likely Drop (duplicated by auto policy and/or card). Flag stronger if they carry a card with rental coverage.
- Towing / roadside. Duplication between auto towing coverage and a roadside plan (AAA) or a card's built-in roadside benefit. If duplicated: Drop.
- Travel insurance. "When you book a trip, do you buy travel insurance separately?" If yes and paid with a card that includes trip protection: likely Drop.
- Phone insurance. "Do you pay a monthly fee to insure your phone?" If yes: check the card's cellphone protection and whether the phone bill runs through that card. The trim move is often "stop paying the carrier, route the bill through the card you already hold," not simply cancel.
- Extended warranties. "When you buy electronics or appliances, do you pay extra for an extended warranty or protection plan?" If yes and paid with a card that extends the manufacturer's warranty: likely Drop.
- Accidental death (AD&D). "Do you have accidental death coverage, including any through your job?" Pulls in the employer AD&D rider, the most common and most forgotten version. Question item, because the right answer depends on their total life coverage, which v1 does not deep-dive. Term life pays out regardless of cause, so AD&D on top of adequate term life is largely redundant.

## Output: the insurer action list

At the end, the user gets a personalized list specific to the policies and answers they gave. Each item is phrased as an action to take with their insurer, grouped as:

- **Raise**: coverage limits that are too low or gaps to close.
- **Drop**: duplicated coverage they are paying for twice.
- **Question**: items to ask their agent about where the right answer depends on their specifics.

Each item has these parts, in this order:

- **Background**: a short plain-language explanation of the overlap or gap, so the user understands why it matters and can hold their own if the agent pushes back. Example (AD&D): "Accidental death coverage only pays if you die a specific way, while your regular life insurance pays no matter what, so stacking it is often paying twice for a narrow case."
- **The ask**: the specific question or action to take to their insurer. Example: "Ask whether your term life already covers what this AD&D is for."
- **The one-line reason** they can repeat to the insurer, so the item is something to say, not just a verdict.
- **The source.** Every flag carries a citation to an authoritative, third-party source, shown with the item. This is non-negotiable: the output must read as what the insurance industry and regulators say, not as the author's opinion. It is what makes the tool credible when the user takes it to their agent, and it is a liability shield. No flag ships without a source.

The background is what turns the user from someone parroting a script into someone who understands the point. It is the core of the value the user walks away with.

## Sources and authority

Every flag stores a source citation in its data entry, displayed with the output. Build requirement: the flag data structure includes a source field (publisher, title, URL, and a last-verified date), and the UI renders it beside each item. A flag with no source does not ship.

Use authoritative, non-commercial sources wherever possible, matched to the type of claim. Seed sources per flag, to be verified during build:

- Coverage explanations and definitions (what umbrella, MedPay, uninsured-motorist, sewer backup actually are): the Insurance Information Institute (iii.org), and the NAIC consumer resources (naic.org / insureuonline.org).
- Regulatory and general facts: the NAIC, which is national and state-neutral. The tool does not ask for the user's state and must not treat any one state as the authority. Where a point genuinely varies by state, cite the NAIC and point the user to their own state's insurance department generically, rather than naming a specific state.
- Flood exclusion and flood coverage: FEMA and the National Flood Insurance Program (floodsmart.gov).
- Uninsured-driver statistics: the Insurance Research Council and the Consumer Federation of America; cite the specific year of the figure.
- Credit card benefit claims: the issuer's own current benefits guide for that card, cited per card, with the last-verified date already required by the card lookup table.

Avoid citing insurers, agencies, or affiliate/comparison sites as the authority for a recommendation, since that undercuts the neutrality the sourcing is meant to establish. A commercial source is acceptable only for a fact about that company's own product (a card issuer on its own card).

## Build notes and open items

For Claude Code:

- Fixed decision tree with branching logic. No AI or LLM call at runtime.
- Keep the liability stack (auto/home limits sitting under the umbrella) as a single reusable engine and visualization, reused across branches rather than rebuilt per policy.
- Make it deterministic and testable: each policy combination should produce the same output every time, so outputs can be snapshot-tested.
- Credit card benefits live in their own lookup table keyed by card, separate from the policy logic.

Open items to settle before or during build:

- The precise preset tiers and "not sure" fallback behavior for each limit question (first-pass presets are in the question flow above).
- The precise auto/home/umbrella liability-stack rules (attachment points, common limit tiers).
- **Credit card lookup table (settled approach):** seed by popularity and richness of overlapping benefits, not comprehensiveness. The benefits that overlap with insurance (rental car, trip protection, cellphone protection, extended warranty) cluster on a predictable set of cards. First tranche: Chase Sapphire Preferred and Reserve, Amex Platinum and Gold, Chase Freedom, Amex Blue Cash, Citi Double Cash, and a cellphone-protection standout like Wells Fargo Active Cash. That roughly dozen covers a large share of wallets. Each card entry tracks which overlapping benefits it carries, keyed by card.
  - Freshness caveat: card benefits change and are specific (extended warranty was recently cut from some cards). Each card entry needs a "last verified" date, and the tool should point users to check their own card benefits guide rather than treat this data as authoritative. This keeps the tool accurate and avoids giving false assurance.
- **Build target (settled):** a single static, hosted web page on Cloudflare Pages. Zero backend, no data storage. User answers never leave the browser as personal data and are never tied to an individual. Analytics capture the aggregate totals of each answer only (for example, how many people picked "500/500 auto" or dropped rental car coverage), fired as anonymous, cookieless events with the answer as a label and no identifier. Use an analytics tool that supports custom events (Plausible, Fathom, or Cloudflare Zaraz), not plain Cloudflare Web Analytics, which counts views but cannot capture answers. The page should state plainly that answers are counted anonymously and never stored against a person.
- Licensing check: if the tool ever monetizes via lead-gen or carrier recommendations, confirm whether Minnesota insurance producer licensing applies before charging anyone.
- Timing (health branch only): open enrollment, roughly October to early December, is the peak-relevance window for the health supplemental branch, so if that branch ships it is worth timing to land inside the window. The rest of the tool is year-round and has no seasonal timing.

## Competitive landscape

A scan found adjacent tools but none doing exactly this, which confirms the differentiation.

- CoverCheck (cover-check.com): closest in spirit. Compares policies against each other to find overlaps, gaps and wasted spend, rather than just storing them. But it works by forwarding email or uploading PDFs, the document-upload path this product deliberately rejects for friction and trust.
- CoverageCheckr (coveragecheckr.com): a free gap calculator, 14 questions, gives an A-to-F risk score and lists gaps. Structurally close to our question-tree approach, and notably runs entirely in the browser, the same zero-backend instinct. Focuses on gaps, not duplication-and-trim.
- Coverage Cat (coveragecat.com): a policy-comparison/shopping agent that finds the best home and umbrella policies. A shopping tool, not an overlap auditor.

Where this product is differentiated: no upload, action-oriented output with the exact words to say to an insurer, and the credit-card duplication layer that the gap-calculators largely skip. That card-overlap angle is the most distinctive, emotionally satisfying win and is underserved by everyone found.
