/* ==========================================================================
   Day 1 · Topic 1 — the CIA triad, taught through simulations.
     Confidentiality : Caesar cipher · breaking it · symmetric/asymmetric · Diffie-Hellman
     Integrity       : hash avalanche · tamper/checksum · password salting
     Availability    : live DDoS simulation
     Synthesis       : which property did each attack break?
   Everything is vanilla JS + the pure-JS MAJAL.sha256. Runs from file://.
   ========================================================================== */

var ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function caesar(text, n) {
  n = ((n % 26) + 26) % 26;
  return text.toUpperCase().replace(/[A-Z]/g, function (c) {
    return ALPHA[(c.charCodeAt(0) - 65 + n) % 26];
  });
}

/* ======================================================================= *
 *  CONFIDENTIALITY — 1. Caesar cipher                                     *
 * ======================================================================= */
MAJAL.widget("caesar", function (root) {
  var mount = root.querySelector("#caesar-mount");

  var input = MAJAL.el("input", { type: "text", value: "ATTACK AT DAWN", maxlength: "34",
    style: "width:100%;font-size:.9em;letter-spacing:.05em" });
  var range = MAJAL.el("input", { type: "range", min: "1", max: "25", value: "3", style: "width:100%" });

  var wheel = MAJAL.el("div", { class: "cz-wheel" });
  var top = MAJAL.el("div", { class: "cz-row" });
  var bot = MAJAL.el("div", { class: "cz-row cz-cipher" });
  ALPHA.forEach(function (c) { top.appendChild(MAJAL.el("span", { class: "cz-cell", text: c })); });
  var botCells = ALPHA.map(function () { var s = MAJAL.el("span", { class: "cz-cell" }); bot.appendChild(s); return s; });
  wheel.appendChild(top); wheel.appendChild(bot);

  var out = MAJAL.el("div", { class: "cz-out" });
  var shiftLbl = MAJAL.el("span", { class: "cz-shift" });

  function paint() {
    var n = +range.value;
    shiftLbl.textContent = "shift = " + n;
    ALPHA.forEach(function (c, i) { botCells[i].textContent = ALPHA[(i + n) % 26]; });
    out.textContent = caesar(input.value, n);
  }
  input.addEventListener("input", paint);
  range.addEventListener("input", paint);

  mount.appendChild(MAJAL.el("div", { class: "cz-grid" }, [
    MAJAL.el("div", {}, [ MAJAL.el("label", { class: "cz-lbl", text: "Your message" }), input ]),
    MAJAL.el("div", {}, [ MAJAL.el("label", { class: "cz-lbl", html: "Key (how far to rotate) &nbsp;" }), shiftLbl, range ])
  ]));
  mount.appendChild(wheel);
  mount.appendChild(MAJAL.el("div", { class: "cz-lbl", text: "Ciphertext (what goes on the wire)" }));
  mount.appendChild(out);
  mount.appendChild(MAJAL.el("p", { class: "hint", html:
    "This is <em>confidentiality</em>: only someone who knows the key can read it. " +
    "But a Caesar cipher has only <b>25</b> possible keys — watch what that costs us next." }));
  paint();
});

/* ======================================================================= *
 *  CONFIDENTIALITY — 2. Breaking Caesar (brute force + frequency)         *
 * ======================================================================= */
