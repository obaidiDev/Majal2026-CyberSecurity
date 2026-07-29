#!/usr/bin/env python3
"""
Majal Store — the LIVE red-vs-blue build of the Day 4 vulnerable app.

Same seven bugs, same store. What's new here:

  * Every request emits an `http` telemetry event to the SIEM (emit.py), tagged
    with a hidden ground-truth verdict the app is uniquely positioned to judge
    (it sees the payload, the resolved path, the order owner, the response).
  * The five flags moved off the burned Day 4 paths and are re-minted each boot
    (seed.py). One route is new: /admin/flag (the stored-XSS prize).
  * When any freshly minted flag token appears in a response body, that event is
    re-stamped `flag_capture` — the loudest signal blue can catch, and proof a
    capture really happened.

The process spawns and outbound connections that command injection produces are
captured out-of-band by agent.py (a standalone /proc sensor), not from here.

DO NOT deploy on the public internet. Tailnet / lab LAN only.
"""
import os
import re
import sys
import json
import ipaddress
import sqlite3
import subprocess
from datetime import datetime

from flask import (
    Flask, request, session, redirect, url_for, g,
    render_template, abort, Response, has_request_context,
)

import emit

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "data", "store.db")
RECEIPTS = os.path.join(HERE, "receipts")
RECEIPTS_REAL = os.path.realpath(RECEIPTS)
FLAGS_PATH = os.environ.get("FLAGS_PATH", os.path.join(HERE, "data", "flags.json"))

app = Flask(__name__)
app.secret_key = "majal-lab-please-do-not-use-in-prod"
app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_HTTPONLY=False)

emit.start_sender(source="store")

# Attack signatures used only to label telemetry for the blue team's grading.
# They do NOT gate any behaviour — the vulns fire regardless.
SIG_SQLI = re.compile(r"(?i)(union\s+select|--|\bor\b\s+['\"]?\d|'='|sleep\s*\(|;\s*drop\b|/\*)")
SIG_XSS = re.compile(r"(?i)(<script|onerror\s*=|onload\s*=|<img|<svg|javascript:|document\.cookie|fetch\s*\()")
SIG_SHELL = re.compile(r"[;&|`]|\$\(|\|\||&&|\bnc\b|\bcurl\b|\bwget\b|\bbash\b|/etc/passwd")


def load_flags():
    try:
        with open(FLAGS_PATH) as fh:
            return json.load(fh).get("flags", {})
    except (OSError, ValueError):
        return {}


FLAGS = load_flags()
FLAG_TOKENS = {v: k for k, v in FLAGS.items()}  # token -> vuln name


# --------------------------------------------------------------------------- db
def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    d = g.pop("db", None)
    if d is not None:
        d.close()


def current_user():
    uid = session.get("uid")
    if uid is None:
        return None
    return db().execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()


@app.context_processor
def inject_user():
    return {"user": current_user(), "year": 2026}


# ----------------------------------------------------------------- telemetry
# Trust X-Forwarded-For ONLY when the direct peer is inside the lab's own
# network (the bots, which reach us over the compose bridge and set XFF so they
# appear as distinct shopper/admin addresses). A red player connects from the
# LAN/Tailnet — an untrusted peer — so any XFF they send is ignored and their
# real address is used. That keeps attribution honest: nobody can frame a shopper.
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
    peer = request.remote_addr or "0.0.0.0"
    xff = request.headers.get("X-Forwarded-For")
    if xff and _peer_trusted(peer):
        return xff.split(",")[0].strip()
    return peer


@app.before_request
def _mark():
    g.verdict = "benign"
    g.detail = ""


