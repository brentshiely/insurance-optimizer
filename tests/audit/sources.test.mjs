// Story S12 audit: the source registry and the flags agree.
//
//   * every source a flag cites is in the registry (and so can be shown with its publisher, title, link and date);
//   * every source in the registry is used by at least one flag or by a verified research fact, so nothing sits in the
//     registry that no one reads (the failure message lists the unused ones);
//   * the sources a result shows are exactly the registry's, in the order the flag lists them.
//
// SPEC "Sources and authority": the host rules (authority hosts only, no insurers or comparison sites) are enforced on the
// registry by tests/data/sources.test.mjs; this file ties the registry to the flags.
//
// Pure data checks; runs under jsc and Node.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import umbrella from '../../research/umbrella-liability-stack.mjs';
import auto from '../../research/auto-coverages.mjs';
import home from '../../research/home-and-renters.mjs';
import health from '../../research/health-supplemental.mjs';
import other from '../../research/other-bucket.mjs';
import { scenarioRuns, flagsOf } from './corpus.mjs';

const RESEARCH = [umbrella, auto, home, health, other];
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

suite('source audit', (t) => {
  t('every source a flag cites is in the registry', () => {
    const missing = [];
    for (const f of CATALOG.flags) for (const id of f.sourceIds) if (!has(SOURCES, id)) missing.push(`${f.id} -> ${id}`);
    assert.deepEqual(missing, [], 'flags citing a source the registry does not have');
  });

  t('every source in the registry is used by at least one flag or one research fact (unused ones are listed)', () => {
    const usedByFlags = new Set(CATALOG.flags.reduce((all, f) => all.concat(f.sourceIds), []));
    const facts = RESEARCH.reduce((all, file) => all.concat(file.facts), []);
    assert.ok(facts.length > 100, `only ${facts.length} research facts`);
    const usedByFacts = new Set(facts.reduce((all, fact) => all.concat(fact.sourceIds), []));
    const unused = Object.keys(SOURCES).filter((id) => !usedByFlags.has(id) && !usedByFacts.has(id));
    assert.deepEqual(unused, [], `registry sources no flag cites and no research fact uses: ${unused.join(', ')}`);
  });

  t('the registry has no more than the research gave it: every id is a verified research source', () => {
    const verified = new Set(RESEARCH.reduce((all, file) => all.concat(file.sources.filter((s) => s.verification && s.verification.status === 'verified').map((s) => s.id)), []));
    const extra = Object.keys(SOURCES).filter((id) => !verified.has(id));
    assert.deepEqual(extra, [], `registry sources with no verified research behind them: ${extra.join(', ')}`);
  });

  t('what a scenario shows for a flag is the registry entry for each source, in the flag\'s own order', () => {
    const byId = new Map(CATALOG.flags.map((f) => [f.id, f]));
    for (const run of scenarioRuns()) {
      for (const shown of flagsOf(run.result)) {
        const declared = byId.get(shown.id).sourceIds;
        assert.deepEqual(shown.sources.map((s) => s.id), declared, `${run.id}: ${shown.id} source order`);
        for (const s of shown.sources) {
          assert.deepEqual(s, { id: s.id, publisher: SOURCES[s.id].publisher, title: SOURCES[s.id].title, url: SOURCES[s.id].url, lastVerified: SOURCES[s.id].lastVerified }, `${run.id}: ${shown.id}/${s.id}`);
        }
      }
    }
  });

  t('the flags lean on many different publishers, not on one (a sanity check on neutrality)', () => {
    const publishers = new Set();
    for (const f of CATALOG.flags) for (const id of f.sourceIds) publishers.add(SOURCES[id].publisher);
    assert.ok(publishers.size >= 8, `only ${publishers.size} publishers: ${Array.from(publishers).join('; ')}`);
  });
});
