<template>
  <div class="users-page">
    <h2>Users</h2>

    <!-- Filters Section -->
    <div class="filters-section">
      <div class="filter-group">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by email or name..."
          @input="onSearchChange"
          class="form-control"
        />
      </div>

      <div class="filter-group">
        <select v-model="roleFilter" @change="onFilterChange" class="form-control">
          <option value="">All Roles</option>
          <option value="lender">Garden Lender</option>
          <option value="tender">Garden Tender</option>
          <option value="both">Both</option>
        </select>
      </div>

      <div class="filter-group">
        <select v-model="statusFilter" @change="onFilterChange" class="form-control">
          <option value="">All Payment Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="concession">Concession</option>
        </select>
      </div>
    </div>

    <!-- Users Table -->
    <div v-if="loading" class="loading-state">
      <p>Loading users...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>

    <div v-else class="table-wrapper">
      <table class="table table-striped table-hover">
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
            <td>{{ user.email }}</td>
            <td>{{ user.displayName || '—' }}</td>
            <td>
              <span class="badge" :class="'badge-' + user.role">
                {{ roleLabel(user.role) }}
              </span>
            </td>
            <td>
              <span class="badge" :class="'badge-' + user.paymentStatus">
                {{ paymentStatusLabel(user.paymentStatus) }}
              </span>
            </td>
            <td>
              <span class="badge" :class="user.active ? 'bg-success' : 'bg-danger'">
                {{ user.active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>
              <NuxtLink :to="`/lat/admin/users/${user.id}`" class="btn btn-sm btn-primary">
                Edit
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="pagination-controls">
        <button
          class="btn btn-sm btn-outline-secondary"
          :disabled="currentPage === 1"
          @click="previousPage"
        >
          ← Previous
        </button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          class="btn btn-sm btn-outline-secondary"
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

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

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
.users-page {
  h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: #1a2210;
  }
}

.filters-section {
  background: white;
  padding: 1rem;
  border: 1px solid #ddd;
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;

  .filter-group {
    .form-control {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 0.95rem;

      &:focus {
        outline: none;
        border-color: #6b9e3c;
        box-shadow: 0 0 0 2px rgba(107, 158, 60, 0.1);
      }
    }
  }
}

.loading-state,
.error-state {
  background: white;
  padding: 2rem;
  border: 1px solid #ddd;
  text-align: center;
  margin-bottom: 1.5rem;
  color: #5c6b4a;
}

.error-state {
  color: #d32f2f;
  border-left: 4px solid #d32f2f;
}

.table-wrapper {
  background: white;
  border: 1px solid #ddd;
  border-radius: 0;
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
        &.inactive {
          opacity: 0.6;
        }

        &:hover {
          background-color: #fafafa;
        }

        td {
          vertical-align: middle;
          font-size: 0.95rem;
        }
      }
    }
  }
}

.badge {
  font-size: 0.8rem;
  padding: 0.35rem 0.65rem;

  &.badge-lender {
    background-color: #e8f5e0;
    color: #2e6b10;
  }

  &.badge-tender {
    background-color: #ede0f5;
    color: #6b2e9b;
  }

  &.badge-both {
    background-color: #f0e5ff;
    color: #4a3c7a;
  }

  &.badge-paid {
    background-color: #e8f5e9;
    color: #2e7d32;
  }

  &.badge-unpaid {
    background-color: #fff3e0;
    color: #e65100;
  }

  &.badge-concession {
    background-color: #f3e5f5;
    color: #6a1b9a;
  }
}

.btn {
  font-size: 0.85rem;
  padding: 0.35rem 0.75rem;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid #ddd;
  background: #f9faf5;

  .page-info {
    color: #5c6b4a;
    font-weight: 500;
    font-size: 0.95rem;
  }
}

@media (max-width: 768px) {
  .filters-section {
    grid-template-columns: 1fr;
  }
}
</style>
