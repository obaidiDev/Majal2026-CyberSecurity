#!/usr/bin/env python3
"""Build data/store.db from schema.sql and seed it.

Rerun any time to reset the lab to a clean state. The 10-minute cron and the
RESET button both just call this script.
"""
import os
import sqlite3
import random
from datetime import datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "data", "store.db")
SCHEMA = os.path.join(HERE, "schema.sql")
RECEIPTS = os.path.join(HERE, "receipts")

random.seed(1337)  # reproducible so IDOR/receipt targets are stable across resets

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


def make_receipt(order_id, username, fullname, items, total, created):
    lines = []
    lines.append("=" * 46)
    lines.append("            MAJAL STORE — RECEIPT")
    lines.append("=" * 46)
    lines.append(f"Order:    #{order_id}")
    lines.append(f"Customer: {fullname} ({username})")
    lines.append(f"Date:     {created}")
    lines.append("-" * 46)
    for name, qty, price in items:
        lines.append(f"{qty} x {name:<28} {price*qty:>8.2f}")
    lines.append("-" * 46)
    lines.append(f"{'TOTAL':<32}{total:>12.2f}")
    lines.append("=" * 46)
    lines.append("Thank you for shopping with Majal.")
    lines.append("")
    return "\n".join(lines)


def main():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    os.makedirs(RECEIPTS, exist_ok=True)
    # wipe old receipts so resets don't accumulate
    for f in os.listdir(RECEIPTS):
        if f.endswith(".txt"):
            os.remove(os.path.join(RECEIPTS, f))

    if os.path.exists(DB):
        os.remove(DB)
    con = sqlite3.connect(DB)
    with open(SCHEMA) as fh:
        con.executescript(fh.read())
    cur = con.cursor()

    # --- admin -------------------------------------------------------------
    cur.execute(
        "INSERT INTO users (username,password,fullname,email,address,is_admin) VALUES (?,?,?,?,?,1)",
        ("admin", "M@jal-Adm1n-2026", "Store Administrator", "admin@majal.store",
         "Majal HQ, Riyadh"),
    )
    # a juicy non-student target for IDOR/stored-XSS storytelling
    cur.execute(
        "INSERT INTO users (username,password,fullname,email,address,is_admin) VALUES (?,?,?,?,?,0)",
        ("m.alfaisal", "Sunset!992", "Maha Al-Faisal", "maha@example.com",
         "Villa 12, Jeddah"),
    )

    # --- products ----------------------------------------------------------
    for p in PRODUCTS:
        cur.execute(
            "INSERT INTO products (name,category,price,stock,blurb) VALUES (?,?,?,?,?)", p
        )

    # --- 50 students -------------------------------------------------------
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

    # --- orders + receipts for every non-admin user ------------------------
    cur.execute("SELECT id, username, fullname FROM users WHERE is_admin=0")
    users = cur.fetchall()
    base = datetime(2026, 7, 20, 9, 0, 0)
    for uid, username, fullname in users:
        for _ in range(random.randint(1, 3)):
            n_items = random.randint(1, 3)
            picks = random.sample(PRODUCTS, n_items)
            items = []
            total = 0.0
            for name, cat, price, stock, blurb in picks:
                qty = random.randint(1, 2)
                items.append((name, qty, price))
                total += price * qty
            created = (base + timedelta(minutes=random.randint(0, 12000))).strftime("%Y-%m-%d %H:%M")
            receipt_name = ""  # placeholder, fill after we have the id
            cur.execute(
                "INSERT INTO orders (user_id,created,total,receipt) VALUES (?,?,?,?)",
                (uid, created, round(total, 2), receipt_name),
            )
            oid = cur.lastrowid
            for name, qty, price in items:
                cur.execute(
                    "INSERT INTO order_items (order_id,product,qty,price) VALUES (?,?,?,?)",
                    (oid, name, qty, price),
                )
            receipt_name = f"receipt_{oid:04d}.txt"
            cur.execute("UPDATE orders SET receipt=? WHERE id=?", (receipt_name, oid))
            with open(os.path.join(RECEIPTS, receipt_name), "w") as fh:
                fh.write(make_receipt(oid, username, fullname, items, round(total, 2), created))

    # --- a couple of seeded reviews so the page isn't empty ----------------
    seed_reviews = [
        (1, "Omar", "Flew it over the dunes at sunrise. Unreal footage."),
        (3, "Sara", "ANC is great on flights. Wish the case were smaller."),
        (5, "Khalid", "The thock is real. Swapped in silent reds, perfect."),
    ]
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    for pid, author, body in seed_reviews:
        cur.execute(
            "INSERT INTO reviews (product_id,author,body,created) VALUES (?,?,?,?)",
            (pid, author, body, now),
        )

    # a secret file on the "server" — the path-traversal prize
    with open(os.path.join(RECEIPTS, "..", "FLAG.txt"), "w") as fh:
        fh.write("MAJAL{path_traversal_walks_out_of_the_receipts_folder}\n")

    con.commit()
    con.close()
    print(f"Seeded {DB}: {len(users)} customers, {len(PRODUCTS)} products.")


if __name__ == "__main__":
    main()
