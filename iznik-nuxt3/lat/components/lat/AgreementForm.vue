<template>
  <div class="agreement-form">
    <div v-if="loading" class="loading">Loading…</div>

    <div v-else-if="!isAuthenticated" class="empty-state">
      <p>You must be signed in to view an agreement.</p>
    </div>

    <div v-else-if="!message" class="empty-state">
      <p>Garden listing not found.</p>
    </div>

    <div v-else-if="!isAuthorized" class="empty-state">
      <p>You are not a party to this agreement.</p>
    </div>

    <div v-else class="agreement-details">
      <!-- Status banner -->
      <div v-if="isSealed" class="status-banner sealed">
        ✓ Agreement sealed on {{ sealedDate }}. Both parties have agreed.
      </div>
      <div v-else-if="isProposed" class="status-banner proposed">
        Agreement proposed by the lender. Awaiting tender acceptance.
      </div>
      <div v-else class="status-banner unpromised">
        No agreement in place yet for this garden.
      </div>

      <div class="agreement-meta">
        <div class="meta-row">
          <span class="meta-label">Garden:</span>
          <span>{{ message.subject?.replace(/^(Offer|Wanted):\s*/i, '') || message.subject }}</span>
        </div>
        <div v-if="lenderName" class="meta-row">
          <span class="meta-label">Lender:</span>
          <span>{{ lenderName }}</span>
        </div>
        <div v-if="currentPromise?.Acceptedby" class="meta-row">
          <span class="meta-label">Tender agreed:</span>
          <span>{{ sealedDate }}</span>
        </div>
      </div>

      <!-- Terms form (editable until sealed) -->
      <div class="agreement-terms">
        <h3>Agreement terms</h3>
        <p v-if="!isSealed" class="terms-note">
          Agree the terms before sealing. Both parties must accept.
        </p>

        <div class="form-group">
          <label for="whatToGrow">What will be grown</label>
          <textarea
            id="whatToGrow"
            v-model="terms.whatToGrow"
            rows="2"
            placeholder="e.g. vegetables, herbs, flowers…"
            :disabled="isSealed"
          />
        </div>

        <div class="form-group">
          <label for="accessTimes">Agreed access times</label>
          <textarea
            id="accessTimes"
            v-model="terms.accessTimes"
            rows="2"
            placeholder="e.g. weekends, Tuesday evenings…"
            :disabled="isSealed"
          />
        </div>

        <div class="form-group">
          <label for="otherTerms">Other terms</label>
          <textarea
            id="otherTerms"
            v-model="terms.otherTerms"
            rows="3"
            placeholder="Any other agreed responsibilities or boundaries…"
            :disabled="isSealed"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <!-- Lender: propose agreement -->
        <template v-if="isLender && !isProposed && !isSealed">
          <button class="btn btn-primary" :disabled="saving" @click="propose">
            {{ saving ? 'Saving…' : 'Propose agreement' }}
          </button>
        </template>

        <!-- Tender: accept proposed agreement -->
        <template v-else-if="isTender && isProposed && !isSealed">
          <button class="btn btn-primary" :disabled="saving" @click="accept">
            {{ saving ? 'Saving…' : 'Accept this agreement' }}
          </button>
        </template>

        <!-- Lender: withdraw proposed (before tender accepts) -->
        <template v-if="isLender && isProposed && !isSealed">
          <button class="btn btn-danger" :disabled="saving" @click="withdraw">
            {{ saving ? 'Saving…' : 'Withdraw proposal' }}
          </button>
        </template>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { useMessageStore } from '~/stores/message'
import { useAuthStore } from '~/stores/auth'
import Api from '~/api'

const props = defineProps({
  messageId: { type: Number, required: true },
  otherUserId: { type: Number, required: true },
})

const messageStore = useMessageStore()
const authStore = useAuthStore()
const config = useRuntimeConfig()
const api = Api(config)

const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const terms = reactive({ whatToGrow: '', accessTimes: '', otherTerms: '' })

const me = computed(() => authStore.user)
const message = computed(() => messageStore.byId(props.messageId))

