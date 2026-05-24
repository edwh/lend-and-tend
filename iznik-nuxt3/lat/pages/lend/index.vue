<template>
  <div class="page-container">
    <div class="form-card">
      <div class="page-header">
        <div class="role-badge lender-badge">Garden Lender</div>
        <h1>Share your garden</h1>
        <p class="subtitle">
          List your garden so tenders can find you and get in touch.
        </p>
      </div>

      <div v-if="authStore.user && !hasPaid" class="pay-gate">
        <p>A one-off joining fee is needed to post a garden.</p>
        <button class="btn btn-primary" @click="showPayModal = true">
          Join now
        </button>
      </div>

      <PaymentModal
        :show="showPayModal"
        @close="showPayModal = false"
        @paid="showPayModal = false"
      />

      <form @submit.prevent="submit">
        <div class="field">
          <label for="subject">
            Garden title <span class="field-required">*</span>
          </label>
          <input
            id="subject"
            v-model="form.subject"
            type="text"
            placeholder="e.g. Sunny south-facing plot, great for vegetables"
            required
          />
        </div>

        <div class="field">
          <label>Full address <span class="field-required">*</span></label>
          <GardenLocationPicker v-model="location" />
        </div>

        <div class="field">
          <label for="phone">
            Contact phone number <span class="field-required">*</span>
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
          <label for="about">About your garden</label>
          <textarea
            id="about"
            v-model="form.about"
            rows="4"
            placeholder="Describe your garden — soil, access, anything a tender should know…"
          />
        </div>

        <div class="field-row">
          <div class="field">
            <label for="gardenSize">Garden size</label>
            <select id="gardenSize" v-model="form.gardenSize">
              <option value="">Not specified</option>
              <option value="small">Small (up to 50 m²)</option>
              <option value="medium">Medium (50–200 m²)</option>
              <option value="large">Large (200 m²+)</option>
            </select>
          </div>

          <div class="field">
            <label for="sunExposure">Sun exposure</label>
            <select id="sunExposure" v-model="form.sunExposure">
              <option value="">Not specified</option>
              <option value="full">Full sun</option>
              <option value="partial">Partial shade</option>
              <option value="shade">Mostly shade</option>
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="waterAccess">Water access</label>
            <select id="waterAccess" v-model="form.waterAccess">
              <option value="">Not specified</option>
              <option value="yes">Yes — tap or water butt available</option>
              <option value="no">No — tender must bring their own</option>
            </select>
          </div>

          <div class="field">
            <label for="accessRoute">Access route</label>
            <select id="accessRoute" v-model="form.accessRoute">
              <option value="">Not specified</option>
              <option value="gate">
                Side / back gate — no need to enter house
              </option>
              <option value="through_house">Through the house</option>
              <option value="other">Other (describe below)</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="arrangement">What are you hoping for?</label>
          <textarea
            id="arrangement"
            v-model="form.arrangement"
            rows="2"
            placeholder="e.g. Help with mowing in return for use of the veg patch; or pure goodwill — grow what you like"
          />
        </div>

        <div class="field">
          <label for="restrictions">Any restrictions?</label>
          <textarea
            id="restrictions"
            v-model="form.restrictions"
            rows="2"
            placeholder="e.g. No commercial growing, no children, no dogs, no bonfires"
          />
        </div>

        <div class="field">
          <label>
            Photos
            <span class="field-hint"
              >(optional — helps tenders see your garden)</span
            >
          </label>
          <PhotoUploader
            v-model="attachments"
            type="Message"
            :max-photos="5"
            empty-title="Add photos of your garden"
            empty-subtitle="Photos help tenders decide if it's right for them"
          />
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>

        <div class="actions">
          <NuxtLink to="/map" class="btn btn-secondary btn-lg">Cancel</NuxtLink>
          <button
            type="submit"
            class="btn btn-primary btn-lg"
            :disabled="submitting || !location || !hasPaid"
          >
            {{ submitting ? 'Posting…' : 'Post my garden' }}
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

definePageMeta({ layout: 'default' })
useHead({ title: 'Share your garden — Lend & Tend' })

const authStore = useAuthStore()
const { requestLogin } = useNavbar()
const config = useRuntimeConfig()

const hasPaid = computed(() => {
  const status = authStore.user?.settings?.lat_payment?.status
  return status === 'paid' || status === 'concession'
})

const showPayModal = ref(false)

onMounted(() => {
  if (!authStore.user) requestLogin()
})

const form = reactive({
  subject: '',
  about: '',
  gardenSize: '',
  sunExposure: '',
  waterAccess: '',
  accessRoute: '',
  arrangement: '',
  restrictions: '',
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
  // PAF id is only set when the user picks from the PAF dropdown — used by
  // LatSendAddressModal to create a proper Freegle Address record on send.
  if (location.value?.pafid) body.pafid = location.value.pafid
  if (form.phone) body.phone = form.phone
  if (form.gardenSize) body.gardenSize = form.gardenSize
  if (form.sunExposure) body.sunExposure = form.sunExposure
  if (form.waterAccess) body.waterAccess = form.waterAccess
  if (form.accessRoute) body.accessRoute = form.accessRoute
  if (form.arrangement) body.arrangement = form.arrangement
  if (form.restrictions) body.restrictions = form.restrictions
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
  submitting.value = true
  error.value = ''
  try {
    const msgApi = api(config).message
    const groupid = parseInt(config.public.LAT_WORLD_GROUPID)
    const attids = attachments.value.filter((a) => a.id).map((a) => a.id)
    const putResp = await msgApi.put({
      groupid,
      messagetype: 'Offer',
      item: form.subject,
      textbody: buildTextbody(),
      email: authStore.user.email,
      ...(attids.length ? { attachments: attids } : {}),
    })
    const msgId = putResp?.id
    if (!msgId) throw new Error('Failed to create garden listing.')
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
    error.value = e?.message || 'Failed to post garden. Please try again.'
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #e3f2fd;
  color: #1565c0;
  padding: 14px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}
.pay-gate p {
  margin: 0;
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

.lender-badge {
  background: #e8f4e8;
  color: #2d5a27;
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
