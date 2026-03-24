import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PatientAPI from '../utils/api'

const STATUS_OPTIONS = ['all', 'Active', 'Inactive']
const PAGE_SIZE = 6

export default function PatientList() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [useAPI, setUseAPI] = useState(false)

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      setLoading(true)
      
      // Try to fetch live data from API; fall back to mock only on error
      try {
        const data = await PatientAPI.getAllPatients()
        const formattedPatients = data.map(p => ({
          id: p.id,
          // support snake_case and camelCase from different backends
          name: `${p.first_name || p.firstName || ''} ${p.last_name || p.lastName || ''}`.trim(),
          age: calculateAge(p.date_of_birth || p.dateOfBirth),
          status: p.status || p.status || 'Active',
          lastVisit: (p.updated_at || p.updatedAt || '').split('T')[0] || new Date().toISOString().split('T')[0],
          unit: p.diabetesType || p.diabetes_type || 'General',
          physician: 'Dr. Smith'
        }))
        setPatients(formattedPatients)
        setUseAPI(true)
      } catch (e) {
        // Fallback to mock data only if API fetch fails
        setPatients([
          { id: 1, name: 'John Doe', age: 45, status: 'Active', lastVisit: '2024-12-10', unit: 'Cardiology', physician: 'Dr. Reyes' },
          { id: 2, name: 'Jane Smith', age: 38, status: 'Active', lastVisit: '2024-12-08', unit: 'Primary Care', physician: 'Dr. Cho' },
          { id: 3, name: 'Bob Johnson', age: 52, status: 'Inactive', lastVisit: '2024-11-15', unit: 'Orthopedics', physician: 'Dr. Patel' },
          { id: 4, name: 'Lila Patel', age: 29, status: 'Active', lastVisit: '2024-12-09', unit: 'Telehealth', physician: 'Dr. Reyes' },
          { id: 5, name: 'Marcus Lee', age: 61, status: 'Active', lastVisit: '2024-12-07', unit: 'Neurology', physician: 'Dr. Cho' },
          { id: 6, name: 'Emily Brown', age: 54, status: 'Inactive', lastVisit: '2024-11-21', unit: 'Pulmonary', physician: 'Dr. Khan' },
        ])
        setUseAPI(false)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A'
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const filteredPatients = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase()
    return patients.filter((patient) => {
      const matchesStatus = statusFilter === 'all' || patient.status === statusFilter
      const matchesSearch =
        patient.name.toLowerCase().includes(lowerSearch) || 
        (patient.unit && patient.unit.toLowerCase().includes(lowerSearch))
      return matchesStatus && matchesSearch
    })
  }, [searchTerm, statusFilter, patients])

  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort((a, b) => {
      const factor = sortDir === 'asc' ? 1 : -1
      if (a[sortBy] < b[sortBy]) return -1 * factor
      if (a[sortBy] > b[sortBy]) return 1 * factor
      return 0
    })
  }, [filteredPatients, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedPatients.length / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const visiblePatients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return sortedPatients.slice(start, start + PAGE_SIZE)
  }, [page, sortedPatients])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((curr) => (curr === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  const paginate = (direction) => {
    setPage((current) => {
      if (direction === 'next') {
        return Math.min(current + 1, totalPages)
      }
      return Math.max(current - 1, 1)
    })
  }

  return (
    <div className="page-container page-patient-list">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1' }}>
            <h2>Patients</h2>
            <p>Your searchable, sortable roster.</p>
          </div>
          <div style={{
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: useAPI ? 'var(--success-light)' : 'var(--warning-light)',
            color: useAPI ? 'var(--success)' : 'var(--warning)'
          }}>
            {useAPI ? '🟢 Live API' : '⚠️ Mock Data'}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="filter-row">
        <input
          className="filter-input"
          type="search"
          placeholder="Search by name or unit"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value)
            setPage(1)
          }}
        />
        <Link to="/patients/new" className="btn btn-primary">
          ➕ Add Patient
        </Link>
      </div>

      <div className="status-pill-row">
        {STATUS_OPTIONS.map((option) => (
          <button
            type="button"
            key={option}
            className={`status-pill ${statusFilter === option ? 'status-pill--active' : ''}`}
            onClick={() => {
              setStatusFilter(option)
              setPage(1)
            }}
          >
            {option}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading patients...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">No Patients Found</div>
          <div className="empty-state-message">
            {searchTerm ? 'Try a different search term' : 'Start by adding your first patient'}
          </div>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="patient-grid">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')}>
                    Name
                    <span className={`sort-indicator ${sortBy === 'name' ? sortDir : ''}`}></span>
                  </th>
                  <th onClick={() => handleSort('age')}>
                    Age
                    <span className={`sort-indicator ${sortBy === 'age' ? sortDir : ''}`}></span>
                  </th>
                  <th onClick={() => handleSort('status')}>
                    Status
                    <span className={`sort-indicator ${sortBy === 'status' ? sortDir : ''}`}></span>
                  </th>
                  <th onClick={() => handleSort('unit')}>
                    Unit
                    <span className={`sort-indicator ${sortBy === 'unit' ? sortDir : ''}`}></span>
                  </th>
                  <th onClick={() => handleSort('lastVisit')}>
                    Last visit
                    <span className={`sort-indicator ${sortBy === 'lastVisit' ? sortDir : ''}`}></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiblePatients.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <Link to={`/patients/${patient.id}`} className="patient-link">
                        {patient.name}
                        <span className="patient-meta">{patient.physician}</span>
                      </Link>
                    </td>
                    <td>{patient.age}</td>
                    <td>
                      <span className={`status-pill ${
                        patient.status === 'Active' ? 'status-pill--success' : 'status-pill--inactive'
                      }`}
                      >
                        {patient.status}
                      </span>
                    </td>
                    <td>{patient.unit}</td>
                    <td>{patient.lastVisit}</td>
                  </tr>
                ))}
                {visiblePatients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      No patients match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            <div className="pagination-info">
              Showing {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, sortedPatients.length)} of {sortedPatients.length}
            </div>
            <div className="pagination-buttons">
              <button
                className="btn btn-secondary btn-small"
                onClick={() => paginate('prev')}
                disabled={page === 1}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary btn-small"
                onClick={() => paginate('next')}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
