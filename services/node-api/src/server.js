const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DataLoader = require('./dataLoader');
const initAuthRoutes = require('./routes/auth');
const initAppointmentRoutes = require('./routes/appointments');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, '../data/diabetes.db');

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, '../data/diabetes.db');

// Ensure DB directory exists and file is creatable before opening
    'http://127.0.0.1:3000'
  ],
  credentials: true,
}));
app.use(express.json());

// Simple request logger to aid debugging (prints method and path)
app.use((req, res, next) => {
  console.log(`→ [REQ] ${req.method} ${req.url}`);
  next();
});

// Initialize SQLite Database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✓ Connected to SQLite database');
    initializeDatabase();
    loadAuthSchema();
  }
});

function loadAuthSchema() {
  // Load and execute auth schema
  const authSchemaPath = path.join(__dirname, '../../../data/auth_and_appointments.sql');
  
  if (fs.existsSync(authSchemaPath)) {
    const schema = fs.readFileSync(authSchemaPath, 'utf8');
    
    db.exec(schema, (err) => {
      if (err && err.code !== 'SQLITE_CONSTRAINT') {
        // Ignore constraint errors (data already exists)
        console.error('Error loading auth schema:', err);
      } else {
        console.log('✓ Authentication and appointments schema loaded (or already exists)');
      }
    });
  } else {
    console.warn('⚠ Auth schema file not found at:', authSchemaPath);
  }
}

function initializeDatabase() {
  db.serialize(() => {
    // Patients table
    db.run(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mrn TEXT NOT NULL UNIQUE,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        dateOfBirth TEXT NOT NULL,
        gender TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zipCode TEXT,
        diabetesType TEXT DEFAULT 'Type 2',
        diagnosisDate TEXT,
        status TEXT DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Providers (Doctors/Nurses)
    db.run(`
      CREATE TABLE IF NOT EXISTS providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        npi TEXT NOT NULL UNIQUE,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        specialty TEXT,
        department TEXT,
        email TEXT,
        phone TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Visits/Encounters
    db.run(`
      CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER NOT NULL,
        providerId INTEGER NOT NULL,
        visitDate DATETIME NOT NULL,
        department TEXT,
        visitType TEXT,
        reason TEXT,
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (providerId) REFERENCES providers(id)
      )
    `);

    // Vital Signs (per visit)
    db.run(`
      CREATE TABLE IF NOT EXISTS vital_signs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitId INTEGER NOT NULL,
        patientId INTEGER NOT NULL,
        temperature REAL,
        bloodPressureSystolic INTEGER,
        bloodPressureDiastolic INTEGER,
        heartRate INTEGER,
        respiratoryRate INTEGER,
        weight REAL,
        height REAL,
        bmi REAL,
        recordedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (visitId) REFERENCES visits(id) ON DELETE CASCADE,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
      )
    `);

    // Glucose Records (Diabetes specific)
    db.run(`
      CREATE TABLE IF NOT EXISTS glucose_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitId INTEGER,
        patientId INTEGER NOT NULL,
        glucoseValue REAL NOT NULL,
        glucoseType TEXT DEFAULT 'Random',
        unit TEXT DEFAULT 'mg/dL',
        notes TEXT,
        recordedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (visitId) REFERENCES visits(id) ON DELETE SET NULL,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
      )
    `);

    // Lab Results
    db.run(`
      CREATE TABLE IF NOT EXISTS lab_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitId INTEGER,
        patientId INTEGER NOT NULL,
        testName TEXT NOT NULL,
        testCode TEXT,
        resultValue REAL,
        unit TEXT,
        referenceRange TEXT,
        status TEXT,
        resultDate DATETIME NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (visitId) REFERENCES visits(id) ON DELETE SET NULL,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
      )
    `);

    // Medications
    db.run(`
      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER NOT NULL,
        medicationName TEXT NOT NULL,
        dosage TEXT,
        unit TEXT,
        frequency TEXT,
        route TEXT,
        startDate TEXT NOT NULL,
        endDate TEXT,
        indication TEXT,
        prescribedBy INTEGER,
        status TEXT DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (prescribedBy) REFERENCES providers(id)
      )
    `);

    // Diagnoses/Comorbidities
    db.run(`
      CREATE TABLE IF NOT EXISTS diagnoses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER NOT NULL,
        diagnosisCode TEXT,
        diagnosisName TEXT NOT NULL,
        icd10Code TEXT,
        diagnosisType TEXT,
        onsetDate TEXT,
        resolvedDate TEXT,
        status TEXT DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
      )
    `);

    // Allergies
    db.run(`
      CREATE TABLE IF NOT EXISTS allergies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER NOT NULL,
        allergen TEXT NOT NULL,
        reactionType TEXT,
        severity TEXT,
        notes TEXT,
        recordedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
      )
    `);

    // Care Team
    db.run(`
      CREATE TABLE IF NOT EXISTS care_team (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER NOT NULL,
        providerId INTEGER NOT NULL,
        role TEXT,
        startDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        endDate DATETIME,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (providerId) REFERENCES providers(id)
      )
    `);

    console.log('✓ Healthcare database tables initialized');
  });
}

// Initialize routes
app.use('/api/auth', initAuthRoutes(db));
app.use('/api/appointments', initAppointmentRoutes(db));

// Get all patients with record counts
app.get('/api/patients', (req, res) => {
  db.all(`
    SELECT p.*, 
      COUNT(DISTINCT g.id) as glucoseRecords,
      COUNT(DISTINCT l.id) as labResults,
      COUNT(DISTINCT m.id) as medications
    FROM patients p
    LEFT JOIN glucose_records g ON p.id = g.patientId
    LEFT JOIN lab_results l ON p.id = l.patientId
    LEFT JOIN medications m ON p.id = m.patientId
    GROUP BY p.id
    ORDER BY p.createdAt DESC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Get patients with pagination
