/* ==========================================================================
   Block 1 — diagnostic (self-scored free-text -> opaque pair code).
   Mechanic 2: self-scored private form. 12-minute timer, auto-advance.
   ========================================================================== */

MAJAL.widget("diagnostic", function (root) {
  var mount = root.querySelector("#diag-mount");
  var Q = MAJAL.diagnostic;
  var scores = MAJAL.store.get("diagScores", []);   // Q1..13 booleans
  var answers = MAJAL.store.get("diagAnswers", []);  // raw text, all 15
  var i = 0;

  /* --- name capture (needed for pairing + export) --- */
  var nameWrap = MAJAL.el("div", { class: "card", style: "margin-bottom:14px" });
  nameWrap.appendChild(MAJAL.el("label", { class: "hint", text: "First, your name (goes on your hand-in file only):" }));
  var nameIn = MAJAL.el("input", { type: "text", placeholder: "e.g. Sara A.", style: "margin-left:10px;width:240px",
    value: MAJAL.store.get("name", ""), onkeydown: function (e) { e.stopPropagation(); } });
  nameIn.addEventListener("input", function () { MAJAL.store.set("name", nameIn.value.trim()); });
  nameWrap.appendChild(nameIn);
  mount.appendChild(nameWrap);

  /* --- 12-minute timer chip --- */
  var deadline = MAJAL.store.get("diagDeadline", null);
  if (!deadline) { deadline = Date.now() + 12 * 60 * 1000; MAJAL.store.set("diagDeadline", deadline); }
  var chip = MAJAL.el("div", { class: "timerchip", text: "12:00" });
  document.body.appendChild(chip);
  var timer = setInterval(function () {
    var left = Math.max(0, deadline - Date.now());
    var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    chip.textContent = m + ":" + String(s).padStart(2, "0");
    if (left < 90000) chip.classList.add("warn");
    if (left <= 0) { clearInterval(timer); if (MAJAL.deck.getCurrentSlide() === root) MAJAL.deck.next(); }
  }, 500);
  // only show the chip while this slide is up
  MAJAL.deck.on("slidechanged", function (e) { chip.style.display = (e.currentSlide === root) ? "" : "none"; });

  /* --- the stepped question card --- */
  var card = MAJAL.el("div", { class: "diag-q card" });
  mount.appendChild(card);

  function render() {
    var q = Q[i];
    card.innerHTML = "";
    card.appendChild(MAJAL.el("p", { html: '<span class="qn">Q' + (i + 1) + " / 15</span> &nbsp; " + MAJAL.esc(q.q) }));

    if (q.yesno) {
      var yn = MAJAL.el("div", { class: "mark-row" });
      ["yes", "no"].forEach(function (v) {
        var b = MAJAL.el("button", { class: "btn ghost", text: v });
        if (answers[i] === v) b.className = "btn";
        b.addEventListener("click", function () {
          answers[i] = v; MAJAL.store.set("diagAnswers", answers);
          yn.querySelectorAll("button").forEach(function (x) { x.className = "btn ghost"; });
          b.className = "btn"; next.disabled = false;
        });
        yn.appendChild(b);
      });
      card.appendChild(yn);
      nav(answers[i] != null);
      return;
    }

    var ta = MAJAL.el("textarea", { rows: "2", placeholder: "your answer — be honest, this only pairs you",
      onkeydown: function (e) { e.stopPropagation(); } });
    ta.value = answers[i] || "";
    ta.addEventListener("input", function () { answers[i] = ta.value; MAJAL.store.set("diagAnswers", answers); });
    card.appendChild(ta);

    var revealBtn = MAJAL.el("button", { class: "btn ghost", text: "Reveal model answer", style: "margin-top:.6em" });
    var modelWrap = MAJAL.el("div");
    revealBtn.addEventListener("click", function () {
      revealBtn.remove();
      modelWrap.appendChild(MAJAL.el("div", { class: "diag-model", html: "<strong>Model:</strong> " + MAJAL.esc(q.a) }));
      var mr = MAJAL.el("div", { class: "mark-row" });
      var right = MAJAL.el("button", { class: "btn", text: "I was right" });
      var wrong = MAJAL.el("button", { class: "btn ghost", text: "I was wrong" });
      function mark(v) {
        scores[i] = v; MAJAL.store.set("diagScores", scores);
        right.className = v ? "btn" : "btn ghost";
        wrong.className = v ? "btn ghost" : "btn";
        next.disabled = false;
      }
      right.addEventListener("click", function () { mark(true); });
      wrong.addEventListener("click", function () { mark(false); });
      if (scores[i] === true) mark(true); else if (scores[i] === false) mark(false);
      mr.appendChild(right); mr.appendChild(wrong);
      modelWrap.appendChild(mr);
    });
    card.appendChild(revealBtn);
    card.appendChild(modelWrap);
    if (scores[i] != null) revealBtn.click();
    nav(scores[i] != null);
  }

  var next;
  function nav(answered) {
    var bar = MAJAL.el("div", { class: "diag-nav" });
    var prev = MAJAL.el("button", { class: "btn ghost", text: "‹ Back" });
    prev.disabled = (i === 0);
    prev.addEventListener("click", function () { i--; render(); });
    next = MAJAL.el("button", { class: "btn", text: i === Q.length - 1 ? "Finish ›" : "Next ›" });
    next.disabled = !answered;
    next.addEventListener("click", function () {
      if (i === Q.length - 1) { clearInterval(timer); chip.style.display = "none"; MAJAL.deck.next(); }
      else { i++; render(); }
    });
    var dots = MAJAL.el("div", { class: "diag-dots" });
    for (var k = 0; k < Q.length; k++) {
      var cls = "";
      if (k < i || (k < 13 ? scores[k] != null : answers[k] != null)) cls = "done";
      if (k === i) cls += " now";
      dots.appendChild(MAJAL.el("i", { class: cls }));
    }
    bar.appendChild(prev); bar.appendChild(next); bar.appendChild(dots);
    card.appendChild(bar);
  }

  render();
});

/* ---- Pair code output -------------------------------------------------- */
MAJAL.widget("paircode", function (root) {
  var mount = root.querySelector("#pair-mount");
  var code = MAJAL.pairCode();
  mount.appendChild(MAJAL.el("p", { class: "sub", text: "Read this aloud when asked. It's how you're paired for the week." }));
  mount.appendChild(MAJAL.el("div", { style: "text-align:center;margin:.6em 0" }, [
    MAJAL.el("span", { class: "paircode", text: code })
  ]));
  mount.appendChild(MAJAL.el("p", { class: "hint center", html:
    "The letter is not a grade and not a ranking — it only decides who you sit with. " +
    "The two digits are random so nobody can read anything off a neighbour's screen." }));
});
