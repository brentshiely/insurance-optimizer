// Golden-master engine for the Coverage Check wizard. Loaded by tests/browser/golden.html.
//
// It loads the real app in a hidden same-origin iframe, drives it ONLY through DOM events on the
// elements a user would use, and after every step records (or compares) the visible text of #stage,
// #known and the progress value. See tests/browser/README.md for the full contract.
//
// Nothing here touches the DOM, the clock or the network at import time, so the pure parts
// (OPS metadata, validateStep, diffLines, goldenFileText) can be imported by the jsc unit test
// tests/browser/golden-shape.test.mjs.

export const BASE_WAIT_MS = 250;        // wait after every step, so a slow tab cannot capture a half-drawn screen
export const QUIET_MS = 100;            // ...then also wait until the page has stopped mutating for this long
export const SETTLE_TIMEOUT_MS = 8000;  // give up on a step that never settles
export const LOAD_TIMEOUT_MS = 15000;
export const LOAD_ATTEMPTS = 3;         // a static server that drops connections when many modules are fetched at once can leave a page blank; a real load error repeats and still fails
export const POOL_SIZE = 3;             // scenarios replayed concurrently (each in its own iframe)

// ---------------------------------------------------------------------------------------------
// Step operations. A scenario step is a plain object { op, ...args }. `need` lists required keys.
// `run(step, h)` acts on the app through helper `h` (h.click, h.q, h.doc, h.win) and may return
// { expectChange: true } when the click only navigates after a timer (the screen text must then differ
// from the pre-step text before the step counts as settled). The wizard navigates synchronously, so only
// the generic `click` op ever asks for that.
// ---------------------------------------------------------------------------------------------
const A = v => String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export const OPS = {
  // Q1, "Which policies do you have?": taps the listed policy ids in order (each tap ticks or unticks it); "none" is "None of these"
  policies: { need: ["ids"], run(s, h) { for (const id of s.ids) h.click(`button[data-oq="policies"][data-ov="${A(id)}"]`); } },
  // any question screen: taps [questionId, optionId] pairs in order, in ONE step; each tap is button[data-oq][data-ov]. A tap updates the
  // screen synchronously, so a question that an earlier tap in the same list opened (a gated follow-up) is there for the next one.
  // Continue is a separate `next` step and stays disabled until every visible question on the screen is answered.
  answer: { need: ["list"], run(s, h) { for (const [q, v] of s.list) h.click(`button[data-oq="${A(q)}"][data-ov="${A(v)}"]`); } },
  // "Get started" on the entry screen and "Continue" on every question screen
  next: { need: [], run(s, h) { h.click('button[data-act="next"]'); } },
  back: { need: [], run(s, h) { h.click('button[data-act="back"]'); } },
  restart: { need: [], run(s, h) { h.click('button[data-act="restart"]'); } },
  // generic escape hatch for a control the ops above do not cover (Copy my list, a hidden button, ...)
  click: { need: ["sel"], run(s, h) { h.click(s.sel); return { expectChange: !!s.expectChange }; } },
};

export function validateStep(step) {
  if (!step || typeof step !== "object" || typeof step.op !== "string") return "step must be an object with an op";
  const def = OPS[step.op];
  if (!def) return `unknown op "${step.op}"`;
  for (const k of def.need) if (step[k] === undefined) return `op "${step.op}" needs "${k}"`;
  if (step.op === "answer" && !(Array.isArray(step.list) && step.list.length > 0 && step.list.every(e => Array.isArray(e) && e.length === 2 && e.every(x => typeof x === "string" && x !== "")))) return 'op "answer" needs a non-empty list of [questionId, optionId] pairs';
  if (step.op === "policies" && !(Array.isArray(step.ids) && step.ids.length > 0 && step.ids.every(x => typeof x === "string" && x !== ""))) return 'op "policies" needs a non-empty list of policy ids';
  return null;
}

// ---------------------------------------------------------------------------------------------
// Text capture
// ---------------------------------------------------------------------------------------------
const SKIP_TAGS = new Set(["script", "style", "template", "noscript", "svg"]);
const BLOCK_TAGS = new Set([
  "div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "dl", "table", "tr", "section", "main",
  "aside", "header", "footer", "nav", "form", "fieldset", "pre", "blockquote", "hr", "details", "summary", "br",
]);

function collapse(s) { return String(s).replace(/\s+/g, " ").trim(); }
const isOn = (el, attr) => el.getAttribute(attr) === "true";

