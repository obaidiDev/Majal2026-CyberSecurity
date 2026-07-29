FROM python:3.12-slim

# ping for the admin "network tools" page (the cmdi vector); curl + netcat so a
# command-injection foothold has real egress tools — the reverse shells and curl
# exfils red reaches for are exactly what lights up the blue team's netconn feed.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      iputils-ping curl netcat-openbsd ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x entrypoint.sh

# Non-root, low-privilege runtime user. Command injection gives a shell as THIS
# user inside the container — not root, not the host. The flag homes live off
# /app (the Day 4 paths are dead) and are owned by shopuser so seed.py can write
# them and the traversal / cmdi exploits can read them back.
# /shared is the mountpoint for the flags volume the SIEM reads; creating it in
# the image owned by shopuser makes the named volume inherit that ownership, so
# seed.py (running as shopuser) can write flags.json there on boot.
RUN useradd -m -u 10001 shopuser \
 && mkdir -p /app/data /srv/majal/vault /srv/flags /shared \
 && chown -R shopuser:shopuser /app /srv/majal /srv/flags /shared
USER shopuser

EXPOSE 8080
CMD ["./entrypoint.sh"]
