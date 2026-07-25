# Majal — Cyber Day 1: *Foundations & the CIA triad*

An offline, single-player, interactive Reveal.js deck (**29 slides**). Every teaching
beat is either a hands-on widget you drive, or a sharp explanation in the deck's own
card/callout style — never a quiz.

**Define before you simulate.** Each block opens with a *first-principles* primer
slide (same pattern as Day 3) that defines the vocabulary, so every simulation that
follows is an illustration of words the room already owns rather than the place they
first meet them. The four primers are the crypto words, encoding-vs-encryption-vs-
hashing, what breaks and defends availability, and the risk chain.

## Run it
Just open **`index.html`** in any modern browser — double-click it, or drag it onto
a browser window. **No server, no internet, no install.** It runs straight from
`file://`, from a USB stick, from anywhere.

- Distribute the whole repo folder (the deck loads `../shared/` for Reveal.js + theme).
- Everything is vendored or inlined: no CDN links, no `fetch()`, no external fonts,
  and every photograph is embedded as a base64 data URI. It works fully air-gapped.

## Presenting
- **Arrow keys / Space** — next / previous slide.
- **`S`** — open the **speaker-notes window**. The notes carry the real teaching
  script, including everything deliberately kept off-screen.
- **`F`** — fullscreen. **`Esc`** — slide overview.
- Typing in any answer box will **not** jump slides (keyboard capture is handled).
- Content-dense slides scroll inside their own frame if a projector is small.

## What's in it

**Foundations** — security vs. reliability (the *adversary*); the nesting domains
(physical → network → endpoint → application → data, with *human* across all);
attack surface vs. attack vector, traced live.

**Confidentiality** — *primer:* plaintext, ciphertext, key, cipher, encrypt/decrypt
and the Alice/Bob/Eve cast. Then Caesar cipher → breaking it by brute force
(Kerckhoffs's principle, AES-256's keyspace) → symmetric/XOR and the
*key-distribution problem* → RSA → Diffie–Hellman (and why it falls to an *active*
man-in-the-middle) → the digital envelope / TLS handshake → sign-and-seal Tamper Lab
(integrity, authenticity, non-repudiation).

**Integrity** — *primer:* encoding vs. encryption vs. hashing, separated by the one
question *who can get the original back?* Then SHA-256 avalanche and the five hash
properties (incl. collision resistance, and MD5/SHA-1 being broken); checksum
verification; password storage: hashing → salting → *slow* hashing
(bcrypt/scrypt/Argon2).

**Availability** — *primer:* what breaks it (flooding, ransomware, plain failure,
our own mistakes) and the four defences by name — rate limiting, filtering, scaling
out, backups. Then the live DDoS simulation, plus DoS vs. DDoS and what a botnet is.

**Synthesis** — "which property just broke?", ending on double-extortion ransomware
(C + A) as the compound case.

**Beyond the triad** — how break-ins actually begin (they *log in*); authentication
vs. authorisation (+ accounting = AAA); the three authentication factors and what
MFA actually means; making a leak worthless; the risk vocabulary — *primer:* the
chain (threat → exploit → vulnerability → asset → impact, broken anywhere by a
control) with NIST-grounded definitions, then the same six words told as one attack
on Superman, plus likelihood × impact, residual risk and the four risk responses;
threat actors plotted by capability × persistence.

Two open questions are posed here and deliberately **left unanswered until Day 3**:
*how do you know that public key is really theirs?* and *what stops an active
attacker in the middle?* Both are paid off by the certificate/TLS slides on Day 3.

## Interactives
Widgets are standalone HTML in `widgets/`, embedded as iframes, plus a few mounted
straight into the deck by `js/widgets/cia.js`. Several accept a query hook so you
can jump to a state for screenshots or live demos:

| widget | hook |
| --- | --- |
| `enc_hybrid.html` | `?step=0…7` |
| `enc_lab.html` | `?s=1&e=1&a=read\|tamp\|forge` |
| `threat_actors.html` | `?sel=kiddie\|crim\|insider\|hack\|nation` |

## File map
```
index.html            Reveal deck, one <section> per slide (images inlined as data URIs)
../shared/css/course.css   Majal brand theme (palette + fonts from the identity PDF)
../shared/dist|plugin/     vendored Reveal.js 5.2.1
js/state.js           localStorage, reveal init, keyboard fix
js/sha256.js          pure-JS SHA-256 (no WebCrypto — works over file://)
js/widgets/cia.js     the in-deck widgets: caesar, caesarbreak, avalanche,
                      checksum, salt, ddos, synth
widgets/*.html        the iframe widgets + _shared.css
```

> **Note:** `data/content.js`, `data/logs.js` and `js/widgets/block*.js` are left over
> from an earlier draft of Day 1 (a diagnostic + pair-code + log-wall design that was
> replaced by the simulation-first rebuild). They are **not loaded** by `index.html`.

## Notes on the content
- Brand palette is taken from `MajalFinalIdentity.pdf`: Purple `#9a66ff`,
  Navy `#15155b`, Gray `#cccccc`, Yellow `#e2e233`. English text falls back to a
  system sans (Avenir isn't web-distributable); drop `Avenir`/`IBM Plex Sans Arabic`
  web-font files into an `assets/` folder and `@font-face` them in `course.css` if
  you want exact brand type.
- Photographs are CC0 / CC BY / CC BY-SA from Wikimedia Commons and Flickr; the
  licence is recorded in each `alt` attribute.
