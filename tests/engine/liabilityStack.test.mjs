// Story S6: tests for the liability stack engine (public/js/overlap/engine/liabilityStack.mjs).
// The stack is pure data derived from the evaluation context; flags and the Story S14 visualization read it.
// Runs under jsc and Node. Uses the real catalog for the preset ladders and small fake contexts for edge cases
// the real catalog cannot produce (mixed split limits, unreadable option values).
import { suite, assert, assertSnapshot, serialize } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { QUESTIONS } from '../../public/js/overlap/data/questions/index.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { createContext, evaluate } from '../../public/js/overlap/engine/evaluate.mjs';
import { createSession } from '../../public/js/overlap/engine/session.mjs';
import {
  computeLiabilityStack, stackFindings, LAYER_IDS, STACK_STATUSES, LOWER_OPTION_ID,
} from '../../public/js/overlap/engine/liabilityStack.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';
import STACK_MATRIX from '../snapshots/stack-matrix.snap.mjs';
import { buildStackMatrix } from '../snapshots/builders/stackMatrix.mjs';

const BASE = { policies: ['auto', 'home', 'umbrella'] };
const withAnswers = (more, policies) => ({ ...BASE, ...(policies ? { policies } : {}), ...more });
const stackOf = (answers) => createContext(answers).stack;
const layer = (stack, id) => stack.layers.find((l) => l.id === id);

// A hand-made context: `answers` maps a question id to an option object { id, label, value } or the string 'not_sure'.
function fakeCtx(policies, answers) {
  const has = (q) => Object.prototype.hasOwnProperty.call(answers, q);
  return {
    holds: (p) => policies.includes(p),
    answer: (q) => (has(q) ? (answers[q] === 'not_sure' ? 'not_sure' : answers[q].id) : undefined),
    isNotSure: (q) => has(q) && answers[q] === 'not_sure',
    option: (q) => (has(q) ? (answers[q] === 'not_sure' ? { id: 'not_sure', label: 'Not sure' } : answers[q]) : undefined),
  };
}
const split = (pp, pa, label, id = 'x') => ({ id, label: label || `${pp / 1000}/${pa / 1000}`, value: { perPerson: pp, perAccident: pa } });
const money = (n, label, id = 'x') => ({ id, label: label || `$${n}`, value: n });

const STATE_NAMES = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington state|west virginia|wisconsin|wyoming)\b/i;

// ------------------------------------------------------------------------------------------------------
suite('liabilityStack: when there is a stack at all', (t) => {
  t('no umbrella means no stack (null), however many limits were entered', () => {
    assert.equal(stackOf({ policies: ['auto', 'home'] }), null);
    assert.equal(stackOf({ policies: [] }), null);
    assert.equal(stackOf({}), null);
    // Answers to the umbrella branch are pruned when the umbrella is not held, so the stack never sees them.
    assert.equal(stackOf({ policies: ['auto'], auto_liability: '100_300', umbrella_min_auto: '250_500' }), null);
    assert.equal(evaluate({ policies: ['auto', 'home'] }).stack, null);
  });

  t('anything that is not an evaluation context gives null instead of throwing', () => {
    assert.equal(computeLiabilityStack(undefined), null);
    assert.equal(computeLiabilityStack(null), null);
    assert.equal(computeLiabilityStack({}), null);
    assert.equal(computeLiabilityStack('ctx'), null);
    assert.equal(computeLiabilityStack({ holds: () => true }), null, 'a ctx without answer/option/isNotSure is not usable');
  });

  t('an umbrella with no underlying policy is still a stack: the umbrella alone', () => {
    const s = stackOf({ policies: ['umbrella'], umbrella_limit: '2m' });
    assert.deepEqual(s.layers, []);
    assert.deepEqual(s.counts, { ok: 0, below_required: 0, above_required: 0, unknown: 0 });
    assert.deepEqual(s.findings, []);
    assert.deepEqual(s.umbrella, { id: 'umbrella', label: 'Umbrella', limit: 2000000, limitLabel: '$2 million', limitAnswer: 'known' });
  });

  t('layers exist only for the underlying policies held, in the fixed order auto, home, motorcycle, boat', () => {
    assert.deepEqual(LAYER_IDS, ['auto', 'home', 'motorcycle', 'boat']);
    const all = stackOf({ policies: ['boat', 'umbrella', 'motorcycle', 'home', 'auto'] });
    assert.deepEqual(all.layers.map((l) => l.id), ['auto', 'home', 'motorcycle', 'boat']);
    assert.deepEqual(stackOf({ policies: ['umbrella', 'boat', 'home'] }).layers.map((l) => l.id), ['home', 'boat']);
    assert.deepEqual(stackOf({ policies: ['umbrella', 'renters', 'health'] }).layers, [], 'renters and health are not liability layers here');
  });

  t('a held policy whose questions are unanswered is still a layer, with status unknown', () => {
    const s = stackOf(withAnswers({}));
    assert.deepEqual(s.layers.map((l) => [l.id, l.status, l.limitAnswer, l.requiredAnswer]), [
      ['auto', 'unknown', 'unanswered', 'unanswered'],
      ['home', 'unknown', 'unanswered', 'unanswered'],
    ]);
    assert.deepEqual(s.findings, [], 'unanswered is not Not sure, so there is nothing to confirm yet');
    assert.equal(s.umbrella.limitAnswer, 'unanswered');
    assert.equal(s.umbrella.limit, null);
  });
});

