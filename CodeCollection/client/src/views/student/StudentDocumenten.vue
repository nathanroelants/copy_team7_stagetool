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

        <div v-else class="doc-lijst">
          <div v-for="doc in docs" :key="doc.type" class="doc-card">
            <div class="doc-icon">{{ doc.type === 'stagevoorstel' ? '📄' : '📋' }}</div>
            <div class="doc-info">
              <div class="doc-naam">{{ doc.naam }}</div>
              <div class="doc-meta">{{ doc.meta }}</div>
              <div v-if="doc.datum" class="doc-datum">
                {{ new Date(doc.datum).toLocaleDateString('nl-BE') }}
              </div>
            </div>
            <div class="doc-status" :class="doc.beschikbaar ? 'beschikbaar' : 'niet-beschikbaar'">
              {{ doc.beschikbaar ? 'Beschikbaar' : 'Niet beschikbaar' }}
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
const user = JSON.parse(localStorage.getItem('user') || '{}')
const gebruikerNaam = `${user.voornaam || ''} ${user.achternaam || ''}`.trim() || user.email || 'Student'
const heeftMeerdereRollen = (user.rollen?.length ?? 0) > 1

const docs = ref([])
const loading = ref(true)
const fout = ref('')

async function laadDocumenten() {
  try {
    const res = await fetch('/api/student/documenten', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    docs.value = data
  } catch (err) {
    fout.value = err.message
  } finally {
    loading.value = false
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
</style>
