<template>
  <section class="roles-section section-light">
    <div class="container roles-grid">
      <div class="role-card role-tender">
        <div class="role-img-wrap">
          <img :src="'/images/lat/tend.png'" alt="No garden? No problem — join Lend and Tend to garden share" />
        </div>
        <div class="role-body">
          <span class="role-pill tender-pill">Garden Tender</span>
          <h2>No Garden? No Problem!</h2>
          <ul>
            <li>Grow fruit, veg, flowers — brilliant for your well-being</li>
            <li>Connect with a local garden owner</li>
            <li>Learn or share gardening skills</li>
            <li>Be part of a kind, supported Patch-Matching process</li>
          </ul>
          <NuxtLink to="/register" class="role-cta tender-cta">Find a garden →</NuxtLink>
        </div>
      </div>
      <div class="role-card role-lender">
        <div class="role-img-wrap">
          <img :src="'/images/lat/lend.png'" alt="Garden a problem? Join Lend and Tend to garden share" />
        </div>
        <div class="role-body">
          <span class="role-pill lender-pill">Garden Lender</span>
          <h2>Can't Garden? Find out who can.</h2>
          <ul>
            <li>Connect with like-minded, green-fingered people</li>
            <li>Enjoy the potential for extra help in the garden</li>
            <li>Benefit from our supported, thoughtful Patch-Matching process</li>
          </ul>
          <NuxtLink to="/register" class="role-cta lender-cta">Share my garden →</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import branding from '~/branding.config'
</script>

<style scoped>
/* ── Roles ────────────────────────────────────────────────────────────────── */
.roles-section { padding: 80px 24px; }

.roles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

@media (max-width: 768px) {
  .roles-grid { grid-template-columns: 1fr; }
}

.role-card {
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.role-img-wrap img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
}

.role-body {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

/* lenderBg card */
.role-lender { border-color: #c8e0b8; }
.role-lender .role-body { background: var(--lat-color-lender-bg); }

/* tenderBg card */
.role-tender { border-color: #d8c0e8; }
.role-tender .role-body { background: var(--lat-color-tender-bg); }

.role-pill {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* lenderText on lenderBg → 5.1:1 ✓ */
.lender-pill {
  background: #d0ecc0;
  color: var(--lat-color-lender-text);
}

/* tenderText on tenderBg → 6:1 ✓ */
.tender-pill {
  background: #dfd0f0;
  color: var(--lat-color-tender-text);
}

/* #1A2210 on lenderBg/tenderBg → 17:1 ✓ */
.role-body h2 {
  font-family: var(--lat-font-heading);
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  color: var(--lat-color-text) !important;
}

.role-body ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

/* textMuted on lenderBg/tenderBg → sufficient contrast ✓ */
.role-body li {
  font-size: 0.95rem;
  color: var(--lat-color-text-muted);
  padding-left: 22px;
  position: relative;
  line-height: 1.4;
}

.role-lender li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--lat-color-lender-text);
  font-weight: 700;
}

.role-tender li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--lat-color-tender-text);
  font-weight: 700;
}

.role-cta {
  text-decoration: none;
  padding: 12px 20px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.95rem;
  text-align: center;
  display: block;
  transition: filter 0.2s;
}

.role-cta:hover { filter: brightness(0.9); }

/* lenderText on lenderBg border → 5.1:1 ✓ */
.lender-cta {
  background: transparent;
  color: var(--lat-color-lender-text);
  border: 2px solid var(--lat-color-lender-text);
}

/* tenderText on tenderBg border → 6:1 ✓ */
.tender-cta {
  background: transparent;
  color: var(--lat-color-tender-text);
  border: 2px solid var(--lat-color-tender-text);
}

.section-light {
  background: #fff;
  padding: 80px 24px;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}
</style>
