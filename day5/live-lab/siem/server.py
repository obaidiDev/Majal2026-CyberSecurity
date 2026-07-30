#!/usr/bin/env python3
"""
Majal SIEM — collector + live blue-team console for the red-vs-blue lab.

The store (app.py) and its endpoint sensor (agent.py) POST newline-delimited
JSON here. This process:

  * assigns every event a global, monotonic `seq` on receipt (each producer has
    its own local ids, so the collector is the single source of ordering),
  * splits the hidden ground-truth `verdict` off into a server-side index used
    only to grade call-outs — blue never sees it in the feed,
  * serves the verdict-stripped feed to the live console by long-poll cursor.

Phase 2 delivers ingest + the live console. The call-out grading endpoints
(which read the verdict index built here) land in Phase 4; the red flag portal
and scoreboard in Phase 3.
"""
import os
import re
import json
import ipaddress
import threading
import time
from collections import defaultdict

from flask import Flask, request, jsonify, Response, send_from_directory

HERE = os.path.dirname(os.path.abspath(__file__))

# Where the store writes THIS run's minted flags (a shared volume in compose).
FLAGS_PATH = os.environ.get("FLAGS_PATH", "/shared/flags.json")

# Points per flag, difficulty-weighted; first team to grab each flag gets a bonus.
FLAG_POINTS = {"traversal": 100, "sqli": 150, "idor": 150, "cmdi": 200, "xss": 250}
FIRST_BLOOD_BONUS = 50

# --- blue-team call-out economy (all tunable at deploy time) ----------------
AMMO_START = int(os.environ.get("AMMO_START", "5"))
COOLDOWN_SEC = int(os.environ.get("COOLDOWN_SEC", "60"))
CORRECT_POINTS = int(os.environ.get("CORRECT_POINTS", "300"))
WRONG_POINTS = int(os.environ.get("WRONG_POINTS", "150"))
# "eliminate" = a wrong call knocks the analyst out (the user's rule); "penalty"
# = only the point/ammo/cooldown hit, so the room can't empty out on one mistake.
FRIENDLY_FIRE = os.environ.get("FRIENDLY_FIRE", "eliminate")
INSTRUCTOR_TOKEN = os.environ.get("INSTRUCTOR_TOKEN", "majal-instructor")

# Verdicts that mark an event as genuinely hostile (ground truth for grading).
MALICIOUS = {"sqli", "cmdi", "traversal", "idor", "xss", "csrf", "c2", "flag_capture"}

# Fields blue is allowed to see, per event type. `verdict` and `detail` are
# deliberately absent — recognising the attack from the raw signal is the job.
PUBLIC_COMMON = ["seq", "event_timestamp", "type", "source", "device_name"]
PUBLIC_BY_TYPE = {
    "http": ["src_ip", "method", "path", "query", "status", "bytes",
             "user_agent", "username"],
    "procstart": ["src_ip", "pid", "ppid", "process_guid", "parent_guid",
                  "process_name", "process_path", "process_username",
                  "process_reputation", "parent_name", "process_cmdline",
                  "web_spawned"],
    "netconn": ["direction", "remote_ip", "remote_port", "local_port",
                "pid", "process_name", "process_cmdline", "process_guid"],
}

app = Flask(__name__)

_lock = threading.Lock()
EVENTS = []                       # public projections; EVENTS[i].seq == i+1
VERDICTS = {}                     # seq -> verdict            (server-side only)
IP_EVIDENCE = defaultdict(list)   # ip  -> [seq, ...] of malicious events (grading)
IP_STATS = {}                     # ip  -> public rollup (counts, first/last seen)
STARTED = time.time()

# --- red team / scoreboard state -------------------------------------------
_red_lock = threading.Lock()
PLAYERS = {}                      # handle -> {handle, ip, score, flags:set, joined, eliminated}
CAPTURES = set()                  # (handle, flagname) already scored — no farming
FIRST_BLOOD = set()              # flagnames already claimed once (bonus gate)
HANDLE_BY_IP = {}                 # ip -> handle  (feeds the instructor kill queue)

