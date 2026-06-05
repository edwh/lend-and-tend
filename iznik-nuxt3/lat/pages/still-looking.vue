<template>
  <div class="sl-page">
    <div class="sl-container">
      <div v-if="!authStore.user" class="card text-center py-5">
        <p class="text-muted">
          Please sign in to update what you're looking for.
        </p>
        <button class="btn btn-primary mt-3" @click="requestLogin()">
          Sign in
        </button>
      </div>

      <template v-else>
        <div class="card">
          <div v-if="saved" class="result-box">
            <div class="result-icon">
              {{ status === 'looking' ? '🌱' : '✓' }}
            </div>
            <h1 class="result-heading">
              {{
                status === 'looking'
                  ? "Great — we'll keep them coming!"
                  : 'All sorted — alerts paused'
              }}
            </h1>
            <p class="result-body">
              {{
                status === 'looking'
                  ? "We'll keep letting you know when gardens appear near you. Happy growing!"
                  : "We've paused your new-garden alerts. You can turn them back on any time in your settings."
              }}
            </p>
            <NuxtLink
              :to="status === 'looking' ? '/map' : '/settings'"
              class="btn btn-primary mt-3"
            >
              {{
                status === 'looking'
                  ? 'Browse gardens near you'
                  : 'Go to settings'
              }}
            </NuxtLink>
          </div>

          <template v-else>
            <h1 class="page-title">Still looking for a garden?</h1>
            <p class="page-desc">
              Now you've teamed up on a garden, would you still like to hear
              about other gardens to tend near you?
            </p>
            <div v-if="error" class="alert-error">{{ error }}</div>
            <button
              class="btn btn-primary mt-3 w-100"
              :disabled="saving"
              @click="choose('looking')"
            >
              {{ saving ? 'Saving…' : '🌱 Yes — keep the alerts coming' }}
            </button>
            <button
              class="btn btn-muted mt-2 w-100"
              :disabled="saving"
              @click="choose('done')"
            >
              ✓ No — I'm sorted for now
            </button>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import { useNavbar } from '~/composables/useNavbar'
import branding from '~/branding.config'
import Api from '~/api'

definePageMeta({ layout: 'default', ssr: false })
useHead({ title: `Still looking? — ${branding.siteName}` })

const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const { requestLogin } = useNavbar()
const api = Api(config)

const saving = ref(false)
const saved = ref(false)
const error = ref('')
const status = ref('')

async function choose(choice) {
  if (!authStore.user) return
  saving.value = true
  error.value = ''
  try {
    await api.session.save({
      settings: {
        ...(authStore.user?.settings ?? {}),
        lat_still_looking: {
          status: choice,
          updatedAt: new Date().toISOString(),
        },
      },
    })
    await authStore.fetchUser()
    status.value = choice
    saved.value = true
  } catch {
    error.value = 'Could not save your choice. Please try again.'
  } finally {
    saving.value = false
  }
}

/* Deep-link from the email button: apply the choice automatically once logged in. */
onMounted(() => {
  const choice = route.query.choice
  if (authStore.user && (choice === 'looking' || choice === 'done')) {
    choose(choice)
  }
})
</script>

<style scoped>
.sl-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
  padding: 40px 16px;
}
.sl-container {
  max-width: 520px;
  margin: 0 auto;
}
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  padding: 32px;
}
.page-title {
  font-family: var(--lat-font-heading);
  font-size: 1.5rem;
  color: var(--lat-color-text);
  margin: 0 0 8px;
}
.page-desc {
  font-size: 0.95rem;
  color: var(--lat-color-text-muted);
  margin: 0 0 12px;
  line-height: 1.5;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 13px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.98rem;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}
.w-100 {
  width: 100%;
}
.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-primary:hover {
  opacity: 0.9;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-muted {
  background: #ece8df;
  color: var(--lat-color-text);
}
.btn-muted:hover {
  background: #e2ddd0;
}
.mt-2 {
  margin-top: 10px;
}
.mt-3 {
  margin-top: 16px;
}
.alert-error {
  background: #fff0f0;
  color: #c0392b;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 0.88rem;
  margin-top: 12px;
}
.result-box {
  text-align: center;
}
.result-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}
.result-heading {
  font-family: var(--lat-font-heading);
  font-size: 1.35rem;
  color: var(--lat-color-text);
  margin: 0 0 8px;
}
.result-body {
  font-size: 0.92rem;
  color: var(--lat-color-text-muted);
  line-height: 1.6;
  margin: 0;
}
.text-muted {
  color: var(--lat-color-text-muted);
}
.py-5 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}
</style>
