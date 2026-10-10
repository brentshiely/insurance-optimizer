// Flags for the "renters" domain (Story S9): a renters policy bought for a child away from home against the parent's
// own home policy (SPEC "Renters" and the Renters + Homeowners bullet in "Core logic").
//
//   renters-child-vs-parents-home   reads renters_for, renters_child_housing, and holds('home')
//
// Who reaches it: anyone the host derives a renters policy for (rent or both) and a homeowner who ticked "a renters
// policy on top of a home you own" in other_items, which is how a parent who owns their home and pays for a child's
// policy is reached (DECISIONS S5-15). So the flag reads `renters_for`, never `holds('renters')` or `other_items`: that
// question is visible exactly when a renters policy exists, and a hidden question reads as unanswered.
//
// Copy rules (docs/QUESTION-FLAG-PLAN.md section 5, DECISIONS S3a-home-4):
//   - always a Question item, never a Drop: whether the renters policy is redundant depends on the parents' contents
//     limit, the child's belongings and the insurer's terms, so the text says "generally", "may" and "likely";
//   - the 10 percent dorm figure (one undated brochure) and the age limit (sources differ) are never stated;
//   - each variant speaks only to the user's situation: the dorm text never mentions off campus and the off-campus text
//     never mentions a dorm; "not sure" (and an unanswered housing question, which reads the same) explains both.

const DORM = 'dorm';
const OFF_CAMPUS = 'off_campus';

// 'dorm', 'off_campus' or 'unclear' (Not sure, or the follow-up not answered), and null when the flag stays silent.
const variantFor = (ctx) => {
  if (!ctx.holds('home')) return null;
  if (!ctx.is('renters_for', 'child_away')) return null;
  if (ctx.is('renters_child_housing', DORM)) return DORM;
  if (ctx.is('renters_child_housing', OFF_CAMPUS)) return OFF_CAMPUS;
  return 'unclear';
};

const CHECK_TITLE = "Check whether your home policy already covers your child's belongings";

// What the sources say varies by insurer (a set cap, conditions such as age and enrollment, the deductible), always hedged.
const CAP = 'Your policy may pay only up to a set amount for belongings away from home';
const CONDITIONS = "it may set conditions such as your child's age and whether they are enrolled in classes";
const DEDUCTIBLE = 'your deductible (what you pay first on any claim) still applies';

const COPY = {
  dorm: {
    title: CHECK_TITLE,
    background: `A student who lives in a dorm and is still part of your household is generally covered by your home policy's off-premises coverage, which protects belongings away from home. That means the renters policy you pay for may be doing a job your home policy already does. The details vary by insurer. ${CAP}, ${CONDITIONS}, and ${DEDUCTIBLE}. A renters policy can still make sense if your child's belongings are worth more than your home policy would pay, so compare before you decide.`,
    ask: "Ask your home insurer whether your policy covers your child's belongings in their dorm, up to how much, and what conditions apply, such as their age and whether they are enrolled in classes. Also ask whether anything especially valuable your child owns has a lower limit or needs a special add-on, called a floater. Then compare the answers with what your child's renters policy pays, and ask the renters insurer what it adds beyond your home policy before you decide whether to keep it.",
    reason: 'My child lives in a dorm, so I want to know whether my home policy already covers their belongings and what the renters policy adds.',
  },
  off_campus: {
    title: "Confirm your child's renters policy covers what they own",
    background: "A student who lives off campus is likely not covered by your home policy, and some insurers may not extend student coverage to an apartment rented in the student's name. So the renters policy you pay for is probably not a duplicate. The building owner's insurance and the school's insurance do not cover your child's personal items either, so without their own policy your child would probably have nothing to fall back on.",
    ask: 'Ask your home insurer whether your policy reaches a place your child rents off campus; it likely does not. If it does not, your child probably needs their own renters policy, so ask the renters insurer whether its limit is enough to replace what your child owns and what the deductible is.',
    reason: 'My child rents off campus, so I want to confirm my home policy does not reach them and that their renters policy limit is enough.',
  },
  unclear: {
    title: CHECK_TITLE,
    background: `Whether your home policy reaches a child's belongings depends on where they live. A student in a dorm who is still part of your household is generally covered by your home policy's off-premises coverage (the part that protects belongings away from home), which means a separate renters policy may be a duplicate. A student who lives off campus is likely not covered, and probably needs their own renters policy. Either way the details vary by insurer. ${CAP}, and ${DEDUCTIBLE}.`,
    ask: "Ask your home insurer whether your policy covers your child's belongings where they live now, up to how much, and what conditions apply, such as their age and whether they are enrolled in classes. Then compare the answers with what your child's renters policy pays, and ask the renters insurer what it adds beyond your home policy.",
    reason: "I want to know whether my home policy covers my child's belongings where they live, and what a separate renters policy adds.",
  },
};

const pick = (variant) => (variant === DORM ? COPY.dorm : variant === OFF_CAMPUS ? COPY.off_campus : COPY.unclear);

export default [
  {
    id: 'renters-child-vs-parents-home',
    domain: 'renters',
    bucket: 'question',
    kind: 'cross-policy',
    priority: 330,
    // Fires for a renters policy bought for a child away from home when the user holds a home policy. The housing answer
    // only chooses the wording; it is never required, and the flag has one emphasis.
    applies: (ctx) => variantFor(ctx) !== null,
    title: (ctx) => pick(variantFor(ctx)).title,
    background: (ctx) => pick(variantFor(ctx)).background,
    ask: (ctx) => pick(variantFor(ctx)).ask,
    reason: (ctx) => pick(variantFor(ctx)).reason,
    sourceIds: [
      'iii-college-student-losses',
      'naic-renters-college-2024',
      'naic-renters-college-students',
      'iii-am-i-covered',
      'iii-renters-insurance',
    ],
  },
];
