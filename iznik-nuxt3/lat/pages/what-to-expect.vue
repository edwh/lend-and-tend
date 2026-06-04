<template>
  <div class="expect-page">
    <div class="expect-container">
      <header class="expect-head">
        <h1 class="expect-title">What to expect</h1>
        <p class="expect-intro">
          Once you’ve been patch-matched, here’s how a {{ branding.siteName }}
          garden-sharing arrangement usually unfolds — from first introductions
          to settling into a rhythm together.
        </p>
      </header>

      <section class="expect-section">
        <h2 class="section-heading">Getting started</h2>
        <LatArrangementGuide />
      </section>

      <section class="expect-section">
        <h2 class="section-heading">Your first few months</h2>
        <p class="section-lead">
          Every garden is different, but this is a realistic shape for a first
          growing season. Treat it as a guide, not a deadline — the most
          important thing is keeping in touch.
        </p>
        <div class="timeline-wrap">
          <LatTimeline />
        </div>
      </section>

      <section class="expect-cta">
        <h2 class="cta-heading">Ready to make it official?</h2>
        <p class="cta-text">
          When you’ve both talked things through, set up a simple garden-sharing
          agreement so you each have a record of what you agreed. It only takes
          a minute and you can review it later.
        </p>
        <div class="cta-actions">
          <NuxtLink to="/ground-rules" class="btn btn-secondary">
            Read the ground rules
          </NuxtLink>
          <NuxtLink to="/map" class="btn btn-primary"> Find a garden </NuxtLink>
        </div>
      </section>
    </div>

    <LatSiteFooter />
  </div>
</template>

<script setup>
import branding from '~/branding.config'

definePageMeta({ layout: 'default' })
useHead({
  title: `What to expect — ${branding.siteName}`,
  meta: [
    {
      name: 'description',
      content: `What to expect from a ${branding.siteName} garden-sharing arrangement, from first introductions through your first growing season.`,
    },
  ],
})
</script>

<style scoped>
.expect-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
}

.expect-container {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 16px 56px;
}

.expect-head {
  text-align: center;
  margin-bottom: 40px;
}

.expect-title {
  font-family: var(--lat-font-heading);
  font-size: 2rem;
  color: var(--lat-color-text);
  margin: 0 0 12px;
}

.expect-intro {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--lat-color-text-muted);
  max-width: 620px;
  margin: 0 auto;
}

.expect-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 32px 28px;
  margin-bottom: 24px;
}

.section-heading {
  font-family: var(--lat-font-heading);
  font-size: 1.3rem;
  color: var(--lat-color-text);
  margin: 0 0 20px;
}

.section-lead {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--lat-color-text-muted);
  margin: 0 0 24px;
}

.timeline-wrap {
  padding: 4px 0;
}

.expect-cta {
  background: var(--lat-color-secondaryLight, #f3e8f7);
  border-radius: 12px;
  padding: 32px 28px;
  text-align: center;
}

.cta-heading {
  font-family: var(--lat-font-heading);
  font-size: 1.25rem;
  color: var(--lat-color-text);
  margin: 0 0 10px;
}

.cta-text {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--lat-color-text-muted);
  max-width: 560px;
  margin: 0 auto 22px;
}

.cta-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 11px 22px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  border: 2px solid transparent;
  cursor: pointer;
}

.btn-primary {
  background: var(--lat-color-primary);
  color: #fff;
}

.btn-secondary {
  background: transparent;
  color: var(--lat-color-primary);
  border-color: var(--lat-color-primary);
}

@media (max-width: 600px) {
  .expect-section,
  .expect-cta {
    padding: 24px 18px;
  }
  .expect-title {
    font-size: 1.6rem;
  }
}
</style>
