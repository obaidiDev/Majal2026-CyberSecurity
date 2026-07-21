/* ==========================================================================
   Block 0 — cold open.  Mechanic 1: needle-in-haystack scrub-and-click.
   Ground-rules acknowledgement gate.
   ========================================================================== */

/* ---- Mechanic 1: the log wall ------------------------------------------ */
MAJAL.widget("logwall", function (root) {
  var mount = root.querySelector("#logwall-mount");
  var wall = MAJAL.buildLogWall();
  MAJAL.store.set("logNeedle", wall.needle);

  var pane = MAJAL.el("div", { class: "logwall", tabindex: "0" });
  wall.lines.forEach(function (text, i) {
    var ln = MAJAL.el("div", { class: "ln", "data-i": i, text: text });
    ln.addEventListener("click", function () {
      pane.querySelectorAll(".ln.picked").forEach(function (n) { n.classList.remove("picked"); });
      ln.classList.add("picked");
      MAJAL.store.set("logPick", i);
      meta.querySelector(".picked-idx").textContent = "line " + (i + 1).toLocaleString();
    });
    pane.appendChild(ln);
  });

  var meta = MAJAL.el("div", { class: "logwall-meta", html:
    '<span>' + wall.lines.length.toLocaleString() + ' lines · scroll to the end · click the one that is different</span>' +
    '<span class="picked-idx">line —</span>' });

  mount.appendChild(pane);
  mount.appendChild(meta);

  // restore a previous pick if they come back
  var prev = MAJAL.store.get("logPick", null);
  if (prev != null && pane.children[prev]) {
    pane.children[prev].classList.add("picked");
    meta.querySelector(".picked-idx").textContent = "line " + (prev + 1).toLocaleString();
  }
});

/* ---- Ground-rules acknowledgement gate --------------------------------- */
MAJAL.widget("ackgate", function (root) {
  var mount = root.querySelector("#ack-mount");
  var already = MAJAL.store.get("ackLaw", false);

  var box = MAJAL.el("label", { class: "ackbox" });
  var cb = MAJAL.el("input", { type: "checkbox" });
  cb.checked = already;
  var txt = MAJAL.el("div", { html:
    "I understand that everything taught this week is illegal when applied to systems I do not own, " +
    "that it falls under Saudi Arabia's <strong>Anti-Cyber Crime Law</strong>, and that I will use it " +
    "<em>only inside the lab</em>. Anyone who tests it elsewhere is removed from the course." });
  box.appendChild(cb); box.appendChild(txt);

  var note = MAJAL.el("div", { class: "locked-note", text: already ? "acknowledged" : "check the box to record your acknowledgement" });

  cb.addEventListener("change", function () {
    MAJAL.store.set("ackLaw", cb.checked);
    if (cb.checked) {
      var stamp = new Date().toISOString();
      MAJAL.store.set("ackLawAt", stamp);
      note.textContent = "acknowledged · " + stamp;
    } else {
      note.textContent = "check the box to record your acknowledgement";
    }
  });

  mount.appendChild(box);
  mount.appendChild(note);
});
