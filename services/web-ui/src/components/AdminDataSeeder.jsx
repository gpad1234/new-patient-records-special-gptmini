import React, { useState, useEffect } from 'react';

export default function AdminDataSeeder() {
  const [seedCount, setSeedCount] = useState(10);
  const [status, setStatus] = useState({ total: 0 });
  const [loading, setLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/admin/seed-status`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleSeed = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: parseInt(seedCount) }),
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✓ Successfully seeded ${data.patientsInserted} synthetic patients`);
        setTimeout(() => {
          window.location.href = '/patients';
        }, 1500);
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
      checkStatus();
    }
  };

  const handleClear = async () => {
    if (!window.confirm('⚠️ This will delete ALL patient data. Continue?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/clear-all`, { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✓ All data cleared');
        setTimeout(() => checkStatus(), 500);
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!file) return setMessage('Please select a CSV or ZIP file to import');
    setLoading(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const response = await fetch(`/api/admin/import-csv`, {
        method: 'POST',
        body: fd,
      });
      const data = await response.json();
      if (data.success) {
        setMessage(`✓ Imported ${data.inserted} patients`);
        setTimeout(() => { window.location.href = '/patients'; }, 1200);
      } else {
        setMessage('Error: ' + (data.error || 'Import failed'));
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
      checkStatus();
    }
  };

  return (
    <div className="admin-seeder">
      <h1>🔬 Test Data Manager</h1>
      
      <div className="status-card">
        <h3>Current Status</h3>
        <p className="stat-big">{status.total} Patients</p>
        <p className="stat-small">
          {status.total === 0 
            ? '⚠️ No patient data. Use the seeder to load test data.' 
            : '✓ Database populated with synthetic patient data'}
        </p>
      </div>

      <div className="seeder-card">
        <h2>Generate Synthetic Patients</h2>
        <p className="description">
          Creates realistic patient records with medical history (glucose, labs, medications, diagnoses, allergies).
          Data is 100% synthetic and suitable for testing.
        </p>

        <div className="form-group">
          <label>Number of Patients:</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={seedCount}
            onChange={(e) => setSeedCount(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="button-group">
          <button 
            onClick={handleSeed} 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Seeding...' : '🌱 Generate Test Data'}
          </button>
          {status.total > 0 && (
            <button 
              onClick={handleClear} 
              disabled={loading}
              className="btn-danger"
            >
              {loading ? 'Clearing...' : '🗑️ Clear All Data'}
            </button>
          )}
        </div>

        <div className="import-card">
          <h3>Import Synthea / CSV</h3>
          <p>Upload a Synthea ZIP or a Patients CSV to bulk import patient demographics.</p>
          <input type="file" accept=".csv,.zip" onChange={handleFileChange} disabled={loading} />
          <div style={{marginTop: '8px'}}>
            <button onClick={handleImport} disabled={loading || !file} className="btn-secondary">
              {loading ? 'Importing...' : 'Import CSV/ZIP'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`message ${message.includes('✓') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="info-card">
        <h3>📊 What Gets Created</h3>
        <ul>
          <li><strong>Patients:</strong> Complete demographics (name, MRN, DOB, email, address)</li>
          <li><strong>Glucose Records:</strong> 20 readings (Fasting, Random, Postprandial, Bedtime)</li>
          <li><strong>Lab Results:</strong> 10 tests (HbA1c, Creatinine, Cholesterol, etc.)</li>
          <li><strong>Medications:</strong> 5 active prescriptions with dosage/frequency</li>
          <li><strong>Diagnoses:</strong> Primary/secondary with ICD-10 codes</li>
          <li><strong>Allergies:</strong> Known allergies with severity levels</li>
        </ul>
      </div>

      <div className="info-card data-sources">
        <h3>📚 Data Sources Supported</h3>
        <p>This system can import data from:</p>
        <ul>
          <li>✅ Synthea - Synthetic patient data generator</li>
          <li>✅ CSV files (Synthea format)</li>
          <li>✅ FHIR JSON resources</li>
          <li>✅ Custom healthcare datasets</li>
        </ul>
        <p className="note">To load external data, prepare CSV files and upload them to: <code>/services/node-api/data/</code></p>
      </div>
    </div>
  );
}
