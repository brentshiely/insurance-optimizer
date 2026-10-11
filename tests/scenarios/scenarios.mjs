// The scenario matrix (Story S12): named households, each one a plain answers object exactly as the page keeps it
// (docs/ARCHITECTURE.md "Answers"): Q1 is `policies`, every other key is the tap on a closed-list question.
//
//   export default [ { id: 'auto-financed-new-car', answers: { policies: ['auto'], auto_financing: 'loan', ... } }, ... ]
//
// Used by tests/audit/* (flag coverage, copy and source audits, determinism) and by the snapshots in
// tests/snapshots/ (scenario-flags, scenario-texts). Plain data only, no functions and no imports, so the file
// loads under jsc, Node and browsers. Rules every scenario follows, all enforced by tests/audit/scenarios.test.mjs:
//   * `id` is kebab-case and unique;
//   * the answers are exactly what the page could hold: Q1 in the question's own order, an answer only to a question
//     the ticks make visible, only option ids that question offers, a multi question as an array;
//   * COMPLETE: every question the ticks make visible is answered. The page keeps Continue disabled until the
//     screen is complete, so nobody reaches the action list with a hole; a scenario never does either.
// Across the whole file every policy is ticked, every option of every question is chosen at least once, and every
// flag fires at least once (tests/audit/coverage.test.mjs lists what is missing when a story adds a question,
// an option or a flag). Add a scenario when you add something; never edit one to make a test pass.
//
// Two small blocks stand in for sections a scenario is not about. They are spread into the answers, so each
// scenario's answers are still one flat object.
const AUTO_OK = { auto_financing: 'paid_off', auto_value: '3000_9999', auto_um_uim: 'yes', auto_um_uim_limit: '250_500', auto_rental_reimbursement: 'yes' };
const HOME_OK = { home_sewer_backup: 'yes', home_flood_policy: 'yes' };