# --- blue team / call-out state --------------------------------------------
_blue_lock = threading.Lock()
BLUE = {}                         # handle -> analyst state (ammo, score, cooldown, …)
KILL_QUEUE = []                   # confirmed-correct calls awaiting instructor action
_kill_seq = 0
GAME = {"phase": "live", "reveal": False}   # instructor-controlled

_flags_cache = {"mtime": 0, "token_to_name": {}}


_TRUSTED_PROXIES = [
    ipaddress.ip_network(c.strip())
    for c in os.environ.get("TRUST_PROXY_CIDR", "172.16.0.0/12,127.0.0.0/8").split(",")
    if c.strip()
]


def _peer_trusted(addr: str) -> bool:
    try:
        ip = ipaddress.ip_address(addr)
    except ValueError:
        return False
    return any(ip in net for net in _TRUSTED_PROXIES)


def client_ip() -> str:
    # Same rule as the store: a red player's real address is what the store
    # attributes their attacks to, so the portal must record the same thing —
    # trust XFF only from inside the lab network, never from an external player.
    peer = request.remote_addr or "0.0.0.0"
    xff = request.headers.get("X-Forwarded-For")
    if xff and _peer_trusted(peer):
        return xff.split(",")[0].strip()
    return peer


def flag_map() -> dict:
    """token -> vuln name, re-read when the store re-mints flags on reset."""
    try:
        m = os.path.getmtime(FLAGS_PATH)
        if m != _flags_cache["mtime"]:
            with open(FLAGS_PATH) as fh:
                flags = json.load(fh).get("flags", {})
            _flags_cache["token_to_name"] = {v: k for k, v in flags.items()}
            _flags_cache["mtime"] = m
    except (OSError, ValueError):
        pass
    return _flags_cache["token_to_name"]


def _project(ev: dict, seq: int) -> dict:
    out = {"seq": seq}
    for k in PUBLIC_COMMON:
        if k != "seq" and k in ev:
            out[k] = ev[k]
    for k in PUBLIC_BY_TYPE.get(ev.get("type", ""), []):
        if k in ev:
            out[k] = ev[k]
    return out


def _ingest_one(ev: dict) -> None:
    with _lock:
        seq = len(EVENTS) + 1
        pub = _project(ev, seq)
        EVENTS.append(pub)

        verdict = ev.get("verdict", "benign")
        VERDICTS[seq] = verdict

        ip = ev.get("src_ip")
        if ip:
            s = IP_STATS.get(ip)
            if not s:
                s = {"ip": ip, "first_seq": seq, "first_ts": pub.get("event_timestamp"),
                     "last_ts": pub.get("event_timestamp"),
                     "http": 0, "procstart": 0, "netconn": 0, "total": 0}
                IP_STATS[ip] = s
            s["total"] += 1
            s[ev.get("type", "http")] = s.get(ev.get("type", "http"), 0) + 1
            s["last_ts"] = pub.get("event_timestamp")
            if verdict in MALICIOUS:
                IP_EVIDENCE[ip].append(seq)


@app.post("/ingest")
def ingest():
    raw = request.get_data(as_text=True) or ""
    n = 0
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            _ingest_one(json.loads(line))
            n += 1
        except ValueError:
            continue
    return jsonify(ingested=n)


@app.get("/api/events")
def api_events():
    since = request.args.get("since", default=0, type=int)
    limit = min(request.args.get("limit", default=500, type=int), 3000)
    ip = request.args.get("ip", type=str)
    typ = request.args.get("type", type=str)
    q = (request.args.get("q", type=str) or "").lower()

    with _lock:
        window = EVENTS[since:] if since >= 0 else EVENTS[:]
        cursor = len(EVENTS)

    def keep(e):
        if ip and e.get("src_ip") != ip and e.get("remote_ip") != ip:
            return False
        if typ and e.get("type") != typ:
            return False
        if q:
            hay = " ".join(str(e.get(k, "")) for k in
                           ("path", "query", "process_cmdline", "process_name",
                            "user_agent", "src_ip", "remote_ip")).lower()
            if q not in hay:
                return False
        return True

    out = [e for e in window if keep(e)]
    truncated = len(out) > limit
    out = out[:limit]
    # Debrief mode: the instructor can reveal ground-truth verdicts on every
    # screen once the round is over. Off during play — blue must judge unaided.
    if GAME.get("reveal"):
        out = [dict(e, verdict=VERDICTS.get(e["seq"], "benign")) for e in out]
    return jsonify(events=out, cursor=cursor, reveal=GAME.get("reveal", False),
                   truncated=truncated, total=len(EVENTS))


