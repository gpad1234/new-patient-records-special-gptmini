#!/usr/bin/env bash
set -euo pipefail

# start-minimal.sh
# Safe minimal startup: stops nonessential services and starts only the Python backend for the
# diabetes clinic pilot using a project-local .venv. Does NOT start the frontend or other services.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "ROOT_DIR=${ROOT_DIR}"

SCRIPTS_DIR="$ROOT_DIR/scripts"
PY_SERVICE_DIR="$ROOT_DIR/services/python-service"

echo "Stopping known nonessential services (safe mode)..."
bash "$SCRIPTS_DIR/stop-nonessential-services.sh" || true

echo "Preparing Python service (.venv)..."
cd "$PY_SERVICE_DIR"
if [ ! -d ".venv" ]; then
  echo "Creating .venv"
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "Initializing SQLite DB (if missing)..."
python3 src/init_db.py || true

echo "Starting Python backend in foreground (use CTRL+C to stop)..."
python3 src/app.py