// ------------------------------------------------------------------------------------------------------
suite('liabilityStack: the model is self-describing plain data', (t) => {
  const scenario = withAnswers({
    umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '300k',
  });

  t('an exact full model for one scenario (this is the contract the visualization reads)', () => {
    const s = stackOf(scenario);
    assert.deepEqual(s.umbrella, { id: 'umbrella', label: 'Umbrella', limit: 1000000, limitLabel: '$1 million', limitAnswer: 'known' });
    assert.deepEqual(layer(s, 'auto'), {
      id: 'auto',
      label: 'Auto liability',
      policyText: 'auto policy',
      limitShape: 'split',
      limit: { perPerson: 100000, perAccident: 300000 },
      limitLabel: '100/300',
      limitText: '100/300',
      limitIsCeiling: false,
      limitAnswer: 'known',
      required: { perPerson: 250000, perAccident: 500000 },
      requiredLabel: '250/500',
      requiredText: '250/500',
      requiredAnswer: 'known',
      status: 'below_required',
      statusLabel: "Below your umbrella's requirement",
      shortBy: { perPerson: 150000, perAccident: 200000 },
      summary: 'Your auto liability limit is 100/300, but your umbrella asks for 250/500.',
    });
    assert.deepEqual(layer(s, 'home'), {
      id: 'home',
      label: 'Home liability',
      policyText: 'home policy',
      limitShape: 'single',
      limit: 500000,
      limitLabel: '$500,000',
      limitText: '$500,000',
      limitIsCeiling: false,
      limitAnswer: 'known',
      required: 300000,
      requiredLabel: '$300,000',
      requiredText: '$300,000',
      requiredAnswer: 'known',
      status: 'above_required',
      statusLabel: "Above your umbrella's requirement",
      shortBy: null,
      summary: 'Your home liability limit is $500,000, which is more than the $300,000 your umbrella asks for.',
    });
    assert.deepEqual(s.counts, { ok: 0, below_required: 1, above_required: 1, unknown: 0 });
    assert.deepEqual(s.findings.map((f) => [f.id, f.type, f.layer]), [
      ['auto-below-required', 'below_required', 'auto'],
      ['home-above-required', 'above_required', 'home'],
    ]);
  });

  t('the top-level keys, layer keys and finding keys are exactly the documented ones', () => {
    const s = stackOf(withAnswers({ auto_liability: 'not_sure', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '500k' }));
    assert.deepEqual(Object.keys(s).sort(), ['attachmentNote', 'counts', 'findings', 'layers', 'sourceIds', 'umbrella', 'version']);
    assert.equal(s.version, 1);
    for (const l of s.layers) {
      assert.deepEqual(Object.keys(l).sort(), [
        'id', 'label', 'limit', 'limitAnswer', 'limitIsCeiling', 'limitLabel', 'limitShape', 'limitText', 'policyText',
        'required', 'requiredAnswer', 'requiredLabel', 'requiredText', 'shortBy', 'status', 'statusLabel', 'summary',
      ]);
      assert.includes(STACK_STATUSES, l.status);
    }
    for (const f of s.findings) {
      assert.deepEqual(Object.keys(f).sort(), [
        'id', 'layer', 'layerLabel', 'limitIsCeiling', 'limitLabel', 'limitText', 'notSure', 'policyText', 'requiredLabel', 'requiredText', 'type',
      ]);
    }
  });

  t('STACK_STATUSES is the documented closed list', () => {
    assert.deepEqual(STACK_STATUSES, ['ok', 'below_required', 'above_required', 'unknown']);
  });

  t('the attachment note and its sources are part of the model, and every source resolves', () => {
    const s = stackOf(scenario);
    assert.match(s.attachmentNote, /only after/);
    assert.match(s.attachmentNote, /liability limit/);
    assert.equal(s.sourceIds.length >= 1, true);
    for (const id of s.sourceIds) assert.equal(Object.prototype.hasOwnProperty.call(SOURCES, id), true, `source ${id} is in the registry`);
  });

  t('it survives a JSON round trip unchanged, so it is pure data with no undefined, functions or shared state', () => {
    const s = stackOf(withAnswers({ umbrella_limit: 'not_sure', auto_liability: 'lower', umbrella_min_auto: 'not_sure', home_liability: '1m', umbrella_min_home: '500k' },
      ['auto', 'home', 'umbrella', 'motorcycle', 'boat']));
    assert.deepEqual(JSON.parse(JSON.stringify(s)), JSON.parse(serialize(s)));
    assert.equal(JSON.stringify(s).includes('undefined'), false);
  });

  t('evaluate() hands back the same model it gave the flags, as a fresh copy callers may change', () => {
    const answers = scenario;
    const fromEval = evaluate(answers).stack;
    assert.deepEqual(fromEval, stackOf(answers));
    fromEval.layers[0].status = 'ok';
    fromEval.sourceIds.push('mutated');
    assert.equal(evaluate(answers).stack.layers[0].status, 'below_required');
    assert.equal(evaluate(answers).stack.sourceIds.includes('mutated'), false);
  });

  t('every piece of text in the model is plain: no state name, no template token, no em or en dash, no placeholder', () => {
    const answerSets = [];
    for (const al of ['lower', '100_300', '500_500', 'not_sure']) {
      for (const am of ['100_300', '500_500', 'not_sure']) answerSets.push({ auto_liability: al, umbrella_min_auto: am, home_liability: al === 'lower' ? 'lower' : '1m', umbrella_min_home: am === 'not_sure' ? 'not_sure' : '500k' });
    }
    for (const a of answerSets) {
      const s = stackOf(withAnswers({ umbrella_limit: '2m', ...a }, ['auto', 'home', 'umbrella', 'motorcycle', 'boat']));
      const text = [];
      const walk = (v) => {
        if (typeof v === 'string') text.push(v);
        else if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') Object.keys(v).forEach((k) => walk(v[k]));
      };
      walk(s);
      for (const str of text) {
        assert.equal(STATE_NAMES.test(str), false, `names a state: ${str}`);
        assert.equal(/\{\{|\}\}|—|–|todo|tbd|lorem|home equity|next screen/i.test(str), false, `banned wording: ${str}`);
      }
    }
  });
});

