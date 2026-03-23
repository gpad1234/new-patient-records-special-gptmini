"""
Patient Records - Python MCP Service
Handles clinical protocols and lab results
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
import os
import sqlite3
from dotenv import load_dotenv
import random
from datetime import datetime, timedelta
import tempfile
import zipfile
import csv
import io

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': os.getenv('SERVICE_NAME', 'python-service'),
        'version': '1.0.0'
    })


@app.route('/api/info', methods=['GET'])
def info():
    """Service information endpoint"""
    return jsonify({
        'name': 'Patient Records - Python MCP Service',
        'version': '1.0.0',
        'description': 'Handles clinical protocols, lab results, and medications',
        'port': os.getenv('PORT', 5000)
    })


def get_db_connection():
    """Get database connection"""
    # Prefer project-level diabetes DB for the diabetes clinic pilot
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    # Look for diabetes.db first, fall back to patient_records.db for compatibility
    db_candidates = [os.path.join(project_root, 'data', 'diabetes.db'),
                     os.path.join(project_root, 'data', 'patient_records.db')]
    db_path = None
    for p in db_candidates:
        if os.path.exists(p):
            db_path = p
            break
    if db_path is None:
        # create a default diabetes.db next to other data files
        db_dir = os.path.join(project_root, 'data')
        os.makedirs(db_dir, exist_ok=True)
        db_path = os.path.join(db_dir, 'diabetes.db')

    db_path = os.path.abspath(db_path)
    logger.info(f'Connecting to database at: {db_path}')
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@app.route('/api/patients', methods=['GET'])
def get_patients():
    """Get all patients"""
    try:
        conn = get_db_connection()
        patients = conn.execute('SELECT * FROM patients').fetchall()
        conn.close()
        
        return jsonify([dict(patient) for patient in patients])
    except Exception as e:
        logger.error(f'Error fetching patients: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/patients/paginated', methods=['GET'])
def get_patients_paginated():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        offset = (page - 1) * limit

        conn = get_db_connection()
        cur = conn.cursor()
        total_row = cur.execute('SELECT COUNT(*) as total FROM patients').fetchone()
        total = total_row['total'] if isinstance(total_row, sqlite3.Row) and 'total' in total_row.keys() else total_row[0]

        rows = cur.execute('SELECT * FROM patients ORDER BY created_at DESC LIMIT ? OFFSET ?', (limit, offset)).fetchall()
        conn.close()

        data = [dict(r) for r in rows]
        totalPages = (total + limit - 1) // limit if limit else 1
        pagination = {
            'total': total,
            'page': page,
            'limit': limit,
            'totalPages': totalPages,
            'hasPrevPage': page > 1,
            'hasNextPage': page < totalPages
        }
        return jsonify({'data': data, 'pagination': pagination})
    except Exception as e:
        logger.error(f'Error in paginated patients: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/patients/recent', methods=['GET'])
def get_recent_patients():
    try:
        limit = int(request.args.get('limit', 5))
        conn = get_db_connection()
        rows = conn.execute('SELECT * FROM patients ORDER BY created_at DESC LIMIT ?', (limit,)).fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        logger.error(f'Error fetching recent patients: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/hospital/stats', methods=['GET'])
def hospital_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        total_row = cur.execute('SELECT COUNT(*) as total FROM patients').fetchone()
        total = total_row['total'] if isinstance(total_row, sqlite3.Row) and 'total' in total_row.keys() else total_row[0]

        records_row = cur.execute('SELECT COUNT(*) as total FROM medical_records').fetchone()
        recordsCount = records_row['total'] if isinstance(records_row, sqlite3.Row) and 'total' in records_row.keys() else records_row[0]

        # attempt to compute diabetes types if column exists
        try:
            types = {}
            for row in cur.execute('SELECT diabetes_type, COUNT(*) as c FROM patients GROUP BY diabetes_type'):
                key = row['diabetes_type'] or 'Unknown'
                types[key] = row['c']
        except Exception:
            types = {}

        conn.close()
        return jsonify({'totalPatients': total, 'recordsCount': recordsCount, 'diabetesTypes': types})
    except Exception as e:
        logger.error(f'Error computing stats: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/patients/<int:patient_id>', methods=['GET'])
def get_patient(patient_id):
    """Get a specific patient"""
    try:
        conn = get_db_connection()
        patient = conn.execute('SELECT * FROM patients WHERE id = ?', (patient_id,)).fetchone()
        conn.close()
        
        if patient is None:
            return jsonify({'error': 'Patient not found'}), 404
            
        return jsonify(dict(patient))
    except Exception as e:
        logger.error(f'Error fetching patient: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/patients/<int:patient_id>/records', methods=['GET'])
def get_patient_records(patient_id):
    """Get medical records for a patient"""
    try:
        conn = get_db_connection()
        records = conn.execute(
            'SELECT * FROM medical_records WHERE patient_id = ? ORDER BY visit_date DESC',
            (patient_id,)
        ).fetchall()
        conn.close()
        
        return jsonify([dict(record) for record in records])
    except Exception as e:
        logger.error(f'Error fetching patient records: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/patients/<int:patient_id>/prescriptions', methods=['GET'])
def get_patient_prescriptions(patient_id):
    """Get prescriptions for a patient"""
    try:
        conn = get_db_connection()
        prescriptions = conn.execute(
            'SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY start_date DESC',
            (patient_id,)
        ).fetchall()
        conn.close()
        
        return jsonify([dict(prescription) for prescription in prescriptions])
    except Exception as e:
        logger.error(f'Error fetching prescriptions: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/patients/<int:patient_id>/labs', methods=['GET'])
def get_patient_labs(patient_id):
    """Get lab results for a patient"""
    try:
        conn = get_db_connection()
        labs = conn.execute(
            'SELECT * FROM lab_results WHERE patient_id = ? ORDER BY test_date DESC',
            (patient_id,)
        ).fetchall()
        conn.close()
        
        return jsonify([dict(lab) for lab in labs])
    except Exception as e:
        logger.error(f'Error fetching lab results: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/seed-status', methods=['GET'])
def seed_status():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT COUNT(*) as total FROM patients')
        row = cur.fetchone()
        # sqlite Row returns tuple-like; handle both
        total = row['total'] if isinstance(row, sqlite3.Row) and 'total' in row.keys() else (row[0] if row else 0)
        conn.close()
        return jsonify({'total': total})
    except Exception as e:
        logger.error(f'Error checking seed status: {e}')
        return jsonify({'error': str(e)}), 500


def random_dob(min_age=20, max_age=90):
    today = datetime.today()
    age = random.randint(min_age, max_age)
    birth = today - timedelta(days=365 * age + random.randint(0, 365))
    return birth.strftime('%Y-%m-%d')


def synthetic_name():
    first_names = ['Sam', 'Alex', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Jamie', 'Morgan', 'Drew', 'Cameron']
    last_names = ['Smith', 'Jones', 'Brown', 'Garcia', 'Miller', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Khan']
    return random.choice(first_names), random.choice(last_names)


@app.route('/api/admin/seed', methods=['POST'])
def seed_data():
    req = request.get_json() or {}
    count = int(req.get('count', 10))
    inserted = 0
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        for i in range(count):
            fn, ln = synthetic_name()
            dob = random_dob()
            gender = random.choice(['M', 'F', 'O'])
            nhs = f'NH{random.randint(10000,99999)}'
            cur.execute('INSERT INTO patients (first_name, last_name, dob, gender, nhs_number) VALUES (?, ?, ?, ?, ?)',
                        (fn, ln, dob, gender, nhs))
            patient_id = cur.lastrowid

            # Add a small number of medical records
            for r in range(random.randint(1, 4)):
                visit = (datetime.today() - timedelta(days=random.randint(0, 365))).strftime('%Y-%m-%d')
                notes = f'Synthetic visit {r+1} for {fn} {ln}'
                clinician = random.choice(['Dr. Rao', 'Nurse Chen', 'Dr. Patel'])
                cur.execute('INSERT INTO medical_records (patient_id, visit_date, notes, clinician) VALUES (?, ?, ?, ?)',
                            (patient_id, visit, notes, clinician))

            # Add 1-3 lab results
            lab_tests = [('HbA1c', '%', lambda: f"{random.uniform(5.5, 9.5):.1f}"),
                         ('Creatinine', 'umol/L', lambda: str(random.randint(60, 120))),
                         ('Cholesterol', 'mmol/L', lambda: f"{random.uniform(3.5, 6.5):.1f}")]
            for lt in random.sample(lab_tests, k=random.randint(1, 3)):
                test_date = (datetime.today() - timedelta(days=random.randint(0, 365))).strftime('%Y-%m-%d')
                cur.execute('INSERT INTO lab_results (patient_id, test_date, test_name, value, units) VALUES (?, ?, ?, ?, ?)',
                            (patient_id, test_date, lt[0], lt[2](), lt[1]))

            # Add a prescription
            med = random.choice(['Metformin 500mg', 'Insulin - basal', 'Gliclazide 80mg'])
            cur.execute('INSERT INTO prescriptions (patient_id, medication, start_date, instructions) VALUES (?, ?, ?, ?)',
                        (patient_id, datetime.today().strftime('%Y-%m-%d'), med, 'Take as directed'))

            inserted += 1

        conn.commit()
        conn.close()
        return jsonify({'success': True, 'patientsInserted': inserted})
    except Exception as e:
        logger.error(f'Error seeding data: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/clear-all', methods=['DELETE'])
def clear_all():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Delete child tables first to respect foreign keys
        cur.execute('DELETE FROM medical_records')
        cur.execute('DELETE FROM lab_results')
        cur.execute('DELETE FROM prescriptions')
        cur.execute('DELETE FROM patients')
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f'Error clearing data: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/import-csv', methods=['POST'])
def import_csv():
    """Import patients from a CSV file or a Synthea ZIP (extracts patients.csv)."""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        f = request.files['file']
        filename = f.filename or 'upload'
        data_stream = None

        # If zip, extract patients.csv
        if filename.lower().endswith('.zip'):
            with tempfile.TemporaryDirectory() as td:
                zpath = os.path.join(td, 'upload.zip')
                f.save(zpath)
                with zipfile.ZipFile(zpath, 'r') as z:
                    candidates = [n for n in z.namelist() if n.lower().endswith('patients.csv')]
                    if not candidates:
                        return jsonify({'success': False, 'error': 'patients.csv not found in ZIP'}), 400
                    with z.open(candidates[0]) as pf:
                        data_stream = io.TextIOWrapper(pf, encoding='utf-8')
                        inserted = _import_patients_csv(data_stream)
        else:
            # assume CSV
            data_stream = io.TextIOWrapper(f.stream, encoding='utf-8')
            inserted = _import_patients_csv(data_stream)

        return jsonify({'success': True, 'inserted': inserted})
    except Exception as e:
        logger.error(f'Error importing CSV: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


def _import_patients_csv(stream):
    """Parse patients CSV and insert into DB. Returns number inserted."""
    reader = csv.DictReader(stream)
    inserted = 0
    conn = get_db_connection()
    cur = conn.cursor()
    for row in reader:
        # Map common Synthea columns to our schema
        first = row.get('given') or row.get('first_name') or row.get('first') or ''
        last = row.get('family') or row.get('last_name') or row.get('last') or ''
        dob = row.get('birthdate') or row.get('dob') or ''
        gender = row.get('gender') or ''
        nhs = row.get('id') or row.get('mbi') or row.get('nhs_number') or ''
        # Avoid inserting empty names
        if not (first or last):
            continue
        cur.execute('INSERT INTO patients (first_name, last_name, dob, gender, nhs_number) VALUES (?, ?, ?, ?, ?)',
                    (first, last, dob, gender, nhs))
        inserted += 1
    conn.commit()
    conn.close()
    return inserted


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    logger.info(f'Starting Python MCP Service on port {port}')
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', False))
