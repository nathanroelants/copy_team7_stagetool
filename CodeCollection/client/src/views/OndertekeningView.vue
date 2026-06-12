<template>
  <div class="dashboard-layout">

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>
      </div>

      <nav class="sidebar-nav">
        <button class="nav-item" @click="$router.back()">← Terug</button>
        <button class="nav-item active">Ondertekening</button>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">Uitloggen</button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main-content">

      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-user">{{ gebruikerNaam }}</div>
        <img src="../assets/erasmus-logo.png" alt="Erasmus Hogeschool Brussel" class="topbar-logo" />
      </header>

      <!-- Content -->
      <section class="content-area">

        <div v-if="loading" class="status-message">Gegevens laden...</div>
        <div v-else-if="foutLaden" class="status-message error">{{ foutLaden }}</div>

        <template v-else-if="voorstel">

          <!-- Page header -->
          <div class="page-header">
            <div class="student-identity">
              <div class="avatar-circle">{{ initialen(student.voornaam, student.achternaam) }}</div>
              <div>
                <h1 class="student-fullname">{{ student.voornaam }} {{ student.achternaam }}</h1>
                <p class="student-sub">{{ student.opleiding }}</p>
              </div>
            </div>
            <span :class="['badge', badgeKlasse(stage.status)]">
              {{ stage.status || '—' }}
            </span>
          </div>

          <!-- Cards grid -->
          <div class="cards-grid">

            <!-- Bedrijfsgegevens -->
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">Gegevens bedrijf</h2>
              </div>
              <div class="card-body">
                <div class="field">
                  <span class="field-label">Bedrijfsnaam</span>
                  <span class="field-value">{{ voorstel.bedrijfsnaam || '—' }}</span>
                </div>
                <div class="divider"></div>
                <div class="field">
                  <span class="field-label">Stagementor</span>
                  <span class="field-value">
                    {{ mentor.voornaam || '—' }} {{ mentor.achternaam || '' }}
                  </span>
                </div>
                <div class="field">
                  <span class="field-label">E-mail stagementor</span>
                  <a v-if="mentor.email" :href="`mailto:${mentor.email}`" class="field-value field-link">
                    {{ mentor.email }}
                  </a>
                  <span v-else class="field-value">—</span>
                </div>
              </div>
            </div>

            <!-- Stageperiode -->
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">Stageperiode</h2>
              </div>
              <div class="card-body">
                <div class="period-row">
                  <div class="period-block">
                    <span class="field-label">Begindatum</span>
                    <span class="period-date">{{ formatDatum(stage.start_datum) }}</span>
                  </div>
                  <div class="period-arrow">→</div>
                  <div class="period-block">
                    <span class="field-label">Einddatum</span>
                    <span class="period-date">{{ formatDatum(stage.eind_datum) }}</span>
                  </div>
                </div>
                <div v-if="stage.start_datum && stage.eind_datum" class="duration-pill">
                  {{ berekenWeken(stage.start_datum, stage.eind_datum) }} weken
                </div>
              </div>
            </div>

            <!-- Adres -->
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">Adres</h2>
              </div>
              <div class="card-body">
                <div class="address-block">
                  <span class="address-line">{{ voorstel.straat || '—' }} {{ voorstel.huisnummer || '' }}</span>
                  <span class="address-line">{{ voorstel.gemeente || '—' }}</span>
                  <span class="address-line muted">{{ voorstel.land || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- Beschrijving -->
            <div class="card card-wide">
              <div class="card-header">
                <h2 class="card-title">Beschrijving stageopdracht</h2>
              </div>
              <div class="card-body">
                <p class="description-text">{{ voorstel.beschrijving || 'Geen beschrijving opgegeven.' }}</p>
              </div>
            </div>

            <!-- Competenties -->
            <div class="card card-wide">
              <div class="card-header">
                <h2 class="card-title">Competenties</h2>
              </div>
              <div class="card-body competenties-body">
                <div class="competentie-section">
                  <span class="comp-label">Technische skills</span>
                  <div class="tag-list">
                    <span v-for="(skill, i) in parseTags(voorstel.technische_skills)" :key="i" class="tag tag-blue">
                      {{ skill }}
                    </span>
                    <span v-if="!parseTags(voorstel.technische_skills).length" class="field-value">—</span>
                  </div>
                </div>
                <div class="comp-divider"></div>
                <div class="competentie-section">
                  <span class="comp-label">Tools</span>
                  <div class="tag-list">
                    <span v-for="(tool, i) in parseTags(voorstel.tools)" :key="i" class="tag tag-grey">
                      {{ tool }}
                    </span>
                    <span v-if="!parseTags(voorstel.tools).length" class="field-value">—</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Ondertekening status ── -->
            <div class="card card-wide">
              <div class="card-header">
                <h2 class="card-title">Ondertekeningsstatus</h2>
              </div>
              <div class="card-body">
                <div class="signing-status-grid">

                  <div class="signing-party">
                    <div :class="['signing-indicator', handtekeningKlasse('student')]">
                      <span class="signing-icon">{{ handtekeningIcoon('student') }}</span>
                    </div>
                    <div class="signing-info">
                      <span class="signing-role">Student</span>
                      <span class="signing-name">{{ student.voornaam }} {{ student.achternaam }}</span>
                      <span class="signing-date">
                        {{ formatHandtekening(ondertekeningen.student) }}
                      </span>
                    </div>
                  </div>

                  <div class="signing-connector"></div>

                  <div class="signing-party">
                    <div :class="['signing-indicator', handtekeningKlasse('docent')]">
                      <span class="signing-icon">{{ handtekeningIcoon('docent') }}</span>
                    </div>
                    <div class="signing-info">
                      <span class="signing-role">Docent</span>
                      <span class="signing-name">
                        {{ docent.voornaam ? `${docent.voornaam} ${docent.achternaam}` : '—' }}
                      </span>
                      <span class="signing-date">
                        {{ formatHandtekening(ondertekeningen.docent) }}
                      </span>
                    </div>
                  </div>

                  <div class="signing-connector"></div>

                  <div class="signing-party">
                    <div :class="['signing-indicator', handtekeningKlasse('stagementor')]">
                      <span class="signing-icon">{{ handtekeningIcoon('stagementor') }}</span>
                    </div>
                    <div class="signing-info">
                      <span class="signing-role">Stagementor</span>
                      <span class="signing-name">
                        {{ mentor.voornaam ? `${mentor.voornaam} ${mentor.achternaam}` : '—' }}
                      </span>
                      <span class="signing-date">
                        {{ formatHandtekening(ondertekeningen.stagementor) }}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <!-- ── Onderteken actie (alleen zichtbaar voor eigen rol, als nog niet ondertekend) ── -->
            <div v-if="kanOndertekenen" class="card card-wide">
              <div class="card-header">
                <h2 class="card-title">Stagevoorstel ondertekenen</h2>
              </div>
              <div class="card-body">

                <!-- Al ondertekend -->
                <div v-if="heeftOndertekend" class="signed-confirmation">
                  <span class="signed-check">✓</span>
                  <span>Je hebt dit voorstel reeds ondertekend op {{ formatHandtekening(eigenHandtekening) }}.</span>
                </div>

                <!-- Nog niet ondertekend -->
                <template v-else>
                  <p class="sign-intro">
                    Door te ondertekenen bevestig je kennis genomen te hebben van de inhoud van dit stagevoorstel
                    en ga je akkoord met de beschreven stageopdracht en -omstandigheden.
                  </p>

                  <div class="sign-consent">
                    <label class="checkbox-label">
                      <input type="checkbox" v-model="akkoord" />
                      <span>Ik heb het stagevoorstel gelezen en ga akkoord.</span>
                    </label>
                  </div>

                  <div v-if="foutOndertekening" class="error-message">{{ foutOndertekening }}</div>

                  <div class="actie-buttons">
                    <button
                      class="actie-btn btn-groen"
                      :disabled="!akkoord || ondertekeningLoading"
                      @click="handleOndertekenen"
                    >
                      {{ ondertekeningLoading ? 'Bezig...' : '✍ Ondertekenen' }}
                    </button>
                  </div>
                </template>

              </div>
            </div>

          </div>
        </template>

        <div v-else class="status-message">Geen stagevoorstel gevonden.</div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import useOndertekening from '../composables/useOndertekening.js'

const props = defineProps({
  rol: {
    type: String,
    required: true,
    validator: (v) => ['student', 'docent', 'stagementor'].includes(v),
  },
})

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const foutLaden = ref('')
const akkoord = ref(false)

const student = ref({})
const stage = ref({})
const voorstel = ref(null)
const mentor = ref({})
const docent = ref({})
const ondertekeningen = ref({ student: null, docent: null, stagementor: null })

const { loading: ondertekeningLoading, fout: foutOndertekening, onderteken } = useOndertekening(props.rol)

const user = JSON.parse(localStorage.getItem('user') || '{}')
const gebruikerNaam = `${user.voornaam || ''} ${user.naam || ''}`.trim() || user.email || 'Gebruiker'

// ── Computed ──
const kanOndertekenen = computed(() => {
  const allowedRoles = ['student', 'docent', 'stagementor']
  if (!allowedRoles.includes(props.rol)) return false
  
  const status = stage.value?.status?.toLowerCase() || ''
  const allowedStatuses = ['stagevoorstel geaccepteerd', 'goedgekeurd', 'geaccepteerd']
  
  return allowedStatuses.some(s => status.includes(s))
})

const eigenHandtekening = computed(() => ondertekeningen.value[props.rol])
const heeftOndertekend = computed(() => !!eigenHandtekening.value)

// ── Helpers ──
function initialen(voornaam, achternaam) {
  return `${(voornaam || '')[0] || ''}${(achternaam || '')[0] || ''}`.toUpperCase()
}

function formatDatum(datum) {
  if (!datum) return '?'
  return new Date(datum).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function berekenWeken(start, eind) {
  const ms = new Date(eind) - new Date(start)
  return Math.round(ms / (1000 * 60 * 60 * 24 * 7))
}

function parseTags(raw) {
  if (!raw) return []
  return raw.split(/[,\n]+/).map(s => s.trim()).filter(Boolean)
}

function badgeKlasse(status) {
  if (!status) return 'badge-grijs'
  const s = status.toLowerCase()
  if (s.includes('goedgekeurd') || s.includes('geaccepteerd') || s.includes('afgetekend')) return 'badge-groen'
  if (s.includes('ingediend')) return 'badge-geel'
  if (s.includes('afgekeurd') || s.includes('geweigerd') || s.includes('aanpassingen')) return 'badge-rood'
  if (s.includes('lopend')) return 'badge-blauw'
  return 'badge-grijs'
}

function handtekeningKlasse(party) {
  return ondertekeningen.value[party] ? 'indicator-signed' : 'indicator-pending'
}

function handtekeningIcoon(party) {
  return ondertekeningen.value[party] ? '✓' : '…'
}

function formatHandtekening(ts) {
  if (!ts) return 'Nog niet ondertekend'
  return `Ondertekend op ${new Date(ts).toLocaleDateString('nl-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })}`
}

// ── Data loading ──
async function laadDetail() {
  loading.value = true
  foutLaden.value = ''
  try {
    const token = localStorage.getItem('token')
    const stageId = route.params.stageId

    const response = await fetch(`/api/stagevoorstellen/${stageId}/detail`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Fout bij ophalen gegevens.')

    student.value = data.student || {}
    stage.value = data.stage || {}
    voorstel.value = data.stagevoorstel || null
    mentor.value = data.mentor || {}
    docent.value = data.docent || {}
    ondertekeningen.value = {
      student: data.ondertekeningen?.student || null,
      docent: data.ondertekeningen?.docent || null,
      stagementor: data.ondertekeningen?.stagementor || null,
    }
  } catch (err) {
    console.error('Laden fout:', err)
    foutLaden.value = err.message || 'Kon gegevens niet laden.'
  } finally {
    loading.value = false
  }
}

// ── Actions ──
async function handleOndertekenen() {
  const stageId = route.params.stageId
  const ok = await onderteken(stageId)
  if (ok) {
    await laadDetail()
    akkoord.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/')
}

onMounted(laadDetail)
</script>

<style scoped>
/* ── Layout ── */
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  font-family: Arial, Helvetica, sans-serif;
  background: #f0f4f8;
}

/* ── Sidebar ── */
.sidebar {
  width: 180px;
  background: #29a8e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.sidebar-brand { padding: 1.25rem 1rem; background: #1ec8f0; }
.brand-text { font-size: 1.4rem; font-weight: 800; color: #fff; letter-spacing: 0.5px; }
.sidebar-nav { flex: 1; padding: 1rem 0.75rem; }
.nav-item {
  width: 100%; text-align: left; background: white; border: none;
  border-radius: 6px; padding: 0.65rem 1rem; font-size: 0.9rem;
  font-weight: 600; color: #222; cursor: pointer; margin-bottom: 0.5rem; transition: background 0.15s;
}
.nav-item:hover, .nav-item.active { background: #f0f0f0; }
.sidebar-footer { padding: 1rem 0.75rem; }
.logout-btn {
  width: 100%; background: white; border: none; border-radius: 6px;
  padding: 0.65rem 1rem; font-size: 0.9rem; font-weight: 600;
  color: #222; cursor: pointer; transition: background 0.15s;
}
.logout-btn:hover { background: #f0f0f0; }

/* ── Main ── */
.main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* ── Topbar ── */
.topbar {
  background: white; padding: 0.75rem 1.5rem;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
}
.topbar-user {
  background: #e8e8e8; border-radius: 6px; padding: 0.4rem 1rem;
  font-size: 0.95rem; font-weight: 600; color: #222;
}
.topbar-logo { height: 36px; object-fit: contain; }

/* ── Content ── */
.content-area { padding: 1.5rem 2rem; overflow-y: auto; }
.status-message { color: #555; padding: 1rem 0; font-size: 0.95rem; }
.status-message.error { color: #cc0000; }

/* ── Page header ── */
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;
}
.student-identity { display: flex; align-items: center; gap: 1rem; }
.avatar-circle {
  width: 52px; height: 52px; border-radius: 50%; background: #29a8e0;
  color: #fff; font-weight: 700; font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.student-fullname { font-size: 1.4rem; font-weight: 700; color: #111; margin: 0 0 0.15rem; }
.student-sub { font-size: 0.9rem; color: #555; margin: 0; }

/* ── Cards grid ── */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.card-wide { grid-column: 1 / -1; }

/* ── Card ── */
.card { background: #e4e4e4; border-radius: 10px; overflow: hidden; }
.card-header {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.85rem 1.25rem 0.6rem; border-bottom: 1px solid #d0d0d0;
}
.card-title { font-size: 0.95rem; font-weight: 700; color: #111; margin: 0; }
.card-body { padding: 1rem 1.25rem 1.25rem; }

/* ── Fields ── */
.field { display: flex; flex-direction: column; gap: 0.15rem; margin-bottom: 0.75rem; }
.field:last-child { margin-bottom: 0; }
.field-label { font-size: 0.72rem; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.4px; }
.field-value { font-size: 0.92rem; font-weight: 600; color: #111; }
.field-link { color: #29a8e0; text-decoration: none; font-weight: 600; font-size: 0.92rem; }
.field-link:hover { text-decoration: underline; }
.divider { height: 1px; background: #d0d0d0; margin: 0.75rem 0; }

/* ── Period ── */
.period-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.85rem; }
.period-block { display: flex; flex-direction: column; gap: 0.2rem; }
.period-date { font-size: 1rem; font-weight: 700; color: #111; }
.period-arrow { font-size: 1.2rem; color: #888; margin-top: 1rem; }
.duration-pill {
  display: inline-block; background: #29a8e0; color: #fff;
  font-size: 0.8rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 20px;
}

/* ── Address ── */
.address-block { display: flex; flex-direction: column; gap: 0.3rem; }
.address-line { font-size: 0.95rem; font-weight: 600; color: #111; }
.address-line.muted { color: #555; font-weight: 400; }

/* ── Description ── */
.description-text { font-size: 0.92rem; color: #222; line-height: 1.65; margin: 0; white-space: pre-wrap; }

/* ── Competenties ── */
.competenties-body { display: flex; flex-wrap: wrap; gap: 1.5rem; }
.competentie-section { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 0.6rem; }
.comp-label { font-size: 0.72rem; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.4px; }
.comp-divider { width: 1px; background: #d0d0d0; align-self: stretch; }
.tag-list { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.tag { display: inline-block; padding: 0.3rem 0.75rem; border-radius: 5px; font-size: 0.82rem; font-weight: 700; white-space: nowrap; }
.tag-blue { background: #2196f3; color: #fff; }
.tag-grey { background: #aaa; color: #fff; }

/* ── Badges ── */
.badge { display: inline-block; padding: 0.3rem 0.75rem; border-radius: 5px; font-size: 0.82rem; font-weight: 700; white-space: nowrap; }
.badge-groen  { background: #4caf50; color: #fff; }
.badge-geel   { background: #f9c72f; color: #333; }
.badge-rood   { background: #f44336; color: #fff; }
.badge-blauw  { background: #2196f3; color: #fff; }
.badge-grijs  { background: #aaa;    color: #fff; }

/* ── Signing status grid ── */
.signing-status-grid {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
  row-gap: 1.25rem;
}

.signing-party {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex: 1;
  min-width: 180px;
}

.signing-connector {
  width: 2rem;
  height: 2px;
  background: #c8c8c8;
  flex-shrink: 0;
  margin: 0 0.25rem;
}

.signing-indicator {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: background 0.2s;
}

.indicator-signed  { background: #4caf50; color: #fff; }
.indicator-pending { background: #ddd;    color: #888; }

.signing-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.signing-role {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #666;
}

.signing-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: #111;
}

.signing-date {
  font-size: 0.78rem;
  color: #666;
}

/* ── Sign action ── */
.sign-intro {
  font-size: 0.92rem;
  color: #333;
  line-height: 1.6;
  margin: 0 0 1rem;
}

.sign-consent {
  margin-bottom: 1.25rem;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  cursor: pointer;
  font-size: 0.92rem;
  color: #222;
  font-weight: 600;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: #29a8e0;
  flex-shrink: 0;
  cursor: pointer;
}

.signed-confirmation {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
  border-radius: 8px;
  padding: 0.85rem 1rem;
  font-size: 0.92rem;
  font-weight: 600;
  color: #2e7d32;
}

.signed-check {
  font-size: 1.2rem;
}

.error-message {
  background: #fdecea;
  border: 1px solid #f5c6c6;
  border-radius: 6px;
  padding: 0.65rem 0.85rem;
  font-size: 0.88rem;
  color: #c62828;
  margin-bottom: 1rem;
}

/* ── Action buttons ── */
.actie-buttons { display: flex; gap: 1rem; flex-wrap: wrap; }

.actie-btn {
  border: none; border-radius: 6px;
  padding: 0.75rem 1.5rem; font-size: 0.95rem;
  font-weight: 700; cursor: pointer; color: white;
  transition: opacity 0.15s;
}

.btn-groen  { background: #4caf50; }
.actie-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>