<template>
  <div class="onboard-page">
    <div class="onboard-container">
      <!-- Progress bar -->
      <div class="onboard-progress">
        <div
          v-for="i in TOTAL_STEPS"
          :key="i"
          class="onboard-step-dot"
          :class="{ active: i === step, done: i < step }"
        />
      </div>

      <!-- Step 1 — About you -->
      <div v-if="step === 1" class="onboard-card">
        <div class="onboard-icon">👋</div>
        <h1 class="onboard-title">Welcome, {{ firstName }}!</h1>
        <p class="onboard-subtitle">Tell us a little about yourself — this helps lenders and tenders decide if you're a good match.</p>

        <div class="field">
          <label class="field-label" for="ob-role">I want to…</label>
          <select id="ob-role" v-model="roleVal" class="field-select">
            <option value="">Select…</option>
            <option value="lender">Lend my garden</option>
            <option value="tender">Tend someone's garden</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div class="field">
          <label class="field-label" for="ob-about">About me <span class="field-hint">(optional)</span></label>
          <textarea id="ob-about" v-model="aboutme" class="field-textarea" rows="3" placeholder="A few words about yourself and what you're hoping for…" maxlength="500" />
        </div>

        <div v-if="step1Error" class="alert-error">{{ step1Error }}</div>

        <div class="onboard-actions">
          <button class="btn btn-primary btn-lg" :disabled="saving1" @click="completeStep1">
            {{ saving1 ? 'Saving…' : 'Continue' }}
          </button>
        </div>
      </div>

      <!-- Step 2 — Create your listing -->
      <div v-if="step === 2" class="onboard-card">
        <div class="onboard-icon">🌱</div>
        <h1 class="onboard-title">Create your listing</h1>
        <p class="onboard-subtitle">
          <template v-if="roleVal === 'lender'">Tell potential tenders about your garden.</template>
          <template v-else-if="roleVal === 'tender'">Tell potential lenders what you're looking for.</template>
          <template v-else>Ready to post? Share your garden or what you're looking for.</template>
        </p>

        <div class="onboard-choices">
          <NuxtLink
            v-if="roleVal !== 'tender'"
            to="/lend"
            class="choice-card"
          >
            <div class="choice-icon">🏡</div>
            <div class="choice-title">List my garden</div>
            <div class="choice-desc">Add your garden to the map so tenders can find you.</div>
          </NuxtLink>
          <NuxtLink
            v-if="roleVal !== 'lender'"
            to="/tend"
            class="choice-card"
          >
            <div class="choice-icon">🌿</div>
            <div class="choice-title">Post a wanted ad</div>
            <div class="choice-desc">Let lenders know you're looking for a garden to tend.</div>
          </NuxtLink>
        </div>

        <div class="onboard-actions" style="gap:10px;">
          <button class="btn btn-skip" @click="step++">Skip for now</button>
        </div>
      </div>

      <!-- Step 3 — Join / Pay -->
      <div v-if="step === 3" class="onboard-card">
        <div class="onboard-icon">🎉</div>
        <h1 class="onboard-title">Almost there!</h1>
        <p class="onboard-subtitle">
          Browsing is free. To send and receive messages you need to pay the one-off joining fee.
        </p>

        <div v-if="hasPaid" class="alert-success">
          <VIcon :icon="['fas', 'check-circle']" /> You're already a member — you can message immediately.
        </div>
        <template v-else>
          <NuxtLink to="/join" class="btn btn-primary btn-lg btn-full">
            Join now — £{{ feeFormatted }}
          </NuxtLink>
          <p class="skip-note">Concessions available on the joining page.</p>
        </template>

        <div class="onboard-actions" style="margin-top:20px;">
          <NuxtLink to="/map" class="btn btn-skip">Go to the map</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import branding from '~/branding.config'
import Api from '~/api'

definePageMeta({ layout: 'default' })
useHead({ title: `Getting started — ${branding.siteName}` })

const authStore = useAuthStore()
const config = useRuntimeConfig()
const api = Api(config)

onMounted(async () => {
  if (!authStore.user) {
    await authStore.fetchUser().catch(() => {})
    if (!authStore.user) navigateTo('/')
  }
})

const TOTAL_STEPS = 3
const step = ref(1)

