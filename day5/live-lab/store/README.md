# Majal Store — live-lab build (instrumented + relocated flags)

The Day 4 vulnerable store, rebuilt for the Day 5 red-vs-blue exercise. Same
seven bugs; two things are new:

1. **It emits live telemetry** — every request, every process the web server
   spawns, and every outbound connection it makes — to a SIEM, shaped to match
   the Day 5 EDR schema (`day5/lab/edr.jsonl`).
2. **The five flags moved** off the burned Day 4 paths and are **re-minted on
   every boot**, so Day 4 notes are worthless.

> ⚠️ Intentionally insecure. Tailnet / lab LAN only. Never on the public internet.

## The five flags (regenerated each boot → `data/flags.json`)

| Vuln | Where the flag lives now | Capture path |
|------|--------------------------|--------------|
| SQL injection | `secrets` table row | `UNION SELECT` via the product search `?q=` (or login) |
| Command injection | `/srv/flags/cmdi.flag` + `$FLAG_CMDI` | `; cat /srv/flags/cmdi.flag` or `; env` in admin ping |
| Path traversal | `/srv/majal/vault/traversal.flag` (off `/app`) | `receipt?file=../../../../../srv/majal/vault/traversal.flag` |
| IDOR | inside Maha Al-Faisal's order notes | `/order/<id>` as any logged-in student |
| Stored XSS | admin-only `/admin/flag` | payload runs in the admin bot's session, exfiltrates it |

CSRF and reflected XSS stay exploitable (Day 4 teaching intact) but carry no flag.

## Telemetry

Two producers, one schema, shipped to `$SIEM_URL/ingest` (NDJSON) — or, when
`$SIEM_URL` is unset, appended to `data/telemetry.jsonl` for offline inspection.

- **`app.py`** emits an `http` event per request, carrying a hidden **ground-truth
  verdict** (`benign` / `sqli` / `cmdi` / `traversal` / `idor` / `xss` / `csrf` /
  `flag_capture`). When a freshly minted flag token appears in a response body,
  the event is re-stamped `flag_capture` — proof a capture really happened.
  An audit hook (`sys.addaudithook`) also emits a `procstart` the instant the app
  shells out, tying the command **to the attacker's source IP** — something the
  OS sensor cannot do.
- **`agent.py`** is a standalone `/proc` sensor (no root, no kernel module). It
  emits a `procstart` for every new process, tagged `web_spawned` when its
  ancestry runs back to gunicorn (command injection = a shell or a recon/exfil
  tool parented by the web server), and a `netconn` for web-spawned **outbound**
  connections (reverse shells, C2 beacons, curl exfil).

The verdict is ground truth for grading the blue team's call-outs; the SIEM
collector (built in a later phase) strips it before showing blue the live feed.

## Run it

```bash
# Docker (the way the class runs) — clean, namespaced telemetry
docker build -t majal-livestore .
docker run -d --name majal-livestore -p 80:8080 \
  --pids-limit=256 --cpus=2 --memory=1g \
  -e SIEM_URL=http://siem:8000 majal-livestore

# Local dev (no SIEM; telemetry falls back to data/telemetry.jsonl)
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
VAULT_FLAG=/tmp/vault/traversal.flag CMDI_FLAG=/tmp/flags/cmdi.flag .venv/bin/python seed.py
.venv/bin/gunicorn --bind 127.0.0.1:8080 app:app &   # or python app.py
.venv/bin/python agent.py &
```

Normally launched by `entrypoint.sh` (seed → export `$FLAG_CMDI` → sensor →
gunicorn) and wired to the SIEM by the lab's `docker-compose.yml`.

## Environment

| Var | Default | Purpose |
|-----|---------|---------|
| `SIEM_URL` | *(unset)* | telemetry sink; unset → `data/telemetry.jsonl` |
| `FLAGS_PATH` | `data/flags.json` | minted flags (red portal validates against this) |
| `VAULT_FLAG` | `/srv/majal/vault/traversal.flag` | path-traversal flag file |
| `CMDI_FLAG` | `/srv/flags/cmdi.flag` | command-injection flag file |
| `SENSOR_POLL` | `0.25` | `/proc` poll interval (seconds) |
| `DEVICE_NAME` | `majalstore` | host name stamped on every event |

## Notes / limits

- Very short-lived injected commands (an instant `; id`) can slip past the
  0.25 s process poll, but the **audit hook always catches the shell** that ran
  them — with the payload and the source IP.
- Outbound `netconn` reliably catches sustained connections (reverse shells,
  beacons); a fast one-shot `curl` may be missed by the net poll, but its
  destination is still visible in the shell's `procstart` cmdline.
- Source-IP attribution uses `remote_addr`, honouring `X-Forwarded-For` if a
  proxy sets it. With Docker's default bridge, confirm the container sees real
  client IPs on the target VM (it does with iptables DNAT; the userland proxy
  can mask them).
