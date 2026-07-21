/* ==========================================================================
   Block 2.1 — the three properties.
   Mechanic 3: drag-to-bucket (multi-bucket allowed).
   Mechanic 4: evidence-first inference.
   Mechanic 5: continuous slider tradeoffs.
   Mechanic 6: commit-gate + delayed facilitator note.
   ========================================================================== */

/* ---- Mechanic 3: controls -> C/I/A buckets ----------------------------- */
MAJAL.widget("buckets", function (root) {
  var mount = root.querySelector("#buckets-mount");
  var placed = MAJAL.store.get("buckets", {});   // chipIndex -> "C"/"I"/"A"
  var selected = null;                             // click-to-place fallback

  var tray = MAJAL.el("div", { class: "chip-tray" });
  var zones = MAJAL.el("div", { class: "bucket-wrap" });
  var buckets = {};
  ["C", "I", "A"].forEach(function (k) {
    var z = MAJAL.el("div", { class: "bucket " + k, "data-b": k, html: "<h4>" + MAJAL.bucketNames[k] + "</h4>" });
    z.addEventListener("dragover", function (e) { e.preventDefault(); z.classList.add("over"); });
    z.addEventListener("dragleave", function () { z.classList.remove("over"); });
    z.addEventListener("drop", function (e) {
      e.preventDefault(); z.classList.remove("over");
      var idx = e.dataTransfer.getData("text/plain"); if (idx !== "") place(+idx, k);
    });
    z.addEventListener("click", function () { if (selected != null) { place(selected, k); selected = null; syncSel(); } });
    buckets[k] = z; zones.appendChild(z);
  });

  function makeChip(idx) {
    var c = MAJAL.chips[idx];
    var el = MAJAL.el("span", { class: "chip" + (c.b.length > 1 ? " multi" : ""), draggable: "true",
      "data-i": idx, text: c.t });
    el.addEventListener("dragstart", function (e) { e.dataTransfer.setData("text/plain", idx); el.classList.add("dragging"); });
    el.addEventListener("dragend", function () { el.classList.remove("dragging"); });
    el.addEventListener("click", function () {
      if (placed[idx] != null) { delete placed[idx]; MAJAL.store.set("buckets", placed); rebuild(); return; }
      selected = (selected === idx) ? null : idx; syncSel();
    });
    return el;
  }
  function syncSel() {
    tray.querySelectorAll(".chip").forEach(function (n) {
      n.style.outline = (+n.getAttribute("data-i") === selected) ? "2px solid var(--purple)" : "";
    });
  }
  function place(idx, k) { placed[idx] = k; MAJAL.store.set("buckets", placed); rebuild(); }

  function rebuild() {
    tray.innerHTML = ""; ["C", "I", "A"].forEach(function (k) {
      buckets[k].querySelectorAll(".chip").forEach(function (n) { n.remove(); });
    });
    MAJAL.chips.forEach(function (c, idx) {
      var chip = makeChip(idx);
      if (placed[idx]) buckets[placed[idx]].appendChild(chip); else tray.appendChild(chip);
    });
    syncSel();
  }

  var checkBtn = MAJAL.el("button", { class: "btn", text: "Check my thinking" });
  var msg = MAJAL.el("div", { class: "callout hot", style: "display:none;margin-top:12px" });
  checkBtn.addEventListener("click", function () {
    MAJAL.store.set("bucketsChecked", true);
    // count multi-bucket chips that were placed into a single bucket
    var flagged = [];
    Object.keys(placed).forEach(function (idx) {
      if (MAJAL.chips[+idx].b.length > 1) flagged.push(+idx);
    });
    tray.querySelectorAll(".chip").forEach(function (n) { n.classList.remove("flag"); });
    ["C", "I", "A"].forEach(function (k) { buckets[k].querySelectorAll(".chip").forEach(function (n) { n.classList.remove("flag"); }); });
    flagged.forEach(function (idx) {
      var node = zones.querySelector('.chip[data-i="' + idx + '"]');
      if (node) node.classList.add("flag");
    });
    var placedCount = Object.keys(placed).length;
    if (placedCount === 0) { msg.innerHTML = "Place some chips first — drag them, or click a chip then click a bucket."; }
    else if (flagged.length === 0) {
      msg.innerHTML = "Nothing highlighted — but keep going. Some controls you haven't placed yet belong in <em>more than one</em> bucket at once.";
    } else {
      msg.innerHTML = "You put <strong>" + flagged.length + "</strong> chip" + (flagged.length > 1 ? "s" : "") +
        " in a single bucket that belong in <em>more than one</em>. They're outlined now — which ones, and why? " +
        "<span class='sub'>(TLS protects reading <span class='pill c'>C</span> and detects tampering <span class='pill i'>I</span>. " +
        "Immutable backups and log-forwarding both defend <span class='pill i'>I</span> and <span class='pill a'>A</span>.) " +
        "No single control produces a property alone — that's defense in depth.</span>";
    }
    msg.style.display = "";
  });

  mount.appendChild(MAJAL.el("p", { class: "hint", text: "Drag each control into the property it produces — or click a chip, then click a bucket. Click a placed chip to send it back." }));
  mount.appendChild(tray);
  mount.appendChild(zones);
  mount.appendChild(MAJAL.el("div", { style: "margin-top:12px" }, [checkBtn]));
  mount.appendChild(msg);
  rebuild();
});

