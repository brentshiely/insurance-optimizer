// Story S6: tests for the umbrella core and other-vehicle flags (flags/umbrella.mjs, flags/vehicles.mjs).
// Everything here runs through the real catalog: real questions, real sources, the real stack engine.
// Runs under jsc and Node (no file reads, no URL, no console).
import { suite, assert, assertSnapshot } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import UMBRELLA_FLAGS from '../../public/js/overlap/data/flags/umbrella.mjs';
import VEHICLE_FLAGS from '../../public/js/overlap/data/flags/vehicles.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { evaluate, createContext } from '../../public/js/overlap/engine/evaluate.mjs';
import { validateCatalog } from '../../public/js/overlap/engine/validate.mjs';
import PLAN from '../fixtures/flagPlan.mjs';
import umbrellaResearch from '../../research/umbrella-liability-stack.mjs';
import { deepFreeze, copy } from '../helpers/purity.mjs';
import FLAGS_SNAPSHOT from '../snapshots/umbrella-core-flags.snap.mjs';
import SCENARIOS_SNAPSHOT from '../snapshots/stack-scenarios.snap.mjs';
import { buildUmbrellaCoreFlags, buildStackScenarios } from '../snapshots/builders/umbrellaCoreFlags.mjs';

const ID = {
  home: 'umbrella-home-below-required-min',
  auto: 'umbrella-auto-below-required-min',
  motorcycle: 'umbrella-motorcycle-below-required-min',
  boat: 'umbrella-boat-below-required-min',
  over: 'umbrella-primary-liability-overbought',
  unconfirmed: 'umbrella-limits-unconfirmed',
};
const S6_IDS = Object.keys(ID).map((k) => ID[k]);

// Answers for an umbrella household. `more` overrides or adds answers; `policies` overrides the policy set.
const U = (more, policies) => ({ policies: policies || ['auto', 'home', 'umbrella'], umbrella_limit: '1m', ...more });
const ALL4 = ['auto', 'home', 'motorcycle', 'boat', 'umbrella'];
const run = (answers) => evaluate(answers);
const ids = (r, bucket) => r.flags[bucket].map((f) => f.id);
const firedS6 = (r) => [...ids(r, 'raise'), ...ids(r, 'drop'), ...ids(r, 'question')].filter((id) => S6_IDS.includes(id));
const flagOf = (r, id) => [...r.flags.raise, ...r.flags.drop, ...r.flags.question].find((f) => f.id === id);

const STATE_NAMES = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington state|west virginia|wisconsin|wyoming)\b/i;
const BANNED = /\{\{|\}\}|—|–|todo|tbd|lorem|home equity|next screen|generic pattern/i;
// Words that would assert what research could not confirm (DECISIONS S3a-umbrella-1): a shortfall voiding the umbrella.
const OVERCLAIM = /\bvoid|invalidat|will not pay|won't pay|never pay|denied|forfeit|no coverage at all/i;

// ---- independent expectations (a ladder rank per option; not the engine's own comparison) ----------------
const LIMIT_RANK = { lower: 0, '100_300': 1, '250_500': 2, '500_500': 3, '300k': 1, '500k': 2, '1m': 3 };
const REQ_RANK = { '100_300': 1, '250_500': 2, '500_500': 3, '300k': 1, '500k': 2 };
const below = (limit, req) => limit !== 'not_sure' && req !== 'not_sure' && LIMIT_RANK[limit] < REQ_RANK[req];
const above = (limit, req) => limit !== 'not_sure' && req !== 'not_sure' && LIMIT_RANK[limit] > REQ_RANK[req];

// ======================================================================================================
suite('umbrella core flags: the set of flags matches the plan', (t) => {
  t('the two flag files hold exactly the six planned S6 flags: ids, buckets, kinds, domains, priorities and files', () => {
    const planned = PLAN.flags.filter((f) => f.story === 'S6');
    assert.equal(planned.length, 6);
    const actual = [...UMBRELLA_FLAGS.map((f) => ({ file: 'umbrella', f })), ...VEHICLE_FLAGS.map((f) => ({ file: 'vehicles', f }))];
    assert.deepEqual(actual.map((a) => a.f.id).sort(), planned.map((p) => p.id).sort());
    for (const p of planned) {
      const a = actual.find((x) => x.f.id === p.id);
      assert.equal(a.file, p.file, `${p.id} lives in flags/${p.file}.mjs`);
      assert.equal(a.f.bucket, p.bucket, `${p.id} bucket`);
      assert.equal(a.f.kind, p.kind, `${p.id} kind`);
      assert.equal(a.f.domain, p.domain, `${p.id} domain`);
      assert.equal(a.f.priority, p.priority, `${p.id} priority`);
    }
  });

  t('the ids and buckets are the ones documented for the story', () => {
    assert.deepEqual(UMBRELLA_FLAGS.map((f) => [f.id, f.bucket]).sort(), [
      [ID.home, 'raise'], [ID.auto, 'raise'], [ID.over, 'question'], [ID.unconfirmed, 'question'],
    ].sort());
    assert.deepEqual(VEHICLE_FLAGS.map((f) => [f.id, f.bucket]).sort(), [[ID.motorcycle, 'raise'], [ID.boat, 'raise']].sort());
  });

  t('each flag cites only sources the plan names for it, and every one of those belongs to one of the flag\'s planned facts', () => {
    const planned = PLAN.flags.filter((f) => f.story === 'S6');
    const factSources = (factId) => umbrellaResearch.facts.find((x) => x.id === factId).sourceIds;
    for (const p of planned) {
      const flag = [...UMBRELLA_FLAGS, ...VEHICLE_FLAGS].find((f) => f.id === p.id);
      assert.equal(flag.sourceIds.length >= 1, true, `${p.id} has a source`);
      const allowedByFacts = [];
      for (const factId of p.factIds) for (const s of factSources(factId)) if (!allowedByFacts.includes(s)) allowedByFacts.push(s);
      for (const sid of flag.sourceIds) {
        assert.includes(p.sourceIds, sid, `${p.id} cites ${sid}, which the plan does not list`);
        assert.includes(allowedByFacts, sid, `${p.id} cites ${sid}, which is not a source of its planned facts`);
        assert.equal(Object.prototype.hasOwnProperty.call(SOURCES, sid), true, `${sid} is in the registry`);
      }
      assert.equal(new Set(flag.sourceIds).size, flag.sourceIds.length, `${p.id} lists a source twice`);
    }
  });

  t('the real catalog, flags included, passes validateCatalog', () => {
    const r = validateCatalog(CATALOG);
    assert.deepEqual(r.errors, []);
    assert.equal(r.ok, true);
    for (const id of S6_IDS) assert.equal(CATALOG.flags.some((f) => f.id === id), true, `${id} is in the catalog`);
  });

  t('no S6 flag is a Drop (nothing authoritative supports cutting primary liability once an umbrella exists)', () => {
    for (const f of [...UMBRELLA_FLAGS, ...VEHICLE_FLAGS]) assert.notEqual(f.bucket, 'drop', f.id);
  });
});