MAJAL.widget("caesarbreak", function (root) {
  var mount = root.querySelector("#cbreak-mount");
  var SECRET_SHIFT = 7;
  var cipher = caesar("MEET THE SOURCE AT MIDNIGHT", SECRET_SHIFT);

  mount.appendChild(MAJAL.el("p", { class: "hint", html:
    "You intercepted this ciphertext. You do <b>not</b> know the key. Try all 25 — one of them is English." }));
  mount.appendChild(MAJAL.el("div", { class: "cz-out", text: cipher, style: "margin-bottom:12px" }));

  var list = MAJAL.el("div", { class: "brute-list" });
  var solved = false;
  for (var n = 1; n <= 25; n++) {
    (function (n) {
      var plain = caesar(cipher, -n);
      var row = MAJAL.el("div", { class: "brute-row" }, [
        MAJAL.el("span", { class: "brute-k", text: "-" + (n < 10 ? "0" : "") + n }),
        MAJAL.el("span", { class: "brute-t", text: plain })
      ]);
      row.addEventListener("click", function () {
        if (solved) return;
        if (n === SECRET_SHIFT) {
          row.classList.add("hit"); solved = true;
          verdict.innerHTML = "Key was <b>" + SECRET_SHIFT + "</b>. A computer tries all 25 in a microsecond — " +
            "so this &ldquo;encryption&rdquo; protects nothing.";
          verdict.className = "cz-verdict good";
        } else {
          row.classList.add("miss");
          setTimeout(function () { row.classList.remove("miss"); }, 400);
        }
      });
      list.appendChild(row);
    })(n);
  }
  mount.appendChild(list);
  var verdict = MAJAL.el("div", { class: "cz-verdict", html:
    "Click the line that reads as English. &nbsp;<span class='hint'>The whole keyspace fits on one screen — that's the problem.</span>" });
  mount.appendChild(verdict);
  mount.appendChild(MAJAL.el("div", { class: "callout hot", style: "margin-top:14px;font-size:.72em", html:
    "Real encryption keeps the <em>method</em> public and makes the <em>keyspace</em> astronomical. " +
    "AES-256 has <b>2<sup>256</sup></b> keys — more than there are atoms in the observable universe. " +
    "Trying them all is not slow; it is physically impossible." }));
});

/* ======================================================================= *
 *  CONFIDENTIALITY — 4. Diffie-Hellman as paint mixing                    *
 * ======================================================================= */
MAJAL.widget("dh", function (root) {
  var mount = root.querySelector("#dh-mount");
  var BASE = [232, 205, 40];             // public base "paint" (yellow)

  function hue(deg) { // secret colour from a slider (vivid)
    var h = deg / 60, x = 1 - Math.abs((h % 2) - 1), r, g, b;
    if (h < 1) { r = 1; g = x; b = 0; } else if (h < 2) { r = x; g = 1; b = 0; }
    else if (h < 3) { r = 0; g = 1; b = x; } else if (h < 4) { r = 0; g = x; b = 1; }
    else if (h < 5) { r = x; g = 0; b = 1; } else { r = 1; g = 0; b = x; }
    return [Math.round(r * 220 + 20), Math.round(g * 220 + 20), Math.round(b * 220 + 20)];
  }
  function mix() { var a = arguments; var r = 0, g = 0, b = 0;
    for (var i = 0; i < a.length; i++) { r += a[i][0]; g += a[i][1]; b += a[i][2]; }
    return [r / a.length | 0, g / a.length | 0, b / a.length | 0]; }
  function css(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }

  function swatch(label, sub) {
    var sw = MAJAL.el("div", { class: "dh-swatch" });
    var chip = MAJAL.el("div", { class: "dh-chip" });
    sw.appendChild(chip);
    sw.appendChild(MAJAL.el("div", { class: "dh-lbl", html: label }));
    if (sub) sw.appendChild(MAJAL.el("div", { class: "hint", text: sub }));
    sw._chip = chip; return sw;
  }

  var aRange = MAJAL.el("input", { type: "range", min: "0", max: "359", value: "20" });
  var bRange = MAJAL.el("input", { type: "range", min: "0", max: "359", value: "210" });

  var swBase = swatch("Public base<br><span class='hint'>everyone sees this</span>");
  var swA = swatch("Alice's mix<br><span class='hint'>base + her secret · sent openly</span>");
  var swB = swatch("Bob's mix<br><span class='hint'>base + his secret · sent openly</span>");
  var swShared = swatch("SHARED SECRET<br><span class='hint'>both compute the same colour</span>");

  function paint() {
    var aSec = hue(+aRange.value), bSec = hue(+bRange.value);
    var aMix = mix(BASE, aSec), bMix = mix(BASE, bSec);
    var shared = mix(BASE, aSec, bSec);       // symmetric: both paths reach this
    swBase._chip.style.background = css(BASE);
    swA._chip.style.background = css(aMix);
    swB._chip.style.background = css(bMix);
    swShared._chip.style.background = css(shared);
  }
  aRange.addEventListener("input", paint);
  bRange.addEventListener("input", paint);

  mount.appendChild(MAJAL.el("div", { class: "dh-row" }, [ swBase, swA, swB, swShared ]));
  mount.appendChild(MAJAL.el("div", { class: "dh-ctl" }, [
    MAJAL.el("label", { class: "cz-lbl", html: "Alice's secret colour" }), aRange,
    MAJAL.el("label", { class: "cz-lbl", html: "Bob's secret colour" }), bRange
  ]));
  mount.appendChild(MAJAL.el("div", { class: "callout", style: "margin-top:12px;font-size:.72em", html:
    "Eve saw everything that crossed the wire — the <b>base</b>, <b>Alice's mix</b>, and <b>Bob's mix</b> — yet she cannot reproduce the shared colour, " +
    "because <em>un-mixing paint is hard</em>. Alice and Bob agreed on a secret <b>without ever sending it</b>. " +
    "Real Diffie-Hellman replaces paint with modular arithmetic, where the mixing genuinely can't be reversed." }));
  paint();
});

