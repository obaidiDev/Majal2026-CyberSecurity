#!/usr/bin/env python3
"""
Majal Store — a deliberately vulnerable web app for the Day 4 web-security lab.

Every vulnerability lives inside a normal-looking store feature, not on a page
called sqli.php. The seven planted bugs, and the slide each one belongs to:

  1. SQL Injection      -> login form            (login box, rewrite the query)
  2. Command Injection  -> admin network tools    (text box to a shell)
  3. Path Traversal     -> receipt viewer ?file=  (walk out of the folder)
  4. IDOR               -> /order/<id>            (checks what, not who)
  5. CSRF               -> change-email endpoint   (another site spends your login)
  6. Reflected XSS      -> product search ?q=     (your input becomes code)
  7. Stored XSS         -> product reviews         (your comment is everyone's code)

DO NOT deploy this on the public internet. Tailnet / lab LAN only.
"""
import os
import sqlite3
import subprocess
from datetime import datetime

from flask import (
    Flask, request, session, redirect, url_for, g,
    render_template, render_template_string, abort, Response,
)

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "data", "store.db")
RECEIPTS = os.path.join(HERE, "receipts")

app = Flask(__name__)
# Weak, static secret — session-token slide. Also lets students see the cookie is signed.
app.secret_key = "majal-lab-please-do-not-use-in-prod"
# Lax is the browser default; the CSRF target is a state-changing GET, which Lax
# still sends on a top-level navigation. Keep it explicit so behaviour is stable.
app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_HTTPONLY=False)


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


# ------------------------------------------------------------------------ pages
@app.route("/")
def index():
    q = request.args.get("q", "")
    if q:
        # VULN 6 — Reflected XSS: q is echoed into the page unescaped (|safe below).
        # VULN 1' — the search itself is also string-built (bonus SQLi surface).
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
        # VULN 7 — Stored XSS: body is saved raw and later rendered with |safe.
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
        # VULN 1 — SQL Injection: credentials concatenated straight into the query.
        # Classic bypass:  username = admin' --   (password ignored)
        query = (
            "SELECT * FROM users WHERE username = '%s' AND password = '%s'"
            % (username, password)
        )
        try:
            row = db().execute(query).fetchone()
        except sqlite3.Error as e:
            # Verbose DB errors — helps the SQLi slide land, and aids the attacker.
            error = "SQL error: %s" % e
            row = None
        if row:
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
    if not current_user():
        return redirect(url_for("login"))
    # VULN 4 — IDOR: fetches by order id with NO check that it belongs to you.
    o = db().execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
    if not o:
        abort(404)
    items = db().execute(
        "SELECT * FROM order_items WHERE order_id=?", (oid,)
    ).fetchall()
    owner = db().execute("SELECT * FROM users WHERE id=?", (o["user_id"],)).fetchone()
    return render_template("order.html", o=o, items=items, owner=owner)


@app.route("/receipt")
def receipt():
    if not current_user():
        return redirect(url_for("login"))
    # VULN 3 — Path Traversal: filename joined onto the receipts dir with no
    # sanitisation.  ?file=../FLAG.txt  or  ?file=../../../../etc/passwd
    name = request.args.get("file", "")
    path = os.path.join(RECEIPTS, name)
    try:
        with open(path) as fh:
            data = fh.read()
    except OSError as e:
        return Response("Could not open receipt: %s" % e, mimetype="text/plain", status=404)
    return Response(data, mimetype="text/plain")


@app.route("/account/email")
def change_email():
    # VULN 5 — CSRF: state-changing request with no CSRF token, authenticated
    # only by the session cookie. A GET so a top-level navigation from another
    # site (auto-submitting form / link) carries the Lax cookie and fires it.
    u = current_user()
    if not u:
        return redirect(url_for("login"))
    to = request.args.get("to")
    if to:
        db().execute("UPDATE users SET email=? WHERE id=?", (to, u["id"]))
        db().commit()
        return redirect(url_for("account"))
    return redirect(url_for("account"))


@app.route("/admin", methods=["GET", "POST"])
def admin():
    u = current_user()
    if not u or not u["is_admin"]:
        # Only admins reach the network tools — get here via the SQLi login.
        abort(403)
    output = None
    host = ""
    if request.method == "POST":
        host = request.form.get("host", "")
        # VULN 2 — Command Injection: host is dropped into a shell command.
        #   8.8.8.8; cat ../FLAG.txt     or    8.8.8.8 && id
        cmd = "ping -c 1 %s" % host
        try:
            output = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, timeout=10
            ).stdout or "(no output)"
        except subprocess.TimeoutExpired:
            output = "Command timed out."
    return render_template("admin.html", output=output, host=host)


@app.route("/healthz")
def healthz():
    return "ok\n", 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=False)
