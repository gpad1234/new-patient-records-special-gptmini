import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function PatientList({ loading, onRefresh }) {
  const [patients, setPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchPatients(currentPage);
  }, []);

  const fetchPatients = async (page) => {
    setIsLoading(true);
    try {
      // Try paginated endpoint first (new API). If missing, fall back to simple list and normalize.
      let response = await fetch(`/api/patients/paginated?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (!response.ok) {
        response = await fetch(`/api/patients`);
        const list = await response.json();
        const normalized = (list || []).map(normalizePatient);
        setPatients(normalized);
        setPagination({ total: normalized.length, totalPages: 1, hasPrevPage: false, hasNextPage: false });
      } else {
        const result = await response.json();
        setPatients((result.data || []).map(normalizePatient));
        setPagination(result.pagination || {});
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Normalize backend patient object to frontend expected shape
  const normalizePatient = (p) => ({
    id: p.id,
    firstName: p.first_name || p.firstName || '',
    lastName: p.last_name || p.lastName || '',
    mrn: p.nhs_number || p.mrn || '',
    email: p.email || '',
    diabetesType: p.diabetes_type || p.diabetesType || '',
    glucoseRecords: p.glucose_records || p.glucoseRecords || 0,
    labResults: p.lab_results || p.labResults || 0,
    medications: p.medications || 0,
  });

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchPatients(newPage);
    window.scrollTo(0, 0);
  };

  const handleRefresh = () => {
    fetchPatients(1);
    setCurrentPage(1);
    onRefresh();
  };

  return (
    <div className="patient-list">
      <div className="header">
        <h1>Patients</h1>
        <button onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {isLoading ? (
        <p>Loading patients...</p>
      ) : patients.length === 0 ? (
        <p>No patients found</p>
      ) : (
        <>
          {/* Table view for desktop */}
          <table className="patients-table">
            <thead>
              <tr>
                <th>MRN</th>
                <th>Name</th>
                <th>Email</th>
                <th>Diabetes Type</th>
                <th>Records</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(patient => (
                <tr key={patient.id}>
                  <td><strong>{patient.mrn}</strong></td>
                  <td>{patient.firstName} {patient.lastName}</td>
                  <td>{patient.email}</td>
                  <td>{patient.diabetesType}</td>
                  <td className="record-count">
                    <span className="badge">{(patient.glucoseRecords || 0) + (patient.labResults || 0) + (patient.medications || 0)} records</span>
                  </td>
                  <td>
                    <Link to={`/patients/${patient.id}/records`} className="btn-link">View Records</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Card view for mobile/tablet */}
          <div className="patients-cards-container">
            {patients.map(patient => (
              <div key={patient.id} className="patients-card">
                <h3>{patient.firstName} {patient.lastName}</h3>
                <div className="patients-card-row">
                  <span className="patients-card-label">MRN:</span>
                  <span className="patients-card-value">{patient.mrn}</span>
                </div>
                <div className="patients-card-row">
                  <span className="patients-card-label">Email:</span>
                  <span className="patients-card-value">{patient.email}</span>
                </div>
                <div className="patients-card-row">
                  <span className="patients-card-label">Diabetes Type:</span>
                  <span className="patients-card-value">{patient.diabetesType}</span>
                </div>
                <span className="badge">{(patient.glucoseRecords || 0) + (patient.labResults || 0) + (patient.medications || 0)} records</span>
                <Link to={`/patients/${patient.id}/records`} className="btn-link">View Records</Link>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange(1)} 
                disabled={!pagination.hasPrevPage}
                className="pagination-btn"
              >
                First
              </button>
              <button 
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={!pagination.hasPrevPage}
                className="pagination-btn"
              >
                Previous
              </button>

              <div className="pagination-info">
                Page <strong>{currentPage}</strong> of <strong>{pagination.totalPages}</strong>
                {pagination.total > 0 && (
                  <span className="total-info">({pagination.total} total patients)</span>
                )}
              </div>

              <button 
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={!pagination.hasNextPage}
                className="pagination-btn"
              >
                Next
              </button>
              <button 
                onClick={() => handlePageChange(pagination.totalPages)} 
                disabled={!pagination.hasNextPage}
                className="pagination-btn"
              >
                Last
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
