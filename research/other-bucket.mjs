// Verified research: "Other" bucket (Overlap & Trim, story S3a).
// Covers rental car coverage, towing/roadside, travel insurance, phone protection, extended warranties,
// and AD&D versus term life.
// Plain data module: one default-exported object literal, no imports, no code.
// Every source below was fetched and read on 2026-10-10 (retrievedOn). verification.status was
// "unverified" until the independent verifier (2026-10-10) re-fetched each page and upgraded it.
// Facts are paraphrased; see caveats for dates, variation and limits of each claim.
// S3a finalization (2026-10-10): seven sources on hosts outside the S3a authority allowlist (consumerreports.org x4,
// opm.gov x3) were moved to `rejected`, together with the nine facts that rested only on them; four facts were trimmed.
// Credit-card claims here are GENERIC (what consumer agencies and the NAIC/III say about card benefits
// as a class). Anything about a named card must come from the issuer's own guide (story S4a), not from here.

export default {
  domain: "other-bucket",
  retrievedOn: "2026-10-10",

  sources: [
    // ---- Rental car ----
    {
      id: "iii-rental-car-insurance",
      publisher: "Insurance Information Institute",
      title: "Rental car insurance",
      url: "https://www.iii.org/article/rental-car-insurance",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Triple-I page, no publication date (copyright 2026 only). Confirmed: waiver not technically insurance, relieves renter of responsibility for damage or theft, may also cover loss of use, towing, admin fees; voided by speeding, unpaved roads, drunk driving; check existing coverage to avoid duplicate insurance; own auto coverage and deductibles apply in most cases for personal use; rules vary by state; card benefits usually secondary, vary by issuer and card level, may cover only the deductible, ask in writing; rental companies provide only state-minimum liability; non-owner policy; belongings covered by homeowners/renters; personal accident depends on health insurance and PIP." }
    },
    {
      id: "ftc-renting-a-car",
      publisher: "Federal Trade Commission",
      title: "Renting a Car",
      url: "https://consumer.ftc.gov/articles/renting-car",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; FTC Consumer Advice page dated September 2023. Confirmed: waiver guarantees the rental company pays for damage, can be cancelled by reckless driving, impaired driving or an unauthorized driver; you may already be covered by car or homeowners insurance; employer insurance on business trips; without a waiver or personal cover you are responsible for damages, sometimes full value; many cards offer collision cover if you decline the rental company's cover; some card companies and auto clubs include rental protection." }
    },
    {
      id: "naic-consumer-auto-insurance",
      publisher: "National Association of Insurance Commissioners",
      title: "Auto Insurance",
      url: "https://content.naic.org/consumer/auto-insurance.htm",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC consumer page, no date shown. Confirmed: with comprehensive and collision you will likely not need the waiver; add-on per-day prices (waiver $10-$20, supplemental liability $7-$14, personal accident $1-$5, personal effects $2-$5); adequate liability, health/disability or PIP, and homeowners/renters may already cover the add-ons; card benefits usually secondary (FAQ); call your card company to ask about benefits." }
    },

    // ---- Towing / roadside ----
    {
      id: "naic-what-does-auto-insurance-cover",
      publisher: "National Association of Insurance Commissioners",
      title: "What Does Auto Insurance Cover?",
      url: "https://content.naic.org/article/what-you-should-know-about-auto-insurance-coverage",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC page dated June 11, 2026. Confirmed: roadside or towing coverage reimburses costs if your car is disabled and is listed under what an auto policy does not cover (separate coverage needed), alongside rental; auto policy does not cover motorcycles, ATVs, off-road vehicles, RVs or commercial vehicles." }
    },
    {
      id: "naic-consumer-insight-right-protection",
      publisher: "National Association of Insurance Commissioners",
      title: "Does your vehicle have the right protection? Best practices for buying auto insurance",
      url: "https://content.naic.org/article/consumer-insight-does-your-vehicle-have-right-protection-best-practices-buying-auto-insurance",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC Consumer Insight, published Feb 10, 2020, modified Mar 26, 2025 (page metadata). Confirmed: towing or emergency road service pays towing to a repair shop; listed as optional coverage with rental; AAA or other memberships may already include some of these coverages." }
    },
    {
      id: "iii-boat-insurance-and-safety",
      publisher: "Insurance Information Institute",
      title: "Boat insurance and safety",
      url: "https://www.iii.org/article/boat-insurance-and-safety",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Triple-I page, no date (copyright 2026). Confirmed: lists 'Towing in the event of an accident' among common and optional boat coverages; breakdown towing not mentioned." }
    },

    // ---- Travel insurance ----
    {
      id: "naic-should-i-get-travel-insurance",
      publisher: "National Association of Insurance Commissioners",
      title: "Should I Get Travel Insurance?",
      url: "https://content.naic.org/article/should-i-get-travel-insurance",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC page dated June 16, 2026. Confirmed: coverage types (cancellation/interruption/delay, medical, evacuation, AD&D, baggage); CFAR usually an add-on, usually more expensive, reimburses only a portion, must typically be bought within a certain period after booking; policies usually cost 5% to 10% of trip price; some cards offer trip cancellation and lost baggage, check your card's policy; most homeowners policies cover property lost or stolen while traveling, confirm with your insurer; some buy travel insurance if health insurance does not cover them abroad; ask about insurer approval, pre-existing conditions, dangerous activities; named-storm timing." }
    },
    {
      id: "iii-should-you-buy-travel-insurance",
      publisher: "Insurance Information Institute",
      title: "Should you buy travel insurance?",
      url: "https://www.iii.org/article/should-you-buy-travel-insurance",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Triple-I page, no date (copyright 2026). Confirmed: coverage types; accidental death cover may be duplicate insurance depending on your life insurance; check whether the card you plan to use offers travel insurance or assistance; homeowners/renters usually cover off-premises theft, floater for costly items; cruise/tour cancellation waivers are not insurance, many restrictions, bought at booking, often not covering the period just before departure, not regulated by state insurance departments. No price figures; cancel-for-any-reason not discussed." }
    },


    // ---- Extended warranties / service contracts ----
    {
      id: "ftc-extended-warranties-service-contracts",
      publisher: "Federal Trade Commission",
      title: "Extended Warranties and Service Contracts",
      url: "https://consumer.ftc.gov/articles/extended-warranties-and-service-contracts",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; FTC Consumer Advice dated March 2023. Confirmed: costs extra and may cover different issues than the manufacturer's warranty; might not be worth it if the product is unlikely to need repair; not good value if it adds no coverage beyond the included warranty; check hidden costs such as deductibles and shipping; setting money aside in savings is a better option; value depends on the company behind it." }
    },
    {
      id: "ftc-warranties",
      publisher: "Federal Trade Commission",
      title: "Warranties",
      url: "https://consumer.ftc.gov/articles/warranties",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; FTC Consumer Advice dated July 2023. Confirmed: extended warranty or service contract costs extra and is sold separately; differs from the warranty that may come automatically; product warranty may cover the same repairs for the same time. No mention of credit-card benefits." }
    },

    // ---- AD&D versus term life ----
    {
      id: "naic-glossary",
      publisher: "National Association of Insurance Commissioners",
      title: "Glossary of Insurance Terms",
      url: "https://content.naic.org/glossary-insurance-terms",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC Glossary of Insurance Terms (research department), no date; very long page (only first ~100k of 220k characters read). Confirmed entry 'Accidental Death & Dismemberment': an insurance contract that pays a stated benefit for death and/or dismemberment caused by accident or specified kinds of accidents." }
    },
    {
      id: "naic-consumer-life-insurance",
      publisher: "National Association of Insurance Commissioners",
      title: "Life Insurance",
      url: "https://content.naic.org/consumer/life-insurance.htm",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC consumer page, no date. Confirmed: term policy pays named beneficiaries if the insured dies during the term; accidental death benefit rider pays more than the base benefit for accidental death, some pay a multiple (double or triple indemnity); check how the rider defines an accident. Does not mention AD&D by name." }
    },
    {
      id: "naic-life-insurance-roadmap",
      publisher: "National Association of Insurance Commissioners",
      title: "Life Insurance Roadmap",
      url: "https://content.naic.org/article/consumer-insight-life-insurance-roadmap",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC Life Insurance Roadmap, published Mar 1, 2016, modified Jan 16, 2024. Confirmed: term life pays out if you die during the term; employer coverage lost if job situation changes, retirees no longer covered by previous employer's term policy; employer policies typically cover a year or two of salary, which may not cover a mortgage or student loans." }
    },
  ],

  facts: [
    // ================= Rental car =================
    {
      id: "rental-waiver-what-it-is",
      topic: "Rental car collision / loss damage waiver: what it is",
      claim: "A collision damage waiver (also called a loss damage waiver) is not technically insurance. Triple-I says it is designed to relieve you of financial responsibility if the rental car is damaged or stolen, and the FTC says it guarantees the rental company will pay for damage to the car. Some waivers also cover charges for the time the car is out of use, towing and administrative fees. Triple-I describes injury cover (personal accident) and belongings cover (personal effects) as separate rental-counter products, not part of the waiver.",
      sourceIds: ["iii-rental-car-insurance", "ftc-renting-a-car"],
      confidence: "high",
      caveats: "Terms vary by rental company, state and insurer. Neither page says in so many words that the waiver excludes injuries and belongings; the product should say only that those are sold or covered separately. Both pages say the waiver can be voided: Triple-I names speeding, driving on unpaved roads and driving while intoxicated; the FTC names reckless driving, driving under the influence and letting an unauthorized person drive. Triple-I's page carries no date (copyright 2026 only); the FTC page is dated September 2023."
    },
    {
      id: "rental-waiver-often-unneeded-if-covered",
      topic: "Rental car waiver may duplicate coverage you already have",
      claim: "If your own car has comprehensive and collision coverage, the NAIC says you will likely not need the rental company's damage waiver. The FTC notes you may already be covered by your car or homeowners insurance, and Triple-I tells renters to check their existing coverage first so they avoid paying for duplicate insurance.",
      sourceIds: ["naic-consumer-auto-insurance", "ftc-renting-a-car", "iii-rental-car-insurance"],
      confidence: "high",
      caveats: "The NAIC hedges ('likely'), and no page says the waiver is optional in so many words; the FTC says rental companies 'may try to sell' it and that you may already be covered. Whether you are actually covered depends on your own policy wording and on how you use the rental (see rental-personal-auto-usually-extends). NAIC's Auto Insurance page carries no date."
    },
    {
      id: "rental-personal-auto-usually-extends",
      topic: "Personal auto policy and rentals",
      claim: "In most cases the coverage and deductibles on your own car apply when you rent a car for personal rather than business use. If you dropped collision or comprehensive on your own car to save money, you may not be covered if the rental is damaged or stolen.",
      sourceIds: ["iii-rental-car-insurance", "ftc-renting-a-car"],
      confidence: "high",
      caveats: "Triple-I says insurance rules vary by state and tells renters to check with their own insurer; the FTC adds that an employer's insurance may apply on a business trip. Neither page addresses rentals outside the United States or whether a claim on your own policy raises your premium, so the product must not assert either. Your deductible applies when you use your own policy."
    },
    {
      id: "rental-decline-without-cover-you-pay",
      topic: "If you decline the waiver and nothing else covers the rental",
      claim: "If you do not buy the rental company's damage waiver and your own insurance does not apply, you can be responsible for the damage to the rental car, sometimes up to its full value. So the sensible move is to confirm your other coverage before declining, not simply to decline.",
      sourceIds: ["ftc-renting-a-car"],
      confidence: "high",
      caveats: "FTC Consumer Advice page dated September 2023. The 'confirm before declining' step is the product's reading of the FTC advice to check your own policy and card first."
    },
    {
      id: "rental-card-coverage-usually-secondary",
      topic: "Credit-card rental coverage is usually secondary and limited",
      claim: "Credit-card rental car benefits are usually secondary: they pay only after your own auto policy or the rental company's coverage has been used. Triple-I notes a card may cover only your deductible, and that coverage can depend on the card issuer or even the level of card.",
      sourceIds: ["naic-consumer-auto-insurance", "iii-rental-car-insurance"],
      confidence: "high",
      caveats: "'Usually' is the sources' word. Some individual cards advertise primary rental coverage, but no NAIC, Triple-I or federal consumer page names which; that must come from the issuer's own guide (story S4a) for a named card. Both sources tell you to ask the card issuer for the coverage details, and Triple-I says to ask for them in writing."
    },
    {
      id: "rental-card-requires-declining-waiver",
      topic: "Card rental coverage usually requires declining the waiver",
      claim: "Many credit cards offer collision damage coverage when you pay for the rental with the card, but to be eligible you generally need to decline the rental company's own waiver.",
      sourceIds: ["ftc-renting-a-car"],
      confidence: "high",
      caveats: "FTC wording is 'many credit cards'; some auto clubs also include rental protection. Exact conditions (which vehicles, which countries, how many days) are issuer-specific and not stated by the FTC. FTC page dated September 2023."
    },
    {
      id: "rental-liability-state-minimum",
      topic: "Liability at the rental counter",
      claim: "Rental companies must provide the state-required minimum liability coverage, which is often not enough. If your own auto policy carries higher liability limits you are generally covered; people who do not own a car and rent often can buy a non-owner liability policy.",
      sourceIds: ["iii-rental-car-insurance"],
      confidence: "medium",
      caveats: "Single source (Triple-I, undated page). No page found says whether credit cards cover liability, so the product must not claim cards leave a liability gap or fill one. Minimums are set by each state."
    },
    {
      id: "rental-counter-add-ons-and-costs",
      topic: "Other rental-counter add-ons and what may already cover them",
      claim: "Besides the damage waiver, rental counters sell supplemental liability, personal accident and personal effects coverage. The NAIC says adequate liability on your own policy, health and disability coverage, and a homeowners or renters policy may already cover what these add-ons are for, and lists rough per-day prices: waiver about $10-$20, supplemental liability about $7-$14, personal accident about $1-$5, personal effects about $2-$5.",
      sourceIds: ["naic-consumer-auto-insurance", "iii-rental-car-insurance"],
      confidence: "medium",
      caveats: "The NAIC price ranges are undated, so quote them only as 'roughly' and attribute them, or leave them out. Triple-I separately says belongings stolen from a rental are generally covered by homeowners or renters insurance, not auto insurance, and that whether personal accident cover is worth it depends on your health insurance and personal injury protection."
    },

    // ================= Towing / roadside =================
    {
      id: "roadside-auto-policy-coverage",
      topic: "Towing / roadside coverage on an auto policy",
      claim: "Roadside or towing coverage on an auto policy reimburses your costs when your car is disabled, for example the cost of towing it to a repair shop. The NAIC lists it among coverages you may need separately from a basic auto policy and calls it optional, alongside rental car coverage.",
      sourceIds: ["naic-what-does-auto-insurance-cover", "naic-consumer-insight-right-protection"],
      confidence: "high",
      caveats: "NAIC 'What Does Auto Insurance Cover?' is dated June 11, 2026; the Consumer Insight piece February 10, 2020 (modified March 2025). Neither gives dollar limits, prices or mileage caps, and neither says whether labor is included, so the product cannot cite typical limits."
    },
    {
      id: "roadside-memberships-may-overlap",
      topic: "Auto clubs and other memberships may duplicate roadside cover",
      claim: "The NAIC says an auto club such as AAA or other memberships may already include some of the towing and road-service coverage you could buy through your auto policy.",
      sourceIds: ["naic-consumer-insight-right-protection"],
      confidence: "medium",
      caveats: "Single source (NAIC Consumer Insight, February 2020, modified March 2025). It says 'some' of the coverages, not all, and does not say which plan pays first; that is plan-specific."
    },
    {
      id: "roadside-other-vehicles",
      topic: "Roadside and towing for a motorcycle or boat",
      claim: "A car policy's towing coverage does not extend to motorcycles, ATVs, off-road vehicles, RVs or commercial vehicles, because the auto policy does not cover them. Triple-I lists towing after an accident among the common and optional coverages on boat policies, so any tow help for these vehicles has to come from their own policy, a club or a card.",
      sourceIds: ["naic-what-does-auto-insurance-cover", "iii-boat-insurance-and-safety"],
      confidence: "medium",
      caveats: "The NAIC sentence is about what an auto policy covers, not about roadside add-ons specifically. Triple-I's boat page lists 'towing in the event of an accident' without saying whether it is standard or an add-on and without covering breakdown tows. Triple-I's motorcycle page does not mention towing or roadside at all, so no source says motorcycle policies usually include it. Phrase any motorcycle or boat towing flag as a question about the user's own policy and memberships."
    },

    // ================= Travel insurance =================
    {
      id: "travel-coverage-types",
      topic: "What travel insurance covers",
      claim: "Travel policies can include trip cancellation, interruption and delay (repaying prepaid costs when a covered reason such as illness or severe weather stops the trip), travel medical, emergency medical evacuation, accidental death and dismemberment, and baggage loss or delay. Cancel for Any Reason is usually an add-on that costs more and reimburses only part of the trip cost.",
      sourceIds: ["naic-should-i-get-travel-insurance", "iii-should-you-buy-travel-insurance"],
      confidence: "high",
      caveats: "NAIC page dated June 16, 2026; Triple-I page undated. Each policy sets its own limits and covered reasons, and Triple-I does not discuss Cancel for Any Reason. The NAIC says it typically must be bought within a certain period after booking."
    },
    {
      id: "travel-cost-share",
      topic: "What travel insurance costs",
      claim: "The NAIC says travel insurance policies usually cost about 5% to 10% of the total trip price, depending on the season, the destination, your age and other factors.",
      sourceIds: ["naic-should-i-get-travel-insurance"],
      confidence: "high",
      caveats: "Single source; page dated June 16, 2026. Triple-I's travel page gives no price figures. Treat as a typical range, not a quote."
    },
    {
      id: "travel-credit-card-benefits-exist",
      topic: "Credit-card trip protection may overlap a separate policy",
      claim: "Some credit cards include trip cancellation and lost-baggage coverage. The NAIC says to check your card's policy and decide whether it is enough for you, and Triple-I says to check whether the card you plan to use offers any travel insurance or assistance before you book.",
      sourceIds: ["naic-should-i-get-travel-insurance", "iii-should-you-buy-travel-insurance"],
      confidence: "high",
      caveats: "Neither page says what any card covers, how much, or whether it is primary or secondary; that comes from the issuer's guide (story S4a). Neither page says to skip a separate policy: the overlap and the likely Drop come from comparing the card benefit with the policy's covered reasons, which the product leaves to the user to confirm."
    },
    {
      id: "travel-other-existing-coverage",
      topic: "Other coverage that may already apply when you travel",
      claim: "Homeowners and renters policies usually cover belongings lost or stolen while you travel, so it is worth checking them before paying for baggage cover in a travel policy. The NAIC notes that some people buy travel insurance because their health insurance does not cover them outside their home country, so it is worth knowing what your health plan covers abroad before relying on it.",
      sourceIds: ["naic-should-i-get-travel-insurance", "iii-should-you-buy-travel-insurance"],
      confidence: "high",
      caveats: "NAIC says 'most' homeowners policies cover property lost or stolen while traveling and to confirm with your insurer; Triple-I says homeowners or renters policies will usually cover off-premises theft and suggests a floater or endorsement for expensive items. Neither page tells readers to call their health insurer; that step is the product's suggestion. Health coverage abroad varies by plan, and travel medical policies are the part most likely to fill a real gap, so do not frame medical cover as redundant."
    },
    {
      id: "travel-exclusions-and-limits",
      topic: "Travel insurance exclusions to check",
      claim: "Each travel policy sets its own limits and covered situations. The NAIC advises asking whether you need the insurer's approval before getting medical care, and whether pre-existing health conditions and activities the insurer considers dangerous are excluded. It also says to buy early, because coverage for a storm that has already been named is unlikely.",
      sourceIds: ["naic-should-i-get-travel-insurance"],
      confidence: "high",
      caveats: "Single source; page dated June 16, 2026. The NAIC page lists further common exclusions; the product needs only the point that exclusions differ, which supports phrasing the travel flag as 'compare covered reasons' rather than 'your card definitely covers this'."
    },
    {
      id: "travel-accidental-death-duplicate",
      topic: "Travel accidental-death cover can duplicate life insurance",
      claim: "Triple-I says accidental death cover in a travel policy pays if you or a family member dies during the trip, and that depending on your life insurance or other financial provisions for your loved ones it may be duplicate insurance.",
      sourceIds: ["iii-should-you-buy-travel-insurance"],
      confidence: "high",
      caveats: "Triple-I page, undated. The NAIC lists accidental death and dismemberment as one of the travel-policy coverages but does not comment on duplication. See also the AD&D facts below."
    },
    {
      id: "travel-waiver-not-insurance",
      topic: "Cruise and tour cancellation waivers are not insurance",
      claim: "A cancellation waiver offered by a cruise line or tour operator is not insurance. Triple-I says waivers carry many restrictions, usually must be bought when you book, often do not cover the time just before departure, and are not regulated by state insurance departments.",
      sourceIds: ["iii-should-you-buy-travel-insurance"],
      confidence: "high",
      caveats: "Triple-I page, undated. Matters for the question wording ('travel insurance') so a user who bought a waiver is not told they duplicated an insurance policy they do not have."
    },


    // ================= Extended warranties / service contracts =================
    {
      id: "warranty-extended-is-separate-and-may-overlap",
      topic: "Extended warranties are optional extras that can overlap the warranty you already have",
      claim: "An extended warranty or service contract costs extra and is sold separately from the product. It is different from the warranty that may come automatically with the product, and the FTC warns that the product's own warranty may already cover the same repairs for the same period.",
      sourceIds: ["ftc-extended-warranties-service-contracts", "ftc-warranties"],
      confidence: "high",
      caveats: "FTC Extended Warranties page dated March 2023; FTC Warranties page dated July 2023. The FTC's warning is about overlap with the manufacturer's warranty; neither page mentions credit-card benefits."
    },
    {
      id: "warranty-value-questions",
      topic: "When an extended warranty is poor value",
      claim: "The FTC says an extended warranty or service contract might not be worth the cost if the product is unlikely to need repairs, and is not good value if it offers no more coverage than the warranty that came with the product. It tells buyers to check for hidden costs such as deductibles, per-repair fees and shipping, and notes that putting money aside in a savings account for repairs may be a better option.",
      sourceIds: ["ftc-extended-warranties-service-contracts"],
      confidence: "high",
      caveats: "FTC Consumer Advice page dated March 2023. The FTC does not say how likely a repair is for any product category and does not give prices, so the product must not claim extended warranties 'rarely pay off'."
    },

    // ================= AD&D versus term life =================
    {
      id: "add-definition-accident-only",
      topic: "What accidental death and dismemberment (AD&D) coverage is",
      claim: "AD&D (accidental death and dismemberment) coverage is an insurance contract that pays a stated benefit when an accident, or one of certain specified kinds of accident, causes a death or a dismemberment.",
      sourceIds: ["naic-glossary"],
      confidence: "high",
      caveats: "The NAIC glossary gives the definition (its entry is titled 'Accidental Death & Dismemberment' and sits in the first half of a very long page). The examples of what counts as dismemberment and the statement that illness and suicide are not paid came only from OPM's federal-employee plan pages (opm.gov is not on the allowlist), so they are not asserted. Private policies differ in exclusions and time limits; tell users to read their plan's definition of an accident."
    },
    {
      id: "add-rider-pays-extra-for-accident",
      topic: "Accidental death benefit rider",
      claim: "An accidental death benefit rider on a life policy pays more than the regular death benefit if you die in an accident; some pay two or three times the benefit and are called double or triple indemnity. The NAIC tells buyers to check how the rider defines an accident.",
      sourceIds: ["naic-consumer-life-insurance"],
      confidence: "high",
      caveats: "NAIC consumer page, no date. The page describes riders on a life policy; employer-offered AD&D is a different package and is covered by the other add-* facts. The NAIC page does not mention AD&D by name."
    },
    {
      id: "term-life-pays-on-death-in-term",
      topic: "What term life insurance pays",
      claim: "Term life insurance pays the named beneficiaries if the insured dies during the policy term. The NAIC pages attach no condition about the cause of death.",
      sourceIds: ["naic-consumer-life-insurance", "naic-life-insurance-roadmap"],
      confidence: "medium",
      caveats: "The NAIC pages say a term policy pays if the insured dies during the term and attach no cause condition, but no allowlisted page says in words that it pays 'regardless of the cause' (the only page that did was OPM's, for the federal plan, and opm.gov is not on the allowlist). Real policies have terms and exclusions the sources do not list, so write 'pays if you die during the term' and add 'read your policy for exclusions'; do not write 'whatever the cause' or 'no matter what'. NAIC Life Insurance Roadmap: published March 1, 2016, modified January 16, 2024."
    },
    {
      id: "add-employer-coverage-ends-with-job",
      topic: "Employer life coverage often ends when the job does",
      claim: "Employer-provided life insurance ends if your job situation changes, and retirees are no longer covered by a former employer's term policy.",
      sourceIds: ["naic-life-insurance-roadmap"],
      confidence: "medium",
      caveats: "The NAIC statement is about employer term life generally. Whether employer AD&D also ends with the job was sourced only to OPM's federal plan (opm.gov is not on the allowlist) and is not asserted. Some private employer plans allow you to convert or continue coverage, so say 'often' or 'may' and tell users to check their plan's rules."
    },
    {
      id: "employer-life-typical-size",
      topic: "Employer life insurance is often a modest amount",
      claim: "The NAIC says employer-provided life insurance generally covers about one to two years of your pay, which may not be enough to cover a mortgage or student loans.",
      sourceIds: ["naic-life-insurance-roadmap"],
      confidence: "medium",
      caveats: "Single source (NAIC, published 2016, modified January 2024). It is about basic employer life, not AD&D amounts; no authoritative source was found for typical employer AD&D amounts. Supports asking 'is your total life cover enough' without the product judging it."
    },
  ],

  designInputs: {
    rentalCar: {
      sourcedStatement: "Check your own coverage before paying for the rental company's waiver: your auto policy usually applies to a personal-use rental if you still carry collision and comprehensive, card coverage is usually secondary and generally requires declining the waiver, and if nothing covers the rental you can owe the repair cost.",
      beforeDecliningChecklist: [
        "Your own policy still has collision and comprehensive (III, NAIC)",
        "The rental is for personal, not business, use (III; FTC says an employer's insurance may apply on business trips)",
        "Your card (if you rely on it) covers rentals, what it requires (generally paying with the card and declining the waiver), and that it is usually secondary: ask the issuer for the terms in writing (III, NAIC, FTC)",
        "Your liability limits are adequate, since the counter provides only the state minimum (III)"
      ],
      checklistFactIds: ["rental-personal-auto-usually-extends", "rental-card-coverage-usually-secondary", "rental-card-requires-declining-waiver", "rental-liability-state-minimum", "rental-decline-without-cover-you-pay"],
      counterAddOnRoughPricePerDay: {
        note: "NAIC page is undated. If shown at all, attribute to the NAIC and say 'roughly'.",
        waiver: { min: 10, max: 20 },
        supplementalLiability: { min: 7, max: 14 },
        personalAccident: { min: 1, max: 5 },
        personalEffects: { min: 2, max: 5 },
        factIds: ["rental-counter-add-ons-and-costs"]
      },
      cardEmphasisRule: "When a held card is known to carry rental coverage (from the verified card table), the flag may be stronger, but wording stays 'usually secondary' unless the card table has a verified primary entry for that card.",
      productJudgementNotSourced: "Whether to recommend Drop outright: the sources support 'you may already be covered, confirm first', so phrase the ask as 'confirm your own policy and card, then decline the waiver if both cover you'.",
      factIds: ["rental-waiver-what-it-is", "rental-waiver-often-unneeded-if-covered"]
    },
    roadsideAndTowing: {
      sourcedStatement: "Towing/roadside is a separate coverage on an auto policy, and an auto club or other membership may already include some of it; card roadside programs vary and must come from the card table.",
      askForPolicy: "Ask your insurer for the towing/roadside limit.",
      otherVehicleRule: "An auto policy does not cover motorcycles or boats, so motorcycle or boat towing is a separate question about that policy, a club or a card; no source says it is usually duplicated.",
      noSourcedLimitTiers: true,
      factIds: ["roadside-auto-policy-coverage", "roadside-memberships-may-overlap", "roadside-other-vehicles"]
    },
    travelInsurance: {
      sourcedStatement: "Some cards include trip cancellation and lost-baggage coverage, homeowners/renters policies generally cover belongings lost on a trip, accidental-death cover in a travel policy may duplicate life insurance, and travel medical cover fills a real gap when a health plan does not cover care abroad.",
      typicalCostShareOfTrip: { min: 0.05, max: 0.10, source: "NAIC, page dated 2026-06-16", factIds: ["travel-cost-share"] },
      mostLikelyOverlaps: ["trip cancellation / interruption vs card trip protection", "baggage cover vs homeowners or renters", "accidental death vs life insurance"],
      mostLikelyRealGap: "Emergency medical and evacuation cover abroad when the health plan does not cover care outside the home country.",
      wordingRule: "Compare covered reasons and exclusions (pre-existing conditions, dangerous activities, named storms); never tell the user their card definitely covers a trip.",
      factIds: ["travel-coverage-types", "travel-credit-card-benefits-exist", "travel-other-existing-coverage", "travel-exclusions-and-limits", "travel-accidental-death-duplicate", "travel-waiver-not-insurance"]
    },
    phoneProtection: {
      status: "no sourced facts",
      reason: "Every phone-protection fact rested on Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist, so all four were moved to rejected. No NAIC, Triple-I, FTC or CFPB page on phone plans was found.",
      guidance: "A phone-protection flag cannot ship from this file. Story S11 may include one only if it is sourced from verified card issuer guides (story S4a) and worded as a question, or if the owner allows the domain and the facts are reinstated.",
      factIds: []
    },
    extendedWarranties: {
      sourcedStatement: "Extended warranties are optional, cost extra, can repeat the manufacturer's warranty, and are poor value when they add nothing beyond it or the product is unlikely to need repair (FTC).",
      keyQuestionsFromFtc: ["Does it add coverage beyond the product's own warranty?", "Are there deductibles, per-repair fees or shipping costs?", "Who backs the contract?", "Could the money go into savings for repairs instead?"],
      cardRule: "Only claim a card extends the warranty when the verified card table says so for a held card; otherwise ask 'does your card extend the manufacturer's warranty? check its current benefits guide'. No generic statement about cards is sourced, because the Consumer Reports facts were removed.",
      factIds: ["warranty-extended-is-separate-and-may-overlap", "warranty-value-questions"]
    },
    addVersusTermLife: {
      sourcedStatement: "AD&D pays a stated benefit for death or dismemberment caused by an accident, term life pays if you die during the term, employer life cover often ends with the job, and employer life is often only one to two years of pay.",
      specExampleBackgroundWording: "The spec's example ('life insurance pays no matter what') is stronger than any allowlisted source supports. Suggested hedge: 'Your regular life insurance pays if you die during the term, while accidental death coverage pays only when an accident causes the death or injury. Read your policy for exclusions.'",
      employerLifeTypicalMultiple: { minYearsOfPay: 1, maxYearsOfPay: 2, source: "NAIC Life Insurance Roadmap", factIds: ["employer-life-typical-size"] },
      bucket: "Question (per spec). Sources support asking whether total life coverage already covers what the AD&D is for; none supports telling the user to drop it.",
      alsoRelevantToTravelAccidentalDeath: "A travel policy's accidental-death benefit can duplicate life insurance too (Triple-I).",
      factIds: ["add-definition-accident-only", "add-rider-pays-extra-for-accident", "term-life-pays-on-death-in-term", "add-employer-coverage-ends-with-job", "employer-life-typical-size", "travel-accidental-death-duplicate"]
    },
    creditCardCrossReference: {
      rule: "This file supports generic statements about card benefits only. Name a card or assert a card benefit only from the issuer's own guide in the verified card table, and always tell users to check their own card's current benefits guide.",
      genericStatementsSupported: [
        { benefit: "rentalCar", statement: "usually secondary, often requires declining the waiver and paying with the card", factIds: ["rental-card-coverage-usually-secondary", "rental-card-requires-declining-waiver"] },
        { benefit: "tripProtection", statement: "some cards include trip cancellation and lost-baggage coverage", factIds: ["travel-credit-card-benefits-exist"] }
      ],
      noGenericSupport: ["cellPhone", "extendedWarranty", "roadside"],
      noGenericSupportNote: "The generic card statements for these three benefits rested on Consumer Reports and were removed. Say only 'check your card's current benefits guide'; assert a card's benefit only from the verified card table (story S4a)."
    },
    stateNeutralCopyRule: "Where the sources say rules vary by state (rental coverage, insurer practice), write 'rules vary, so ask your insurer or your state's department of insurance'. Do not name a state.",
    datedFiguresDoNotQuote: [
      "NAIC per-day rental add-on prices (undated)"
    ],
    noSourcedLimitTiers: "No authoritative source gives typical limit tiers for towing, roadside, phone or warranty coverage. Questions in this bucket should be yes/no/not sure and need no limit bands."
  },

  // Verifier (2026-10-10): all 20 sources loaded and supported their facts; wording was tightened on 12 facts where a
  // sentence overreached its cited page. S3a finalization (2026-10-10) then applied the authority allowlist: seven sources,
  // nine facts and parts of four facts are kept under `rejected`.
  rejected: [
    {
      kind: "source",
      id: "consumer-reports-roadside-assistance-plan",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.consumerreports.org is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "consumer-reports-roadside-assistance-plan",
        publisher: "Consumer Reports",
        title: "How to Choose a Roadside Assistance Plan",
        url: "https://www.consumerreports.org/cars/cars-driving/how-to-choose-a-roadside-assistance-plan-a6798450601/",
        authorityType: "consumer-org",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Consumer Reports (non-profit consumer organization), July 9, 2023. Confirmed: some new cars include free roadside for the factory warranty period (typically dealer-only tow); credit-card and insurance companies sell plans; some cards cover basic help but many charge a flat fee per incident; card plans generally not as good a value as full-service plans; insurer add-on covers all insured drivers and cars and may cost less; read fine print on whether service calls count as claims." }
      },
    },
    {
      kind: "source",
      id: "consumer-reports-smartphone-insurance",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.consumerreports.org is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "consumer-reports-smartphone-insurance",
        publisher: "Consumer Reports",
        title: "Is Smartphone Insurance Worth Buying?",
        url: "https://www.consumerreports.org/money/is-smartphone-insurance-worth-buying-a4827419361/",
        authorityType: "consumer-org",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Consumer Reports (non-profit), updated May 11, 2018. Confirmed: fee plus per-claim deductible; most insurers limit claims to two or three a year; refurbished replacement possible; some plans enrol only for two to four weeks after purchase; carrier, manufacturer and independent sellers; homeowners policy may add phone cover (ask about deductible, effect on policy, perils); CFA's director of insurance quote about carrying a $500 or $1,000 homeowners deductible; plan may help households with children 12 or younger. Dollar figures are 2018 and not to be quoted." }
      },
    },
    {
      kind: "source",
      id: "consumer-reports-credit-card-benefits",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.consumerreports.org is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "consumer-reports-credit-card-benefits",
        publisher: "Consumer Reports",
        title: "5 Credit Card Benefits You Might Not Know About",
        url: "https://www.consumerreports.org/money/credit-cards/credit-card-benefits-you-might-not-know-about-a6135335136/",
        authorityType: "consumer-org",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Consumer Reports, published Nov 21, 2018, updated Sep 6, 2022. Confirmed: cell-phone cover applies if you pay the monthly bill with the card, small deductible, about two to three claims a year, not for a lost phone, may not fully cover a high-end phone, not widespread; some issuers add a year or two to the manufacturer's warranty (note: 'some', not 'many'), typically capped at $10,000 per claim and $50,000 per account, need documentation, claims can be time-consuming; not all cards offer all benefits." }
      },
    },
    {
      kind: "source",
      id: "consumer-reports-extended-warranties",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.consumerreports.org is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "consumer-reports-extended-warranties",
        publisher: "Consumer Reports",
        title: "Why You Should Steer Clear of Extended Warranties",
        url: "https://www.consumerreports.org/money/extended-warranties/steer-clear-extended-warranties-a3095935951/",
        authorityType: "consumer-org",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Consumer Reports, Dec 22, 2018. Confirmed: 'in nearly every case, it's best to decline'; understand the manufacturer's warranty (typically 90 days or so); check whether a credit card already extends coverage (says many do, for a year or more); consider how much repairs would cost." }
      },
    },
    {
      kind: "source",
      id: "opm-fegli-faq-life-benefits-cause-of-death",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.opm.gov is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "opm-fegli-faq-life-benefits-cause-of-death",
        publisher: "U.S. Office of Personnel Management",
        title: "Are FEGLI life insurance benefits payable in cases of suicide?",
        url: "https://www.opm.gov/frequently-asked-questions/insure-faq/life/are-fegli-life-insurance-benefits-payable-in-cases-of-suicide/",
        authorityType: "government",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; OPM FAQ, no date. Confirmed: FEGLI life benefits payable regardless of cause or location of death; AD&D (included in Basic and Option A) not paid in suicide because death is not accidental; someone who causes the death may be barred from the benefits. Federal plan only." }
      },
    },
    {
      kind: "source",
      id: "opm-fegli-faq-add-retirement",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.opm.gov is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "opm-fegli-faq-add-retirement",
        publisher: "U.S. Office of Personnel Management",
        title: "Does accidental death and dismemberment coverage continue into retirement?",
        url: "https://www.opm.gov/frequently-asked-questions/insure-faq/life/does-accidental-death-and-dismemberment-coverage-continue-into-retirement/",
        authorityType: "government",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; OPM FAQ, no date. Confirmed: FEGLI AD&D coverage ends when employment ends and cannot be carried into retirement. Federal plan only." }
      },
    },
    {
      kind: "source",
      id: "opm-insurance-glossary",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.opm.gov is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "opm-insurance-glossary",
        publisher: "U.S. Office of Personnel Management",
        title: "Insurance Glossary",
        url: "https://www.opm.gov/healthcare-insurance/insurance-glossary/",
        authorityType: "government",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; OPM Insurance Glossary, no date. Confirmed FEGLI entries: accidental death must result solely from violent, external and accidental means and occur within one year of the injury; AD&D exclusions include physical or mental illness, suicide or attempted suicide, self-injury, self-administered illegal drugs, driving while intoxicated, and war-related acts. Federal plan only." }
      },
    },
    {
      kind: "fact",
      id: "roadside-sellers-and-card-variation",
      reasonCode: "sole-source-removed",
      reason: "Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist.",
      original: {
        id: "roadside-sellers-and-card-variation",
        topic: "Who offers roadside help, including credit cards",
        claim: "Some new cars include roadside help free for the warranty period, and insurers, auto clubs and some credit cards also offer it. Consumer Reports says some cards cover basic roadside help while many others charge a flat fee for each use, and that card plans generally give less than a full-service membership, so they suit people with no other coverage.",
        sourceIds: ["consumer-reports-roadside-assistance-plan"],
        confidence: "medium",
        caveats: "Single source, a consumer organization, dated July 9, 2023. Its dollar figures (club price range, a per-incident card fee) are 2023 numbers and should not be quoted. Which cards include roadside help must come from issuer guides (story S4a). A car maker's roadside plan is often limited to towing to an authorized dealer."
      },
    },
    {
      kind: "fact",
      id: "roadside-insurer-addon-claims-check",
      reasonCode: "sole-source-removed",
      reason: "Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist.",
      original: {
        id: "roadside-insurer-addon-claims-check",
        topic: "Insurer roadside add-on: ask whether calls count as claims",
        claim: "An insurer's roadside add-on can cover every insured driver and car on the policy and may cost less than a standalone plan. Consumer Reports advises reading the fine print to see whether a service call counts as a claim, since that could raise your premium.",
        sourceIds: ["consumer-reports-roadside-assistance-plan"],
        confidence: "medium",
        caveats: "Single source (Consumer Reports, July 2023). Whether a call counts as a claim is insurer-specific; phrase it as a question to ask, never as a rule."
      },
    },
    {
      kind: "fact",
      id: "phone-plan-fee-and-deductible",
      reasonCode: "sole-source-removed",
      reason: "Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist.",
      original: {
        id: "phone-plan-fee-and-deductible",
        topic: "How paid phone-protection plans work",
        claim: "Paid phone-protection plans (from carriers, manufacturers and independent sellers) charge a monthly or yearly fee plus a deductible on each claim. Most limit you to two or three claims a year, and a replacement may be a refurbished phone. Some plans can be bought only for a few weeks after you buy the phone.",
        sourceIds: ["consumer-reports-smartphone-insurance"],
        confidence: "medium",
        caveats: "Single source, a consumer organization: the article was updated May 11, 2018. Its dollar figures (premiums, deductibles, plan prices) are 2018 numbers and must not be quoted. No NAIC, Triple-I, FTC or CFPB page on phone-protection plans was found. The concept (fee plus per-claim deductible plus claim cap) is stable; the numbers are not."
      },
    },
    {
      kind: "fact",
      id: "phone-card-protection-conditions",
      reasonCode: "sole-source-removed",
      reason: "Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist.",
      original: {
        id: "phone-card-protection-conditions",
        topic: "Card phone protection usually depends on paying the phone bill with that card",
        claim: "Some credit cards cover damage and theft of your phone, with a small deductible and a limit on claims per year, but generally only if you pay your monthly phone bill with that card. Consumer Reports says these card benefits usually do not cover a lost phone and may not fully cover a high-end phone.",
        sourceIds: ["consumer-reports-credit-card-benefits", "consumer-reports-smartphone-insurance"],
        confidence: "medium",
        caveats: "Consumer Reports article published November 2018 and updated September 6, 2022; its examples are specific cards and dated. Figures such as per-claim caps and deductibles differ by card and year and must come from the issuer's guide for a named card (story S4a). It also notes the benefit is not widespread. The 'pay the bill with the card, then drop the carrier plan' idea is the product's inference from this fact plus phone-plan-fee-and-deductible, not something a source recommends."
      },
    },
    {
      kind: "fact",
      id: "phone-home-renters-may-cover",
      reasonCode: "sole-source-removed",
      reason: "Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist.",
      original: {
        id: "phone-home-renters-may-cover",
        topic: "Homeowners or renters insurance may cover a phone",
        claim: "A homeowners policy may cover a phone, or can be extended to, for a modest extra cost (the article mentions renters policies only in passing). Consumer Reports advises asking your insurer whether a deductible applies, how a claim would affect your policy, and which kinds of loss are covered, since it may only cover perils such as fire or theft.",
        sourceIds: ["consumer-reports-smartphone-insurance"],
        confidence: "medium",
        caveats: "Single source, updated 2018; the quoted price for added coverage is a 2018 figure and should not be used. Do not tell users their policy 'covers' a phone; say 'ask whether it does'."
      },
    },
    {
      kind: "fact",
      id: "phone-self-insure-test",
      reasonCode: "sole-source-removed",
      reason: "Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist.",
      original: {
        id: "phone-self-insure-test",
        topic: "Rule of thumb: can you absorb a phone replacement yourself",
        claim: "Consumer Reports quotes the Consumer Federation of America's director of insurance saying that if you could comfortably carry a $500 or $1,000 homeowners deductible from an emergency fund, you could probably also afford to pay for a damaged or replacement phone. The same article suggests a plan may be worth more for households with young children.",
        sourceIds: ["consumer-reports-smartphone-insurance"],
        confidence: "medium",
        caveats: "A single expert's rule of thumb quoted in a 2018 article, not a regulatory standard. Phone prices have changed since 2018, so use it only as a framing question ('could you replace your phone from savings?') tied to the deductible-vs-cushion bands, not as a threshold."
      },
    },
    {
      kind: "fact",
      id: "warranty-card-extension",
      reasonCode: "sole-source-removed",
      reason: "Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist.",
      original: {
        id: "warranty-card-extension",
        topic: "Many credit cards extend the manufacturer's warranty",
        claim: "Consumer Reports says some credit-card issuers add a year or two to the manufacturer's warranty on items bought with the card (a second Consumer Reports piece says many cards extend it, for a year or more), with caps (typically $10,000 per claim and $50,000 per account), and that you need documentation and the claims process can be time-consuming. Not all cards offer this and terms differ by card, so check your card's own guide or ask the issuer.",
        sourceIds: ["consumer-reports-credit-card-benefits", "consumer-reports-extended-warranties"],
        confidence: "medium",
        caveats: "Consumer Reports only (2018 article updated 2022, and a December 2018 article); the two disagree slightly on 'some' versus 'many' issuers, so word it as 'some cards'; neither FTC warranty page mentions card benefits and no CFPB page on this was found. Caps and lengths are card-specific and dated, so do not quote them. The benefit extends an existing manufacturer warranty, so it helps only where the product has one. A named card's benefit must come from the issuer guide (story S4a)."
      },
    },
    {
      kind: "fact",
      id: "warranty-consumer-reports-advice",
      reasonCode: "sole-source-removed",
      reason: "Every source for this fact was Consumer Reports (consumerreports.org), which is not on the S3a authority allowlist.",
      original: {
        id: "warranty-consumer-reports-advice",
        topic: "Consumer Reports advice on store extended warranties",
        claim: "Consumer Reports advises against buying extended warranties on electronics and appliances in nearly every case. Before considering one it suggests reading the manufacturer's warranty (often about 90 days), checking whether your card already extends it, and comparing the plan's price with likely repair costs.",
        sourceIds: ["consumer-reports-extended-warranties"],
        confidence: "medium",
        caveats: "Consumer organization opinion from a December 22, 2018 article, not a rule; the FTC's neutral wording (see warranty-value-questions) is the better citation for flag copy. Its repair-cost and satisfaction statistics are 2018 and are not used."
      },
    },
    {
      kind: "fact",
      id: "add-exclusions-federal-example",
      reasonCode: "sole-source-removed",
      reason: "Its only source was the OPM insurance glossary (opm.gov), which is not on the S3a authority allowlist.",
      original: {
        id: "add-exclusions-federal-example",
        topic: "Example of how narrow AD&D can be",
        claim: "OPM's glossary shows how narrow an AD&D benefit can be in one real plan: the death must come solely from an accident and happen within a year of the injury, and no AD&D benefit is paid when the death or loss is caused or contributed to by illness, suicide, or driving while intoxicated, among other listed exclusions.",
        sourceIds: ["opm-insurance-glossary"],
        confidence: "medium",
        caveats: "This describes the federal employees' plan (FEGLI) only; private and employer plans set their own definitions, exclusions and time limits. Use it as an illustration of why users should read their plan's definition of an accident, not as a rule about all AD&D."
      },
    },
    {
      kind: "fact-trimmed",
      id: "roadside-memberships-may-overlap",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["consumer-reports-roadside-assistance-plan"],
      reason: "The fact kept its other sources. What the dropped source added: Consumer Reports' note that roadside help is sold by car makers, insurers, auto clubs and some credit-card programs.",
    },
    {
      kind: "fact-trimmed",
      id: "add-definition-accident-only",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["opm-fegli-faq-life-benefits-cause-of-death", "opm-insurance-glossary"],
      reason: "The fact kept its other sources. What the dropped source added: the limb and eyesight examples and the statement that death or injury from other causes, such as illness, is not paid (OPM federal plan).",
    },
    {
      kind: "fact-trimmed",
      id: "term-life-pays-on-death-in-term",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["opm-fegli-faq-life-benefits-cause-of-death"],
      reason: "The fact kept its other sources. What the dropped source added: the federal employees' plan statement that the regular life benefit is payable regardless of the cause of death.",
    },
    {
      kind: "fact-trimmed",
      id: "add-employer-coverage-ends-with-job",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["opm-fegli-faq-add-retirement"],
      reason: "The fact kept its other sources. What the dropped source added: OPM's statement that federal AD&D coverage ends when employment ends and cannot be carried into retirement.",
    },
  ],

  gaps: [
    "Phone protection plans: no NAIC, Triple-I, FTC, CFPB or FCC page on carrier or manufacturer phone-protection plans was found (searches on those domains returned nothing relevant). The only material found was Consumer Reports, which is not on the S3a authority allowlist, so every phone fact was removed (see rejected).",
    "Credit-card extended warranty: neither FTC warranty page mentions card warranty extensions and no CFPB page was found. The only source was Consumer Reports (not on the allowlist), so no generic card-extension statement is sourced.",
    "Primary versus secondary card rental coverage: NAIC, Triple-I and the FTC support 'usually secondary' and 'often requires declining the waiver'. No consumer-agency page found names which cards are primary, so primary coverage for any card must come from the issuer's guide (story S4a). A state insurance regulator's page seen in search results says corporate cards may be primary, but it is specific to one state and was not fetched, so it is not used.",
    "Rental coverage outside the United States and the effect of a rental claim on your own premium: neither Triple-I nor the FTC addresses these, and only commercial pages did, so nothing is asserted. Liability coverage on credit cards is also unaddressed by the sources.",
    "Rental waiver price: Triple-I and the FTC give no price. The NAIC's roughly $10-$20 a day is undated, and older FTC-related figures seen in search summaries came from reproduced or state documents that were not fetched.",
    "Towing and roadside: no authoritative source for typical limits, prices, mileage caps or whether labor is included on an auto-policy add-on. Triple-I's rental and auto-basics pages do not discuss roadside. Consumer Reports prices are 2023 and commercial-example based, so they are not used.",
    "Roadside duplication: only the NAIC sentence about memberships supports the overlap. No allowlisted page says a credit-card roadside program duplicates an auto-policy add-on, or how the two coordinate.",
    "Motorcycle and boat roadside: Triple-I's motorcycle page does not mention towing or roadside; its boat page lists towing after an accident among common and optional coverages without saying whether it is standard. Nothing authoritative says these usually duplicate car roadside or a card benefit (the spec's claim), so the flag should be a question.",
    "Travel insurance: neither the NAIC nor Triple-I says that a card's trip protection makes a separate policy unnecessary, and no source gives card trip-protection limits or whether they are primary. Both only say to check the card. NAIC and Triple-I do not compare travel medical cover with card benefits. A third NAIC page (Globetrotting, 2016) was read but adds nothing beyond the two travel sources used and does not mention credit cards.",
    "AD&D: no NAIC, Triple-I or federal consumer page was found that compares employer AD&D with term life directly. Triple-I's life insurance pages did not mention AD&D, riders or cause of death. The support is the NAIC glossary definition and the NAIC page on accidental death riders (federal-plan pages on opm.gov were found but removed because that host is not on the allowlist), so the 'AD&D on top of adequate term life is largely redundant' conclusion is the spec's judgement, supported only in part (travel accidental death 'may be duplicate', per Triple-I).",
    "Term life 'regardless of cause': no allowlisted page states it in words (only OPM did, for the federal employees' plan, and opm.gov was removed). NAIC pages say a term policy pays if the insured dies during the term without attaching a cause condition. Contestability, suicide-clause and exclusion terms of real term policies were not found on an authoritative page (the NAIC Life Insurance Buyer's Guide PDF was found but its text could not be extracted with the tools available), so the copy must hedge.",
    "Employer AD&D: no authoritative source found for how common employer AD&D riders are, typical amounts, whether private plans can be converted when you leave, or whether employer AD&D ends with the job (the only statements found were OPM's, for the federal plan, and opm.gov was removed).",
    "A Triple-I page on rental replacement cars after an accident (also noted in the auto research) is not needed for this bucket and was not used."
  ]
};