app.get('/api/patients/paginated', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Get total count
  db.get('SELECT COUNT(*) as total FROM patients', (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Get paginated results
    db.all(`
      SELECT p.*, 
        COUNT(DISTINCT g.id) as glucoseRecords,
        COUNT(DISTINCT l.id) as labResults,
        COUNT(DISTINCT m.id) as medications
      FROM patients p
      LEFT JOIN glucose_records g ON p.id = g.patientId
      LEFT JOIN lab_results l ON p.id = l.patientId
      LEFT JOIN medications m ON p.id = m.patientId
      GROUP BY p.id
      ORDER BY p.createdAt DESC
      LIMIT ? OFFSET ?
    `, [limit, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        data: rows || [],
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    });
  });
});

// Create new patient
app.post('/api/patients', (req, res) => {
  const { mrn, firstName, lastName, email, phone, dateOfBirth, gender, diabetesType, diagnosisDate } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'First name, last name, and email required' });
  }

  db.run(
    `INSERT INTO patients (mrn, firstName, lastName, email, phone, dateOfBirth, gender, diabetesType, diagnosisDate, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
    [mrn || `PT-${Date.now()}`, firstName, lastName, email, phone, dateOfBirth, gender, diabetesType || 'Type 2', diagnosisDate],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Email or MRN already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT * FROM patients WHERE id = ?', [this.lastID], (err, patient) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(patient);
      });
    }
  );
});

// Get patient with full medical record
app.get('/api/patients/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM patients WHERE id = ?', [id], (err, patient) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Fetch all medical records in parallel
    db.all('SELECT * FROM glucose_records WHERE patientId = ? ORDER BY recordedAt DESC', [id], (err, glucose) => {
      db.all('SELECT * FROM lab_results WHERE patientId = ? ORDER BY resultDate DESC', [id], (err, labs) => {
        db.all('SELECT * FROM medications WHERE patientId = ? ORDER BY startDate DESC', [id], (err, meds) => {
          db.all('SELECT * FROM diagnoses WHERE patientId = ? ORDER BY onsetDate DESC', [id], (err, diagnoses) => {
            db.all('SELECT * FROM allergies WHERE patientId = ? ORDER BY recordedDate DESC', [id], (err, allergies) => {
              res.json({
                ...patient,
                medicalRecords: {
                  glucose: glucose || [],
                  labs: labs || [],
                  medications: meds || [],
                  diagnoses: diagnoses || [],
                  allergies: allergies || []
                }
              });
            });
          });
        });
      });
    });
  });
});

// Update patient
app.put('/api/patients/:id', (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone, dateOfBirth, gender, diabetesType, status } = req.body;

  db.run(
    `UPDATE patients SET firstName = ?, lastName = ?, email = ?, phone = ?, dateOfBirth = ?, gender = ?, diabetesType = ?, status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    [firstName, lastName, email, phone, dateOfBirth, gender, diabetesType, status, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM patients WHERE id = ?', [id], (err, patient) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(patient);
      });
    }
  );
});