/* ======================================================================= *
 *  INTEGRITY — 1. The hash avalanche                                      *
 * ======================================================================= */
MAJAL.widget("avalanche", function (root) {
  var mount = root.querySelector("#aval-mount");
  var input = MAJAL.el("input", { type: "text", value: "Majal Cyber 2026",
    style: "width:100%;font-size:.9em" });
  var grid = MAJAL.el("div", { class: "hashgrid" });
  var cells = [];
  for (var i = 0; i < 64; i++) { var s = MAJAL.el("span", { class: "hx" }); grid.appendChild(s); cells.push(s); }
  var meta = MAJAL.el("div", { class: "hash-meta" });
  var prev = "";

  function render() {
    var h = MAJAL.sha256(input.value);
    var changed = 0;
    for (var i = 0; i < 64; i++) {
      if (h[i] !== cells[i].textContent) {
        cells[i].textContent = h[i];
        if (prev) { cells[i].classList.remove("flip"); void cells[i].offsetWidth; cells[i].classList.add("flip"); changed++; }
      }
    }
    if (prev) meta.innerHTML = "One edit &rarr; <b>" + Math.round(changed / 64 * 100) +
      "%</b> of the fingerprint changed. Every character always flips ~half of it — that's the <em>avalanche effect</em>.";
    else meta.innerHTML = "This 64-character fingerprint is SHA-256. Now change <b>one</b> character above and watch.";
    prev = h;
  }
  input.addEventListener("input", render);

  mount.appendChild(MAJAL.el("label", { class: "cz-lbl", text: "Type anything — this is the input" }));
  mount.appendChild(input);
  mount.appendChild(MAJAL.el("div", { class: "cz-lbl", style: "margin-top:12px", text: "SHA-256 fingerprint" }));
  mount.appendChild(grid);
  mount.appendChild(meta);
  mount.appendChild(MAJAL.el("div", { class: "hash-props" }, [
    MAJAL.el("span", { class: "hp", html: "<b>One-way</b> — you can't get the input back" }),
    MAJAL.el("span", { class: "hp", html: "<b>Deterministic</b> — same input, same hash, forever" }),
    MAJAL.el("span", { class: "hp", html: "<b>Fixed size</b> — a book or a byte, always 64 hex chars" }),
    MAJAL.el("span", { class: "hp", html: "<b>Avalanche</b> — one bit in flips half the bits out" })
  ]));
  render();
});

/* ======================================================================= *
 *  INTEGRITY — 2. Tamper / checksum verification                         *
 * ======================================================================= */
