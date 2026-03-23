"""Initialize a minimal diabetes SQLite database for the clinic pilot.

Run: python src/init_db.py
This will create `data/diabetes.db` at the repository root with basic tables and sample data.
"""
import os
import sqlite3

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA_DIR = os.path.join(ROOT, 'data')
DB_PATH = os.path.join(DATA_DIR, 'diabetes.db')

os.makedirs(DATA_DIR, exist_ok=True)

schema_sql = '''
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    dob TEXT,
    gender TEXT,
    nhs_number TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    visit_date TEXT,
    notes TEXT,
    clinician TEXT,
    FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    medication TEXT,
    start_date TEXT,
    end_date TEXT,
    instructions TEXT,
    FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lab_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    test_date TEXT,
    test_name TEXT,
    value TEXT,
    units TEXT,
    notes TEXT,
    FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Indexes to improve read/query performance
CREATE INDEX IF NOT EXISTS idx_patients_lastname ON patients(last_name);
CREATE INDEX IF NOT EXISTS idx_patients_nhs ON patients(nhs_number);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_patient ON lab_results(patient_id);
'''

sample_sql = '''
INSERT INTO patients (first_name, last_name, dob, gender, nhs_number) VALUES
('Alice', 'Miller', '1978-04-12', 'F', 'NH12345'),
('Bob', 'Khan', '1965-09-30', 'M', 'NH67890');

INSERT INTO medical_records (patient_id, visit_date, notes, clinician) VALUES
(1, '2026-03-01', 'Initial diabetes review. HbA1c 8.2%', 'Dr. Rao'),
(2, '2026-02-15', 'Routine follow-up. BP and weight stable.', 'Nurse Chen');

INSERT INTO lab_results (patient_id, test_date, test_name, value, units) VALUES
(1, '2026-03-01', 'HbA1c', '8.2', '%'),
(2, '2026-02-10', 'Creatinine', '85', 'umol/L');

INSERT INTO prescriptions (patient_id, medication, start_date, instructions) VALUES
(1, 'Metformin 500mg', '2026-03-01', '1 tablet twice daily with food');
'''

def init_db():
    if os.path.exists(DB_PATH):
        print(f"Database already exists at: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.executescript(schema_sql)
    cur.executescript(sample_sql)
    conn.commit()
    conn.close()
    print(f"Created diabetes DB at: {DB_PATH}")

if __name__ == '__main__':
    init_db()
