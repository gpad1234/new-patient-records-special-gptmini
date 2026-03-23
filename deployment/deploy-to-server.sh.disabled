#!/bin/bash

# EMR System - Server Deployment Script
# Run on: root@165.232.54.109
# This deploys the complete EMR system with reverse proxy

set -e

echo "╔════════════════════════════════════════╗"
echo "║  EMR System - Server Deployment        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "✓ Linux detected"
    INSTALL_CMD="apt-get update && apt-get install -y"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✓ macOS detected"
    INSTALL_CMD="brew install"
else
    echo "Unsupported OS"
    exit 1
fi

# 1. Install Node.js if needed
if ! command -v node &> /dev/null; then
    echo -e "${BLUE}Installing Node.js...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
        sudo apt-get install -y nodejs
    else
        brew install node
    fi
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# 2. Install Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${BLUE}Installing Nginx...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y nginx
    else
        brew install nginx
    fi
fi

echo -e "${GREEN}✓ Nginx installed${NC}"

# 3. Create application directory
APP_DIR="/opt/emr"
echo -e "${BLUE}Setting up application directory: $APP_DIR${NC}"

if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
fi

# 4. Clone or update repository
if [ ! -d "$APP_DIR/.git" ]; then
    echo -e "${BLUE}Cloning repository...${NC}"
    git clone -b react-ui-emr https://github.com/gpad1234/patient-records.git "$APP_DIR"
else
    echo -e "${BLUE}Updating repository...${NC}"
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/react-ui-emr
fi

cd "$APP_DIR"

# 5. Install Node dependencies
echo -e "${BLUE}Installing Node dependencies...${NC}"
cd "$APP_DIR/services/node-api"
npm install --production > /dev/null 2>&1
echo -e "${GREEN}✓ API dependencies installed${NC}"

cd "$APP_DIR/services/web-ui"
npm install > /dev/null 2>&1
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓ React build complete${NC}"

# 6. Setup Nginx configuration
echo -e "${BLUE}Configuring Nginx...${NC}"
sudo tee /etc/nginx/sites-available/emr > /dev/null << 'NGINX_CONFIG'
upstream nodejs_backend {
    server localhost:3001;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;

    # API endpoints
    location /api/ {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # React frontend (built files)
    location / {
        root /opt/emr/services/web-ui/build;
        index index.html index.htm;
        try_files $uri /index.html;

        # Cache static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
NGINX_CONFIG

sudo ln -sf /etc/nginx/sites-available/emr /etc/nginx/sites-enabled/emr 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
if sudo nginx -t 2>/dev/null; then
    echo -e "${GREEN}✓ Nginx configured${NC}"
else
    echo -e "${YELLOW}✗ Nginx config error${NC}"
    exit 1
fi

# 7. Create systemd services
echo -e "${BLUE}Creating systemd services...${NC}"

# API service
sudo tee /etc/systemd/system/emr-api.service > /dev/null << 'SERVICE_CONFIG'
[Unit]
Description=EMR Node.js API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/emr/services/node-api
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=3001"

[Install]
WantedBy=multi-user.target
SERVICE_CONFIG

# 8. Enable and start services
echo -e "${BLUE}Starting services...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable emr-api
sudo systemctl enable nginx
sudo systemctl restart emr-api
sudo systemctl restart nginx

sleep 2

# 9. Verify services
if sudo systemctl is-active --quiet emr-api; then
    echo -e "${GREEN}✓ EMR API running${NC}"
else
    echo -e "${YELLOW}✗ EMR API failed${NC}"
    sudo systemctl status emr-api
fi

if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx running${NC}"
else
    echo -e "${YELLOW}✗ Nginx failed${NC}"
    sudo systemctl status nginx
fi

# 10. Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "╔════════════════════════════════════════╗"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Access EMR Application:"
echo -e "  ${BLUE}Direct:${NC}   http://$SERVER_IP"
echo -e "  ${BLUE}API:${NC}      http://$SERVER_IP/api/"
echo ""
echo "Manage Services:"
echo "  View API logs:    sudo journalctl -u emr-api -f"
echo "  View Nginx logs:  sudo tail -f /var/log/nginx/access.log"
echo "  Restart API:      sudo systemctl restart emr-api"
echo "  Restart Nginx:    sudo systemctl restart nginx"
echo ""
echo "SSH Access:"
echo "  ssh root@$SERVER_IP"
echo ""
echo "Database Location:"
echo "  /opt/emr/services/node-api/data/diabetes.db"
echo ""
