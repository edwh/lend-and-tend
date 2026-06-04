<template>
  <div class="lat-timeline">
    <ol class="timeline">
      <li v-for="(step, idx) in steps" :key="step.month" class="timeline-item">
        <div class="timeline-marker">
          <span class="marker-dot">{{ idx + 1 }}</span>
          <span v-if="idx < steps.length - 1" class="marker-line" />
        </div>
        <div class="timeline-body">
          <p class="timeline-month">{{ step.month }}</p>
          <h3 class="timeline-heading">{{ step.heading }}</h3>
          <p class="timeline-text">{{ step.text }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { TIMELINE } from '~/constants/agreement'

defineProps({
  /* Allow callers to pass a subset/override; defaults to the full template. */
  steps: { type: Array, default: () => TIMELINE },
})
</script>

<style scoped>
.lat-timeline {
  width: 100%;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}

.timeline-item {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.marker-dot {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--lat-color-primary);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.marker-line {
  flex: 1;
  width: 2px;
  min-height: 32px;
  background: var(--lat-color-accent, #cbcb00);
  margin: 4px 0;
}

.timeline-body {
  padding-bottom: 28px;
}

.timeline-item:last-child .timeline-body {
  padding-bottom: 0;
}

.timeline-month {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--lat-color-primary);
  margin: 4px 0 2px;
}

.timeline-heading {
  font-family: var(--lat-font-heading);
  font-size: 1.1rem;
  color: var(--lat-color-text);
  margin: 0 0 6px;
}

.timeline-text {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--lat-color-text-muted);
  margin: 0;
}
</style>
