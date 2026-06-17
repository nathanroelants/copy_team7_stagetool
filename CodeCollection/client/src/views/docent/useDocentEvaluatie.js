import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export function useDocentEvaluatie(studentId) {
  const router = useRouter()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const gebruikerNaam = `${user.voornaam || ''} ${user.achternaam || ''}`.trim() || user.email || 'Docent'

  const actieveTab = ref('tussentijds')
  const eindevaluatieOpen = ref(false)
  const competenties = ref([])
  const evaluaties = ref([])
  const loading = ref(true)
  const fout = ref('')
  const bezig = ref(false)

  const scoreOpties = [
    { waarde: 5, label: 'Uitstekend', beschrijving: 'Volledig zelfstandig, geen bijsturing nodig.' },
    { waarde: 3, label: 'Voldoende', beschrijving: 'Met regelmatige begeleiding.' },
    { waarde: 0, label: 'Niet aanwezig', beschrijving: 'Weinig of geen toepassing aanwezig.' },
  ]

  function getRubriek(score) {
    return scoreOpties.find(o => o.waarde === Number(score)) || null
  }

  function getStudentEvaluatie(competentieId) {
    return evaluaties.value.find(
      e => e.competentie_id === competentieId &&
           e.rol === 'student' &&
           e.type === actieveTab.value
    )
  }

  function getMentorEvaluatie(competentieId) {
    return evaluaties.value.find(
      e => e.competentie_id === competentieId &&
           e.rol === 'stagementor' &&
           e.type === actieveTab.value
    )
  }

  async function laadData() {
    loading.value = true
    fout.value = ''
    try {
      const token = localStorage.getItem('token')
      const [compRes, evalRes] = await Promise.all([
        fetch('/api/docent/competenties', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/docent/evaluaties/${studentId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const compData = await compRes.json()
      const evalData = await evalRes.json()
      if (!compRes.ok) throw new Error(compData.error || 'Fout bij laden competenties')
      if (!evalRes.ok) throw new Error(evalData.error || 'Fout bij laden evaluaties')
      competenties.value = compData
      evaluaties.value = evalData.evaluaties || []
      eindevaluatieOpen.value = evalData.eindevaluatie_open || false
    } catch (err) {
      fout.value = err.message || 'Kon data niet laden.'
    } finally {
      loading.value = false
    }
  }

  async function toggleEindevaluatie() {
    bezig.value = true
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/docent/eindevaluatie/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eindevaluatie_open: !eindevaluatieOpen.value }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fout bij bijwerken')
      eindevaluatieOpen.value = data.eindevaluatie_open
    } catch (err) {
      alert(err.message || 'Kon eindevaluatie niet bijwerken.')
    } finally {
      bezig.value = false
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  onMounted(laadData)

  return {
    gebruikerNaam,
    actieveTab,
    eindevaluatieOpen,
    competenties,
    evaluaties,
    loading,
    fout,
    bezig,
    scoreOpties,
    getRubriek,
    getStudentEvaluatie,
    getMentorEvaluatie,
    toggleEindevaluatie,
    handleLogout,
  }
}
