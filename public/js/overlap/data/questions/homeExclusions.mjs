// Section "home_exclusions": common within-policy exclusions on the home policy (SPEC "Common home-policy
// exclusions"). Per DECISIONS D8 each is first asked as yes / no / not sure, so the Question item is raised
// only for "no" and "not sure" and informed users are not nagged.
import { gHolds } from './gates.mjs';
import { yesNoOptions } from './presets.mjs';

export default [
  {
    id: 'home_sewer_backup',
    domain: 'home',
    section: 'home_exclusions',
    type: 'single',
    prompt: 'Does your home policy cover sewer or drain backup?',
    help: 'This is when water comes back up through your drains or sump pump and damages your floors and belongings. A standard home policy often leaves it out unless you add it. It is usually listed as an add-on, sometimes called water backup.',
    allowNotSure: true,
    showIf: gHolds('home'),
    options: yesNoOptions(),
  },
  {
    id: 'home_flood_policy',
    domain: 'home',
    section: 'home_exclusions',
    type: 'single',
    prompt: 'Do you have a separate flood insurance policy?',
    help: 'Standard home policies do not cover flood damage. Flood coverage is bought on its own, through the government flood insurance program or a private insurer. Say Yes only if you have a policy just for flood.',
    allowNotSure: true,
    showIf: gHolds('home'),
    options: yesNoOptions(),
  },
];