export default [
  // ------------------------------------------------------------------------------------------------ nothing held
  { id: 'nothing-held', answers: { policies: ['none'] } },

  // ------------------------------------------------------------------------------------------------ auto only
  { id: 'auto-financed-new-car', answers: {
    policies: ['auto'],
    auto_financing: 'loan', auto_value: '25000_plus', auto_gap_coverage: 'no', auto_um_uim: 'no', auto_rental_reimbursement: 'no',
    deductible_auto: '1000_4999', emergency_cushion: 'under_1000',
  } },
  { id: 'auto-leased-gap-not-sure', answers: {
    policies: ['auto'],
    auto_financing: 'lease', auto_value: '10000_24999', auto_gap_coverage: 'not_sure', auto_um_uim: 'yes', auto_um_uim_limit: 'lower', auto_rental_reimbursement: 'yes',
    deductible_auto: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'auto-old-car-paid-off-keeps-collision', answers: {
    policies: ['auto'],
    auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'yes', auto_um_uim: 'yes', auto_um_uim_limit: '250_500', auto_rental_reimbursement: 'not_sure',
    deductible_auto: '1000_4999', emergency_cushion: '1000_4999',
  } },
  { id: 'auto-old-car-without-collision', answers: {
    policies: ['auto'],
    auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'no', auto_um_uim: 'not_sure', auto_rental_reimbursement: 'no',
    deductible_auto: '5000_plus', emergency_cushion: 'under_1000',
  } },
  { id: 'auto-old-car-collision-not-sure', answers: {
    policies: ['auto'],
    auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'not_sure', auto_um_uim: 'yes', auto_um_uim_limit: '100_300', auto_rental_reimbursement: 'yes',
    deductible_auto: 'under_1000', emergency_cushion: 'not_sure',
  } },
  { id: 'auto-loan-value-and-limits-not-sure', answers: {
    policies: ['auto'],
    auto_financing: 'loan', auto_value: 'not_sure', auto_gap_coverage: 'no', auto_um_uim: 'yes', auto_um_uim_limit: 'not_sure', auto_rental_reimbursement: 'yes',
    deductible_auto: 'not_sure', emergency_cushion: 'not_sure',
  } },
  { id: 'auto-loan-with-gap-coverage', answers: {
    policies: ['auto'],
    auto_financing: 'loan', auto_value: '3000_9999', auto_gap_coverage: 'yes', auto_um_uim: 'yes', auto_um_uim_limit: '500_500', auto_rental_reimbursement: 'yes',
    deductible_auto: 'under_1000', emergency_cushion: 'under_1000',
  } },

  // ------------------------------------------------------------------------------------------------ home, and auto + home
  { id: 'home-covered-and-cushioned', answers: {
    policies: ['home'],
    home_sewer_backup: 'yes', home_flood_policy: 'yes', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'home-exposed', answers: {
    policies: ['home'],
    home_sewer_backup: 'no', home_flood_policy: 'no', deductible_home: '5000_plus', emergency_cushion: 'under_1000',
  } },
  { id: 'home-not-sure-of-everything', answers: {
    policies: ['home'],
    home_sewer_backup: 'not_sure', home_flood_policy: 'not_sure', deductible_home: 'not_sure', emergency_cushion: 'not_sure',
  } },
  { id: 'auto-and-home-typical', answers: {
    policies: ['auto', 'home'],
    auto_financing: 'loan', auto_value: '10000_24999', auto_gap_coverage: 'yes', auto_um_uim: 'yes', auto_um_uim_limit: '100_300', auto_rental_reimbursement: 'no',
    home_sewer_backup: 'no', home_flood_policy: 'yes',
    deductible_auto: '1000_4999', deductible_home: '1000_4999', emergency_cushion: '1000_4999',
  } },

  // ------------------------------------------------------------------------------------------------ renters, and a parent's home policy
  { id: 'renters-only-student', answers: { policies: ['renters'], renters_for: 'me' } },
  { id: 'renters-for-child-no-home-policy', answers: { policies: ['renters'], renters_for: 'child_away' } },
  { id: 'homeowner-renters-for-themselves', answers: {
    policies: ['home', 'renters'],
    renters_for: 'me',
    ...HOME_OK, deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'parent-home-child-in-dorm', answers: {
    policies: ['home', 'renters'],
    renters_for: 'child_away', renters_child_housing: 'dorm',
    ...HOME_OK, deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'parent-home-child-off-campus', answers: {
    policies: ['home', 'renters'],
    renters_for: 'child_away', renters_child_housing: 'off_campus',
    home_sewer_backup: 'no', home_flood_policy: 'no', deductible_home: '1000_4999', emergency_cushion: '1000_4999',
  } },
  { id: 'parent-home-child-housing-not-sure', answers: {
    policies: ['home', 'renters'],
    renters_for: 'child_away', renters_child_housing: 'not_sure',
    ...HOME_OK, deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },

  // ------------------------------------------------------------------------------------------------ health
  { id: 'health-only-quiet', answers: {
    policies: ['health'],
    health_hsa: 'neither', health_supplemental: ['none'], health_short_term: 'no', deductible_health: '1000_4999', emergency_cushion: '5000_plus',
  } },
  { id: 'health-only-every-extra', answers: {
    policies: ['health'],
    health_hsa: 'hdhp_hsa', health_supplemental: ['accident', 'critical_illness', 'hospital_indemnity', 'cancer'], health_short_term: 'yes',
    deductible_health: '5000_plus', emergency_cushion: 'under_1000',
  } },
  { id: 'health-high-deductible-without-hsa', answers: {
    policies: ['health'],
    health_hsa: 'hdhp_only', health_supplemental: ['cancer'], health_short_term: 'no', deductible_health: '1000_4999', emergency_cushion: '5000_plus',
  } },
  { id: 'health-not-sure-of-everything', answers: {
    policies: ['health'],
    health_hsa: 'not_sure', health_supplemental: ['not_sure'], health_short_term: 'not_sure', deductible_health: 'not_sure', emergency_cushion: 'not_sure',
  } },
  { id: 'health-and-auto-medpay-yes', answers: {
    policies: ['auto', 'health'],
    ...AUTO_OK, auto_medpay: 'yes',
    health_hsa: 'neither', health_supplemental: ['accident'], health_short_term: 'no',
    deductible_auto: 'under_1000', deductible_health: 'under_1000', emergency_cushion: '1000_4999',
  } },
  { id: 'health-and-auto-medpay-no', answers: {
    policies: ['auto', 'health'],
    ...AUTO_OK, auto_medpay: 'no',
    health_hsa: 'hdhp_hsa', health_supplemental: ['hospital_indemnity', 'cancer'], health_short_term: 'no',
    deductible_auto: '1000_4999', deductible_health: '1000_4999', emergency_cushion: '1000_4999',
  } },
  { id: 'health-and-auto-medpay-not-sure', answers: {
    policies: ['auto', 'health'],
    ...AUTO_OK, auto_medpay: 'not_sure',
    health_hsa: 'neither', health_supplemental: ['critical_illness'], health_short_term: 'yes',
    deductible_auto: 'under_1000', deductible_health: '5000_plus', emergency_cushion: 'not_sure',
  } },

  // ------------------------------------------------------------------------------------------------ umbrella on its own: size, exposure, scope
  { id: 'umbrella-1m-for-1m-to-3m-exposure', answers: {
    policies: ['umbrella'],
    umbrella_limit: '1m', umbrella_exposure: '1m_3m', side_business: 'no',
  } },
  { id: 'umbrella-1m-for-over-3m-exposure', answers: {
    policies: ['umbrella'],
    umbrella_limit: '1m', umbrella_exposure: 'over_3m', side_business: 'no',
  } },
  { id: 'umbrella-2m-roomy-for-1m-to-3m', answers: {
    policies: ['umbrella'],
    umbrella_limit: '2m', umbrella_exposure: '1m_3m', side_business: 'no',
  } },
  { id: 'umbrella-5m-with-side-business', answers: {
    policies: ['umbrella'],
    umbrella_limit: '5m', umbrella_exposure: 'over_3m', side_business: 'yes',
  } },
  { id: 'umbrella-small-exposure-under-1m', answers: {
    policies: ['umbrella'],
    umbrella_limit: '1m', umbrella_exposure: 'under_1m', side_business: 'no',
  } },
  { id: 'umbrella-size-not-sure', answers: {
    policies: ['umbrella'],
    umbrella_limit: 'not_sure', umbrella_exposure: '1m_3m', side_business: 'no',
  } },
  { id: 'umbrella-exposure-not-sure', answers: {
    policies: ['umbrella'],
    umbrella_limit: '2m', umbrella_exposure: 'not_sure', side_business: 'yes',
  } },
  { id: 'umbrella-size-and-exposure-not-sure', answers: {
    policies: ['umbrella'],
    umbrella_limit: 'not_sure', umbrella_exposure: 'not_sure', side_business: 'no',
  } },

  // ------------------------------------------------------------------------------------------------ umbrella over auto and home: limit and required-minimum families
  { id: 'stack-everything-matches', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '2m', auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '500k',
    umbrella_exposure: '1m_3m', umbrella_um_uim: 'yes', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'stack-home-short-of-the-minimum', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '1m', auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '500k',
    umbrella_exposure: 'under_1m', umbrella_um_uim: 'yes', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'stack-auto-short-of-the-minimum', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '2m', auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '500k',
    umbrella_exposure: 'under_1m', umbrella_um_uim: 'yes', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'stack-both-short-of-the-minimum', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '500_500', home_liability: '300k', umbrella_min_home: '500k',
    umbrella_exposure: '1m_3m', umbrella_um_uim: 'no', side_business: 'yes',
    ...AUTO_OK, ...HOME_OK, deductible_auto: '1000_4999', deductible_home: '1000_4999', emergency_cushion: '1000_4999',
  } },
  { id: 'stack-lower-than-the-lowest-tier', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '1m', auto_liability: 'lower', umbrella_min_auto: '100_300', home_liability: 'lower', umbrella_min_home: '300k',
    umbrella_exposure: 'over_3m', umbrella_um_uim: 'not_sure', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'stack-carrying-more-than-required', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '5m', auto_liability: '500_500', umbrella_min_auto: '250_500', home_liability: '1m', umbrella_min_home: '500k',
    umbrella_exposure: 'over_3m', umbrella_um_uim: 'yes', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'stack-auto-above-home-below', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '2m', auto_liability: '500_500', umbrella_min_auto: '100_300', home_liability: '300k', umbrella_min_home: '500k',
    umbrella_exposure: '1m_3m', umbrella_um_uim: 'yes', side_business: 'yes',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'stack-requirements-not-sure', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '1m', auto_liability: '250_500', umbrella_min_auto: 'not_sure', home_liability: 'lower', umbrella_min_home: 'not_sure',
    umbrella_exposure: '1m_3m', umbrella_um_uim: 'yes', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'stack-limits-not-sure', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '2m', auto_liability: 'not_sure', umbrella_min_auto: '250_500', home_liability: 'not_sure', umbrella_min_home: '500k',
    umbrella_exposure: '1m_3m', umbrella_um_uim: 'yes', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'stack-nothing-known', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: 'not_sure', auto_liability: 'not_sure', umbrella_min_auto: 'not_sure', home_liability: 'not_sure', umbrella_min_home: 'not_sure',
    umbrella_exposure: 'not_sure', umbrella_um_uim: 'not_sure', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'stack-own-auto-limit-and-home-requirement-not-sure', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '2m', auto_liability: 'not_sure', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: 'not_sure',
    umbrella_exposure: '1m_3m', umbrella_um_uim: 'yes', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'stack-lowest-requirements-met', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '100_300', home_liability: '300k', umbrella_min_home: '300k',
    umbrella_exposure: 'under_1m', umbrella_um_uim: 'yes', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'stack-top-requirements-met', answers: {
    policies: ['auto', 'home', 'umbrella'],
    umbrella_limit: '5m', auto_liability: '500_500', umbrella_min_auto: '500_500', home_liability: '500k', umbrella_min_home: '500k',
    umbrella_exposure: '1m_3m', umbrella_um_uim: 'yes', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'umbrella-over-auto-only', answers: {
    policies: ['auto', 'umbrella'],
    umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500',
    umbrella_exposure: '1m_3m', umbrella_um_uim: 'no', side_business: 'no',
    ...AUTO_OK, deductible_auto: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'umbrella-over-home-only', answers: {
    policies: ['home', 'umbrella'],
    umbrella_limit: '2m', home_liability: '300k', umbrella_min_home: '500k',
    umbrella_exposure: '1m_3m', side_business: 'yes',
    ...HOME_OK, deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'auto-and-home-without-an-umbrella', answers: {
    policies: ['auto', 'home'],
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },

  // ------------------------------------------------------------------------------------------------ motorcycle and boat under the umbrella
  { id: 'motorcycle-and-boat-both-short', answers: {
    policies: ['auto', 'home', 'umbrella', 'motorcycle', 'boat'],
    umbrella_limit: '1m', auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '500k',
    motorcycle_liability: 'lower', umbrella_min_motorcycle: '250_500', boat_liability: 'lower', umbrella_min_boat: '500_500',
    umbrella_exposure: '1m_3m', umbrella_um_uim: 'yes', side_business: 'no',
    ...AUTO_OK, ...HOME_OK, deductible_auto: 'under_1000', deductible_home: 'under_1000', emergency_cushion: '5000_plus',
  } },
  { id: 'motorcycle-meets-the-minimum', answers: {
    policies: ['umbrella', 'motorcycle'],
    umbrella_limit: '1m', motorcycle_liability: '250_500', umbrella_min_motorcycle: '250_500',
    umbrella_exposure: 'under_1m', side_business: 'no',
  } },
  { id: 'boat-under-the-minimum-and-motorcycle-above', answers: {
    policies: ['umbrella', 'motorcycle', 'boat'],
    umbrella_limit: '2m', motorcycle_liability: '500_500', umbrella_min_motorcycle: '100_300', boat_liability: '100_300', umbrella_min_boat: '250_500',
    umbrella_exposure: '1m_3m', side_business: 'no',
  } },
  { id: 'motorcycle-and-boat-not-sure', answers: {
    policies: ['umbrella', 'motorcycle', 'boat'],
    umbrella_limit: '1m', motorcycle_liability: 'not_sure', umbrella_min_motorcycle: 'not_sure', boat_liability: 'not_sure', umbrella_min_boat: 'not_sure',
    umbrella_exposure: '1m_3m', side_business: 'yes',
  } },
  { id: 'motorcycle-and-boat-limits-match', answers: {
    policies: ['umbrella', 'motorcycle', 'boat'],
    umbrella_limit: '2m', motorcycle_liability: '100_300', umbrella_min_motorcycle: '100_300', boat_liability: '250_500', umbrella_min_boat: '250_500',
    umbrella_exposure: 'under_1m', side_business: 'no',
  } },
  { id: 'boat-limit-above-its-requirement', answers: {
    policies: ['umbrella', 'boat'],
    umbrella_limit: '2m', boat_liability: '500_500', umbrella_min_boat: '100_300',
    umbrella_exposure: 'under_1m', side_business: 'no',
  } },
  { id: 'motorcycle-and-boat-without-an-umbrella', answers: { policies: ['motorcycle', 'boat'] } },

  // ------------------------------------------------------------------------------------------------ the Other bucket: rental car
  { id: 'rental-car-no-cards-no-auto-policy', answers: {
    policies: ['rental_car'],
    cards: ['other_none'],
  } },
  { id: 'rental-car-with-cards-and-auto', answers: {
    policies: ['auto', 'rental_car'],
    ...AUTO_OK, deductible_auto: 'under_1000', emergency_cushion: '5000_plus',
    cards: ['chase_sapphire_preferred', 'amex_platinum'], card_usual_payment: 'yes',
  } },
  { id: 'rental-car-auto-without-collision', answers: {
    policies: ['auto', 'rental_car'],
    auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'no', auto_um_uim: 'yes', auto_um_uim_limit: '250_500', auto_rental_reimbursement: 'yes',
    deductible_auto: 'under_1000', emergency_cushion: '5000_plus',
    cards: ['citi_double_cash'], card_usual_payment: 'no',
  } },
  { id: 'rental-car-card-payment-not-sure', answers: {
    policies: ['rental_car'],
    cards: ['wells_fargo_active_cash'], card_usual_payment: 'not_sure',
  } },
  // A rental with no car policy and one card that is used. Against the fixture table (tests/fixtures/otherCards.mjs) the first card pays first and
  // the second pays second, so these two show what a rental item says about each (tests/audit/evidence.mjs: only a card that pays first is a duplicate).
  { id: 'rental-car-no-auto-policy-card-pays-first', answers: {
    policies: ['rental_car'],
    cards: ['chase_sapphire_preferred'], card_usual_payment: 'yes',
  } },
  { id: 'rental-car-no-auto-policy-card-pays-second', answers: {
    policies: ['rental_car'],
    cards: ['amex_platinum'], card_usual_payment: 'yes',
  } },

  // ------------------------------------------------------------------------------------------------ the Other bucket: towing and roadside
  { id: 'towing-three-sources-no-cards', answers: {
    policies: ['towing'],
    cards: ['other_none'], roadside_sources: ['auto_policy', 'club', 'car_maker'],
  } },
  { id: 'towing-club-and-card', answers: {
    policies: ['towing'],
    cards: ['chase_sapphire_reserve', 'amex_gold'], card_usual_payment: 'yes', roadside_sources: ['club', 'card'],
  } },
  { id: 'towing-one-source-only', answers: {
    policies: ['towing'],
    cards: ['other_none'], roadside_sources: ['auto_policy'],
  } },
  { id: 'towing-sources-not-sure', answers: {
    policies: ['towing'],
    cards: ['other_none'], roadside_sources: ['not_sure'],
  } },
  { id: 'towing-on-a-motorcycle-policy', answers: {
    policies: ['motorcycle', 'towing'],
    cards: ['capital_one_venture'], card_usual_payment: 'yes', roadside_sources: ['auto_policy', 'card'], towing_vehicle_policy: 'yes',
  } },
  { id: 'towing-on-a-boat-policy-not-sure', answers: {
    policies: ['boat', 'towing'],
    cards: ['other_none'], roadside_sources: ['club'], towing_vehicle_policy: 'not_sure',
  } },
  { id: 'towing-on-neither-motorcycle-nor-boat', answers: {
    policies: ['motorcycle', 'boat', 'towing'],
    cards: ['other_none'], roadside_sources: ['other'], towing_vehicle_policy: 'no',
  } },

  // ------------------------------------------------------------------------------------------------ the Other bucket: travel, phone, warranty
  { id: 'travel-no-cards', answers: {
    policies: ['travel'],
    cards: ['other_none'],
  } },
  { id: 'travel-with-cards', answers: {
    policies: ['travel'],
    cards: ['chase_sapphire_preferred', 'chase_sapphire_reserve'], card_usual_payment: 'yes',
  } },
  { id: 'travel-cards-not-used-for-trips', answers: {
    policies: ['travel'],
    cards: ['citi_double_cash'], card_usual_payment: 'no',
  } },
  { id: 'phone-with-home-policy-no-cards', answers: {
    policies: ['home', 'phone'],
    ...HOME_OK, deductible_home: 'under_1000', emergency_cushion: '5000_plus',
    cards: ['other_none'], phone_bill_on_card: 'no',
  } },
  { id: 'phone-bill-on-a-card-with-renters', answers: {
    policies: ['renters', 'phone'],
    renters_for: 'me',
    cards: ['amex_platinum'], card_usual_payment: 'yes', phone_bill_on_card: 'yes',
  } },
  { id: 'phone-bill-and-card-use-not-sure', answers: {
    policies: ['phone'],
    cards: ['amex_blue_cash_preferred', 'amex_blue_cash_everyday'], card_usual_payment: 'not_sure', phone_bill_on_card: 'not_sure',
  } },
  { id: 'warranty-no-cards', answers: {
    policies: ['warranty'],
    cards: ['other_none'],
  } },
  { id: 'warranty-with-cards', answers: {
    policies: ['warranty'],
    cards: ['chase_freedom_unlimited', 'chase_freedom_flex'], card_usual_payment: 'yes',
  } },
  { id: 'warranty-card-use-not-sure', answers: {
    policies: ['warranty'],
    cards: ['capital_one_venture_x'], card_usual_payment: 'not_sure',
  } },

  // ------------------------------------------------------------------------------------------------ the Other bucket: accidental death (AD&D)
  { id: 'accidental-death-with-own-term-life', answers: { policies: ['accidental_death'], term_life: 'own' } },
  { id: 'accidental-death-term-life-only-through-work-and-travel', answers: {
    policies: ['travel', 'accidental_death'],
    cards: ['other_none'], term_life: 'work_only',
  } },
  { id: 'accidental-death-without-term-life', answers: { policies: ['accidental_death'], term_life: 'none' } },
  { id: 'accidental-death-term-life-not-sure', answers: { policies: ['accidental_death'], term_life: 'not_sure' } },

  // ------------------------------------------------------------------------------------------------ cards: all twelve at once
  { id: 'every-card-every-card-item', answers: {
    policies: ['rental_car', 'towing', 'travel', 'phone', 'warranty'],
    cards: [
      'chase_sapphire_preferred', 'chase_sapphire_reserve', 'chase_freedom_unlimited', 'chase_freedom_flex', 'amex_platinum', 'amex_gold',
      'amex_blue_cash_preferred', 'amex_blue_cash_everyday', 'citi_double_cash', 'wells_fargo_active_cash', 'capital_one_venture_x', 'capital_one_venture',
    ],
    card_usual_payment: 'yes', phone_bill_on_card: 'yes', roadside_sources: ['auto_policy', 'club', 'card', 'car_maker'],
  } },
  { id: 'fixture-card-statuses-together', answers: {
    policies: ['rental_car', 'towing', 'travel', 'phone', 'warranty'],
    cards: ['chase_sapphire_preferred', 'amex_platinum', 'citi_double_cash', 'wells_fargo_active_cash', 'capital_one_venture'],
    card_usual_payment: 'yes', phone_bill_on_card: 'yes', roadside_sources: ['club', 'card'],
  } },

  // ------------------------------------------------------------------------------------------------ everything at once
  // Every policy ticked, each question answered "Not sure" wherever Not sure is offered (the questions without it get
  // the answer that opens the most follow-ups). The old-car questions are hidden here: a car whose value is Not sure is
  // never "certainly under $3,000"; auto-old-car-collision-not-sure covers that branch.
  { id: 'not-sure-everywhere', answers: {
    policies: ['auto', 'home', 'renters', 'umbrella', 'health', 'motorcycle', 'boat', 'rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death'],
    umbrella_limit: 'not_sure', auto_liability: 'not_sure', umbrella_min_auto: 'not_sure', home_liability: 'not_sure', umbrella_min_home: 'not_sure',
    motorcycle_liability: 'not_sure', umbrella_min_motorcycle: 'not_sure', boat_liability: 'not_sure', umbrella_min_boat: 'not_sure',
    umbrella_exposure: 'not_sure', umbrella_um_uim: 'not_sure', side_business: 'no',
    auto_financing: 'loan', auto_value: 'not_sure', auto_gap_coverage: 'not_sure', auto_um_uim: 'not_sure', auto_rental_reimbursement: 'not_sure',
    renters_for: 'child_away', renters_child_housing: 'not_sure',
    auto_medpay: 'not_sure', health_hsa: 'not_sure', health_supplemental: ['not_sure'], health_short_term: 'not_sure',
    home_sewer_backup: 'not_sure', home_flood_policy: 'not_sure',
    deductible_auto: 'not_sure', deductible_home: 'not_sure', deductible_health: 'not_sure', emergency_cushion: 'not_sure',
    cards: ['amex_gold'], card_usual_payment: 'not_sure',
    phone_bill_on_card: 'not_sure', roadside_sources: ['not_sure'], towing_vehicle_policy: 'not_sure', term_life: 'not_sure',
  } },
  // Every policy ticked and every answer the one that raises the most: all the umbrella Raise items, a financed car with no
  // gap coverage, sewer backup and flood left open, deductibles above the cushion, every extra with a card behind it.
  { id: 'everything-ticked-worst-case', answers: {
    policies: ['auto', 'home', 'renters', 'umbrella', 'health', 'motorcycle', 'boat', 'rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death'],
    umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '500k',
    motorcycle_liability: 'lower', umbrella_min_motorcycle: '250_500', boat_liability: 'lower', umbrella_min_boat: '250_500',
    umbrella_exposure: '1m_3m', umbrella_um_uim: 'no', side_business: 'yes',
    auto_financing: 'loan', auto_value: '10000_24999', auto_gap_coverage: 'no', auto_um_uim: 'no', auto_rental_reimbursement: 'no',
    renters_for: 'child_away', renters_child_housing: 'dorm',
    auto_medpay: 'yes', health_hsa: 'hdhp_hsa', health_supplemental: ['accident', 'cancer'], health_short_term: 'yes',
    home_sewer_backup: 'no', home_flood_policy: 'no',
    deductible_auto: '5000_plus', deductible_home: '5000_plus', deductible_health: '5000_plus', emergency_cushion: 'under_1000',
    cards: ['chase_sapphire_preferred'], card_usual_payment: 'yes',
    phone_bill_on_card: 'yes', roadside_sources: ['auto_policy', 'club'], towing_vehicle_policy: 'yes', term_life: 'own',
  } },
  // Every policy ticked and every answer the quiet one: limits match, coverage is in place, cushions are big, no cards.
  { id: 'everything-ticked-best-case', answers: {
    policies: ['auto', 'home', 'renters', 'umbrella', 'health', 'motorcycle', 'boat', 'rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death'],
    umbrella_limit: '5m', auto_liability: '500_500', umbrella_min_auto: '500_500', home_liability: '500k', umbrella_min_home: '500k',
    motorcycle_liability: '500_500', umbrella_min_motorcycle: '500_500', boat_liability: '500_500', umbrella_min_boat: '500_500',
    umbrella_exposure: 'under_1m', umbrella_um_uim: 'yes', side_business: 'no',
    auto_financing: 'paid_off', auto_value: '25000_plus', auto_um_uim: 'yes', auto_um_uim_limit: '500_500', auto_rental_reimbursement: 'yes',
    renters_for: 'me',
    auto_medpay: 'no', health_hsa: 'neither', health_supplemental: ['none'], health_short_term: 'no',
    home_sewer_backup: 'yes', home_flood_policy: 'yes',
    deductible_auto: 'under_1000', deductible_home: 'under_1000', deductible_health: 'under_1000', emergency_cushion: '5000_plus',
    cards: ['other_none'],
    phone_bill_on_card: 'no', roadside_sources: ['auto_policy'], towing_vehicle_policy: 'no', term_life: 'own',
  } },
  // Every policy ticked with a car that is paid off and nearly worthless, and a card for every extra.
  { id: 'everything-ticked-with-an-old-paid-off-car', answers: {
    policies: ['auto', 'home', 'renters', 'umbrella', 'health', 'motorcycle', 'boat', 'rental_car', 'towing', 'travel', 'phone', 'warranty', 'accidental_death'],
    umbrella_limit: '2m', auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '500k',
    motorcycle_liability: '250_500', umbrella_min_motorcycle: '250_500', boat_liability: '250_500', umbrella_min_boat: '250_500',
    umbrella_exposure: '1m_3m', umbrella_um_uim: 'yes', side_business: 'no',
    auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'yes', auto_um_uim: 'yes', auto_um_uim_limit: '250_500', auto_rental_reimbursement: 'yes',
    renters_for: 'me',
    auto_medpay: 'yes', health_hsa: 'hdhp_only', health_supplemental: ['hospital_indemnity'], health_short_term: 'no',
    home_sewer_backup: 'yes', home_flood_policy: 'no',
    deductible_auto: '1000_4999', deductible_home: '1000_4999', deductible_health: '1000_4999', emergency_cushion: '1000_4999',
    cards: ['chase_sapphire_reserve', 'citi_double_cash'], card_usual_payment: 'no',
    phone_bill_on_card: 'no', roadside_sources: ['card', 'car_maker'], towing_vehicle_policy: 'yes', term_life: 'work_only',
  } },
];
