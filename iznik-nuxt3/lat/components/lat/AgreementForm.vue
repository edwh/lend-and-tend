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
      <p>You don't have access to this agreement.</p>
    </div>

    <div v-else class="agreement-details">
      <!-- Status banner -->
      <div v-if="isConfirmed" class="status-banner confirmed">
        ✓ Agreement confirmed on {{ confirmedDate }}. Both of you are good to
        go!
      </div>
      <div v-else-if="isProposed" class="status-banner proposed">
        <strong>{{
          isLender
            ? "You've sent this agreement to the tender — waiting for them to accept."
            : 'The lender has sent you this agreement and is waiting for your response.'
        }}</strong>
        <span v-if="isTender">
          Read the terms below and accept when you're happy, or suggest
          changes.</span
        >
      </div>
      <div v-else class="status-banner draft">
        Draft — fill in the terms below and send to the tender when ready.
      </div>

      <div class="agreement-meta">
        <div class="meta-row">
          <span class="meta-label">Garden:</span>
          <span>{{ gardenName }}</span>
        </div>
        <div v-if="gardenAddress" class="meta-row">
          <span class="meta-label">Address:</span>
          <span>{{ gardenAddress }}</span>
        </div>
        <div v-if="lenderName" class="meta-row">
          <span class="meta-label">Lender:</span>
          <span>{{ lenderName }}</span>
        </div>
        <div v-if="isConfirmed" class="meta-row">
          <span class="meta-label">Confirmed:</span>
          <span>{{ confirmedDate }}</span>
        </div>
      </div>

      <!-- How it works (draft state only) -->
      <div v-if="!isProposed && !isConfirmed && isLender" class="how-it-works">
        <h3>How it works</h3>
        <ol>
          <li>
            Fill in the terms below — what will be grown, when you'll visit, and
            any other ground rules.
          </li>
          <li>
            Click <strong>Send to tender</strong> — they'll get a message in
            chat with a link to this page.
          </li>
          <li>
            They read the terms and accept. If they want changes, they can
            suggest them in chat.
          </li>
        </ol>
      </div>

      <!-- Terms form -->
      <div class="agreement-terms">
        <h3>{{ isConfirmed ? 'Agreed terms' : 'Terms' }}</h3>
        <p v-if="!isConfirmed && isLender" class="terms-note">
          {{
            isProposed
              ? 'You can still update these until the tender accepts.'
              : 'Complete the terms before sending.'
          }}
        </p>
        <p v-if="!isConfirmed && isTender && isProposed" class="terms-note">
          If something needs changing, edit the text and click
          <strong>Suggest changes</strong> — or just chat to the lender.
        </p>

        <div class="form-group">
          <label for="whatToGrow">What will be grown</label>
          <textarea
            id="whatToGrow"
            v-model="terms.whatToGrow"
            rows="2"
            placeholder="e.g. vegetables, herbs, flowers…"
            :disabled="isConfirmed"
          />
        </div>

        <div class="form-group">
          <label for="accessTimes">Agreed access times</label>
          <textarea
            id="accessTimes"
            v-model="terms.accessTimes"
            rows="2"
            placeholder="e.g. weekends, Tuesday evenings…"
            :disabled="isConfirmed"
          />
        </div>

        <div class="form-group">
          <label for="otherTerms">Other terms</label>
          <textarea
            id="otherTerms"
            v-model="terms.otherTerms"
            rows="3"
            placeholder="Any other agreed responsibilities or ground rules…"
            :disabled="isConfirmed"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <!-- Lender: send to tender (creates the promise) -->
        <template v-if="isLender && !isProposed && !isConfirmed">
          <button class="btn btn-ghost" @click="$emit('goBack')">Close</button>
          <button class="btn btn-primary" :disabled="saving" @click="propose">
            {{ saving ? 'Sending…' : 'Send to tender' }}
          </button>
        </template>

        <!-- Lender: update terms after sending (before tender accepts) -->
        <template v-if="isLender && isProposed && !isConfirmed">
          <div class="actions-left">
            <button class="btn btn-ghost" @click="$emit('goBack')">
              Close
            </button>
            <button
              class="btn btn-danger-outline"
              :disabled="saving"
              @click="withdraw"
            >
              Withdraw agreement
            </button>
          </div>
          <button
            class="btn btn-secondary"
            :disabled="saving"
            @click="saveTerms"
          >
            {{ saving ? 'Saving…' : 'Update terms' }}
          </button>
        </template>

        <!-- Tender: suggest changes to terms -->
        <template v-if="isTender && isProposed && !isConfirmed && termsChanged">
          <button class="btn btn-ghost" @click="$emit('goBack')">Close</button>
          <button
            class="btn btn-secondary"
            :disabled="saving"
            @click="suggestChanges"
          >
            {{ saving ? 'Sending…' : 'Suggest changes' }}
          </button>
        </template>

        <!-- Tender: accept the agreement -->
        <template v-if="isTender && isProposed && !isConfirmed">
          <button class="btn btn-ghost" @click="$emit('goBack')">Close</button>
          <button class="btn btn-primary" :disabled="saving" @click="accept">
            {{ saving ? 'Confirming…' : 'Accept and confirm' }}
          </button>
        </template>
      </div>

      <p v-if="saveSuccess" class="success-msg">{{ saveSuccess }}</p>
      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { useMessageStore } from '~/stores/message'
