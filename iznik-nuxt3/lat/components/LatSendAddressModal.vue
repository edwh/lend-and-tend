<template>
  <b-modal ref="modal" scrollable size="md" title="Send your garden address">
    <template #default>
      <div v-if="loading" class="text-center py-3">
        <div class="spinner-border" role="status" />
        <p class="mt-2 mb-0 text-muted">Loading your gardens…</p>
      </div>

      <div v-else-if="!gardensWithAddress.length" class="text-muted">
        <p>You don't have any gardens with a saved address yet.</p>
        <p class="mb-0">Add an address by editing your garden listing.</p>
      </div>

      <div v-else>
        <p>
          This will send the full address of your garden to this conversation,
          so they know where to come.
        </p>

        <div v-if="gardensWithAddress.length === 1">
          <p class="mb-1"><strong>Address:</strong></p>
          <div class="address-box">
            {{ gardensWithAddress[0].address }}
          </div>
          <p class="mt-2 mb-0 text-muted small">
            From: {{ gardensWithAddress[0].title }}
          </p>
        </div>

        <div v-else>
          <label for="addr-select" class="form-label fw-bold">
            Choose which garden's address to send:
          </label>
          <select id="addr-select" v-model="selectedId" class="form-select">
            <option v-for="g in gardensWithAddress" :key="g.id" :value="g.id">
              {{ g.title }} — {{ g.address }}
            </option>
          </select>
        </div>
      </div>
    </template>

    <template #footer>
      <b-button variant="secondary" class="me-2" @click="hide">
        Cancel
      </b-button>
      <b-button
        variant="primary"
        :disabled="!chosenAddress || sending"
        @click="confirmSend"
      >
        {{ sending ? 'Sending…' : 'Send this address' }}
      </b-button>
    </template>
  </b-modal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useOurModal } from '~/composables/useOurModal'
import Api from '~/api'

const emit = defineEmits(['hidden', 'sent', 'sentWithAddressId'])

const { modal, hide: hideModal } = useOurModal()
const authStore = useAuthStore()
const config = useRuntimeConfig()
const api = Api(config)

// Set LAT_USE_PAF_ADDRESS=false in nuxt runtime config to force plain-text
// fallback for everyone (debug/fallback flag). Default ON.
const usePafAddress = computed(
  () => config.public.LAT_USE_PAF_ADDRESS !== false
)

const loading = ref(true)
const sending = ref(false)
const gardens = ref([])
const selectedId = ref(null)

const gardensWithAddress = computed(() =>
  gardens.value.filter((g) => g.address)
)

const chosenGarden = computed(() => {
  if (!gardensWithAddress.value.length) return null
  const id = selectedId.value || gardensWithAddress.value[0].id
  return gardensWithAddress.value.find((x) => x.id === id) || null
})

const chosenAddress = computed(() => chosenGarden.value?.address || null)

function parseBody(textbody) {
  if (!textbody) return {}
  try {
    return JSON.parse(textbody)
  } catch {
    return {}
  }
}

function parseAddress(textbody) {
  const body = parseBody(textbody)
  return body.address || body.postcode || null
}

function parsePafId(textbody) {
  const body = parseBody(textbody)
  return body.pafid || null
}

function parseLatLng(message) {
  return {
    lat: message?.lat ?? null,
    lng: message?.lng ?? null,
  }
}

function stripPrefix(subject) {
  if (!subject) return ''
  return subject.replace(/^(Offer|Wanted):\s*/i, '')
}

onMounted(async () => {
  try {
    const uid = authStore.user?.id
    if (!uid) {
      loading.value = false
      return
    }
    const groupid = parseInt(config.public.LAT_WORLD_GROUPID)
    const summaries = await api.message.fetchByUser(uid, true)
    const filtered = (Array.isArray(summaries) ? summaries : []).filter(
      (m) => m.groupid === groupid && m.type === 'Offer'
    )
    const detailed = await Promise.all(
      filtered.map((m) => api.message.fetch(m.id).catch(() => null))
    )
    gardens.value = detailed
      .filter((m) => m !== null)
      .map((m) => ({
        id: m.id,
        title: stripPrefix(m.subject),
        address: parseAddress(m.textbody),
        pafid: parsePafId(m.textbody),
        ...parseLatLng(m),
      }))
    if (gardensWithAddress.value.length) {
      selectedId.value = gardensWithAddress.value[0].id
    }
  } finally {
    loading.value = false
  }
})

function hide() {
  hideModal()
  emit('hidden')
}

async function confirmSend() {
  const garden = chosenGarden.value
  if (!garden) return
  sending.value = true
  try {
    // When we have a PAF id, create a real Freegle Address record so the chat
    // message renders as the proper map-card. The parent's @sentWithAddressId
    // handler will call chatStore.send(chatid, null, addressId).
    if (usePafAddress.value && garden.pafid) {
      try {
        const resp = await api.address.add({
          pafid: garden.pafid,
          lat: garden.lat,
          lng: garden.lng,
          instructions: '',
        })
        const addressId = resp?.id
        if (addressId) {
          emit('sentWithAddressId', addressId)
          hide()
          return
        }
        // fall through to plain text on failure
      } catch (e) {
        // POST /apiv2/address can fail (e.g. invalid PAF) — fall back gracefully.
        console.warn('PAF address create failed, falling back to plain text', e)
      }
    }
    emit('sent', garden.address)
    hide()
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.address-box {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px 14px;
  font-size: 0.95rem;
  color: var(--lat-color-text);
  white-space: pre-line;
}

.form-label {
  display: block;
  margin-bottom: 6px;
}

.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
}

.spinner-border {
  display: inline-block;
  width: 32px;
  height: 32px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-right-color: var(--lat-color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.text-muted {
  color: var(--lat-color-text-muted);
}
.text-center {
  text-align: center;
}
.py-3 {
  padding-top: 16px;
  padding-bottom: 16px;
}
.mt-2 {
  margin-top: 8px;
}
.mb-0 {
  margin-bottom: 0;
}
.mb-1 {
  margin-bottom: 6px;
}
.me-2 {
  margin-right: 8px;
}
.fw-bold {
  font-weight: 700;
}
.small {
  font-size: 0.85rem;
}
</style>
