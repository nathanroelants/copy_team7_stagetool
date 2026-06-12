<template>
  <div class="logboek">

    <div class="topbar">
      <span class="topbar-titel">Student Logboek</span>
      <span class="topbar-naam">{{ student.naam }}</span>
      <span class="topbar-logo">erasmus</span>
    </div>

    <div class="layout">

      <div class="sidebar">
        <div class="sidebar-logo">STAGE.BE</div>
        <button class="sidebar-knop">Stagevoorstel</button>
        <button class="sidebar-knop actief">Logboek</button>
        <button class="sidebar-knop">Evaluatie</button>
        <button class="sidebar-knop">Documenten</button>
        <div class="sidebar-spacer"></div>
        <button class="sidebar-knop uitloggen" @click="uitloggen">Uitloggen</button>
      </div>

      <div class="inhoud">

        <!-- LOGBOEK -->
        <div>
          <div class="logboek-header">
            <div>
              <div class="pagina-titel">Mijn logboek</div>
              <div class="pagina-sub">Stageperiode: {{ student.startDatum }} – {{ student.eindDatum }} | {{ student.bedrijf }}</div>
            </div>
            <button class="knop-blauw" @click="openDagModal">+ Nieuwe dag</button>
          </div>

          <div v-if="weken.length === 0" class="leeg-bericht">Nog geen dagen ingevoerd. Klik op "+ Nieuwe dag" om te starten.</div>

          <div v-for="(week, wi) in weken" :key="wi" class="week-blok">
            <div class="week-header" :class="{ open: week.open }" @click="week.open = !week.open">
              <span class="week-naam">Week {{ week.nummer }} — {{ week.van }} – {{ week.tot }}</span>
              <span class="week-uren">{{ totaalUren(week) }}/{{ week.maxUren }}u</span>
              <span class="status-badge" :class="statusKleur(week.status)">{{ week.status }}</span>
              <span class="week-pijl">{{ week.open ? '▲' : '▼' }}</span>
            </div>

            <div v-if="week.open" class="week-body">
              <div class="entry-titel">Dagen — Week {{ week.nummer }} ({{ totaalUren(week) }}/{{ week.maxUren }}u)</div>
              <table class="entry-tabel">
                <thead>
                  <tr>
                    <th class="kol-datum">Datum</th>
                    <th class="kol-taak">Taak</th>
                    <th class="kol-uren">Uren</th>
                    <th class="kol-los">LO's</th>
                    <th class="kol-knop"></th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="(entry, ei) in week.entries" :key="ei">
                    <tr class="entry-rij">
                      <td>{{ entry.datum }}</td>
                      <td>{{ entry.taak }}</td>
                      <td>{{ entry.uren }}u</td>
                      <td>{{ entry.los }}</td>
                      <td>
                        <button class="knop-blauw klein" @click="entry.open = !entry.open">
                          {{ entry.open ? 'Sluiten' : 'Bekijk' }}
                        </button>
                      </td>
                    </tr>
                    <tr v-if="entry.open" class="entry-detail-rij">
                      <td colspan="5">
                        <div class="entry-detail">
                          <div class="detail-kolom">
                            <div class="detail-naam">{{ entry.taak }}</div>
                            <div class="detail-label">Beschrijving taken</div>
                            <div class="lo-badges">
                              <span v-for="lo in entry.losArray" :key="lo" class="lo-badge">{{ lo }}</span>
                            </div>
                            <div class="detail-label">Behaalde competenties</div>
                          </div>
                          <div class="detail-kolom">
                            <div class="detail-waarde">{{ entry.reflectie || '—' }}</div>
                            <div class="detail-label">Reflectie</div>
                          </div>
                          <div class="detail-kolom">
                            <div class="detail-waarde">{{ entry.leerpunten || '—' }}</div>
                            <div class="detail-label">Leerpunten</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
              <div class="week-footer">
                <button class="knop-blauw" @click="weekIndienen(wi)">Week indienen</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- MODAL: Nieuwe dag -->
    <div class="modal-overlay" v-if="toonDagModal" @click.self="toonDagModal = false">
      <div class="modal">
        <h3>+ Nieuwe dag toevoegen</h3>
        <label>Datum</label>
        <input type="date" v-model="dagForm.datum" />
        <label>Taak / activiteit</label>
        <input type="text" v-model="dagForm.taak" placeholder="bv. API-integratie klantportaal" />
        <label>Aantal uren</label>
        <input type="number" v-model.number="dagForm.uren" min="0" max="10" />
        <label>LO's (komma-gescheiden)</label>
        <input type="text" v-model="dagForm.los" placeholder="bv. LO2: IT-oplossingen, LO4: Technologie" />
        <label>Beschrijving / reflectie</label>
        <textarea v-model="dagForm.reflectie" placeholder="Wat heb je gedaan en geleerd?"></textarea>
        <label>Leerpunten</label>
        <textarea v-model="dagForm.leerpunten" placeholder="Verbeterpunten of opmerkingen..."></textarea>
        <div class="modal-acties">
          <button class="knop-grijs" @click="toonDagModal = false">Annuleren</button>
          <button class="knop-blauw" @click="slaDagOp">Opslaan</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, reactive } from 'vue'

