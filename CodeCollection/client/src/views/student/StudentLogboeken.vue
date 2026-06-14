<template>
  <div class="dashboard-layout">

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-item"   @click="moveToStagevoorstel">Stagevoorstel</button>
        <button class="nav-item active">Logboeken</button>
        <button class="nav-item" @click="moveToEvaluatie" >Evaluatie</button>
        <button class="nav-item" @click="router.push('/student/documenten')">Documenten</button>
      </nav>
      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">Uitloggen</button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main-content">

      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-user">{{ student.naam }}</div>
        <img src="../../assets/erasmus-logo.png" alt="Erasmus Hogeschool Brussel" class="topbar-logo" />
      </header>

      <!-- Content -->
      <section class="content-area">

        <!-- Laadfout -->
        <div v-if="fout" class="error-banner">
          {{ fout }}
        </div>

        <!-- Laden -->
        <div v-if="isLaden" class="loading-state">
          Logboek wordt geladen…
        </div>

        <template v-else>
          <!-- Page header -->
          <div class="page-header">
            <div class="student-identity">
              <div class="avatar-circle">{{ initialen(student.naam) }}</div>
              <div>
                <h1 class="student-fullname">Mijn logboeken</h1>
                <p class="student-sub">
                  {{ student.startDatum }} – {{ student.eindDatum }} &nbsp;·&nbsp; {{ student.bedrijf }}
                </p>
              </div>
            </div>
            <button class="actie-btn btn-blauw" @click="openDagModal">+ Nieuwe dag</button>
          </div>

          <!-- Empty state -->
          <div v-if="weken.length === 0" class="empty-state">
            Nog geen dagen ingevoerd. Klik op "+ Nieuwe dag" om te starten.
          </div>

          <!-- Week cards -->
          <div class="cards-stack">
            <div v-for="(week, wi) in weken" :key="week.nummer" class="card">

              <!-- Week header (clickable) -->
              <div
                class="card-header week-header-row"
                :class="{ open: week.open }"
                @click="week.open = !week.open"
              >
                <div class="week-header-left">
                  <span class="week-toggle">{{ week.open ? '▲' : '▼' }}</span>
                  <span class="card-title">Week {{ week.nummer }} — {{ week.van }} – {{ week.tot }}</span>
                </div>
                <div class="week-header-right">
                  <span class="uren-pill">{{ totaalUren(week) }}/{{ week.maxUren }}u</span>
                  <span class="badge" :class="statusKleur(week.status)">{{ week.status }}</span>
                </div>
              </div>

              <!-- Week body -->
              <div v-if="week.open" class="card-body">
                <div class="entry-subtitle">Dagen — Week {{ week.nummer }} ({{ totaalUren(week) }}/{{ week.maxUren }}u)</div>

                <table class="entry-tabel">
                  <thead>
                    <tr>
                      <th class="kol-datum">Datum</th>
                      <th class="kol-taak">Taak</th>
                      <th class="kol-uren">Uren</th>
                      <th class="kol-los">LO's</th>
                      <th class="kol-knop"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="(entry, ei) in week.entries" :key="entry.id ?? ei">
                      <tr class="entry-rij">
                        <td>{{ entry.datum }}</td>
                        <td>{{ entry.taak }}</td>
                        <td>{{ entry.uren }}u</td>
                        <td class="los-cel">{{ entry.los }}</td>
                        <td>
                          <button class="actie-btn btn-blauw klein" @click="entry.open = !entry.open">
                            {{ entry.open ? 'Sluiten' : 'Bekijk' }}
                          </button>
                        </td>
                      </tr>
                      <tr v-if="entry.open" class="entry-detail-rij">
                        <td colspan="5">
                          <div class="entry-detail">
                            <div class="detail-kolom">
                              <div class="detail-naam">{{ entry.taak }}</div>
                              <div class="field-label">Behaalde leerdoelen (LO's)</div>
                              <div class="tag-list">
                                <span v-for="lo in entry.losArray" :key="lo" class="tag tag-blue">{{ lo }}</span>
                              </div>
                            </div>
                            <div class="detail-kolom">
                              <div class="detail-waarde">{{ entry.reflectie || '—' }}</div>
                              <div class="field-label">Reflectie</div>
                            </div>
                            <div class="detail-kolom">
                              <div class="detail-waarde">{{ entry.leerpunten || '—' }}</div>
                              <div class="field-label">Leerpunten</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>

                <div class="week-footer">
                  <button
                    class="actie-btn btn-oranje"
                    :disabled="week.status === 'ingediend' || week.status === 'Afgehandeld' || week.isBezig"
                    @click="weekIndienen(wi)"
                  >
                    {{ week.isBezig ? 'Bezig…' : 'Week indienen' }}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </template>

      </section>
    </main>

    <!-- MODAL: Nieuwe dag -->
    <div class="modal-overlay" v-if="toonDagModal" @click.self="toonDagModal = false">
      <div class="modal">
        <h3>+ Nieuwe dag toevoegen</h3>
        <label>Datum</label>
        <input type="date" v-model="dagForm.datum" />
        <label>Taak / activiteit</label>
        <input type="text" v-model="dagForm.taak" placeholder="bv. API-integratie klantportaal" />
        <label>Aantal uren</label>
        <input type="number" v-model.number="dagForm.uren" min="0" max="10" />

        <label>Leerdoelen (LO's)</label>
        <div v-if="competentiesLaden" class="competenties-laden">Leerdoelen laden…</div>
        <div v-else-if="competentiesFout" class="modal-fout">{{ competentiesFout }}</div>
        <div v-else class="competentie-list">
          <label
            v-for="c in alleCompetenties"
            :key="c.id"
            class="competentie-checkbox"
          >
            <input
              type="checkbox"
              :value="c.id"
              v-model="dagForm.competentieIds"
            />
            <span>{{ c.naam }}</span>
          </label>
        </div>

        <label>Beschrijving / reflectie</label>
        <textarea v-model="dagForm.reflectie" placeholder="Wat heb je gedaan en geleerd?"></textarea>
        <label>Leerpunten / problemen</label>
        <textarea v-model="dagForm.leerpunten" placeholder="Verbeterpunten of opmerkingen..."></textarea>
        <div v-if="modalFout" class="modal-fout">{{ modalFout }}</div>
        <div class="modal-acties">
          <button class="actie-btn btn-grijs" :disabled="dagForm.isBezig" @click="toonDagModal = false">Annuleren</button>
          <button class="actie-btn btn-blauw" :disabled="dagForm.isBezig" @click="slaDagOp">
            {{ dagForm.isBezig ? 'Opslaan…' : 'Opslaan' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'


const API_BASE = import.meta.env.VITE_API_URL ?? ''
function authHeaders() {
  const token = localStorage.getItem('token') ?? ''
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

async function apiPost(path, data) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

async function apiPatch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export default {
  name: 'Logboek',
  setup() {
    const toonDagModal = ref(false)
    const isLaden = ref(true)
    const fout = ref(null)
    const modalFout = ref(null)
    const stageId = ref(null)
    const router = useRouter()

    const student = reactive({
      naam: '',
      startDatum: '',
      eindDatum: '',
      bedrijf: '',
    })

    const weken = reactive([])

    // Beschikbare competenties (LO's) voor de checklist in het formulier
    const alleCompetenties = reactive([])
    const competentiesLaden = ref(true)
    const competentiesFout = ref(null)

    const dagForm = reactive({
      datum: '', taak: '', uren: 8, competentieIds: [], reflectie: '', leerpunten: '', isBezig: false,
    })

    // ── Laden ────────────────────────────────────────────────────────────────
    function handleLogout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }

    function moveToStagevoorstel() {
      router.push('/student')
    }
    function moveToEvaluatie() {
      router.push('/student/evaluatie')
    }
      

    onMounted(async () => {
      try {
        // 1. Haal stageinfo op
        const stageInfo = await apiGet('/api/studentlogboeken/mijn-stage')
        stageId.value = stageInfo.stageId
        student.naam = stageInfo.naam
        student.startDatum = formatApiDatum(stageInfo.startDatum)
        student.eindDatum = formatApiDatum(stageInfo.eindDatum)
        student.bedrijf = stageInfo.bedrijf

        // 2. Haal weken op
        await laadWeken()
      } catch (e) {
        fout.value = e.message
      } finally {
        isLaden.value = false
      }

      // 3. Haal beschikbare competenties (LO's) op (los van bovenstaande, mag falen zonder pagina te blokkeren)
      try {
        const data = await apiGet('/api/studentlogboeken/competenties')
        alleCompetenties.splice(0, alleCompetenties.length, ...data)
      } catch (e) {
        competentiesFout.value = e.message
      } finally {
        competentiesLaden.value = false
      }
    })

    async function laadWeken() {
      const data = await apiGet(`/api/studentlogboeken/${stageId.value}/weken`)
      weken.splice(0, weken.length, ...data)
    }

    // ── Dag opslaan ──────────────────────────────────────────────────────────

    function openDagModal() {
      Object.assign(dagForm, { datum: '', taak: '', uren: 8, competentieIds: [], reflectie: '', leerpunten: '', isBezig: false })
      modalFout.value = null
      toonDagModal.value = true
    }

    async function slaDagOp() {
      if (!dagForm.datum) { modalFout.value = 'Selecteer een datum.'; return }
      if (!dagForm.taak)  { modalFout.value = 'Vul een taak in.'; return }
      if (!dagForm.competentieIds.length) { modalFout.value = 'Selecteer minstens één leerdoel (LO).'; return }

      dagForm.isBezig = true
      modalFout.value = null

      try {
        await apiPost(`/api/studentlogboeken/${stageId.value}/dag`, {
          datum:          dagForm.datum,
          taak:           dagForm.taak,
          uren:           dagForm.uren,
          competentieIds: dagForm.competentieIds,
          reflectie:      dagForm.reflectie,
          leerpunten:     dagForm.leerpunten,
        })
        toonDagModal.value = false
        await laadWeken()
      } catch (e) {
        modalFout.value = e.message
      } finally {
        dagForm.isBezig = false
      }
    }

    // ── Week indienen ────────────────────────────────────────────────────────

    async function weekIndienen(wi) {
      const week = weken[wi]
      if (!week || week.isBezig) return

      week.isBezig = true
      try {
        await apiPatch(`/api/studentlogboeken/${stageId.value}/week/${week.nummer}/indienen`)
        week.status = 'ingediend'
      } catch (e) {
        fout.value = e.message
      } finally {
        week.isBezig = false
      }
    }

    // ── Hulpfuncties ─────────────────────────────────────────────────────────

    function initialen(naam) {
      return (naam || '').split(' ').map(d => d[0] || '').join('').toUpperCase().slice(0, 2)
    }

    function totaalUren(week) {
      return week.entries.reduce((som, e) => som + (e.uren || 0), 0)
    }

    function statusKleur(s) {
      if (!s) return 'badge-grijs'
      const l = s.toLowerCase()
      if (l === 'afgehandeld' || l === 'afgetekend') return 'badge-groen'
      if (l === 'ingediend') return 'badge-geel'
      if (l === 'afgekeurd') return 'badge-rood'
      return 'badge-blauw'
    }

    /** Zet "2026-02-03" om naar "03/02/2026" */
    function formatApiDatum(iso) {
      if (!iso) return ''
      const [jaar, mm, dd] = iso.split('-')
      return `${dd}/${mm}/${jaar}`
    }

    return {
      toonDagModal, isLaden, fout, modalFout,
      student, weken, dagForm,
      alleCompetenties, competentiesLaden, competentiesFout,
      initialen, totaalUren, statusKleur,
      weekIndienen, openDagModal, slaDagOp, handleLogout, moveToStagevoorstel, moveToEvaluatie
    }
  },
}
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}
</style>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: Arial, Helvetica, sans-serif;
}

/* ── Layout ── */
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background: #f0f4f8;
}

/* ── Sidebar ── */
.sidebar {
  width: 180px;
  background: #29a8e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
    position: sticky;
  top: 0;            
  height: 100vh;
}

.sidebar-brand {
  padding: 1.25rem 1rem;
  background: #1ec8f0;
}

.brand-text {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.5px;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  width: 100%;
  text-align: left;
  background: white;
  border: none;
  border-radius: 6px;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #222;
  cursor: pointer;
  transition: background 0.15s;
}

.nav-item:hover,
.nav-item.active {
  background: #f0f0f0;
}

.nav-item.active {
  background: #e0f0fb;
  color: #1a7ab5;
}

.sidebar-footer {
  padding: 1rem 0.75rem;
}

.logout-btn {
  width: 100%;
  background: white;
  border: none;
  border-radius: 6px;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #222;
  cursor: pointer;
  transition: background 0.15s;
}

.logout-btn:hover { background: #f0f0f0; }

/* ── Main ── */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Topbar ── */
.topbar {
  background: white;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
}

.topbar-user {
  background: #e8e8e8;
  border-radius: 6px;
  padding: 0.4rem 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #222;
}

.topbar-logo {
  height: 36px;
  object-fit: contain;
}

/* ── Content area ── */
.content-area {
  padding: 1.5rem 2rem;
  overflow-y: auto;
}

/* ── Feedback banners ── */
.error-banner {
  background: #fdecea;
  color: #b71c1c;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 0.85rem 1.25rem;
  margin-bottom: 1rem;
  font-size: 0.92rem;
  font-weight: 600;
}

.loading-state {
  text-align: center;
  color: #888;
  padding: 3rem 0;
  font-size: 0.95rem;
}

.modal-fout {
  background: #fdecea;
  color: #b71c1c;
  border-radius: 6px;
  padding: 0.6rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  margin-top: 0.75rem;
}

/* ── Page header ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.student-identity {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #29a8e0;
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.student-fullname {
  font-size: 1.4rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 0.15rem;
}

.student-sub {
  font-size: 0.9rem;
  color: #555;
  margin: 0;
}

/* ── Empty state ── */
.empty-state {
  background: white;
  border-radius: 10px;
  padding: 2rem;
  text-align: center;
  color: #999;
  font-size: 0.95rem;
  border: 1px dashed #ccc;
}

/* ── Cards stack ── */
.cards-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Card ── */
.card {
  background: #e4e4e4;
  border-radius: 10px;
  overflow: hidden;
}

.card-header {
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid #d0d0d0;
}

.week-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.week-header-row:hover {
  background: #d8d8d8;
}

.week-header-row.open {
  background: #d6eef9;
  border-bottom-color: #29a8e0;
}

.week-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.week-toggle {
  font-size: 0.8rem;
  color: #777;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #111;
  margin: 0;
}

.week-header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.uren-pill {
  background: white;
  border: 1px solid #ccc;
  border-radius: 20px;
  padding: 0.2rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #444;
}

.card-body {
  padding: 1rem 1.25rem 1.25rem;
  background: white;
}

/* ── Badges ── */
.badge {
  display: inline-block;
  padding: 0.3rem 0.75rem;
  border-radius: 5px;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}
.badge-groen  { background: #4caf50; color: #fff; }
.badge-geel   { background: #f9c72f; color: #333; }
.badge-rood   { background: #f44336; color: #fff; }
.badge-blauw  { background: #29a8e0; color: #fff; }
.badge-grijs  { background: #aaa;    color: #fff; }

/* ── Entry table ── */
.entry-subtitle {
  font-size: 0.85rem;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 0.85rem;
}

.entry-tabel {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  table-layout: fixed;
}

.entry-tabel th {
  text-align: left;
  color: #777;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 1px solid #e0e0e0;
  padding: 0.6rem 0.75rem;
}

.entry-tabel td {
  padding: 0.75rem;
  vertical-align: middle;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
  font-weight: 600;
}

.entry-tabel tr:last-child td { border-bottom: none; }
.kol-datum { width: 90px; }
.kol-taak  { width: auto; }
.kol-uren  { width: 70px; }
.kol-los   { width: 220px; }
.kol-knop  { width: 110px; }

.los-cel {
  color: #555 !important;
  font-weight: 400 !important;
  font-size: 0.85rem !important;
}

/* ── Entry detail ── */
.entry-detail-rij td {
  background: #f5fafd;
  padding: 0;
  white-space: normal;
}

.entry-detail {
  display: flex;
  gap: 1.5rem;
  padding: 1rem 0.75rem;
  border-top: 1px solid #d0e8f5;
}

.detail-kolom { flex: 1; min-width: 0; }

.detail-naam {
  font-size: 0.95rem;
  font-weight: 700;
  color: #222;
  margin-bottom: 0.25rem;
}

.detail-waarde {
  font-size: 0.92rem;
  color: #444;
  margin-bottom: 0.25rem;
  line-height: 1.55;
}

.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-top: 0.4rem;
  display: block;
}

/* ── Tags ── */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.4rem;
}

.tag {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 5px;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.tag-blue { background: #2196f3; color: #fff; }

/* ── Week footer ── */
.week-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f0f0f0;
}

/* ── Action buttons ── */
.actie-btn {
  border: none;
  border-radius: 6px;
  padding: 0.65rem 1.25rem;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  color: white;
  transition: opacity 0.15s;
}

.actie-btn:hover { opacity: 0.88; }
.actie-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-blauw  { background: #29a8e0; }
.btn-oranje { background: #ff9800; }
.btn-grijs  { background: #aaa; }

.actie-btn.klein {
  padding: 0.4rem 0.9rem;
  font-size: 0.82rem;
}

/* ── Competentie checklist ── */
.competentie-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
}

.competentie-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  font-weight: 500;
  text-transform: none;
  color: #333;
  margin: 0;
  cursor: pointer;
}

.competentie-checkbox input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.competenties-laden {
  font-size: 0.85rem;
  color: #888;
  padding: 0.4rem 0;
}

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: white;
  border-radius: 10px;
  padding: 1.75rem 2rem;
  width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
}

.modal h3 {
  font-size: 1.15rem;
  color: #1a7ab5;
  margin-bottom: 1.1rem;
  font-weight: 700;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 0.75rem;
}

.modal label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: block;
  margin-top: 0.9rem;
  margin-bottom: 0.3rem;
}

.modal input,
.modal textarea {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  font-size: 0.92rem;
  color: #222;
  background: white;
  transition: border-color 0.15s;
}

.modal input:focus,
.modal textarea:focus {
  border-color: #29a8e0;
  outline: none;
}

.modal textarea {
  resize: vertical;
  min-height: 90px;
}

.modal-acties {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
</style>