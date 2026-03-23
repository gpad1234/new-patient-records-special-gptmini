#!/usr/bin/env bash
set -euo pipefail

# start-diabetes-dev.sh
# Starts services in order (Node API -> Python backend -> Web UI) with health checks
# Provides logs and PIDs for each service so developers can iterate safely.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "ROOT_DIR=${ROOT_DIR}"

PY_SERVICE_DIR="$ROOT_DIR/services/python-service"
WEB_UI_DIR="$ROOT_DIR/services/web-ui"
NODE_API_DIR="$ROOT_DIR/services/node-api"

# logs and pids
NODE_LOG="$NODE_API_DIR/node-api.log"
NODE_PIDFILE="$NODE_API_DIR/node-api.pid"
PY_LOG="$PY_SERVICE_DIR/python-service.log"
PY_PIDFILE="$PY_SERVICE_DIR/python-service.pid"

cd "$PY_SERVICE_DIR"

echo "Creating .venv (if missing) and installing Python deps..."
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "Initializing SQLite database (data/diabetes.db)..."
python3 src/init_db.py

echo "Starting Python backend (background)..."
# We will start Python backend after Node API and database init

start_node_api() {
	if [ -d "$NODE_API_DIR" ]; then
		echo "Starting Node API (background) and writing logs to $NODE_LOG"
		cd "$NODE_API_DIR"
		npm install --no-audit --no-fund || true
		# start with plain node for reliability in dev scripts
		nohup node src/server.js > "$NODE_LOG" 2>&1 &
		echo $! > "$NODE_PIDFILE"
		cd "$ROOT_DIR"
	else
		echo "Node API directory not found; skipping Node API start"
	fi
}

wait_for_health() {
	url="$1"
	retries=60
	count=0
	until curl -sSf "$url" >/dev/null 2>&1; do
		count=$((count+1))
		if [ "$count" -ge "$retries" ]; then
			echo "Timed out waiting for $url"
			return 1
		fi
		sleep 1
	done
	return 0
}

echo "Starting Node API..."
start_node_api
echo "Waiting for Node API health..."
if ! wait_for_health "http://localhost:3001/api/health"; then
	echo "Node API did not become healthy; check $NODE_LOG"
fi

echo "Starting Python backend (background)..."
# Write logs and pid to service dir
cd "$PY_SERVICE_DIR"
nohup python3 src/app.py > "$PY_LOG" 2>&1 &
echo $! > "$PY_PIDFILE"

echo "Waiting for Python backend health..."
if ! wait_for_health "http://localhost:5000/api/health"; then
	echo "Python backend did not become healthy; check $PY_LOG"
fi

cd "$WEB_UI_DIR"

echo "Installing frontend deps (may be skipped if already installed)..."
npm install --no-audit --no-fund

echo "Ensuring port 3000 is free (kill any existing dev server)..."
# Kill any process listening on 3000 (lsof preferred, fallback to ss)
if command -v lsof >/dev/null 2>&1; then
	PIDS=$(lsof -ti tcp:3000 || true)
	if [ -n "$PIDS" ]; then
		echo "Killing processes on port 3000: $PIDS"
		kill -9 $PIDS || true
	fi
elif command -v ss >/dev/null 2>&1; then
	PIDS=$(ss -ltnp 2>/dev/null | awk '/:3000/ {print $NF}' | sed -n 's/.*,pid=\([0-9]*\),.*/\1/p' || true)
	if [ -n "$PIDS" ]; then
		echo "Killing processes on port 3000: $PIDS"
		kill -9 $PIDS || true
	fi
else
	echo "Warning: neither lsof nor ss found; port 3000 may be in use."
fi

echo "Starting React dev server (foreground) on port 3000..."
npm start -- --port 3000