import { useAuthStore } from '~/stores/auth'
import { useChatStore } from '~/stores/chat'
import Api from '~/api'

const props = defineProps({
  messageId: { type: Number, required: true },
  otherUserId: { type: Number, required: true },
})

const messageStore = useMessageStore()
const authStore = useAuthStore()
const chatStore = useChatStore()
const config = useRuntimeConfig()
const api = Api(config)

const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const saveSuccess = ref(null)
const terms = reactive({ whatToGrow: '', accessTimes: '', otherTerms: '' })
const originalTerms = ref({ whatToGrow: '', accessTimes: '', otherTerms: '' })

const me = computed(() => authStore.user)
const message = computed(() => messageStore.byId(props.messageId))

const isAuthenticated = computed(() => !!me.value)

const lenderUserId = computed(() => {
  const fromuser = message.value?.fromuser
  if (!fromuser) return null
  return typeof fromuser === 'object'
    ? parseInt(fromuser?.id)
    : parseInt(fromuser)
})

const lenderName = computed(() => {
  const fromuser = message.value?.fromuser
  if (!fromuser || typeof fromuser !== 'object') return null
  return fromuser.displayname || fromuser.fullname || null
})

const gardenName = computed(
  () =>
    message.value?.subject?.replace(/^(Offer|Wanted):\s*/i, '') ||
    message.value?.subject ||
    ''
)

const gardenAddress = computed(() => {
  if (!message.value?.textbody) return null
  try {
    const body =
      typeof message.value.textbody === 'string'
        ? JSON.parse(message.value.textbody)
        : message.value.textbody
    return body.address || body.postcode || null
  } catch {
    return null
  }
})

const isLender = computed(
  () =>
    me.value &&
    lenderUserId.value &&
    lenderUserId.value === parseInt(me.value.id)
)

const isTender = computed(() => me.value && !isLender.value)

const isAuthorized = computed(() => {
  if (!me.value || !message.value) return false
  const userId = parseInt(me.value.id)
  const lenderId = lenderUserId.value
  const otherPartyId = parseInt(props.otherUserId)

  // I am the lender
  if (userId === lenderId) return true
  // I am explicitly named as the tender in the URL
  if (userId === otherPartyId) return true
  // otherUserId IS the lender — meaning I navigated here from my chat with the lender (I'm the tender)
  if (otherPartyId === lenderId) return true

  return false
})

const currentPromise = computed(() => {
  const promises = message.value?.promises
  return promises?.length ? promises[0] : null
})

const isProposed = computed(
  () => !!currentPromise.value && !currentPromise.value.acceptedat
)
const isConfirmed = computed(() => !!currentPromise.value?.acceptedat)

