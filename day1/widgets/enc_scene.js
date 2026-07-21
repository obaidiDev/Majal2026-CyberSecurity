/* ==========================================================================
   Canvas encryption scene — shared engine for the two Day-1 illustrations.
   Everything is drawn at computed coordinates, so labels/shapes never overlap.
   ENC.mount(rootEl, mode)  where mode = "sym" | "asym".
   ========================================================================== */
window.ENC = (function () {
  var PLAIN = "MEET AT DAWN", CIPHER = "9X#K2@7QW$MZ";
  var GLY = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@$*?/+=<>0123456789".split("");
  var TEAL = "#1F8F89", TURQ = "#33D3CB", PETROL = "#00567C", INK = "#12333D",
      MUTE = "#5C7880", BAD = "#D64545", YELL = "#F2D200", DARK = "#04303F";

  function ease(p) { return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function scrambleMix(to, p) {
    var out = "", n = Math.floor(p * to.length);
    for (var i = 0; i < to.length; i++)
      out += to[i] === " " ? " " : (i < n ? to[i] : GLY[(Math.random() * GLY.length) | 0]);
    return out;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  function person(ctx, cx, hy, color, dashed) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, hy, 13, 0, 7); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 20, hy + 33); ctx.quadraticCurveTo(cx - 20, hy + 13, cx, hy + 13);
    ctx.quadraticCurveTo(cx + 20, hy + 13, cx + 20, hy + 33); ctx.closePath(); ctx.fill();
    if (dashed) {
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, hy + 8, 30, 0, 7); ctx.stroke(); ctx.restore();
    }
  }
  function label(ctx, cx, y, txt, color, size, weight) {
    ctx.fillStyle = color; ctx.font = (weight || 700) + " " + (size || 14) + "px " +
      '"Avenir Next","Segoe UI",system-ui,sans-serif';
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, cx, y);
  }
  function pill(ctx, cx, y, txt, bg, fg, border, glow) {
    ctx.font = '600 12px "Avenir Next","Segoe UI",system-ui,sans-serif';
    var w = ctx.measureText(txt).width + 20, h = 21;
    if (glow) { ctx.save(); ctx.shadowColor = border; ctx.shadowBlur = 12; }
    rr(ctx, cx - w / 2, y - h / 2, w, h, 10); ctx.fillStyle = bg; ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = border; ctx.stroke();
    if (glow) ctx.restore();
    label(ctx, cx, y, txt, fg, 12, 600);
  }
  function keyIcon(ctx, cx, cy, color, sc) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(-8, 0, 6, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(13, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(9, 5); ctx.moveTo(13, 0); ctx.lineTo(13, 6); ctx.stroke();
    ctx.restore();
  }
  function lockIcon(ctx, cx, cy, closed, color, sc) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.beginPath();
    if (closed) ctx.arc(0, -3, 6, Math.PI, 0);
    else { ctx.arc(4, -3, 6, Math.PI, Math.PI * 1.55, true); }
    ctx.stroke();
    ctx.fillStyle = color; rr(ctx, -9, -3, 18, 14, 3); ctx.fill();
    ctx.restore();
  }

  function mount(root, mode) {
    var canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d");
    var capEl = root.querySelector(".cap");
    var btnPlay = root.querySelector("#play"), btnProb = root.querySelector("#prob"),
        btnReset = root.querySelector("#reset");
    var W = 900, H = 336, raf = null, seq = null, phase = 0, segStart = 0, running = false, S;

    function fit() {
      var cssW = canvas.clientWidth || 900, dpr = window.devicePixelRatio || 1;
      canvas.width = cssW * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = cssW; draw();
    }
    function L() {
      return { aliceX: 100, bobX: W - 100, headY: 74, nameY: 116, badgeY: 138,
        wireY: 182, eveX: Math.round(W / 2), eveHeadY: 280, boardY: 34 };
    }
    function fresh() {
      S = { text: PLAIN, locked: false, lock: 0, travel: 0, ghost: false, ghostText: "",
        key: null, eveKey: false, alicePub: false, evePub: false, bobGlow: false, shake: 0 };
    }

    function draw() {
      var l = L();
      ctx.clearRect(0, 0, W, H);
      // wire
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = "#9DB4BA"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(l.aliceX, l.wireY); ctx.lineTo(l.bobX, l.wireY); ctx.stroke();
      // eve tap line
      ctx.strokeStyle = "rgba(214,69,69,.45)";
      ctx.beginPath(); ctx.moveTo(l.eveX, l.wireY); ctx.lineTo(l.eveX, l.eveHeadY - 15); ctx.stroke();
      ctx.restore();

      if (mode === "asym")
        pill(ctx, l.eveX, l.boardY, "🔓  Bob's PUBLIC lock — free for anyone to copy", "#EAF6F5", PETROL, TURQ);

      // Alice
      person(ctx, l.aliceX, l.headY, TEAL);
      label(ctx, l.aliceX, l.nameY, "Alice", INK, 15);
      if (mode === "sym") pill(ctx, l.aliceX, l.badgeY, "shared key K", "#FEF7CC", INK, YELL);
      else if (S.alicePub) pill(ctx, l.aliceX, l.badgeY, "Bob's public lock", "#EAF6F5", PETROL, TURQ);

      // Bob
      person(ctx, l.bobX, l.headY, PETROL);
      label(ctx, l.bobX, l.nameY, "Bob", INK, 15);
      if (mode === "sym") pill(ctx, l.bobX, l.badgeY, "shared key K", "#FEF7CC", INK, YELL);
      else pill(ctx, l.bobX, l.badgeY, "PRIVATE key", "#E6EEF2", PETROL, PETROL, S.bobGlow);

      // Eve
      person(ctx, l.eveX, l.eveHeadY, BAD, true);
      label(ctx, l.eveX, l.eveHeadY + 42, "Eve · on the wire", BAD, 13);
      if (mode === "asym" && S.evePub) pill(ctx, l.eveX + 140, l.eveHeadY, "has public lock", "#FBE9E9", BAD, BAD);

      // Eve's stolen copy (ghost)
      if (S.ghost) {
        var gx = l.eveX + S.shake, gy = 228, gw = 156, gh = 34;
        ctx.save(); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.4; ctx.strokeStyle = BAD;
        rr(ctx, gx - gw / 2, gy - gh / 2, gw, gh, 8); ctx.fillStyle = "rgba(214,69,69,.08)"; ctx.fill(); ctx.stroke();
        ctx.restore();
        label(ctx, gx, gy, S.ghostText, "#B2413C", 14); ctx.font = "13px mono";
      }

      // traveling key (symmetric "problem")
      if (S.key != null) {
        var kx = lerp(l.aliceX + 30, l.bobX - 30, S.key);
        keyIcon(ctx, kx, l.wireY - 16, YELL, 1.5);
      }

      // the message packet
      var PKW = Math.min(174, (l.bobX - l.aliceX) - 150), PKH = 44;
      var sCX = l.aliceX + 34 + PKW / 2, eCX = l.bobX - 34 - PKW / 2;
      var cx = lerp(sCX, eCX, S.travel) + S.shake, x = cx - PKW / 2, y = l.wireY - PKH / 2;
      ctx.save(); ctx.shadowColor = "rgba(4,48,63,.22)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      rr(ctx, x, y, PKW, PKH, 9); ctx.fillStyle = DARK; ctx.fill(); ctx.restore();
      ctx.lineWidth = 1.6; ctx.strokeStyle = S.locked ? YELL : TURQ; ctx.stroke();
      ctx.font = '400 15px "JetBrains Mono",monospace';
      ctx.fillStyle = S.locked ? YELL : TURQ; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(S.text, cx, l.wireY);
      if (S.lock > 0.02) lockIcon(ctx, x + 4, y + 2, S.locked, S.locked ? YELL : TEAL, 0.85);
    }

    function setCap(html) { capEl.innerHTML = html; }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; running = false; }
    function runSeq(segs, onEnd) {
      stop(); seq = segs; phase = 0; segStart = performance.now(); running = true;
      seq._end = onEnd; setCap(segs[0].cap); raf = requestAnimationFrame(step);
    }
    function step(now) {
      if (!running) return;
      var seg = seq[phase], p = Math.min(1, (now - segStart) / seg.dur);
      if (seg.render) seg.render(p);
      draw();
      if (p >= 1) {
        if (seg.done) seg.done();
        phase++;
        if (phase < seq.length) { segStart = now; setCap(seq[phase].cap); raf = requestAnimationFrame(step); }
        else { running = false; if (seq._end) seq._end(); }
      } else raf = requestAnimationFrame(step);
    }

    /* ---- scenarios ---- */
    function symMain() {
      return [
        { dur: 500, cap: "Alice and Bob <b>already share one secret key K</b>. Alice writes her message." },
        { dur: 950, cap: "She <b>locks</b> it with key K — the readable text turns into ciphertext.",
          render: function (p) { S.lock = p; S.locked = p > .5; S.text = scrambleMix(CIPHER, p); },
          done: function () { S.text = CIPHER; S.locked = true; S.lock = 1; } },
        { dur: 1300, cap: "The locked message travels across the network…",
          render: function (p) { S.travel = ease(p); if (p > .55 && !S.ghost) { S.ghost = true; S.ghostText = CIPHER; } } },
        { dur: 1100, cap: "<span class='dngr'>Eve copies it off the wire</span> — but without K it is gibberish to her." },
        { dur: 950, cap: "Bob has the <b>same key K</b>, so he unlocks it back to plain text.",
          render: function (p) { S.lock = 1 - p; S.locked = p < .5; S.text = scrambleMix(PLAIN, p); },
          done: function () { S.text = PLAIN; S.locked = false; S.lock = 0; } },
        { dur: 700, cap: "✅ It worked — <b>but only because they already shared K</b>. So how did Alice get K to Bob safely?" }
      ];
    }
    function symProblem() {
      return [
        { dur: 350, cap: "To agree on K in the first place, it has to cross the <b>same wire</b>…",
          render: function () { S.key = 0; } },
        { dur: 1300, cap: "The key travels from Alice to Bob…",
          render: function (p) { S.key = ease(p); if (p > .55) S.eveKey = true; } },
        { dur: 1100, cap: "🔓 <span class='dngr'>Eve grabbed K too.</span> Now she reads everything — the <b>key-distribution problem</b>, and why we need a second idea.",
          render: function (p) { if (S.eveKey) S.ghostText = scrambleMix(PLAIN, p); },
          done: function () { S.ghostText = PLAIN; } }
      ];
    }
    function asymMain() {
      return [
        { dur: 500, cap: "Bob has a <b>key pair</b>: a public lock, and a private key only he holds." },
        { dur: 850, cap: "Bob <b>publishes his public lock</b>. Anyone may take a copy — even Eve.",
          render: function () { S.alicePub = true; S.evePub = true; } },
        { dur: 950, cap: "Alice locks her message with <b>Bob's public lock</b> — text becomes ciphertext.",
          render: function (p) { S.lock = p; S.locked = p > .5; S.text = scrambleMix(CIPHER, p); },
          done: function () { S.text = CIPHER; S.locked = true; S.lock = 1; } },
        { dur: 1300, cap: "The locked message travels…",
          render: function (p) { S.travel = ease(p); if (p > .55 && !S.ghost) { S.ghost = true; S.ghostText = CIPHER; } } },
        { dur: 1250, cap: "<span class='dngr'>Eve has the ciphertext and the public lock</span> — but a public lock can only <b>LOCK</b>. It can't open what it closed.",
          render: function (p) { S.shake = Math.sin(p * 42) * (1 - p) * 4; }, done: function () { S.shake = 0; } },
        { dur: 950, cap: "Only Bob's <b>PRIVATE key</b> opens it — and it <em>never crossed the wire</em>.",
          render: function (p) { S.bobGlow = true; S.lock = 1 - p; S.locked = p < .5; S.text = scrambleMix(PLAIN, p); },
          done: function () { S.text = PLAIN; S.locked = false; S.lock = 0; } },
        { dur: 700, cap: "✅ <span class='good'>Solved.</span> No shared secret ever traveled — this is what HTTPS does the instant it connects." }
      ];
    }

    function idleCap() {
      setCap(mode === "sym"
        ? "Alice and Bob share one secret key. Press <b>Play</b> to watch a message travel — then reveal the catch."
        : "Bob uses a public lock and a private key. Press <b>Play</b> to see why an eavesdropper is stuck.");
    }
    function reset() { stop(); fresh(); if (btnProb) btnProb.disabled = true; btnPlay.disabled = false; draw(); idleCap(); }

    btnPlay.addEventListener("click", function () {
      fresh(); btnPlay.disabled = true; if (btnProb) btnProb.disabled = true;
      runSeq(mode === "sym" ? symMain() : asymMain(), function () {
        btnPlay.disabled = false; if (btnProb) btnProb.disabled = false;
      });
    });
    if (btnProb) btnProb.addEventListener("click", function () {
      btnProb.disabled = true; runSeq(symProblem(), function () {});
    });
    btnReset.addEventListener("click", reset);

    fresh();
    if (canvas.clientWidth) fit(); else requestAnimationFrame(fit);
    window.addEventListener("resize", fit);
    idleCap();
  }

  return { mount: mount };
})();
