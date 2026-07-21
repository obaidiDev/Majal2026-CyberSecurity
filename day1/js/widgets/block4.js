/* ==========================================================================
   Block 4 — networking for defenders.
   Mechanic 12: guided field-by-field decomposition.
   Mechanic 13: protocol simulation with a sabotage toggle.
   Mechanic 14: timed recall drill (ports).
   Mechanic 15: build-the-attack-then-detect-it (DNS tunneling).
   Mechanic 16: hover dissector + odd-one-out lineup (HTTP).
   Plus the export slide.
   ========================================================================== */

/* ---- Mechanic 12: four questions --------------------------------------- */
MAJAL.widget("fourq", function (root) {
  var mount = root.querySelector("#fourq-mount");
  var F = MAJAL.fourq;
  mount.appendChild(MAJAL.el("p", { class: "hint", text: "One real connection record. Ask it the four questions — the answers are all in the line." }));
  mount.appendChild(MAJAL.el("div", { class: "fourq-rec", text: F.record }));

  var solved = {};
  F.fields.forEach(function (f) {
    var rowEl = MAJAL.el("div", { class: "fourq-field" });
    rowEl.appendChild(MAJAL.el("div", { text: f.label }));
    var inp = MAJAL.el("input", { type: "text", placeholder: f.hint, onkeydown: function (e) { e.stopPropagation(); } });
    var status = MAJAL.el("div", { class: "no", text: "—" });
    inp.addEventListener("input", function () {
      var v = inp.value.trim().toLowerCase().replace(/\s+/g, " ");
      if (f.accept.indexOf(v) !== -1) {
        status.textContent = "✓"; status.className = "ok"; inp.style.borderColor = "var(--good)"; solved[f.key] = true;
      } else {
        status.textContent = "—"; status.className = "no"; inp.style.borderColor = ""; solved[f.key] = false;
      }
      if (F.fields.every(function (x) { return solved[x.key]; })) {
        MAJAL.store.set("fourqSolved", true); done.style.display = "";
      }
    });
    rowEl.appendChild(inp); rowEl.appendChild(status);
    mount.appendChild(rowEl);
  });
  var done = MAJAL.el("div", { class: "callout", style: "display:none;margin-top:12px", html:
    "That's the whole model you need today. <em>Who</em> (an IP), <em>which service</em> (a port), <em>what</em> (the protocol/payload — here, TLS to a suspicious name), and <em>was it reliable</em> (TCP has a handshake, so someone was really there)." });
  mount.appendChild(done);
});

