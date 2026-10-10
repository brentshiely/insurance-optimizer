// Verified research: health and supplemental coverage (Overlap & Trim, story S3a).
// Plain data module: one default-exported object literal, no imports, no code.
// Every source below was fetched and read on 2026-10-10 (retrievedOn) and independently re-fetched and
// verified by a second pass on the same date (see each verification note).
// Facts are paraphrased; see caveats for dates, state variation and limits of each claim.
// S3a finalization (2026-10-10): three sources on hosts outside the S3a authority allowlist (reginfo.gov, gao.gov,
// files.gao.gov) and the fact that rested only on them were moved to `rejected`; two facts were trimmed.
// Scope reminder (SPEC): the product never judges health plan adequacy. This file only supports
// (1) the medical-rider overlap, (2) supplemental bolt-ons, short-term plans and HSA/FSA, and
// (3) the deductible-vs-cushion check.
// Reading notes: a few sources are PDFs (Rev. Proc. 2025-19, Rev. Proc. 2026-24, the NAIC
// coordination-of-benefits model regulation). Their text was extracted locally to read it; a verifier
// whose fetch tool returns raw PDF bytes should extract the text the same way.

export default {
  domain: "health-supplemental",
  retrievedOn: "2026-10-10",

  sources: [
    // ---- HealthCare.gov (CMS) ----
    {
      id: "healthcare-gov-glossary-deductible",
      publisher: "HealthCare.gov (U.S. Centers for Medicare & Medicaid Services)",
      title: "Deductible - Glossary | HealthCare.gov",
      url: "https://www.healthcare.gov/glossary/deductible/",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; title and publisher match; definition and the $2,000 example confirmed." }
    },
    {
      id: "healthcare-gov-glossary-out-of-pocket-maximum",
      publisher: "HealthCare.gov (U.S. Centers for Medicare & Medicaid Services)",
      title: "Out-of-pocket maximum/limit - Glossary | HealthCare.gov",
      url: "https://www.healthcare.gov/glossary/out-of-pocket-maximum-limit/",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; definition, what does not count toward the limit, and the Marketplace limits ($10,600 / $21,200 for 2026; $12,000 / $24,000 for 2027) confirmed." }
    },
    {
      id: "healthcare-gov-glossary-hsa",
      publisher: "HealthCare.gov (U.S. Centers for Medicare & Medicaid Services)",
      title: "Health Savings Account (HSA) - Glossary | HealthCare.gov",
      url: "https://www.healthcare.gov/glossary/health-savings-account-hsa/",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; confirms HSA needs an HSA-eligible (high-deductible) plan, pre-tax contributions, untaxed earnings, and that an HSA-eligible plan generally covers only preventive services before the deductible." }
    },
    {
      id: "healthcare-gov-glossary-open-enrollment",
      publisher: "HealthCare.gov (U.S. Centers for Medicare & Medicaid Services)",
      title: "Open Enrollment Period - Glossary | HealthCare.gov",
      url: "https://www.healthcare.gov/glossary/open-enrollment-period/",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; confirms Nov 1 to Jan 15 window, Medicaid/CHIP any time, and 'Job-based plans may have different Open Enrollment Periods. Check with your employer.'" }
    },
    {
      id: "healthcare-gov-dates-and-deadlines",
      publisher: "HealthCare.gov (U.S. Centers for Medicare & Medicaid Services)",
      title: "When can you get health insurance? | HealthCare.gov",
      url: "https://www.healthcare.gov/quick-guide/dates-and-deadlines/",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; page refers to 2027 coverage; Nov 1 start, Dec 15 deadline for Jan 1 coverage, Dec 16 to Jan 15 for Feb 1 coverage, Jan 15 end, special enrollment and Medicaid/CHIP confirmed." }
    },
    {
      id: "healthcare-gov-pre-existing-conditions",
      publisher: "HealthCare.gov (U.S. Centers for Medicare & Medicaid Services)",
      title: "Marketplace health plans cover pre-existing conditions | HealthCare.gov",
      url: "https://www.healthcare.gov/coverage/pre-existing-conditions/",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; confirms all Marketplace plans must cover pre-existing conditions, the grandfathered-plan exception (policies bought on or before 2010-03-23), and that short-term plans are not mentioned." }
    },
    {
      id: "healthcare-gov-what-marketplace-plans-cover",
      publisher: "HealthCare.gov (U.S. Centers for Medicare & Medicaid Services)",
      title: "Find out what Marketplace health insurance plans cover | HealthCare.gov",
      url: "https://www.healthcare.gov/coverage/what-marketplace-plans-cover/",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; 10 essential health benefit categories confirmed, and the note that large self-insured employer plans need not provide them; short-term plans not mentioned." }
    },

    // ---- Federal rules and guidance on supplemental and short-term products ----
    {
      id: "cms-stldi-fixed-indemnity-fact-sheet-2024",
      publisher: "U.S. Centers for Medicare & Medicaid Services",
      title: "Short-Term, Limited-Duration Insurance and Independent, Noncoordinated Excepted Benefits Coverage (CMS-9904-F) Fact Sheet",
      url: "https://www.cms.gov/newsroom/fact-sheets/short-term-limited-duration-insurance-and-independent-noncoordinated-excepted-benefits-coverage-cms",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; dated 2024-03-28; confirms fixed indemnity cash benefit and 'not a substitute for comprehensive coverage', notice rules from 2025-01-01, STLDI limits (3 months initial, 4 total for policies sold on/after 2024-09-01; older rules under 12 months / 36 months), and exemption from federal ACA protections." }
    },
    {
      id: "dol-aca-faqs-part-72",
      publisher: "U.S. Department of Labor (Employee Benefits Security Administration), with HHS and Treasury",
      title: "FAQs about Affordable Care Act Implementation Part 72",
      url: "https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/faqs/aca-part-72",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; dated 2025-10-16; main subject is fertility benefits; background section confirms the accident/disability income, specified disease and hospital/fixed indemnity excepted-benefit categories; 'critical illness' not used." }
    },
    {
      id: "dol-stldi-agencies-statement-2025",
      publisher: "U.S. Department of Labor (Employee Benefits Security Administration), with HHS and Treasury",
      title: "Statement of U.S. Departments of Labor, Health and Human Services, and the Treasury regarding short-term, limited-duration insurance",
      url: "https://www.dol.gov/agencies/ebsa/laws-and-regulations/laws/affordable-care-act/for-employers-and-advisers/short-term-limited-duration-insurance/stldi-statement-08-07-2025",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; dated 2025-08-07; confirms non-prioritized enforcement of the 2024 definition including its notice provision, planned notice-and-comment rulemaking, and HHS encouragement of states." }
    },
    {
      id: "dol-stldi-resource-page",
      publisher: "U.S. Department of Labor (Employee Benefits Security Administration)",
      title: "Short Term, Limited Duration Insurance | U.S. Department of Labor",
      url: "https://www.dol.gov/agencies/ebsa/laws-and-regulations/laws/affordable-care-act/for-employers-and-advisers/short-term-limited-duration-insurance",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; newest listed item is the 2025-08-07 statement; nothing newer listed." }
    },
    {
      id: "naic-stldi-topic",
      publisher: "National Association of Insurance Commissioners",
      title: "Short-Term Limited-Duration Health Plans",
      url: "https://content.naic.org/insurance-topics/short-term-limited-duration-health-plans",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; last updated 2026-07-02; confirms often medically underwritten, may not cover pre-existing conditions, EHB not required, annual/lifetime limits, state regulation and bans (no states named), revised federal rule expected in 2026." }
    },
    {
      id: "ftc-open-enrollment-scams-2025",
      publisher: "U.S. Federal Trade Commission (Consumer Advice)",
      title: "How to avoid health insurance scams this open enrollment season",
      url: "https://consumer.ftc.gov/consumer-alerts/2025/12/how-avoid-health-insurance-scams-open-enrollment-season",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; dated 2025-12-12; confirms the warning about comprehensive-sounding ads for a medical discount plan or a plan with limited insurance benefits, and the pointer to HealthCare.gov." }
    },

    // ---- HSA / FSA (IRS) ----
    {
      id: "irs-pub-969-2025",
      publisher: "Internal Revenue Service",
      title: "Publication 969 (2025), Health Savings Accounts and Other Tax-Favored Health Plans",
      url: "https://www.irs.gov/publications/p969",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10 (whole page read); 2025 edition; confirms HDHP-on-first-day-of-month rule, disqualifying coverage, other-health-coverage exceptions, FSA/HSA features (2.5-month grace period or $660 carryover, not both; self-employed not eligible for FSAs), and HSA tax treatment." }
    },
    {
      id: "irs-rev-proc-2025-19",
      publisher: "Internal Revenue Service",
      title: "Rev. Proc. 2025-19",
      url: "https://www.irs.gov/pub/irs-drop/rp-25-19.pdf",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "PDF downloaded and text extracted 2026-10-10; 2026 HDHP minimum deductible $1,700/$3,400, maximum out-of-pocket $8,500/$17,000, HSA limits $4,400/$8,750 confirmed." }
    },
    {
      id: "irs-rev-proc-2026-24",
      publisher: "Internal Revenue Service",
      title: "Rev. Proc. 2026-24",
      url: "https://www.irs.gov/pub/irs-drop/rp-26-24.pdf",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "PDF downloaded and text extracted 2026-10-10; 2027 HDHP minimum deductible $1,750/$3,500, maximum out-of-pocket $8,700/$17,400, HSA limits $4,500/$9,000 confirmed." }
    },

    // ---- Deductibles (III, NAIC) ----
    {
      id: "iii-understanding-your-insurance-deductibles",
      publisher: "Insurance Information Institute",
      title: "Understanding your insurance deductibles",
      url: "https://www.iii.org/article/understanding-your-insurance-deductibles",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; no date shown; confirms deductible definition, larger deductible/lower premium, declarations page, $500 or $1,000 minimum, wind/hail typically 1 to 5 percent (most commonly percentages), earthquake 2 to 20 percent. Uses 'comfortable with the amount', not 'afford'." }
    },
    {
      id: "naic-tips-saving-on-auto-insurance",
      publisher: "National Association of Insurance Commissioners",
      title: "Tips for Saving on your Auto Insurance",
      url: "https://content.naic.org/article/consumer-insight-tips-saving-your-auto-insurance",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; confirms advice to check whether you can afford to absorb a larger portion of a loss when raising collision/comprehensive deductibles; structured data modified date 2024-01-16." }
    },

    // ---- Cushion data (Federal Reserve SHED) ----
    {
      id: "fed-shed-2025-savings-and-investments",
      publisher: "Board of Governors of the Federal Reserve System",
      title: "Report on the Economic Well-Being of U.S. Households in 2025 - May 2026: Savings and Investments",
      url: "https://www.federalreserve.gov/publications/2026-economic-well-being-of-us-households-in-2025-savings-investments.htm",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; updated 2026-05-26; $400 expense 63% / 12% (13% in 2024) / 55% rainy day fund, and Table 26 savings-only percentages (18, 12, 9, 11, 12, 38) confirmed." }
    },
    {
      id: "fed-shed-2025-economic-hardships",
      publisher: "Board of Governors of the Federal Reserve System",
      title: "Report on the Economic Well-Being of U.S. Households in 2025 - May 2026: Economic Hardships",
      url: "https://www.federalreserve.gov/publications/2026-economic-well-being-of-us-households-in-2025-economic-hardships.htm",
      authorityType: "government",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; updated 2026-05-26; 21% medical, 30% vehicle, 22% house/appliance, median $1,000 to $1,999, 26% went without care, 18% medical debt confirmed." }
    },

    // ---- Medical-rider overlap (auto MedPay / home med-pay vs health) ----
    {
      id: "naic-what-does-auto-insurance-cover",
      publisher: "National Association of Insurance Commissioners",
      title: "What Does Auto Insurance Cover?",
      url: "https://content.naic.org/article/what-you-should-know-about-auto-insurance-coverage",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; dated 2026-06-11; confirms med pay/PIP pays for injuries to you and passengers, PIP can cover lost wages and funeral costs, no-fault own-insurer rule. The page does not say these coverages are required; that point rests on the III page." }
    },
    {
      id: "iii-auto-insurance-basics",
      publisher: "Insurance Information Institute",
      title: "Auto insurance basics—understanding your coverage",
      url: "https://www.iii.org/article/auto-insurance-basics-understanding-your-coverage",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; no date shown (2026 copyright); confirms medical payments reimbursement, 'many states require', and advice to consider it even when optional. Does not mention funeral costs or no-fault." }
    },
    {
      id: "iii-standard-homeowners-coverage",
      publisher: "Insurance Information Institute",
      title: "What is covered by standard homeowners insurance?",
      url: "https://www.iii.org/article/what-is-covered-by-standard-homeowners-insurance",
      authorityType: "industry-nonprofit",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; no date shown (2026 copyright); confirms no-fault medical payments for guests/neighbors and exclusion of family and pets; no limit stated." }
    },
    {
      id: "naic-coordination-of-benefits-model-regulation",
      publisher: "National Association of Insurance Commissioners",
      title: "Coordination of Benefits Model Regulation",
      url: "https://content.naic.org/sites/default/files/model-law-120.pdf",
      authorityType: "regulator",
      lastVerified: "2026-10-10",
      verification: { status: "verified", checkedOn: "2026-10-10", note: "PDF downloaded and text extracted 2026-10-10; NAIC Model 120, October 2013; Section 3 definition of plan includes auto no-fault/fault medical benefits, and the drafting note says med pay normally lacks order-of-benefit rules and would be primary unless state law says otherwise." }
    }
  ],

  facts: [
    // ================= Supplemental / limited-benefit health products =================
    {
      id: "fixed-indemnity-not-substitute-for-comprehensive-coverage",
      topic: "Fixed and hospital indemnity coverage",
      claim: "Hospital indemnity and other fixed indemnity coverage pays a set cash benefit that the policyholder can spend however they like. Federal regulators describe it as not a substitute for comprehensive health coverage.",
      sourceIds: ["cms-stldi-fixed-indemnity-fact-sheet-2024"],
      confidence: "high",
      caveats: "CMS fact sheet dated 2024-03-28 describing the 2024 final rule. The same page says the federal notice rules for fixed indemnity coverage apply to plan years (individual market: coverage periods) beginning on or after 2025-01-01. The page speaks about the product category; the exact benefits of any one policy vary by insurer and by state law."
    },
    {
      id: "supplemental-product-types-federal-categories",
      topic: "Accident, cancer and critical-illness style products",
      claim: "Under federal law, coverage only for accidents or disability income is generally not treated as health coverage at all, while cancer-only or other specified-disease policies and hospital or other fixed indemnity insurance are 'independent, noncoordinated excepted benefits'. Excepted benefits are generally not subject to the federal health-insurance requirements that apply to major medical coverage.",
      sourceIds: ["dol-aca-faqs-part-72"],
      confidence: "high",
      caveats: "Joint Labor, HHS and Treasury FAQ dated 2025-10-16. Its main topic is fertility benefits; the category descriptions used here come from the page's opening 'Excepted Benefits' background section. The page names accident-only, specified-disease/cancer-only and hospital or fixed indemnity; it does not use the term 'critical illness', so critical illness is covered here only through the 'specified disease or illness' wording. Whether a particular policy qualifies depends on how it pays and is sold, and states regulate these products too; point users to their state's department of insurance."
    },
    {
      id: "limited-benefit-plans-marketed-as-comprehensive",
      topic: "Limited-benefit plans around open enrollment",
      claim: "The FTC warns that some companies advertise what sounds like comprehensive health insurance when the product is really a plan with limited insurance benefits or a medical discount plan. It points people to HealthCare.gov for real Marketplace coverage.",
      sourceIds: ["ftc-open-enrollment-scams-2025"],
      confidence: "medium",
      caveats: "FTC consumer alert dated 2025-12-12 about deceptive marketing. It does not say that legitimate supplemental policies are bad or redundant; use it only to explain why users should check what a product actually is."
    },

    // ================= Short-term limited-duration insurance (STLDI) =================
    {
      id: "stldi-lacks-federal-aca-protections",
      topic: "Short-term plans vs ACA and employer coverage",
      claim: "Short-term limited-duration plans are generally not covered by the federal rules that bar health-status discrimination, pre-existing condition exclusions, and lifetime or annual dollar limits on essential health benefits. The NAIC adds that these plans are often medically underwritten, may not cover pre-existing conditions, are not required to cover essential health benefits such as maternity care, prescription drugs or mental health care, and can impose annual and lifetime limits.",
      sourceIds: ["cms-stldi-fixed-indemnity-fact-sheet-2024", "naic-stldi-topic"],
      confidence: "high",
      caveats: "CMS page dated 2024-03-28; NAIC page last updated 2026-07-02. Plan terms differ, and states can add requirements or ban the plans (see stldi-state-variation). Use 'may' and 'not required to' wording rather than saying a given plan definitely excludes something."
    },
    {
      id: "marketplace-plans-cover-preexisting-conditions-and-ehb",
      topic: "What ACA Marketplace plans must cover",
      claim: "All Marketplace plans must cover treatment for pre-existing conditions, and the page says no insurance plan can reject you or charge you more because of a condition you had before your coverage started. Every Marketplace plan covers the 10 essential health benefit categories, which include hospitalization, emergency services, maternity care, mental health and substance use services, and prescription drugs.",
      sourceIds: ["healthcare-gov-pre-existing-conditions", "healthcare-gov-what-marketplace-plans-cover"],
      confidence: "high",
      caveats: "These are Marketplace facts. The pre-existing page names grandfathered individual plans (bought on or before 2010-03-23) as an exception. The coverage page says large self-insured employer plans do not have to provide essential health benefits, though many do, and tells employees to ask their employer. Neither page mentions short-term plans, so the contrast with short-term plans comes from the CMS and NAIC pages."
    },
    {
      id: "stldi-2024-rule-duration-limits",
      topic: "Short-term plan duration: the 2024 federal rule as written",
      claim: "A 2024 federal rule redefined short-term limited-duration insurance as coverage with an initial term of no more than three months and a total duration, counting renewals and extensions, of no more than four months, for policies sold or issued on or after 2024-09-01. Older policies could keep an initial term under 12 months and up to 36 months total, subject to state law.",
      sourceIds: ["cms-stldi-fixed-indemnity-fact-sheet-2024"],
      confidence: "high",
      caveats: "Describes the rule as written in March 2024 and applies as of its stated dates only. The federal government has since said it will not prioritize enforcing this definition and is reconsidering it (see stldi-2025-enforcement-pause and stldi-federal-status-2026-10-10). Do not present 3 or 4 months as the current limit in user-facing copy."
    },
    {
      id: "stldi-2025-enforcement-pause",
      topic: "Short-term plan duration: August 2025 enforcement statement",
      claim: "On 2025-08-07 the Labor, HHS and Treasury departments said they do not intend to prioritize enforcement actions for violations of the 2024 definition of short-term limited-duration insurance, including its notice provision, until future rulemaking. They also said they plan notice-and-comment rulemaking to consider changing the definition, and HHS encouraged states to take a similar approach.",
      sourceIds: ["dol-stldi-agencies-statement-2025"],
      confidence: "high",
      caveats: "An enforcement-priority statement, not a repeal of the 2024 rule. States are not bound by it and can apply their own definitions."
    },
    {
      id: "stldi-federal-status-2026-10-10",
      topic: "Short-term plan federal rules: status as of 2026-10-10",
      claim: "As of 2026-10-10 the newest federal item listed on the Labor Department's short-term plan page is the August 2025 enforcement statement, and the NAIC says a revised federal rule is expected in 2026.",
      sourceIds: ["dol-stldi-resource-page", "naic-stldi-topic"],
      confidence: "medium",
      caveats: "This is a moving target. We found no published 2026 proposed or final rule text. A White House regulatory-review record for a proposed rule (CMS-9881, received 2026-05-30, pending) exists on reginfo.gov, but that host is not on the S3a allowlist, so it is not cited (see rejected). The Federal Register site blocked automated access, so its listing was not checked. Re-check before launch and each open enrollment; user-facing copy should say federal limits on these plans have changed several times and are being revised, and point to the state department of insurance."
    },
    {
      id: "stldi-state-variation",
      topic: "Short-term plans vary by state",
      claim: "Several states regulate or limit short-term limited-duration plans, and some ban their sale entirely, so what a person can buy depends on where they live.",
      sourceIds: ["naic-stldi-topic"],
      confidence: "high",
      caveats: "NAIC page last updated 2026-07-02. The page does not list which states. Keep overlap copy state-neutral and refer to 'your state's department of insurance'."
    },

    // ================= HSA / FSA =================
    {
      id: "hsa-eligibility-requires-hdhp",
      topic: "HSA eligibility",
      claim: "You can contribute to a health savings account only if you are covered by a high-deductible health plan (HDHP) on the first day of the month. You also cannot have other disqualifying health coverage, be enrolled in Medicare, or be claimed as someone else's dependent. An employee with a general-purpose health FSA or HRA generally cannot contribute either.",
      sourceIds: ["irs-pub-969-2025", "healthcare-gov-glossary-hsa"],
      confidence: "high",
      caveats: "IRS Publication 969 (2025 edition) describes 2025 rules; exceptions exist, such as limited-purpose or post-deductible FSAs and HRAs. HealthCare.gov's glossary says an HSA-eligible plan generally covers only preventive services before the deductible. Eligibility is decided from the plan's terms, not from the size of the deductible alone."
    },
    {
      id: "hsa-hdhp-thresholds-2026-2027",
      topic: "HDHP definition: dollar thresholds",
      claim: "For 2026 the IRS defines a high-deductible health plan as one with a deductible of at least $1,700 (self-only) or $3,400 (family) and annual out-of-pocket costs, excluding premiums, of no more than $8,500 (self-only) or $17,000 (family). For 2027 those amounts are $1,750 / $3,500 and $8,700 / $17,400.",
      sourceIds: ["irs-rev-proc-2025-19", "irs-rev-proc-2026-24"],
      confidence: "high",
      caveats: "Adjusted every year; each figure applies only to its own calendar year. The same revenue procedures set HSA contribution limits ($4,400 self-only / $8,750 family for 2026; $4,500 / $9,000 for 2027), which the product does not need. Never infer HDHP status from a user's deductible band."
    },
    {
      id: "hsa-tax-advantages",
      topic: "HSA tax advantages",
      claim: "HSA contributions are deductible (employer contributions are excluded from income), money in the account grows without tax, and withdrawals used for qualified medical expenses are not taxed. Unused money stays in the account from year to year, and the HSA stays with you if you change employers.",
      sourceIds: ["irs-pub-969-2025", "healthcare-gov-glossary-hsa"],
      confidence: "high",
      caveats: "Federal tax treatment only; state tax treatment was not researched. The source pages describe three tax benefits and do not use the phrase 'triple tax advantage'. The extra tax on non-qualified withdrawals was sourced only to GAO (host not on the allowlist) and is not asserted here. Dollar limits change yearly."
    },
    {
      id: "hsa-compatible-with-limited-supplemental-coverage",
      topic: "HSA and supplemental policies",
      claim: "Having additional insurance that pays only for a specific disease or illness, or a fixed amount per day of hospitalization, does not by itself stop you from contributing to an HSA. Coverage for accidents, disability, dental, vision, long-term care and telehealth is also allowed. A plan whose coverage is substantially all of those narrow items is not itself an HDHP.",
      sourceIds: ["irs-pub-969-2025"],
      confidence: "medium",
      caveats: "IRS Publication 969 (2025 edition); read from the 'Other health coverage' section. Applies to a person who already has a qualifying HDHP. Use only to avoid implying that a supplemental policy ruins HSA eligibility; do not use it to advise on a specific policy."
    },
    {
      id: "hsa-vs-health-fsa",
      topic: "HSA vs FSA basic differences",
      claim: "A health FSA is an employer-established plan, usually funded by salary reduction, and it is generally use-it-or-lose-it. A plan may allow either a grace period of up to 2.5 months or a limited carryover (up to $660 in the 2025 edition), not both. An HSA is a trust or custodial account you set up yourself with a trustee, it stays with you when you change jobs, and leftover money carries over.",
      sourceIds: ["irs-pub-969-2025"],
      confidence: "high",
      caveats: "IRS Publication 969 (2025 edition); the carryover dollar amount is for 2025 and changes. Self-employed people cannot have a health FSA per the same page. Do not quote FSA dollar limits in user-facing copy without a year."
    },

    // ================= Deductible and out-of-pocket maximum =================
    {
      id: "deductible-definition",
      topic: "Deductible definition (health)",
      claim: "A deductible is the amount you pay for covered health care services before your plan starts to pay. With a $2,000 deductible, you pay the first $2,000 of covered services yourself.",
      sourceIds: ["healthcare-gov-glossary-deductible"],
      confidence: "high",
      caveats: "HealthCare.gov glossary definition. Some services, such as certain preventive care, can be covered before the deductible; the glossary entry does not go into that."
    },
    {
      id: "out-of-pocket-maximum-definition",
      topic: "Out-of-pocket maximum definition",
      claim: "The out-of-pocket maximum is the most you pay for covered services in a plan year. After you reach it through deductibles, copayments and coinsurance for in-network care, your plan pays 100% of covered benefits. Premiums, services your plan does not cover, out-of-network care, and amounts above the allowed charge do not count toward it.",
      sourceIds: ["healthcare-gov-glossary-out-of-pocket-maximum"],
      confidence: "high",
      caveats: "HealthCare.gov glossary definition. It means a health bill can exceed the deductible; the deductible is not the worst case."
    },
    {
      id: "marketplace-out-of-pocket-limits-2026-2027",
      topic: "Marketplace out-of-pocket limits",
      claim: "HealthCare.gov lists the Marketplace out-of-pocket limit as up to $10,600 for one person and $21,200 for a family in 2026, and up to $12,000 and $24,000 in 2027.",
      sourceIds: ["healthcare-gov-glossary-out-of-pocket-maximum"],
      confidence: "medium",
      caveats: "Stated on the glossary page for Marketplace plans only; other plan types may have different limits. Figures reset every year. Use only as context for why the deductible alone understates a worst-case bill; the product should not ask for or judge the out-of-pocket limit."
    },
    {
      id: "deductible-premium-tradeoff-and-affordability",
      topic: "Choosing a deductible you can absorb (auto and home)",
      claim: "A deductible is the amount you are responsible for paying toward an insured loss, and generally the larger the deductible, the lower the premium. Both the III and the NAIC advise checking that you are comfortable with, or can afford to absorb, the bigger share of a loss before choosing or raising a deductible.",
      sourceIds: ["iii-understanding-your-insurance-deductibles", "naic-tips-saving-on-auto-insurance"],
      confidence: "high",
      caveats: "The NAIC advice is written for collision and comprehensive deductibles on a car, and its page metadata shows a 2024-01-16 modification date; the III page is general. Neither gives a savings threshold. The deductible appears on the declarations (front) page of the policy, per the III."
    },
    {
      id: "home-auto-deductible-forms-and-ranges",
      topic: "How home deductibles are expressed",
      claim: "The III says most homeowners and renters insurers offer a minimum deductible of $500 or $1,000, wind/hail deductibles are most often a percentage (typically 1% to 5%), and earthquake deductibles range from 2% to 20% of the home's replacement value depending on location.",
      sourceIds: ["iii-understanding-your-insurance-deductibles"],
      confidence: "high",
      caveats: "General ranges, not rules; actual deductibles vary by insurer and location. Percentage deductibles mean a single dollar-band question can misstate a home's real deductible, so wind/hail and earthquake percentages should be treated as a separate, optional ask rather than folded into a band."
    },

    // ================= Cushion data: Federal Reserve SHED =================
    {
      id: "shed-400-expense-cash-2025",
      topic: "Small emergency expense from cash or savings (2025 data)",
      claim: "In the Federal Reserve's 2025 household survey, published May 2026, 63% of adults said they would cover a $400 emergency expense using cash or its equivalent (cash, savings, or a credit card paid off at the next statement), 12% said they could not pay it by any means, and 55% said they had set aside three months of expenses in a rainy-day fund.",
      sourceIds: ["fed-shed-2025-savings-and-investments"],
      confidence: "high",
      caveats: "Data year 2025 (report dated May 2026); the 63% and 55% figures were unchanged from 2024 and the 12% figure was 13% in 2024. Survey of adults, not households. 'Cash or equivalent' includes a credit card that is paid off in full at the next statement."
    },
    {
      id: "shed-savings-only-largest-expense-2025",
      topic: "How large an expense adults could cover from savings alone (2025 data)",
      claim: "In the same 2025 survey, adults were asked the largest emergency expense they could handle right now using only savings: 18% said less than $100, 12% $100 to $499, 9% $500 to $999, 11% $1,000 to $1,999, 12% $2,000 to $4,999, and 38% $5,000 or more. Grouped, about 39% could cover less than $1,000, 23% could cover $1,000 to $4,999, and 38% could cover $5,000 or more.",
      sourceIds: ["fed-shed-2025-savings-and-investments"],
      confidence: "high",
      caveats: "Table 26 of the report, all adults, data year 2025. The three grouped percentages are our sums of the table rows. The report notes a 2025 split-sample change in how the top categories were shown. The top row is '$5,000 or more', so a '1,000 to 5,000' versus 'over 5,000' band needs a defined treatment of exactly $5,000."
    },
    {
      id: "shed-unexpected-medical-expense-2025",
      topic: "Size and frequency of unexpected medical bills (2025 data)",
      claim: "In the 2025 survey, 21% of adults reported an unexpected major medical expense in the prior 12 months, after 30% for a major vehicle repair or replacement and 22% for a major house or appliance repair. Those three most common types had similar cost distributions, with a median of $1,000 to $1,999 among people who knew the amount.",
      sourceIds: ["fed-shed-2025-economic-hardships"],
      confidence: "high",
      caveats: "Respondents decided for themselves what counted as 'major', and people who did not know the amount are excluded from the median. The median is reported for the three expense types together, not medical bills alone."
    },
    {
      id: "shed-skipped-care-and-medical-debt-2025",
      topic: "Cost-related care avoidance and medical debt (2025 data)",
      claim: "In 2025, 26% of adults went without some form of medical care because they could not afford it, and 18% had debt from their own or a family member's medical care.",
      sourceIds: ["fed-shed-2025-economic-hardships"],
      confidence: "high",
      caveats: "The medical-debt share is not necessarily from the past year. Use as background that health costs strain budgets, not as a judgment of any plan."
    },

    // ================= Open enrollment timing =================
    {
      id: "marketplace-open-enrollment-dates-2027",
      topic: "HealthCare.gov Marketplace open enrollment",
      claim: "HealthCare.gov Marketplace open enrollment for 2027 coverage starts November 1 and ends January 15. Plans chosen or changed by December 15 start January 1, plans chosen from December 16 through January 15 start February 1, and after January 15 you generally need a special enrollment period (for example after a life event such as losing other coverage).",
      sourceIds: ["healthcare-gov-dates-and-deadlines", "healthcare-gov-glossary-open-enrollment"],
      confidence: "high",
      caveats: "Read on 2026-10-10 and describes the HealthCare.gov Marketplace only; the page does not describe state-run exchanges, which may set their own windows. Window dates have changed in the past, so re-check before each fall. Medicaid and CHIP can be applied for at any time."
    },
    {
      id: "employer-open-enrollment-set-by-employer",
      topic: "Employer open enrollment timing",
      claim: "HealthCare.gov says job-based plans may have different open enrollment periods than the Marketplace and tells people to check with their employer.",
      sourceIds: ["healthcare-gov-glossary-open-enrollment"],
      confidence: "high",
      caveats: "No authoritative source was found for a typical employer window such as 'October to early December'; see gaps. Copy should say 'your employer sets its own open enrollment dates' rather than naming months."
    },

    // ================= Medical-rider overlap =================
    {
      id: "auto-medpay-pip-definition",
      topic: "Auto medical payments and PIP",
      claim: "Auto medical payments or personal injury protection (PIP) coverage pays for treatment of injuries to you and your passengers, and PIP can also cover lost wages and funeral costs up to the policy limit. In a no-fault state your own insurer pays for these injuries regardless of who caused the crash. Many states require one of these coverages, and the III advises considering it even where it is optional.",
      sourceIds: ["naic-what-does-auto-insurance-cover", "iii-auto-insurance-basics"],
      confidence: "high",
      caveats: "NAIC page dated 2026-06-11; III page shows no date, only a 2026 copyright. Whether it is required, optional, or called MedPay or PIP differs by state; keep copy state-neutral. Neither page says how it interacts with health insurance."
    },
    {
      id: "auto-medpay-coordination-of-benefits-model",
      topic: "Auto med-pay and health plan coordination",
      claim: "The NAIC's model coordination-of-benefits regulation lets plans reduce duplicate payment when a person has more than one plan, and it counts the medical benefits in auto policies (often called 'med pay') as one kind of plan. Its drafting note says auto med-pay does not normally contain order-of-benefit rules, so unless state law or regulation says otherwise it would be primary, and it is not dependent on fault.",
      sourceIds: ["naic-coordination-of-benefits-model-regulation"],
      confidence: "medium",
      caveats: "This is a model regulation (the October 2013 edition of Model 120 was read), not law; each state decides whether and how to adopt it, and a health plan's own coordination clause also matters. Do not tell users which coverage pays first. Use it only to justify asking the insurer how the two coverages work together."
    },
    {
      id: "home-medical-payments-to-others-guests-only",
      topic: "Home 'medical payments to others'",
      claim: "The medical-payments part of a homeowners policy pays medical bills for a guest, friend or neighbor injured at your home without anyone having to file a liability claim against you. It does not pay medical bills for your own family or your pet.",
      sourceIds: ["iii-standard-homeowners-coverage"],
      confidence: "high",
      caveats: "Describes standard homeowners insurance; individual policies vary. The page gives no medical-payments limit and shows no date, only a 2026 copyright. Because it excludes your own household, it generally does not duplicate your own health insurance."
    }
  ],

  designInputs: {
    asOf: "2026-10-10",
    note: "Free-form hints for later stories (mainly S5 questions and S10 flags). Each item lists the facts that support it. Items marked specLogic come from docs/SPEC.md, not from a source, and are listed only to show how the sourced facts line up.",

    scope: {
      neverJudgePlanAdequacy: true,
      note: "Nothing here supports saying a plan, deductible or network is good or bad. Facts support definitions, category differences and 'ask your insurer' prompts only.",
      factIds: ["deductible-definition", "out-of-pocket-maximum-definition"]
    },

    medicalRiderOverlap: {
      applies: "Auto MedPay/PIP is the real overlap with the user's own health coverage.",
      homeMedPayRule: "Home 'medical payments to others' covers guests, not the user's household, so it should not be framed as duplicating the user's health insurance. If the SPEC's Question item mentions it, frame it as 'what it covers' rather than as an overlap.",
      doNotState: [
        "which coverage pays first after a crash",
        "that MedPay is optional or required (it depends on the state)",
        "that MedPay pays a health plan's deductible or copay (no authoritative source was found)"
      ],
      suggestedAskShape: "Ask your auto insurer what your medical payments or PIP coverage pays for, how it works alongside your health plan after an accident, and whether you still need it.",
      stateNeutralWording: "Required, optional and naming (MedPay vs PIP) vary by state; point to your state's department of insurance.",
      factIds: [
        "auto-medpay-pip-definition",
        "auto-medpay-coordination-of-benefits-model",
        "home-medical-payments-to-others-guests-only"
      ]
    },

    supplementalBoltOns: {
      mayStateAsFact: [
        "They pay a set cash amount that you can use however you like, not an amount tied to your bill.",
        "Federal regulators say they are not a substitute for comprehensive health coverage.",
        "Accident-only, cancer or specified-disease, and hospital or fixed indemnity policies are the usual types."
      ],
      doNotStateAsFact: [
        "that they are often redundant for someone with good coverage and savings (SPEC wording; no authoritative source supports it)",
        "that they duplicate the user's main plan",
        "that the premium is not worth it"
      ],
      framing: "Keep the SPEC's Question-to-Drop shape: explain what the product is, then ask whether the narrow payout is worth the premium given the user's main plan and savings. Pair the savings angle with the cushion data below.",
      factIds: [
        "fixed-indemnity-not-substitute-for-comprehensive-coverage",
        "supplemental-product-types-federal-categories",
        "limited-benefit-plans-marketed-as-comprehensive",
        "hsa-compatible-with-limited-supplemental-coverage"
      ]
    },

    shortTermPlans: {
      mayStateAsFact: [
        "Short-term plans are generally outside the federal rules that bar pre-existing condition exclusions and health-status discrimination.",
        "They may not cover pre-existing conditions and are not required to cover essential health benefits such as maternity care, prescription drugs or mental health care.",
        "They can have annual and lifetime limits.",
        "Marketplace plans must cover pre-existing conditions and the 10 essential health benefit categories.",
        "Rules vary by state; some states ban these plans."
      ],
      doNotStateAsFact: [
        "any specific maximum duration (3 months, 4 months, 12 months, 36 months) as the current federal limit",
        "that a short-term plan counts as the user's main coverage",
        "that holding a short-term plan alongside an ACA or employer plan is allowed, disallowed or wasteful (no authoritative source was read on that point)"
      ],
      durationWording: "Federal limits on how long these plans can last have changed more than once and are being revised; ask your state's department of insurance what applies.",
      stateAsOf: "2026-10-10: 2024 rule on the books, enforcement not prioritized since 2025-08-07, and the NAIC (page updated 2026-07-02) says a revised federal rule is expected in 2026. Re-check before launch.",
      factIds: [
        "stldi-lacks-federal-aca-protections",
        "marketplace-plans-cover-preexisting-conditions-and-ehb",
        "stldi-2024-rule-duration-limits",
        "stldi-2025-enforcement-pause",
        "stldi-federal-status-2026-10-10",
        "stldi-state-variation"
      ]
    },

    hsaNudge: {
      gate: "Only show if the user says they have a high-deductible plan with an HSA, or ask them (not infer from a deductible band).",
      mayStateAsFact: [
        "An HSA can be funded only alongside a high-deductible health plan.",
        "Contributions are deductible, growth is tax-free, and withdrawals for qualified medical costs are tax-free under federal law.",
        "Unused money carries over from year to year, unlike a typical health FSA."
      ],
      doNotStateAsFact: [
        "contribution limits or HDHP dollar thresholds without naming the year (they change annually)",
        "that HSAs are 'commonly underused' or how many eligible people have one (the only usage statistics found were GAO's, and gao.gov is not on the allowlist)",
        "that a general-purpose health FSA can sit alongside an HSA (it generally cannot)"
      ],
      thresholdsByYear: {
        2026: { hdhpMinDeductibleSelfOnly: 1700, hdhpMinDeductibleFamily: 3400, hdhpMaxOutOfPocketSelfOnly: 8500, hdhpMaxOutOfPocketFamily: 17000 },
        2027: { hdhpMinDeductibleSelfOnly: 1750, hdhpMinDeductibleFamily: 3500, hdhpMaxOutOfPocketSelfOnly: 8700, hdhpMaxOutOfPocketFamily: 17400 }
      },
      hsaVsFsaOneLiner: "An HSA is yours and carries over and moves with you; a health FSA comes from your employer and is mostly use-it-or-lose-it.",
      factIds: [
        "hsa-eligibility-requires-hdhp",
        "hsa-hdhp-thresholds-2026-2027",
        "hsa-tax-advantages",
        "hsa-vs-health-fsa",
        "hsa-compatible-with-limited-supplemental-coverage"
      ]
    },

    deductibleVsCushion: {
      cushionBandAlignment: {
        note: "The SPEC's cushion bands (under 1,000 / 1,000 to 5,000 / over 5,000) line up with rows of the Federal Reserve's savings-only table. The Fed's top row is '$5,000 or more', so S5 should define the boundary explicitly (for example 1,000 to 4,999 and 5,000 or more).",
        shareOfAdultsByLargestExpenseCoverableFromSavings2025: { under1000: 39, from1000to4999: 23, atLeast5000: 38 },
        unitIsPercent: true,
        dataYear: 2025,
        factIds: ["shed-savings-only-largest-expense-2025"]
      },
      typicalSizeOfSurpriseBills: {
        medianRange: "$1,000 to $1,999 (vehicle repair, house or appliance repair, and major medical, among people who knew the amount; 2025)",
        shareOfAdultsWithUnexpectedMajorMedicalExpense2025: 21,
        factIds: ["shed-unexpected-medical-expense-2025", "shed-400-expense-cash-2025"]
      },
      deductibleAnchors: {
        note: "Dollar values that appear in sources, usable as band edges or context. They are anchors, not recommended bands; S5 decides the final presets.",
        values: [
          { amount: 500, meaning: "common minimum home/renters deductible", factIds: ["home-auto-deductible-forms-and-ranges"] },
          { amount: 1000, meaning: "common minimum home/renters deductible; also a SPEC cushion band edge", factIds: ["home-auto-deductible-forms-and-ranges"] },
          { amount: 1700, meaning: "HDHP minimum deductible, self-only, 2026 (1,750 in 2027)", factIds: ["hsa-hdhp-thresholds-2026-2027"] },
          { amount: 3400, meaning: "HDHP minimum deductible, family, 2026 (3,500 in 2027)", factIds: ["hsa-hdhp-thresholds-2026-2027"] },
          { amount: 10600, meaning: "Marketplace out-of-pocket limit, one person, 2026 (12,000 in 2027)", factIds: ["marketplace-out-of-pocket-limits-2026-2027"] }
        ]
      },
      percentageDeductibles: "Wind/hail (typically 1 to 5 percent) and earthquake (2 to 20 percent of replacement value) deductibles are percentages, so a plain dollar band can understate them. Ask the home deductible as the standard dollar deductible and treat percentage deductibles as a separate prompt.",
      healthWorstCase: "The health deductible is not the worst case; the out-of-pocket maximum is. Copy can say a bill can exceed the deductible, but should not ask for or judge the maximum.",
      specLogic: "Flag when a deductible band's lower edge exceeds the top of the user's cushion band; present as 'build the cushion or reconsider the deductible', never as a judgment on the plan.",
      factIds: [
        "deductible-definition",
        "out-of-pocket-maximum-definition",
        "marketplace-out-of-pocket-limits-2026-2027",
        "deductible-premium-tradeoff-and-affordability",
        "home-auto-deductible-forms-and-ranges",
        "shed-400-expense-cash-2025",
        "shed-savings-only-largest-expense-2025",
        "shed-unexpected-medical-expense-2025",
        "shed-skipped-care-and-medical-debt-2025"
      ]
    },

    openEnrollmentFraming: {
      rule: "Mention open enrollment only in health copy, and only factually.",
      marketplaceDates2027: { opens: "November 1", ends: "January 15", januaryFirstStartDeadline: "December 15", februaryFirstStartWindow: "December 16 to January 15" },
      employerPlans: "Employers set their own open enrollment dates; say so and tell the user to check with their employer. Do not claim 'October to early December' as a fact (see gaps).",
      suggestedWording: "If open enrollment is coming up at your job or on the Marketplace, this is a good moment to ask about these extras.",
      factIds: [
        "marketplace-open-enrollment-dates-2027",
        "employer-open-enrollment-set-by-employer",
        "limited-benefit-plans-marketed-as-comprehensive"
      ]
    },

    plannedFlagSourcePicks: {
      note: "Suggested source ids per planned S10 flag; S3b will register them.",
      healthMedicalRiderOverlap: ["naic-what-does-auto-insurance-cover", "iii-auto-insurance-basics", "naic-coordination-of-benefits-model-regulation"],
      homeMedPayWhatItCovers: ["iii-standard-homeowners-coverage"],
      supplementalBoltOns: ["cms-stldi-fixed-indemnity-fact-sheet-2024", "dol-aca-faqs-part-72"],
      hsaNudge: ["irs-pub-969-2025", "healthcare-gov-glossary-hsa"],
      shortTermVsAcaOrEmployer: ["naic-stldi-topic", "cms-stldi-fixed-indemnity-fact-sheet-2024", "healthcare-gov-pre-existing-conditions", "healthcare-gov-what-marketplace-plans-cover"],
      deductibleVsCushion: ["healthcare-gov-glossary-deductible", "iii-understanding-your-insurance-deductibles", "naic-tips-saving-on-auto-insurance", "fed-shed-2025-savings-and-investments", "fed-shed-2025-economic-hardships"]
    },

    stateNeutrality: {
      note: "None of the facts above treats one state as the authority. State-dependent points (short-term plan rules, whether MedPay or PIP is required, whether the NAIC coordination model is adopted) should say 'your state's department of insurance'."
    }
  },

  rejected: [
    {
      kind: "source",
      id: "reginfo-stldi-cms-9881-review",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.reginfo.gov is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "reginfo-stldi-cms-9881-review",
        publisher: "Office of Information and Regulatory Affairs, U.S. Office of Management and Budget (reginfo.gov)",
        title: "Short-Term, Limited-Duration Insurance (CMS-9881)",
        url: "https://www.reginfo.gov/public/do/eoDetails?rrid=1404663",
        authorityType: "government",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; title Short-Term, Limited-Duration Insurance (CMS-9881), proposed rule stage, 'Pending EO 12866 Regulatory Review', received date 05/30/2026; rule text not available there." }
      },
    },
    {
      kind: "source",
      id: "gao-hsa-report-25-107480",
      reasonCode: "host-not-allowlisted",
      reason: "Host files.gao.gov is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "gao-hsa-report-25-107480",
        publisher: "U.S. Government Accountability Office",
        title: "HEALTH SAVINGS ACCOUNTS: Information on Features and Use, and Characteristics of Account Holders",
        url: "https://files.gao.gov/reports/GAO-25-107480/index.html",
        authorityType: "government",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; GAO-25-107480 dated 2025-09-08; confirms 43.4 million average HDHP enrollees 2019-2023, fewer than half (about 20.7 million) with a linked HSA/HRA, Devenir 63% under $1,000 at end of 2022, EBRI 14% at maximum, tax benefits, and 20% additional tax for under-65 non-qualified withdrawals." }
      },
    },
    {
      kind: "source",
      id: "gao-who-benefits-from-hsas",
      reasonCode: "host-not-allowlisted",
      reason: "Host www.gao.gov is not on the S3a authority allowlist. The page was fetched and independently verified on 2026-10-10 before removal; it is kept verbatim below so it can be reinstated if the owner allows the domain.",
      original: {
        id: "gao-who-benefits-from-hsas",
        publisher: "U.S. Government Accountability Office",
        title: "Who Benefits from Health Savings Accounts?",
        url: "https://www.gao.gov/blog/who-benefits-health-savings-accounts",
        authorityType: "government",
        lastVerified: "2026-10-10",
        verification: { status: "verified", checkedOn: "2026-10-10", note: "Fetched 2026-10-10; dated 2025-11-20; confirms about 43 million, fewer than half with a linked account, and the 20% additional tax for under 65. It does not repeat the 63% or 14% figures (those are in the full report)." }
      },
    },
    {
      kind: "fact",
      id: "hsa-use-evidence-gao",
      reasonCode: "sole-source-removed",
      reason: "Both of its sources are GAO pages (gao.gov, files.gao.gov), which are not on the S3a authority allowlist.",
      original: {
        id: "hsa-use-evidence-gao",
        topic: "How widely HSAs are used",
        claim: "A GAO analysis found that about 43 million adults aged 18 to 64 were enrolled in high-deductible health plans on average in 2019-2023, and fewer than half of them had a linked tax-advantaged account such as an HSA. GAO also relayed third-party data that, at the end of 2022, about 63% of HSAs held less than $1,000, and that about 14% of HSA holders in one 2022 database contributed the annual maximum.",
        sourceIds: ["gao-hsa-report-25-107480", "gao-who-benefits-from-hsas"],
        confidence: "medium",
        caveats: "GAO-25-107480 (published 2025-09-08) and its 2025-11-20 blog summary. 'Linked account' counts both HSAs and health reimbursement arrangements. The 63% figure is Devenir Research data and the 14% figure is an EBRI database analysis, both relayed by GAO, so neither is a national estimate. GAO does not call HSAs 'underused'; that word is ours. Support only a light, non-judgmental nudge."
      },
    },
    {
      kind: "fact-trimmed",
      id: "stldi-federal-status-2026-10-10",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["reginfo-stldi-cms-9881-review"],
      reason: "The fact kept its other sources. What the dropped source added: the statement that a proposed rule (CMS-9881) was received for White House review on 2026-05-30 and is listed as pending.",
    },
    {
      kind: "fact-trimmed",
      id: "hsa-tax-advantages",
      reasonCode: "source-removed-claim-trimmed",
      removedSourceIds: ["gao-hsa-report-25-107480"],
      reason: "The fact kept its other sources. What the dropped source added: the 20% additional tax on non-qualified withdrawals for people under 65 (GAO), plus GAO as a third source for the tax benefits.",
    },
  ],

  gaps: [
    "Current federal short-term limited-duration insurance rule: could not confirm whether a 2026 proposed or final rule has been published. The Federal Register site blocked automated access and the Labor Department page lists nothing newer than the 2025-08-07 statement. A pending White House review record for proposed rule CMS-9881 (received 2026-05-30) exists on reginfo.gov, a host that is not on the allowlist, so it is not cited. The exact consumer notice wording from the 2024 rule was also not read.",
    "No authoritative (non-commercial) source was found stating that accident, critical illness, cancer or hospital indemnity policies are 'often redundant' or 'frequently duplicate' good primary coverage plus savings. The SPEC says this; the product should phrase it as a question to ask, not a sourced fact.",
    "No III or NAIC consumer page was found that defines accident, critical illness or hospital indemnity products in plain language. The federal categories come from the Labor/HHS/Treasury FAQ and the CMS fact sheet. An NAIC call-materials PDF titled 'Supplemental Benefits' turned out to be an industry trade-group presentation, so it was not used.",
    "'Critical illness' specifically is not named on any authoritative page that was read; it is covered only through the 'specified disease or illness' wording.",
    "No authoritative source was found for a typical employer open enrollment window (the SPEC's 'roughly October to early December'). Only the statement that employers set their own dates was found. Medicare and federal-employee windows are out of scope and were not researched.",
    "No authoritative source was found on whether holding a short-term plan together with an ACA or employer plan is allowed or what that means for tax credits, and the HealthCare.gov page on which plans count as minimum essential coverage could not be located.",
    "No authoritative source was found saying which coverage pays first between auto MedPay and a private health plan. The only support is an NAIC model regulation drafting note; real outcomes depend on state law and policy wording.",
    "No authoritative source was found saying auto MedPay can pay a health plan's deductible or copay.",
    "No authoritative statistic was found on how many people could cover their specific health deductible from savings. The Federal Reserve data covers general emergency expenses, unexpected medical bills of any size, and savings-only capacity, not deductibles.",
    "HSA state tax treatment was not researched; HSA statements are federal only. 2026 and 2027 HSA contribution limits exist in the IRS revenue procedures but are not needed by the product.",
    "No allowlisted statistic supports 'the HSA tax advantage is commonly underused'. GAO usage data exists but gao.gov is not on the allowlist, so it is not cited (see rejected)."
  ]
};
