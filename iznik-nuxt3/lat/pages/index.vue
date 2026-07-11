<template>
  <div class="home">
    <!-- Hero: white bg, centred — mirrors the existing lendandtend.com -->
    <section class="hero">
      <div class="hero-inner">
        <h1>Get Patch Matched.</h1>
        <p class="hero-tagline">Share a garden, grow good things.</p>
        <p class="hero-sub">
          With a little kindness — to nature and our neighbours — we can grow
          gardens that are beautiful, bountiful and biodiverse, buzzing with
          life when we share.
        </p>
        <p class="hero-hook">
          <strong
            >Good for the planet, good for people — and it feels great. Sound
            good?</strong
          >
        </p>
        <div class="hero-image">
          <img
            src="/images/lat/hero.png"
            alt="Join to garden share — Cultivating care, one garden at a time"
          />
        </div>
        <div class="hero-ctas">
          <button class="btn-hero" @click="ctaClick('join')">
            {{ hasPaid ? 'Browse gardens' : 'Join to garden share' }}
          </button>
          <a href="#how" class="btn-hero-ghost">How it works ↓</a>
        </div>
      </div>
    </section>

    <!-- Two roles -->
    <LatRolesSection />

    <!-- How Lend and Tend works -->
    <LatHowItWorksSection />

    <!-- Map section -->
    <section class="section-light">
      <div class="container map-section">
        <div class="map-text">
          <h2>Lenders and Tenders near you</h2>
          <p>
            Members' pins appear on the map once they join. Locations are
            blurred for privacy. Your exact address is only ever shared directly
            between matched members.
          </p>
          <button class="btn-primary" @click="ctaClick('browse')">
            {{ hasPaid ? 'Browse the map' : 'Get Patch Matched' }}
          </button>
          <NuxtLink to="/map" class="btn-ghost"> Browse the map → </NuxtLink>
        </div>
        <NuxtLink
          to="/map"
          class="map-preview-wrapper"
          aria-label="Open the full map of gardens"
        >
          <ClientOnly>
            <div class="map-preview">
              <!-- Use the same MapView component as /map so members'
                   pins actually appear here. preview=true makes the
                   map non-interactive (no drag/zoom/popups) — visitors
                   still get to see where gardens cluster but can't
                   hijack the teaser into being a full map.
                   ClientOnly is required because Leaflet (imported by
                   MapView) touches `window` at module load time. -->
              <MapView preview />
            </div>
            <template #fallback>
              <div class="map-placeholder">Loading map…</div>
            </template>
          </ClientOnly>
          <!-- The whole preview is a link to /map; the overlay just
               keeps the visual "Open full map →" affordance the user
               expects. pointer-events:none below so clicks fall through
               to the underlying wrapper-link instead of needing to
               hit this specific span. -->
          <div class="map-preview-overlay">
            <span class="btn-overlay">Open full map →</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Testimonials -->
    <LatTestimonialsSection />

    <!-- Pricing -->
    <LatPricingSection />

    <!-- Bottom CTA: dark green bg → white text 17:1 ✓ -->
    <section class="cta-section">
      <div class="container cta-inner">
        <h2>Ready to get patch-matched?</h2>
        <p>Join gardeners sharing plots all around the world.</p>
        <button class="btn-cta" @click="ctaClick('join')">
          {{ hasPaid ? 'Browse gardens' : 'Join Lend &amp; Tend' }}
        </button>
      </div>
    </section>

    <!-- Footer -->
    <LatSiteFooter />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useLatAuth } from '../composables/useLatAuth.js'
import branding from '~/branding.config'

// MapView pulls in Leaflet, which touches `window` at module load.
// Deferring the import via defineAsyncComponent means the module is
// only evaluated when ClientOnly renders the component on the client.
// The /map page sidesteps this by being marked ssr:false in
// routeRules, but the landing page is SSR'd for SEO.
const MapView = defineAsyncComponent(
  () => import('~/components/lat/MapView.vue')
)
const { hasPaid, ctaClick } = useLatAuth()

definePageMeta({ layout: 'default' })

useHead({
  title: 'Get Patch Matched — Lend and Tend',
  meta: [{ name: 'description', content: branding.description }],
})
</script>

