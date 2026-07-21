/* ==========================================================================
   Block 2.2 — risk terms.
   Mechanic 7: chip-based sentence builder + jargon detector.
   Mechanic 8: counter-shock expandable panels.
   Mechanic 9: attribution from behavioural profile.
   ========================================================================== */

/* ---- Mechanic 7: sentence builder + jargon detector -------------------- */
MAJAL.widget("sentence", function (root) {
  var mount = root.querySelector("#sentence-mount");
  var S = MAJAL.sentence;
  var pick = { asset: null, vuln: null, threat: null, risk: null };

  var cols = MAJAL.el("div", { class: "sb-cols" });
  [["asset", "Asset"], ["vuln", "Vulnerability"], ["threat", "Threat"], ["risk", "Risk — what could happen"]].forEach(function (c) {
    var col = MAJAL.el("div", { class: "sb-col" });
    col.appendChild(MAJAL.el("h4", { text: c[1] }));
    S[c[0]].forEach(function (val) {
      var chip = MAJAL.el("span", { class: "chip", text: val });
      chip.addEventListener("click", function () {
        pick[c[0]] = val;
        col.querySelectorAll(".chip").forEach(function (n) { n.classList.remove("sel"); });
        chip.classList.add("sel");
        build();
      });
      col.appendChild(chip);
    });
    cols.appendChild(col);
  });
  mount.appendChild(cols);

  var out = MAJAL.el("div", { class: "sb-out sub", text: "Pick one chip from each column…" });
  mount.appendChild(out);

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function build() {
    if (pick.asset && pick.vuln && pick.threat && pick.risk) {
      var sentence = cap(pick.asset) + " is exposed by " + pick.vuln + ", so " + pick.threat + " " + pick.risk + ".";
      out.className = "sb-out"; out.textContent = sentence;
      MAJAL.store.set("sentenceBuilt", sentence);
    }
  }

  /* second box — rewrite for a dean, with live jargon detection */
  mount.appendChild(MAJAL.el("p", { class: "hint", style: "margin-top:16px", html:
    "Now rewrite it as one sentence a <strong>dean</strong> would act on. Jargon gets underlined — that's not language they act on." }));
  var ta = MAJAL.el("textarea", { rows: "2", placeholder: "One sentence, business language, no jargon…", onkeydown: function (e) { e.stopPropagation(); } });
  ta.value = MAJAL.store.get("sentenceDean", "");
  var preview = MAJAL.el("div", { class: "sb-out", style: "min-height:1.2em" });
  var counter = MAJAL.el("div", { class: "jargon-count" });

  function scan() {
    var text = ta.value;
    MAJAL.store.set("sentenceDean", text);
    var words = S.jargon;
    var count = 0;
    var html = MAJAL.esc(text).replace(/\b[\w\-]+\b/g, function (w) {
      if (words.indexOf(w.toLowerCase()) !== -1) { count++; return "<span class='jargon'>" + w + "</span>"; }
      return w;
    });
    preview.innerHTML = html || "<span class='sub'>your rewrite appears here…</span>";
    MAJAL.store.set("sentenceJargon", count);
    counter.textContent = count === 0
      ? (text.trim() ? "0 jargon words — a dean can act on this." : "")
      : count + " word" + (count > 1 ? "s" : "") + " your dean will not act on.";
  }
  ta.addEventListener("input", scan);
  mount.appendChild(ta);
  mount.appendChild(preview);
  mount.appendChild(counter);
  scan();
});

