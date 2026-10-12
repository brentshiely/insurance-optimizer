// Story S12 audit: copy hygiene over everything a person can be shown.
//
// What is scanned
//   * every distinct rendering of every flag that the scenarios and the sweep (tests/audit/corpus.mjs) can produce: title,
//     background, ask, reason, and the publisher and title of each source line;
//   * the flags' fixed strings as written in the catalog (a text a flag shows only in some situation is still caught here);
//   * every question prompt, help text and option label, and every section title and reason.
//
// What must not be in any of it
//   * unresolved template or placeholder text: "{{", "}}", any curly brace, TODO, TBD, TBA, FIXME, lorem ipsum, undefined, NaN, null,
//     Infinity, "[object", any square or angle bracket ("[insert insurer name]", "<insurer>"), XXX, "placeholder", "coming soon",
//     "to be determined", "N/A", "???", "...", "%s" or "%d", "${name}";
//   * the name of a US state or the District of Columbia, its two-letter postal code ("MN", "TX") or its older abbreviation
//     ("Minn.", "Calif.") (the tool never asks for a state and must not treat one as the authority; copy says "your state's
//     department of insurance", SPEC "Sources and authority");
//   * the interface or internal language the prototype's reviews rejected: "home equity", "next screen", "generic patterns"
//     (docs/archive/coverage-check-prototype-handoff.md, product principle 5);
//   * dashes used as punctuation (docs/QUESTION-FLAG-PLAN.md section 1), stray whitespace.
//
// Every failure names the flag (or question), the field, and the household that produced the text. The patterns were widened in
// DECISIONS S12-12 after a reviewer put "[insert insurer name]", "<insurer>", "XXX", "coming soon", "%s", "N/A", "...", "PLACEHOLDER"
// and "MN" into a flag title and nothing failed; the self-tests at the bottom keep each of those shapes caught.
//
// Pure data checks; runs under jsc and Node.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { SECTIONS } from '../../public/js/overlap/data/questions/index.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { everything, questionTexts } from './corpus.mjs';

