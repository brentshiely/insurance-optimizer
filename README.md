# Coverage Check

A two-minute checkup that finds gaps and double-payments in a household's insurance and ends with a short list of what to fix, where to save, and what to ask an agent. Answers come from memory: no documents, no PII, and nothing leaves the browser unless the person shares their list.

- `public/index.html` is the whole app: vanilla HTML/CSS/JS, no build step. This is the source of truth.
- `docs/screen-wording.md` is the approved copy for every screen and result.
- `docs/experience-proposal.md` explains the flow and the content rules.
- `coverage-check-wizard-handoff.md` holds the product principles. Read it before changing findings copy or logic.
- Add `?debug` to the URL to see seconds per screen and total time.

## Run locally

```bash
npm run preview
```

Then open http://127.0.0.1:8765/.

## Deploy

Hosted on Cloudflare Pages, project `coverage-check`.

```bash
npm install
npm run deploy
```
