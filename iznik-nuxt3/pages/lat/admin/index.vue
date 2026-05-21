<template>
  <div class="dashboard">
    <h2>Dashboard</h2>

    <div v-if="loading" class="loading-state">
      <p>Loading metrics...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="metrics" class="dashboard-metrics">
      <div class="metric-item">
        <div class="metric-label">Total Users</div>
        <div class="metric-value">{{ metrics.totalUsers }}</div>
      </div>

      <div class="metric-item">
        <div class="metric-label">Garden Lenders</div>
        <div class="metric-value">{{ metrics.lenders }}</div>
      </div>

      <div class="metric-item">
        <div class="metric-label">Garden Tenders</div>
        <div class="metric-value">{{ metrics.tenders }}</div>
      </div>

      <div class="metric-item">
        <div class="metric-label">Paid Users</div>
        <div class="metric-value">{{ metrics.paidUsers }}</div>
      </div>

      <div class="metric-item">
        <div class="metric-label">Active Agreements</div>
        <div class="metric-value">{{ metrics.activeAgreements }}</div>
      </div>

      <div class="metric-item">
        <div class="metric-label">Pending Check-ins</div>
        <div class="metric-value">{{ metrics.pendingCheckins }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Metrics {
  totalUsers: number
  lenders: number
  tenders: number
  paidUsers: number
  activeAgreements: number
  pendingCheckins: number
}

definePageMeta({
  layout: 'admin',
})

const loading = ref(true)
const error = ref('')
const metrics = ref<Metrics | null>(null)

onMounted(async () => {
  try {
    const response = await $fetch('/apiv2/lat/admin/metrics')
    metrics.value = response as Metrics
    loading.value = false
  } catch (e: any) {
    error.value = e.data?.error || 'Failed to load metrics'
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.dashboard {
  h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: #1a2210;
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

.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.metric-item {
  background: white;
  border: 1px solid #ddd;
  padding: 1rem;
  text-align: center;

  .metric-label {
    font-size: 0.8rem;
    color: #5c6b4a;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
  }

  .metric-value {
    font-size: 1.8rem;
    font-weight: bold;
    color: #1a2210;
  }
}
</style>
