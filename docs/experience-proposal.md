# Coverage Check: experience proposal

Nov 7, 2026. Status: proposal, not yet agreed. Nothing here is built.

## The job

A visitor wants one thing: **"Tell me what's wrong with my insurance and what to do about it."** They arrive on a phone, from a link, curious but impatient, with no documents in hand. Success is leaving with a short list they can act on. Everything else is in service of that.

## Ground rule: no documents

Decided Nov 7, 2026. This prototype never takes a document of any kind: no upload, no photo, no "fill this from my declarations page." Every input is something the user volunteers from memory. That changes the design in three ways:

1. **Ask only what people can answer from memory.** Which policies they have, roughly what they pay, their deductible, yes/no on common add-ons. Never coverage limits written as 50/100/50, endorsement names, or percentages they'd have to look up.
2. **Use tap answers, not typing.** Ranges ("$1,000," "$2,500," "$5,000+") are easier to answer and recall than exact figures. Dollar math runs on the answer the user picked and says so ("based on the $400,000 you picked").
3. **"Not sure" is a full answer.** It never blocks progress and never gets guessed. It turns into a question in an **Ask your agent** group on the results, so not knowing still produces something useful.

## What the current flow gets wrong

Measured on a phone, for a Minnesota homeowner with kids, two cars, and a boat:

| | Today |
|---|---|
| Screens to the end | 14 |
| Words to read | about 1,450 |
| Answers or fields to fill | 34 |
| Phone-screens of scrolling | about 30 |
| What you leave with | three counts, no list |

1. **The ending has no payoff.** The summary says "1 / 2 / 6" and nothing else. The actual findings are scattered across seven earlier screens. Nobody can act on a count.
2. **Sample numbers are presented as the user's.** Every policy screen is pre-filled ($450,000 dwelling, 50/100/50 limits). Tap Continue without editing and you're told "Your 50/100/50 limits leave what you own exposed," and that fake gap is counted in your total. This breaks principles 4 and 7 and is the single biggest credibility risk for a public launch.
3. **It asks for things people don't know.** Uninsured motorist limits, medical payments limits, sewer backup endorsements, percent of income replaced, earthquake deductible percentage. People guess or skip, and both produce bad findings. The upload and photo buttons also go away under the no-documents rule.
4. **The reading comes before the reward.** The "first look" screen is 348 words and seven findings, before the user has told us anything about their policies.
5. **Internal language leaks.** "Prototype telemetry: this is the drop-off instrument," "Editable sample data," "Policy 1 of 4," "11 taps, 50 seconds." Tags like "Overspending" read as accusations.
6. **No disclaimer, no next step, no way to keep the result.**

## The experience (agreed Nov 7, 2026)

One flow, no optional extras. The recommendations come from the user's answers about each policy they have, so every policy they checked gets its own short screen.

1. **Start.** "Find the gaps and double-payments in your insurance." Three short lines on how it works. One button. Disclaimer in small print.
2. **About your household**, one question per screen, auto-advancing on tap: state, own or rent, does anyone rely on your income, how many vehicles, anything else with a motor.
3. **Which of these do you have?** One checklist, tap all that apply: auto, home, renters, umbrella, life through work, life on your own, disability through work, boat or powersports policy, AAA or similar, health insurance.
4. **One short screen per policy checked.** Two to four tap questions, answerable from memory:
   - Nothing is pre-selected. Every question offers **Not sure**.
   - Findings are computed **only** from answers the user picked.
   - Dollar math uses the user's own pick and says so, for example "a 2% storm deductible on the $400,000 you picked is about $8,000."
   - Shared money questions (could you cover a $2,500 surprise, savings plus home over $300,000) are asked once, on the first policy screen that needs them.
5. **Your results.** One prioritized list on one screen:
   - **Fix first** (gaps), **Could save money**, **Paying twice**, **Ask your agent** (from "Not sure" answers), and a collapsed **Good to know**.
   - Five items or fewer shown up front.
   - Every item has the same four parts: a plain headline, why it applies ("You said..."), what to do, and the source.
   - Action: **Copy my list for my agent** (plain text, nothing sent anywhere).

Length depends on what the user has: someone with auto and renters sees two policy screens, someone with five policies sees five. The savings come from asking less on each screen, not from skipping screens.

No uploads, photos, or document reading, now or as a later add-on to this prototype.

## Content rules

1. Never show a number as the user's unless they picked it.
2. Never ask for something people would have to look up. If an answer can't come from memory, drop the question or offer it as an "Ask your agent" item.
3. Headlines say what's wrong in plain words, under 10 words. Not category labels.
4. Every finding: what, why it applies to you, what to do, source.
5. Tags: **Gap**, **Could save**, **Paying twice**, **Ask your agent**, **Good to know**. Drop "Overspending" and "Underprotected."
6. Sentences under 25 words. Aim for an 8th-grade reading level. No insurance terms without a plain explanation in the same sentence.
7. Every question gets a one-line "why we ask" tied to an earlier answer.
8. No internal or prototype language in the public UI.
9. Show five findings or fewer up front. Everything else is one tap away.

## What happens to existing work

- **State-driven findings** (wind, earthquake, last-resort plans, uninsured motorist, no-fault, state disability, boat mandates) all carry over. They attach to the matching policy screen. Questions get rewritten as tap ranges people can answer from memory, for example storm deductible as "$1,000 / 1% / 2% / 5% / Not sure." Some need no number at all, such as "your state requires boat liability and you said you have no boat policy."
- **The "first look" screen** goes away. Its content folds into the checkup.
- **The sidebar** ("What we know" and telemetry) is removed from the public version. Telemetry can stay behind a `?debug` flag.
- **Credit-scoring research** is done but parked. We can't personalize it without knowing someone's credit, so it would only add noise.

## Open decisions

1. ~~Structure~~: agreed Nov 7, 2026. One flow with one short screen per policy (see above).
2. ~~Household layout~~: agreed Nov 7, 2026. One question per screen, auto-advancing, no Continue button.
3. Should the checkup offer a printable version, or is "copy my list" enough?