/* ---- Mechanic 4: evidence-first inference ------------------------------ */
MAJAL.widget("evidence", function (root) {
  var mount = root.querySelector("#evidence-mount");
  var E = MAJAL.evidence;
  var i = MAJAL.store.get("evidenceAt", 0);
  var right = MAJAL.store.get("evidenceRight", 0);
  MAJAL.store.set("evidenceTotal", E.length);

  var card = MAJAL.el("div", { class: "card" });
  mount.appendChild(card);

  function render() {
    if (i >= E.length) {
      card.innerHTML = "";
      card.appendChild(MAJAL.el("h3", { text: "You reconstructed " + right + " of " + E.length + " mechanisms from evidence alone." }));
      card.appendChild(MAJAL.el("p", { class: "sub", html: "You never saw the attacker. You saw the trace and reasoned backwards. <em>That is the whole job.</em>" }));
      var again = MAJAL.el("button", { class: "btn ghost", text: "Run it again" });
      again.addEventListener("click", function () { i = 0; right = 0; MAJAL.store.set("evidenceAt", 0); MAJAL.store.set("evidenceRight", 0); render(); });
      card.appendChild(again);
      return;
    }
    var e = E[i];
    card.innerHTML = "";
    card.appendChild(MAJAL.el("div", { class: "progress-count", html:
      "Observation " + (i + 1) + " / " + E.length + " &nbsp;·&nbsp; property: <span class='pill " +
      e.prop.toLowerCase() + "'>" + MAJAL.bucketNames[e.prop] + "</span>" }));
    card.appendChild(MAJAL.el("div", { class: "artifact", style: "margin-top:8px", text: e.obs.join("\n") }));

    var picked = false;
    var row = MAJAL.el("div", { class: "opt-row" });
    e.options.forEach(function (opt) {
      var b = MAJAL.el("div", { class: "opt", text: opt });
      b.addEventListener("click", function () {
        if (picked) return; picked = true;
        var ok = (opt === e.answer);
        if (ok) { b.classList.add("right"); right++; MAJAL.store.set("evidenceRight", right); }
        else {
          b.classList.add("wrong");
          row.querySelectorAll(".opt").forEach(function (n) { if (n.textContent === e.answer) n.classList.add("right"); });
        }
        unfold();
      });
      row.appendChild(b);
    });
    card.appendChild(row);

    function unfold() {
      card.appendChild(MAJAL.el("div", { class: "reveal-row callout", html: "<strong>" + e.answer + ".</strong> " + MAJAL.esc(e.row) }));
      var nav = MAJAL.el("div", { style: "margin-top:12px" });
      var nx = MAJAL.el("button", { class: "btn", text: i === E.length - 1 ? "See your score ›" : "Next observation ›" });
      nx.addEventListener("click", function () { i++; MAJAL.store.set("evidenceAt", i); render(); });
      nav.appendChild(nx);
      card.appendChild(nav);
    }
  }
  render();
});

