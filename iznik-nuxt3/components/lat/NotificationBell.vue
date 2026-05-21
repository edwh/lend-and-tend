<template>
  <div class="notification-bell">
    <!-- Bell Icon Button -->
    <button
      class="btn btn-sm btn-outline-primary position-relative"
      @click="toggleDropdown"
      :title="`${unreadCount} unread notifications`"
      aria-label="Notifications"
    >
      <i class="bi bi-bell"></i>
      <!-- Badge for unread count -->
      <span v-if="unreadCount > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
        {{ unreadCount }}
      </span>
    </button>

    <!-- Dropdown Menu -->
    <div v-if="isOpen" class="notification-dropdown card shadow-lg">
      <div class="card-header bg-light">
        <h6 class="mb-0">Notifications</h6>
      </div>

      <div class="card-body notification-list">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-4">
          <div class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <!-- No Notifications -->
        <div v-else-if="notifications.length === 0" class="text-center py-4 text-muted">
          <p class="mb-0">No notifications yet</p>
        </div>

        <!-- Notifications List -->
        <div v-else class="list-group list-group-flush">
          <div
            v-for="notification in recentNotifications"
            :key="notification.id"
            :class="[
              'list-group-item list-group-item-action',
              { 'list-group-item-light': notification.read },
            ]"
            @click="handleNotificationClick(notification)"
          >
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <h6 class="mb-1 fw-bold">{{ notification.title }}</h6>
                <p class="mb-1 small">{{ notification.body }}</p>
                <small class="text-muted">{{ formatTime(notification.createdAt) }}</small>
              </div>
              <button
                v-if="!notification.read"
                class="btn btn-sm btn-link p-0 ms-2"
                @click.stop="markAsRead(notification.id)"
                title="Mark as read"
              >
                <i class="bi bi-x-circle"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="notifications.length > 0" class="card-footer text-center">
        <button class="btn btn-sm btn-link" @click="goToNotifications">
          View all notifications
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLatNotificationsStore } from '~/stores/latNotifications'
import { useLatUserStore } from '~/stores/latUser'

const notificationsStore = useLatNotificationsStore()
const userStore = useLatUserStore()
const router = useRouter()

const isOpen = ref(false)

const notifications = computed(() => notificationsStore.notifications)
const unreadCount = computed(() => notificationsStore.unreadCount)
const loading = computed(() => notificationsStore.loading)

// Show only the 5 most recent notifications in the dropdown
const recentNotifications = computed(() => notifications.value.slice(0, 5))

// Fetch notifications on mount
onMounted(async () => {
  if (userStore.isAuthenticated) {
    try {
      await notificationsStore.fetchNotifications()
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const markAsRead = async (notificationId: number) => {
  try {
    await notificationsStore.markRead(notificationId)
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
  }
}

const handleNotificationClick = (notification: any) => {
  if (notification.link) {
    // Mark as read and navigate
    if (!notification.read) {
      markAsRead(notification.id)
    }
    router.push(notification.link)
    isOpen.value = false
  }
}

const goToNotifications = () => {
  router.push('/lat/notifications')
  isOpen.value = false
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
</script>

<style scoped lang="scss">
.notification-bell {
  position: relative;
  display: inline-block;

  .btn {
    position: relative;

    &:focus {
      box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
    }
  }

  .badge {
    font-size: 0.65rem;
    padding: 0.25rem 0.4rem;
    top: -0.25rem !important;
    right: -0.5rem !important;
  }
}

.notification-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 0.5rem;
  min-width: 320px;
  max-width: 400px;
  z-index: 1060;
  max-height: 500px;
  overflow-y: auto;

  .notification-list {
    max-height: 350px;
    overflow-y: auto;

    .list-group-item {
      cursor: pointer;
      border: none;
      border-bottom: 1px solid rgba(0, 0, 0, 0.125);

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background-color: rgba(13, 110, 253, 0.05);
      }

      h6 {
        color: #333;
      }

      p {
        color: #666;
      }

      &.list-group-item-light {
        opacity: 0.7;
      }
    }
  }

  .card-header {
    border-bottom: 1px solid rgba(0, 0, 0, 0.125);

    h6 {
      font-size: 0.95rem;
      margin: 0;
    }
  }

  .card-footer {
    border-top: 1px solid rgba(0, 0, 0, 0.125);
    padding: 0.5rem;
  }
}
</style>
