// Liability stack visualization (Story S14): the user's umbrella on top, the liability limits of the policies
// underneath it, and for each one whether it meets what the umbrella asks for. PURE: no DOM, no Node APIs, no
// storage, no timers, no clock, no randomness, and no imports at all. It runs unchanged under macOS jsc, Node and
// browsers, and it is driven ONLY by the LiabilityStack model that the engine builds (docs/ARCHITECTURE.md
// "LiabilityStack", engine/liabilityStack.mjs); it reads nothing else.
//
//   stackViewModel(stack)        model -> render-ready structure, or null when there is no stack (no umbrella)
//   stackViewHtml(vm, opts?)     view-model -> HTML string ('' for null); opts.idPrefix names the heading id
//
// The same component serves the umbrella question screens (updated live as limits are answered) and the insurer
// action list. Status is always written out in words and drawn as a distinct shape (circle with a check, square
// with a down arrow, diamond with an up arrow, dashed circle with a question mark), never colour alone. Bars are
// SVG (attribute widths, no style attributes), so the markup also works under a strict content security policy.

export const STACK_VIEW_VERSION = 1;

/** Shown above the rows. Plain language: the page never calls this a "liability stack". */
export const STACK_HEADING = 'Your umbrella and what sits under it';

/** The plain-language sentence for each layer status (closed list, keyed by the model's status ids). */
export const STATUS_SENTENCES = {
  ok: 'Meets what your umbrella asks for',
  below_required: 'Below what your umbrella asks for. Ask your insurer to raise it.',
  above_required: 'Higher than your umbrella requires',
  unknown: 'We need one more answer to check this',
};

// Short forms of the same statements, for the screen-reader summary.
const STATUS_SHORT = {
  ok: 'meets what your umbrella asks for',
  below_required: 'below what your umbrella asks for',
  above_required: 'higher than your umbrella requires',
  unknown: 'needs one more answer',
};

// CSS class suffix and icon name for each status.
const STATUS_CLASS = { ok: 'ok', below_required: 'below', above_required: 'above', unknown: 'unknown' };
const STATUS_ICON = { ok: 'check', below_required: 'down', above_required: 'up', unknown: 'question' };

const UMBRELLA_SENTENCES = {
  known: 'Sits on top of the policies below',
  not_sure: 'You were not sure of your umbrella limit',
  unanswered: 'We do not have your umbrella limit yet',
  unreadable: 'We could not read your umbrella limit',
};

export const EMPTY_NOTE = 'We found no auto, home, motorcycle or boat policy to show under your umbrella.';

const CAPTION_UMBRELLA_LIMIT = 'Umbrella limit';
const CAPTION_LIMIT = 'Your limit';
const CAPTION_REQUIRED = 'Your umbrella asks for';

const BAR_HEADROOM = 1.1;   // the longest bar and marker stop at 1 / 1.1 of the track, so a marker is never clipped
const MIN_PCT = 1.5;        // a non-zero limit always shows a sliver

// ---------------------------------------------------------------------------------------------------------------
// View-model
// ---------------------------------------------------------------------------------------------------------------
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isAmount = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const text = (v, fallback) => (typeof v === 'string' && v !== '' ? v : fallback);
const round1 = (n) => Math.round(n * 10) / 10;

const splitOf = (v) => (isObject(v) && isAmount(v.perPerson) && isAmount(v.perAccident) ? v : null);

/** The one number a layer is drawn with: its amount, or (split limits) the number the verdict was decided on. */
function basisOf(layer, status) {
  if (layer.limitShape !== 'split') return 'amount';
  const limit = splitOf(layer.limit);
  const required = splitOf(layer.required);
  if (limit !== null && required !== null) {
    // The model calls a split limit "below" when EITHER number is lower. Draw the number that is lower, so the bar,
    // the marker and the sentence agree (the same for "above").
    if (status === 'below_required') return limit.perPerson < required.perPerson ? 'perPerson' : 'perAccident';
    if (status === 'above_required') return limit.perPerson > required.perPerson ? 'perPerson' : 'perAccident';
  }
  return 'perAccident';
}

