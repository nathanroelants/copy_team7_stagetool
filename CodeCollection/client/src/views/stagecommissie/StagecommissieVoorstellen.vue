<template>
  <div class="dashboard-layout">

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>
      </div>

      <nav class="sidebar-nav">
        <button class="nav-item" @click="$router.back()">← Mijn studenten</button>
        <button class="nav-item active">Stagevoorstel</button>
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
        <img src="../../assets/erasmus-logo.png" alt="Erasmus Hogeschool Brussel" class="topbar-logo" />
      </header>

      <!-- Content -->
      <section class="content-area">

        <div v-if="loading" class="status-message">Gegevens laden...</div>
        <div v-else-if="fout" class="status-message error">{{ fout }}</div>

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
            <span :class="['badge', badgeKlasse(student.stagevoorstel_status)]">
              {{ student.stagevoorstel_status || '—' }}
            </span>
          </div>

          <!-- Cards grid -->
          <div class="cards-grid">

            <!-- Bedrijfsgegevens -->
            <div class="card">
              <div class="card-header">
                <span class="card-icon">🏢</span>
                <h2 class="card-title">Gegevens bedrijf</h2>
              </div>
              <div class="card-body">
                <div class="field">
                  <span class="field-label">Bedrijfsnaam</span>
                  <span class="field-value">{{ voorstel.bedrijfsnaam || '—' }}</span>
                </div>
                <div class="divider"></div>
                <div class="field-group">
                  <div class="field">
                    <span class="field-label">Voornaam stagementor</span>
                    <span class="field-value">{{ mentor.voornaam || '—' }}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Achternaam stagementor</span>
                    <span class="field-value">{{ mentor.achternaam || '—' }}</span>
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
            </div>

            <!-- Stageperiode -->
            <div class="card">
              <div class="card-header">
                <span class="card-icon">📅</span>
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
                <span class="card-icon">📍</span>
                <h2 class="card-title">Adres</h2>
              </div>
              <div class="card-body">
                <div class="address-block">
                  <span class="address-line">
                    {{ voorstel.straat || '—' }} {{ voorstel.huisnummer || '' }}
                  </span>
                  <span class="address-line">{{ voorstel.gemeente || '—' }}</span>
                  <span class="address-line muted">{{ voorstel.land || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- Beschrijving -->
            <div class="card card-wide">
              <div class="card-header">
                <span class="card-icon">📝</span>
                <h2 class="card-title">Beschrijving</h2>
              </div>
              <div class="card-body">
                <p class="description-text">{{ voorstel.beschrijving || 'Geen beschrijving opgegeven.' }}</p>
              </div>
            </div>

            <!-- Competenties -->
            <div class="card card-wide">
              <div class="card-header">
                <span class="card-icon">🛠️</span>
                <h2 class="card-title">Competenties</h2>
              </div>
              <div class="card-body competenties-body">
                <div class="competentie-section">
                  <span class="comp-label">Technische skills</span>
                  <div class="tag-list">
                    <span
                      v-for="(skill, i) in parseTags(voorstel.technische_skills)"
                      :key="i"
                      class="tag tag-blue"
                    >{{ skill }}</span>
                    <span v-if="!parseTags(voorstel.technische_skills).length" class="field-value">—</span>
                  </div>
                </div>
                <div class="comp-divider"></div>
                <div class="competentie-section">
                  <span class="comp-label">Tools</span>
                  <div class="tag-list">
                    <span
                      v-for="(tool, i) in parseTags(voorstel.tools)"
                      :key="i"
                      class="tag tag-grey"
                    >{{ tool }}</span>
                    <span v-if="!parseTags(voorstel.tools).length" class="field-value">—</span>
                  </div>
                </div>
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
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const fout = ref('')

const student = ref({})
const stage = ref({})
const voorstel = ref(null)
const mentor = ref({})

const user = JSON.parse(localStorage.getItem('user') || '{}')
const gebruikerNaam = `${user.voornaam || ''} ${user.naam || ''}`.trim() || user.email || 'Docent'

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
  // Support comma-separated or newline-separated values
  return raw.split(/[,\n]+/).map(s => s.trim()).filter(Boolean)
}

function badgeKlasse(status) {
  if (!status) return 'badge-grijs'
  const s = status.toLowerCase()
  if (s.includes('goedgekeurd') || s.includes('geaccepteerd') || s.includes('afgetekend')) return 'badge-groen'
  if (s.includes('ingediend')) return 'badge-geel'
  if (s.includes('afgekeurd') || s.includes('geweigerd')) return 'badge-rood'
  if (s.includes('lopend')) return 'badge-blauw'
  return 'badge-grijs'
}

async function laadDetail() {
  loading.value = true
  fout.value = ''
  try {
    const token = localStorage.getItem('token')
    // studentId comes from route params or query
    const studentId = route.params.studentId || route.query.studentId
    const stageId = route.params.stageId
    const res = await fetch(`/api/stagecommissie/studenten/${stageId}/voorstel`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Fout bij ophalen gegevens')

    student.value = data.student || {}
    stage.value = data.stage || {}
    voorstel.value = data.stagevoorstel || null
    mentor.value = data.mentor || {}
  } catch (err) {
    fout.value = err.message || 'Kon gegevens niet laden.'
  } finally {
    loading.value = false
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
  margin-bottom: 0.5rem;
  transition: background 0.15s;
}

.nav-item:hover,
.nav-item.active {
  background: #f0f0f0;
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

.logout-btn:hover {
  background: #f0f0f0;
}

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

/* ── Content ── */
.content-area {
  padding: 1.5rem 2rem;
  overflow-y: auto;
}

.status-message {
  color: #555;
  padding: 1rem 0;
  font-size: 0.95rem;
}

.status-message.error {
  color: #cc0000;
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

/* ── Cards grid ── */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.card-wide {
  grid-column: 1 / -1;
}

/* ── Card ── */
.card {
  background: #e4e4e4;
  border-radius: 10px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1.25rem 0.6rem;
  border-bottom: 1px solid #d0d0d0;
}

.card-icon {
  font-size: 1rem;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #111;
  margin: 0;
}

.card-body {
  padding: 1rem 1.25rem 1.25rem;
}

/* ── Fields ── */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: 0.75rem;
}

.field:last-child {
  margin-bottom: 0;
}

.field-group {
  display: flex;
  flex-direction: column;
}

.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.field-value {
  font-size: 0.92rem;
  font-weight: 600;
  color: #111;
}

.field-link {
  color: #29a8e0;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.92rem;
}

.field-link:hover {
  text-decoration: underline;
}

.divider {
  height: 1px;
  background: #d0d0d0;
  margin: 0.75rem 0;
}

/* ── Period ── */
.period-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.period-block {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.period-date {
  font-size: 1rem;
  font-weight: 700;
  color: #111;
}

.period-arrow {
  font-size: 1.2rem;
  color: #888;
  margin-top: 1rem;
}

.duration-pill {
  display: inline-block;
  background: #29a8e0;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
}

/* ── Address ── */
.address-block {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.address-line {
  font-size: 0.95rem;
  font-weight: 600;
  color: #111;
}

.address-line.muted {
  color: #555;
  font-weight: 400;
}

/* ── Description ── */
.description-text {
  font-size: 0.92rem;
  color: #222;
  line-height: 1.65;
  margin: 0;
  white-space: pre-wrap;
}

/* ── Competenties ── */
.competenties-body {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.competentie-section {
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.comp-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.comp-divider {
  width: 1px;
  background: #d0d0d0;
  align-self: stretch;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tag {
  display: inline-block;
  padding: 0.3rem 0.75rem;
  border-radius: 5px;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.tag-blue { background: #2196f3; color: #fff; }
.tag-grey { background: #aaa;    color: #fff; }

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
.badge-blauw  { background: #2196f3; color: #fff; }
.badge-grijs  { background: #aaa;    color: #fff; }
</style>