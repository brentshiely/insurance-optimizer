// Story S14: tests for the liability stack drawing (public/js/overlap-ui/stackView.mjs) and for how the screens use it.
//
// The drawing is driven only by the engine's LiabilityStack model, so most cases build real models with the S6
// helpers (the same inputs the S6 snapshots use: the 1,200-combination matrix and the eight named households) and a few
// build a model by hand for shapes the real catalog cannot produce (a split limit that is lower on one number and higher
// on the other, an unreadable amount, a zero limit). Pure strings in, pure strings out, so it all runs under jsc. How the
// drawing looks (colour, spacing, the screen reader experience) is checked in the Browser pane.
import { suite, assert, assertSnapshot, serialize } from '../harness.mjs';
import {
  stackViewModel, stackViewHtml, STATUS_SENTENCES, STACK_HEADING, EMPTY_NOTE, STACK_VIEW_VERSION,
} from '../../public/js/overlap-ui/stackView.mjs';
import {
  liabilityStackModel, stackForScreen, STACK_SECTION_IDS, overlapSections, applyAnswer, actionListViewModel,
} from '../../public/js/overlap-ui/viewModel.mjs';
import { overlapScreenHtml, actionListHtml, stackBodyHtml, stackLiveText } from '../../public/js/overlap-ui/screens.mjs';
import { patchOverlapScreen } from '../../public/js/overlap-ui/dom.mjs';
import { createContext } from '../../public/js/overlap/engine/evaluate.mjs';
import { deriveAnswers } from '../../public/js/overlap/engine/adapter.mjs';
import { SECTIONS } from '../../public/js/overlap/data/questions/index.mjs';
import { stackFor, eachCoreCombination, AUTO_LIMITS, AUTO_REQUIREMENTS } from '../snapshots/builders/stackMatrix.mjs';
import { buildStackViews } from '../snapshots/builders/stackView.mjs';
import STACK_VIEWS from '../snapshots/stack-view.snap.mjs';
import STACK_SCENARIOS from '../snapshots/stack-scenarios.snap.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';
import { findForbidden, codeOnly, importsOf } from '../helpers/sourceScan.mjs';

const MODULE_PATH = 'public/js/overlap-ui/stackView.mjs';
const BASE = { policies: ['auto', 'home', 'umbrella'] };
const viewFor = (answers) => stackViewModel(stackFor(answers));
const row = (vm, id) => vm.rows.find((r) => r.id === id);
const count = (html, needle) => html.split(needle).length - 1;
const attrIds = (html) => Array.from(html.matchAll(/\sid="([^"]+)"/g)).map((m) => m[1]);
const textOf = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const BACK = '<button class="link" data-act="back">Back</button>';

const STATES = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington state|west virginia|wisconsin|wyoming)\b/i;
const BANNED = /home equity|next screen|generic pattern|todo|tbd|lorem|\{\{|\}\}|—|–/i;

// A model written by hand, in the documented shape (docs/ARCHITECTURE.md "LiabilityStack"). Only the fields the drawing
// reads are filled in with care; the rest are present so the shape is whole.
const umbrellaOf = (limit, label, answer = 'known') => ({ id: 'umbrella', label: 'Umbrella', limit, limitLabel: label, limitAnswer: answer });
function layerOf(id, over = {}) {
  return {
    id, label: `${id} liability`, policyText: `${id} policy`, limitShape: 'single',
    limit: 300000, limitLabel: '$300,000', limitText: '$300,000', limitIsCeiling: false, limitAnswer: 'known',
    required: 300000, requiredLabel: '$300,000', requiredText: '$300,000', requiredAnswer: 'known',
    status: 'ok', statusLabel: "Meets your umbrella's requirement", shortBy: null, summary: `Your ${id} limit matches.`,
    ...over,
  };
}
const modelOf = (layers, umbrella = umbrellaOf(1000000, '$1 million')) => ({
  version: 1, umbrella, layers, counts: { ok: 0, below_required: 0, above_required: 0, unknown: 0 }, findings: [],
  attachmentNote: 'An umbrella pays only after the limit underneath is used up.', sourceIds: [],
});
const splitLayer = (id, limit, required, status, over = {}) => layerOf(id, {
  limitShape: 'split', limit: { perPerson: limit[0], perAccident: limit[1] }, required: { perPerson: required[0], perAccident: required[1] },
  limitLabel: `${limit[0] / 1000}/${limit[1] / 1000}`, requiredLabel: `${required[0] / 1000}/${required[1] / 1000}`, status, ...over,
});

