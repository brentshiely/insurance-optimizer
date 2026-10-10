// Tests for public/js/overlap-ui/screens.mjs (Story S13, step B): the HTML-string builders for the overlap
// screens and the insurer action list. Pure strings in, pure strings out, so they run under jsc. The DOM
// behaviour (patching in place, focus, copy) is tested in dom.test.mjs; the look is checked in the browser.
//
// Like the view-model tests, the real-catalog cases never pin WHICH flags fire (other stories add flags in
// parallel); exact content is checked against the fixture catalog.
import { suite, assert } from '../harness.mjs';
import {
  esc, questionHtml, overlapScreenHtml, overlapScreenKey, actionListHtml, actionListErrorHtml, overlapProgress,
  overlapScreenLabel, sectionIdOf, SCREEN_LABELS, PRIVACY_LINE, LIST_INTRO, NEEDS_HINT,
  PRIVACY_LINE_COUNTING, ENTRY_NOTE,
} from '../../public/js/overlap-ui/screens.mjs';
import {
  overlapSections, applyAnswer, actionListViewModel, INFO_NOTE, EMPHASIS_LABEL, EMPTY_TITLE, EMPTY_MESSAGE,
} from '../../public/js/overlap-ui/viewModel.mjs';
import { SECTIONS } from '../../public/js/overlap/data/questions/index.mjs';
import FIXTURE from '../fixtures/catalog.mjs';
import { findForbidden, codeOnly, importsOf } from '../helpers/sourceScan.mjs';

const MODULE_PATH = 'public/js/overlap-ui/screens.mjs';
const host = (parts = {}) => ({ a: {}, extras: [], q: {}, p: {}, o: {}, ...parts });
const UMBRELLA = { umbrella: { hasUmbrella: 'Yes' } };
const BACK = '<button class="link" data-act="back">Back</button>';
const attrIds = (html) => Array.from(html.matchAll(/\sid="([^"]+)"/g)).map((m) => m[1]);
const count = (html, needle) => html.split(needle).length - 1;

const H_FULL = host({
  a: { home: 'Both', veh: '3+' }, q: { health: 'Yes' }, p: UMBRELLA, extras: ['Motorcycle', 'Boat'],
  o: { other_items: ['rental_car', 'towing', 'phone', 'accidental_death'] },
});
const HOSTS = [
  host(),
  host({ a: { home: 'Rent', veh: '0' } }),
  host({ a: { home: 'Own', veh: '2' }, q: { health: 'Yes' } }),
  host({ a: { home: 'Own', veh: '1' }, p: UMBRELLA, o: { umbrella_limit: '1m', auto_liability: 'lower', umbrella_min_auto: '250_500' } }),
  host({ a: { home: 'Own', veh: '0' }, o: { other_items: ['renters_with_home'] } }),
  H_FULL,
];