function measure(amount, basis) {
  if (basis === 'amount') return isAmount(amount) ? amount : null;
  const split = splitOf(amount);
  return split === null ? null : split[basis];
}

const pctOf = (value, scale) => {
  if (value === null || !(scale > 0)) return null;
  const raw = round1((value / scale) * 100);
  return Math.min(100, Math.max(value > 0 ? MIN_PCT : 0, raw));
};

function umbrellaRow(umbrella) {
  const answer = ['known', 'not_sure', 'unanswered', 'unreadable'].indexOf(umbrella.limitAnswer) >= 0 ? umbrella.limitAnswer : 'unanswered';
  return {
    id: 'umbrella',
    kind: 'umbrella',
    label: text(umbrella.label, 'Umbrella'),
    limitCaption: CAPTION_UMBRELLA_LIMIT,
    limitLabel: text(umbrella.limitLabel, 'Not answered yet'),
    requiredCaption: null,
    requiredLabel: null,
    status: null,
    statusLabel: null,
    sentence: UMBRELLA_SENTENCES[answer],
    detail: '',
    icon: 'umbrella',
    // The umbrella sits across the top of everything below it. Its bar is a cap, not a length on the layers' scale:
    // an umbrella does not add to a layer's limit, and the model deliberately has no "total protection" figure.
    bar: { kind: 'cap', basis: 'amount', limitPct: answer === 'known' ? 100 : null, requiredPct: null, ceiling: false },
  };
}

const hasTrouble = (answer) => answer === 'not_sure' || answer === 'unreadable';

function layerRow(layer, scale) {
  const status = STATUS_SENTENCES[layer.status] !== undefined ? layer.status : 'unknown';
  const basis = basisOf(layer, status);
  const limitKnown = layer.limitAnswer === 'known';
  const requiredKnown = layer.requiredAnswer === 'known';
  const limitPct = limitKnown ? pctOf(measure(layer.limit, basis), scale) : null;
  const requiredPct = requiredKnown ? pctOf(measure(layer.required, basis), scale) : null;
  return {
    id: text(layer.id, 'layer'),
    kind: 'layer',
    label: text(layer.label, 'Policy'),
    limitCaption: CAPTION_LIMIT,
    limitLabel: text(layer.limitLabel, 'Not answered yet'),
    requiredCaption: CAPTION_REQUIRED,
    requiredLabel: text(layer.requiredLabel, 'Not answered yet'),
    status,
    statusLabel: text(layer.statusLabel, ''),
    sentence: STATUS_SENTENCES[status],
    // The model's own sentence saying why a layer could not be checked, only when an answer was Not sure or unreadable.
    // A layer that is merely not answered yet needs no more than its sentence and its "Not answered yet" lines.
    detail: status === 'unknown' && (hasTrouble(layer.limitAnswer) || hasTrouble(layer.requiredAnswer)) ? text(layer.summary, '') : '',
    icon: STATUS_ICON[status],
    bar: { kind: 'compare', basis, limitPct, requiredPct, ceiling: layer.limitIsCeiling === true && limitPct !== null },
  };
}

// One short paragraph for a screen reader: the umbrella, then each layer's verdict in words (numbers are in the rows).
function ariaSummaryOf(rows) {
  const parts = [STACK_HEADING + '.', `${rows[0].limitCaption}: ${rows[0].limitLabel}.`];
  if (rows.length === 1) parts.push('No policy underneath to compare.');
  for (const row of rows.slice(1)) parts.push(`${row.label}: ${STATUS_SHORT[row.status]}.`);
  return parts.join(' ');
}