@app.get("/api/ips")
def api_ips():
    with _lock:
        rows = sorted(IP_STATS.values(), key=lambda s: s["last_ts"], reverse=True)
    return jsonify(ips=rows)


@app.get("/api/stats")
def api_stats():
    with _lock:
        total = len(EVENTS)
        by_type = defaultdict(int)
        for e in EVENTS:
            by_type[e.get("type", "?")] += 1
    return jsonify(total=total, by_type=by_type, ips=len(IP_STATS),
                   uptime=int(time.time() - STARTED))


# --------------------------------------------------------------- red team api
HANDLE_RE = re.compile(r"^[A-Za-z0-9 _.\-]{2,24}$")


def _player(handle: str, ip: str):
    p = PLAYERS.get(handle)
    if not p:
        p = {"handle": handle, "ip": ip, "score": 0, "flags": set(),
             "joined": time.time(), "eliminated": False}
        PLAYERS[handle] = p
    p["ip"] = ip                      # follow the player's current address
    HANDLE_BY_IP[ip] = handle
    return p


@app.post("/api/red/join")
def red_join():
    handle = (request.json or {}).get("handle", "").strip()
    if not HANDLE_RE.match(handle):
        return jsonify(ok=False, error="Handle must be 2–24 chars: letters, digits, space . _ -"), 400
    ip = client_ip()
    with _red_lock:
        p = _player(handle, ip)
        elim = p["eliminated"]
    return jsonify(ok=True, handle=handle, ip=ip, eliminated=elim)


@app.post("/api/red/submit")
def red_submit():
    body = request.json or {}
    handle = (body.get("handle") or "").strip()
    token = (body.get("flag") or "").strip()
    if not HANDLE_RE.match(handle):
        return jsonify(ok=False, error="Join with a valid handle first."), 400
    name = flag_map().get(token)
    ip = client_ip()
    with _red_lock:
        p = _player(handle, ip)
        if p["eliminated"]:
            return jsonify(ok=False, error="You have been eliminated. No more submissions."), 403
        if not name:
            return jsonify(ok=False, error="Not a valid flag for this round.")
        if (handle, name) in CAPTURES:
            return jsonify(ok=False, error=f"You already captured the {name} flag.")
        CAPTURES.add((handle, name))
        p["flags"].add(name)
        pts = FLAG_POINTS.get(name, 100)
        first = name not in FIRST_BLOOD
        if first:
            FIRST_BLOOD.add(name)
            pts += FIRST_BLOOD_BONUS
        p["score"] += pts
        score = p["score"]
    return jsonify(ok=True, flag=name, points=pts, first_blood=first, score=score)


def _board_snapshot():
    with _red_lock:
        red = sorted(
            ({"handle": p["handle"], "ip": p["ip"], "score": p["score"],
              "flags": sorted(p["flags"]), "eliminated": p["eliminated"],
              "status": p.get("status", "active")}
             for p in PLAYERS.values()),
            key=lambda r: (-r["score"], r["handle"]))
        captured = len({name for (_, name) in CAPTURES})
    with _blue_lock:
        blue_players = sorted(
            ({"handle": b["handle"], "score": b["score"], "ammo": b["ammo"],
              "correct": b["calls_correct"], "wrong": b["calls_wrong"],
              "eliminated": b["eliminated"]} for b in BLUE.values()),
            key=lambda r: (-r["score"], r["handle"]))
        blue = {
            "score": sum(b["score"] for b in BLUE.values()),
            "calls_correct": sum(b["calls_correct"] for b in BLUE.values()),
            "calls_wrong": sum(b["calls_wrong"] for b in BLUE.values()),
            "eliminated": len({k["ip"] for k in KILL_QUEUE if k["status"] == "confirmed"}),
            "players": blue_players,
        }
        phase = GAME["phase"]
    return {
        "red": red,
        "flags": {"captured": captured, "total": len(FLAG_POINTS),
                  "names": list(FLAG_POINTS.keys())},
        "blue": blue,
        "phase": phase,
        "updated": time.time(),
    }


