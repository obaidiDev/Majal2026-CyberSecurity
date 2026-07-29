#!/usr/bin/env python3
"""
Telemetry emitter for the Majal Store live lab.

Both the web app (app.py) and the standalone sensor (agent.py) import this to
ship events to the SIEM. Events are shaped to match the Day 5 EDR schema
(day5/lab/edr.jsonl) so the live console feels like the same world as the
morning investigation:

    procstart / childproc / netconn  with device_name="majalstore",
    process_guid, reputation, cmdline, etc.

Design notes
------------
* One background sender thread drains a queue and POSTs newline-delimited JSON
  to $SIEM_URL/ingest. The web request path never blocks on the network.
* If $SIEM_URL is unset or unreachable, events fall back to $TELEMETRY_FILE
  (default ./data/telemetry.jsonl) and stderr, so Phase 1 is testable with no
  SIEM running yet.
* Every event carries a hidden `verdict` (benign / sqli / cmdi / traversal /
  idor / xss / c2 / flag_capture). The SIEM strips this before showing blue the
  feed; it is the ground truth used to grade call-outs. It lives here so the one
  component that has the context (the app / the sensor) is the one that judges.
"""
import os
import sys
import json
import queue
import socket
import threading
import time
import urllib.request
from datetime import datetime, timezone

DEVICE_ID = int(os.environ.get("DEVICE_ID", "1147"))
DEVICE_NAME = os.environ.get("DEVICE_NAME", "majalstore")
SIEM_URL = os.environ.get("SIEM_URL", "").rstrip("/")
TELEMETRY_FILE = os.environ.get(
    "TELEMETRY_FILE",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "telemetry.jsonl"),
)
SOURCE = "store"  # overridden to "sensor" by agent.py

_q: "queue.Queue[dict]" = queue.Queue(maxsize=10000)
_seq = 0
_seq_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _next_seq() -> int:
    global _seq
    with _seq_lock:
        _seq += 1
        return _seq


def guid(unit: int, ident: int) -> str:
    """Carbon-Black-style process_guid: <device>-<pad>-<id>-...-<id>."""
    return f"{DEVICE_ID:09d}-0000-{ident & 0xffff:04x}-0000-{ident & 0xffffffffffff:012x}"


def emit(event: dict) -> None:
    """Enrich with device identity + monotonic id and enqueue for shipping."""
    event.setdefault("event_timestamp", _now())
    event.setdefault("device_id", DEVICE_ID)
    event.setdefault("device_name", DEVICE_NAME)
    event.setdefault("device_os", "LINUX")
    event["event_id"] = _next_seq()
    event["source"] = event.get("source", SOURCE)
    try:
        _q.put_nowait(event)
    except queue.Full:
        pass  # drop under flood rather than stall the web worker


def _post(batch: list) -> bool:
    if not SIEM_URL:
        return False
    body = ("\n".join(json.dumps(e) for e in batch)).encode()
    req = urllib.request.Request(
        SIEM_URL + "/ingest", data=body,
        headers={"Content-Type": "application/x-ndjson"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as r:
            return 200 <= r.status < 300
    except Exception:
        return False


def _fallback(batch: list) -> None:
    try:
        os.makedirs(os.path.dirname(TELEMETRY_FILE), exist_ok=True)
        with open(TELEMETRY_FILE, "a") as fh:
            for e in batch:
                fh.write(json.dumps(e) + "\n")
    except OSError:
        pass
    for e in batch:
        sys.stderr.write("[telemetry] " + json.dumps(e) + "\n")


def _sender() -> None:
    while True:
        first = _q.get()
        batch = [first]
        # coalesce a small burst without waiting long
        for _ in range(199):
            try:
                batch.append(_q.get_nowait())
            except queue.Empty:
                break
        if not _post(batch):
            _fallback(batch)


def start_sender(source: str = "store") -> None:
    global SOURCE
    SOURCE = source
    t = threading.Thread(target=_sender, name="telemetry-sender", daemon=True)
    t.start()


# convenience builders --------------------------------------------------------
def netconn_event(direction, remote_ip, remote_port, local_port,
                  verdict="benign", **extra) -> dict:
    e = {
        "type": "netconn",
        "direction": direction,          # "inbound" | "outbound"
        "remote_ip": remote_ip,
        "remote_port": remote_port,
        "local_port": local_port,
        "verdict": verdict,
    }
    e.update(extra)
    return e
