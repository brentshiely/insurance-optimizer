# Coverage Check

A tap-and-go wizard that shows where a household may be overspending, underprotected, or paying twice across auto, home, renters, life, and disability insurance. No PII is collected and nothing leaves the browser.

- The app is three files under `public/`, which is what gets deployed (vanilla JS and CSS, no build step):
  - `public/index.html`: the page shell (markup and metadata only).
  - `public/js/app.js`: the wizard logic, loaded as an ES module (`<script type="module">`).
  - `public/css/app.css`: all styles.

  The paths in `index.html` are relative (`css/app.css`, `js/app.js`), so the site works with `public/` as the web root, which is how Cloudflare Pages and `npm run preview` serve it.
- `coverage-check-wizard-handoff.md` is the existing product spec and principles. Read it before changing findings copy or logic.
- **In progress:** the Insurance Overlap & Trim work, which adds an insurer action list (Raise / Drop / Question) driven by a tested decision-tree engine. Spec: [docs/SPEC.md](docs/SPEC.md). Design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Stories and progress: [docs/STORIES.md](docs/STORIES.md), [docs/PROGRESS.md](docs/PROGRESS.md). Decisions: [docs/DECISIONS.md](docs/DECISIONS.md). Owner to-dos: [docs/OPEN-ITEMS.md](docs/OPEN-ITEMS.md).

## Run locally

```bash
npm run preview     # serves public/ at http://127.0.0.1:8765/
npm test            # unit tests (macOS JavaScriptCore, or Node if present)
```

The page must be served over http(s). Opening `public/index.html` straight from disk (a `file://` address) does not work, because most browsers block module scripts from file:// addresses and the wizard would stay blank. Use `npm run preview` or any static file server.

To check that the wizard still shows exactly what it showed before a change, replay the browser golden test; see [tests/browser/README.md](tests/browser/README.md).

## Deploy

Hosted on Cloudflare Pages, project `coverage-check`. Deploys are manual and are never run by automated work.

```bash
npm install
npm run deploy
```
