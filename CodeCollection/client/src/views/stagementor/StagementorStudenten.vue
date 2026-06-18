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
        <button v-if="heeftMeerdereRollen" class="nav-item wissel-rol-btn" @click="router.push('/kies-rol')">Wissel rol</button>
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
        </div>

        <div v-if="loading" class="status-message">Studenten laden...</div>
        <div v-else-if="fout" class="status-message error">{{ fout }}</div>
        <div v-else-if="studenten.length === 0" class="status-message">
          Er zijn nog geen studenten aan u toegewezen.
        </div>

        <div v-else class="student-list">
  <div
    v-for="student in studenten"
    :key="student.id"
    class="student-card"
   @click="$router.push(`/stagementorlogboeken/${student.id}`)"
    style="cursor: pointer;"
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
          {{ formatDatum(student.start_datum) }} → {{ formatDatum(student.eind_datum) }}
        </span>
        <span class="meta-item">
          <a :href="`mailto:${student.email}`" class="email-link" @click.stop>{{ student.email }}</a>
        </span>
      </div>

      <div class="badge-row">
        <div class="badge-group">
          <span class="badge-label">Stagevoorstel</span>
          <span :class="['badge', badgeKlasse(student.stagevoorstel_status)]">
            {{ student.stagevoorstel_status || '—' }}
          </span>
        </div>
        <div class="badge-group">
          <span class="badge-label">Logboek</span>
          <span :class="['badge', logboekBadgeKlasse(student.logboek_status)]">
            {{ student.logboek_status || '—' }}
          </span>
        </div>
      </div>
      <div v-if="student.stagevoorstel_status === 'stagevoorstel geaccepteerd'" class="action-buttons">
        <router-link
          :to="`/mentor/stages/${student.stage_id}/ondertekenen`"
          class="btn-ondertekenen"
          @click.stop
        >
          ✍ Stage ondertekenen
        </router-link>
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
const gebruikerNaam = `${user.voornaam || ''} ${user.naam || ''}`.trim() || user.email || 'Stagementor'
const heeftMeerdereRollen = (user.rollen?.length ?? 0) > 1

function badgeKlasse(status) {
  if (!status) return 'badge-grijs'
  const s = status.toLowerCase()
  if (s.includes('goedgekeurd') || s.includes('geaccepteerd') || s.includes('afgetekend')) return 'badge-groen'
  if (s.includes('ingediend')) return 'badge-geel'
  if (s.includes('geweigerd') || s.includes('aanpassingen')) return 'badge-rood'
  if (s.includes('lopend')) return 'badge-blauw'
  return 'badge-grijs'
}

function logboekBadgeKlasse(status) {
  if (!status) return 'badge-grijs'
  const s = status.toLowerCase()
  if (s.includes('afgetekend')) return 'badge-groen'
  if (s.includes('afwachting')) return 'badge-geel'
  if (s.includes('niet ingediend')) return 'badge-grijs'
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
    const response = await fetch('/api/stagementor/studenten', {
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
  background: #f5f7fa;
}

/* ── Sidebar ── */
.sidebar {
  width: 180px;
  background: white;
  border-right: 1px solid #e5e8ec;
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
}

.nav-item {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #29a8e0;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: background 0.15s;
}

.nav-item:hover { background: #f0f7fc; }
.nav-item.active { background: #29a8e0; color: white; }

.sidebar-footer {
  padding: 1rem 0.75rem;
}

.logout-btn {
  width: 100%;
  background: #ffeaea;
  color: #cc0000;
  border: none;
  border-radius: 6px;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.logout-btn:hover { background: #ffdada; }
.wissel-rol-btn { background: white; color: #29a8e0; border: 1px solid #29a8e0; margin-bottom: 0.5rem; }

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
  background: white;
  border-radius: 10px;
  border-top: 3px solid #29a8e0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
  padding: 1rem 1.25rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  overflow: hidden;
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

.email-link {
  color: #1a7ab5;
  text-decoration: none;
}

.email-link:hover {
  text-decoration: underline;
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
  padding: 0.25rem 0.7rem;
  border-radius: 5px;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.action-buttons {
  margin-top: 0.75rem;
}

.btn-ondertekenen {
  display: inline-block;
  background: #29a8e0;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-ondertekenen:hover {
  background: #1a8cbe;
}

.badge-groen  { background: #4caf50; color: #fff; }
.badge-geel   { background: #f9c72f; color: #333; }
.badge-rood   { background: #f44336; color: #fff; }
.badge-blauw  { background: #2196f3; color: #fff; }
.badge-grijs  { background: #aaa;    color: #fff; }
</style>