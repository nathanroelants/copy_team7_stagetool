<template>
  <div class="dashboard-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-item" @click="router.push('/mentor')">Dashboard</button>
        <button class="nav-item active">Evaluatie</button>
        <button class="nav-item" @click="router.push('/mentor/logboeken')">Logboeken</button>
        <button class="nav-item" @click="router.push('/mentor/documenten')">Documenten</button>
      </nav>
      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">Uitloggen</button>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="topbar-user">{{ gebruikerNaam }}</div>
        <img src="../../assets/erasmus-logo.png" alt="Erasmus Hogeschool Brussel" class="topbar-logo" />
      </header>

      <section class="content-area">
        <!-- Student selector -->
        <div class="student-selector">
          <button class="back-btn" @click="router.go(-1)">
            ← Terug naar studentenlijst
          </button>
          <h2>Evaluatie voor: {{ studentNaam }}</h2>
        </div>

        <!-- Geen evaluatie actief -->
        <div v-if="evaluatieStatus === 'geen'" class="geblokkeerd-melding">
          Er is momenteel geen evaluatie beschikbaar voor deze student. Wacht tot de docent een fase activeert.
        </div>

        <template v-else>
          <!-- Tabs -->
          <div class="tabs">
            <button
              v-if="tussentijdsZichtbaar"
              :class="['tab-btn', { active: actieveTab === 'tussentijds' }]"
              @click="actieveTab = 'tussentijds'"
            >
              Tussentijds
            </button>
            <button
              :class="['tab-btn', { active: actieveTab === 'eindevaluatie' }, { geblokkeerd: !eindevaluatieZichtbaar }]"
              @click="eindevaluatieZichtbaar && (actieveTab = 'eindevaluatie')"
            >
              Eindevaluatie
            </button>
          </div>

          <!-- Statusmeldingen per situatie -->
          <div v-if="actieveTab === 'tussentijds' && !tussentijdsBewerkbaar" class="geblokkeerd-melding">
            De tussentijdse evaluatie kan niet meer bewerkt worden.
          </div>
          <div v-if="actieveTab === 'eindevaluatie' && !eindevaluatieZichtbaar" class="geblokkeerd-melding">
            Eindevaluatie is nog niet beschikbaar. Wacht tot de docent dit activeert.
          </div>
          <div v-if="actieveTab === 'eindevaluatie' && eindevaluatieZichtbaar && !eindevaluatieBewerkbaar" class="geblokkeerd-melding">
            De eindevaluatie kan niet meer bewerkt worden.
          </div>

          <div v-if="loading" class="status-message">Competenties laden...</div>
          <div v-else-if="fout" class="status-message error">{{ fout }}</div>

          <div v-else :class="['rubriek-tabel', { 'eindevaluatie-bg': actieveTab === 'eindevaluatie' }]">
            <div class="rubriek-header">
              <div class="col-criteria">Criteria</div>
              <div class="col-score" v-for="optie in scoreOpties" :key="optie.waarde">
                <span class="score-punten">{{ optie.waarde }} punten</span>
                <span class="score-label">{{ optie.label }}</span>
              </div>
              <div class="col-zelfevaluatie">Student zelfevaluatie</div>
              <div class="col-mentor-feedback">Mentor feedback</div>
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

              <div
                class="col-score"
                v-for="optie in scoreOpties"
                :key="optie.waarde"
                :class="{
                  geselecteerd: Number(getStudentEvaluatie(competentie.id)?.score) === optie.waarde,
                  mentorGeselecteerd: Number(getMentorEvaluatie(competentie.id)?.score) === optie.waarde
                }"
              >
                <p class="optie-beschrijving">{{ optie.beschrijving }}</p>
                <input
                  type="radio"
                  :name="'score-student-' + competentie.id"
                  :value="optie.waarde"
                  :checked="Number(getStudentEvaluatie(competentie.id)?.score) === optie.waarde"
                  disabled
                />
              </div>

              <div class="col-zelfevaluatie">
                <textarea
                  class="tekstvak"
                  placeholder="Student zelfevaluatie..."
                  :value="getStudentEvaluatie(competentie.id)?.feedback || ''"
                  disabled
                ></textarea>
              </div>

              <div class="col-mentor-feedback">
                <textarea
                  class="tekstvak mentor-tekstvak"
                  placeholder="Jouw feedback voor de student..."
                  :value="getMentorEvaluatie(competentie.id)?.feedback || ''"
                  @input="setFeedback(competentie.id, $event.target.value)"
                  :disabled="!huidigeBewerkbaar || opgeslagen[`${competentie.id}_${actieveTab}`]"
                ></textarea>
                <div class="opslaan-rij">
                  <button
                    v-if="huidigeBewerkbaar && !opgeslagen[`${competentie.id}_${actieveTab}`]"
                    class="opslaan-btn"
                    @click="slaOp(competentie.id)"
                    :disabled="bezig[competentie.id]"
                  >
                    {{ bezig[competentie.id] ? 'Opslaan...' : 'Opslaan' }}
                  </button>
                  <button
                    v-if="huidigeBewerkbaar && opgeslagen[`${competentie.id}_${actieveTab}`]"
                    class="bewerken-btn"
                    @click="opgeslagen[`${competentie.id}_${actieveTab}`] = false"
                  >
                    Bewerken
                  </button>
                  <span v-if="opgeslagen[`${competentie.id}_${actieveTab}`]" class="opgeslagen-melding">✓ Opgeslagen</span>
                  <span v-if="foutMelding[competentie.id]" class="fout-melding">{{ foutMelding[competentie.id] }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup>
import { useMentorEvaluatie } from './useMentorEvaluatie.js'
import { useRouter } from 'vue-router'
const router = useRouter()
const {
  gebruikerNaam,
  studentNaam,
  actieveTab,
  evaluatieStatus,
  tussentijdsZichtbaar,
  eindevaluatieZichtbaar,
  tussentijdsBewerkbaar,
  eindevaluatieBewerkbaar,
  huidigeBewerkbaar,
  openCompetentie,
  competenties,
  evaluaties,
  loading,
  fout,
  bezig,
  opgeslagen,
  foutMelding,
  scoreOpties,
  toggleCompetentie,
  getEvaluatie,
  getStudentEvaluatie,
  getMentorEvaluatie,
  slaOp,
  handleLogout,
} = useMentorEvaluatie()
</script>

<style scoped>
/* Voeg deze stijlen toe aan je bestaande CSS */
.student-selector {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border-left: 4px solid #29a8e0;
}

.student-selector h2 {
  color: #29a8e0;
  margin-top: 0.5rem;
}

.back-btn {
  background: #29a8e0;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 0.5rem;
}

.back-btn:hover {
  opacity: 0.88;
}

.rubriek-header {
  grid-template-columns: 150px repeat(3, 1fr) 300px 300px !important;
}

.rubriek-rij {
  grid-template-columns: 150px repeat(3, 1fr) 300px 300px !important;
}

.col-mentor-feedback {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mentor-tekstvak {
  background: #fff9e6;
  border-color: #ffd54f;
}

.col-score.mentorGeselecteerd {
  background: #fff9e6;
  border-left: 3px solid #ffd54f;
}

.col-score.geselecteerd {
  background: #e8f5e9;
  border-left: 3px solid #43a047;
}
</style>
