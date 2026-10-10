// Builder for the Story S14 snapshot: what the liability stack drawing shows (view-model and HTML) for the eight
// named households that S6 already snapshots as stack models (builders/umbrellaCoreFlags.mjs, buildStackScenarios).
// A change to the wording, the icons, the bars or the markup shows up as a reviewable diff. Not a *.test.mjs file.
import { buildStackScenarios } from './umbrellaCoreFlags.mjs';
import { stackViewModel, stackViewHtml } from '../../../public/js/overlap-ui/stackView.mjs';

export function buildStackViews() {
  const scenarios = buildStackScenarios();
  const out = {};
  for (const name of Object.keys(scenarios)) {
    const view = stackViewModel(scenarios[name].stack);
    out[name] = { answers: scenarios[name].answers, view, html: view === null ? '' : stackViewHtml(view) };
  }
  return out;
}
