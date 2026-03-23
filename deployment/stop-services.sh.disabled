#!/bin/bash

# EMR System - Service Shutdown Script
# Stops all running services

echo "Stopping EMR services..."

# Stop Node.js API
if [ -f /tmp/node-api.pid ]; then
    PID=$(cat /tmp/node-api.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✓ Stopped Node.js API (PID: $PID)"
    fi
    rm /tmp/node-api.pid
fi

# Stop React UI
if [ -f /tmp/react-ui.pid ]; then
    PID=$(cat /tmp/react-ui.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✓ Stopped React UI (PID: $PID)"
    fi
    rm /tmp/react-ui.pid
fi

# Stop Nginx
if command -v nginx &> /dev/null; then
    sudo nginx -s stop 2>/dev/null && echo "✓ Stopped Nginx" || true
fi

# Kill remaining Node processes on ports
lsof -i :3000 2>/dev/null | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
lsof -i :3001 2>/dev/null | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true

echo "All services stopped."