/**
 * Turns the engine's LiabilityStack into what the page draws. Returns null when `stack` is not a stack (no
 * umbrella is held, so there is nothing to show).
 *
 *   { version, heading, note, rows, counts, layerCount, emptyNote, ariaSummary }
 *
 *   rows[0] is the umbrella; rows[1..] are the underlying layers in the model's order (auto, home, motorcycle, boat).
 *   row: { id, kind: 'umbrella'|'layer', label, limitCaption, limitLabel, requiredCaption, requiredLabel, status,
 *          statusLabel, sentence, detail, icon, bar }
 *   status: the model's 'ok' | 'below_required' | 'above_required' | 'unknown' (null on the umbrella row)
 *   icon: 'umbrella' | 'check' | 'down' | 'up' | 'question'
 *   bar: { kind: 'cap'|'compare', basis: 'amount'|'perPerson'|'perAccident', limitPct, requiredPct, ceiling }
 *        percentages (0 to 100, one decimal) of a track shared by every layer, or null when that number is not known;
 *        `ceiling` is true for a "Lower than ..." limit, which is only an upper bound
 *
 * Bar lengths come straight from the model's numbers. For a split limit such as 250/500 one number has to be
 * drawn: it is the one on which the model decided the verdict (so a bar never contradicts its sentence), and the
 * limit and the requirement are always drawn on that same number. The text beside the bar gives both.
 */
