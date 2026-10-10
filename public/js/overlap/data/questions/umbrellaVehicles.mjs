// Section "umbrella_vehicles": motorcycle and boat liability under the umbrella (SPEC "Other vehicles").
// Asked only when the user holds an umbrella AND the vehicle. The limit uses the same presets as auto;
// the umbrella's own minimum is asked per vehicle because no authoritative source says it must match
// the auto minimum (DECISIONS S5-2, research gap "required underlying limits for motorcycles, boats").
import { gUmbrellaAnd } from './gates.mjs';
import { liabilityLimitOptions, liabilityOptions } from './presets.mjs';

const WHERE_TO_LOOK_FOR_MINIMUM = 'Your umbrella policy lists what it needs underneath it, and your agent can tell you in a minute. If yours does not mention this vehicle or you cannot find it, tap Not sure.';

export default [
  {
    id: 'motorcycle_liability',
    domain: 'vehicles',
    section: 'umbrella_vehicles',
    type: 'single',
    prompt: "What's the most your motorcycle policy will pay if you're at fault in an accident, per person and per accident?",
    help: 'Look for numbers like 100/300 on the summary page of your motorcycle policy, called the declarations page. The first is the most it pays for one person you hurt, and the second is the most for everyone you hurt in one accident, both in thousands of dollars. If yours is lower than 100/300, pick the first choice. If yours shows one combined number instead, tap Not sure.',
    allowNotSure: true,
    showIf: gUmbrellaAnd('motorcycle'),
    options: liabilityLimitOptions(),
  },
  {
    id: 'umbrella_min_motorcycle',
    domain: 'vehicles',
    section: 'umbrella_vehicles',
    type: 'single',
    prompt: 'What does your umbrella require as a minimum on your motorcycle policy?',
    help: WHERE_TO_LOOK_FOR_MINIMUM,
    allowNotSure: true,
    showIf: gUmbrellaAnd('motorcycle'),
    options: liabilityOptions(),
  },
  {
    id: 'boat_liability',
    domain: 'vehicles',
    section: 'umbrella_vehicles',
    type: 'single',
    prompt: "What's the most your boat policy will pay if you're at fault in an accident, per person and per accident?",
    help: 'Look for liability numbers like 100/300 on the summary page of your boat policy, called the declarations page. The first is the most it pays for one person you hurt, and the second is the most for everyone you hurt in one accident, both in thousands of dollars. If yours is lower than 100/300, pick the first choice. Boat policies often show one combined amount instead. If yours does, pick the closest match or tap Not sure.',
    allowNotSure: true,
    showIf: gUmbrellaAnd('boat'),
    options: liabilityLimitOptions(),
  },
  {
    id: 'umbrella_min_boat',
    domain: 'vehicles',
    section: 'umbrella_vehicles',
    type: 'single',
    prompt: 'What does your umbrella require as a minimum on your boat policy?',
    help: WHERE_TO_LOOK_FOR_MINIMUM,
    allowNotSure: true,
    showIf: gUmbrellaAnd('boat'),
    options: liabilityOptions(),
  },
];
