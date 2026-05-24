<template>
  <div class="page-container">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border" role="status" />
      <p class="mt-3 text-muted">Loading…</p>
    </div>

    <div v-else-if="error" class="text-center py-5">
      <p class="text-muted">{{ error }}</p>
      <NuxtLink to="/profile" class="btn-back">← Back to profile</NuxtLink>
    </div>

    <template v-else-if="message && isOwnListing">
      <NuxtLink to="/profile" class="btn-back mb-4 d-inline-block"
        >← Back to profile</NuxtLink
      >

      <div class="form-card">
        <div class="page-header">
          <h1>Edit listing</h1>
          <p class="subtitle">
            {{
              message.type === 'Offer'
                ? 'Update your garden details'
                : 'Update your interest details'
            }}
          </p>
        </div>

        <form @submit.prevent="submit">
          <GardenFormFields
            v-model="form"
            v-model:attachments="attachments"
            :type="message.type"
          >
            <template #after-title>
              <div class="field">
                <label>
                  Full address <span class="field-required">*</span>
                  <span class="field-hint"> (re-enter to update)</span>
                </label>
                <GardenLocationPicker
                  v-model="location"
                  :initial-postcode="existingPostcode"
                />
                <p v-if="existingAddress" class="existing-address">
                  Current: {{ existingAddress }}
                </p>
              </div>
            </template>
          </GardenFormFields>

          <div v-if="formError" class="form-error">{{ formError }}</div>

          <div class="actions">
            <NuxtLink to="/profile" class="btn btn-secondary btn-lg"
              >Cancel</NuxtLink
            >
            <button
              type="submit"
              class="btn btn-primary btn-lg"
              :disabled="submitting"
            >
              {{ submitting ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        </form>
      </div>
    </template>

    <div v-else-if="!isOwnListing" class="text-center py-5">
      <p class="text-muted">You cannot edit this listing.</p>
      <NuxtLink to="/profile" class="btn-back">← Back to profile</NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import api from '~/api'
import GardenFormFields from '~/components/lat/GardenFormFields.vue'
import GardenLocationPicker from '~/components/lat/GardenLocationPicker.vue'

definePageMeta({ layout: 'default' })

const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()

useHead({
  title: 'Edit listing — Lend & Tend',
})

const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const formError = ref('')
const message = ref(null)

const isOwnListing = computed(() => {
  const fromuser = message.value?.fromuser
  const ownerId = typeof fromuser === 'number' ? fromuser : fromuser?.id
  return ownerId && parseInt(ownerId) === parseInt(authStore.user?.id)
})

// Use ref<Object> not reactive — GardenFormFields emits a NEW object on each
// keystroke (it spreads + sets the changed field), and v-model on a component
// reassigns the whole binding. Reactive can't be reassigned via `=`, so the
// child's emits never landed and edits silently disappeared.
const form = ref({
  subject: '',
  about: '',
  gardenSize: '',
  sunExposure: '',
  waterAccess: '',
  accessRoute: '',
  arrangement: '',
  restrictions: '',
  whatToGrow: '',
  tools: '',
  availability: '',
  honestyDeclaration: false,
})

const location = ref(null)
const existingAddress = ref('')
const existingPostcode = ref('')
const attachments = ref([])

async function fetchMessage() {
  try {
    loading.value = true
    const msgId = route.params.id

    const msgApi = api(config).message
    const data = await msgApi.fetch(msgId)

    if (!data) {
      error.value = 'Could not load listing.'
      return
    }

    message.value = data

    if (!isOwnListing.value) {
      error.value = 'You cannot edit this listing.'
      return
    }

    const parsed = parseTextbody(data.textbody)

    form.value.subject = (data.subject || '').replace(
      /^(Offer|Wanted):\s*/i,
      ''
    )
    form.value.about = parsed.description || ''
    form.value.gardenSize = parsed.gardenSize || ''
    form.value.sunExposure = parsed.sunExposure || ''
    form.value.waterAccess = parsed.waterAccess || ''
    form.value.accessRoute = parsed.accessRoute || ''
    form.value.arrangement = parsed.arrangement || ''
    form.value.restrictions = parsed.restrictions || ''
    form.value.whatToGrow = parsed.whatToGrow || ''
    form.value.tools = parsed.tools || ''
    form.value.availability = parsed.availability || ''
    form.value.honestyDeclaration = parsed.honestyDeclaration || false

    existingAddress.value = parsed.address || parsed.postcode || ''
    existingPostcode.value = parsed.postcode || ''

    if (data.attachments && data.attachments.length) {
      attachments.value = data.attachments
    }
  } catch (e) {
    error.value = 'Failed to load listing.'
  } finally {
    loading.value = false
  }
}

function parseTextbody(textbody) {
  if (!textbody) return {}
  try {
    return JSON.parse(textbody)
  } catch {
    return { description: textbody }
  }
}

function buildTextbody() {
  // Start from the existing textbody so fields the user didn't touch (like an
  // address loaded from server but not re-entered through the picker) survive.
  const existing = parseTextbody(message.value?.textbody)
  const body = { ...existing, description: form.value.about }

  if (location.value?.address) body.address = location.value.address
  if (location.value?.postcode) body.postcode = location.value.postcode
  // PAF id when the user picked from the PAF dropdown — used by
  // LatSendAddressModal to create a proper Freegle Address record on send.
  if (location.value?.pafid) body.pafid = location.value.pafid

  if (message.value?.type === 'Offer') {
    body.gardenSize = form.value.gardenSize || ''
    body.sunExposure = form.value.sunExposure || ''
    body.waterAccess = form.value.waterAccess || ''
    body.accessRoute = form.value.accessRoute || ''
    body.arrangement = form.value.arrangement || ''
    body.restrictions = form.value.restrictions || ''
  } else {
    body.whatToGrow = form.value.whatToGrow || ''
    body.tools = form.value.tools || ''
    body.availability = form.value.availability || ''
    body.honestyDeclaration = !!form.value.honestyDeclaration
  }

  return JSON.stringify(body)
}

async function submit() {
  submitting.value = true
  formError.value = ''

  if (!authStore.user) {
    formError.value = 'You must be logged in.'
    submitting.value = false
    return
  }

  if (!form.value.subject?.trim()) {
    formError.value = 'Please enter a title for your listing.'
    submitting.value = false
    return
  }

  if (form.value.subject.trim().length > 200) {
    formError.value = 'Title must be 200 characters or fewer.'
    submitting.value = false
    return
  }

  try {
    const msgApi = api(config).message
    const msgId = parseInt(route.params.id, 10)

    // L&T listings don't carry a `locationid`, so the server's automatic
    // subject reconstruction (which requires a non-empty location string)
    // never fires. Build the subject ourselves so the My Gardens display
    // reflects edits to the title.
    const prefix = message.value?.type === 'Offer' ? 'Offer' : 'Wanted'
    const title = form.value.subject.trim()
    const updatePayload = {
      id: msgId,
      item: title,
      subject: `${prefix}: ${title}`,
      textbody: buildTextbody(),
    }

    if (location.value?.lat && location.value?.lng) {
      updatePayload.lat = location.value.lat
      updatePayload.lng = location.value.lng
    }

    // Include attachment IDs so photos uploaded/changed on this edit page persist.
    const attids = (attachments.value || [])
      .filter((a) => a && a.id)
      .map((a) => a.id)
    if (attids.length) {
      updatePayload.attachments = attids
    }

    await msgApi.save(updatePayload)

    navigateTo(`/garden/${msgId}`)
  } catch (e) {
    const status = e?.data?.response?.status || e?.statusCode
    if (status === 401 || status === 403) {
      formError.value = 'You are not authorised to edit this listing.'
    } else if (status === 404) {
      formError.value = 'This listing could not be found.'
    } else {
      formError.value =
        'Could not save changes. Please check your details and try again.'
    }
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (!authStore.user) {
    await navigateTo(`/join?returnTo=/garden/${route.params.id}/edit`)
    return
  }
  await fetchMessage()
})
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

.page-header {
  margin-bottom: 28px;
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

label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 0.9rem;
  color: var(--lat-color-text);
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

.field-required {
  color: #dc3545;
  font-weight: 700;
  margin-left: 2px;
}

.field-hint {
  font-weight: 400;
  color: var(--lat-color-text-muted);
  font-size: 0.85rem;
}

.existing-address {
  font-size: 0.85rem;
  color: var(--lat-color-text-muted);
  margin-top: 6px;
  margin-bottom: 0;
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

.btn-back {
  color: var(--lat-color-primary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn-back:hover {
  text-decoration: underline;
}

.text-muted {
  color: var(--lat-color-text-muted);
}

.text-center {
  text-align: center;
}

.spinner-border {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.py-5 {
  padding-top: 48px;
  padding-bottom: 48px;
}

.mt-3 {
  margin-top: 12px;
}

.mb-4 {
  margin-bottom: 24px;
}

.d-inline-block {
  display: inline-block;
}
</style>