/* ---- Mechanic 13: TCP vs UDP simulation -------------------------------- */
MAJAL.widget("tcpudp", function (root) {
  var mount = root.querySelector("#tcpudp-mount");
  var forged = false;

  var ctl = MAJAL.el("div", { class: "simctl" });
  var runBtn = MAJAL.el("button", { class: "btn", text: "▶ Send" });
  var forgeBtn = MAJAL.el("button", { class: "btn ghost", text: "Forge source IP: OFF" });
  forgeBtn.addEventListener("click", function () { forged = !forged; forgeBtn.textContent = "Forge source IP: " + (forged ? "ON" : "OFF"); forgeBtn.className = forged ? "btn" : "btn ghost"; });
  ctl.appendChild(runBtn); ctl.appendChild(forgeBtn);
  ctl.appendChild(MAJAL.el("span", { class: "hint", html: "TCP needs a handshake → a completed connection <em>proves</em> someone was there. UDP is fire-and-forget → the source can be forged." }));
  mount.appendChild(ctl);

  // TCP lane
  mount.appendChild(MAJAL.el("div", { class: "kc-row-label", text: "TCP — three-way handshake" }));
  var tcp = buildStage("Client", "Server"); mount.appendChild(tcp.stage);
  // UDP lane
  mount.appendChild(MAJAL.el("div", { class: "kc-row-label", text: "UDP — fire and forget" }));
  var udp = buildStage("Client", "Server"); mount.appendChild(udp.stage);

  function buildStage(l, r) {
    var stage = MAJAL.el("div", { class: "simstage", style: "height:150px" });
    var left = MAJAL.el("div", { class: "host", style: "left:20px;top:40px", html: "<div class='box'>" + l + "</div>10.0.0.9" });
    var right = MAJAL.el("div", { class: "host", style: "right:20px;top:40px", html: "<div class='box'>" + r + "</div>203.0.113.5" });
    stage.appendChild(left); stage.appendChild(right);
    return { stage: stage, left: left, right: right };
  }
  function fly(stage, label, cls, fromLeft, opts) {
    opts = opts || {};
    var p = MAJAL.el("div", { class: "packet " + (cls || ""), text: label });
    p.style.top = (opts.top != null ? opts.top : 58) + "px";
    p.style.left = fromLeft ? "150px" : "auto";
    p.style.right = fromLeft ? "auto" : "150px";
    p.style.transition = "left 1s linear, right 1s linear, top 1s linear, opacity .4s";
    stage.appendChild(p);
    requestAnimationFrame(function () {
      if (opts.offscreen) { p.style.top = "-40px"; p.style.left = fromLeft ? "900px" : "auto"; p.style.right = fromLeft ? "auto" : "900px"; }
      else if (fromLeft) { p.style.left = "980px"; } else { p.style.right = "980px"; }
    });
    if (opts.remove) setTimeout(function () { p.style.opacity = "0"; setTimeout(function () { p.remove(); }, 400); }, 1100);
    return p;
  }
  function clearStage(s) { s.querySelectorAll(".packet, .status").forEach(function (n) { n.remove(); }); }

  var amp = MAJAL.el("div", { class: "amp", style: "margin-top:10px" });
  mount.appendChild(amp);

  runBtn.addEventListener("click", function () {
    clearStage(tcp.stage); clearStage(udp.stage); amp.innerHTML = "";
    // TCP
    fly(tcp.stage, forged ? "SYN (spoofed src)" : "SYN", "", true, { remove: true });
    setTimeout(function () {
      if (forged) {
        fly(tcp.stage, "SYN-ACK → sent to the forged address…", "lost", false, { offscreen: true });
        setTimeout(function () { tcp.stage.appendChild(MAJAL.el("div", { class: "status", style: "position:absolute;bottom:8px;left:0;right:0;text-align:center;color:var(--bad);font-family:var(--mono);font-size:13px", text: "✗ handshake never completes — no connection, no proof anyone was here" })); }, 1000);
      } else {
        fly(tcp.stage, "SYN-ACK", "", false, { remove: true });
        setTimeout(function () {
          fly(tcp.stage, "ACK", "", true, { remove: true });
          setTimeout(function () { tcp.stage.appendChild(MAJAL.el("div", { class: "status", style: "position:absolute;bottom:8px;left:0;right:0;text-align:center;color:var(--good);font-family:var(--mono);font-size:13px", text: "✓ ESTABLISHED — a real host completed the handshake" })); }, 1000);
        }, 1100);
      }
    }, 1100);
    // UDP — always delivers, forged or not
    fly(udp.stage, forged ? "DATA (spoofed src)" : "DATA", "udp", true, {});
    setTimeout(function () { udp.stage.appendChild(MAJAL.el("div", { class: "status", style: "position:absolute;bottom:8px;left:0;right:0;text-align:center;color:var(--good);font-family:var(--mono);font-size:13px", text: "✓ delivered — nobody checked who really sent it" })); }, 1100);
    // amplification note when forged
    if (forged) {
      amp.innerHTML = "<b>Amplification:</b> forge the victim as the source, send a 60-byte UDP query, the server ships a 3,000-byte answer <em>to the victim</em>. Ratio <b>≈ 50×</b>. This is why floods and reflection attacks live on UDP.";
    }
  });
});

