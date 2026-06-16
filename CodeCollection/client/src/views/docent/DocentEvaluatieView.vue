<template>
  <div class="dashboard-layout">

    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>
      </div>

      <nav class="sidebar-nav">
        <button class="nav-item" @click="router.push('/docent/logboeken')">Logboek</button>
        <button class="nav-item disabled" disabled>Stagevoorstel</button>
        <button class="nav-item active">Evaluatie</button>
        <button class="nav-item disabled" disabled>Documenten</button>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">Uitloggen</button>
      </div>
    </aside>

    <main class="main-content">

      <header class="topbar">
        <div class="topbar-links">
          <div class="topbar-user">{{ gebruikerNaam }}</div>
          <div class="topbar-role">Docent — alleen-lezen</div>
        </div>
        <img src="../../assets/erasmus-logo.png" alt="Erasmus Hogeschool Brussel" class="topbar-logo" />
      </header>

      <section class="content-area">

        <div class="tabs-rij">
          <div class="tabs">
            <button
              :class="['tab-btn', { active: actieveTab === 'tussentijds' }]"
              @click="actieveTab = 'tussentijds'"
            >
              Tussentijds
            </button>
            <button
              :class="['tab-btn', { active: actieveTab === 'eindevaluatie' }]"
              @click="actieveTab = 'eindevaluatie'"
            >
              Eindevaluatie
            </button>
          </div>

          <button
            class="eind-toggle"
            :class="{ open: eindevaluatieOpen }"
            @click="toggleEindevaluatie"
            :disabled="bezig"
          >
            {{ eindevaluatieOpen ? '✓ Eindevaluatie staat open' : 'Eindevaluatie openzetten' }}
          </button>
        </div>

        <div v-if="loading" class="status-message">Evaluaties laden...</div>
        <div v-else-if="fout" class="status-message error">{{ fout }}</div>

        <div v-else class="rubriek-tabel">

          <div class="rubriek-header">
            <div class="col-criteria">Criteria</div>
            <div class="col-eval">Zelfevaluatie (student)</div>
            <div class="col-eval">Evaluatie (stagementor)</div>
          </div>

          <div
            v-for="(competentie, index) in competenties"
            :key="competentie.id"
            class="rubriek-rij"
          >
            <div class="col-criteria">
              <span class="lo-badge">LO{{ index + 1 }}</span>
              <span class="lo-naam">{{ competentie.naam }}</span>
            </div>

            <div class="col-eval">
              <template v-if="getStudentEvaluatie(competentie.id)">
                <div class="score-badge">{{ getStudentEvaluatie(competentie.id).score }} / 5</div>
                <p class="feedback-tekst">{{ getStudentEvaluatie(competentie.id).feedback }}</p>
              </template>
              <p v-else class="leeg-tekst">Nog niet ingevuld</p>
            </div>

            <div class="col-eval">
              <template v-if="getMentorEvaluatie(competentie.id)">
                <div class="score-badge">{{ getMentorEvaluatie(competentie.id).score }} / 5</div>
                <p class="feedback-tekst">{{ getMentorEvaluatie(competentie.id).feedback }}</p>
              </template>
              <p v-else class="leeg-tekst">Nog niet ingevuld</p>
            </div>

          </div>
        </div>

      </section>
    </main>
  </div>
</template>

<script setup>
import { useDocentEvaluatie } from './useDocentEvaluatie.js'
import { useRouter, useRoute } from 'vue-router'
const router = useRouter()
const route = useRoute()
const {
  gebruikerNaam,
  actieveTab,
  eindevaluatieOpen,
  competenties,
  evaluaties,
  loading,
  fout,
  bezig,
  scoreOpties,
  getStudentEvaluatie,
  getMentorEvaluatie,
  toggleEindevaluatie,
  handleLogout,
} = useDocentEvaluatie(route.params.studentId)
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}
</style>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: Arial, Helvetica, sans-serif;
}

.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background: #f0f4f8;
}

.sidebar {
  width: 180px;
  background: #29a8e0;
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
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
  transition: background 0.15s;
}

.nav-item:hover {
  background: #e0f0fb;
  color: #1a7ab5;
}

.nav-item.active {
  background: #e0f0fb;
  color: #1a7ab5;
}

.nav-item.disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

.logout-btn:hover { background: #f0f0f0; }

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  background: white;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
}

.topbar-links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.topbar-user {
  background: #e8e8e8;
  border-radius: 6px;
  padding: 0.4rem 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #222;
}

.topbar-role {
  font-size: 0.8rem;
  font-weight: 600;
  color: #888;
}

.topbar-logo {
  height: 36px;
  object-fit: contain;
}

.content-area {
  padding: 1.5rem 2rem;
  overflow-y: auto;
  flex: 1;
}

.tabs-rij {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.tabs {
  display: flex;
  gap: 0;
  background: white;
  border-radius: 8px;
  padding: 0.3rem;
  width: fit-content;
  border: 1px solid #e0e0e0;
}

.tab-btn {
  background: none;
  border: none;
  padding: 0.6rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #888;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: #29a8e0;
}

.tab-btn.active {
  background: #29a8e0;
  color: white;
}

.eind-toggle {
  background: white;
  color: #29a8e0;
  border: 2px solid #29a8e0;
  border-radius: 6px;
  padding: 0.55rem 1.25rem;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.eind-toggle:hover:not(:disabled) {
  background: #e0f0fb;
}

.eind-toggle.open {
  background: #43a047;
  color: white;
  border-color: #43a047;
}

.eind-toggle:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-message {
  color: #888;
  padding: 2rem 0;
  font-size: 0.95rem;
  text-align: center;
}

.status-message.error { color: #e53935; }

.rubriek-tabel {
  width: 100%;
  border: 1px solid #d0d0d0;
  border-radius: 10px;
  overflow: hidden;
  background: white;
}

.rubriek-header,
.rubriek-rij {
  display: grid;
  grid-template-columns: 200px 1fr 1fr;
  border-bottom: 1px solid #e0e0e0;
}

.rubriek-rij:last-child {
  border-bottom: none;
}

.rubriek-header {
  background: #29a8e0;
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
}

.rubriek-header > div {
  padding: 0.75rem;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
}

.col-criteria {
  color: black;
  padding: 0.85rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  border-right: 1px solid #e0e0e0;
  background: #f0f4f8;
}

.lo-badge {
  font-size: 0.72rem;
  font-weight: 800;
  color: white;
  background: #29a8e0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  width: fit-content;
}

.lo-naam {
  font-size: 0.88rem;
  font-weight: 600;
  color: #222;
}

.col-eval {
  padding: 0.85rem 0.9rem;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.col-eval:last-child {
  border-right: none;
}

.score-badge {
  font-size: 0.82rem;
  font-weight: 800;
  color: #1a7ab5;
  background: #e0f0fb;
  padding: 0.25rem 0.6rem;
  border-radius: 5px;
  width: fit-content;
}

.feedback-tekst {
  font-size: 0.88rem;
  color: #333;
  line-height: 1.5;
}

.leeg-tekst {
  font-size: 0.85rem;
  color: #aaa;
  font-style: italic;
}
</style>
