// Story S10: health flags and the deductible-vs-cushion flags (public/js/overlap/data/flags/health.mjs and
// deductible.mjs), checked against the REAL catalog: the real questions, the real source registry and the real
// engine. Other stories add other flags to the same catalog in parallel, so nothing here pins the whole result
// of evaluate(); every check looks only at the seven flags owned by S10.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { evaluate, createContext } from '../../public/js/overlap/engine/evaluate.mjs';
import { validateCatalog } from '../../public/js/overlap/engine/validate.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import HEALTH_FLAGS from '../../public/js/overlap/data/flags/health.mjs';
import DEDUCTIBLE_FLAGS from '../../public/js/overlap/data/flags/deductible.mjs';
import PLAN from '../fixtures/flagPlan.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';

// ---------------------------------------------------------------------------------------------------------
// Constants and helpers

const MEDPAY = 'health-auto-medpay-overlap';
const SUPP = 'health-supplemental-boltons';
const HSA = 'health-hsa-nudge';
const SHORT = 'health-short-term-plan-alongside';
const D_AUTO = 'deductible-exceeds-cushion-auto';
const D_HOME = 'deductible-exceeds-cushion-home';
const D_HEALTH = 'deductible-exceeds-cushion-health';
const MY_IDS = [MEDPAY, SUPP, HSA, SHORT, D_AUTO, D_HOME, D_HEALTH];
const ALL_FLAGS = [...HEALTH_FLAGS, ...DEDUCTIBLE_FLAGS];
const flagById = (id) => ALL_FLAGS.find((f) => f.id === id);

const BUCKET_NAMES = ['raise', 'drop', 'question'];
const BANDS = ['under_1000', '1000_4999', '5000_plus'];
const SUPP_TYPES = ['accident', 'critical_illness', 'hospital_indemnity', 'cancer'];

// Plain answers for a household that holds some of auto, home, health: Q1 (`policies`) holds the ticks, every
// other key is the user's own tap on a closed list.
const answersFor = (held, o) => ({ ...(o || {}), policies: held.slice() });
const run = (held, o) => evaluate(answersFor(held, o));

function findFlag(result, id) {
  for (const bucket of BUCKET_NAMES) {
    const hit = result.flags[bucket].find((f) => f.id === id);
    if (hit) return hit;
  }
  return undefined;
}
const flagFor = (id, held, o) => findFlag(run(held, o), id);
const fires = (id, held, o) => flagFor(id, held, o) !== undefined;
const mineIn = (result, bucket) => result.flags[bucket].map((f) => f.id).filter((id) => MY_IDS.includes(id));

// What a flag's applies() returns for the given household (without rendering).
function appliesFor(id, held, o) {
  return flagById(id).applies(createContext(answersFor(held, o)));
}

const textOf = (f) => [f.title, f.background, f.ask, f.reason].join('\n');
const moneyIn = (s) => (s.match(/\$\d{1,3}(,\d{3})*/g) || []);

// Every answer set that makes a flag fire, labelled, so the copy rules can be applied to every variant.
const BAND_NAMES = ['under_1000', '1000_4999', '5000_plus'];
function medpayVariants() {
  return ['yes', 'not_sure'].map((v) => ({ label: `auto_medpay ${v}`, held: ['health', 'auto'], o: { auto_medpay: v } }));
}
function suppVariants() {
  const lists = [['accident'], ['critical_illness'], ['hospital_indemnity'], ['cancer'], SUPP_TYPES, ['accident', 'cancer'], ['not_sure']];
  const cushions = [undefined, 'under_1000', '1000_4999', '5000_plus', 'not_sure'];
  const out = [];
  for (const list of lists) {
    for (const c of cushions) {
      out.push({ label: `supplemental ${list.join('+')} cushion ${c}`, held: ['health'], o: Object.assign({ health_supplemental: list }, c ? { emergency_cushion: c } : {}) });
    }
  }
  return out;
}
const hsaVariants = () => ['hdhp_hsa', 'hdhp_only'].map((v) => ({ label: `hsa ${v}`, held: ['health'], o: { health_hsa: v } }));
const shortVariants = () => [{ label: 'short term yes', held: ['health'], o: { health_short_term: 'yes' } }];
function deductibleVariants(id) {
  const cfg = { [D_AUTO]: ['auto', 'deductible_auto'], [D_HOME]: ['home', 'deductible_home'], [D_HEALTH]: ['health', 'deductible_health'] }[id];
  const out = [];
  for (const d of BAND_NAMES) {
    for (const c of [...BAND_NAMES, 'not_sure']) {
      out.push({ label: `${id} deductible ${d} cushion ${c}`, held: [cfg[0]], o: { [cfg[1]]: d, emergency_cushion: c } });
    }
  }
  return out;
}
const VARIANTS = {
  [MEDPAY]: medpayVariants(),
  [SUPP]: suppVariants(),
  [HSA]: hsaVariants(),
  [SHORT]: shortVariants(),
  [D_AUTO]: deductibleVariants(D_AUTO),
  [D_HOME]: deductibleVariants(D_HOME),
  [D_HEALTH]: deductibleVariants(D_HEALTH),
};

// Only the variants that actually fire, rendered through the real engine: [{ id, label, flag }].
function renderedVariants() {
  const out = [];
  for (const id of MY_IDS) {
    for (const v of VARIANTS[id]) {
      const flag = flagFor(id, v.held, v.o);
      if (flag) out.push({ id, label: v.label, flag });
    }
  }
  return out;
}

const STATES = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington state|west virginia|wisconsin|wyoming)\b/i;

// ---------------------------------------------------------------------------------------------------------