// Text that was meant to be replaced, or was never written. Each pattern is matched against every piece of text a person can be
// shown. They are deliberately broad: our copy has no square, angle or curly brackets, no "...", no "N/A", and no percent signs
// followed by a letter, so a hit is a placeholder or a leaked template, never a style choice. Figures such as 100/300, $500,000 and
// "20% of the limit" do not match any of them (the self-test below checks that).
const PLACEHOLDERS = [
  ['"{{"', /\{\{/],
  ['"}}"', /\}\}/],
  ['a curly brace ({name})', /[{}]/],
  ['a template literal (${name})', /\$\{/],
  ['a printf token (%s, %d)', /%\d*\$?[sd]\b/],
  ['TODO', /\bTODO\b/i],
  ['TBD', /\bTBD\b/],
  ['TBA', /\bTBA\b/],
  ['FIXME', /\bFIXME\b/i],
  ['lorem ipsum', /\blorem\b|\bipsum\b/i],
  ['undefined', /\bundefined\b/],
  ['NaN', /\bNaN\b/],
  ['null', /\bnull\b/],
  ['Infinity', /\bInfinity\b/],
  ['[object', /\[object/],
  ['a square bracket ([insert insurer name])', /[\[\]]/],
  ['an angle bracket (<insurer>)', /[<>]/],
  ['XXX', /\bx{3,}\b/i],
  ['the word placeholder', /placeholder/i],
  ['coming soon', /coming soon/i],
  ['to be determined, added or written', /to be (?:determined|added|written|decided|filled)/i],
  ['N/A', /\bN\/A\b/i],
  ['"???"', /\?\?/],
  ['an ellipsis ("..." or the ellipsis character)', /\.\.\.|\u2026/],
];

const STATE_NAMES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
  'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
];
const STATE_RE = new RegExp(`\\b(${STATE_NAMES.join('|')})\\b|\\bD\\.C\\.`, 'i');

// The two-letter postal codes ("MN", "TX") and the older abbreviations ("Minn.", "Calif.") also name a state. These are matched
// case-sensitively: a code is always capitals, and the lower-case words they spell ("in", "or", "me", "ok", "hi", "oh", "id", "co")
// are ordinary English. The codes that are also words or common abbreviations when written in capitals (CO, HI, ID, IN, ME, OH,
// OK, OR) are only counted where they read as a place: after a comma ("Boise, ID") or before a word that follows a state
// ("OR residents", "OK law", "ID DOI").
const STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CT', 'DE', 'FL', 'GA', 'IA', 'IL', 'KS', 'KY', 'LA', 'MA', 'MD', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH',
  'NJ', 'NM', 'NV', 'NY', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY', 'DC',
];
const WORD_LIKE_STATE_CODES = ['CO', 'HI', 'ID', 'IN', 'ME', 'OH', 'OK', 'OR'];
const STATE_CODE_RE = new RegExp(
  `\\b(?:${STATE_CODES.join('|')})\\b|,\\s*(?:${WORD_LIKE_STATE_CODES.join('|')})\\b|\\b(?:${WORD_LIKE_STATE_CODES.join('|')})\\s+(?:DOI|residents?|law|laws|regulators?|department)\\b`,
);
const STATE_ABBREVIATIONS = [
  'Ala', 'Ariz', 'Ark', 'Calif', 'Colo', 'Conn', 'Fla', 'Kan', 'Mich', 'Minn', 'Miss', 'Mont', 'Neb', 'Nev', 'Okla', 'Ore', 'Penn', 'Tenn', 'Tex',
  'Wis', 'Wyo', 'Mass', 'Wash',
];
const STATE_ABBREVIATION_RE = new RegExp(`\\b(?:${STATE_ABBREVIATIONS.join('|')})\\.|\\b(?:N\\.[HJMCDY]|S\\.[CD]|R\\.I|W\\.Va)\\.`);
const STATE_PATTERNS = [['a US state', STATE_RE], ['a state postal code', STATE_CODE_RE], ['a state abbreviation', STATE_ABBREVIATION_RE]];

// Handoff principle 5: "home equity", "next screen" and "generic patterns" have all been explicitly rejected in review.
const UI_LEAKS = [
  ['home equity', /\bhome[\s-]+equity\b/i],
  ['next screen', /\bnext[\s-]+screens?\b/i],
  ['generic patterns', /\bgeneric[\s-]+patterns?\b/i],
];

const DASH = /[–—]|(^|\s)--?(\s|$)/;

const FIELDS = ['title', 'background', 'ask', 'reason'];

// [label, text] for the four text fields of a rendering: our own copy.
function copyOf(entry) {
  const { flag, run } = entry;
  return FIELDS.map((field) => [`${flag.id} (${run.id}) ${field}`, flag[field]]);
}

// [label, text] for the source lines of a rendering. These are the cited pages' own publisher and title, quoted as published
// (so a title may contain a spaced hyphen); they are scanned for state names and placeholders, not for punctuation.
function sourcesOf(entry) {
  const { flag, run } = entry;
  const parts = [];
  for (const s of flag.sources) {
    parts.push([`${flag.id} (${run.id}) source ${s.id} publisher`, s.publisher]);
    parts.push([`${flag.id} (${run.id}) source ${s.id} title`, s.title]);
  }
  return parts;
}

// A well-formed {{name}} token in a fixed string is meant to be filled in; stray braces are not.
const WELL_FORMED_TOKEN = /\{\{\s*[A-Za-z_][A-Za-z0-9_]*\s*\}\}/g;

// The text fields exactly as written in the catalog: strings are scanned with their tokens blanked out, functions are skipped
// (their output is what the rendered scan covers).
function staticParts() {
  const parts = [];
  for (const flag of CATALOG.flags) {
    for (const field of FIELDS) {
      if (typeof flag[field] === 'string') parts.push([`${flag.id} ${field} (as written)`, flag[field].replace(WELL_FORMED_TOKEN, 'X')]);
    }
  }
  return parts;
}

