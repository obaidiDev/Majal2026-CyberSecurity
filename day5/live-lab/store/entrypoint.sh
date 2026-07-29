#!/bin/sh
# Boot sequence for the Majal Store live-lab container:
#   1. seed the DB and mint THIS run's flags (data/flags.json + on-disk flags)
#   2. expose the command-injection flag via env, so `; env` is an alt path to it
#   3. start the endpoint sensor (agent.py) — same PID namespace as gunicorn, so
#      it sees exactly the container's processes and nothing from the host
#   4. hand off to gunicorn
set -e
cd /app

python seed.py

# seed.py writes flags to $FLAGS_PATH (a shared volume in compose); read the
# command-injection flag from the same place to expose it via env.
FLAGS_FILE="${FLAGS_PATH:-data/flags.json}"
FLAG_CMDI="$(python -c "import json;print(json.load(open('${FLAGS_FILE}'))['flags']['cmdi'])")"
export FLAG_CMDI

# sensor in the background; it ships to $SIEM_URL or falls back to data/telemetry.jsonl
python agent.py &

exec gunicorn --bind 0.0.0.0:8080 \
  --workers 4 --threads 2 --timeout 30 \
  --max-requests 500 --max-requests-jitter 50 \
  --access-logfile - app:app