suite('S10 flags: plan, catalog and sources', (t) => {
  const planRows = PLAN.flags.filter((f) => f.story === 'S10');

  t('the flags in health.mjs and deductible.mjs are exactly the planned S10 rows (ids, files, buckets, kinds, domains, priorities)', () => {
    assert.deepEqual(planRows.map((r) => r.id).sort(), [...MY_IDS].sort(), 'the plan lists the seven S10 flags');
    assert.deepEqual(HEALTH_FLAGS.map((f) => f.id).sort(), planRows.filter((r) => r.file === 'health').map((r) => r.id).sort(), 'health.mjs');
    assert.deepEqual(DEDUCTIBLE_FLAGS.map((f) => f.id).sort(), planRows.filter((r) => r.file === 'deductible').map((r) => r.id).sort(), 'deductible.mjs');
    for (const row of planRows) {
      const flag = flagById(row.id);
      assert.ok(flag, `${row.id} exists`);
      assert.equal(flag.bucket, row.bucket, `${row.id} bucket`);
      assert.equal(flag.kind, row.kind, `${row.id} kind`);
      assert.equal(flag.domain, row.domain, `${row.id} domain`);
      assert.equal(flag.priority, row.priority, `${row.id} priority`);
      assert.equal(typeof flag.applies, 'function', `${row.id} applies`);
    }
  });

  t('the plan has the expected buckets: seven Question flags, no Raise and no Drop', () => {
    assert.deepEqual(planRows.map((r) => `${r.id}:${r.bucket}`).sort(), [
      `${D_AUTO}:question`, `${D_HEALTH}:question`, `${D_HOME}:question`, `${MEDPAY}:question`,
      `${HSA}:question`, `${SHORT}:question`, `${SUPP}:question`,
    ].sort());
  });

  t('priorities sit in the S10 range 400 to 499 and are unique', () => {
    const seen = {};
    for (const f of ALL_FLAGS) {
      assert.ok(f.priority >= 400 && f.priority <= 499, `${f.id} priority ${f.priority}`);
      assert.equal(seen[f.priority], undefined, `duplicate priority ${f.priority}`);
      seen[f.priority] = true;
    }
  });

  t('the real catalog contains the seven flags and passes validateCatalog', () => {
    for (const id of MY_IDS) assert.ok(CATALOG.flags.some((f) => f.id === id), `${id} is in the catalog`);
    const verdict = validateCatalog(CATALOG);
    assert.deepEqual(verdict.errors, [], 'validateCatalog errors');
    assert.equal(verdict.ok, true);
  });

  t('every flag has text, at least one source, and every source id resolves in the registry', () => {
    for (const f of ALL_FLAGS) {
      assert.ok(Array.isArray(f.sourceIds) && f.sourceIds.length >= 1, `${f.id} needs a source`);
      assert.equal(new Set(f.sourceIds).size, f.sourceIds.length, `${f.id} lists a source twice`);
      for (const sid of f.sourceIds) {
        assert.ok(Object.prototype.hasOwnProperty.call(SOURCES, sid), `${f.id} cites unknown source ${sid}`);
      }
    }
  });

  t('each flag cites every source its plan row lists, except where DECISIONS S10 says otherwise (home skips the auto-only NAIC page)', () => {
    for (const row of planRows) {
      const flag = flagById(row.id);
      const expected = row.id === D_HOME ? row.sourceIds.filter((s) => s !== 'naic-tips-saving-on-auto-insurance') : row.id === SUPP ? row.sourceIds.filter((s) => s !== 'irs-pub-969-2025') : row.sourceIds;
      for (const sid of expected) assert.includes(flag.sourceIds, sid, `${row.id} should cite ${sid}`);
    }
  });

  t('the rendered result carries the cited sources with publisher, title, https url and last-verified date', () => {
    for (const { id, flag } of renderedVariants()) {
      assert.deepEqual(flag.sources.map((s) => s.id), flagById(id).sourceIds, `${id} source order`);
      for (const s of flag.sources) {
        assert.deepEqual(Object.keys(s), ['id', 'publisher', 'title', 'url', 'lastVerified']);
        assert.match(s.url, /^https:\/\/[a-z0-9.-]+\.[a-z]+\//i);
        assert.match(s.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
        assert.deepEqual(s, Object.assign({}, SOURCES[s.id]), `${id} source ${s.id} equals the registry entry`);
      }
    }
  });

  t('only authority hosts are cited (no insurers, agencies, comparison sites, or Consumer Reports)', () => {
    const allowed = /^https:\/\/([a-z0-9-]+\.)*(iii\.org|naic\.org|insureuonline\.org|irs\.gov|healthcare\.gov|cms\.gov|hhs\.gov|dol\.gov|ftc\.gov|federalreserve\.gov|kff\.org)\//i;
    for (const f of ALL_FLAGS) {
      for (const sid of f.sourceIds) assert.match(SOURCES[sid].url, allowed, `${f.id}: ${sid}`);
    }
  });
});

suite('health-auto-medpay-overlap', (t) => {
  t('fires for a Yes and for Not sure when the household holds health and auto', () => {
    assert.equal(fires(MEDPAY, ['health', 'auto'], { auto_medpay: 'yes' }), true);
    assert.equal(fires(MEDPAY, ['health', 'auto'], { auto_medpay: 'not_sure' }), true);
  });

  t('is silent for No, for no answer, and when health or auto is not held', () => {
    assert.equal(fires(MEDPAY, ['health', 'auto'], { auto_medpay: 'no' }), false);
    assert.equal(fires(MEDPAY, ['health', 'auto'], {}), false);
    assert.equal(fires(MEDPAY, ['auto'], { auto_medpay: 'yes' }), false, 'no health plan: the question is hidden and the answer pruned');
    assert.equal(fires(MEDPAY, ['health'], { auto_medpay: 'yes' }), false, 'no auto policy');
    assert.equal(fires(MEDPAY, ['home'], { auto_medpay: 'yes' }), false);
  });

  t('applies() reads only the answer (pure): the same context gives the same verdict, and Yes is not strong', () => {
    const a = appliesFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'yes' });
    const b = appliesFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'yes' });
    assert.deepEqual(a, b);
    assert.ok(a && a !== true ? (a.emphasis === undefined || a.emphasis === 'normal') : true, 'normal emphasis');
    assert.equal(flagFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'yes' }).emphasis, 'normal');
    assert.equal(flagFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'not_sure' }).emphasis, 'normal');
  });

  t('Yes and Not sure get different text; Not sure first asks whether the coverage exists', () => {
    const yes = flagFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'yes' });
    const unsure = flagFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'not_sure' });
    assert.notEqual(yes.background, unsure.background);
    assert.notEqual(yes.ask, unsure.ask);
    assert.notEqual(yes.reason, unsure.reason);
    assert.match(unsure.ask, /whether your policy includes/i);
    assert.match(unsure.background, /declarations page/i, 'tells them where to look');
    assert.equal(yes.title, unsure.title);
    assert.equal(yes.bucket, 'question');
    assert.equal(yes.kind, 'cross-policy');
    assert.equal(yes.domain, 'health');
  });

  t('never says "whoever was at fault" or "regardless of fault" about MedPay; no-fault wording only for states with no-fault rules', () => {
    // The NAIC page says "regardless of who's at fault" only for PIP in no-fault states, and the III page says nothing
    // about fault (DECISIONS S10-9). A fault statement is allowed only inside a sentence about no-fault rules.
    for (const { flag } of renderedVariants().filter((v) => v.id === MEDPAY)) {
      const text = textOf(flag);
      assert.equal(/whoever|regardless of (who|fault)|at fault|not dependent on fault/i.test(text), false, 'no universal fault claim');
      for (const x of text.split('. ').filter((p) => /no matter who|who caused/i.test(p))) {
        assert.match(x, /^In states with no-fault rules, /, `unqualified fault statement: ${x}`);
      }
    }
    const yes = flagFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'yes' });
    assert.match(yes.background, /pays medical bills for you and your passengers after a crash\. /);
    assert.match(yes.background, /In states with no-fault rules, your own auto insurer pays for these injuries no matter who caused the crash\./);
    const unsure = flagFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'not_sure' });
    assert.equal(/who caused|no-fault/i.test(unsure.background), false, 'Not sure makes no fault claim');
  });

  t('wording: asks both insurers; says the order depends on state rules and policy wording; some states require it (Yes and Not sure)', () => {
    const yes = flagFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'yes' });
    assert.match(yes.ask, /auto insurer/i);
    assert.match(yes.ask, /health insurer/i);
    assert.match(yes.ask, /coordinate/i, 'matches the existing app finding: ask about coordinating with the health plan');
    assert.match(yes.ask, /your state's department of insurance/i, 'points to the state regulator without naming a state');
    const unsure = flagFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'not_sure' });
    assert.match(unsure.ask, /auto insurer/i);
    assert.match(unsure.ask, /health insurer/i);
    for (const f of [yes, unsure]) {
      assert.match(f.background, /overlap/i);
      assert.match(f.background, /depends on your state's rules and the exact wording of both policies/i);
      assert.match(f.background, /some states require this coverage/i);
      assert.match(f.background, /may not be able to drop it/i, 'consistent with the existing app: where it is required it cannot be dropped');
    }
  });

  t('home medical payments to others is background only, described as covering guests and never as a duplicate', () => {
    const yes = flagFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'yes' });
    assert.match(yes.background, /medical payments to others/i);
    assert.match(yes.background, /guests/i);
    assert.match(yes.background, /not for your own household/i);
    assert.match(yes.background, /not part of this overlap/i);
  });

  t('no health or deductible flag says which coverage or plan pays first or second', () => {
    for (const { id, label, flag } of renderedVariants()) {
      assert.equal(/\b(pays?|paid|goes?|comes?) (first|second)\b|\b(primary|secondary) (coverage|plan|payer)\b/i.test(textOf(flag)), false, `${id} (${label})`);
    }
  });

  t('never says which coverage pays first, that MedPay pays a health deductible, or that it is simply required or optional', () => {
    for (const { flag } of renderedVariants().filter((v) => v.id === MEDPAY)) {
      const s = textOf(flag);
      assert.equal(/\b(pays?|paid|goes?|comes?) (first|second)\b/i.test(s), false, 'no payment order');
      assert.equal(/\b(primary|secondary)\b/i.test(s), false);
      assert.equal(/\b(deductibles?|copays?|co-pays?)\b/i.test(s), false, 'MedPay is never tied to health deductibles or copays');
      assert.equal(/(medpay|medical payments|pip)[^.]{0,40}\bis (required|optional|mandatory)\b/i.test(s), false);
      const withoutNegation = s.replace(/may not be able to drop it/gi, '');
      assert.equal(/\b(drop|cancel|cut|remove) (it|this|that|your)\b|\b(you can|you should|consider|try to) (drop|cancel)\b/i.test(withoutNegation), false, 'never tells the user to drop it');
    }
  });

  t('the MedPay flag only asks about both insurers: where the coverage is required it says the user may not be able to drop it, and it asks about coordinating it', () => {
    // The flag is state-neutral, so it cannot say which states require the coverage: it says the user may not be able
    // to drop it, and asks the insurer about coordination, without telling anyone to drop it.
    const f = flagFor(MEDPAY, ['health', 'auto'], { auto_medpay: 'yes' });
    assert.match(f.background, /may not be able to drop it/i);
    assert.match(f.ask, /coordinate/i);
    assert.equal(/\bcan drop\b|\bshould drop\b|\bdrop (it|this)\b(?!.*\bnot be able\b)/i.test(f.background.replace(/may not be able to drop it/gi, '')), false);
  });

  t('a stale Yes is pruned when the gate closes: the answer cannot fire the flag for a household without health', () => {
    const answers = answersFor(['auto'], { auto_medpay: 'yes' });
    assert.equal(findFlag(evaluate(answers), MEDPAY), undefined);
  });
});

