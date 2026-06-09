<template>
  <div class="mijn-stage">

    <!-- Header com botão -->
    <div class="page-header">
      <h2>Mijn stagevoorstellen</h2>
      <button v-if="view === 'lijst'" @click="view = 'nieuw'" class="btn-primary">
        + Nieuw voorstel
      </button>
      <button v-else @click="goBackToList" class="btn-secondary">
        ← Terug naar lijst
      </button>
    </div>

    <!-- VISTA 1: Lista de voorstellen -->
    <div v-if="view === 'lijst'">
      <div v-if="voorstellen.length === 0" class="empty-state">
        <p>Je hebt nog geen stagevoorstellen ingediend.</p>
        <button @click="view = 'nieuw'" class="btn-primary">
          + Eerste voorstel indienen
        </button>
      </div>

      <div v-else class="voorstellen-lijst">
        <div
          v-for="v in voorstellen"
          :key="v.id"
          class="voorstel-card"
          @click="openVoorstel(v)"
        >
          <div class="voorstel-header">
            <h3>{{ v.bedrijfsnaam }}</h3>
            <span class="status-badge" :class="v.status">{{ statusLabel(v.status) }}</span>
          </div>
          <div class="voorstel-info">
            <span>📅 {{ formatDate(v.stage_begin) }} → {{ formatDate(v.stage_einde) }}</span>
            <span>📍 {{ v.adres }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- VISTA 2: Detalhes (modo leitura) -->
    <div v-else-if="view === 'detalhes' && selectedVoorstel" class="card">
      <div v-if="selectedVoorstel.status === 'ingediend'" class="alert">
        Je aanvraag is verzonden en wordt momenteel beoordeeld door de stagecommissie.
      </div>
      <div v-if="selectedVoorstel.status === 'goedgekeurd'" class="alert success">
        ✅ Je stagevoorstel is goedgekeurd!
      </div>
      <div v-if="selectedVoorstel.status === 'afgekeurd'" class="alert error">
        ❌ Je stagevoorstel is afgekeurd.
      </div>

      <h3>Gegevens bedrijf</h3>
      <div class="info-grid">
        <div class="info-item">
          <div class="field-display">{{ selectedVoorstel.bedrijfsnaam }}</div>
          <label>Bedrijfsnaam</label>
        </div>
        <div class="info-item">
          <div class="field-display">{{ selectedVoorstel.adres }}</div>
          <label>Werkadres</label>
        </div>
      </div>

      <h3>Stageperiode</h3>
      <div class="info-grid">
        <div class="info-item">
          <div class="field-display">{{ formatDate(selectedVoorstel.stage_begin) }}</div>
          <label>Startdatum</label>
        </div>
        <div class="info-item">
          <div class="field-display">{{ formatDate(selectedVoorstel.stage_einde) }}</div>
          <label>Einddatum</label>
        </div>
      </div>

      <h3>Stageopdracht</h3>
      <div class="info-item full">
        <div class="field-display textarea-display">{{ selectedVoorstel.beschrijving }}</div>
        <label>Omschrijving stageopdracht</label>
      </div>

      <div v-if="selectedVoorstel.feedback" class="feedback">
        <label>Feedback van stagecommissie:</label>
        <p>{{ selectedVoorstel.feedback }}</p>
      </div>
    </div>

    <!-- VISTA 3: Formulário novo voorstel -->
    <div v-else-if="view === 'nieuw'">
      <form @submit.prevent="handleSubmit" class="card">
        <h3>Gegevens bedrijf</h3>
        <div class="form-grid">
          <div class="form-group">
            <input
              v-model="form.bedrijfsnaam"
              type="text"
              placeholder="Cronos Group NV"
              required
            />
            <label>Bedrijfsnaam</label>
          </div>
          <div class="form-group">
            <input
              v-model="form.adres"
              type="text"
              placeholder="Luchthavenlei 1, 2100 Antwerpen"
              required
            />
            <label>Werkadres</label>
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

        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

        <div class="actions">
          <button type="button" @click="handleAnnuleren" class="btn-cancel">
            Annuleren
          </button>
          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Bezig met indienen...' : 'Indienen' }}
          </button>
        </div>
      </form>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const view = ref('lijst') // 'lijst' | 'nieuw' | 'detalhes'
const voorstellen = ref([])
const selectedVoorstel = ref(null)
const loading = ref(false)
const errorMessage = ref('')

const initialForm = {
  bedrijfsnaam: '',
  adres: '',
  stage_begin: '',
  stage_einde: '',
  beschrijving: ''
}

const form = ref({ ...initialForm })

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('nl-BE')
}

