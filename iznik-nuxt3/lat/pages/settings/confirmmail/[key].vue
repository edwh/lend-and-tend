<template>
  <div class="verify-page">
    <div class="verify-card">
      <div class="verify-icon">
        <span v-if="status === 'pending'" class="icon-spin">⏳</span>
        <span v-else-if="status === 'success'">✅</span>
        <span v-else>❌</span>
      </div>

      <template v-if="status === 'pending'">
        <h1>Verifying your email…</h1>
        <p class="subtitle">Please wait a moment.</p>
      </template>

      <template v-else-if="status === 'success'">
        <h1>Email verified!</h1>
        <p class="subtitle">
          Your email address has been confirmed. You're all set.
        </p>
        <NuxtLink to="/map" class="btn btn-primary btn-lg"
          >Explore the map</NuxtLink
        >
      </template>

      <template v-else>
        <h1>Verification failed</h1>
        <p class="subtitle">This link may have expired or already been used.</p>
        <div v-if="!resent">
          <p class="help-text">Re-send the verification email to:</p>
          <input
            v-model="resendEmail"
            type="email"
            class="email-input"
            placeholder="Your email address"
          />
          <div class="actions">
            <button
              class="btn btn-primary"
              :disabled="!resendEmail || resending"
              @click="resend"
            >
              {{ resending ? 'Sending…' : 'Resend verification email' }}
            </button>
            <NuxtLink to="/map" class="btn btn-secondary"
              >Skip for now</NuxtLink
            >
          </div>
        </div>
        <div v-else>
          <p class="success-resend">
            Verification email sent! Check your inbox (and spam folder).
          </p>
          <NuxtLink to="/map" class="btn btn-primary">Back to map</NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default' })
useHead({ title: 'Verify Email — Lend & Tend' })

const route = useRoute()
const authStore = useAuthStore()

const status = ref('pending')
const resendEmail = ref(authStore.user?.email ?? '')
const resending = ref(false)
const resent = ref(false)

onMounted(async () => {
  const key = route.params.key
  const u = route.query.u
  const k = route.query.k

  try {
    // Auto-login from link if not already logged in
    if (!authStore.user && u && k) {
      await authStore.login({ u: parseInt(u), k })
    }

    // Verify the email address using the validation key
    await authStore.saveAndGet({ key })
    status.value = 'success'
  } catch {
    status.value = 'error'
  }
})

async function resend() {
  if (!resendEmail.value) return
  resending.value = true
  try {
    await authStore.saveEmail(resendEmail.value)
    resent.value = true
  } catch {
    // silent — user sees the form still
  } finally {
    resending.value = false
  }
}
</script>

<style scoped>
.verify-page {
  min-height: 100vh;
  background: var(--lat-color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.verify-card {
  background: white;
  border-radius: 12px;
  padding: 48px 40px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.verify-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.icon-spin {
  display: inline-block;
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

h1 {
  font-family: var(--lat-font-heading);
  font-size: 1.8rem;
  color: var(--lat-color-text);
  margin: 0 0 12px;
}

.subtitle {
  color: var(--lat-color-text-muted);
  margin-bottom: 24px;
}

.help-text {
  color: var(--lat-color-text-muted);
  font-size: 0.9rem;
  margin-bottom: 8px;
  text-align: left;
}

.email-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  box-sizing: border-box;
  margin-bottom: 16px;
}

.email-input:focus {
  outline: none;
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 2px rgba(107, 158, 60, 0.15);
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.success-resend {
  color: var(--lat-color-primary);
  margin-bottom: 20px;
}

.btn {
  padding: 10px 22px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.btn-lg {
  padding: 12px 28px;
  font-size: 1rem;
}

.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: var(--lat-color-primary);
  border: 2px solid var(--lat-color-primary);
}
</style>
