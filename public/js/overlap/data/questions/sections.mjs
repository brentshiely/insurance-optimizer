// The wizard sections: which questions share a screen, in display order (docs/ARCHITECTURE.md "Question").
//
//   { id, title, reason, showIf }
//
// `id` matches the `section` of its questions. `reason` is the plain-language "why we are asking", tied to
// something the user already told us in Q1. The first section, `start`, holds Q1 itself, so its reason says why the
// question is asked instead. `showIf` is the
// section-level gate: a Condition (same DSL as questions) or null for always shown. Every question carries
// its own complete gate, so the engine never needs the sections; sections only group the screens. The rule
// the tests enforce: a section has at least one visible question exactly when its `showIf` is true.
//
// A section gate reads Q1 only, through `holds` (the ticked policies). It never reads any other answer, so the screen
// list needs nothing but the answer to Q1.
//
// The `reason` strings are static text. They name the thing the user already told us ("you told us you
// have an umbrella"). The one exception is `start`, which is where they tell us.

export const SECTIONS = [
  {
    id: 'start',
    title: 'Your policies',
    reason: 'Everything after this depends on which policies you have, so we start here and only ask about what you tick.',
    showIf: null,
  },
  {
    id: 'umbrella_stack',
    title: 'What sits under your umbrella',
    reason: 'You told us you have an umbrella policy, so we need to see what sits underneath it. An umbrella only starts paying after your auto and home liability limits run out.',
    showIf: { holds: 'umbrella' },
  },
  {
    id: 'umbrella_vehicles',
    title: 'Your motorcycle or boat under the umbrella',
    reason: 'You told us you have an umbrella and a motorcycle or boat. Those need their own liability limits under the umbrella too.',
    showIf: { all: [{ holds: 'umbrella' }, { any: [{ holds: 'motorcycle' }, { holds: 'boat' }] }] },
  },
  {
    id: 'umbrella_scope',
    title: 'What your umbrella covers',
    reason: 'You told us you have an umbrella policy, so here are a few questions about what it covers. A standard umbrella is liability coverage only, so it does nothing for your own property.',
    showIf: { holds: 'umbrella' },
  },
  {
    id: 'auto_gaps',
    title: 'A closer look at your auto policy',
    reason: 'You told us you have a car, so here are a few quick checks on your auto policy itself, whatever else you own.',
    showIf: { holds: 'auto' },
  },
  {
    id: 'renters',
    title: 'Your renters policy',
    reason: 'You told us you have a renters policy, so we want to know whose belongings it is meant to cover. If it is for a child away from home and you own your home, your own home policy may already reach those belongings.',
    showIf: { holds: 'renters' },
  },
  {
    id: 'health',
    title: 'Your health insurance and the extras around it',
    reason: 'You told us you have health insurance, so here are a few questions about the extras people stack on top of it. We never judge the plan itself.',
    showIf: { holds: 'health' },
  },
  {
    id: 'home_exclusions',
    title: 'What your home policy leaves out',
    reason: 'You told us you own your home, so here are two things a standard home policy often does not cover.',
    showIf: { holds: 'home' },
  },
  {
    id: 'deductible',
    title: 'What you would pay first',
    reason: 'You told us about your auto, home or health coverage. Each has a deductible, the amount you pay before the insurer pays anything, so we will compare it with the cash you could put your hands on.',
    showIf: { any: [{ holds: 'auto' }, { holds: 'home' }, { holds: 'health' }] },
  },
  {
    id: 'cards',
    title: 'Your credit cards',
    reason: 'You told us you pay for extras that a credit card sometimes already covers, so we want to know which cards you carry.',
    showIf: { any: [{ holds: 'rental_car' }, { holds: 'towing' }, { holds: 'travel' }, { holds: 'phone' }, { holds: 'warranty' }] },
  },
  {
    id: 'extras_detail',
    title: 'A little more about your extras',
    reason: 'You told us about a few extras, so here are a couple of follow-ups to see whether you are covered twice.',
    showIf: { any: [{ holds: 'phone' }, { holds: 'towing' }, { holds: 'accidental_death' }] },
  },
];

export default SECTIONS;
