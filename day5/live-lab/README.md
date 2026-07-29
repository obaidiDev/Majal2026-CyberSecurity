# Day 5 · Part Two — Live Red vs Blue

The morning's investigation lab (`day5/lab/`) is a frozen crime scene. This is the
opposite: a **live, adversarial exercise** on the same Majal Store story.

- **Red team** attacks the real Majal Store website, racing to capture five flags.
- **Blue team** watches a **live SIEM** — the store's inbound requests, the
  **processes it spawns**, and its **outbound connections**, in real time — and
  **calls out** the source IPs doing hostile things. A confirmed call takes an
  attacker off the board (the instructor verifies the student powers down).
- A **wrong call is friendly fire**: evidence is the gate. Cite a real hostile
  event and the attacker falls; call on a hunch and you shoot a shopper — and
  your shift is over.

> ⚠️ **Intentionally vulnerable, and command injection yields a shell inside a
> container.** Tailnet / lab LAN only. Never expose to the public internet; no
> Tailscale Funnel, no exit node.

## The five URLs

| Who | Where | What |
|-----|-------|------|
| **Red** | `http://<vm>/` | the store to attack |
| **Red** | `http://<vm>:8000/red` | claim a handle, submit flags |
| **Blue** | `http://<vm>:8000/` | the live SOC console |
| **Everyone** | `http://<vm>:8000/board` | the projector scoreboard |
| **Instructor** | `http://<vm>:8000/instructor?token=…` | kill queue + game controls |

## Architecture

```
red players ─▶ store (:80)  ── vulnerable Flask app + in-container /proc sensor
                 │  http events (verdict) + procstart + netconn(c2)
                 ▼
              siem (:8000) ── collector: global seq, verdict split off for grading
                 │            long-poll feed (verdict stripped)
   shopper bot ─▶ store       ├─▶ blue console   (watchlist · stream · inspector · call-out)
   admin bot   ─▶ store       ├─▶ red portal      (flag submission)
   (XSS victim, real Chromium)├─▶ scoreboard      (projector)
                              └─▶ instructor panel (kill queue · phase · reveal)
```

Five containers, one `docker compose up`. The store mints fresh flags each boot
into a shared volume the SIEM reads, so **Day 4 notes are worthless** and every
`reset.sh` invalidates whatever was captured.

## The five flags (relocated, re-minted every boot)

| Vuln | Lives in | Captured by |
|------|----------|-------------|
| SQL injection | `secrets` table | `UNION SELECT` in product search `?q=` |
| Command injection | `/srv/flags/cmdi.flag` + `$FLAG_CMDI` | `; cat …` or `; env` in admin ping |
| Path traversal | `/srv/majal/vault/` (off `/app`) | `receipt?file=../…` walks to it |
| IDOR | Maha Al-Faisal's order notes | `/order/<id>` as any logged-in student |
| Stored XSS | admin-only `/admin/flag` | script in a review runs in the admin bot's session |

Answer key, exploit walkthroughs, and the run-of-show are in
**`INSTRUCTOR_RUNBOOK.md`** — don't hand that to students.

## Run it

```bash
# on the Majal Store VM (or locally)
docker compose up -d --build          # builds 5 images; the admin bot pulls Playwright/Chromium (~2 GB, first time only)
docker compose logs -f                # watch it live
./reset.sh                            # new flags, clean scoreboard, ~seconds
docker compose down -v                # tear everything down
```

From your workstation, push and start it on the VM in one shot:

```bash
./deploy.sh user@majalstore           # Tailscale MagicDNS name or 100.x.y.z
```

### Tuning (env vars, all optional)

`INSTRUCTOR_TOKEN` · `AMMO_START` (30) · `COOLDOWN_SEC` (60) ·
`FRIENDLY_FIRE` (`eliminate` | `penalty`) · `SHOPPERS` (12) · `SHOPPER_SUBNET` (10.20.0)

```bash
INSTRUCTOR_TOKEN=hunter2 FRIENDLY_FIRE=penalty docker compose up -d
```

## One thing that must be true: real source IPs

The whole game is "call the attacker's IP," so the store has to see each red
player's **real** address. Docker preserves it for LAN/Tailscale clients hitting
the published port. The bots reach the store from *inside* the compose network,
so they set `X-Forwarded-For` to appear as distinct addresses — and the store
only trusts `X-Forwarded-For` from inside its own network, so **a red player
cannot spoof it** to frame a shopper. Verify after boot: `docker compose logs
store` should show varied client IPs, not one repeated address.

## Components

- **`store/`** — the vulnerable app + telemetry (`store/README.md` has the detail)
- **`siem/`** — collector, blue console, red portal, scoreboard, instructor panel
- **`bots/`** — shopper (benign traffic) + admin (stored-XSS victim, real Chromium)
