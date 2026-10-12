// Story S16: docs/TRACEABILITY.md checked against the things it talks about.
//
// The document maps every requirement in docs/SPEC.md to where it is built and which test proves it. A document like that goes
// stale quietly, so this test reads it and fails when
//
//   * a content line of docs/SPEC.md (headings and the source note aside) has no row, or a row points at a SPEC line that is blank or
//     does not exist (row ids are SPEC line numbers, "L48", "L48.2", or a range "L176-182"; the SPEC is frozen, so they do not move);
//   * a row has the wrong number of columns, an empty cell, or a status the document does not define;
//   * a status does not carry what it promises: DEVIATION and OUT OF V1 name a DECISIONS entry, OWNER ACTION names an OPEN-ITEMS entry,
//     DEFERRED names D14, and a BUILT, DEVIATION, DEFERRED or OUT OF V1 row names the code and at least one test file;
//   * a file the document cites does not exist, or a flag, question, option or source id it puts in code font is not in the catalog;
//   * a DECISIONS or OPEN-ITEMS id it cites is not in those logs;
//   * a flag or a question in the catalog is never mentioned, or an appendix row gives a flag the wrong bucket or points at a row
//     that is not in the tables.
//
// It also holds the SPEC invariants that had no test of their own when the audit was written (see "SPEC invariants").
// Code font may also hold a wizard section id (umbrella_stack) or a browser golden scenario id (renters-college-child).
// Pure data and text checks; the file reads use jsc's read() and are skipped where it is missing, like the other source-reading tests.
import { suite, assert } from '../harness.mjs';
import CATALOG from '../../public/js/overlap/data/catalog.mjs';
import { SOURCES } from '../../public/js/overlap/data/sources.mjs';
import { SECTIONS } from '../../public/js/overlap/data/questions/index.mjs';
import { CARD_CHOICES } from '../../public/js/overlap/data/questions/cards.mjs';
import {
  ENTRY_HEADING, ENTRY_INTRO, ENTRY_LEAD, ENTRY_HOW, ENTRY_NOTE, LIST_INTRO, NEEDS_HINT, NEEDS_HINT_Q1, PRIVACY_LINE_NONE, PRIVACY_LINE_COUNTING,
} from '../../public/js/overlap-ui/screens.mjs';
import {
  INFO_NOTE, EMPTY_TITLE, EMPTY_MESSAGE, TEXT_HEADLINE, BUCKET_DESCRIPTIONS, EMPHASIS_LABEL,
} from '../../public/js/overlap-ui/viewModel.mjs';
import SCENARIOS from '../browser/scenarios.mjs';
import { everything, questionTexts } from './corpus.mjs';

const hasRead = typeof read === 'function';

export const STATUS_WORDS = ['BUILT', 'DEVIATION', 'DEFERRED', 'OWNER ACTION', 'OUT OF V1', 'CONTEXT'];
const FILE_EXTENSIONS = /\.(?:mjs|md|html|css|sh|py|json)$/;
const ROW_ID = /^L(\d+)(?:-(\d+))?(?:\.(\d+))?$/;

// ------------------------------------------------------------------------------------------------ parsing

/** The rows of every table whose first cell is a row id: [{ id, line, lineEnd, sub, cells: [id, requirement, status, where, proof] }]. */
export function traceRows(doc) {
  const rows = [];
  for (const raw of doc.split('\n')) {
    if (!raw.startsWith('| L')) continue;
    const cells = raw.slice(1, raw.lastIndexOf('|')).split('|').map((c) => c.trim());
    const m = ROW_ID.exec(cells[0]);
    if (!m) continue;
    rows.push({ id: cells[0], line: Number(m[1]), lineEnd: m[2] === undefined ? Number(m[1]) : Number(m[2]), sub: m[3], cells, raw });
  }
  return rows;
}

/** The SPEC lines a row has to be found for: non-blank lines that are not headings, the title or the source note. */
export function specContentLines(spec) {
  const lines = [];
  spec.split('\n').forEach((text, i) => {
    if (text.trim() === '' || text.startsWith('#') || text.startsWith('>')) return;
    lines.push(i + 1);
  });
  return lines;
}

/** The SPEC lines that are not blank, for checking that a row points somewhere real (headings count: "appears if Umbrella is selected"). */
export function specNonBlankLines(spec) {
  const lines = [];
  spec.split('\n').forEach((text, i) => { if (text.trim() !== '') lines.push(i + 1); });
  return lines;
}

