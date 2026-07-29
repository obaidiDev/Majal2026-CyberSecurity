#!/usr/bin/env python3
"""
Majal Store endpoint sensor — the OS-level half of the telemetry.

Runs as its own process next to gunicorn (not inside the workers, so it sees the
whole process table once, with no per-worker duplication). Two poll loops:

  * process loop — diffs /proc every tick and emits a `procstart` for each new
    process, tagged web_spawned when its ancestry runs back to the web server.
    Command injection shows up here as a shell (`sh -c "ping ...; curl ..."`) or
    a recon/exfil tool (curl, nc, id, cat) parented by gunicorn. The shell's
    cmdline carries the whole payload, so even an instant `; id` is evidenced by
    the `sh -c` that spawned it.

  * network loop — parses /proc/net/tcp{,6} for new outbound connections and
    attributes them to a pid via the socket-inode map. A web-spawned process
    reaching out (a reverse shell, a curl exfil) is the `netconn` egress signal
    blue watches for. Benign ICMP pings never appear here (not TCP).

No root, no kernel module. Emits the same Carbon-Black-shaped events as the app
(emit.py) so both streams land in one SIEM. Verdicts are ground truth for the
blue team's grading and are stripped from their live feed by the collector.
"""
import os
import re
import glob
import time
import pwd
import socket
import urllib.parse

import emit

POLL = float(os.environ.get("SENSOR_POLL", "0.25"))


def siem_ips() -> set:
    """Resolve the SIEM host so we never flag the store's own telemetry POST
    (a web worker connecting to the SIEM) as hostile egress."""
    url = os.environ.get("SIEM_URL", "")
    if not url:
        return set()
    host = urllib.parse.urlparse(url).hostname
    if not host:
        return set()
    try:
        return {info[4][0] for info in socket.getaddrinfo(host, None)}
    except socket.gaierror:
        return set()


SIEM_IPS = siem_ips()
WEB_RE = re.compile(r"gunicorn|app:app|app\.py|flask")
# Tools that have no business being spawned by a web server.
RECON = {"sh", "bash", "dash", "curl", "wget", "nc", "ncat", "netcat", "socat",
         "python", "python3", "perl", "ruby", "php", "id", "whoami", "uname",
         "cat", "env", "ls", "find", "chmod", "base64", "xxd", "hexdump"}
BENIGN_WEB = {"ping", "ping6"}
TRUSTED = {"gunicorn", "python", "python3", "sh", "cron", "run-parts",
           "logrotate", "ping"}

_uid_cache: dict = {}


def username_of(uid: int) -> str:
    if uid not in _uid_cache:
        try:
            _uid_cache[uid] = pwd.getpwuid(uid).pw_name
        except KeyError:
            _uid_cache[uid] = str(uid)
    return _uid_cache[uid]


def read(path: str) -> str:
    try:
        with open(path) as fh:
            return fh.read()
    except OSError:
        return ""


def read_bytes(path: str) -> bytes:
    try:
        with open(path, "rb") as fh:
            return fh.read()
    except OSError:
        return b""


# --------------------------------------------------------------------- procs
def proc_info(pid: int):
    stat = read(f"/proc/{pid}/stat")
    if not stat:
        return None
    # comm may contain spaces/parens; split around the last ')'.
    try:
        rp = stat.rindex(")")
        comm = stat[stat.index("(") + 1:rp]
        rest = stat[rp + 2:].split()
        ppid = int(rest[1])
    except (ValueError, IndexError):
        return None
    cmdline = read_bytes(f"/proc/{pid}/cmdline").replace(b"\x00", b" ").decode(
        "utf-8", "replace").strip() or f"[{comm}]"
    uid = 0
    for line in read(f"/proc/{pid}/status").splitlines():
        if line.startswith("Uid:"):
            uid = int(line.split()[1])
            break
    try:
        exe = os.readlink(f"/proc/{pid}/exe")
    except OSError:
        exe = comm
    return {"pid": pid, "ppid": ppid, "comm": comm, "cmdline": cmdline,
            "uid": uid, "exe": exe}


def snapshot():
    procs = {}
    for d in glob.glob("/proc/[0-9]*"):
        pid = int(os.path.basename(d))
        info = proc_info(pid)
        if info:
            procs[pid] = info
    return procs


def is_web(pid: int, procs: dict, depth=0) -> bool:
    """True if pid's ancestry runs back to a web-server process."""
    info = procs.get(pid)
    if not info or depth > 12 or pid <= 1:
        return False
    if WEB_RE.search(info["cmdline"]) or WEB_RE.search(info["comm"]):
        return True
    return is_web(info["ppid"], procs, depth + 1)


def verdict_for(info: dict, web_spawned: bool):
    comm = info["comm"]
    # The web stack itself (gunicorn master/workers, the python app) is part of
    # the server, not an injected child — never an attack.
    if WEB_RE.search(info["cmdline"]) or WEB_RE.search(comm):
        return "benign", "web server process"
    if not web_spawned:
        return "benign", ""
    if comm in BENIGN_WEB:
        return "benign", "connectivity check"
    if comm in {"sh", "bash", "dash"}:
        # the injection shell — the payload is right there in the cmdline
        return "cmdi", "shell spawned by web server"
    if comm in RECON:
        return "cmdi", f"{comm} spawned by web server"
    return "cmdi", f"unexpected process from web server: {comm}"


