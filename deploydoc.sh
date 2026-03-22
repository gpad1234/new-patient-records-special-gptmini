#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/gpad1234/new-patient-records-special-gptmini.git"
APP_DIR="/opt/patient-records"
NODE_VERSION="20"

echo "Starting automated deploy to this host"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root" >&2
  exit 1
fi

apt-get update
apt-get install -y curl git build-essential nginx sqlite3

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# Clone repo
rm -rf "$APP_DIR"
git clone "$REPO" "$APP_DIR"
cd "$APP_DIR"

# Node API
cd services/node-api
npm ci
node scripts/ensure-db.js || true

cat > /etc/systemd/system/patient-node-api.service <<'SERV'
[Unit]
Description=Patient Records Node API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/patient-records/services/node-api
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production
User=root
Group=root

[Install]
WantedBy=multi-user.target
SERV

systemctl daemon-reload
systemctl enable --now patient-node-api.service

# Build web
cd /opt/patient-records/web
npm ci
npm run build

# Nginx config
cat > /etc/nginx/sites-available/patient-records <<'NGINX'
server {
    listen 80;
    server_name _;

    root /opt/patient-records/web/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri /index.html;
    }

    location ~* \.(?:js|css|png|jpg|jpeg|gif|ico|woff2)$ {
      expires 7d;
      add_header Cache-Control "public";
    }
}
NGINX

ln -sf /etc/nginx/sites-available/patient-records /etc/nginx/sites-enabled/patient-records
rm -f /etc/nginx/sites-enabled/default || true

nginx -t
systemctl restart nginx

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp
fi

echo "Deployment finished. Visit http://$(hostname -I | awk '{print $1}')/"
