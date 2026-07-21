/* ==========================================================================
   Majal Day 1 — core engine: DOM helpers, widget registry, brand chrome,
   Reveal boot.  (Simulation-first rebuild: no diagnostic / pairing / export.)
   ========================================================================== */
window.MAJAL = window.MAJAL || {};

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
MAJAL._widgets = {};
MAJAL._inited = {};
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
  var d = MAJAL.el("div", { class: "dayflag", text: "DAY 1 · FOUNDATIONS" });
  document.body.appendChild(b);
  document.body.appendChild(d);
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

  /* Stop keydown/keypress from bubbling to Reveal whenever an editable element
     is focused, so typing in an input never jumps slides. */
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