// Delete patient
app.delete('/api/patients/:id', (req, res) => {
  db.run('DELETE FROM patients WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Patient deleted' });
  });
});

// Add diabetes record
app.post('/api/patients/:id/records', (req, res) => {
  const { id } = req.params;
  const { glucose, bloodPressure, notes } = req.body;

  if (!glucose) {
    return res.status(400).json({ error: 'Glucose level is required' });
  }

  db.run(
    'INSERT INTO diabetes_records (patientId, glucose, bloodPressure, notes) VALUES (?, ?, ?, ?)',
    [id, glucose, bloodPressure, notes],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      db.get('SELECT * FROM diabetes_records WHERE id = ?', [this.lastID], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(record);
      });
    }
  );
});

// Get patient's records
app.get('/api/patients/:id/records', (req, res) => {
  const { id } = req.params;

  db.all(
    'SELECT * FROM diabetes_records WHERE patientId = ? ORDER BY recordDate DESC',
    [id],
    (err, records) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(records || []);
    }
  );
});

// Hospital statistics
app.get('/api/hospital/stats', (req, res) => {
  db.get(
    'SELECT COUNT(*) as totalPatients FROM patients',
    (err, patientCount) => {
      if (err) return res.status(500).json({ error: err.message });

      db.all(
        'SELECT diabetesType, COUNT(*) as count FROM patients GROUP BY diabetesType',
        (err, types) => {
          if (err) return res.status(500).json({ error: err.message });

          db.get(
            'SELECT COUNT(*) as recordsCount FROM glucose_records',
            (err, recordCount) => {
              if (err) return res.status(500).json({ error: err.message });

              const diabetesTypes = {};
              (types || []).forEach(t => {
                diabetesTypes[t.diabetesType] = t.count;
              });

              res.json({
                totalPatients: patientCount?.totalPatients || 0,
                recordsCount: recordCount?.recordsCount || 0,
                diabetesTypes,
              });
            }
          );
        }
      );
    }
  );
});

// ===== GLUCOSE RECORDS =====
app.post('/api/patients/:id/glucose', (req, res) => {
  const { id } = req.params;
  const { glucoseValue, glucoseType, notes } = req.body;

  if (!glucoseValue) {
    return res.status(400).json({ error: 'Glucose value required' });
  }

  db.run(
    'INSERT INTO glucose_records (patientId, glucoseValue, glucoseType, notes) VALUES (?, ?, ?, ?)',
    [id, glucoseValue, glucoseType || 'Random', notes],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM glucose_records WHERE id = ?', [this.lastID], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(record);
      });
    }
  );
});

app.get('/api/patients/:id/glucose', (req, res) => {
  db.all(
    'SELECT * FROM glucose_records WHERE patientId = ? ORDER BY recordedAt DESC LIMIT 30',
    [req.params.id],
    (err, records) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(records || []);
    }
  );
});

// ===== LAB RESULTS =====
app.post('/api/patients/:id/labs', (req, res) => {
  const { id } = req.params;
  const { testName, resultValue, unit, referenceRange, status } = req.body;

  if (!testName || resultValue === undefined) {
    return res.status(400).json({ error: 'Test name and result value required' });
  }

  db.run(
    'INSERT INTO lab_results (patientId, testName, resultValue, unit, referenceRange, status, resultDate) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [id, testName, resultValue, unit, referenceRange, status || 'Normal'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM lab_results WHERE id = ?', [this.lastID], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(record);
      });
    }
  );
});

app.get('/api/patients/:id/labs', (req, res) => {
  db.all(
    'SELECT * FROM lab_results WHERE patientId = ? ORDER BY resultDate DESC',
    [req.params.id],
    (err, records) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(records || []);
    }
  );
});