/* ---- Mechanic 14: ports drill + 445 pulse ------------------------------ */
MAJAL.widget("ports", function (root) {
  var mount = root.querySelector("#ports-mount");
  var P = MAJAL.ports;
  var mode = "ps"; // ps = port->service, log = why-care
  var order = [], idx = 0, hits = 0, seen = 0, running = false, deadline = 0, timer = null;

  var top = MAJAL.el("div", { class: "simctl", style: "margin-bottom:10px" });
  var m1 = MAJAL.el("button", { class: "btn", text: "Mode: port → service" });
  var m2 = MAJAL.el("button", { class: "btn ghost", text: "Mode: you see this → why care" });
  m1.addEventListener("click", function () { mode = "ps"; m1.className = "btn"; m2.className = "btn ghost"; });
  m2.addEventListener("click", function () { mode = "log"; m2.className = "btn"; m1.className = "btn ghost"; });
  var startBtn = MAJAL.el("button", { class: "btn", text: "▶ Start 3-min drill" });
  var chip = MAJAL.el("span", { class: "flash-score", text: "" });
  top.appendChild(m1); top.appendChild(m2); top.appendChild(startBtn); top.appendChild(chip);
  mount.appendChild(top);

  var stage = MAJAL.el("div", { class: "flash" });
  stage.appendChild(MAJAL.el("div", { class: "hint", text: "Two modes. Score is shown only to you. Handwrite the table first, then drill." }));
  mount.appendChild(stage);

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function card() {
    if (!running) return;
    var p = order[idx % order.length]; idx++;
    stage.innerHTML = "";
    if (mode === "ps") {
      stage.appendChild(MAJAL.el("div", { class: "cue", text: p.p }));
    } else {
      stage.appendChild(MAJAL.el("div", { class: "hint", text: "You see this in a log:" }));
      stage.appendChild(MAJAL.el("div", { class: "cue", style: "font-size:1.3em", text: p.s + "  (" + p.p + ")" }));
    }
    var reveal = MAJAL.el("button", { class: "btn ghost", text: "Reveal", style: "margin-top:14px" });
    reveal.addEventListener("click", function () {
      reveal.remove();
      stage.appendChild(MAJAL.el("div", { class: "ans", text: mode === "ps" ? p.s : p.why }));
      var mr = MAJAL.el("div", { class: "mark-row", style: "margin-top:10px" });
      var g = MAJAL.el("button", { class: "btn", text: "Got it" });
      var b = MAJAL.el("button", { class: "btn ghost", text: "Missed" });
      g.addEventListener("click", function () { hits++; seen++; card(); });
      b.addEventListener("click", function () { seen++; card(); });
      mr.appendChild(g); mr.appendChild(b); stage.appendChild(mr);
    });
    stage.appendChild(reveal);
  }
  startBtn.addEventListener("click", function () {
    running = true; hits = 0; seen = 0; idx = 0; order = shuffle(P.slice());
    deadline = Date.now() + 180000;
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      var left = Math.max(0, deadline - Date.now());
      chip.textContent = "⏱ " + Math.floor(left / 60000) + ":" + String(Math.floor((left % 60000) / 1000)).padStart(2, "0") + "  ·  " + hits + "/" + seen;
      if (left <= 0) { clearInterval(timer); running = false; finish(); }
    }, 300);
    card();
  });
  function finish() {
    stage.innerHTML = "<div class='cue'>" + hits + " / " + seen + "</div><div class='hint'>your score — nobody else sees it</div>";
    if (hits > MAJAL.store.get("portsBest", -1)) MAJAL.store.set("portsBest", hits);
  }

  // the 445 pulse — just watch it
  mount.appendChild(MAJAL.el("p", { class: "hint", style: "margin-top:14px", html:
    "<strong>445 from one workstation to fifty others is ransomware, until you prove otherwise.</strong> Watch it spread:" }));
  var pulseBtn = MAJAL.el("button", { class: "btn ghost", text: "▶ Watch 445 spread" });
  mount.appendChild(pulseBtn);
  var grid = MAJAL.el("div", { style: "display:grid;grid-template-columns:repeat(12,1fr);gap:6px;margin-top:10px;max-width:640px" });
  var nodes = [];
  for (var n = 0; n < 50; n++) {
    var dot = MAJAL.el("div", { style: "height:18px;border-radius:4px;background:var(--panel-2);transition:background .3s" });
    nodes.push(dot); grid.appendChild(dot);
  }
  nodes[0].style.background = "var(--yellow)";
  mount.appendChild(grid);
  pulseBtn.addEventListener("click", function () {
    nodes.forEach(function (d, i) { d.style.background = i === 0 ? "var(--yellow)" : "var(--panel-2)"; });
    var i = 1;
    var t = setInterval(function () {
      if (i >= nodes.length) { clearInterval(t); return; }
      nodes[i].style.background = "var(--bad)"; i++;
    }, 90);
  });
});

