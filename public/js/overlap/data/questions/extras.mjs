// Section "extras": the Q1 equivalent. The host app already derives auto, home, renters, health, umbrella,
// motorcycle and boat, so the only thing left to ask up front is which of the smaller Other-bucket items
// the user pays for. Six option ids are exactly the policy ids the adapter folds into `policies`.
//
// The seventh, `renters_with_home`, is an answer only: the adapter does not fold it into `policies`, so
// `holds('renters')` stays what the host derives (own/rent). It exists because the host derives renters from
// "rent" or "both" alone, which leaves out the SPEC's headline case: a parent who OWNS their home and pays
// for a renters policy so a child at college has coverage (DECISIONS S5-15). Ticking it opens the `renters`
// section (sections.mjs, renters.mjs), which asks whose belongings the policy covers.
//
// No "Not sure" on this question: unticked simply means "not paying for it", and "None of these" is the
// explicit answer for nothing. Someone unsure about a job benefit is told to tick it (see help).

export default [
  {
    id: 'other_items',
    domain: 'other',
    section: 'extras',
    type: 'multi',
    prompt: 'Do you pay for any of these extras?',
    help: 'Tick anything you pay for. If you are not sure whether your job gives you accidental death coverage, tick it and we will tell you what to look for. For each one we will check whether something you already have covers the same thing.',
    allowNotSure: false,
    showIf: null,
    options: [
      { id: 'rental_car', label: 'Rental car insurance, the extra coverage a rental company sells at the counter' },
      { id: 'towing', label: 'A towing or roadside plan, including one on a motorcycle or boat policy' },
      { id: 'travel', label: 'Travel insurance for a trip' },
      { id: 'phone', label: 'Phone insurance, a monthly fee to cover a lost, stolen or broken phone' },
      { id: 'warranty', label: 'Extended warranties on electronics or appliances' },
      { id: 'accidental_death', label: 'Accidental death coverage, including any through your job' },
      { id: 'renters_with_home', label: 'A renters policy on top of a home you own, like one you pay for so a child at college has coverage' },
      { id: 'none', label: 'None of these', exclusive: true },
    ],
  },
];
