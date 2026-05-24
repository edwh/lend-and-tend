<template>
  <div>
    <h2 class="page-title">Review queue</h2>
    <p class="page-desc">
      Messages flagged by the word filter or reported by users. Review each one
      and approve or reject.
    </p>

    <div v-if="loading" class="muted">Loading…</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <template v-else>
      <div v-if="queue.length === 0" class="empty-state">
        <p>No messages pending review.</p>
      </div>

      <div v-else>
        <div class="queue-meta">
          {{ queue.length }} message{{ queue.length === 1 ? '' : 's' }} pending
          review
        </div>

        <div v-for="item in queue" :key="item.id" class="review-card">
          <div class="review-header">
            <div class="review-meta">
              <span class="review-from"
                >From:
                <strong>{{ item.fromname || item.fromuser }}</strong></span
              >
              <span class="review-date muted">{{ fmtDate(item.date) }}</span>
            </div>
            <span v-if="item.reviewreason" class="review-reason-badge">{{
              item.reviewreason
            }}</span>
          </div>

          <div class="review-body">{{ item.message }}</div>

          <div v-if="item.refmsgid" class="review-ref muted">
            Re: listing
            <NuxtLink :to="`/garden/${item.refmsgid}`"
              >#{{ item.refmsgid }}</NuxtLink
            >
          </div>

          <div class="review-actions">
            <button
              class="btn-action btn-approve"
              :disabled="processing[item.id]"
              @click="approve(item)"
            >
              ✓ Approve
            </button>
            <button
              class="btn-action btn-reject"
              :disabled="processing[item.id]"
              @click="reject(item)"
            >
              ✗ Reject
            </button>
            <button
              class="btn-action btn-hold"
              :disabled="processing[item.id]"
              @click="hold(item)"
            >
              ⏸ Hold
            </button>
          </div>

          <div
            v-if="actionResult[item.id]"
            class="action-result"
            :class="actionResult[item.id].type"
          >
            {{ actionResult[item.id].msg }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { useChatStore } from '~/stores/chat'
import Api from '~/api'

definePageMeta({ layout: 'admin' })

const config = useRuntimeConfig()
const api = Api(config)
const chatStore = useChatStore()

const queue = ref([])
const loading = ref(true)
const error = ref('')
const processing = reactive({})
const actionResult = reactive({})

async function loadQueue() {
  loading.value = true
  error.value = ''
  try {
    const result = await api.chat.fetchReviewChatsMT({ reviewrequired: 1 })
    queue.value = result?.chatmessages ?? []
  } catch {
    error.value = 'Could not load review queue. Please try again.'
  } finally {
    loading.value = false
  }
}

async function doAction(item, action) {
  processing[item.id] = true
  try {
    if (action === 'approve') await chatStore.approveChat(item.id)
    else if (action === 'reject') await chatStore.rejectChat(item.id)
    else await chatStore.holdChat(item.id)

    actionResult[item.id] = {
      type: action === 'approve' ? 'success' : 'muted',
      msg:
        action === 'approve'
          ? 'Approved — message delivered.'
          : action === 'reject'
          ? 'Rejected — message blocked.'
          : 'Held for further review.',
    }
    queue.value = queue.value.filter((m) => m.id !== item.id)
  } catch {
    actionResult[item.id] = {
      type: 'error',
      msg: 'Action failed. Please try again.',
    }
  } finally {
    processing[item.id] = false
  }
}

const approve = (item) => doAction(item, 'approve')
const reject = (item) => doAction(item, 'reject')
const hold = (item) => doAction(item, 'hold')

function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

onMounted(loadQueue)
</script>

<style scoped>
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a2e0d;
  margin: 0 0 6px;
}

.page-desc {
  font-size: 0.88rem;
  color: #5c6b4a;
  margin: 0 0 24px;
}

.empty-state {
  background: white;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  color: #5c6b4a;
  font-size: 0.9rem;
}

.queue-meta {
  font-size: 0.82rem;
  color: #5c6b4a;
  margin-bottom: 12px;
}

.review-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.07);
  padding: 20px;
  margin-bottom: 16px;
}

.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.review-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
}

.review-reason-badge {
  background: #fff3e0;
  color: #e65100;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
}

.review-body {
  font-size: 0.93rem;
  color: #1a2e0d;
  background: #f9faf5;
  border-left: 3px solid #ddd;
  padding: 10px 14px;
  border-radius: 4px;
  margin-bottom: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.review-ref {
  font-size: 0.78rem;
  margin-bottom: 12px;
}

.review-ref a {
  color: #4a7a26;
}

.review-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-action {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-approve {
  background: #e8f5e9;
  color: #2d5a27;
}
.btn-approve:hover:not(:disabled) {
  background: #c8e6c9;
}

.btn-reject {
  background: #ffebee;
  color: #c62828;
}
.btn-reject:hover:not(:disabled) {
  background: #ffcdd2;
}

.btn-hold {
  background: #fff3e0;
  color: #e65100;
}
.btn-hold:hover:not(:disabled) {
  background: #ffe0b2;
}

.action-result {
  font-size: 0.8rem;
  margin-top: 8px;
  padding: 4px 8px;
  border-radius: 4px;
}

.action-result.success {
  background: #e8f5e9;
  color: #2d5a27;
}
.action-result.muted {
  background: #f5f5f5;
  color: #5c6b4a;
}
.action-result.error {
  background: #ffebee;
  color: #c62828;
}

.muted {
  color: #5c6b4a;
}
.error-msg {
  background: #ffebee;
  color: #c62828;
  padding: 12px 16px;
  border-radius: 6px;
}
</style>