suite('health-supplemental-boltons', (t) => {
  t('fires for each bolt-on type on its own, for several together, and softly for Not sure', () => {
    for (const type of SUPP_TYPES) assert.equal(fires(SUPP, ['health'], { health_supplemental: [type] }), true, type);
    assert.equal(fires(SUPP, ['health'], { health_supplemental: SUPP_TYPES }), true);
    assert.equal(fires(SUPP, ['health'], { health_supplemental: ['not_sure'] }), true);
  });

  t('is silent for None, for no answer, and without a health plan', () => {
    assert.equal(fires(SUPP, ['health'], { health_supplemental: ['none'] }), false);
    assert.equal(fires(SUPP, ['health'], {}), false);
    assert.equal(fires(SUPP, ['auto', 'home'], { health_supplemental: ['accident'] }), false);
  });

  t('emphasis is strong only when a bolt-on is held and the cushion is $5,000 or more', () => {
    const emphasis = (list, cushion) => flagFor(SUPP, ['health'], Object.assign({ health_supplemental: list }, cushion ? { emergency_cushion: cushion } : {})).emphasis;
    assert.equal(emphasis(['accident'], '5000_plus'), 'strong');
    assert.equal(emphasis(SUPP_TYPES, '5000_plus'), 'strong');
    assert.equal(emphasis(['cancer'], '1000_4999'), 'normal');
    assert.equal(emphasis(['cancer'], 'under_1000'), 'normal');
    assert.equal(emphasis(['cancer'], 'not_sure'), 'normal');
    assert.equal(emphasis(['cancer'], undefined), 'normal');
    assert.equal(emphasis(['not_sure'], '5000_plus'), 'normal', 'the softer Not sure check is never strong');
  });

  t('the cushion question is only read; without a deductible-section answer the flag still fires at normal emphasis', () => {
    const f = flagFor(SUPP, ['health'], { health_supplemental: ['hospital_indemnity'] });
    assert.equal(f.emphasis, 'normal');
  });

  t('the text names exactly the policies the user ticked', () => {
    const one = flagFor(SUPP, ['health'], { health_supplemental: ['critical_illness'] });
    assert.match(one.background, /critical illness insurance/);
    assert.equal(/accident|cancer|hospital indemnity/i.test(one.background.split('. ')[0]), false, 'only the ticked kind is named in the lead sentence');
    const two = flagFor(SUPP, ['health'], { health_supplemental: ['accident', 'cancer'] });
    assert.match(two.background, /accident and cancer insurance/);
    const four = flagFor(SUPP, ['health'], { health_supplemental: SUPP_TYPES });
    assert.match(four.background, /accident, critical illness, hospital indemnity and cancer insurance/);
  });

  t('Not sure gets its own wording: look at the pay stub, then ask what each policy pays', () => {
    const f = flagFor(SUPP, ['health'], { health_supplemental: ['not_sure'] });
    assert.match(f.ask, /pay stub/i);
    assert.match(f.background, /paycheck deduction/i);
    assert.notEqual(f.reason, flagFor(SUPP, ['health'], { health_supplemental: ['cancer'] }).reason);
  });

  t('states only the sourced definitions: indemnity coverage pays a set cash amount and is not a substitute for comprehensive coverage; asks whether the payout is worth the premium', () => {
    const f = flagFor(SUPP, ['health'], { health_supplemental: ['accident'] });
    assert.match(f.background, /Hospital indemnity and other fixed indemnity policies pay you a set amount of cash, and federal regulators say that kind of coverage is not a substitute for comprehensive health coverage\./);
    assert.match(f.background, /add-ons that fall outside most of the rules for major medical plans/i, 'the excepted-benefit point');
    assert.match(f.ask, /worth the cost|worth the premium/i);
    assert.match(f.ask, /premiums/i);
    assert.match(f.ask, /set amount or repays specific costs/i, 'asks how the policy pays instead of assuming');
    assert.match(f.background, /limited-benefit or discount plans/i, 'the FTC caution about look-alike plans');
  });

  t('the "not a substitute" statement and the set-cash description belong to indemnity coverage only, never to accident, cancer or critical illness policies', () => {
    // CMS says this only about hospital indemnity and other fixed indemnity coverage; the Labor/HHS/Treasury FAQ
    // names accident, cancer and critical illness only as excepted-benefit categories (DECISIONS S10-9).
    const sentences = (text) => text.split('. ').map((x) => (x.endsWith('.') ? x : `${x}.`));
    const substitute = /not a substitute|fixed-payout|regulators say/i;
    const setCash = /set amount of cash|set cash|cash payout|pays? you cash/i;
    const rendered = renderedVariants().filter((v) => v.id === SUPP);
    assert.ok(rendered.length > 0);
    for (const { label, flag } of rendered) {
      const parts = sentences(flag.background);
      const hits = parts.filter((x) => substitute.test(x));
      assert.equal(hits.length, 1, `${label}: exactly one sentence carries the regulators' statement`);
      assert.match(hits[0], /^Hospital indemnity and other fixed indemnity policies pay you a set amount of cash, and federal regulators say that kind of coverage is not a substitute for comprehensive health coverage\.$/, label);
      assert.equal(/accident|cancer|critical illness/i.test(hits[0]), false, `${label}: the statement is not attributed to other kinds`);
      assert.equal(/\b(these|those) (extras|policies|plans)\b[^.]*\b(pay|pays) (you )?a set\b/i.test(flag.background), false, `${label}: no blanket "these pay a set amount"`);
      // The only other place a set cash amount appears is the hedged "check how yours pays" pair of sentences.
      const hedged = 'Accident, cancer and critical illness policies are different products. They may pay you a set amount of cash when a covered event happens or they may work another way, so check how yours pays.';
      const rest = flag.background.replace(hits[0], '').replace(hedged, '');
      assert.equal(setCash.test(rest), false, `${label}: an unhedged set-cash claim remains: ${rest}`);
    }
    // A hospital-indemnity-only household is not told about the other kinds; everyone else is told to check how theirs pays.
    const only = flagFor(SUPP, ['health'], { health_supplemental: ['hospital_indemnity'] });
    assert.equal(/different products/i.test(only.background), false);
    for (const list of [['accident'], ['cancer'], ['critical_illness'], ['accident', 'hospital_indemnity'], ['not_sure']]) {
      const f = flagFor(SUPP, ['health'], { health_supplemental: list });
      assert.match(f.background, /Accident, cancer and critical illness policies are different products\. They may pay you a set amount of cash when a covered event happens or they may work another way, so check how yours pays\./, list.join('+'));
    }
  });

  t('never claims the policies are redundant, duplicate the main plan, or are not worth it', () => {
    for (const { flag } of renderedVariants().filter((v) => v.id === SUPP)) {
      const s = textOf(flag);
      assert.equal(/redundan|duplicat|frequently|often (cover|pay|overlap)|waste|rip-?off|unnecessary/i.test(s), false);
      assert.equal(/not worth/i.test(s), false);
    }
  });

  t('does not push a person with thin savings to drop it: the cash payout is named as a fair reason to keep it', () => {
    const thin = flagFor(SUPP, ['health'], { health_supplemental: ['accident'], emergency_cushion: 'under_1000' });
    assert.match(thin.background, /fair reason to keep it|good reason to keep it/i);
    const rich = flagFor(SUPP, ['health'], { health_supplemental: ['accident'], emergency_cushion: '5000_plus' });
    assert.equal(/reason to keep it/i.test(rich.background), false);
    assert.match(rich.background, /\$5,000 or more from savings/);
    assert.match(rich.background, /fair moment to ask whether the payout is worth the premium/i);
  });

  t('open-enrollment nod uses only sourced facts: employers set their own dates, HealthCare.gov dates carry their plan year', () => {
    const f = flagFor(SUPP, ['health'], { health_supplemental: ['accident'] });
    assert.match(f.ask, /open enrollment/i);
    assert.match(f.ask, /employer sets its own/i);
    assert.match(f.ask, /2027 coverage runs November 1 to January 15/);
    assert.equal(/early December|october/i.test(textOf(f)), false, 'the unsourced "October to early December" window is never asserted');
    assert.includes(f.sources.map((s) => s.id), 'healthcare-gov-dates-and-deadlines');
    assert.includes(f.sources.map((s) => s.id), 'healthcare-gov-glossary-open-enrollment');
  });
});

