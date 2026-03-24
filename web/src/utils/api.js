const API_BASE_URL = import.meta.env.VITE_API_URL || ''

class PatientAPI {
  // Check API health
  static async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`)
      return response.ok
    } catch (error) {
      return false
    }
  }

  // Get all patients
  static async getAllPatients() {
    const response = await fetch(`${API_BASE_URL}/api/patients`)
    if (!response.ok) throw new Error('Failed to fetch patients')
    return response.json()
  }

  // Get paginated patients
  static async getPaginatedPatients(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({ page, limit, search })
    const response = await fetch(`${API_BASE_URL}/api/patients/paginated?${params}`)
    if (!response.ok) throw new Error('Failed to fetch patients')
    return response.json()
  }

  // Get single patient with full medical records
  static async getPatient(id) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${id}`)
    if (!response.ok) throw new Error('Failed to fetch patient')
    return response.json()
  }

  // Get patient medical records
  static async getPatientRecords(id) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${id}/records`)
    if (!response.ok) throw new Error('Failed to fetch patient records')
    return response.json()
  }

  // Get patient prescriptions
  static async getPatientPrescriptions(id) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${id}/prescriptions`)
    if (!response.ok) throw new Error('Failed to fetch prescriptions')
    return response.json()
  }

  // Get patient labs
  static async getPatientLabs(id) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${id}/labs`)
    if (!response.ok) throw new Error('Failed to fetch lab results')
    return response.json()
  }

  // Create new patient
  static async createPatient(patientData) {
    const response = await fetch(`${API_BASE_URL}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData)
    })
    if (!response.ok) throw new Error('Failed to create patient')
    return response.json()
  }

  // Update patient
  static async updatePatient(id, patientData) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData)
    })
    if (!response.ok) throw new Error('Failed to update patient')
    return response.json()
  }

  // Delete patient
  static async deletePatient(id) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete patient')
    return response.json()
  }

  // Get patient's glucose records
  static async getGlucoseRecords(patientId) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/glucose`)
    if (!response.ok) throw new Error('Failed to fetch glucose records')
    return response.json()
  }

  // Add glucose record
  static async addGlucoseRecord(patientId, data) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/glucose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to add glucose record')
    return response.json()
  }

  // Get patient's lab results
  static async getLabResults(patientId) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/labs`)
    if (!response.ok) throw new Error('Failed to fetch lab results')
    return response.json()
  }

  // Get patient's medications
  static async getMedications(patientId) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/medications`)
    if (!response.ok) throw new Error('Failed to fetch medications')
    return response.json()
  }

  // Get patient's diagnoses
  static async getDiagnoses(patientId) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/diagnoses`)
    if (!response.ok) throw new Error('Failed to fetch diagnoses')
    return response.json()
  }

  // Get patient's allergies
  static async getAllergies(patientId) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/allergies`)
    if (!response.ok) throw new Error('Failed to fetch allergies')
    return response.json()
  }

  // Get statistics
  static async getStats() {
    const response = await fetch(`${API_BASE_URL}/api/stats`)
    if (!response.ok) throw new Error('Failed to fetch stats')
    return response.json()
  }

  // Check server health (use /api/health)
  static async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      })
      return response.ok
    } catch {
      return false
    }
  }
}

export default PatientAPI
