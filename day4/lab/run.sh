#!/usr/bin/env bash
# Build and (re)launch the Majal Store lab container with guard rails.
# Run this on the VM. Idempotent: re-run to rebuild after a source change.
set -euo pipefail

NAME=majal-lab
PORT="${PORT:-80}"            # students browse to http://<vm>/  (override: PORT=8080 ./run.sh)
IMAGE=majal-lab:latest

cd "$(dirname "$0")"

echo "==> Building $IMAGE"
docker build -t "$IMAGE" .

echo "==> Removing any old container"
docker rm -f "$NAME" 2>/dev/null || true

echo "==> Starting $NAME on port $PORT"
docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  --publish "${PORT}:8080" \
  --cpus=2 \
  --memory=2g \
  --pids-limit=256 \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  "$IMAGE"

echo "==> Up. Guard rails: 2 CPU / 2 GB / 256 PIDs / logs capped at 3x10MB."
echo "    Students:  http://<this-vm-ip>:${PORT}/"
echo "    Logs:      docker logs -f $NAME"
echo "    Reset:     ./reset.sh"
