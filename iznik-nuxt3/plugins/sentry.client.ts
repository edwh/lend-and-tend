// L&T: Simplified Sentry plugin without Freegle stores
import * as Sentry from '@sentry/vue'
import { Integrations } from '@sentry/tracing'
import {
  HttpClient as HttpClientIntegration,
  ExtraErrorData as ExtraErrorDataIntegration,
} from '@sentry/integrations'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { useRouter } from '#imports'
// Suppress noisy navigation errors from Sentry
function suppressSentryEvent(event: any): boolean {
  return event?.exception?.values?.some((v: any) =>
    v?.value?.includes('Navigation cancelled') ||
    v?.value?.includes('Redirected when going from')
  ) ?? false
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const { vueApp } = nuxtApp
  const router = useRouter()

  // L&T: Removed client logging and mobile store references - initializing Sentry directly

  function initSentry() {
    // Skip Sentry initialization if DSN is empty (disabled)
    if (!config.public.SENTRY_DSN) {
      console.log('Sentry disabled - skipping initialization')
      return
    }

    Sentry.init({
      app: [vueApp],
      dsn: config.public.SENTRY_DSN,
      integrations: [
        new Integrations.BrowserTracing({
          routingInstrumentation: Sentry.vueRouterInstrumentation(router),
          tracePropagationTargets: ['localhost', /^\//],
        }),
        new HttpClientIntegration(),
        new ExtraErrorDataIntegration(),
      ],
      tracesSampleRate: config.public.SENTRY_TRACES_SAMPLE_RATE || 1.0,
      debug: config.public.SENTRY_ENABLE_DEBUG || false,
      environment: config.public.ENVIRONMENT || 'dev',
      beforeSend(event, hint) {
        // L&T: Minimal filtering
        if (suppressSentryEvent(event)) {
          return null
        }
        return event
      },
    })
  }

  // Initialize immediately if CookieYes is not configured
  if (!config.public.COOKIEYES) {
    initSentry()
  } else {
    // Wait for CookieYes to complete
    function checkCMPComplete() {
      if (!window.cookieYesComplete) {
        setTimeout(checkCMPComplete, 100)
      } else {
        initSentry()
      }
    }
    checkCMPComplete()
  }

  // Log page views on route changes
  router.afterEach((to) => {
    Sentry.captureMessage(`Page view: ${to.path}`, 'info')
  })
})
