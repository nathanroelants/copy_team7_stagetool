<template>
  <div class="dashboard">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo">STAGE.BE</div>
      <nav>
  <button
    :class="{ active: activeView === 'mijn-stage' }"
    @click="activeView = 'mijn-stage'"
  >
    Mijn stage
  </button>

<button
  v-if="stageStatus === 'stagevoorstel geaccepteerd' || stageStatus === 'lopend' || stageStatus === 'afgerond'"
  @click="router.push('/studentlogboeken')"
>
  Logboeken
</button> 
     
<button
  v-if="stageStatus === 'stagevoorstel geaccepteerd' || stageStatus === 'lopend' || stageStatus === 'afgerond'"
  @click=" router.push('/student/evaluatie')"
>
  Evaluatie
</button>   
</nav>
      
      <button class="logout-btn" @click="handleLogout">Uitloggen</button>
    </aside>

    <!-- Main content -->
    <main class="main-content">
      <header class="topbar">
        <span class="user-name">{{ user?.voornaam }} {{ user?.achternaam }}</span>
      </header>

      <MijnStageView v-if="activeView === 'mijn-stage'" />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MijnStageView from './MijnStageView.vue'


const stageStatus = ref(null)

async function loadStageStatus() {
  const token = localStorage.getItem('token')
  try {
    const response = await fetch('/api/stagevoorstellen/mijn', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      stageStatus.value = data[0].status
    }
  } catch (err) {
    console.error(err)
  }
}

onMounted(loadStageStatus)

const router = useRouter()
const user = JSON.parse(localStorage.getItem('user'))
const activeView = ref('mijn-stage')

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<style scoped>
.dashboard {
  display: flex;
  min-height: 100vh;
  font-family: 'Segoe UI', sans-serif;
}

.sidebar {
  width: 200px;
  background: #4a90c9;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
}

.logo {
  background: #e0f0ff;
  color: #2c3e50;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 1.5rem;
}

nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

nav button {
  background: #e0e0e0;
  border: none;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  text-align: center;
  color: #333;
  transition: background 0.2s;
}

nav button:hover,
nav button.active {
  background: white;
  font-weight: 600;
}

.logout-btn {
  background: #e0e0e0;
  border: none;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  color: #333;
  margin-top: auto;
}

.main-content {
  flex: 1;
  background: #f5f5f5;
}

.topbar {
  background: white;
  padding: 1rem 2rem;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-name {
  font-weight: 600;
  color: #333;
}
</style>