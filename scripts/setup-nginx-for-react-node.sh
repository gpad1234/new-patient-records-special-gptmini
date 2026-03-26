#!/bin/bash
# setup-nginx-for-react-node.sh
# Fresh install and configure Nginx for React (frontend) and Node.js (backend) deployment
# Usage: Run as root or with sudo privileges on your server

set -e

# 1. Install Nginx (fresh)
echo "Installing Nginx..."
sudo apt-get update
sudo apt-get install -y nginx

# 2. Backup and remove old config
echo "Backing up and removing old Nginx config..."
if [ -f /etc/nginx/sites-available/default ]; then
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak.$(date +%s)
    sudo rm /etc/nginx/sites-available/default
fi

# 3. Create new Nginx config for React/Node
cat <<EOL | sudo tee /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    root /var/www/react-app/build;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri /index.html;
    }
}
EOL

echo "Setting permissions for React build directory..."
sudo mkdir -p /var/www/react-app/build
sudo chown -R $USER:$USER /var/www/react-app

# 4. Test and reload Nginx
echo "Testing Nginx configuration..."
sudo nginx -t
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Nginx setup complete."
