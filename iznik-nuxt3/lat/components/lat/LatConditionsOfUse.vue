<template>
  <ul class="conditions">
    <li v-for="c in conditions" :key="c.key" class="condition">
      <span class="condition-icon" aria-hidden="true">{{ c.icon }}</span>
      <div class="condition-body">
        <h3 class="condition-title">{{ c.title }}</h3>
        <p class="condition-text">{{ c.text }}</p>
      </div>
    </li>
  </ul>
</template>

<script setup>
import { CONDITIONS_OF_USE } from '~/constants/agreement'

defineProps({
  conditions: { type: Array, default: () => CONDITIONS_OF_USE },
})
</script>

<style scoped>
.conditions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 16px;
}

.condition {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.condition-icon {
  font-size: 1.4rem;
  line-height: 1.4;
  flex-shrink: 0;
}

.condition-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--lat-color-text);
  margin: 0 0 4px;
}

.condition-text {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--lat-color-text-muted);
  margin: 0;
}
</style>
