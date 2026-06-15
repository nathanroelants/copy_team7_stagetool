<template>
  <div class="dashboard-layout">

    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">STAGE.BE</span>
      </div>

      <nav class="sidebar-nav">
        <button class="nav-item" :class="{ active: pagina === 'logboek' }"    @click="pagina = 'logboek'">Logboek</button>
        <button class="nav-item" :class="{ active: pagina === 'stageinfo' }"  @click="pagina = 'stageinfo'">Stagevoorstel</button>
        <button class="nav-item" @click="$router.push('/stagementor/evaluatie')">Evaluatie</button>
        <button class="nav-item" :class="{ active: pagina === 'documenten' }" @click="pagina = 'documenten'">Documenten</button>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" @click="uitloggen">Uitloggen</button>
      </div>
    </aside>

    <main class="main-content">

      <header class="topbar">
        <div class="topbar-user">{{ mentor.naam }}</div>
        <img src="../../assets/erasmus-logo.png" alt="Erasmus Hogeschool Brussel" class="topbar-logo" />
      </header>

      <section class="content-area">

        <div v-if="pagina === 'logboek'">
          <div class="section-header">
            <h2>Logboek van {{ student.naam }}</h2>
            <p class="sectie-subtitel">Stageperiode: {{ student.startDatum }} – {{ student.eindDatum }} | {{ student.bedrijf }}</p>
          </div>

          <div v-if="weken.length === 0" class="status-message">Nog geen dagen ingevoerd door de student.</div>

          <div v-for="week in weken" :key="week.nummer" class="week-kaart">
            <div class="week-header">
              <div class="week-titel">
                Week {{ week.nummer }}
                <span class="badge" :class="statusKleur(week.status)">{{ week.status }}</span>
              </div>
              <div class="week-acties">
                <button
                  v-if="week.status === 'Ingediend'"
                  class="knop-groen"
                  @click="tekenAf(week)"
                >Aftekenen</button>
              </div>
            </div>

            <table class="dag-tabel">
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

            <div class="week-totaal">
              Totaal: <strong>{{ week.dagen.reduce((s, d) => s + d.uren, 0) }} uren</strong>
            </div>
          </div>
        </div>

        <div v-if="pagina === 'stageinfo'">
          <div class="section-header">
            <h2>Stagevoorstel</h2>
          </div>
          <div class="info-kaart">
            <div><strong>Student:</strong> {{ student.naam }}</div>
            <div><strong>Leergroep:</strong> {{ student.leergroep }}</div>
            <div><strong>Stageperiode:</strong> {{ student.startDatum }} – {{ student.eindDatum }}</div>
            <div><strong>Bedrijf:</strong> {{ student.bedrijf }}</div>
            <div><strong>Mentor:</strong> {{ student.mentor }}</div>
          </div>
        </div>

        <div v-if="pagina === 'evaluatie'">
          <div class="section-header">
            <h2>Evaluatie</h2>
          </div>
          <div class="info-kaart">
            <div><strong>Tussentijdse score:</strong> {{ evaluatie.tussentijds ?? '—' }}</div>
            <div><strong>Eindscore:</strong> {{ evaluatie.eind ?? '—' }}</div>
            <div><strong>Opmerking:</strong> {{ evaluatie.opmerking ?? '—' }}</div>
          </div>
        </div>

        <div v-if="pagina === 'documenten'">
          <div class="section-header">
            <h2>Documenten</h2>
          </div>
          <div v-if="documenten.length === 0" class="status-message">Geen documenten beschikbaar.</div>
          <div v-for="doc in documenten" :key="doc.naam" class="document-rij">
            <span>{{ doc.naam }}</span>
            <a :href="doc.url" target="_blank" class="knop-blauw">Downloaden</a>
          </div>
        </div>

      </section>
    </main>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'

export default {
  name: 'MentorLogboek',
  setup() {
    const pagina = ref('logboek')

    const mentor = reactive({
      naam: 'Mevr. Janssen',
    })

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
        status: 'Niet ingediend',
        dagen: [
          { datum: '08/09/2025', taak: 'Frontend taak', uren: 8, los: 'Vue componenten', reflectie: 'Vlot gegaan', leerpunten: 'Props en events' },
        ],
      },
    ])

    const evaluatie = reactive({ tussentijds: null, eind: null, opmerking: null })
    const documenten = reactive([])

    function statusKleur(status) {
      if (status === 'Afgetekend') return 'badge-groen'
      if (status === 'Ingediend')  return 'badge-blauw'
      return 'badge-grijs'
    }

    function tekenAf(week) {
      if (confirm(`Week ${week.nummer} aftekenen?`)) {
        week.status = 'Afgetekend'
      }
    }

    function uitloggen() {
      if (confirm('Bent u zeker dat u wilt uitloggen?')) {
        alert('U bent uitgelogd.')
      }
    }

    return {
      pagina, mentor, student, weken, evaluatie, documenten,
      statusKleur, tekenAf, uitloggen,
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

.nav-item:hover {
  background: #e0f0fb;
  color: #1a7ab5;
}

.nav-item.active {
  background: #e0f0fb;
  color: #1a7ab5;
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

.topbar-user {
  background: #e8e8e8;
  border-radius: 6px;
  padding: 0.4rem 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #222;
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
  margin-bottom: 1.25rem;
}

.section-header h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 0.25rem;
}

.sectie-subtitel {
  font-size: 0.85rem;
  color: #555;
  margin: 0;
}

.status-message {
  color: #555;
  padding: 1rem 0;
  font-size: 0.95rem;
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

.week-acties {
  display: flex;
  gap: 8px;
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

.info-kaart {
  background: white;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  color: #333;
}

.document-rij {
  background: white;
  border-radius: 8px;
  padding: 14px 18px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  font-size: 14px;
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

.knop-blauw {
  background: #29a8e0;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
}

.knop-blauw:hover {
  background: #1e90c0;
}

.knop-groen {
  background: #4caf50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}

.knop-groen:hover {
  background: #388e3c;
}
</style>