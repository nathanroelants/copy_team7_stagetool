<template>
  <div class="dashboard-layout">

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>

      </div>

      <nav class="sidebar-nav">
        <button class="nav-item active">Mijn studenten</button>
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

      <!-- Student list -->
      <section class="content-area">
        <div class="section-header">
          <h2>Mijn studenten</h2>
          <p class="subtitle" v-if="!loading && !fout">
            {{ studenten.length }} studenten zijn momenteel toegewezen aan jou dit semester
          </p>
        </div>

        <div v-if="loading" class="status-message">Studenten laden...</div>
        <div v-else-if="fout" class="status-message error"> {{ fout }}</div>

        <div v-else-if="studenten.length === 0" class="status-message">
          Geen studenten toegewezen dit semester.
        </div>

        <div v-else class="student-list">
          <div
            v-for="student in studenten"
            :key="student.id"
            class="student-card"
          >
            <div class="student-avatar">
              <div class="avatar-circle">
                {{ initialen(student.voornaam, student.achternaam) }}
              </div>
            </div>

            <div class="student-info">
              <div class="student-name">{{ student.voornaam }} {{ student.achternaam }}</div>
              <div class="student-opleiding">
                {{ student.opleiding }} — {{ student.bedrijf }}
              </div>
              <div class="student-meta">
                <span class="meta-item">
                  📅 {{ formatDatum(student.start_datum) }} → {{ formatDatum(student.eind_datum) }}
                </span>
                <span class="meta-item" v-if="student.mentor_naam">
                  🏢 Stagementor: {{ student.mentor_naam }}
                </span>
              </div>

              <div class="badge-row">
                <div class="badge-group">
                  <span class="badge-label">Stagevoorstel</span>
                  <span :class="['badge', badgeKlasse(student.stagevoorstel_status)]">
                    {{ student.stagevoorstel_status || '—' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const studenten = ref([])
const loading = ref(true)
const fout = ref('')

const user = JSON.parse(localStorage.getItem('user') || '{}')
const gebruikerNaam = `${user.voornaam || ''} ${user.naam || ''}`.trim() || user.email || 'Docent'

// Badge kleurklasse op basis van statustekst
function badgeKlasse(status) {
  if (!status) return 'badge-grijs'
  const s = status.toLowerCase()
  if (s.includes('goedgekeurd') || s.includes('afgerond') || s.includes('afgetekend')) return 'badge-groen'
  if (s.includes('open') || s.includes('afwachting')) return 'badge-geel'
  if (s.includes('niet') || s.includes('afgekeurd') || s.includes('ingediend') === false) return 'badge-rood'
  if (s.includes('ingediend')) return 'badge-blauw'
  return 'badge-grijs'
}

function initialen(voornaam, achternaam) {
  return `${(voornaam || '')[0] || ''}${(achternaam || '')[0] || ''}`.toUpperCase()
}

function formatDatum(datum) {
  if (!datum) return '?'
  return new Date(datum).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function laadStudenten() {
  loading.value = true
  fout.value = ''
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/stagecommissie/studenten', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Fout bij ophalen studenten')
    studenten.value = data
  } catch (err) {
    fout.value = err.message || 'Kon studenten niet laden.'
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/')
}

onMounted(laadStudenten)
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

.section-header {
  margin-bottom: 1.25rem;
}

.section-header h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 0.25rem;
}

.subtitle {
  color: #555;
  font-size: 0.9rem;
  margin: 0;
}

.status-message {
  color: #555;
  padding: 1rem 0;
  font-size: 0.95rem;
}

.status-message.error {
  color: #cc0000;
}

/* ── Student cards ── */
.student-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.student-card {
  background: #e4e4e4;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.avatar-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #bbb;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.student-info {
  flex: 1;
  min-width: 0;
}

.student-name {
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 0.15rem;
}

.student-opleiding {
  font-size: 0.85rem;
  color: #444;
  margin-bottom: 0.3rem;
}

.student-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: #555;
  margin-bottom: 0.65rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* ── Badges ── */
.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.badge-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.badge-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

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
