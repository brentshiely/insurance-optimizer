// Section "renters": whose belongings the renters policy covers (SPEC "Renters"). Anyone who ticked "Renters" in Q1
// reaches it. The tick covers a renters policy of your own and one a homeowner pays for so a child at college has
// coverage, so the SPEC's headline Renters + Homeowners case (a parent who owns their home) is reached by ticking
// Home and Renters.
//
// `renters_for` is the one root question. `renters_child_housing` reads only `renters_for` because a gate that
// referenced two questions that can be hidden for different users would hide whenever either was hidden
// (docs/ARCHITECTURE.md "Condition DSL"): `renters_for` is visible exactly when Renters is ticked, so the follow-up
// needs only "a home policy" and "for a child". The follow-up needs a home policy because only then is there a parent's
// homeowners policy to overlap with (S5-6).
import { gHolds } from './gates.mjs';

export default [
  {
    id: 'renters_for',
    domain: 'renters',
    section: 'renters',
    type: 'single',
    prompt: 'Is this renters policy for you, or for a child who lives away from home, like at college?',
    help: 'If it covers your own place, pick the first one. If you pay for it so a student has coverage, pick the second.',
    // No "Not sure": you know whose belongings you bought the policy for.
    allowNotSure: false,
    showIf: gHolds('renters'),
    options: [
      { id: 'me', label: 'For me' },
      { id: 'child_away', label: 'For a child living away from home, like at college' },
    ],
  },
  {
    id: 'renters_child_housing',
    domain: 'renters',
    section: 'renters',
    type: 'single',
    prompt: 'Does your child live in a dorm or off campus?',
    help: 'We ask because whether a parent\'s home policy reaches a student\'s belongings can depend on where they live.',
    allowNotSure: true,
    showIf: { all: [gHolds('home'), { answer: 'renters_for', is: 'child_away' }] },
    options: [
      { id: 'dorm', label: 'In a dorm' },
      { id: 'off_campus', label: 'Off campus, in an apartment or house' },
    ],
  },
];
