<template>
  <div class="mijn-stage">

    <!-- FORMULÁRIO: sem stage OU foi afgekeurd e quer criar novo -->
    <div v-if="!stage || stage.status === 'stagevoorstel aanpassingen vereist' || (stage.status === 'stagevoorstel geweigerd' && criarNovo)">
      <div v-if="stage && stage.status === 'stagevoorstel aanpassingen vereist'" class="alert">
  ✏️ Je stagevoorstel heeft aanpassingen nodig.
</div>

<div v-if="stage && stage.status === 'stagevoorstel aanpassingen vereist' && info.feedback" class="feedback">
  <label>Feedback van stagecommissie:</label>
  <p>{{ info.feedback }}</p>
</div>
      <h2>Stagevoorstel indienen</h2>

      <form @submit.prevent="handleSubmit" class="card">

        <h3>Gegevens bedrijf</h3>
        <div class="form-grid">
          <div class="form-group">
            <input v-model="form.bedrijfsnaam" type="text" placeholder="Cronos Group NV" required />
            <label>Bedrijfsnaam</label>
          </div>
          <div class="form-group">
            <input v-model="form.naam_stagementor" type="text" placeholder="Thomas Peeters" required />
            <label>Naam stagementor</label>
          </div>
          <div class="form-group">
            <input v-model="form.email_stagementor" type="email" placeholder="t.peeters@cronos.be" required />
            <label>E-mail stagementor</label>
          </div>
        </div>

        <h3>Stageperiode</h3>
        <div class="form-grid">
          <div class="form-group">
            <input v-model="form.stage_begin" type="date" required />
            <label>Startdatum</label>
          </div>
          <div class="form-group">
            <input v-model="form.stage_einde" type="date" required />
            <label>Einddatum</label>
          </div>
        </div>

        <h3>Stageopdracht</h3>
        <div class="form-group full">
          <textarea
            v-model="form.beschrijving"
            rows="5"
            placeholder="Ik zal meewerken aan de ontwikkeling van een intern webplatform voor projectbeheer..."
            required
          ></textarea>
          <label>Omschrijving stageopdracht</label>
        </div>

        <h3>Competenties</h3>
        <div class="form-grid">
          <div class="form-group">
            <input v-model="form.technische_skills" type="text" placeholder="React, JavaScript" />
            <label>Technische skills</label>
          </div>
          <div class="form-group">
            <input v-model="form.tools" type="text" placeholder="REST API, Git" />
            <label>Tools</label>
          </div>
        </div>

        <h3>Werkadres</h3>
        <div class="form-grid">
          <div class="form-group">
            <input v-model="form.straat" type="text" placeholder="Luchthavenlei" required />
            <label>Straat</label>
          </div>
          <div class="form-group">
            <input v-model="form.huisnummer" type="text" placeholder="1" />
            <label>Huisnummer</label>
          </div>
          <div class="form-group">
            <input v-model="form.gemeente" type="text" placeholder="2100 Antwerpen" required />
            <label>Gemeente</label>
          </div>
          <div class="form-group">
            <input v-model="form.land" type="text" placeholder="België" />
            <label>Land</label>
          </div>
        </div>

        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

        <div class="actions">
          <button type="button" @click="handleAnnuleren" class="btn-cancel">Annuleren</button>
          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Bezig met indienen...' : 'Indienen' }}
          </button>
        </div>
      </form>
    </div>

    <!-- VISTA DE LEITURA -->
    <div v-else-if="stage">
      <div class="card">

        <div v-if="stage.status === 'stagevoorstel ingediend'" class="alert">
  ⏳ Je aanvraag is verzonden en wordt momenteel beoordeeld door de stagecommissie.
</div>
<div v-if="stage.status === 'stagevoorstel geaccepteerd' || stage.status === 'lopend'" class="alert success">
  ✅ Je stage is goedgekeurd!
</div>
<div v-if="stage.status === 'afgerond'" class="alert success">
  🎓 Je stage is afgerond!
</div>
<div v-if="stage.status === 'stagevoorstel aanpassingen vereist'" class="alert">
  ✏️ Je stagevoorstel heeft aanpassingen nodig.
</div>
<div v-if="stage.status === 'stagevoorstel geweigerd'" class="alert error">
  ❌ Je stagevoorstel is afgekeurd. Je kan een nieuw voorstel indienen.
</div>

        <h3>Gegevens bedrijf</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="field-display">{{ info.bedrijfsnaam || '-' }}</div>
            <label>Bedrijfsnaam</label>
          </div>
        </div>

        <h3>Stageperiode</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="field-display">{{ formatDate(stage.start_datum) }}</div>
            <label>Startdatum</label>
          </div>
          <div class="info-item">
            <div class="field-display">{{ formatDate(stage.eind_datum) }}</div>
            <label>Einddatum</label>
          </div>
        </div>

        <h3>Stageopdracht</h3>
        <div class="info-item full">
          <div class="field-display textarea-display">{{ info.beschrijving || '-' }}</div>
          <label>Omschrijving stageopdracht</label>
        </div>

        <h3>Competenties</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="field-display">{{ info.technische_skills || '-' }}</div>
            <label>Technische skills</label>
          </div>
          <div class="info-item">
            <div class="field-display">{{ info.tools || '-' }}</div>
            <label>Tools</label>
          </div>
        </div>

        <h3>Werkadres</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="field-display">{{ info.straat || '-' }}</div>
            <label>Straat</label>
          </div>
          <div class="info-item">
            <div class="field-display">{{ info.huisnummer || '-' }}</div>
            <label>Huisnummer</label>
          </div>
          <div class="info-item">
            <div class="field-display">{{ info.gemeente || '-' }}</div>
            <label>Gemeente</label>
          </div>
          <div class="info-item">
            <div class="field-display">{{ info.land || '-' }}</div>
            <label>Land</label>
          </div>
        </div>

        <div v-if="stage.status === 'stagevoorstel geweigerd' && info.feedback" class="feedback">
  <label>Feedback van stagecommissie:</label>
  <p>{{ info.feedback }}</p>
