#!/usr/bin/env bash
set -euo pipefail

# Simple deploy helper — run on the server as the deployment user (or root).
# Usage: deployment/deploy.sh [branch]
# Example: ./deployment/deploy.sh main

REPO_DIR=${REPO_DIR:-/opt/patient-records}
BRANCH=${1:-main}

echo "Deploying branch '$BRANCH' to $REPO_DIR"
cd "$REPO_DIR"

echo "Fetching origin..."
git fetch origin --prune

echo "Checking out $BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "Building web bundle"
cd web
npm ci --silent
npm run build --silent

echo "Reloading nginx"
cd "$REPO_DIR"
if [ "$(id -u)" -ne 0 ]; then
  sudo systemctl reload nginx
else
  systemctl reload nginx
fi

echo "Deploy completed"
