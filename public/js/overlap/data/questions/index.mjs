// The overlap question catalog (closed lists, see docs/ARCHITECTURE.md "Question" and
// docs/QUESTION-FLAG-PLAN.md). Built by Story S5.
//
// QUESTIONS is in display order: sections follow SECTIONS order and each section's questions are contiguous.
// SECTIONS is the ordered list of wizard sections ({ id, title, reason, showIf }) for the UI (Story S13).
// The first question is Q1, `policies` ("Which policies do you have?", policies.mjs): an ordinary asked question that
// every other gate reads through `{ holds }`. Nothing else asks which policies the user has.
import policies from './policies.mjs';
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
  ...policies,
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
