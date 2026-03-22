import { useState, useEffect } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export default function DataLoader() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [serverStatus, setServerStatus] = useState('checking')
  const [loadingCount, setLoadingCount] = useState(10)
  const [recentActions, setRecentActions] = useState([])

  useEffect(() => {
    checkServerStatus()
    fetchStats()
  }, [])

  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      })
      setServerStatus(response.ok ? 'online' : 'offline')
    } catch {
      setServerStatus('offline')
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const handleGenerateData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/data-loader/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: loadingCount })
      })

      if (!response.ok) throw new Error('Failed to generate data')

      const result = await response.json()
      
      addAction({
        type: 'success',
        action: 'Generated Data',
        message: `Successfully created ${result.patientsCreated} patients with complete medical records`
      })

      await fetchStats()
    } catch (err) {
      setError(err.message)
      addAction({
        type: 'error',
        action: 'Generate Failed',
        message: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear ALL patient data? This cannot be undone.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/data-loader/clear`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to clear data')

      const result = await response.json()
      
      addAction({
        type: 'warning',
        action: 'Data Cleared',
        message: `Removed ${result.deletedCount} records from database`
      })

      await fetchStats()
    } catch (err) {
      setError(err.message)
      addAction({
        type: 'error',
        action: 'Clear Failed',
        message: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSampleData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/data-loader/sample`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to load sample data')

      const result = await response.json()
      
      addAction({
        type: 'success',
        action: 'Sample Data Loaded',
        message: `Loaded ${result.count} sample patients`
      })

      await fetchStats()
    } catch (err) {
      setError(err.message)
      addAction({
        type: 'error',
        action: 'Load Failed',
        message: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const addAction = (action) => {
    const newAction = {
      ...action,
      timestamp: new Date().toLocaleTimeString()
    }
    setRecentActions(prev => [newAction, ...prev.slice(0, 9)])
  }

  const getStatusColor = () => {
    switch (serverStatus) {
      case 'online': return 'var(--success)'
      case 'offline': return 'var(--danger)'
      default: return 'var(--neutral)'
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Data Loader</h2>
        <p>Manage synthetic patient data and database operations</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Server Status Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h3 style={{ fontSize: '16px', margin: 0 }}>Server Status</h3>
        </div>
        <div className="card-content">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '16px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            borderLeft: `4px solid ${getStatusColor()}`
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
              animation: serverStatus === 'online' ? 'pulse 2s infinite' : 'none'
            }}></div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>
                Node API Server
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Status: <span style={{ color: getStatusColor(), fontWeight: '600' }}>
                  {serverStatus.toUpperCase()}
                </span> • Port: 3001
              </div>
            </div>
            {serverStatus === 'offline' && (
              <button 
                className="btn btn-secondary btn-small"
                onClick={checkServerStatus}
                style={{ marginLeft: 'auto' }}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Database Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '20px' }}>
          <div className="stat-card">
            <div className="stat-card__value">{stats.totalPatients || 0}</div>
            <div className="stat-card__label">Total Patients</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{stats.totalRecords || 0}</div>
            <div className="stat-card__label">Medical Records</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{stats.totalProviders || 0}</div>
            <div className="stat-card__label">Providers</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{stats.totalVisits || 0}</div>
            <div className="stat-card__label">Total Visits</div>
          </div>
        </div>
      )}

      {/* Data Generation Controls */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h3 style={{ fontSize: '16px', margin: 0 }}>Generate Synthetic Data</h3>
        </div>
        <div className="card-content">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Generate realistic synthetic patient data with complete medical records including glucose readings, 
            lab results, medications, diagnoses, and allergies.
          </p>
          
          <div className="form-group">
            <label>Number of Patients</label>
            <input
              type="number"
              min="1"
              max="100"
              value={loadingCount}
              onChange={(e) => setLoadingCount(parseInt(e.target.value) || 10)}
              disabled={loading || serverStatus !== 'online'}
            />
          </div>
        </div>
        <div className="card-footer">
          <button
            className="btn btn-primary"
            onClick={handleGenerateData}
            disabled={loading || serverStatus !== 'online'}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Generating...
              </>
            ) : (
              <>➕ Generate Data</>
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleLoadSampleData}
            disabled={loading || serverStatus !== 'online'}
          >
            📦 Load Sample Data
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h3 style={{ fontSize: '16px', margin: 0 }}>Data Management</h3>
        </div>
        <div className="card-content">
          <div style={{ 
            padding: '16px', 
            backgroundColor: 'var(--danger-light)', 
            borderRadius: '12px',
            borderLeft: '4px solid var(--danger)',
            marginBottom: '16px'
          }}>
            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', color: 'var(--danger)' }}>
              ⚠️ Danger Zone
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              These actions are permanent and cannot be undone.
            </p>
          </div>
          
          <button
            className="btn btn-danger btn-block"
            onClick={handleClearData}
            disabled={loading || serverStatus !== 'online'}
          >
            🗑️ Clear All Data
          </button>
        </div>
      </div>

      {/* Recent Actions Log */}
      {recentActions.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '16px', margin: 0 }}>Recent Actions</h3>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gap: '8px' }}>
              {recentActions.map((action, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderLeft: `4px solid ${
                      action.type === 'success' ? 'var(--success)' :
                      action.type === 'error' ? 'var(--danger)' :
                      'var(--warning)'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>
                      {action.action}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {action.timestamp}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    {action.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      {serverStatus === 'offline' && (
        <div className="card">
          <div className="card-content">
            <div className="empty-state">
              <div className="empty-state-icon">⚠️</div>
              <div className="empty-state-title">Server Offline</div>
              <div className="empty-state-message">
                The Node API server is not running. Start it with:
              </div>
              <div style={{ 
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#1a1a1a',
                color: '#00ff00',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '13px'
              }}>
                cd services/node-api && npm start
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
