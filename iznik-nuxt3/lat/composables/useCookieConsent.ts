/*
 * Simple, self-hosted cookie consent for L&T — deliberately NOT Freegle's
 * CookieYes (no external service, no account, no third-party script).
 *
 * L&T sets no analytics and self-hosts its fonts, so the only non-essential
 * thing is Sentry error monitoring (currently off — SENTRY_DSN empty). The
 * parent Sentry plugin already has a CMP gate: it waits for
 * `window.cookieYesComplete` before initialising when COOKIEYES is set. We ARE
 * that CMP — so we only flip that flag once the visitor has accepted, meaning
 * Sentry (whenever it's enabled) never runs before consent, and never on
 * "essential only".
 */
export type CookieConsent = 'all' | 'essential'

export function useCookieConsent() {
  // First-party cookie, ~12 months, so we ask once.
  const consent = useCookie<CookieConsent | null>('lat_cookie_consent', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
    default: () => null,
  })

  const hasChosen = computed(
    () => consent.value === 'all' || consent.value === 'essential'
  )
  const nonEssentialAllowed = computed(() => consent.value === 'all')

  function releaseNonEssential() {
    // Only relevant on the client. Setting this true lets the parent Sentry
    // plugin proceed; leaving it false keeps Sentry (and any future
    // non-essential script gated the same way) from initialising.
    if (import.meta.client) {
      ;(window as unknown as { cookieYesComplete?: boolean }).cookieYesComplete =
        nonEssentialAllowed.value === true
    }
  }

  function acceptAll() {
    consent.value = 'all'
    releaseNonEssential()
  }

  function essentialOnly() {
    consent.value = 'essential'
    releaseNonEssential()
  }

  // Reflect the stored choice as soon as the composable is used on the client.
  if (import.meta.client) releaseNonEssential()

  return { consent, hasChosen, nonEssentialAllowed, acceptAll, essentialOnly }
}
