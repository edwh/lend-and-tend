<template>
  <div class="checkin-page">
    <div class="checkin-container">
      <NuxtLink to="/chats" class="btn-back">← Back to messages</NuxtLink>

      <div v-if="!authStore.user" class="card text-center py-5">
        <p class="text-muted">Please sign in to submit a check-in.</p>
        <button class="btn btn-primary mt-3" @click="requestLogin()">
          Sign in
        </button>
      </div>

      <template v-else>
        <div class="card">
          <h1 class="page-title">Garden arrangement check-in</h1>
          <p class="page-desc">
            How is your Lend &amp; Tend arrangement going? Your check-in will be
            added to the chat, so both parties can see it.
          </p>

          <div v-if="submitted" class="result-box">
            <div class="result-icon">{{ statusEmoji }}</div>
            <h2 class="result-heading">Check-in recorded</h2>
            <p class="result-body">
              Your status has been shared with the other party in your chat.
              Thank you for staying in touch — it helps us know the arrangement
              is working.
            </p>
            <div v-if="pickedStatus === 'not_working'" class="mediation-box">
              <strong>It sounds like things aren't working out.</strong>
              <p>
                If you'd like Lend &amp; Tend to help mediate, please
                <NuxtLink
                  :to="`/contact?subject=Mediation+request+for+arrangement+${route.params.id}`"
                >
                  contact us
                </NuxtLink>
                and we'll be in touch.
              </p>
            </div>
            <NuxtLink to="/chats" class="btn btn-primary mt-3"
              >Go to messages</NuxtLink
            >
          </div>

          <template v-else>
            <div class="status-options">
              <button
                class="status-btn"
                :class="{ active: picked === 'growing' }"
                @click="picked = 'growing'"
              >
                <span class="status-emoji">🟢</span>
                <strong>Growing</strong>
                <span class="status-note">Things are going well</span>
              </button>

              <button
                class="status-btn"
                :class="{ active: picked === 'ok' }"
                @click="picked = 'ok'"
              >
                <span class="status-emoji">🟡</span>
                <strong>Going OK</strong>
                <span class="status-note">Still finding our feet</span>
              </button>

              <button
                class="status-btn"
                :class="{ active: picked === 'not_working' }"
                @click="picked = 'not_working'"
              >
                <span class="status-emoji">🔴</span>
                <strong>Not working</strong>
                <span class="status-note">We need some help</span>
              </button>
            </div>

            <div class="field mt-3">
              <label class="field-label" for="checkin-note">
                Add a note <span class="field-hint">(optional)</span>
              </label>
              <textarea
                id="checkin-note"
                v-model="note"
                class="field-textarea"
                rows="2"
                placeholder="Anything you want to share with the other party…"
              />
            </div>

            <div v-if="error" class="alert-error">{{ error }}</div>

            <button
              class="btn btn-primary mt-3"
              :disabled="!picked || submitting"
              @click="submit"
            >
              {{ submitting ? 'Saving…' : 'Submit check-in' }}
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
useHead({ title: `Check-in — ${branding.siteName}` })

const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const { requestLogin } = useNavbar()
const api = Api(config)

const STATUS_LABELS = {
  growing: 'Growing 🟢',
  ok: 'Going OK 🟡',
  not_working: 'Not working 🔴',
}

const STATUS_EMOJIS = {
  growing: '🟢',
  ok: '🟡',
  not_working: '🔴',
}

/* Pre-select from query param (deep-link from email button) */
const queryStatus = route.query.status
const picked = ref(queryStatus && STATUS_LABELS[queryStatus] ? queryStatus : '')
const note = ref('')
const submitting = ref(false)
const submitted = ref(false)
const error = ref('')
const pickedStatus = ref('')
const statusEmoji = computed(() => STATUS_EMOJIS[pickedStatus.value] ?? '✅')

async function submit() {
  if (!picked.value) return
  submitting.value = true
  error.value = ''

  try {
    const agreementId = parseInt(route.params.id)

    /* Store status in user settings for batch worker tracking and admin visibility */
    const existingCheckins = authStore.user?.settings?.lat_checkins ?? {}
    await api.session.save({
      settings: {
        lat_checkins: {
          ...existingCheckins,
          [agreementId]: {
            status: picked.value,
            note: note.value,
            date: new Date().toISOString(),
          },
        },
      },
    })

    pickedStatus.value = picked.value
    submitted.value = true
    await authStore.fetchUser()
  } catch {
    error.value = 'Could not save your check-in. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.checkin-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
  padding: 40px 16px;
}

.checkin-container {
  max-width: 520px;
  margin: 0 auto;
}

.btn-back {
  display: inline-block;
  color: var(--lat-color-primary);
  text-decoration: none;
  font-size: 0.9rem;
  margin-bottom: 20px;
}
.btn-back:hover {
  text-decoration: underline;
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
  font-size: 0.9rem;
  color: var(--lat-color-text-muted);
  margin: 0 0 24px;
  line-height: 1.5;
}

.status-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  width: 100%;
}

.status-btn:hover {
  border-color: var(--lat-color-primary);
  background: #f8fbf4;
}

.status-btn.active {
  border-color: var(--lat-color-primary);
  background: #f0f8e8;
}

.status-emoji {
  font-size: 1.4rem;
  flex-shrink: 0;
}

.status-btn strong {
  display: block;
  font-size: 0.95rem;
  color: var(--lat-color-text);
}

.status-note {
  font-size: 0.8rem;
  color: var(--lat-color-text-muted);
}

.field {
  margin-bottom: 0;
}
.mt-3 {
  margin-top: 16px;
}

.field-label {
  display: block;
  font-size: 0.87rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--lat-color-text);
}

.field-hint {
  font-weight: 400;
  color: var(--lat-color-text-muted);
}

.field-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.92rem;
  font-family: inherit;
  box-sizing: border-box;
  resize: vertical;
}
.field-textarea:focus {
  outline: none;
  border-color: var(--lat-color-primary);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
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
  font-size: 1.3rem;
  color: var(--lat-color-text);
  margin: 0 0 8px;
}

.result-body {
  font-size: 0.9rem;
  color: var(--lat-color-text-muted);
  line-height: 1.6;
  margin: 0;
}

.mediation-box {
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  text-align: left;
  font-size: 0.88rem;
}

.mediation-box strong {
  display: block;
  margin-bottom: 6px;
}

.mediation-box a {
  color: var(--lat-color-primary);
}

.text-muted {
  color: var(--lat-color-text-muted);
}
</style>
