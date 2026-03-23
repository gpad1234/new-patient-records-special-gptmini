# React Web UI

React 18 frontend for Diabetes EMR System.

## Quick Start

```bash
npm install
npm start
```

Runs on `http://localhost:3000`

## Environment Variables

```
REACT_APP_API_URL=http://localhost:3001
```

## Features

- 🏥 Hospital dashboard
- 👥 Patient management
- 📊 Diabetes records tracking
- 📱 Responsive design

## Minimal UI mode

This repo includes a minimal pilot mode with research and DICOM features disabled by default. To enable research UI (if services are running), edit `src/config.js` and set `SHOW_RESEARCH` / `SHOW_DICOM` to `true`.

## Scripts

```bash
npm start    # Development server
npm test     # Run tests
npm build    # Production build
```

## Components

- `PatientList` - List all patients
- `PatientForm` - Add new patient
- `DiabetesRecords` - Patient diabetes records
- `HospitalDashboard` - System statistics
- `Navigation` - App navigation bar
