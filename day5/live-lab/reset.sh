#!/usr/bin/env bash
# Reset the round: fresh flags, clean store, empty scoreboard — in a few seconds.
#
# Restarting the store re-runs seed.py, which re-mints all five flags (so any
# flag already captured is now worthless) and rewrites /shared/flags.json.
# Restarting the SIEM clears the in-memory scoreboard, kill queue, and every
# red/blue registration. The bots reconnect on their own.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Resetting round (new flags, clean SIEM)…"
docker compose restart store siem shopper admin
sleep 2
echo "==> Done. New flags are live; scoreboard and kill queue are clear."
echo "    Tell the room: everything captured before this moment no longer counts."
