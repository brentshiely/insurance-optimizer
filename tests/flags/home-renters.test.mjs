// Story S9: tests for the home exclusions and renters flags.
//   public/js/overlap/data/flags/home.mjs     home-sewer-backup-missing, home-flood-no-separate-policy
//   public/js/overlap/data/flags/renters.mjs  renters-child-vs-parents-home
//
// What is checked, per flag: it fires when it should and stays silent when it should not, every Not sure fallback,
// emphasis (strong only where the user's own answer confirms the gap), copy that matches the research wording rules
// (no price, no 10 percent rule, no state names, no URLs, no unresolved tokens), sources that resolve, determinism,
// and one end-to-end evaluate() on the real catalog with plain answers (Q1, `policies`, holds the ticks). The flags in the two files must equal the S9 rows of the plan (tests/fixtures/flagPlan.mjs).
// Pure data checks; runs under jsc and Node. The flag files are read with the jsc global read(), guarded.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import home from '../../public/js/overlap/data/flags/home.mjs';
import renters from '../../public/js/overlap/data/flags/renters.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { evaluate, createContext } from '../../public/js/overlap/engine/evaluate.mjs';
import { validateCatalog } from '../../public/js/overlap/engine/validate.mjs';
import PLAN from '../fixtures/flagPlan.mjs';
import homeResearch from '../../research/home-and-renters.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';

const canRead = typeof read === 'function';

const SEWER = 'home-sewer-backup-missing';
const FLOOD = 'home-flood-no-separate-policy';
const RENTERS = 'renters-child-vs-parents-home';
const S9_IDS = [SEWER, FLOOD, RENTERS];

const S9_FLAGS = [...home, ...renters];
const byId = (id) => S9_FLAGS.find((f) => f.id === id);
const planRow = (id) => PLAN.flags.find((f) => f.id === id);

// ---- plain answers ---------------------------------------------------------------------------------------
// `held` is what the user ticked in Q1: 'home' for a home they own, 'renters' for a renters policy (their own, or one
// a parent pays for so a child at college has coverage). `o` holds the user's answers to the other questions.
const answersFor = (held, o) => ({ ...(o || {}), policies: held.slice() });
const ownerWith = (o) => answersFor(['home'], o);

const allFlags = (result) => [...result.flags.raise, ...result.flags.drop, ...result.flags.question];
const s9Of = (result) => allFlags(result).filter((f) => S9_IDS.includes(f.id));
const s9In = (result, bucket) => result.flags[bucket].filter((f) => S9_IDS.includes(f.id));
const find = (result, id) => allFlags(result).find((f) => f.id === id);
const fires = (answers, id) => find(evaluate(answers), id) !== undefined;
const get = (answers, id) => find(evaluate(answers), id);

// ---- text hygiene ----------------------------------------------------------------------------------------
const STATE_NAMES = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington state|west virginia|wisconsin|wyoming)\b/i;
const TEXT_FIELDS = ['title', 'background', 'ask', 'reason'];
const textOf = (flag) => TEXT_FIELDS.map((k) => flag[k]).join('\n');
const ACTION_TITLE = /^(Ask|Check|Find out|Confirm|Compare)\b/;

function assertCleanCopy(flag, label) {
  for (const field of TEXT_FIELDS) {
    assert.equal(typeof flag[field], 'string', `${label}: ${field} is a string`);
    assert.equal(flag[field].trim().length > 0, true, `${label}: ${field} is not empty`);
  }
  const text = textOf(flag);
  assert.equal(/\{\{|\}\}/.test(text), false, `${label}: unresolved {{token}}`);
  assert.equal(STATE_NAMES.test(text), false, `${label}: names a state`);
  assert.equal(/[–—]/.test(text), false, `${label}: has an en or em dash`);
  assert.equal(/https?:|www\./i.test(text), false, `${label}: writes a URL`);
  assert.equal(/home equity|next screen|generic patterns|\btodo\b|\btbd\b|placeholder|lorem/i.test(text), false, `${label}: banned or placeholder text`);
  assert.equal(/\bstate\b[^.]*\b(requires?|mandates?)\b/i.test(text), false, `${label}: makes a state-rule claim`);
  assert.equal(/\b(always|never|guaranteed?|all policies|every policy|voids?)\b/i.test(text), false, `${label}: absolute wording`);
  assert.equal(ACTION_TITLE.test(flag.title), true, `${label}: the title is an action phrase, got "${flag.title}"`);
  assert.equal(flag.title.length <= 80, true, `${label}: title is short enough to scan`);
  // The one-line reason is a single sentence the user can repeat.
  assert.equal(/[.!?]$/.test(flag.reason), true, `${label}: reason ends with a full stop`);
  assert.equal(/[.!?]\s+[A-Z]/.test(flag.reason), false, `${label}: reason is one sentence`);
  assert.equal(flag.reason.length <= 200, true, `${label}: reason is short enough to say aloud`);
  assert.equal(/^(?:I|My|A|Home policies|Standard)\b/.test(flag.reason), true, `${label}: reason is written for the user to say`);
}