MAJAL.widget("checksum", function (root) {
  var mount = root.querySelector("#chk-mount");
  var ORIGINAL =
    "#!/bin/sh\n" +
    "# majal-installer v2.4  (official build)\n" +
    "echo \"Installing Majal Lab tools...\"\n" +
    "curl -s https://majal.sa/pkg | tar xz\n";
  var published = MAJAL.sha256(ORIGINAL);

  mount.appendChild(MAJAL.el("p", { class: "hint", html:
    "You downloaded an install script. The vendor publishes its SHA-256 on their website. " +
    "Edit even one byte below — a swapped URL, an added line — and see what the checksum says." }));

  var ta = MAJAL.el("textarea", { rows: "5", spellcheck: "false", style: "font-size:.62em" });
  ta.value = ORIGINAL;

  var pub = MAJAL.el("div", { class: "chk-line", html: "<span class='chk-tag'>published</span> <span class='mono chk-hash'>" + published + "</span>" });
  var cur = MAJAL.el("div", { class: "chk-line" });
  var verdict = MAJAL.el("div", { class: "chk-verdict" });

  function check() {
    var h = MAJAL.sha256(ta.value);
    var ok = h === published;
    cur.innerHTML = "<span class='chk-tag'>yours</span> <span class='mono chk-hash " + (ok ? "" : "bad") + "'>" + h + "</span>";
    verdict.textContent = ok ? "✓ VERIFIED — the file is byte-for-byte what the vendor published. Safe to run."
                             : "✗ TAMPERED — the file does not match. Do NOT run it.";
    verdict.className = "chk-verdict " + (ok ? "ok" : "bad");
  }
  ta.addEventListener("input", check);

  mount.appendChild(ta);
  mount.appendChild(MAJAL.el("button", { class: "btn ghost", text: "↺ restore original", style: "margin:8px 0",
    onclick: function () { ta.value = ORIGINAL; check(); } }));
  mount.appendChild(pub);
  mount.appendChild(cur);
  mount.appendChild(verdict);
  mount.appendChild(MAJAL.el("p", { class: "hint", html:
    "This is <em>integrity</em>: not secrecy, but proof that data is <b>exactly what it should be</b>. " +
    "The same mechanism catches a corrupted download, a modified log, or a swapped update." }));
  check();
});

/* ======================================================================= *
 *  INTEGRITY — 3. Why passwords are salted                                *
 * ======================================================================= */
MAJAL.widget("salt", function (root) {
  var mount = root.querySelector("#salt-mount");
  var SALT_A = "x9f2", SALT_B = "q7k1";
  var pw = MAJAL.el("input", { type: "text", value: "P@ssw0rd", style: "width:220px;font-size:.85em" });
  var useSalt = MAJAL.el("input", { type: "checkbox" });

  var rowA = MAJAL.el("div", { class: "salt-row" });
  var rowB = MAJAL.el("div", { class: "salt-row" });
  var verdict = MAJAL.el("div", { class: "salt-verdict" });

  function shortH(s) { return MAJAL.sha256(s); }
  function render() {
    var salted = useSalt.checked;
    var inA = salted ? SALT_A + ":" + pw.value : pw.value;
    var inB = salted ? SALT_B + ":" + pw.value : pw.value;
    var hA = shortH(inA), hB = shortH(inB);
    rowA.innerHTML = "<b>User A</b> <span class='mono salt-in'>" + (salted ? "salt <i>" + SALT_A + "</i> + " : "") + MAJAL.esc(pw.value) +
      "</span> &rarr; <span class='mono salt-h'>" + hA.slice(0, 24) + "…</span>";
    rowB.innerHTML = "<b>User B</b> <span class='mono salt-in'>" + (salted ? "salt <i>" + SALT_B + "</i> + " : "") + MAJAL.esc(pw.value) +
      "</span> &rarr; <span class='mono salt-h'>" + hB.slice(0, 24) + "…</span>";
    if (!salted) {
      verdict.innerHTML = "Both users chose the same password, so their stored hashes are <b>identical</b>. " +
        "An attacker who steals the database sees the matches instantly — and can crack every common password once with a pre-built <em>rainbow table</em>.";
      verdict.className = "salt-verdict bad";
    } else {
      verdict.innerHTML = "Same password, but a unique random <em>salt</em> per user makes the hashes <b>completely different</b>. " +
        "The precomputed tables are useless; the attacker must attack each account separately.";
      verdict.className = "salt-verdict ok";
    }
  }
  pw.addEventListener("input", render);
  useSalt.addEventListener("change", render);

  mount.appendChild(MAJAL.el("div", { class: "salt-ctl" }, [
    MAJAL.el("label", { class: "cz-lbl", text: "Everyone's favourite password" }), pw,
    MAJAL.el("label", { class: "salt-toggle" }, [ useSalt, MAJAL.el("span", { text: " add a unique salt per user" }) ])
  ]));
  mount.appendChild(rowA);
  mount.appendChild(rowB);
  mount.appendChild(verdict);
  mount.appendChild(MAJAL.el("p", { class: "hint", html:
    "Servers never store your password — only its hash (integrity again: they verify without knowing). " +
    "The <b>salt</b> is what stops one leaked database from cracking millions of accounts at once." }));
  render();
});

