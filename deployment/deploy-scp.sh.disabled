#!/bin/bash

# SCP-based deployment (no Git)
# Usage: ./deployment/deploy-scp.sh

set -e

SERVER="root@165.232.54.109"
SSH_KEY="~/.ssh/droplet_key"
LOCAL_DIR="/Users/gp/new-gui/new-react"

echo "🚀 Deploying via SCP..."
echo ""

# Step 1: Build locally first (faster and more reliable)
echo "[1/5] Building React app locally..."
cd ${LOCAL_DIR}/web
npm install
npm run build
echo "✓ Local build complete"

# Step 2: Create deployment tarball
echo ""
echo "[2/5] Creating deployment package..."
cd ${LOCAL_DIR}
tar -czf /tmp/deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    web/dist \
    services/node-api \
    ai-research-dashboard.html

echo "✓ Package created: $(du -h /tmp/deploy.tar.gz | cut -f1)"

# Step 3: Upload to server
echo ""
echo "[3/5] Uploading to server..."
scp -i ~/.ssh/droplet_key /tmp/deploy.tar.gz ${SERVER}:/tmp/

# Step 4: Extract and setup on server
echo ""
echo "[4/5] Setting up on server..."
ssh -i ~/.ssh/droplet_key ${SERVER} << 'ENDSSH'
    set -e
    
    # Extract
    cd /opt/emr
    tar -xzf /tmp/deploy.tar.gz
    
    # Install API dependencies
    cd /opt/emr/services/node-api
    npm install --production
    
    # Configure nginx
    cat > /etc/nginx/sites-available/emr << 'NGINX'
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }

    location /ai-research/ {
        alias /opt/emr/;
        try_files ai-research-dashboard.html =404;
    }

    location / {
        root /opt/emr/web/dist;
        try_files $uri /index.html;
    }
}
NGINX

    # Link and test
    ln -sf /etc/nginx/sites-available/emr /etc/nginx/sites-enabled/emr
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
ENDSSH

echo "✓ Setup complete"

# Step 5: Restart services
echo ""
echo "[5/5] Restarting services..."
ssh -i ~/.ssh/droplet_key ${SERVER} << 'ENDSSH'
    systemctl restart emr-api
    systemctl reload nginx
    
    sleep 2
    
    echo ""
    echo "Status:"
    systemctl is-active emr-api && echo "  ✓ API running" || echo "  ✗ API down"
    systemctl is-active nginx && echo "  ✓ Nginx running" || echo "  ✗ Nginx down"
    test -f /opt/emr/web/dist/index.html && echo "  ✓ React app deployed" || echo "  ✗ Missing"
ENDSSH

# Cleanup
rm -f /tmp/deploy.tar.gz

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Main site: http://165.232.54.109"
echo "AI Research: http://165.232.54.109/ai-research/"
echo ""
echo "Test now:"
echo "  curl -I http://165.232.54.109"
