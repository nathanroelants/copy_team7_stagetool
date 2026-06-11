<template>
  <div class="logboek">

    <div class="topbar">
      <span class="topbar-titel">Student Logboek</span>
      <span class="topbar-naam">{{ mentor.naam }}</span>
      <span class="topbar-logo">erasmus</span>
    </div>

    <div class="layout">

      <div class="sidebar">
        <div class="sidebar-logo">STAGE.BE</div>
        <button class="sidebar-knop" :class="{ actief: pagina === 'logboek' }"    @click="pagina = 'logboek'">Logboek</button>
        <button class="sidebar-knop" :class="{ actief: pagina === 'stageinfo' }"  @click="pagina = 'stageinfo'">Stagevoorstel</button>
        <button class="sidebar-knop" :class="{ actief: pagina === 'evaluatie' }"  @click="pagina = 'evaluatie'">Evaluatie</button>
        <button class="sidebar-knop" :class="{ actief: pagina === 'documenten' }" @click="pagina = 'documenten'">Documenten</button>
        <button class="sidebar-knop sidebar-uitloggen" @click="uitloggen">Uitloggen</button>
      </div>

      <div class="pagina-inhoud">

        <div v-if="pagina === 'logboek'">
          <div class="logboek-header">
            <div>
              <div class="pagina-titel">Logboek van {{ student.naam }}</div>
              <div class="pagina-subtitel">Stageperiode: {{ student.startDatum }} – {{ student.eindDatum }} | {{ student.bedrijf }}</div>
            </div>
          </div>

          <div v-if="weken.length === 0" class="leeg-bericht">Nog geen dagen ingevoerd door de student.</div>

          <div v-for="week in weken" :key="week.nummer" class="week-kaart">
            <div class="week-header">
              <div class="week-titel">
                Week {{ week.nummer }}
                <span class="status-badge" :class="statusKleur(week.status)">{{ week.status }}</span>
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
          <div class="pagina-titel">Stagevoorstel</div>
          <div class="info-kaart">
            <div><strong>Student:</strong> {{ student.naam }}</div>
            <div><strong>Leergroep:</strong> {{ student.leergroep }}</div>
            <div><strong>Stageperiode:</strong> {{ student.startDatum }} – {{ student.eindDatum }}</div>
            <div><strong>Bedrijf:</strong> {{ student.bedrijf }}</div>
            <div><strong>Mentor:</strong> {{ student.mentor }}</div>
          </div>
        </div>

        <div v-if="pagina === 'evaluatie'">
          <div class="pagina-titel">Evaluatie</div>
          <div class="info-kaart">
            <div><strong>Tussentijdse score:</strong> {{ evaluatie.tussentijds ?? '—' }}</div>
            <div><strong>Eindscore:</strong> {{ evaluatie.eind ?? '—' }}</div>
            <div><strong>Opmerking:</strong> {{ evaluatie.opmerking ?? '—' }}</div>
          </div>
        </div>

        <div v-if="pagina === 'documenten'">
          <div class="pagina-titel">Documenten</div>
          <div v-if="documenten.length === 0" class="leeg-bericht">Geen documenten beschikbaar.</div>
          <div v-for="doc in documenten" :key="doc.naam" class="document-rij">
            <span>{{ doc.naam }}</span>
            <a :href="doc.url" target="_blank" class="knop-blauw">Downloaden</a>
          </div>
        </div>

      </div>
    </div>
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

    const evaluatie = reactive({
      tussentijds: null,
      eind: null,
      opmerking: null,
    })

    const documenten = reactive([])

    function statusKleur(status) {
      if (status === 'Afgetekend')    return 'status-groen'
      if (status === 'Ingediend')     return 'status-blauw'
      return 'status-grijs'
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
      pagina,
      mentor,
      student,
      weken,
      evaluatie,
      documenten,
      statusKleur,
      tekenAf,
      uitloggen,
    }
  },
}
</script>

<style scoped>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

.logboek {
  font-family: 'Segoe UI', sans-serif;
  background: #f4f6fb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  background: #1e3a5f;
  color: white;
  padding: 14px 28px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.topbar-titel {
  font-size: 18px;
  font-weight: 700;
  flex: 1;
}

.topbar-naam {
  font-size: 14px;
  opacity: 0.85;
}

.topbar-logo {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.layout {
  display: flex;
  flex: 1;
}

.sidebar {
  width: 200px;
  background: #ffffff;
  border-right: 1px solid #dde3f0;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-logo {
  font-size: 16px;
  font-weight: 700;
  color: #1e3a5f;
  padding: 0 20px 16px 20px;
  border-bottom: 1px solid #eee;
  margin-bottom: 8px;
}

.sidebar-knop {
  background: none;
  border: none;
  border-left: 3px solid transparent;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 14px;
  color: #444;
  text-align: left;
  width: 100%;
  transition: background 0.2s;
}

.sidebar-knop:hover {
  background: #f0f4ff;
}

.sidebar-knop.actief {
  background: #e8eeff;
  border-left: 3px solid #3b6fd4;
  color: #1e3a5f;
  font-weight: 600;
}

.sidebar-uitloggen {
  margin-top: auto;
  color: #c0392b;
}

.pagina-inhoud {
  flex: 1;
  padding: 28px 32px;
}

.pagina-titel {
  font-size: 22px;
  font-weight: 700;
  color: #1e3a5f;
  margin-bottom: 4px;
}

.pagina-subtitel {
  font-size: 13px;
  color: #888;
  margin-bottom: 20px;
}

.logboek-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.leeg-bericht {
  color: #888;
  font-style: italic;
  margin-top: 20px;
}

.week-kaart {
  background: white;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.week-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.week-titel {
  font-size: 16px;
  font-weight: 700;
  color: #1e3a5f;
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

.status-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 600;
}

.status-groen { background: #d4edda; color: #1a7a3a; }
.status-blauw { background: #d0e4ff; color: #1e3a5f; }
.status-grijs  { background: #e9ecef; color: #666; }

.dag-tabel {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.dag-tabel th {
  background: #f0f4ff;
  color: #1e3a5f;
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
  padding: 20px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  color: #333;
  margin-top: 12px;
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

.knop-blauw {
  background: #3b6fd4;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.knop-blauw:hover {
  background: #2d58b0;
}

.knop-groen {
  background: #1a7a3a;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.knop-groen:hover {
  background: #145e2d;
}
</style>