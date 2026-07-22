You are continuing Day 1 of the Majal cybersecurity course — a 5-day, offline
(air-gapped, runs from file://) Reveal.js deck for Saudi students with some CS
background (~6-hour sessions). Your job is to build the REMAINING Day-1 sections
in the established house style.

FIRST, before writing anything, read these and match them exactly:
- WIDGET_AUTHORING_GUIDE.md  (repo root) — this is THE standard. Follow it.
- day1/index.html            — the deck; see how slides are structured.
- day1/widgets/enc_dh.html, enc_hybrid.html, enc_lab.html — reference widgets
  (live manipulator / stepped player / adversary sandbox archetypes).
- day1/widgets/_shared.css    — shared widget CSS + palette.

REPO / DEPLOY:
- Repo: obaidiDev/Majal2026-CyberSecurity, branch master. The user inspects on
  GitHub Pages, so you MUST commit AND push. Live:
  https://obaididev.github.io/Majal2026-CyberSecurity/day1/
- .nojekyll at repo root is required (Jekyll drops files starting with "_").
- Cache-bust with ?v=N on iframe src / script / link whenever you change a file.
- After pushing, verify against the LIVE origin (curl with ?cb=$RANDOM to dodge
  the ~10-min HTML edge cache), then tell the user to hard-refresh (Ctrl+Shift+R).
- Git hygiene: stage explicit paths; do NOT stage the repo-root index.html
  (unrelated user edits) or .claude/. A git add that lists an already-deleted
  path aborts the whole add and stages nothing — check `git status --short`
  shows staged (M/A), not unstaged ( M), before committing.

HARD CONSTRAINTS (offline):
- No CDN, no web fonts, no fetch/XHR. Everything inline or vendored. Embed images
  as base64 data URIs. Use _shared.css fonts/palette. Test over file://.
- Widgets are standalone HTML in day1/widgets/, embedded via
  <iframe class="wframe" style="height:NNNpx" src="widgets/x.html?v=1" scrolling="auto">.
- Slides are 1280x720, top-aligned; after kicker+title you have ~560px of iframe
  height. Design to fit; screenshot-check nothing clips or overlaps.

THE BAR (this is why the earlier attempts got rejected — do not repeat):
- Build an interactive ONLY where manipulation reveals something a CS-literate
  learner does NOT already know. If the point is common sense (e.g. "password
  reuse is risky"), a toggle-sandbox that restates it is WORSE than a sentence —
  delete it and write a sharp explanation using the deck's native .card /
  .callout styles. Litmus: if one sentence conveys it, use a sentence.
- When you DO build an interactive, it must be a toy you DRIVE with real motion
  and (ideally) REAL VISUALS — hand-authored SVG or canvas/pixel work, not
  styled <div> tiles + emoji. Tiles are the floor, not the bar.
- Never build quiz-shaped "pick option -> reveal answer."
- On-screen text is SPARSE (phrases, not paragraphs). Put the explanation in
  <aside class="notes"> for the presenter.

WORKFLOW (do this per topic, one at a time):
1. PITCH the topic to the user in PROSE (do NOT use the AskUserQuestion
   multiple-choice tool — the user rejects it). Say which parts you'll deliver as
   plain explanation vs. as an interactive, and WHY (apply the filter above).
   Ask your open questions and WAIT for alignment before building.
2. Build it. Verify with headless screenshots at the real iframe size
   (chrome-headless-shell --headless --window-size=1080,HEIGHT --screenshot).
   Verify any math independently in node and check toy-hash collisions.
3. Commit (message ending with the Co-Authored-By trailer the repo uses), push,
   poll the live URL until the new file is 200 and index references it, then
   report and ask for feedback.

WHAT'S ALREADY DONE (don't redo):
- Title, CIA overview.
- Confidentiality: Caesar, Caesar-break, Symmetric (XOR), Asymmetric (tiny-RSA),
  Diffie-Hellman.
- Crypto capstone: digital envelope (stepped), Tamper Lab (sign+encrypt sandbox).
- Integrity: hash avalanche, checksum/tamper, salted-password.
- Availability: DDoS. Synthesis: "which property broke?".
- "They log in, they don't hack": two SPARSE explanation slides (reality +
  fix with password-manager & haveibeenpwned suggestions). (Note: earlier
  interactive versions of these were removed for being truisms — heed the filter.)

REMAINING TO BUILD (in order, one at a time, pitch-then-build):
1. Risk vocabulary — recommended: ONE running example threaded through every term
   (asset, threat, vulnerability, exploit, likelihood, impact, risk, control,
   residual risk) as clean explanation; the ONE spot that may warrant an
   interactive is a risk matrix (likelihood x impact) where you drag risks and
   apply controls to watch them move zones (reveals "two levers + prioritize").
   Consider building that matrix as real hand-drawn SVG to set the visual bar.
2. Threat actors — who attacks and why (script kiddie, criminal, insider,
   nation-state, hacktivist) by motivation/capability. Keep threat actors OUT of
   the risk-vocab slide.
3. Network fundamentals — basic and animated; watch for overlap with Day 3.

Style/brand: Alice=teal (#1F8F89), Bob=petrol (#00567C), attacker/Eve=red
(#D64545); full palette in _shared.css and the guide. Simulation-first where it
earns its place; enjoyable, not time-consuming.

Start by reading the guide and reference widgets, then PITCH the Risk-vocabulary
slide to me and wait for my answer before building.