// ------------------------------------------------------------------------------------------------------
suite('liabilityStack: status of an auto, motorcycle or boat layer over the whole preset ladder', (t) => {
  // rows: the user's limit; columns: what the umbrella requires (100/300, 250/500, 500/500). "lower" = "Lower than 100/300".
  const TABLE = {
    lower: ['below_required', 'below_required', 'below_required'],
    '100_300': ['ok', 'below_required', 'below_required'],
    '250_500': ['above_required', 'ok', 'below_required'],
    '500_500': ['above_required', 'above_required', 'ok'],
  };
  const REQS = ['100_300', '250_500', '500_500'];
  const CASES = [
    ['auto', 'auto_liability', 'umbrella_min_auto', ['auto', 'umbrella']],
    ['motorcycle', 'motorcycle_liability', 'umbrella_min_motorcycle', ['motorcycle', 'umbrella']],
    ['boat', 'boat_liability', 'umbrella_min_boat', ['boat', 'umbrella']],
  ];
  for (const [id, limitQ, reqQ, policies] of CASES) {
    t(`${id}: every limit against every requirement`, () => {
      for (const lim of Object.keys(TABLE)) {
        REQS.forEach((req, i) => {
          const s = stackOf({ policies, [limitQ]: lim, [reqQ]: req });
          assert.equal(layer(s, id).status, TABLE[lim][i], `${id} ${lim} against ${req}`);
        });
      }
    });
  }

  t('the "Lower than 100/300" rung is a ceiling, and nothing else is', () => {
    for (const lim of ['lower', '100_300', '250_500', '500_500']) {
      const l = layer(stackOf({ policies: ['auto', 'umbrella'], auto_liability: lim, umbrella_min_auto: '250_500' }), 'auto');
      assert.equal(l.limitIsCeiling, lim === 'lower', lim);
    }
    const lower = layer(stackOf({ policies: ['auto', 'umbrella'], auto_liability: 'lower', umbrella_min_auto: '100_300' }), 'auto');
    assert.equal(lower.limitLabel, 'Lower than 100/300');
    assert.equal(lower.limitText, 'lower than 100/300');
    assert.equal(lower.shortBy, null, 'we do not know how far below a ceiling is');
    assert.equal(lower.summary, 'Your auto liability limit is lower than 100/300, but your umbrella asks for 100/300.');
  });

  t('shortBy is the exact difference, per person and per accident, only when the layer is below and the limit is exact', () => {
    const s = (lim, req) => layer(stackOf({ policies: ['auto', 'umbrella'], auto_liability: lim, umbrella_min_auto: req }), 'auto').shortBy;
    assert.deepEqual(s('100_300', '500_500'), { perPerson: 400000, perAccident: 200000 });
    assert.deepEqual(s('100_300', '250_500'), { perPerson: 150000, perAccident: 200000 });
    assert.deepEqual(s('250_500', '500_500'), { perPerson: 250000, perAccident: 0 });
    assert.equal(s('250_500', '250_500'), null);
    assert.equal(s('500_500', '250_500'), null);
    assert.equal(s('lower', '500_500'), null);
  });

  t('the motorcycle and boat layers carry their own labels', () => {
    const s = stackOf({ policies: ['motorcycle', 'boat', 'umbrella'], motorcycle_liability: '100_300', umbrella_min_motorcycle: '250_500', boat_liability: '500_500', umbrella_min_boat: '250_500' });
    assert.equal(layer(s, 'motorcycle').label, 'Motorcycle liability');
    assert.equal(layer(s, 'motorcycle').policyText, 'motorcycle policy');
    assert.equal(layer(s, 'motorcycle').summary, 'Your motorcycle liability limit is 100/300, but your umbrella asks for 250/500.');
    assert.equal(layer(s, 'boat').label, 'Boat liability');
    assert.equal(layer(s, 'boat').summary, 'Your boat liability limit is 500/500, which is more than the 250/500 your umbrella asks for.');
  });
});