const copyParts = () => everything().reduce((all, entry) => all.concat(copyOf(entry)), []).concat(staticParts());
const sourceParts = () => everything().reduce((all, entry) => all.concat(sourcesOf(entry)), []);
const allParts = () => copyParts().concat(sourceParts());

const QUESTION_PARTS = questionTexts(CATALOG, SECTIONS);

// What the patterns find in the parts, one line each, at most 15 shown (the same wording in many households is one finding).
function offenders(parts, patterns) {
  const found = [];
  const seen = new Set();
  for (const [label, text] of parts) {
    for (const [name, re] of patterns) {
      const m = re.exec(text);
      if (!m) continue;
      const around = text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, ' ');
      const key = `${name} ${around}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(`${label}: ${name} ("${around}")`);
    }
  }
  return found.length > 15 ? found.slice(0, 15).concat([`... and ${found.length - 15} more`]) : found;
}

suite('copy audit: flags', (t) => {
  t('the corpus is real: every flag appears in it, with all four text parts', () => {
    const corpus = everything();
    const seen = new Set(corpus.map((e) => e.flag.id));
    assert.deepEqual(CATALOG.flags.map((f) => f.id).filter((id) => !seen.has(id)), [], 'flags missing from the corpus');
    assert.ok(corpus.length >= CATALOG.flags.length, 'fewer renderings than flags');
    for (const e of corpus) for (const field of FIELDS) assert.equal(typeof e.flag[field], 'string', `${e.flag.id}.${field}`);
  });

  t('no placeholder or unresolved text: braces, brackets, TODO, TBD, XXX, "coming soon", N/A, "...", %s, undefined, NaN, null, [object', () => {
    assert.deepEqual(offenders(allParts(), PLACEHOLDERS), []);
  });

  t('no text or title names a US state or the District of Columbia, by name, postal code or abbreviation', () => {
    assert.deepEqual(offenders(allParts(), STATE_PATTERNS), []);
  });

  t('no interface or internal language leaks into flag text ("home equity", "next screen", "generic patterns")', () => {
    assert.deepEqual(offenders(allParts(), UI_LEAKS), []);
  });

  t('no dashes used as punctuation in our own text (en dash, em dash, spaced hyphens)', () => {
    assert.deepEqual(offenders(copyParts(), [['a dash', DASH]]), []);
  });

  t('no text starts or ends with a space, has a double space or a line break (the copied list and the page both depend on it)', () => {
    const bad = [];
    for (const [label, text] of copyParts()) {
      if (typeof text !== 'string' || text !== text.trim() || /\s{2,}/.test(text) || /[\r\n]/.test(text)) bad.push(label);
    }
    assert.deepEqual(bad, []);
  });

  t('background, ask and reason read as finished sentences and the title is not empty', () => {
    const bad = [];
    for (const e of everything()) {
      const f = e.flag;
      if (f.title.trim().length < 10) bad.push(`${f.id} title too short`);
      for (const field of ['background', 'ask', 'reason']) {
        if (!/[.!?]["')]?$/.test(f[field])) bad.push(`${f.id} (${e.run.id}) ${field} does not end like a sentence: "...${f[field].slice(-30)}"`);
      }
    }
    assert.deepEqual(bad, []);
  });
});

suite('copy audit: questions and sections', (t) => {
  t('the question text under audit is real: every prompt, every option label, every section', () => {
    assert.ok(QUESTION_PARTS.length > CATALOG.questions.length * 3, 'fewer pieces of question text than expected');
    for (const [label, text] of QUESTION_PARTS) assert.ok(typeof text === 'string' && text.trim().length > 0, `${label} is empty`);
    assert.equal(SECTIONS.length, 11);
  });

  t('no placeholder text in any question, option or section', () => {
    assert.deepEqual(offenders(QUESTION_PARTS, PLACEHOLDERS), []);
  });

  t('no question, option or section names a US state or the District of Columbia, by name, postal code or abbreviation', () => {
    assert.deepEqual(offenders(QUESTION_PARTS, STATE_PATTERNS), []);
  });

  t('no interface or internal language leaks into question text ("home equity", "next screen", "generic patterns")', () => {
    assert.deepEqual(offenders(QUESTION_PARTS, UI_LEAKS), []);
  });

  t('no dashes used as punctuation in question text', () => {
    assert.deepEqual(offenders(QUESTION_PARTS, [['a dash', DASH]]), []);
  });

  // The page adds "Tap all that apply." to the help of every multi question (screens.mjs questionHtml), so a help text that
  // says it too reads as a repeated instruction ("Tick all that apply. Tap all that apply."). Found in the S16 read-through.
  t('no multi question help repeats the "all that apply" instruction the page already adds', () => {
    const REPEATS = /\b(?:tick|tap|pick|select|check|choose)\s+(?:all|every|everything|each|any)\b/i;
    const multi = CATALOG.questions.filter((q) => q.type === 'multi' && typeof q.help === 'string' && q.help !== '');
    assert.ok(multi.length >= 4, 'the multi questions with help text are policies, health_supplemental, roadside_sources and cards');
    assert.deepEqual(multi.filter((q) => REPEATS.test(q.help)).map((q) => `${q.id}: ${q.help}`), []);
    assert.equal(REPEATS.test('Tick all that apply.'), true, 'the pattern catches the old wording');
    assert.equal(REPEATS.test('Tick everything that applies.'), true, 'the pattern catches the other old wording');
    assert.equal(REPEATS.test('If you are not sure, tick it and we will tell you what to look for.'), false, 'tick it is fine');
  });
});

suite('copy audit: the audit itself can fail', (t) => {
  // A scanner that never matches would pass everything. Prove every pattern catches what it is for.
  t('the placeholder patterns catch their targets and ignore ordinary words', () => {
    const hit = (text) => offenders([['x', text]], PLACEHOLDERS).length;
    for (const bad of ['a {{var}} left', 'half }} token', 'TODO: write', 'to do TBD', 'Lorem ipsum', 'it said undefined', 'cost NaN dollars', 'is null here', '[object Object]', 'Infinity dollars']) {
      assert.ok(hit(bad) > 0, `should catch: ${bad}`);
    }
    for (const fine of ['Nothing is undefined about a deductible.'.replace('undefined', 'unclear'), 'an annual review', 'the nullification']) {
      assert.equal(hit(fine), 0, `should not catch: ${fine}`);
    }
  });

  t('every placeholder a reviewer could put in a title, background, ask or reason is caught, by the pattern meant for it', () => {
    // [text, the pattern that must name it]. A scanner that only knew the first ten would pass all of these.
    const shapes = [
      ['Check whether [insert insurer name] covers it', 'a square bracket'],
      ['Ask <insurer> whether it covers it', 'an angle bracket'],
      ['Ask <insurer>', 'an angle bracket'],
      ['Ask the insurer XXX about it', 'XXX'],
      ['Ask the insurer xxx about it', 'XXX'],
      ['This is a PLACEHOLDER title', 'the word placeholder'],
      ['Placeholder text for the ask', 'the word placeholder'],
      ['Details coming soon for this item', 'coming soon'],
      ['Your limit is %s today', 'a printf token'],
      ['You have %d policies', 'a printf token'],
      ['Your limit is %1$s today', 'a printf token'],
      ['Your limit is ${limit} today', 'a template literal'],
      ['Your limit is {limit} today', 'a curly brace'],
      ['Limit: N/A', 'N/A'],
      ['Limit: n/a', 'N/A'],
      ['Check what it covers...', 'an ellipsis'],
      ['Check what it covers\u2026', 'an ellipsis'],
      ['Is it covered???', '"???"'],
      ['Details to be determined', 'to be determined'],
      ['Section to be added later', 'to be determined'],
      ['TBA', 'TBA'],
    ];
    for (const [text, pattern] of shapes) {
      const found = offenders([['x', text]], PLACEHOLDERS);
      assert.ok(found.some((line) => line.includes(pattern)), `"${text}" should be caught as ${pattern}, got: ${found.join(' | ') || 'nothing'}`);
    }
  });

  t('the placeholder patterns leave ordinary figures and plain punctuation alone', () => {
    const fine = [
      'Your auto policy has 100/300 and your umbrella asks for 250/500.', 'You need about $500,000 or $1 million.', 'It pays 80% of the cost, up to $2,500.',
      'Ask what the extra costs (it is fair to ask).', 'UM/UIM, AD&D and HSA are explained where they first appear.', 'The Insurance Information Institute (Triple-I) says so.',
      'Pick one, e.g. a car or a boat.', 'Lower than 100/300', 'Not sure', "Don't know? Pick Not sure.", 'Page 3 to 4',
      'The extra X is not X-rated', 'an expert at excellence',
    ];
    for (const text of fine) assert.equal(offenders([['x', text]], PLACEHOLDERS).length, 0, `should not catch: ${text}`);
  });

  t('the state patterns catch states, the District, postal codes and older abbreviations, and ignore ordinary words', () => {
    const caught = (text) => offenders([['x', text]], STATE_PATTERNS).length > 0;
    for (const bad of [
      'In Texas it is', 'ask the Minnesota department', 'New York rules', 'District of Columbia', 'Washington, D.C. residents', 'washington state', 'West Virginia',
      // postal codes
      'Call the MN Department of Commerce', 'a TX policy', 'Boise, ID', 'your CA rules', 'ask your NY agent', 'Austin, TX', 'the OR DOI', 'ask the ID DOI', 'OK law', 'in Portland, OR', 'WA state rules', 'DC residents',
      // older abbreviations
      'the Minn. Department of Commerce', 'Calif. law', 'a Tex. insurer', 'N.Y. law', 'S.C. rules', 'W.Va. residents', 'Penn. insurers', 'Fla. law',
    ]) {
      assert.ok(caught(bad), `should catch: ${bad}`);
    }
    for (const fine of [
      "your state's department of insurance", 'a mainstream plan', 'an oregano garden', 'varies by state', 'the author Woolf',
      // ordinary words that spell a code in lower case or sentence case, and capitals that are not a state
      'Ask me or your agent, in writing', 'In writing, or by phone', 'Or ask the carrier. OK to skip', 'Hi there', 'photo ID is not needed', 'Ask for ID at the counter',
      'UM/UIM coverage', 'AD&D insurance', 'HSA and HDHP plans', 'NAIC and FTC and FEMA', 'US and U.S. rules', 'about 100/300 or 250/500', 'costs $500,000', 'the cat ate', 'Mass transit', 'Washing machine',
    ]) {
      assert.equal(caught(fine), false, `should not catch: ${fine}`);
    }
  });

  t('the interface-language patterns catch the three rejected phrases in any case and spelling', () => {
    for (const bad of ['your home equity', 'Home-equity loan', 'on the next screen', 'next screens', 'generic patterns', 'Generic pattern']) {
      assert.ok(offenders([['x', bad]], UI_LEAKS).length > 0, `should catch: ${bad}`);
    }
    for (const fine of ['what your home is worth beyond what you still owe on it', 'the next question', 'a pattern of claims']) {
      assert.equal(offenders([['x', fine]], UI_LEAKS).length, 0, `should not catch: ${fine}`);
    }
  });

  t('the dash pattern catches en and em dashes and spaced hyphens, and ignores hyphenated words', () => {
    for (const bad of ['a — b', 'a–b', 'a - b', 'a -- b']) assert.ok(DASH.test(bad), `should catch: ${bad}`);
    for (const fine of ['a high-deductible plan', 'long-term', 'follow-up', '100/300-ish']) assert.equal(DASH.test(fine), false, `should not catch: ${fine}`);
  });

  t('the registry the source lines come from is covered too (publisher and title of every source the corpus shows)', () => {
    const cited = new Set();
    for (const e of everything()) for (const s of e.flag.sources) cited.add(s.id);
    assert.ok(cited.size > 50, `only ${cited.size} distinct sources reach the corpus`);
    for (const id of cited) assert.ok(SOURCES[id], `${id} is not in the registry`);
  });
});
