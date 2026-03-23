#!/bin/bash

# Quick deployment to server
# Usage: ./deployment/deploy-to-server-quick.sh <server_ip>

SERVER_IP="${1:-165.232.54.109}"
SSH_USER="root"

echo "╔════════════════════════════════════════╗"
echo "║  EMR - Quick Server Deploy              ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Target: $SSH_USER@$SERVER_IP"
echo ""

# Create temporary deploy script
TEMP_SCRIPT="/tmp/emr-deploy-$RANDOM.sh"
cat > "$TEMP_SCRIPT" << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

APP_DIR="/opt/emr"

echo "1. Creating app directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "2. Cloning repository..."
if [ ! -d ".git" ]; then
    git clone -b react-ui-emr https://github.com/gpad1234/patient-records.git .
else
    git fetch origin && git reset --hard origin/react-ui-emr
fi

echo "3. Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

echo "4. Installing Nginx..."
apt-get install -y nginx

echo "5. Installing dependencies..."
cd "$APP_DIR/services/node-api"
npm install --production

cd "$APP_DIR/services/web-ui"
npm install
npm run build

echo "6. Configuring Nginx..."
cat > /etc/nginx/sites-available/emr << 'NGINX'
upstream nodejs_backend {
    server localhost:3001;
}

server {
    listen 80;
    server_name _;
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;

    location /api/ {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        root /opt/emr/services/web-ui/build;
        try_files $uri /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/emr /etc/nginx/sites-enabled/emr
rm -f /etc/nginx/sites-enabled/default
nginx -t

echo "7. Creating systemd service..."
cat > /etc/systemd/system/emr-api.service << 'SERVICE'
[Unit]
Description=EMR Node.js API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/emr/services/node-api
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
Environment="NODE_ENV=production"
Environment="PORT=3001"

[Install]
WantedBy=multi-user.target
SERVICE

echo "8. Starting services..."
systemctl daemon-reload
systemctl enable emr-api
systemctl enable nginx
systemctl restart emr-api
systemctl restart nginx

echo ""
echo "✓ Deployment Complete!"
echo "Access: http://$(hostname -I | awk '{print $1}')"

DEPLOY_SCRIPT

# Copy and execute on server
echo "Uploading deployment script..."
scp "$TEMP_SCRIPT" "$SSH_USER@$SERVER_IP:/tmp/emr-deploy.sh"

echo "Executing on server..."
ssh "$SSH_USER@$SERVER_IP" "bash /tmp/emr-deploy.sh"

# Cleanup
rm "$TEMP_SCRIPT"

echo ""
echo "✓ Done! Access: http://$SERVER_IP"
