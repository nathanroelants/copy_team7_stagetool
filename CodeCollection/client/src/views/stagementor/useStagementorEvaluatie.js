import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export function useStagementorEvaluatie(stageId) {
  const router = useRouter()

  // User info
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const gebruikerNaam = `${user.voornaam || ''} ${user.naam || ''}`.trim() || user.email || 'Mentor'

  // State
  const actieveTab = ref('tussentijds')
  const competenties = ref([])
  const evaluaties = ref([])
  const loading = ref(false)
  const fout = ref('')
  const bezig = ref({})
  const opgeslagen = ref({})
  const foutMelding = ref({})
  const evaluatieStatus = ref('geen')

  const scoreOpties = [
    { waarde: 1, label: 'Onvoldoende', beschrijving: 'Niet bereikt' },
    { waarde: 2, label: 'Voldoende', beschrijving: 'Basis bereikt' },
    { waarde: 3, label: 'Goed', beschrijving: 'Goed bereikt' },
    { waarde: 4, label: 'Excellent', beschrijving: 'Excellent bereikt' },
  ]

  // Computed properties
  const tussentijdsZichtbaar = computed(() => evaluatieStatus.value !== 'geen')
  const eindevaluatieZichtbaar = computed(() => evaluatieStatus.value === 'eindevaluatie')
  const tussentijdsBewerkbaar = computed(() => evaluatieStatus.value === 'tussentijds')
  const eindevaluatieBewerkbaar = computed(() => evaluatieStatus.value === 'eindevaluatie')
  const huidigeBewerkbaar = computed(() => {
    if (actieveTab.value === 'tussentijds') return tussentijdsBewerkbaar.value
    if (actieveTab.value === 'eindevaluatie') return eindevaluatieBewerkbaar.value
    return false
  })

  // API calls
  const getAuthHeader = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  })

  const loadCompetencies = async () => {
    loading.value = true
    fout.value = ''
    try {
      const response = await fetch('/api/stagementor/competenties', {
        headers: getAuthHeader()
      })
      if (!response.ok) throw new Error('Kon competenties niet laden')
      competenties.value = await response.json()
    } catch (error) {
      fout.value = 'Kon competenties niet laden'
      console.error(error)
    } finally {
      loading.value = false
    }
  }

  const loadEvaluaties = async () => {
    try {
      const response = await fetch(`/api/stagementor/evaluaties/${stageId}`, {
        headers: getAuthHeader()
      })
      if (!response.ok) throw new Error('Kon evaluaties niet laden')
      const data = await response.json()
      evaluaties.value = data.evaluaties || []
      evaluatieStatus.value = data.evaluatie_status || 'geen'
    } catch (error) {
      fout.value = 'Kon evaluaties niet laden'
      console.error(error)
    }
  }

  const getEvaluatie = (competentieId) => {
    return evaluaties.value.find(
      e => e.competentie_id === competentieId &&
        e.type === actieveTab.value
    )
  }

  const setScore = (competentieId, score) => {
    let evaluatie = getEvaluatie(competentieId)
    if (!evaluatie) {
      evaluatie = {
        competentie_id: competentieId,
        type: actieveTab.value,
        score,
        feedback: ''
      }
      evaluaties.value.push(evaluatie)
    } else {
      evaluatie.score = score
    }
  }

  const setFeedback = (competentieId, feedback) => {
    let evaluatie = getEvaluatie(competentieId)
    if (!evaluatie) {
      evaluatie = {
        competentie_id: competentieId,
        type: actieveTab.value,
        score: null,
        feedback
      }
      evaluaties.value.push(evaluatie)
    } else {
      evaluatie.feedback = feedback
    }
  }

  const slaOp = async (competentieId) => {
    const evaluatie = getEvaluatie(competentieId)
    if (!evaluatie) return

    bezig.value[competentieId] = true
    foutMelding.value[competentieId] = ''

    try {
      const response = await fetch(`/api/stagementor/evaluaties/${stageId}`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          competentie_id: competentieId,
          type: actieveTab.value,
          score: evaluatie.score,
          feedback: evaluatie.feedback
        })
      })

      if (!response.ok) throw new Error('Kon evaluatie niet opslaan')

      opgeslagen.value[`${competentieId}_${actieveTab.value}`] = true
      setTimeout(() => {
        opgeslagen.value[`${competentieId}_${actieveTab.value}`] = false
      }, 2000)
    } catch (error) {
      foutMelding.value[competentieId] = 'Fout bij opslaan'
      console.error(error)
    } finally {
      bezig.value[competentieId] = false
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  onMounted(() => {
    loadCompetencies()
    loadEvaluaties()
  })

  return {
    gebruikerNaam,
    actieveTab,
    evaluatieStatus,
    tussentijdsZichtbaar,
    eindevaluatieZichtbaar,
    tussentijdsBewerkbaar,
    eindevaluatieBewerkbaar,
    huidigeBewerkbaar,
    competenties,
    evaluaties,
    loading,
    fout,
    bezig,
    opgeslagen,
    foutMelding,
    scoreOpties,
    getEvaluatie,
    setScore,
    setFeedback,
    slaOp,
    handleLogout
  }
}
