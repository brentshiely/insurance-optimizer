// Section "extras_detail": follow-ups on the Other-bucket items, asked ONLY where the answer changes an output
// (DECISIONS S5-9). Everything else about those items is already known from `other_items` and `cards`.
//   phone_bill_on_card      a card's phone protection may depend on how the bill is paid (SPEC: "the trim move
//                           is often stop paying the carrier, route the bill through the card").
//   roadside_sources        what already gives roadside help: more than one source is the duplicate.
//   towing_vehicle_policy   is the plan on a motorcycle or boat policy (a question, not a Drop; research gap).
//   term_life               AD&D against regular life insurance changes how the AD&D item reads.
import { gHolds } from './gates.mjs';
import { yesNoOptions } from './presets.mjs';

export default [
  {
    id: 'phone_bill_on_card',
    domain: 'other',
    section: 'extras_detail',
    type: 'single',
    prompt: 'Do you pay your phone bill with a credit card?',
    help: 'A card\'s phone protection, if it has any, may depend on how the bill is paid. We ask so we can point you to the right fine print.',
    allowNotSure: true,
    showIf: gHolds('phone'),
    options: yesNoOptions(),
  },
  {
    id: 'roadside_sources',
    domain: 'other',
    section: 'extras_detail',
    type: 'multi',
    prompt: 'Which of these already give you roadside help or towing?',
    help: 'Tick everything that applies. If more than one gives you the same help, you may be paying twice.',
    allowNotSure: true,
    showIf: gHolds('towing'),
    options: [
      { id: 'auto_policy', label: 'A roadside add-on on my car insurance' },
      { id: 'club', label: 'An auto club membership, like AAA' },
      { id: 'card', label: 'A credit card that includes roadside help' },
      { id: 'car_maker', label: 'Roadside help that came with my car' },
      { id: 'other', label: 'Something else' },
    ],
  },
  {
    id: 'towing_vehicle_policy',
    domain: 'other',
    section: 'extras_detail',
    type: 'single',
    prompt: 'Is your towing or roadside plan on your motorcycle or boat policy?',
    help: 'Towing or roadside help can be part of a motorcycle or boat policy, and your car\'s roadside help usually does not reach those vehicles. We ask so we can tell whether you are covered twice or not at all.',
    allowNotSure: true,
    showIf: { all: [{ holds: 'towing' }, { any: [{ holds: 'motorcycle' }, { holds: 'boat' }] }] },
    options: yesNoOptions(),
  },
  {
    id: 'term_life',
    domain: 'other',
    section: 'extras_detail',
    type: 'single',
    prompt: 'Besides accidental death coverage, do you have regular life insurance, like term life?',
    help: 'Regular life insurance pays your family if you die while the policy is active. Accidental death coverage pays only when an accident causes the death.',
    allowNotSure: true,
    showIf: gHolds('accidental_death'),
    options: [
      { id: 'own', label: 'Yes, a policy I bought myself' },
      { id: 'work_only', label: 'Yes, but only through my job' },
      { id: 'none', label: 'No' },
    ],
  },
];