export default {
  name: 'Logboek',
  setup() {
    const toonDagModal = ref(false)

    const student = reactive({
      naam: 'Nathan Roelaerts',
      leergroep: 'Leergroep IVI',
      startDatum: '02/02/2026',
      eindDatum: '29/05/2026',
      bedrijf: 'Cronos Group NV',
      mentor: 'Jan Janssen',
      adres: 'Industrielaan 5, 2000 Antwerpen',
    })

    const weken = reactive([
      {
        nummer: 1, van: '02/02', tot: '08/02/2026', maxUren: 40,
        status: 'Afgehandeld', open: false,
        entries: [
          { datum: '02/02', taak: 'Kennismaking team', uren: 8, los: 'LO5: Communiceren', reflectie: 'Eerste dag op de werkvloer.', leerpunten: 'Geen problemen.', losArray: ['LO5: Communiceren'], open: false },
          { datum: '03/02', taak: 'Omgeving installeren', uren: 8, los: 'LO2: IT-oplossingen', reflectie: 'Node, Vue en Git opgezet.', leerpunten: 'Kleine versieconflicten opgelost.', losArray: ['LO2: IT-oplossingen'], open: false },
        ],
      },
      {
        nummer: 2, van: '09/02', tot: '15/02/2026', maxUren: 40,
        status: 'Afgehandeld', open: false,
        entries: [
          { datum: '09/02', taak: 'Dashboard front-end', uren: 8, los: 'LO2: IT-oplossingen, LO4: Technologie', reflectie: 'Vue componenten gebouwd.', leerpunten: 'Geen problemen.', losArray: ['LO2: IT-oplossingen', 'LO4: Technologie'], open: false },
          { datum: '10/02', taak: 'Unit tests schrijven', uren: 8, los: 'LO3: Implementatie', reflectie: 'Jest opgezet voor de componenten.', leerpunten: '', losArray: ['LO3: Implementatie'], open: false },
        ],
      },
      {
        nummer: 3, van: '16/02', tot: '22/02/2026', maxUren: 40,
        status: 'in afwachting', open: true,
        entries: [
          { datum: '19/02', taak: 'API-integratie klantportaal', uren: 8, los: 'LO2: IT-oplossingen, LO4: Technologie', reflectie: 'Geleerd hoe REST API werkt.', leerpunten: 'Geen problemen.', losArray: ['LO2: IT-oplossingen', 'LO4: Technologie'], open: false },
          { datum: '18/02', taak: 'Database design', uren: 8, los: 'LO2: IT-oplossingen', reflectie: 'Schema opgemaakt in MySQL.', leerpunten: '', losArray: ['LO2: IT-oplossingen'], open: false },
        ],
      },
    ])

    const dagForm = reactive({ datum: '', taak: '', uren: 8, los: '', reflectie: '', leerpunten: '' })

    function totaalUren(week) {
      return week.entries.reduce((som, e) => som + (e.uren || 0), 0)
    }

    function statusKleur(s) {
      if (s === 'Afgehandeld') return 'groen'
      if (s === 'ingediend')   return 'oranje'
      if (s === 'afgekeurd')   return 'rood'
      return 'blauw'
    }

    function weekIndienen(wi) {
      weken[wi].status = 'ingediend'
    }

    function getMaandag(dateObj) {
      const d = new Date(dateObj)
      const dag = d.getDay()
      const diff = dag === 0 ? -6 : 1 - dag
      d.setDate(d.getDate() + diff)
      return d
    }

    function formatDatum(dateObj) {
      const dd = String(dateObj.getDate()).padStart(2, '0')
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
      return dd + '/' + mm
    }

    function formatDatumVolledig(dateObj) {
      return formatDatum(dateObj) + '/' + dateObj.getFullYear()
    }

    function slaDagOp() {
      if (!dagForm.datum) return

      const gekozenDatum = new Date(dagForm.datum)
      const maandag = getMaandag(gekozenDatum)

      const zondag = new Date(maandag)
      zondag.setDate(zondag.getDate() + 6)

      const weekVan = formatDatum(maandag)
      const weekTot = formatDatumVolledig(zondag)

      const losArray = dagForm.los.split(',').map(s => s.trim()).filter(Boolean)

      const dd = String(gekozenDatum.getDate()).padStart(2, '0')
      const mm = String(gekozenDatum.getMonth() + 1).padStart(2, '0')
      const datumLabel = dd + '/' + mm

      const nieuweEntry = {
        datum: datumLabel,
        taak: dagForm.taak,
        uren: dagForm.uren,
        los: dagForm.los,
        reflectie: dagForm.reflectie,
        leerpunten: dagForm.leerpunten,
        losArray,
        open: false,
      }

      const bestaand = weken.find(w => w.van === weekVan)
      if (bestaand) {
        bestaand.entries.push(nieuweEntry)
        bestaand.open = true
      } else {
        weken.push({
          nummer: weken.length + 1,
          van: weekVan,
          tot: weekTot,
          maxUren: 40,
          status: 'in afwachting',
          open: true,
          entries: [nieuweEntry],
        })
        weken.sort((a, b) => {
          const [daA, maA] = a.van.split('/').map(Number)
          const [daB, maB] = b.van.split('/').map(Number)
          if (maA !== maB) return maA - maB
          return daA - daB
        })
        weken.forEach((w, i) => { w.nummer = i + 1 })
      }

      Object.assign(dagForm, { datum: '', taak: '', uren: 8, los: '', reflectie: '', leerpunten: '' })
      toonDagModal.value = false
    }

    function openDagModal() {
      Object.assign(dagForm, { datum: '', taak: '', uren: 8, los: '', reflectie: '', leerpunten: '' })
      toonDagModal.value = true
    }

    function uitloggen() {
      if (confirm('Bent u zeker dat u wilt uitloggen?')) alert('U bent uitgelogd.')
    }

    return {
      toonDagModal,
      student, weken,
      dagForm,
      totaalUren, statusKleur, weekIndienen,
      openDagModal, slaDagOp,
      uitloggen,
    }
  },
}
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
  font-family: Arial, sans-serif;
}

