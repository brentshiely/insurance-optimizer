// Section "start": Q1, "Which policies do you have?" (SPEC "Question flow and branching"). It is a real asked question,
// the first one, always shown. Its answer is the list of policies the user ticked, and it drives every branch after
// it: the condition `{ holds: id }` and `ctx.holds(id)` read this answer, so every later question appears only when the
// policy or item it is about was ticked here (the SPEC: "Every later question appears only when the relevant policy or
// item was selected in Q1").
//
// The options are the SPEC's Q1 list in the SPEC's order: Auto, Home, Renters, Umbrella, Health, then the two other
// vehicles the SPEC names later as selectable in Q1 (motorcycle, boat), then the Other-bucket items in the order the
// SPEC lists them (rental car, towing / roadside, travel insurance, phone insurance, extended warranties, accidental
// death). The option ids are exactly the ids the `holds` condition accepts (POLICY_IDS in engine/constants.mjs), plus
// an exclusive "None of these".
//
// No "Not sure": you know which policies you pay for, and an unticked option simply means you do not have it. Someone
// unsure about accidental death coverage through a job is told to tick it (see help). The renters tick also covers a
// policy bought for a child who lives away from home, which is how a parent who owns their home reaches the SPEC's
// Renters + Homeowners case (DECISIONS R1-4).

export default [
  {
    id: 'policies',
    domain: 'core',
    section: 'start',
    type: 'multi',
    prompt: 'Which policies do you have?',
    help: 'Tick everything you have or pay for. We only ask follow-up questions about what you tick. If you are not sure whether your job gives you accidental death coverage, tick it and we will tell you what to look for.',
    allowNotSure: false,
    showIf: null,
    options: [
      { id: 'auto', label: 'Auto insurance, for a car or truck you drive' },
      { id: 'home', label: 'Homeowners insurance, for a home you own' },
      { id: 'renters', label: 'Renters insurance, including one you pay for so a child living away from home, like at college, has coverage' },
      { id: 'umbrella', label: 'Umbrella insurance, extra liability coverage that sits on top of your auto and home policies' },
      { id: 'health', label: 'Health insurance' },
      { id: 'motorcycle', label: 'Motorcycle insurance' },
      { id: 'boat', label: 'Boat insurance' },
      { id: 'rental_car', label: 'Rental car insurance, the extra coverage a rental company sells at the counter' },
      { id: 'towing', label: 'A towing or roadside plan, including one on a motorcycle or boat policy' },
      { id: 'travel', label: 'Travel insurance for a trip' },
      { id: 'phone', label: 'Phone insurance, a monthly fee to cover a lost, stolen or broken phone' },
      { id: 'warranty', label: 'Extended warranties on electronics or appliances' },
      { id: 'accidental_death', label: 'Accidental death coverage, including any through your job' },
      { id: 'none', label: 'None of these', exclusive: true },
    ],
  },
];
