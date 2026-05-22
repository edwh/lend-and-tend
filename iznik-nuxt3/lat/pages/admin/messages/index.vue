<template>
  <div class="messages-page">
    <h2>Flagged Messages</h2>

    <div class="controls-section">
      <label class="show-reviewed-toggle">
        <input v-model="showReviewed" type="checkbox" />
        Show reviewed messages
      </label>
    </div>

    <div v-if="loading" class="loading-state">
      <p>Loading messages...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="filteredMessages.length === 0" class="empty-state">
      <p>No flagged messages to review</p>
    </div>

    <div v-else class="table-wrapper">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Message</th>
            <th>Flagged</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="msg in filteredMessages" :key="msg.id">
            <td>
              <NuxtLink :to="`/admin/users/${msg.senderId}`">
                {{ msg.senderDisplayName }}
              </NuxtLink>
            </td>
            <td>
              <NuxtLink :to="`/admin/users/${msg.recipientId}`">
                {{ msg.recipientDisplayName }}
              </NuxtLink>
            </td>
            <td class="message-preview">{{ truncateMessage(msg.content) }}</td>
            <td class="flagged-at">{{ formatDate(msg.createdAt) }}</td>
            <td class="actions">
              <button
                class="btn btn-sm btn-success me-2"
                :disabled="reviewingIds.includes(msg.id)"
                @click="reviewMessage(msg.id, true)"
              >
                {{ reviewingIds.includes(msg.id) ? '...' : 'Approve' }}
              </button>
              <button
                class="btn btn-sm btn-danger"
                :disabled="reviewingIds.includes(msg.id)"
                @click="reviewMessage(msg.id, false)"
              >
                {{ reviewingIds.includes(msg.id) ? '...' : 'Delete' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface FlaggedMessage {
  id: number
  senderId: number
  senderDisplayName: string
  recipientId: number
  recipientDisplayName: string
  content: string
  createdAt: string
  reviewed: boolean
}

interface FlaggedMessagesResponse {
  messages: FlaggedMessage[]
}

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const loading = ref(true)
const error = ref('')
const messages = ref<FlaggedMessage[]>([])
const showReviewed = ref(false)
const reviewingIds = ref<number[]>([])

const filteredMessages = computed(() => {
  return messages.value.filter((msg) => showReviewed.value || !msg.reviewed)
})

onMounted(async () => {
  await fetchMessages()
})

async function fetchMessages() {
  try {
    loading.value = true
    error.value = ''
    const response = await $fetch<FlaggedMessagesResponse>('/apiv2/admin/messages/flagged')
    messages.value = response.messages || []
  } catch (e: any) {
    error.value = e.data?.error || 'Failed to load messages'
  } finally {
    loading.value = false
  }
}

function truncateMessage(content: string, length = 80): string {
  return content.length > length ? content.substring(0, length) + '...' : content
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function reviewMessage(msgId: number, approve: boolean) {
  reviewingIds.value.push(msgId)
  try {
    await $fetch(`/apiv2/admin/messages/${msgId}/review`, {
      method: 'POST',
      body: { approve },
    })

    if (approve) {
      const msg = messages.value.find((m) => m.id === msgId)
      if (msg) {
        msg.reviewed = true
      }
    } else {
      messages.value = messages.value.filter((m) => m.id !== msgId)
    }
  } catch (e: any) {
    error.value = e.data?.error || 'Failed to review message'
  } finally {
    reviewingIds.value = reviewingIds.value.filter((id) => id !== msgId)
  }
}
</script>

<style scoped lang="scss">
.messages-page {
  h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: #1a2210;
  }
}

.controls-section {
  background: white;
  padding: 1rem;
  border: 1px solid #ddd;
  margin-bottom: 1.5rem;
  border-radius: 3px;

  .show-reviewed-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.95rem;
    color: #1a2210;

    input[type='checkbox'] {
      cursor: pointer;
    }
  }
}

.loading-state,
.error-state,
.empty-state {
  background: white;
  padding: 2rem;
  border: 1px solid #ddd;
  text-align: center;
  color: #5c6b4a;
}

.error-state {
  color: #d32f2f;
  border-left: 4px solid #d32f2f;
}

.table-wrapper {
  background: white;
  border: 1px solid #ddd;
  overflow: hidden;

  .table {
    margin-bottom: 0;

    thead {
      background-color: #f9faf5;

      th {
        border-bottom: 2px solid #ddd;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        color: #1a2210;
      }
    }

    tbody {
      tr {
        &:hover {
          background-color: #fafafa;
        }

        td {
          vertical-align: middle;
          font-size: 0.95rem;

          a {
            color: #0066cc;
            text-decoration: none;

            &:hover {
              text-decoration: underline;
            }
          }

          &.message-preview {
            max-width: 300px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #5c6b4a;
          }

          &.flagged-at {
            font-size: 0.85rem;
            color: #999;
            white-space: nowrap;
          }

          &.actions {
            white-space: nowrap;
          }
        }
      }
    }
  }
}

.btn {
  font-size: 0.8rem;
  padding: 0.3rem 0.6rem;
}

@media (max-width: 768px) {
  .table-wrapper {
    :deep(table) {
      font-size: 0.85rem;

      td,
      th {
        padding: 0.5rem;
      }

      .message-preview {
        max-width: 150px;
      }
    }
  }
}
</style>
