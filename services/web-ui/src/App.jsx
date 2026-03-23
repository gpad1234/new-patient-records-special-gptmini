import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import PatientList from './components/PatientList';
import PatientForm from './components/PatientForm';
import DiabetesRecords from './components/DiabetesRecords';
import MedicalRecords from './components/MedicalRecords';
import AdminDataSeeder from './components/AdminDataSeeder';
import HospitalDashboard from './components/HospitalDashboard';
import AIResearch from './components/AIResearch';
import AIPredictions from './components/AIPredictions';
import config from './config';
import Navigation from './components/Navigation';

function App() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch lightweight stats and recent patients for dashboard to avoid loading full dataset
    fetchStatsAndRecent();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/patients`);
      const data = await response.json();
      // normalize backend fields (snake_case) to frontend shape
      const normalized = (data || []).map(p => ({
        id: p.id,
        firstName: p.first_name || p.firstName || '',
        lastName: p.last_name || p.lastName || '',
        name: (p.first_name || p.firstName || '') + ' ' + (p.last_name || p.lastName || ''),
        email: p.email || '',
        diabetesType: p.diabetes_type || p.diabetesType || '',
        mrn: p.nhs_number || p.mrn || '',
      }));
      setPatients(normalized);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
    setLoading(false);
  };

  const fetchStatsAndRecent = async () => {
    setLoading(true);
    try {
      // get dashboard stats
      const sRes = await fetch('/api/hospital/stats');
      const statsData = sRes.ok ? await sRes.json() : null;

      // get recent patients
      const rRes = await fetch('/api/patients/recent?limit=5');
      const recent = rRes.ok ? await rRes.json() : [];

      // normalize patients for dashboard
      const normalized = (recent || []).map(p => ({
        id: p.id,
        firstName: p.first_name || p.firstName || '',
        lastName: p.last_name || p.lastName || '',
        name: (p.first_name || p.firstName || '') + ' ' + (p.last_name || p.lastName || ''),
        email: p.email || '',
        diabetesType: p.diabetes_type || p.diabetesType || '',
        mrn: p.nhs_number || p.mrn || '',
      }));

      setPatients(normalized);
      // we keep stats in state via a lightweight approach: pass through to dashboard via window object
      // instead update HospitalDashboard to call /api/hospital/stats itself; we set global for now
      window.__HOSPITAL_STATS = statsData;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  const addPatient = async (patientData) => {
    try {
      const response = await fetch(`/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });
      const newPatient = await response.json();
      const p = {
        id: newPatient.id,
        firstName: newPatient.first_name || newPatient.firstName || '',
        lastName: newPatient.last_name || newPatient.lastName || '',
        name: (newPatient.first_name || newPatient.firstName || '') + ' ' + (newPatient.last_name || newPatient.lastName || ''),
        email: newPatient.email || '',
        diabetesType: newPatient.diabetes_type || newPatient.diabetesType || '',
        mrn: newPatient.nhs_number || newPatient.mrn || '',
      };
      setPatients([...patients, p]);
      return newPatient;
    } catch (error) {
      console.error('Error adding patient:', error);
      throw error;
    }
  };

  return (
    <Router>
      <Navigation />
      <div className="container">
        <Routes>
          <Route path="/" element={<HospitalDashboard patients={patients} />} />
          <Route path="/patients" element={<PatientList loading={loading} onRefresh={fetchPatients} />} />
          <Route path="/patients/new" element={<PatientForm onSubmit={addPatient} />} />
          <Route path="/patients/:id/diabetes" element={<DiabetesRecords />} />
          <Route path="/patients/:id/records" element={<MedicalRecords />} />
          <Route path="/admin/seed" element={<AdminDataSeeder />} />
          {config.SHOW_RESEARCH && (
            <>
              <Route path="/research/ai" element={<AIResearch />} />
              <Route path="/predictions/ai" element={<AIPredictions />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
