<template>
  <div class="dashboard-layout">

    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>
      </div>

      <nav class="sidebar-nav">
        <button class="nav-item" :class="{ active: pagina === 'logboek' }" @click="pagina = 'logboek'">Logboek</button>
        <button class="nav-item disabled" disabled>Stagevoorstel</button>
        <button class="nav-item disabled" disabled>Evaluatie</button>
        <button class="nav-item disabled" disabled>Documenten</button>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" @click="uitloggen">Uitloggen</button>
      </div>
    </aside>

    <main class="main-content">

      <header class="topbar">
        <div class="topbar-links">
          <div class="topbar-user">{{ docent.naam }}</div>
          <div class="topbar-role">Docent — alleen-lezen</div>
        </div>
        <img src="../../assets/erasmus-logo.png" alt="Erasmus Hogeschool Brussel" class="topbar-logo" />
      </header>

      <section class="content-area">

        <div v-if="pagina === 'logboek'">
          <div class="section-header">
            <h2>Logboek van {{ student.naam }}</h2>
            <p class="sectie-subtitel">Stageperiode: {{ student.startDatum }} – {{ student.eindDatum }} | {{ student.bedrijf }}</p>
          </div>

          <div class="readonly-banner">
            🔒 U bekijkt dit logboek als docent. U kunt geen wijzigingen aanbrengen.
          </div>

          <div class="student-selector">
            <label>Student:</label>
            <select v-model="geselecteerdeStudent">
              <option v-for="s in studenten" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div v-if="weken.length === 0" class="status-message">Nog geen dagen ingevoerd door de student.</div>

          <div v-for="week in weken" :key="week.nummer" class="week-kaart">
            <div class="week-header">
              <div class="week-titel">
                Week {{ week.nummer }}
                <span class="badge" :class="statusKleur(week.status)">{{ week.status }}</span>
              </div>
              <span v-if="week.status === 'Ingediend'" class="readonly-hint">Enkel stagementor kan aftekenen</span>
            </div>

            <div v-if="week.dagen.length === 0" class="status-message">Student heeft deze week nog niet ingediend.</div>

            <table v-else class="dag-tabel">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Taak</th>
                  <th>Uren</th>
                  <th>Leerdoelstelling</th>
                  <th>Reflectie</th>
                  <th>Leerpunten</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dag in week.dagen" :key="dag.datum">
                  <td>{{ dag.datum }}</td>
                  <td>{{ dag.taak }}</td>
                  <td>{{ dag.uren }}</td>
                  <td>{{ dag.los }}</td>
                  <td>{{ dag.reflectie }}</td>
                  <td>{{ dag.leerpunten }}</td>
                </tr>
              </tbody>
            </table>

            <div v-if="week.dagen.length > 0" class="week-totaal">
              Totaal: <strong>{{ week.dagen.reduce((s, d) => s + d.uren, 0) }} uren</strong>
            </div>
          </div>
        </div>

      </section>
    </main>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'

export default {
  name: 'DocentLogboek',
  setup() {
    const pagina = ref('logboek')

    const docent = reactive({
      naam: 'Prof. De Smedt',
    })

    const geselecteerdeStudent = ref('Nathan De Smedt')
    const studenten = ['Nathan De Smedt', 'Emma Claes', 'Lars Bogaert']

    const student = reactive({
      naam: 'Nathan De Smedt',
      leergroep: '3 Informatica',
      startDatum: '01/09/2025',
      eindDatum: '31/01/2026',
      bedrijf: 'TechCorp BV',
      mentor: 'Mevr. Janssen',
    })

    const weken = reactive([
      {
        nummer: 1,
        status: 'Ingediend',
        dagen: [
          { datum: '01/09/2025', taak: 'Introductie bedrijf', uren: 8, los: 'Kennismaking', reflectie: 'Goed ontvangen', leerpunten: 'Structuur bedrijf' },
          { datum: '02/09/2025', taak: 'Opzetten omgeving', uren: 8, los: 'Technische setup', reflectie: 'Veel geleerd', leerpunten: 'Git workflow' },
        ],
      },
      {
        nummer: 2,
        status: 'Afgetekend',
        dagen: [
          { datum: '08/09/2025', taak: 'Frontend taak', uren: 8, los: 'Vue componenten', reflectie: 'Vlot gegaan', leerpunten: 'Props en events' },
        ],
      },
      {
        nummer: 3,
        status: 'Niet ingediend',
        dagen: [],
      },
    ])

    function statusKleur(status) {
      if (status === 'Afgetekend') return 'badge-groen'
      if (status === 'Ingediend')  return 'badge-blauw'
      return 'badge-grijs'
    }

    function uitloggen() {
      if (confirm('Bent u zeker dat u wilt uitloggen?')) {
        alert('U bent uitgelogd.')
      }
    }

    return {
      pagina, docent, student, studenten, geselecteerdeStudent,
      weken, statusKleur, uitloggen,
    }
  },
}
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  font-family: Arial, Helvetica, sans-serif;
  background: #f0f4f8;
}

.sidebar {
  width: 180px;
  background: #29a8e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
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
  background: white;
  border: none;
  border-radius: 6px;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #222;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: background 0.15s;
}

.nav-item:hover,
.nav-item.active {
  background: #f0f0f0;
}

.nav-item.disabled {
  background: #e0e0e0;
  color: #aaa;
  cursor: not-allowed;
}

.nav-item.disabled:hover {
  background: #e0e0e0;
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

.logout-btn:hover {
  background: #f0f0f0;
}

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
  gap: 10px;
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
  background: #29a8e0;
  border-radius: 6px;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
}

.topbar-logo {
  height: 36px;
  object-fit: contain;
}

.content-area {
  padding: 1.5rem 2rem;
  overflow-y: auto;
}

.section-header {
  margin-bottom: 1rem;
}

.section-header h2 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 0.2rem;
}

.sectie-subtitel {
  font-size: 0.82rem;
  color: #555;
  margin: 0;
}

.readonly-banner {
  background: #FFF8E1;
  border: 1px solid #FFE082;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 12px;
  color: #795548;
  margin-bottom: 14px;
}

.readonly-hint {
  font-size: 11px;
  color: #aaa;
  font-style: italic;
}

.student-selector {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 14px;
}

.student-selector label {
  font-size: 12px;
  color: #555;
  font-weight: 600;
}

.student-selector select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  color: #333;
}

.status-message {
  color: #555;
  padding: 1rem 0;
  font-size: 0.9rem;
  font-style: italic;
}

.week-kaart {
  background: white;
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.week-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.week-titel {
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  display: flex;
  align-items: center;
  gap: 10px;
}

.week-totaal {
  margin-top: 12px;
  font-size: 13px;
  color: #555;
  text-align: right;
}

.dag-tabel {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.dag-tabel th {
  background: #f0f4ff;
  color: #111;
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
}

.dag-tabel td {
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  color: #333;
}

.dag-tabel tr:last-child td {
  border-bottom: none;
}

.badge {
  display: inline-block;
  padding: 0.3rem 0.75rem;
  border-radius: 5px;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.badge-groen { background: #4caf50; color: #fff; }
.badge-blauw { background: #2196f3; color: #fff; }
.badge-grijs  { background: #aaa;    color: #fff; }
</style>
