// Section "deductible": the deductible-vs-cushion check (SPEC "Deductible vs. emergency cushion"). Shown when
// the user holds auto, home or health. Every answer is a coarse band with comparable { min, max } values; the
// same three bands are used for each deductible and for the cushion so they compare directly. Never a
// judgment on a plan: the check only compares the bill a claim could hand you with the cash you have.
import { gHolds, gDeductibleHolder } from './gates.mjs';
import { moneyBandOptions } from './presets.mjs';

export default [
  {
    id: 'deductible_auto',
    domain: 'deductible',
    section: 'deductible',
    type: 'single',
    prompt: "What's your collision deductible, the amount you pay first when you make a claim?",
    help: 'It is listed on your auto policy. If you have a few deductibles, pick the one for collision.',
    allowNotSure: true,
    showIf: gHolds('auto'),
    options: moneyBandOptions(),
  },
  {
    id: 'deductible_home',
    domain: 'deductible',
    section: 'deductible',
    type: 'single',
    prompt: "What's your home policy's deductible, the amount you pay first on most claims?",
    help: 'Some policies use a percentage of your home\'s value for wind, hail or earthquake. For this question, go with your standard deductible.',
    allowNotSure: true,
    showIf: gHolds('home'),
    options: moneyBandOptions(),
  },
  {
    id: 'deductible_health',
    domain: 'deductible',
    section: 'deductible',
    type: 'single',
    prompt: "What's your health plan's deductible, the amount you pay for covered care before the plan starts paying?",
    help: 'Pick the deductible that applies to you. The most you could pay in a year can be higher than the deductible, and we are not asking about that.',
    allowNotSure: true,
    showIf: gHolds('health'),
    options: moneyBandOptions(),
  },
  {
    id: 'emergency_cushion',
    domain: 'deductible',
    section: 'deductible',
    type: 'single',
    prompt: 'If you had to pay a big bill tomorrow, roughly how much could you cover from savings?',
    help: 'Count cash and savings you could get to within a few days. A range is plenty.',
    allowNotSure: true,
    showIf: gDeductibleHolder(),
    options: moneyBandOptions(),
  },
];
