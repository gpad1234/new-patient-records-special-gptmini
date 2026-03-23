#!/usr/bin/env bash
set -euo pipefail

# stop-nonessential-services.sh
# Conservative helper to stop known non-essential project services during local dev.
# This script attempts to stop services by PID files (if present) or by common commands.
# It does NOT forcibly remove containers or change deployment configs.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Stopping non-essential services (safe mode)"

# Stop python-service pid if created by our start script
PY_PID_FILE="$ROOT_DIR/services/python-service/python-service.pid"
if [ -f "$PY_PID_FILE" ]; then
  pid=$(cat "$PY_PID_FILE" 2>/dev/null || true)
  if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
    echo "Stopping python-service (pid $pid)"
    kill "$pid" || true
    rm -f "$PY_PID_FILE"
  else
    echo "No running python-service found in pid file"
    rm -f "$PY_PID_FILE" || true
  fi
fi

echo "Note: This script only stops processes started with pid files in service folders."
echo "To prune other services (docker, systemd, containers), follow the guidance in FROZEN_SERVICES.md"