@app.get("/api/board")
def api_board():
    return jsonify(_board_snapshot())


# -------------------------------------------------------------- blue team api
def _blue(handle: str):
    b = BLUE.get(handle)
    if not b:
        b = {"handle": handle, "score": 0, "ammo": AMMO_START,
             "cooldown_until": 0.0, "eliminated": False,
             "calls_correct": 0, "calls_wrong": 0, "joined": time.time()}
        BLUE[handle] = b
    return b


def _blue_public(b, now=None):
    now = now or time.time()
    return {"handle": b["handle"], "score": b["score"], "ammo": b["ammo"],
            "eliminated": b["eliminated"], "correct": b["calls_correct"],
            "wrong": b["calls_wrong"],
            "cooldown": max(0, int(b["cooldown_until"] - now))}


def _ip_down(ip: str) -> bool:
    return any(k["ip"] == ip and k["status"] in ("pending", "confirmed")
               for k in KILL_QUEUE)


@app.post("/api/blue/join")
def blue_join():
    handle = ((request.json or {}).get("handle") or "").strip()
    if not HANDLE_RE.match(handle):
        return jsonify(ok=False, error="Handle must be 2–24 chars: letters, digits, space . _ -"), 400
    with _blue_lock:
        b = _blue(handle)
        return jsonify(ok=True, me=_blue_public(b))


@app.get("/api/blue/me")
def blue_me():
    handle = (request.args.get("handle") or "").strip()
    with _blue_lock:
        b = BLUE.get(handle)
        me = _blue_public(b) if b else None
    return jsonify(ok=bool(me), me=me, phase=GAME["phase"])


@app.post("/api/blue/call")
def blue_call():
    body = request.json or {}
    handle = (body.get("handle") or "").strip()
    target = (body.get("target_ip") or "").strip()
    ev_seq = body.get("evidence_seq")
    if not HANDLE_RE.match(handle):
        return jsonify(ok=False, error="Join with a valid analyst handle first."), 400
    try:
        ev_seq = int(ev_seq)
    except (TypeError, ValueError):
        return jsonify(ok=False, error="Cite an event as evidence.")

    # read the cited event + its ground-truth verdict under the events lock
    with _lock:
        ev = EVENTS[ev_seq - 1] if 1 <= ev_seq <= len(EVENTS) else None
        verdict = VERDICTS.get(ev_seq, "benign")
    owner = (ev or {}).get("src_ip")
    valid_evidence = bool(ev) and owner == target and verdict in MALICIOUS

    now = time.time()
    with _blue_lock:
        b = _blue(handle)
        if GAME["phase"] != "live":
            return jsonify(ok=False, error="The game is not live right now.")
        if b["eliminated"]:
            return jsonify(ok=False, error="You have been eliminated — no more calls.",
                           me=_blue_public(b, now))
        if now < b["cooldown_until"]:
            return jsonify(ok=False, error=f"On cooldown for {int(b['cooldown_until']-now)}s.",
                           me=_blue_public(b, now))
        if b["ammo"] <= 0:
            return jsonify(ok=False, error="Out of ammo.", me=_blue_public(b, now))

        if valid_evidence:
            if _ip_down(target):
                return jsonify(ok=True, result="already_down",
                               msg=f"{target} is already off the board.",
                               me=_blue_public(b, now))
            b["calls_correct"] += 1
            b["score"] += CORRECT_POINTS
            global _kill_seq
            _kill_seq += 1
            handle_known = HANDLE_BY_IP.get(target)
            KILL_QUEUE.append({
                "id": _kill_seq, "ip": target, "handle": handle_known,
                "by": handle, "evidence_seq": ev_seq, "verdict": verdict,
                "ts": now, "status": "pending",
            })
            me = _blue_public(b, now)
            result = ("correct", CORRECT_POINTS)
        else:
            b["calls_wrong"] += 1
            b["score"] -= WRONG_POINTS
            b["ammo"] -= 1
            b["cooldown_until"] = now + COOLDOWN_SEC
            if FRIENDLY_FIRE == "eliminate":
                b["eliminated"] = True
            me = _blue_public(b, now)
            reason = ("no such event" if not ev else
                      "that event's source is not this IP" if owner != target else
                      "that action is not hostile")
            result = ("wrong", reason)

    if valid_evidence:
        # mark the red player (if we know them) as called out
        kh = HANDLE_BY_IP.get(target)
        if kh:
            with _red_lock:
                p = PLAYERS.get(kh)
                if p and p.get("status", "active") == "active":
                    p["status"] = "called_out"
        return jsonify(ok=True, result="correct", points=CORRECT_POINTS,
                       target=target, handle=kh, me=me)
    return jsonify(ok=True, result="wrong", reason=result[1],
                   friendly_fire=(FRIENDLY_FIRE == "eliminate"), me=me)


