// Section "health": the narrow health scope (SPEC "Health medical-rider overlap" and "Health supplemental
// overlap"). Never plan adequacy: no network, no "is this plan good enough". Whether the user has health insurance
// is Q1 (the Health tick), so nothing here asks that again.
//   auto_medpay          is asked so the MedPay overlap is raised only for people who may actually have it
//                        (DECISIONS S5-6); home "medical payments to others" covers guests, so no question.
//   health_hsa           gate for the HSA nudge (eligibility needs a high-deductible plan, so it is asked,
//                        never inferred from a deductible band).
//   health_supplemental  the bolt-on policies stacked on a main plan.
//   health_short_term    a separate short-term medical plan alongside the main plan.
import { gHolds } from './gates.mjs';
import { yesNoOptions } from './presets.mjs';

export default [
  {
    id: 'auto_medpay',
    domain: 'health',
    section: 'health',
    type: 'single',
    prompt: 'Does your auto policy pay medical bills for you and your passengers after a crash, no matter who was at fault?',
    help: 'This might be called medical payments, MedPay, or personal injury protection (PIP) on your policy. Whether it is required varies by state, and your state\'s department of insurance can tell you.',
    allowNotSure: true,
    showIf: { all: [{ holds: 'health' }, { holds: 'auto' }] },
    options: yesNoOptions(),
  },
  {
    id: 'health_hsa',
    domain: 'health',
    section: 'health',
    type: 'single',
    prompt: 'Is your health plan a high-deductible plan with a health savings account (HSA)?',
    help: 'An HSA is a savings account for medical costs, and you can only put money in it with a high-deductible plan. Your plan card or your benefits site may say "HDHP" or "HSA-eligible".',
    allowNotSure: true,
    showIf: gHolds('health'),
    options: [
      { id: 'hdhp_hsa', label: 'Yes, a high-deductible plan with an HSA' },
      { id: 'hdhp_only', label: 'A high-deductible plan, but no HSA' },
      { id: 'neither', label: 'No, it is a regular plan' },
    ],
  },
  {
    id: 'health_supplemental',
    domain: 'health',
    section: 'health',
    type: 'multi',
    prompt: 'Do you pay for any extra health policies on top of your main one?',
    help: 'These pay you a set amount of cash for one kind of event, like an accident, a hospital stay, or a cancer diagnosis, instead of paying your bills. You might pay for them through your paycheck or on your own. Tick all that apply.',
    allowNotSure: true,
    showIf: gHolds('health'),
    options: [
      { id: 'accident', label: 'Accident insurance' },
      { id: 'critical_illness', label: 'Critical illness insurance' },
      { id: 'hospital_indemnity', label: 'Hospital indemnity insurance' },
      { id: 'cancer', label: 'Cancer insurance' },
      { id: 'none', label: 'None of these', exclusive: true },
    ],
  },
  {
    id: 'health_short_term',
    domain: 'health',
    section: 'health',
    type: 'single',
    prompt: 'Do you also pay for a separate short-term medical plan alongside your main health plan?',
    help: 'Short-term plans follow different rules from regular health insurance and may not cover things like pre-existing conditions. If you only have one health plan, answer No.',
    allowNotSure: true,
    showIf: gHolds('health'),
    options: yesNoOptions(),
  },
];
