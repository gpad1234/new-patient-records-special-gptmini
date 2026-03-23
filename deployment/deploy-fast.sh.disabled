#!/bin/bash

# Fast deployment - assumes dependencies already installed
# Usage: ./deployment/deploy-fast.sh

set -e

SERVER="root@165.232.54.109"
SSH_KEY="${HOME}/.ssh/droplet_key"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Fast Deploy to ${SERVER}"
echo ""

# 1. Create deployment archive
echo "[1/4] Creating archive..."
cd ${LOCAL_DIR}

# Build dynamic exclude args for frozen services
EXCLUDE_ARGS=("--exclude='node_modules'" "--exclude='build'" "--exclude='.git'" "--exclude='target'")
for svc in services/*; do
    if [ -f "${svc}/.FROZEN" ] || [ -f "${svc}/.ARCHIVED" ]; then
        EXCLUDE_ARGS+=("--exclude='${svc}'")
        echo "Excluding frozen/archived service from archive: ${svc}"
    fi
done

eval tar -czf /tmp/emr-quick.tar.gz "${EXCLUDE_ARGS[@]}" services/ web/ scripts/ ai-research-dashboard.html nginx.conf

# 2. Upload
echo "[2/4] Uploading..."
scp -i ${SSH_KEY} /tmp/emr-quick.tar.gz ${SERVER}:/tmp/

# 3. Extract and build on server (in background)
echo "[3/4] Deploying and building (this may take 2-3 minutes)..."
ssh -i ${SSH_KEY} ${SERVER} 'bash -s' << 'ENDSSH'
    set -e
    cd /opt/emr
    
    # Backup database
    if [ -f services/node-api/data/diabetes.db ]; then
        cp services/node-api/data/diabetes.db /tmp/diabetes-backup.db
    fi
    
    # Extract new files
    tar -xzf /tmp/emr-quick.tar.gz
    
    # Restore database
    if [ -f /tmp/diabetes-backup.db ]; then
        mkdir -p services/node-api/data
        cp /tmp/diabetes-backup.db services/node-api/data/diabetes.db
    fi
    
    # Install and build (suppress verbose output)
    cd services/node-api && npm install --production --silent
    cd ../web-ui && npm install --silent && npm run build --silent
    
    # Build AI research services if they exist and are not frozen/archived
    if [ -d ../mcp-node-research ] && [ ! -f ../mcp-node-research/.FROZEN ] && [ ! -f ../mcp-node-research/.ARCHIVED ]; then
        cd ../mcp-node-research && npm install --silent
    else
        echo "Skipping mcp-node-research (frozen/archived or not present)"
    fi
    
    echo "✓ Build complete"
ENDSSH

# 4. Restart services
echo "[4/4] Restarting services..."
ssh -i ${SSH_KEY} ${SERVER} << 'ENDSSH'
    systemctl restart emr-api
    systemctl restart nginx
    
    # Start AI research services if configured
    systemctl restart ai-research-node 2>/dev/null || true
    systemctl restart ai-research-python 2>/dev/null || true
    systemctl restart ai-research-go 2>/dev/null || true
    
    sleep 2
    
    echo ""
    echo "Service Status:"
    systemctl is-active --quiet emr-api && echo "✓ EMR API running" || echo "✗ EMR API failed"
    systemctl is-active --quiet nginx && echo "✓ Nginx running" || echo "✗ Nginx failed"
ENDSSH

# Cleanup
rm -f /tmp/emr-quick.tar.gz

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Access: http://165.232.54.109"
echo "AI Research: http://165.232.54.109/ai-research/"
echo ""