/* ---- Mechanic 5: CIA tension sliders ----------------------------------- */
MAJAL.widget("tension", function (root) {
  var mount = root.querySelector("#tension-mount");

  /* Slider 1: lockout threshold */
  var s1 = MAJAL.el("div", { class: "slider-block card" });
  s1.appendChild(MAJAL.el("label", { html: "<strong>Account lockout threshold</strong> — lock after N failed logins" }));
  var r1 = MAJAL.el("input", { type: "range", min: "3", max: "100", value: "10" });
  var out1 = MAJAL.el("div", { class: "readout" });
  s1.appendChild(r1); s1.appendChild(out1);
  function upd1() {
    var n = +r1.value;
    var days = (Math.pow(10, 8) / (n * 5000)); // toy brute-force estimate
    var t = days > 48 ? Math.round(days / 24) + " days" : Math.round(days) + " hrs";
    var lockable = n <= 3 ? "all of them" : Math.round(4000 / n) + " staff";
    out1.innerHTML = "<div>Lock after <b>" + n + "</b> tries</div>" +
      "<div>Attacker brute-force time <b class='down'>≈ " + t + "</b></div>" +
      "<div>Employees an attacker can lock out in 5 min <b class='up'>" + lockable + "</b></div>";
  }
  r1.addEventListener("input", upd1); upd1();

  /* Slider 2: replication interval */
  var s2 = MAJAL.el("div", { class: "slider-block card" });
  s2.appendChild(MAJAL.el("label", { html: "<strong>DR replication interval</strong> — how often we copy to the recovery site" }));
  var r2 = MAJAL.el("input", { type: "range", min: "0", max: "24", value: "12" });
  var out2 = MAJAL.el("div", { class: "readout" });
  s2.appendChild(r2); s2.appendChild(out2);
  function upd2() {
    var h = +r2.value;
    var lbl = h === 0 ? "real-time" : "every " + h + " h";
    var loss = h === 0 ? "0 min" : (h * 60) + " min";
    var reach = h === 0 ? "seconds" : "up to " + h + " h";
    out2.innerHTML = "<div>Replication <b>" + lbl + "</b></div>" +
      "<div>Max data loss (RPO) <b class='down'>" + loss + "</b></div>" +
      "<div>Time before ransomware reaches the DR copy <b class='up'>" + reach + "</b></div>";
  }
  r2.addEventListener("input", upd2); upd2();

  /* Toggle: key escrow */
  var s3 = MAJAL.el("div", { class: "slider-block card" });
  s3.appendChild(MAJAL.el("label", { html: "<strong>Encryption-key escrow</strong> — keep a recoverable copy of the keys?" }));
  var t3 = MAJAL.el("button", { class: "btn ghost", text: "Escrow: OFF" });
  var bars = MAJAL.el("div", { style: "margin-top:10px" });
  var escrow = false;
  function upd3() {
    t3.textContent = "Escrow: " + (escrow ? "ON" : "OFF");
    var c = escrow ? 70 : 100, a = escrow ? 100 : 55;
    bars.innerHTML =
      "<div style='font-size:.6em;font-family:var(--mono);margin-bottom:4px'>Confidentiality</div>" +
      "<div class='bar'><i style='width:" + c + "%;background:var(--purple)'></i></div>" +
      "<div style='font-size:.6em;font-family:var(--mono);margin:8px 0 4px'>Availability (can you ever recover the data?)</div>" +
      "<div class='bar'><i style='width:" + a + "%;background:var(--good)'></i></div>" +
      "<div class='hint' style='margin-top:8px'>" + (escrow ?
        "A copy of the keys exists — lose a device, still recover the data. But that copy is now a target." :
        "No key copy — strongest confidentiality. Lose the key and the data is gone forever. Availability, destroyed by a security control.") + "</div>";
  }
  t3.addEventListener("click", function () { escrow = !escrow; upd3(); });
  s3.appendChild(t3); s3.appendChild(bars); upd3();

  /* MFA reflection — deliberately unresolved */
  var s4 = MAJAL.el("div", { class: "slider-block card" });
  s4.appendChild(MAJAL.el("label", { html: "<strong>Your turn.</strong> MFA on every action, every time. Which property improves, which suffers? (No answer key — argue it.)" }));
  var ref = MAJAL.el("textarea", { rows: "3", placeholder: "write your two-minute argument…", onkeydown: function (e) { e.stopPropagation(); } });
  ref.value = MAJAL.store.get("mfaReflection", "");
  ref.addEventListener("input", function () { MAJAL.store.set("mfaReflection", ref.value); });
  s4.appendChild(ref);

  var grid = MAJAL.el("div", { class: "tension-grid" });
  [s1, s2, s3, s4].forEach(function (x) { grid.appendChild(x); });
  mount.appendChild(grid);
});

