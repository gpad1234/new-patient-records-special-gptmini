#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_PORT=${API_PORT:-5002}
WEB_PORT=${WEB_PORT:-3000}

echo "Starting local stack: API -> http://localhost:${API_PORT}, Web -> http://localhost:${WEB_PORT}"

# Show today's journal and prompt for confirmation unless SKIP_JOURNAL is set
if [ "${SKIP_JOURNAL:-}" != "1" ]; then
  if [ -f "$ROOT/JOURNAL.md" ]; then
    echo
    echo "===== Please read today's JOURNAL before proceeding ====="
    echo
    sed -n '1,200p' "$ROOT/JOURNAL.md" || true
    echo
    read -r -p "Continue starting local stack? (y/N): " __ANS
    if [ "${__ANS,,}" != "y" ]; then
      echo "Aborted by user. Set SKIP_JOURNAL=1 to bypass this prompt.";
      exit 1
    fi
  fi
fi

# Start read-only API
pkill -f read_only_viewer.py || true
sleep 0.2
cd "$ROOT"
# Ensure services/data points to node-api data for viewer compatibility
if [ ! -e "$ROOT/services/data" ]; then
  if [ -d "$ROOT/services/node-api/data" ]; then
    ln -s "$ROOT/services/node-api/data" "$ROOT/services/data" && echo "Created symlink services/data -> services/node-api/data"
  else
    mkdir -p "$ROOT/services/data"
  fi
fi

# If node-api's diabetes DB is missing, attempt to initialize it (idempotent)
if [ ! -f "$ROOT/services/node-api/data/diabetes.db" ]; then
  if [ -x "$ROOT/scripts/init-auth-db.sh" ]; then
    echo "Initializing node-api diabetes DB..."
    bash "$ROOT/scripts/init-auth-db.sh" || true
  fi
fi
nohup env PORT=$API_PORT HOST=localhost python3 read_only_viewer.py &>/tmp/read_only_viewer.log &
API_PID=$!
echo "API started (PID $API_PID) — logs: /tmp/read_only_viewer.log"

# Start React dev server
cd "$ROOT/web"
if [ ! -d node_modules ]; then
  echo "Installing web dependencies (npm ci)..."
  npm ci
fi
pkill -f 'vite' || true
nohup env PORT=$WEB_PORT VITE_API_URL=http://localhost:$API_PORT npm run dev &>/tmp/web-dev.log &
WEB_PID=$!
echo "Web dev started (PID $WEB_PID) — logs: /tmp/web-dev.log"

echo
echo "Open: http://localhost:${WEB_PORT}/"
echo "If login is required, run in browser console: localStorage.setItem('token','dev') and reload"
