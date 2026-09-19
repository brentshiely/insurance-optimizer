# Coverage Check Wizard — Handoff for Claude Code

Sep 19, 2026 · Brent Shiely

> **Status as of Sep 19, 2026.** The only valid code is `public/index.html` in this repo, deployed to Cloudflare Pages at https://coverage-check.pages.dev (project `coverage-check`, `npm run deploy`). The earlier offline file this document originally described is retired and will not be recovered. Several items in "Architecture as it exists today" describe that retired version and are **not yet in the current code**; they are called out inline below and belong on the build list in "What to build, in order".

## What this is

A working prototype of a household insurance coverage-gap tool: a tap-and-go wizard that shows where someone is overspending, underprotected, or paying twice across auto, home, renters, boat/powersports, life, and disability insurance. It is explicitly **not** a quote engine or lead-gen tool — no PII is ever collected (no name, address, email), and every population-level claim shown to the user carries a visible source citation.

The prototype lives in a single self-contained file: `coverage-check-wizard.html` (vanilla HTML/CSS/JS, no build step, no framework, no external dependencies). It has been iterated on extensively in conversation and is functionally complete as a demo, but has real gaps before it should be treated as production-ready. This document is the spec for taking it there.

## Non-negotiable product principles

These came from direct, repeated, emphatic feedback during development. Do not relax any of them without asking first:

1. **No PII, ever.** No name, address, or email is collected at any point. State is the only location signal, picked explicitly by the user (tappable map or dropdown) — never inferred from IP or any other passive signal.
2. **Nothing leaves the browser.** All computation is client-side. No network calls carry user-entered data anywhere. Document/photo processing, when built for real, must happen in-browser (see "Document extraction" below) — a server-side vision-LLM fallback is allowed only as an explicit, separately-consented exception, never the default path.
3. **Every objective claim needs a citation.** Any statement about "households like yours," state requirements, industry norms, or typical figures must be backed by a real, checkable third-party source (state DOI, NAIC, a named study, a named industry publication) with a link, not an invented statistic. The prototype currently sources: NAIC (hurricane deductibles), USGS via III.org (earthquake risk states), the Missouri Dept. of Commerce and Insurance (New Madrid zone), Experian and a WA Insurance Commissioner order via Consumer Reports (credit-scoring rules), The Standard's 2026 state disability/PFML reference guide, AgentSync (state insurer-of-last-resort list), SkiSafe (boat insurance state mandates and ACV vs. agreed value), Matic (homeowners' boat coverage sublimits), and the California Earthquake Authority and California FAIR Plan directly. **Before shipping to real users, re-verify the highest-dollar-impact claims (CEA deductible math, boat liability minimums) against primary regulator sources directly** — several of the above are reputable secondary sources, not primary filings.
4. **Population facts are not personal accusations.** A generic "people like you often..." statement is FUD if it isn't actually computed from the user's own answers. The tag system enforces this: `over` / `under` / `twice` / `ok` are reserved for findings genuinely derived from what the user entered; `info` is for true-but-neutral state/population facts that aren't claims about this specific user.
5. **Plain language throughout.** No insurance jargon, no internal/UI language leaking into copy ("home equity," "next screen," "generic patterns" have all been explicitly rejected in review). Every question should read like a friend asking, not a form.
6. **Every screen should explain why it's being asked**, tied to something the user already told the tool. See `policyReason()` in the code.
7. **Personalization must be real, not just gating.** An answer shouldn't just determine which screens appear — it should change the actual content and numbers shown downstream. This has been the single most-corrected mistake during development: state-driven findings that only stated a generic fact were repeatedly pushed to instead compute real dollar figures against the user's own entered coverage numbers (see the California earthquake/CEA finding and the wind-deductible finding for the current standard to match).

## Architecture as it exists today