function walk(node, out) {
  if (node.nodeType === 3) { out.push(node.data.replace(/\s+/g, " ")); return; }
  if (node.nodeType !== 1) return;
  const tag = node.localName;
  if (SKIP_TAGS.has(tag) || node.hasAttribute("hidden")) return;
  const kids = () => { for (const c of node.childNodes) walk(c, out); };
  if (tag === "button") {
    const inner = []; for (const c of node.childNodes) walk(c, inner);
    const on = node.classList.contains("sel") || isOn(node, "aria-pressed") || isOn(node, "aria-checked") || isOn(node, "aria-selected");
    out.push(` [${on ? "*" : ""}${collapse(inner.join(""))}${node.disabled ? " (disabled)" : ""}] `);
    return;
  }
  if (tag === "select") {
    const opts = Array.from(node.options).map(o => collapse(o.text));
    const cur = node.selectedIndex >= 0 ? opts[node.selectedIndex] : "";
    out.push(` {select: ${cur} | options: ${opts.join(" | ")}${node.disabled ? " (disabled)" : ""}} `);
    return;
  }
  if (tag === "input") {
    const t = (node.getAttribute("type") || "text").toLowerCase();
    if (t === "hidden") return;
    if (t === "checkbox" || t === "radio") out.push(` {${t}: ${node.checked ? "checked" : "unchecked"}${node.disabled ? " (disabled)" : ""}} `);
    else if (t === "file") out.push(" {file input} ");
    else out.push(` {input ${t}: ${node.value}${node.disabled ? " (disabled)" : ""}} `);
    return;
  }
  if (tag === "textarea") { out.push(` {textarea: ${collapse(node.value)}} `); return; }
  if (tag === "img") { out.push(` [img: ${collapse(node.getAttribute("alt") || "")}] `); return; }
  if (tag === "a") { out.push(" "); kids(); out.push(` <${node.getAttribute("href") || ""}> `); return; }
  if (tag === "dt") { kids(); out.push(": "); return; }
  if (tag === "dd") { kids(); out.push("\n"); return; }
  if (tag === "td" || tag === "th") { if (node.previousElementSibling) out.push(" | "); kids(); return; }
  if (BLOCK_TAGS.has(tag)) { out.push("\n"); kids(); out.push("\n"); return; }
  out.push(" "); kids(); out.push(" ");
}

// Visible text of a DOM subtree: independent of CSS, one logical line per block, whitespace collapsed.
// Controls are rendered so state is visible in the text: buttons as [label] ([*label] when selected,
// "(disabled)" when disabled), selects as {select: current | options: ...}, inputs as {input type: value},
// links as "label <href>".
export function visibleText(root) {
  const out = [];
  walk(root, out);
  return out.join("").split("\n").map(collapse).filter(Boolean).join("\n");
}

// Nothing on the page changes from run to run (no timer, no tap count, no date), so nothing is normalized: the
// capture is the page's text as it is. The progress bar is in the capture as its aria-valuenow, a percentage, followed by
// its aria-valuetext, the words a screen reader says for it ("25% Step 2 of 4", "100% Your list"), because the wiring that
// sets them is page code that no unit test reaches; its width and colour are not (CSS). Story S20 added the words.
export function snapshotText(doc) {
  const stage = doc.getElementById("stage"), known = doc.getElementById("known"), bar = doc.getElementById("progress");
  return "== stage ==\n" + (stage ? visibleText(stage) : "(#stage missing)") +
    "\n== known ==\n" + (known ? visibleText(known) : "(#known missing)") +
    "\n== progress ==\n" + (bar ? `${bar.getAttribute("aria-valuenow")}% ${bar.getAttribute("aria-valuetext") || "(no aria-valuetext)"}` : "(#progress missing)");
}

// ---------------------------------------------------------------------------------------------
// Diff (line based, LCS) and golden file format
// ---------------------------------------------------------------------------------------------
export function diffLines(expected, actual) {
  const a = expected.split("\n"), b = actual.split("\n");
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ k: " ", t: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ k: "-", t: a[i] }); i++; }
    else { ops.push({ k: "+", t: b[j] }); j++; }
  }
  while (i < n) ops.push({ k: "-", t: a[i++] });
  while (j < m) ops.push({ k: "+", t: b[j++] });
  return ops;
}

export function formatDiff(expected, actual, context = 2) {
  const ops = diffLines(expected, actual);
  const keep = new Array(ops.length).fill(false);
  ops.forEach((o, idx) => { if (o.k !== " ") for (let d = -context; d <= context; d++) if (ops[idx + d]) keep[idx + d] = true; });
  const lines = [];
  let skipped = false;
  ops.forEach((o, idx) => {
    if (!keep[idx]) { skipped = true; return; }
    if (skipped) { lines.push("  ..."); skipped = false; }
    lines.push(`${o.k} ${o.t}`);
  });
  if (skipped) lines.push("  ...");
  return lines.join("\n");
}