suite('liabilityStack: status of the home layer over the whole preset ladder', (t) => {
  // rows: the user's limit ("lower" = "Lower than $300,000"); columns: what the umbrella requires ($300,000, $500,000).
  const TABLE = {
    lower: ['below_required', 'below_required'],
    '300k': ['ok', 'below_required'],
    '500k': ['above_required', 'ok'],
    '1m': ['above_required', 'above_required'],
  };
  t('every home limit against every home requirement', () => {
    for (const lim of Object.keys(TABLE)) {
      ['300k', '500k'].forEach((req, i) => {
        const l = layer(stackOf({ policies: ['home', 'umbrella'], home_liability: lim, umbrella_min_home: req }), 'home');
        assert.equal(l.status, TABLE[lim][i], `home ${lim} against ${req}`);
      });
    }
  });
  t('values: a ceiling is the largest limit the rung can mean; shortBy is a plain number', () => {
    const lower = layer(stackOf({ policies: ['home', 'umbrella'], home_liability: 'lower', umbrella_min_home: '300k' }), 'home');
    assert.equal(lower.limit, 299999);
    assert.equal(lower.limitIsCeiling, true);
    assert.equal(lower.limitText, 'lower than $300,000');
    assert.equal(lower.shortBy, null);
    assert.equal(layer(stackOf({ policies: ['home', 'umbrella'], home_liability: '300k', umbrella_min_home: '500k' }), 'home').shortBy, 200000);
    assert.equal(layer(stackOf({ policies: ['home', 'umbrella'], home_liability: '300k', umbrella_min_home: '300k' }), 'home').summary,
      'Your home liability limit is $300,000, which matches the $300,000 your umbrella asks for.');
  });
});

