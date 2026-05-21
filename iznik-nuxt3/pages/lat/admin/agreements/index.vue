<template>
  <div class="agreements-page">
    <h2>Agreements</h2>

    <div class="controls-section">
      <select v-model="statusFilter" class="form-control w-auto" @change="fetchAgreements">
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="agreed">Agreed</option>
        <option value="signed">Signed</option>
        <option value="active">Active</option>
        <option value="ended">Ended</option>
      </select>
    </div>

    <div v-if="loading" class="loading-state">
      <p>Loading agreements...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="filteredAgreements.length === 0" class="empty-state">
      <p>No agreements found</p>
    </div>

    <div v-else class="table-wrapper">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Lender</th>
            <th>Tender</th>
            <th>Status</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="agreement in filteredAgreements" :key="agreement.id">
            <td>
              <NuxtLink :to="`/lat/admin/users/${agreement.lenderId}`">
                {{ getLenderName(agreement.lenderId) }}
              </NuxtLink>
            </td>
            <td>
              <NuxtLink :to="`/lat/admin/users/${agreement.tenderId}`">
                {{ getTenderName(agreement.tenderId) }}
              </NuxtLink>
            </td>
            <td>
              <span class="badge" :class="`badge-${getStatusClass(agreement.status)}`">
                {{ formatStatus(agreement.status) }}
              </span>
            </td>
            <td>{{ formatDate(agreement.createdAt) }}</td>
            <td>{{ agreement.endDate ? formatDate(agreement.endDate) : '—' }}</td>
            <td class="actions">
              <NuxtLink
                :to="`/lat/admin/agreements/${agreement.id}`"
                class="btn btn-sm btn-primary"
              >
                View
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Agreement {
  id: number
  lenderId: number
  lenderDisplayName?: string
  tenderId: number
  tenderDisplayName?: string
  status: string
  createdAt: string
  endDate?: string
}

interface AgreementsResponse {
  agreements: Agreement[]
}

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const loading = ref(true)
const error = ref('')
const agreements = ref<Agreement[]>([])
const statusFilter = ref('')
const userCache = new Map<number, string>()

const filteredAgreements = computed(() => {
  if (!statusFilter.value) return agreements.value
  return agreements.value.filter((a) => a.status === statusFilter.value)
})

onMounted(async () => {
  await fetchAgreements()
})

async function fetchAgreements() {
  try {
    loading.value = true
    error.value = ''

    // Try to fetch all agreements via admin endpoint
    const response = await $fetch<AgreementsResponse>('/apiv2/lat/admin/agreements')
    agreements.value = response.agreements || []

    // Fetch user details for all lenders and tenders
    const userIds = new Set<number>()
    agreements.value.forEach((a) => {
      userIds.add(a.lenderId)
      userIds.add(a.tenderId)
    })

    for (const userId of userIds) {
      if (!userCache.has(userId)) {
        try {
          const user = await $fetch<{ displayName?: string }>(`/apiv2/lat/admin/users/${userId}`)
          userCache.set(userId, user.displayName || `User ${userId}`)
        } catch (e) {
          userCache.set(userId, `User ${userId}`)
        }
      }
    }
  } catch (e: any) {
    // Fall back to fetching individual user agreements if admin endpoint doesn't exist
    error.value = e.data?.error || 'Failed to load agreements'
  } finally {
    loading.value = false
  }
}

function getLenderName(id: number): string {
  return userCache.get(id) || `Lender ${id}`
}

function getTenderName(id: number): string {
  return userCache.get(id) || `Tender ${id}`
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    agreed: 'Agreed (1-sided)',
    signed: 'Signed',
    active: 'Active',
    ended: 'Ended',
  }
  return labels[status] || status
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    draft: 'info',
    agreed: 'warning',
    signed: 'primary',
    active: 'success',
    ended: 'secondary',
  }
  return classes[status] || 'secondary'
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<style scoped lang="scss">
.agreements-page {
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

          &.actions {
            white-space: nowrap;
          }
        }
      }
    }
  }
}

.badge {
  font-size: 0.8rem;
  padding: 0.35rem 0.65rem;

  &.badge-draft {
    background-color: #e8e8e8;
    color: #333;
  }

  &.badge-agreed {
    background-color: #fff3e0;
    color: #e65100;
  }

  &.badge-signed {
    background-color: #e3f2fd;
    color: #1976d2;
  }

  &.badge-active {
    background-color: #e8f5e9;
    color: #2e7d32;
  }

  &.badge-ended {
    background-color: #f5f5f5;
    color: #666;
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
    }
  }
}
</style>