export const GOLDEN_HEADER = "// Golden master of the Coverage Check wizard, recorded from the page itself. Change only deliberately; see tests/browser/README.md.";
export function goldenFileText(id, steps) {
  return `${GOLDEN_HEADER}\n// scenario: ${id}\nexport default [\n${steps.map(s => " " + JSON.stringify({ step: s.step, text: s.text })).join(",\n")}\n];\n`;
}

// ---------------------------------------------------------------------------------------------
// Browser side: cache defeat, iframe driving, scenario replay
// ---------------------------------------------------------------------------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => performance.now();

async function waitFor(pred, timeoutMs, message) {
  const t0 = now();
  while (!pred()) {
    if (now() - t0 > timeoutMs) throw new Error(message);
    await sleep(20);
  }
}

// Plain `python3 -m http.server` sends no cache headers, so a browser may reuse a stale index.html or
// module for a while. A stale app would make a replay test the wrong code, so before loading the app
// we re-fetch (cache: "reload") the entry page and everything it references, which refreshes the cache.
export async function refreshAppAssets(entryUrl) {
  const seen = new Set();
  const queue = [entryUrl];
  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    let res;
    try { res = await fetch(url, { cache: "reload" }); } catch (e) { continue; }
    if (!res.ok) continue;
    const body = await res.text();
    const type = res.headers.get("content-type") || "";
    const refs = [];
    if (/html/.test(type)) {
      const d = new DOMParser().parseFromString(body, "text/html");
      d.querySelectorAll("script[src]").forEach(e => refs.push(e.getAttribute("src")));
      d.querySelectorAll("link[href]").forEach(e => refs.push(e.getAttribute("href")));
    } else if (/javascript/.test(type) || /\.m?js(\?|$)/.test(url)) {
      // only relative or root-relative specifiers (the app has no bare specifiers)
      const re = /(?:\bimport|\bexport)\s*(?:[\w*{}\s,$]*?\bfrom\s*)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
      let m;
      while ((m = re.exec(body))) { const s = m[1] || m[2]; if (/^(\.|\/)/.test(s)) refs.push(s); }
    }
    for (const r of refs) {
      if (!r || /^(data:|blob:|#)/.test(r)) continue;
      let abs;
      try { abs = new URL(r, url); } catch (e) { continue; }
      if (abs.origin !== location.origin) continue;
      abs.hash = "";
      if (!seen.has(abs.href)) queue.push(abs.href);
    }
  }
  return Array.from(seen);
}

function loadFrame(url, id) {
  return new Promise((resolve, reject) => {
    const f = document.createElement("iframe");
    f.title = "app under test: " + id;
    f.setAttribute("aria-hidden", "true");
    f.tabIndex = -1;
    f.style.cssText = "position:fixed;left:-10000px;top:0;width:1024px;height:900px;border:0;visibility:hidden";
    const timer = setTimeout(() => reject(new Error("the app page did not finish loading")), LOAD_TIMEOUT_MS);
    f.addEventListener("load", () => { clearTimeout(timer); resolve(f); }, { once: true });
    f.src = url;
    document.body.appendChild(f);
  });
}

function makeHelpers(win, doc) {
  const q = (sel) => {
    const el = doc.querySelector(sel);
    if (!el) throw new Error(`no element matches ${sel}`);
    return el;
  };
  return {
    win, doc, q,
    click(sel) {
      const el = q(sel);
      if (el.disabled) throw new Error(`element is disabled: ${sel}`);
      el.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true, view: win }));
    },
  };
}

