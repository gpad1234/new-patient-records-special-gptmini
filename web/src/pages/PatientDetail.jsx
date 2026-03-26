import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import PatientAPI from '../utils/api'

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [records, setRecords] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [labs, setLabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPatient()
  }, [id])

  const fetchPatient = async () => {
    try {
      setLoading(true)
      
      // Fetch patient data from API
      const patientData = await PatientAPI.getPatient(id)
      const recordsData = await PatientAPI.getPatientRecords(id)
      const prescriptionsData = await PatientAPI.getPatientPrescriptions(id)
      const labsData = await PatientAPI.getPatientLabs(id)
      
      setPatient({
        id: patientData.id,
        name: `${patientData.first_name} ${patientData.last_name}`,
        dateOfBirth: patientData.date_of_birth,
        email: patientData.email,
        phone: patientData.phone,
        address: patientData.address,
        gender: patientData.gender
      })
      
      setRecords(recordsData)
      setPrescriptions(prescriptionsData)
      setLabs(labsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this patient record?')) {
      try {
        // TODO: Replace with actual API call
        // await fetch(`/api/patients/${id}`, { method: 'DELETE' })
        navigate('/patients')
      } catch (err) {
        setError(err.message)
      }
    }
  }

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '12px', color: '#999' }}>Loading patient...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
        <Link to="/patients" className="btn btn-secondary">
          Back to Patients
        </Link>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="page-container">
        <div className="alert alert-error">Patient not found</div>
        <Link to="/patients" className="btn btn-secondary">
          Back to Patients
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '20px' }}>
        <Link to="/patients" style={{ color: '#2c3e50', textDecoration: 'none', fontSize: '14px' }}>
          ← Back to Patients
        </Link>
      </div>

      <div className="page-header">
        <h2>{patient.name}</h2>
        <p>Patient ID: {patient.id}</p>
      </div>

      {/* Contact Information */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: '0' }}>Contact Information</h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Email
              </div>
              <div style={{ fontSize: '14px' }}>{patient.email}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Phone
              </div>
              <div style={{ fontSize: '14px' }}>{patient.phone}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Address
              </div>
              <div style={{ fontSize: '14px' }}>{patient.address}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: '0' }}>Medical Information</h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Date of Birth
              </div>
              <div style={{ fontSize: '14px' }}>
                {new Date(patient.dateOfBirth).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Gender
              </div>
              <div style={{ fontSize: '14px' }}>{patient.gender}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Records */}
      {records.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: '0' }}>Medical Records</h3>
          </div>
          <div className="card-content">
            {records.map((record, index) => (
              <div key={record.id} style={{ 
                borderBottom: index < records.length - 1 ? '1px solid #eee' : 'none',
                paddingBottom: index < records.length - 1 ? '12px' : '0',
                marginBottom: index < records.length - 1 ? '12px' : '0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>{record.diagnosis}</strong>
                  <span style={{ fontSize: '12px', color: '#999' }}>{record.visit_date}</span>
                </div>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  <strong>Treatment:</strong> {record.treatment}
                </div>
                {record.notes && (
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    <strong>Notes:</strong> {record.notes}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  Dr. {record.doctor_name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prescriptions */}
      {prescriptions.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: '0' }}>Current Prescriptions</h3>
          </div>
          <div className="card-content">
            {prescriptions.map((rx, index) => (
              <div key={rx.id} style={{ 
                borderBottom: index < prescriptions.length - 1 ? '1px solid #eee' : 'none',
                paddingBottom: index < prescriptions.length - 1 ? '12px' : '0',
                marginBottom: index < prescriptions.length - 1 ? '12px' : '0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <strong style={{ fontSize: '14px' }}>{rx.medication_name}</strong>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {rx.dosage} - {rx.frequency}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      Started: {rx.start_date}
                      {rx.end_date && ` | Ended: ${rx.end_date}`}
                    </div>
                  </div>
                  {!rx.end_date && (
                    <span style={{ 
                      padding: '2px 8px', 
                      backgroundColor: '#e8f5e9', 
                      color: '#2e7d32',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lab Results */}
      {labs.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: '0' }}>Lab Results</h3>
          </div>
          <div className="card-content">
            {labs.map((lab, index) => (
              <div key={lab.id} style={{ 
                borderBottom: index < labs.length - 1 ? '1px solid #eee' : 'none',
                paddingBottom: index < labs.length - 1 ? '12px' : '0',
                marginBottom: index < labs.length - 1 ? '12px' : '0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <strong style={{ fontSize: '14px' }}>{lab.test_name}</strong>
                    <div style={{ fontSize: '14px', marginTop: '4px' }}>
                      <span style={{ color: '#666' }}>Result: </span>
                      <strong>{lab.result_value}</strong>
                      {lab.unit && ` ${lab.unit}`}
                    </div>
                    {lab.reference_range && (
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        Reference: {lab.reference_range}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      {lab.test_date}
                    </div>
                  </div>
                  <span style={{ 
                    padding: '2px 8px', 
                    backgroundColor: lab.status === 'Normal' ? '#e8f5e9' : '#ffebee',
                    color: lab.status === 'Normal' ? '#2e7d32' : '#c62828',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {lab.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medical Information */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: '0' }}>Notes</h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                No additional notes available.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card">
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <button className="btn btn-secondary btn-block">
              ✏️ Edit
            </button>
            <button className="btn btn-danger btn-block" onClick={handleDelete}>
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
