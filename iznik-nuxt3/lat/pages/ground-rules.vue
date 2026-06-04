<template>
  <div class="rules-page">
    <div class="rules-container">
      <header class="rules-head">
        <h1 class="rules-title">Garden-sharing ground rules</h1>
        <p class="rules-intro">
          A {{ branding.siteName }} arrangement works best when both people know
          what’s expected. These ground rules are a plain-English summary of our
          garden-sharing agreement template — a sensible starting point you can
          adapt to your own garden. They’re a guide, not legal advice.
        </p>
      </header>

      <section class="rules-section">
        <h2 class="section-heading">The main points</h2>
        <ul class="clauses">
          <li v-for="clause in clauses" :key="clause.title" class="clause">
            <h3 class="clause-title">{{ clause.title }}</h3>
            <p class="clause-text">{{ clause.text }}</p>
          </li>
        </ul>
      </section>

      <section class="rules-section">
        <h2 class="section-heading">Conditions of use</h2>
        <p class="section-lead">
          Things to agree before you start. Many simply need a quick yes/no
          between lender and tender — your agreement captures the common ones.
        </p>
        <LatConditionsOfUse />
      </section>

      <section class="rules-section safeguarding">
        <h2 class="section-heading">Safeguarding</h2>
        <p class="section-lead">
          Safeguarding is our priority. Any incident involving harm, fraud,
          theft or property damage must be reported to the appropriate
          authorities. If you have a concern, contact us at
          <a :href="`mailto:${branding.email}`">{{ branding.email }}</a
          >.
        </p>
      </section>

      <div class="rules-footernote">
        <p>
          For the full picture, see our
          <NuxtLink to="/terms">Terms of Service</NuxtLink> and
          <NuxtLink to="/what-to-expect">what to expect</NuxtLink> from an
          arrangement.
        </p>
      </div>
    </div>

    <LatSiteFooter />
  </div>
</template>

<script setup>
import branding from '~/branding.config'
import { KEY_CLAUSES } from '~/constants/agreement'

definePageMeta({ layout: 'default' })
useHead({
  title: `Ground rules — ${branding.siteName}`,
  meta: [
    {
      name: 'description',
      content: `The plain-English ground rules for sharing a garden on ${branding.siteName} — what lenders and tenders agree before they start.`,
    },
  ],
})

const clauses = KEY_CLAUSES
</script>

<style scoped>
.rules-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
}

.rules-container {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 16px 56px;
}

.rules-head {
  text-align: center;
  margin-bottom: 36px;
}

.rules-title {
  font-family: var(--lat-font-heading);
  font-size: 2rem;
  color: var(--lat-color-text);
  margin: 0 0 12px;
}

.rules-intro {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--lat-color-text-muted);
  max-width: 640px;
  margin: 0 auto;
}

.rules-section {
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
  margin: 0 0 18px;
}

.section-lead {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--lat-color-text-muted);
  margin: 0 0 22px;
}

.clauses {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 18px;
}

.clause-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--lat-color-primary);
  margin: 0 0 4px;
}

.clause-text {
  font-size: 0.93rem;
  line-height: 1.65;
  color: var(--lat-color-text-muted);
  margin: 0;
}

.safeguarding .section-lead a {
  color: var(--lat-color-primary);
  text-decoration: underline;
}

.rules-footernote {
  text-align: center;
  font-size: 0.9rem;
  color: var(--lat-color-text-muted);
}

.rules-footernote a {
  color: var(--lat-color-primary);
  text-decoration: underline;
}

@media (max-width: 600px) {
  .rules-section {
    padding: 24px 18px;
  }
  .rules-title {
    font-size: 1.6rem;
  }
}
</style>