suite('health-hsa-nudge', (t) => {
  t('fires for a high-deductible plan with an HSA and for one without', () => {
    assert.equal(fires(HSA, ['health'], { health_hsa: 'hdhp_hsa' }), true);
    assert.equal(fires(HSA, ['health'], { health_hsa: 'hdhp_only' }), true);
  });

  t('is silent for a regular plan, for Not sure, for no answer, and without a health plan', () => {
    assert.equal(fires(HSA, ['health'], { health_hsa: 'neither' }), false);
    assert.equal(fires(HSA, ['health'], { health_hsa: 'not_sure' }), false);
    assert.equal(fires(HSA, ['health'], {}), false);
    assert.equal(fires(HSA, ['auto'], { health_hsa: 'hdhp_hsa' }), false);
  });

  t('both variants are normal-emphasis education items in the Question bucket, with different text', () => {
    const withHsa = flagFor(HSA, ['health'], { health_hsa: 'hdhp_hsa' });
    const without = flagFor(HSA, ['health'], { health_hsa: 'hdhp_only' });
    for (const f of [withHsa, without]) {
      assert.equal(f.bucket, 'question');
      assert.equal(f.kind, 'education');
      assert.equal(f.emphasis, 'normal');
    }
    assert.notEqual(withHsa.title, without.title);
    assert.notEqual(withHsa.background, without.background);
    assert.notEqual(withHsa.ask, without.ask);
    assert.notEqual(withHsa.reason, without.reason);
  });

  t('HSA variant: federal tax advantages, carryover, and the FSA contrast; no usage claim', () => {
    const f = flagFor(HSA, ['health'], { health_hsa: 'hdhp_hsa' });
    assert.match(f.background, /deductible/i);
    assert.match(f.background, /grows without tax/i);
    assert.match(f.background, /qualified medical costs are not taxed/i);
    assert.match(f.background, /year to year/i);
    assert.match(f.background, /use-it-or-lose-it/i);
    assert.match(f.background, /federal tax rules/i);
  });

  t('no-HSA variant: asks whether the plan qualifies, and dates every threshold with its year', () => {
    const f = flagFor(HSA, ['health'], { health_hsa: 'hdhp_only' });
    assert.match(f.ask, /HSA-eligible|qualif/i);
    assert.match(f.background, /For 2026 the IRS minimum deductible/);
    assert.match(f.background, /for 2027 it is \$1,750 and \$3,500/);
    assert.deepEqual(moneyIn(f.background).filter((m) => ['$1,700', '$3,400', '$1,750', '$3,500'].indexOf(m) === -1), []);
    assert.match(f.background, /does not make a plan HSA-eligible/i);
    // the HSA-with variant states no threshold at all
    assert.deepEqual(moneyIn(textOf(flagFor(HSA, ['health'], { health_hsa: 'hdhp_hsa' }))).filter((m) => ['$1,700', '$3,400', '$1,750', '$3,500'].indexOf(m) !== -1), []);
  });

  t('never says HSAs are commonly underused and never infers eligibility from a deductible band', () => {
    for (const { flag } of renderedVariants().filter((v) => v.id === HSA)) {
      assert.equal(/underus|under-us|commonly|most people|many people|triple/i.test(textOf(flag)), false);
    }
    // the deductible band is not an input: changing it never changes the output
    const base = flagFor(HSA, ['health'], { health_hsa: 'hdhp_only' });
    for (const band of BANDS) {
      assert.deepEqual(flagFor(HSA, ['health'], { health_hsa: 'hdhp_only', deductible_health: band }), base);
    }
    assert.equal(fires(HSA, ['health'], { health_hsa: 'neither', deductible_health: '5000_plus' }), false, 'a big deductible alone never triggers the nudge');
  });

  t('open-enrollment nod is present and sourced', () => {
    for (const v of ['hdhp_hsa', 'hdhp_only']) {
      const f = flagFor(HSA, ['health'], { health_hsa: v });
      assert.match(f.ask, /open enrollment/i);
      assert.match(f.ask, /employer sets its own/i);
      assert.includes(f.sources.map((s) => s.id), 'healthcare-gov-dates-and-deadlines');
    }
  });
});

