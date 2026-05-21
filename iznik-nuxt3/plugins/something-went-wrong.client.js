import * as Sentry from '@sentry/browser'
import { useRouter } from '#imports'

// L&T: Simplified error handler without Freegle stores
export default defineNuxtPlugin((nuxtApp) => {
  const originalErrorHandler = nuxtApp.vueApp.config.errorHandler

  nuxtApp.vueApp.config.errorHandler = (err, vm, info, ...rest) => {
    console.log('Vue errorHandler', err?.message)
    if (!err) {
      return
    }

    // Log the error
    try {
      console.log('Vue errorHandler')
      console.log('Err', err)
    } catch (e) {
      console.error('Error in error logging', e)
    }

    // L&T: No misc store available, just log and continue
    Sentry.captureException(err)
    return true
  }

  window.addEventListener('unhandledrejection', function (event) {
    const reason = event?.reason

    if (reason?.message?.includes('Maintenance error')) {
      // The API may throw this, and it may not get caught.
      const router = useRouter()
      router.push('/maintenance')
    } else if (reason) {
      // Use captureException with the actual Error object so Sentry gets
      // the full stack trace. The previous captureMessage('Unhandled promise')
      // discarded all diagnostic information.
      Sentry.captureException(reason)
    }
  })
})
