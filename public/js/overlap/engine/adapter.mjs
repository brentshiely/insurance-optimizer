// Host adapter: turns a snapshot of the existing wizard's state into engine answers. Pure.
//
//   deriveAnswers({ a, extras, q, p, o }) -> { ...o answers, policies: string[] }
//
// `state` is deliberately not part of the snapshot and is never read: overlap flags are state-neutral.
// Policy-screen numbers (p.auto.liability etc.) are editable sample defaults and are never read; the
// only thing taken from `p` is whether the user says they hold an umbrella (p.umbrella.hasUmbrella).
//
// Derived `policies` (sorted, no duplicates):
//   auto        a.veh is "1", "2" or "3+"
//   home        a.home is "Own" or "Both"
//   renters     a.home is "Rent" or "Both"
//   health      q.health === "Yes"
//   umbrella    p.umbrella.hasUmbrella === "Yes"
//   motorcycle  extras includes "Motorcycle"
//   boat        extras includes "Boat"      (Jet ski, RV, ATV, E-bike are out of v1 scope)
//   rental_car, towing, travel, phone, warranty, accidental_death   the user's o.other_items selections
// Every other answer is the user's own o.* selection, passed through by question id.
import { OTHER_ITEM_POLICY_IDS, POLICIES_KEY } from './constants.mjs';
import { isPlainObject, clonePlain, compareStrings } from './util.mjs';

const part = (v) => (isPlainObject(v) ? v : {});

export function deriveAnswers(snapshot) {
  const snap = part(snapshot);
  const a = part(snap.a);
  const q = part(snap.q);
  const p = part(snap.p);
  const o = part(snap.o);
  const extras = Array.isArray(snap.extras) ? snap.extras : [];

  const held = new Set();

  const veh = a.veh;
  if (veh === '1' || veh === '2' || veh === '3+') held.add('auto');

  const home = a.home;
  if (home === 'Own' || home === 'Both') held.add('home');
  if (home === 'Rent' || home === 'Both') held.add('renters');

  if (q.health === 'Yes') held.add('health');

  const umbrella = p.umbrella;
  if (isPlainObject(umbrella) && umbrella.hasUmbrella === 'Yes') held.add('umbrella');

  if (extras.includes('Motorcycle')) held.add('motorcycle');
  if (extras.includes('Boat')) held.add('boat');

  const otherItems = o.other_items;
  if (Array.isArray(otherItems)) {
    for (const id of otherItems) {
      if (OTHER_ITEM_POLICY_IDS.includes(id)) held.add(id);
    }
  }

  const answers = {};
  for (const key of Object.keys(o)) {
    if (key === POLICIES_KEY) continue; // policies are always derived, never user-set
    const value = o[key];
    if (value === undefined || value === null) continue;
    answers[key] = clonePlain(value);
  }
  answers[POLICIES_KEY] = Array.from(held).sort(compareStrings);
  return answers;
}
