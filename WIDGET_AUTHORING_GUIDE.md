# Majal Course — Interactive Widget Authoring Guide

**Read this before building any slide content.** It is the standard for every
interactive in this course. The bar is the Majal **AI-track** decks
(e.g. `iifadel.github.io/majal-ai-track-2026`, day 3 "convolution-live"):
widgets that **animate and let you play with real, useful visuals** — images,
pixels, moving shapes, drawn diagrams — **not walls of text and `<div>`s.**

If your widget is a form the learner *reads*, you have failed the bar. It must
be a **toy the learner drives**, where every control produces a visible
consequence.

---

## 0. The one rule that matters most

> **Show the concept as a moving picture the learner manipulates — not as text.**

The AI-track convolution widget draws a **real photo** on a `<canvas>`, walks a
kernel box across it, and paints the output feature map pixel-by-pixel as you
press Play and change the kernel/stride/padding. That is the target: *spatial,
visual, animated, configurable, consequence-driven.*

Before writing a widget, ask: **"What is the moving image here, and what does the
learner grab to change it?"** If your answer is "a table of numbers updates,"
push harder — find the picture.

---

## 1. Non-negotiable constraints (offline / air-gapped)

The decks run from `file://` on machines with **no internet**. Therefore:

- **No CDN, no external `<script>`/`<link>`, no web fonts, no `fetch`/XHR/WebSocket.**
- **Everything inline or vendored.** Images are embedded as `data:` URIs
  (base64). CSS/JS live in the widget file or in `day1/widgets/_shared.css`.
- Fonts: use the system stack already in `_shared.css`
  (`"Avenir Next", "Segoe UI", system-ui, …`) and
  `"JetBrains Mono", Menlo, Consolas, monospace`. **Do not** `@import` Google Fonts.
- No analytics, no telemetry, no third-party anything.

Test everything by opening the raw file over `file://` — if it needs the network,
it is broken.

---

## 2. Architecture — how a widget plugs into the deck

Widgets are **standalone HTML files in `day1/widgets/`**, embedded in a Reveal
slide via an iframe. This isolates the widget's layout/CSS/JS from the deck so it
can never collide with the slide.

**In the slide (`day1/index.html`):**
```html
<section>
  <p class="kicker">Section · one-line context</p>
  <h2>A single-line title</h2>
  <iframe class="wframe" style="height:566px"
          src="widgets/my_widget.html?v=1"
          title="What it is" scrolling="auto"></iframe>
  <aside class="notes">Presenter notes: what to land, what to click.</aside>
</section>
```

**The widget file (`day1/widgets/my_widget.html`):**
```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="_shared.css">
<style> /* widget-specific CSS here */ </style>
</head><body>
  <div class="w"> … your scene … </div>
  <script> /* self-contained JS, no external deps */ </script>
</body></html>
```

`_shared.css` gives you the `.w` card, pill `button`s (`.primary` teal, `.on`
petrol), `canvas` defaults, and the palette. Reuse it.

> There is also an **in-page widget registry** (`MAJAL.widget(id, fn)` +
> `data-w="id"` on the section + a `#id-mount` div) used by older DOM widgets in
> `day1/js/widgets/`. **Prefer the iframe pattern for anything new** — it is
> cleaner and isolates failures.

---

## 3. Deployment gotchas (GitHub Pages) — these WILL bite you

- **`.nojekyll` is required at the repo root.** GitHub Pages runs Jekyll by
  default, which **silently drops any file whose name starts with `_`** — so
  `_shared.css` 404s and every widget loads unstyled. The `.nojekyll` file
  disables Jekyll. Do not remove it.
- **Cache-bust on every change.** Pages serves JS/CSS/HTML with
  `cache-control: max-age=600`. Bump the `?v=N` query on the iframe `src` (and on
  `<script>`/`<link>` tags) whenever you change a file, or learners get the stale
  version. HTML pages are edge-cached ~10 min even after deploy.
- **Slide canvas is `1280 × 720`, top-aligned** (see `day1/js/state.js`). After
  the kicker + title you have roughly **~560 px of iframe height**. Design to fit;
  set the iframe `height` explicitly. Use `scrolling="auto"` only if an optional
  expand can overflow.
- After pushing, **verify against the live origin**, not just your browser
  (which may be cached). Poll until the new file is `200` and the index
  references it.

---

## 4. The interactivity bar — what "as good as the AI slides" means

Rank your idea against these. Aim for the top of each axis.

**A. Real visuals over text.**
- **Do:** draw on `<canvas>` — images, pixels, particles, graphs, geometry,
  animated diagrams. Embed real photos/icons as base64 and manipulate their
  pixels (`getImageData`/`putImageData`).
- **Don't:** stack `<div>`s of prose and call it interactive. A wall of captions
  is a document, not a simulation.

**B. Direct manipulation with continuous feedback.**
- Sliders, drags, toggles, and clicks that **recompute the picture in real time**
  as you move them — not "set a value, press submit."

**C. Animation.**
- Things **move**: `requestAnimationFrame` loops, CSS transitions, a Play button
  that runs a sequence, a value that travels/scrambles/fills. Motion carries
  meaning (a packet crossing a wire, a kernel walking an image, half a hash
  flipping).

**D. Agency / role-play.**
- Let the learner **be** someone with stakes: the attacker on the wire, the CPU
  scheduler, the router. Give them buttons that *do* something and outcomes that
  can succeed or fail. (See the "Tamper Lab" — the learner plays the attacker and
  watches attacks get **BLOCKED** or **GET THROUGH**.)

