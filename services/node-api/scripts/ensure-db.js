const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, '../data/diabetes.db');
const DB_DIR = path.dirname(DB_PATH);

try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log(`Created DB directory: ${DB_DIR}`);
    try {
      fs.chmodSync(DB_DIR, 0o775);
      console.log(`Set permissions on DB directory: ${DB_DIR} -> 775`);
    } catch (e) {
      console.warn(`Could not set permissions on DB directory: ${e.message}`);
    }
  } else {
    // Ensure directory has group-write permissions so the runtime user can write
    try {
      fs.chmodSync(DB_DIR, 0o775);
      console.log(`Ensured permissions on DB directory: ${DB_DIR} -> 775`);
    } catch (e) {
      // Non-fatal
    }
  }

  if (!fs.existsSync(DB_PATH)) {
    // create file
    fs.closeSync(fs.openSync(DB_PATH, 'a'));
    console.log(`Created DB file: ${DB_PATH}`);
    try { fs.chmodSync(DB_PATH, 0o664); } catch (e) { /* ignore */ }
  } else {
    console.log(`DB file exists: ${DB_PATH}`);
  }

  // Optionally apply schema if schema file exists and DB is empty
  const schemaPath = path.resolve(__dirname, '../../data/auth_and_appointments.sql');
  if (fs.existsSync(schemaPath)) {
    try {
      const stat = fs.statSync(DB_PATH);
      if (stat.size === 0) {
        console.log('Applying initial schema...');
        // Use sqlite3 command-line if available
        try {
          execSync(`sqlite3 ${DB_PATH} < ${schemaPath}`);
          console.log('Schema applied');
        } catch (err) {
          console.warn('Could not apply schema via sqlite3 CLI, skipping:', err.message);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  process.exit(0);
} catch (err) {
  console.error('Failed to ensure DB:', err.message);
  process.exit(1);
}
