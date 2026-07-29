/* Prevent Flash of Unstyled Content (FOUC) on L&T.
 *
 * The parent layer's server/plugins/removeModulePreload.js (render:response
 * hook) converts every non-`entry` component stylesheet to async loading —
 *   <link rel="stylesheet" href="…" media="print" onload="this.media='all'">
 *   <noscript><link rel="stylesheet" href="…"></noscript>
 * On Freegle those chunks are below-fold. On L&T they hold the landing page's
 * above-fold styles (LayoutCommon, the Lat* sections, the footer…), so
 * async-loading them paints the page unstyled first and then restyles = flash.
 *
 * We hook `beforeResponse`, which fires AFTER `render:response` in the Nitro
 * request lifecycle, so this reliably runs after the parent's rewrite
 * regardless of plugin order. We strip the async attributes (→ render-blocking,
 * applied before first paint) and drop the now-redundant <noscript> duplicates.
 *
 * NB: this plugin is registered explicitly via lat/nuxt.config.ts `nitro.plugins`
 * because a layer's server/plugins are not auto-scanned (only server/api is).
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (_event, response) => {
    if (
      typeof response.body !== 'string' ||
      !response.body.includes('media="print"')
    ) {
      return
    }
    response.body = response.body
      .replace(/ media="print" onload="this\.media='all'"/g, '')
      .replace(
        /<noscript><link rel="stylesheet" href="[^"]*\/_nuxt\/[^"]*\.css"[^>]*><\/noscript>/g,
        ''
      )
  })
})
