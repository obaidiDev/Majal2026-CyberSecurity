FROM python:3.12-slim

# iputils-ping so the admin "network tools" page has a real ping to inject into.
RUN apt-get update \
 && apt-get install -y --no-install-recommends iputils-ping ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as a non-root, low-privilege user. Command injection gives students a
# shell as THIS user inside the container — not root, and not your host.
RUN useradd -m -u 10001 shopuser \
 && mkdir -p /app/data \
 && chown -R shopuser:shopuser /app
USER shopuser

EXPOSE 8080

# Seed on boot, then serve. Worker pool is capped so a scanner can't fork us to
# death; --max-requests recycles workers to bound memory growth under load.
CMD ["sh", "-c", "python seed.py && exec gunicorn --bind 0.0.0.0:8080 --workers 4 --threads 2 --timeout 30 --max-requests 500 --max-requests-jitter 50 --access-logfile - app:app"]
