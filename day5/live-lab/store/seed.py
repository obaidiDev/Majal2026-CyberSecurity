#!/usr/bin/env python3
"""Build data/store.db and plant this run's flags.

Forked from day4/lab/seed.py. Runs on every container start, so:

  * the five flags are freshly minted each boot  -> Day 4 notes are worthless
  * flag values are written to data/flags.json     -> the red portal validates
    submissions against it; the app reads the XSS flag from it

The five flags and where each one lives (all moved off the burned Day 4 paths):

  sqli       secrets table row            UNION injection on the login query
  cmdi       $CMDI_FLAG file + FLAG_CMDI  command injection in admin ping
  traversal  $VAULT_FLAG (off /app)       receipt ?file= walks out to it
  idor       one customer's order.notes   /order/<id> with no ownership check
  xss        admin-only /admin/flag page  stored-XSS payload runs as admin
"""
import os
import json
import sqlite3
import random
import secrets as pysecrets
from datetime import datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "data", "store.db")
SCHEMA = os.path.join(HERE, "schema.sql")
RECEIPTS = os.path.join(HERE, "receipts")
FLAGS_PATH = os.environ.get("FLAGS_PATH", os.path.join(HERE, "data", "flags.json"))

# Flag file homes. Defaults live off /app so Day 4 paths are dead; override with
# env for local (non-Docker) testing where /srv isn't writable.
VAULT_FLAG = os.environ.get("VAULT_FLAG", "/srv/majal/vault/traversal.flag")
CMDI_FLAG = os.environ.get("CMDI_FLAG", "/srv/flags/cmdi.flag")

random.seed(1337)  # reproducible customers/orders (IDOR target stable per run)

PRODUCTS = [
    ("Falcon Pro Drone",        "Drones",      1299.00, 14, "4K gimbal, 40-min flight, obstacle avoidance."),
    ("Desert Rover Power Bank", "Power",          89.00, 60, "26,800mAh, solar top-up, USB-C 100W."),
    ("Oryx Noise-Cancel Buds",  "Audio",         149.00, 33, "Hybrid ANC, 30h battery, wireless charging."),
    ("Sahara Action Cam",       "Cameras",       349.00, 21, "5.3K60, waterproof to 20m, HyperSteady."),
    ("Pearl Mechanical Keyboard","Peripherals",  119.00, 45, "Hot-swap switches, PBT caps, QMK."),
    ("Gulf Smartwatch S3",      "Wearables",     229.00, 28, "AMOLED, ECG, 14-day battery, dive-rated."),
    ("Dune 4K Monitor 27\"",    "Displays",      399.00, 12, "IPS, 144Hz, USB-C 90W, HDR600."),
    ("Nomad Mesh Router",       "Networking",    179.00, 19, "Wi-Fi 6E, 3-pack mesh, 8,000 sq ft."),
    ("Majal Cloud Camera",      "Security",       79.00, 52, "2K, night vision, local SD, no subscription."),
    ("Atlas Travel Backpack",   "Bags",          139.00, 40, "35L, anti-theft, USB pass-through, laptop 16\"."),
]

FIRST = ["Layla","Omar","Sara","Yousef","Nora","Khalid","Maya","Ali","Huda","Faisal",
         "Reem","Tariq","Aisha","Sami","Dana","Bilal","Lina","Zaid","Mona","Hani",
         "Salma","Nael","Rania","Waleed","Jana","Fadi","Dima","Rami","Hala","Basel"]
LAST = ["Al-Harbi","Nasser","Al-Sayed","Kanaan","Darwish","Al-Amin","Haddad","Saleh",
        "Al-Rashid","Mansour","Khoury","Al-Farsi","Zahra","Naji","Al-Qasimi"]
CITIES = ["Riyadh","Jeddah","Dammam","Dubai","Doha","Kuwait City","Manama","Muscat"]


def mint_flags() -> dict:
    def tok(kind):
        return "MAJAL{%s_%s}" % (kind, pysecrets.token_hex(4))
    return {
        "sqli":      tok("sqli"),
        "cmdi":      tok("cmdi"),
        "traversal": tok("trav"),
        "idor":      tok("idor"),
        "xss":       tok("xss"),
    }


def write_flag_file(path: str, value: str) -> str:
    """Write a flag to disk; fall back into data/ if the target isn't writable."""
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if os.path.exists(path):
            os.remove(path)  # prior boot may have left it read-only
        with open(path, "w") as fh:
            fh.write(value + "\n")
        return path
    except OSError:
        alt = os.path.join(HERE, "data", os.path.basename(path))
        os.makedirs(os.path.dirname(alt), exist_ok=True)
        with open(alt, "w") as fh:
            fh.write(value + "\n")
        print(f"  ! {path} not writable; wrote {alt} instead")
        return alt


def make_receipt(order_id, username, fullname, items, total, created):
    lines = ["=" * 46, "            MAJAL STORE — RECEIPT", "=" * 46,
             f"Order:    #{order_id}", f"Customer: {fullname} ({username})",
             f"Date:     {created}", "-" * 46]
    for name, qty, price in items:
        lines.append(f"{qty} x {name:<28} {price*qty:>8.2f}")
    lines += ["-" * 46, f"{'TOTAL':<32}{total:>12.2f}", "=" * 46,
              "Thank you for shopping with Majal.", ""]
    return "\n".join(lines)


