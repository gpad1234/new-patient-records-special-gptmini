#!/bin/bash
# Start PostgreSQL Service
# Usage: ./scripts/start-postgres.sh

echo "🗄️  Starting PostgreSQL..."

POSTGRES_PATH="/Library/PostgreSQL/16/bin/pg_ctl"
POSTGRES_DATA="/Library/PostgreSQL/16/data"

if [ ! -f "$POSTGRES_PATH" ]; then
    echo "❌ PostgreSQL not found at $POSTGRES_PATH"
    echo "Please install PostgreSQL from https://www.postgresql.org/download/macosx/"
    exit 1
fi

# Check if already running
if sudo "$POSTGRES_PATH" -D "$POSTGRES_DATA" status > /dev/null 2>&1; then
    echo "✅ PostgreSQL is already running"
    exit 0
fi

# Start PostgreSQL
sudo "$POSTGRES_PATH" -D "$POSTGRES_DATA" start
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL started successfully"
    echo "📝 Logs: tail -f $POSTGRES_DATA/postgresql.log"
else
    echo "❌ Failed to start PostgreSQL"
    exit 1
fi
