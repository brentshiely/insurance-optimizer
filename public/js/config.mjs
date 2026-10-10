// Site settings the owner may change. Plain data only: no code runs from this file.
//
// ANALYTICS_CONFIG chooses the anonymous answer counter (Story S15, docs/ARCHITECTURE.md "Analytics").
//
//   provider   'none' (the default: nothing is loaded and nothing is sent), 'plausible', 'fathom' or 'zaraz'.
//   plausible  { domain }  the site name exactly as registered in Plausible, a bare host such as "example.com".
//   fathom     { siteId }  the site ID shown in Fathom's site settings.
//   zaraz      {}          nothing here: Zaraz is set up in the Cloudflare dashboard, and the page only calls it.
//
// The provider script address is NOT a setting. It is fixed per provider in js/overlap-ui/analytics.mjs, so a
// typo or an edited setting cannot point the page at some other script.
//
// Changing the provider is a three-step change, and a test fails until all three agree:
//   1. set `provider` and its settings below;
//   2. add that provider's hosts to the Content-Security-Policy in public/_headers (the per-provider table is in
//      docs/OPEN-ITEMS.md, item S15-1);
//   3. re-record the browser goldens, because the privacy line on the page changes with the provider
//      (tests/browser/README.md, "Re-recording").
export const ANALYTICS_CONFIG = {
  provider: 'none',
  plausible: { domain: '' },
  fathom: { siteId: '' },
  zaraz: {},
};

export default ANALYTICS_CONFIG;
