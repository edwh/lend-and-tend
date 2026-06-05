<template>
  <div class="sl-page">
    <div class="sl-container">
      <div v-if="!authStore.user" class="card text-center py-5">
        <p class="text-muted">Please sign in to let us know.</p>
        <button class="btn btn-primary mt-3" @click="requestLogin()">
          Sign in
        </button>
      </div>

      <template v-else>
        <div class="card">
          <div v-if="saved" class="result-box">
            <div class="result-icon">
              {{ choiceMade === 'more' ? '🌷' : '✓' }}
            </div>
            <h1 class="result-heading">
              {{
                choiceMade === 'more'
                  ? "Wonderful — let's list it"
                  : 'Thank you for sharing'
              }}
            </h1>
            <p class="result-body">
              {{
                choiceMade === 'more'
                  ? "Adding another garden takes just a minute. We'll take you there now."
                  : "Lovely — we've noted that. We'll still check in now and then to see how your arrangement is going."
              }}
            </p>
            <NuxtLink
              :to="choiceMade === 'more' ? '/lend' : '/chats'"
              class="btn btn-primary mt-3"
            >
              {{
                choiceMade === 'more'
                  ? 'Share another garden'
                  : 'Back to messages'
              }}
            </NuxtLink>
          </div>

          <template v-else>
            <h1 class="page-title">Have you another garden to share?</h1>
            <p class="page-desc">
              Your garden's found a tender — thank you! Do you have more space
              to share, or is that all for now?
            </p>
            <div v-if="error" class="alert-error">{{ error }}</div>
            <button
              class="btn btn-secondary mt-3 w-100"
              :disabled="saving"
              @click="choose('more')"
            >
              🌷 I've another to share
            </button>
            <button
              class="btn btn-muted mt-2 w-100"
              :disabled="saving"
              @click="choose('done')"
            >
              {{ saving ? 'Saving…' : "✓ That's all for now" }}
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
useHead({ title: `Share another garden — ${branding.siteName}` })

const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const { requestLogin } = useNavbar()
const api = Api(config)

const saving = ref(false)
const saved = ref(false)
const error = ref('')
const choiceMade = ref('')

async function choose(choice) {
  if (!authStore.user) return
  saving.value = true
  error.value = ''
  try {
    await api.session.save({
      settings: {
        ...(authStore.user?.settings ?? {}),
        lat_other_gardens: {
          status: choice,
          updatedAt: new Date().toISOString(),
        },
      },
    })
    await authStore.fetchUser()
    choiceMade.value = choice
    saved.value = true
  } catch {
    error.value = 'Could not save your choice. Please try again.'
  } finally {
    saving.value = false
  }
}

/* Deep-link from the email button. */
onMounted(() => {
  const choice = route.query.choice
  if (authStore.user && (choice === 'more' || choice === 'done')) {
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
.btn-secondary {
  background: var(--lat-color-secondary, #b868ca);
  color: white;
}
.btn-secondary:hover {
  opacity: 0.9;
}
.btn-secondary:disabled,
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