suite('liabilityStack: Not sure and missing answers never produce a verdict', (t) => {
  t('a Not sure limit, a Not sure requirement or both leave the layer unknown, with the reason recorded', () => {
    const base = { policies: ['auto', 'umbrella'] };
    const limitNs = layer(stackOf({ ...base, auto_liability: 'not_sure', umbrella_min_auto: '250_500' }), 'auto');
    assert.deepEqual([limitNs.status, limitNs.limitAnswer, limitNs.requiredAnswer, limitNs.limit, limitNs.required], ['unknown', 'not_sure', 'known', null, { perPerson: 250000, perAccident: 500000 }]);
    assert.equal(limitNs.statusLabel, 'Not confirmed');
    assert.equal(limitNs.limitLabel, 'Not sure');
    assert.equal(limitNs.summary, 'You were not sure of your auto liability limit, so we cannot compare it with what your umbrella asks for.');

    const reqNs = layer(stackOf({ ...base, auto_liability: '100_300', umbrella_min_auto: 'not_sure' }), 'auto');
    assert.deepEqual([reqNs.status, reqNs.limitAnswer, reqNs.requiredAnswer, reqNs.required], ['unknown', 'known', 'not_sure', null]);
    assert.equal(reqNs.requiredLabel, 'Not sure');
    assert.equal(reqNs.summary, 'You were not sure what your umbrella asks for on your auto policy, so we cannot compare it with your 100/300 limit.');

    const both = layer(stackOf({ ...base, auto_liability: 'not_sure', umbrella_min_auto: 'not_sure' }), 'auto');
    assert.equal(both.status, 'unknown');
    assert.equal(both.summary, 'You were not sure of your auto liability limit or of what your umbrella asks for, so we cannot compare them.');
  });

  t('a "Lower than" limit with a Not sure requirement is unknown too (we do not guess the requirement)', () => {
    const l = layer(stackOf({ policies: ['home', 'umbrella'], home_liability: 'lower', umbrella_min_home: 'not_sure' }), 'home');
    assert.equal(l.status, 'unknown');
    assert.equal(l.limitIsCeiling, true);
  });

  t('Not sure findings name which parts are not sure; unanswered parts are not findings', () => {
    const s = stackOf({ policies: ['auto', 'home', 'motorcycle', 'umbrella'],
      auto_liability: 'not_sure', umbrella_min_auto: '250_500',
      home_liability: '300k', umbrella_min_home: 'not_sure',
      motorcycle_liability: 'not_sure', umbrella_min_motorcycle: 'not_sure' });
    assert.deepEqual(s.findings.map((f) => [f.id, f.type, f.layer, f.notSure]), [
      ['auto-unconfirmed', 'unconfirmed', 'auto', ['limit']],
      ['home-unconfirmed', 'unconfirmed', 'home', ['required']],
      ['motorcycle-unconfirmed', 'unconfirmed', 'motorcycle', ['limit', 'required']],
    ]);
    const unanswered = stackOf({ policies: ['auto', 'umbrella'], auto_liability: 'not_sure' });
    assert.deepEqual(unanswered.findings.map((f) => [f.layer, f.notSure]), [['auto', ['limit']]]);
    assert.equal(layer(unanswered, 'auto').requiredAnswer, 'unanswered');
    assert.equal(layer(unanswered, 'auto').status, 'unknown');
  });

  t('a Not sure umbrella size does not touch the layers or create a finding (that is the adequacy story)', () => {
    const known = stackOf({ ...BASE, umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '300k' });
    const unsure = stackOf({ ...BASE, umbrella_limit: 'not_sure', auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '300k' });
    assert.deepEqual(unsure.layers, known.layers);
    assert.deepEqual(unsure.findings, known.findings);
    assert.deepEqual(unsure.umbrella, { id: 'umbrella', label: 'Umbrella', limit: null, limitLabel: 'Not sure', limitAnswer: 'not_sure' });
  });

  t('the umbrella size never changes any layer: only the limits and the requirement answers do', () => {
    const layersFor = (u) => stackOf({ ...BASE, umbrella_limit: u, auto_liability: '250_500', umbrella_min_auto: '100_300', home_liability: 'lower', umbrella_min_home: '500k' }).layers;
    assert.deepEqual(layersFor('2m'), layersFor('1m'));
    assert.deepEqual(layersFor('5m'), layersFor('1m'));
  });
});

