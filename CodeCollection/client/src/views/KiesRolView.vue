<template>
  <div class="kies-rol-pagina">
    <header class="topbar">
      <div class="brand">STAGE.BE</div>
      <button class="uitloggen-btn" @click="handleLogout">Uitloggen</button>
    </header>

    <main class="inhoud">
      <h1 class="welkom">Welkom, {{ voornaam }}! Kies een rol om door te gaan.</h1>

      <div class="rollen-grid">
        <button
          v-for="rol in beschikbareRollen"
          :key="rol.sleutel"
          class="rol-card"
          @click="kiesRol(rol.sleutel)"
        >
          <div class="rol-naam">{{ rol.label }}</div>
          <div class="rol-beschrijving">{{ rol.beschrijving }}</div>
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const rolInfo = {
  student:        { label: 'Student',        beschrijving: 'Bekijk je stage en logboeken',              pad: '/student' },
  docent:         { label: 'Docent',          beschrijving: 'Volg de voortgang van je studenten',        pad: '/docent' },
  stagementor:    { label: 'Stagementor',     beschrijving: 'Begeleid en teken logboeken af',            pad: '/stagementor' },
  stagecommissie: { label: 'Stagecommissie',  beschrijving: 'Beheer stagevoorstellen en evaluaties',     pad: '/stagecommissie' },
  administratie:  { label: 'Administratie',   beschrijving: 'Beheer accounts en competenties',           pad: '/administratie' },
}

const user = computed(() => JSON.parse(localStorage.getItem('user') || '{}'))
const voornaam = computed(() => user.value.voornaam || user.value.naam || '')

const beschikbareRollen = computed(() => {
  const rollen = user.value.rollen || (user.value.rol ? [user.value.rol] : [])
  return rollen
    .filter(r => rolInfo[r])
    .map(r => ({ sleutel: r, ...rolInfo[r] }))
})

function kiesRol(rol) {
  const info = rolInfo[rol]
  if (info) router.push(info.pad)
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/')
}
</script>

<style scoped>
.kies-rol-pagina {
  min-height: 100vh;
  background: #f5f7fa;
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
  flex-direction: column;
}

.topbar {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 0.75rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  font-size: 1.5rem;
  font-weight: 900;
  color: #29a8e0;
  letter-spacing: 0.04em;
}

.uitloggen-btn {
  background: #ffeaea;
  color: #cc0000;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.uitloggen-btn:hover { background: #ffdada; }

.inhoud {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
}

.welkom {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 2.5rem;
  text-align: center;
}

.rollen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
  max-width: 900px;
  width: 100%;
}

.rol-card {
  background: white;
  border: none;
  border-top: 3px solid #29a8e0;
  border-radius: 8px;
  padding: 1.5rem 1.25rem;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.15s, transform 0.1s;
}

.rol-card:hover {
  box-shadow: 0 6px 18px rgba(41, 168, 224, 0.18);
  transform: translateY(-2px);
}

.rol-naam {
  font-size: 1.05rem;
  font-weight: 700;
  color: #29a8e0;
  margin-bottom: 0.5rem;
}

.rol-beschrijving {
  font-size: 0.88rem;
  color: #555;
  line-height: 1.4;
}
</style>