function statusLabel(status) {
  const labels = {
    'concept': 'Concept',
    'ingediend': 'In afwachting',
    'in_beoordeling': 'In beoordeling',
    'goedgekeurd': 'Goedgekeurd',
    'afgekeurd': 'Afgekeurd'
  }
  return labels[status] || status
}

async function loadVoorstellen() {
  const token = localStorage.getItem('token')
  try {
    const response = await fetch('/api/stagevoorstellen/mijn', {
      headers: { Authorization: `Bearer ${token}` }
    })
    voorstellen.value = await response.json()
  } catch (err) {
    console.error(err)
  }
}

function openVoorstel(v) {
  selectedVoorstel.value = v
  view.value = 'detalhes'
}

function goBackToList() {
  view.value = 'lijst'
  selectedVoorstel.value = null
  form.value = { ...initialForm }
  errorMessage.value = ''
}

function handleAnnuleren() {
  form.value = { ...initialForm }
  goBackToList()
}

async function handleSubmit() {
  loading.value = true
  errorMessage.value = ''

  const token = localStorage.getItem('token')
  try {
    const response = await fetch('/api/stagevoorstellen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form.value)
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error)

    // Voorstel guardado → recarregar lista e voltar
    await loadVoorstellen()
    form.value = { ...initialForm }
    view.value = 'lijst'

  } catch (err) {
    errorMessage.value = err.message || 'Indienen mislukt'
  } finally {
    loading.value = false
  }
}

onMounted(loadVoorstellen)
</script>

<style scoped>
.mijn-stage {
  padding: 2rem;
  max-width: 950px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h2 {
  color: #333;
  font-size: 1.4rem;
}

/* Lista vazia */
.empty-state {
  background: white;
  padding: 3rem;
  text-align: center;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.empty-state p {
  color: #888;
  margin-bottom: 1.5rem;
}

/* Lista de voorstellen */
.voorstellen-lijst {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.voorstel-card {
  background: white;
  padding: 1.25rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.voorstel-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.voorstel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.voorstel-header h3 {
  color: #333;
  font-size: 1.05rem;
}

.voorstel-info {
  display: flex;
  gap: 1.5rem;
  font-size: 0.85rem;
  color: #666;
}

/* Status badges */
.status-badge {
  padding: 0.3rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-badge.concept {
  background: #e0e0e0;
  color: #555;
}

.status-badge.ingediend,
.status-badge.in_beoordeling {
  background: #fff3a3;
  color: #8a6d00;
}

.status-badge.goedgekeurd {
  background: #c8f0c8;
  color: #2d6b2d;
}

.status-badge.afgekeurd {
  background: #f5c6c6;
  color: #8b1a1a;
}

/* Card detalhes / formulário */
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
}

h3:first-child {
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

.btn-primary,
.btn-secondary,
.btn-cancel,
.btn-submit {
  padding: 0.65rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
}

.btn-primary,
.btn-submit {
  background: #4a90c9;
  color: white;
}

.btn-primary:hover,
.btn-submit:hover:not(:disabled) {
  background: #357ab0;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary,
.btn-cancel {
  background: #d9d9d9;
  color: #333;
}

.btn-secondary:hover,
.btn-cancel:hover {
  background: #c4c4c4;
}
</style>