</div>

        <div v-if="stage.status === 'stagevoorstel geweigerd'" class="actions">
  <button @click="criarNovo = true" class="btn-submit">
    + Nieuw voorstel indienen
  </button>
</div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const stage = ref(null)
const criarNovo = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const initialForm = {
  bedrijfsnaam: '',
  naam_stagementor: '',
  email_stagementor: '',
  stage_begin: '',
  stage_einde: '',
  beschrijving: '',
  technische_skills: '',
  tools: '',
  straat: '',
  huisnummer: '',
  gemeente: '',
  land: ''
}

const form = ref({ ...initialForm })

const info = computed(() => stage.value?.stagevoorstellen || {})

watch(stage, (newStage) => {
  if (newStage?.status === 'stagevoorstel aanpassingen vereist') {
    form.value = {
      bedrijfsnaam: info.value.bedrijfsnaam || '',
      naam_stagementor: '',
      email_stagementor: '',
      stage_begin: newStage.start_datum || '',
      stage_einde: newStage.eind_datum || '',
      beschrijving: info.value.beschrijving || '',
      technische_skills: info.value.technische_skills || '',
      tools: info.value.tools || '',
      straat: info.value.straat || '',
      huisnummer: info.value.huisnummer || '',
      gemeente: info.value.gemeente || '',
      land: info.value.land || ''
    }
  }
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('nl-BE')
}

async function loadStage() {
  const token = localStorage.getItem('token')
  try {
    const response = await fetch('/api/stagevoorstellen/mijn', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await response.json()

    if (Array.isArray(data) && data.length > 0) {
      stage.value = data[0]
    } else {
      stage.value = null
    }
  } catch (err) {
    console.error(err)
  }
}

function handleAnnuleren() {
  form.value = { ...initialForm }
  errorMessage.value = ''
  criarNovo.value = false
}

async function handleSubmit() {
  loading.value = true
  errorMessage.value = ''

  const token = localStorage.getItem('token')
  const isUpdate = stage.value?.status === 'stagevoorstel aanpassingen vereist'

  try {
    const url = isUpdate
      ? `/api/stagevoorstellen/${stage.value.id}`
      : '/api/stagevoorstellen'

    const response = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form.value)
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error)

    await loadStage()
    form.value = { ...initialForm }
    criarNovo.value = false

  } catch (err) {
    errorMessage.value = err.message || 'Indienen mislukt'
  } finally {
    loading.value = false
  }
}

onMounted(loadStage)
</script>
<style scoped>
.mijn-stage {
  padding: 2rem;
  max-width: 950px;
  margin: 0 auto;
}

h2 {
  color: #333;
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

h3 {
  color: #333;
  font-size: 1.1rem;
  margin: 1.5rem 0 1rem 0;
  font-weight: 500;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

h3:first-of-type {
  margin-top: 0;
}

.alert {
  background: #fff8d6;
  border-left: 4px solid #f5d142;
  padding: 0.85rem 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: #555;
}

.alert.success {
  background: #d6f5d6;
  border-left-color: #4caf50;
  color: #2d6b2d;
}

.alert.error {
  background: #f5d6d6;
  border-left-color: #d44;
  color: #8b1a1a;
}

.info-grid,
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 1.5rem;
  margin-bottom: 1.5rem;
}

.info-item,
.form-group {
  display: flex;
  flex-direction: column;
}

.field-display {
  background: #d9d9d9;
  padding: 0.65rem 0.85rem;
  border-radius: 4px;
  font-size: 0.95rem;
  color: #333;
  min-height: 1.5rem;
}

.textarea-display {
  min-height: 6rem;
  white-space: pre-wrap;
}

.info-item label,
.form-group label {
  font-size: 0.85rem;
  color: #999;
  margin-top: 0.35rem;
}

.info-item.full,
.form-group.full {
  grid-column: 1 / -1;
  margin-bottom: 1.5rem;
}

.form-group input,
.form-group textarea {
  background: #d9d9d9;
  padding: 0.65rem 0.85rem;
  border: none;
  border-radius: 4px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #333;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: #888;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: 2px solid #4a90c9;
  background: white;
}

.feedback {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #fff8f0;
  border-left: 4px solid #ff9800;
  border-radius: 4px;
}

.feedback label {
  font-weight: 600;
  color: #555;
}

.error {
  background: #f5c6c6;
  color: #8b1a1a;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-cancel,
.btn-submit {
  padding: 0.65rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
}

.btn-cancel {
  background: #d9d9d9;
  color: #333;
}

.btn-cancel:hover {
  background: #c4c4c4;
}

.btn-submit {
  background: #4a90c9;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background: #357ab0;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>