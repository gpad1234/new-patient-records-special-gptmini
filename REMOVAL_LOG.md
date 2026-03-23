# Removal Actions Log

Repository: patient-records-deployed
Recorded by: GitHub Copilot (automated log)
Timestamp: 2026-03-23T15:04:16-07:00

Purpose: record actions taken when removing extraneous files so team continuity is preserved.

---

Current git status (porcelain):

 M README.md
 M deployment/backup-and-deploy.sh
 M deployment/deploy-fast.sh
 D services/dicom-service/package-lock.json
 D services/dicom-service/package.json
 D services/dicom-service/src/server.js
 D services/java-service/Dockerfile
 D services/java-service/QUICKSTART.md
 D services/java-service/README.md
 D services/java-service/TCP_CLIENT_SERVER.md
 D services/java-service/client.sh
 D services/java-service/pom.xml
 D services/java-service/src/main/java/com/healthcare/java/mcp/WebScraperMCPServer.java
 D services/java-service/src/main/java/com/healthcare/java/patient/InMemoryPatientRepository.java
 D services/java-service/src/main/java/com/healthcare/java/patient/Patient.java
 D services/java-service/src/main/java/com/healthcare/java/patient/PatientRepository.java
 D services/java-service/src/main/java/com/healthcare/java/patient/PatientService.java
 D services/java-service/src/main/java/com/healthcare/java/patient/SQLitePatientRepository.java
 D services/java-service/src/main/java/com/healthcare/java/patient/SocketClient.java
 D services/java-service/src/main/java/com/healthcare/java/patient/SocketServer.java
 D services/java-service/src/main/java/com/healthcare/java/service/JavaMCPServiceApp.java
 D services/java-service/src/test/java/com/healthcare/java/patient/PatientServiceTest.java
 D services/java-service/src/test/java/com/healthcare/java/patient/SocketClientTest.java
 D services/java-service/src/test/java/com/healthcare/java/patient/SocketServerTest.java
 D services/java-service/start-server.sh
 D services/java-service/test-interactive.sh
 D services/java-service/testng.xml
 D services/mcp-node-research/package-lock.json
 D services/mcp-node-research/package.json
 D services/mcp-node-research/server.js
 D services/mcp-python-research/main.py
 D services/mcp-python-research/requirements.txt
 M services/python-service/README.md
 M services/python-service/requirements.txt
 M services/python-service/src/app.py
 M services/web-ui/README.md
 M services/web-ui/package-lock.json
 M services/web-ui/package.json
 M services/web-ui/src/App.jsx
 M services/web-ui/src/components/AIPredictions.jsx
 M services/web-ui/src/components/AIResearch.css
 M services/web-ui/src/components/AIResearch.jsx
 M services/web-ui/src/components/AIResearchJournal.jsx
 M services/web-ui/src/components/AdminDataSeeder.jsx
 M services/web-ui/src/components/HospitalDashboard.jsx
 M services/web-ui/src/components/LiveResearch.jsx
 M services/web-ui/src/components/Navigation.jsx
 M services/web-ui/src/components/PatientList.jsx
 M web/src/pages/Appointments.jsx
 M web/src/pages/Login.jsx
 M web/src/pages/Register.jsx
 M web/vite.config.js
?? FROZEN_SERVICES.md
?? archive/
?? deployment/start-minimal.sh
?? scripts/smoke-test-api.sh
?? scripts/start-diabetes-dev.sh
?? scripts/stop-nonessential-services.sh
?? services/node-api/data/
?? services/python-service/python-service.pid
?? services/python-service/src/init_db.py
?? services/web-ui/src/config.js

---

Recent commits (last 5):

015657d 2026-03-22 15:11:18 -0700 auth: add failed-login logging + admin endpoint; normalize usernames/emails; nginx: disable index.html caching; ensure-db: set data dir perms
    M       nginx.conf
    M       services/node-api/scripts/ensure-db.js
    M       services/node-api/src/routes/auth.js

a16df00 2026-03-22 14:16:31 -0700 CI: add workflow to build web bundle and upload artifact
    A       .github/workflows/build-web.yml

0a7ec35 2026-03-22 14:13:07 -0700 Ops: add deploy helper, .env.example, sync-check and docs
    M       .env.example
    M       DEPLOYMENT.md
    A       deployment/deploy.sh
    A       scripts/sync-check.sh

332ae81 2026-03-22 13:58:45 -0700 Frontend: use relative /api endpoints instead of localhost:3001
    M       web/src/pages/Appointments.jsx
    M       web/src/pages/DataLoader.jsx
    M       web/src/pages/Login.jsx
    M       web/src/pages/Register.jsx

4f2f6d4 2026-03-22 13:36:27 -0700 web: use relative API base and normalize endpoints to /api for same-origin proxying
    M       web/src/utils/api.js

---

Actions recorded below will be appended as the workflow proceeds.

1) [2026-03-23T15:04:16-07:00] Log created and repo state captured by Copilot.

2) [2026-03-23T15:10:00-07:00] Created a read-only patient viewer and started it on http://127.0.0.1:5002. The viewer is WSGI-based and reads from `data/patient_records.db` and `services/data/diabetes.db`. No old service files were restored.

3) [2026-03-23T15:36:25-07:00] Attempted one-shot fast deploy via `deployment/deploy-fast.sh`.
     - Outcome: FAILED during upload step.
     - Error highlights:
         - SSH identity file `/home/girish/.ssh/droplet_key` not found.
         - Remote host key for `165.232.54.109` differs from known_hosts (host key verification failed).
         - `scp` exited with code 255; deployment aborted.

Next recommended actions:
- Add or provide the correct SSH key at `~/.ssh/droplet_key` or update `deployment/deploy-fast.sh` to point to an available key.
- If the remote host key changed intentionally, run `ssh-keygen -f '/home/girish/.ssh/known_hosts' -R '165.232.54.109'` then `ssh -i <key> root@165.232.54.109` to accept the new key.
- Alternatively, provide CI/CD credentials or allow me to prepare a local build artifact instead of remote deploy.

4) [2026-03-23T15:40:00-07:00] Performed local one-shot: started read-only API on port 3001 and React dev server on port 3000 (Vite). The React dev server is set to use `VITE_API_URL=http://127.0.0.1:3001` so `/api/patients` resolves to the local read-only API. No remote deploy performed.


Next steps (suggested):
- Review the `D` (deleted) and `??` (untracked) file list above and confirm which files to permanently remove.
- Option: create a branch, run `git restore` to recover any accidentally deleted files, or run `git rm` / remove from disk and commit when ready.
- I can prepare a removal script and append exact removal lines to this log while executing them.
