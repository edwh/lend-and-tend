<template>
  <section id="how" class="section-tinted">
    <div class="container">
      <h2 class="section-heading">How Lend and Tend works</h2>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <h3>Join &amp; Register</h3>
          <p>Sign up for £12, you'll fill in the form to register. We'll pin your location to the map and you'll then be on the waiting list.</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step">
          <div class="step-num">2</div>
          <h3>Get Matched</h3>
          <p>Should a potential Patch Match become apparent, you'll be contacted if a suitable person wants to contact you to garden share.</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step">
          <div class="step-num">3</div>
          <h3>Start Growing</h3>
          <p>We'll make introductions and can support with arrangements like agreements, then you'll begin your garden sharing journey.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import branding from '~/branding.config'
</script>

<style scoped>
/* ── How it works ─────────────────────────────────────────────────────────── */
.steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0;
}

.step {
  flex: 1;
  min-width: 200px;
  max-width: 280px;
  text-align: center;
  padding: 0 16px;
}

/* Dark circle + white number → 17:1 ✓ */
.step-num {
  width: 52px;
  height: 52px;
  background: var(--lat-color-text);
  color: #fff;
  border-radius: 50%;
  font-size: 1.4rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.step h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--lat-color-text) !important;
  margin: 0 0 8px;
}

.step p {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--lat-color-text-muted);
  margin: 0;
}

.step-arrow {
  font-size: 1.8rem;
  color: #c8d4b8;
  align-self: center;
  padding: 0 4px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .step-arrow { display: none; }
  .steps { flex-direction: column; align-items: center; gap: 32px; }
  .step { max-width: 100%; }
}

.section-tinted {
  background: var(--lat-color-surface);
  padding: 80px 24px;
}

.section-heading {
  font-family: var(--lat-font-heading);
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 700;
  color: var(--lat-color-text) !important;
  margin: 0 0 48px;
  text-align: center;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}
</style>
