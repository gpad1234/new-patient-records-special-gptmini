# Technical Specification: Local Development Environment

## Overview
This document outlines the technical requirements and steps for setting up and running the local development environment for the Node.js-only stack of the EMR project.

## Components
- **Node.js API Backend** (Express, SQLite)
- **React Frontend** (Vite, React)

## Prerequisites
- Node.js (recommended: latest LTS)
- npm (comes with Node.js)
- macOS or compatible Unix-like OS

## Directory Structure
- `services/node-api/` — Node.js backend service
- `web/` — React frontend application
- `data/` — SQLite database files

## Setup & Startup Steps

### 1. Start the Node.js API Backend
```
cd services/node-api
npm install
npm start
```
- Runs at: http://localhost:3001
- Uses persistent SQLite database: `data/diabetes.db`

### 2. Start the React Frontend
```
cd web
npm install
npm run dev
```
- Runs at: http://localhost:3000
- Proxies API requests to backend

### 3. Open the App
- Visit: http://localhost:3000 in your browser

## Additional Notes
- Both backend and frontend must be running for full functionality.
- Restart dev servers after changing environment variables.
- For a clean frontend build:
  ```
  rm -rf dist node_modules/.vite
  npm run build
  ```

## References
- See `LOCAL_DEV_STARTUP.md` for step-by-step instructions.
- Database schema and setup: `data/` directory.
- For troubleshooting or automation, refer to project scripts in `scripts/`.
