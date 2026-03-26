#!/bin/bash
# setup-nginx-for-emr-app.sh
# Fresh install and configure Nginx for emr-app (React frontend and Node.js backend)
# Usage: Run as root or with sudo privileges on your server

set -e

# 1. Install Nginx (fresh)
echo "Installing Nginx..."
sudo apt-get update
sudo apt-get install -y nginx

# 2. Backup and remove old emr-app config
echo "Backing up and removing old Nginx emr-app config if exists..."
if [ -f /etc/nginx/sites-available/emr-app ]; then
    sudo cp /etc/nginx/sites-available/emr-app /etc/nginx/sites-available/emr-app.bak.$(date +%s)
    sudo rm /etc/nginx/sites-available/emr-app
fi

# 3. Create new Nginx config for emr-app (React/Node)
REACT_WEB_DIR="/home/sam/emr-app/web"
cat <<EOF | sudo tee /etc/nginx/sites-available/emr-app
server {
    listen 80;
    server_name _;

    root $REACT_WEB_DIR/dist;
    index index.html;

    location /api/ {
      proxy_pass http://localhost:3001/;
      proxy_http_version 1.1;
      proxy_set_header Upgrade \$http_upgrade;
      proxy_set_header Connection upgrade;
      proxy_set_header Host \$host;
      proxy_cache_bypass \$http_upgrade;
    }

    location / {
      try_files \$uri /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/emr-app /etc/nginx/sites-enabled/emr-app
sudo rm -f /etc/nginx/sites-enabled/default

echo "Testing Nginx configuration..."
sudo nginx -t
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Nginx setup complete."
