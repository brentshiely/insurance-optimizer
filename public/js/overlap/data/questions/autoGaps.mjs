// Section "auto_gaps": within-policy gaps and trims on the auto policy (SPEC "Auto coverage gaps").
// Two gate questions drive the rest: is the car leased or financed, and roughly what is it worth.
// The subject is the user's NEWEST car (DECISIONS S5-4): the engine does not know the vehicle count, and
// the gap and older-car checks are about the car most likely to be financed and the one the policy is for.
import { gHolds, gAutoAnd, gIs, gIn } from './gates.mjs';
import { carValueOptions, liabilityLimitOptions, yesNoOptions } from './presets.mjs';

export default [
  {
    id: 'auto_financing',
    domain: 'auto',
    section: 'auto_gaps',
    type: 'single',
    prompt: 'Is your newest car leased or financed?',
    help: 'If you have more than one car, answer for your newest. We ask because a lease or a loan changes what happens if the car is totaled.',
    // No "Not sure": you know whether you lease the car or owe money on it.
    allowNotSure: false,
    showIf: gHolds('auto'),
    options: [
      { id: 'lease', label: 'I lease it' },
      { id: 'loan', label: 'I still owe money on it' },
      { id: 'paid_off', label: 'No, I own it outright' },
    ],
  },
  {
    id: 'auto_value',
    domain: 'auto',
    section: 'auto_gaps',
    type: 'single',
    prompt: 'Roughly what is that car worth today?',
    help: 'A rough guess is fine. A used-car listing for the same year and model gives you a ballpark.',
    allowNotSure: true,
    showIf: gHolds('auto'),
    options: carValueOptions(),
  },
  {
    id: 'auto_gap_coverage',
    domain: 'auto',
    section: 'auto_gaps',
    type: 'single',
    prompt: 'Do you have gap coverage on that car?',
    help: 'Gap coverage pays the difference if the car is totaled and you owe more than it was worth. It can come with your auto policy, from the dealer or the lender, or be built into a lease, so check your loan or lease paperwork too.',
    allowNotSure: true,
    showIf: gAutoAnd(gIn('auto_financing', ['loan', 'lease'])),
    options: yesNoOptions(),
  },
  {
    id: 'auto_collision',
    domain: 'auto',
    section: 'auto_gaps',
    type: 'single',
    prompt: 'Do you pay for collision and comprehensive coverage on that car?',
    help: 'Collision pays to fix your car after a crash with another vehicle or object, whoever is at fault. Comprehensive pays for things like theft, hail or hitting a deer. Both come with a deductible, and both are listed on your policy.',
    allowNotSure: true,
    showIf: gAutoAnd(gIs('auto_financing', 'paid_off'), gIs('auto_value', 'under_3000')),
    options: yesNoOptions(),
  },
  {
    id: 'auto_um_uim',
    domain: 'auto',
    section: 'auto_gaps',
    type: 'single',
    prompt: 'Does your auto policy include uninsured and underinsured motorist coverage?',
    help: 'It pays you when the other driver has no insurance, or not enough. Look for "uninsured motorist" or "UM/UIM" on the summary page of your policy.',
    allowNotSure: true,
    showIf: gHolds('auto'),
    options: yesNoOptions(),
  },
  {
    id: 'auto_um_uim_limit',
    domain: 'auto',
    section: 'auto_gaps',
    type: 'single',
    prompt: "What's the limit on that coverage?",
    help: 'It is usually written like your liability limits, such as 100/300. If yours is lower than 100/300, pick the first choice.',
    allowNotSure: true,
    showIf: gAutoAnd(gIs('auto_um_uim', 'yes')),
    options: liabilityLimitOptions(),
  },
  {
    id: 'auto_rental_reimbursement',
    domain: 'auto',
    section: 'auto_gaps',
    type: 'single',
    prompt: 'If your car were in the shop after an accident, would your policy pay for a rental car?',
    help: 'This is usually called "rental reimbursement". It pays up to a set amount per day, for a limited number of days, while your car is being repaired after a covered claim.',
    allowNotSure: true,
    showIf: gHolds('auto'),
    options: yesNoOptions(),
  },
];
