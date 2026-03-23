#!/bin/bash

# Cleanup and mark deprecated directories
# Run this after deployment to prevent confusion

echo "🧹 Cleaning up deprecated directories..."
echo ""

ssh -i ~/.ssh/droplet_key root@165.232.54.109 << 'CLEANUP'

# Mark deprecated web-ui directory
cat > /opt/emr/services/web-ui/DEPRECATED.md << 'EOF'
# ⚠️ DEPRECATED - DO NOT USE

This directory is **deprecated** and no longer used.

## Active Directory
The active React application is located at:
- **`/opt/emr/web/`** (Vite-based build)
- Served from: `/opt/emr/web/dist/`

## This Directory
- Old React app (deprecated)
- Not built or deployed
- Can be safely removed

## Nginx Configuration
The nginx config points to `/opt/emr/web/dist/` NOT this directory.

Last updated: December 18, 2025
EOF

# Mark old emr directory if it exists
if [ -d /opt/emr-old ]; then
    cat > /opt/emr-old/DEPRECATED.md << 'EOF'
# ⚠️ BACKUP DIRECTORY

This is a backup from a previous deployment.
Safe to delete if deployment is stable.

Created during deployment rollback procedure.
EOF
fi

# Create active directory markers
cat > /opt/emr/web/ACTIVE.md << 'EOF'
# ✅ ACTIVE - Main React Application

This is the **active** React application.

## Build
- Build command: `npm run build`
- Output: `dist/`
- Framework: Vite

## Nginx
Nginx serves from: `/opt/emr/web/dist/`

## Deployment
Deploy using: `/Users/gp/new-gui/new-react/deployment/deploy-scp.sh`
EOF

cat > /opt/emr/services/node-api/ACTIVE.md << 'EOF'
# ✅ ACTIVE - Node.js API

This is the **active** API service.

## Service
- Port: 3001
- Systemd: `emr-api.service`

## Commands
- Start: `systemctl start emr-api`
- Logs: `journalctl -u emr-api -f`
EOF

echo "✅ Marked directories:"
echo "  ✓ /opt/emr/web/ - ACTIVE"
echo "  ✓ /opt/emr/services/node-api/ - ACTIVE"
echo "  ⚠ /opt/emr/services/web-ui/ - DEPRECATED"

# Optional: Remove node_modules from deprecated directory to save space
if [ -d /opt/emr/services/web-ui/node_modules ]; then
    echo ""
    echo "Removing node_modules from deprecated web-ui..."
    rm -rf /opt/emr/services/web-ui/node_modules
    echo "  ✓ Freed up disk space"
fi

CLEANUP

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Active directories marked with ACTIVE.md"
echo "Deprecated directories marked with DEPRECATED.md"
