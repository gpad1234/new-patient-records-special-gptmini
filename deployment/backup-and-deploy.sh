#!/bin/bash

# Backup existing server deployment and deploy local version
# Usage: ./deployment/backup-and-deploy.sh [server_ip]

set -e

SERVER_IP="${1:-165.232.54.109}"
SSH_USER="root"
SERVER="${SSH_USER}@${SERVER_IP}"
SSH_KEY="${HOME}/.ssh/droplet_key"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="emr-backup-${TIMESTAMP}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "╔════════════════════════════════════════════════════╗"
echo "║  EMR System - Backup & Deploy                      ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}Server:${NC}     ${SERVER}"
echo -e "${BLUE}Local Dir:${NC}  ${LOCAL_DIR}"
echo -e "${BLUE}Backup:${NC}     ${BACKUP_NAME}"
echo ""

# Step 1: Test SSH connection
echo -e "${BLUE}[1/8] Testing SSH connection...${NC}"
if ssh ${SSH_OPTS} -o ConnectTimeout=5 ${SERVER} "echo 2>&1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ SSH connection successful (using ${SSH_KEY})${NC}"
else
    echo -e "${RED}✗ SSH connection failed${NC}"
    echo "Please ensure:"
    echo "  1. SSH key exists: ${SSH_KEY}"
    echo "  2. Server is reachable: ping ${SERVER_IP}"
    echo "  3. Try manual SSH: ssh ${SSH_OPTS} ${SERVER}"
    exit 1
fi

# Step 2: Check if /opt/emr exists on server
echo -e "\n${BLUE}[2/8] Checking server deployment...${NC}"
if ssh ${SSH_OPTS} ${SERVER} "[ -d /opt/emr ]"; then
    echo -e "${GREEN}✓ Found existing deployment at /opt/emr${NC}"
    HAS_EXISTING=true
else
    echo -e "${YELLOW}⚠ No existing deployment found at /opt/emr${NC}"
    HAS_EXISTING=false
fi

# Step 3: Backup existing deployment
if [ "$HAS_EXISTING" = true ]; then
    echo -e "\n${BLUE}[3/8] Creating backup of existing deployment...${NC}"
    
    ssh ${SSH_OPTS} ${SERVER} << EOF
        set -e
        
        # Stop services
        echo "Stopping services..."
        sudo systemctl stop emr-api || true
        
        # Create backup directory
        mkdir -p /root/emr-backups
        
        # Create tar backup (excluding node_modules and .git)
        echo "Creating backup archive..."
        cd /opt
        tar -czf /root/emr-backups/${BACKUP_NAME}.tar.gz \
            --exclude='emr/services/*/node_modules' \
            --exclude='emr/services/*/.git' \
            --exclude='emr/services/*/build' \
            --exclude='emr/target' \
            emr/
        
        # Also backup database separately
        if [ -f /opt/emr/services/node-api/data/diabetes.db ]; then
            cp /opt/emr/services/node-api/data/diabetes.db \
               /root/emr-backups/${BACKUP_NAME}-diabetes.db
            echo "Database backed up"
        fi
        
        echo "Backup size: \$(du -h /root/emr-backups/${BACKUP_NAME}.tar.gz | cut -f1)"
        echo "Backup location: /root/emr-backups/${BACKUP_NAME}.tar.gz"
EOF
    
    echo -e "${GREEN}✓ Backup created: ${BACKUP_NAME}.tar.gz${NC}"
else
    echo -e "\n${YELLOW}[3/8] Skipping backup (no existing deployment)${NC}"
fi

# Step 4: Prepare local files for upload
echo -e "\n${BLUE}[4/8] Preparing local files...${NC}"

TEMP_DIR="/tmp/emr-deploy-${TIMESTAMP}"
mkdir -p ${TEMP_DIR}

echo "Creating deployment archive..."
cd ${LOCAL_DIR}

# Create tar of local files (excluding unnecessary files)
tar -czf ${TEMP_DIR}/emr-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='build' \
    --exclude='target' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    .

echo -e "${GREEN}✓ Local archive created: $(du -h ${TEMP_DIR}/emr-deploy.tar.gz | cut -f1)${NC}"

# Step 5: Upload local files to server
echo -e "\n${BLUE}[5/8] Uploading local files to server...${NC}"
scp ${SSH_OPTS} ${TEMP_DIR}/emr-deploy.tar.gz ${SERVER}:/tmp/

echo -e "${GREEN}✓ Upload complete${NC}"

# Step 6: Deploy on server
echo -e "\n${BLUE}[6/8] Deploying on server...${NC}"

