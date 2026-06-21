<template>
  <div class="page-container">
    <div class="form-card">
      <div class="page-header">
        <div class="role-badge tender-badge">Garden Tender</div>
        <h1>Find a garden to tend</h1>
        <p class="subtitle">
          Tell us what you're looking for and find a garden near you.
        </p>
      </div>

      <div v-if="authStore.user && !hasPaid" class="pay-gate">
        <VIcon :icon="['fas', 'lock']" class="pay-gate-icon" />
        <div class="pay-gate-body">
          <strong>One-time £{{ feeFormatted }} membership required</strong>
          <p>
            A single joining fee — not a subscription — lets you post your
            listing and message lenders. You'll be asked to pay when you post.
          </p>
        </div>
        <button class="btn btn-primary" @click="showPayModal = true">
          Pay £{{ feeFormatted }}
        </button>
      </div>

      <PaymentModal
        :show="showPayModal"
        @close="showPayModal = false"
        @paid="onPaid"
      />

      <form @submit.prevent="submit">
        <div class="field">
          <label for="subject">
            What would you like to grow? <span class="field-required">*</span>
            <VisibilityHint kind="public" />
          </label>
          <input
            id="subject"
            v-model="form.subject"
            type="text"
            placeholder="e.g. Vegetables and herbs, or help with existing garden"
            required
          />
        </div>

        <div class="field">
          <label>
            Your full address <span class="field-required">*</span>
            <VisibilityHint kind="approximate" />
          </label>
          <GardenLocationPicker v-model="location" />
        </div>

        <div class="field">
          <label for="phone">
            Contact phone number <span class="field-required">*</span>
            <VisibilityHint kind="private" />
          </label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            placeholder="e.g. 07700 900000"
            required
          />
        </div>

        <div class="field">
          <label for="about">
            About you as a gardener
            <VisibilityHint kind="public" />
          </label>
          <textarea
            id="about"
            v-model="form.about"
            rows="3"
            placeholder="Your experience, what you love growing, anything else a lender should know…"
          />
        </div>

        <div class="field-row">
          <div class="field">
            <label for="tools">
              Tools and equipment
              <VisibilityHint kind="public" />
            </label>
            <select id="tools" v-model="form.tools">
              <option value="">Not specified</option>
              <option value="basic">Basic hand tools</option>
              <option value="full">Full set of garden tools</option>
              <option value="none">
                None — would need access to lender's tools
              </option>
            </select>
          </div>

          <div class="field">
            <label for="availability">
              Availability
              <VisibilityHint kind="public" />
            </label>
            <select id="availability" v-model="form.availability">
              <option value="">Not specified</option>
              <option value="weekends">Weekends</option>
              <option value="weekdays">Weekdays</option>
              <option value="flexible">Flexible</option>
              <option value="evenings">Evenings</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="whatToGrow">
            What do you want to do?
            <VisibilityHint kind="public" />
          </label>
          <textarea
            id="whatToGrow"
            v-model="form.whatToGrow"
            rows="2"
            placeholder="e.g. Grow veg and herbs; maintain an existing garden; flowers only; semi-commercial (sell at market)"
          />
        </div>

        <div class="field honesty-field">
          <label class="checkbox-label">
            <input
              v-model="form.honestyDeclaration"
              type="checkbox"
              class="honesty-check"
            />
            <span>I confirm I am not on any offender's register</span>
            <VisibilityHint kind="private" />
          </label>
        </div>

        <div class="field">
          <label>
            Photos
            <VisibilityHint kind="public" />
            <span class="field-hint">(optional — show your previous work)</span>
          </label>
          <PhotoUploader
            v-model="attachments"
            type="Message"
            :max-photos="5"
            empty-title="Add photos of your gardening"
            empty-subtitle="Show lenders what you can do"
          />
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>

        <div class="actions">
          <NuxtLink to="/map" class="btn btn-secondary btn-lg">Cancel</NuxtLink>
          <button
            type="submit"
            class="btn btn-primary btn-lg"
            :disabled="submitting || !location"
          >
            {{ submitLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import { useNavbar } from '~/composables/useNavbar'
import api from '~/api'
import { useMessageStore } from '~/stores/message'
import PaymentModal from '~/components/lat/PaymentModal.vue'
import GardenLocationPicker from '~/components/lat/GardenLocationPicker.vue'
import VisibilityHint from '~/components/lat/VisibilityHint.vue'
import branding from '~/branding.config'

definePageMeta({ layout: 'default' })
useHead({ title: 'Find a garden to tend — Lend & Tend' })

const authStore = useAuthStore()
const { requestLogin } = useNavbar()
const config = useRuntimeConfig()

const hasPaid = computed(() => {
  const status = authStore.user?.settings?.lat_payment?.status
  return status === 'paid' || status === 'concession'
})

const feeFormatted = computed(() => (branding.fee.amountPence / 100).toFixed(2))

// Print the price on the button so the one-time requirement is unmissable and
// the payment request lands at the end of the form, not as a dead submit.
const submitLabel = computed(() => {
  if (submitting.value) return 'Posting…'
  if (!hasPaid.value) return `Pay £${feeFormatted.value} to post my interest`
  return 'Post my interest'
})

const showPayModal = ref(false)

// Continue posting automatically once the fee is paid (modal refreshed the user).
function onPaid() {
  showPayModal.value = false
  if (hasPaid.value) submit()
}

onMounted(() => {
  if (!authStore.user) requestLogin()
})

const form = reactive({
  subject: '',
  about: '',
  tools: '',
  availability: '',
  whatToGrow: '',
  honestyDeclaration: false,
  phone: '',
})
const attachments = ref([])
const location = ref(null)
const error = ref('')
const submitting = ref(false)

function buildTextbody() {
  const body = { description: form.about }
  if (location.value?.address) body.address = location.value.address
  if (location.value?.postcode) body.postcode = location.value.postcode
  if (form.phone) body.phone = form.phone
  if (form.whatToGrow) body.whatToGrow = form.whatToGrow
  if (form.tools) body.tools = form.tools
  if (form.availability) body.availability = form.availability
  if (form.honestyDeclaration) body.honestyDeclaration = true
  return JSON.stringify(body)
}

async function submit() {
  if (!authStore.user) {
    requestLogin()
    return
  }
  if (!location.value) {
    error.value = 'Please enter your full address.'
    return
  }
  if (!hasPaid.value) {
    // Raise the payment request at the end of the form; onPaid() resumes posting.
    showPayModal.value = true
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const msgApi = api(config).message
    const groupid = parseInt(config.public.LAT_WORLD_GROUPID)
    const attids = attachments.value.filter((a) => a.id).map((a) => a.id)
    const putResp = await msgApi.put({
      groupid,
      messagetype: 'Wanted',
      item: form.subject,
      textbody: buildTextbody(),
      email: authStore.user.email,
      ...(attids.length ? { attachments: attids } : {}),
    })
    const msgId = putResp?.id
    if (!msgId) throw new Error('Failed to post interest.')
    await msgApi.save({
      id: msgId,
      lat: location.value.lat,
      lng: location.value.lng,
    })
    await msgApi.joinAndPost(msgId, authStore.user.email)
    if (!config.public.LAT_MODERATION_ENABLED) {
      const messageStore = useMessageStore()
      try {
        await messageStore.approve(msgId, groupid, null, null, null)
      } catch {
        /* non-admin, skip */
      }
    }
    navigateTo('/profile?posted=1')
  } catch (e) {
    error.value = e?.message || 'Failed to post interest. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-container {
  max-width: 660px;
  margin: 40px auto;
  padding: 0 20px;
}

.form-card {
  background: white;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.pay-gate {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fff4ec;
  border: 1px solid #f3c9b0;
  border-left: 4px solid #cc3f00;
  color: #7a2e00;
  padding: 14px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}
.pay-gate-icon {
  margin-top: 2px;
  color: #cc3f00;
  flex-shrink: 0;
}
.pay-gate-body {
  flex: 1;
}
.pay-gate-body strong {
  display: block;
  margin-bottom: 2px;
}
.pay-gate p {
  margin: 0;
}
.pay-gate .btn {
  align-self: center;
  white-space: nowrap;
}

.page-header {
  margin-bottom: 28px;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.tender-badge {
  background: var(--lat-color-tender-bg);
  color: var(--lat-color-tender-text);
}

h1 {
  font-family: var(--lat-font-heading);
  font-size: 1.8rem;
  color: var(--lat-color-text);
  margin: 0 0 8px;
}

.subtitle {
  color: var(--lat-color-text-muted);
  margin: 0;
}

.field {
  margin-bottom: 20px;
}
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

@media (max-width: 540px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}

label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 0.9rem;
  color: var(--lat-color-text);
}

.field-required {
  color: #dc3545;
  font-weight: 700;
  margin-left: 2px;
}

input,
textarea,
select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  box-sizing: border-box;
  font-family: inherit;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 2px rgba(107, 158, 60, 0.15);
}

/* Checkbox-specific reset — prevents the global input rule from stretching it */
input[type='checkbox'] {
  width: 18px;
  height: 18px;
  min-width: 18px;
  padding: 0;
  border: none;
  box-shadow: none;
  flex-shrink: 0;
  cursor: pointer;
}

.honesty-field {
  background: #f9faf5;
  border: 1px solid #dde8d0;
  border-radius: 6px;
  padding: 12px 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 400;
  margin-bottom: 0;
}

.field-hint {
  font-weight: 400;
  color: var(--lat-color-text-muted);
  font-size: 0.85rem;
}

.form-error {
  background: #fff3cd;
  color: #856404;
  padding: 10px 14px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
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
