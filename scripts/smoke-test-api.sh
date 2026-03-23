#!/usr/bin/env bash
set -euo pipefail

# smoke-test-api.sh
# Waits for the Python service to become healthy, then runs a few curl checks

BASE_URL="http://localhost:5000/api"

echo "Waiting for ${BASE_URL}/health to respond..."
for i in {1..30}; do
  if curl -fsS ${BASE_URL}/health >/dev/null 2>&1; then
    echo "Service is up"
    break
  fi
  echo -n '.'
  sleep 1
done

echo
echo "Health response:"
curl -s ${BASE_URL}/health | jq || true

echo "GET patients:"
curl -s ${BASE_URL}/patients | jq || true

echo "GET patient 1:"
curl -s ${BASE_URL}/patients/1 | jq || true

echo "GET labs for patient 1:"
curl -s ${BASE_URL}/patients/1/labs | jq || true

echo "Smoke tests complete."
