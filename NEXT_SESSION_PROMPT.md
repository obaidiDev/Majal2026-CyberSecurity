You are working on the Majal cybersecurity course — a 5-day, offline
(air-gapped, runs from file://) Reveal.js deck for Saudi students with some CS
background (~6-hour sessions). **Day 1 is COMPLETE (22 slides).** Your job now is
either to refine Day 1 or to start a later day, in the established house style.

FIRST, before writing anything, read these and match them exactly:
- WIDGET_AUTHORING_GUIDE.md  (repo root) — this is THE standard. Follow it.
- day1/index.html            — the finished Day-1 deck; see how slides are built.
- day1/widgets/*.html         — reference widgets (archetypes below).
- day1/widgets/_shared.css    — shared widget CSS + palette.

REPO / DEPLOY:
- Repo: obaidiDev/Majal2026-CyberSecurity, branch master. The user inspects on
  GitHub Pages, so you MUST commit AND push. Live:
  https://obaididev.github.io/Majal2026-CyberSecurity/day1/
- .nojekyll at repo root is required (Jekyll drops files starting with "_").
- Cache-bust with ?v=N on iframe src / script / link whenever you change a file
  (including course.css / cia.js — bump their ?v= in index.html).
- After pushing, verify against the LIVE origin (curl with ?cb=$RANDOM to dodge
  the ~10-min HTML edge cache), then tell the user to hard-refresh (Ctrl+Shift+R).
- Git hygiene: stage explicit paths; do NOT stage the repo-root index.html
  (unrelated user edits) or .claude/. A git add that lists an already-deleted
  path aborts the whole add and stages nothing — check `git status --short`
  shows staged (M/A), not unstaged ( M), before committing.

HARD CONSTRAINTS (offline at RUNTIME):
- The DECK must run with no network: no CDN, no web fonts, no fetch/XHR.
  Everything inline or vendored. Use _shared.css fonts/palette. Test over file://.
- BUT you (the builder) DO have network at BUILD time — use it to fetch images,
  then embed them as base64 data URIs so the deck stays offline. (See IMAGERY.)
- Widgets are standalone HTML in day1/widgets/, embedded via
  <iframe class="wframe" style="height:NNNpx" src="widgets/x.html?v=1" scrolling="auto">.
- Slides are 1280x720, top-aligned; after kicker+title you have ~560px of iframe
  height. Keep titles to ONE line (two lines eats ~60px and clips the widget).
  Screenshot-check nothing clips or overlaps before shipping.

THE BAR (this is why early attempts got rejected — do not repeat):
- Build an interactive ONLY where manipulation reveals something a CS-literate
  learner does NOT already know. If the point is common sense, a toggle-sandbox
  that restates it is WORSE than a sentence — write a sharp explanation using the
  deck's native .card / .callout styles. Litmus: if one sentence conveys it, use one.
- When you DO build an interactive, it must be a toy you DRIVE with real motion.
- Never build quiz-shaped "pick option -> reveal answer."
- On-screen text is SPARSE (phrases, not paragraphs). Detail goes in
  <aside class="notes"> for the presenter.

IMAGERY — real images, animated, beat tiles (learned building Day 1, the user
was emphatic about this):
- For MANY use cases, REAL images that you ANIMATE or let the learner PLAY with
  are better than styled <div> tiles + emoji. Tiles can be ugly; a real photo/
  screenshot of the actual thing reads instantly and looks polished.
- Where a concept has a real object, SHOW that object and DRIVE it: use photos as
  the nodes/markers of an interactive and animate the moving parts around them
  (e.g. packet-journey uses real device photos as network nodes with animated
  packets; threat-actors uses real photos as clickable markers on a landscape).
- Source freely-licensed images at build time (Wikimedia Commons; Openverse /
  Flickr CC; public-domain), avoid CC-BY-ND (you crop = derivative), and prefer
  CC/PD over brand-logo-forward or copyrighted studio stills. Crop/composite with
  ImageMagick (`magick`), then base64-embed. FOSS app screenshots (KeePassXC,
  FreeOTP, Have I Been Pwned) are freely licensed and great for "show the tool".
- Match the image to the ACTUAL thing (a KeePassXC vault for "password manager",
  not a generic keyring). If the concept is abstract with no natural photo (OSI
  layers, packet motion, crypto), THEN use hand-authored SVG/canvas — that's the
  right tool there, not a fallback.
- Add a `?state=` / `?step=` / `?frame=` query hook to animated widgets so you can
  screenshot arbitrary states (and the presenter can jump to one). Drive the
  animation as a deterministic function of elapsed time so it's testable headless.

WORKFLOW (per topic, one at a time):
1. PITCH the topic to the user in PROSE (do NOT use the AskUserQuestion
   multiple-choice tool — the user rejects it). Say which parts are plain
   explanation vs. interactive and WHY (apply the filter). When you'll add
   images, say which real images and where you'll source them. Ask your open
   questions and WAIT for alignment before building.
2. Build it. Verify with headless screenshots at the real iframe size
   (chrome-headless-shell --headless --window-size=1080,HEIGHT --screenshot).
   Verify any math independently in node; check toy-hash collisions.
3. Commit (message ending with the Co-Authored-By trailer the repo uses), push,
   poll the live URL until the new file is 200 and index references it, report.

DAY 1 — DONE (22 slides, don't redo):
- Title; CIA overview.
- Confidentiality: Caesar, Caesar-break, Symmetric (XOR), Asymmetric (tiny-RSA),
  Diffie-Hellman.
- Crypto capstone: digital envelope (stepped), Tamper Lab (sign+encrypt).
- Integrity: hash avalanche, checksum/tamper, salted-password.
- Availability: DDoS. Synthesis: "which property broke?".
- Reality check: "they log in, they don't hack" + "make the leak worthless"
  (both now use REAL images: hook/servers/sticky-note; KeePassXC/FreeOTP/HIBP).
- Risk vocabulary: real-photo Superman filmstrip (asset→threat→vulnerability→
  exploit→impact→control; likelihood/risk/residual woven as a caption).
- Threat actors: capability × persistence landscape, real photo markers, click to
  reveal each actor's defence (widgets/threat_actors.html).
- Network fundamentals: OSI encapsulation stepper (osi_encapsulation.html) +
  packet journey with real device-photo nodes & animated packets
  (packet_journey.html). Kept at theory layer — DAY 3 owns Wireshark/packets.
- Recap ("what you built") + Thank-you bookends.

NEXT: Day 1 is finished. Confirm with the user what to build next (Day 2 topics,
or Day-1 polish). Then pitch-then-build as above.

Style/brand: Alice=teal (#1F8F89), Bob=petrol (#00567C), attacker/Eve=red
(#D64545); full palette in _shared.css and the guide. Simulation-first where it
earns its place; enjoyable, not time-consuming.
