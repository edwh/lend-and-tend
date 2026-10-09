<template>
  <client-only>
    <div
      v-if="!hasChosen"
      ref="bar"
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
          <button type="button" class="lcc-btn" @click="essentialOnly">
            Essential only
          </button>
          <button type="button" class="lcc-btn" @click="acceptAll">
            Accept
          </button>
        </div>
      </div>
    </div>
  </client-only>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useCookieConsent } from '../composables/useCookieConsent'
import branding from '~/branding.config'

const siteName = branding.siteName
const { hasChosen, acceptAll, essentialOnly, barHeight } = useCookieConsent()

// The bar is fixed to the bottom of the viewport, so it would cover whatever
// is at the foot of a long page (the agreement form's "Send to tender" button,
// the footer links). Reserve that height on <body> while the bar is showing
// and give it back as soon as a choice is made. Client-only: the bar itself
// is <client-only>, and body padding set after mount cannot cause a hydration
// mismatch.
const bar = ref(null)
let observer = null

function reserveSpace() {
  if (typeof document === 'undefined') return
  const h = bar.value ? bar.value.offsetHeight : 0
  barHeight.value = h
  // Pages that size themselves to the viewport (the chat column is
  // height: calc(100vh - navbar)) subtract this so their bottom controls sit
  // above the bar rather than under it.
  document.documentElement.style.setProperty(
    '--lat-cookie-bar-height',
    h ? `${h}px` : '0px'
  )
  // scrollIntoView / focus scrolling (keyboard users, Playwright, "jump to
  // field" links) must land ABOVE the bar, not underneath it.
  document.documentElement.style.scrollPaddingBottom = h ? `${h}px` : ''
}

function observe() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (bar.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(reserveSpace)
    observer.observe(bar.value)
  }
  reserveSpace()
}

onMounted(observe)
// The bar sits inside <client-only>, whose slot renders a tick AFTER this
// component mounts, so `bar` is still null in onMounted. Watch the ref: the
// moment the bar exists (or goes away) re-measure. flush 'post' runs after
// the DOM update, when offsetHeight is real.
watch(bar, observe, { flush: 'post' })
watch(hasChosen, () => nextTick(observe))
onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  observer = null
  if (typeof document !== 'undefined') {
    barHeight.value = 0
    document.documentElement.style.scrollPaddingBottom = ''
    document.documentElement.style.removeProperty('--lat-cookie-bar-height')
  }
})
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

/* Dark green: the brand green on white is below 4.5:1 for small text. The
   padding gives the link a 44px-tall tap target on a phone. */
.lcc-link {
  color: var(--lat-color-primary-dark);
  font-weight: 600;
  white-space: nowrap;
  display: inline-block;
  /* 44px hit area without making the bar taller: the padding is cancelled by
     the margin, so the surrounding text keeps its line height. */
  padding: 10px 0;
  margin: -10px 0;
  text-decoration: underline;
}

.lcc-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

/* Both choices share one identical style — reject ("Essential only") is given
   exactly the same size, colour and visual weight as accept ("Accept"), so
   neither is nudged. Required by PECR/GDPR: rejecting must be as easy AND as
   prominent as accepting (no dark pattern). */
.lcc-btn {
  padding: 10px 22px;
  border-radius: 0.2rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 150ms ease-in-out;
  font-family: var(--lat-font-body);
  background: var(--lat-color-primary);
  color: #fff;
  border: 2px solid var(--lat-color-primary);
}
.lcc-btn:hover {
  background: var(--lat-color-primary-dark);
  border-color: var(--lat-color-primary-dark);
}
.lcc-btn:focus-visible {
  outline: 3px solid var(--lat-color-primary-dark);
  outline-offset: 2px;
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
