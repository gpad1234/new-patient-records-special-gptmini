#!/bin/bash
# Automated deployment script for Node.js backend and React frontend with nginx reverse proxy
# Server: 209.38.70.215, user: sam

set -e

# Variables
APP_DIR="/home/sam/emr-app"
REPO_URL="https://github.com/gpad1234/new-patient-records-special-gptmini.git"
NODE_API_DIR="$APP_DIR/services/node-api"
REACT_WEB_DIR="$APP_DIR/web"

# 1. Install dependencies
sudo apt-get update
sudo apt-get install -y nginx git curl

# 2. Install Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone or update the repo
if [ ! -d "$APP_DIR" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  if [ ! -d .git ]; then
    echo "WARNING: $APP_DIR exists but is not a git repository. Please check the directory contents!"
  fi
  git fetch --all
  git checkout hack-node-only || (echo "ERROR: Branch hack-node-only not found. Please check your remote branches." && exit 1)
  git pull origin hack-node-only
fi

# 4. Build and start backend
cd "$NODE_API_DIR"
npm install
nohup npm start &

# 5. Build frontend
cd "$REACT_WEB_DIR"
npm install
npm run build

# 6. Configure nginx
sudo tee /etc/nginx/sites-available/emr-app <<EOF
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
sudo nginx -t && sudo systemctl reload nginx

echo "Deployment complete. React app served on port 80, API proxied to Node.js backend on port 3001."
#Copy the script to your server (e.g., using scp):
#scp deploy-to-droplet.sh sam@209.38.70.215:~

#SSH into your server:
#ssh sam@209.38.70.215

#Make the script executable:
#chmod +x deploy-to-droplet.sh

#chmod +x deploy-to-droplet.sh

#Edit the script to set your actual repository URL in the REPO_URL variable.