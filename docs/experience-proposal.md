# Coverage Check: experience proposal

Nov 7, 2026. Status: proposal, not yet agreed. Nothing here is built.

## The job

A visitor wants one thing: **"Tell me what's wrong with my insurance and what to do about it."** They arrive on a phone, from a link, curious but impatient, with no documents in hand. Success is leaving with a short list they can act on. Everything else is in service of that.

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
3. **It asks for things people don't know.** Uninsured motorist limits, medical payments limits, sewer backup endorsements, percent of income replaced, earthquake deductible percentage. Without a declarations page in hand, people guess or skip, and both produce bad findings.
4. **The reading comes before the reward.** The "first look" screen is 348 words and seven findings, before the user has told us anything about their policies.
5. **Internal language leaks.** "Prototype telemetry: this is the drop-off instrument," "Editable sample data," "Policy 1 of 4," "11 taps, 50 seconds." Tags like "Overspending" read as accusations.
6. **No disclaimer, no next step, no way to keep the result.**

## The proposed experience

Two tiers. **Tier 1** gives a useful answer in about two minutes using only things people know off the top of their head. **Tier 2** is optional: check one policy at a time with real numbers to turn "check this" into an exact dollar figure.

### Tier 1: the checkup (about 2 minutes, no documents)

1. **Start.** "Find the gaps and double-payments in your insurance." Three short lines on how it works. One button. Disclaimer in small print.
2. **About you**, one tap per screen, auto-advancing: state, own or rent, does anyone rely on your income, how many vehicles, anything else with a motor.
3. **What do you already have?** One checklist screen, tap all that apply: auto, home, renters, umbrella, life through work, life on your own, disability through work, boat or powersports policy, AAA or similar, health insurance. People know this without looking anything up, and it drives most of the high-value findings.
4. **Two money questions**, each with a one-line reason: could you cover a $2,500 surprise today, and would your savings plus home come to more than $300,000.
5. **Your checkup.** One prioritized list on one screen:
   - **Fix first** (gaps), **Could save money**, **Paying twice**, and a collapsed **Good to know**.
   - Five items or fewer shown up front.
   - Every item has the same four parts: a plain headline, why it applies ("You said..."), what to do, and the source.
   - Actions: **Copy my list for my agent** (plain text, nothing sent anywhere) and **Get exact numbers** for any policy.

That's 9 screens and about 12 taps to a result a person can act on.

### Tier 2: exact numbers (optional, one policy at a time)

- Fields start **empty**. Every field has "I don't know" and a "where to find this on your declarations page" hint.
- Findings are computed **only** from values the user entered. Nothing pre-filled is ever treated as theirs.
- When a check completes, the matching checkup item upgrades from "check this" to a confirmed finding with a dollar amount, for example "your storm deductible is $9,000."
- This is where document reading (PDF.js, then OCR) eventually plugs in, as "fill this from my declarations page."

## Content rules

1. Never show a number as the user's unless they entered it.
2. Headlines say what's wrong in plain words, under 10 words. Not category labels.
3. Every finding: what, why it applies to you, what to do, source.
4. Tags: **Gap**, **Could save**, **Paying twice**, **Good to know**. Drop "Overspending" and "Underprotected."
5. Sentences under 25 words. Aim for an 8th-grade reading level. No insurance terms without a plain explanation in the same sentence.
6. Every question gets a one-line "why we ask" tied to an earlier answer.
7. No internal or prototype language in the public UI.
8. Show five findings or fewer up front. Everything else is one tap away.

## What happens to existing work

- **State-driven findings** (wind, earthquake, last-resort plans, uninsured motorist, no-fault, state disability, boat mandates) all carry over. Most move into Tier 2 because they need real numbers. The ones that don't, such as "your state requires boat liability and you said you have no boat policy," can fire in Tier 1.
- **The "first look" screen** goes away. Its content folds into the checkup.
- **The sidebar** ("What we know" and telemetry) is removed from the public version. Telemetry can stay behind a `?debug` flag.
- **Credit-scoring research** is done but parked. We can't personalize it without knowing someone's credit, so it would only add noise.

## Open decisions

1. Approve the two-tier structure?
2. Keep one question per screen for the "about you" step, or put all five on one screen?
3. Should the checkup offer a printable version, or is "copy my list" enough?
