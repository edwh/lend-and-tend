<template>
  <div class="home">

    <!-- Hero: dark green bg → white text 17:1 ✓ -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-text">
          <h1>Get Patch Matched.</h1>
          <p class="hero-tagline">Share a garden, grow good things.</p>
          <p class="hero-sub">
            With a little kindness — to nature and our neighbours — we can grow gardens
            that are beautiful, bountiful and biodiverse, buzzing with life when we share.
          </p>
          <p class="hero-hook">
            <strong>Good for the planet, good for people — and it feels great. Sound good?</strong>
          </p>
          <div class="hero-ctas">
            <button class="btn-hero" @click="requestLogin()">Join to garden share</button>
            <a href="#how" class="btn-hero-ghost">How it works ↓</a>
          </div>
        </div>
        <div class="hero-image">
          <img src="/images/lat/hero.png" alt="Join to garden share — Cultivating care, one garden at a time" />
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
            Members' pins appear on the map once they join.
            Locations are blurred for privacy. Your exact address is only
            ever shared directly between matched members.
          </p>
          <button class="btn-primary" @click="requestLogin()">
            Get Patch Matched
          </button>
          <NuxtLink to="/map" class="btn-ghost">
            Browse the map →
          </NuxtLink>
        </div>
        <div class="map-preview-wrapper">
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
          <div class="map-preview-overlay">
            <NuxtLink to="/map" class="btn-overlay">Open full map →</NuxtLink>
          </div>
        </div>
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
        <button class="btn-cta" @click="requestLogin()">
          Join Lend &amp; Tend
        </button>
      </div>
    </section>

    <!-- Footer -->
    <LatSiteFooter />

  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import branding from '~/branding.config'
import { useNavbar } from '~/composables/useNavbar'

// MapView pulls in Leaflet, which touches `window` at module load.
// Deferring the import via defineAsyncComponent means the module is
// only evaluated when ClientOnly renders the component on the client.
// The /map page sidesteps this by being marked ssr:false in
// routeRules, but the landing page is SSR'd for SEO.
const MapView = defineAsyncComponent(() =>
  import('~/components/lat/MapView.vue')
)
const { requestLogin } = useNavbar()

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
  .container { padding: 0 12px; }
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
/* #1A2210 bg + white text → 17:1 ✓ */
.hero {
  background: var(--lat-color-text);
  color: #fff;
  padding: 72px 24px 64px;
}

.hero-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 56px;
  align-items: center;
}

@media (max-width: 768px) {
  .hero-inner { grid-template-columns: 1fr; }
  .hero-image { display: none; }
}

@media (max-width: 640px) {
  .hero { padding: 48px 12px 40px; }
}

.hero h1 {
  font-family: var(--lat-font-heading);
  font-size: clamp(2.4rem, 5vw, 4rem);
  font-weight: 700;
  line-height: 1.1;
  margin: 0 0 12px;
  color: #fff !important;
}

.hero-tagline {
  font-family: var(--lat-font-heading);
  font-size: clamp(1.2rem, 2.5vw, 1.8rem);
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 20px;
  font-style: italic;
}

.hero-sub {
  font-size: 1rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 16px;
}

.hero-hook {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 32px;
}

.hero-ctas {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* White bg + #1A2210 text → 17:1 ✓ */
.btn-hero {
  background: #fff;
  color: var(--lat-color-text);
  text-decoration: none;
  padding: 14px 28px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 1rem;
  display: inline-block;
  transition: background 0.2s;
}

.btn-hero:hover { background: #e8f0de; }

/* White border + white text on dark → 17:1 ✓ */
.btn-hero-ghost {
  background: transparent;
  color: #fff;
  text-decoration: none;
  padding: 14px 28px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 1rem;
  display: inline-block;
  border: 2px solid rgba(255, 255, 255, 0.6);
  transition: border-color 0.2s;
}

.btn-hero-ghost:hover { border-color: #fff; }

.hero-image img {
  width: 100%;
  border-radius: 8px;
  display: block;
}

/* ── Shared section ────────────────────────────────────────────────────────── */
.section-light {
  background: #fff;
  padding: 80px 24px;
}

.section-tinted {
  background: var(--lat-color-surface);
  padding: 80px 24px;
}

/* Tighten section gutters on small viewports so content cards aren't
   visually squeezed into a narrow centred column. */
@media (max-width: 640px) {
  .section-light,
  .section-tinted,
  .cta-section {
    padding: 48px 12px;
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

@media (max-width: 768px) { .map-section { grid-template-columns: 1fr; } }

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
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.95rem;
  display: inline-block;
  margin-right: 12px;
  margin-bottom: 8px;
  transition: background 0.2s;
}

.btn-primary:hover { background: var(--lat-color-primary-dark); }

.btn-ghost {
  color: var(--lat-color-text);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  display: inline-block;
  padding: 12px 0;
  border-bottom: 2px solid var(--lat-color-primary);
}

.btn-ghost:hover { border-bottom-color: var(--lat-color-text); }

.map-preview-wrapper {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.map-preview { height: 380px; width: 100%; }

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
  background: linear-gradient(to top, rgba(26, 34, 16, 0.7) 0%, transparent 100%);
  display: flex;
  justify-content: flex-end;
}

.btn-overlay {
  background: #fff;
  color: var(--lat-color-text);
  text-decoration: none;
  padding: 10px 18px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.9rem;
}

.btn-overlay:hover { background: #e8f0de; }

/* ── Bottom CTA ───────────────────────────────────────────────────────────── */
/* #1A2210 bg + white text → 17:1 ✓ */
.cta-section {
  background: var(--lat-color-primary);
  color: #fff;
  padding: 80px 24px;
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
  border-radius: 4px;
  font-weight: 700;
  font-size: 1.05rem;
  display: inline-block;
  transition: background 0.2s;
}

.btn-cta:hover { background: #e8f0de; }

</style>
