<template>
  <div v-if="magTonen" class="notification-bell">
    <button 
      class="bell-button"
      @click="toggleDropdown"
      :class="{ active: dropdownOpen }"
    >
      🔔
      <span v-if="notificaties.length > 0" class="badge-count">
        {{ notificaties.length }}
      </span>
    </button>

    <div v-if="dropdownOpen" class="dropdown">
      <div class="dropdown-header">
        <h3>Notificaties</h3>
        <button v-if="notificaties.length > 0" class="clear-btn" @click="verwijderAlle">
          Alles wissen
        </button>
      </div>

      <div class="dropdown-body">
        <div v-if="notificaties.length === 0" class="empty-state">
          Geen notificaties
        </div>

        <div v-else class="notificatie-list">
          <div 
            v-for="notif in notificaties" 
            :key="notif.id"
            class="notificatie-item"
            :class="notif.type"
          >
            <div class="notif-icon">
              {{ getIcon(notif.type) }}
            </div>
            <div class="notif-content">
              <p class="notif-title">{{ notif.titel }}</p>
              <p class="notif-message">{{ notif.bericht }}</p>
              <span class="notif-time">{{ formatTijd(notif.created_at) }}</span>
            </div>
            <button 
              class="notif-delete"
              @click="verwijder(notif.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  docentId: String,
  stageStatus: String
})

const dropdownOpen = ref(false)
const notificaties = ref([])
const pollingInterval = ref(null)

const magTonen = computed(() => {
  return props.stageStatus === 'stagevoorstel geaccepteerd'
})

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function getIcon(type) {
  const icons = {
    voorstel: '📋',
    logboek: '📖',
    evaluatie: '⭐',
    feedback: '💬'
  }
  return icons[type] || '📢'
}

function formatTijd(datum) {
  if (!datum) return 'net nu'
  const d = new Date(datum)
  const nu = new Date()
  const diff = nu - d
  const seconden = Math.floor(diff / 1000)
  const minuten = Math.floor(seconden / 60)
  const uren = Math.floor(minuten / 60)
  const dagen = Math.floor(uren / 24)

  if (seconden < 60) return 'net nu'
  if (minuten < 60) return `${minuten}m geleden`
  if (uren < 24) return `${uren}u geleden`
  return `${dagen}d geleden`
}

async function laadNotificaties() {
  try {
    if (!props.docentId) return

    const token = localStorage.getItem('token')
    const res = await fetch(`/api/notificaties?docentId=${props.docentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.ok) {
      const data = await res.json()
      notificaties.value = data || []
    }
  } catch (err) {
    console.error('Fout bij laden notificaties:', err)
  }
}

function verwijder(notifId) {
  notificaties.value = notificaties.value.filter(n => n.id !== notifId)
}

function verwijderAlle() {
  notificaties.value = []
}

onMounted(() => {
  laadNotificaties()
  pollingInterval.value = setInterval(laadNotificaties, 30000)
})

onBeforeUnmount(() => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }
})
</script>

<style scoped>
.notification-bell {
  position: relative;
  display: inline-block;
}

.bell-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  position: relative;
  padding: 0.5rem;
  transition: transform 0.2s;
}

.bell-button:hover {
  transform: scale(1.1);
}

.bell-button.active {
  transform: scale(1.1);
}

.badge-count {
  position: absolute;
  top: 0;
  right: 0;
  background: #f44336;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
}

.dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 350px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  z-index: 1000;
  margin-top: 0.5rem;
}

.dropdown-header {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9f9f9;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #111;
}

.clear-btn {
  background: none;
  border: none;
  color: #2196f3;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  transition: color 0.2s;
}

.clear-btn:hover {
  color: #0b7dda;
}

.dropdown-body {
  overflow-y: auto;
  flex: 1;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #999;
  font-size: 0.9rem;
}

.notificatie-list {
  display: flex;
  flex-direction: column;
}

.notificatie-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
  cursor: pointer;
}

.notificatie-item:hover {
  background: #f9f9f9;
}

.notificatie-item.voorstel {
  border-left: 3px solid #2196f3;
}

.notificatie-item.logboek {
  border-left: 3px solid #4caf50;
}

.notificatie-item.evaluatie {
  border-left: 3px solid #ff9800;
}

.notificatie-item.feedback {
  border-left: 3px solid #f44336;
}

.notif-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title {
  margin: 0 0 0.2rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #111;
}

.notif-message {
  margin: 0 0 0.3rem;
  font-size: 0.8rem;
  color: #555;
  line-height: 1.4;
  word-break: break-word;
}

.notif-time {
  font-size: 0.7rem;
  color: #999;
  font-weight: 500;
}

.notif-delete {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  transition: color 0.2s;
  flex-shrink: 0;
}

.notif-delete:hover {
  color: #f44336;
}
</style>
