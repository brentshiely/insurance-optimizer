// The overlap question catalog (closed lists, see docs/ARCHITECTURE.md "Question" and
// docs/QUESTION-FLAG-PLAN.md). Built by Story S5.
//
// QUESTIONS is in display order: sections follow SECTIONS order and each section's questions are contiguous.
// SECTIONS is the ordered list of wizard sections ({ id, title, reason, showIf }) for the UI (Story S13).
// Do not ask here for anything the host app already derives (own/rent, vehicles, extras, health yes/no,
// umbrella yes/no): those arrive as the derived `policies` answer (engine/adapter.mjs).
import extras from './extras.mjs';
import umbrellaStack from './umbrellaStack.mjs';
import umbrellaVehicles from './umbrellaVehicles.mjs';
import umbrellaScope from './umbrellaScope.mjs';
import autoGaps from './autoGaps.mjs';
import renters from './renters.mjs';
import health from './health.mjs';
import homeExclusions from './homeExclusions.mjs';
import deductible from './deductible.mjs';
import cards from './cards.mjs';
import extrasDetail from './extrasDetail.mjs';

export { SECTIONS } from './sections.mjs';

export const QUESTIONS = [
  ...extras,
  ...umbrellaStack,
  ...umbrellaVehicles,
  ...umbrellaScope,
  ...autoGaps,
  ...renters,
  ...health,
  ...homeExclusions,
  ...deductible,
  ...cards,
  ...extrasDetail,
];

export default QUESTIONS;
