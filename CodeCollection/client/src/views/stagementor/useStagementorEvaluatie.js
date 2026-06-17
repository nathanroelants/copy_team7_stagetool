import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export function useMentorEvaluatie() {
  const router = useRouter()
  const route = useRouter().currentRoute.value
  const studentId = route.params.studentId
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const gebruikerNaam = `${user.voornaam || ''} ${user.achternaam || ''}`.trim() || user.email || 'Mentor'

  // Student informatie
  const student = ref({})
  const studentNaam = ref('')

  // Huidige fase vanuit de backend
  const evaluatieStatus = ref('geen') // 'geen' | 'tussentijds' | 'tussentijdse_afgelopen' | 'eindevaluatie' | 'stage_afgelopen'

  // Actieve tab: begin op tussentijds, tenzij dat niet zichtbaar is
  const actieveTab = ref('tussentijds')

  // Afgeleid: wat is zichtbaar en wat is bewerkbaar?
  const tussentijdsZichtbaar = computed(() =>
    ['tussentijds', 'tussentijdse_afgelopen', 'eindevaluatie', 'stage_afgelopen'].includes(evaluatieStatus.value)
  )
  const eindevaluatieZichtbaar = computed(() =>
    ['eindevaluatie', 'stage_afgelopen'].includes(evaluatieStatus.value)
  )
  const tussentijdsBewerkbaar = computed(() =>
    evaluatieStatus.value === 'tussentijds'
  )
  const eindevaluatieBewerkbaar = computed(() =>
    evaluatieStatus.value === 'eindevaluatie'
  )

  // Huidige tab is bewerkbaar?
  const huidigeBewerkbaar = computed(() =>
    actieveTab.value === 'tussentijds' ? tussentijdsBewerkbaar.value : eindevaluatieBewerkbaar.value
  )

  const openCompetentie = ref(null)
  const competenties = ref([])
  const evaluaties = ref([])
  const loading = ref(true)
  const fout = ref('')
  const bezig = ref({})
  const opgeslagen = ref({})
  const foutMelding = ref({})

  const scoreOpties = [
    { waarde: 5, label: 'Uitstekend', beschrijving: 'Volledig zelfstandig, geen bijsturing nodig.' },
    { waarde: 3, label: 'Voldoende', beschrijving: 'Met regelmatige begeleiding.' },
    { waarde: 0, label: 'Niet aanwezig', beschrijving: 'Weinig of geen toepassing aanwezig.' },
  ]

  function toggleCompetentie(id) {
    openCompetentie.value = openCompetentie.value === id ? null : id
  }

  function getEvaluatie(competentieId) {
    return evaluaties.value.find(
      e => e.competentie_id === competentieId &&
           e.beoordelaar_id === user.id &&
           e.type === actieveTab.value
    )
  }

  function getStudentEvaluatie(competentieId) {
    return evaluaties.value.find(
      e => e.competentie_id === competentieId &&
           e.beoordelaar_id !== user.id &&
           e.type === actieveTab.value
    )
  }

  function getMentorEvaluatie(competentieId) {
    return evaluaties.value.find(
      e => e.competentie_id === competentieId &&
           e.beoordelaar_id === user.id &&
           e.type === actieveTab.value
    )
  }

  async function laadStudentGegevens() {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/mentor/${studentId}/student`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fout bij laden studentgegevens')
      student.value = data
      studentNaam.value = `${data.voornaam || ''} ${data.achternaam || ''}`.trim() || data.email || 'Student'
    } catch (err) {
      fout.value = err.message || 'Kon studentgegevens niet laden.'
    }
  }

  async function laadData() {
    loading.value = true
    fout.value = ''
    try {
      const token = localStorage.getItem('token')

      // Haal studentgegevens op
      await laadStudentGegevens()

      // Haal competenties en evaluaties op
      const [compRes, evalRes] = await Promise.all([
        fetch(`/api/mentor/${studentId}/competenties`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/mentor/${studentId}/evaluaties`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const compData = await compRes.json()
      const evalData = await evalRes.json()

      if (!compRes.ok) throw new Error(compData.error || 'Fout bij laden competenties')
      if (!evalRes.ok) throw new Error(evalData.error || 'Fout bij laden evaluaties')

      competenties.value = compData
      evaluatieStatus.value = evalData.evaluatie_status || 'geen'
      evaluaties.value = evalData.evaluaties || []

      // Zet actieve tab op een zichtbare tab
      if (!tussentijdsZichtbaar.value && eindevaluatieZichtbaar.value) {
        actieveTab.value = 'eindevaluatie'
      } else {
        actieveTab.value = 'tussentijds'
      }

      for (const e of evaluaties.value) {
        if (e.beoordelaar_id === user.id) {
          opgeslagen.value[`${e.competentie_id}_${e.type}`] = true
        }
      }
    } catch (err) {
      fout.value = err.message || 'Kon data niet laden.'
    } finally {
      loading.value = false
    }
  }

  async function slaOp(competentieId) {
    if (!huidigeBewerkbaar.value) return
    const evaluatie = getMentorEvaluatie(competentieId)
    if (!evaluatie || !evaluatie.feedback?.trim()) {
      foutMelding.value[competentieId] = 'Invullen feedback is verplicht!'
      return
    }
    foutMelding.value[competentieId] = ''
    bezig.value[competentieId] = true
    opgeslagen.value[competentieId] = false

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/mentor/${studentId}/evaluaties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          competentie_id: competentieId,
          type: actieveTab.value,
          score: evaluatie.score,
          feedback: evaluatie.feedback,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fout bij opslaan')
      opgeslagen.value[`${competentieId}_${actieveTab.value}`] = true
    } catch (err) {
      alert(err.message || 'Kon niet opslaan.')
    } finally {
      bezig.value[competentieId] = false
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
    studentNaam,
    actieveTab,
    evaluatieStatus,
    tussentijdsZichtbaar,
    eindevaluatieZichtbaar,
    tussentijdsBewerkbaar,
    eindevaluatieBewerkbaar,
    huidigeBewerkbaar,
    openCompetentie,
    competenties,
    evaluaties,
    loading,
    fout,
    bezig,
    opgeslagen,
    foutMelding,
    scoreOpties,
    toggleCompetentie,
    getEvaluatie,
    getStudentEvaluatie,
    getMentorEvaluatie,
    setScore: () => {}, // Mentor kan geen scores instellen voor student
    setFeedback: () => {}, // Mentor kan geen feedback instellen voor student
    slaOp,
    handleLogout,
  }
}