@app.after_request
def _ship(resp: Response):
    verdict = getattr(g, "verdict", "benign")
    detail = getattr(g, "detail", "")

    # A minted flag in the response body is the strongest possible signal — the
    # attacker's own request carrying the loot back out. But /admin/flag is the
    # admin's *authorized* resource: the stored-XSS victim (the admin bot) reads
    # it every sweep. Incriminating that read would frame the victim; the real
    # catch for XSS is the review POST that carries the <script> (verdict=xss on
    # the attacker's IP). So never stamp flag_capture on the admin's own page.
    captured = None
    try:
        if resp.direct_passthrough is False and request.path != "/admin/flag":
            body = resp.get_data(as_text=True)
            for token, name in FLAG_TOKENS.items():
                if token and token in body:
                    captured = name
                    break
    except Exception:
        pass
    if captured:
        verdict = "flag_capture"
        detail = f"{captured} flag left the server"

    u = session.get("uid")
    try:
        emit.emit({
            "type": "http",
            "src_ip": client_ip(),
            "method": request.method,
            "path": request.path,
            "query": request.query_string.decode("latin-1")[:512],
            "status": resp.status_code,
            "bytes": resp.calculate_content_length() or 0,
            "user_agent": request.headers.get("User-Agent", "")[:256],
            "username": u,
            "verdict": verdict,
            "detail": detail,
        })
    except Exception:
        pass
    return resp


# ------------------------------------------------------------------------ pages
@app.route("/")
def index():
    q = request.args.get("q", "")
    if q:
        if SIG_XSS.search(q):
            g.verdict, g.detail = "xss", "reflected XSS payload in ?q"
        elif SIG_SQLI.search(q):
            g.verdict, g.detail = "sqli", "SQL metacharacters in ?q"
        # VULN 6 — Reflected XSS + bonus SQLi surface (string-built query).
        rows = db().execute(
            "SELECT * FROM products WHERE name LIKE '%%%s%%' OR category LIKE '%%%s%%'"
            % (q, q)
        ).fetchall()
    else:
        rows = db().execute("SELECT * FROM products ORDER BY id").fetchall()
    return render_template("index.html", products=rows, q=q)


@app.route("/product/<int:pid>")
def product(pid):
    p = db().execute("SELECT * FROM products WHERE id=?", (pid,)).fetchone()
    if not p:
        abort(404)
    reviews = db().execute(
        "SELECT * FROM reviews WHERE product_id=? ORDER BY id DESC", (pid,)
    ).fetchall()
    return render_template("product.html", p=p, reviews=reviews)


@app.route("/product/<int:pid>/review", methods=["POST"])
def add_review(pid):
    u = current_user()
    author = u["fullname"] if u else request.form.get("author", "Guest")
    body = request.form.get("body", "").strip()
    if body:
        if SIG_XSS.search(body):
            g.verdict, g.detail = "xss", "stored XSS payload in review body"
        # VULN 7 — Stored XSS: body saved raw, later rendered with |safe.
        db().execute(
            "INSERT INTO reviews (product_id,author,body,created) VALUES (?,?,?,?)",
            (pid, author, body, datetime.now().strftime("%Y-%m-%d %H:%M")),
        )
        db().commit()
    return redirect(url_for("product", pid=pid))


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if SIG_SQLI.search(username) or SIG_SQLI.search(password):
            g.verdict, g.detail = "sqli", "SQL injection in login form"
        # VULN 1 — SQL Injection: credentials concatenated into the query.
        query = (
            "SELECT * FROM users WHERE username = '%s' AND password = '%s'"
            % (username, password)
        )
        try:
            row = db().execute(query).fetchone()
        except sqlite3.Error as e:
            error = "SQL error: %s" % e
            row = None
        if row:
            # A UNION that pulls the secret into an id/username column logs the
            # user in as "nobody"; the interesting rows still render on account.
            if "id" in row.keys() and row["id"]:
                session["uid"] = row["id"]
                return redirect(url_for("account"))
        if error is None:
            error = "Invalid username or password."
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


@app.route("/account")
def account():
    u = current_user()
    if not u:
        return redirect(url_for("login"))
    orders = db().execute(
        "SELECT * FROM orders WHERE user_id=? ORDER BY id DESC", (u["id"],)
    ).fetchall()
    return render_template("account.html", u=u, orders=orders)


