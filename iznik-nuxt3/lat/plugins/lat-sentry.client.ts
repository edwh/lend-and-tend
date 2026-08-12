/*
 * L&T's own consent-gated Sentry init.
 *
 * We deliberately do NOT use the parent Freegle sentry.client.ts (which gates
 * on CookieYes — a CMP we don't run) or its SENTRY_DSN (kept empty, so the
 * parent plugin skips init). Instead we initialise Sentry here, ONLY once the
 * visitor has accepted non-essential cookies via our own banner. On "Essential
 * only" (or before any choice) Sentry never starts, so no error data leaves the
 * browser without consent.
 *
 * Errors only — no performance tracing or session replay — to stay well within
 * Sentry's free tier.
 */
import * as Sentry from '@sentry/vue'
import { useCookieConsent } from '../composables/useCookieConsent'

export default defineNuxtPlugin((nuxtApp) => {
  const dsn = useRuntimeConfig().public.LAT_SENTRY_DSN as string
  if (!dsn) return // Sentry not configured for L&T

  const { nonEssentialAllowed } = useCookieConsent()
  let started = false

  function start() {
    if (started || !nonEssentialAllowed.value) return
    started = true
    Sentry.init({
      app: nuxtApp.vueApp,
      dsn,
      environment: 'production',
      tracesSampleRate: 0,
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications.',
        'TypeError: Failed to fetch',
        'TypeError: NetworkError when attempting to fetch resource.',
        'Navigation cancelled from ',
      ],
    })
  }

  // Start now if consent was given on a previous visit, and the moment the
  // visitor clicks Accept this session (nonEssentialAllowed flips reactively).
  watch(nonEssentialAllowed, () => start(), { immediate: true })
})
