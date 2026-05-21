/**
 * Interaction capture plugin (L&T simplified version).
 *
 * L&T: Removed interaction logging as it requires loggingContext store
 */

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  // L&T: No interaction logging - store and action functions removed
})
