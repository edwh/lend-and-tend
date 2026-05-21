<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <NuxtLink to="/lat/messages" class="btn btn-outline-secondary btn-sm">
              &larr; Back
            </NuxtLink>
            <h1 class="mt-3 mb-0">{{ otherUserName }}</h1>
          </div>
          <button
            class="btn btn-danger btn-sm"
            @click="blockUser"
            :disabled="blocking"
          >
            <span v-if="blocking" class="spinner-border spinner-border-sm me-2" />
            Block User
          </button>
        </div>

        <div v-if="blockError" class="alert alert-danger">
          {{ blockError }}
        </div>

        <!-- Message Thread -->
        <div class="card">
          <MessageThread :other-user-id="userId" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLatMessagesStore } from '~/stores/latMessages'
import MessageThread from '~/components/lat/MessageThread.vue'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()

const messagesStore = useLatMessagesStore()

const userId = computed(() => parseInt(route.params.userId as string))
const otherUserName = ref('User')
const blocking = ref(false)
const blockError = ref('')

const getOtherUserName = async () => {
  const conv = messagesStore.conversations.find(
    c => c.otherUserId === userId.value
  )
  if (conv) {
    otherUserName.value = conv.otherDisplayName
  }
}

const blockUser = async () => {
  blocking.value = true
  blockError.value = ''
  try {
    await messagesStore.blockUser(userId.value)
    // Redirect back to conversations after blocking
    await router.push('/lat/messages')
  } catch (err: any) {
    blockError.value = err.message || 'Failed to block user'
  } finally {
    blocking.value = false
  }
}

onMounted(async () => {
  // If conversations aren't loaded, fetch them
  if (messagesStore.conversations.length === 0) {
    await messagesStore.fetchConversations()
  }

  await getOtherUserName()
})
</script>

<style scoped>
.card {
  border: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
