<template>
  <div class="dashboard">
    <h1>Welkom, {{ user?.voornaam }}! 👋</h1>
    <p>Je bent ingelogd als <strong>{{ user?.rol }}</strong></p>
    <button @click="handleLogout">Uitloggen</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const user = JSON.parse(localStorage.getItem('user'))

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
</style>