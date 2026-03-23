#!/bin/bash
# Complete fix for 500 error - run this manually
# Usage: ./deployment/final-fix.sh

echo "Connecting to server..."

ssh -i ~/.ssh/droplet_key root@165.232.54.109 << 'ENDFIX'

set -e

echo "🔧 Fixing deployment..."

# 1. Build React app if needed
cd /opt/emr/web
if [ ! -d "dist" ]; then
    echo "Installing dependencies..."
    npm install
    echo "Building..."
    npm run build
fi

# 2. Create clean nginx config
echo "Configuring nginx..."
cat > /etc/nginx/sites-available/emr << 'NGINXCONF'
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location / {
        root /opt/emr/web/dist;
        index index.html;
        try_files $uri /index.html;
    }
}
NGINXCONF

# 3. Enable site
ln -sf /etc/nginx/sites-available/emr /etc/nginx/sites-enabled/emr
rm -f /etc/nginx/sites-enabled/default

# 4. Test and reload
nginx -t
systemctl reload nginx

# 5. Ensure API is running
systemctl start emr-api

# 6. Status
echo ""
echo "✅ Status:"
systemctl is-active emr-api && echo "  API: ✓ Running" || echo "  API: ✗ Down"
systemctl is-active nginx && echo "  Nginx: ✓ Running" || echo "  Nginx: ✗ Down"
test -f /opt/emr/web/dist/index.html && echo "  Build: ✓ Exists" || echo "  Build: ✗ Missing"

echo ""
echo "🌐 Access: http://165.232.54.109"

ENDFIX
