<template>
  <client-only>
    <div
      v-if="!hasChosen"
      class="lat-cookie-consent"
      role="region"
      aria-label="Cookie choices"
    >
      <div class="lcc-inner">
        <p class="lcc-text">
          {{ siteName }} uses only the cookies needed to keep the site working —
          signing in and keeping your session secure. No advertising, no
          analytics. With your consent we may also use privacy-friendly error
          monitoring to fix problems faster.
          <nuxt-link to="/privacy" class="lcc-link"
            >Privacy &amp; cookies</nuxt-link
          >
        </p>
        <div class="lcc-actions">
          <button
            type="button"
            class="lcc-btn lcc-btn-ghost"
            @click="essentialOnly"
          >
            Essential only
          </button>
          <button
            type="button"
            class="lcc-btn lcc-btn-primary"
            @click="acceptAll"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  </client-only>
</template>

<script setup>
import { useCookieConsent } from '../composables/useCookieConsent'
import branding from '~/branding.config'

const siteName = branding.siteName
const { hasChosen, acceptAll, essentialOnly } = useCookieConsent()
</script>

<style scoped>
/* Full-width bar pinned across the bottom so it can't be missed. */
.lat-cookie-consent {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1040; /* below the login modal (1050) */
  background: #fff;
  border-top: 3px solid var(--lat-color-primary);
  box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.16);
  padding: 16px 24px;
  font-family: var(--lat-font-body);
}

/* Content stays readable-width and centred; the bar behind it is full-width. */
.lcc-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.lcc-text {
  flex: 1;
  min-width: 260px;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--lat-color-text-muted);
}

.lcc-link {
  color: var(--lat-color-primary);
  font-weight: 600;
  white-space: nowrap;
}

.lcc-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.lcc-btn {
  padding: 10px 22px;
  border-radius: 0.2rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 150ms ease-in-out;
  font-family: var(--lat-font-body);
}

.lcc-btn-primary {
  background: var(--lat-color-primary);
  color: #fff;
  border: 2px solid var(--lat-color-primary);
}
.lcc-btn-primary:hover {
  background: var(--lat-color-primary-dark);
  border-color: var(--lat-color-primary-dark);
}

/* "Essential only" is a real, equally-clickable button (reject as easy as
   accept) — just visually secondary. */
.lcc-btn-ghost {
  background: #fff;
  color: var(--lat-color-primary-dark);
  border: 2px solid #cfd8c4;
}
.lcc-btn-ghost:hover {
  border-color: var(--lat-color-primary-dark);
}

@media (max-width: 640px) {
  .lat-cookie-consent {
    padding: 14px 16px;
  }
  .lcc-inner {
    gap: 12px;
  }
  .lcc-actions {
    width: 100%;
  }
  .lcc-btn {
    flex: 1;
  }
}
</style>
