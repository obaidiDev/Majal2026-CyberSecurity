/* ==========================================================================
   Majal Day 1 — core engine: persistence, reveal init, widget registry,
   pair-code logic, and the day1-<name>.txt export.
   ========================================================================== */
window.MAJAL = window.MAJAL || {};

/* ---- persistent store (localStorage, one blob) -------------------------- */
MAJAL.store = (function () {
  var KEY = "majal_day1_v1";
  var data;
  try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { data = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  return {
    get: function (k, d) { return (k in data) ? data[k] : d; },
    set: function (k, v) { data[k] = v; save(); },
    all: function () { return data; },
    reset: function () { data = {}; save(); }
  };
})();

/* ---- tiny DOM helpers --------------------------------------------------- */
MAJAL.el = function (tag, attrs, kids) {
  var e = document.createElement(tag);
  attrs = attrs || {};
  for (var k in attrs) {
    if (k === "class") e.className = attrs[k];
    else if (k === "html") e.innerHTML = attrs[k];
    else if (k === "text") e.textContent = attrs[k];
    else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
  return e;
};
MAJAL.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
  return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

/* ---- widget registry: run a slide's init exactly once when first shown -- */
MAJAL._widgets = {};        // id -> init function
MAJAL._inited = {};         // id -> true
MAJAL.widget = function (id, fn) { MAJAL._widgets[id] = fn; };
MAJAL._runSlide = function (section) {
  if (!section) return;
  var id = section.getAttribute("data-w");
  if (!id || MAJAL._inited[id] || !MAJAL._widgets[id]) return;
  MAJAL._inited[id] = true;
  try { MAJAL._widgets[id](section); } catch (e) { console.error("widget " + id + " failed:", e); }
};

/* ---- persistent brand chrome (logo mark + wordmark + day flag) ---------- */
MAJAL.logoSVG = function () {
  // pinwheel mark rebuilt from MajalFinalIdentity.pdf — four corner brackets,
  // turquoise/petrol/yellow blocks — matches the PDF identity mark.
  return '<svg viewBox="0 0 100 100" aria-label="Majal">'
    + '<polygon points="0,0 47,0 47,18 18,18 18,47 0,47" fill="#33d2cb"/>'
    + '<polygon points="100,0 100,47 82,47 82,18 53,18 53,0" fill="#00567d"/>'
    + '<polygon points="0,53 18,53 18,82 47,82 47,100 0,100" fill="#00567d"/>'
    + '<polygon points="100,53 100,100 53,100 53,82 82,82 82,53" fill="#f2d200"/>'
    + '</svg>';
};
MAJAL.mountChrome = function () {
  var b = MAJAL.el("div", { class: "brandmark", html:
    MAJAL.logoSVG() + '<div class="wm">MAJAL<small>Unlocking your tech horizons</small></div>' });
  var d = MAJAL.el("div", { class: "dayflag", text: "DAY 1 · WHAT IS NORMAL" });
  document.body.appendChild(b);
  document.body.appendChild(d);
};

/* ---- pair code: tier from diagnostic score, + random 2-digit salt ------- */
MAJAL.pairCode = function () {
  var existing = MAJAL.store.get("pairCode");
  if (existing) return existing;
  var scores = MAJAL.store.get("diagScores", []); // array of true/false for Q1..Q13
  var correct = scores.slice(0, 13).filter(Boolean).length;
  var tier = correct <= 5 ? "A" : (correct <= 10 ? "B" : "C");
  var salt = String(Math.floor(Math.random() * 90) + 10);
  var code = tier + "-" + salt;
  MAJAL.store.set("pairCode", code);
  MAJAL.store.set("diagCorrect", correct);
  return code;
};

/* ---- export day1-<name>.txt -------------------------------------------- */
MAJAL.exportFile = function () {
  var d = MAJAL.store.all();
  var name = (d.name || "student").replace(/[^\w\-]+/g, "_");
  var L = [];
  var line = function (s) { L.push(s == null ? "" : s); };
  line("MAJAL — CYBER DAY 1 — STUDENT RECORD");
  line("Unlocking your tech horizons");
  line("=".repeat(52));
  line("Name:            " + (d.name || "(not entered)"));
  line("Exported:        " + new Date().toISOString());
  line("Pair code:       " + (d.pairCode || "(not generated)"));
  line("Diagnostic (Q1-13 self-scored correct): " + (d.diagCorrect != null ? d.diagCorrect + " / 13" : "(incomplete)"));
  line("");
  line("[ Anti-Cyber Crime Law acknowledgement ]");
  line("  Acknowledged: " + (d.ackLaw ? "YES" : "NO") + (d.ackLawAt ? "  at " + d.ackLawAt : ""));
  line("");
  line("[ Cold-open log wall ]");
  line("  Clicked line index: " + (d.logPick != null ? d.logPick : "(none)") +
       "   Needle index: " + (d.logNeedle != null ? d.logNeedle : "?") +
       "   -> " + (d.logPick != null && d.logPick === d.logNeedle ? "FOUND IT" : "missed / not attempted"));
  line("");
  line("[ Diagnostic self-scoring, per question ]");
  (d.diagScores || []).forEach(function (v, i) { line("  Q" + (i + 1) + ": " + (v ? "right" : "wrong")); });
  line("");
  line("[ CIA controls buckets ] " + (d.bucketsChecked ? "checked" : "not checked"));
  if (d.buckets) line("  " + JSON.stringify(d.buckets));
  line("");
  line("[ Evidence inference ] score: " + (d.evidenceRight || 0) + " / " + (d.evidenceTotal || MAJAL.evidence.length));
  line("");
  line("[ CIA tension — MFA reflection ]");
  line("  " + (d.mfaReflection || "(blank)"));
  line("");
  line("[ Scenario commit-gate ] (pair " + (d.pairCode || "?") + ")");
  if (d.scenario) {
    line("  Scenario #" + d.scenario.id + " — " + d.scenario.title);
    line("  CIA verdict: " + JSON.stringify(d.scenario.cia));
    line("  Control named: " + (d.scenario.control || "(blank)"));
    line("  Incident? " + (d.scenario.incident || "?") + " — " + (d.scenario.justify || "(blank)"));
  } else line("  (not submitted)");
  line("");
  line("[ Risk sentence ]");
  line("  Assembled: " + (d.sentenceBuilt || "(none)"));
  line("  Rewritten for a dean: " + (d.sentenceDean || "(blank)"));
  line("  Jargon words flagged in rewrite: " + (d.sentenceJargon != null ? d.sentenceJargon : "?"));
  line("");
  line("[ Threat-actor attribution ] score: " + (d.attribRight || 0) + " / " + MAJAL.briefs.length);
  line("");
  line("[ Four questions ] solved: " + (d.fourqSolved ? "all four" : "partial/none"));
  line("");
  line("[ Ports drill ] best score: " + (d.portsBest != null ? d.portsBest : "(not run)"));
  line("");
  line("[ DNS tunneling ] secret encoded: " + (d.dnsSecret ? '"' + d.dnsSecret + '"' : "(none)") +
       "   tool that broke it open: " + (d.dnsTool || "(not chosen)"));
  line("");
  line("[ HTTP User-Agent lineup ] picked malware correctly: " + (d.uaCorrect ? "YES" : (d.uaPicked != null ? "no" : "not attempted")));
  line("");
  line("=".repeat(52));
  line("End of record.");
  var blob = new Blob([L.join("\n")], { type: "text/plain" });
  var url = URL.createObjectURL(blob);
  var a = MAJAL.el("a", { href: url, download: "day1-" + name + ".txt" });
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
};

/* ---- boot -------------------------------------------------------------- */
MAJAL.boot = function () {
  MAJAL.mountChrome();

  var deck = new Reveal({
    hash: true,
    slideNumber: "c/t",
    controls: true,
    progress: true,
    center: false,
    transition: "slide",
    transitionSpeed: "fast",
    width: 1280, height: 720,
    margin: 0.06,
    minScale: 0.2, maxScale: 1.6,
    plugins: [ RevealNotes ]
  });

  /* THE #1 reveal bug: keyboard capture eating keystrokes in inputs.
     Stop keydown/keypress from bubbling to reveal whenever an editable
     element is focused. Capture phase, document-wide — belt and braces. */
  ["keydown", "keypress", "keyup"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        e.stopPropagation();
      }
    }, true);
  });

  deck.on("ready", function (e) { MAJAL._runSlide(e.currentSlide); });
  deck.on("slidechanged", function (e) { MAJAL._runSlide(e.currentSlide); });
  MAJAL.deck = deck;
  deck.initialize();
};

document.addEventListener("DOMContentLoaded", MAJAL.boot);