/* ======================================================================= *
 *  AVAILABILITY — live DDoS simulation                                    *
 * ======================================================================= */
MAJAL.widget("ddos", function (root) {
  var mount = root.querySelector("#ddos-mount");
  var W = 1040, H = 240;
  var canvas = MAJAL.el("canvas", { width: W, height: H, class: "ddos-canvas" });
  var ctx = canvas.getContext("2d");

  var attack = MAJAL.el("input", { type: "range", min: "0", max: "100", value: "0", style: "width:200px" });
  var rateLimit = MAJAL.el("input", { type: "checkbox" });
  var scaleOut = MAJAL.el("input", { type: "checkbox" });
  var big = MAJAL.el("div", { class: "ddos-big" });
  var sub = MAJAL.el("div", { class: "hint" });

  var CSSV = getComputedStyle(document.documentElement);
  var C_GOOD = (CSSV.getPropertyValue("--good") || "#1f8f89").trim();
  var C_BAD = (CSSV.getPropertyValue("--bad") || "#d64545").trim();
  var C_PETROL = (CSSV.getPropertyValue("--petrol") || "#00567d").trim();

  var packets = [];
  var tokens = 0, CAP = 55;               // requests the server can accept per second
  var served = 0, dropped = 0;            // legit accounting (rolling)
  var legitSpawn = 0, atkSpawn = 0;

  function spawn(type) {
    packets.push({ x: -10, y: 30 + Math.random() * (H - 60), t: type, state: "fly",
      vy: (Math.random() - 0.5) * 0.4 });
  }

  var last = performance.now();
  function frame(now) {
    if (!document.body.contains(canvas)) return;     // stop if slide gone
    var dt = Math.min(0.05, (now - last) / 1000); last = now;

    var cap = CAP * (scaleOut.checked ? 2 : 1);
    tokens = Math.min(cap, tokens + cap * dt);        // token bucket refills to capacity/sec

    // spawn rates
    legitSpawn += 18 * dt;                            // steady stream of real users
    while (legitSpawn >= 1) { spawn("legit"); legitSpawn--; }
    var atkRate = (+attack.value) * 2.2;
    atkSpawn += atkRate * dt;
    while (atkSpawn >= 1) { spawn("atk"); atkSpawn--; }

    var serverX = W - 120;
    ctx.clearRect(0, 0, W, H);

    // server box
    var overload = tokens < 1 && (+attack.value) > 0;
    ctx.fillStyle = overload ? C_BAD : C_PETROL;
    ctx.fillRect(serverX + 40, H / 2 - 42, 60, 84);
    ctx.fillStyle = "#eef3f3"; ctx.font = "12px monospace"; ctx.textAlign = "center";
    ctx.fillText("SERVER", serverX + 70, H / 2 + 4);

    for (var i = packets.length - 1; i >= 0; i--) {
      var p = packets[i];
      if (p.state === "fly") {
        p.x += 240 * dt; p.y += p.vy;
        if (p.x >= serverX) {
          // arrived — rate limiting can filter attack traffic before it costs capacity
          if (p.t === "atk" && rateLimit.checked && Math.random() < 0.82) {
            p.state = "filtered"; p.life = 0.5;
          } else if (tokens >= 1) {
            tokens -= 1; p.state = "done"; p.life = 0.35;
            if (p.t === "legit") served += 1;
          } else {
            p.state = "drop"; p.vy = 1.6; p.life = 0.9;
            if (p.t === "legit") dropped += 1;
          }
        }
      } else {
        p.life -= dt;
        if (p.state === "drop") { p.y += 160 * dt; }
        if (p.life <= 0) { packets.splice(i, 1); continue; }
      }

      // draw
      var r = p.t === "atk" ? 3.2 : 4.2;
      if (p.state === "drop") ctx.fillStyle = C_BAD;
      else if (p.state === "filtered") ctx.fillStyle = "rgba(140,160,165,.7)";
      else if (p.state === "done") ctx.fillStyle = "#fff";
      else ctx.fillStyle = p.t === "atk" ? C_BAD : C_GOOD;
      ctx.globalAlpha = p.state === "drop" || p.state === "filtered" ? Math.max(0, p.life) : 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (packets.length > 1200) packets.splice(0, packets.length - 1200);

    // rolling decay so the % reflects "recently"
    served *= (1 - 0.4 * dt); dropped *= (1 - 0.4 * dt);
    var total = served + dropped;
    var pct = total < 1 ? 100 : Math.round(served / total * 100);
    big.textContent = "Legitimate users served: " + pct + "%";
    big.style.color = pct > 80 ? C_GOOD : (pct > 40 ? C_PETROL : C_BAD);
    sub.innerHTML = (+attack.value) === 0
      ? "No attack. The server easily serves every real request (green)."
      : (pct > 80 ? "Mitigations are holding — real users still get through."
                  : "Attack traffic (red) is eating the server's capacity, so real users (green) get dropped.");

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  mount.appendChild(canvas);
  mount.appendChild(big);
  mount.appendChild(sub);
  mount.appendChild(MAJAL.el("div", { class: "ddos-ctl" }, [
    MAJAL.el("label", { class: "cz-lbl", text: "Attack traffic" }), attack,
    MAJAL.el("label", { class: "salt-toggle" }, [ rateLimit, MAJAL.el("span", { text: " rate limiting / filtering" }) ]),
    MAJAL.el("label", { class: "salt-toggle" }, [ scaleOut, MAJAL.el("span", { text: " scale out (2× servers)" }) ])
  ]));
  mount.appendChild(MAJAL.el("p", { class: "hint", html:
    "This is <em>availability</em>: the data isn't stolen or altered — legitimate users simply <b>can't reach it</b>. " +
    "A DDoS wastes a finite resource. Ransomware attacks the same property by locking the files. " +
    "Turn up the attack, then try the defences." }));
});

/* ======================================================================= *
 *  SYNTHESIS — which property did each attack break?                      *
 * ======================================================================= */
MAJAL.widget("synth", function (root) {
  var mount = root.querySelector("#synth-mount");
  var CARDS = [
    { t: "An attacker phishes a password and quietly reads two years of a CEO's email.", a: ["C"] },
    { t: "Ransomware encrypts every file on the server. Nothing is stolen — you just can't open anything.", a: ["A"] },
    { t: "Using a web bug, an attacker changes their own bank balance from 8,200 to 82,000.", a: ["I"] },
    { t: "A flood of junk traffic knocks the public website offline for six hours.", a: ["A"] },
    { t: "Malware steals the customer database AND corrupts the records it leaves behind.", a: ["C", "I"] }
  ];
  var LABELS = { C: "Confidentiality", I: "Integrity", A: "Availability" };
  var done = 0;
  var score = MAJAL.el("div", { class: "synth-score" });

  mount.appendChild(MAJAL.el("p", { class: "hint", html:
    "For each incident, tap every property that was broken. Some break more than one. " +
    "This is the reflex every analyst builds: <em>which of the three just failed?</em>" }));

  CARDS.forEach(function (card) {
    var picked = {};
    var settled = false;
    var row = MAJAL.el("div", { class: "synth-card" });
    row.appendChild(MAJAL.el("div", { class: "synth-t", text: card.t }));
    var tri = MAJAL.el("div", { class: "tri" });
    var btns = {};
    ["C", "I", "A"].forEach(function (p) {
      var b = MAJAL.el("button", { text: LABELS[p] });
      btns[p] = b;
      b.addEventListener("click", function () {
        if (settled) return;
        picked[p] = !picked[p];
        b.classList.toggle("sel");
        var want = card.a.slice().sort().join("");
        var got = Object.keys(picked).filter(function (k) { return picked[k]; }).sort().join("");
        if (want === got) {
          settled = true; done++;
          ["C", "I", "A"].forEach(function (k) {
            btns[k].classList.remove("sel"); btns[k].disabled = true;
            if (card.a.indexOf(k) !== -1) btns[k].classList.add("correct");
          });
          note.textContent = "✓  " + card.a.map(function (k) { return LABELS[k]; }).join(" + ");
          note.className = "synth-note ok";
          score.textContent = done < CARDS.length ? (done + " / " + CARDS.length + " solved")
                                                  : ("All " + CARDS.length + " solved — you've got the reflex.");
        }
      });
      tri.appendChild(b);
    });
    var note = MAJAL.el("div", { class: "synth-note", text: "tap the property/properties broken" });
    row.appendChild(tri); row.appendChild(note);
    mount.appendChild(row);
  });
  mount.appendChild(score);
});