.logboek {
  background: white;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  background: #29a8e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
}
.topbar-titel {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  color: white;
  text-transform: uppercase;
}
.topbar-naam {
  background: white;
  border: 1px solid #1a7ab5;
  padding: 6px 18px;
  border-radius: 3px;
  font-size: 15px;
  color: #333;
}
.topbar-logo {
  background: #c00;
  color: white;
  font-size: 14px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 3px;
  letter-spacing: 1px;
}

.layout {
  display: flex;
  flex: 1;
  min-height: calc(100vh - 52px);
}

.sidebar {
  background: #29a8e0;
  width: 170px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 10px;
  gap: 8px;
  flex-shrink: 0;
}
.sidebar-logo {
  background: #1a7ab5;
  color: white;
  font-weight: 700;
  font-size: 16px;
  width: 100%;
  text-align: center;
  padding: 10px 0;
  border-radius: 4px;
  margin-bottom: 10px;
}
.sidebar-knop {
  width: 100%;
  background: #1a7ab5;
  color: white;
  border: none;
  padding: 11px 0;
  font-size: 15px;
  font-weight: 600;
  border-radius: 4px;
  cursor: default;
  text-align: center;
}
.sidebar-knop.actief {
  background: #0d4a70;
  cursor: default;
}
.sidebar-spacer { flex: 1; }
.sidebar-knop.uitloggen {
  background: white;
  color: #1a7ab5;
  border: 2px solid #1a7ab5;
  cursor: pointer;
}
.sidebar-knop.uitloggen:hover { background: #e6f5fc; }

.inhoud {
  flex: 1;
  padding: 28px 32px;
  background: white;
  overflow-y: auto;
}

.logboek-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.pagina-titel {
  font-size: 22px;
  font-weight: 700;
  color: #222;
  margin-bottom: 4px;
}
.pagina-sub {
  font-size: 15px;
  color: #777;
}
.leeg-bericht {
  font-size: 15px;
  color: #999;
  margin-top: 16px;
}

.knop-blauw {
  background: #29a8e0;
  color: white;
  border: 2px solid #1a7ab5;
  padding: 10px 22px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
}
.knop-blauw:hover { background: #1a7ab5; }
.knop-blauw.klein { padding: 7px 16px; font-size: 14px; border-width: 1px; }

.knop-grijs {
  background: #eee;
  color: #333;
  border: 1px solid #ccc;
  padding: 10px 22px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
}
.knop-grijs:hover { background: #ddd; }

.week-blok { margin-bottom: 8px; }

.week-header {
  display: flex;
  align-items: center;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 14px 18px;
  gap: 14px;
  cursor: pointer;
  user-select: none;
}
.week-header:hover { background: #e4e4e4; }
.week-header.open {
  background: #d6eef9;
  border-color: #29a8e0;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.week-naam { flex: 1; font-size: 16px; font-weight: 600; color: #222; }
.week-uren { font-size: 15px; color: #555; }
.week-pijl { font-size: 15px; color: #555; }

.status-badge {
  font-size: 14px;
  padding: 5px 14px;
  border-radius: 4px;
  color: white;
  font-weight: 700;
  min-width: 110px;
  text-align: center;
}
.status-badge.groen  { background: #3a3; }
.status-badge.oranje { background: #e88600; }
.status-badge.blauw  { background: #29a8e0; }
.status-badge.rood   { background: #c33; }

.week-body {
  border: 1px solid #29a8e0;
  border-top: none;
  border-radius: 0 0 4px 4px;
  background: white;
  padding: 18px 20px;
}
.entry-titel {
  font-size: 15px;
  font-weight: 700;
  color: #333;
  margin-bottom: 14px;
}

.entry-tabel {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
  table-layout: fixed;
}
.entry-tabel th {
  text-align: left;
  color: #777;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid #ddd;
  padding: 10px 12px;
}
.entry-tabel td {
  padding: 11px 12px;
  vertical-align: middle;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.entry-tabel tr:last-child td { border-bottom: none; }
.kol-datum { width: 90px; }
.kol-taak  { width: auto; }
.kol-uren  { width: 70px; }
.kol-los   { width: 200px; }
.kol-knop  { width: 110px; }

.entry-detail-rij td {
  background: #f5fafd;
  padding: 0;
  white-space: normal;
}
.entry-detail {
  display: flex;
  gap: 20px;
  padding: 16px 18px;
  border-top: 1px solid #d0e8f5;
}
.detail-kolom { flex: 1; min-width: 0; }
.detail-naam   { font-size: 15px; font-weight: 700; color: #222; margin-bottom: 4px; }
.detail-waarde { font-size: 15px; color: #444; margin-bottom: 4px; }
.detail-label  { font-size: 13px; color: #999; margin-top: 6px; }

.lo-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.lo-badge {
  background: #29a8e0;
  color: white;
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
}

.week-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: white;
  border-radius: 6px;
  padding: 30px 34px;
  width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.modal h3 {
  font-size: 20px;
  color: #1a7ab5;
  margin-bottom: 18px;
  font-weight: 700;
  border-bottom: 1px solid #ddd;
  padding-bottom: 12px;
}
.modal label {
  font-size: 14px;
  color: #555;
  display: block;
  margin-top: 14px;
  margin-bottom: 4px;
  font-weight: 600;
}
.modal input,
.modal textarea,
.modal select {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 9px 12px;
  font-size: 15px;
  box-sizing: border-box;
  color: #222;
  background: white;
}
.modal input:focus,
.modal textarea:focus,
.modal select:focus {
  border-color: #29a8e0;
  outline: none;
}
.modal textarea {
  resize: vertical;
  min-height: 90px;
}
.modal-acties {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
}
</style>