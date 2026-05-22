<template>
  <div class="message-thread d-flex flex-column h-100">
    <!-- Messages scrollable area -->
    <div
      ref="messagesContainer"
      class="messages-area flex-grow-1 overflow-auto p-3"
    >
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <div v-else-if="thread.length === 0" class="text-center text-muted py-5">
        <p>No messages yet. Start a conversation!</p>
      </div>

      <div v-for="msg in thread" :key="msg.id" class="mb-3">
        <div
          class="message-bubble p-3 rounded"
          :class="isSentByCurrentUser(msg) ? 'sent' : 'received'"
        >
          <p class="m-0">{{ msg.message }}</p>
          <small class="text-muted d-block mt-1">
            {{ formatTime(msg.date) }}
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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

const loading = computed(() => messagesStore.loading)
const thread = computed(() => messagesStore.thread)
const error = computed(() => messagesStore.error)
const isPaywalled = computed(() => !authStore.hasMessagingAccess)

const isSentByCurrentUser = (msg: { userid: number }) => {
  return msg.userid === authStore.userId
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
  if (!messageContent.value.trim() || !messagesStore.currentChatId) return
  sending.value = true
  try {
    await messagesStore.sendMessage(messagesStore.currentChatId, messageContent.value)
    messageContent.value = ''
    await scrollToBottom()
  } catch (err: any) {
    messagesStore.error = err.message
  } finally {
    sending.value = false
  }
}

let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  const chatId = await messagesStore.openChatWithUser(props.otherUserId)
  await messagesStore.fetchMessages(chatId)
  await scrollToBottom()

  pollInterval = setInterval(async () => {
    if (messagesStore.currentChatId) {
      await messagesStore.fetchMessages(messagesStore.currentChatId)
    }
  }, 30000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  messagesStore.clearThread()
})

watch(
  () => thread.value.length,
  async () => { await scrollToBottom() }
)

watch(messageContent, () => {
  if (error.value) messagesStore.clearError()
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
