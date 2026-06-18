import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export function useStagementorEvaluatie() {
    const router = useRouter()
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const gebruikerNaam = `${user.voornaam || ''} ${user.achternaam || ''}`.trim() || user.email || 'Stagementor'

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

    function getMentorEvaluatie(competentieId) {
        return evaluaties.value.find(
            e => e.competentie_id === competentieId &&
                e.beoordelaar_id !== user.id &&
                e.type === actieveTab.value &&
                e.zichtbaar_voor_student
        )
    }

    function setScore(competentieId, waarde) {
        if (!huidigeBewerkbaar.value) return
        const bestaande = getEvaluatie(competentieId)
        if (bestaande) {
            if (Number(bestaande.score) === Number(waarde)) return
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
        if (!huidigeBewerkbaar.value) return
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
        if (!huidigeBewerkbaar.value) return
        const evaluatie = getEvaluatie(competentieId)
        if (!evaluatie || !evaluatie.feedback?.trim()) {
            foutMelding.value[competentieId] = 'Invullen feedback is verplicht!'
            return
        }
        foutMelding.value[competentieId] = ''
        bezig.value[competentieId] = true
        opgeslagen.value[competentieId] = false

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/stagementor/evaluaties', {
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

    async function laadData() {
        loading.value = true
        fout.value = ''
        try {
            const token = localStorage.getItem('token')
            const [compRes, evalRes] = await Promise.all([
                fetch('/api/stagementor/competenties', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/stagementor/evaluaties', { headers: { Authorization: `Bearer ${token}` } }),
            ])
            const compData = await compRes.json()
            const evalData = await evalRes.json()
            if (!compRes.ok) throw new Error(compData.error || 'Fout bij laden competenties')
            if (!evalRes.ok) throw new Error(evalData.error || 'Fout bij laden evaluaties')

            competenties.value = compData
            // Backend geeft nu { evaluatie_status, evaluaties } terug
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

    function handleLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/')
    }

    onMounted(laadData)

    return {
        gebruikerNaam,
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
        getMentorEvaluatie,
        setScore,
        setFeedback,
        slaOp,
        handleLogout,
    }
}