// ------------------------------------------------------------------------------------------------------
suite('liabilityStack: counts and findings', (t) => {
  t('counts add up to the number of layers and match the statuses', () => {
    const s = stackOf({ policies: ['auto', 'home', 'motorcycle', 'boat', 'umbrella'],
      auto_liability: '250_500', umbrella_min_auto: '250_500',
      home_liability: '1m', umbrella_min_home: '500k',
      motorcycle_liability: 'lower', umbrella_min_motorcycle: '100_300',
      boat_liability: 'not_sure', umbrella_min_boat: '100_300' });
    assert.deepEqual(s.counts, { ok: 1, below_required: 1, above_required: 1, unknown: 1 });
    assert.equal(Object.values(s.counts).reduce((a, b) => a + b, 0), s.layers.length);
    assert.deepEqual(s.layers.map((l) => l.status), ['ok', 'above_required', 'below_required', 'unknown']);
  });

  t('findings come in layer order and carry the display text flags need', () => {
    const s = stackOf({ policies: ['home', 'umbrella'], home_liability: 'lower', umbrella_min_home: '500k' });
    assert.deepEqual(s.findings, [{
      id: 'home-below-required', type: 'below_required', layer: 'home', layerLabel: 'Home liability', policyText: 'home policy',
      limitLabel: 'Lower than $300,000', limitText: 'lower than $300,000', limitIsCeiling: true,
      requiredLabel: '$500,000', requiredText: '$500,000', notSure: [],
    }]);
  });

  t('a met requirement (ok) produces no finding', () => {
    assert.deepEqual(stackOf({ policies: ['home', 'umbrella'], home_liability: '500k', umbrella_min_home: '500k' }).findings, []);
  });

  t('stackFindings filters by type, in order, and is safe on null or odd input', () => {
    const s = stackOf({ policies: ['auto', 'home', 'umbrella'], auto_liability: '100_300', umbrella_min_auto: '500_500', home_liability: '300k', umbrella_min_home: '500k' });
    assert.deepEqual(stackFindings(s, 'below_required').map((f) => f.layer), ['auto', 'home']);
    assert.deepEqual(stackFindings(s, 'above_required'), []);
    assert.deepEqual(stackFindings(null, 'below_required'), []);
    assert.deepEqual(stackFindings(undefined, 'below_required'), []);
    assert.deepEqual(stackFindings({}, 'below_required'), []);
    assert.deepEqual(stackFindings({ findings: 'nope' }, 'below_required'), []);
  });
});

