<template>
  <div class="dashboard-layout">

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-item">Stagevoorstel</button>
        <button class="nav-item active">Logboek</button>
        <button class="nav-item">Evaluatie</button>
        <button class="nav-item">Documenten</button>
      </nav>
      <div class="sidebar-footer">
        <button class="logout-btn" @click="uitloggen">Uitloggen</button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main-content">

      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-user">{{ student.naam }}</div>
        <div class="topbar-logo">erasmus</div>
      </header>

      <!-- Content -->
      <section class="content-area">

        <!-- Page header -->
        <div class="page-header">
          <div class="student-identity">
            <div class="avatar-circle">{{ initialen(student.naam) }}</div>
            <div>
              <h1 class="student-fullname">Mijn logboek</h1>
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
          <div v-for="(week, wi) in weken" :key="wi" class="card">

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
                  <template v-for="(entry, ei) in week.entries" :key="ei">
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
                            <div class="field-label">Beschrijving taken</div>
                            <div class="tag-list">
                              <span v-for="lo in entry.losArray" :key="lo" class="tag tag-blue">{{ lo }}</span>
                            </div>
                            <div class="field-label" style="margin-top: 8px;">Behaalde competenties</div>
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
                <button class="actie-btn btn-oranje" @click="weekIndienen(wi)">Week indienen</button>
              </div>
            </div>

          </div>
        </div>

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
        <label>LO's (komma-gescheiden)</label>
        <input type="text" v-model="dagForm.los" placeholder="bv. LO2: IT-oplossingen, LO4: Technologie" />
        <label>Beschrijving / reflectie</label>
        <textarea v-model="dagForm.reflectie" placeholder="Wat heb je gedaan en geleerd?"></textarea>
        <label>Leerpunten</label>
        <textarea v-model="dagForm.leerpunten" placeholder="Verbeterpunten of opmerkingen..."></textarea>
        <div class="modal-acties">
          <button class="actie-btn btn-grijs" @click="toonDagModal = false">Annuleren</button>
          <button class="actie-btn btn-blauw" @click="slaDagOp">Opslaan</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, reactive } from 'vue'

