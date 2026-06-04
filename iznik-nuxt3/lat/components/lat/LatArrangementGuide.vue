<template>
  <div class="arrangement-guide">
    <div v-for="step in steps" :key="step.title" class="guide-card">
      <div class="guide-icon" aria-hidden="true">{{ step.icon }}</div>
      <h3 class="guide-title">{{ step.title }}</h3>
      <p class="guide-text">{{ step.text }}</p>
    </div>
  </div>
</template>

<script setup>
import { ARRANGEMENT_STEPS } from '~/constants/agreement'

defineProps({
  steps: { type: Array, default: () => ARRANGEMENT_STEPS },
})
</script>

<style scoped>
.arrangement-guide {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.guide-card {
  background: white;
  border: 1px solid #efe9dd;
  border-radius: 12px;
  padding: 22px 20px;
}

.guide-icon {
  font-size: 1.8rem;
  margin-bottom: 10px;
}

.guide-title {
  font-family: var(--lat-font-heading);
  font-size: 1.05rem;
  color: var(--lat-color-primary);
  margin: 0 0 8px;
}

.guide-text {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--lat-color-text-muted);
  margin: 0;
}

@media (max-width: 640px) {
  .arrangement-guide {
    grid-template-columns: 1fr;
  }
}
</style>
