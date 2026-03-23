#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_PORT=${API_PORT:-3001}
WEB_PORT=${WEB_PORT:-3000}

echo "Starting local stack: API -> http://127.0.0.1:${API_PORT}, Web -> http://localhost:${WEB_PORT}"

# Start read-only API
pkill -f read_only_viewer.py || true
sleep 0.2
cd "$ROOT"
nohup env PORT=$API_PORT python3 read_only_viewer.py &>/tmp/read_only_viewer.log &
API_PID=$!
echo "API started (PID $API_PID) — logs: /tmp/read_only_viewer.log"

# Start React dev server
cd "$ROOT/web"
if [ ! -d node_modules ]; then
  echo "Installing web dependencies (npm ci)..."
  npm ci
fi
pkill -f 'vite' || true
nohup env PORT=$WEB_PORT VITE_API_URL=http://127.0.0.1:$API_PORT npm run dev &>/tmp/web-dev.log &
WEB_PID=$!
echo "Web dev started (PID $WEB_PID) — logs: /tmp/web-dev.log"

echo
echo "Open: http://localhost:${WEB_PORT}/"
echo "If login is required, run in browser console: localStorage.setItem('token','dev') and reload"
