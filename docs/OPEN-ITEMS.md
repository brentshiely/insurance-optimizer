# Open items for the owner

- **Licensing check (from the spec):** if the tool ever monetizes via lead-gen or carrier recommendations, confirm whether Minnesota insurance producer licensing applies before charging anyone.
- **Existing commercial/secondary citations in `public/js/app.js` (`SRC` and `insightsList`)** not changed by this work: ValuePenguin (boat, motorcycle), Progressive (RV, e-bike), Policygenius (water backup, bikes), AgentSync/Matic-type aggregators per the existing handoff, Insurance Journal, Big "I" survey, Life Happens, LIMRA. The overlap spec says to avoid commercial sources as the authority for recommendations; consider replacing with NAIC / III / government sources.
- **Analytics provider:** choose Plausible, Fathom or Zaraz, create the account, and set it in config (default is none).
- **Deploy:** nothing here deploys. Run `npm run deploy` when ready.
- **Superseded scratch repo:** `brentshiely/insurance-overlap-explainer` (private) holds only an abandoned bootstrap commit; delete it when convenient.
- **Health branch timing:** the supplemental-health content is most useful during open enrollment (roughly October to early December).