const isAuthenticated = computed(() => !!me.value)
const lenderUserId = computed(() => {
  const fromuser = message.value?.fromuser
  if (!fromuser) return null
  return typeof fromuser === 'number' ? fromuser : parseInt(fromuser?.id)
})
const lenderName = computed(() => {
  const fromuser = message.value?.fromuser
  if (!fromuser) return null
  if (typeof fromuser === 'object') return fromuser.displayname || fromuser.fullname || null
  return null
})
const isLender = computed(() =>
  me.value && lenderUserId.value && lenderUserId.value === parseInt(me.value.id)
)
const isTender = computed(() =>
  me.value && !isLender.value
)
const isAuthorized = computed(() => {
  if (!me.value || !message.value) return false
  const fromuser = message.value.fromuser
  const lenderId = typeof fromuser === 'number' ? fromuser : parseInt(fromuser?.id)
  const tenderId = parseInt(props.otherUserId)
  const userId = parseInt(me.value.id)
  return userId === lenderId || userId === tenderId
})

const currentPromise = computed(() => {
  const promises = message.value?.promises
  if (!promises?.length) return null
  // Find the promise where userid = the other user (tender) or current user
  return promises[0]
})

const isProposed = computed(() => !!currentPromise.value && !currentPromise.value.Acceptedat)
const isSealed = computed(() => !!currentPromise.value?.Acceptedat)

const sealedDate = computed(() => {
  const d = currentPromise.value?.Acceptedat
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
})

onMounted(async () => {
  await messageStore.fetch(props.messageId, true)
  // Pre-fill terms if already in promise
  const existing = currentPromise.value?.Terms
  if (existing) {
    try {
      const parsed = typeof existing === 'string' ? JSON.parse(existing) : existing
      terms.whatToGrow = parsed.whatToGrow || ''
      terms.accessTimes = parsed.accessTimes || ''
      terms.otherTerms = parsed.otherTerms || ''
    } catch {}
  }
  loading.value = false
})

function buildTerms() {
  return JSON.stringify({
    whatToGrow: terms.whatToGrow,
    accessTimes: terms.accessTimes,
    otherTerms: terms.otherTerms,
  })
}

async function propose() {
  if (!me.value) return
  saving.value = true
  error.value = null
  try {
    await messageStore.promise(props.messageId, props.otherUserId)
    await messageStore.fetch(props.messageId, true)
  } catch (e) {
    error.value = e?.message || 'Failed to propose agreement.'
  } finally {
    saving.value = false
  }
}

async function accept() {
  if (!me.value) return
  saving.value = true
  error.value = null
  try {
    await api.message.save({ id: props.messageId, action: 'AcceptAgreement' })
    await messageStore.fetch(props.messageId, true)
  } catch (e) {
    error.value = e?.message || 'Failed to accept agreement.'
  } finally {
    saving.value = false
  }
}

async function withdraw() {
  if (!me.value) return
  saving.value = true
  error.value = null
  try {
    await messageStore.renege(props.messageId, props.otherUserId)
    await messageStore.fetch(props.messageId, true)
  } catch (e) {
    error.value = e?.message || 'Failed to withdraw agreement.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.agreement-form {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.loading, .empty-state {
  text-align: center;
  padding: 32px;
  color: var(--lat-color-text-muted);
}

.agreement-details h2 {
  font-family: var(--lat-font-heading);
  font-size: 1.4rem;
  margin: 0 0 16px;
  color: var(--lat-color-text);
}

.status-banner {
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 20px;
  font-weight: 600;
  font-size: 0.9rem;
}

.status-banner.sealed { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
.status-banner.proposed { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; }
.status-banner.unpromised { background: #f8f9fa; border: 1px solid #dee2e6; color: #6c757d; }

.status-banner p { margin: 0; }

.agreement-meta {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--lat-color-surface);
  border-radius: 6px;
}

.meta-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 0.95rem;
}

.meta-row:last-child { margin-bottom: 0; }

.meta-label {
  font-weight: 600;
  color: var(--lat-color-text);
  min-width: 120px;
}

.agreement-terms h3 {
  font-size: 1.1rem;
  margin: 0 0 8px;
  color: var(--lat-color-text);
}

.terms-note {
  color: var(--lat-color-text-muted);
  font-size: 0.88rem;
  margin-bottom: 16px;
}

.form-group { margin-bottom: 16px; }

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--lat-color-text);
  font-size: 0.9rem;
}

.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  box-sizing: border-box;
  font-family: inherit;
  resize: vertical;
}

.form-group textarea:disabled {
  background: #f5f5f5;
  color: var(--lat-color-text-muted);
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
}

.btn {
  padding: 8px 18px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-primary { background: var(--lat-color-primary); color: white; }
.btn-danger { background: #dc3545; color: white; }

.error-msg {
  margin-top: 12px;
  color: #dc3545;
  font-size: 0.9rem;
}
</style>
