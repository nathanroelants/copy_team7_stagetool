import { ref } from 'vue'

/**
 * Shared composable for signing a stagevoorstel.
 * @param {string} rol - 'student' | 'docent' | 'stagementor'
 */
export default function UseOndertekening(rol) {
  const loading = ref(false)
  const fout = ref('')
  const succes = ref(false)

  // Endpoint map per role
  const endpointMap = {
    student: (stageId) => `/api/stagevoorstellen/${stageId}/ondertekenen/student`,
    docent: (stageId) => `/api/stagevoorstellen/${stageId}/ondertekenen/docent`,
    stagementor: (stageId) => `/api/stagevoorstellen/${stageId}/ondertekenen/stagementor`,
  }

  async function onderteken(stageId) {
    if (!endpointMap[rol]) {
      fout.value = 'Onbekende rol voor ondertekening.'
      return false
    }

    loading.value = true
    fout.value = ''
    succes.value = false

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(endpointMap[rol](stageId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Ondertekening mislukt.')
      }

      succes.value = true
      return true
    } catch (err) {
      fout.value = err.message || 'Er liep iets fout tijdens het ondertekenen.'
      console.error('Onderteken fout:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  return { loading, fout, succes, onderteken }
}