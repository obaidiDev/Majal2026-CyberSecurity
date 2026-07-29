#!/usr/bin/env bash
# Heal the box: restart the container, which re-seeds a clean DB and wipes any
# stored-XSS reviews, forged emails, and dropped tables. ~2 seconds of downtime.
# This is the "RESET button" — run it by hand, or let cron call it (see below).
set -euo pipefail
NAME=majal-lab
docker restart "$NAME" >/dev/null
echo "[$(date '+%H:%M:%S')] majal-lab reset — clean DB reseeded."
