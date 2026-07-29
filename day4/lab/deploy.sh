#!/usr/bin/env bash
# Push this lab to the Tailscale VM and bring it up there.
# Usage:  ./deploy.sh user@majal-lab        (Tailscale MagicDNS name or 100.x IP)
#
# Copies the source over SSH (rsync), then runs run.sh on the box. Safe to
# re-run; it rebuilds the image and replaces the container.
set -euo pipefail

TARGET="${1:?usage: ./deploy.sh user@host   (Tailscale name or 100.x.y.z)}"
DEST="${DEST:-~/cyber/day4/lab}"
PORT="${PORT:-80}"

cd "$(dirname "$0")"

echo "==> Syncing source to ${TARGET}:${DEST}"
ssh "$TARGET" "mkdir -p ${DEST}"
rsync -az --delete \
  --exclude '.venv' --exclude 'data/store.db' --exclude 'receipts/*.txt' \
  --exclude 'receipts/FLAG.txt' --exclude '__pycache__' \
  ./ "${TARGET}:${DEST}/"

echo "==> Building and starting on the VM"
ssh "$TARGET" "cd ${DEST} && chmod +x run.sh reset.sh && PORT=${PORT} ./run.sh"

echo
echo "==> Done. Point students at:  http://${TARGET#*@}:${PORT}/"
echo "    Optional 10-min auto-reset:  sudo cp ${DEST}/reset.cron /etc/cron.d/majal-lab-reset"
