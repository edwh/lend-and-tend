import { defineNuxtPlugin } from '#app/nuxt'
import { reloadNuxtApp } from '#app/composables/chunk'

// L&T: Simplified chunk error handler without misc store
export default defineNuxtPlugin({
  setup(nuxtApp) {
    nuxtApp.hook('app:chunkError', (error) => {
      console.log(
        'Caught chunk error in ' +
          window?.location?.pathname +
          ', will reload: ' +
          JSON.stringify(error)
      )

      reloadNuxtApp({
        path: window?.location?.pathname ? window.location.pathname : '/',
        persistState: true,
      })
    })
  },
})
