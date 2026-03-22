#!/usr/bin/env bash
set -euo pipefail

# usage: scripts/sync-check.sh [repo-path] [branch]
REPO_DIR=${1:-.}
BRANCH=${2:-main}

cd "$REPO_DIR"

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git ls-remote origin refs/heads/$BRANCH | awk '{print $1}')

if [ -z "$REMOTE" ]; then
  echo "Could not determine origin/$BRANCH (is origin configured?)"
  exit 2
fi

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "OK: local HEAD matches origin/$BRANCH ($LOCAL)"
  exit 0
else
  echo "MISMATCH: local HEAD ($LOCAL) != origin/$BRANCH ($REMOTE)"
  echo "Suggested: run 'git pull origin $BRANCH' on the server or deploy the correct commit." 
  exit 3
fi