export default {
  name: 'Logboek',
  setup() {
    const toonDagModal = ref(false)

    const student = reactive({
      naam: 'Nathan Roelaerts',
      leergroep: 'Leergroep IVI',
      startDatum: '02/02/2026',
      eindDatum: '29/05/2026',
      bedrijf: 'Cronos Group NV',
      mentor: 'Jan Janssen',
      adres: 'Industrielaan 5, 2000 Antwerpen',
    })

    const weken = reactive([
      {
        nummer: 1, van: '02/02', tot: '08/02/2026', maxUren: 40,
        status: 'Afgehandeld', open: false,
        entries: [
          { datum: '02/02', taak: 'Kennismaking team', uren: 8, los: 'LO5: Communiceren', reflectie: 'Eerste dag op de werkvloer.', leerpunten: 'Geen problemen.', losArray: ['LO5: Communiceren'], open: false },
          { datum: '03/02', taak: 'Omgeving installeren', uren: 8, los: 'LO2: IT-oplossingen', reflectie: 'Node, Vue en Git opgezet.', leerpunten: 'Kleine versieconflicten opgelost.', losArray: ['LO2: IT-oplossingen'], open: false },
        ],
      },
      {
        nummer: 2, van: '09/02', tot: '15/02/2026', maxUren: 40,
        status: 'Afgehandeld', open: false,
        entries: [
          { datum: '09/02', taak: 'Dashboard front-end', uren: 8, los: 'LO2: IT-oplossingen, LO4: Technologie', reflectie: 'Vue componenten gebouwd.', leerpunten: 'Geen problemen.', losArray: ['LO2: IT-oplossingen', 'LO4: Technologie'], open: false },
          { datum: '10/02', taak: 'Unit tests schrijven', uren: 8, los: 'LO3: Implementatie', reflectie: 'Jest opgezet voor de componenten.', leerpunten: '', losArray: ['LO3: Implementatie'], open: false },
        ],
      },
      {
        nummer: 3, van: '16/02', tot: '22/02/2026', maxUren: 40,
        status: 'in afwachting', open: true,
        entries: [
          { datum: '19/02', taak: 'API-integratie klantportaal', uren: 8, los: 'LO2: IT-oplossingen, LO4: Technologie', reflectie: 'Geleerd hoe REST API werkt.', leerpunten: 'Geen problemen.', losArray: ['LO2: IT-oplossingen', 'LO4: Technologie'], open: false },
          { datum: '18/02', taak: 'Database design', uren: 8, los: 'LO2: IT-oplossingen', reflectie: 'Schema opgemaakt in MySQL.', leerpunten: '', losArray: ['LO2: IT-oplossingen'], open: false },
        ],
      },
    ])

    const dagForm = reactive({ datum: '', taak: '', uren: 8, los: '', reflectie: '', leerpunten: '' })

    function initialen(naam) {
      const delen = (naam || '').split(' ')
      return delen.map(d => d[0] || '').join('').toUpperCase().slice(0, 2)
    }

    function totaalUren(week) {
      return week.entries.reduce((som, e) => som + (e.uren || 0), 0)
    }

    function statusKleur(s) {
      if (!s) return 'badge-grijs'
      const l = s.toLowerCase()
      if (l === 'afgehandeld') return 'badge-groen'
      if (l === 'ingediend') return 'badge-geel'
      if (l === 'afgekeurd') return 'badge-rood'
      return 'badge-blauw'
    }

    function weekIndienen(wi) {
      weken[wi].status = 'ingediend'
    }

    function getMaandag(dateObj) {
      const d = new Date(dateObj)
      const dag = d.getDay()
      const diff = dag === 0 ? -6 : 1 - dag
      d.setDate(d.getDate() + diff)
      return d
    }

    function formatDatum(dateObj) {
      const dd = String(dateObj.getDate()).padStart(2, '0')
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
      return dd + '/' + mm
    }

    function formatDatumVolledig(dateObj) {
      return formatDatum(dateObj) + '/' + dateObj.getFullYear()
    }

    function slaDagOp() {
      if (!dagForm.datum) return
      const gekozenDatum = new Date(dagForm.datum)
      const maandag = getMaandag(gekozenDatum)
      const zondag = new Date(maandag)
      zondag.setDate(zondag.getDate() + 6)
      const weekVan = formatDatum(maandag)
      const weekTot = formatDatumVolledig(zondag)
      const losArray = dagForm.los.split(',').map(s => s.trim()).filter(Boolean)
      const dd = String(gekozenDatum.getDate()).padStart(2, '0')
      const mm = String(gekozenDatum.getMonth() + 1).padStart(2, '0')
      const datumLabel = dd + '/' + mm
      const nieuweEntry = {
        datum: datumLabel, taak: dagForm.taak, uren: dagForm.uren,
        los: dagForm.los, reflectie: dagForm.reflectie,
        leerpunten: dagForm.leerpunten, losArray, open: false,
      }
      const bestaand = weken.find(w => w.van === weekVan)
      if (bestaand) {
        bestaand.entries.push(nieuweEntry)
        bestaand.open = true
      } else {
        weken.push({
          nummer: weken.length + 1, van: weekVan, tot: weekTot,
          maxUren: 40, status: 'in afwachting', open: true, entries: [nieuweEntry],
        })
        weken.sort((a, b) => {
          const [daA, maA] = a.van.split('/').map(Number)
          const [daB, maB] = b.van.split('/').map(Number)
          return maA !== maB ? maA - maB : daA - daB
        })
        weken.forEach((w, i) => { w.nummer = i + 1 })
      }
      Object.assign(dagForm, { datum: '', taak: '', uren: 8, los: '', reflectie: '', leerpunten: '' })
      toonDagModal.value = false
    }

    function openDagModal() {
      Object.assign(dagForm, { datum: '', taak: '', uren: 8, los: '', reflectie: '', leerpunten: '' })
      toonDagModal.value = true
    }

    function uitloggen() {
      if (confirm('Bent u zeker dat u wilt uitloggen?')) alert('U bent uitgelogd.')
    }

    return {
      toonDagModal, student, weken, dagForm,
      initialen, totaalUren, statusKleur, weekIndienen,
      openDagModal, slaDagOp, uitloggen,
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
  background: #c00;
  color: white;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.4rem 0.85rem;
  border-radius: 4px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* ── Content area ── */
.content-area {
  padding: 1.5rem 2rem;
  overflow-y: auto;
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