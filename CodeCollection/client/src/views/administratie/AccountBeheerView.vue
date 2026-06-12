<template>
  <div class="dashboard-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>
      </div>

      <nav class="sidebar-nav">
        <button :class="['nav-item', { active: actief === 'accounts' }]" @click="actief = 'accounts'">
          Accountbeheer
        </button>
        <button :class="['nav-item', { active: actief === 'competenties' }]" @click="actief = 'competenties'">
          Competentiebeheer
        </button>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">Uitloggen</button>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="topbar-user">{{ gebruikerNaam }}</div>
      </header>

      <section class="content-area">

        <div class="page-header">
          <h2>Accountbeheer</h2>
          <button @click="openModal()" class="btn-primary">+ Nieuw account</button>
        </div>

        <div class="filter-row">
          <select v-model="filterRol" class="filter-select">
            <option value="">Alle rollen</option>
            <option value="student">Student</option>
            <option value="docent">Docent</option>
            <option value="stagementor">Stagementor</option>
            <option value="stagecomissie">Stagecomissie</option>
            <option value="administratie">Administratie</option>
          </select>
        </div>

        <div v-if="loading" class="status-message">Laden...</div>
        <div v-else-if="fout" class="status-message error">{{ fout }}</div>

        <table v-else class="account-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>E-mail</th>
              <th>Rol</th>
              <th>Opleiding</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in gefilterd" :key="g.id">
              <td><strong>{{ g.voornaam }} {{ g.achternaam }}</strong></td>
              <td>{{ g.email }}</td>
              <td><span :class="['badge', `badge-${g.rol}`]">{{ rolLabel(g.rol) }}</span></td>
              <td>{{ g.opleidingen?.[0]?.naam || '—' }}</td>
              <td class="acties">
                <button @click="openModal(g)" class="btn-bewerken">Bewerken</button>
                <button @click="verwijder(g)" class="btn-verwijderen">Verwijderen</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>

    <!-- Modal voor toevoegen/bewerken -->
    <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ editingId ? 'Account bewerken' : 'Nieuw account' }}</h3>

        <form @submit.prevent="saveAccount">
          <div class="form-group">
            <label>Voornaam</label>
            <input v-model="form.voornaam" type="text" required />
          </div>
          <div class="form-group">
            <label>Achternaam</label>
            <input v-model="form.achternaam" type="text" required />
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input v-model="form.email" type="email" required />
          </div>
          <div class="form-group">
            <label>Rol</label>
            <select v-model="form.rol" required>
              <option value="student">Student</option>
              <option value="docent">Docent</option>
              <option value="stagementor">Stagementor</option>
              <option value="stagecomissie">Stagecomissie</option>
              <option value="administratie">Administratie</option>
            </select>
          </div>
          <div class="form-group">
            <label>Opleiding</label>
            <input v-model="form.opleiding" type="text" placeholder="bv. Toegepaste Informatica" />
          </div>

          <div v-if="modalFout" class="error-msg">{{ modalFout }}</div>

          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn-cancel">Annuleren</button>
            <button type="submit" class="btn-primary">
              {{ editingId ? 'Opslaan' : 'Aanmaken' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const gebruikers = ref([])
const loading = ref(true)
const fout = ref('')
const filterRol = ref('')
const actief = ref('accounts')

const modalOpen = ref(false)
const editingId = ref(null)
const modalFout = ref('')

const initialForm = {
  voornaam: '', achternaam: '', email: '', rol: 'student', opleiding: ''
}
const form = ref({ ...initialForm })

const user = JSON.parse(localStorage.getItem('user') || '{}')
const gebruikerNaam = `${user.voornaam || ''} ${user.achternaam || user.naam || ''}`.trim() || 'Admin'

const gefilterd = computed(() => {
  if (!filterRol.value) return gebruikers.value
  return gebruikers.value.filter(g => g.rol === filterRol.value)
})

function rolLabel(rol) {
  const labels = {
    student: 'Student',
    docent: 'Docent',
    stagementor: 'Stagementor',
    stagecomissie: 'Stagecomissie',
    administratie: 'Administratie'
  }
  return labels[rol] || rol
}

async function laadGebruikers() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/admin/gebruikers', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    gebruikers.value = data
  } catch (err) {
    fout.value = err.message
  } finally {
    loading.value = false
  }
}

