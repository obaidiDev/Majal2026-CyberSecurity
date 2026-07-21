/* ==========================================================================
   Block 3 — intrusions.
   Mechanic 10: paired-column asymmetric reveal (kill chain).
   Mechanic 11: hotspot annotation of a frozen artifact (ATT&CK).
   ========================================================================== */

/* ---- Mechanic 10: kill chain ------------------------------------------- */
MAJAL.widget("killchain", function (root) {
  var mount = root.querySelector("#killchain-mount");
  var K = MAJAL.killchain;

  mount.appendChild(MAJAL.el("div", { class: "kc-row-label", text: "What they did  (the attacker's story)" }));
  var grid = MAJAL.el("div", { class: "kc-grid" });
  var narrRow = [], logRow = [];
  K.forEach(function (s, idx) {
    var col = MAJAL.el("div", { class: "kc-col" });
    col.appendChild(MAJAL.el("div", { class: "kc-stage", text: (idx + 1) + ". " + s.stage }));
    var narr = MAJAL.el("div", { class: "kc-cell narr", text: s.narrative });
    col.appendChild(narr); narrRow.push(narr);
    grid.appendChild(col);
  });
  mount.appendChild(grid);

  mount.appendChild(MAJAL.el("div", { class: "kc-row-label", text: "What lands in a log  (all you actually see) — click each box" }));
  var grid2 = MAJAL.el("div", { class: "kc-grid" });
  K.forEach(function (s, idx) {
    var col = MAJAL.el("div", { class: "kc-col" });
    var cell;
    if (s.log === null) {
      cell = MAJAL.el("div", { class: "kc-cell log norec", text: s.logNote });
    } else {
      cell = MAJAL.el("div", { class: "kc-cell log", text: "?" });
      cell.addEventListener("click", function () {
        if (cell.classList.contains("revealed")) return;
        cell.classList.add("revealed"); cell.textContent = s.log;
      });
    }
    col.appendChild(cell); logRow.push(cell); grid2.appendChild(col);
  });
  mount.appendChild(grid2);

  var flip = MAJAL.el("button", { class: "btn", text: "Flip it — hide what they did", style: "margin-top:14px" });
  var flipped = false;
  flip.addEventListener("click", function () {
    flipped = !flipped;
    narrRow.forEach(function (n) { n.classList.toggle("hidden-row", flipped); });
    // reveal all logs on flip so the point lands
    if (flipped) logRow.forEach(function (c, idx) {
      if (!c.classList.contains("norec") && !c.classList.contains("revealed")) { c.classList.add("revealed"); c.textContent = K[idx].log; }
    });
    flip.textContent = flipped ? "Show the story again" : "Flip it — hide what they did";
    note.style.display = flipped ? "" : "none";
  });
  mount.appendChild(flip);
  var note = MAJAL.el("div", { class: "callout hot", style: "display:none;margin-top:12px", html:
    "This is the entire job. The top row is gone — you <em>never</em> see it. You infer it from the bottom row. " +
    "Everything for the rest of this week is learning to read the bottom row well enough to reconstruct the top. " +
    "<span class='sub'>(And the kill chain is a model, not a law — real intrusions skip stages, loop back, run several at once.)</span>" });
  mount.appendChild(note);
});

/* ---- Mechanic 11: ATT&CK frozen artifact + hotspots -------------------- */
MAJAL.widget("attack", function (root) {
  var mount = root.querySelector("#attack-mount");
  var A = MAJAL.attack;

  var wrap = MAJAL.el("div", { class: "attk" });
  var pane = MAJAL.el("div", { class: "attk-pane" });

  var proc = A.procedures.map(function (p) { return "<li><b>" + MAJAL.esc(p[0]) + "</b> — " + MAJAL.esc(p[1]) + "</li>"; }).join("");
  var det = A.detection.map(function (d) { return "<li><b>" + MAJAL.esc(d[0]) + "</b> — " + MAJAL.esc(d[1]) + "</li>"; }).join("");

  pane.innerHTML =
    "<div class='aid'>" + A.id + "</div>" +
    "<h3>" + MAJAL.esc(A.name) + "</h3>" +
    "<div style='color:#5a6b8a;font-size:.9em'>Sub-technique of " + MAJAL.esc(A.parent) + " &nbsp;·&nbsp; Tactic: " + MAJAL.esc(A.tactic) + "</div>" +
    "<div class='sect' id='attk-desc'><b>Description</b><p>" + MAJAL.esc(A.description) + "</p></div>" +
    "<div class='sect' id='attk-proc'><b>Procedure examples</b><ul>" + proc + "</ul></div>" +
    "<div class='sect' id='attk-det'><b class='hot'>Detection</b><ul>" + det + "</ul></div>" +
    "<div style='color:#98a2b8;font-size:.85em;margin-top:14px'>(Offline snapshot for the lab. On the projector, the live site is attack.mitre.org.)</div>";
  wrap.appendChild(pane);

  var side = MAJAL.el("div", { class: "attk-side" });
  var hotspots = [
    ["1", "The description", "attk-desc", "<b>What the technique is.</b> Adversaries read credentials straight out of LSASS process memory after a user logs on."],
    ["2", "Procedure examples", "attk-proc", "<b>Who actually did this,</b> with references — real named groups (APT29, Lazarus) and tools (Mimikatz, Cobalt Strike). You are never guessing from memory."],
    ["3", "Detection", "attk-det", "<b>This is the point.</b> The site tells you how to <em>catch</em> it — the exact evidence that should exist (a handle to lsass.exe, Sysmon event 10). A defender's encyclopedia, built from what real attackers did."]
  ];
  side.appendChild(MAJAL.el("p", { class: "hint", text: "Three things to look at, in order:" }));
  var pin = MAJAL.el("div", { class: "callout", style: "margin-top:8px;font-size:.7em;display:none" });
  hotspots.forEach(function (h) {
    var btn = MAJAL.el("button", { class: "hotbtn", html: "<b>" + h[0] + ".</b> " + h[1] });
    btn.addEventListener("click", function () {
      side.querySelectorAll(".hotbtn").forEach(function (n) { n.classList.remove("active"); });
      btn.classList.add("active");
      var target = pane.querySelector("#" + h[2]);
      if (target) pane.scrollTo({ top: target.offsetTop - pane.offsetTop - 6, behavior: "smooth" });
      pin.innerHTML = h[3]; pin.style.display = "";
    });
    side.appendChild(btn);
  });
  side.appendChild(pin);
  wrap.appendChild(side);
  mount.appendChild(wrap);

  mount.appendChild(MAJAL.el("p", { class: "hint", style: "margin-top:10px", html:
    "Tactic = the <em>why</em> · Technique = the <em>how</em> · Sub-technique = the <em>specific how</em> · Procedure = what a named group actually did. Nobody memorises this — you look it up, every time, for your whole career." }));
});