/* ---- Mechanic 15: DNS build-the-tunnel-then-catch-it ------------------- */
MAJAL.widget("dns", function (root) {
  var mount = root.querySelector("#dns-mount");
  var benign = MAJAL.buildDnsLog(3000);
  var merged = null, tunnel = null, logPane, decoded;

  // Step 1
  var step1 = MAJAL.el("div", { class: "card" });
  step1.appendChild(MAJAL.el("label", { class: "hint", text: "1 · Type a secret to smuggle out (your own name is fine):" }));
  var secretIn = MAJAL.el("input", { type: "text", value: MAJAL.store.get("dnsSecret", "") || (MAJAL.store.get("name", "") || "Sara"), style: "margin-left:10px;width:220px", onkeydown: function (e) { e.stopPropagation(); } });
  var buildBtn = MAJAL.el("button", { class: "btn", text: "Encode & inject", style: "margin-left:10px" });
  step1.appendChild(secretIn); step1.appendChild(buildBtn);
  mount.appendChild(step1);

  // log pane
  logPane = MAJAL.el("div", { class: "dnslog", style: "margin-top:12px" });
  logPane.textContent = "(build the tunnel to see the DNS log)";
  mount.appendChild(logPane);

  // tools
  var tools = MAJAL.el("div", { class: "dnstools", style: "display:none" });
  var t1 = MAJAL.el("button", { class: "btn ghost", text: "Group by parent domain" });
  var t2 = MAJAL.el("button", { class: "btn ghost", text: "Count unique subdomains / parent" });
  var t3 = MAJAL.el("button", { class: "btn ghost", text: "Sort by label entropy" });
  tools.appendChild(t1); tools.appendChild(t2); tools.appendChild(t3);
  mount.appendChild(tools);
  var result = MAJAL.el("div", { class: "dns-result" });
  mount.appendChild(result);
  decoded = MAJAL.el("div"); mount.appendChild(decoded);

  function render(highlight) {
    var html = merged.map(function (r) {
      var line = r.t + "  " + r.host + "  ->  " + r.q;
      return (highlight && r.tunnel) ? "<span class='tun'>" + MAJAL.esc(line) + "</span>" : MAJAL.esc(line);
    }).join("\n");
    logPane.innerHTML = html;
  }
  function parent(q) { var p = q.split("."); return p.slice(-2).join("."); }
  function label(q) { return q.split(".")[0]; }
  function entropy(s) {
    var f = {}; for (var i = 0; i < s.length; i++) f[s[i]] = (f[s[i]] || 0) + 1;
    var e = 0; for (var k in f) { var p = f[k] / s.length; e -= p * Math.log2(p); } return e;
  }

  buildBtn.addEventListener("click", function () {
    var secret = secretIn.value.trim() || "Sara";
    MAJAL.store.set("dnsSecret", secret);
    tunnel = MAJAL.encodeTunnel(secret, "10.0.0.57");
    // scatter tunnel queries through the benign log
    merged = benign.slice();
    tunnel.queries.forEach(function (q, k) {
      var pos = Math.floor((k + 1) * merged.length / (tunnel.queries.length + 1));
      merged.splice(pos, 0, q);
    });
    render(false);
    tools.style.display = "";
    result.innerHTML = "<span class='hint'>Nothing looks wrong. " + tunnel.queries.length + " tunnel queries are hiding in " + benign.length.toLocaleString() + " benign ones. Which tool surfaces them?</span>";
    decoded.innerHTML = "";
  });

  t1.addEventListener("click", function () {
    MAJAL.store.set("dnsTool", "group-by-parent");
    var counts = {}; merged.forEach(function (r) { var p = parent(r.q); counts[p] = (counts[p] || 0) + 1; });
    var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 8);
    result.innerHTML = "<b>Total queries per parent (top 8):</b><br>" +
      top.map(function (p) { return p + " — " + counts[p]; }).join("<br>") +
      "<br><span class='hint'>attacker.com is buried — it's just one row among twenty, with fewer hits than google. Grouping by volume doesn't surface it.</span>";
    render(false);
  });
  t3.addEventListener("click", function () {
    MAJAL.store.set("dnsTool", "entropy");
    var seen = {}, byLabel = [];
    merged.map(function (r) { return { q: r.q, e: entropy(label(r.q)), tun: r.tunnel }; })
      .sort(function (a, b) { return b.e - a.e; })
      .forEach(function (x) { if (!seen[x.q]) { seen[x.q] = 1; byLabel.push(x); } });
    byLabel = byLabel.slice(0, 10);
    result.innerHTML = "<b>Highest-entropy labels:</b><br>" +
      byLabel.map(function (x) { return x.q + "  (" + x.e.toFixed(2) + ")"; }).join("<br>") +
      "<br><span class='hint'>The tunnel labels are up here — but so are akamai/gstatic CDN hashes. Entropy flags real tunnels <em>and</em> benign noise. False positives.</span>";
    render(false);
  });
  t2.addEventListener("click", function () {
    MAJAL.store.set("dnsTool", "unique-subdomains");
    var uniq = {}; merged.forEach(function (r) { var p = parent(r.q); (uniq[p] = uniq[p] || {})[label(r.q)] = 1; });
    var rows = Object.keys(uniq).map(function (p) { return { p: p, n: Object.keys(uniq[p]).length }; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
    result.innerHTML = "<b>Unique subdomains per parent:</b><br>" +
      rows.map(function (x) { return (x.p === tunnel.domain.split(".").slice(-2).join(".") ? "<span class='tun'>" : "<span>") + x.p + " — " + x.n + " unique</span>"; }).join("<br>") +
      "<br><span style='color:var(--good)'>There it is. One parent has dozens of <em>unique, never-repeating</em> long labels — no real service behaves like that. That's your data leaving, one lookup at a time.</span>";
    render(true);
    logPane.scrollTop = logPane.scrollHeight / 3;
    var dec = MAJAL.el("button", { class: "btn", text: "Decode the labels →", style: "margin-top:10px" });
    dec.addEventListener("click", function () {
      var out = MAJAL.decodeHex(tunnel.hex);
      decoded.innerHTML = "";
      decoded.appendChild(MAJAL.el("div", { class: "dns-decoded", text: 'recovered from the DNS log: "' + out + '"' }));
      decoded.appendChild(MAJAL.el("p", { class: "hint", html: "No individual query was suspicious. <em>The pattern was.</em> Most detection works exactly this way." }));
    });
    result.appendChild(dec);
  });
});

/* ---- Mechanic 16: HTTP dissector + UA lineup --------------------------- */
MAJAL.widget("http", function (root) {
  var mount = root.querySelector("#http-mount");
  var H = MAJAL.http;

  // single floating popover
  var pop = MAJAL.el("div", { class: "popover" }); pop.style.display = "none";
  document.body.appendChild(pop);
  function mkBlock(lines) {
    var pre = MAJAL.el("div", { class: "httpblock" });
    lines.forEach(function (t) {
      var span = MAJAL.el("span", { class: "httptok", text: t.tok });
      span.addEventListener("mousemove", function (e) {
        pop.textContent = t.def; pop.style.display = "";
        var x = Math.min(e.clientX + 14, window.innerWidth - 360);
        pop.style.left = x + "px"; pop.style.top = (e.clientY + 16) + "px";
      });
      span.addEventListener("mouseleave", function () { pop.style.display = "none"; });
      pre.appendChild(span); pre.appendChild(document.createTextNode("\n"));
    });
    return pre;
  }
  mount.appendChild(MAJAL.el("p", { class: "hint", text: "Hover any line for what it means. HttpOnly is worth a longer read." }));
  var two = MAJAL.el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:14px" });
  var reqWrap = MAJAL.el("div"); reqWrap.appendChild(MAJAL.el("div", { class: "kc-row-label", text: "Request" })); reqWrap.appendChild(mkBlock(H.request));
  var resWrap = MAJAL.el("div"); resWrap.appendChild(MAJAL.el("div", { class: "kc-row-label", text: "Response" })); resWrap.appendChild(mkBlock(H.response));
  two.appendChild(reqWrap); two.appendChild(resWrap);
  mount.appendChild(two);

  // UA lineup
  mount.appendChild(MAJAL.el("p", { class: "hint", style: "margin-top:14px", html:
    "<strong>Last one of the day.</strong> Six User-Agent strings from your proxy log. One is malware beaconing home. Pick it." }));
  var picked = false;
  var rows = [];
  var uaScroll = MAJAL.el("div", { class: "ua-scroll" });
  mount.appendChild(uaScroll);
  H.uas.forEach(function (ua, k) {
    var rowEl = MAJAL.el("div", { class: "ua-row", text: ua.s });
    rowEl.addEventListener("click", function () {
      if (picked) return; picked = true;
      MAJAL.store.set("uaPicked", k);
      MAJAL.store.set("uaCorrect", ua.malware === true);
      H.uas.forEach(function (u, j) {
        var node = rows[j];
        node.classList.add(u.malware ? "is-mal" : "is-ok");
        if (j === k) node.classList.add("picked");
        node.appendChild(MAJAL.el("div", { class: "ua-note", text: u.note }));
      });
    });
    rows.push(rowEl); uaScroll.appendChild(rowEl);
  });
});

/* ---- export ------------------------------------------------------------ */
MAJAL.widget("export", function (root) {
  var mount = root.querySelector("#export-mount");
  var box = MAJAL.el("div", { class: "export-box card" });
  box.appendChild(MAJAL.el("h2", { text: "That's Day 1." }));
  box.appendChild(MAJAL.el("p", { class: "sub", html: "You found what's normal so you can subtract it. Tomorrow, you become the attacker. Export your record and hand it in." }));

  var nameRow = MAJAL.el("div", { style: "margin:14px 0" });
  nameRow.appendChild(MAJAL.el("span", { class: "hint", text: "Name on the file: " }));
  var nameIn = MAJAL.el("input", { type: "text", value: MAJAL.store.get("name", ""), placeholder: "your name", onkeydown: function (e) { e.stopPropagation(); } });
  nameIn.addEventListener("input", function () { MAJAL.store.set("name", nameIn.value.trim()); });
  nameRow.appendChild(nameIn);
  box.appendChild(nameRow);

  var dl = MAJAL.el("button", { class: "btn big", text: "⬇ Export day1-<name>.txt" });
  dl.addEventListener("click", function () { MAJAL.store.set("name", nameIn.value.trim()); MAJAL.exportFile(); });
  box.appendChild(dl);

  var reset = MAJAL.el("button", { class: "btn ghost", text: "Reset my answers", style: "margin-left:12px" });
  reset.addEventListener("click", function () {
    if (confirm("Wipe all of your Day-1 answers from this browser? (Do this only after you've handed in.)")) { MAJAL.store.reset(); location.reload(); }
  });
  box.appendChild(reset);
  mount.appendChild(box);
});