# ------------------------------------------------------------- instructor api
def _instr_ok() -> bool:
    tok = request.args.get("token") or request.headers.get("X-Instructor-Token")
    return bool(tok) and tok == INSTRUCTOR_TOKEN


@app.get("/api/instructor/state")
def instr_state():
    if not _instr_ok():
        return jsonify(ok=False, error="forbidden"), 403
    with _blue_lock:
        queue = [dict(k) for k in KILL_QUEUE]
        game = dict(GAME)
    board = _board_snapshot()
    return jsonify(ok=True, queue=queue, game=game,
                   red=board["red"], blue=board["blue"]["players"],
                   config={"ammo": AMMO_START, "cooldown": COOLDOWN_SEC,
                           "friendly_fire": FRIENDLY_FIRE})


@app.post("/api/instructor/kill")
def instr_kill():
    if not _instr_ok():
        return jsonify(ok=False, error="forbidden"), 403
    body = request.json or {}
    kid = body.get("id")
    action = body.get("action")   # confirm | dismiss | restore
    with _blue_lock:
        entry = next((k for k in KILL_QUEUE if k["id"] == kid), None)
        if not entry:
            return jsonify(ok=False, error="no such kill entry"), 404
        if action == "confirm":
            entry["status"] = "confirmed"
        elif action == "dismiss":
            entry["status"] = "dismissed"
        elif action == "restore":
            entry["status"] = "pending"
        else:
            return jsonify(ok=False, error="bad action"), 400
        ip, handle = entry["ip"], entry["handle"]
        status = entry["status"]
    # mirror onto the red player so their submissions are (un)blocked
    if handle:
        with _red_lock:
            p = PLAYERS.get(handle)
            if p:
                if status == "confirmed":
                    p["eliminated"] = True
                    p["status"] = "eliminated"
                elif status in ("dismissed", "pending"):
                    # restore only if no OTHER confirmed kill exists for them
                    still = any(k["handle"] == handle and k["status"] == "confirmed"
                                for k in KILL_QUEUE)
                    p["eliminated"] = still
                    p["status"] = "eliminated" if still else "active"
    return jsonify(ok=True, id=kid, status=status)


@app.post("/api/instructor/game")
def instr_game():
    if not _instr_ok():
        return jsonify(ok=False, error="forbidden"), 403
    body = request.json or {}
    if "phase" in body and body["phase"] in ("lobby", "live", "ended"):
        GAME["phase"] = body["phase"]
    if "reveal" in body:
        GAME["reveal"] = bool(body["reveal"])
    return jsonify(ok=True, game=dict(GAME))


@app.get("/instructor")
def instructor_page():
    return send_from_directory(HERE, "instructor.html")


@app.get("/red")
def red_portal():
    return send_from_directory(HERE, "red.html")


@app.get("/board")
def board():
    return send_from_directory(HERE, "board.html")


@app.get("/")
def console():
    return send_from_directory(HERE, "console.html")


@app.get("/health")
def health():
    return "ok\n", 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False, threaded=True)
