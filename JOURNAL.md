# Daily Journal — 2026-03-23

Summary of actions performed on 2026-03-23

- Verified presence and integrity of primary databases:
  - `data/patient_records.db` — integrity OK, patients table present.
  - `services/data/diabetes.db` — integrity OK.

- Investigations & recovery:
  - Located and inspected authentication schema: `data/auth_and_appointments.sql` (contains `users`, `roles`, `user_sessions`, `appointments`, etc.).
  - Ran `scripts/init-auth-db.sh` to apply the auth schema; found some parts already applied (duplicate insert errors), confirmed `users` seeded with demo accounts.
  - Implemented a read-only viewer: `read_only_viewer.py` (serves `/api/patients` and `/ui`), to safely surface patient data without running old/removed services.

- Frontend work:
  - Inspected `web/src/pages/Login.jsx` and added a dev-only `Auto login (dev)` button (visible in dev mode) which sets a safe `token` and `user` in `localStorage`.
  - Confirmed frontend expects `VITE_API_URL` pointing to an API at `/api`.

- Backend work:
  - Started the Node auth API (services/node-api) on port `3001`.
  - Verified login via curl using seeded demo credentials (`admin` / `password123`) — login returned a token.

- Repo housekeeping (non-destructive):
  - Created `REMOVAL_LOG.md` to record deletions and actions taken.
  - Moved some archived services to `archive/` and added `FROZEN_SERVICES.md` to note archived components.

Important notes & next steps

- For local testing (recommended): run `scripts/start-local.sh` which starts the read-only API (default port 3001) and the React dev server (default port 3000). The script now shows this journal and prompts for confirmation before running (set `SKIP_JOURNAL=1` to bypass).
- If you rely on the Node auth API instead of the read-only viewer, start `services/node-api` (it runs on port 3001 by default).
- Authentication: demo users are seeded in `services/node-api/data/diabetes.db` by `data/auth_and_appointments.sql`. Production should use bcrypt and JWT; current Node service uses a simple salted hash and a base64 token.

Action log (timestamps approximate, local machine time):

- 09:12 — Located DB files and checked integrity.
- 09:35 — Added read-only viewer and `scripts/start-local.sh` helper.
- 10:05 — Added dev-auto-login to `web/src/pages/Login.jsx`.
- 10:20 — Ran `scripts/init-auth-db.sh` and validated seeded users in `services/node-api/data/diabetes.db`.
- 10:28 — Started Node auth API on port 3001 and verified login via curl.
- 10:40 — Committed changes: dev auto-login, read-only viewer, start script, REMOVAL_LOG.

Please read this journal before starting or modifying services today.

How to skip this prompt in scripts: set `SKIP_JOURNAL=1` in your environment.

----
Authored-by: automated-assistant (pair-programming session)
