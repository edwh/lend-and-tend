// L&T: Simplified Sentry plugin without Freegle stores
import * as Sentry from '@sentry/vue'
import { Integrations } from '@sentry/tracing'
import {
  HttpClient as HttpClientIntegration,
  ExtraErrorData as ExtraErrorDataIntegration,
} from '@sentry/integrations'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { useRouter } from '#imports'

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

  function initSentry() {
    if (!config.public.SENTRY_DSN) {
      return
    }

    Sentry.init({
      app: [vueApp],
      dsn: config.public.SENTRY_DSN as string,
      integrations: [
        new Integrations.BrowserTracing({
          routingInstrumentation: Sentry.vueRouterInstrumentation(router),
          tracePropagationTargets: ['localhost', /^\//],
        }),
        new HttpClientIntegration(),
        new ExtraErrorDataIntegration(),
      ],
      tracesSampleRate: 1.0,
      debug: false,
      environment: process.env.NODE_ENV || 'development',
      beforeSend(event) {
        if (suppressSentryEvent(event)) {
          return null
        }
        return event
      },
    })
  }

  initSentry()

  router.afterEach((to) => {
    if (config.public.SENTRY_DSN) {
      Sentry.captureMessage(`Page view: ${to.path}`, 'info')
    }
  })
})
