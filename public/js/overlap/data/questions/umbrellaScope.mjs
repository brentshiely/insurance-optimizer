// Section "umbrella_scope": is the umbrella the right size and shape (SPEC "Umbrella scope and adequacy").
// Shown when the user holds an umbrella. Exposure is a coarse band only, never a typed figure.
import { gHolds, gUmbrellaAnd } from './gates.mjs';
import { exposureOptions, yesNoOptions } from './presets.mjs';

export default [
  {
    id: 'umbrella_exposure',
    domain: 'umbrella',
    section: 'umbrella_scope',
    type: 'single',
    prompt: 'Roughly, how much would you stand to lose if you were sued? Count your savings, your investments, and what your home is worth beyond what you still owe on it.',
    help: 'Pick a range. A rough guess is plenty, and we never ask for an exact number. It is only a rough guide for whether your umbrella is the right size.',
    allowNotSure: true,
    showIf: gHolds('umbrella'),
    options: exposureOptions(),
  },
  {
    id: 'umbrella_um_uim',
    domain: 'umbrella',
    section: 'umbrella_scope',
    type: 'single',
    prompt: 'Does your umbrella extend uninsured and underinsured motorist coverage?',
    help: 'Uninsured and underinsured motorist coverage pays you when the driver who hurts you has no insurance, or not enough. If your auto policy includes it, it has its own limit. The question is whether your umbrella adds more on top. Your agent can tell you in a minute.',
    allowNotSure: true,
    showIf: gUmbrellaAnd('auto'),
    options: yesNoOptions(),
  },
  {
    id: 'side_business',
    domain: 'umbrella',
    section: 'umbrella_scope',
    type: 'single',
    prompt: 'Do you have a side business or a side gig?',
    help: 'Anything you earn money from outside a regular job counts, even a small one, like freelancing, selling things, or driving for a delivery or ride app. We ask because umbrellas typically leave out business activity. A yes or no is all we need.',
    allowNotSure: false,
    showIf: gHolds('umbrella'),
    options: yesNoOptions(),
  },
];
