Deployment documentation for droplet (24.144.94.16)

Overview
--------
This document describes the automated deploy script `deploydoc.sh` which performs a production-style deployment (HTTP only) of the Patient Records app to a fresh Ubuntu droplet.

What the script does
- Installs Node.js 20, build tools, nginx, sqlite3
- Clones the GitHub repository: https://github.com/gpad1234/new-patient-records-special-gptmini.git
- Installs dependencies for `services/node-api` and `web`
- Ensures the SQLite DB file/directory exists and applies initial schema if empty
- Creates a systemd service `patient-node-api.service` to run the Node API
- Builds the web UI and serves `web/dist` via nginx on port 80
- Configures nginx to proxy `/api` to `http://127.0.0.1:3001`

Security notes
- The script runs services as `root` for simplicity. For production change the systemd `User=` to a non-root user and adjust file permissions.
- This deploy uses HTTP only as requested. To enable HTTPS later, run Certbot and configure nginx to use the obtained certificates.

How to run
1. SSH into droplet as `root` (passwordless SSH is recommended):
   ```bash
   ssh root@24.144.94.16
   ```
2. Copy `deploydoc.sh` to the server and run it as root, or run it locally via SSH non-interactively:
   ```bash
   scp deploydoc.sh root@24.144.94.16:/root/
   ssh root@24.144.94.16 'bash /root/deploydoc.sh'
   ```

Troubleshooting
- If the script fails on package installation, ensure apt is available and the droplet has internet access.
- If nginx fails to start, inspect `/var/log/nginx/error.log` and run `nginx -t` to test configuration.

Logs
- Node API logs: `journalctl -u patient-node-api.service -f`
- Nginx logs: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`

Contact
- If you want me to run the script from here, ensure the SSH key for this environment is installed in the droplet's `root` authorized_keys.
