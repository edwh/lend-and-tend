/* Prevent Flash of Unstyled Content (FOUC) by removing async CSS loading attributes
 *
 * Nuxt 3 automatically adds media="print" onload="this.media='all'" to non-critical
 * stylesheets for performance. However, this causes FOUC since stylesheets load
 * asynchronously.
 *
 * This middleware strips those attributes to force synchronous CSS loading,
 * trading some perceived performance for visual consistency.
 */
export default defineEventHandler((event) => {
  // Only process HTML responses
  const contentType = getHeader(event, 'content-type') || ''
  if (!contentType.includes('text/html')) {
    return
  }

  // Hook into the response to intercept HTML before sending to client
  const originalSend = event.node.res.send
  event.node.res.send = function (data: any) {
    if (typeof data === 'string' && data.includes('media="print"')) {
      // Remove async CSS loading attributes from all stylesheets
      // Convert: media="print" onload="this.media='all'"
      // To: (remove both attributes)
      data = data.replace(
        /\s*media="print"\s+onload="this\.media='all'"/g,
        ''
      )
    }

    return originalSend.call(this, data)
  }
})