- `S` — global state object: `{state, a, extras, i, q, p, scanned, queue, incomeQueue, taps, times, t0, start}`. `a` holds top-level answers (home ownership, dependents, vehicle count). `extras` holds toy/powersports chip selections. `q` holds shared qualifier answers. `p` holds per-policy field values, keyed by policy id.
- `BASE` — the fixed screen sequence before/around the dynamic policy queue: `["home","tenure","dep","veh","toys","qualify","insight"]`.
- `buildQueue()` — recomputed on every call to `order()` (never cached/stale) — builds `S.queue` (auto/home/renters/powersports based on `S.a` and `S.extras`) and `S.incomeQueue` (life+disability, or a lighter `lifecheck`, based on `S.a.dep`).
- `order()` — `BASE` + property/liability policy screens + `umbrella` + income-protection policy screens + `summary`. Always calls `buildQueue()` first.
- `POLICY` object — one entry per policy type (`auto`, `home`, `renters`, `life`, `disability`, `lifecheck`; **`powersports` is not yet built**), each with `{name, premiumDefault, fields:[{key,label,type,opts?,def}], findings:function(v,q){...}}`. `findings()` returns an array of `{t, msg, src?, url?}` (**per-policy findings currently carry no `src`/`url`; only the insight screen does**) — `t` is one of `over`/`under`/`twice`/`ok`/`info`, and state-driven findings read `S.state` directly as a closure rather than being passed it explicitly.
- `QUAL` — shared qualifying questions (savings cushion, health insurance, $300K asset threshold phrased differently for owners vs. renters, existing roadside-assistance membership) asked once and reused across multiple policy findings.
- State-driven data tables, each paired with a source constant. **Current code has only `NOFAULT`; the rest are to be built:** `NOFAULT` (no-fault auto states), `WINDSTATES` (hurricane/wind deductible states, NAIC), `EQ_STATES` / `NEWMADRID_STATES` (earthquake risk, with California and the New Madrid zone getting real dollar-figure math against the user's own dwelling coverage, other high-risk states getting a general note), `LASTRESORT_STATES` (FAIR Plan / Citizens / Windstorm states), `SDI_STATES` (state-run paid disability programs), `CREDITBAN_STATES` / `CREDITBAN_TEMP_STATES` / `CREDITRESTRICT_STATES` (credit-scoring rules for auto, home, and renters), `UM_MANDATORY_STATES` (uninsured motorist), `BOAT_MANDATE_STATES` (Arkansas/Utah boat liability minimums).
- Sticky footer CTA via `position:sticky` on `.foot`, corner-clipping moved to `.bar` since `.card` can no longer use `overflow:hidden`.
- A tappable US state map (`GRID`, `usMap()`) using the `gridmap-layout-usa` tile-grid layout (not a literal geographic SVG) so small states stay tap-friendly on mobile, plus a dropdown fallback (**currently two-letter codes; the full-name version `STATES_BY_NAME` / `STATE_NAMES` is not yet built**).

## What's real vs. what's simulated right now

**Real:** the entire question flow, conditional screen queueing, per-policy field entry, all findings logic including the state-personalization work, the sticky CTA, the state picker (map + dropdown), theming (light/dark via `prefers-color-scheme`).

**Fake / placeholder — needs real work before shipping:**

### Document / photo extraction (highest priority — explicitly flagged as needed next)
The upload and "take a photo" buttons on each policy screen currently only capture a filename and display it; the underlying field values remain sample/editable data. The UI is honest about this (`"This prototype does not read it yet"`), but that honesty is also a dead end for a real user who tries to use the feature.

Build order, as discussed and agreed:
1. **PDF.js text-layer extraction** first, for text-based (non-scanned) declarations-page PDFs — highest accuracy, purely client-side, no OCR needed. Reference it from a CDN or vendor it locally; either way it must run in-browser only.
2. **Tesseract.js (WASM OCR)** as a fallback for scanned/photographed documents where there's no text layer — lower confidence, flag extracted values as "unconfirmed, please check" rather than silently trusting them.
3. **Server-side vision-LLM extraction is explicitly out of the default path.** Only build this as an opt-in, clearly-labeled exception if the client-side tiers above prove insufficient, and never make it silent — the user must be told their document is leaving the browser before it happens.

Whatever gets extracted should pre-fill the relevant policy's fields (dwelling coverage, deductible, liability limits, premium, etc.) rather than requiring the user to re-type from their own document.

### Everything else worth doing before a real launch
- **Coverage types still missing:** flood insurance (NFIP) — arguably the single biggest blind spot, since it's excluded from every homeowners/renters policy everywhere and most people wrongly assume they're covered; scheduled personal property/valuables (jewelry, watches, instruments — standard policies cap theft around $1,000–$2,500, a well-documented and easily-sourced gap); landlord/rental-dwelling policies (distinct product from a standard homeowners policy, for someone who owns a second property they rent out — not currently distinguishable from "I own my home").
- **No persistence.** Closing the tab loses everything. This is the correct privacy tradeoff (nothing should be silently saved), but it also means no cross-device continuation and no way to share a result with a spouse/partner. If persistence is added, it must stay opt-in and local (e.g., an explicit "save my answers on this device" action using browser storage), never a server-side account.
- **No legal/advice disclaimer anywhere in the UI.** Before real users see this, it needs plain-language framing that this is informational, not insurance advice, and the tool is not a licensed agent or broker.
- **Citation verification pass.** Several sources are reputable secondary aggregators rather than primary regulatory filings — re-verify before treating dollar figures as authoritative, especially the CEA earthquake deductible math and the boat insurance state minimums.
- **Roadside assistance finding** doesn't yet distinguish free credit-card roadside benefits (e.g., a card that includes it standard) from pay-per-use ones (most cards) — flagged during development, never fixed.
- **Single-file architecture** should probably be split into a proper multi-file project once PDF.js/Tesseract.js get added, for maintainability.
- **Mobile testing** — the map and sticky footer were designed with mobile tap-targets in mind, but this has not been tested on real devices, only reasoned about.

## What to build, in order

Proposed sequence for the online version, to be confirmed with Brent before each step:

1. **State-driven findings and the unbuilt pieces of the "Architecture" section**: the state data tables (wind deductible, earthquake/CEA and New Madrid with real dollar math, FAIR Plan / last resort, SDI states, credit-scoring rules, UM-mandatory, boat mandates), the `powersports` policy, the full-name state dropdown, and `src`/`url` citations on per-policy findings. This is the personalization backbone the rest sits on.
2. **Plain-language disclaimer** (informational, not advice, not a licensed agent). Small, and must exist before real users.
3. **Document extraction**, PDF.js first, Tesseract.js fallback, all in-browser (see below).
4. **Missing coverage types**: flood (NFIP), scheduled valuables, landlord/rental-dwelling.
5. Opt-in local persistence, roadside credit-card nuance, multi-file split, real-device mobile pass.

## Entry-screen copy + iconography (done Sep 19, 2026)

Both items below shipped in commit `d5c7221`. Kept here for the reasoning.



The entry screen's headline is being reworked and was mid-edit at hand-off time. Two concrete pieces to finish:

1. **Copy must be accurate.** A draft headline — "Your insurance has never been looked at as a whole. We built the thing that does." with subline "No forms. No agent. No name required." — was flagged as false: the tool absolutely has forms (the per-policy field-entry screens). The honest claim is about identity, not form-filling: no name, no email, no address, no sales call. Replace the subline with something like "No name, no email, no sales call — just your own numbers, put together for once." (or equivalent), and don't reintroduce "no forms" language anywhere else in the copy pass.
2. **Iconography for the "cacophony" of insurance types.** The idea, from Brent directly: use simple icons to visually communicate the scattered, never-looked-at-together nature of a household's separate policies (auto, home, renters, boat, life, umbrella), probably as a loosely scattered/rotated cluster near the entry headline, not a tidy aligned row. A starting scaffold already exists in `coverage-check-wizard.html`: a `var ICONS={...}` object with simple inline-SVG line-icon paths (car, home, key/renters, boat, heart/life, umbrella) and a `function cacophony(){...}` that renders them as a scattered cluster with slight per-icon rotation. This scaffold is not yet wired into the `id==="home"` render branch — it needs to be called and inserted into that screen's markup (near the headline, above or around the state picker), and the icon set/rotation values are a first pass, not final — feel free to refine for visual balance. Keep icons theme-aware (`currentColor`/`var(--muted)` or similar so they adapt to light/dark) and keep them simple line icons consistent with the rest of the UI's restrained visual style, not literal/detailed illustrations.

## Deployment target

Cloudflare Pages, project `coverage-check`, on Brent's account. Live at https://coverage-check.pages.dev. Deploy with `npm run deploy` from the repo root. No custom domain yet (the `profit-capture.com` zone is on the same account if one is wanted).

## Source of truth

The current working file is the one to build from: `public/index.html` in this repo. Read it in full before making changes — it is dense (~540 lines) and everything described above that isn't marked "not yet built" is in there and has been through multiple rounds of correction based on direct user feedback. Where this document and the code disagree, trust the code as of hand-off time, since this document is a snapshot.
