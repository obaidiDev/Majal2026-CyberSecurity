#!/usr/bin/env python3
"""
Admin bot — the stored-XSS victim.

A real headless Chromium (Playwright) that logs in as the store administrator
and, on a loop, opens each product's review page. Any review a red player has
laced with script runs *in the admin's authenticated session*: the payload can
read the admin's cookie (the store deliberately leaves the session cookie
non-HttpOnly) or fetch the admin-only prize at /admin/flag, then exfiltrate it
to a listener the red team controls.

Why a real browser: only genuine JS execution makes stored XSS a real weapon and
makes the admin session's outbound request show up. A plain HTTP fetch would
render the review text but never *run* it.

The bot browses from a fixed admin-workstation address (X-Forwarded-For) so its
traffic looks like a real internal admin — another innocent that punishes a
trigger-happy blue analyst who calls it.

Config (env):
  STORE_URL       target store         (default http://store:8080)
  ADMIN_USER/PASS admin credentials    (default admin / M@jal-Adm1n-2026)
  ADMIN_IP        the admin's XFF addr  (default 192.168.8.10)
  ADMIN_INTERVAL  seconds between sweeps (default 20)
  PRODUCT_MAX     highest product id to visit (default 10)
"""
import os
import time

from playwright.sync_api import sync_playwright

STORE_URL = os.environ.get("STORE_URL", "http://store:8080").rstrip("/")
USER = os.environ.get("ADMIN_USER", "admin")
PASS = os.environ.get("ADMIN_PASS", "M@jal-Adm1n-2026")
ADMIN_IP = os.environ.get("ADMIN_IP", "192.168.8.10")
INTERVAL = float(os.environ.get("ADMIN_INTERVAL", "20"))
PRODUCT_MAX = int(os.environ.get("PRODUCT_MAX", "10"))
DWELL = float(os.environ.get("ADMIN_DWELL", "2.0"))   # seconds to let payloads run


def login(page) -> bool:
    page.goto(f"{STORE_URL}/login", wait_until="domcontentloaded")
    try:
        page.fill('input[name="username"]', USER)
        page.fill('input[name="password"]', PASS)
        page.click('button[type="submit"]')
        page.wait_for_load_state("domcontentloaded")
    except Exception as e:
        print("[admin] login error:", e)
        return False
    # /account renders "admin" only when authenticated
    ok = "/login" not in page.url
    print("[admin] logged in" if ok else "[admin] login failed")
    return ok


def sweep(page):
    for pid in range(1, PRODUCT_MAX + 1):
        try:
            page.goto(f"{STORE_URL}/product/{pid}", wait_until="networkidle", timeout=8000)
            page.wait_for_timeout(int(DWELL * 1000))   # let injected scripts fire
        except Exception:
            pass


def main():
    print(f"[admin] victim browser -> {STORE_URL} as {USER} (XFF {ADMIN_IP}), "
          f"sweeping products 1..{PRODUCT_MAX} every {INTERVAL}s")
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        ctx = browser.new_context(extra_http_headers={"X-Forwarded-For": ADMIN_IP})
        page = ctx.new_page()
        page.on("console", lambda m: None)   # swallow page console noise

        while not login(page):
            time.sleep(5)

        while True:
            sweep(page)
            # session can drift; re-auth if we got bounced to /login
            if "/login" in page.url:
                login(page)
            time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
