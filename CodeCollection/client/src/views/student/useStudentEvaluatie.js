import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export function useStudentEvaluatie() {
  const router = useRouter()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const gebruikerNaam = `${user.voornaam || ''} ${user.achternaam || ''}`.trim() || user.email || 'Student'

  const actieveTab = ref('tussentijds')
  const openCompetentie = ref(null)
  const competenties = ref([])
  const evaluaties = ref([])
  const loading = ref(true)
  const fout = ref('')
  const bezig = ref({})
  const opgeslagen = ref({})

  const scoreOpties = [
    { waarde: 5, label: 'Uitstekend', beschrijving: 'Volledig zelfstandig, geen bijsturing nodig.' },
    { waarde: 4, label: 'Goed', beschrijving: 'Grotendeels zelfstandig, kleine bijsturing nodig.' },
    { waarde: 3, label: 'Voldoende', beschrijving: 'Met regelmatige begeleiding.' },
    { waarde: 2, label: 'Onvoldoende', beschrijving: 'Enkel op vraag van begeleider.' },
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

  function getMentorEvaluatie(competentieId) {
    return evaluaties.value.find(
      e => e.competentie_id === competentieId &&
           e.beoordelaar_id !== user.id &&
           e.type === actieveTab.value &&
           e.zichtbaar_voor_student
    )
  }

  function setScore(competentieId, waarde) {
    const bestaande = getEvaluatie(competentieId)
    if (bestaande) {
      bestaande.score = waarde
    } else {
      evaluaties.value.push({
        competentie_id: competentieId,
        beoordelaar_id: user.id,
        type: actieveTab.value,
        score: waarde,
        feedback: '',
        zichtbaar_voor_student: false,
      })
    }
  }

  function setFeedback(competentieId, tekst) {
    const bestaande = getEvaluatie(competentieId)
    if (bestaande) {
      bestaande.feedback = tekst
    } else {
      evaluaties.value.push({
        competentie_id: competentieId,
        beoordelaar_id: user.id,
        type: actieveTab.value,
        score: null,
        feedback: tekst,
        zichtbaar_voor_student: false,
      })
    }
  }

  async function slaOp(competentieId) {
    const evaluatie = getEvaluatie(competentieId)
    if (!evaluatie) return

    bezig.value[competentieId] = true
    opgeslagen.value[competentieId] = false

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/student/evaluaties', {
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
      opgeslagen.value[competentieId] = true
      setTimeout(() => { opgeslagen.value[competentieId] = false }, 3000)
    } catch (err) {
      alert(err.message || 'Kon niet opslaan.')
    } finally {
      bezig.value[competentieId] = false
    }
  }

  async function laadData() {
    loading.value = true
    fout.value = ''
    try {
      competenties.value = [
        { id: '1', naam: 'Beheersing van het planningsproces' },
        { id: '2', naam: 'Ontwerpen IT-oplossingen' },
        { id: '3', naam: 'Implementatie digitale producten' },
        { id: '4', naam: 'Integratie technologie en infrastructuur' },
        { id: '5', naam: 'Onderzoekende houding' },
        { id: '6', naam: 'Helder en transparant communiceren' },
        { id: '7', naam: 'Probleemoplossend vermogen' },
        { id: '8', naam: 'Persoonlijke ontwikkeling' },
        { id: '9', naam: 'Professionele attitude' },
        { id: '10', naam: 'Ondernemend handelen' },
        { id: '11', naam: 'Ethisch en deontologisch handelen' },
      ]
      evaluaties.value = []
    } catch (err) {
      fout.value = err.message || 'Kon data niet laden.'
    } finally {
      loading.value = false
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
    openCompetentie,
    competenties,
    evaluaties,
    loading,
    fout,
    bezig,
    opgeslagen,
    scoreOpties,
    toggleCompetentie,
    getEvaluatie,
    getMentorEvaluatie,
    setScore,
    setFeedback,
    slaOp,
    handleLogout,
  }
}
