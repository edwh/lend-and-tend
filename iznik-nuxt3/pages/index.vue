<template>
  <div class="landing-page">
    <!-- Navigation -->
    <nav class="landing-nav">
      <div class="nav-container">
        <NuxtLink to="/" class="nav-brand">
          {{ branding.siteNameShort }}
        </NuxtLink>
        <div class="nav-links">
          <template v-if="isAuthenticated">
            <NuxtLink to="/lat/map" class="nav-link">Map</NuxtLink>
            <NuxtLink to="/lat/messages" class="nav-link">Messages</NuxtLink>
            <a href="#" class="nav-link" @click.prevent="logout">Sign out</a>
          </template>
          <template v-else>
            <NuxtLink to="/lat/about" class="nav-link">About</NuxtLink>
            <NuxtLink to="/lat/auth/login" class="nav-link">Sign in</NuxtLink>
            <NuxtLink to="/lat/auth/register" class="nav-link nav-cta"
              >Join</NuxtLink
            >
          </template>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">{{ branding.tagline }}</h1>
        <p class="hero-subtitle">{{ branding.subTagline }}</p>
        <div class="hero-ctas">
          <NuxtLink to="/lat/map" class="btn btn-primary btn-lg">
            Find a garden
          </NuxtLink>
          <NuxtLink to="/lat/auth/register" class="btn btn-secondary btn-lg">
            Share your garden
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="how-it-works">
      <div class="container">
        <h2 class="section-title">How it works</h2>
        <div class="steps-grid">
          <div class="step">
            <div class="step-icon">1</div>
            <h3>{{ branding.roles.both.label }}</h3>
            <p>Sign up and set your location to get started</p>
          </div>
          <div class="step">
            <div class="step-icon">2</div>
            <h3>Find your match</h3>
            <p>Browse the map to find lenders or tenders near you</p>
          </div>
          <div class="step">
            <div class="step-icon">3</div>
            <h3>Grow together</h3>
            <p>Agree terms and start your gardening journey</p>
          </div>
        </div>
      </div>
    </section>

    <!-- For Lenders & Tenders -->
    <section class="roles-section">
      <div class="container">
        <h2 class="section-title">Whether you're a lender or a tender</h2>
        <div class="roles-grid">
          <!-- Lender Card -->
          <div class="role-card">
            <div class="role-header lender">
              <span class="role-icon">{{ branding.roles.lender.icon }}</span>
              <h3>{{ branding.roles.lender.label }}</h3>
            </div>
            <p class="role-description">
              {{ branding.roles.lender.description }}
            </p>
            <ul class="role-benefits">
              <li>Share your garden space responsibly</li>
              <li>Connect with experienced gardeners</li>
              <li>Earn income while helping others</li>
            </ul>
            <NuxtLink to="/lat/auth/register" class="btn btn-outline-lender">
              Become a Lender
            </NuxtLink>
          </div>

          <!-- Tender Card -->
          <div class="role-card">
            <div class="role-header tender">
              <span class="role-icon">{{ branding.roles.tender.icon }}</span>
              <h3>{{ branding.roles.tender.label }}</h3>
            </div>
            <p class="role-description">
              {{ branding.roles.tender.description }}
            </p>
            <ul class="role-benefits">
              <li>Garden without owning land</li>
              <li>Learn from experienced gardeners</li>
              <li>Grow your own food and flowers</li>
            </ul>
            <NuxtLink to="/lat/auth/register" class="btn btn-outline-tender">
              Become a Tender
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Safety Section -->
    <section class="safety-section">
      <div class="container">
        <h2 class="section-title">Your safety matters</h2>
        <div class="safety-grid">
          <div
            v-for="(advice, idx) in branding.content.groundRules.safetyAdvice"
            :key="idx"
            class="safety-item"
          >
            <div class="safety-icon">✓</div>
            <p>{{ advice }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-container">
        <div class="footer-content">
          <div class="footer-col">
            <h4>{{ branding.siteName }}</h4>
            <p>{{ branding.description }}</p>
          </div>
          <div class="footer-col">
            <h4>Company</h4>
            <ul>
              <li><NuxtLink to="/lat/about">About</NuxtLink></li>
              <li>
                <a :href="`mailto:${branding.email}`">{{ branding.email }}</a>
              </li>
              <li>
                <a :href="branding.social.instagramUrl" target="_blank">{{
                  branding.social.instagram
                }}</a>
              </li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Legal</h4>
            <p>
              {{ branding.companyName }}<br />Company number:
              {{ branding.companyNumber }}
            </p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2024 {{ branding.companyName }}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLatUserStore } from '~/stores/latUser'
import branding from '~/branding.config'

const latUserStore = useLatUserStore()
const isAuthenticated = computed(() => latUserStore.isAuthenticated)

definePageMeta({
  layout: 'empty',
})

useHead({
  title: `${branding.tagline} | ${branding.siteName}`,
  meta: [
    {
      name: 'description',
      content: branding.description,
    },
  ],
})

async function logout() {
  await latUserStore.logout()
  navigateTo('/')
}
</script>

<style scoped>
.landing-page {
  background-color: v-bind('branding.colors.background');
  color: v-bind('branding.colors.text');
  font-family: v-bind('branding.fonts.body');
}