suite('health-short-term-plan-alongside', (t) => {
  t('fires only for a Yes', () => {
    assert.equal(fires(SHORT, ['health'], { health_short_term: 'yes' }), true);
    assert.equal(fires(SHORT, ['health'], { health_short_term: 'no' }), false);
    assert.equal(fires(SHORT, ['health'], { health_short_term: 'not_sure' }), false);
    assert.equal(fires(SHORT, ['health'], {}), false);
    assert.equal(fires(SHORT, ['auto'], { health_short_term: 'yes' }), false);
  });

  t('is a normal-emphasis cross-policy Question', () => {
    const f = flagFor(SHORT, ['health'], { health_short_term: 'yes' });
    assert.equal(f.bucket, 'question');
    assert.equal(f.kind, 'cross-policy');
    assert.equal(f.emphasis, 'normal');
    assert.equal(f.domain, 'health');
  });

  t('background follows the research: may not cover pre-existing conditions, no essential-benefit requirement, Marketplace contrast, state rules', () => {
    const f = flagFor(SHORT, ['health'], { health_short_term: 'yes' });
    assert.match(f.background, /pre-existing conditions/);
    assert.match(f.background, /not required to cover essential health benefits/i);
    assert.match(f.background, /annual and lifetime limits/i);
    assert.match(f.background, /Marketplace plans, by contrast, must cover pre-existing conditions and all 10 essential health benefit categories/);
    assert.match(f.background, /some ban these plans/i);
  });

  t('federal duration is dated and never printed: as of October 2026 the rules are in flux (August 2025 enforcement statement)', () => {
    const f = flagFor(SHORT, ['health'], { health_short_term: 'yes' });
    assert.match(f.background, /As of October 2026/);
    assert.match(f.background, /August 2025/);
    assert.match(f.background, /2024/);
    assert.match(f.background, /in flux/);
    const s = textOf(f);
    assert.equal(/\b(3|4|12|36|three|four|twelve|thirty-six)[ -]months?\b/i.test(s), false, 'no plan duration');
    assert.equal(/\b(3|4|12|36)[ -]?(mo|month|months)\b/i.test(s), false);
    assert.equal(/\b(one|two|three|1|2|3)[ -]years?\b/i.test(s), false, 'no year-long durations either');
  });

  t('does not say holding both plans is allowed, disallowed or wasteful; asks whether the second plan is still needed, and points to the state department of insurance', () => {
    const f = flagFor(SHORT, ['health'], { health_short_term: 'yes' });
    assert.match(f.title, /still need/i);
    assert.match(f.ask, /whether you still need it/i);
    assert.match(f.ask, /state's department of insurance/i);
    assert.match(f.ask, /what it covers that your main plan does not/i);
    assert.equal(/\b(allowed|illegal|not allowed|wasteful|waste|redundan|duplicat)\b/i.test(textOf(f)), false);
  });
});

suite('deductible-exceeds-cushion: the band matrix', (t) => {
  // Hand-written expectation, independent of the implementation: which (deductible, cushion) pairs fire, and how.
  //   known cushion: fires, strong, when deductible.min > cushion.max (cushion.max null never fires)
  //   cushion Not sure: fires, normal, when deductible.min is 1000 or more
  //   deductible Not sure or cushion unanswered: never fires
  const EXPECT = {
    under_1000: { under_1000: null, '1000_4999': null, '5000_plus': null, not_sure: null, none: null },
    '1000_4999': { under_1000: 'strong', '1000_4999': null, '5000_plus': null, not_sure: 'normal', none: null },
    '5000_plus': { under_1000: 'strong', '1000_4999': 'strong', '5000_plus': null, not_sure: 'normal', none: null },
    not_sure: { under_1000: null, '1000_4999': null, '5000_plus': null, not_sure: null, none: null },
    none: { under_1000: null, '1000_4999': null, '5000_plus': null, not_sure: null, none: null },
  };
  const CASES = [
    [D_AUTO, 'auto', 'deductible_auto'],
    [D_HOME, 'home', 'deductible_home'],
    [D_HEALTH, 'health', 'deductible_health'],
  ];

  for (const [id, policy, qid] of CASES) {
    t(`${id}: every deductible band x cushion band x Not sure x unanswered combination`, () => {
      for (const d of Object.keys(EXPECT)) {
        for (const c of Object.keys(EXPECT[d])) {
          const o = {};
          if (d !== 'none') o[qid] = d;
          if (c !== 'none') o.emergency_cushion = c;
          const f = flagFor(id, [policy], o);
          const want = EXPECT[d][c];
          const label = `${id} deductible=${d} cushion=${c}`;
          if (want === null) {
            assert.equal(f, undefined, `${label} should be silent`);
          } else {
            assert.ok(f, `${label} should fire`);
            assert.equal(f.emphasis, want, `${label} emphasis`);
            assert.equal(f.bucket, 'question');
            assert.equal(f.kind, 'cross-policy');
            assert.equal(f.domain, 'deductible');
          }
        }
      }
    });
  }

  t('a $5,000 or more cushion never fires, whatever the deductible (open-ended band)', () => {
    for (const [id, policy, qid] of CASES) {
      for (const d of BANDS) assert.equal(fires(id, [policy], { [qid]: d, emergency_cushion: '5000_plus' }), false, `${id} ${d}`);
    }
  });

  t('equal bands never fire: a deductible in the same band as the cushion is not certainly above it', () => {
    for (const [id, policy, qid] of CASES) {
      for (const band of BANDS) assert.equal(fires(id, [policy], { [qid]: band, emergency_cushion: band }), false, `${id} ${band}`);
    }
  });

  t('each flag reads only its own policy and its own deductible', () => {
    // all three held, different bands: auto 5000_plus and health 1000_4999 exceed an under-1,000 cushion, home does not
    const o = { deductible_auto: '5000_plus', deductible_home: 'under_1000', deductible_health: '1000_4999', emergency_cushion: 'under_1000' };
    const r = run(['auto', 'home', 'health'], o);
    assert.deepEqual(mineIn(r, 'question'), [D_AUTO, D_HEALTH]);
    // a deductible answer for a policy the user does not hold is pruned and fires nothing
    assert.equal(fires(D_HOME, ['auto'], { deductible_auto: 'under_1000', deductible_home: '5000_plus', emergency_cushion: 'under_1000' }), false);
    assert.equal(fires(D_HEALTH, ['home'], { deductible_home: 'under_1000', deductible_health: '5000_plus', emergency_cushion: 'under_1000' }), false);
  });

  t('without any of auto, home or health the cushion question is hidden and nothing fires', () => {
    const r = run([], { deductible_auto: '5000_plus', emergency_cushion: 'under_1000' });
    assert.deepEqual(mineIn(r, 'question'), []);
  });

  t('the auto flag stays silent when the user dropped collision, speaks up for Yes and Not sure, and ignores a stale collision answer', () => {
    const base = { deductible_auto: '5000_plus', emergency_cushion: 'under_1000' };
    const cheapPaidOff = { auto_financing: 'paid_off', auto_value: 'under_3000' };
    assert.equal(fires(D_AUTO, ['auto'], Object.assign({}, base, cheapPaidOff, { auto_collision: 'no' })), false, 'no collision, no collision deductible');
    assert.equal(fires(D_AUTO, ['auto'], Object.assign({}, base, cheapPaidOff, { auto_collision: 'yes' })), true);
    assert.equal(fires(D_AUTO, ['auto'], Object.assign({}, base, cheapPaidOff, { auto_collision: 'not_sure' })), true);
    // a financed car hides the collision question, so a leftover "no" is pruned and cannot silence the flag
    assert.equal(fires(D_AUTO, ['auto'], Object.assign({}, base, { auto_financing: 'loan', auto_value: 'under_3000', auto_collision: 'no' })), true);
    // the same check applies to a Not sure cushion
    assert.equal(fires(D_AUTO, ['auto'], { deductible_auto: '1000_4999', emergency_cushion: 'not_sure', auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'no' }), false);
  });

  t('the collision answer is read only by the auto flag', () => {
    const o = { deductible_home: '5000_plus', emergency_cushion: 'under_1000', auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'no' };
    assert.equal(fires(D_HOME, ['auto', 'home'], o), true);
  });
});

suite('deductible-exceeds-cushion: wording', (t) => {
  const known = (id, policy, qid, d, c) => flagFor(id, [policy], { [qid]: d, emergency_cushion: c });

  t('mentions the two bands the user picked, by their labels, and nothing more precise', () => {
    const f = known(D_AUTO, 'auto', 'deductible_auto', '5000_plus', 'under_1000');
    assert.match(f.background, /collision deductible is \$5,000 or more/);
    assert.match(f.background, /could cover under \$1,000 from savings/);
    const h = known(D_HOME, 'home', 'deductible_home', '1000_4999', 'under_1000');
    assert.match(h.background, /home policy's deductible is \$1,000 to \$4,999/);
    const hl = known(D_HEALTH, 'health', 'deductible_health', '5000_plus', '1000_4999');
    assert.match(hl.background, /deductible is \$5,000 or more/);
    assert.match(hl.background, /could cover \$1,000 to \$4,999 from savings/);
  });

  t('only band edges and sourced figures appear as dollar amounts', () => {
    const allowed = ['$1,000', '$4,999', '$5,000'];
    for (const { id, flag } of renderedVariants().filter((v) => [D_AUTO, D_HOME, D_HEALTH].indexOf(v.id) !== -1)) {
      for (const m of moneyIn(textOf(flag))) assert.ok(allowed.indexOf(m) !== -1, `${id}: unexpected amount ${m}`);
    }
  });

  t('framed as "build the cushion or reconsider the deductible - your choice", never a verdict on the policy', () => {
    for (const { id, flag } of renderedVariants().filter((v) => [D_AUTO, D_HOME, D_HEALTH].indexOf(v.id) !== -1)) {
      const s = textOf(flag);
      assert.match(flag.background, /the choice is yours: build up your cash cushion, or reconsider the deductible/i, id);
      assert.match(s, /build up/i, id);
      assert.match(s, /lower/i, id);
      assert.equal(/adequa|good enough|bad plan|wrong plan|poor plan|too high|too low|overpay|underinsur|you should (raise|lower|cut)/i.test(s), false, `${id}: judging language`);
      assert.match(flag.background, /not a verdict on your (policy|plan)/i, id);
    }
  });

  t('Not sure cushion: names the floor of the deductible band, admits the unknown, and asks them to work out their cash', () => {
    const f = known(D_AUTO, 'auto', 'deductible_auto', '1000_4999', 'not_sure');
    assert.equal(f.emphasis, 'normal');
    assert.match(f.background, /at least \$1,000 up front/);
    assert.match(f.background, /not sure how much you could cover from savings/i);
    assert.match(f.ask, /First work out roughly how much cash you could get to within a few days/i);
    const g = known(D_HOME, 'home', 'deductible_home', '5000_plus', 'not_sure');
    assert.match(g.background, /at least \$5,000 up front/);
    const hl = known(D_HEALTH, 'health', 'deductible_health', '5000_plus', 'not_sure');
    assert.match(hl.background, /at least \$5,000 up front/);
  });

  t('known and Not sure variants differ in background, ask and reason', () => {
    for (const [id, policy, qid] of [[D_AUTO, 'auto', 'deductible_auto'], [D_HOME, 'home', 'deductible_home'], [D_HEALTH, 'health', 'deductible_health']]) {
      const a = known(id, policy, qid, '5000_plus', 'under_1000');
      const b = known(id, policy, qid, '5000_plus', 'not_sure');
      assert.notEqual(a.background, b.background, id);
      assert.notEqual(a.ask, b.ask, id);
      assert.notEqual(a.reason, b.reason, id);
    }
  });

  t('Federal Reserve context carries its survey year and publisher, and matches the cushion band picked', () => {
    const under = known(D_AUTO, 'auto', 'deductible_auto', '5000_plus', 'under_1000');
    assert.match(under.background, /Federal Reserve's 2025 survey/);
    assert.match(under.background, /about 39% of adults/i);
    const mid = known(D_AUTO, 'auto', 'deductible_auto', '5000_plus', '1000_4999');
    assert.match(mid.background, /about 23% of adults/i);
    for (const [id, policy, qid, pct] of [[D_AUTO, 'auto', 'deductible_auto', '30%'], [D_HOME, 'home', 'deductible_home', '22%'], [D_HEALTH, 'health', 'deductible_health', '21%']]) {
      const f = known(id, policy, qid, '5000_plus', 'under_1000');
      assert.match(f.background, new RegExp(`${pct} of adults`), id);
      assert.includes(f.sources.map((s) => s.id), 'fed-shed-2025-economic-hardships');
      assert.includes(f.sources.map((s) => s.id), 'fed-shed-2025-savings-and-investments');
    }
  });

  t('home: percentage deductibles for wind, hail and earthquake are raised as a separate ask', () => {
    for (const c of ['under_1000', 'not_sure']) {
      const f = known(D_HOME, 'home', 'deductible_home', c === 'not_sure' ? '5000_plus' : '5000_plus', c);
      assert.match(f.background, /percentage deductible/i);
      assert.match(f.background, /1% to 5%/);
      assert.match(f.background, /2% to 20%/);
      assert.match(f.ask, /percentage deductible for wind, hail or earthquake/i);
    }
  });

  t('health: the out-of-pocket maximum can be higher than the deductible and is not asked about; no plan-adequacy or network language', () => {
    const f = known(D_HEALTH, 'health', 'deductible_health', '5000_plus', 'under_1000');
    assert.match(f.background, /out-of-pocket maximum/);
    assert.match(f.background, /we are not asking about that/i);
    assert.equal(/network|adequa|good enough/i.test(textOf(f)), false);
    assert.includes(f.sources.map((s) => s.id), 'healthcare-gov-glossary-deductible');
    assert.includes(f.sources.map((s) => s.id), 'healthcare-gov-glossary-out-of-pocket-maximum');
  });

  t('auto and home flags cite the Insurance Information Institute; auto also cites the NAIC; the health flag cites HealthCare.gov', () => {
    assert.includes(flagById(D_AUTO).sourceIds, 'iii-understanding-your-insurance-deductibles');
    assert.includes(flagById(D_AUTO).sourceIds, 'naic-tips-saving-on-auto-insurance');
    assert.includes(flagById(D_HOME).sourceIds, 'iii-understanding-your-insurance-deductibles');
    assert.includes(flagById(D_HEALTH).sourceIds, 'healthcare-gov-glossary-deductible');
  });
});

suite('copy rules across every variant', (t) => {
  // Built on first use so a flag that throws fails one test instead of stopping the whole file at load.
  let cache = null;
  const rendered = () => (cache === null ? (cache = renderedVariants()) : cache);

  t('every flag fires in at least one variant, and the variants cover the expected counts', () => {
    for (const id of MY_IDS) assert.ok(rendered().some((v) => v.id === id), `${id} never fires in any variant`);
    assert.equal(rendered().filter((v) => v.id === MEDPAY).length, 2);
    assert.equal(rendered().filter((v) => v.id === SUPP).length, 35);
    assert.equal(rendered().filter((v) => v.id === HSA).length, 2);
    assert.equal(rendered().filter((v) => v.id === SHORT).length, 1);
    for (const id of [D_AUTO, D_HOME, D_HEALTH]) assert.equal(rendered().filter((v) => v.id === id).length, 5, id);
  });

  t('rendered text has no unresolved {{tokens}}, no stray braces, and every field is a real sentence', () => {
    for (const { id, label, flag } of rendered()) {
      for (const field of ['title', 'background', 'ask', 'reason']) {
        const s = flag[field];
        assert.equal(typeof s, 'string', `${id} ${field}`);
        assert.ok(s.trim().length > 15, `${id} (${label}) ${field} is too short`);
        assert.equal(/\{\{|\}\}|\{|\}|undefined|NaN|\[object/.test(s), false, `${id} (${label}) ${field} leaked a token or value: ${s}`);
        assert.equal(/not_sure|under_1000|1000_4999|5000_plus|hdhp_|critical_illness|hospital_indemnity/.test(s), false, `${id} (${label}) ${field} leaked a raw option id`);
        assert.equal(s, s.trim(), `${id} ${field} has stray whitespace`);
        assert.equal(/  /.test(s), false, `${id} ${field} has a double space`);
      }
    }
  });

  t('no state is named, and the copy points to "your state\'s department of insurance" where state rules matter', () => {
    for (const { id, label, flag } of rendered()) assert.equal(STATES.test(textOf(flag)), false, `${id} (${label}) names a state`);
    const shortTerm = flagFor(SHORT, ['health'], { health_short_term: 'yes' });
    assert.match(shortTerm.ask, /your state's department of insurance/i);
    assert.equal(/\b(how many states|\d+ states|most states|many states|several states)\b/i.test(textOf(shortTerm)), false, 'no counts of states');
  });

  t('plain-language house rules: no em or en dashes, no jargon the app bans, no placeholders', () => {
    for (const { id, label, flag } of rendered()) {
      const s = textOf(flag);
      assert.equal(/—|–/.test(s), false, `${id} (${label}) has a dash`);
      assert.equal(/home equity|next screen|generic pattern|todo|tbd|lorem|placeholder|fixme|xxx/i.test(s), false, `${id} (${label})`);
      assert.equal(/\bAI\b|\bLLM\b|machine learning/.test(s), false, id);
    }
  });

  t('the tool never judges plan adequacy, network, or whether a plan is good', () => {
    for (const { id, label, flag } of rendered()) {
      assert.equal(/adequa|good enough|not enough coverage|bad plan|poor plan|wrong plan|better plan|worse plan|network|underinsured/i.test(textOf(flag)), false, `${id} (${label})`);
    }
  });

  t('each ask is something to do or say with an insurer or benefits office, and each reason is one sentence the user can repeat', () => {
    for (const { id, label, flag } of rendered()) {
      assert.match(flag.ask, /\b(ask|look at|first work out)\b/i, `${id} (${label}) ask`);
      assert.equal((flag.reason.match(/[.!?](\s|$)/g) || []).length, 1, `${id} (${label}) reason should be one sentence: ${flag.reason}`);
      assert.match(flag.reason, /^I\b/, `${id} (${label}) reason should be in the user's own voice`);
      assert.equal(/^(Ask|Check|Weigh|Make sure)\b/.test(flag.title), true, `${id} title should be an action phrase: ${flag.title}`);
    }
  });

  t('open-enrollment framing appears only in health copy, never in the auto or home deductible flags', () => {
    for (const { id, label, flag } of rendered()) {
      const mentions = /open enrollment/i.test(textOf(flag));
      if (id === D_AUTO || id === D_HOME) assert.equal(mentions, false, `${id} (${label}) must not mention open enrollment`);
    }
    const healthCopy = rendered().filter((v) => [SUPP, HSA, D_HEALTH].indexOf(v.id) !== -1);
    assert.ok(healthCopy.length > 0);
    for (const { id, label, flag } of healthCopy) {
      assert.match(flag.ask, /open enrollment/i, `${id} (${label})`);
      assert.match(flag.ask, /employer sets its own open enrollment dates/i, `${id} (${label})`);
      assert.match(flag.ask, /2027 coverage runs November 1 to January 15/, `${id} (${label})`);
    }
  });

  t('the sources a flag cites exist and each flag shows at least two, all verified on the registry date', () => {
    for (const { id, flag } of rendered()) {
      assert.ok(flag.sources.length >= 2, id);
      for (const s of flag.sources) assert.equal(s.lastVerified, '2026-10-10', `${id} ${s.id}`);
    }
  });
});

suite('determinism and purity', (t) => {
  t('identical answers give deep-equal results, and a frozen input is never mutated', () => {
    const answers = answersFor(['auto', 'home', 'health'], {
      auto_medpay: 'yes', health_hsa: 'hdhp_only', health_supplemental: ['accident', 'cancer'], health_short_term: 'yes',
      deductible_auto: '5000_plus', deductible_home: '1000_4999', deductible_health: '5000_plus', emergency_cushion: 'under_1000',
    });
    const frozen = deepFreeze(copy(answers));
    const first = evaluate(frozen);
    const second = evaluate(frozen);
    assert.deepEqual(first, second);
    assert.deepEqual(frozen, answers, 'the input is untouched');
    assert.deepEqual(mineIn(first, 'question'), MY_IDS.slice().sort((a, b) => flagById(a).priority - flagById(b).priority));
  });

  t('every flag text function gives the same string when called twice with the same context', () => {
    const answers = answersFor(['auto', 'home', 'health'], {
      auto_medpay: 'not_sure', health_hsa: 'hdhp_hsa', health_supplemental: ['hospital_indemnity'], health_short_term: 'yes',
      deductible_auto: '1000_4999', deductible_home: '5000_plus', deductible_health: '1000_4999', emergency_cushion: 'not_sure',
    });
    const ctx = createContext(answers);
    for (const f of ALL_FLAGS) {
      const verdict = f.applies(ctx);
      assert.deepEqual(f.applies(ctx), verdict, `${f.id} applies`);
      if (!verdict) continue;
      const vars = (verdict !== true && verdict.vars) || {};
      for (const field of ['title', 'background', 'ask', 'reason']) {
        const make = (x) => (typeof x === 'function' ? x(ctx, vars) : x);
        assert.equal(make(f[field]), make(f[field]), `${f.id} ${field}`);
      }
    }
  });

  t('applies() returns false, null, true or a plain object for every household, and never throws (sweep)', () => {
    const held = [[], ['health'], ['auto'], ['home'], ['health', 'auto'], ['health', 'home'], ['auto', 'home'], ['health', 'auto', 'home']];
    const single = (qid, ids) => [undefined].concat(ids).map((v) => (v === undefined ? {} : { [qid]: v }));
    const bands = BANDS.concat(['not_sure']);
    const medpay = single('auto_medpay', ['yes', 'no', 'not_sure']);
    const hsa = single('health_hsa', ['hdhp_hsa', 'hdhp_only', 'neither', 'not_sure']);
    const short = single('health_short_term', ['yes', 'no', 'not_sure']);
    const supp = [{}, { health_supplemental: ['none'] }, { health_supplemental: ['not_sure'] }, { health_supplemental: ['accident'] }, { health_supplemental: SUPP_TYPES }];
    const cushion = single('emergency_cushion', bands);
    const da = single('deductible_auto', bands);
    const dh = single('deductible_home', bands);
    const dhe = single('deductible_health', bands);
    let n = 0;
    for (let i = 0; i < held.length; i++) {
      for (let a = 0; a < medpay.length; a++) {
        for (let b = 0; b < hsa.length; b++) {
          for (let c = 0; c < short.length; c++) {
            for (let d = 0; d < supp.length; d++) {
              const k = (i + a + b + c + d) % cushion.length;
              const o = Object.assign({}, medpay[a], hsa[b], short[c], supp[d], cushion[k], da[(a + b) % da.length], dh[(b + c) % dh.length], dhe[(c + d) % dhe.length]);
              const r = evaluate(answersFor(held[i], o));
              for (const bucket of BUCKET_NAMES) assert.ok(Array.isArray(r.flags[bucket]));
              n++;
            }
          }
        }
      }
    }
    assert.ok(n > 1000, `swept ${n} households`);
  });
});

suite('end to end: the real catalog and real answers', (t) => {
  const idsIn = (r, bucket) => mineIn(r, bucket);

  t(`${MEDPAY}: a household with a car and a health plan that has MedPay`, () => {
    const r = run(['auto', 'home', 'health'], { auto_medpay: 'yes' });
    assert.deepEqual(idsIn(r, 'question'), [MEDPAY]);
    assert.deepEqual(idsIn(r, 'raise'), []);
    assert.deepEqual(idsIn(r, 'drop'), []);
    const f = findFlag(r, MEDPAY);
    assert.deepEqual(Object.keys(f), ['id', 'bucket', 'domain', 'kind', 'title', 'emphasis', 'background', 'ask', 'reason', 'sources']);
    assert.equal(f.title, 'Ask how your auto medical coverage works with your health plan');
    assert.includes(r.meta.visibleQuestionIds, 'auto_medpay');
    assert.equal(findFlag(run(['auto', 'home'], { auto_medpay: 'yes' }), MEDPAY), undefined, 'no health plan, no flag');
    assert.equal(findFlag(run(['home', 'health'], {}), MEDPAY), undefined, 'no car, no flag');
  });

  t(`${SUPP}: a household paying for accident and cancer cover with a comfortable cushion`, () => {
    const r = run(['health'], { health_supplemental: ['accident', 'cancer'], emergency_cushion: '5000_plus' });
    assert.deepEqual(idsIn(r, 'question'), [SUPP]);
    const f = findFlag(r, SUPP);
    assert.equal(f.emphasis, 'strong');
    assert.match(f.background, /accident and cancer insurance/);
    assert.equal(findFlag(run(['health'], { health_supplemental: ['none'], emergency_cushion: '5000_plus' }), SUPP), undefined);
    assert.equal(findFlag(run(['health'], { health_supplemental: ['accident'], emergency_cushion: 'under_1000' }), SUPP).emphasis, 'normal');
  });

  t(`${HSA}: a household with a high-deductible plan`, () => {
    const withHsa = run(['health'], { health_hsa: 'hdhp_hsa' });
    assert.deepEqual(idsIn(withHsa, 'question'), [HSA]);
    assert.equal(findFlag(withHsa, HSA).kind, 'education');
    const noHsa = run(['health'], { health_hsa: 'hdhp_only' });
    assert.deepEqual(idsIn(noHsa, 'question'), [HSA]);
    assert.deepEqual(idsIn(run(['health'], { health_hsa: 'neither' }), 'question'), []);
  });

  t(`${SHORT}: a household with a short-term plan next to its main plan`, () => {
    const r = run(['health'], { health_short_term: 'yes' });
    assert.deepEqual(idsIn(r, 'question'), [SHORT]);
    assert.equal(findFlag(r, SHORT).title, 'Ask whether you still need your short-term health plan');
    assert.deepEqual(idsIn(run(['health'], { health_short_term: 'no' }), 'question'), []);
  });

  t(`${D_AUTO}: a car with a deductible above the household's cash`, () => {
    const r = run(['auto'], { deductible_auto: '1000_4999', emergency_cushion: 'under_1000' });
    assert.deepEqual(idsIn(r, 'question'), [D_AUTO]);
    assert.equal(findFlag(r, D_AUTO).emphasis, 'strong');
    assert.deepEqual(idsIn(run(['auto'], { deductible_auto: '1000_4999', emergency_cushion: '1000_4999' }), 'question'), []);
  });

  t(`${D_HOME}: a home with a deductible above the household's cash`, () => {
    const r = run(['home'], { deductible_home: '5000_plus', emergency_cushion: '1000_4999' });
    assert.deepEqual(idsIn(r, 'question'), [D_HOME]);
    assert.equal(findFlag(r, D_HOME).emphasis, 'strong');
    const unsure = run(['home'], { deductible_home: '5000_plus', emergency_cushion: 'not_sure' });
    assert.equal(findFlag(unsure, D_HOME).emphasis, 'normal');
  });

  t(`${D_HEALTH}: a health plan with a deductible above the household's cash`, () => {
    const r = run(['health'], { deductible_health: '5000_plus', emergency_cushion: 'under_1000' });
    assert.deepEqual(idsIn(r, 'question'), [D_HEALTH]);
    assert.equal(findFlag(r, D_HEALTH).emphasis, 'strong');
    assert.equal(findFlag(r, D_HEALTH).sources.length, 6);
  });

  t('a full household: all seven flags fire together in priority order, all in the Question bucket', () => {
    const r = run(['auto', 'home', 'health'], {
      auto_medpay: 'yes', health_hsa: 'hdhp_hsa', health_supplemental: ['critical_illness'], health_short_term: 'yes',
      deductible_auto: '5000_plus', deductible_home: '5000_plus', deductible_health: '5000_plus', emergency_cushion: 'under_1000',
    });
    assert.deepEqual(idsIn(r, 'question'), [MEDPAY, SUPP, HSA, SHORT, D_AUTO, D_HOME, D_HEALTH]);
    assert.deepEqual(idsIn(r, 'raise'), []);
    assert.deepEqual(idsIn(r, 'drop'), []);
  });

  t('a household with no auto, home or health policy gets none of the seven flags', () => {
    const r = run([], { auto_medpay: 'yes', health_hsa: 'hdhp_hsa', health_supplemental: ['accident'], health_short_term: 'yes', deductible_auto: '5000_plus', emergency_cushion: 'under_1000' });
    for (const bucket of BUCKET_NAMES) assert.deepEqual(idsIn(r, bucket), []);
  });

  t('the flags read only questions: keys that are not questions (policy-screen numbers, a state) change nothing', () => {
    const base = answersFor(['auto', 'health'], { auto_medpay: 'yes' });
    const noisy = copy(base);
    noisy.p = { auto: { medpay: 5000, collDed: 2500, liability: 250 }, health: { deductible: 9999 } };
    noisy.state = 'CA';
    assert.deepEqual(evaluate(noisy), evaluate(base));
  });
});