const user = computed(() => authStore.user)
const firstName = computed(() => user.value?.displayname?.split(' ')[0] ?? 'there')
const hasPaid = computed(() => {
  const s = user.value?.settings?.lat_payment?.status
  return s === 'paid' || s === 'concession'
})
const feeFormatted = computed(() => (branding.fee.amountPence / 100).toFixed(2))

const roleVal = ref(user.value?.settings?.lat_role ?? '')
const aboutme = ref(user.value?.aboutme?.text ?? '')
const saving1 = ref(false)
const step1Error = ref('')

watch(user, (u) => {
  if (!u) return
  roleVal.value = u.settings?.lat_role ?? ''
  aboutme.value = u.aboutme?.text ?? ''
}, { immediate: true })

async function completeStep1() {
  if (!roleVal.value) { step1Error.value = 'Please select your role.'; return }
  saving1.value = true
  step1Error.value = ''
  try {
    await Promise.all([
      api.user.save({ aboutme: aboutme.value }),
      api.session.save({ settings: { ...(authStore.user?.settings ?? {}), lat_role: roleVal.value } }),
    ])
    await authStore.fetchUser()
    step.value = 2
  } catch {
    step1Error.value = 'Could not save. Please try again.'
  } finally {
    saving1.value = false
  }
}
</script>

<style scoped>
.onboard-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 16px;
}

.onboard-container {
  max-width: 520px;
  width: 100%;
}

/* Progress dots */
.onboard-progress {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 28px;
}

.onboard-step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ddd;
  transition: background 0.2s;
}
.onboard-step-dot.active { background: var(--lat-color-primary); }
.onboard-step-dot.done { background: var(--lat-color-primary); opacity: 0.4; }

/* Card */
.onboard-card {
  background: white;
  border-radius: 14px;
  box-shadow: 0 2px 18px rgba(0,0,0,0.09);
  padding: 40px 36px;
  text-align: center;
}

.onboard-icon { font-size: 2.5rem; margin-bottom: 12px; }

.onboard-title {
  font-family: var(--lat-font-heading);
  font-size: 1.7rem;
  color: var(--lat-color-text);
  margin: 0 0 10px;
}

.onboard-subtitle {
  color: var(--lat-color-text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 24px;
}

/* Form fields */
.field { margin-bottom: 16px; text-align: left; }

.field-label {
  display: block;
  font-size: 0.87rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--lat-color-text);
}

.field-hint { font-weight: 400; color: var(--lat-color-text-muted); }

.field-select,
.field-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.92rem;
  font-family: inherit;
  box-sizing: border-box;
  color: var(--lat-color-text);
  background: white;
}
.field-textarea { resize: vertical; }
.field-select:focus,
.field-textarea:focus { outline: none; border-color: var(--lat-color-primary); }

/* Choice cards */
.onboard-choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 8px;
}

.choice-card {
  display: block;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  padding: 20px 16px;
  text-decoration: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  text-align: center;
}
.choice-card:hover {
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 3px rgba(107,158,60,0.12);
}
.choice-icon { font-size: 1.8rem; margin-bottom: 8px; }
.choice-title { font-weight: 700; font-size: 0.95rem; color: var(--lat-color-text); margin-bottom: 4px; }
.choice-desc { font-size: 0.82rem; color: var(--lat-color-text-muted); line-height: 1.4; }

/* Buttons */
.onboard-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 22px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-lg { padding: 13px 28px; font-size: 1rem; }
.btn-full { width: 100%; }

.btn-primary { background: var(--lat-color-primary); color: white; }
.btn-primary:hover { background: var(--lat-color-primary-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-skip {
  background: none;
  border: 1px solid #ddd;
  color: var(--lat-color-text-muted);
  border-radius: 6px;
  padding: 9px 18px;
  font-size: 0.87rem;
  cursor: pointer;
  transition: background 0.15s;
  text-decoration: none;
}
.btn-skip:hover { background: #f5f5f5; }

.alert-error {
  background: #fff0f0;
  color: #c0392b;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 0.88rem;
  margin-bottom: 14px;
  text-align: left;
}

.alert-success {
  background: var(--lat-color-tender-bg, #e8f5e9);
  color: var(--lat-color-tender-text, #2d5a27);
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 0.9rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.skip-note {
  font-size: 0.78rem;
  color: #aaa;
  margin-top: 8px;
}

@media (max-width: 480px) {
  .onboard-card { padding: 28px 20px; }
  .onboard-title { font-size: 1.4rem; }
}
</style>