// ------------------------------------------------------------------------------------------------------
suite('liabilityStack: comparison rules, tested on hand-made contexts', (t) => {
  const ctxFor = (limit, required) => fakeCtx(['auto', 'umbrella'], { umbrella_limit: money(1000000, '$1 million'), auto_liability: limit, umbrella_min_auto: required });

  t('split limits: below if either number is lower, above only if neither is lower and one is higher', () => {
    const status = (l, r) => computeLiabilityStack(ctxFor(l, r)).layers[0].status;
    assert.equal(status(split(250000, 500000), split(250000, 500000)), 'ok');
    assert.equal(status(split(100000, 500000), split(250000, 300000)), 'below_required', 'per person lower even though per accident is higher');
    assert.equal(status(split(300000, 300000), split(250000, 500000)), 'below_required', 'per accident lower even though per person is higher');
    assert.equal(status(split(300000, 500000), split(250000, 500000)), 'above_required');
    assert.equal(status(split(250000, 600000), split(250000, 500000)), 'above_required');
  });

  t('a ceiling limit is below only when it is certainly below; otherwise we cannot tell', () => {
    const ceilingSplit = split(99999, 299999, 'Lower than 100/300', LOWER_OPTION_ID);
    const status = (l, r) => computeLiabilityStack(ctxFor(l, r)).layers[0];
    assert.equal(status(ceilingSplit, split(100000, 300000)).status, 'below_required');
    assert.equal(status(ceilingSplit, split(50000, 100000)).status, 'unknown', 'a requirement under the ceiling: the real limit could be on either side');
    assert.equal(status(ceilingSplit, split(99999, 299999)).status, 'unknown', 'equal to the ceiling is not enough to say ok');
    assert.equal(status(ceilingSplit, split(50000, 100000)).limitIsCeiling, true);
  });

  t('an unreadable value (missing, wrong shape, negative, not a number) is unknown and never throws', () => {
    const bad = [
      { id: 'x', label: 'No value' },
      { id: 'x', label: 'String value', value: '250/500' },
      { id: 'x', label: 'Number for a split', value: 250000 },
      { id: 'x', label: 'Half a split', value: { perPerson: 250000 } },
      { id: 'x', label: 'Negative', value: { perPerson: -1, perAccident: 5 } },
      { id: 'x', label: 'Not finite', value: { perPerson: Infinity, perAccident: 5 } },
      { id: 'x', label: 'NaN', value: { perPerson: NaN, perAccident: 5 } },
      { id: 'x', label: 'Array', value: [1, 2] },
      { id: 'x', label: 'Null', value: null },
    ];
    for (const b of bad) {
      const s = computeLiabilityStack(ctxFor(b, split(250000, 500000)));
      assert.equal(s.layers[0].status, 'unknown', b.label);
      assert.equal(s.layers[0].limitAnswer, 'unreadable', b.label);
      assert.equal(s.layers[0].limit, null, b.label);
      assert.deepEqual(s.findings, [], b.label);
      const s2 = computeLiabilityStack(ctxFor(split(250000, 500000), b));
      assert.equal(s2.layers[0].requiredAnswer, 'unreadable', b.label);
    }
  });

  t('the home layer reads plain numbers and rejects a split value', () => {
    const homeCtx = (l, r) => fakeCtx(['home', 'umbrella'], { home_liability: l, umbrella_min_home: r });
    assert.equal(computeLiabilityStack(homeCtx(money(300000), money(300000))).layers[0].status, 'ok');
    assert.equal(computeLiabilityStack(homeCtx(money(250000), money(300000))).layers[0].status, 'below_required');
    assert.equal(computeLiabilityStack(homeCtx(money(0), money(300000))).layers[0].status, 'below_required', 'zero is a real (very low) limit');
    assert.equal(computeLiabilityStack(homeCtx(split(300000, 300000), money(300000))).layers[0].limitAnswer, 'unreadable');
  });

  t('the stack does not change the context it reads, and each call returns a new model', () => {
    const frozen = ctxFor(deepFreeze(copy(split(100000, 300000))), deepFreeze(copy(split(250000, 500000))));
    const a = computeLiabilityStack(frozen);
    const b = computeLiabilityStack(frozen);
    assert.deepEqual(a, b);
    assert.equal(a === b, false, 'a new model each time');
    a.layers[0].status = 'ok';
    assert.equal(computeLiabilityStack(frozen).layers[0].status, 'below_required');
  });
});

