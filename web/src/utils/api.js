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
    if (!response.ok) {
      let body = ''
      try { body = await response.text() } catch (e) { /* ignore */ }
      throw new Error(`Failed to fetch patients: ${response.status} ${response.statusText} - ${body}`)
    }
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
    const response = await fetch(`${API_BASE_URL}/api/patients/${id}/medications`)
    if (!response.ok) throw new Error('Failed to fetch prescriptions')
    return response.json()
  }

  // Get patient labs
  static async getPatientLabs(id) {
    const response = await fetch(`${API_BASE_URL}/api/patients/${id}/labs`)
    if (!response.ok) throw new Error('Failed to fetch labs')
    return response.json()
  }
}

export default PatientAPI;
