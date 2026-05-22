<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand-col">
        <span class="footer-site-name">{{ branding.siteName }}</span>
        <p class="footer-tagline">{{ branding.tagline }}</p>
        <div class="footer-social">
          <a :href="branding.social.instagramUrl" target="_blank" rel="noopener" class="footer-social-link">
            <VIcon :icon="['fab', 'instagram']" />
            <span>{{ branding.social.instagram }}</span>
          </a>
        </div>
      </div>

      <div class="footer-links-col">
        <h3 class="footer-col-heading">Explore</h3>
        <nav class="footer-links">
          <NuxtLink to="/map">Map</NuxtLink>
          <NuxtLink to="/about">About</NuxtLink>
          <NuxtLink to="/register">Join</NuxtLink>
          <NuxtLink to="/login">Sign in</NuxtLink>
        </nav>
      </div>

      <div class="footer-contact-col">
        <h3 class="footer-col-heading">Contact</h3>
        <p><a :href="`mailto:${branding.email}`" class="footer-email">{{ branding.email }}</a></p>
        <div class="footer-legal">
          <p>{{ branding.companyName }}</p>
          <p>Co. no. {{ branding.companyNumber }}</p>
          <p class="footer-copy">© {{ new Date().getFullYear() }} {{ branding.companyName }}</p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import branding from '~/branding.config'
</script>

<style scoped>
.site-footer {
  background: var(--lat-color-text);
  color: rgba(255, 255, 255, 0.8);
  padding: 56px 24px 32px;
  font-size: 0.9rem;
}

.footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1.5fr;
  gap: 48px;
  align-items: flex-start;
}

@media (max-width: 768px) {
  .footer-inner {
    grid-template-columns: 1fr 1fr;
  }
  .footer-brand-col {
    grid-column: 1 / -1;
  }
}

@media (max-width: 480px) {
  .footer-inner {
    grid-template-columns: 1fr;
  }
}

.footer-site-name {
  display: block;
  font-family: var(--lat-font-heading);
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.footer-tagline {
  margin: 0 0 16px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.85rem;
  font-style: italic;
}

.footer-social {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-social-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.15s;
}

.footer-social-link:hover {
  color: #fff;
}

.footer-col-heading {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  margin: 0 0 14px;
}

.footer-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-links a {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.15s;
}

.footer-links a:hover {
  color: #fff;
}

.footer-email {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 0.9rem;
  display: block;
  margin-bottom: 16px;
  transition: color 0.15s;
}

.footer-email:hover {
  color: #fff;
}

.footer-legal {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.footer-legal p {
  margin: 0;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.8rem;
}

.footer-copy {
  margin-top: 4px !important;
}
</style>
