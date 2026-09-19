# Coverage Check

A tap-and-go wizard that shows where a household may be overspending, underprotected, or paying twice across auto, home, renters, life, and disability insurance. No PII is collected and nothing leaves the browser.

- `public/index.html` is the whole app: vanilla HTML/CSS/JS, no build step. This is the source of truth.
- `coverage-check-wizard-handoff.md` is the product spec and principles. Read it before changing findings copy or logic.

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
