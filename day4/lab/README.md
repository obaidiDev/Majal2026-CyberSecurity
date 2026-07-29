# Majal Store — Day 4 Web-Security Lab

A deliberately vulnerable e-commerce site for the Day 4 web-attacks session. Every
bug on the Day 4 slides lives inside a normal store feature — there is no page
called `sqli.php`. Students hunt.

> ⚠️ **This app is intentionally insecure. Never expose it to the public internet.**
> Tailnet / lab LAN only. Do not enable Tailscale Funnel or an exit node on the VM.

## The seven planted bugs

| # | Vulnerability     | Where it lives                        | Slide |
|---|-------------------|---------------------------------------|-------|
| 1 | SQL Injection     | Login form                            | "type into a login box, rewrite the query" |
| 2 | Command Injection | Admin → Network Tools (ping)          | "from a text box to a shell on their server" |
| 3 | Path Traversal    | Receipt download `?file=`             | "you just walk in" |
| 4 | IDOR              | `/order/<id>`                         | "checks what you asked for, not who you are" |
| 5 | CSRF              | Change-email in My Account            | "another site spends your login for you" |
| 6 | Reflected XSS     | Product search `?q=`                  | "your input becomes code" |
| 7 | Stored XSS        | Product reviews                       | "your comment becomes everyone else's code" |

Exploit walkthroughs are in **`INSTRUCTOR_HINTS.md`** (don't hand that to students).

## Run it locally (dev)

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python seed.py
.venv/bin/python app.py        # http://127.0.0.1:8080
```

## Run it in Docker (the way the class runs)

```bash
./run.sh                       # builds, seeds, serves on port 80 with guard rails
docker logs -f majal-lab       # watch attacks live on the projector
./reset.sh                     # heal the box (clean DB, wipes stored XSS)
```

Guard rails baked into `run.sh`: `--cpus=2 --memory=2g --pids-limit=256` (a fork
bomb from command injection kills the container, not the VM) and Docker log
rotation (3 × 10 MB) so scanner traffic can't fill the disk.

## Deploy to the Tailscale VM

```bash
./deploy.sh user@majal-lab     # Tailscale MagicDNS name or 100.x.y.z
```

Then, for the shared "boss fight", install the auto-reset so no single student
can stop the class:

```bash
sudo cp reset.cron /etc/cron.d/majal-lab-reset   # edit the path inside first
```

## Accounts

- `admin` / `M@jal-Adm1n-2026` — reaches Network Tools (command injection). The
  point is for students to reach it via SQLi, but you have it for demos.
- `student01`…`student50` / `majal01`…`majal50` — one per student, each with
  their own seeded orders and receipts, so IDOR and stored XSS hit real classmates.
- `m.alfaisal` / `Sunset!992` — a non-student "customer" whose orders are the
  natural IDOR prize.

## Reset model

State lives in `data/store.db` (SQLite) plus text receipts under `receipts/`.
Both are rebuilt from scratch by `seed.py`, which runs on every container start.
`./reset.sh` = `docker restart` = a clean world in ~3 seconds. `random.seed` is
fixed, so order IDs and IDOR targets are identical after every reset.
