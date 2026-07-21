# Majal — Cyber Day 1: *What is normal?*

An offline, single-player, interactive Reveal.js deck. Every teaching beat from the
Day-1 script is a hands-on widget; each student's answers are saved locally and
exported to a `day1-<name>.txt` file you collect at the end.

## Run it
Just open **`index.html`** in any modern browser — double-click it, or drag it onto
a browser window. **No server, no internet, no install.** It runs straight from
`file://`, from a USB stick, from anywhere.

- Distribute the whole `day1/` folder (zip it, or copy to USB).
- Everything is vendored: Reveal.js lives in `dist/` and `plugin/`; there are no
  CDN links, no `fetch()`, no external fonts. It works fully air-gapped.

## Presenting
- **Arrow keys / Space** — next / previous slide.
- **`S`** — open the **speaker-notes window** (every facilitator note from the
  script travels with the deck).
- **`F`** — fullscreen. **`Esc`** — slide overview.
- Typing in any answer box will **not** jump slides (keyboard capture is handled).
- Content-dense slides scroll inside their own frame if a projector is small.

## The single-player contract
There's no live "compare with the room" — instead each of those moments is a
**commit-then-reveal gate**: the student locks an answer, and only then does the
facilitator note / model answer unlock. Prevents free-riding, and it's captured in
their export file.

## Collecting work
The last slide has an **Export** button → downloads `day1-<name>.txt` with:
acknowledgement timestamp, diagnostic self-score, **pair code**, and every answer.
Students read their **pair code** (e.g. `A-35`) aloud after the diagnostic — pair
every `A` with a `C`, `B`s together. (The letter is a tier; the word "tier" never
appears on screen, and the two digits are random salt.)

## File map
```
index.html            Reveal deck, one <section> per slide
css/course.css        Majal brand theme (palette + fonts from the identity PDF)
js/state.js           localStorage, pair code, export, reveal init, keyboard fix
js/widgets/*.js        one file per block; 16 distinct interaction mechanics
data/content.js        all questions / artifacts / briefs (JS consts, not JSON)
data/logs.js           seeded log-wall + DNS-tunnel generators (deterministic)
dist/ plugin/          vendored Reveal.js 5.2.1
```

## Notes on the content
- The **log wall** (2,847 lines) and **DNS log** are seeded — identical on every
  machine, so you can point at "line 2,845" and everyone has the same one.
- Brand palette is taken from `MajalFinalIdentity.pdf`: Purple `#9a66ff`,
  Navy `#15155b`, Gray `#cccccc`, Yellow `#e2e233`. English text falls back to a
  system sans (Avenir isn't web-distributable); drop `Avenir`/`IBM Plex Sans Arabic`
  web-font files into an `assets/` folder and `@font-face` them in `course.css` if
  you want exact brand type.
