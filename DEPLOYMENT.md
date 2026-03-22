# EMR System Deployment Guide

This guide covers deploying the EMR system with Nginx as a reverse proxy.

## Architecture

```
┌─────────────────────────────────────┐
│    Client Browser (localhost)        │
└──────────────────┬──────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Nginx Reverse      │
        │  Proxy (port 80)    │
        │  ─────────────────  │
        │  • Load balancing   │
        │  • Caching          │
        │  • Compression      │
        │  • SSL/TLS          │
        └──────────┬──────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
   ┌───▼───┐  ┌────▼────┐  ┌──▼──┐
   │ React │  │  Node   │  │     │
   │ (3000)│  │  API    │  │ ... │
   │       │  │ (3001)  │  │     │
   └───┬───┘  └────┬────┘  └─────┘
       │           │
       └───────────┼───────────┐
                   │           │
              ┌────▼─────────┐ │
              │   SQLite     │ │
              │   Database   │ │
              └──────────────┘ │
                                │
                    ┌───────────▼─────────┐
                    │  Static Files/Cache │
                    └─────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Nginx (via Homebrew on macOS)
- macOS or Linux (for scripts)

### Installation

1. **Install Nginx** (macOS):
   ```bash
   brew install nginx
   ```

2. **Install project dependencies**:
   ```bash
   cd /path/to/patient-records
   
   # Install Node API dependencies
   cd services/node-api
   npm install
   
   # Install React UI dependencies
   cd ../web-ui
   npm install
   ```

3. **Make startup scripts executable**:
   ```bash
   chmod +x deployment/start-services.sh
   chmod +x deployment/stop-services.sh
   ```

### Starting Services

**Development Mode** (with Nginx proxy):

```bash
./deployment/start-services.sh
```

This script will:
- Stop any existing processes on ports 3000, 3001, 80
- Start Node.js API on port 3001
- Start React frontend on port 3000
- Configure and start Nginx on port 80

**Direct Access** (without Nginx):
- React: http://localhost:3000
- API: http://localhost:3001

**Through Nginx Reverse Proxy**:
- Application: http://emr (or http://localhost)
- API: http://emr/api/

### Stopping Services

```bash
./deployment/stop-services.sh
```

Or manually:
```bash
kill $(cat /tmp/node-api.pid)
kill $(cat /tmp/react-ui.pid)
sudo nginx -s stop
```

## Nginx Configuration

### Key Features

- **Reverse Proxy**: Routes traffic to Node.js API and React frontend
- **Load Balancing**: Configured with `least_conn` for API backend
- **Gzip Compression**: Reduces bandwidth for text, JSON, and media
- **Security Headers**: 
  - X-Frame-Options: Prevents clickjacking
  - X-Content-Type-Options: Prevents MIME-type sniffing
  - X-XSS-Protection: XSS attack prevention
- **Keep-Alive**: Persistent connections for better performance
- **Caching**: Static file caching with 1-year expiry for assets

### Configuration File

Located at: `./nginx.conf`

**Main sections**:
- `upstream nodejs_backend` - Node.js API backend pool
- `upstream react_frontend` - React development server
- `server` - Development block (proxies to localhost services)
- Production block (commented, for built React app)

### Modifying Nginx Config

```bash
# Edit configuration
nano nginx.conf

# Test configuration syntax
nginx -t

# Reload without stopping
sudo nginx -s reload
```

## Production Deployment

For production with built React app on `emr` domain:

### 1. Build React Application

```bash
cd services/web-ui
npm run build
```

This creates a `build/` directory with static files.

### 2. Setup Domain Resolution

Update `/etc/hosts` for local development:

```bash
sudo nano /etc/hosts

