# Local Development: Node.js-Only Stack Startup Instructions

## 1. Start the Node.js API Backend
```
cd services/node-api
npm install
npm start
```
- Runs backend at: http://localhost:3001
- Uses persistent SQLite database (data/diabetes.db)

## 2. Start the React Frontend
```
cd web
npm install
npm run dev
```
- Runs frontend at: http://localhost:3000
- Proxies API requests to backend

## 3. Open the App
- Visit: http://localhost:3000 in your browser

## Notes
- Make sure both backend and frontend are running for full functionality.
- If you change environment variables, restart the dev servers.
- For a clean frontend build:
  ```
  rm -rf dist node_modules/.vite
  npm run build
  ```

---

For further automation or troubleshooting, ask for a script or more details.
