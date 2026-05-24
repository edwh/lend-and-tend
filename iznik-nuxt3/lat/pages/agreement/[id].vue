<template>
  <div class="agreement-page">
    <div class="breadcrumb">
      <NuxtLink to="/">Home</NuxtLink>
      <span> / </span>
      <NuxtLink :to="`/garden/${messageId}`">Garden</NuxtLink>
      <span> / </span>
      <span>Agreement</span>
    </div>

    <div class="page-header">
      <h1>Garden Sharing Agreement</h1>
    </div>

    <div v-if="!otherUserId" class="error-state">
      <p>Missing required information. Please navigate here from a garden listing.</p>
      <NuxtLink to="/map" class="btn btn-primary">Browse gardens</NuxtLink>
    </div>

    <LatAgreementForm
      v-else
      :message-id="messageId"
      :other-user-id="otherUserId"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const messageId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? parseInt(id, 10) : Number(id)
})

const otherUserId = computed(() => {
  const uid = route.query.userId
  return uid ? parseInt(uid as string, 10) : null
})

definePageMeta({ layout: 'default' })
</script>

<style scoped>
.agreement-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.breadcrumb {
  margin-bottom: 2rem;
  color: #666;
  font-size: 0.9rem;
}

.breadcrumb a {
  color: var(--lat-color-primary);
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.page-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
}

h1 {
  margin: 0;
  color: var(--lat-color-text);
  font-family: var(--lat-font-heading);
  font-size: 2rem;
}

.error-state {
  text-align: center;
  padding: 40px;
  color: var(--lat-color-text-muted);
}

.btn {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: 600;
  text-decoration: none;
}

.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
</style>