const confirmedDate = computed(() => {
  const d = currentPromise.value?.acceptedat
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const termsChanged = computed(() => {
  return (
    terms.whatToGrow !== originalTerms.value.whatToGrow ||
    terms.accessTimes !== originalTerms.value.accessTimes ||
    terms.otherTerms !== originalTerms.value.otherTerms
  )
})

function loadTermsFromMessage() {
  if (!message.value?.textbody) return
  try {
    const body =
      typeof message.value.textbody === 'string'
        ? JSON.parse(message.value.textbody)
        : message.value.textbody
    const t = body.proposedTerms || {}
    terms.whatToGrow = t.whatToGrow || ''
    terms.accessTimes = t.accessTimes || ''
    terms.otherTerms = t.otherTerms || ''
    originalTerms.value = { ...terms }
  } catch {
    /* ignore parse errors */
  }
}

onMounted(async () => {
  await messageStore.fetch(props.messageId, true)
  loadTermsFromMessage()
  loading.value = false
})

function buildUpdatedTextbody() {
  let body = {}
  if (message.value?.textbody) {
    try {
      body =
        typeof message.value.textbody === 'string'
          ? JSON.parse(message.value.textbody)
          : { ...message.value.textbody }
    } catch {
      /* start fresh */
    }
  }
  body.proposedTerms = {
    whatToGrow: terms.whatToGrow,
    accessTimes: terms.accessTimes,
    otherTerms: terms.otherTerms,
  }
  return JSON.stringify(body)
}

async function goToChat() {
  try {
    const chatId = await chatStore.openChat({ userid: props.otherUserId })
    if (chatId) {
      navigateTo(`/chats/${chatId}`)
    } else {
      navigateTo('/chats')
    }
  } catch {
    navigateTo('/chats')
  }
}

async function propose() {
  if (!me.value) return
  saving.value = true
  error.value = null
  saveSuccess.value = null
  try {
    // Save terms into the message body first
    await api.message.save({
      id: props.messageId,
      textbody: buildUpdatedTextbody(),
    })
    // Create the promise (sends the Promised chat message as notification)
    await messageStore.promise(props.messageId, props.otherUserId)
    await messageStore.fetch(props.messageId, true)
    originalTerms.value = { ...terms }
    // Navigate back to chat so they can see the Promised card
    await goToChat()
  } catch (e) {
    error.value = e?.message || 'Failed to send agreement.'
  } finally {
    saving.value = false
  }
}

async function saveTerms() {
  if (!me.value) return
  saving.value = true
  error.value = null
  saveSuccess.value = null
  try {
    await api.message.save({
      id: props.messageId,
      textbody: buildUpdatedTextbody(),
    })
    await messageStore.fetch(props.messageId, true)
    originalTerms.value = { ...terms }
    saveSuccess.value = 'Terms updated.'
  } catch (e) {
    error.value = e?.message || 'Failed to save terms.'
  } finally {
    saving.value = false
  }
}

async function suggestChanges() {
  if (!me.value) return
  saving.value = true
  error.value = null
  saveSuccess.value = null
  try {
    await api.message.save({
      id: props.messageId,
      textbody: buildUpdatedTextbody(),
    })
    await messageStore.fetch(props.messageId, true)
    originalTerms.value = { ...terms }
    // Let lender know via chat
    const chatId = await chatStore.openChat({ userid: props.otherUserId })
    if (chatId)
      await chatStore.send(
        chatId,
        "I've suggested some changes to the agreement terms — please take a look."
      )
    saveSuccess.value = 'Changes sent. The lender has been notified in chat.'
  } catch (e) {
    error.value = e?.message || 'Failed to send suggestions.'
  } finally {
    saving.value = false
  }
}

async function accept() {
  if (!me.value) return
  saving.value = true
  error.value = null
  saveSuccess.value = null
  try {
    await api.message.update({ id: props.messageId, action: 'AcceptAgreement' })
    await messageStore.fetch(props.messageId, true)
    saveSuccess.value = 'Agreement confirmed! 🌱'
  } catch (e) {
    error.value = e?.message || 'Failed to confirm agreement.'
  } finally {
    saving.value = false
  }
}

async function withdraw() {
  if (!me.value) return
  saving.value = true
  error.value = null
  saveSuccess.value = null
  try {
    await messageStore.renege(props.messageId, props.otherUserId)
    await messageStore.fetch(props.messageId, true)
    saveSuccess.value = 'Agreement withdrawn.'
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.loading,
.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--lat-color-text-muted);
}

.status-banner {
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.status-banner.confirmed {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}
.status-banner.proposed {
  background: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
}
.status-banner.draft {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  color: #6c757d;
}

.agreement-meta {
  margin-bottom: 20px;
  padding: 14px 16px;
  background: var(--lat-color-surface, #f9faf5);
  border-radius: 6px;
}

.meta-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 0.95rem;
}
.meta-row:last-child {
  margin-bottom: 0;
}

.meta-label {
  font-weight: 600;
  color: var(--lat-color-text);
  min-width: 100px;
}

.how-it-works {
  background: #f0f7e8;
  border-radius: 6px;
  padding: 14px 16px;
  margin-bottom: 20px;
}
.how-it-works h3 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--lat-color-text);
}
.how-it-works ol {
  margin: 0;
  padding-left: 20px;
  font-size: 0.9rem;
  color: var(--lat-color-text-muted);
}
.how-it-works li {
  margin-bottom: 4px;
}

.agreement-terms h3 {
  font-size: 1.05rem;
  margin: 0 0 6px;
  color: var(--lat-color-text);
}

.terms-note {
  color: var(--lat-color-text-muted);
  font-size: 0.88rem;
  margin-bottom: 14px;
}

.form-group {
  margin-bottom: 16px;
}

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

.form-group textarea:focus {
  outline: none;
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 2px rgba(107, 158, 60, 0.15);
}

.form-group textarea:disabled {
  background: #f5f5f5;
  color: var(--lat-color-text-muted);
}

.actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
  align-items: center;
}

.actions-left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn {
  padding: 8px 18px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-secondary {
  background: transparent;
  color: var(--lat-color-primary);
  border: 2px solid var(--lat-color-primary);
}
.btn-ghost {
  background: transparent;
  color: var(--lat-color-text-muted);
  border: 2px solid #ccc;
  font-size: 0.88rem;
  padding: 8px 12px;
}
.btn-ghost:hover {
  color: var(--lat-color-text);
  border-color: #aaa;
}
.btn-danger-outline {
  background: transparent;
  color: #dc3545;
  border: 2px solid #dc3545;
}
.btn-danger-outline:hover {
  background: #dc3545;
  color: white;
}

.success-msg {
  margin-top: 12px;
  color: #155724;
  font-size: 0.9rem;
  background: #d4edda;
  padding: 8px 12px;
  border-radius: 4px;
}

.error-msg {
  margin-top: 12px;
  color: #dc3545;
  font-size: 0.9rem;
}
</style>