ssh ${SSH_OPTS} ${SERVER} << 'EOF'
    set -e
    
    echo "Extracting deployment..."
    
    # Remove old deployment
    rm -rf /opt/emr-new
    
    # Create new directory and extract
    mkdir -p /opt/emr-new
    cd /opt/emr-new
    tar -xzf /tmp/emr-deploy.tar.gz
    
    # Preserve database if it exists
    if [ -f /opt/emr/services/node-api/data/diabetes.db ]; then
        echo "Preserving existing database..."
        mkdir -p /opt/emr-new/services/node-api/data
        cp /opt/emr/services/node-api/data/diabetes.db \
           /opt/emr-new/services/node-api/data/
    fi
    
    # Swap directories
    if [ -d /opt/emr ]; then
        mv /opt/emr /opt/emr-old
    fi
    mv /opt/emr-new /opt/emr
    
    echo "Deployment extracted to /opt/emr"
EOF

echo -e "${GREEN}✓ Files deployed${NC}"

# Step 7: Install dependencies and build
echo -e "\n${BLUE}[7/8] Installing dependencies and building...${NC}"

ssh ${SSH_OPTS} ${SERVER} << 'EOF'
    set -e
    
    # Ensure Node.js is installed
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
    
    # Ensure Nginx is installed
    if ! command -v nginx &> /dev/null; then
        echo "Installing Nginx..."
        apt-get update
        apt-get install -y nginx
    fi
    
    # Install API dependencies
    echo "Installing Node API dependencies..."
    cd /opt/emr/services/node-api
    npm install --production
    
    # Install and build web UI
    echo "Building React web UI..."
    cd /opt/emr/services/web-ui
    npm install
    npm run build
    
    # Build AI research services if they exist and are not frozen
    if [ -d /opt/emr/services/mcp-node-research ] && [ ! -f /opt/emr/services/mcp-node-research/.FROZEN ] && [ ! -f /opt/emr/services/mcp-node-research/.ARCHIVED ]; then
        echo "Installing AI research Node.js dependencies..."
        cd /opt/emr/services/mcp-node-research
        npm install
    else
        echo "Skipping mcp-node-research (frozen or not present)"
    fi
    
    if [ -f /opt/emr/services/mcp-python-research/requirements.txt ] && [ ! -f /opt/emr/services/mcp-python-research/.FROZEN ] && [ ! -f /opt/emr/services/mcp-python-research/.ARCHIVED ]; then
        echo "Installing AI research Python dependencies..."
        pip3 install -r /opt/emr/services/mcp-python-research/requirements.txt || true
    else
        echo "Skipping mcp-python-research (frozen or not present)"
    fi
    
    if [ -f /opt/emr/services/mcp-go-research/main.go ]; then
        echo "Building AI research Go service..."
        cd /opt/emr/services/mcp-go-research
        go build -o mcp-go-research main.go || true
    fi
    
    echo "✓ Dependencies installed and built"
EOF

echo -e "${GREEN}✓ Build complete${NC}"

# Step 8: Configure and start services
echo -e "\n${BLUE}[8/8] Configuring and starting services...${NC}"