# Add this line:
127.0.0.1 emr emr.local
```

Or add via command line (already done):
```bash
sudo bash -c 'echo "127.0.0.1 emr emr.local" >> /etc/hosts'
```

### 3. Deploy Built Files

```bash
# Copy React build to web server directory
sudo mkdir -p /var/www/emr-app
sudo cp -r services/web-ui/build/* /var/www/emr-app/
sudo chown -R nobody:nobody /var/www/emr-app
```

### 4. Configure Nginx for EMR Domain

The `nginx.conf` is already configured for:
- HTTP on port 80 with `emr`, `emr.local`, and `localhost` domains
- React frontend serving from `/var/www/emr-app`
- API proxying to Node.js backend at localhost:3001
- Gzip compression and caching
- Security headers

## Monitoring & Logs

### Service Logs

**Node.js API**:
```bash
tail -f /tmp/node-api.log
```

**React UI**:
```bash
tail -f /tmp/react-ui.log
```

**Nginx Access**:
```bash
tail -f /var/log/nginx/access.log
```

**Nginx Error**:
```bash
tail -f /var/log/nginx/error.log
```

### Health Check

API health endpoint (checked by Nginx):
```bash
curl http://localhost:3001/health
```

Verify all services:
```bash
# Check Node.js
curl -s http://localhost:3001/api/admin/seed-status | jq .

# Check React
curl -s http://localhost:3000 | head -20

# Check Nginx proxy
curl -s http://localhost/api/admin/seed-status | jq .
```

## Troubleshooting

## Recommended Deploy & Sync Helpers

To reduce drift between GitHub and server checkouts and make handovers safer, this repository now includes a few small helpers:

- `deployment/deploy.sh` — standard deploy helper that fetches origin, pulls a branch, builds the `web` bundle, and reloads nginx. Run this on the server as the deployment user (or root):

```bash
# on the server
cd /opt/patient-records
./deployment/deploy.sh main
```

- `.env.example` — example environment variables to copy to `.env` on the server (set `PASSWORD_SALT` and any other runtime vars).

- `scripts/sync-check.sh` — quick check to compare local HEAD with `origin/main` to detect mismatches before deploying:

```bash
# on the server
./scripts/sync-check.sh /opt/patient-records main
```

Recommended workflow before deploying:
1. Push changes to GitHub (`main` or your release branch).
2. SSH to server and run `./scripts/sync-check.sh /opt/patient-records main` — if it reports `OK`, proceed.
3. Run `./deployment/deploy.sh main` to deploy, build and reload nginx.

These helpers are intentionally small and shell-based so they are easy for new teams to audit and adapt. For longer term stability, consider adding a CI pipeline that builds the web bundle and publishes artifacts, and a deployment job that pulls and deploys tagged releases.


### Port Already in Use

```bash
# Find process using port
lsof -i :80
lsof -i :3000
lsof -i :3001

# Kill process (replace PID)
kill -9 <PID>

# Or use stop script
./deployment/stop-services.sh
```

### Nginx Won't Start

```bash
# Test configuration
nginx -t

# View error log
tail -f /var/log/nginx/error.log

# Check logs
cat /tmp/node-api.log
cat /tmp/react-ui.log
```

### Database Connection Error

```bash
# Check database file
ls -la services/node-api/data/

# Check permissions
chmod 755 services/node-api/data/
chmod 644 services/node-api/data/diabetes.db
```

### Nginx proxy returns 502 Bad Gateway

- Ensure Node.js API is running: `lsof -i :3001`
- Check Node.js logs: `tail -f /tmp/node-api.log`
- Verify API is responding: `curl http://localhost:3001/health`

### CORS Issues

Nginx doesn't block CORS. If you see CORS errors:
1. Check Express CORS config in `services/node-api/src/server.js`
2. Update allowed origin: `process.env.API_CORS`

```javascript
app.use(cors({
  origin: process.env.API_CORS || 'http://localhost:3000',
  credentials: true,
}));
```

Set via environment variable:
```bash
export API_CORS="http://your-domain.com"
```

## Performance Tuning

### Nginx Worker Processes

In `nginx.conf`:
```nginx
worker_processes auto;  # Uses number of CPU cores
```

### Connection Pooling

```nginx
upstream nodejs_backend {
    least_conn;  # Load balancing algorithm
    server localhost:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;  # Connection pool size
}
```

### Client Upload Size

```nginx
client_max_body_size 20M;  # Max upload size
```

### Gzip Compression

Already configured in `nginx.conf`. Adjust compression level (1-9):
```nginx
gzip_comp_level 6;  # 1=fast, 9=best compression
```

## Environment Variables

Create `.env` files for configuration:

**services/node-api/.env**:
```
PORT=3001
DATABASE_URL=./data/diabetes.db
API_CORS=http://localhost:3000
NODE_ENV=production
```

**services/web-ui/.env**:
```
REACT_APP_API_URL=http://localhost/api
```

## Database Backup

```bash
# Backup database
cp services/node-api/data/diabetes.db services/node-api/data/diabetes.db.backup

# Verify backup
ls -lah services/node-api/data/
```

## Systemd Service (Optional)

For persistent service on Linux, create systemd service files:

**`/etc/systemd/system/emr-api.service`**:
```ini
[Unit]
Description=EMR Node.js API
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/path/to/patient-records/services/node-api
ExecStart=/usr/local/bin/node src/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable emr-api
sudo systemctl start emr-api
sudo systemctl status emr-api
```

## Summary

| Component | Port | Status | Access |
|-----------|------|--------|--------|
| React Frontend | 3000 | Dev Server | http://localhost:3000 |
| Node.js API | 3001 | Running | http://localhost:3001/api |
| Nginx Proxy | 80 | Running | http://localhost |
## Summary

| Component | Port | Status | Access |
|-----------|------|--------|--------|
| React Frontend | 3000 | Dev Server | http://localhost:3000 |
| Node.js API | 3001 | Running | http://localhost:3001/api |
| Nginx Proxy | 80 | Running | http://emr |
| SQLite Database | - | Local File | services/node-api/data/diabetes.db |

**Development Access**:
- Direct: http://localhost:3000 (React), http://localhost:3001 (API)
- Via Nginx: http://emr (requires `/etc/hosts` entry)

**Production Access**:
- http://emr or http://emr.com (with real domain)

For production, follow the "Production Deployment" section to serve built React files on the `emr` domain.