**E. Consequence-driven, not quiz-shaped.**
- Every control changes an outcome the learner can see and reason about.
- **Never** build "pick the right option → reveal the answer." That is a quiz,
  not a simulation. Banned.

**F. Honest at toy scale.**
- Use **real mechanisms with small numbers** (e.g. tiny-RSA `e=3, n=55`, an 8×8
  image, a 3×3 kernel). Compute the real thing; then state the real-world scale in
  one line ("real keys are 2048-bit / real images are millions of pixels"). Never
  fake the math.

**G. Reveal the mechanism through play.**
- The learner should *discover* the rule by manipulating, not read it in a
  paragraph. The paragraph is a fallback, kept to one line.

---

## 5. Recipes (copy these)

### 5.1 Crisp canvas with DPR + animation loop
```js
var canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d");
var W = 900, H = 336;
function fit() {
  var cssW = canvas.clientWidth || W, dpr = window.devicePixelRatio || 1;
  canvas.width = cssW * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = cssW; draw();
}
window.addEventListener("resize", fit);
function loop(now) { update(now); draw(); raf = requestAnimationFrame(loop); }
```

### 5.2 A REAL image you can manipulate (the AI-track technique)
Embed a photo as base64, draw it, read its pixels, transform, paint the result.
```js
var img = new Image();
img.onload = function () {
  var c = document.createElement("canvas"); c.width = N; c.height = N;
  var g = c.getContext("2d"); g.drawImage(img, 0, 0, N, N);
  var px = g.getImageData(0, 0, N, N).data;      // real pixels to compute on
  // …run your convolution / filter / edge-detect over px…
  var out = octx.createImageData(N, N);
  for (var i = 0; i < N*N; i++) { var v = compute(i, px);
    out.data[i*4]=v; out.data[i*4+1]=v; out.data[i*4+2]=v; out.data[i*4+3]=255; }
  octx.putImageData(out, 0, 0);
};
img.src = "data:image/jpeg;base64,/9j/4AAQ…";     // embedded, offline-safe
```
Use `imageSmoothingEnabled = false` when scaling small grids so pixels stay crisp.

### 5.3 Three proven widget archetypes
- **Live manipulator** — sliders/toggles recompute a canvas/scene every frame
  (Diffie–Hellman: drag secrets, both sides land on the same key; convolution:
  change the kernel, watch the feature map).
- **Stepped player** — `▶ Play / Next / Back / Reset` with a caption bar and dot
  progress; a scene **accumulates** as steps advance (the digital-envelope
  widget). Good for a fixed narrative with real values.
- **Adversary / agent sandbox** — the learner plays a role, flips a few
  protections, fires actions, and each action carries a live
  **succeeds/blocked** badge (the Tamper Lab). Best for "why you need X."

### 5.4 Brand palette (use these exact values)
```
petrol   #00567C   teal     #1F8F89   turquoise #33D3CB   yellow   #F2D200
ink      #12333D   muted    #5C7880   bad/red   #D64545   dark bg  #04303F
page bg  #F6F8F8   card bd  #E0E7E8   soft bd   #CDD8DA
```
Roles across the crypto deck: **Alice = teal, Bob = petrol, Eve/attacker = red.**
Keep them consistent so colour itself carries meaning.

---

## 6. Testing workflow (do this every time)

Render the widget headless at the real iframe size and **look at the screenshot**
— check nothing overlaps, nothing clips, and the numbers are right.

```bash
CH=~/.cache/puppeteer/chrome-headless-shell/.../chrome-headless-shell
"$CH" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
      --window-size=1080,566 --screenshot=out.png "file://$PWD/my_widget.html"
```
- Add a `?state=…` query hook so you can screenshot specific states.
- Verify any math independently (e.g. run the same `modpow`/hash in `node`) and
  **check for collisions** in toy hashes before shipping.
- After deploy, poll the **live** URL until the new file is `200` and the index
  references it; then hard-refresh (`Ctrl+Shift+R`).

---

## 7. Pre-ship checklist

- [ ] Runs fully offline over `file://` (no network, no CDN, no web fonts).
- [ ] There is a **moving/visual** element the learner **manipulates** — not just text.
- [ ] Every control has a **visible consequence**; nothing is a read-only form.
- [ ] It is **not** a quiz ("pick option → reveal answer").
- [ ] Real mechanism at toy scale; real-world scale stated in one line.
- [ ] Fits ~560 px tall at ~1080 px wide; nothing clips or overlaps (screenshot-checked).
- [ ] Uses `_shared.css` + the brand palette; Alice/Bob/attacker colours consistent.
- [ ] Cache-bust `?v=N` bumped; `.nojekyll` present.
- [ ] Presenter `<aside class="notes">` says what to click and what to land.

---

## 8. Reference widgets in this repo

Study these before building — they set the house style:

| File | Archetype | Why it's good |
|------|-----------|---------------|
| `day1/widgets/enc_dh.html` | live manipulator | drag secrets → both sides compute the same key live; Eve visibly stuck |
| `day1/widgets/enc_hybrid.html` | stepped player | Play/Next/Back, scene accumulates, real toy-RSA numbers, dot progress |
| `day1/widgets/enc_lab.html` | adversary sandbox | play the attacker; live BLOCKED/GETS-THROUGH badges; real signature math |
| `day1/js/widgets/cia.js` (`avalanche`) | live manipulator | type one char, watch ~half a real SHA-256 flip |

**The gap to close next:** these are strong on interaction but still lean on
drawn shapes and text. The AI-track bar adds **real images and pixel-level
animation** (§5.2). When a concept has a natural picture — a photo, a map, a
signal, a grid of cells — **draw it and animate it.** That is what makes a widget
feel like the AI slides instead of a clever form.
