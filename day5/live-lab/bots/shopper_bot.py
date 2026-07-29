#!/usr/bin/env python3
"""
Shopper bot — benign background traffic for the red-vs-blue lab.

Its whole job is to give the blue team *innocents*. Without a steady stream of
ordinary customers, the SIEM is nothing but attackers and blue can safely call
every IP it sees. With it, calling on volume or a hunch means shooting a shopper
— friendly fire — and losing your shift.

Each virtual shopper browses from its own source address (set via X-Forwarded-For,
which the lab store honours) so blue sees many distinct benign IPs, not one
obvious "bot" address. Everything it does is genuinely benign: it never sends a
payload that trips a verdict, so a call on any of these IPs is always wrong.

Config (env):
  STORE_URL        target store            (default http://store:8080)
  SHOPPERS         concurrent shoppers     (default 12)
  SHOPPER_SUBNET   /24 the IPs come from   (default 10.20.0)
  MIN_DELAY/MAX_DELAY  seconds between a shopper's actions (default 2 / 9)
"""
import os
import time
import random
import threading
import urllib.request
import urllib.parse
import http.cookiejar

STORE_URL = os.environ.get("STORE_URL", "http://store:8080").rstrip("/")
SHOPPERS = int(os.environ.get("SHOPPERS", "12"))
SUBNET = os.environ.get("SHOPPER_SUBNET", "10.20.0")
MIN_DELAY = float(os.environ.get("MIN_DELAY", "2"))
MAX_DELAY = float(os.environ.get("MAX_DELAY", "9"))

SEARCHES = ["drone", "buds", "keyboard", "power bank", "camera", "watch",
            "monitor", "router", "backpack", "security", "audio", "usb-c"]
REVIEWS = ["Great value, fast shipping.", "Exactly as described.",
           "Works perfectly, would buy again.", "Solid build quality.",
           "Happy with this purchase.", "Battery lasts all day.",
           "Setup was painless.", "Recommended for the price."]
UAS = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
       "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
       "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
       "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15"]


class Shopper:
    def __init__(self, ip, ua):
        self.ip, self.ua = ip, ua
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar))
        self.student = None

    def _req(self, method, path, data=None):
        url = STORE_URL + path
        body = urllib.parse.urlencode(data).encode() if data else None
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("X-Forwarded-For", self.ip)
        req.add_header("User-Agent", self.ua)
        try:
            with self.opener.open(req, timeout=8) as r:
                r.read(4096)
        except Exception:
            pass

    def browse(self):
        self._req("GET", "/")
        for _ in range(random.randint(1, 4)):
            roll = random.random()
            if roll < 0.4:
                self._req("GET", f"/product/{random.randint(1,10)}")
            elif roll < 0.65:
                self._req("GET", "/?q=" + urllib.parse.quote(random.choice(SEARCHES)))
            elif roll < 0.8 and not self.student:
                self.login()
            elif roll < 0.9 and self.student:
                self._req("GET", "/account")
            else:
                self._req("POST", f"/product/{random.randint(1,10)}/review",
                          {"author": self.ip, "body": random.choice(REVIEWS)})
            time.sleep(random.uniform(0.3, 1.6))

    def login(self):
        n = random.randint(1, 50)
        self.student = f"student{n:02d}"
        self._req("POST", "/login", {"username": self.student, "password": f"majal{n:02d}"})

    def run(self):
        time.sleep(random.uniform(0, MAX_DELAY))
        while True:
            self.browse()
            time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))


def main():
    print(f"[shopper] {SHOPPERS} shoppers browsing {STORE_URL} from {SUBNET}.0/24")
    used = random.sample(range(2, 250), SHOPPERS)
    for host in used:
        ip = f"{SUBNET}.{host}"
        threading.Thread(target=Shopper(ip, random.choice(UAS)).run, daemon=True).start()
        time.sleep(0.2)
    while True:
        time.sleep(60)


if __name__ == "__main__":
    main()