// ------------------------------------------------------------------------------------------------------
suite('liabilityStack: it stays in step with the question catalog', (t) => {
  const q = (id) => QUESTIONS.find((x) => x.id === id);
  const LIMIT_QS = ['auto_liability', 'motorcycle_liability', 'boat_liability', 'home_liability'];
  const REQ_QS = ['umbrella_min_auto', 'umbrella_min_motorcycle', 'umbrella_min_boat', 'umbrella_min_home'];

  t('every limit question starts with the "lower" rung (the ceiling convention) and no requirement question has one', () => {
    assert.equal(LOWER_OPTION_ID, 'lower');
    for (const id of LIMIT_QS) assert.equal(q(id).options[0].id, LOWER_OPTION_ID, `${id} first option`);
    for (const id of REQ_QS) assert.equal(q(id).options.some((o) => o.id === LOWER_OPTION_ID), false, `${id} has no lower rung`);
  });

  t('the "lower" rung is below every requirement the matching question offers', () => {
    const below = (a, b) => (typeof a === 'number' ? a < b : a.perPerson < b.perPerson && a.perAccident < b.perAccident);
    const pairs = [['auto_liability', 'umbrella_min_auto'], ['motorcycle_liability', 'umbrella_min_motorcycle'], ['boat_liability', 'umbrella_min_boat'], ['home_liability', 'umbrella_min_home']];
    for (const [lq, rq] of pairs) {
      for (const r of q(rq).options) assert.equal(below(q(lq).options[0].value, r.value), true, `${lq} lower vs ${rq} ${r.id}`);
    }
  });

  t('the layer questions exist and are visible exactly when the umbrella and the matching policy are held', () => {
    const session = createSession(CATALOG);
    const byPolicy = { auto: ['auto_liability', 'umbrella_min_auto'], home: ['home_liability', 'umbrella_min_home'], motorcycle: ['motorcycle_liability', 'umbrella_min_motorcycle'], boat: ['boat_liability', 'umbrella_min_boat'] };
    for (const policy of Object.keys(byPolicy)) {
      for (const id of byPolicy[policy]) {
        assert.equal(Boolean(q(id)), true, `${id} exists`);
        assert.equal(session.isVisible(id, { policies: [policy, 'umbrella'] }), true, `${id} visible with ${policy} and umbrella`);
        assert.equal(session.isVisible(id, { policies: [policy] }), false, `${id} hidden without the umbrella`);
        assert.equal(session.isVisible(id, { policies: ['umbrella'] }), false, `${id} hidden without ${policy}`);
      }
    }
  });

  t('the whole ladder, every combination, evaluates through the real catalog without throwing', () => {
    const autoLimits = ['lower', '100_300', '250_500', '500_500', 'not_sure'];
    const autoReqs = ['100_300', '250_500', '500_500', 'not_sure'];
    const homeLimits = ['lower', '300k', '500k', '1m', 'not_sure'];
    const homeReqs = ['300k', '500k', 'not_sure'];
    let n = 0;
    for (const u of ['1m', '2m', '5m', 'not_sure']) for (const al of autoLimits) for (const ar of autoReqs) for (const hl of homeLimits) for (const hr of homeReqs) {
      const s = stackOf({ ...BASE, umbrella_limit: u, auto_liability: al, umbrella_min_auto: ar, home_liability: hl, umbrella_min_home: hr });
      assert.equal(s.layers.length, 2);
      n += 1;
    }
    assert.equal(n, 1200);
  });
});

// ------------------------------------------------------------------------------------------------------
suite('liabilityStack: snapshot over every preset combination (tests/snapshots/stack-matrix.snap.mjs)', (t) => {
  // Regenerate deliberately with scripts/update-snapshots.sh; any diff must be explained by the change (tests/snapshots/README.md).
  t('the stack models over the whole ladder equal the committed snapshot', () => {
    assertSnapshot(buildStackMatrix(), STACK_MATRIX, 'stack-matrix');
  });
  t('the snapshot really covers the matrix: 1,200 core combinations, each preset layer once, every umbrella size', () => {
    assert.equal(Object.keys(STACK_MATRIX.combinations).length, 1200);
    assert.equal(Object.keys(STACK_MATRIX.layers.auto).length, 20, 'auto: 5 limits x 4 requirements');
    assert.equal(Object.keys(STACK_MATRIX.layers.home).length, 15, 'home: 5 limits x 3 requirements');
    assert.equal(Object.keys(STACK_MATRIX.layers.motorcycle).length, 20);
    assert.equal(Object.keys(STACK_MATRIX.layers.boat).length, 20);
    assert.deepEqual(Object.keys(STACK_MATRIX.umbrellas).sort(), ['1m', '2m', '5m', 'not_sure']);
    assert.equal(STACK_MATRIX.umbrellas.not_sure.limit, null);
    assert.equal(STACK_MATRIX.umbrellas['5m'].limit, 5000000);
  });
  t('every status appears in the snapshot, so a rule that stops producing one is noticed', () => {
    const seen = {};
    for (const l of Object.values(STACK_MATRIX.layers.auto).concat(Object.values(STACK_MATRIX.layers.home))) seen[l.status] = true;
    assert.deepEqual(Object.keys(seen).sort(), ['above_required', 'below_required', 'ok', 'unknown']);
  });
});