function openModal(gebruiker = null) {
  modalFout.value = ''
  if (gebruiker) {
    editingId.value = gebruiker.id
    form.value = {
      voornaam: gebruiker.voornaam,
      achternaam: gebruiker.achternaam,
      email: gebruiker.email,
      rol: gebruiker.rol,
      opleiding: gebruiker.opleidingen?.[0]?.naam || ''
    }
  } else {
    editingId.value = null
    form.value = { ...initialForm }
  }
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  modalFout.value = ''
}

async function saveAccount() {
  modalFout.value = ''
  const token = localStorage.getItem('token')
  const url = editingId.value
    ? `/api/admin/gebruikers/${editingId.value}`
    : '/api/admin/gebruikers'
  const method = editingId.value ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form.value)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    await laadGebruikers()
    closeModal()
  } catch (err) {
    modalFout.value = err.message
  }
}

async function verwijder(g) {
  if (!confirm(`Verwijder ${g.voornaam} ${g.achternaam}?`)) return

  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`/api/admin/gebruikers/${g.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    await laadGebruikers()
  } catch (err) {
    alert('Fout: ' + err.message)
  }
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/')
}

onMounted(laadGebruikers)
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  font-family: Arial, Helvetica, sans-serif;
  background: #f0f4f8;
}

.sidebar {
  width: 200px;
  background: #29a8e0;
  display: flex;
  flex-direction: column;
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
  background: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #222;
  cursor: pointer;
  margin-bottom: 0.5rem;
  text-align: center;
}

.nav-item.active {
  background: white;
}

.nav-item:not(.active) {
  background: #d9d9d9;
}

.sidebar-footer {
  padding: 1rem 0.75rem;
}

.logout-btn {
  width: 100%;
  background: #d9d9d9;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.topbar {
  background: white;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.topbar-user {
  background: #e8e8e8;
  border-radius: 6px;
  padding: 0.4rem 1rem;
  font-weight: 600;
  display: inline-block;
}

.content-area {
  padding: 1.5rem 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.page-header h2 {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
}

.filter-row {
  margin-bottom: 1rem;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.9rem;
  min-width: 180px;
}

.btn-primary {
  background: #29a8e0;
  color: white;
  border: none;
  padding: 0.55rem 1.1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover {
  background: #1d8cc4;
}

.status-message {
  padding: 1rem 0;
}

.status-message.error {
  color: #cc0000;
}

.account-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}

.account-table th {
  background: #29a8e0;
  color: white;
  text-align: left;
  padding: 0.6rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.account-table td {
  padding: 0.6rem 0.9rem;
  font-size: 0.9rem;
  border-bottom: 1px solid #eee;
}

.account-table tbody tr:hover {
  background: #f8fafc;
}

.acties {
  display: flex;
  gap: 0.5rem;
}

.btn-bewerken, .btn-verwijderen {
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 5px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-bewerken {
  background: #e0e0e0;
  color: #333;
}

.btn-bewerken:hover {
  background: #cfcfcf;
}

.btn-verwijderen {
  background: #f44336;
  color: white;
}

.btn-verwijderen:hover {
  background: #d33;
}

/* Badges */
.badge {
  padding: 0.25rem 0.65rem;
  border-radius: 5px;
  font-size: 0.78rem;
  font-weight: 700;
  color: white;
}

.badge-student { background: #2196f3; }
.badge-docent { background: #ff9800; }
.badge-stagementor { background: #4caf50; }
.badge-stagecomissie { background: #9c27b0; }
.badge-administratie { background: #607d8b; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  padding: 1.5rem 2rem;
  max-width: 480px;
  width: 90%;
}

.modal h3 {
  margin: 0 0 1rem;
  color: #111;
}

.form-group {
  margin-bottom: 0.85rem;
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #333;
}

.form-group input,
.form-group select {
  padding: 0.55rem 0.7rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 0.92rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn-cancel {
  background: #d9d9d9;
  color: #333;
  border: none;
  padding: 0.55rem 1.1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.error-msg {
  background: #fdecea;
  color: #cc0000;
  padding: 0.6rem 0.85rem;
  border-radius: 5px;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}
</style>