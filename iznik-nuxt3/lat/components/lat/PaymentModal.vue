<template>
  <div v-if="show" class="payment-overlay" @click.self="$emit('close')">
    <div class="payment-modal">
      <button class="modal-close" @click="$emit('close')">✕</button>

      <div class="modal-header">
        <img src="/images/lat/logo.png?v=2" alt="Lend & Tend" class="modal-logo" />
        <h2>Support Lend & Tend</h2>
        <p class="modal-subtitle">
          A one-off fee of <strong>£{{ feeFormatted }}</strong> lets you post gardens and send messages.
          Refunds available on request.
        </p>
      </div>

      <!-- Dev bypass -->
      <div v-if="allowFakePayment" class="dev-bypass">
        <div class="dev-badge">🛠 Dev mode</div>
        <button class="btn btn-dev btn-full" :disabled="busy" @click="fakePayment">
          {{ busy ? 'Activating…' : 'Pretend to pay (dev only)' }}
        </button>
      </div>

      <div v-if="allowFakePayment" class="divider"><span>or pay for real</span></div>

      <!-- Stripe button -->
      <button class="btn btn-primary btn-full" :disabled="busy" @click="startPayment">
        <VIcon :icon="['fas', 'lock']" class="btn-icon" />
        {{ busy ? 'Redirecting…' : `Pay £${feeFormatted} securely` }}
      </button>
      <p class="stripe-note">Secured by Stripe. We never store your card details.</p>

      <div class="divider"><span>or</span></div>

      <button class="btn btn-outline btn-full" @click="concessionView = !concessionView">
        Apply for a concession
      </button>

      <div v-if="concessionView" class="concession-panel">
        <div v-if="concessionSent" class="alert-success">
          Request received — we'll be in touch shortly.
        </div>
        <form v-else @submit.prevent="submitConcession">
          <label class="field-label">Why are you applying?</label>
          <textarea
            v-model="concessionReason"
            class="field-textarea"
            rows="2"
            placeholder="e.g. I receive Universal Credit"
            required
          />
          <button type="submit" class="btn btn-outline btn-full mt-2" :disabled="busy">
            {{ busy ? 'Sending…' : 'Submit request' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useNavbar } from '~/composables/useNavbar'
import branding from '~/branding.config'
import Api from '~/api'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close', 'paid'])

const authStore = useAuthStore()
const { requestLogin } = useNavbar()
const config = useRuntimeConfig()
const api = Api(config)

const feeFormatted = computed(() => (branding.fee.amountPence / 100).toFixed(2))
const allowFakePayment = computed(() => config.public.LAT_ALLOW_FAKE_PAYMENT)

const busy = ref(false)
const concessionView = ref(false)
const concessionReason = ref('')
const concessionSent = ref(false)

async function fakePayment() {
  if (!authStore.user) { requestLogin(); return }
  busy.value = true
  try {
    await api.session.save({
      settings: {
        ...(authStore.user?.settings ?? {}),
        lat_payment: { status: 'paid', method: 'dev_bypass', paidAt: new Date().toISOString() },
      },
    })
    await authStore.fetchUser()
    emit('paid')
    emit('close')
  } catch { /* silent */ }
  busy.value = false
}

async function startPayment() {
  if (!authStore.user) { requestLogin(); return }
  busy.value = true
  try {
    const { url } = await $fetch('/api/checkout', {
      method: 'POST',
      body: { userId: authStore.user.id, returnTo: window.location.pathname },
    })
    if (url) window.location.href = url
  } catch {
    busy.value = false
  }
}

async function submitConcession() {
  if (!authStore.user) { requestLogin(); return }
  busy.value = true
  try {
    await api.session.save({
      settings: {
        ...(authStore.user?.settings ?? {}),
        lat_payment: {
          status: 'concession',
          reason: concessionReason.value || 'not_specified',
          claimedAt: new Date().toISOString(),
        },
      },
    })
    await authStore.fetchUser()
    concessionSent.value = true
    emit('paid')
  } catch { /* silent */ }
  busy.value = false
}
</script>

<style scoped>
.payment-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.payment-modal {
  background: white;
  border-radius: 12px;
  padding: 32px 28px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  position: relative;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  font-size: 1.1rem;
  color: #aaa;
  cursor: pointer;
  line-height: 1;
}
.modal-close:hover { color: #555; }

.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.modal-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
  margin-bottom: 12px;
}

.modal-header h2 {
  font-family: var(--lat-font-heading);
  font-size: 1.5rem;
  color: var(--lat-color-text);
  margin: 0 0 8px;
}

.modal-subtitle {
  font-size: 0.88rem;
  color: var(--lat-color-text-muted);
  margin: 0;
  line-height: 1.5;
}

/* Dev bypass */
.dev-bypass {
  padding: 12px 14px;
  border: 2px dashed #f0a500;
  border-radius: 8px;
  background: #fffbea;
  margin-bottom: 12px;
}
.dev-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: #b7730a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
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
  transition: all 0.2s;
  font-family: inherit;
}
.btn-full { width: 100%; }
.btn-icon { margin-right: 8px; }
.mt-2 { margin-top: 8px; }

.btn-primary { background: var(--lat-color-primary); color: white; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-dev { background: #f0a500; color: white; }
.btn-dev:hover { background: #d4920b; }
.btn-dev:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-outline {
  background: transparent;
  color: var(--lat-color-primary);
  border: 2px solid var(--lat-color-primary);
}
.btn-outline:hover { background: rgba(107, 158, 60, 0.07); }
.btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }

.stripe-note {
  text-align: center;
  font-size: 0.74rem;
  color: #aaa;
  margin: 6px 0 0;
}

.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0;
  color: #bbb;
  font-size: 0.8rem;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e0e0e0;
}

.concession-panel { margin-top: 12px; }

.field-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 5px;
  color: var(--lat-color-text);
}

.field-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.88rem;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
}
.field-textarea:focus { outline: none; border-color: var(--lat-color-primary); }

.alert-success {
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 0.88rem;
}
</style>