ssh ${SSH_OPTS} ${SERVER} << 'DEPLOY_SERVICES'
    set -e
    
    # Configure Nginx
    echo "Configuring Nginx..."
    cat > /etc/nginx/sites-available/emr << 'NGINX_CONFIG'
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
    gzip_vary on;

    # API endpoints
    location /api/ {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # AI Research Dashboard (static HTML)
    location /ai-research/ {
        alias /opt/emr/;
        try_files ai-research-dashboard.html =404;
    }

    # React frontend (built files)
    location / {
        root /opt/emr/services/web-ui/build;
        index index.html index.htm;
        try_files $uri /index.html;

        # Cache static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
NGINX_CONFIG

    ln -sf /etc/nginx/sites-available/emr /etc/nginx/sites-enabled/emr
    rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx config
    nginx -t
    
    # Create systemd service for API
    cat > /etc/systemd/system/emr-api.service << 'API_SERVICE'
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
API_SERVICE

    # Create systemd services for AI research (optional)
    if [ -f /opt/emr/services/mcp-node-research/server.js ] && [ ! -f /opt/emr/services/mcp-node-research/.FROZEN ] && [ ! -f /opt/emr/services/mcp-node-research/.ARCHIVED ]; then
        cat > /etc/systemd/system/ai-research-node.service << 'NODE_SERVICE'
[Unit]
Description=AI Research Node.js MCP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/emr/services/mcp-node-research
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=3007"

[Install]
WantedBy=multi-user.target
NODE_SERVICE
    fi

    if [ -f /opt/emr/services/mcp-python-research/main.py ] && [ ! -f /opt/emr/services/mcp-python-research/.FROZEN ] && [ ! -f /opt/emr/services/mcp-python-research/.ARCHIVED ]; then
        cat > /etc/systemd/system/ai-research-python.service << 'PYTHON_SERVICE'
[Unit]
Description=AI Research Python MCP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/emr/services/mcp-python-research
ExecStart=/usr/bin/python3 main.py
Restart=on-failure
RestartSec=10
Environment="PORT=3008"

[Install]
WantedBy=multi-user.target
PYTHON_SERVICE
    fi

    if [ -f /opt/emr/services/mcp-go-research/mcp-go-research ]; then
        cat > /etc/systemd/system/ai-research-go.service << 'GO_SERVICE'
[Unit]
Description=AI Research Go MCP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/emr/services/mcp-go-research
ExecStart=/opt/emr/services/mcp-go-research/mcp-go-research
Restart=on-failure
RestartSec=10
Environment="PORT=3009"

[Install]
WantedBy=multi-user.target
GO_SERVICE
    fi
    
    # Reload systemd
    systemctl daemon-reload
    
    # Enable and start services
    systemctl enable emr-api
    systemctl restart emr-api
    
    # Start AI research services if they exist
    if [ -f /etc/systemd/system/ai-research-node.service ]; then
        systemctl enable ai-research-node
        systemctl restart ai-research-node
    fi
    
    if [ -f /etc/systemd/system/ai-research-python.service ]; then
        systemctl enable ai-research-python
        systemctl restart ai-research-python
    fi
    
    if [ -f /etc/systemd/system/ai-research-go.service ]; then
        systemctl enable ai-research-go
        systemctl restart ai-research-go
    fi
    
    # Restart nginx
    systemctl enable nginx
    systemctl restart nginx
    
    sleep 2
    
    # Check service status
    echo ""
    echo "Service Status:"
    echo "───────────────"
    systemctl is-active --quiet emr-api && echo "✓ EMR API:    Running" || echo "✗ EMR API:    Failed"
    systemctl is-active --quiet nginx && echo "✓ Nginx:      Running" || echo "✗ Nginx:      Failed"
    
    if [ -f /etc/systemd/system/ai-research-node.service ]; then
        systemctl is-active --quiet ai-research-node && echo "✓ Node MCP:   Running" || echo "✗ Node MCP:   Failed"
    fi
    
    if [ -f /etc/systemd/system/ai-research-python.service ]; then
        systemctl is-active --quiet ai-research-python && echo "✓ Python MCP: Running" || echo "✗ Python MCP: Failed"
    fi
    
    if [ -f /etc/systemd/system/ai-research-go.service ]; then
        systemctl is-active --quiet ai-research-go && echo "✓ Go MCP:     Running" || echo "✗ Go MCP:     Failed"
    fi
DEPLOY_SERVICES

echo -e "${GREEN}✓ Services configured and started${NC}"

# Cleanup
rm -rf ${TEMP_DIR}

# Final summary
echo ""
echo "╔════════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}✓ Deployment Complete!${NC}                          ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo "  • Main EMR:       http://${SERVER_IP}"
echo "  • API:            http://${SERVER_IP}/api/"
echo "  • AI Research:    http://${SERVER_IP}/ai-research/"
echo ""
echo -e "${BLUE}Backup Location:${NC}"
if [ "$HAS_EXISTING" = true ]; then
    echo "  • Archive:        /root/emr-backups/${BACKUP_NAME}.tar.gz"
    echo "  • Database:       /root/emr-backups/${BACKUP_NAME}-diabetes.db"
fi
echo ""
echo -e "${BLUE}Restore Backup (if needed):${NC}"
echo "  ssh ${SERVER} 'cd /opt && sudo tar -xzf /root/emr-backups/${BACKUP_NAME}.tar.gz'"
echo ""
echo -e "${BLUE}View Logs:${NC}"
echo "  ssh ${SERVER} 'sudo journalctl -u emr-api -f'"
echo "  ssh ${SERVER} 'sudo tail -f /var/log/nginx/access.log'"
echo ""
echo -e "${BLUE}Manage Services:${NC}"
echo "  ssh ${SERVER} 'sudo systemctl restart emr-api'"
echo "  ssh ${SERVER} 'sudo systemctl status emr-api nginx'"
echo ""
