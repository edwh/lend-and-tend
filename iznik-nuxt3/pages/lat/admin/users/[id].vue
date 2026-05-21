<template>
  <div class="lat-admin-user-detail">
    <div class="page-header">
      <h1>User Profile</h1>
      <NuxtLink to="/lat/admin/users" class="back-link">← Back to Users</NuxtLink>
    </div>

    <div v-if="loading" class="loading">
      <p>Loading user...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="user" class="user-detail">
      <!-- User Info Card -->
      <div class="info-card">
        <h2>User Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Email</label>
            <p>{{ user.email }}</p>
          </div>
          <div class="info-item">
            <label>Name</label>
            <p>{{ user.displayName || '—' }}</p>
          </div>
          <div class="info-item">
            <label>Role</label>
            <p>
              <span class="role-badge" :class="user.role">
                {{ roleLabel(user.role) }}
              </span>
            </p>
          </div>
          <div class="info-item">
            <label>Joined</label>
            <p>{{ formatDate(user.createdAt) }}</p>
          </div>
          <div class="info-item">
            <label>Travel Radius</label>
            <p>{{ user.travelRadius }} km</p>
          </div>
          <div class="info-item">
            <label>Last Active</label>
            <p>{{ formatDate(user.lastActiveAt) }}</p>
          </div>
        </div>
      </div>

      <!-- Admin Actions Card -->
      <div class="actions-card">
        <h2>Admin Actions</h2>

        <!-- Active Status -->
        <div class="action-group">
          <label for="active-toggle">Account Status:</label>
          <div class="toggle-group">
            <label class="toggle">
              <input
                id="active-toggle"
                v-model="editData.active"
                type="checkbox"
              />
              <span class="toggle-label">
                {{ editData.active ? 'Active' : 'Inactive (Banned)' }}
              </span>
            </label>
            <button v-if="editData.active !== user.active" class="btn btn-save" @click="saveActive">
              Save
            </button>
          </div>
        </div>

        <!-- Payment Status -->
        <div class="action-group">
          <label for="payment-status">Payment Status:</label>
          <div class="select-group">
            <select id="payment-status" v-model="editData.paymentStatus">
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="concession">Concession</option>
            </select>
            <button v-if="editData.paymentStatus !== user.paymentStatus" class="btn btn-save" @click="savePaymentStatus">
              Save
            </button>
          </div>
        </div>

        <!-- Admin Toggle -->
        <div class="action-group">
          <label for="admin-toggle">Admin Access:</label>
          <div class="toggle-group">
            <label class="toggle">
              <input
                id="admin-toggle"
                v-model="editData.isAdmin"
                type="checkbox"
              />
              <span class="toggle-label">
                {{ editData.isAdmin ? 'Admin' : 'Regular User' }}
              </span>
            </label>
            <button v-if="editData.isAdmin !== user.isAdmin" class="btn btn-save" @click="saveAdmin">
              Save
            </button>
          </div>
        </div>

        <!-- Impersonate Button -->
        <div class="action-group">
          <button class="btn btn-secondary" @click="impersonateUser">
            🔍 Impersonate User
          </button>
          <p class="help-text">Start a session as this user to debug issues</p>
        </div>
      </div>

      <!-- Messages Info Card -->
      <div class="info-card">
        <h2>User Messages</h2>
        <p class="help-text">
          <NuxtLink to="#">View message history →</NuxtLink>
        </p>
      </div>

      <!-- Status Messages -->
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

definePageMeta({
  layout: 'admin',
})

interface User {
  id: number
  email: string
  displayName: string
  role: string
  paymentStatus: string
  isAdmin: boolean
  active: boolean
  createdAt: string
  lastActiveAt: string
  travelRadius: number
}

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const user = ref<User | null>(null)
const successMessage = ref('')
const errorMessage = ref('')

const editData = reactive({
  active: false,
  paymentStatus: 'unpaid',
  isAdmin: false,
})

const userId = computed(() => parseInt(route.params.id as string))

onMounted(() => {
  fetchUser()
})

const fetchUser = async () => {
  try {
    loading.value = true
    error.value = ''
    const response = await $fetch<User>(`/apiv2/lat/admin/users/${userId}`)
    user.value = response
    editData.active = response.active
    editData.paymentStatus = response.paymentStatus
    editData.isAdmin = response.isAdmin
  } catch (e: any) {
    error.value = e.data?.error || 'Failed to load user'
  } finally {
    loading.value = false
  }
}

