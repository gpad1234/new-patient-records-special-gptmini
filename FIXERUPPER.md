# Project Fixer-Upper Guide

## 1. Backend Services

**Python Service (with SQLite)**
- Activate your virtual environment.
- Initialize the SQLite DB (if not already):
  ```
  sqlite3 data/patient_records.db < data/init_sqlite.sql
  ```
- Start the Python service:
  ```
  python3 services/python-service/src/app.py
  ```
- Test endpoints (e.g., with curl or Postman):
  ```
  curl http://localhost:5000/patients
  ```

**Node.js API Gateway**
- Ensure dependencies are installed:
  ```
  cd services/node-service
  npm install
  ```
- Start the Node service:
  ```
  ./scripts/start-node-service.sh
  ```
- Node should proxy /api requests to Python.

---

## 2. Frontend (React Web App)

- Install dependencies:
  ```
  cd web
  npm install
  ```
- Start the dev server:
  ```
  npm run dev
  ```
- Open: http://localhost:3000

---

## 3. Troubleshooting

- If the dashboard ("/") does not show, check:
  - You are logged in (token in localStorage).
  - The Node service implements /api/auth/login (add a mock if needed).
  - The browser console for errors.
  - Network tab for failed API calls.

### Preventative fixes applied (automated)

- Ensure Node API SQLite DB directory and file are created automatically before the server starts. See `services/node-api/scripts/ensure-db.js`.
- `services/node-api` now runs the `ensure-db.js` script automatically before `npm run dev` or `npm start` via `predev`/`prestart` npm hooks.
- Server now opens SQLite with create flags and logs clearer messages on DB connection to avoid `SQLITE_CANTOPEN` for missing directories.
- Dev CSP for the web UI is relaxed in `web/index.html` only for local development; production should use strict CSP via env or build-time settings.

These changes reduce the chance another developer hits the same startup error (missing `data/diabetes.db`) and make local dev startup smoother.

- If /patients works but dashboard does not, the dashboard is likely a frontend logic or routing issue, not a backend problem.

---

## 4. Next Steps

- If you want the dashboard to show live data, update Dashboard.jsx to fetch from your API.
- If login is broken, add a mock /api/auth/login endpoint to Node.

---

Let this file be your quick reference for restoring and debugging your local setup!
