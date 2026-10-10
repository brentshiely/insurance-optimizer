// Verified research: umbrella / liability stack (Story S3a).
// Plain data only. Every source below was fetched, read and independently re-checked on 2026-10-10.
// Claims are paraphrased. Items not supportable from an authoritative source are listed in `gaps`.
// S3a finalization (2026-10-10): the three Consumer Reports sources were moved to `rejected` because
// consumerreports.org is not on the S3a authority allowlist; facts that rested only on them were moved
// there too, and facts with other sources were trimmed to what those sources support.
export default {
  domain: "umbrella-liability-stack",
  retrievedOn: "2026-10-10",
  sources: [
    {
      id: "naic-whats-umbrella-policy",
      publisher: "National Association of Insurance Commissioners",
      title: "What’s an Umbrella Policy?",
      url: "https://content.naic.org/article/whats-umbrella-policy",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC Consumer Insight dated Dec 15 2022. Confirms extra liability and defense costs above primary policies (auto, home, renters named; condo/co-op not named), BI/PD/personal injury examples, no cover for own home or vehicle (hail example), punitive damages excluded (drunk driving example). Gives no limit amounts." }
    },
    {
      id: "naic-glossary",
      publisher: "National Association of Insurance Commissioners",
      title: "Glossary of Insurance Terms",
      url: "https://content.naic.org/glossary-insurance-terms",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC glossary. Entries found: 'Excess and Umbrella Liability' (liability coverage above a specific amount in the primary insurer's basic policy) and 'Umbrella and Excess (Personal)' (non-business liability protection for individuals above a specific amount). No 'Combined Single Limit' entry in the portion read." }
    },
    {
      id: "naic-homeowners-shopping-tool",
      publisher: "National Association of Insurance Commissioners",
      title: "A Shopping Tool for Homeowners Insurance",
      url: "https://content.naic.org/sites/default/files/committees_c_trans_read_wg_related_shopping_tool_singles.pdf",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched PDF and extracted text; NAIC 'A Shopping Tool for Homeowners Insurance', (c) 2023. Defines umbrella liability insurance as a separate policy raising liability above homeowners/auto levels, usually sold with limits of $1 million or more." }
    },
    {
      id: "naic-auto-shopping-tool",
      publisher: "National Association of Insurance Commissioners",
      title: "NAIC Consumer Shopping Tool for Auto Insurance",
      url: "https://content.naic.org/sites/default/files/inline-files/topic_transparency_readability_consumer_auto_tool.pdf",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched PDF and extracted text; NAIC Consumer Shopping Tool for Auto Insurance, (c) 2013. Confirms 25/50/15 explanation, 'general and not specific to your state', minimums vary by state, buy more than the minimum, UM/UIM definitions (most states require a minimum)." }
    },
    {
      id: "naic-what-does-auto-insurance-cover",
      publisher: "National Association of Insurance Commissioners",
      title: "What Does Auto Insurance Cover?",
      url: "https://content.naic.org/article/what-you-should-know-about-auto-insurance-coverage",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC Consumer Insight published June 11 2026. Confirms UM/UIM definitions ('in some states' required) and that an auto policy does not cover motorcycles, ATVs, off-road vehicles, RVs or commercial vehicles. S3a finalizer, 2026-10-10: this entry originally used the slug /article/what-does-auto-insurance-cover; both slugs load the same article (same title, June 11 2026 date and content), so the URL was aligned to the slug the auto, health and other research files use." }
    },
    {
      id: "naic-annual-insurance-checkup",
      publisher: "National Association of Insurance Commissioners",
      title: "Your Annual Insurance Check-up",
      url: "https://content.naic.org/article/consumer-insight-your-annual-insurance-check",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC page (newsroom date 2011, modified Jan 2024). Confirms $250,000 as an example limit in a basic homeowners policy ('might be') and that an umbrella can extend liability to $1 million or more above it." }
    },
    {
      id: "naic-pools-hot-tubs-backyard",
      publisher: "National Association of Insurance Commissioners",
      title: "Protecting Your Home: Coverage for Pools, Hot Tubs and Backyard Toys",
      url: "https://content.naic.org/article/consumer-insight-protecting-your-home-coverage-pools-hot-tubs-and-backyard-toys",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC Consumer Insight published May 1 2018, modified Jan 16 2024. Confirms umbrella is extra liability coverage 'above and beyond the limits of your homeowners and boat insurance policies'." }
    },
    {
      id: "naic-summer-safety-insured",
      publisher: "National Association of Insurance Commissioners",
      title: "Summer Safety: Are You Insured for Summer Fun?",
      url: "https://content.naic.org/article/consumer-insight-summer-safety-are-you-insured-summer-fun",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; NAIC Consumer Insight published May 1 2015, modified Jan 16 2024. Confirms small-boat liability is limited under a homeowners policy, large boats excluded for property and liability, and a boat policy provides liability coverage. It does not itself discuss umbrella over a boat policy (that is supported by the pools page)." }
    },
    {
      id: "naic-jir-social-media-underwriting",
      publisher: "National Association of Insurance Commissioners (Journal of Insurance Regulation)",
      title: "Social Media as a Factor in Personal Injury Underwriting: Risk, Rate and Regulation",
      url: "https://content.naic.org/sites/default/files/inline-files/JIR-ZA-39-01-EL_0.pdf",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched PDF and extracted text; NAIC Journal of Insurance Regulation vol 39 no 1, (c) 2020. Confirms umbrella usually includes personal injury coverage, many insurers use proprietary umbrella forms, umbrellas rarely purchased, intentional-acts exclusion wording, and business pursuits exclusion in homeowners and umbrella policies. Academic analysis, not a consumer guide." }
    },
    {
      id: "iii-what-is-umbrella-liability-policy",
      publisher: "Insurance Information Institute",
      title: "What is an umbrella liability policy?",
      url: "https://www.iii.org/article/what-is-an-umbrella-liability-policy",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Triple-I, no publication date (2026 copyright). Confirms personal umbrella over auto, homeowners, renters and co-op/condo policies, pays when underlying limit is reached, adds claims such as libel and slander, and insurers generally want about $250,000 auto and $300,000 homeowners liability. Does not state typical umbrella limits and does not mention defense costs for the umbrella." }
    },
    {
      id: "iii-should-i-purchase-umbrella",
      publisher: "Insurance Information Institute",
      title: "Should I purchase an umbrella liability policy?",
      url: "https://www.iii.org/article/should-i-purchase-an-umbrella-liability-policy",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Triple-I, no publication date (2026 copyright). Confirms at least $250,000 auto and $300,000 homeowners liability for most insurers before a $1 million umbrella, umbrella applies after underlying coverage is exhausted, and lifestyle risks (pool, rental property, dog, teen driver)." }
    },
    {
      id: "iii-homebuyers-handbook",
      publisher: "Insurance Information Institute",
      title: "Homebuyers Insurance Handbook",
      url: "https://www.iii.org/sites/default/files/docs/pdf/2023_triple-i_homeowners_insurance_handbook.pdf",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched PDF and extracted text; Triple-I Homebuyers Insurance Handbook (2023 file). Confirms liability limits start about $100,000 and increasingly $300,000 to $500,000 is recommended, umbrella starts to pay after underlying liability is used up, the 'property, investments or savings worth more than your liability limits' test, cost falls as underlying liability rises, and most companies require at least $300,000 underlying homeowners liability." }
    },
    {
      id: "iii-business-vehicle-insurance",
      publisher: "Insurance Information Institute",
      title: "Business Vehicle Insurance",
      url: "https://www.iii.org/publication/insuring-your-business-small-business-owners-guide-to-insurance/specific-coverages/business-vehicle-insurance",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Triple-I. Confirms a personal umbrella typically excludes claims arising in the course of a business endeavor, and that personal auto commonly uses split limits while the business auto form commonly uses a combined single limit." }
    },
    {
      id: "iii-insuring-home-business",
      publisher: "Insurance Information Institute",
      title: "Insuring Your Home Business",
      url: "https://www.iii.org/article/insuring-your-home-business",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Triple-I. Confirms homeowners policies usually do not cover business-related liability and that personal umbrella policies cover liability from business activities only if the basic policies do." }
    },
    {
      id: "iii-boat-insurance-and-safety",
      publisher: "Insurance Information Institute",
      title: "Boat insurance and safety",
      url: "https://www.iii.org/article/boat-insurance-and-safety",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Triple-I, no date. Confirms homeowners liability for small craft is typically not included but can be added by endorsement, boat policies generally give broader liability protection, and an umbrella may be considered by boat owners. Says boat size, type, value and waters used affect coverage needed; it does not say coverage varies significantly by insurer." }
    },
    {
      id: "iii-motorcycle-insurance",
      publisher: "Insurance Information Institute",
      title: "Motorcycle insurance",
      url: "https://www.iii.org/article/motorcycle-insurance",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Triple-I. Confirms motorcycle liability covers bodily injury and property damage to others. Does not itself say a car policy excludes motorcycles (NAIC page does)." }
    },
    {
      id: "iii-protect-yourself-uninsured-motorists",
      publisher: "Insurance Information Institute",
      title: "Protect yourself against uninsured motorists",
      url: "https://www.iii.org/article/protect-yourself-against-uninsured-motorists",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Triple-I. Confirms UM/UMBI, UMPD (availability varies by state), UIM definitions, hit-and-run, and 'a handful of states' require uninsured coverage on all auto policies." }
    },
  ],
  facts: [
    {
      id: "umbrella-is-liability-only",
      topic: "What a personal umbrella policy is",
      claim: "A personal umbrella policy is extra liability protection, including legal defense costs, that sits above the liability limits of your underlying auto, home and renters (and similar condo or co-op) policies. It responds when you are legally responsible for bodily injury, property damage or personal injury to someone else.",
      sourceIds: ["naic-whats-umbrella-policy", "naic-glossary", "iii-what-is-umbrella-liability-policy"],
      confidence: "high",
      caveats: "Terms differ by insurer and policy form, so the user's own policy wording controls. NAIC page published December 2022; the NAIC glossary entry describes personal umbrella as non-business liability protection above a set amount in the primary insurer's basic policy. Triple-I pages show no publication date (2026 copyright footer only)."
    },
    {
      id: "umbrella-not-own-property-or-punitive",
      topic: "Umbrella does not cover your own property",
      claim: "An umbrella does not pay to repair your own home or vehicle: NAIC's example is hail damage to a car that the auto policy does not cover, which the umbrella would not cover either. NAIC also lists punitive damages (its example is drunk driving) as not covered.",
      sourceIds: ["naic-whats-umbrella-policy"],
      confidence: "high",
      caveats: "From a single NAIC consumer page (December 2022). Property damage to your own things is covered, if at all, by your home and auto policies (collision, comprehensive, dwelling), not by the umbrella."
    },
    {
      id: "umbrella-attaches-after-underlying-exhausted",
      topic: "How an umbrella attaches",
      claim: "An umbrella begins to pay only after the liability limit of the underlying policy has been used up, and it adds to those policies rather than replacing them. NAIC's glossary describes it as protection above a specific amount set in the primary insurer's basic policy.",
      sourceIds: ["iii-what-is-umbrella-liability-policy", "iii-should-i-purchase-umbrella", "iii-homebuyers-handbook", "naic-glossary"],
      confidence: "high",
      caveats: "These sources state the exhaustion concept but none of them describes what happens when the underlying limit is lower than the umbrella insurer's required limit or the underlying policy lapses (see gaps)."
    },
    {
      id: "umbrella-typical-limit-1m-or-more",
      topic: "Typical umbrella amounts",
      claim: "Umbrella liability policies are usually sold with limits of $1 million or more.",
      sourceIds: ["naic-homeowners-shopping-tool"],
      confidence: "high",
      caveats: "NAIC consumer guide, copyright 2023. It gives only the floor. No authoritative page fetched states the standard increments (for example $1 million steps) or a usual maximum; the 1, 2 and 5 million presets in the product spec are a product choice, not a sourced list."
    },
    {
      id: "umbrella-underlying-minimums-typical",
      topic: "Required underlying limits (typical figures)",
      claim: "Triple-I says most insurers want about $250,000 of liability coverage on your auto policy and about $300,000 on your homeowners policy before they will sell a $1 million umbrella. Its homeowners handbook likewise says most companies require at least $300,000 of underlying home liability.",
      sourceIds: ["iii-should-i-purchase-umbrella", "iii-what-is-umbrella-liability-policy", "iii-homebuyers-handbook"],
      confidence: "high",
      caveats: "Stated as what most insurers want, not a universal rule. The pages do not say whether the auto figure is a per-person limit, a combined single limit or a split limit, give no property-damage figure, and give no separate figure for larger umbrellas, motorcycles, boats or RVs. Pages are undated (2026 footer); the handbook is a 2023 publication."
    },
    {
      id: "umbrella-underlying-requirements-insurer-specific",
      topic: "Requirements vary by insurer",
      claim: "Because the typical underlying limits are described as what most insurers or companies want, each insurer sets its own requirement. Triple-I words the figures as what insurers want before they will sell the umbrella, so limits below that may have to be raised first.",
      sourceIds: ["iii-should-i-purchase-umbrella", "iii-homebuyers-handbook"],
      confidence: "medium",
      caveats: "The variation is inferred from the 'most insurers' and 'most companies' wording; no source lists specific insurers' schedules. The product should tell users to check their own umbrella's required-underlying schedule or ask the insurer."
    },
    {
      id: "higher-underlying-limits-lower-umbrella-cost",
      topic: "Trade-off when adjusting primary liability",
      claim: "Triple-I's handbook says an umbrella's cost depends on how much underlying insurance you carry and the risk you present, and that more underlying liability coverage means a cheaper umbrella.",
      sourceIds: ["iii-homebuyers-handbook"],
      confidence: "medium",
      caveats: "Single statement in a 2023 handbook, no figures. Neither Triple-I nor NAIC says anything about reducing primary liability once an umbrella exists (see gaps)."
    },
    {
      id: "um-uim-is-auto-policy-coverage",
      topic: "What UM/UIM is",
      claim: "Uninsured and underinsured motorist coverage is an auto-policy coverage that pays you and your passengers when an at-fault driver has no insurance (or flees) or has too little to cover your loss. How it is defined, the amounts and whether it is required vary by state and by policy.",
      sourceIds: ["naic-auto-shopping-tool", "iii-protect-yourself-uninsured-motorists", "naic-what-does-auto-insurance-cover"],
      confidence: "high",
      caveats: "These sources describe UM/UIM only as part of the auto policy; none of the NAIC or Triple-I pages fetched says whether an umbrella includes UM/UIM by default or can be endorsed for it (see gaps). On how many states require it the sources differ in wording (NAIC 2013 tool says most states; the NAIC 2026 page says some; Triple-I says a handful require it on all policies), so do not state a count."
    },
    {
      id: "umbrella-business-activity-excluded",
      topic: "Umbrella exclusion: business activity",
      claim: "A personal umbrella typically excludes claims that arise in the course of a business endeavor, and Triple-I says it covers business-related liability only to the extent the underlying policy does. Homeowners policies themselves usually do not cover liability from a business run at home.",
      sourceIds: ["iii-business-vehicle-insurance", "iii-insuring-home-business", "naic-jir-social-media-underwriting"],
      confidence: "high",
      caveats: "Whether a side activity counts as a business depends on the policy's definition and the facts, so the product should ask the question rather than decide. The NAIC-published journal article (Journal of Insurance Regulation, vol. 39 no. 1, 2020) refers to a business pursuits exclusion in homeowners and umbrella policies; it is an academic analysis, not a consumer guide. Triple-I pages are undated (2026 footer)."
    },
    {
      id: "umbrella-personal-injury-coverage-varies",
      topic: "Umbrella: personal injury (libel and slander) coverage",
      claim: "Umbrellas often add coverage for personal injury claims such as libel and slander; homeowners policies generally offer that kind of coverage only through an added endorsement. Insurers use their own forms, so the extent of this coverage varies and the user should ask.",
      sourceIds: ["iii-what-is-umbrella-liability-policy", "naic-jir-social-media-underwriting"],
      confidence: "medium",
      caveats: "The NAIC-published journal article (2020) says a personal umbrella usually includes such coverage and that homeowners coverage for these claims needs a personal injury endorsement and that many insurers use proprietary umbrella forms; it also notes that umbrellas are rarely purchased. 'Varies' is supported by that form variation, not by a survey of forms."
    },
    {
      id: "umbrella-intentional-acts-excluded",
      topic: "Umbrella exclusion: intentional acts",
      claim: "An NAIC-published journal article says personal-injury coverage, whether added to a homeowners policy by endorsement or provided under an umbrella, comes with an intentional-acts exclusion. The wording it quotes excludes harm done with knowledge that the act would violate another person's rights, and publishing material the insured knew was false.",
      sourceIds: ["naic-jir-social-media-underwriting"],
      confidence: "medium",
      caveats: "One academic article (2020). The quoted wording is introduced as the exclusion on personal-injury coverage generally; the article does not say it comes from a particular insurer's umbrella form. It is not an exhaustive exclusion list and applies to the personal-injury part of the coverage, so it should not be generalized into a complete description of every umbrella."
    },
    {
      id: "specialty-vehicles-need-their-own-policies",
      topic: "Motorcycles, ATVs and RVs are outside a personal auto policy",
      claim: "A personal auto policy does not cover motorcycles, ATVs, off-road vehicles, RVs or commercial vehicles, so liability protection for them comes from their own policies; for example, a motorcycle policy's liability coverage pays for bodily injury and property damage the rider causes to others.",
      sourceIds: ["naic-what-does-auto-insurance-cover", "iii-motorcycle-insurance"],
      confidence: "high",
      caveats: "NAIC page dated June 2026; Triple-I page undated. Neither source says what underlying limits an umbrella insurer requires on these separate policies (see gaps)."
    },
    {
      id: "boats-need-own-liability-and-sit-under-umbrella",
      topic: "Boats and the umbrella",
      claim: "Homeowners policies give boats little liability protection: a small boat gets limited coverage and a large boat is excluded from homeowners property and liability coverage. Boat policies generally carry broader liability protection, and NAIC describes umbrella coverage as sitting above the limits of both homeowners and boat policies.",
      sourceIds: ["naic-summer-safety-insured", "iii-boat-insurance-and-safety", "naic-pools-hot-tubs-backyard"],
      confidence: "high",
      caveats: "Triple-I notes homeowners liability for small craft is typically not included but can be added by endorsement, and that the right coverage depends on the boat's size, type and value and where it is used. NAIC pages were published 2015 (summer safety) and 2018 (pools and backyard) and show a January 2024 modified date; only the pools page mentions umbrella coverage over boat policies. No source states a required boat liability limit for an umbrella (see gaps)."
    },
    {
      id: "auto-liability-limit-format",
      topic: "What auto liability numbers like 250/500 mean",
      claim: "Auto liability limits are written as up to three numbers: the most paid for bodily injury to any one person, the most paid for all people injured in one accident, and the most paid for property damage in one accident. For example, 25/50/15 means $25,000, $50,000 and $15,000.",
      sourceIds: ["naic-auto-shopping-tool"],
      confidence: "high",
      caveats: "NAIC tool is copyright 2013 (definitions are stable). The product's presets such as 250/500 omit the third (property damage) number, so copy should say the first two numbers are bodily injury per person and per accident and that a third number, if shown, is property damage."
    },
    {
      id: "auto-state-minimums-vary",
      topic: "State-required auto liability minimums vary",
      claim: "Most states require a minimum amount of auto liability coverage, the amount varies by state, and you pay out of pocket for any injury or damage you cause above your limit. The NAIC's guide advises buying more than your state's required minimum.",
      sourceIds: ["naic-auto-shopping-tool"],
      confidence: "high",
      caveats: "NAIC's guide says it is general and not specific to any state. It gives no minimum amounts, and the tool must not name or rank states; point users to their own state's department of insurance."
    },
    {
      id: "split-limits-vs-combined-single-limit",
      topic: "Split limits versus combined single limit",
      claim: "Personal auto policies usually list separate limits for bodily injury and property damage (split limits), while a combined single limit is one dollar cap that covers bodily injury and property damage together for an accident.",
      sourceIds: ["iii-business-vehicle-insurance"],
      confidence: "medium",
      caveats: "Triple-I makes the contrast on its commercial vehicle page (business auto commonly uses a combined single limit). No NAIC glossary entry for combined single limit was found, and no authoritative source gives typical combined-single-limit amounts for personal auto."
    },
    {
      id: "home-liability-typical-amounts",
      topic: "Typical homeowners personal-liability amounts",
      claim: "Homeowners liability limits generally start at about $100,000, and Triple-I's handbook says it is increasingly recommended to consider $300,000 to $500,000. NAIC gives $250,000 as an example of a limit in a basic homeowners policy (page newsroom-dated 2011, modified 2024).",
      sourceIds: ["iii-homebuyers-handbook", "naic-annual-insurance-checkup"],
      confidence: "high",
      caveats: "NAIC's $250,000 is an illustration ('might be'), not a stated default. Amounts differ by insurer and policy."
    },
    {
      id: "umbrella-sizing-by-assets",
      topic: "How much umbrella to buy",
      claim: "Triple-I's homebuyers handbook poses a test for whether you need an umbrella: do you hold property, investments or savings worth more than your liability limits?",
      sourceIds: ["iii-homebuyers-handbook"],
      confidence: "medium",
      caveats: "Qualitative rule of thumb only, from a single Triple-I handbook (2023 file). No allowlisted page gives a net-worth multiple or formula, and which assets a judgment could reach is not sourced here, so a precise exposure figure is not knowable by the tool; use coarse bands and state this is a guide, not advice."
    },
    {
      id: "lawsuit-exposure-factors",
      topic: "Situations that raise lawsuit exposure",
      claim: "Triple-I lists owning a pool, renting out property you own, and having a dog or a teen driver in the household as lifestyle risks that can lead to lawsuits.",
      sourceIds: ["iii-should-i-purchase-umbrella"],
      confidence: "high",
      caveats: "Illustrative list, not exhaustive. Triple-I page undated (2026 footer)."
    }
  ],
  designInputs: {
    umbrellaLimitTiers: {
      sourcedFloor: 1000000,
      sourcedWording: "usually sold with limits of $1 million or more",
      specPresets: [1000000, 2000000, 5000000],
      note: "Only the $1 million floor is sourced. Treat 1M, 2M and 5M as product presets and do not cite them as 'standard increments'.",
      factIds: ["umbrella-typical-limit-1m-or-more"]
    },
    typicalUnderlyingRequirement: {
      assumesUmbrellaOf: 1000000,
      autoLiabilityAbout: 250000,
      homeLiabilityAbout: 300000,
      autoLimitFormatUnspecified: true,
      note: "Triple-I gives these as what most insurers want. It does not define the auto figure as per-person, combined single or split, and gives no property-damage, motorcycle, boat or RV figure. The home figure of 500,000 offered as a spec preset is not documented as an umbrella requirement.",
      factIds: ["umbrella-underlying-minimums-typical", "umbrella-underlying-requirements-insurer-specific"]
    },
    underlyingRequirementsAreInsurerSpecific: {
      rule: "Copy must say requirements vary by insurer and tell users to check their umbrella's required-underlying schedule; the 'not sure' option on the umbrella's required home minimum is therefore legitimate.",
      factIds: ["umbrella-underlying-requirements-insurer-specific"]
    },
    presetComparisonToTypicalRequirement: {
      derivedFromFactsNotASourcedClaim: true,
      note: "A suggested mapping for S6 to settle in DECISIONS.md, derived from the typical figures. Final attachment rules are an S6 decision, not research.",
      autoPresets: {
        "100/300": "per-person 100,000 is below the typical 250,000 requirement",
        "250/500": "per-person 250,000 meets the typical requirement",
        "500/500": "per-person 500,000 meets the typical requirement",
        "not_sure": "unknown; ask"
      },
      homePresets: {
        "300000": "meets the typical 300,000 requirement",
        "500000": "meets the typical requirement",
        "1000000": "meets the typical requirement",
        "not_sure": "unknown; ask"
      },
      factIds: ["umbrella-underlying-minimums-typical", "auto-liability-limit-format"]
    },
    autoLiabilityFormat: {
      meaning: "first number = bodily injury per person, second = bodily injury per accident, third (if shown) = property damage per accident",
      noSourcedBaselineRecommendation: "Consumer Reports' 100/300/100 and 250/500/250 recommendations were removed with its sources (host not on the S3a allowlist). The only sourced advice left is the NAIC's: buy more than your state's required minimum.",
      specPresets: ["100/300", "250/500", "500/500"],
      copyNote: "Spec presets show two numbers; copy should explain the two and mention a third property-damage number if the policy lists one. A combined single limit is a single cap for both; offer 'not sure'.",
      factIds: ["auto-liability-limit-format", "auto-state-minimums-vary", "split-limits-vs-combined-single-limit"]
    },
    homeLiabilityTiers: {
      commonStart: 100000,
      illustrativeBasicExample: 250000,
      typicalMinimumForUmbrella: 300000,
      recommendedRangeToConsider: [300000, 500000],
      specPresets: [300000, 500000, 1000000],
      factIds: ["home-liability-typical-amounts", "umbrella-underlying-minimums-typical"]
    },
    exposureBands: {
      specBands: ["under 1 million", "1 to 3 million", "over 3 million", "not sure"],
      rule: "Qualitative: the umbrella should at least cover the assets that exceed the underlying liability limits. No authoritative numeric formula exists in the sources, so keep the bands coarse and never collect a figure.",
      cautions: [
        "Say the band is a rough guide, not advice.",
        "Which assets a judgment could reach is not covered by the allowlisted sources, so the user's own exposure figure is uncertain; never collect a figure."
      ],
      factIds: ["umbrella-sizing-by-assets", "lawsuit-exposure-factors"]
    },
    umUimOnUmbrella: {
      approach: "Question item only. Ask whether the umbrella extends uninsured/underinsured motorist coverage and, if not, whether it can be added.",
      doNotAssert: "Do not state that umbrellas exclude UM/UIM by default, or that endorsements exist; no authoritative source for either was found (see gaps).",
      supportingBackground: "UM/UIM is an auto-policy coverage that pays you when the at-fault driver has no or too little insurance; an umbrella is described by NAIC and Triple-I as liability protection above underlying limits.",
      factIds: ["um-uim-is-auto-policy-coverage", "umbrella-is-liability-only"]
    },
    scopeExclusionsToAsk: {
      sourced: [
        { topic: "business or side-gig activity", strength: "typically excluded; covered only if the underlying policy covers it", factIds: ["umbrella-business-activity-excluded"] },
        { topic: "your own home or vehicle", strength: "never covered by the umbrella", factIds: ["umbrella-not-own-property-or-punitive"] },
        { topic: "punitive damages", strength: "listed by NAIC as not covered", factIds: ["umbrella-not-own-property-or-punitive"] },
        { topic: "intentional acts", strength: "excluded from the personal-injury part of the coverage per sample exclusion wording; do not over-generalize", factIds: ["umbrella-intentional-acts-excluded"] },
        { topic: "personal injury (libel and slander)", strength: "often included but varies by form; ask", factIds: ["umbrella-personal-injury-coverage-varies"] }
      ],
      notSourced: ["contractual liability (no authoritative personal-umbrella source found)"],
      emphasis: "Raise the business question more strongly for anyone with a side business, as the spec requires.",
      factIds: ["umbrella-business-activity-excluded", "umbrella-not-own-property-or-punitive", "umbrella-intentional-acts-excluded", "umbrella-personal-injury-coverage-varies"]
    },
    otherVehiclesUnderUmbrella: {
      supportedStatements: [
        "A personal auto policy does not cover motorcycles, ATVs, off-road vehicles or RVs, so each needs its own liability policy.",
        "Large boats are excluded from homeowners liability, small boats get limited liability, and boat policies carry broader liability.",
        "NAIC describes umbrella coverage as sitting above homeowners and boat policy limits."
      ],
      notSupported: "That an umbrella insurer requires specific underlying limits on a motorcycle, boat or RV (see gaps). Phrase the motorcycle/boat Raise item as a question about what the umbrella requires, with the typical home and auto figures as context only.",
      factIds: ["specialty-vehicles-need-their-own-policies", "boats-need-own-liability-and-sit-under-umbrella"]
    },
    primaryLiabilityTradeoff: {
      supported: "More underlying liability makes the umbrella cheaper, and umbrella insurers set minimum underlying limits.",
      notSupported: "Any authoritative statement about reducing primary liability once an umbrella exists. A 'Drop' recommendation to cut primary liability limits should not be made on the strength of this research; use a Question item.",
      factIds: ["higher-underlying-limits-lower-umbrella-cost", "umbrella-underlying-minimums-typical"]
    },
    gapConsequenceCopy: {
      rule: "The spec's rationale that a shortfall in an underlying limit can void umbrella coverage on a claim is not confirmed by any authoritative page fetched. Word the home-below-minimum Raise item as: ask the insurer whether the umbrella still responds as expected with the current underlying limit, and raise the limit to the umbrella's stated requirement. Do not state the consequence as fact unless a source is added.",
      factIds: ["umbrella-attaches-after-underlying-exhausted", "umbrella-underlying-requirements-insurer-specific"]
    },
    stateNeutrality: {
      rule: "State minimums for auto liability and UM/UIM vary by state; cite NAIC and tell users to check their own state's department of insurance without naming a state.",
      factIds: ["auto-state-minimums-vary", "um-uim-is-auto-policy-coverage"]
    },
    authorityNotes: {
      consumerReports: "Removed in S3a finalization: consumerreports.org is not on the S3a authority allowlist. The 100/300/100 and 250/500/250 auto recommendations, the asset-sizing advice from Consumer Reports and the retirement-account and home-equity exposure points are no longer supported. They are kept, with their sources, under rejected for reinstatement if the owner allows the domain.",
      naicJournal: "The Journal of Insurance Regulation article is an academic analysis published by the NAIC. It is used only for exclusion wording and personal-injury coverage, at medium confidence.",
      pdfSources: "Four sources are PDFs (NAIC homeowners and auto shopping tools, the Triple-I homebuyers handbook, the NAIC journal article). The verifier downloaded each, extracted its text and checked the cited statements against it."
    }
  },
  rejected: [
    {
      kind: "source",
      id: "cr-how-much-car-insurance",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.consumerreports.org is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "cr-how-much-car-insurance",
        publisher: "Consumer Reports",
        title: "How Much Car Insurance Do You Need?",
        url: "https://www.consumerreports.org/money/car-insurance/how-much-car-insurance-do-you-need-a1487104747/",
        authorityType: "consumer-org",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Consumer Reports, published Oct 3 2025. Confirms 100/300/100 as the usual recommendation (attributed to CR and the Insurance Information Institute), 250/500/250 for people with substantial assets, and that liability does not pay for your own car. Nonprofit consumer organization, not an insurer or comparison site; not named in the spec's seed list so owner must accept it." }
      },
    },
    {
      kind: "source",
      id: "cr-get-insurance-you-need",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.consumerreports.org is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "cr-get-insurance-you-need",
        publisher: "Consumer Reports",
        title: "Get the Insurance You Need at a Great Price",
        url: "https://www.consumerreports.org/money/get-the-insurance-you-need-at-a-great-price-a9133298560/",
        authorityType: "consumer-org",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Consumer Reports, Aug 3 2023. Confirms umbrella pays after underlying limits are exhausted, size to assets above home and auto liability limits, most umbrella claims from car crashes, higher exposure examples (rental property, boat, pool), retirement accounts safe from judgments, home equity reachable in some states." }
      },
    },
    {
      kind: "source",
      id: "cr-5-steps-protect-your-home",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.consumerreports.org is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "cr-5-steps-protect-your-home",
        publisher: "Consumer Reports",
        title: "5 Steps to Protect Your Home",
        url: "https://www.consumerreports.org/homeowners-insurance/steps-to-protect-your-home/",
        authorityType: "consumer-org",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched; Consumer Reports, Aug 1 2019. Confirms home liability usually starts at $100,000, umbrella extends beyond home and auto limits and can cover libel and slander, and you may need to raise home and auto limits before buying an umbrella." }
      },
    },
    {
      kind: "fact",
      id: "auto-liability-baseline-recommendations",
      reasonCode: "source-removed-claim-folded",
      reason: "Its claim was Consumer Reports' 100/300/100 and 250/500/250 recommendations plus NAIC's advice to buy more than the state minimum. Consumer Reports is not allowlisted; the NAIC half now lives in auto-state-minimums-vary.",
      original: {
        id: "auto-liability-baseline-recommendations",
        topic: "Recommended auto liability levels",
        claim: "Consumer Reports treats 100/300/100 as the baseline auto liability limit and suggests people with significant financial assets consider more, such as 250/500/250. NAIC says to buy more than your state's required minimum because you personally owe anything above your limits.",
        sourceIds: ["cr-how-much-car-insurance", "naic-auto-shopping-tool"],
        confidence: "high",
        caveats: "Consumer Reports article dated October 2025; it says Triple-I also recommends 100/300/100, but that attribution was not verified on a Triple-I page. These are recommendations from a consumer organization and NAIC guidance, not legal or insurer requirements."
      },
    },
    {
      kind: "fact-trimmed",
      id: "umbrella-underlying-requirements-insurer-specific",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["cr-5-steps-protect-your-home"],
      reason: "The fact kept its other sources. What the dropped source added: Consumer Reports' note that you may have to raise your auto and home liability limits before you can buy an umbrella.",
    },
    {
      kind: "fact-trimmed",
      id: "umbrella-personal-injury-coverage-varies",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["cr-5-steps-protect-your-home"],
      reason: "The fact kept its other sources. What the dropped source added: a second source for umbrellas covering libel and slander (Triple-I and the NAIC journal article still support the claim).",
    },
    {
      kind: "fact-trimmed",
      id: "auto-liability-limit-format",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["cr-how-much-car-insurance"],
      reason: "The fact kept its other sources. What the dropped source added: a second source for the three-number format (the NAIC tool still supports the claim).",
    },
    {
      kind: "fact-trimmed",
      id: "home-liability-typical-amounts",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["cr-5-steps-protect-your-home"],
      reason: "The fact kept its other sources. What the dropped source added: Consumer Reports' agreement that home liability limits usually start at $100,000 (Triple-I still supports it).",
    },
    {
      kind: "fact-trimmed",
      id: "umbrella-sizing-by-assets",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["cr-get-insurance-you-need", "cr-5-steps-protect-your-home"],
      reason: "The fact kept its other sources. What the dropped source added: Consumer Reports' advice to size an umbrella to the assets above your home and auto liability limits, and its points that qualified retirement accounts are generally safe from judgments while home equity may be reachable in some states.",
    },
    {
      kind: "fact-trimmed",
      id: "lawsuit-exposure-factors",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["cr-get-insurance-you-need"],
      reason: "The fact kept its other sources. What the dropped source added: Consumer Reports' additions (boats as an exposure, and most umbrella claims coming from car crashes).",
    },
  ],
  gaps: [
    "Consequence of an underlying limit below the umbrella's requirement or a lapsed underlying policy (the insured pays the gap; the umbrella pays only as if the required limit were in place): no fetched NAIC, Triple-I, Consumer Reports or federal page states this. The only sources found that do are insurance-education course PDFs on riskeducation.org (returned HTTP 404 when fetched, so not cited), plus trade, broker and commercial sites that are excluded by the authority rules.",
    "Whether umbrellas include uninsured/underinsured motorist coverage by default or only by endorsement (and where available): no NAIC, Triple-I, Consumer Reports, CFA or Insurance Research Council page found addresses it; the only material found was from insurers, brokers, comparison sites and state court opinions. Left as a Question item with no factual assertion.",
    "Standard umbrella increments and the usual maximum: NAIC says limits of $1 million or more; the Triple-I pages fetched give no increments or range, and sources that do (for example $1 million steps, up to $5 million or $10 million) were not authoritative or were not on the fetched page.",
    "Contractual liability as an umbrella exclusion: no authoritative personal-umbrella source found (only commercial-umbrella commentary from non-authoritative sites).",
    "Required underlying liability limits for motorcycles, boats and RVs, and any rule that they must match auto limits: not found in NAIC, Triple-I or Consumer Reports. Only supporting facts exist (these vehicles need their own policies and the umbrella sits above boat policies).",
    "Typical auto requirement in split-limit or combined-single-limit form (for example 250/500 or a $500,000 combined single limit) and a property-damage figure: Triple-I says only 'about $250,000' of auto liability; the split-limit figures commonly quoted appear on insurer and broker sites only. A home umbrella requirement of $500,000 is likewise undocumented (only $300,000 is sourced).",
    "Authoritative guidance on lowering primary auto or home liability once an umbrella is held: none found; Triple-I only says more underlying liability makes the umbrella cheaper.",
    "A numeric rule for umbrella size (for example a multiple of net worth): no NAIC or Triple-I formula found; the only sourced guidance is Triple-I's qualitative test about assets worth more than your liability limits.",
    "Combined single limit on personal auto policies: the NAIC glossary has no entry and Triple-I discusses it only for commercial auto, so the definition rests on one Triple-I page at medium confidence.",
    "Consumer Federation of America and the Insurance Research Council were searched for umbrella-specific material and had none (their uninsured-driver statistics belong to the auto research file).",
    "Recommended auto liability levels (such as 100/300/100 for most people and 250/500/250 for people with significant assets): the only source found was Consumer Reports, which is not on the S3a authority allowlist, so these levels are unsourced and must not appear as a recommendation.",
    "Which assets a lawsuit judgment could reach (for example retirement accounts or home equity) and how to size an umbrella to assets: the only source found was Consumer Reports, which is not on the S3a authority allowlist, so nothing is asserted beyond Triple-I's qualitative test.",
    "Pages from state insurance departments were deliberately not used, because the tool is state-neutral and must not cite or name a single state; one state-regulator page (mass.gov) was also unreachable (HTTP 403)."
  ]
};
