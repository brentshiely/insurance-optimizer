# Coverage Check

A tap-and-go wizard that shows where a household may be overspending, underprotected, or paying twice across auto, home, renters, life, and disability insurance. No PII is collected and nothing leaves the browser.

- `public/index.html` is the app shell; `public/js/app.js` and `public/css/app.css` hold the wizard (vanilla, no build step) once Story 1 lands. `public/` is what gets deployed.
- `coverage-check-wizard-handoff.md` is the existing product spec and principles. Read it before changing findings copy or logic.
- **In progress:** the Insurance Overlap & Trim work, which adds an insurer action list (Raise / Drop / Question) driven by a tested decision-tree engine. Spec: [docs/SPEC.md](docs/SPEC.md). Design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Stories and progress: [docs/STORIES.md](docs/STORIES.md), [docs/PROGRESS.md](docs/PROGRESS.md). Decisions: [docs/DECISIONS.md](docs/DECISIONS.md). Owner to-dos: [docs/OPEN-ITEMS.md](docs/OPEN-ITEMS.md).

## Run locally

```bash
npm run preview     # serves public/ at http://127.0.0.1:8765/
npm test            # unit tests (macOS JavaScriptCore, or Node if present)
```

## Deploy

Hosted on Cloudflare Pages, project `coverage-check`. Deploys are manual and are never run by automated work.

```bash
npm install
npm run deploy
```
