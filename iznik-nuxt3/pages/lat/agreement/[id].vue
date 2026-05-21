<template>
  <div class="agreement-page">
    <div class="breadcrumb">
      <NuxtLink to="/lat">Home</NuxtLink>
      <span> / </span>
      <NuxtLink to="/lat/agreements">My Agreements</NuxtLink>
      <span> / </span>
      <span>Agreement #{{ agreementId }}</span>
    </div>

    <div class="page-header">
      <h1>Garden Sharing Agreement</h1>
      <div class="user-role">
        <span class="role-badge" :class="userRole">
          {{ userRole === 'lender' ? 'Garden Owner' : 'Gardener' }}
        </span>
      </div>
    </div>

    <AgreementForm
      :agreement-id="agreementId"
      :role="userRole"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()

const agreementId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? parseInt(id, 10) : id
})

// In a real app, this would come from user context
// For now, default to 'lender' - can be determined by checking agreement parties
const userRole = ref<'lender' | 'tender'>('lender')

onMounted(() => {})

definePageMeta({ layout: 'default', middleware: 'auth' })
</script>

<style scoped>
.agreement-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.breadcrumb {
  margin-bottom: 2rem;
  color: #666;
  font-size: 0.9rem;
}

.breadcrumb a {
  color: #2196f3;
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
}

h1 {
  margin: 0;
  color: #333;
  font-size: 2rem;
}

.user-role {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.role-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  color: white;
}

.role-badge.lender {
  background-color: #2196f3;
}

.role-badge.tender {
  background-color: #4caf50;
}
</style>
