<template>
  <div class="login-page">
    <div class="login-card">

      <div class="login-header">
        <h1>🎓 Stage Monitor</h1>
        <p>Meld je aan om verder te gaan</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">

        <div class="form-group">
          <label for="email">E-mailadres</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="naam@ehb.be"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password">Wachtwoord</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            :disabled="loading"
          />
        </div>

        <div v-if="errorMessage" class="error-message">
          ⚠️ {{ errorMessage }}
        </div>

        <button type="submit" :disabled="loading" class="login-btn">
          <span v-if="loading">Bezig met inloggen...</span>
          <span v-else>Inloggen →</span>
        </button>

      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

function redirectByRol(rol) {
  const routes = {
    student: '/student',
    docent: '/docent',
    mentor: '/mentor',
    stagecommissie: '/stagecommissie',
    administratie: '/administratie'
  }
  router.push(routes[rol] || '/')
}

async function handleLogin() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error)
    }

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    redirectByRol(data.user.rol)

  } catch (err) {
    errorMessage.value = err.message || 'Login mislukt. Probeer opnieuw.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header h1 {
  font-size: 1.8rem;
  color: #1a1a2e;
  margin-bottom: 0.5rem;
}

.login-header p {
  color: #666;
  font-size: 0.95rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

.form-group input {
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
  outline: none;
}

.form-group input:focus {
  border-color: #0f3460;
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.error-message {
  background: #fff0f0;
  border: 1px solid #ffcccc;
  color: #cc0000;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.login-btn {
  background: linear-gradient(135deg, #0f3460, #16213e);
  color: white;
  border: none;
  padding: 0.85rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  margin-top: 0.5rem;
}

.login-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>