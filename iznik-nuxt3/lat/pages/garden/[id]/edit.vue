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
            :type="message.type"
            v-model:attachments="attachments"
          />

          <div class="field">
            <label for="location">Location (postcode)</label>
            <GardenLocationPicker
              v-model="location"
              @update:model-value="location = $event"
            />
          </div>

          <div v-if="formError" class="form-error">{{ formError }}</div>

          <div class="actions">
            <button
              type="submit"
              class="btn btn-primary btn-lg"
              :disabled="submitting"
            >
              {{ submitting ? 'Saving…' : 'Save changes' }}
            </button>
            <NuxtLink to="/profile" class="btn btn-secondary btn-lg"
              >Cancel</NuxtLink
            >
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
  return ownerId && ownerId === authStore.user?.id
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
  whatToGrow: '',
  tools: '',
  availability: '',
  honestyDeclaration: false,
})

const location = ref(null)
const attachments = ref([])

async function fetchMessage() {
  try {
    loading.value = true
    const msgId = route.params.id

    const response = await fetch(
      `${config.public.APIv2}/message/${msgId}`,
      {
        credentials: 'include',
      }
    )

    if (!response.ok) {
      error.value = 'Could not load listing.'
      return
    }

    const data = await response.json()
    message.value = data

    if (!isOwnListing.value) {
      error.value = 'You cannot edit this listing.'
      return
    }

    const parsed = parseTextbody(data.textbody)

    form.subject = data.item || ''
    form.about = parsed.description || ''
    form.gardenSize = parsed.gardenSize || ''
    form.sunExposure = parsed.sunExposure || ''
    form.waterAccess = parsed.waterAccess || ''
    form.accessRoute = parsed.accessRoute || ''
    form.arrangement = parsed.arrangement || ''
    form.restrictions = parsed.restrictions || ''
    form.whatToGrow = parsed.whatToGrow || ''
    form.tools = parsed.tools || ''
    form.availability = parsed.availability || ''
    form.honestyDeclaration = parsed.honestyDeclaration || false

    if (data.lat && data.lng) {
      location.value = {
        lat: data.lat,
        lng: data.lng,
        postcode: '', /* Will be populated if reverse-lookup is needed */
      }
    }

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
  const body = { description: form.about }

  if (message.value?.type === 'Offer') {
    if (form.gardenSize) body.gardenSize = form.gardenSize
    if (form.sunExposure) body.sunExposure = form.sunExposure
    if (form.waterAccess) body.waterAccess = form.waterAccess
    if (form.accessRoute) body.accessRoute = form.accessRoute
    if (form.arrangement) body.arrangement = form.arrangement
    if (form.restrictions) body.restrictions = form.restrictions
  } else {
    if (form.whatToGrow) body.whatToGrow = form.whatToGrow
    if (form.tools) body.tools = form.tools
    if (form.availability) body.availability = form.availability
    if (form.honestyDeclaration) body.honestyDeclaration = true
  }

  return JSON.stringify(body)
}

async function submit() {
  submitting.value = true
  formError.value = ''

  try {
    if (!authStore.user) {
      formError.value = 'You must be logged in.'
      return
    }

    if (!location.value) {
      formError.value = 'Please set your location.'
      return
    }

    const msgApi = api(config).message
    const msgId = route.params.id

    const updatePayload = {
      id: msgId,
      item: form.subject,
      textbody: buildTextbody(),
    }

    if (location.value.lat && location.value.lng) {
      updatePayload.lat = location.value.lat
      updatePayload.lng = location.value.lng
    }

    await msgApi.save(updatePayload)

    navigateTo(`/garden/${msgId}`)
  } catch (e) {
    formError.value = e?.message || 'Failed to save. Please try again.'
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
