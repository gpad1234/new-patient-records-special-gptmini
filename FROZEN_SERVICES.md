**Frozen Services Guidance**

Goal: simplify local dev for the diabetes clinic UI by freezing or stopping background services that are not required for the skinny React+Python+SQLite stack.

Recommended candidates to freeze/stop:
- `java-service` — not required for the diabetes pilot UI
- `mcp-node-research`, `mcp-python-research` — research services can be disabled
- any background cronjobs or scheduled scrapers defined in `deployment/` or `scripts/`

Safe steps to freeze:
1. Stop local processes (if running) using their pid files or service scripts (see `scripts/stop-nonessential-services.sh`).
2. If using Docker, do NOT run the full compose; only run the Python service and frontend. Use `docker-compose -f docker-compose.minimal.yml up` if you create a minimal compose.
3. Comment-out automatic startup entries in `deployment/start-services.sh` or similar, or create a `deployment/start-minimal.sh` that only starts the Python service.

If you want, I can:
- Create `deployment/start-minimal.sh` that only starts `services/python-service` (and creates `.venv`), and
- Generate a `docker-compose.minimal.yml` for a single Python+frontend setup.