const digitsIn = (text) => (text.match(/\d+/g) || []);

// ---- spy ctx: proves a flag reads only what the plan lists ------------------------------------------------
function spyCtx(ctx, log) {
  const wrap = (name) => (...args) => { log.push({ name, args }); return ctx[name](...args); };
  return {
    holds: wrap('holds'),
    answer: wrap('answer'),
    is: wrap('is'),
    includes: wrap('includes'),
    isNotSure: wrap('isNotSure'),
    option: wrap('option'),
    cards: wrap('cards'),
    cardsWith: wrap('cardsWith'),
    get stack() { log.push({ name: 'stack', args: [] }); return ctx.stack; },
  };
}

// =======================================================================================================
suite('S9 flags: the files match the plan', (t) => {
  t('home.mjs and renters.mjs hold exactly the S9 rows of the plan (ids, buckets, kinds, domains, priorities)', () => {
    const rows = PLAN.flags.filter((f) => f.story === 'S9');
    assert.deepEqual(rows.map((r) => r.id).sort(), S9_IDS.slice().sort(), 'the plan has these three S9 flags');
    for (const file of ['home', 'renters']) {
      const flags = file === 'home' ? home : renters;
      const expected = rows.filter((r) => r.file === file);
      assert.deepEqual(flags.map((f) => f.id), expected.map((r) => r.id), `${file}.mjs ids, in plan order`);
      for (const r of expected) {
        const f = flags.find((x) => x.id === r.id);
        assert.equal(f.bucket, r.bucket, `${r.id} bucket`);
        assert.equal(f.kind, r.kind, `${r.id} kind`);
        assert.equal(f.domain, r.domain, `${r.id} domain`);
        assert.equal(f.priority, r.priority, `${r.id} priority`);
      }
    }
  });
  t('buckets are exactly: sewer, flood and renters are all Question items (never Raise or Drop)', () => {
    assert.deepEqual(S9_FLAGS.map((f) => [f.id, f.bucket]), [[SEWER, 'question'], [FLOOD, 'question'], [RENTERS, 'question']]);
  });
  t('priorities are inside the S9 range and unique', () => {
    const [lo, hi] = PLAN.ranges.S9;
    const priorities = S9_FLAGS.map((f) => f.priority);
    for (const p of priorities) assert.equal(p >= lo && p <= hi, true, `priority ${p} is inside ${lo}..${hi}`);
    assert.equal(new Set(priorities).size, priorities.length);
    const others = PLAN.flags.filter((f) => f.story !== 'S9').map((f) => f.priority);
    for (const p of priorities) assert.equal(others.includes(p), false, `priority ${p} is not used by another story`);
  });
  t('flag ids are kebab-case and every flag has a function applies and text that is a string or function', () => {
    for (const f of S9_FLAGS) {
      assert.match(f.id, /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
      assert.equal(typeof f.applies, 'function', `${f.id} applies`);
      for (const field of TEXT_FIELDS) {
        assert.equal(typeof f[field] === 'string' || typeof f[field] === 'function', true, `${f.id} ${field}`);
      }
    }
  });
  t('the flags are part of the real catalog and the real catalog validates', () => {
    for (const id of S9_IDS) assert.equal(CATALOG.flags.some((f) => f.id === id), true, `${id} is in the catalog`);
    const r = validateCatalog(CATALOG);
    assert.deepEqual(r.errors, []);
    assert.equal(r.ok, true);
  });
  t('every flag cites at least one source: each exists in the registry, is one of the plan\'s sources, and is a source of one of the plan\'s facts', () => {
    const factSources = {};
    for (const fact of homeResearch.facts) factSources[fact.id] = fact.sourceIds;
    for (const f of S9_FLAGS) {
      const row = planRow(f.id);
      assert.equal(Array.isArray(f.sourceIds) && f.sourceIds.length >= 1, true, `${f.id} has sources`);
      assert.equal(new Set(f.sourceIds).size, f.sourceIds.length, `${f.id} cites each source once`);
      const supported = [];
      for (const factId of row.factIds) {
        assert.equal(Object.prototype.hasOwnProperty.call(factSources, factId), true, `${f.id}: plan fact ${factId} exists in research`);
        for (const sid of factSources[factId]) supported.push(sid);
      }
      for (const sid of f.sourceIds) {
        assert.equal(Object.prototype.hasOwnProperty.call(SOURCES, sid), true, `${f.id} cites unknown source ${sid}`);
        assert.equal(row.sourceIds.includes(sid), true, `${f.id} cites ${sid}, which the plan does not list`);
        assert.equal(supported.includes(sid), true, `${f.id} cites ${sid}, which is not a source of its facts`);
      }
    }
  });
  t('sources are authorities from the SPEC list: NAIC, Triple-I (III) and FEMA / FloodSmart only', () => {
    const allowed = /^https:\/\/((www\.|content\.|agents\.)?(iii\.org|naic\.org|floodsmart\.gov|fema\.gov))(\/|$)/;
    for (const f of S9_FLAGS) {
      for (const sid of f.sourceIds) assert.match(SOURCES[sid].url, allowed, `${f.id} source ${sid}`);
    }
  });
  t('the flag files write no URL and no state name (sources are cited by id)', () => {
    if (!canRead) return;
    for (const file of ['home', 'renters']) {
      const src = read(`public/js/overlap/data/flags/${file}.mjs`);
      assert.equal(/https?:\/\//.test(src), false, `${file}.mjs writes a URL`);
      assert.equal(STATE_NAMES.test(src), false, `${file}.mjs names a state`);
      assert.equal(/\bTODO\b|\bFIXME\b/.test(src), false, `${file}.mjs has a TODO`);
    }
  });
  t('earth movement and water-damage sub-limit flags are not built (fast-follow, DECISIONS S3a-home-1)', () => {
    for (const f of S9_FLAGS) assert.equal(/earth|quake|sinkhole|landslide|sublimit|sub-limit/i.test(f.id), false, `${f.id}`);
    // The copy of the three flags does not wander into the fast-follow topics either.
    const answers = [
      answersFor(['home', 'renters'], { home_sewer_backup: 'no', home_flood_policy: 'no', renters_for: 'child_away', renters_child_housing: 'dorm' }),
      ownerWith({ home_sewer_backup: 'not_sure', home_flood_policy: 'not_sure' }),
    ];
    for (const a of answers) {
      for (const f of s9Of(evaluate(a))) assert.equal(/earthquake|sinkhole|landslide|sub-?limit/i.test(textOf(f)), false, `${f.id} mentions a fast-follow topic`);
    }
  });
});

// =======================================================================================================
suite('S9 flags: only the plan\'s questions and policies are read', (t) => {
  const everyAnswer = [
    answersFor(['home', 'renters'], { home_sewer_backup: 'no', home_flood_policy: 'no', renters_for: 'child_away', renters_child_housing: 'dorm' }),
    answersFor(['home', 'renters'], { home_sewer_backup: 'not_sure', home_flood_policy: 'not_sure', renters_for: 'child_away', renters_child_housing: 'not_sure' }),
    answersFor(['home', 'renters'], { home_sewer_backup: 'yes', home_flood_policy: 'yes', renters_for: 'me' }),
    answersFor(['renters'], {}),
  ];
  t('applies() and every text field touch only the plan\'s questions and policies, never cards or the stack', () => {
    for (const f of S9_FLAGS) {
      const row = planRow(f.id);
      for (const answers of everyAnswer) {
        const log = [];
        const ctx = createContext(answers);
        const spy = spyCtx(ctx, log);
        const result = f.applies(spy);
        if (result) {
          for (const field of TEXT_FIELDS) {
            if (typeof f[field] === 'function') f[field](spy, (result && result.vars) || {});
          }
        }
        assert.equal(log.length > 0, true, `${f.id} reads something`);
        for (const call of log) {
          assert.equal(['stack', 'cards', 'cardsWith'].includes(call.name), false, `${f.id} calls ${call.name}`);
          if (call.name === 'holds') assert.equal(row.holds.includes(call.args[0]), true, `${f.id} reads holds(${call.args[0]}), plan lists ${row.holds.join(', ')}`);
          else assert.equal(row.questions.includes(call.args[0]), true, `${f.id} reads ${call.name}(${call.args[0]}), plan lists ${row.questions.join(', ')}`);
        }
      }
    }
  });
  t('applies() never returns undefined (a forgotten return throws in the engine)', () => {
    for (const f of S9_FLAGS) {
      for (const answers of everyAnswer) {
        const r = f.applies(createContext(answers));
        assert.equal(r === undefined, false, `${f.id}`);
        assert.equal(r === false || r === null || r === true || (typeof r === 'object' && r !== null), true, `${f.id}`);
      }
    }
  });
});

// =======================================================================================================
suite('home-sewer-backup-missing', (t) => {
  t('fires for an owner who says their policy does not cover sewer or drain backup, at strong emphasis', () => {
    const f = get(ownerWith({ home_sewer_backup: 'no' }), SEWER);
    assert.equal(f !== undefined, true);
    assert.equal(f.bucket, 'question');
    assert.equal(f.domain, 'home');
    assert.equal(f.kind, 'within-policy');
    assert.equal(f.emphasis, 'strong', 'the user\'s own "no" confirms the gap');
  });
  t('fires on Not sure at normal emphasis, with text that asks whether it is on the policy', () => {
    const f = get(ownerWith({ home_sewer_backup: 'not_sure' }), SEWER);
    assert.equal(f !== undefined, true);
    assert.equal(f.emphasis, 'normal');
    assert.match(f.title, /^Find out if your home policy covers/);
    assert.match(f.ask, /whether your home policy has/);
    assert.match(f.background, /some policies include it/);
  });
  t('the No text asks for a quote, the cost and the limit; the Not sure text asks whether it exists first', () => {
    const no = get(ownerWith({ home_sewer_backup: 'no' }), SEWER);
    assert.match(no.title, /^Ask about adding/);
    assert.match(no.ask, /quote/);
    assert.match(no.ask, /cost/);
    assert.match(no.ask, /limit/);
    assert.match(no.ask, /sump pump/);
    assert.match(no.background, /you told us yours does not/);
    assert.equal(/some policies include it/.test(no.background), false, 'the No text does not hedge about the user\'s own answer');
    const ns = get(ownerWith({ home_sewer_backup: 'not_sure' }), SEWER);
    assert.notEqual(no.title, ns.title);
    assert.notEqual(no.ask, ns.ask);
    assert.notEqual(no.background, ns.background);
    assert.notEqual(no.reason, ns.reason);
  });
  t('stays silent on Yes (informed users are not nagged, DECISIONS D8) and when unanswered', () => {
    assert.equal(fires(ownerWith({ home_sewer_backup: 'yes' }), SEWER), false);
    assert.equal(fires(ownerWith({}), SEWER), false);
    assert.equal(fires(ownerWith({ home_flood_policy: 'no' }), SEWER), false, 'an answer to the flood question does not trigger it');
  });
  t('needs a home policy: a renter, or no policy at all, never gets it, even with a stale answer', () => {
    assert.equal(fires(answersFor(['renters'], { home_sewer_backup: 'no' }), SEWER), false);
    assert.equal(fires(answersFor(['renters'], { home_sewer_backup: 'not_sure' }), SEWER), false);
    assert.equal(fires(answersFor([], { home_sewer_backup: 'no' }), SEWER), false);
    assert.equal(fires({ home_sewer_backup: 'no' }, SEWER), false, 'no derived policies at all');
    assert.equal(fires({ policies: [], home_sewer_backup: 'no' }, SEWER), false);
  });
  t('fires for a household that both owns and rents', () => {
    assert.equal(fires(answersFor(['home', 'renters'], { home_sewer_backup: 'no' }), SEWER), true);
    assert.equal(fires(answersFor(['home', 'renters'], { home_sewer_backup: 'not_sure' }), SEWER), true);
  });
  t('copy follows the research rules: defines the term, names the add-on, says a flood policy is no substitute, gives no price or number', () => {
    for (const answer of ['no', 'not_sure']) {
      const f = get(ownerWith({ home_sewer_backup: answer }), SEWER);
      assertCleanCopy(f, `${SEWER} ${answer}`);
      assert.match(f.background, /Sewer and drain backup is when/);
      assert.match(f.background, /endorsement or rider/);
      assert.match(f.background, /flood policy would not fill the gap/);
      assert.match(f.background, /only when the backup is a direct result of a flood/);
      assert.match(f.ask, /sump pump overflow, which many policies leave out, if you have a sump pump \(the pump that keeps a basement dry\)/, 'the sump pump question is in the ask, with the term defined in a clause');
      assert.match(f.background, /small extra cost/);
      assert.equal(digitsIn(textOf(f)).length, 0, 'no price, limit or statistic is stated (none is sourced)');
      assert.equal(/\$/.test(textOf(f)), false);
      assert.equal(/\b(cheap|inexpensive|only \$)/i.test(textOf(f)), false, 'says "small extra cost", not a price');
      assert.equal(/never pays|does not pay for backup damage/i.test(textOf(f)), false, 'does not say a flood policy never pays for backup');
      assert.equal(/most common claims/i.test(textOf(f)), false, 'no unsourced claim-frequency statement');
    }
  });
  t('end to end on the real catalog: an owner who answered No', () => {
    const answers = ownerWith({ home_sewer_backup: 'no' });
    assert.deepEqual(answers.policies, ['home']);
    const r = evaluate(answers);
    assert.deepEqual(s9Of(r).map((f) => f.id), [SEWER]);
    assert.deepEqual(s9In(r, 'raise'), []);
    assert.deepEqual(s9In(r, 'drop'), []);
    const f = r.flags.question.find((x) => x.id === SEWER);
    assert.deepEqual(Object.keys(f), ['id', 'bucket', 'domain', 'kind', 'title', 'emphasis', 'background', 'ask', 'reason', 'sources']);
    assert.deepEqual(f.sources.map((s) => s.id), ['naic-homeowners-topic', 'iii-disasters-covered-homeowners', 'iii-water-damage-protection', 'iii-sewer-backups', 'naic-homeowners-shopping-tips', 'naic-endorsement-rider', 'floodsmart-home']);
    for (const s of f.sources) {
      assert.deepEqual(Object.keys(s), ['id', 'publisher', 'title', 'url', 'lastVerified']);
      assert.match(s.url, /^https:\/\//);
      assert.match(s.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
      assert.deepEqual(s, SOURCES[s.id]);
    }
    assert.equal(r.meta.visibleQuestionIds.includes('home_sewer_backup'), true);
  });
  t('end to end: Not sure, from a household that both owns and rents', () => {
    const answers = answersFor(['home', 'renters'], { home_sewer_backup: 'not_sure' });
    assert.deepEqual(answers.policies, ['home', 'renters']);
    const f = find(evaluate(answers), SEWER);
    assert.equal(f.emphasis, 'normal');
    assert.equal(f.bucket, 'question');
  });
  t('deterministic: same answers give deep-equal output, key order does not matter, and the input is never mutated', () => {
    const answers = deepFreeze(ownerWith({ home_sewer_backup: 'no', home_flood_policy: 'not_sure' }));
    assert.deepEqual(evaluate(answers), evaluate(answers));
    const reordered = { home_flood_policy: 'not_sure', home_sewer_backup: 'no', policies: ['home'] };
    assert.deepEqual(evaluate(reordered), evaluate(copy(answers)));
  });
});

// =======================================================================================================
suite('home-flood-no-separate-policy', (t) => {
  t('fires for an owner with no separate flood policy, at normal emphasis (it is not a claim about their risk)', () => {
    const f = get(ownerWith({ home_flood_policy: 'no' }), FLOOD);
    assert.equal(f !== undefined, true);
    assert.equal(f.bucket, 'question');
    assert.equal(f.domain, 'home');
    assert.equal(f.kind, 'within-policy');
    assert.equal(f.emphasis, 'normal');
  });
  t('fires on Not sure, at normal emphasis, with text that asks them to check first', () => {
    const f = get(ownerWith({ home_flood_policy: 'not_sure' }), FLOOD);
    assert.equal(f !== undefined, true);
    assert.equal(f.emphasis, 'normal');
    assert.match(f.title, /^Check whether you have a separate flood policy/);
    assert.match(f.ask, /whether you have a separate flood policy/);
    const no = get(ownerWith({ home_flood_policy: 'no' }), FLOOD);
    assert.match(no.title, /^Ask about a separate flood policy/);
    assert.notEqual(no.ask, f.ask);
    assert.notEqual(no.background, f.background);
    assert.notEqual(no.reason, f.reason);
  });
  t('stays silent on Yes and when unanswered', () => {
    assert.equal(fires(ownerWith({ home_flood_policy: 'yes' }), FLOOD), false);
    assert.equal(fires(ownerWith({}), FLOOD), false);
    assert.equal(fires(ownerWith({ home_sewer_backup: 'no' }), FLOOD), false, 'an answer to the sewer question does not trigger it');
  });
  t('needs a home policy: renters and people with no policy never get it', () => {
    assert.equal(fires(answersFor(['renters'], { home_flood_policy: 'no' }), FLOOD), false);
    assert.equal(fires(answersFor(['renters'], { home_flood_policy: 'not_sure' }), FLOOD), false);
    assert.equal(fires(answersFor([], { home_flood_policy: 'no' }), FLOOD), false);
    assert.equal(fires({ home_flood_policy: 'no' }, FLOOD), false);
  });
  t('fires for a household that both owns and rents', () => {
    assert.equal(fires(answersFor(['home', 'renters'], { home_flood_policy: 'no' }), FLOOD), true);
  });
  t('copy: the exclusion is stated as how policies are written, the statistic carries its years, the waiting period is hedged, limits point to floodsmart.gov', () => {
    for (const answer of ['no', 'not_sure']) {
      const f = get(ownerWith({ home_flood_policy: answer }), FLOOD);
      assertCleanCopy(f, `${FLOOD} ${answer}`);
      assert.match(f.background, /^Standard home policies do not cover flood damage/);
      assert.match(f.background, /not a prediction about your home/);
      assert.match(f.background, /National Flood Insurance Program/);
      assert.match(f.background, /private insurers/);
      assert.match(f.background, /about 29 percent of claims to the National Flood Insurance Program from 2014 to 2024 came from outside the areas mapped as high risk/);
      assert.match(f.background, /usually does not start until 30 days after you buy it/);
      assert.match(f.background, /some private policies have the same wait/);
      assert.match(f.ask, /confirm them at floodsmart\.gov/);
      assert.match(f.ask, /cost/);
      assert.match(f.ask, /when it would start/);
      assert.match(f.ask, /your home and (for )?your belongings/);
      // The only numbers: the statistic, its two years, and the waiting period.
      assert.deepEqual(digitsIn(textOf(f)), ['29', '2014', '2024', '30']);
      assert.equal(/\$/.test(textOf(f)), false, 'no dollar limit is stated; limits are confirmed at floodsmart.gov');
      assert.equal(/high-risk zone[^.]*safe|you are safe|you will be flooded|your home (is|will be) at risk/i.test(textOf(f)), false, 'makes no claim about the user\'s own risk');
    }
  });
  t('end to end on the real catalog: an owner who answered No', () => {
    const answers = ownerWith({ home_flood_policy: 'no' });
    const r = evaluate(answers);
    assert.deepEqual(s9Of(r).map((f) => f.id), [FLOOD]);
    assert.deepEqual(s9In(r, 'raise'), []);
    assert.deepEqual(s9In(r, 'drop'), []);
    const f = r.flags.question.find((x) => x.id === FLOOD);
    assert.deepEqual(f.sources.map((s) => s.id), ['iii-flood-insurance', 'naic-flood-insurance', 'floodsmart-home', 'fema-nfip-waiting-period', 'floodsmart-flood-risk', 'iii-disasters-covered-homeowners']);
    for (const s of f.sources) assert.deepEqual(s, SOURCES[s.id]);
  });
  t('end to end: Not sure, with both exclusion questions answered, orders sewer before flood', () => {
    const answers = ownerWith({ home_sewer_backup: 'not_sure', home_flood_policy: 'not_sure' });
    const r = evaluate(answers);
    assert.deepEqual(s9Of(r).map((f) => f.id), [SEWER, FLOOD], 'priority 310 then 320');
  });
  t('deterministic and non-mutating', () => {
    const answers = deepFreeze(ownerWith({ home_flood_policy: 'no' }));
    assert.deepEqual(evaluate(answers), evaluate(answers));
  });
});

// =======================================================================================================
suite('renters-child-vs-parents-home', (t) => {
  // A parent who owns the home and pays for a child's renters policy ticks Home and Renters in Q1.
  const parent = (housing, more) => answersFor(['home', 'renters'], { renters_for: 'child_away', ...(housing ? { renters_child_housing: housing } : {}), ...(more || {}) });

  t('fires for a parent who owns their home, ticked Home and Renters for the child\'s policy, and says the child is in a dorm', () => {
    const answers = parent('dorm');
    assert.deepEqual(answers.policies, ['home', 'renters'], 'Home and Renters are both ticked in Q1 (DECISIONS S5-15, R1-4)');
    const f = get(answers, RENTERS);
    assert.equal(f !== undefined, true);
    assert.equal(f.bucket, 'question');
    assert.equal(f.domain, 'renters');
    assert.equal(f.kind, 'cross-policy');
    assert.equal(f.emphasis, 'normal');
  });
  t('fires for a household that owns one place and rents another and pays for a child\'s policy', () => {
    const answers = answersFor(['home', 'renters'], { renters_for: 'child_away', renters_child_housing: 'off_campus' });
    assert.deepEqual(answers.policies, ['home', 'renters']);
    assert.equal(fires(answers, RENTERS), true);
  });
  t('dorm text: generally covered by the home policy, so the renters policy may be doing the same job; asks what the home policy covers', () => {
    const f = get(parent('dorm'), RENTERS);
    assert.match(f.title, /^Check whether your home policy already covers your child's belongings/);
    assert.match(f.background, /dorm/);
    assert.equal(/off campus/.test(f.background + f.ask + f.reason), false, 'the dorm text speaks only to a dorm');
    assert.match(f.background, /generally covered/);
    assert.match(f.background, /may be doing a job your home policy already does/);
    assert.match(f.background, /off-premises coverage, which protects belongings away from home/);
    assert.match(f.background, /deductible \(what you pay first/);
    assert.match(f.ask, /Ask your home insurer/);
    assert.match(f.ask, /up to how much/);
    assert.match(f.ask, /enrolled in classes/);
    assert.match(f.ask, /renters insurer/);
  });
  t('off-campus text: the home policy likely does not reach; confirm the renters policy is the right one; never suggests dropping it', () => {
    const f = get(parent('off_campus'), RENTERS);
    assert.match(f.title, /^Confirm your child's renters policy/);
    assert.match(f.background, /off campus is likely not covered by your home policy/);
    assert.match(f.background, /probably not a duplicate/);
    assert.match(f.background, /school's insurance do not cover your child's personal items/);
    assert.equal(/dorm/.test(textOf(f)), false, 'the off-campus text speaks only to an off-campus home');
    assert.match(f.ask, /probably needs their own renters policy/);
    assert.match(f.ask, /limit is enough to replace what your child owns/);
    assert.equal(/\b(cancel|drop|duplicate it|you can stop)\b/i.test(f.ask + f.reason), false);
  });
  t('Not sure on the housing question asks both: dorm generally covered, off campus likely not', () => {
    const f = get(parent('not_sure'), RENTERS);
    assert.equal(f !== undefined, true, 'fires on Not sure');
    assert.equal(f.emphasis, 'normal');
    assert.match(f.background, /depends on where they live/);
    assert.match(f.background, /in a dorm/);
    assert.match(f.background, /off campus/);
    assert.match(f.background, /generally covered/);
    assert.match(f.background, /likely not covered/);
    assert.match(f.ask, /where they live now/);
  });
  t('an unanswered housing question is treated like Not sure (the plan\'s trigger needs only child_away and a home policy)', () => {
    const unanswered = get(parent(null), RENTERS);
    const notSure = get(parent('not_sure'), RENTERS);
    assert.equal(unanswered !== undefined, true);
    assert.deepEqual(unanswered, notSure);
  });
  t('stays silent when the policy is for the user, and when renters_for is unanswered', () => {
    assert.equal(fires(answersFor(['home', 'renters'], { renters_for: 'me' }), RENTERS), false);
    assert.equal(fires(answersFor(['renters'], { renters_for: 'me' }), RENTERS), false);
    assert.equal(fires(answersFor(['home', 'renters'], { renters_for: 'me' }), RENTERS), false);
    assert.equal(fires(answersFor(['home', 'renters'], {}), RENTERS), false);
    assert.equal(fires(answersFor(['home', 'renters'], {}), RENTERS), false);
  });
  t('needs a home policy: a renter who answers child_away has no parent\'s home policy to compare with', () => {
    assert.equal(fires(answersFor(['renters'], { renters_for: 'child_away', renters_child_housing: 'dorm' }), RENTERS), false);
    assert.equal(fires(answersFor(['renters'], { renters_for: 'child_away' }), RENTERS), false);
    assert.equal(fires(answersFor(['renters'], { renters_for: 'child_away' }), RENTERS), false);
  });
  t('without the Renters tick, a homeowner is never asked, so the stale answer is pruned and the flag stays silent', () => {
    assert.equal(fires(ownerWith({ renters_for: 'child_away', renters_child_housing: 'dorm' }), RENTERS), false);
    assert.equal(fires(ownerWith({ renters_for: 'child_away' }), RENTERS), false);
  });
  t('copy: hedged with "generally", "may" and "likely"; no 10 percent rule, no age number, no cancel advice; every variant is clean', () => {
    for (const housing of ['dorm', 'off_campus', 'not_sure', null]) {
      const f = get(parent(housing), RENTERS);
      assertCleanCopy(f, `${RENTERS} ${housing}`);
      assert.match(textOf(f), /\b(generally|likely|probably)\b/);
      assert.match(textOf(f), /\bmay\b/);
      assert.equal(digitsIn(textOf(f)).length, 0, 'no figure: the 10 percent dorm figure is one undated brochure, and the age limit differs by source');
      assert.equal(/percent|%/.test(textOf(f)), false);
      assert.equal(/\b(cancel|drop it|duplicate it)\b/i.test(textOf(f)), false, 'never a Drop');
      assert.match(f.ask, /Ask your home insurer/);
    }
  });
  t('the three variants differ in title, background, ask and reason', () => {
    const d = get(parent('dorm'), RENTERS);
    const o = get(parent('off_campus'), RENTERS);
    const n = get(parent('not_sure'), RENTERS);
    for (const field of ['background', 'ask', 'reason']) {
      assert.equal(new Set([d[field], o[field], n[field]]).size, 3, `${field} differs`);
    }
    assert.notEqual(d.title, o.title);
    assert.equal(d.title, n.title, 'dorm and unclear share the "check" title');
  });
  t('end to end on the real catalog: the parent who owns their home (dorm)', () => {
    const answers = parent('dorm');
    const r = evaluate(answers);
    assert.deepEqual(s9Of(r).map((f) => f.id), [RENTERS]);
    assert.deepEqual(s9In(r, 'raise'), []);
    assert.deepEqual(s9In(r, 'drop'), []);
    const f = r.flags.question.find((x) => x.id === RENTERS);
    assert.deepEqual(f.sources.map((s) => s.id), ['iii-college-student-losses', 'naic-renters-college-2024', 'naic-renters-college-students', 'iii-am-i-covered', 'iii-renters-insurance']);
    for (const s of f.sources) assert.deepEqual(s, SOURCES[s.id]);
    assert.deepEqual(r.meta.visibleQuestionIds.filter((id) => id.startsWith('renters')), ['renters_for', 'renters_child_housing']);
  });
  t('end to end: the Both household with an off-campus child', () => {
    const r = evaluate(answersFor(['home', 'renters'], { renters_for: 'child_away', renters_child_housing: 'off_campus' }));
    const f = r.flags.question.find((x) => x.id === RENTERS);
    assert.match(f.title, /^Confirm your child's renters policy/);
    assert.deepEqual(s9In(r, 'drop'), []);
  });
  t('deterministic and non-mutating', () => {
    const answers = deepFreeze(parent('off_campus'));
    assert.deepEqual(evaluate(answers), evaluate(answers));
  });
});

// =======================================================================================================
suite('S9 flags: every combination of the questions they read (real catalog, plain answers)', (t) => {
  // Every combination of the two Q1 ticks these flags read: no home or renters policy, either one, or both.
  const HELD = [[], ['home'], ['renters'], ['home', 'renters']];
  const YNN = [undefined, 'yes', 'no', 'not_sure'];
  const FOR = [undefined, 'me', 'child_away'];
  const HOUSING = [undefined, 'dorm', 'off_campus', 'not_sure'];

  // Written independently of the flags: the behaviour the plan describes.
  function expected(held, sewer, flood, rf, housing) {
    const holdsHome = held.includes('home');
    const holdsRenters = held.includes('renters');
    const out = [];
    if (holdsHome && (sewer === 'no' || sewer === 'not_sure')) out.push([SEWER, sewer]);
    if (holdsHome && (flood === 'no' || flood === 'not_sure')) out.push([FLOOD, flood]);
    if (holdsHome && holdsRenters && rf === 'child_away') {
      out.push([RENTERS, housing === 'dorm' || housing === 'off_campus' ? housing : 'unclear']);
    }
    return out;
  }

  const variantOf = (flag) => {
    const text = textOf(flag);
    if (flag.id === SEWER) return flag.emphasis === 'strong' ? 'no' : 'not_sure';
    if (flag.id === FLOOD) return /^Ask about a separate flood policy/.test(flag.title) ? 'no' : 'not_sure';
    const dorm = /dorm/.test(text);
    const off = /off campus/.test(text);
    return dorm && off ? 'unclear' : dorm ? 'dorm' : off ? 'off_campus' : 'none';
  };

  t('exactly the expected flags fire, in priority order, with the expected variant, all in the Question bucket, with clean copy', () => {
    let runs = 0;
    let fired = 0;
    for (const held of HELD) for (const sewer of YNN) for (const flood of YNN) for (const rf of FOR) for (const housing of HOUSING) {
      const o = {};
      if (sewer) o.home_sewer_backup = sewer;
      if (flood) o.home_flood_policy = flood;
      if (rf) o.renters_for = rf;
      if (housing) o.renters_child_housing = housing;
      const answers = answersFor(held, o);
      const r = evaluate(answers);
      const label = JSON.stringify({ held, sewer, flood, rf, housing });
      const got = s9Of(r);
      assert.deepEqual(got.map((f) => [f.id, variantOf(f)]), expected(held, sewer, flood, rf, housing), label);
      assert.deepEqual(s9In(r, 'raise'), [], label);
      assert.deepEqual(s9In(r, 'drop'), [], label);
      assert.equal(got.length, s9In(r, 'question').length, label);
      for (const f of got) {
        assertCleanCopy(f, `${f.id} ${label}`);
        assert.equal(f.emphasis === 'strong', f.id === SEWER && variantOf(f) === 'no', `${f.id} emphasis ${label}`);
        assert.equal(f.sources.length >= 1, true);
      }
      runs++;
      fired += got.length;
    }
    assert.equal(runs, 4 * 4 * 4 * 3 * 4);
    assert.equal(fired > 0, true);
  });

  t('Not sure never produces a Raise or Drop from these flags and is never silent where the plan says it fires', () => {
    for (const q of ['home_sewer_backup', 'home_flood_policy']) {
      const r = evaluate(ownerWith({ [q]: 'not_sure' }));
      assert.equal(s9Of(r).length, 1, `${q} Not sure fires exactly one S9 flag`);
      assert.equal(s9Of(r)[0].bucket, 'question');
    }
    const r = evaluate(answersFor(['home', 'renters'], { renters_for: 'child_away', renters_child_housing: 'not_sure' }));
    assert.deepEqual(s9Of(r).map((f) => f.id), [RENTERS]);
  });
});
