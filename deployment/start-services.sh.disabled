#!/bin/bash

# EMR System - Service Startup Script
# Starts Node.js API, React frontend, and Nginx reverse proxy

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_API_PATH="$PROJECT_ROOT/services/node-api"
REACT_UI_PATH="$PROJECT_ROOT/services/web-ui"

echo "=========================================="
echo "EMR System - Production Deployment"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill any existing processes on ports
cleanup_ports() {
    echo -e "${YELLOW}Cleaning up ports...${NC}"
    lsof -i :3000 2>/dev/null | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
    lsof -i :3001 2>/dev/null | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
    lsof -i :80 2>/dev/null | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Start Node.js API
start_node_api() {
    echo -e "${BLUE}Starting Node.js API server (port 3001)...${NC}"
    cd "$NODE_API_PATH"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing Node.js dependencies..."
        npm install
    fi
    
    # Start in background
    node src/server.js > /tmp/node-api.log 2>&1 &
    NODE_PID=$!
    echo $NODE_PID > /tmp/node-api.pid
    
    sleep 2
    
    # Check if process is running
    if kill -0 $NODE_PID 2>/dev/null; then
        echo -e "${GREEN}✓ Node.js API started (PID: $NODE_PID)${NC}"
        return 0
    else
        echo -e "${YELLOW}✗ Node.js API failed to start${NC}"
        cat /tmp/node-api.log
        return 1
    fi
}

# Start React frontend
start_react_ui() {
    echo -e "${BLUE}Starting React frontend (port 3000)...${NC}"
    cd "$REACT_UI_PATH"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing React dependencies..."
        npm install
    fi
    
    # Start in background
    npm start > /tmp/react-ui.log 2>&1 &
    REACT_PID=$!
    echo $REACT_PID > /tmp/react-ui.pid
    
    sleep 4
    
    # Check if process is running
    if kill -0 $REACT_PID 2>/dev/null; then
        echo -e "${GREEN}✓ React frontend started (PID: $REACT_PID)${NC}"
        return 0
    else
        echo -e "${YELLOW}✗ React frontend failed to start${NC}"
        cat /tmp/react-ui.log
        return 1
    fi
}

# Start Nginx
start_nginx() {
    echo -e "${BLUE}Starting Nginx reverse proxy (port 80)...${NC}"
    
    # Copy config
    sudo cp "$PROJECT_ROOT/nginx.conf" /usr/local/etc/nginx/nginx.conf 2>/dev/null || true
    
    # Start nginx
    if command -v nginx &> /dev/null; then
        sudo nginx -s stop 2>/dev/null || true
        sleep 1
        sudo nginx
        sleep 1
        echo -e "${GREEN}✓ Nginx started${NC}"
        return 0
    else
        echo -e "${YELLOW}Nginx not found. Install with: brew install nginx${NC}"
        return 0
    fi
}

# Main execution
cleanup_ports
start_node_api || exit 1
start_react_ui || exit 1
start_nginx || true

echo ""
echo "=========================================="
echo -e "${GREEN}✓ All services started successfully!${NC}"
echo "=========================================="
echo ""
echo "Service URLs:"
echo -e "  ${BLUE}Frontend (Direct):${NC}  http://localhost:3000"
echo -e "  ${BLUE}API (Direct):${NC}       http://localhost:3001"
echo -e "  ${BLUE}Nginx Proxy:${NC}       http://localhost"
echo ""
echo "Logs:"
echo -e "  ${BLUE}Node API:${NC}    tail -f /tmp/node-api.log"
echo -e "  ${BLUE}React UI:${NC}    tail -f /tmp/react-ui.log"
echo -e "  ${BLUE}Nginx:${NC}       tail -f /var/log/nginx/access.log"
echo ""
echo "To stop services:"
echo "  kill \$(cat /tmp/node-api.pid)"
echo "  kill \$(cat /tmp/react-ui.pid)"
echo "  sudo nginx -s stop"
echo ""
