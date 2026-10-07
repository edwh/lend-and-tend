/*
 * Simple, self-hosted cookie consent for L&T — deliberately NOT Freegle's
 * CookieYes (no external service, no account, no third-party script).
 *
 * L&T sets no analytics and self-hosts its fonts, so the only non-essential
 * thing is Sentry error monitoring, which lat/plugins/lat-sentry.client.ts
 * initialises ONLY when `nonEssentialAllowed` is true (i.e. the visitor clicked
 * Accept). The choice is stored in a first-party cookie AND mirrored into shared
 * reactive state (useState) so that clicking Accept in the banner immediately
 * flips the Sentry gate without a reload.
 */
export type CookieConsent = 'all' | 'essential'

export function useCookieConsent() {
  const cookie = useCookie<CookieConsent | null>('lat_cookie_consent', {
    maxAge: 60 * 60 * 24 * 365, // ~12 months — ask once
    sameSite: 'lax',
    path: '/',
    default: () => null,
  })

  // Shared across every caller (banner + Sentry gate) so changes propagate.
  const consent = useState<CookieConsent | null>(
    'latCookieConsent',
    () => cookie.value
  )

  const hasChosen = computed(
    () => consent.value === 'all' || consent.value === 'essential'
  )
  const nonEssentialAllowed = computed(() => consent.value === 'all')

  function set(value: CookieConsent) {
    consent.value = value
    cookie.value = value
  }

  // Measured height of the fixed banner while it is showing (0 otherwise).
  // Set by LatCookieConsent, read by LatCookieSpacer, which pads the page
  // content so the last control on a long page is never under the bar.
  const barHeight = useState<number>('lat-cookie-bar-height', () => 0)

  return {
    barHeight,
    consent,
    hasChosen,
    nonEssentialAllowed,
    acceptAll: () => set('all'),
    essentialOnly: () => set('essential'),
  }
}
