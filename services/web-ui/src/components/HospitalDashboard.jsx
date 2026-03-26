import React, { useState, useEffect } from 'react';

export default function HospitalDashboard({ patients }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [patients]);

  const fetchStats = async () => {
    try {
      // Prefer backend stats; fall back to global window cache set by App.jsx
      const response = await fetch(`/api/hospital/stats`);
      const data = response.ok ? await response.json() : window.__HOSPITAL_STATS || null;
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(window.__HOSPITAL_STATS || null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  // If backend stats are missing or empty, derive lightweight stats from `patients` prop
  const derivedStats = {
    totalPatients: patients?.length || 0,
    recordsCount: stats?.recordsCount || 0,
    diabetesTypes: {}
  };
  if ((!stats || !stats.totalPatients) && patients && patients.length > 0) {
    patients.forEach(p => {
      const t = p.diabetesType || 'Unknown';
      derivedStats.diabetesTypes[t] = (derivedStats.diabetesTypes[t] || 0) + 1;
    });
  }

  return (
    <div className="hospital-dashboard">
      <h1>Hospital Diabetes Management Portal</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Patients</h3>
          <p className="stat-number">{(stats && stats.totalPatients) ? stats.totalPatients : derivedStats.totalPatients}</p>
        </div>
        
        <div className="stat-card">
          <h3>Medical Records</h3>
          <p className="stat-number">{stats?.recordsCount || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Diabetes Types</h3>
          <ul>
            {((stats && stats.diabetesTypes) ? Object.entries(stats.diabetesTypes) : Object.entries(derivedStats.diabetesTypes)).map(([type, count]) => (
              <li key={type}>{type}: {count}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="quick-actions">
        <a href="/api/patients/new" className="btn-primary">+ Add New Patient</a>
        <a href="/api/patients" className="btn-secondary">View All Patients</a>
      </div>

      <div className="recent-patients">
        <h2>Recent Patients</h2>
        {patients.slice(-5).reverse().map(patient => (
          <div key={patient.id} className="patient-card">
            <h3>{patient.name}</h3>
            <p>Type: {patient.diabetesType}</p>
            <p>Email: {patient.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