// ===== MEDICATIONS =====
app.post('/api/patients/:id/medications', (req, res) => {
  const { id } = req.params;
  const { medicationName, dosage, unit, frequency, route, indication } = req.body;

  if (!medicationName) {
    return res.status(400).json({ error: 'Medication name required' });
  }

  db.run(
    'INSERT INTO medications (patientId, medicationName, dosage, unit, frequency, route, startDate, indication, status) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, "Active")',
    [id, medicationName, dosage, unit, frequency, route, indication],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM medications WHERE id = ?', [this.lastID], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(record);
      });
    }
  );
});

app.get('/api/patients/:id/medications', (req, res) => {
  db.all(
    'SELECT * FROM medications WHERE patientId = ? AND status = "Active" ORDER BY startDate DESC',
    [req.params.id],
    (err, records) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(records || []);
    }
  );
});

app.put('/api/medications/:medId', (req, res) => {
  const { status } = req.body;
  db.run(
    'UPDATE medications SET status = ? WHERE id = ?',
    [status || 'Inactive', req.params.medId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM medications WHERE id = ?', [req.params.medId], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(record);
      });
    }
  );
});

// ===== DIAGNOSES =====
app.post('/api/patients/:id/diagnoses', (req, res) => {
  const { id } = req.params;
  const { diagnosisName, icd10Code, diagnosisType } = req.body;

  if (!diagnosisName) {
    return res.status(400).json({ error: 'Diagnosis name required' });
  }

  db.run(
    'INSERT INTO diagnoses (patientId, diagnosisName, icd10Code, diagnosisType, onsetDate, status) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, "Active")',
    [id, diagnosisName, icd10Code, diagnosisType || 'Secondary'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM diagnoses WHERE id = ?', [this.lastID], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(record);
      });
    }
  );
});

app.get('/api/patients/:id/diagnoses', (req, res) => {
  db.all(
    'SELECT * FROM diagnoses WHERE patientId = ? AND status = "Active"',
    [req.params.id],
    (err, records) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(records || []);
    }
  );
});

// ===== ALLERGIES =====
app.post('/api/patients/:id/allergies', (req, res) => {
  const { id } = req.params;
  const { allergen, reactionType, severity, notes } = req.body;

  if (!allergen) {
    return res.status(400).json({ error: 'Allergen required' });
  }

  db.run(
    'INSERT INTO allergies (patientId, allergen, reactionType, severity, notes) VALUES (?, ?, ?, ?, ?)',
    [id, allergen, reactionType, severity || 'Mild', notes],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM allergies WHERE id = ?', [this.lastID], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(record);
      });
    }
  );
});

app.get('/api/patients/:id/allergies', (req, res) => {
  db.all(
    'SELECT * FROM allergies WHERE patientId = ?',
    [req.params.id],
    (err, records) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(records || []);
    }
  );
});

// Data Seeding Endpoints
const dataLoader = new DataLoader(db);

// POST /api/admin/seed - Generate synthetic test patients
app.post('/api/admin/seed', async (req, res) => {
  try {
    const count = req.body.count || 10;
    const result = await dataLoader.seedDatabase(count);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/seed-status - Check current patient count
app.get('/api/admin/seed-status', (req, res) => {
  db.get(
    'SELECT COUNT(*) as total FROM patients',
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ totalPatients: result.total });
    }
  );
});

// DELETE /api/admin/clear-all - Clear all data (be careful!)
app.delete('/api/admin/clear-all', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM glucose_records');
    db.run('DELETE FROM lab_results');
    db.run('DELETE FROM medications');
    db.run('DELETE FROM diagnoses');
    db.run('DELETE FROM allergies');
    db.run('DELETE FROM care_team');
    db.run('DELETE FROM visits');
    db.run('DELETE FROM vital_signs');
    db.run('DELETE FROM providers');
    db.run('DELETE FROM patients', (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'All data cleared' });
    });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Diabetes EMR API is running' });
});

// Start server only when run directly (prevents listen on require)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ Diabetes EMR API running on http://localhost:${PORT}`);
    console.log(`✓ Database: ${DB_PATH}`);
  });
}

module.exports = app;
