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
            placeholder="naam@example.com"
            required
            :disabled="loading"
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label for="password">Wachtwoord</label>
          <div class="password-wrapper">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
              :disabled="loading"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
              :disabled="loading"
              :aria-label="showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'"
            >
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
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
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

function redirectByRol(rol) {
  const routes = {
    student: '/student',
    docent: '/docent',
    stagementor: '/mentor',
    stagecomissie: '/stagecommissie',
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
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Inloggen mislukt')
    }

    if (!data.token || !data.user) {
      throw new Error('Onverwacht antwoord van de server')
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
  width: 100%;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: #0f3460;
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

/* Password com toggle */
.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-wrapper input {
  padding-right: 3rem;
}

.toggle-password {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  transition: background 0.15s;
}

.toggle-password:hover:not(:disabled) {
  background: #f0f0f0;
}

.toggle-password:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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