// ---------------------------------------------------------------------------------------------------------
suite('stackView: a pure module with plain wording', (t) => {
  const canRead = typeof read === 'function';

  t('no DOM, Node, storage, timer, network or nondeterministic globals in the code', () => {
    if (!canRead) return;
    const found = findForbidden(codeOnly(read(MODULE_PATH), false));
    assert.equal(found, null, found ? `forbidden "${found}" in ${MODULE_PATH}` : '');
  });

  t('imports nothing at all: it is driven by the model it is given and by nothing else', () => {
    if (!canRead) return;
    assert.deepEqual(importsOf(read(MODULE_PATH)), []);
  });

  t('writes no style attribute (a strict content security policy blocks them), so bar widths are SVG attributes', () => {
    if (!canRead) return;
    assert.equal(/style\s*=/.test(read(MODULE_PATH)), false);
  });

  t('the closed wording is ASCII, state-neutral, has no dashes or placeholders, and uses the documented sentences', () => {
    const texts = [STACK_HEADING, EMPTY_NOTE, ...Object.values(STATUS_SENTENCES)];
    for (const text of texts) {
      assert.equal(/^[\x20-\x7E]+$/.test(text), true, `ASCII only: ${text}`);
      assert.equal(STATES.test(text), false, `names a state: ${text}`);
      assert.equal(BANNED.test(text), false, `banned wording: ${text}`);
    }
    assert.deepEqual(Object.keys(STATUS_SENTENCES), ['ok', 'below_required', 'above_required', 'unknown']);
    assert.equal(STATUS_SENTENCES.ok, 'Meets what your umbrella asks for');
    assert.equal(STATUS_SENTENCES.below_required, 'Below what your umbrella asks for. Ask your insurer to raise it.');
    assert.equal(STATUS_SENTENCES.above_required, 'Higher than your umbrella requires');
    assert.equal(STATUS_SENTENCES.unknown, 'We need one more answer to check this');
  });

  t('every string a real stack produces (view-model and markup) is plain too', () => {
    const seen = [];
    const walk = (v) => {
      if (typeof v === 'string') seen.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.keys(v).forEach((k) => walk(v[k]));
    };
    let n = 0;
    eachCoreCombination((answers) => {
      n += 1;
      if (n % 7 !== 0) return; // a spread of the 1,200 combinations keeps the test quick
      const vm = viewFor(answers);
      walk(vm);
      seen.push(stackViewHtml(vm));
    });
    assert.equal(seen.length > 1000, true);
    for (const s of seen) {
      assert.equal(STATES.test(s), false, `names a state: ${s.slice(0, 80)}`);
      assert.equal(BANNED.test(s), false, `banned wording: ${s.slice(0, 80)}`);
      assert.equal(/undefined|NaN|\[object/.test(s), false, `stray text: ${s.slice(0, 80)}`);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('stackViewModel: no stack means nothing to draw', (t) => {
  t('no umbrella: the engine gives null and so do the view-model and the markup', () => {
    const stack = stackFor({ policies: ['auto', 'home'], auto_liability: '100_300', umbrella_min_auto: '250_500' });
    assert.equal(stack, null);
    assert.equal(stackViewModel(stack), null);
    assert.equal(stackViewHtml(stackViewModel(stack)), '');
    assert.equal(STACK_SCENARIOS['no-umbrella'].stack, null);
    assert.equal(STACK_VIEWS['no-umbrella'].view, null);
    assert.equal(STACK_VIEWS['no-umbrella'].html, '');
  });

  t('anything that is not a stack gives null instead of throwing', () => {
    for (const bad of [undefined, null, 0, 1, 'stack', true, [], [1], {}, { layers: [] }, { umbrella: null }, { umbrella: 'x' }, { umbrella: [] }]) {
      assert.equal(stackViewModel(bad), null, JSON.stringify(bad));
    }
  });

  t('markup of a missing or broken view-model is the empty string', () => {
    for (const bad of [undefined, null, 0, 'x', [], {}, { rows: [] }, { rows: 'x' }]) assert.equal(stackViewHtml(bad), '');
  });

  t('the screens draw nothing (and add no live region) when there is no stack', () => {
    assert.equal(stackBodyHtml(null), '');
    assert.equal(stackBodyHtml(undefined), '');
    assert.equal(stackLiveText(null), '');
    const vm = actionListViewModel({ a: { home: 'Own', veh: '1' }, extras: [], q: {}, p: {}, o: {} });
    assert.equal(actionListHtml(vm, false, null), actionListHtml(vm));
    assert.equal(actionListHtml(vm, false, null).includes('stk'), false);
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('stackViewModel: rows, order and shape', (t) => {
  const FULL = { policies: ['boat', 'umbrella', 'motorcycle', 'home', 'auto'], umbrella_limit: '1m',
    auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '500k',
    motorcycle_liability: '500_500', umbrella_min_motorcycle: '250_500', boat_liability: 'not_sure', umbrella_min_boat: '100_300' };

  t('umbrella on top, then the underlying layers in the model order (auto, home, motorcycle, boat)', () => {
    const vm = viewFor(FULL);
    assert.deepEqual(vm.rows.map((r) => r.id), ['umbrella', 'auto', 'home', 'motorcycle', 'boat']);
    assert.deepEqual(vm.rows.map((r) => r.kind), ['umbrella', 'layer', 'layer', 'layer', 'layer']);
    assert.deepEqual(viewFor({ policies: ['umbrella', 'boat', 'home'], umbrella_limit: '2m' }).rows.map((r) => r.id), ['umbrella', 'home', 'boat']);
    assert.deepEqual(viewFor({ policies: ['umbrella', 'motorcycle'], umbrella_limit: '2m' }).rows.map((r) => r.id), ['umbrella', 'motorcycle']);
  });

  t('exact keys: view-model, rows and bars', () => {
    const vm = viewFor(FULL);
    assert.deepEqual(Object.keys(vm).sort(), ['ariaSummary', 'counts', 'emptyNote', 'heading', 'layerCount', 'note', 'rows', 'version']);
    assert.equal(vm.version, STACK_VIEW_VERSION);
    assert.equal(vm.heading, STACK_HEADING);
    for (const r of vm.rows) {
      assert.deepEqual(Object.keys(r).sort(), ['bar', 'detail', 'icon', 'id', 'kind', 'label', 'limitCaption', 'limitLabel', 'requiredCaption', 'requiredLabel', 'sentence', 'status', 'statusLabel']);
      assert.deepEqual(Object.keys(r.bar).sort(), ['basis', 'ceiling', 'kind', 'limitPct', 'requiredPct']);
      assert.equal(typeof r.sentence, 'string');
      assert.equal(r.sentence.length > 0, true);
    }
  });

  t('the note is the model\'s own attachment sentence, and the counts and layer count describe the rows', () => {
    const stack = stackFor(FULL);
    const vm = stackViewModel(stack);
    assert.equal(vm.note, stack.attachmentNote);
    assert.equal(vm.layerCount, 4);
    assert.deepEqual(vm.counts, stack.counts, 'the same counts the engine computed');
    assert.deepEqual(vm.counts, { ok: 1, below_required: 1, above_required: 1, unknown: 1 });
    assert.equal(vm.emptyNote, null);
  });

  t('an exact full view-model for one household (the contract the markup reads)', () => {
    const vm = viewFor({ ...BASE, umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '300k' });
    assert.deepEqual(row(vm, 'umbrella'), {
      id: 'umbrella', kind: 'umbrella', label: 'Umbrella', limitCaption: 'Umbrella limit', limitLabel: '$1 million',
      requiredCaption: null, requiredLabel: null, status: null, statusLabel: null,
      sentence: 'Sits on top of the policies below', detail: '', icon: 'umbrella',
      bar: { kind: 'cap', basis: 'amount', limitPct: 100, requiredPct: null, ceiling: false },
    });
    assert.deepEqual(row(vm, 'auto'), {
      id: 'auto', kind: 'layer', label: 'Auto liability', limitCaption: 'Your limit', limitLabel: '100/300',
      requiredCaption: 'Your umbrella asks for', requiredLabel: '250/500', status: 'below_required', statusLabel: "Below your umbrella's requirement",
      sentence: 'Below what your umbrella asks for. Ask your insurer to raise it.', detail: '', icon: 'down',
      bar: { kind: 'compare', basis: 'perPerson', limitPct: 18.2, requiredPct: 45.5, ceiling: false },
    });
    assert.deepEqual(row(vm, 'home'), {
      id: 'home', kind: 'layer', label: 'Home liability', limitCaption: 'Your limit', limitLabel: '$500,000',
      requiredCaption: 'Your umbrella asks for', requiredLabel: '$300,000', status: 'above_required', statusLabel: "Above your umbrella's requirement",
      sentence: 'Higher than your umbrella requires', detail: '', icon: 'up',
      bar: { kind: 'compare', basis: 'amount', limitPct: 90.9, requiredPct: 54.5, ceiling: false },
    });
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('stackViewModel: ok, below, above and unknown each get a sentence, a shape and a bar', (t) => {
  const auto = (limit, required, extra = {}) => row(viewFor({ policies: ['auto', 'umbrella'], umbrella_limit: '1m', auto_liability: limit, umbrella_min_auto: required, ...extra }), 'auto');
  const home = (limit, required) => row(viewFor({ policies: ['home', 'umbrella'], umbrella_limit: '1m', home_liability: limit, umbrella_min_home: required }), 'home');

  t('ok: the limit equals what the umbrella asks for', () => {
    for (const r of [auto('250_500', '250_500'), home('500k', '500k')]) {
      assert.equal(r.status, 'ok');
      assert.equal(r.sentence, 'Meets what your umbrella asks for');
      assert.equal(r.icon, 'check');
      assert.equal(r.statusLabel, "Meets your umbrella's requirement");
      assert.equal(r.bar.limitPct, r.bar.requiredPct, 'the fill reaches the marker');
    }
  });

  t('below: the limit is lower than what the umbrella asks for', () => {
    for (const r of [auto('100_300', '250_500'), auto('lower', '100_300'), home('300k', '500k'), home('lower', '300k')]) {
      assert.equal(r.status, 'below_required');
      assert.equal(r.sentence, 'Below what your umbrella asks for. Ask your insurer to raise it.');
      assert.equal(r.icon, 'down');
      assert.equal(r.bar.limitPct <= r.bar.requiredPct, true, 'the fill stops at or before the marker');
    }
  });

  t('above: the limit is higher than what the umbrella requires', () => {
    for (const r of [auto('500_500', '250_500'), home('1m', '500k')]) {
      assert.equal(r.status, 'above_required');
      assert.equal(r.sentence, 'Higher than your umbrella requires');
      assert.equal(r.icon, 'up');
      assert.equal(r.bar.limitPct > r.bar.requiredPct, true, 'the fill goes past the marker');
    }
  });

  t('unknown: Not sure, or not answered yet, on either side', () => {
    const cases = [auto('not_sure', '250_500'), auto('100_300', 'not_sure'), auto('not_sure', 'not_sure'), home('not_sure', '500k')];
    for (const r of cases) {
      assert.equal(r.status, 'unknown');
      assert.equal(r.sentence, 'We need one more answer to check this');
      assert.equal(r.icon, 'question');
      assert.equal(r.statusLabel, 'Not confirmed');
    }
    const unanswered = row(viewFor({ ...BASE }), 'auto');
    assert.equal(unanswered.status, 'unknown');
    assert.equal(unanswered.limitLabel, 'Not answered yet');
    assert.equal(unanswered.requiredLabel, 'Not answered yet');
    assert.deepEqual([unanswered.bar.limitPct, unanswered.bar.requiredPct], [null, null]);
  });

  t('the detail sentence (the model\'s own words) appears only when an answer was Not sure, never for a plain "not answered yet"', () => {
    const stack = stackFor({ policies: ['auto', 'umbrella'], umbrella_limit: '1m', auto_liability: 'not_sure', umbrella_min_auto: '250_500' });
    assert.equal(row(stackViewModel(stack), 'auto').detail, stack.layers[0].summary);
    assert.equal(row(stackViewModel(stack), 'auto').detail, 'You were not sure of your auto liability limit, so we cannot compare it with what your umbrella asks for.');
    assert.equal(auto('100_300', '250_500').detail, '', 'a verdict needs no detail');
    assert.equal(row(viewFor({ ...BASE }), 'auto').detail, '', 'unanswered: the "Not answered yet" lines say it');
    assert.equal(row(viewFor({ ...BASE, auto_liability: '100_300' }), 'auto').detail, '');
  });

  t('the four statuses use four different icons, so shape and words carry the status, never colour alone', () => {
    const icons = ['ok', 'below_required', 'above_required', 'unknown'].map((s) => ({ ok: 'check', below_required: 'down', above_required: 'up', unknown: 'question' }[s]));
    assert.equal(new Set(icons).size, 4);
    const seen = {};
    for (const r of [auto('250_500', '250_500'), auto('100_300', '250_500'), auto('500_500', '250_500'), auto('not_sure', '250_500')]) seen[r.status] = r.icon;
    assert.deepEqual(seen, { ok: 'check', below_required: 'down', above_required: 'up', unknown: 'question' });
  });

  t('a "Lower than" limit is drawn as a ceiling: an upper bound, not an exact limit', () => {
    const lowerAuto = auto('lower', '250_500');
    assert.equal(lowerAuto.bar.ceiling, true);
    assert.equal(lowerAuto.limitLabel, 'Lower than 100/300');
    assert.equal(auto('100_300', '250_500').bar.ceiling, false);
    assert.equal(home('lower', '300k').bar.ceiling, true);
    assert.equal(home('300k', '300k').bar.ceiling, false);
    assert.equal(auto('lower', 'not_sure').bar.ceiling, true, 'still a ceiling when the requirement is Not sure');
    assert.equal(auto('lower', 'not_sure').status, 'unknown');
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('stackViewModel: the umbrella row', (t) => {
  t('known size: a full-width cap with the size as its label', () => {
    for (const [id, label] of [['1m', '$1 million'], ['2m', '$2 million'], ['5m', '$5 million']]) {
      const r = row(viewFor({ ...BASE, umbrella_limit: id }), 'umbrella');
      assert.equal(r.limitLabel, label);
      assert.equal(r.sentence, 'Sits on top of the policies below');
      assert.deepEqual(r.bar, { kind: 'cap', basis: 'amount', limitPct: 100, requiredPct: null, ceiling: false });
      assert.equal(r.status, null);
      assert.equal(r.icon, 'umbrella');
    }
  });

  t('Not sure and not answered yet: no cap, and a sentence that says so', () => {
    const notSure = row(viewFor({ ...BASE, umbrella_limit: 'not_sure' }), 'umbrella');
    assert.equal(notSure.limitLabel, 'Not sure');
    assert.equal(notSure.sentence, 'You were not sure of your umbrella limit');
    assert.equal(notSure.bar.limitPct, null);
    const none = row(viewFor({ ...BASE }), 'umbrella');
    assert.equal(none.limitLabel, 'Not answered yet');
    assert.equal(none.sentence, 'We do not have your umbrella limit yet');
    assert.equal(none.bar.limitPct, null);
  });

  t('the umbrella\'s size never changes any layer row (the engine compares limits, not sizes)', () => {
    const layersFor = (u) => viewFor({ ...BASE, umbrella_limit: u, auto_liability: '250_500', umbrella_min_auto: '100_300', home_liability: 'lower', umbrella_min_home: '500k' }).rows.slice(1);
    assert.deepEqual(layersFor('2m'), layersFor('1m'));
    assert.deepEqual(layersFor('5m'), layersFor('1m'));
    assert.deepEqual(layersFor('not_sure'), layersFor('1m'));
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('stackViewModel: missing layers and an umbrella on its own', (t) => {
  t('an umbrella with nothing underneath is one row and says why there is nothing to compare', () => {
    const vm = viewFor({ policies: ['umbrella'], umbrella_limit: '2m' });
    assert.equal(vm.rows.length, 1);
    assert.equal(vm.layerCount, 0);
    assert.equal(vm.emptyNote, 'We found no auto, home, motorcycle or boat policy to show under your umbrella.');
    assert.deepEqual(vm.counts, { ok: 0, below_required: 0, above_required: 0, unknown: 0 });
    assert.equal(vm.ariaSummary, 'Your umbrella and what sits under it. Umbrella limit: $2 million. No policy underneath to compare.');
    const html = stackViewHtml(vm);
    assert.equal(html.includes('<p class="small stk-empty">' + EMPTY_NOTE + '</p>'), true);
    assert.equal(count(html, '<li '), 1);
  });

  t('with a layer there is no empty note', () => {
    assert.equal(viewFor({ ...BASE }).emptyNote, null);
    assert.equal(stackViewHtml(viewFor({ ...BASE })).includes('stk-empty'), false);
  });

  t('layers a household does not hold are simply absent (no row, no placeholder)', () => {
    const vm = viewFor({ policies: ['umbrella', 'home'], umbrella_limit: '1m', home_liability: '300k', umbrella_min_home: '300k' });
    assert.deepEqual(vm.rows.map((r) => r.id), ['umbrella', 'home']);
    assert.equal(stackViewHtml(vm).includes('data-stk="auto"'), false);
  });

  t('a model with no layers array (or junk in it) still draws the umbrella', () => {
    const noLayers = stackViewModel({ umbrella: umbrellaOf(1000000, '$1 million') });
    assert.equal(noLayers.rows.length, 1);
    const junk = stackViewModel(modelOf([null, 'x', 7, layerOf('home')]));
    assert.deepEqual(junk.rows.map((r) => r.id), ['umbrella', 'home']);
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('stackViewModel: bar lengths come from the numbers and agree with the verdict', (t) => {
  t('over all 1,200 core combinations and every motorcycle and boat limit: percentages are in range and the bar never contradicts its sentence', () => {
    const check = (stack, what) => {
      const vm = stackViewModel(stack);
      let largest = 0;
      for (const r of vm.rows.slice(1)) {
        const b = r.bar;
        for (const p of [b.limitPct, b.requiredPct]) {
          if (p === null) continue;
          assert.equal(p >= 0 && p <= 100, true, `${what} ${r.id}: ${p} out of range`);
          if (p > largest) largest = p;
        }
        const layer = stack.layers.find((l) => l.id === r.id);
        assert.equal(b.limitPct === null, layer.limitAnswer !== 'known', `${what} ${r.id}: limit bar only when the limit is known`);
        assert.equal(b.requiredPct === null, layer.requiredAnswer !== 'known', `${what} ${r.id}: marker only when the requirement is known`);
        assert.equal(b.ceiling, layer.limitIsCeiling && b.limitPct !== null, `${what} ${r.id}: ceiling flag`);
        if (b.limitPct !== null && b.requiredPct !== null) {
          if (r.status === 'ok') assert.equal(b.limitPct, b.requiredPct, `${what} ${r.id}: ok means fill reaches marker`);
          if (r.status === 'below_required') assert.equal(b.limitPct <= b.requiredPct, true, `${what} ${r.id}: below means fill stops at or before marker (${b.limitPct} vs ${b.requiredPct})`);
          if (r.status === 'above_required') assert.equal(b.limitPct > b.requiredPct, true, `${what} ${r.id}: above means fill passes marker (${b.limitPct} vs ${b.requiredPct})`);
          if (r.status === 'below_required' && !b.ceiling) assert.equal(b.limitPct < b.requiredPct, true, `${what} ${r.id}: an exact limit below the requirement is strictly shorter`);
        }
      }
      if (largest > 0) assert.equal(largest, 90.9, `${what}: the longest bar or marker uses the shared scale (1 / 1.1 of the track)`);
    };
    let n = 0;
    eachCoreCombination((answers, key) => { check(stackFor(answers), key); n += 1; });
    assert.equal(n, 1200);
    for (const l of AUTO_LIMITS) for (const r of AUTO_REQUIREMENTS) {
      check(stackFor({ policies: ['motorcycle', 'umbrella'], umbrella_limit: '1m', motorcycle_liability: l, umbrella_min_motorcycle: r }), `motorcycle ${l}|${r}`);
      check(stackFor({ policies: ['boat', 'umbrella'], umbrella_limit: '1m', boat_liability: l, umbrella_min_boat: r }), `boat ${l}|${r}`);
    }
  });

  t('a split limit that is lower on one number only is drawn on that number (250/500 against 500/500)', () => {
    const r = row(viewFor({ policies: ['auto', 'umbrella'], umbrella_limit: '1m', auto_liability: '250_500', umbrella_min_auto: '500_500' }), 'auto');
    assert.equal(r.status, 'below_required');
    assert.equal(r.bar.basis, 'perPerson', 'per accident is equal (500 and 500), so only per person can show the shortfall');
    assert.equal(r.bar.limitPct < r.bar.requiredPct, true);
    const above = row(viewFor({ policies: ['auto', 'umbrella'], umbrella_limit: '1m', auto_liability: '500_500', umbrella_min_auto: '250_500' }), 'auto');
    assert.equal(above.bar.basis, 'perPerson');
    assert.equal(above.bar.limitPct > above.bar.requiredPct, true);
  });

  t('a hand-made split limit that is lower on per accident but higher per person is drawn on per accident', () => {
    const vm = stackViewModel(modelOf([splitLayer('auto', [300000, 300000], [250000, 500000], 'below_required')]));
    const r = row(vm, 'auto');
    assert.equal(r.bar.basis, 'perAccident');
    assert.equal(r.bar.limitPct < r.bar.requiredPct, true);
    const higher = stackViewModel(modelOf([splitLayer('auto', [250000, 700000], [250000, 500000], 'above_required')]));
    assert.equal(row(higher, 'auto').bar.basis, 'perAccident');
    assert.equal(row(higher, 'auto').bar.limitPct > row(higher, 'auto').bar.requiredPct, true);
  });

  t('one scale for every layer: the same amount is the same length wherever it appears', () => {
    const vm = stackViewModel(modelOf([
      layerOf('home', { limit: 500000, required: 300000, status: 'above_required' }),
      layerOf('boat', { limit: 300000, required: 500000, status: 'below_required' }),
    ]));
    assert.equal(row(vm, 'home').bar.limitPct, row(vm, 'boat').bar.requiredPct, '500,000 is the same length in both rows');
    assert.equal(row(vm, 'home').bar.requiredPct, row(vm, 'boat').bar.limitPct, '300,000 is the same length in both rows');
    assert.equal(row(vm, 'home').bar.limitPct, 90.9);
    assert.equal(row(vm, 'home').bar.requiredPct, 54.5);
  });

  t('lengths are proportional to the numbers (a limit twice as large is twice as long, within rounding)', () => {
    const vm = stackViewModel(modelOf([layerOf('home', { limit: 250000, required: 500000, status: 'below_required' })]));
    assert.equal(Math.abs(row(vm, 'home').bar.limitPct * 2 - row(vm, 'home').bar.requiredPct) <= 0.2, true);
  });

  t('the umbrella is a cap, not a length on the layers\' scale: a bigger umbrella leaves every layer bar unchanged', () => {
    const small = stackViewModel(modelOf([layerOf('home')], umbrellaOf(1000000, '$1 million')));
    const big = stackViewModel(modelOf([layerOf('home')], umbrellaOf(5000000, '$5 million')));
    assert.deepEqual(row(small, 'home').bar, row(big, 'home').bar);
    assert.equal(row(small, 'umbrella').bar.limitPct, 100);
    assert.equal(row(big, 'umbrella').bar.limitPct, 100);
  });

  t('a zero limit is a zero-length fill; a tiny one still shows a sliver; nothing is ever below 0 or above 100', () => {
    const zero = stackViewModel(modelOf([layerOf('home', { limit: 0, limitLabel: '$0', required: 300000, status: 'below_required' })]));
    assert.equal(row(zero, 'home').bar.limitPct, 0);
    assert.equal(row(zero, 'home').bar.requiredPct, 90.9);
    const tiny = stackViewModel(modelOf([layerOf('home', { limit: 100, limitLabel: '$100', required: 10000000, status: 'below_required' })]));
    assert.equal(row(tiny, 'home').bar.limitPct, 1.5);
    const none = stackViewModel(modelOf([layerOf('home', { limit: 0, required: 0, status: 'ok' })]));
    assert.deepEqual([row(none, 'home').bar.limitPct, row(none, 'home').bar.requiredPct], [null, null], 'no scale at all when everything is zero');
  });

  t('an unreadable amount, a wrong shape or an unknown status never throws and is drawn as unknown', () => {
    const vm = stackViewModel(modelOf([
      layerOf('home', { limit: 'lots', limitAnswer: 'known', status: 'ok' }),
      splitLayer('auto', [1, 2], [3, 4], 'surprising'),
      layerOf('boat', { limit: { perPerson: 1 }, limitShape: 'split', limitAnswer: 'known', requiredAnswer: 'known', status: 'below_required' }),
      layerOf('motorcycle', { limit: -5, limitAnswer: 'known', status: 'ok' }),
    ]));
    assert.equal(vm.rows.length, 5);
    assert.equal(row(vm, 'auto').status, 'unknown', 'an unknown status word is treated as unknown');
    assert.equal(row(vm, 'auto').sentence, STATUS_SENTENCES.unknown);
    for (const id of ['home', 'boat', 'motorcycle']) assert.equal(row(vm, id).bar.limitPct, null, `${id}: nothing drawn for an amount we cannot read`);
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('stackViewModel: determinism and purity', (t) => {
  const answers = { ...BASE, umbrella_limit: '2m', auto_liability: 'lower', umbrella_min_auto: '250_500', home_liability: '1m', umbrella_min_home: '500k' };

  t('the same model twice gives byte-identical view-models and markup, and each call is a new object', () => {
    const stack = stackFor(answers);
    const a = stackViewModel(stack);
    const b = stackViewModel(copy(stack));
    assert.equal(serialize(a), serialize(b));
    assert.equal(stackViewHtml(a), stackViewHtml(b));
    assert.equal(a === b, false);
    a.rows[1].sentence = 'changed';
    a.counts.ok = 99;
    assert.equal(stackViewModel(stack).rows[1].sentence, STATUS_SENTENCES.below_required);
    assert.equal(stackViewModel(stack).counts.ok, 0);
  });

  t('a deeply frozen model is read without error and is left exactly as it was', () => {
    const stack = deepFreeze(copy(stackFor(answers)));
    const before = serialize(stack);
    const vm = stackViewModel(stack);
    stackViewHtml(vm);
    assert.equal(serialize(stack), before);
    assert.equal(vm.rows.length, 3);
  });

  t('the result is plain data: it survives a JSON round trip unchanged and holds no undefined', () => {
    const vm = stackViewModel(stackFor(answers));
    assert.equal(serialize(JSON.parse(JSON.stringify(vm))), serialize(vm));
    assert.equal(JSON.stringify(vm).includes('undefined'), false);
  });

  t('only the model is read: nothing else can change the result (the umbrella size, flags and other answers are not inputs)', () => {
    const base = stackFor(answers);
    const reordered = { ...copy(base), findings: [], counts: { ok: 9, below_required: 9, above_required: 9, unknown: 9 }, sourceIds: [] };
    assert.equal(serialize(stackViewModel(reordered).rows), serialize(stackViewModel(base).rows), 'rows do not depend on findings, counts or sources');
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('stackViewHtml: the markup', (t) => {
  const MIXED = { policies: ['auto', 'home', 'motorcycle', 'boat', 'umbrella'], umbrella_limit: '1m',
    auto_liability: '250_500', umbrella_min_auto: '250_500',        // ok
    home_liability: '300k', umbrella_min_home: '500k',              // below
    motorcycle_liability: '500_500', umbrella_min_motorcycle: '250_500', // above
    boat_liability: 'not_sure', umbrella_min_boat: '100_300' };      // unknown
  const vm = viewFor(MIXED);
  const html = stackViewHtml(vm);

  t('is one labelled section: a heading that names it, the note, and an ordered list with a row per view-model row', () => {
    assert.equal(html.startsWith('<section class="stk" aria-labelledby="stk-h"><h3 class="stk-h" id="stk-h">' + STACK_HEADING + '</h3>'), true);
    assert.equal(html.includes('<p class="small stk-note">' + vm.note + '</p>'), true);
    assert.equal(html.includes('<ol class="stk-rows">'), true);
    assert.equal(count(html, '<li '), vm.rows.length);
    assert.deepEqual(Array.from(html.matchAll(/data-stk="([^"]+)"/g)).map((m) => m[1]), vm.rows.map((r) => r.id), 'umbrella first, then the layers');
    assert.equal(html.endsWith('</section>'), true);
  });

  t('every row says its status in words (the sentence), shows both numbers, and says which part of the bar they are', () => {
    for (const r of vm.rows) {
      const start = html.indexOf('data-stk="' + r.id + '"');
      const part = html.slice(start, html.indexOf('</li>', start));
      assert.equal(part.includes('<p class="stk-name">' + r.label + '</p>'), true, `${r.id} name`);
      assert.equal(part.includes('<p class="stk-sentence">' + r.sentence + '</p>'), true, `${r.id} sentence`);
      assert.equal(part.includes('<dt>') && part.includes(r.limitCaption), true);
      assert.equal(part.includes('<dd>' + r.limitLabel + '</dd>'), true, `${r.id} limit`);
      if (r.requiredLabel !== null) assert.equal(part.includes('<dd>' + r.requiredLabel + '</dd>'), true, `${r.id} requirement`);
    }
    assert.equal(html.includes(STATUS_SENTENCES.ok), true);
    assert.equal(html.includes(STATUS_SENTENCES.below_required), true);
    assert.equal(html.includes(STATUS_SENTENCES.above_required), true);
    assert.equal(html.includes(STATUS_SENTENCES.unknown), true);
  });

  t('with every tag and every drawing removed, the words alone still give the whole story', () => {
    const text = textOf(html);
    for (const r of vm.rows) {
      assert.equal(text.includes(r.label), true);
      assert.equal(text.includes(r.sentence), true);
      assert.equal(text.includes(r.limitLabel), true);
    }
    assert.equal(text.includes('Your umbrella asks for'), true);
  });

  t('each status has its own icon outline; the four icons are different drawings', () => {
    const icons = {};
    for (const m of html.matchAll(/<span class="stk-ico[^"]*" data-icon="([a-z]+)"><svg[^>]*>(.*?)<\/svg><\/span>/g)) icons[m[1]] = m[2];
    assert.deepEqual(Object.keys(icons).sort(), ['check', 'down', 'question', 'umbrella', 'up']);
    assert.equal(new Set(Object.values(icons)).size, 5, 'five different drawings');
    assert.equal(icons.check.includes('<circle'), true, 'ok: a circle with a check');
    assert.equal(icons.down.includes('<rect'), true, 'below: a square with a down arrow');
    assert.equal(icons.up.includes('M12 2.6l9.4 9.4'), true, 'above: a diamond with an up arrow');
    assert.equal(icons.question.includes('stroke-dasharray'), true, 'unknown: a dashed circle with a question mark');
  });

  t('every SVG is decorative (aria-hidden, not focusable), and bars are drawn with attributes, never style', () => {
    assert.equal(count(html, '<svg'), count(html, 'aria-hidden="true" focusable="false"><'), 'every svg is hidden from assistive tech');
    assert.equal(/style\s*=/.test(html), false, 'no style attribute');
    assert.equal(/<script|javascript:|onerror|onclick/i.test(html), false);
  });

  t('the bar is a track, a fill to the limit and a marker at the requirement, with widths from the view-model', () => {
    for (const r of vm.rows) {
      const start = html.indexOf('data-stk="' + r.id + '"');
      const part = html.slice(start, html.indexOf('</li>', start));
      assert.equal(count(part, '<rect class="stk-track"'), 1);
      assert.equal(count(part, '<rect class="stk-fill'), r.bar.limitPct === null ? 0 : 1, `${r.id} fill`);
      if (r.bar.limitPct !== null) assert.equal(part.includes('x="0" y="3" width="' + r.bar.limitPct + '" height="10"'), true, `${r.id} fill width`);
      assert.equal(count(part, '<line class="stk-req"'), r.bar.requiredPct === null ? 0 : 1, `${r.id} marker`);
      if (r.bar.requiredPct !== null) assert.equal(part.includes('<line class="stk-req" x1="' + r.bar.requiredPct + '"'), true, `${r.id} marker position`);
      assert.equal(part.includes('stk-bar empty'), r.bar.limitPct === null && r.bar.requiredPct === null, `${r.id} empty bar`);
    }
  });

  t('a ceiling limit gets the ceiling class; the status class names the colour family; the umbrella is a cap', () => {
    const lower = stackViewHtml(viewFor({ policies: ['home', 'umbrella'], umbrella_limit: '1m', home_liability: 'lower', umbrella_min_home: '500k' }));
    assert.equal(lower.includes('<rect class="stk-fill below ceiling"'), true);
    assert.equal(html.includes('<rect class="stk-fill cap"'), true);
    assert.equal(html.includes('<rect class="stk-fill ok"'), true);
    assert.equal(html.includes('<rect class="stk-fill below"'), true);
    assert.equal(html.includes('<rect class="stk-fill above"'), true);
    assert.equal(html.includes('<li class="stk-row stk-umbrella"'), true);
    assert.equal(html.includes('<li class="stk-row stk-layer unknown"'), true);
  });

  t('the Not sure detail sentence is shown for the unknown row, as small text', () => {
    assert.equal(html.includes('<p class="small stk-detail">You were not sure of your boat liability limit, so we cannot compare it with what your umbrella asks for.</p>'), true);
    assert.equal(count(html, 'stk-detail'), 1, 'only the Not sure row has a detail');
  });

  t('ids: just the heading, named by the prefix; a bad prefix falls back to "stk"; two stacks can share a page', () => {
    assert.deepEqual(attrIds(html), ['stk-h']);
    const other = stackViewHtml(vm, { idPrefix: 'al-stk' });
    assert.deepEqual(attrIds(other), ['al-stk-h']);
    assert.equal(other.includes('aria-labelledby="al-stk-h"'), true);
    for (const bad of ['', 'Bad Prefix', '1abc', 'x"y', 5, null, undefined, '<b>', 'UPPER']) {
      assert.equal(stackViewHtml(vm, { idPrefix: bad }), html, `prefix ${JSON.stringify(bad)}`);
    }
    assert.equal(stackViewHtml(vm, null), html);
    assert.equal(stackViewHtml(vm, 'al-stk'), html, 'opts must be an object');
  });

  t('text from the model is escaped', () => {
    const evil = modelOf([layerOf('home', { label: '<img src=x onerror=alert(1)>', limitLabel: '"$1" & <b>', requiredLabel: "it's <i>", summary: '<u>x</u>', limitAnswer: 'not_sure', status: 'unknown' })],
      umbrellaOf(1, '<script>1</script>'));
    evil.attachmentNote = '<a href="javascript:alert(1)">note</a>';
    const out = stackViewHtml(stackViewModel(evil));
    assert.equal(/<img|<script|<b>|<i>|<u>|<a href/.test(out), false);
    assert.equal(out.includes('&lt;img src=x onerror=alert(1)&gt;'), true);
    assert.equal(out.includes('&quot;$1&quot; &amp; &lt;b&gt;'), true);
    assert.equal(out.includes('it&#39;s &lt;i&gt;'), true);
    assert.equal(out.includes('&lt;script&gt;1&lt;/script&gt;'), true);
    assert.equal(out.includes('&lt;a href=&quot;javascript:alert(1)&quot;&gt;note&lt;/a&gt;'), true);
  });

  t('over many households: no stray text, one li per row, and every number on screen comes from the model', () => {
    let n = 0;
    eachCoreCombination((answers) => {
      n += 1;
      if (n % 5 !== 0) return;
      const stack = stackFor(answers);
      const v = stackViewModel(stack);
      const out = stackViewHtml(v);
      assert.equal(/undefined|NaN|\[object|\{\{/.test(out), false);
      assert.equal(count(out, '<li '), 1 + stack.layers.length);
      for (const l of stack.layers) {
        const start = out.indexOf('data-stk="' + l.id + '"');
        const part = out.slice(start, out.indexOf('</li>', start));
        assert.equal(part.includes('<dd>' + l.limitLabel + '</dd>'), true);
        assert.equal(part.includes('<dd>' + l.requiredLabel + '</dd>'), true);
      }
    });
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('stackViewModel: the screen reader summary', (t) => {
  t('says the umbrella size and each layer\'s verdict in words, and nothing else', () => {
    const vm = viewFor({ ...BASE, umbrella_limit: '1m', auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '500k' });
    assert.equal(vm.ariaSummary, 'Your umbrella and what sits under it. Umbrella limit: $1 million. Auto liability: meets what your umbrella asks for. Home liability: below what your umbrella asks for.');
  });

  t('names every status the same way as the sentences (short form), and Not sure and not answered yet', () => {
    const vm = viewFor({ policies: ['auto', 'home', 'motorcycle', 'boat', 'umbrella'], umbrella_limit: 'not_sure',
      auto_liability: '500_500', umbrella_min_auto: '250_500', home_liability: 'not_sure', umbrella_min_home: '300k' });
    assert.equal(vm.ariaSummary, 'Your umbrella and what sits under it. Umbrella limit: Not sure. Auto liability: higher than your umbrella requires. Home liability: needs one more answer. Motorcycle liability: needs one more answer. Boat liability: needs one more answer.');
  });

  t('is not part of the markup (the live region carries it), and is plain text', () => {
    const vm = viewFor({ ...BASE, umbrella_limit: '1m' });
    assert.equal(stackViewHtml(vm).includes(vm.ariaSummary), false);
    assert.equal(/^[\x20-\x7E]+$/.test(vm.ariaSummary), true);
    assert.equal(stackLiveText(vm), vm.ariaSummary);
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('stack view snapshot (tests/snapshots/stack-view.snap.mjs)', (t) => {
  // Regenerate deliberately with scripts/update-snapshots.sh; any diff must be explained by the change (tests/snapshots/README.md).
  t('the view-model and markup for the eight named stack households equal the committed snapshot', () => {
    assertSnapshot(buildStackViews(), STACK_VIEWS, 'stack-view');
  });

  t('the snapshot really covers the cases: eight households, no stack without an umbrella, an umbrella alone, every status', () => {
    assert.deepEqual(Object.keys(STACK_VIEWS).sort(), Object.keys(STACK_SCENARIOS).sort());
    assert.equal(Object.keys(STACK_VIEWS).length, 8);
    assert.equal(STACK_VIEWS['umbrella-only'].view.layerCount, 0);
    assert.equal(STACK_VIEWS['umbrella-only'].view.emptyNote, EMPTY_NOTE);
    const seen = {};
    for (const name of Object.keys(STACK_VIEWS)) {
      if (STACK_VIEWS[name].view === null) continue;
      for (const r of STACK_VIEWS[name].view.rows) if (r.status !== null) seen[r.status] = true;
    }
    assert.deepEqual(Object.keys(seen).sort(), ['above_required', 'below_required', 'ok', 'unknown']);
    assert.equal(Object.values(STACK_VIEWS).some((s) => s.view !== null && s.view.rows.some((r) => r.bar.ceiling)), true, 'a ceiling limit is in the snapshot');
  });
});

// ---------------------------------------------------------------------------------------------------------
// How the screens get the model.
// ---------------------------------------------------------------------------------------------------------
const host = (parts = {}) => ({ a: {}, extras: [], q: {}, p: {}, o: {}, ...parts });
const UMB = { umbrella: { hasUmbrella: 'Yes' } };
const OWNER = { a: { home: 'Own', veh: '1' }, p: UMB };

suite('liabilityStackModel and stackForScreen: the model for the screens', (t) => {
  t('null without an umbrella, the engine\'s own model with one', () => {
    assert.equal(liabilityStackModel(host({ a: { home: 'Own', veh: '1' } })), null);
    assert.equal(liabilityStackModel(host()), null);
    const snap = host({ ...OWNER, o: { umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500' } });
    const model = liabilityStackModel(snap);
    assert.equal(model.umbrella.limitLabel, '$1 million');
    assert.deepEqual(model.layers.map((l) => l.id), ['auto', 'home']);
    assert.equal(serialize(model), serialize(createContext(deriveAnswers(snap)).stack));
  });

  t('a fresh plain object each call, so a caller may change it', () => {
    const snap = host({ ...OWNER, o: { umbrella_limit: '1m' } });
    const a = liabilityStackModel(snap);
    a.layers[0].status = 'ok';
    a.umbrella.limitLabel = 'changed';
    const b = liabilityStackModel(snap);
    assert.equal(b.layers[0].status, 'unknown');
    assert.equal(b.umbrella.limitLabel, '$1 million');
    assert.equal(Object.isFrozen(b), false);
  });

  t('built from the household\'s answers only: the state is never read, and the snapshot is not changed', () => {
    const snap = host({ ...OWNER, o: { umbrella_limit: '2m', home_liability: '500k', umbrella_min_home: '500k' } });
    const frozen = deepFreeze(copy(snap));
    const ca = liabilityStackModel({ ...frozen, state: 'CA' });
    const mn = liabilityStackModel({ ...frozen, state: 'MN' });
    assert.equal(serialize(ca), serialize(mn));
    assert.equal(serialize(ca), serialize(liabilityStackModel(frozen)));
  });

  t('the umbrella screens are the ones that ask the limit questions, and both are real sections', () => {
    assert.deepEqual(STACK_SECTION_IDS, ['umbrella_stack', 'umbrella_vehicles']);
    for (const id of STACK_SECTION_IDS) assert.equal(SECTIONS.some((s) => s.id === id), true, id);
  });

  t('stackForScreen gives the model on those two screens only', () => {
    const snap = host({ ...OWNER, extras: ['Motorcycle'], o: { umbrella_limit: '1m' } });
    assert.equal(stackForScreen(snap, 'ovl:umbrella_stack').umbrella.limitLabel, '$1 million');
    assert.equal(stackForScreen(snap, 'ovl:umbrella_vehicles').layers.some((l) => l.id === 'motorcycle'), true);
    for (const other of ['ovl:umbrella_scope', 'ovl:extras', 'ovl:auto_gaps', 'ovl:deductible', 'ovl:', 'ovl:nope', 'summary', 'umbrella', 'p:auto', 'actions', '', undefined, null, 5]) {
      assert.equal(stackForScreen(snap, other), null, String(other));
    }
    assert.equal(stackForScreen(host({ a: { home: 'Own', veh: '1' } }), 'ovl:umbrella_stack'), null, 'no umbrella, no stack');
  });

  t('the stack follows the answers as they are given, one tap at a time (the live update)', () => {
    let snap = host({ ...OWNER });
    const auto = () => row(stackViewModel(stackForScreen(snap, 'ovl:umbrella_stack')), 'auto');
    const tap = (q, o) => { snap = { ...snap, o: applyAnswer(snap, q, o) }; };
    assert.equal(auto().status, 'unknown');
    assert.equal(auto().limitLabel, 'Not answered yet');
    tap('auto_liability', '100_300');
    assert.equal(auto().limitLabel, '100/300');
    assert.equal(auto().status, 'unknown', 'one number is not enough');
    tap('umbrella_min_auto', '250_500');
    assert.equal(auto().status, 'below_required');
    tap('auto_liability', '250_500');
    assert.equal(auto().status, 'ok');
    tap('auto_liability', '500_500');
    assert.equal(auto().status, 'above_required');
    tap('umbrella_min_auto', 'not_sure');
    assert.equal(auto().status, 'unknown');
    assert.equal(auto().requiredLabel, 'Not sure');
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('overlapScreenHtml: the stack on an umbrella question screen', (t) => {
  const snap = host({ ...OWNER, extras: ['Motorcycle'], o: { umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500' } });
  const sections = overlapSections(snap);
  const vm = stackViewModel(stackForScreen(snap, 'ovl:umbrella_stack'));
  const html = overlapScreenHtml(sections, 'ovl:umbrella_stack', BACK, vm);

  t('sits below the questions and above the hint and the footer, with a live region of its own that already holds the summary (so nothing is announced on arrival)', () => {
    const wrap = '<div class="stk-wrap"><p class="vh" id="stk-live" role="status">' + vm.ariaSummary + '</p><div id="stk-body" aria-live="off"><section class="stk" aria-labelledby="stk-h">';
    const at = html.indexOf(wrap);
    assert.equal(at > 0, true);
    assert.equal(html.indexOf('id="ovl-body"') < at, true, 'after the questions');
    assert.equal(html.indexOf('id="ovl-hint"') > html.indexOf('</section></div></div>'), true, 'before the hint');
    assert.equal(html.indexOf('class="row spread foot ovl-foot"') > html.indexOf('id="ovl-hint"'), true);
    assert.equal(html.includes('<div id="stk-body" aria-live="off">' + stackBodyHtml(vm) + '</div>'), true, 'the drawing is not read out on every tap; the live region above it says what changed');
  });

  t('adds no button, no duplicate id and no dangling aria reference', () => {
    const plain = overlapScreenHtml(sections, 'ovl:umbrella_stack', BACK);
    assert.equal(count(html, '<button'), count(plain, '<button'));
    const ids = attrIds(html);
    assert.equal(new Set(ids).size, ids.length, JSON.stringify(ids));
    for (const m of html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)) assert.equal(ids.includes(m[1]), true, `dangling ${m[1]}`);
    assert.equal(/undefined|\[object|NaN|\{\{/.test(html), false);
  });

  t('without a stack (null or not given) the screen is exactly what it was before', () => {
    const plain = overlapScreenHtml(sections, 'ovl:umbrella_stack', BACK);
    assert.equal(overlapScreenHtml(sections, 'ovl:umbrella_stack', BACK, null), plain);
    assert.equal(overlapScreenHtml(sections, 'ovl:umbrella_stack', BACK, undefined), plain);
    assert.equal(plain.includes('stk'), false);
  });

  t('both umbrella screens of a household with a motorcycle and a boat draw the whole stack', () => {
    const big = host({ ...OWNER, extras: ['Motorcycle', 'Boat'] });
    const secs = overlapSections(big);
    for (const id of STACK_SECTION_IDS) {
      const out = overlapScreenHtml(secs, 'ovl:' + id, BACK, stackViewModel(stackForScreen(big, 'ovl:' + id)));
      assert.deepEqual(Array.from(out.matchAll(/data-stk="([^"]+)"/g)).map((m) => m[1]), ['umbrella', 'auto', 'home', 'motorcycle', 'boat'], id);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('actionListHtml: the stack among the umbrella items', (t) => {
  const item = (id, bucket) => ({ id, title: 'T ' + id, background: 'b', ask: 'a', reason: 'r', emphasis: 'normal', sources: [{ publisher: 'P', title: 'S', url: 'https://example.org/x', lastVerified: '2026-10-10' }] });
  const group = (bucket, label, ids) => ({ bucket, label, description: 'd', count: ids.length, items: ids.map((id) => item(id, bucket)) });
  const listOf = (groups) => ({ groups, total: groups.reduce((n, g) => n + g.count, 0), empty: groups.length === 0, emptyTitle: groups.length === 0 ? 'Nothing' : null, emptyMessage: groups.length === 0 ? 'Nothing flagged' : null });
  const stackVm = viewFor({ ...BASE, umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '500k' });
  const stackAt = (html) => html.indexOf('<div class="al-stack"><section class="stk" aria-labelledby="al-stk-h">');

  t('goes directly above the first group that holds an umbrella item', () => {
    const vm = listOf([group('raise', 'Raise', ['auto-thing']), group('drop', 'Drop', ['rental-thing']), group('question', 'Question', ['phone-thing', 'umbrella-um-uim-extension'])]);
    const html = actionListHtml(vm, false, stackVm);
    assert.equal(count(html, 'class="stk"'), 1);
    assert.equal(stackAt(html) > html.indexOf('data-bucket="drop"'), true, 'after the groups with no umbrella item');
    assert.equal(html.indexOf('</section></div><div class="al-group" data-bucket="question">') > 0, true, 'right before the question group');
  });

  t('an umbrella item in the first group puts the stack at the top of the list', () => {
    const vm = listOf([group('raise', 'Raise', ['umbrella-home-below-required-min', 'umbrella-motorcycle-below-required-min']), group('question', 'Question', ['umbrella-size-unconfirmed'])]);
    const html = actionListHtml(vm, false, stackVm);
    assert.equal(stackAt(html) > 0 && stackAt(html) < html.indexOf('data-bucket="raise"'), true);
    assert.equal(count(html, 'class="stk"'), 1);
  });

  t('the vehicle Raise flags count as umbrella items too (their ids start with "umbrella-")', () => {
    const vm = listOf([group('drop', 'Drop', ['rental-thing']), group('raise', 'Raise', ['umbrella-boat-below-required-min'])]);
    const html = actionListHtml(vm, false, stackVm);
    assert.equal(stackAt(html) > html.indexOf('data-bucket="drop"'), true);
    assert.equal(stackAt(html) < html.indexOf('data-bucket="raise"'), true);
  });

  t('no umbrella item at all: above the first group; an empty list: below the empty-state message', () => {
    const none = listOf([group('drop', 'Drop', ['rental-thing']), group('question', 'Question', ['phone-thing'])]);
    const html = actionListHtml(none, false, stackVm);
    assert.equal(stackAt(html) > 0 && stackAt(html) < html.indexOf('data-bucket="drop"'), true);
    const empty = actionListHtml(listOf([]), false, stackVm);
    assert.equal(empty.indexOf('class="finding al-empty"') < stackAt(empty), true);
    assert.equal(stackAt(empty) < empty.indexOf('class="small al-privacy"'), true);
    assert.equal(empty.includes('data-act="copy"'), false, 'still nothing to copy');
  });

  t('with no stack the list is exactly what it was before', () => {
    const vm = listOf([group('raise', 'Raise', ['umbrella-home-below-required-min'])]);
    assert.equal(actionListHtml(vm, false, null), actionListHtml(vm));
    assert.equal(actionListHtml(vm, false, undefined), actionListHtml(vm));
    assert.equal(actionListHtml(vm).includes('stk'), false);
  });

  t('the stack inside the list has its own heading id, no duplicate ids anywhere, and prints with the list', () => {
    const vm = listOf([group('raise', 'Raise', ['umbrella-home-below-required-min'])]);
    const html = actionListHtml(vm, false, stackVm);
    const ids = attrIds(html);
    assert.equal(ids.includes('al-stk-h'), true);
    assert.equal(new Set(ids).size, ids.length, JSON.stringify(ids));
    assert.equal(html.indexOf('<section class="actionlist"') === 0 && html.endsWith('</section>'), true, 'inside the .actionlist section the print stylesheet keeps');
  });

  t('the real catalog: a household with an umbrella gets the stack in its list, one without does not', () => {
    const withUmb = host({ ...OWNER, o: { umbrella_limit: '1m', auto_liability: 'lower', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '500k' } });
    const list = actionListViewModel(withUmb);
    const model = stackViewModel(liabilityStackModel(withUmb));
    const html = actionListHtml(list, false, model);
    assert.equal(count(html, 'class="stk"'), 1);
    assert.equal(list.groups.flatMap((g) => g.items).some((i) => i.id.indexOf('umbrella-') === 0), true, 'an umbrella item fired');
    assert.equal(html.includes(STATUS_SENTENCES.below_required), true);
    const without = host({ a: { home: 'Own', veh: '1' } });
    assert.equal(actionListHtml(actionListViewModel(without), false, stackViewModel(liabilityStackModel(without))).includes('stk'), false);
  });
});

// ---------------------------------------------------------------------------------------------------------
// dom.mjs: patching the drawing in place. Stand-ins for the elements (jsc has no DOM).
// ---------------------------------------------------------------------------------------------------------
function fakeEl(attrs = {}) {
  const classes = new Set();
  const attributes = { ...attrs };
  return {
    disabled: false, hidden: false, innerHTML: '', writes: 0, _text: '',
    get textContent() { return this._text; },
    set textContent(v) { this._text = v; this.writes += 1; },
    classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }, has: (n) => classes.has(n) },
    setAttribute(k, v) { attributes[k] = String(v); },
    getAttribute(k) { return k in attributes ? attributes[k] : null; },
  };
}

function fakeStage(sections, screenId, withStack) {
  const section = sections.find((s) => 'ovl:' + s.id === screenId);
  const sid = section.id;
  const index = sections.indexOf(section);
  const key = sid + '|' + (index + 1) + '|' + sections.length + '|' + section.questions.map((q) => q.id).join(',');
  const buttons = new Map();
  for (const q of section.questions) for (const o of q.options) buttons.set(q.id + '/' + o.id, fakeEl({ 'aria-pressed': 'false' }));
  const body = {
    getAttribute: (k) => (k === 'data-ovl-key' ? key : null),
    querySelector(sel) { const m = /^button\[data-oq="([^"]+)"\]\[data-ov="([^"]+)"\]$/.exec(sel); return m ? buttons.get(m[1] + '/' + m[2]) || null : null; },
    querySelectorAll(sel) { return sel === 'button[data-oq]' ? Array.from(buttons.values()) : []; },
  };
  const next = fakeEl();
  const hint = fakeEl();
  const stackBody = withStack ? fakeEl() : null;
  const stackLive = withStack ? fakeEl() : null;
  const els = { '#ovl-body': body, '#ovl-next': next, '#ovl-hint': hint, '#stk-body': stackBody, '#stk-live': stackLive };
  return { stage: { querySelector: (sel) => els[sel] || null }, buttons, stackBody, stackLive, next };
}

suite('patchOverlapScreen: the stack drawing is replaced in place and announced only when it changes', (t) => {
  const snap1 = host({ ...OWNER, o: { umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500' } });
  const snap2 = host({ ...OWNER, o: { umbrella_limit: '1m', auto_liability: '250_500', umbrella_min_auto: '250_500' } });
  const sid = 'ovl:umbrella_stack';
  const vmOf = (snap) => stackViewModel(stackForScreen(snap, sid));

  t('puts the new drawing in #stk-body and the new summary in #stk-live', () => {
    const screen = fakeStage(overlapSections(snap1), sid, true);
    assert.equal(patchOverlapScreen(screen.stage, overlapSections(snap1), sid, vmOf(snap1)), true);
    assert.equal(screen.stackBody.innerHTML, stackBodyHtml(vmOf(snap1)));
    assert.equal(screen.stackLive.textContent, vmOf(snap1).ariaSummary);
    assert.equal(screen.stackBody.innerHTML.includes(STATUS_SENTENCES.below_required), true);
  });

  t('an answer that changes a verdict changes the drawing and the announcement', () => {
    const screen = fakeStage(overlapSections(snap1), sid, true);
    patchOverlapScreen(screen.stage, overlapSections(snap1), sid, vmOf(snap1));
    const before = screen.stackLive.textContent;
    assert.equal(patchOverlapScreen(screen.stage, overlapSections(snap2), sid, vmOf(snap2)), true);
    assert.notEqual(screen.stackLive.textContent, before);
    assert.equal(screen.stackBody.innerHTML.includes('Meets what your umbrella asks for'), true);
  });

  t('the live region is written only when its sentence changed, so a screen reader does not repeat itself', () => {
    const screen = fakeStage(overlapSections(snap1), sid, true);
    patchOverlapScreen(screen.stage, overlapSections(snap1), sid, vmOf(snap1));
    patchOverlapScreen(screen.stage, overlapSections(snap1), sid, vmOf(snap1));
    patchOverlapScreen(screen.stage, overlapSections(snap1), sid, vmOf(snap1));
    assert.equal(screen.stackLive.writes, 1);
    patchOverlapScreen(screen.stage, overlapSections(snap2), sid, vmOf(snap2));
    assert.equal(screen.stackLive.writes, 2);
  });

  t('a screen drawn with its summary already in the live region is not announced again until an answer changes it', () => {
    const screen = fakeStage(overlapSections(snap1), sid, true);
    screen.stackLive._text = vmOf(snap1).ariaSummary; // what overlapScreenHtml draws (set without counting as a write)
    patchOverlapScreen(screen.stage, overlapSections(snap1), sid, vmOf(snap1));
    assert.equal(screen.stackLive.writes, 0, 'an answer that changes nothing in the drawing says nothing');
    patchOverlapScreen(screen.stage, overlapSections(snap2), sid, vmOf(snap2));
    assert.equal(screen.stackLive.writes, 1);
    assert.equal(screen.stackLive.textContent, vmOf(snap2).ariaSummary);
  });

  t('returns false and changes nothing when the page has no stack but one is wanted, or the other way round', () => {
    const none = fakeStage(overlapSections(snap1), sid, false);
    assert.equal(patchOverlapScreen(none.stage, overlapSections(snap1), sid, vmOf(snap1)), false);
    for (const b of none.buttons.values()) assert.equal(b.getAttribute('aria-pressed'), 'false');
    const has = fakeStage(overlapSections(snap1), sid, true);
    assert.equal(patchOverlapScreen(has.stage, overlapSections(snap1), sid, null), false);
    assert.equal(patchOverlapScreen(has.stage, overlapSections(snap1), sid), false);
    assert.equal(has.stackBody.innerHTML, '');
    assert.equal(has.stackLive.writes, 0);
  });

  t('a changed screen shape returns false before touching the drawing', () => {
    const screen = fakeStage(overlapSections(snap1), sid, true);
    const other = host({ ...OWNER, extras: ['Boat'], o: snap1.o });
    const changed = overlapSections(other);
    assert.equal(patchOverlapScreen(screen.stage, changed, sid, vmOf(other)), false, 'a Boat adds a section, so "N of M" changes');
    assert.equal(screen.stackBody.innerHTML, '', 'drawing untouched when the call returns false');
    assert.equal(screen.stackLive.writes, 0);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The stylesheet: the classes the markup uses, the narrow-screen and print rules, and contrast (looked at in the Browser pane too).
// ---------------------------------------------------------------------------------------------------------
suite('app.css: stack styles, narrow screens, print and contrast', (t) => {
  const canRead = typeof read === 'function';
  const css = canRead ? read('public/css/app.css') : '';

  const palette = (block) => {
    const out = {};
    for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)) out[m[1]] = m[2];
    return out;
  };
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const light = () => palette(css.slice(css.indexOf(':root{'), css.indexOf('@media (prefers-color-scheme: dark)')));
  const dark = () => {
    const at = css.indexOf('@media (prefers-color-scheme: dark)');
    return { ...light(), ...palette(css.slice(at, css.indexOf('*{box-sizing', at))) };
  };

  t('every class the markup uses has a rule', () => {
    if (!canRead) return;
    const html = stackViewHtml(viewFor({ policies: ['auto', 'home', 'umbrella'], umbrella_limit: '1m', auto_liability: 'lower', umbrella_min_auto: '250_500', home_liability: 'not_sure', umbrella_min_home: '500k' }))
      + stackViewHtml(viewFor({ policies: ['umbrella'], umbrella_limit: '1m' }));
    const classes = new Set();
    for (const m of html.matchAll(/class="([^"]+)"/g)) for (const c of m[1].split(' ')) if (c.indexOf('stk') === 0) classes.add(c);
    assert.equal(classes.size > 15, true);
    for (const c of classes) assert.equal(css.includes('.' + c), true, `.${c} has no rule`);
    for (const c of ['.stk-fill.ceiling', '.stk-fill.below', '.stk-fill.above', '.stk-fill.ok', '.stk-fill.cap', '.stk-bar.empty', '.stk-key.tick', '.stk-key.fill']) assert.equal(css.includes(c), true, c);
  });

  t('bar colours reuse the existing status palette, and there is no new colour literal in the stack rules', () => {
    if (!canRead) return;
    const block = css.slice(css.indexOf('/* The umbrella and the limits under it'), css.indexOf('@media (prefers-reduced-motion'));
    assert.equal(block.length > 500, true);
    assert.equal(/#[0-9A-Fa-f]{3,8}\b/.test(block), false, 'colours come from the variables');
    for (const v of ['--ok', '--under', '--info', '--muted', '--accent', '--ink', '--surface', '--line']) assert.equal(block.includes('var(' + v + ')'), true, v);
  });

  t('narrow screens (375px) get tighter padding, the numbers never break inside, and the print block keeps rows together', () => {
    if (!canRead) return;
    assert.match(css, /@media \(max-width:480px\)\{\.stk\{padding:12px\}\.stk-row\{grid-template-columns:22px/);
    assert.match(css, /\.stk-nums dd\{margin-left:auto;white-space:nowrap\}/);
    assert.match(css, /\.stk-nums>div\{display:flex;flex-wrap:wrap/);
    const print = css.slice(css.indexOf('@media print{'));
    assert.equal(print.includes('.stk,.stk-row{break-inside:avoid}'), true);
  });

  t('light and dark: every status colour clears 3:1 against the card and against the empty track (graphics), the marker too', () => {
    if (!canRead) return;
    for (const [name, p] of [['light', light()], ['dark', dark()]]) {
      for (const colour of ['ok', 'under', 'info', 'muted', 'accent', 'ink']) {
        assert.equal(Boolean(p[colour]), true, `${name}: --${colour} exists`);
        assert.equal(ratio(p[colour], p.surface) >= 3, true, `${name}: --${colour} on --surface is ${ratio(p[colour], p.surface).toFixed(2)}`);
      }
      for (const colour of ['ok', 'under', 'info', 'muted']) {
        assert.equal(ratio(p[colour], p.line) >= 3, true, `${name}: a --${colour} fill on the --line track is ${ratio(p[colour], p.line).toFixed(2)}`);
      }
      assert.equal(ratio(p.accent, p['accent-soft']) >= 3, true, `${name}: the umbrella icon (--accent) on the umbrella row (--accent-soft) is ${ratio(p.accent, p['accent-soft']).toFixed(2)}`);
    }
  });

  t('light and dark: the words (ink and muted) clear 4.5:1 on the card and on the umbrella row', () => {
    if (!canRead) return;
    for (const [name, p] of [['light', light()], ['dark', dark()]]) {
      for (const [fg, bg] of [['ink', 'surface'], ['muted', 'surface'], ['ink', 'accent-soft'], ['muted', 'accent-soft']]) {
        assert.equal(ratio(p[fg], p[bg]) >= 4.5, true, `${name}: --${fg} on --${bg} is ${ratio(p[fg], p[bg]).toFixed(2)}`);
      }
    }
  });
});
