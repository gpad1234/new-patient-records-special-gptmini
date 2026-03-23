#!/bin/bash
# Quick diagnostic and fix

ssh -i ~/.ssh/droplet_key root@165.232.54.109 'bash -s' << 'DIAGNOSTIC'
echo "=== DIAGNOSTIC ==="
echo ""

echo "1. Check web directories:"
echo "   /opt/emr/web/dist exists?"
test -d /opt/emr/web/dist && echo "   ✓ YES" || echo "   ✗ NO"
test -f /opt/emr/web/dist/index.html && echo "   ✓ index.html exists" || echo "   ✗ index.html MISSING"

echo ""
echo "2. Current nginx root:"
grep "root /opt" /etc/nginx/sites-available/emr | head -1

echo ""
echo "3. Services status:"
systemctl is-active emr-api && echo "   ✓ API: active" || echo "   ✗ API: inactive"
systemctl is-active nginx && echo "   ✓ Nginx: active" || echo "   ✗ Nginx: inactive"

echo ""
echo "4. Recent nginx errors:"
tail -5 /var/log/nginx/error.log

echo ""
echo "=== FIXING ==="

# Ensure build exists
if [ ! -d /opt/emr/web/dist ]; then
    echo "Building React app..."
    cd /opt/emr/web
    npm install > /dev/null 2>&1
    npm run build
fi

# Fix nginx config - simple replacement
echo "Fixing nginx config..."
cat > /etc/nginx/sites-available/emr << 'EOF'
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }

    location / {
        root /opt/emr/web/dist;
        try_files $uri /index.html;
    }
}
EOF

nginx -t && systemctl reload nginx

echo ""
echo "✅ Done!"
echo ""
echo "Test now: http://165.232.54.109"

DIAGNOSTIC
