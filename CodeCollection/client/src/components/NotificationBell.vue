<template>
  <div class="notification-bell">
    <button class="bell-btn" @click="toggleDropdown">
      🔔
      <span v-if="unreadCount > 0" class="badge-count">{{ unreadCount }}</span>
    </button>

    <div v-if="showDropdown" class="dropdown-menu">
      <div class="dropdown-header">
        <h3>Notificaties</h3>
        <button class="close-btn" @click="showDropdown = false">✕</button>
      </div>

      <div class="dropdown-content">
        <div v-if="notifications.length === 0" class="empty-state">
          Geen notificaties
        </div>

        <div v-else>
          <div
            v-for="notif in notifications"
            :key="notif.id"
            class="notification-item"
            :class="{ unread: !notif.gelezen }"
          >
            <div class="notif-text">{{ notif.bericht }}</div>
            <div class="notif-time">{{ formatTijd(notif.createdAt) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  docentId: {
    type: String,
    required: true
  }
})

const showDropdown = ref(false)
const notifications = ref([])
const unreadCount = ref(0)

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function formatTijd(datum) {
  if (!datum) return ''
  const d = new Date(datum)
  return d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
}

async function laadNotificaties() {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/notificaties?docentId=${props.docentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await response.json()
    if (response.ok) {
      notifications.value = data
      unreadCount.value = data.filter(n => !n.gelezen).length
    }
  } catch (err) {
    console.error('Fout bij laden notificaties:', err)
  }
}

onMounted(() => {
  laadNotificaties()
  // Refresh elke 30 seconden
  setInterval(laadNotificaties, 30000)
})
</script>

<style scoped>
.notification-bell {
  position: relative;
  z-index: 100;
}

.bell-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  position: relative;
  padding: 0.5rem;
  transition: transform 0.2s;
}

.bell-btn:hover {
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
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-menu {
  position: fixed;
  top: 60px;
  right: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  width: 380px;
  max-height: 500px;
  z-index: 9999;
}

.dropdown-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9f9f9;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #111;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #999;
}

.dropdown-content {
  max-height: 400px;
  overflow-y: auto;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #999;
  font-size: 0.9rem;
}

.notification-item {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #f9f9f9;
}

.notification-item.unread {
  background: #e3f2fd;
}

.notif-text {
  font-size: 0.9rem;
  color: #222;
  margin-bottom: 0.3rem;
  word-wrap: break-word;
}

.notif-time {
  font-size: 0.75rem;
  color: #999;
}
</style>
