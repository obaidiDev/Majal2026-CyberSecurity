#!/usr/bin/env bash
# Push the live lab to the Majal Store VM and bring the whole stack up there.
#
# Usage:  ./deploy.sh user@majalstore        (Tailscale MagicDNS name or 100.x IP)
#
# Rsyncs the source, then `docker compose up -d --build` on the box. Safe to
# re-run; it rebuilds changed images and recreates containers.
set -euo pipefail

TARGET="${1:?usage: ./deploy.sh user@host   (Tailscale name or 100.x.y.z)}"
DEST="${DEST:-~/cyber/day5/live-lab}"

cd "$(dirname "$0")"

echo "==> Syncing to ${TARGET}:${DEST}"
ssh "$TARGET" "mkdir -p ${DEST}"
rsync -az --delete \
  --exclude '.venv' --exclude '__pycache__' --exclude '*/data' \
  --exclude '*.jar' \
  ./ "${TARGET}:${DEST}/"

echo "==> Building and starting the stack on the VM"
ssh "$TARGET" "cd ${DEST} && chmod +x reset.sh && docker compose up -d --build"

HOST="${TARGET#*@}"
echo
echo "==> Up. Point the two teams at:"
echo "    RED  attack:     http://${HOST}/            (flags submit at http://${HOST}:8000/red)"
echo "    BLUE console:    http://${HOST}:8000/"
echo "    Projector board: http://${HOST}:8000/board"
echo "    Instructor:      http://${HOST}:8000/instructor?token=\${INSTRUCTOR_TOKEN:-majal-instructor}"
echo
echo "    Logs:   ssh ${TARGET} 'cd ${DEST} && docker compose logs -f'"
echo "    Reset:  ssh ${TARGET} 'cd ${DEST} && ./reset.sh'"
echo
echo "    ⚠  Tailnet / LAN only. Do NOT enable Tailscale Funnel or an exit node."
