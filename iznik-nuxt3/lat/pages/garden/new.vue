<template>
  <div class="page-container">
    <div class="form-card">
      <h1>Share your garden</h1>
      <p class="subtitle">List your garden so tenders can find it and get in touch.</p>

      <form @submit.prevent="submit">
        <div class="field">
          <label for="subject">Garden title</label>
          <input
            id="subject"
            v-model="form.subject"
            type="text"
            placeholder="e.g. Sunny south-facing plot in Bristol"
            required
          />
        </div>

        <div class="field">
          <label for="about">Description</label>
          <textarea
            id="about"
            v-model="form.about"
            rows="4"
            placeholder="Describe your garden — size, sun, what you're looking for..."
          />
        </div>

        <div class="field">
          <label for="postcode">Postcode</label>
          <div class="postcode-row">
            <input
              id="postcode"
              v-model="form.postcode"
              type="text"
              placeholder="e.g. BS1 4QT"
            />
            <button type="button" class="btn btn-secondary" @click="lookupPostcode">
              Find location
            </button>
          </div>
          <p v-if="locationStatus" :class="locationStatus.ok ? 'status-ok' : 'status-err'">
            {{ locationStatus.message }}
          </p>
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>

        <div class="actions">
          <button type="submit" class="btn btn-primary btn-lg" :disabled="submitting || !form.lat">
            {{ submitting ? 'Sharing...' : 'Share my garden' }}
          </button>
          <NuxtLink to="/map" class="btn btn-secondary btn-lg">Cancel</NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })

useHead({ title: 'Share my garden — Lend & Tend' })

const authStore = useAuthStore()
const config = useRuntimeConfig()

const form = reactive({
  subject: '',
  about: '',
  postcode: '',
  lat: 0,
  lng: 0,
})
const locationStatus = ref<{ ok: boolean; message: string } | null>(null)
const error = ref('')
const submitting = ref(false)

async function lookupPostcode() {
  if (!form.postcode.trim()) return
  locationStatus.value = null
  try {
    const resp = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(form.postcode.trim())}`)
    const data = await resp.json()
    if (data.status === 200) {
      form.lat = data.result.latitude
      form.lng = data.result.longitude
      locationStatus.value = { ok: true, message: `Located: ${data.result.admin_district || form.postcode}` }
    } else {
      locationStatus.value = { ok: false, message: 'Postcode not found. Try again.' }
    }
  } catch {
    locationStatus.value = { ok: false, message: 'Could not look up postcode.' }
  }
}

async function submit() {
  if (!form.lat || !form.lng) {
    error.value = 'Please find your location first.'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const resp = await fetch(`${config.public.APIv2}/lat/garden`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authStore.authHeaders(),
      },
      body: JSON.stringify({
        type: 'Offer',
        subject: form.subject,
        about: form.about,
        lat: form.lat,
        lng: form.lng,
      }),
    })
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}))
      throw new Error(body.error || `Error ${resp.status}`)
    }
    navigateTo('/map')
  } catch (e: any) {
    error.value = e.message || 'Failed to share garden. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-container {
  max-width: 600px;
  margin: 40px auto;
  padding: 0 20px;
}

.form-card {
  background: white;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

h1 {
  font-family: var(--lat-font-heading);
  font-size: 1.8rem;
  color: var(--lat-color-text);
  margin: 0 0 8px;
}

.subtitle {
  color: var(--lat-color-text-muted);
  margin: 0 0 32px;
}

.field {
  margin-bottom: 24px;
}

label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--lat-color-text);
}

input, textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

input:focus, textarea:focus {
  outline: none;
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 2px rgba(107, 158, 60, 0.15);
}

.postcode-row {
  display: flex;
  gap: 8px;
}

.postcode-row input {
  flex: 1;
}

.status-ok { color: var(--lat-color-primary); font-size: 0.9rem; margin-top: 6px; }
.status-err { color: #dc3545; font-size: 0.9rem; margin-top: 6px; }

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

.btn-lg { padding: 12px 28px; font-size: 1rem; }

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
