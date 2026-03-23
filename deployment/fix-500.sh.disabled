#!/bin/bash

# Fix 500 error by building React app and updating nginx
ssh -i ~/.ssh/droplet_key root@165.232.54.109 << 'ENDSSH'
    set -e
    
    echo "🔧 Fixing 500 error..."
    echo ""
    
    # Build the React app
    echo "[1/3] Building React app..."
    cd /opt/emr/web
    npm install
    npm run build
    
    # Update nginx config
    echo "[2/3] Updating nginx config..."
    cat > /etc/nginx/sites-available/emr << 'NGINX_EOF'
upstream nodejs_backend {
    server localhost:3001;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;

    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
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

    # AI Research Dashboard
    location /ai-research/ {
        alias /opt/emr/;
        try_files ai-research-dashboard.html =404;
    }

    # React frontend (Vite build)
    location / {
        root /opt/emr/web/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
NGINX_EOF
    
    # Test and reload nginx
    echo "[3/3] Reloading nginx..."
    nginx -t && systemctl reload nginx
    
    # Verify services
    echo ""
    echo "✅ Fix complete!"
    echo ""
    echo "Service Status:"
    systemctl is-active emr-api && echo "  ✓ API running" || echo "  ✗ API down"
    systemctl is-active nginx && echo "  ✓ Nginx running" || echo "  ✗ Nginx down"
    
    echo ""
    echo "Build Output:"
    ls -lh /opt/emr/web/dist/index.html 2>/dev/null && echo "  ✓ React build exists" || echo "  ✗ Build missing"
    
    echo ""
    echo "Test: http://165.232.54.109"
ENDSSH

echo ""
echo "Testing site..."
sleep 2
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://165.232.54.109/