def main():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    os.makedirs(RECEIPTS, exist_ok=True)
    for f in os.listdir(RECEIPTS):
        if f.endswith(".txt"):
            os.remove(os.path.join(RECEIPTS, f))

    flags = mint_flags()

    if os.path.exists(DB):
        os.remove(DB)
    con = sqlite3.connect(DB)
    with open(SCHEMA) as fh:
        con.executescript(fh.read())
    cur = con.cursor()

    # --- admin + a juicy non-student target -------------------------------
    cur.execute(
        "INSERT INTO users (username,password,fullname,email,address,is_admin) VALUES (?,?,?,?,?,1)",
        ("admin", "M@jal-Adm1n-2026", "Store Administrator", "admin@majal.store",
         "Majal HQ, Riyadh"),
    )
    cur.execute(
        "INSERT INTO users (username,password,fullname,email,address,is_admin) VALUES (?,?,?,?,?,0)",
        ("m.alfaisal", "Sunset!992", "Maha Al-Faisal", "maha@example.com",
         "Villa 12, Jeddah"),
    )
    MAHA_ID = 2

    for p in PRODUCTS:
        cur.execute(
            "INSERT INTO products (name,category,price,stock,blurb) VALUES (?,?,?,?,?)", p
        )

    for i in range(1, 51):
        username = f"student{i:02d}"
        fn = f"{random.choice(FIRST)} {random.choice(LAST)}"
        city = random.choice(CITIES)
        cur.execute(
            "INSERT INTO users (username,password,fullname,email,address,is_admin) VALUES (?,?,?,?,?,0)",
            (username, f"majal{i:02d}", fn, f"{username}@majal.lab",
             f"Flat {random.randint(1,99)}, {city}"),
        )
    con.commit()

    # --- orders + receipts for every non-admin user -----------------------
    cur.execute("SELECT id, username, fullname FROM users WHERE is_admin=0")
    users = cur.fetchall()
    base = datetime(2026, 7, 20, 9, 0, 0)
    maha_flag_oid = None
    for uid, username, fullname in users:
        for _ in range(random.randint(1, 3)):
            n_items = random.randint(1, 3)
            picks = random.sample(PRODUCTS, n_items)
            items, total = [], 0.0
            for name, cat, price, stock, blurb in picks:
                qty = random.randint(1, 2)
                items.append((name, qty, price))
                total += price * qty
            created = (base + timedelta(minutes=random.randint(0, 12000))).strftime("%Y-%m-%d %H:%M")
            # IDOR prize: hide the flag in one of Maha's order notes.
            notes = ""
            if uid == MAHA_ID and maha_flag_oid is None:
                notes = f"Gift wrap — enclose card: {flags['idor']}"
            cur.execute(
                "INSERT INTO orders (user_id,created,total,receipt,notes) VALUES (?,?,?,?,?)",
                (uid, created, round(total, 2), "", notes),
            )
            oid = cur.lastrowid
            if notes:
                maha_flag_oid = oid
            for name, qty, price in items:
                cur.execute(
                    "INSERT INTO order_items (order_id,product,qty,price) VALUES (?,?,?,?)",
                    (oid, name, qty, price),
                )
            receipt_name = f"receipt_{oid:04d}.txt"
            cur.execute("UPDATE orders SET receipt=? WHERE id=?", (receipt_name, oid))
            with open(os.path.join(RECEIPTS, receipt_name), "w") as fh:
                fh.write(make_receipt(oid, username, fullname, items, round(total, 2), created))

    # --- seed reviews ------------------------------------------------------
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    for pid, author, body in [
        (1, "Omar", "Flew it over the dunes at sunrise. Unreal footage."),
        (3, "Sara", "ANC is great on flights. Wish the case were smaller."),
        (5, "Khalid", "The thock is real. Swapped in silent reds, perfect."),
    ]:
        cur.execute(
            "INSERT INTO reviews (product_id,author,body,created) VALUES (?,?,?,?)",
            (pid, author, body, now),
        )

    # --- SQLi prize: a secret only the login UNION can reach ---------------
    cur.execute("INSERT INTO secrets (name,value) VALUES (?,?)",
                ("api_key", "sk-majal-" + pysecrets.token_hex(8)))
    cur.execute("INSERT INTO secrets (name,value) VALUES (?,?)",
                ("flag", flags["sqli"]))

    con.commit()
    con.close()

    # --- file-backed flags -------------------------------------------------
    trav_path = write_flag_file(VAULT_FLAG, flags["traversal"])
    cmdi_path = write_flag_file(CMDI_FLAG, flags["cmdi"])

    # --- flags.json: single source of truth for the red portal + app -------
    os.makedirs(os.path.dirname(FLAGS_PATH), exist_ok=True)
    with open(FLAGS_PATH, "w") as fh:
        json.dump({
            "minted": datetime.now(tz=None).isoformat(timespec="seconds"),
            "flags": flags,
            "locations": {
                "sqli": "secrets table",
                "cmdi": cmdi_path,
                "traversal": trav_path,
                "idor": f"order #{maha_flag_oid} (Maha Al-Faisal)",
                "xss": "/admin/flag",
            },
        }, fh, indent=2)

    print(f"Seeded {DB}: {len(users)} customers, {len(PRODUCTS)} products.")
    print(f"Flags minted -> {FLAGS_PATH}")
    for k, v in flags.items():
        print(f"  {k:9s} {v}")


if __name__ == "__main__":
    main()