const saveActive = async () => {
  try {
    successMessage.value = ''
    errorMessage.value = ''
    const response = await $fetch<User>(`/apiv2/lat/admin/users/${userId}`, {
      method: 'PATCH',
      body: {
        active: editData.active,
      },
    })
    user.value = response
    successMessage.value = 'Account status updated successfully'
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (e: any) {
    errorMessage.value = e.data?.error || 'Failed to update status'
  }
}

const savePaymentStatus = async () => {
  try {
    successMessage.value = ''
    errorMessage.value = ''
    const response = await $fetch<User>(`/apiv2/lat/admin/users/${userId}`, {
      method: 'PATCH',
      body: {
        paymentStatus: editData.paymentStatus,
      },
    })
    user.value = response
    successMessage.value = 'Payment status updated successfully'
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (e: any) {
    errorMessage.value = e.data?.error || 'Failed to update payment status'
  }
}

const saveAdmin = async () => {
  try {
    successMessage.value = ''
    errorMessage.value = ''
    const response = await $fetch<User>(`/apiv2/lat/admin/users/${userId}`, {
      method: 'PATCH',
      body: {
        isAdmin: editData.isAdmin,
      },
    })
    user.value = response
    successMessage.value = 'Admin status updated successfully'
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (e: any) {
    errorMessage.value = e.data?.error || 'Failed to update admin status'
  }
}

const impersonateUser = async () => {
  try {
    successMessage.value = ''
    errorMessage.value = ''
    await $fetch(`/apiv2/lat/admin/impersonate/${userId}`, {
      method: 'POST',
    })
    successMessage.value = 'Now impersonating this user. Redirecting...'
    setTimeout(() => {
      router.push('/lat/map')
    }, 2000)
  } catch (e: any) {
    errorMessage.value = e.data?.error || 'Failed to impersonate user'
  }
}

const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    lender: '🌿 Lender',
    tender: '🌱 Tender',
    both: '🤝 Both',
  }
  return labels[role] || role
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped lang="scss">
.lat-admin-user-detail {
  padding: 2rem;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    color: #1a2210;
    margin: 0;
  }

  .back-link {
    color: #6b9e3c;
    text-decoration: none;
    transition: color 0.3s;

    &:hover {
      color: #4a7a26;
    }
  }
}

.loading,
.error {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
  color: #5c6b4a;
}

.error {
  color: #d32f2f;
  border-left: 4px solid #d32f2f;
}

.user-detail {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;

  > * {
    grid-column: 1 / -1;

    &:nth-child(1) {
      grid-column: 1 / span 1;
    }

    &:nth-child(2) {
      grid-column: 2 / span 1;
    }
  }
}

.info-card,
.actions-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  h2 {
    font-size: 1.3rem;
    color: #1a2210;
    margin: 0 0 1.5rem 0;
    padding-bottom: 1rem;
    border-bottom: 2px solid #f0f4ed;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.info-item {
  label {
    display: block;
    font-weight: 600;
    color: #5c6b4a;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
  }

  p {
    font-size: 1rem;
    color: #1a2210;
    margin: 0;
  }
}

.role-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;

  &.lender {
    background: #e8f5e0;
    color: #2e6b10;
  }

  &.tender {
    background: #ede0f5;
    color: #6b2e9b;
  }

  &.both {
    background: #f0e5ff;
    color: #4a3c7a;
  }
}

.action-group {
  padding: 1.5rem 0;
  border-bottom: 1px solid #f0f4ed;

  &:last-child {
    border-bottom: none;
  }

  label {
    display: block;
    font-weight: 600;
    color: #1a2210;
    margin-bottom: 0.75rem;
  }

  .help-text {
    font-size: 0.85rem;
    color: #5c6b4a;
    margin: 0.75rem 0 0 0;
  }
}

.toggle-group,
.select-group {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;

  input {
    cursor: pointer;
    width: 20px;
    height: 20px;
  }

  .toggle-label {
    font-weight: 500;
  }
}

select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  flex: 1;

  &:focus {
    outline: none;
    border-color: #6b9e3c;
    box-shadow: 0 0 0 3px rgba(107, 158, 60, 0.1);
  }
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;

  &.btn-save {
    background: #6b9e3c;
    color: white;

    &:hover {
      background: #4a7a26;
    }
  }

  &.btn-secondary {
    background: #f0f4ed;
    color: #1a2210;
    border: 1px solid #ddd;

    &:hover {
      background: #e0e8df;
    }
  }
}

.success-message {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.help-text {
  color: #5c6b4a;
  font-size: 0.9rem;
  margin: 0.5rem 0 0 0;

  a {
    color: #6b9e3c;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

@media (max-width: 1024px) {
  .user-detail {
    grid-template-columns: 1fr;
  }

  .user-detail > * {
    grid-column: 1 / -1 !important;
  }
}

@media (max-width: 768px) {
  .lat-admin-user-detail {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .toggle-group,
  .select-group {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