<style scoped>
/* ── Base ─────────────────────────────────────────────────────────────────── */
.home {
  font-family: var(--lat-font-body);
  color: var(--lat-color-text);
  background: #fff;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

/* On narrow viewports the 24px side padding eats into a substantial
   fraction of the visible width — tighten it so cards aren't squeezed. */
@media (max-width: 640px) {
  .container {
    padding: 0 12px;
  }
}

/* ── Hero — white, centred (mirrors the existing lendandtend.com) ─────────── */
.hero {
  background: #fff;
  color: var(--lat-color-text);
  padding: 64px 24px 88px;
  text-align: center;
}

.hero-inner {
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

@media (max-width: 640px) {
  .hero {
    padding: 40px 16px 60px;
  }
}

.hero h1 {
  font-family: var(--lat-font-heading);
  font-size: clamp(2.6rem, 6vw, 4.2rem);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.01em;
  margin: 0 0 6px;
  color: var(--lat-color-text) !important;
}

.hero-tagline {
  font-family: var(--lat-font-heading);
  font-size: clamp(1.5rem, 3.6vw, 2.4rem);
  font-weight: 500;
  line-height: 1.15;
  color: var(--lat-color-primary-dark);
  margin: 0 0 24px;
}

.hero-sub {
  font-size: 1.1rem;
  line-height: 1.7;
  color: var(--lat-color-text-muted);
  margin: 0 0 18px;
  max-width: 40rem;
}

.hero-hook {
  font-size: 1.1rem;
  color: var(--lat-color-text);
  margin: 0 0 32px;
}

.hero-image {
  width: 100%;
  max-width: 660px;
  margin: 0 0 36px;
}

.hero-image img {
  width: 100%;
  border-radius: 12px;
  display: block;
}

.hero-ctas {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
}

/* Filled brand-green primary on white */
.btn-hero {
  background: var(--lat-color-primary);
  color: #fff;
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 0.2rem;
  font-weight: 600;
  font-size: 1.05rem;
  display: inline-block;
  border: 2px solid var(--lat-color-primary);
  cursor: pointer;
  transition: all 150ms ease-in-out;
}

.btn-hero:hover {
  background: var(--lat-color-primary-dark);
  border-color: var(--lat-color-primary-dark);
}

/* Green outline secondary on white */
.btn-hero-ghost {
  background: transparent;
  color: var(--lat-color-primary-dark);
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 0.2rem;
  font-weight: 600;
  font-size: 1.05rem;
  display: inline-block;
  border: 2px solid var(--lat-color-primary);
  cursor: pointer;
  transition: all 150ms ease-in-out;
}

.btn-hero-ghost:hover {
  background: var(--lat-color-surface);
  color: var(--lat-color-text);
}

/* ── Shared section ────────────────────────────────────────────────────────── */
.section-light {
  background: #fff;
  padding: 96px 24px;
}

.section-tinted {
  background: var(--lat-color-surface);
  padding: 96px 24px;
}

/* Tighten section gutters on small viewports so content cards aren't
   visually squeezed into a narrow centred column. */
@media (max-width: 640px) {
  .section-light,
  .section-tinted,
  .cta-section {
    padding: 60px 12px;
  }
}

/* #1A2210 on white/surface → 17:1 ✓ */
.section-heading {
  font-family: var(--lat-font-heading);
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 700;
  color: var(--lat-color-text) !important;
  margin: 0 0 48px;
  text-align: center;
}

/* ── Map section ──────────────────────────────────────────────────────────── */
.map-section {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 48px;
  align-items: center;
}

@media (max-width: 768px) {
  .map-section {
    grid-template-columns: 1fr;
  }
}

.map-text h2 {
  font-family: var(--lat-font-heading);
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 700;
  color: var(--lat-color-text) !important;
  margin: 0 0 16px;
}

.map-text p {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--lat-color-text-muted);
  margin: 0 0 24px;
}

/* #1A2210 bg + white text → 17:1 ✓ */
.btn-primary {
  background: var(--lat-color-text);
  color: #fff;
  text-decoration: none;
  padding: 12px 24px;
  border-radius: 0.2rem;
  font-weight: 500;
  font-size: 0.95rem;
  display: inline-block;
  margin-right: 12px;
  margin-bottom: 8px;
  transition: all 150ms ease-in-out;
}

.btn-primary:hover {
  background: var(--lat-color-primary-dark);
}

.btn-ghost {
  color: var(--lat-color-text);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  display: inline-block;
  padding: 12px 0;
  border-bottom: 2px solid var(--lat-color-primary);
}

.btn-ghost:hover {
  border-bottom-color: var(--lat-color-text);
}

.map-preview-wrapper {
  position: relative;
  display: block;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  /* Whole preview is a link to /map — cursor + focus styling reflect that. */
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}

.map-preview-wrapper:focus-visible {
  outline: 3px solid var(--lat-color-primary);
  outline-offset: 2px;
}

/* The overlay sits ON TOP of the leaflet container; let pointer events
   fall through to the wrapper link so a click anywhere on the preview
   navigates instead of just the "Open full map →" pill. */
.map-preview-wrapper .map-preview-overlay,
.map-preview-wrapper .btn-overlay,
.map-preview-wrapper .map-preview {
  pointer-events: none;
}

.map-preview {
  height: 380px;
  width: 100%;
}

.map-placeholder {
  height: 380px;
  background: #e8f0de;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lat-color-text-muted);
  font-size: 0.9rem;
}

.map-preview-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32px 24px 20px;
  background: linear-gradient(
    to top,
    rgba(26, 34, 16, 0.7) 0%,
    transparent 100%
  );
  display: flex;
  justify-content: flex-end;
}

.btn-overlay {
  background: #fff;
  color: var(--lat-color-text);
  text-decoration: none;
  padding: 10px 18px;
  border-radius: 0.2rem;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 150ms ease-in-out;
}

.btn-overlay:hover {
  background: #e8f0de;
}

/* ── Bottom CTA ───────────────────────────────────────────────────────────── */
/* #1A2210 bg + white text → 17:1 ✓ */
.cta-section {
  background: var(--lat-color-primary);
  color: #fff;
  padding: 96px 24px;
  text-align: center;
}

.cta-inner h2 {
  font-family: var(--lat-font-heading);
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 700;
  margin: 0 0 16px;
  color: #fff !important;
}

.cta-inner p {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 32px;
}

.btn-cta {
  background: #fff;
  color: var(--lat-color-primary-dark);
  text-decoration: none;
  padding: 16px 36px;
  border-radius: 0.2rem;
  font-weight: 500;
  font-size: 1.05rem;
  display: inline-block;
  transition: all 150ms ease-in-out;
}

.btn-cta:hover {
  background: #e8f0de;
}
</style>
