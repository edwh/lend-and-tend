<template>
  <div>
    <div class="error__wrapper">
      <div class="error">
        <div v-if="maintenance" class="maintenance__container px-3 bg-white">
          <h1 class="mt-4">Sorry — we're doing some maintenance</h1>
          <p>We're doing some maintenance work just now. Usually this doesn't take long. Please <a href="/">try again</a> later.</p>
        </div>
        <div v-else>
          <h1 v-if="error?.statusCode === 404">
            That page doesn't exist.
          </h1>
          <div v-else>
            <h1>Something went wrong.</h1>
            <p v-if="error && JSON.stringify(error).length > 2">
              Error: {{ JSON.stringify(error) }}
            </p>
          </div>
          <p><a href="/">Go back to the home page</a></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useError } from '#imports'
import { onMounted } from 'vue'

const error = useError()
const maintenance = error?.value?.message === 'Maintenance error'

const importError =
  error?.value?.message?.includes('Failed to fetch dynamically imported module') ||
  error?.value?.message?.includes('Importing a module script failed')

if (importError) {
  window.location.reload()
}

onMounted(async () => {
  try {
    if (!error?.value || maintenance || importError) return
    const Sentry = await import('@sentry/browser')
    const e = error.value
    const synth = new Error(e.message || 'Unknown error')
    if (e.data?.stack) {
      synth.stack = e.data.stack
    }
    Sentry.withScope((scope) => {
      scope.setTag('source', 'error-page-mount')
      scope.setTag('statusCode', String(e.statusCode ?? ''))
      scope.setExtra('errorData', e.data)
      scope.setExtra('url', window.location?.pathname + (window.location?.search || ''))
      Sentry.captureException(synth)
    })
  } catch (_) {
    // never let logging itself throw
  }
})
</script>
