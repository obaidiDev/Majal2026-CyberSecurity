-- Majal Store — LIVE red-vs-blue lab database schema.
-- Forked from day4/lab/schema.sql. Same store; two additions carry flags:
--   * secrets  -> the SQL-injection prize (extract with a UNION on login)
--   * orders.notes -> the IDOR prize (lives inside one customer's order)
-- The vulnerabilities themselves still live in app.py, not here.

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS secrets;

CREATE TABLE users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,          -- plaintext on purpose (teaching artefact)
    fullname  TEXT NOT NULL,
    email     TEXT NOT NULL,
    address   TEXT NOT NULL,
    is_admin  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    category  TEXT NOT NULL,
    price     REAL NOT NULL,
    stock     INTEGER NOT NULL,
    blurb     TEXT NOT NULL
);

CREATE TABLE orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    created    TEXT NOT NULL,
    total      REAL NOT NULL,
    receipt    TEXT NOT NULL,         -- filename under receipts/
    notes      TEXT NOT NULL DEFAULT ''  -- gift message; one order hides the IDOR flag
);

CREATE TABLE order_items (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id  INTEGER NOT NULL,
    product   TEXT NOT NULL,
    qty       INTEGER NOT NULL,
    price     REAL NOT NULL
);

CREATE TABLE reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    author     TEXT NOT NULL,
    body       TEXT NOT NULL,         -- rendered unescaped -> stored XSS
    created    TEXT NOT NULL
);

-- Not linked from any page. The login query can be coerced into reading it
-- with a UNION injection; nothing else exposes it.
CREATE TABLE secrets (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT NOT NULL,
    value  TEXT NOT NULL
);
