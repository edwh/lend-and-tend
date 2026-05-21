<template>
  <div class="lat-admin-users">
    <div class="page-header">
      <h1>Manage Users</h1>
      <NuxtLink to="/lat/admin" class="back-link">← Back to Dashboard</NuxtLink>
    </div>

    <!-- Filters Section -->
    <div class="filters-section">
      <div class="filter-group">
        <label for="search">Search by email or name:</label>
        <input
          id="search"
          v-model="searchQuery"
          type="text"
          placeholder="Search users..."
          @input="onSearchChange"
        />
      </div>

      <div class="filter-group">
        <label for="role-filter">Role:</label>
        <select id="role-filter" v-model="roleFilter" @change="onFilterChange">
          <option value="">All Roles</option>
          <option value="lender">Garden Lender</option>
          <option value="tender">Garden Tender</option>
          <option value="both">Both</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="status-filter">Payment Status:</label>
        <select id="status-filter" v-model="statusFilter" @change="onFilterChange">
          <option value="">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="concession">Concession</option>
        </select>
      </div>
    </div>

    <!-- Users Table -->
    <div v-if="loading" class="loading">
      <p>Loading users...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <div v-else class="users-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" :class="{ inactive: !user.active }">
            <td class="email">{{ user.email }}</td>
            <td class="name">{{ user.displayName || '—' }}</td>
            <td>
              <span class="role-badge" :class="user.role">
                {{ roleLabel(user.role) }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="user.paymentStatus">
                {{ paymentStatusLabel(user.paymentStatus) }}
              </span>
            </td>
            <td>
              <span class="active-badge" :class="{ active: user.active, inactive: !user.active }">
                {{ user.active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="date">{{ formatDate(user.createdAt) }}</td>
            <td class="actions">
              <NuxtLink :to="`/lat/admin/users/${user.id}`" class="btn-small">
                Edit
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="pagination">
        <button
          :disabled="currentPage === 1"
          @click="previousPage"
        >
          ← Previous
        </button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          :disabled="currentPage === totalPages"
          @click="nextPage"
        >
          Next →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface User {
  id: number
  email: string
  displayName: string
  role: string
  paymentStatus: string
  active: boolean
  createdAt: string
}

interface ListResponse {
  users: User[]
  total: number
  page: number
}

const loading = ref(true)
const error = ref('')
const users = ref<User[]>([])
const total = ref(0)
const currentPage = ref(1)
const limit = 20

const searchQuery = ref('')
const roleFilter = ref('')
const statusFilter = ref('')

const totalPages = computed(() => Math.ceil(total.value / limit))

onMounted(() => {
  fetchUsers()
})

const fetchUsers = async () => {
  try {
    loading.value = true
    error.value = ''

    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: limit.toString(),
    })

    if (searchQuery.value) {
      params.append('search', searchQuery.value)
    }
    if (roleFilter.value) {
      params.append('role', roleFilter.value)
    }
    if (statusFilter.value) {
      params.append('status', statusFilter.value)
    }

    const response = await $fetch<ListResponse>(`/apiv2/lat/admin/users?${params}`)
    users.value = response.users
    total.value = response.total
  } catch (e: any) {
    error.value = e.data?.error || 'Failed to load users'
  } finally {
    loading.value = false
  }
}

const onSearchChange = () => {
  currentPage.value = 1
  fetchUsers()
}

const onFilterChange = () => {
  currentPage.value = 1
  fetchUsers()
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchUsers()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchUsers()
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

const paymentStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    unpaid: 'Unpaid',
    paid: 'Paid',
    concession: 'Concession',
  }
  return labels[status] || status
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<style scoped lang="scss">
.lat-admin-users {
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

.filters-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .filter-group {
    display: flex;
    flex-direction: column;

    label {
      font-weight: 500;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      color: #1a2210;
    }

    input,
    select {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.95rem;

      &:focus {
        outline: none;
        border-color: #6b9e3c;
        box-shadow: 0 0 0 3px rgba(107, 158, 60, 0.1);
      }
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

.users-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.users-table {
  width: 100%;
  border-collapse: collapse;

  thead {
    background: #f9faf5;
    border-bottom: 2px solid #ddd;

    th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #1a2210;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid #eee;
      transition: background-color 0.2s;

      &:hover {
        background-color: #f9faf5;
      }

      &.inactive {
        opacity: 0.6;
      }

      td {
        padding: 1rem;
        font-size: 0.95rem;

        &.email {
          font-weight: 500;
          color: #1a2210;
        }

        &.name {
          color: #5c6b4a;
        }

        &.date {
          font-size: 0.85rem;
          color: #999;
        }

        &.actions {
          text-align: right;
        }
      }
    }
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

.status-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;

  &.paid {
    background: #e8f5e9;
    color: #2e7d32;
  }

  &.unpaid {
    background: #fff3e0;
    color: #e65100;
  }

  &.concession {
    background: #f3e5f5;
    color: #6a1b9a;
  }
}

.active-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;

  &.active {
    background: #c8e6c9;
    color: #1b5e20;
  }

  &.inactive {
    background: #ffccbc;
    color: #bf360c;
  }
}

.btn-small {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  background: #6b9e3c;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 0.85rem;
  transition: background 0.3s;

  &:hover {
    background: #4a7a26;
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #eee;
  background: #f9faf5;

  button {
    padding: 0.5rem 1rem;
    background: #6b9e3c;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.3s;

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      background: #4a7a26;
    }
  }

  .page-info {
    color: #5c6b4a;
    font-weight: 500;
  }
}

@media (max-width: 768px) {
  .lat-admin-users {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters-section {
    grid-template-columns: 1fr;
  }

  .users-table {
    font-size: 0.85rem;

    td,
    th {
      padding: 0.75rem;
    }
  }
}
</style>
