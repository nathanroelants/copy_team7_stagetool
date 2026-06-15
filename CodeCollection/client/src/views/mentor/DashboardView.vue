<template>
  <div class="dashboard">
    <h1>Welkom, {{ user?.voornaam }}! 👋</h1>
    <p>Je bent ingelogd als <strong>{{ user?.rol }}</strong></p>

    <!-- stage ondertekenen ADD THIS BUTTON - Replace with your actual stage ID -->
    <button @click="goToOndertekenen(1)" class="btn-ondertekenen">
      ✍ Stage ondertekenen
    </button>

    <button @click="handleLogout">Uitloggen</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const user = JSON.parse(localStorage.getItem('user'))

function goToOndertekenen(stageId) {
  router.push(`/mentor/stages/${stageId}/ondertekenen`)
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-family: sans-serif;
}

button {
  padding: 0.5rem 1.5rem;
  background: #cc0000;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

/* Signing button for mentor */
.btn-ondertekenen {
  padding: 0.5rem 1.5rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-ondertekenen:hover {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.btn-ondertekenen:active {
  transform: translateY(0);
}

/* If you want to add a loading/disabled state */
.btn-ondertekenen:disabled {
  background: #cccccc;
  cursor: not-allowed;
  transform: none;
}
</style>