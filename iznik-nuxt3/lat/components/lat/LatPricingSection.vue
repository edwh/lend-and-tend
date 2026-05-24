<template>
  <section class="section-light">
    <div class="container pricing">
      <div class="pricing-text">
        <h2>Simple, fair membership</h2>
        <p>
          A one-time joining fee of <strong>£12</strong> covers admin, matching, and ongoing
          community support — for as long as you're a member. No subscriptions, no renewals.
        </p>
        <p class="pricing-concession">
          <strong>Supported registration is free</strong> for those receiving Pension Credit
          or Universal Credit (subject to availability). Just let us know.
        </p>
      </div>
      <div class="price-card">
        <div class="price-label-top">Standard</div>
        <div class="price-amount">£12</div>
        <div class="price-label">one-time joining fee</div>
        <button class="btn-primary price-cta" @click="requestLogin()">
          Join now
        </button>
        <div class="price-free-note">Free with UC / Pension Credit</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import branding from '~/branding.config'
import { useNavbar } from '~/composables/useNavbar'
const { requestLogin } = useNavbar()
</script>

<style scoped>
/* ── Pricing ──────────────────────────────────────────────────────────────── */
.pricing {
  display: flex;
  align-items: center;
  gap: 64px;
  flex-wrap: wrap;
}

.pricing-text {
  flex: 1;
  min-width: 280px;
}

.pricing-text h2 {
  font-family: var(--lat-font-heading);
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 700;
  color: var(--lat-color-text) !important;
  margin: 0 0 16px;
}

.pricing-text p {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--lat-color-text-muted);
  margin: 0 0 12px;
}

.pricing-concession {
  background: var(--lat-color-surface);
  border-left: 3px solid var(--lat-color-primary);
  padding: 12px 16px;
  border-radius: 0 4px 4px 0;
  font-size: 0.9rem !important;
}

/* lenderBg card */
.price-card {
  background: var(--lat-color-lender-bg);
  border: 2px solid #c8e0b8;
  border-radius: 8px;
  padding: 32px 40px;
  text-align: center;
  min-width: 200px;
}

.price-label-top {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--lat-color-lender-text);
  margin-bottom: 8px;
}

/* #1A2210 on lenderBg → 17:1 ✓ */
.price-amount {
  font-family: var(--lat-font-heading);
  font-size: 3rem;
  font-weight: 700;
  color: var(--lat-color-text) !important;
  line-height: 1;
  margin-bottom: 4px;
}

.price-label {
  font-size: 0.9rem;
  color: var(--lat-color-text-muted);
  margin-bottom: 24px;
}

.price-cta { display: block; margin: 0; }

.price-free-note {
  margin-top: 12px;
  font-size: 0.8rem;
  color: var(--lat-color-lender-text);
  font-weight: 600;
}

.section-light {
  background: #fff;
  padding: 80px 24px;
}

/* #1A2210 bg + white text → 17:1 ✓ */
.btn-primary {
  background: var(--lat-color-text);
  color: #fff;
  text-decoration: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.95rem;
  display: inline-block;
  margin-right: 12px;
  margin-bottom: 8px;
  transition: background 0.2s;
  border: none;
  cursor: pointer;
}

.btn-primary:hover { background: var(--lat-color-primary-dark); }

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}
</style>
