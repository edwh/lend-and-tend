<template>
  <div class="join-page">
    <div class="join-container">
      <div class="join-card">
        <!-- Header -->
        <div class="join-header">
          <img src="/images/lat/logo.png" :alt="branding.siteName" class="join-logo" />
          <h1 class="join-title">Support {{ branding.siteName }}</h1>
          <p class="join-subtitle">
            Browsing the map is free. To send and receive messages you need a one-off joining fee of
            <strong>£{{ feeFormatted }}</strong>.
          </p>
          <p class="join-intent">
            This is a declaration of intent — not a guarantee of a match.
            Refunds are available on request.
          </p>
        </div>

        <!-- Tabs -->
        <div class="join-tabs">
          <button
            class="join-tab"
            :class="{ 'join-tab--active': activeTab === 'pay' }"
            @click="activeTab = 'pay'"
          >Pay £{{ feeFormatted }}</button>
          <button
            class="join-tab"
            :class="{ 'join-tab--active': activeTab === 'concession' }"
            @click="activeTab = 'concession'"
          >Concession</button>
        </div>

        <!-- Pay panel -->
        <div v-if="activeTab === 'pay'" class="join-panel">
          <p class="panel-desc">
            Pay securely via Stripe. You'll be able to send and receive messages immediately after payment.
          </p>
          <button class="btn btn-primary btn-lg btn-full" @click="startPayment">
            <VIcon :icon="['fas', 'lock']" class="btn-icon" />
            Pay £{{ feeFormatted }} securely
          </button>
          <p class="stripe-note">Secured by Stripe. We never store your card details.</p>
        </div>

        <!-- Concession panel -->
        <div v-if="activeTab === 'concession'" class="join-panel">
          <p class="panel-desc">{{ branding.fee.concessionText }}</p>
          <div v-if="concessionSent" class="alert-success">
            <VIcon :icon="['fas', 'check-circle']" class="btn-icon" />
            Request received — we'll be in touch shortly.
          </div>
          <form v-else @submit.prevent="submitConcession">
            <label for="concessionReason" class="field-label">Please tell us briefly why you're applying</label>
            <textarea
              id="concessionReason"
              v-model="concessionReason"
              class="field-textarea"
              rows="3"
              placeholder="e.g. I receive Universal Credit, or I am in financial difficulty"
              required
            />
            <button type="submit" class="btn btn-outline btn-full mt-3" :disabled="concessionSubmitting">
              {{ concessionSubmitting ? 'Sending…' : 'Apply for concession' }}
            </button>
          </form>
        </div>

        <!-- Skip section -->
        <div class="skip-divider">
          <span class="skip-line" />
          <span class="skip-or">or</span>
          <span class="skip-line" />
        </div>
        <button class="btn-skip" @click="skip">
          Skip for now — just browse the map
        </button>
        <p class="skip-note">
          You can pay later from your profile. Payment is required to send or receive messages.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import branding from '~/branding.config'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: `Join ${branding.siteName}` })

const authStore = useAuthStore()
const feeFormatted = computed(() => (branding.fee.amountPence / 100).toFixed(2))
const activeTab = ref<'pay' | 'concession'>('pay')
const concessionReason = ref('')
const concessionSubmitting = ref(false)
const concessionSent = ref(false)

const returnTo = computed(() => {
  const r = useRoute().query.returnTo
  return typeof r === 'string' ? r : '/map'
})

function startPayment() {
  navigateTo('/join/payment-pending')
}

async function submitConcession() {
  concessionSubmitting.value = true
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.APIv2}/lat/user/concession`, {
      method: 'POST',
      credentials: 'include',
      headers: authStore.authHeaders(),
      body: { reason: concessionReason.value },
    })
  } catch { /* silent — intent recorded */ }
  concessionSent.value = true
  concessionSubmitting.value = false
}

function skip() {
  navigateTo(returnTo.value)
}
</script>

<style scoped>
.join-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
  padding: 40px 16px;
}

.join-container {
  max-width: 540px;
  margin: 0 auto;
}

.join-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.09);
  padding: 40px 36px;
}

/* Header */
.join-header {
  text-align: center;
  margin-bottom: 28px;
}

.join-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 12px;
  margin-bottom: 16px;
}

.join-title {
  font-family: var(--lat-font-heading);
  font-size: 1.8rem;
  color: var(--lat-color-text);
  margin: 0 0 10px;
}

.join-subtitle {
  color: var(--lat-color-text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 8px;
}

.join-intent {
  font-size: 0.82rem;
  color: #aaa;
  margin: 0;
}

/* Tabs */
.join-tabs {
  display: flex;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 24px;
}

.join-tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: #f8f8f8;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  color: var(--lat-color-text-muted);
}

.join-tab--active {
  background: var(--lat-color-primary);
  color: white;
}

/* Panel */
.join-panel { margin-bottom: 8px; }

.panel-desc {
  color: var(--lat-color-text-muted);
  font-size: 0.9rem;
  margin-bottom: 16px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-lg { padding: 14px 24px; font-size: 1rem; }
.btn-full { width: 100%; }
.btn-icon { margin-right: 8px; }
.mt-3 { margin-top: 12px; }

.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-primary:hover { background: var(--lat-color-primary-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-outline {
  background: transparent;
  color: var(--lat-color-primary);
  border: 2px solid var(--lat-color-primary);
}
.btn-outline:hover { background: rgba(107, 158, 60, 0.07); }
.btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }

.stripe-note {
  text-align: center;
  font-size: 0.78rem;
  color: #aaa;
  margin-top: 10px;
}

/* Concession form */
.field-label {
  display: block;
  font-size: 0.87rem;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--lat-color-text);
}

.field-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.92rem;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
}
.field-textarea:focus {
  outline: none;
  border-color: var(--lat-color-primary);
}

.alert-success {
  background: var(--lat-color-tender-bg);
  color: var(--lat-color-tender-text);
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Skip */
.skip-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 12px;
}
.skip-line { flex: 1; height: 1px; background: #e0e0e0; }
.skip-or { font-size: 0.8rem; color: #aaa; }

.btn-skip {
  width: 100%;
  background: none;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px;
  color: var(--lat-color-text-muted);
  font-size: 0.88rem;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-skip:hover { background: #f5f5f5; }

.skip-note {
  text-align: center;
  font-size: 0.78rem;
  color: #bbb;
  margin: 8px 0 0;
}

@media (max-width: 480px) {
  .join-card { padding: 24px 18px; }
  .join-title { font-size: 1.4rem; }
}
</style>