/* Navigation */
.landing-nav {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.nav-brand {
  font-family: v-bind('branding.fonts.heading');
  font-weight: 700;
  font-size: 1.5rem;
  color: v-bind('branding.colors.primary');
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-link {
  color: v-bind('branding.colors.text');
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.nav-link:hover {
  color: v-bind('branding.colors.primary');
}

.nav-cta {
  background: v-bind('branding.colors.primary');
  color: white !important;
  padding: 8px 20px;
  border-radius: 4px;
  font-weight: 600;
}

.nav-cta:hover {
  background: v-bind('branding.colors.primaryDark');
  color: white !important;
}

/* Hero Section */
.hero {
  background: linear-gradient(
    135deg,
    v-bind('branding.colors.primary'),
    v-bind('branding.colors.primaryDark')
  );
  color: white;
  padding: 120px 20px;
  text-align: center;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-family: v-bind('branding.fonts.heading');
  font-size: 3.5rem;
  font-weight: 700;
  margin: 0 0 16px 0;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.5rem;
  margin: 0 0 40px 0;
  opacity: 0.95;
  font-weight: 300;
}

.hero-ctas {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 14px 28px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  display: inline-block;
  border: none;
  cursor: pointer;
}

.btn-lg {
  padding: 16px 32px;
  font-size: 1.05rem;
}

.btn-primary {
  background: white;
  color: v-bind('branding.colors.primary');
}

.btn-primary:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

/* Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Section Title */
.section-title {
  font-family: v-bind('branding.fonts.heading');
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin: 0 0 48px 0;
  color: v-bind('branding.colors.text');
}

/* How It Works */
.how-it-works {
  padding: 80px 20px;
  background-color: v-bind('branding.colors.surface');
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 40px;
}

.step {
  text-align: center;
}

.step-icon {
  width: 60px;
  height: 60px;
  background: v-bind('branding.colors.primary');
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 auto 20px;
}

.step h3 {
  font-size: 1.3rem;
  margin: 0 0 12px 0;
  color: v-bind('branding.colors.text');
}

.step p {
  margin: 0;
  color: v-bind('branding.colors.textMuted');
  font-size: 1rem;
}

/* Roles Section */
.roles-section {
  padding: 80px 20px;
  background: white;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 40px;
}

.role-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s;
}

.role-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}

.role-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid;
}

.role-header.lender {
  border-bottom-color: v-bind('branding.colors.lenderBg');
}

.role-header.tender {
  border-bottom-color: v-bind('branding.colors.tenderBg');
}

.role-icon {
  font-size: 2rem;
}

.role-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: v-bind('branding.colors.text');
}

.role-description {
  color: v-bind('branding.colors.textMuted');
  margin: 0 0 16px 0;
  font-size: 0.95rem;
}

.role-benefits {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
  flex-grow: 1;
}

.role-benefits li {
  padding: 8px 0;
  color: v-bind('branding.colors.textMuted');
  font-size: 0.95rem;
  position: relative;
  padding-left: 24px;
}

.role-benefits li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: v-bind('branding.colors.primary');
  font-weight: bold;
}

.btn-outline-lender {
  background: v-bind('branding.colors.lenderBg');
  color: v-bind('branding.colors.lenderText');
}

.btn-outline-lender:hover {
  background: #d4ecc0;
}

.btn-outline-tender {
  background: v-bind('branding.colors.tenderBg');
  color: v-bind('branding.colors.tenderText');
}

.btn-outline-tender:hover {
  background: #dcc5e7;
}

/* Safety Section */
.safety-section {
  padding: 80px 20px;
  background: v-bind('branding.colors.surface');
}

.safety-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}

.safety-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.safety-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: v-bind('branding.colors.success');
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-top: 2px;
}

.safety-item p {
  margin: 0;
  color: v-bind('branding.colors.textMuted');
  line-height: 1.5;
}

/* Footer */
.landing-footer {
  background: v-bind('branding.colors.text');
  color: white;
  padding: 60px 20px 20px;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
  margin-bottom: 40px;
}

.footer-col h4 {
  margin: 0 0 12px 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.footer-col p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  line-height: 1.5;
}

.footer-col ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-col li {
  margin-bottom: 8px;
}

.footer-col a {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-col a:hover {
  color: white;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.2rem;
  }

  .hero-subtitle {
    font-size: 1.1rem;
  }

  .hero-ctas {
    flex-direction: column;
  }

  .hero-ctas .btn {
    width: 100%;
  }

  .section-title {
    font-size: 2rem;
  }

  .nav-links {
    gap: 12px;
  }

  .nav-link {
    font-size: 0.85rem;
  }

  .roles-section,
  .how-it-works,
  .safety-section {
    padding: 60px 20px;
  }
}

@media (max-width: 480px) {
  .hero {
    padding: 60px 20px;
  }

  .hero-title {
    font-size: 1.8rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .nav-container {
    height: 56px;
  }

  .nav-brand {
    font-size: 1.2rem;
  }

  .nav-links {
    gap: 8px;
    font-size: 0.8rem;
  }

  .nav-cta {
    padding: 6px 12px;
    font-size: 0.8rem;
  }

  .footer-content {
    gap: 24px;
  }
}
</style>
