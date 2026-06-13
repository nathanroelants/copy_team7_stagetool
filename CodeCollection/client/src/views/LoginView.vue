<template>
  <div class="login-page">
    <!-- Espaço para o logo da Erasmus (canto superior direito) -->
    <div class="logo-corner">
      <img src="../assets/erasmus-logo.png" alt="Erasmus Hogeschool Brussel" class="topbar-logo" />
   
    </div>

    <div class="login-card">

      <div class="login-header">
        <div class="brand">STAGE.BE</div>
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

    <footer class="login-footer">
      © {{ new Date().getFullYear() }} Erasmushogeschool Brussel — Team 7
    </footer>
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
  background: linear-gradient(135deg, #1ec8f0 0%, #29a8e0 50%, #0f6fa8 100%);
  position: relative;
  padding: 1.5rem;
  font-family: Arial, Helvetica, sans-serif;
}

/* Logo no canto superior direito */
.logo-corner {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-corner img {
  max-height: 60px;
  max-width: 160px;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.2));
}

.logo-placeholder {
  width: 70px;
  height: 70px;
  background: white;
  color: #cc0000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.1rem;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-style: italic;
}

/* Card de login */
.login-card {
  background: white;
  border-radius: 16px;
  padding: 2.8rem 2.5rem;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.brand {
  font-size: 2.4rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: #29a8e0;
  margin-bottom: 0.6rem;
  text-shadow: 0 2px 4px rgba(41, 168, 224, 0.15);
}

.login-header p {
  color: #666;
  font-size: 0.95rem;
  margin: 0;
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
  font-size: 0.88rem;
  font-weight: 600;
  color: #333;
}

.form-group input {
  padding: 0.8rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
}

.form-group input:focus {
  border-color: #29a8e0;
  box-shadow: 0 0 0 3px rgba(41, 168, 224, 0.15);
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

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
  background: linear-gradient(135deg, #29a8e0, #0f6fa8);
  color: white;
  border: none;
  padding: 0.9rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
  margin-top: 0.5rem;
  letter-spacing: 0.02em;
  box-shadow: 0 4px 12px rgba(41, 168, 224, 0.3);
}

.login-btn:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(41, 168, 224, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.login-footer {
  position: absolute;
  bottom: 1rem;
  left: 0;
  right: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.82rem;
  font-weight: 500;
}
</style>