export function stackViewModel(stack) {
  if (!isObject(stack) || !isObject(stack.umbrella)) return null;
  const layers = Array.isArray(stack.layers) ? stack.layers.filter(isObject) : [];

  // One scale for all the layers: the largest number any bar or marker needs.
  let largest = 0;
  for (const layer of layers) {
    const status = STATUS_SENTENCES[layer.status] !== undefined ? layer.status : 'unknown';
    const basis = basisOf(layer, status);
    const values = [layer.limitAnswer === 'known' ? measure(layer.limit, basis) : null, layer.requiredAnswer === 'known' ? measure(layer.required, basis) : null];
    for (const v of values) if (v !== null && v > largest) largest = v;
  }
  const scale = largest * BAR_HEADROOM;

  const top = umbrellaRow(stack.umbrella);
  const rows = [top].concat(layers.map((layer) => layerRow(layer, scale)));
  const counts = { ok: 0, below_required: 0, above_required: 0, unknown: 0 };
  for (const row of rows.slice(1)) counts[row.status] += 1;
  const layerCount = rows.length - 1;
  return {
    version: STACK_VIEW_VERSION,
    heading: STACK_HEADING,
    note: text(stack.attachmentNote, ''),
    rows,
    counts,
    layerCount,
    emptyNote: layerCount === 0 ? EMPTY_NOTE : null,
    ariaSummary: ariaSummaryOf(rows),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------------------------------------------
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Line icons on a 24 x 24 grid, drawn with currentColor. Each status has its own outline, so the shape alone says which.
const ICONS = {
  umbrella: '<path d="M3 12.5a9 9 0 0 1 18 0H3z"/><path d="M12 12.5v5.5a2 2 0 0 0 4 0M12 3.5v1"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M7.8 12.4l3 3 5.6-6.2"/>',
  down: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M12 7.5v8.2M8.4 12.6l3.6 3.6 3.6-3.6"/>',
  up: '<path d="M12 2.6l9.4 9.4-9.4 9.4L2.6 12z"/><path d="M12 16.5V8.3M8.4 11.4L12 7.8l3.6 3.6"/>',
  question: '<circle cx="12" cy="12" r="9" stroke-dasharray="3.2 2.6"/><path d="M9.4 9.6a2.7 2.7 0 1 1 3.9 2.4c-.9.5-1.3 1-1.3 1.9M12 17.2v.1"/>',
};

function iconHtml(row) {
  return '<span class="stk-ico' + (row.status !== null ? ' ' + STATUS_CLASS[row.status] : '') + '" data-icon="' + esc(row.icon) + '">' +
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' + ICONS[row.icon] + '</svg></span>';
}

// The bar: a track, a fill up to the limit, and a marker at what the umbrella asks for. Widths are SVG attributes.
function barHtml(row) {
  const b = row.bar;
  const cls = row.kind === 'umbrella' ? 'cap' : STATUS_CLASS[row.status];
  let inner = '<rect class="stk-track" x="0" y="3" width="100" height="10"/>';
  if (b.limitPct !== null) {
    inner += '<rect class="stk-fill ' + cls + (b.ceiling ? ' ceiling' : '') + '" x="0" y="3" width="' + b.limitPct + '" height="10"/>';
  }
  if (b.requiredPct !== null) {
    const x = b.requiredPct;
    inner += '<line class="stk-req-halo" x1="' + x + '" y1="0" x2="' + x + '" y2="16"/><line class="stk-req" x1="' + x + '" y1="0" x2="' + x + '" y2="16"/>';
  }
  const empty = b.limitPct === null && b.requiredPct === null;
  return '<svg class="stk-bar' + (empty ? ' empty' : '') + '" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + inner + '</svg>';
}

// The little mark in front of a caption says which part of the bar it explains: the fill (the limit) or the tick (what
// the umbrella asks for). A caption whose number is not drawn (not known yet) gets an empty slot, so the words line up.
function keyHtml(kind, row) {
  const b = row.bar;
  const cls = row.kind === 'umbrella' ? 'cap' : STATUS_CLASS[row.status];
  if (kind === 'limit' && b.limitPct !== null) return '<span class="stk-key fill ' + cls + (b.ceiling ? ' ceiling' : '') + '" aria-hidden="true"></span>';
  if (kind === 'required' && b.requiredPct !== null) return '<span class="stk-key tick" aria-hidden="true"></span>';
  return '<span class="stk-key" aria-hidden="true"></span>';
}

function rowHtml(row) {
  const required = row.requiredLabel === null ? ''
    : '<div><dt>' + keyHtml('required', row) + esc(row.requiredCaption) + '</dt><dd>' + esc(row.requiredLabel) + '</dd></div>';
  const detail = row.detail !== '' ? '<p class="small stk-detail">' + esc(row.detail) + '</p>' : '';
  return '<li class="stk-row stk-' + row.kind + (row.status !== null ? ' ' + STATUS_CLASS[row.status] : '') + '" data-stk="' + esc(row.id) + '">' +
    iconHtml(row) +
    '<div class="stk-main"><p class="stk-name">' + esc(row.label) + '</p>' +
      '<p class="stk-sentence">' + esc(row.sentence) + '</p>' +
      barHtml(row) + detail +
      '<dl class="stk-nums"><div><dt>' + keyHtml('limit', row) + esc(row.limitCaption) + '</dt><dd>' + esc(row.limitLabel) + '</dd></div>' + required + '</dl>' +
    '</div></li>';
}

/**
 * The stack as one labelled section: heading, the note that says how an umbrella attaches, then the rows (umbrella
 * first). Every string goes through esc(). `opts.idPrefix` (lowercase letters, digits and hyphens) names the heading
 * id so two stacks can share a page; the default is "stk". Returns '' for a null view-model.
 */
export function stackViewHtml(vm, opts) {
  if (!isObject(vm) || !Array.isArray(vm.rows) || vm.rows.length === 0) return '';
  const wanted = isObject(opts) ? opts.idPrefix : undefined;
  const prefix = typeof wanted === 'string' && /^[a-z][a-z0-9-]*$/.test(wanted) ? wanted : 'stk';
  return '<section class="stk" aria-labelledby="' + prefix + '-h">' +
    '<h3 class="stk-h" id="' + prefix + '-h">' + esc(vm.heading) + '</h3>' +
    (vm.note !== '' ? '<p class="small stk-note">' + esc(vm.note) + '</p>' : '') +
    '<ol class="stk-rows">' + vm.rows.map(rowHtml).join('') + '</ol>' +
    (vm.emptyNote !== null ? '<p class="small stk-empty">' + esc(vm.emptyNote) + '</p>' : '') +
    '</section>';
}