/* ---- Mechanic 8: attack surface counter-shock -------------------------- */
MAJAL.widget("surface", function (root) {
  var mount = root.querySelector("#surface-mount");
  var total = MAJAL.el("div", { class: "surf-total", html: "Points where someone could try the door: <b>0</b>" });
  var running = 0;
  var opened = {};

  var panels = MAJAL.el("div");
  ["network", "software", "human"].forEach(function (k) {
    var d = MAJAL.surface[k];
    var panel = MAJAL.el("div", { class: "surf-panel" });
    var head = MAJAL.el("div", { class: "surf-head", html:
      "<div><strong>" + d.label + "</strong> surface</div><div class='surf-count'>—</div>" });
    var bodyEl = MAJAL.el("div", { class: "surf-body", text: d.items });
    head.addEventListener("click", function () {
      panel.classList.toggle("open");
      if (!opened[k]) {
        opened[k] = true;
        animateCount(head.querySelector(".surf-count"), d.count, function () {
          running += d.count; total.querySelector("b").textContent = running.toLocaleString();
          if (opened.network && opened.software && opened.human) revealBudget();
        });
      }
    });
    panel.appendChild(head); panel.appendChild(bodyEl); panels.appendChild(panel);
  });
  mount.appendChild(panels);
  mount.appendChild(total);
  var budget = MAJAL.el("div", { style: "margin-top:14px" });
  mount.appendChild(budget);

  function animateCount(el, target, done) {
    var start = performance.now(), dur = 900;
    (function step(now) {
      var p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(p * target).toLocaleString();
      if (p < 1) requestAnimationFrame(step); else { el.textContent = target.toLocaleString(); done(); }
    })(performance.now());
  }
  function revealBudget() {
    budget.innerHTML = "<div class='callout hot'><strong>Now the budget, inverted.</strong> Most organisations spend almost everything defending the <em>network</em> surface — the smallest one. The largest surface, <strong>1,247 humans with an inbox</strong>, gets a once-a-year slide. <br>Tomorrow you spend the whole day mapping the third one.</div>";
  }
});

/* ---- Mechanic 9: attribution from behaviour ---------------------------- */
MAJAL.widget("attribution", function (root) {
  var mount = root.querySelector("#attrib-mount");
  var B = MAJAL.briefs;
  var i = MAJAL.store.get("attribAt", 0);
  var right = MAJAL.store.get("attribRight", 0);
  var card = MAJAL.el("div", { class: "card" });
  mount.appendChild(card);

  function render() {
    if (i >= B.length) {
      card.innerHTML = "<h3>Attribution: " + right + " / " + B.length + "</h3>" +
        "<p class='sub'>You judged actors from <em>behaviour</em>, not from how scary the target looked. That's the move. And notice: organised crime — the ransomware crews — is where almost everything you'll actually investigate comes from.</p>";
      var again = MAJAL.el("button", { class: "btn ghost", text: "Run it again" });
      again.addEventListener("click", function () { i = 0; right = 0; MAJAL.store.set("attribAt", 0); MAJAL.store.set("attribRight", 0); render(); });
      card.appendChild(again);
      return;
    }
    var b = B[i];
    card.innerHTML = "";
    card.appendChild(MAJAL.el("div", { class: "progress-count", text: "Incident " + (i + 1) + " / " + B.length + (b.ambiguous ? "  ·  (careful — this one's designed to mislead)" : "") }));
    card.appendChild(MAJAL.el("p", { style: "font-size:.82em", text: b.brief }));

    var picked = false;
    var row = MAJAL.el("div", { class: "opt-row" });
    MAJAL.actors.forEach(function (a) {
      var o = MAJAL.el("div", { class: "opt", text: a });
      o.addEventListener("click", function () {
        if (picked) return; picked = true;
        var ok = (a === b.answer);
        if (ok) { o.classList.add("right"); right++; MAJAL.store.set("attribRight", right); }
        else { o.classList.add("wrong"); row.querySelectorAll(".opt").forEach(function (n) { if (n.textContent === b.answer) n.classList.add("right"); }); }
        card.appendChild(MAJAL.el("div", { class: "reveal-row callout", html: "<strong>" + b.answer + ".</strong> " + MAJAL.esc(b.tell) }));
        var nx = MAJAL.el("button", { class: "btn", text: i === B.length - 1 ? "See your score ›" : "Next incident ›", style: "margin-top:12px" });
        nx.addEventListener("click", function () { i++; MAJAL.store.set("attribAt", i); render(); });
        card.appendChild(nx);
      });
      row.appendChild(o);
    });
    card.appendChild(row);
  }
  render();
});