@app.route("/order/<int:oid>")
def order(oid):
    me = current_user()
    if not me:
        return redirect(url_for("login"))
    # VULN 4 — IDOR: fetch by order id with NO check that it belongs to you.
    o = db().execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
    if not o:
        abort(404)
    if o["user_id"] != me["id"]:
        g.verdict = "idor"
        g.detail = f"user {me['id']} read order {oid} owned by user {o['user_id']}"
    items = db().execute(
        "SELECT * FROM order_items WHERE order_id=?", (oid,)
    ).fetchall()
    owner = db().execute("SELECT * FROM users WHERE id=?", (o["user_id"],)).fetchone()
    return render_template("order.html", o=o, items=items, owner=owner)


@app.route("/receipt")
def receipt():
    if not current_user():
        return redirect(url_for("login"))
    # VULN 3 — Path Traversal: filename joined onto receipts dir, unsanitised.
    name = request.args.get("file", "")
    path = os.path.join(RECEIPTS, name)
    real = os.path.realpath(path)
    if not real.startswith(RECEIPTS_REAL + os.sep) and real != RECEIPTS_REAL:
        g.verdict = "traversal"
        g.detail = f"receipt ?file= resolved outside receipts: {real}"
    try:
        with open(path) as fh:
            data = fh.read()
    except OSError as e:
        return Response("Could not open receipt: %s" % e, mimetype="text/plain", status=404)
    return Response(data, mimetype="text/plain")


@app.route("/account/email")
def change_email():
    # VULN 5 — CSRF: state-changing GET, authenticated only by the session cookie.
    u = current_user()
    if not u:
        return redirect(url_for("login"))
    to = request.args.get("to")
    if to:
        if not request.referrer or request.host not in (request.referrer or ""):
            g.verdict, g.detail = "csrf", "off-site email change (no CSRF token)"
        db().execute("UPDATE users SET email=? WHERE id=?", (to, u["id"]))
        db().commit()
    return redirect(url_for("account"))


@app.route("/admin", methods=["GET", "POST"])
def admin():
    u = current_user()
    if not u or not u["is_admin"]:
        abort(403)
    output, host = None, ""
    if request.method == "POST":
        host = request.form.get("host", "")
        if SIG_SHELL.search(host):
            g.verdict, g.detail = "cmdi", "shell metacharacters in ping host"
        # VULN 2 — Command Injection: host dropped into a shell command.
        cmd = "ping -c 1 %s" % host
        try:
            output = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, timeout=10
            ).stdout or "(no output)"
        except subprocess.TimeoutExpired:
            output = "Command timed out."
    return render_template("admin.html", output=output, host=host)


@app.route("/admin/flag")
def admin_flag():
    # VULN 7 prize — reachable only in an admin session. The stored-XSS payload
    # runs as the admin bot, fetches this, and exfiltrates it to the red team.
    u = current_user()
    if not u or not u["is_admin"]:
        abort(403)
    return Response(FLAGS.get("xss", "flag-not-minted") + "\n", mimetype="text/plain")


@app.route("/healthz")
def healthz():
    return "ok\n", 200


# ------------------------------------------------------------- exec audit hook
# The /proc sensor can miss a very short-lived shell (an instant `; id`), and it
# can never know which HTTP request — which source IP — spawned a process. This
# audit hook fires synchronously inside the worker the moment the web app shells
# out, so every web-triggered command is evidenced AND tied to the attacker IP.
def _exec_audit(event, args):
    if event != "subprocess.Popen":
        return
    try:
        if not has_request_context():
            return
        raw = args[1] if len(args) > 1 else (args[0] if args else "")
        cmdline = " ".join(map(str, raw)) if isinstance(raw, (list, tuple)) else str(raw)
        verdict = "cmdi" if SIG_SHELL.search(cmdline) else "benign"
        emit.emit({
            "type": "procstart",
            "source": "store",
            "process_name": (cmdline.split() or ["sh"])[0].rsplit("/", 1)[-1],
            "process_cmdline": cmdline,
            "process_username": "shopuser",
            "parent_name": "gunicorn",
            "web_spawned": True,
            "src_ip": client_ip(),
            "verdict": verdict,
            "detail": "web server executed a shell command",
        })
    except Exception:
        pass


sys.addaudithook(_exec_audit)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=False)
