<template>
  <div class="dashboard-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-item" @click="router.push('/student')">Stagevoorstel</button>
        <button class="nav-item" @click="router.push('/studentlogboeken')">Logboeken</button>
        <button class="nav-item" @click="router.push('/student/evaluatie')">Evaluatie</button>
        <button class="nav-item active">Documenten</button>
      </nav>
      <div class="sidebar-footer">
        <button v-if="heeftMeerdereRollen" class="nav-item wissel-rol-btn" @click="router.push('/kies-rol')">Wissel rol</button>
        <button class="logout-btn" @click="handleLogout">Uitloggen</button>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="topbar-user">{{ gebruikerNaam }}</div>
        <img src="../../assets/erasmus-logo.png" alt="Erasmus Hogeschool Brussel" class="topbar-logo" />
      </header>

      <section class="content-area">
        <h2>Documenten</h2>

        <div v-if="loading" class="status-msg">Laden...</div>
        <div v-else-if="fout" class="status-msg error">{{ fout }}</div>

        <template v-else>

          <div v-if="stageId" class="eindevaluatie-kaart">
            <div class="doc-naam">Eindevaluatie PDF</div>
            <p class="doc-meta">Download het eindevaluatie-document (beschikbaar nadat de docent het heeft gegenereerd)</p>
            <div v-if="eindevaluatieFout" class="status-msg error">{{ eindevaluatieFout }}</div>
            <button class="knop-download" :disabled="downloaden" @click="downloadEindevaluatie">
              {{ downloaden ? 'Downloaden...' : 'Downloaden' }}
            </button>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const user = JSON.parse(localStorage.getItem('user') || '{}')
const gebruikerNaam = `${user.voornaam || ''} ${user.achternaam || ''}`.trim() || user.email || 'Student'
const heeftMeerdereRollen = (user.rollen?.length ?? 0) > 1

const docs = ref([])
const stageId = ref(null)
const loading = ref(true)
const fout = ref('')
const downloaden = ref(false)
const eindevaluatieFout = ref('')

async function laadDocumenten() {
  try {
    const res = await fetch('/api/student/documenten', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    docs.value = data.docs
    stageId.value = data.stage_id
  } catch (err) {
    fout.value = err.message
  } finally {
    loading.value = false
  }
}

async function downloadEindevaluatie() {
  downloaden.value = true
  eindevaluatieFout.value = ''
  try {
    const res = await fetch(`/api/stagevoorstellen/${stageId.value}/eindevaluatie/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
    window.open(data.url, '_blank')
  } catch (err) {
    eindevaluatieFout.value = err.message
  } finally {
    downloaden.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/')
}

onMounted(laadDocumenten)
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  font-family: Arial, Helvetica, sans-serif;
  background: #f5f7fa;
}

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
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0.75rem;
}

.nav-item {
  width: 100%;
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #29a8e0;
  cursor: pointer;
  margin-bottom: 0.5rem;
  text-align: left;
  transition: background 0.15s;
}

.nav-item:hover { background: #f0f7fc; }
.nav-item.active { background: #29a8e0; color: white; }

.sidebar-footer { padding: 1rem 0.75rem; }

.logout-btn {
  width: 100%;
  background: #ffeaea;
  color: #cc0000;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.logout-btn:hover { background: #ffdada; }
.wissel-rol-btn { background: white; color: #29a8e0; border: 1px solid #29a8e0; margin-bottom: 0.5rem; }

.main-content { flex: 1; display: flex; flex-direction: column; }

.topbar {
  background: white;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
}

.topbar-logo { height: 36px; object-fit: contain; }

.topbar-user {
  background: #e8e8e8;
  border-radius: 6px;
  padding: 0.4rem 1rem;
  font-weight: 600;
}

.content-area { padding: 1.5rem 2rem; }

.content-area h2 { font-size: 1.3rem; font-weight: 700; margin: 0 0 1.25rem; }

.status-msg { padding: 1rem 0; color: #555; }
.status-msg.error { color: #cc0000; }

.doc-lijst { display: flex; flex-direction: column; gap: 0.75rem; }

.doc-card {
  background: white;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.doc-icon { font-size: 1.8rem; }

.doc-info { flex: 1; }

.doc-naam { font-weight: 700; font-size: 0.95rem; color: #1a1a1a; }

.doc-meta { font-size: 0.85rem; color: #555; margin-top: 0.2rem; }

.doc-datum { font-size: 0.8rem; color: #888; margin-top: 0.15rem; }

.doc-status {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
}

.beschikbaar { background: #e6f7ee; color: #2e7d32; }
.niet-beschikbaar { background: #f5f5f5; color: #999; }

.eindevaluatie-kaart {
  background: white;
  border-radius: 10px;
  border-top: 3px solid #29a8e0;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.75rem;
}

.knop-download {
  background: #29a8e0;
  color: white;
  border: none;
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  align-self: flex-start;
  box-shadow: 0 2px 4px rgba(41,168,224,0.25);
  transition: background 0.15s;
}

.knop-download:hover { background: #1e90c0; }
.knop-download:disabled { background: #aaa; cursor: not-allowed; }
</style>