// ---------------------------------------------------------------------------------------------------------
suite('screens: the module is pure and its wording is plain', (t) => {
  const canRead = typeof read === 'function';

  t('no DOM, Node, storage, timer, network or nondeterministic globals in the code', () => {
    if (!canRead) return;
    const found = findForbidden(codeOnly(read(MODULE_PATH), false));
    assert.equal(found, null, found ? `forbidden "${found}" in ${MODULE_PATH}` : '');
  });

  t('imports only the view-model next to it', () => {
    if (!canRead) return;
    assert.deepEqual(importsOf(read(MODULE_PATH)), ['./viewModel.mjs']);
  });

  t('user-facing wording is ASCII, has no dash characters, no placeholders and names no state', () => {
    const states = /Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming/;
    const texts = [PRIVACY_LINE, PRIVACY_LINE_COUNTING, ENTRY_NOTE, LIST_INTRO, NEEDS_HINT, ...Object.values(SCREEN_LABELS), actionListErrorHtml()];
    for (const text of texts) {
      assert.equal(/^[\x20-\x7e]*$/.test(text), true, `ASCII only: ${text}`);
      assert.equal(/\{\{|\}\}|TODO|undefined|\[object/.test(text), false, `no placeholder: ${text}`);
      assert.equal(states.test(text), false, `no state named: ${text}`);
    }
  });

  t('the default privacy line (nothing is counted) says answers stay on the page and are not saved', () => {
    assert.match(PRIVACY_LINE, /stay on this page/);
    assert.match(PRIVACY_LINE, /not saved/);
  });

  t('every section id has a short telemetry label, and none is left over', () => {
    assert.deepEqual(Object.keys(SCREEN_LABELS).sort(), SECTIONS.map((s) => s.id).sort());
    for (const s of SECTIONS) assert.equal(overlapScreenLabel('ovl:' + s.id), SCREEN_LABELS[s.id]);
    assert.equal(overlapScreenLabel('ovl:not_a_section'), 'not_a_section');
    assert.equal(overlapScreenLabel('summary'), '');
  });

  t('sectionIdOf only accepts ovl: ids', () => {
    assert.equal(sectionIdOf('ovl:extras'), 'extras');
    assert.equal(sectionIdOf('summary'), null);
    assert.equal(sectionIdOf('p:auto'), null);
    assert.equal(sectionIdOf(undefined), null);
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('esc', (t) => {
  t('escapes the five characters that matter in text and attributes', () => {
    assert.equal(esc('<a href="x" title=\'y\'>&</a>'), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
    assert.equal(esc(12), '12');
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('questionHtml: one labelled group of toggle buttons per question', (t) => {
  const yn = { id: 'q_yes_no', prompt: 'Do you?', help: 'Look on page 2.', kind: 'yesno', answered: true, allAnswered: true,
    options: [{ id: 'yes', label: 'Yes', selected: false }, { id: 'no', label: 'No', selected: true }, { id: 'not_sure', label: 'Not sure', selected: false }] };
  const single = { id: 'q_single', prompt: 'How big?', help: '', kind: 'single', answered: false, allAnswered: false,
    options: [{ id: '1m', label: '$1 million', selected: false }, { id: 'not_sure', label: 'Not sure', selected: false }] };
  const multi = { id: 'q_multi', prompt: 'Which?', help: 'Pick any.', kind: 'multi', answered: true, allAnswered: true,
    options: [{ id: 'a', label: 'A very long label that needs a whole line to itself', selected: true }, { id: 'none', label: 'None of these', selected: false }] };

  t('a yes/no question is a .qrow with .yn2 buttons; others are .chips', () => {
    assert.match(questionHtml(yn), /^<div class="qrow oq"/);
    assert.equal(questionHtml(yn).includes('<div class="yn2"'), true);
    assert.match(questionHtml(single), /^<div class="oq oq-block"/);
    assert.equal(questionHtml(single).includes('<div class="chips"'), true);
  });

  t('the choices stack one per line only when a label is long', () => {
    assert.equal(questionHtml(single).includes('chips stack'), false);
    assert.equal(questionHtml(multi).includes('chips stack'), true);
  });

  t('the choices are a role=group named by the prompt, described by the help text', () => {
    const html = questionHtml(yn);
    assert.equal(html.includes('role="group" aria-labelledby="oq-q_yes_no" aria-describedby="oq-q_yes_no-h"'), true);
    assert.equal(html.includes('<p id="oq-q_yes_no">Do you?</p>'), true);
    assert.equal(html.includes('id="oq-q_yes_no-h">Look on page 2.</span>'), true);
  });

  t('a question with no help and not multi has no description reference', () => {
    const html = questionHtml(single);
    assert.equal(html.includes('aria-describedby'), false);
    assert.equal(html.includes('oq-q_single-h'), false);
  });

  t('a tick-many question says so, after its help text', () => {
    assert.equal(questionHtml(multi).includes('Pick any. Tap all that apply.'), true);
    assert.equal(questionHtml(yn).includes('Tap all that apply'), false);
  });

  t('every option is a type=button toggle with aria-pressed, the question id and the option id', () => {
    for (const q of [yn, single, multi]) {
      const html = questionHtml(q);
      assert.equal(count(html, '<button'), q.options.length);
      for (const o of q.options) {
        const re = new RegExp('<button type="button"( class="[^"]*")? aria-pressed="' + (o.selected ? 'true' : 'false') + '" data-oq="' + q.id + '" data-ov="' + o.id + '">');
        assert.equal(re.test(html), true, `${q.id}/${o.id}`);
      }
    }
  });

  t('a selected option carries the sel class AND aria-pressed=true; an unselected one carries neither', () => {
    const html = questionHtml(yn);
    assert.match(html, /<button type="button" class="sel" aria-pressed="true" data-oq="q_yes_no" data-ov="no">No<\/button>/);
    assert.match(html, /<button type="button" aria-pressed="false" data-oq="q_yes_no" data-ov="yes">Yes<\/button>/);
    assert.match(questionHtml(multi), /class="chip sel" aria-pressed="true" data-oq="q_multi" data-ov="a"/);
  });

  t('text from the catalog is escaped', () => {
    const bad = { ...single, id: 'q_bad', prompt: '<img src=x onerror=alert(1)>', help: '"quoted" & <b>', options: [{ id: 'x', label: '<script>1</script>', selected: false }] };
    const html = questionHtml(bad);
    assert.equal(html.includes('<img'), false);
    assert.equal(html.includes('<script'), false);
    assert.equal(html.includes('<b>'), false);
    assert.equal(html.includes('&lt;img src=x onerror=alert(1)&gt;'), true);
  });
});

// ---------------------------------------------------------------------------------------------------------
suite('overlapScreenHtml: a screen of questions with a Continue that waits for every answer', (t) => {
  const sections = overlapSections(host({ a: { home: 'Own', veh: '1' } }));
  const autoIdx = sections.findIndex((s) => s.id === 'auto_gaps');

  t('shows the "N of M" eyebrow, the title as a focusable heading, and the reason', () => {
    const html = overlapScreenHtml(sections, 'ovl:auto_gaps', BACK);
    assert.equal(html.startsWith(`<h3 class="pt">Overlap check ${autoIdx + 1} of ${sections.length}</h3>`), true);
    assert.equal(html.includes('<h2 id="ovl-heading" tabindex="-1" data-focus>' + esc(sections[autoIdx].title) + '</h2>'), true);
    assert.equal(html.includes('<p class="sub">' + esc(sections[autoIdx].reason) + '</p>'), true);
  });

  t('has one group per visible question, in order, and the host Back control in the footer', () => {
    const html = overlapScreenHtml(sections, 'ovl:auto_gaps', BACK);
    const order = Array.from(html.matchAll(/data-qid="([^"]+)"/g)).map((m) => m[1]);
    assert.deepEqual(order, sections[autoIdx].questions.map((q) => q.id));
    assert.equal(html.includes('<div class="row spread foot ovl-foot">' + BACK + '<button'), true);
  });

  t('Continue is disabled, with the hint showing, until every visible question has an answer', () => {
    const open = overlapScreenHtml(sections, 'ovl:auto_gaps', BACK);
    assert.equal(sections[autoIdx].complete, false);
    assert.match(open, /id="ovl-next" data-act="next" aria-describedby="ovl-hint" disabled>Continue<\/button>/);
    assert.equal(open.includes('<p class="small oq-needs" id="ovl-hint">' + esc(NEEDS_HINT) + '</p>'), true);
    const done = { ...sections[autoIdx], complete: true };
    const all = overlapScreenHtml([done], 'ovl:auto_gaps', BACK);
    assert.equal(all.includes('disabled'), false);
    assert.equal(all.includes('id="ovl-hint" hidden>'), true, 'the hint stays in the page, hidden, so it can be shown again in place');
  });

  t('a screen the user finished is complete in the view-model too (end to end)', () => {
    const o = { auto_financing: 'paid_off', auto_value: 'under_3000', auto_collision: 'yes', auto_um_uim: 'no', auto_rental_reimbursement: 'yes' };
    const secs = overlapSections(host({ a: { home: 'Own', veh: '1' }, o }));
    const html = overlapScreenHtml(secs, 'ovl:auto_gaps', BACK);
    assert.equal(secs.find((s) => s.id === 'auto_gaps').complete, true);
    assert.equal(/id="ovl-next"[^>]*disabled/.test(html), false);
  });

  t('returns an empty string for an id that is not an overlap screen', () => {
    assert.equal(overlapScreenHtml(sections, 'summary', BACK), '');
    assert.equal(overlapScreenHtml(sections, 'ovl:nope', BACK), '');
  });

  t('the screen key names the screen, its place, and its questions, so a changed shape is detected', () => {
    const key = overlapScreenKey(sections, 'ovl:auto_gaps');
    assert.equal(key.startsWith('auto_gaps|' + (autoIdx + 1) + '|' + sections.length + '|auto_financing,auto_value'), true);
    assert.equal(overlapScreenHtml(sections, 'ovl:auto_gaps', BACK).includes('data-ovl-key="' + esc(key) + '"'), true);
    assert.equal(overlapScreenKey(sections, 'summary'), null);
    const more = overlapSections(host({ a: { home: 'Own', veh: '1' }, o: { auto_financing: 'loan' } }));
    assert.notEqual(overlapScreenKey(more, 'ovl:auto_gaps'), key, 'a newly opened question changes the key');
  });
});

suite('overlapScreenHtml: every screen of many households is well formed', (t) => {
  t('ids are unique, every aria reference resolves, every button names a question and option on the screen, nothing is undefined', () => {
    let screens = 0;
    for (const snap of HOSTS) {
      const sections = overlapSections(snap);
      for (const s of sections) {
        const html = overlapScreenHtml(sections, 'ovl:' + s.id, BACK);
        screens += 1;
        const ids = attrIds(html);
        assert.equal(new Set(ids).size, ids.length, `${s.id}: duplicate ids ${JSON.stringify(ids)}`);
        for (const m of html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)) assert.equal(ids.includes(m[1]), true, `${s.id}: dangling ${m[1]}`);
        const pairs = Array.from(html.matchAll(/data-oq="([^"]+)" data-ov="([^"]+)"/g)).map((m) => m[1] + '/' + m[2]);
        const expected = [];
        for (const q of s.questions) for (const o of q.options) expected.push(q.id + '/' + o.id);
        assert.deepEqual(pairs, expected, `${s.id}: buttons`);
        assert.equal(/undefined|\[object|NaN|\{\{/.test(html), false, `${s.id}: stray text`);
        assert.equal(count(html, '<button'), expected.length + 2, `${s.id}: option buttons plus Back and Continue`);
      }
    }
    assert.equal(screens > 20, true);
  });

  t('the selected state of every option in the view-model shows in the markup', () => {
    const snap = host({ a: { home: 'Own', veh: '1' }, o: { auto_financing: 'loan', auto_value: 'not_sure', other_items: ['phone', 'towing'] } });
    for (const s of overlapSections(snap)) {
      const html = overlapScreenHtml(overlapSections(snap), 'ovl:' + s.id, BACK);
      for (const q of s.questions) for (const o of q.options) {
        const on = new RegExp('aria-pressed="true" data-oq="' + q.id + '" data-ov="' + o.id + '"').test(html);
        assert.equal(on, o.selected, `${q.id}/${o.id}`);
      }
    }
  });
});

suite('overlap screens can always be completed (Continue never deadlocks)', (t) => {
  t('answering each open question in turn, with the first or the last option, completes every screen and enables every Continue', () => {
    for (const base of HOSTS) {
      for (const pick of ['first', 'last']) {
        let snap = JSON.parse(JSON.stringify(base));
        for (let guard = 0; guard < 100; guard++) {
          const open = overlapSections(snap).flatMap((sec) => sec.questions).find((q) => !q.answered);
          if (!open) break;
          const opt = pick === 'first' ? open.options[0] : open.options[open.options.length - 1];
          snap = { ...snap, o: applyAnswer(snap, open.id, opt.id) };
        }
        const secs = overlapSections(snap);
        assert.equal(secs.length > 0, true);
        for (const sec of secs) {
          assert.equal(sec.complete, true, `${pick}: ${sec.id} stays incomplete: ${JSON.stringify(sec.questions.filter((q) => !q.answered).map((q) => q.id))}`);
          assert.equal(/id="ovl-next"[^>]*disabled/.test(overlapScreenHtml(secs, 'ovl:' + sec.id, BACK)), false, `${pick}: ${sec.id} Continue`);
        }
      }
    }
  });

  t('a question with no Not sure still has a way to answer it (extras has None of these)', () => {
    const extras = overlapSections(host())[0].questions[0];
    assert.equal(extras.id, 'other_items');
    assert.equal(extras.options.some((o) => o.id === 'none'), true);
    assert.equal(extras.options.some((o) => o.id === 'not_sure'), false);
  });
});

suite('overlapProgress', (t) => {
  t('counts answered and total across every visible question', () => {
    const none = overlapProgress(overlapSections(host()));
    assert.deepEqual(none, { answered: 0, total: 1 });
    const some = overlapProgress(overlapSections(host({ a: { home: 'Own', veh: '1' }, o: { other_items: ['none'], auto_financing: 'loan' } })));
    assert.equal(some.answered, 2);
    assert.equal(some.total > some.answered, true);
    assert.deepEqual(overlapProgress([]), { answered: 0, total: 0 });
  });
});

// ---------------------------------------------------------------------------------------------------------
const FIX_ALL = host({
  a: { veh: '1', home: 'Own' }, q: { health: 'Yes' }, p: UMBRELLA,
  o: {
    other_items: ['rental_car', 'phone'], cards: ['card_alpha'],
    umbrella_limit: 'not_sure', auto_liability: '100_300', home_liability: '300k', umbrella_ext_um: 'no',
    supplements: ['accident'], supplement_cost: 'under_50',
  },
});

suite('actionListHtml: the insurer action list (fixture catalog)', (t) => {
  const vm = actionListViewModel(FIX_ALL, FIXTURE);
  const html = actionListHtml(vm);

  t('is one labelled section with its own heading, a count line, an intro, the not-advice note, and the privacy line', () => {
    assert.equal(html.startsWith('<section class="actionlist" id="actionlist" aria-labelledby="al-h"><h2 id="al-h">Your insurer action list</h2>'), true);
    assert.equal(html.includes('<p>' + vm.total + ' items to take to your insurer: 3 Raise, 2 Drop, 3 Question.</p>'), true);
    assert.equal(html.includes(esc(LIST_INTRO)), true);
    assert.equal(html.includes('<p class="small al-note">' + esc(INFO_NOTE) + '</p>'), true);
    assert.match(INFO_NOTE, /not insurance advice/);
    assert.match(INFO_NOTE, /not a licensed agent or broker/);
    assert.equal(html.includes('<p class="small al-privacy">' + esc(PRIVACY_LINE) + '</p>'), true);
    assert.equal(html.endsWith('</section>'), true);
  });

  t('groups come in the order Raise, Drop, Question with their counts', () => {
    const heads = Array.from(html.matchAll(/<h3 class="al-gh">([A-Za-z]+) <span class="al-n">\((\d+)\)<\/span><\/h3>/g)).map((m) => m[1] + m[2]);
    assert.deepEqual(heads, vm.groups.map((g) => g.label + g.count));
    assert.deepEqual(Array.from(html.matchAll(/data-bucket="([a-z]+)"/g)).map((m) => m[1]), ['raise', 'drop', 'question']);
  });

  t('every item has a text tag for its bucket, its title, and the parts in the order Why it matters, What to ask, Say this, Source', () => {
    for (const g of vm.groups) {
      for (const item of g.items) {
        const start = html.indexOf('id="al-' + item.id + '"');
        assert.equal(start > 0, true, `${item.id} present`);
        const end = html.indexOf('</li>', start);
        const part = html.slice(start, end);
        assert.equal(part.includes('<span class="tag ' + g.bucket + '">' + g.label + '</span>'), true, `${item.id} tag`);
        assert.equal(part.includes('<h4 class="al-t">' + esc(item.title) + '</h4>'), true);
        let from = 0;
        for (const mark of ['Why it matters</p><p>' + esc(item.background), 'What to ask</p><p>' + esc(item.ask), 'Say this</p><p>' + esc(item.reason), item.sources.length === 1 ? 'Source</p>' : 'Sources</p>']) {
          const i = part.indexOf(mark, from);
          assert.equal(i >= from && i >= 0, true, `${item.id}: "${mark.slice(0, 30)}" missing or out of order`);
          from = i;
        }
      }
    }
  });

  t('every source shows publisher, a link on the title that opens in a new tab with rel=noopener, and the last verified date', () => {
    for (const g of vm.groups) for (const item of g.items) for (const s of item.sources) {
      const link = '<a class="src" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '<span class="vh"> (opens in a new tab)</span></a>';
      assert.equal(html.includes('<li>' + esc(s.publisher) + ', ' + link + ', <span class="al-ver">last verified ' + s.lastVerified + '</span></li>'), true, `${item.id} ${s.url}`);
    }
    assert.equal(count(html, '<a '), count(html, 'target="_blank" rel="noopener"'), 'every link opens a new tab safely');
  });

  t('a higher-priority item says so in words, once per strong item', () => {
    const strong = vm.groups.flatMap((g) => g.items).filter((i) => i.emphasis === 'strong').length;
    assert.equal(strong > 0, true, 'the fixture has a strong item');
    assert.equal(count(html, '<p class="al-strong">' + EMPHASIS_LABEL + '</p>'), strong);
  });

  t('has Copy and Print buttons and a polite status line for the copy result', () => {
    assert.equal(html.includes('<button type="button" class="ghost" data-act="copy">Copy my list</button>'), true);
    assert.equal(html.includes('<button type="button" class="ghost" data-act="print">Print my list</button>'), true);
    assert.equal(html.includes('<p class="small al-status" id="al-status" role="status"></p>'), true);
  });

  t('item ids on the page are unique, and an item with one source says Source while several say Sources', () => {
    const ids = attrIds(html);
    assert.equal(new Set(ids).size, ids.length);
    const labels = vm.groups.flatMap((g) => g.items).map((i) => (i.sources.length === 1 ? 'Source' : 'Sources'));
    assert.equal(count(html, '<p class="al-label">Source</p>'), labels.filter((l) => l === 'Source').length);
    assert.equal(count(html, '<p class="al-label">Sources</p>'), labels.filter((l) => l === 'Sources').length);
  });

  t('a single item reads "1 item", not "1 items"', () => {
    const one = { groups: [{ bucket: 'question', label: 'Question', description: 'd', count: 1, items: [vm.groups[2].items[0]] }], total: 1, empty: false, emptyTitle: null, emptyMessage: null };
    assert.equal(actionListHtml(one).includes('<p>1 item to take to your insurer: 1 Question.</p>'), true);
  });

  t('text from a flag is escaped, and only an https URL becomes a link', () => {
    const evil = {
      groups: [{ bucket: 'raise', label: 'Raise', description: 'd', count: 1, items: [{
        id: 'evil', title: '<img src=x onerror=alert(1)>', background: '<b>bg</b>', ask: '"ask" & more', reason: "it's <i>this</i>", emphasis: 'normal',
        sources: [{ publisher: 'P<', title: 'T"', url: 'javascript:alert(1)', lastVerified: '2026-10-10' }, { publisher: 'Q', title: 'U', url: 'http://example.org/x', lastVerified: '2026-10-10' }],
      }] }],
      total: 1, empty: false, emptyTitle: null, emptyMessage: null,
    };
    const out = actionListHtml(evil);
    assert.equal(out.includes('<img'), false);
    assert.equal(out.includes('<b>'), false);
    assert.equal(out.includes('<i>'), false);
    assert.equal(out.includes('href='), false, 'neither the javascript: nor the http: URL is linked');
    assert.equal(out.includes('P&lt;, T&quot;'), true);
    assert.equal(out.includes('it&#39;s &lt;i&gt;this&lt;/i&gt;'), true);
  });
});

suite('actionListHtml: the honest empty state', (t) => {
  const vm = actionListViewModel(host(), FIXTURE);
  const html = actionListHtml(vm);

  t('says nothing was flagged, in the view-model wording, and is not an all-clear', () => {
    assert.equal(vm.empty, true);
    assert.equal(html.includes('<h3 class="al-gh">' + esc(EMPTY_TITLE) + '</h3><p>' + esc(EMPTY_MESSAGE) + '</p>'), true);
    assert.equal(/everything is fine|you are covered|no gaps|looks good|adequate|all clear/i.test(html), false);
    assert.equal(html.includes('al-group'), false);
    assert.equal(html.includes('items to take'), false, 'no count line for an empty list');
  });

  t('has no Copy or Print buttons (there is nothing to take away) but keeps the note and the privacy line', () => {
    assert.equal(html.includes('data-act="copy"'), false);
    assert.equal(html.includes('data-act="print"'), false);
    assert.equal(html.includes('al-status'), false, 'no empty status line either, which would leave a gap');
    assert.equal(html.includes(esc(INFO_NOTE)), true);
    assert.equal(html.includes(esc(PRIVACY_LINE)), true);
  });
});

suite('actionListHtml: the real catalog', (t) => {
  t('builds for many households without throwing, and always carries the note, the privacy line and the heading', () => {
    for (const snap of HOSTS) {
      const vm = actionListViewModel(snap);
      const html = actionListHtml(vm);
      assert.equal(html.includes(esc(INFO_NOTE)), true);
      assert.equal(html.includes(esc(PRIVACY_LINE)), true);
      assert.equal(html.includes('id="al-h"'), true);
      assert.equal(/undefined|\[object|NaN|\{\{/.test(html), false);
      for (const g of vm.groups) for (const item of g.items) assert.equal(html.includes(esc(item.title)), true, item.id);
      const ids = attrIds(html);
      assert.equal(new Set(ids).size, ids.length, 'unique ids');
    }
  });

  t('the error panel names the problem in plain words and keeps the privacy line', () => {
    const html = actionListErrorHtml();
    assert.match(html, /We could not build your list this time/);
    assert.equal(html.includes(esc(PRIVACY_LINE)), true);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The stylesheet: the contract the screens rely on (looked at in the Browser pane too).
// ---------------------------------------------------------------------------------------------------------
suite('app.css: overlap styles, print and contrast', (t) => {
  const canRead = typeof read === 'function';
  const css = canRead ? read('public/css/app.css') : '';

  // 6-digit hex colours of a :root block, by variable name
  const palette = (block) => {
    const out = {};
    for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)) out[m[1]] = m[2];
    return out;
  };
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const light = () => palette(css.slice(css.indexOf(':root{'), css.indexOf('@media (prefers-color-scheme: dark)')));
  const dark = () => {
    const at = css.indexOf('@media (prefers-color-scheme: dark)');
    return { ...light(), ...palette(css.slice(at, css.indexOf('*{box-sizing', at))) };
  };

  t('has tag styles for Raise, Drop and Question that reuse the existing palette variables', () => {
    if (!canRead) return;
    assert.equal(css.includes('.tag.raise{color:var(--under);background:var(--under-bg)}'), true);
    assert.equal(css.includes('.tag.drop{color:var(--twice);background:var(--twice-bg)}'), true);
    assert.equal(css.includes('.tag.question{color:var(--info);background:var(--info-bg)}'), true);
  });

  t('option buttons are at least 44px tall and the footer Back link is too', () => {
    if (!canRead) return;
    assert.match(css, /\.oq button\{min-height:44px/);
    assert.match(css, /\.ovl-foot \.link\{min-height:44px/);
    assert.match(css, /\.al-actions \.ghost\{min-height:44px/);
  });

  t('a selected option shows a check mark in text, not only a colour', () => {
    if (!canRead) return;
    assert.equal(css.includes('.oq button[aria-pressed="true"]::before{content:"\\2713'), true);
  });

  t('the print stylesheet hides everything but the action list and forces a light palette', () => {
    if (!canRead) return;
    const print = css.slice(css.indexOf('@media print{'));
    assert.equal(print.length > 100, true, 'has a print block');
    assert.equal(print.includes('#stage>*:not(.actionlist)'), true);
    for (const hidden of ['.brand', 'aside', '.bar', '.foot', '.al-actions']) assert.equal(print.includes(hidden), true, hidden);
    assert.equal(print.includes(':root{--ground:#fff;--surface:#fff;--ink:#000'), true);
    assert.equal(print.includes('.item{break-inside:avoid'), true);
    assert.equal(print.includes('attr(href)'), true, 'printed links show their address');
  });

  t('light and dark: tag text, body text, links and the selected-button text all clear 4.5:1', () => {
    if (!canRead) return;
    for (const [name, p] of [['light', light()], ['dark', dark()]]) {
      for (const [fg, bg] of [['under', 'under-bg'], ['twice', 'twice-bg'], ['info', 'info-bg'], ['ink', 'surface'], ['muted', 'surface'],
        ['accent', 'surface'], ['ink', 'accent-soft'], ['muted', 'accent-soft'], ['accent-ink', 'accent']]) {
        assert.equal(Boolean(p[fg] && p[bg]), true, `${name}: --${fg} and --${bg} exist`);
        assert.equal(ratio(p[fg], p[bg]) >= 4.5, true, `${name}: --${fg} on --${bg} is ${ratio(p[fg], p[bg]).toFixed(2)}`);
      }
    }
  });

  t('light and dark: the border of an unselected option (muted) is at least 3:1 against the card', () => {
    if (!canRead) return;
    for (const p of [light(), dark()]) assert.equal(ratio(p.muted, p.surface) >= 3, true);
    assert.match(css, /\.oq button\{[^}]*border-color:var\(--muted\)/);
  });

  t('the contrast helper itself is right (black on white is 21:1, grey on white is below 4.5)', () => {
    assert.equal(Math.round(ratio('#000000', '#FFFFFF')), 21);
    assert.equal(ratio('#999999', '#FFFFFF') < 4.5, true);
  });
});
