<template>
  <div class="message-thread d-flex flex-column h-100">
    <!-- Messages scrollable area -->
    <div
      ref="messagesContainer"
      class="messages-area flex-grow-1 overflow-auto p-3"
    >
      <div v-if="messages.length === 0" class="text-center text-muted py-5">
        <p>No messages yet. Start a conversation!</p>
      </div>

      <div v-for="msg in messages" :key="msg.id" class="mb-3">
        <div
          class="message-bubble p-3 rounded"
          :class="isSentByCurrentUser(msg) ? 'sent' : 'received'"
        >
          <p class="m-0">{{ msg.content }}</p>
          <small class="text-muted d-block mt-1">
            {{ formatTime(msg.createdAt) }}
          </small>
        </div>
      </div>
    </div>

    <!-- Paywall banner or compose box -->
    <div class="border-top pt-3 px-3 pb-3">
      <div v-if="isPaywalled" class="alert alert-warning mb-0">
        <p class="mb-0">
          <strong>Upgrade to send messages</strong><br />
          You need to purchase a plan to send private messages.
        </p>
      </div>

      <form v-else @submit.prevent="sendMessage" class="d-flex gap-2">
        <input
          v-model="messageContent"
          type="text"
          class="form-control"
          placeholder="Type a message..."
          :disabled="sending"
        />
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!messageContent.trim() || sending"
        >
          <span v-if="sending" class="spinner-border spinner-border-sm me-2" />
          Send
        </button>
      </form>

      <div v-if="error" class="alert alert-danger mt-2 mb-0">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useLatMessagesStore } from '~/stores/latMessages'
import { useAuthStore } from '~/stores/auth'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface Props {
  otherUserId: number
}

const props = defineProps<Props>()

const messagesStore = useLatMessagesStore()
const authStore = useAuthStore()

const messageContent = ref('')
const sending = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

const messages = computed(() => messagesStore.thread)
const error = computed(() => messagesStore.error)

const isPaywalled = computed(() => {
  const user = authStore.user
  if (!user) return true
  return user.paymentStatus !== 'paid' && user.paymentStatus !== 'concession'
})

const isSentByCurrentUser = (msg: any) => {
  return msg.senderId === authStore.latUserId
}

const formatTime = (timestamp: string) => {
  return dayjs(timestamp).fromNow()
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const sendMessage = async () => {
  if (!messageContent.value.trim()) return

  sending.value = true
  try {
    await messagesStore.sendMessage(props.otherUserId, messageContent.value)
    messageContent.value = ''
    await scrollToBottom()
  } catch (err: any) {
    messagesStore.error = err.message
  } finally {
    sending.value = false
  }
}

// Load thread on mount
onMounted(async () => {
  await messagesStore.fetchThread(props.otherUserId)
  await scrollToBottom()

  // Poll for new messages every 30 seconds
  const pollInterval = setInterval(async () => {
    await messagesStore.fetchThread(props.otherUserId)
  }, 30000)

  // Cleanup on unmount
  const component = getCurrentInstance()
  if (component) {
    onUnmounted(() => {
      clearInterval(pollInterval)
    })
  }
})

// Watch for new messages and scroll to bottom
watch(
  () => messages.value.length,
  async () => {
    await scrollToBottom()
  }
)

// Clear error when user starts typing
watch(messageContent, () => {
  if (error.value) {
    messagesStore.clearError()
  }
})
</script>

<style scoped>
.message-thread {
  min-height: 400px;
  max-height: calc(100vh - 200px);
}

.messages-area {
  background-color: #f5f5f5;
}

.message-bubble {
  max-width: 70%;
  word-wrap: break-word;
}

.message-bubble.sent {
  background-color: #6b9e3c;
  color: white;
  margin-left: auto;
}

.message-bubble.received {
  background-color: #c9a0dc;
  color: white;
}

.message-bubble.sent small {
  color: rgba(255, 255, 255, 0.7);
}

.message-bubble.received small {
  color: rgba(255, 255, 255, 0.7);
}
</style>