// ======================================================================================================
suite('umbrella-home-below-required-min', (t) => {
  t('fires when the home limit is below what the umbrella requires, in the Raise bucket', () => {
    const r = run(U({ home_liability: '300k', umbrella_min_home: '500k' }));
    assert.deepEqual(ids(r, 'raise'), [ID.home]);
    const f = flagOf(r, ID.home);
    assert.equal(f.bucket, 'raise');
    assert.equal(f.domain, 'umbrella');
    assert.equal(f.kind, 'cross-policy');
    assert.equal(f.title, 'Raise your home liability limit to what your umbrella asks for');
  });
  t('fires for "Lower than $300,000" against either requirement, with strong emphasis; a $300,000 limit is normal emphasis', () => {
    for (const req of ['300k', '500k']) {
      const f = flagOf(run(U({ home_liability: 'lower', umbrella_min_home: req })), ID.home);
      assert.equal(f.emphasis, 'strong', `lower vs ${req}`);
      assert.match(f.background, /lower than \$300,000/);
    }
    const normal = flagOf(run(U({ home_liability: '300k', umbrella_min_home: '500k' })), ID.home);
    assert.equal(normal.emphasis, 'normal');
    assert.equal(/most insurers want/.test(normal.background), false, 'the yardstick sentence appears only below the typical figure');
  });
  t('does not fire when the limit meets or exceeds the requirement', () => {
    for (const [l, r] of [['300k', '300k'], ['500k', '500k'], ['500k', '300k'], ['1m', '500k'], ['1m', '300k']]) {
      assert.equal(ids(run(U({ home_liability: l, umbrella_min_home: r })), 'raise').includes(ID.home), false, `${l} vs ${r}`);
    }
  });
  t('does not fire on Not sure (either answer, or both); umbrella-limits-unconfirmed covers it', () => {
    for (const [l, r] of [['not_sure', '500k'], ['300k', 'not_sure'], ['not_sure', 'not_sure'], ['lower', 'not_sure']]) {
      const res = run(U({ home_liability: l, umbrella_min_home: r }));
      assert.equal(ids(res, 'raise').includes(ID.home), false, `${l} vs ${r}`);
      assert.equal(ids(res, 'question').includes(ID.unconfirmed), true, `${l} vs ${r} is picked up by the Question twin`);
    }
  });
  t('does not fire on missing answers, without a home policy, or without an umbrella', () => {
    assert.equal(firedS6(run(U({}))).length, 0);
    assert.equal(firedS6(run(U({ home_liability: '300k' }))).length, 0);
    assert.deepEqual(firedS6(run(U({ home_liability: '300k', umbrella_min_home: '500k' }, ['auto', 'umbrella']))), [], 'no home policy: the home answers are pruned');
    assert.deepEqual(firedS6(run({ policies: ['auto', 'home'], umbrella_limit: '1m', home_liability: '300k', umbrella_min_home: '500k' })), []);
  });
  t('the copy names both numbers, asks the insurer, never says the umbrella is void, and the reason is one repeatable line', () => {
    const f = flagOf(run(U({ home_liability: '300k', umbrella_min_home: '500k' })), ID.home);
    for (const part of ['background', 'ask', 'reason']) assert.equal(typeof f[part] === 'string' && f[part].length > 20, true, part);
    assert.match(f.background, /\$500,000/);
    assert.match(f.background, /\$300,000/);
    assert.match(f.background, /extra liability coverage/);
    assert.match(f.background, /found no published rule/);
    assert.match(f.ask, /^Ask your agent/);
    assert.match(f.ask, /still respond the way I expect/);
    assert.match(f.ask, /at least \$500,000/);
    assert.equal(f.reason, 'My umbrella asks for $500,000 of liability on my home policy and mine is $300,000, so I want it raised to match.');
    assert.equal(OVERCLAIM.test(`${f.background} ${f.ask} ${f.reason}`), false);
  });
  t('cites exactly its three planned sources, resolved', () => {
    const f = flagOf(run(U({ home_liability: '300k', umbrella_min_home: '500k' })), ID.home);
    assert.deepEqual(f.sources.map((s) => s.id), ['iii-should-i-purchase-umbrella', 'iii-what-is-umbrella-liability-policy', 'iii-homebuyers-handbook']);
    for (const s of f.sources) {
      assert.deepEqual(Object.keys(s), ['id', 'publisher', 'title', 'url', 'lastVerified']);
      assert.match(s.url, /^https:\/\//);
    }
  });
});

// ======================================================================================================
suite('umbrella-auto-below-required-min', (t) => {
  t('fires when the auto limit is below what the umbrella requires', () => {
    const r = run(U({ auto_liability: '100_300', umbrella_min_auto: '250_500' }));
    assert.deepEqual(ids(r, 'raise'), [ID.auto]);
    const f = flagOf(r, ID.auto);
    assert.equal(f.bucket, 'raise');
    assert.equal(f.domain, 'umbrella');
    assert.equal(f.emphasis, 'normal');
    assert.equal(f.title, 'Raise your auto liability limit to what your umbrella asks for');
  });
  t('fires for "Lower than 100/300" against every requirement', () => {
    for (const req of ['100_300', '250_500', '500_500']) {
      const f = flagOf(run(U({ auto_liability: 'lower', umbrella_min_auto: req })), ID.auto);
      assert.equal(Boolean(f), true, `lower vs ${req}`);
      assert.match(f.background, /lower than 100\/300/);
      assert.equal(f.emphasis, 'normal', 'the auto yardstick has no stated format, so it never drives emphasis');
    }
  });
  t('does not fire when the limit meets or exceeds the requirement', () => {
    for (const [l, r] of [['100_300', '100_300'], ['250_500', '250_500'], ['500_500', '500_500'], ['250_500', '100_300'], ['500_500', '250_500']]) {
      assert.equal(ids(run(U({ auto_liability: l, umbrella_min_auto: r })), 'raise').includes(ID.auto), false, `${l} vs ${r}`);
    }
  });
  t('does not fire on Not sure, missing answers, without auto, or without an umbrella', () => {
    for (const [l, r] of [['not_sure', '250_500'], ['100_300', 'not_sure'], ['not_sure', 'not_sure'], ['lower', 'not_sure']]) {
      assert.equal(ids(run(U({ auto_liability: l, umbrella_min_auto: r })), 'raise').includes(ID.auto), false, `${l} vs ${r}`);
    }
    assert.deepEqual(firedS6(run(U({ auto_liability: '100_300' }))), []);
    assert.deepEqual(firedS6(run(U({ auto_liability: '100_300', umbrella_min_auto: '250_500' }, ['home', 'umbrella']))), []);
    assert.deepEqual(firedS6(run({ policies: ['auto'], auto_liability: '100_300', umbrella_min_auto: '250_500' })), []);
  });
  t('the copy explains the three-number format, names both limits, asks the insurer, and never says the umbrella is void', () => {
    const f = flagOf(run(U({ auto_liability: '100_300', umbrella_min_auto: '250_500' })), ID.auto);
    assert.match(f.background, /usually written as three numbers, like 250\/500\/100/);
    assert.match(f.background, /the most for property damage/);
    assert.match(f.background, /This tool asks only about the first two/);
    assert.equal(/two numbers/.test(f.background), false, 'NAIC describes up to three numbers, so the copy must not say two');
    assert.match(f.background, /in thousands of dollars/);
    assert.match(f.background, /yours asks for 250\/500 and your auto policy has 100\/300/);
    assert.match(f.background, /does not say how that number is split/, 'the Triple-I auto figure has no stated format');
    assert.match(f.ask, /^Ask your agent/);
    assert.equal(f.reason, 'My umbrella asks for 250/500 of liability on my auto policy and mine is 100/300, so I want it raised to match.');
    assert.equal(OVERCLAIM.test(`${f.background} ${f.ask} ${f.reason}`), false);
  });
  t('cites exactly its three planned sources', () => {
    const f = flagOf(run(U({ auto_liability: '100_300', umbrella_min_auto: '250_500' })), ID.auto);
    assert.deepEqual(f.sources.map((s) => s.id), ['iii-should-i-purchase-umbrella', 'iii-what-is-umbrella-liability-policy', 'naic-auto-shopping-tool']);
  });
});

// ======================================================================================================
suite('umbrella-motorcycle-below-required-min and umbrella-boat-below-required-min (flags/vehicles.mjs)', (t) => {
  const CASES = [
    ['motorcycle', ID.motorcycle, 'motorcycle_liability', 'umbrella_min_motorcycle', 'Raise your motorcycle liability limit to what your umbrella asks for',
      ['naic-what-does-auto-insurance-cover', 'iii-motorcycle-insurance', 'iii-should-i-purchase-umbrella']],
    ['boat', ID.boat, 'boat_liability', 'umbrella_min_boat', 'Raise your boat liability limit to what your umbrella asks for',
      ['iii-boat-insurance-and-safety', 'naic-summer-safety-insured', 'iii-should-i-purchase-umbrella']],
  ];
  for (const [vehicle, flagId, limitQ, reqQ, title, sources] of CASES) {
    const policies = [vehicle, 'umbrella'];
    t(`${vehicle}: fires below the requirement (every limit against every requirement), in the Raise bucket, domain vehicles`, () => {
      for (const l of ['lower', '100_300', '250_500', '500_500']) {
        for (const r of ['100_300', '250_500', '500_500']) {
          const res = run(U({ [limitQ]: l, [reqQ]: r }, policies));
          assert.equal(ids(res, 'raise').includes(flagId), below(l, r), `${vehicle} ${l} vs ${r}`);
        }
      }
      const f = flagOf(run(U({ [limitQ]: '100_300', [reqQ]: '250_500' }, policies)), flagId);
      assert.equal(f.bucket, 'raise');
      assert.equal(f.domain, 'vehicles');
      assert.equal(f.kind, 'cross-policy');
      assert.equal(f.emphasis, 'normal');
      assert.equal(f.title, title);
    });
    t(`${vehicle}: a "Lower than 100/300" limit is below every requirement offered`, () => {
      for (const r of ['100_300', '250_500', '500_500']) {
        const f = flagOf(run(U({ [limitQ]: 'lower', [reqQ]: r }, policies)), flagId);
        assert.equal(Boolean(f), true, r);
        assert.match(f.background, /lower than 100\/300/);
      }
    });
    t(`${vehicle}: Not sure never fires it, the Question twin picks it up`, () => {
      for (const [l, r] of [['not_sure', '250_500'], ['100_300', 'not_sure'], ['not_sure', 'not_sure'], ['lower', 'not_sure']]) {
        const res = run(U({ [limitQ]: l, [reqQ]: r }, policies));
        assert.equal(ids(res, 'raise').includes(flagId), false, `${l} vs ${r}`);
        assert.equal(ids(res, 'question').includes(ID.unconfirmed), true, `${l} vs ${r}`);
      }
    });
    t(`${vehicle}: needs the umbrella and the ${vehicle}; missing answers do not fire it`, () => {
      assert.deepEqual(firedS6(run({ policies: [vehicle], [limitQ]: '100_300', [reqQ]: '250_500' })), []);
      assert.deepEqual(firedS6(run(U({ [limitQ]: '100_300', [reqQ]: '250_500' }, ['auto', 'home', 'umbrella']))), [], 'the answers are pruned without the vehicle');
      assert.deepEqual(firedS6(run(U({}, policies))), []);
      assert.deepEqual(firedS6(run(U({ [limitQ]: '100_300' }, policies))), []);
    });
    t(`${vehicle}: the copy asks what the umbrella requires, in writing, and says no published standard was found`, () => {
      const f = flagOf(run(U({ [limitQ]: '100_300', [reqQ]: '250_500' }, policies)), flagId);
      assert.match(f.background, /found no published standard/);
      assert.match(f.background, new RegExp(`your umbrella asks for 250/500 on your ${vehicle} policy and yours has 100/300`));
      assert.match(f.ask, /^Ask your agent/);
      assert.match(f.ask, /in writing/);
      assert.match(f.ask, new RegExp(`raise my ${vehicle} liability to 250/500`));
      assert.equal(f.reason, `My umbrella asks for 250/500 on my ${vehicle} policy and mine is 100/300, so I want it raised to match.`);
      assert.equal(OVERCLAIM.test(`${f.background} ${f.ask} ${f.reason}`), false);
    });
    t(`${vehicle}: cites exactly its planned sources`, () => {
      const f = flagOf(run(U({ [limitQ]: '100_300', [reqQ]: '250_500' }, policies)), flagId);
      assert.deepEqual(f.sources.map((s) => s.id), sources);
    });
  }
  t('the motorcycle background says a car policy does not cover a motorcycle; the boat background says a home policy gives a boat little or no liability cover', () => {
    const m = flagOf(run(U({ motorcycle_liability: '100_300', umbrella_min_motorcycle: '250_500' }, ['motorcycle', 'umbrella'])), ID.motorcycle);
    assert.match(m.background, /car policy does not cover a motorcycle/);
    const b = flagOf(run(U({ boat_liability: '100_300', umbrella_min_boat: '250_500' }, ['boat', 'umbrella'])), ID.boat);
    assert.match(b.background, /home policy usually gives a boat little or no liability protection/);
  });
  t('the motorcycle and boat flags are independent of each other and of auto and home', () => {
    const r = run(U({ motorcycle_liability: '100_300', umbrella_min_motorcycle: '500_500', boat_liability: '500_500', umbrella_min_boat: '500_500', auto_liability: '500_500', umbrella_min_auto: '100_300', home_liability: '1m', umbrella_min_home: '300k' }, ALL4));
    assert.deepEqual(ids(r, 'raise').filter((id) => S6_IDS.includes(id)), [ID.motorcycle]);
  });
});

// ======================================================================================================
suite('umbrella-primary-liability-overbought', (t) => {
  t('fires as a Question (never a Drop) when the auto limit is above the requirement', () => {
    const r = run(U({ auto_liability: '500_500', umbrella_min_auto: '250_500' }));
    assert.deepEqual(ids(r, 'question').filter((id) => S6_IDS.includes(id)), [ID.over]);
    assert.deepEqual(ids(r, 'drop'), []);
    const f = flagOf(r, ID.over);
    assert.equal(f.bucket, 'question');
    assert.equal(f.emphasis, 'normal');
    assert.equal(f.title, 'Ask whether your extra auto liability is worth keeping');
    assert.match(f.background, /Your auto liability limit is 500\/500 and your umbrella asks for 250\/500\./);
    assert.match(f.reason, /I carry more auto liability than my umbrella requires/);
  });
  t('fires when the home limit is above the requirement, and names both when both are above', () => {
    const home = flagOf(run(U({ home_liability: '1m', umbrella_min_home: '500k' })), ID.over);
    assert.equal(home.title, 'Ask whether your extra home liability is worth keeping');
    assert.match(home.background, /Your home liability limit is \$1 million and your umbrella asks for \$500,000\./);
    const both = flagOf(run(U({ auto_liability: '500_500', umbrella_min_auto: '100_300', home_liability: '500k', umbrella_min_home: '300k' })), ID.over);
    assert.equal(both.title, 'Ask whether your extra auto and home liability is worth keeping');
    assert.match(both.background, /Your auto liability limit is 500\/500 and your umbrella asks for 100\/300\. Your home liability limit is \$500,000 and your umbrella asks for \$300,000\./);
  });
  t('only fires on a known limit above a known requirement: not on equal, below, Not sure or missing answers', () => {
    for (const [l, r] of [['250_500', '250_500'], ['100_300', '250_500'], ['lower', '100_300'], ['not_sure', '100_300'], ['500_500', 'not_sure']]) {
      assert.equal(ids(run(U({ auto_liability: l, umbrella_min_auto: r })), 'question').includes(ID.over), false, `auto ${l} vs ${r}`);
    }
    for (const [l, r] of [['500k', '500k'], ['300k', '500k'], ['lower', '300k'], ['not_sure', '300k'], ['1m', 'not_sure']]) {
      assert.equal(ids(run(U({ home_liability: l, umbrella_min_home: r })), 'question').includes(ID.over), false, `home ${l} vs ${r}`);
    }
    assert.deepEqual(firedS6(run(U({ auto_liability: '500_500' }))), []);
  });
  t('a motorcycle or boat limit above its requirement does not fire it (the plan covers auto and home)', () => {
    const r = run(U({ motorcycle_liability: '500_500', umbrella_min_motorcycle: '100_300', boat_liability: '500_500', umbrella_min_boat: '100_300' }, ['motorcycle', 'boat', 'umbrella']));
    assert.deepEqual(firedS6(r), []);
  });
  t('does not fire without an umbrella', () => {
    assert.deepEqual(firedS6(run({ policies: ['auto', 'home'], auto_liability: '500_500', umbrella_min_auto: '100_300', home_liability: '1m', umbrella_min_home: '300k' })), []);
  });
  t('the ask never suggests going below the umbrella requirement, and nothing says to cut the limit', () => {
    const f = flagOf(run(U({ auto_liability: '500_500', umbrella_min_auto: '250_500' })), ID.over);
    assert.match(f.ask, /Do not lower any limit below the minimum your umbrella requires/);
    assert.match(f.ask, /^Ask your agent/);
    assert.match(f.background, /cheaper your umbrella tends to be/);
    assert.match(f.background, /a question to ask, not a recommendation/);
    assert.equal(/you should (lower|cut|reduce|drop)/i.test(`${f.background} ${f.ask}`), false);
  });
  t('cites exactly its two planned sources', () => {
    const f = flagOf(run(U({ auto_liability: '500_500', umbrella_min_auto: '250_500' })), ID.over);
    assert.deepEqual(f.sources.map((s) => s.id), ['iii-homebuyers-handbook', 'iii-should-i-purchase-umbrella']);
  });
});

// ======================================================================================================
suite('umbrella-limits-unconfirmed', (t) => {
  const QUESTIONS_NOT_SURE = [
    ['auto_liability', ['auto', 'umbrella']],
    ['umbrella_min_auto', ['auto', 'umbrella']],
    ['home_liability', ['home', 'umbrella']],
    ['umbrella_min_home', ['home', 'umbrella']],
    ['motorcycle_liability', ['motorcycle', 'umbrella']],
    ['umbrella_min_motorcycle', ['motorcycle', 'umbrella']],
    ['boat_liability', ['boat', 'umbrella']],
    ['umbrella_min_boat', ['boat', 'umbrella']],
  ];
  for (const [qid, policies] of QUESTIONS_NOT_SURE) {
    t(`fires, as a Question, when ${qid} is Not sure (and only that)`, () => {
      const r = run(U({ [qid]: 'not_sure' }, policies));
      assert.deepEqual(firedS6(r), [ID.unconfirmed]);
      const f = flagOf(r, ID.unconfirmed);
      assert.equal(f.bucket, 'question');
      assert.equal(f.domain, 'umbrella');
      assert.equal(f.kind, 'cross-policy');
      assert.equal(f.emphasis, 'normal', 'a Not sure on its own is normal emphasis');
    });
  }

  t('does not fire when nothing is Not sure (known, unanswered, or no underlying policy)', () => {
    assert.deepEqual(firedS6(run(U({}))), []);
    assert.deepEqual(firedS6(run(U({ auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '500k' }))), []);
    assert.deepEqual(firedS6(run({ policies: ['umbrella'], umbrella_limit: '1m' })), []);
  });
  t('a Not sure umbrella size alone does not fire it (that belongs to the adequacy story)', () => {
    assert.deepEqual(firedS6(run(U({ umbrella_limit: 'not_sure' }))), []);
  });
  t('does not fire without an umbrella, even when the answers say Not sure', () => {
    assert.deepEqual(firedS6(run({ policies: ['auto', 'home'], auto_liability: 'not_sure', umbrella_min_home: 'not_sure' })), []);
  });
  t('fires once however many answers are Not sure, and lists each unconfirmed item in the copy', () => {
    const r = run(U({ auto_liability: 'not_sure', umbrella_min_auto: 'not_sure', home_liability: '300k', umbrella_min_home: 'not_sure' }));
    assert.equal(r.flags.question.filter((f) => f.id === ID.unconfirmed).length, 1);
    const f = flagOf(r, ID.unconfirmed);
    assert.match(f.background, /You were not sure about your auto liability limit, and about what your umbrella asks for on your auto and home policies, so/);
    const onlyLimits = flagOf(run(U({ auto_liability: 'not_sure', home_liability: 'not_sure' })), ID.unconfirmed);
    assert.match(onlyLimits.background, /You were not sure about your auto liability limit and your home liability limit, so/);
    const onlyRequirement = flagOf(run(U({ umbrella_min_home: 'not_sure' })), ID.unconfirmed);
    assert.match(onlyRequirement.background, /You were not sure about what your umbrella asks for on your home policy, so/);
  });
  t('a "Lower than" limit with a Not sure requirement is strong and says plainly that it is the likeliest gap', () => {
    for (const [limitQ, reqQ, policies, tier] of [
      ['auto_liability', 'umbrella_min_auto', ['auto', 'umbrella'], 'lower than 100/300'],
      ['home_liability', 'umbrella_min_home', ['home', 'umbrella'], 'lower than $300,000'],
      ['motorcycle_liability', 'umbrella_min_motorcycle', ['motorcycle', 'umbrella'], 'lower than 100/300'],
      ['boat_liability', 'umbrella_min_boat', ['boat', 'umbrella'], 'lower than 100/300'],
    ]) {
      const f = flagOf(run(U({ [limitQ]: 'lower', [reqQ]: 'not_sure' }, policies)), ID.unconfirmed);
      assert.equal(f.emphasis, 'strong', limitQ);
      assert.match(f.background, new RegExp(`limit is ${tier.replace(/[$]/g, '\\$')}, which is the likeliest place for a gap`), limitQ);
      assert.match(f.background, /what your umbrella requires is the one thing left to confirm/);
    }
  });
  t('a "Lower than" limit alone (requirement known) fires the Raise, not the strong Question; Not sure on the limit is never strong', () => {
    const r = run(U({ auto_liability: 'lower', umbrella_min_auto: '100_300' }));
    assert.deepEqual(firedS6(r), [ID.auto]);
    const ns = flagOf(run(U({ auto_liability: 'not_sure', umbrella_min_auto: '100_300' })), ID.unconfirmed);
    assert.equal(ns.emphasis, 'normal');
    assert.equal(/likeliest place/.test(ns.background), false);
  });
  t('the ask points the user to the umbrella\'s required-underlying list and to each policy\'s summary page', () => {
    const f = flagOf(run(U({ umbrella_min_home: 'not_sure' })), ID.unconfirmed);
    assert.equal(f.title, 'Get the underlying limits your umbrella requires from your agent');
    assert.match(f.ask, /^Ask your agent for the list of required underlying limits on your umbrella/);
    assert.match(f.ask, /declarations page/);
    assert.match(f.background, /describes the usual underlying limits as what most insurers want/);
    assert.match(f.background, /may ask for something different/);
    assert.equal(/\bevery\b|\bcommon\b/i.test(f.background), false, 'no always-statement and no unsourced prevalence claim');
    assert.equal(f.reason, 'I want the list of underlying limits my umbrella requires so I can check it against my policies.');
    assert.equal(OVERCLAIM.test(`${f.background} ${f.ask} ${f.reason}`), false);
  });
  t('a household that gave what its umbrella requires but is Not sure of its own limits is sent to its own policies, with the figures it gave, not to the agent for the requirements list (DECISIONS S12-11)', () => {
    const f = flagOf(run(U({ auto_liability: 'not_sure', umbrella_min_auto: '250_500', home_liability: 'not_sure', umbrella_min_home: '500k' })), ID.unconfirmed);
    assert.equal(f.title, 'Get the liability limits from your own policies');
    assert.match(f.title, /^(Raise|Ask|Get) /, 'still an action phrase');
    assert.match(f.ask, /^Check the summary page of your auto and home policies, called the declarations page, for the liability limit on each, then compare your auto limit with the 250\/500 and your home limit with the \$500,000 your umbrella asks for\./);
    assert.match(f.ask, /ask your agent to read it to you\.$/, 'the agent is the fallback, not the first step');
    assert.equal(f.reason, 'I want to confirm my own liability limits meet what my umbrella asks for.');
    for (const part of [f.title, f.ask, f.reason]) assert.equal(/required underlying limits|list of (the )?underlying|limits my umbrella requires|limits your umbrella requires/i.test(part), false, part);
    // The background still names what is unknown: the household's own limits.
    assert.match(f.background, /You were not sure about your auto liability limit and your home liability limit, so/);
    // One layer: singular wording and its own figure.
    const one = flagOf(run(U({ auto_liability: 'not_sure', umbrella_min_auto: '500_500', home_liability: '500k', umbrella_min_home: '500k' })), ID.unconfirmed);
    assert.match(one.ask, /^Check the summary page of your auto policy, called the declarations page, for its liability limit, then compare it with the 500\/500 your umbrella asks for\. If it is lower, /);
    assert.equal(/home/.test(one.ask), false, 'the home limit was given, so the home policy is not mentioned');
    // Only for a test or tool that skips the requirement question: no figure, and no claim that the household gave one.
    const unanswered = flagOf(run(U({ auto_liability: 'not_sure' })), ID.unconfirmed);
    assert.match(unanswered.ask, /then compare it with what your umbrella asks for\./);
    assert.equal(/\d\d\d\/\d\d\d/.test(unanswered.ask), false);
  });
  t('a household that gave its own limits but is Not sure what its umbrella requires is sent to the agent for the list, and its own limits are said back, not looked up again (DECISIONS S12-11)', () => {
    const f = flagOf(run(U({ auto_liability: '100_300', umbrella_min_auto: 'not_sure', home_liability: '300k', umbrella_min_home: 'not_sure' })), ID.unconfirmed);
    assert.equal(f.title, 'Get the underlying limits your umbrella requires from your agent');
    assert.match(f.ask, /^Ask your agent for the list of required underlying limits on your umbrella \(look for a heading like "required underlying limits"\), then compare it with the limits you told us about: your auto limit is 100\/300 and your home limit is \$300,000\. If any of your limits is lower than the list asks for, /);
    assert.equal(/declarations page|summary page/.test(f.ask), false, 'it already gave those limits');
    assert.equal(f.reason, 'I want the list of underlying limits my umbrella requires so I can check it against my policies.');
    // Only the layers with a Not sure requirement are mentioned, and a "Lower than" limit reads as one.
    const part = flagOf(run(U({ auto_liability: 'lower', umbrella_min_auto: 'not_sure', home_liability: '500k', umbrella_min_home: '500k' })), ID.unconfirmed);
    assert.match(part.ask, /the limits you told us about: your auto limit is lower than 100\/300\. If any/);
    assert.equal(part.emphasis, 'strong', 'unchanged: a limit below the lowest tier with the requirement unknown');
  });
  t('a household that is Not sure of both is sent to both places, in the order that lets it compare them (DECISIONS S12-11)', () => {
    for (const answers of [
      U({ auto_liability: 'not_sure', umbrella_min_auto: 'not_sure', home_liability: '300k', umbrella_min_home: '500k' }),          // both numbers of one layer
      U({ auto_liability: 'not_sure', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: 'not_sure' }),      // own limit of one layer, requirement of another
    ]) {
      const f = flagOf(run(answers), ID.unconfirmed);
      assert.equal(f.title, 'Get your own liability limits and what your umbrella requires');
      assert.match(f.ask, /^Ask your agent for the list of required underlying limits on your umbrella \(look for a heading like "required underlying limits"\)\. Then check the summary page of your auto policy, called the declarations page, for your own liability limit and compare the two\./);
      assert.equal(f.reason, 'I want to confirm my own liability limits and get the list of limits my umbrella requires so I can compare them.');
      assert.equal(f.reason.split('. ').length, 1, 'one sentence');
    }
  });
  t('the four wordings of the item all stay plain text, cite the same two sources, and keep the Question bucket and emphasis rules', () => {
    for (const answers of [
      U({ auto_liability: 'not_sure', umbrella_min_auto: '250_500' }),
      U({ umbrella_min_auto: 'not_sure', auto_liability: '250_500' }),
      U({ auto_liability: 'not_sure', umbrella_min_auto: 'not_sure' }),
      U({ auto_liability: 'not_sure', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: 'not_sure' }),
    ]) {
      const r = run(answers);
      const f = flagOf(r, ID.unconfirmed);
      assert.equal(f.bucket, 'question');
      assert.equal(f.emphasis, 'normal');
      assert.deepEqual(f.sources.map((x) => x.id), ['iii-should-i-purchase-umbrella', 'iii-homebuyers-handbook']);
      const text = `${f.title} ${f.background} ${f.ask} ${f.reason}`;
      assert.equal(BANNED.test(text) || STATE_NAMES.test(text) || OVERCLAIM.test(text), false, text);
    }
  });
  t('cites exactly its two planned sources', () => {
    const f = flagOf(run(U({ umbrella_min_home: 'not_sure' })), ID.unconfirmed);
    assert.deepEqual(f.sources.map((s) => s.id), ['iii-should-i-purchase-umbrella', 'iii-homebuyers-handbook']);
  });
  t('it sits after the overbought Question in the Question bucket (priority 50 before 60)', () => {
    const r = run(U({ auto_liability: '500_500', umbrella_min_auto: '250_500', home_liability: 'not_sure' }));
    assert.deepEqual(ids(r, 'question').filter((id) => S6_IDS.includes(id)), [ID.over, ID.unconfirmed]);
  });
});

// ======================================================================================================
suite('umbrella core flags: ordering, determinism and purity', (t) => {
  t('with every layer below its requirement the four Raise items come out home, auto, motorcycle, boat', () => {
    const r = run(U({
      auto_liability: '100_300', umbrella_min_auto: '500_500', home_liability: '300k', umbrella_min_home: '500k',
      motorcycle_liability: 'lower', umbrella_min_motorcycle: '100_300', boat_liability: '100_300', umbrella_min_boat: '250_500',
    }, ALL4));
    assert.deepEqual(ids(r, 'raise').filter((id) => S6_IDS.includes(id)), [ID.home, ID.auto, ID.motorcycle, ID.boat]);
    assert.deepEqual(r.flags.raise.filter((f) => S6_IDS.includes(f.id)).map((f) => f.emphasis), ['normal', 'normal', 'normal', 'normal']);
  });
  t('the same answers give deep-equal results, whatever order the answer keys are written in', () => {
    const a = { policies: ['umbrella', 'home', 'auto'], home_liability: 'lower', umbrella_min_home: '500k', auto_liability: 'not_sure', umbrella_limit: '2m', umbrella_min_auto: '250_500' };
    const b = { umbrella_min_auto: '250_500', umbrella_limit: '2m', auto_liability: 'not_sure', umbrella_min_home: '500k', home_liability: 'lower', policies: ['auto', 'home', 'umbrella'] };
    assert.deepEqual(run(a), run(b));
    assert.deepEqual(run(a), run(a));
  });
  t('the umbrella size does not change which S6 flags fire', () => {
    const base = { auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '1m', umbrella_min_home: '300k' };
    const sets = ['1m', '2m', '5m', 'not_sure'].map((u) => firedS6(run(U({ ...base, umbrella_limit: u }))));
    for (const s of sets) assert.deepEqual(s, sets[0]);
    assert.deepEqual(sets[0], [ID.auto, ID.over]);
  });
  t('frozen answers are accepted and left unchanged', () => {
    const answers = deepFreeze(copy(U({ auto_liability: 'lower', umbrella_min_auto: '250_500', home_liability: 'not_sure' })));
    const before = JSON.stringify(answers);
    run(answers);
    assert.equal(JSON.stringify(answers), before);
  });
  t('the flags read the stack: ctx.stack carries the findings behind each fired flag', () => {
    const answers = U({ auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '1m', umbrella_min_home: '500k', motorcycle_liability: 'not_sure' }, ['auto', 'home', 'motorcycle', 'umbrella']);
    const ctx = createContext(answers);
    assert.deepEqual(ctx.stack.findings.map((f) => f.id), ['auto-below-required', 'home-above-required', 'motorcycle-unconfirmed']);
    assert.deepEqual(firedS6(run(answers)), [ID.auto, ID.over, ID.unconfirmed]);
  });
});

// ======================================================================================================
suite('umbrella core flags: no flag fires without an umbrella', (t) => {
  t('for every subset of the underlying policies, with every umbrella-branch question answered, nothing fires', () => {
    const base = ['auto', 'home', 'motorcycle', 'boat'];
    const answers = {
      umbrella_limit: '1m', auto_liability: 'lower', umbrella_min_auto: 'not_sure', home_liability: '1m', umbrella_min_home: '300k',
      motorcycle_liability: 'not_sure', umbrella_min_motorcycle: '500_500', boat_liability: 'lower', umbrella_min_boat: '250_500',
    };
    for (let mask = 0; mask < 16; mask += 1) {
      const policies = base.filter((p, i) => (mask >> i) & 1);
      assert.deepEqual(firedS6(run({ ...answers, policies })), [], policies.join('+') || 'nothing held');
      assert.equal(run({ ...answers, policies }).stack, null);
    }
  });
  t('other policies and Other-bucket items alone never fire one', () => {
    const r = run({ policies: ['renters', 'health', 'rental_car', 'travel', 'phone', 'warranty', 'towing', 'accidental_death'] });
    assert.deepEqual(firedS6(r), []);
  });
  t('an umbrella with no underlying policy fires nothing', () => {
    assert.deepEqual(firedS6(run({ policies: ['umbrella'], umbrella_limit: '5m' })), []);
  });
});

// ======================================================================================================
suite('umbrella core flags: end to end from plain answers (Q1 ticks, real catalog)', (t) => {
  // Answers like the page's: Q1 (`policies`) holds the ticks, the limits come from the engine's own closed-list
  // questions. By default the household ticked Auto, Home and Umbrella.
  const e2e = (o, held) => run({ ...o, policies: held || ['auto', 'home', 'umbrella'] });

  t('the ticks drive the branch: auto and home under an umbrella', () => {
    const answers = { policies: ['auto', 'home', 'umbrella'], umbrella_limit: '1m' };
    assert.equal(createContext(answers).holds('umbrella'), true);
    assert.deepEqual(run(answers).stack.layers.map((l) => l.id), ['auto', 'home']);
  });
  t(ID.home + ' end to end', () => {
    const r = e2e({ umbrella_limit: '1m', home_liability: 'lower', umbrella_min_home: '500k', auto_liability: '250_500', umbrella_min_auto: '250_500' });
    assert.deepEqual(firedS6(r), [ID.home]);
    assert.equal(flagOf(r, ID.home).emphasis, 'strong');
    assert.equal(r.stack.layers.find((l) => l.id === 'home').status, 'below_required');
  });
  t(ID.auto + ' end to end', () => {
    const r = e2e({ umbrella_limit: '2m', auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '500k', umbrella_min_home: '500k' });
    assert.deepEqual(firedS6(r), [ID.auto]);
    assert.equal(r.stack.umbrella.limit, 2000000);
  });
  t(ID.motorcycle + ' end to end', () => {
    const r = e2e({ umbrella_limit: '1m', motorcycle_liability: '100_300', umbrella_min_motorcycle: '250_500', auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '300k' }, ['auto', 'home', 'motorcycle', 'umbrella']);
    assert.deepEqual(firedS6(r), [ID.motorcycle]);
    assert.deepEqual(r.stack.layers.map((l) => l.id), ['auto', 'home', 'motorcycle']);
  });
  t(ID.boat + ' end to end', () => {
    const r = e2e({ umbrella_limit: '1m', boat_liability: 'lower', umbrella_min_boat: '100_300', auto_liability: '250_500', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '300k' }, ['auto', 'home', 'boat', 'umbrella']);
    assert.deepEqual(firedS6(r), [ID.boat]);
  });
  t(ID.over + ' end to end', () => {
    const r = e2e({ umbrella_limit: '5m', auto_liability: '500_500', umbrella_min_auto: '250_500', home_liability: '1m', umbrella_min_home: '500k' });
    assert.deepEqual(firedS6(r), [ID.over]);
    assert.equal(flagOf(r, ID.over).title, 'Ask whether your extra auto and home liability is worth keeping');
  });
  t(ID.unconfirmed + ' end to end, with the answer left at Not sure', () => {
    const r = e2e({ umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: 'not_sure', home_liability: 'not_sure', umbrella_min_home: '300k' });
    assert.deepEqual(firedS6(r), [ID.unconfirmed]);
    assert.equal(r.stack.counts.unknown, 2);
  });
  t('keys that are not questions (policy-screen numbers, a state) have no effect (the engine reads only its own answers)', () => {
    const o = { umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '1m', umbrella_min_home: '500k' };
    const a = e2e(o);
    const b = e2e({ ...o, state: 'ZZ', p: { umbrella: { hasUmbrella: 'Yes', limit: 5 }, auto: { liability: 1000000 }, home: { liability: 1 } } });
    assert.deepEqual(a, b);
  });
  t('unticking Umbrella in Q1 removes the whole branch, whatever answers are left behind', () => {
    const r = e2e({ umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500' }, ['auto', 'home']);
    assert.deepEqual(firedS6(r), []);
    assert.equal(r.stack, null);
  });
  t('a household with no auto policy is not asked about auto and gets no auto flag', () => {
    const r = e2e({ umbrella_limit: '1m', auto_liability: '100_300', umbrella_min_auto: '250_500', home_liability: '300k', umbrella_min_home: '500k' }, ['home', 'umbrella']);
    assert.deepEqual(firedS6(r), [ID.home]);
    assert.deepEqual(r.stack.layers.map((l) => l.id), ['home']);
  });
});

// ======================================================================================================
suite('umbrella core flags: all 1,200 combinations of the core ladder', (t) => {
  const U_LIMITS = ['1m', '2m', '5m', 'not_sure'];
  const AUTO_LIMITS = ['lower', '100_300', '250_500', '500_500', 'not_sure'];
  const AUTO_REQS = ['100_300', '250_500', '500_500', 'not_sure'];
  const HOME_LIMITS = ['lower', '300k', '500k', '1m', 'not_sure'];
  const HOME_REQS = ['300k', '500k', 'not_sure'];

  t('each flag fires exactly when an independent reading of the answers says it should, and its text is clean', () => {
    let count = 0;
    for (const u of U_LIMITS) for (const al of AUTO_LIMITS) for (const ar of AUTO_REQS) for (const hl of HOME_LIMITS) for (const hr of HOME_REQS) {
      const answers = U({ umbrella_limit: u, auto_liability: al, umbrella_min_auto: ar, home_liability: hl, umbrella_min_home: hr });
      const r = run(answers);
      const label = `${u} | auto ${al}/${ar} | home ${hl}/${hr}`;
      const wantAuto = below(al, ar);
      const wantHome = below(hl, hr);
      const wantOver = above(al, ar) || above(hl, hr);
      const wantUnconfirmed = [al, ar, hl, hr].includes('not_sure');
      assert.deepEqual(firedS6(r), [wantHome && ID.home, wantAuto && ID.auto, wantOver && ID.over, wantUnconfirmed && ID.unconfirmed].filter(Boolean), label);
      // Raise before Question, home before auto: the order evaluate() gives is bucket, then priority.
      for (const f of r.flags.raise.concat(r.flags.question)) {
        if (!S6_IDS.includes(f.id)) continue;
        for (const part of ['title', 'background', 'ask', 'reason']) {
          const text = f[part];
          assert.equal(typeof text === 'string' && text.trim().length > 0, true, `${label} ${f.id}.${part}`);
          assert.equal(BANNED.test(text), false, `${label} ${f.id}.${part} has banned wording: ${text}`);
          assert.equal(STATE_NAMES.test(text), false, `${label} ${f.id}.${part} names a state: ${text}`);
          assert.equal(OVERCLAIM.test(text), false, `${label} ${f.id}.${part} overclaims: ${text}`);
          assert.equal(/\n/.test(text), false, `${label} ${f.id}.${part} has a line break`);
        }
        assert.equal(f.reason.length <= 160, true, `${label} ${f.id} reason is one short line`);
        assert.equal(f.sources.length >= 1, true);
      }
      count += 1;
    }
    assert.equal(count, 1200);
  });
});

// ======================================================================================================
suite('umbrella core flags: copy rules', (t) => {
  const SCENARIOS = [
    [ID.home, U({ home_liability: 'lower', umbrella_min_home: '500k' })],
    [ID.auto, U({ auto_liability: 'lower', umbrella_min_auto: '250_500' })],
    [ID.motorcycle, U({ motorcycle_liability: '100_300', umbrella_min_motorcycle: '500_500' }, ['motorcycle', 'umbrella'])],
    [ID.boat, U({ boat_liability: '100_300', umbrella_min_boat: '500_500' }, ['boat', 'umbrella'])],
    [ID.over, U({ auto_liability: '500_500', umbrella_min_auto: '100_300', home_liability: '1m', umbrella_min_home: '300k' })],
    [ID.unconfirmed, U({ auto_liability: 'lower', umbrella_min_auto: 'not_sure', home_liability: 'not_sure', umbrella_min_home: 'not_sure' })],
  ];
  t('titles are action phrases, each part is plain text, and jargon is defined where it first appears', () => {
    for (const [id, answers] of SCENARIOS) {
      const f = flagOf(run(answers), id);
      assert.equal(Boolean(f), true, id);
      assert.match(f.title, /^(Raise|Ask|Get) /, `${id} title is an action phrase`);
      assert.match(f.background, /extra liability|most insurers want|liability limits are usually written/i, `${id} says what an umbrella is`);
      assert.match(f.ask, /Ask your agent|Ask your agent for/, `${id} ask is something to say to the insurer`);
      assert.equal(f.reason.split('. ').length, 1, `${id} reason is one sentence`);
      assert.equal(/[.]$/.test(f.reason), true, `${id} reason ends with a full stop`);
    }
  });
  t('no flag names a state or counts states', () => {
    for (const [id, answers] of SCENARIOS) {
      const f = flagOf(run(answers), id);
      const text = `${f.title} ${f.background} ${f.ask} ${f.reason}`;
      assert.equal(STATE_NAMES.test(text), false, id);
      assert.equal(/\b(\d+|several|most|many|some) states\b/i.test(text), false, `${id} counts states`);
    }
  });
  t('the figures quoted from research are attributed to the Insurance Information Institute and say they are only a yardstick', () => {
    const home = flagOf(run(SCENARIOS[0][1]), ID.home);
    assert.match(home.background, /Insurance Information Institute says most insurers want/);
    assert.match(home.background, /\$300,000/);
    const auto = flagOf(run(SCENARIOS[1][1]), ID.auto);
    assert.match(auto.background, /Insurance Information Institute says most insurers want about \$250,000 of auto liability under a \$1 million umbrella/);
    assert.match(auto.background, /each insurer sets its own/);
  });
});

// ======================================================================================================
suite('umbrella core flags: snapshots (tests/snapshots/umbrella-core-flags.snap.mjs, stack-scenarios.snap.mjs)', (t) => {
  // Regenerate deliberately with scripts/update-snapshots.sh; any diff must be explained by the change (tests/snapshots/README.md).
  t('which flags fire over the whole ladder, and at what emphasis, equals the committed snapshot', () => {
    assertSnapshot(buildUmbrellaCoreFlags(), FLAGS_SNAPSHOT, 'umbrella-core-flags');
  });
  t('the flag snapshot covers 1,200 core combinations and every motorcycle and boat limit against every requirement', () => {
    assert.equal(Object.keys(FLAGS_SNAPSHOT.combinations).length, 1200);
    assert.equal(Object.keys(FLAGS_SNAPSHOT.motorcycle).length, 20);
    assert.equal(Object.keys(FLAGS_SNAPSHOT.boat).length, 20);
  });
  t('named households: the full stack model and the rendered S6 flags equal the committed snapshot', () => {
    assertSnapshot(buildStackScenarios(), SCENARIOS_SNAPSHOT, 'stack-scenarios');
  });
  t('the scenarios exercise every S6 flag at least once', () => {
    const fired = {};
    for (const name of Object.keys(SCENARIOS_SNAPSHOT)) for (const f of SCENARIOS_SNAPSHOT[name].flags) fired[f.id] = true;
    for (const id of S6_IDS) assert.equal(fired[id], true, `${id} appears in a scenario`);
    assert.equal(SCENARIOS_SNAPSHOT['no-umbrella'].stack, null);
    assert.deepEqual(SCENARIOS_SNAPSHOT['no-umbrella'].flags, []);
  });
});