/* ---- Mechanic 6: scenario commit-gate ---------------------------------- */
MAJAL.widget("scenarios", function (root) {
  var mount = root.querySelector("#scenario-mount");
  var code = MAJAL.pairCode();
  var salt = parseInt((code.split("-")[1] || "0"), 10) || 0;
  var routed = salt % MAJAL.scenarios.length;
  var current = MAJAL.store.get("scenarioIdx", routed);

  var picker = MAJAL.el("div", { style: "margin-bottom:10px" });
  picker.appendChild(MAJAL.el("span", { class: "hint", text: "Your pair (" + code + ") is routed to scenario " + (routed + 1) + ". " }));
  MAJAL.scenarios.forEach(function (s, idx) {
    var b = MAJAL.el("button", { class: "btn ghost", text: (idx + 1), style: "padding:.3em .7em;margin-left:4px" });
    if (idx === current) b.className = "btn";
    b.addEventListener("click", function () { current = idx; MAJAL.store.set("scenarioIdx", idx); render(); });
    picker.appendChild(b);
  });
  mount.appendChild(picker);
  var body = MAJAL.el("div"); mount.appendChild(body);

  function render() {
    var sc = MAJAL.scenarios[current];
    var saved = MAJAL.store.get("scenario", null);
    var mine = (saved && saved.id === sc.id) ? saved : { id: sc.id, title: sc.title, cia: {}, control: "", incident: "", justify: "" };
    body.innerHTML = "";
    body.appendChild(MAJAL.el("div", { class: "card", html: "<h3>Scenario " + sc.id + " — " + sc.title + "</h3><p style='font-size:.82em'>" + MAJAL.esc(sc.text) + "</p>" }));

    var grid = MAJAL.el("div", { class: "cia-grid card", style: "margin-top:12px" });
    ["C", "I", "A"].forEach(function (k) {
      grid.appendChild(MAJAL.el("span", { class: "pill " + k.toLowerCase(), text: k }));
      var tri = MAJAL.el("div", { class: "tri" });
      [["violated", "v"], ["held", "h"], ["n/a", "n"]].forEach(function (opt) {
        var b = MAJAL.el("button", { text: opt[0] });
        if (mine.cia[k] === opt[0]) b.className = "on-" + opt[1];
        b.addEventListener("click", function () {
          mine.cia[k] = opt[0];
          tri.querySelectorAll("button").forEach(function (x, xi) { x.className = ""; });
          b.className = "on-" + opt[1];
        });
        tri.appendChild(b);
      });
      grid.appendChild(tri);
    });
    body.appendChild(grid);

    var ctl = MAJAL.el("input", { type: "text", placeholder: "One control that prevented it — or would have", style: "width:100%;margin-top:12px", value: mine.control, onkeydown: function (e) { e.stopPropagation(); } });
    ctl.addEventListener("input", function () { mine.control = ctl.value; });
    body.appendChild(ctl);

    var incWrap = MAJAL.el("div", { class: "mark-row", style: "margin-top:12px" });
    incWrap.appendChild(MAJAL.el("span", { class: "hint", text: "Is this a security incident?", style: "align-self:center" }));
    ["yes", "no"].forEach(function (v) {
      var b = MAJAL.el("button", { class: mine.incident === v ? "btn" : "btn ghost", text: v });
      b.addEventListener("click", function () { mine.incident = v; incWrap.querySelectorAll("button").forEach(function (x) { x.className = "btn ghost"; }); b.className = "btn"; });
      incWrap.appendChild(b);
    });
    body.appendChild(incWrap);

    var just = MAJAL.el("textarea", { rows: "2", placeholder: "Justify it in one line.", style: "margin-top:10px", onkeydown: function (e) { e.stopPropagation(); } });
    just.value = mine.justify;
    just.addEventListener("input", function () { mine.justify = just.value; });
    body.appendChild(just);

    var submit = MAJAL.el("button", { class: "btn", text: "Submit — then read the note", style: "margin-top:12px" });
    var noteWrap = MAJAL.el("div");
    submit.addEventListener("click", function () {
      MAJAL.store.set("scenario", mine);
      noteWrap.innerHTML = "";
      noteWrap.appendChild(MAJAL.el("div", { class: "facilitator", html:
        "<div class='lbl'>facilitator note · scenario " + sc.id + "</div><p style='margin:.4em 0 0'>" + MAJAL.esc(sc.note) + "</p>" }));
      submit.disabled = true; submit.textContent = "Submitted ✓";
    });
    body.appendChild(submit);
    body.appendChild(noteWrap);
    // if already submitted this scenario, show the note
    if (saved && saved.id === sc.id) { submit.click(); }
  }
  render();
});
