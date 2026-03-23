#!/bin/bash
# Stop PostgreSQL Service
# Usage: ./scripts/stop-postgres.sh

echo "🛑 Stopping PostgreSQL..."

POSTGRES_PATH="/Library/PostgreSQL/16/bin/pg_ctl"
POSTGRES_DATA="/Library/PostgreSQL/16/data"

if [ ! -f "$POSTGRES_PATH" ]; then
    echo "❌ PostgreSQL not found at $POSTGRES_PATH"
    exit 1
fi

sudo "$POSTGRES_PATH" -D "$POSTGRES_DATA" stop
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL stopped successfully"
else
    echo "❌ Failed to stop PostgreSQL"
    exit 1
fi