def reputation(comm: str) -> str:
    # Reputation is about the binary's identity, not its behaviour — a real EDR
    # rates /bin/sh TRUSTED even when it's being abused. Deriving this from the
    # verdict would leak the hidden verdict into the blue feed, so we don't.
    return "TRUSTED_WHITE_LIST" if comm in TRUSTED else "NOT_LISTED_WHITE_LIST"


def emit_proc(info: dict, procs: dict):
    web_spawned = is_web(info["ppid"], procs) or is_web(info["pid"], procs)
    verdict, detail = verdict_for(info, web_spawned)
    parent = procs.get(info["ppid"], {})
    emit.emit({
        "type": "procstart",
        "pid": info["pid"],
        "ppid": info["ppid"],
        "process_guid": emit.guid(0, info["pid"]),
        "parent_guid": emit.guid(0, info["ppid"]),
        "process_name": info["comm"],
        "process_path": info["exe"],
        "process_username": username_of(info["uid"]),
        "process_reputation": reputation(info["comm"]),
        "parent_name": parent.get("comm", "?"),
        "process_cmdline": info["cmdline"],
        "web_spawned": web_spawned,
        "verdict": verdict,
        "detail": detail,
    })


# ---------------------------------------------------------------------- net
TCP_STATES = {"01": "ESTABLISHED", "02": "SYN_SENT", "03": "SYN_RECV", "0A": "LISTEN"}


def hexip(h: str) -> str:
    if len(h) == 8:  # ipv4, little-endian
        b = bytes.fromhex(h)
        return ".".join(str(x) for x in reversed(b))
    # ipv6: 32 hex chars in 4 little-endian words
    words = [h[i:i+8] for i in range(0, len(h), 8)]
    out = []
    for w in words:
        b = bytes.fromhex(w)
        out.append(bytes(reversed(b)).hex())
    full = "".join(out)
    return ":".join(full[i:i+4] for i in range(0, 32, 4))


def parse_tcp(path: str):
    conns = []
    lines = read(path).splitlines()[1:]
    for ln in lines:
        f = ln.split()
        if len(f) < 10:
            continue
        l_ip, l_port = f[1].split(":")
        r_ip, r_port = f[2].split(":")
        state = TCP_STATES.get(f[3])
        if not state:
            continue
        inode = f[9]
        conns.append({
            "local_ip": hexip(l_ip), "local_port": int(l_port, 16),
            "remote_ip": hexip(r_ip), "remote_port": int(r_port, 16),
            "state": state, "inode": inode,
        })
    return conns


def inode_to_pid():
    m = {}
    for fd in glob.glob("/proc/[0-9]*/fd/*"):
        try:
            tgt = os.readlink(fd)
        except OSError:
            continue
        if tgt.startswith("socket:["):
            inode = tgt[8:-1]
            pid = int(fd.split("/")[2])
            m[inode] = pid
    return m


def is_loopback(ip: str) -> bool:
    return ip.startswith("127.") or ip in ("::1", "0.0.0.0", "::")


def net_loop(get_procs):
    global SIEM_IPS
    seen = set()
    tick = 0
    while True:
        try:
            tick += 1
            if tick % 120 == 1:          # refresh in case the SIEM restarted
                SIEM_IPS = siem_ips() or SIEM_IPS
            conns = parse_tcp("/proc/net/tcp") + parse_tcp("/proc/net/tcp6")
            # Ports we listen on (gunicorn's 8080): any connection whose LOCAL
            # port is one of these is a client reaching US — inbound traffic, not
            # egress. Egress is a connection WE opened (ephemeral local port to a
            # remote service). Without this every shopper request looks like C2.
            listen_ports = {c["local_port"] for c in conns if c["state"] == "LISTEN"}
            imap = inode_to_pid()
            procs = get_procs()
            for c in conns:
                if c["state"] == "LISTEN" or c["local_port"] in listen_ports:
                    continue   # inbound connection to one of our listeners
                if is_loopback(c["remote_ip"]) or c["remote_ip"] in SIEM_IPS:
                    continue   # loopback and the store's own SIEM link are not C2
                key = (c["remote_ip"], c["remote_port"], c["inode"])
                if key in seen:
                    continue
                pid = imap.get(c["inode"])
                if pid is None or not is_web(pid, procs):
                    continue  # only web-spawned egress is interesting
                seen.add(key)
                info = procs.get(pid, {})
                emit.emit(emit.netconn_event(
                    "outbound", c["remote_ip"], c["remote_port"], c["local_port"],
                    verdict="c2",
                    detail=f"web-spawned {info.get('comm','?')} reached out",
                    pid=pid, process_name=info.get("comm", "?"),
                    process_cmdline=info.get("cmdline", ""),
                    process_guid=emit.guid(0, pid),
                ))
            if len(seen) > 20000:
                seen = set(list(seen)[-5000:])
        except Exception:
            pass
        time.sleep(POLL * 2)


def main():
    emit.start_sender(source="sensor")
    known = snapshot()          # baseline: don't replay pre-existing processes
    latest = {"procs": known}

    import threading
    threading.Thread(target=net_loop, args=(lambda: latest["procs"],),
                     daemon=True).start()

    print(f"[sensor] baseline {len(known)} processes; polling every {POLL}s")
    while True:
        procs = snapshot()
        latest["procs"] = procs
        for pid, info in procs.items():
            if pid not in known:
                emit_proc(info, procs)
        known = procs
        time.sleep(POLL)


if __name__ == "__main__":
    main()