/** The SPEC content lines no row covers. */
export function uncoveredLines(contentLines, rows) {
  return contentLines.filter((n) => !rows.some((r) => n >= r.line && n <= r.lineEnd));
}

/** Everything in code font in a piece of text. */
export function codeTokens(text) {
  return Array.from(text.matchAll(/`([^`]+)`/g)).map((m) => m[1]);
}

// A DECISIONS or OPEN-ITEMS id: D14, S5-13, R1-4, S3a-auto-1, S16-7.
const LOG_ID = /^[A-Z]\d+[a-z]?(?:-[a-z]+)*(?:-\d+)?$/;

/** The ids that follow the word `keyword` ("DECISIONS S5-13 and R1-4", "OPEN-ITEMS `S16-7`") anywhere in the text. */
export function logIdsAfter(text, keyword) {
  const ids = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf(keyword + ' ', from);
    if (at < 0) break;
    let rest = text.slice(at + keyword.length + 1);
    from = at + keyword.length + 1;
    for (;;) {
      const m = /^`?([A-Z][0-9A-Za-z-]*)`?(\s*(?:,|and)\s+|\s*,\s*)?/.exec(rest);
      if (!m || !LOG_ID.test(m[1])) break;
      ids.push(m[1]);
      if (!m[2]) break;
      rest = rest.slice(m[0].length);
    }
  }
  return ids;
}

/** The first words of each status segment ("BUILT; DEVIATION (DECISIONS S5-13)" gives BUILT and DEVIATION). */
export function statusSegments(cell) {
  return cell.split(';').map((s) => s.trim()).filter((s) => s !== '');
}

const wordOf = (segment) => STATUS_WORDS.find((w) => segment === w || segment.startsWith(w + ' ') || segment.startsWith(w + '(')) || null;

/** The problems one row has, as strings (empty when it is fine). `known` supplies the logs: { decisions: Set, openItems: Set }. */
export function rowProblems(row, known) {
  const problems = [];
  const at = (msg) => problems.push(`${row.id}: ${msg}`);
  if (row.cells.length !== 5) { at(`${row.cells.length} columns, expected 5 (line, requirement, status, where, proof)`); return problems; }
  const [, requirement, status, where, proof] = row.cells;
  for (const [name, cell] of [['requirement', requirement], ['status', status], ['where implemented', where], ['proof', proof]]) if (cell === '') at(`empty ${name} cell`);
  const segments = statusSegments(status);
  const words = [];
  for (const seg of segments) {
    const w = wordOf(seg);
    if (w === null) { at(`unknown status "${seg}"`); continue; }
    words.push(w);
    if (w === 'DEVIATION' || w === 'OUT OF V1') {
      const ids = logIdsAfter(seg, 'DECISIONS');
      if (ids.length === 0) at(`${w} must name a DECISIONS entry ("${seg}")`);
      for (const id of ids) if (!known.decisions.has(id)) at(`DECISIONS ${id} is not in docs/DECISIONS.md`);
    }
    if (w === 'DEFERRED' && !/\bD14\b/.test(seg)) at(`DEFERRED must name D14 ("${seg}")`);
    if (w === 'OWNER ACTION') {
      const ids = logIdsAfter(seg, 'OPEN-ITEMS');
      if (ids.length === 0) at(`OWNER ACTION must name an OPEN-ITEMS entry ("${seg}")`);
      for (const id of ids) if (!known.openItems.has(id)) at(`OPEN-ITEMS ${id} is not in docs/OPEN-ITEMS.md`);
    }
  }
  if (words.length === 0) return problems;
  const builds = words.some((w) => w === 'BUILT' || w === 'DEVIATION' || w === 'DEFERRED' || w === 'OUT OF V1');
  if (builds) {
    if (codeTokens(where).length === 0) at('names no code, file, flag or question in "where implemented"');
    if (!codeTokens(proof).some((t) => t.startsWith('tests/'))) at('names no test file in "proof"');
  }
  return problems;
}

/** Problems with every code-font token in the text: a path that does not exist, an id the catalog does not have. */
export function tokenProblems(text, facts, fileExists) {
  const problems = [];
  const seen = new Set();
  for (const token of codeTokens(text)) {
    if (seen.has(token)) continue;
    seen.add(token);
    if (token.indexOf('/') >= 0 && FILE_EXTENSIONS.test(token)) {
      if (!fileExists(token)) problems.push(`file not found: ${token}`);
    } else if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(token)) {
      if (!facts.snake.has(token)) problems.push(`not a question or option id: ${token}`);
    } else if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(token)) {
      if (!facts.kebab.has(token)) problems.push(`not a flag, source or card id: ${token}`);
    }
  }
  return problems;
}

/** Appendix rows: a first cell of ids in code font, then (flags only) the bucket, then the SPEC rows it points at. */
export function appendixRows(doc, heading) {
  const start = doc.indexOf(heading);
  if (start < 0) return [];
  const rest = doc.slice(start + heading.length);
  const next = rest.search(/\n## /);
  const body = next < 0 ? rest : rest.slice(0, next);
  const out = [];
  for (const raw of body.split('\n')) {
    if (!raw.startsWith('| `')) continue;
    const cells = raw.slice(1, raw.lastIndexOf('|')).split('|').map((c) => c.trim());
    out.push({ ids: codeTokens(cells[0]), cells, raw });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the facts to check against

const snake = new Set(['not_sure']);
const kebab = new Set();
for (const q of CATALOG.questions) {
  snake.add(q.id);
  for (const o of q.options) snake.add(o.id);
}
for (const s of SECTIONS) snake.add(s.id);
for (const f of CATALOG.flags) kebab.add(f.id);
for (const id of Object.keys(SOURCES)) kebab.add(id);
for (const c of CARD_CHOICES) kebab.add(c.id);
for (const sc of SCENARIOS) kebab.add(sc.id);
const FACTS = { snake, kebab };

const flagIds = CATALOG.flags.map((f) => f.id);
const questionIds = CATALOG.questions.map((q) => q.id);

function logIds(text, pattern) {
  const ids = new Set();
  for (const m of text.matchAll(pattern)) ids.add(m[1]);
  return ids;
}

const readFile = (path) => { try { return read(path); } catch (e) { return ''; } };
const exists = (path) => readFile(path).length > 0;

function load() {
  const doc = readFile('docs/TRACEABILITY.md');
  const spec = readFile('docs/SPEC.md');
  const known = {
    decisions: logIds(readFile('docs/DECISIONS.md'), /\*\*([A-Z][0-9A-Za-z-]*) - /g),
    openItems: logIds(readFile('docs/OPEN-ITEMS.md'), /\*\*([A-Z][0-9A-Za-z-]*) - /g),
  };
  return { doc, spec, known, rows: traceRows(doc) };
}

// ------------------------------------------------------------------------------------------------ the document

suite('traceability: docs/TRACEABILITY.md', (t) => {
  t('the document and the SPEC are there, and the document has a real number of rows', () => {
    if (!hasRead) return;
    const { doc, spec, rows } = load();
    assert.ok(spec.length > 1000, 'docs/SPEC.md not read');
    assert.ok(doc.length > 1000, 'docs/TRACEABILITY.md not read');
    assert.ok(rows.length >= 80, `only ${rows.length} rows found`);
  });

  t('every content line of the SPEC has a row, and every row points at a line of the SPEC that is not blank', () => {
    if (!hasRead) return;
    const { spec, rows } = load();
    const loose = uncoveredLines(specContentLines(spec), rows);
    const specLines = spec.split('\n');
    assert.deepEqual(loose.map((n) => `SPEC line ${n}: ${specLines[n - 1].slice(0, 80)}`), [], 'SPEC lines with no row in docs/TRACEABILITY.md');
    const nonBlank = new Set(specNonBlankLines(spec));
    const bad = [];
    for (const r of rows) {
      if (r.lineEnd < r.line) bad.push(`${r.id}: the range runs backwards`);
      else if (r.line === r.lineEnd && !nonBlank.has(r.line)) bad.push(`${r.id}: SPEC line ${r.line} is blank or does not exist`);
      else if (r.lineEnd > specLines.length) bad.push(`${r.id}: past the end of the SPEC`);
    }
    assert.deepEqual(bad, []);
  });

  t('row ids are unique and a sub-row has a first row to belong to', () => {
    if (!hasRead) return;
    const { rows } = load();
    const ids = rows.map((r) => r.id);
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], 'duplicate row ids');
    const bare = new Set(rows.filter((r) => r.sub === undefined).map((r) => r.line));
    const orphans = rows.filter((r) => r.sub !== undefined && !bare.has(r.line) && !rows.some((x) => x.line === r.line && x.sub === '1'));
    assert.deepEqual(orphans.map((r) => r.id), []);
  });

  t('every row has five filled cells and a status the document defines, carrying what the status promises', () => {
    if (!hasRead) return;
    const { rows, known } = load();
    const problems = rows.reduce((all, r) => all.concat(rowProblems(r, known)), []);
    assert.deepEqual(problems, []);
  });

  t('every file the document cites exists, and every id it puts in code font is a real flag, question, option, source or card', () => {
    if (!hasRead) return;
    const { doc } = load();
    assert.deepEqual(tokenProblems(doc, FACTS, exists), []);
  });

  t('every DECISIONS and OPEN-ITEMS id the document cites is in those logs', () => {
    if (!hasRead) return;
    const { doc, known } = load();
    const missing = [];
    for (const id of logIdsAfter(doc, 'DECISIONS')) if (!known.decisions.has(id)) missing.push(`DECISIONS ${id}`);
    for (const id of logIdsAfter(doc, 'OPEN-ITEMS')) if (!known.openItems.has(id)) missing.push(`OPEN-ITEMS ${id}`);
    for (const m of doc.matchAll(/\((D\d{1,2})\)/g)) if (!known.decisions.has(m[1])) missing.push(`DECISIONS ${m[1]}`);
    assert.deepEqual(Array.from(new Set(missing)), []);
    assert.ok(known.decisions.size > 100 && known.openItems.size > 20, 'the logs were not read');
  });

  t('every flag and every question in the catalog is mentioned', () => {
    if (!hasRead) return;
    const { doc } = load();
    const tokens = new Set(codeTokens(doc));
    assert.deepEqual(flagIds.filter((id) => !tokens.has(id)), [], 'flags never mentioned');
    assert.deepEqual(questionIds.filter((id) => !tokens.has(id)), [], 'questions never mentioned');
  });

  t('Appendix A gives every flag its declared bucket and points at rows that exist; Appendix B does the same for every question', () => {
    if (!hasRead) return;
    const { doc, rows } = load();
    const rowIds = new Set(rows.map((r) => r.id));
    const rowLines = new Set(rows.map((r) => `L${r.line}`));
    const refOk = (ref) => rowIds.has(ref) || rowLines.has(ref);
    const bad = [];

    const flags = appendixRows(doc, '## Appendix A.');
    assert.deepEqual(flags.map((r) => r.ids[0]).sort(), flagIds.slice().sort(), 'Appendix A lists every flag once');
    const declared = new Map(CATALOG.flags.map((f) => [f.id, f.bucket]));
    for (const r of flags) {
      const [flag] = r.ids;
      if (!r.cells[1].startsWith(declared.get(flag))) bad.push(`${flag}: bucket "${r.cells[1]}", declared ${declared.get(flag)}`);
      for (const ref of r.cells[2].split(',').map((x) => x.trim())) if (!refOk(ref)) bad.push(`${flag}: ${ref} is not a row`);
    }

    const questions = appendixRows(doc, '## Appendix B.');
    assert.deepEqual(questions.reduce((all, r) => all.concat(r.ids), []).sort(), questionIds.slice().sort(), 'Appendix B lists every question once');
    for (const r of questions) for (const ref of r.cells[1].split(',').map((x) => x.trim())) if (!refOk(ref)) bad.push(`${r.ids.join(', ')}: ${ref} is not a row`);
    assert.deepEqual(bad, []);
  });

  t('a row that names a flag in its "where implemented" cell is a row about that flag: the flag is in the catalog bucket the row implies', () => {
    if (!hasRead) return;
    // The Drop / Raise / Question the SPEC names for a line must match the flag, unless the row says DEVIATION (checked by the
    // SPEC checklist test in detail); here only the words "bucket `raise`", "bucket `drop`" and "bucket `question`" are checked.
    const { rows } = load();
    const declared = new Map(CATALOG.flags.map((f) => [f.id, f.bucket]));
    const bad = [];
    for (const r of rows) {
      const where = r.cells[3] || '';
      for (const m of where.matchAll(/`([a-z0-9-]+)`[^`;.]*?\(bucket `(raise|drop|question)`/g)) {
        if (declared.has(m[1]) && declared.get(m[1]) !== m[2]) bad.push(`${r.id}: ${m[1]} is ${declared.get(m[1])}, the row says ${m[2]}`);
      }
    }
    assert.deepEqual(bad, []);
  });
});

// ------------------------------------------------------------------------------------------------ SPEC invariants

// Text a person can read on the page, outside the flags: the entry screen, the notes, the hints, the list headings, every question and section.
const PAGE_TEXT = [
  ENTRY_HEADING, ENTRY_INTRO, ENTRY_LEAD, ENTRY_HOW, ENTRY_NOTE, LIST_INTRO, NEEDS_HINT, NEEDS_HINT_Q1, PRIVACY_LINE_NONE, PRIVACY_LINE_COUNTING,
  INFO_NOTE, EMPTY_TITLE, EMPTY_MESSAGE, TEXT_HEADLINE, EMPHASIS_LABEL, BUCKET_DESCRIPTIONS.raise, BUCKET_DESCRIPTIONS.drop, BUCKET_DESCRIPTIONS.question,
];
const HEALTH_FLAG = (id) => id.indexOf('health-') === 0 || id === 'deductible-exceeds-cushion-health';
// "open enrollment" or an enrollment period or window; "enrolled in classes" (the renters item) is a different thing.
const mentionsEnrollment = (text) => /open[\s-]+enrol|enrol+ment\s+(?:period|window|season)/i.test(text);

suite('SPEC invariants: open enrollment belongs to the health branch only (SPEC "What this is and why")', (t) => {
  t('no flag outside the health branch, and no question, section, note or heading, mentions open enrollment in any wording it can take', () => {
    const offenders = [];
    for (const e of everything()) {
      if (HEALTH_FLAG(e.flag.id)) continue;
      for (const field of ['title', 'background', 'ask', 'reason']) if (mentionsEnrollment(e.flag[field])) offenders.push(`${e.flag.id} (${e.run.id}) ${field}`);
    }
    for (const [label, text] of questionTexts(CATALOG, SECTIONS)) if (mentionsEnrollment(text)) offenders.push(label);
    PAGE_TEXT.forEach((text, i) => { if (mentionsEnrollment(text)) offenders.push(`page text ${i}`); });
    assert.deepEqual(Array.from(new Set(offenders)).slice(0, 12), []);
  });

  t('the health branch does nod to it: the three flags that carry the open-enrollment note say so, and the pages and sources it uses are cited', () => {
    const nods = new Set();
    for (const e of everything()) if (mentionsEnrollment([e.flag.title, e.flag.background, e.flag.ask, e.flag.reason].join(' '))) nods.add(e.flag.id);
    assert.deepEqual(Array.from(nods).sort(), ['deductible-exceeds-cushion-health', 'health-hsa-nudge', 'health-supplemental-boltons']);
    for (const e of everything()) {
      if (!nods.has(e.flag.id)) continue;
      const ids = e.flag.sources.map((s) => s.id);
      assert.ok(ids.includes('healthcare-gov-dates-and-deadlines') && ids.includes('healthcare-gov-glossary-open-enrollment'), `${e.flag.id} cites the HealthCare.gov pages behind the note`);
    }
  });
});

suite('traceability: the checker can fail', (t) => {
  const spec = '# Title\n\n> note\n\nIntro line.\n\n## Part\n\n- First bullet.\n- Second bullet.\n';
  const known = { decisions: new Set(['D14', 'S5-13']), openItems: new Set(['S16-7']) };
  const row = (cells) => ({ id: cells[0], line: 1, lineEnd: 1, cells });

  t('specContentLines skips the title, headings, the note and blank lines', () => {
    assert.deepEqual(specContentLines(spec), [5, 9, 10]);
  });

  t('a SPEC line with no row is reported, and a range covers the lines inside it', () => {
    const rows = traceRows('| L5 | a | BUILT | `x.mjs` | `tests/y.test.mjs` |\n| L9-10 | b | CONTEXT | none | none |\n');
    assert.deepEqual(uncoveredLines(specContentLines(spec), rows), []);
    assert.deepEqual(uncoveredLines(specContentLines(spec), rows.slice(0, 1)), [9, 10]);
  });

  t('traceRows reads ids, ranges and sub-rows and ignores other tables', () => {
    const rows = traceRows('| Flag | Bucket |\n| `a-b` | raise |\n| L48.2 | x | BUILT | y | z |\n| L176-182 | x | CONTEXT | y | z |\n');
    assert.deepEqual(rows.map((r) => [r.line, r.lineEnd, r.sub]), [[48, 48, '2'], [176, 182, undefined]]);
  });

  t('logIdsAfter reads lists of ids, with and without code font, and stops at other words', () => {
    assert.deepEqual(logIdsAfter('DEVIATION (DECISIONS S5-13 and R1-4, S3a-auto-1); OWNER ACTION (OPEN-ITEMS `S16-7`)', 'DECISIONS'), ['S5-13', 'R1-4', 'S3a-auto-1']);
    assert.deepEqual(logIdsAfter('OWNER ACTION (OPEN-ITEMS `S16-7`)', 'OPEN-ITEMS'), ['S16-7']);
    assert.deepEqual(logIdsAfter('see DECISIONS for details', 'DECISIONS'), []);
  });

  t('a status the document does not define, a DEVIATION with no decision, a missing log entry and a BUILT row with no test are each reported', () => {
    const ok = ['L1', 'r', 'BUILT', '`public/a.mjs`', '`tests/b.test.mjs`'];
    assert.deepEqual(rowProblems(row(ok), known), []);
    assert.equal(rowProblems(row(['L1', 'r', 'MAYBE', '`a`', '`tests/b.test.mjs`']), known).length, 1);
    assert.equal(rowProblems(row(['L1', 'r', 'DEVIATION', '`a`', '`tests/b.test.mjs`']), known).length, 1);
    assert.equal(rowProblems(row(['L1', 'r', 'DEVIATION (DECISIONS X9-9)', '`a`', '`tests/b.test.mjs`']), known).length, 1, 'X9-9 does not exist');
    assert.equal(rowProblems(row(['L1', 'r', 'BUILT', '`a`', 'none']), known).length, 1);
    assert.equal(rowProblems(row(['L1', 'r', 'BUILT', 'none', '`tests/b.test.mjs`']), known).length, 1);
    assert.equal(rowProblems(row(['L1', 'r', 'DEFERRED (soon)', '`a`', '`tests/b.test.mjs`']), known).length, 1);
    assert.equal(rowProblems(row(['L1', 'r', 'OWNER ACTION', 'none', 'none']), known).length, 1);
    assert.deepEqual(rowProblems(row(['L1', 'r', 'OWNER ACTION (OPEN-ITEMS S16-7)', 'none', 'none']), known), []);
    assert.deepEqual(rowProblems(row(['L1', 'r', 'BUILT; DEFERRED (D14)', '`a`', '`tests/b.test.mjs`']), known), []);
    assert.equal(rowProblems(row(['L1', 'r', 'BUILT', '`a`']), known).length, 1, 'wrong number of columns');
  });

  t('tokenProblems reports a missing file and an id that is not in the catalog, and leaves ordinary code font alone', () => {
    const files = new Set(['docs/SPEC.md']);
    const facts = { snake: new Set(['auto_liability']), kebab: new Set(['auto-um-uim-check']) };
    const check = (text) => tokenProblems(text, facts, (p) => files.has(p));
    assert.deepEqual(check('`docs/SPEC.md` `auto_liability` `auto-um-uim-check` `ctx.holds(id)` `{ holds: id }` `OPEN_ENROLLMENT_NOTE` `story/S4a`'), []);
    assert.deepEqual(check('`docs/GONE.md`'), ['file not found: docs/GONE.md']);
    assert.deepEqual(check('`auto_limit`'), ['not a question or option id: auto_limit']);
    assert.deepEqual(check('`auto-um-uim-chek`'), ['not a flag, source or card id: auto-um-uim-chek']);
  });

  t('the open-enrollment pattern catches the ways a non-health item could mention it', () => {
    assert.equal(mentionsEnrollment('during open enrollment'), true);
    assert.equal(mentionsEnrollment('Open Enrollment'), true);
    assert.equal(mentionsEnrollment('the enrollment window'), true);
    assert.equal(mentionsEnrollment('whether they are enrolled in classes'), false, 'school enrollment is not open enrollment');
    assert.equal(mentionsEnrollment('Ask your agent about a higher limit.'), false);
  });
});
