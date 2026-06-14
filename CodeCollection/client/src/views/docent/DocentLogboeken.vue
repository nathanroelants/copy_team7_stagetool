<template>
  <div class="dashboard-layout">

    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-item" :class="{ active: pagina === 'logboek' }"    @click="pagina = 'logboek'">Logboek</button>
        <button class="nav-item" :class="{ active: pagina === 'stageinfo' }"  @click="pagina = 'stageinfo'">Stagevoorstel</button>
        <button class="nav-item" :class="{ active: pagina === 'evaluatie' }"  @click="pagina = 'evaluatie'">Evaluatie</button>
        <button class="nav-item" :class="{ active: pagina === 'documenten' }" @click="pagina = 'documenten'">Documenten</button>
      </nav>
      <div class="sidebar-footer">
        <button class="logout-btn" @click="uitloggen">Uitloggen</button>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="topbar-user">{{ docentNaam }}</div>
        <img src="../../assets/erasmus-logo.png" alt="Erasmus Hogeschool Brussel" class="topbar-logo" />
      </header>

      <section class="content-area">

        <!-- LOGBOEK -->
        <div v-if="pagina === 'logboek'">
          <div class="section-header">
            <h2>Logboek van {{ student.naam }}</h2>
            <p class="sectie-subtitel">
              Stageperiode: {{ formatDatum(student.startDatum) }} – {{ formatDatum(student.eindDatum) }} | {{ student.bedrijf }}
            </p>
          </div>

          <div v-if="loading" class="status-message">Logboek laden...</div>
          <div v-else-if="fout" class="status-message error">{{ fout }}</div>
          <div v-else-if="weken.length === 0" class="status-message">Nog geen dagen ingevoerd door de student.</div>

          <div v-for="week in weken" :key="week.nummer" class="week-kaart">
            <div class="week-header">
              <div class="week-titel">
                Week {{ week.nummer }}
                <span class="badge" :class="statusBadge(week.status)">{{ week.status }}</span>
              </div>
            </div>

            <table class="dag-tabel">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Taak</th>
                  <th>Uren</th>
                  <th>Leerdoelstelling</th>
                  <th>Reflectie</th>
                  <th>Leerpunten</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dag in week.dagen" :key="dag.datum">
                  <td>{{ formatDatum(dag.datum) }}</td>
                  <td>{{ dag.taak }}</td>
                  <td>{{ dag.uren }}</td>
                  <td>{{ dag.los }}</td>
                  <td>{{ dag.reflectie }}</td>
                  <td>{{ dag.leerpunten }}</td>
                </tr>
              </tbody>
            </table>

            <div class="week-totaal">
              Totaal: <strong>{{ week.dagen.reduce((s, d) => s + (d.uren || 0), 0) }} uren</strong>
            </div>
          </div>
        </div>

        <!-- STAGEVOORSTEL -->
        <div v-if="pagina === 'stageinfo'">
          <div class="section-header">
            <h2>Stagevoorstel</h2>
          </div>
          <div class="info-kaart">
            <div><strong>Student:</strong> {{ student.naam }}</div>
            <div><strong>Stageperiode:</strong> {{ formatDatum(student.startDatum) }} – {{ formatDatum(student.eindDatum) }}</div>
            <div><strong>Bedrijf:</strong> {{ student.bedrijf }}</div>
          </div>
        </div>

        <!-- EVALUATIE -->
        <div v-if="pagina === 'evaluatie'">
          <div class="section-header">
            <h2>Evaluatie</h2>
          </div>
          <div class="info-kaart">
            <div><strong>Tussentijdse score:</strong> —</div>
            <div><strong>Eindscore:</strong> —</div>
            <div><strong>Opmerking:</strong> —</div>
          </div>
        </div>

        <!-- DOCUMENTEN -->
        <div v-if="pagina === 'documenten'">
          <div class="section-header">
            <h2>Documenten</h2>
          </div>
          <div class="status-message">Geen documenten beschikbaar.</div>
        </div>

      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route  = useRoute()
const router = useRouter()

const stageId   = route.params.stageId
const pagina    = ref('logboek')
const loading   = ref(true)
const fout      = ref('')

const user      = JSON.parse(localStorage.getItem('user') || '{}')
const docentNaam = `${user.voornaam || ''} ${user.naam || ''}`.trim() || user.email || 'Docent'

const student = reactive({
  naam:       '',
  email:      '',
  bedrijf:    '',
  startDatum: '',
  eindDatum:  ''
})

const weken = ref([])

function statusBadge(status) {
  if (status === 'Afgetekend') return 'badge-groen'
  if (status === 'Ingediend')  return 'badge-blauw'
  return 'badge-grijs'
}

function formatDatum(datum) {if (!datum) return '—'
  return new Date(datum).toLocaleDateString('nl-BE', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric'
  })
}

async function laadLogboek() {
  loading.value = true
  fout.value = ''
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/docent/studenten/${stageId}/logboek`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Kon logboek niet ophalen')
    const data = await res.json()

    student.naam       = data.student.naam
    student.email      = data.student.email
    student.bedrijf    = data.student.bedrijf
    student.startDatum = data.student.startDatum
    student.eindDatum  = data.student.eindDatum
    weken.value        = data.weken
  } catch (e) {
    fout.value = e.message
  } finally {
    loading.value = false
  }
}

function uitloggen() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

onMounted(() => {
  laadLogboek()
})
</script>