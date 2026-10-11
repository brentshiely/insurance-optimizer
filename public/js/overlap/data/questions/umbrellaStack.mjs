// Section "umbrella_stack": the auto + home + umbrella core (SPEC "Auto + Home + Umbrella core").
// Shown only when the user holds an umbrella. The umbrella's required minimum is asked for home (as the
// SPEC specifies) and also for auto, so each underlying limit has something to be compared against
// (DECISIONS S5-2). Limits are asked here, as closed-list answers with Not sure (D10).
import { gHolds, gUmbrellaAnd } from './gates.mjs';
import { homeLiabilityOptions, liabilityLimitOptions, liabilityOptions } from './presets.mjs';

const WHERE_TO_LOOK_FOR_MINIMUM = 'Your umbrella policy lists what it needs underneath it, often under a heading like "required underlying limits", and your agent can tell you in a minute. Every insurer sets its own, so if you cannot find it, tap Not sure.';

export default [
  {
    id: 'umbrella_limit',
    domain: 'core',
    section: 'umbrella_stack',
    type: 'single',
    prompt: 'How big is your umbrella policy?',
    help: 'This is the dollar amount on your umbrella policy, like $1 million. An umbrella is extra liability coverage that starts paying after your auto or home limits run out.',
    allowNotSure: true,
    showIf: gHolds('umbrella'),
    options: [
      { id: '1m', label: '$1 million', value: 1000000 },
      { id: '2m', label: '$2 million', value: 2000000 },
      { id: '5m', label: '$5 million', value: 5000000 },
    ],
  },
  {
    id: 'auto_liability',
    domain: 'core',
    section: 'umbrella_stack',
    type: 'single',
    prompt: "What's the most your auto policy will pay if you're at fault in an accident, per person and per accident?",
    help: 'Look for numbers like 100/300 on the summary page of your auto policy, called the declarations page. The first number is the most it pays for one person you hurt, and the second is the most for everyone you hurt in one accident, both in thousands of dollars. If yours is lower than 100/300, pick the first choice. If yours shows one combined number instead, tap Not sure.',
    allowNotSure: true,
    showIf: gUmbrellaAnd('auto'),
    options: liabilityLimitOptions(),
  },
  {
    id: 'umbrella_min_auto',
    domain: 'core',
    section: 'umbrella_stack',
    type: 'single',
    prompt: 'What does your umbrella require as a minimum on your auto policy?',
    help: WHERE_TO_LOOK_FOR_MINIMUM,
    allowNotSure: true,
    showIf: gUmbrellaAnd('auto'),
    options: liabilityOptions(),
  },
  {
    id: 'home_liability',
    domain: 'core',
    section: 'umbrella_stack',
    type: 'single',
    prompt: "What's the most your home policy pays if someone's hurt on your property or you're liable?",
    help: 'This is the personal liability amount on your home policy, not the amount it would pay to rebuild your house. You can find it on the summary page of your home policy, called the declarations page. If yours is lower than $300,000, pick the first choice.',
    allowNotSure: true,
    showIf: gUmbrellaAnd('home'),
    options: homeLiabilityOptions(),
  },
  {
    id: 'umbrella_min_home',
    domain: 'core',
    section: 'umbrella_stack',
    type: 'single',
    prompt: 'What does your umbrella require as a minimum on your home policy?',
    help: WHERE_TO_LOOK_FOR_MINIMUM,
    allowNotSure: true,
    showIf: gUmbrellaAnd('home'),
    options: [
      { id: '300k', label: '$300,000', value: 300000 },
      { id: '500k', label: '$500,000', value: 500000 },
    ],
  },
];
