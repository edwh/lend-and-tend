<template>
  <div class="lat-admin-dashboard">
    <div class="admin-header">
      <h1>Admin Dashboard</h1>
      <p class="subtitle">Platform overview and management</p>
    </div>

    <div v-if="loading" class="loading">
      <p>Loading metrics...</p>
    </div>

    <div v-else-if="metrics" class="metrics-grid">
      <!-- Total Users Card -->
      <div class="metric-card">
        <div class="metric-icon users">👥</div>
        <div class="metric-content">
          <p class="metric-label">Total Users</p>
          <p class="metric-value">{{ metrics.totalUsers }}</p>
        </div>
      </div>

      <!-- Lenders Card -->
      <div class="metric-card">
        <div class="metric-icon lenders">🌿</div>
        <div class="metric-content">
          <p class="metric-label">Garden Lenders</p>
          <p class="metric-value">{{ metrics.lenders }}</p>
        </div>
      </div>

      <!-- Tenders Card -->
      <div class="metric-card">
        <div class="metric-icon tenders">🌱</div>
        <div class="metric-content">
          <p class="metric-label">Garden Tenders</p>
          <p class="metric-value">{{ metrics.tenders }}</p>
        </div>
      </div>

      <!-- Paid Users Card -->
      <div class="metric-card">
        <div class="metric-icon paid">💰</div>
        <div class="metric-content">
          <p class="metric-label">Paid Users</p>
          <p class="metric-value">{{ metrics.paidUsers }}</p>
        </div>
      </div>

      <!-- Active Agreements Card -->
      <div class="metric-card">
        <div class="metric-icon agreements">🤝</div>
        <div class="metric-content">
          <p class="metric-label">Active Agreements</p>
          <p class="metric-value">{{ metrics.activeAgreements }}</p>
        </div>
      </div>

      <!-- Pending Checkins Card -->
      <div class="metric-card">
        <div class="metric-icon checkins">✓</div>
        <div class="metric-content">
          <p class="metric-label">Pending Check-ins</p>
          <p class="metric-value">{{ metrics.pendingCheckins }}</p>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>

    <!-- Quick Links Section -->
    <div class="admin-section">
      <h2>Quick Links</h2>
      <div class="link-grid">
        <NuxtLink to="/lat/admin/users" class="admin-link">
          <div class="link-icon">👤</div>
          <div class="link-content">
            <h3>Manage Users</h3>
            <p>View, search, and edit user accounts</p>
          </div>
        </NuxtLink>

        <NuxtLink to="/lat/admin/messages" class="admin-link">
          <div class="link-icon">💬</div>
          <div class="link-content">
            <h3>Review Messages</h3>
            <p>Review flagged messages and content</p>
          </div>
        </NuxtLink>

        <NuxtLink to="/lat/admin/agreements" class="admin-link">
          <div class="link-icon">📋</div>
          <div class="link-content">
            <h3>Agreements</h3>
            <p>Monitor active garden sharing agreements</p>
          </div>
        </NuxtLink>
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
.lat-admin-dashboard {
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

.admin-header {
  margin-bottom: 2rem;

  h1 {
    font-size: 2.5rem;
    color: #1a2210;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 1.1rem;
    color: #5c6b4a;
  }
}

.loading,
.error-message {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  margin: 2rem 0;
}

.error-message {
  color: #d32f2f;
  border-left: 4px solid #d32f2f;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }

  .metric-icon {
    font-size: 2.5rem;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;

    &.users {
      background: #e3f2fd;
    }

    &.lenders {
      background: #e8f5e0;
    }

    &.tenders {
      background: #ede0f5;
    }

    &.paid {
      background: #fff3e0;
    }

    &.agreements {
      background: #f0e5ff;
    }

    &.checkins {
      background: #e0f2f1;
    }
  }

  .metric-content {
    flex: 1;

    .metric-label {
      font-size: 0.9rem;
      color: #5c6b4a;
      margin: 0;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      color: #1a2210;
      margin: 0;
    }
  }
}

.admin-section {
  margin-top: 3rem;

  h2 {
    font-size: 1.5rem;
    color: #1a2210;
    margin-bottom: 1.5rem;
  }
}

.link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.admin-link {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid #6b9e3c;

  &:hover {
    transform: translateX(8px);
    box-shadow: 0 8px 16px rgba(107, 158, 60, 0.2);
  }

  .link-icon {
    font-size: 2.5rem;
    width: 70px;
    height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #f0f4ed;
  }

  .link-content {
    flex: 1;

    h3 {
      font-size: 1.1rem;
      color: #1a2210;
      margin: 0 0 0.25rem 0;
    }

    p {
      font-size: 0.9rem;
      color: #5c6b4a;
      margin: 0;
    }
  }
}

@media (max-width: 768px) {
  .lat-admin-dashboard {
    padding: 1rem;
  }

  .admin-header h1 {
    font-size: 1.8rem;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .link-grid {
    grid-template-columns: 1fr;
  }
}
</style>