// Replays one scenario. opts: { appUrl, golden (array | null), record (bool) }
// Returns { id, ok, stepsRun, steps (what was captured), failure: null | { step, message, expected?, actual? } }.
export async function runScenario(scn, opts) {
  const res = { id: scn.id, ok: true, stepsRun: 0, steps: [], failure: null };
  const fail = (step, message, extra) => { res.ok = false; res.failure = { step, message, ...extra }; };
  let frame = null, observer = null;
  try {
    for (let attempt = 1; ; attempt++) {
      try {
        frame = await loadFrame(opts.appUrl, scn.id);
        const d = frame.contentDocument;
        await waitFor(() => { const s = d.getElementById("stage"); return s && s.childNodes.length > 0; }, LOAD_TIMEOUT_MS, "the app did not render anything into #stage");
        break;
      } catch (e) {
        if (frame) { frame.remove(); frame = null; }
        if (attempt >= LOAD_ATTEMPTS) throw e;
      }
    }
    const win = frame.contentWindow, doc = frame.contentDocument;

    const errors = [];
    win.addEventListener("error", e => errors.push("error: " + e.message));
    win.addEventListener("unhandledrejection", e => errors.push("unhandled rejection: " + (e.reason && e.reason.message || e.reason)));
    for (const m of ["error", "warn"]) {
      const orig = win.console[m].bind(win.console);
      win.console[m] = (...a) => { errors.push(`console.${m}: ${a.join(" ")}`); orig(...a); };
    }
    const lastMut = { t: now() };
    observer = new win.MutationObserver(() => { lastMut.t = now(); });
    observer.observe(doc.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
    const h = makeHelpers(win, doc);

    const settle = async (before, expectChange) => {
      await sleep(BASE_WAIT_MS);
      const t0 = now();
      for (;;) {
        const quiet = now() - lastMut.t >= QUIET_MS;
        const changed = !expectChange || snapshotText(doc) !== before;
        if (quiet && changed) return;
        if (now() - t0 > SETTLE_TIMEOUT_MS) throw new Error(changed ? "the page kept changing and never settled" : "the screen did not change after this step");
        await sleep(20);
      }
    };

    // returns false (and records the failure) when this step must stop the scenario
    const capture = (n, label) => {
      if (errors.length) { fail(n, "the app reported errors: " + errors.join(" / ")); return false; }
      const text = snapshotText(doc);
      res.stepsRun = n + 1;
      if (opts.record) { res.steps.push({ step: n, text }); return true; }
      if (!opts.golden) { fail(n, "no golden recorded for this scenario (run record mode)"); return false; }
      const exp = opts.golden[n];
      if (!exp) { fail(n, `the golden has no entry for step ${n} (${label}); the scenario has more steps than the golden`); return false; }
      if (exp.step !== n) { fail(n, `golden entry ${n} is labelled step ${exp.step}`); return false; }
      if (exp.text !== text) { fail(n, "the screen text differs from the golden", { expected: exp.text, actual: text }); return false; }
      return true;
    };

    await settle(null, false);
    if (!capture(0, "load")) return res;
    for (let i = 0; i < scn.steps.length; i++) {
      const step = scn.steps[i], n = i + 1;
      const bad = validateStep(step);
      if (bad) { fail(n, "scenario error: " + bad); return res; }
      const before = snapshotText(doc);
      let r;
      try { r = OPS[step.op].run(step, h) || {}; } catch (e) { fail(n, "driver error: " + e.message); return res; }
      try { await settle(before, !!r.expectChange); } catch (e) { fail(n, "driver error: " + e.message); return res; }
      if (!capture(n, JSON.stringify(step))) return res;
    }
    if (!opts.record && opts.golden && opts.golden.length > scn.steps.length + 1) {
      fail(scn.steps.length + 1, `the golden has ${opts.golden.length - scn.steps.length - 1} more step(s) than the scenario`);
    }
  } catch (e) {
    fail(res.stepsRun, "harness error: " + (e && e.message || e));
  } finally {
    if (observer) observer.disconnect();
    if (frame) frame.remove();
  }
  return res;
}

export async function runPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ---------------------------------------------------------------------------------------------
// Report (the first line is the contract: "GOLDEN: PASS" or "GOLDEN: FAIL <scenarioId> step <n>")
// ---------------------------------------------------------------------------------------------
export function buildReport(scenarios, results, meta = {}) {
  const failed = results.filter(r => !r.ok);
  const steps = results.reduce((a, r) => a + r.stepsRun, 0);
  const lines = [];
  if (failed.length) lines.push(`GOLDEN: FAIL ${failed[0].id} step ${failed[0].failure.step}`);
  else if (meta.record) lines.push("GOLDEN: RECORDED");
  else lines.push(meta.partial ? "GOLDEN: PASS-PARTIAL (only some scenarios were run; this is not a full pass)" : "GOLDEN: PASS");
  lines.push(`${results.length - failed.length} of ${results.length} scenarios ${meta.record ? "recorded" : "match"}, ${steps} screens ${meta.record ? "captured" : "compared"}${meta.partial ? " (partial run)" : ""}.`);
  lines.push("");
  results.forEach((r, i) => {
    lines.push(`${r.ok ? (meta.record ? "RECORDED" : "PASS") : "FAIL"}  ${r.id} (${r.stepsRun} screens)${r.ok ? "" : `  step ${r.failure.step}: ${r.failure.message}`}`);
  });
  if (failed.length) {
    const f = failed[0], scn = scenarios.find(s => s.id === f.id);
    const stepDesc = f.failure.step === 0 ? "load (initial screen)" : JSON.stringify(scn && scn.steps[f.failure.step - 1]);
    lines.push("", `----- first failure: ${f.id}${scn && scn.title ? " - " + scn.title : ""}`, `step ${f.failure.step}: ${stepDesc}`, `problem: ${f.failure.message}`);
    if (f.failure.expected !== undefined) lines.push("", "--- expected (golden)", "+++ actual (this run)", formatDiff(f.failure.expected, f.failure.actual));
  }
  return lines.join("\n");
}
