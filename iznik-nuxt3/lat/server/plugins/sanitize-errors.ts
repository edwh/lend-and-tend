import { sanitizeErrorForClient } from '../utils/sanitizeError'

/* Strip stack traces from production error responses.
 *
 * See ../utils/sanitizeError.ts for why: the parent layer's
 * log-ssr-errors plugin attaches error.data.stack to every error and Nitro
 * serialises error.data for deliberate 4xx/5xx responses, so without this
 * every "Sign in to apply" 401 carried a stack trace to the public.
 *
 * NB: registered explicitly via lat/nuxt.config.ts `nitro.plugins`, because
 * a layer's server/plugins are not auto-scanned (see fouc-fix.ts).
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error) => {
    try {
      sanitizeErrorForClient(error, process.env)
    } catch {
      // never compound the original error
    }
  })
})
