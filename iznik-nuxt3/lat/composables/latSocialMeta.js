/**
 * Lend & Tend's social-preview and attribution tags (Open Graph, Twitter,
 * author), shared by every layout and the error page.
 *
 * Upstream Freegle's nuxt.config registers og:/twitter:/author tags for every
 * page. Nuxt's layer-config merger concatenates the lat nuxt.config entries
 * BEFORE upstream's, and unhead keeps the LAST entry per key, so the Freegle
 * values used to win. That mattered most on the client-rendered routes
 * (/chats, /admin, /map, /garden: `ssr: false`), whose HTML carries only this
 * config-level head, so a shared /chats link previewed as "Freegle" with
 * Freegle's logo and description.
 *
 * Two layers of defence:
 *  - lat/nuxt.config.ts runs overrideHeadMeta() over the merged head once the
 *    layers are combined, so the lat entries replace upstream's everywhere.
 *  - Each L&T layout and the error page also register the list at runtime
 *    (useHead), which keeps og:url/og:image right if USER_SITE differs at
 *    runtime from the build.
 *
 * The title and description match the existing lendandtend.com cards
 * verbatim, so an unfurl looks the same whichever site was shared. Social
 * cards say "Lend and Tend" (no ampersand), as the legacy site presents
 * itself to crawlers, even though the in-product brand is "Lend & Tend".
 *
 * Kept free of Nuxt imports so it is unit-testable; callers pass the result
 * to their own useHead().
 */
export const LAT_SOCIAL_DESCRIPTION =
  "No garden? No problem! Can't garden? Find out who can. Patch-Match to make friends or grow veg. Let's love unloved gardens together."

export const LAT_SOCIAL_NAME = 'Lend and Tend'

/** The host serving this page, from runtime config, with no trailing slash. */
export function latSiteUrl(publicConfig) {
  const site =
    (publicConfig && publicConfig.USER_SITE) || 'https://new.lendandtend.com'
  return String(site).replace(/\/$/, '')
}

/** The meta entries for useHead({ meta }), keyed so they replace upstream's. */
export function latSocialMeta(siteUrl) {
  const image = siteUrl + '/images/lat/logo.png?v=2'
  const prop = (property, content) => ({ key: property, property, content })
  const name = (n, content) => ({ key: n, name: n, content })
  return [
    prop('og:title', LAT_SOCIAL_NAME),
    prop('og:site_name', LAT_SOCIAL_NAME),
    prop('og:description', LAT_SOCIAL_DESCRIPTION),
    prop('og:image', image),
    // Explicit type and dimensions let crawlers (Facebook especially) render
    // the card without a HEAD probe. 1024x1024 is square; Facebook crops to
    // its preferred 1.91:1 but still shows the image rather than rejecting it.
    prop('og:image:type', 'image/png'),
    prop('og:image:width', '1024'),
    prop('og:image:height', '1024'),
    prop('og:url', siteUrl),
    name('twitter:title', LAT_SOCIAL_NAME),
    name('twitter:description', LAT_SOCIAL_DESCRIPTION),
    name('twitter:image', image),
    name('twitter:image:alt', 'The Lend and Tend logo'),
    // The @handle for card attribution. Mirrors branding.config social; if
    // L&T's Twitter handle differs, update both. Must NOT be empty: Twitter
    // treats an empty value as malformed and falls back to upstream's
    // "thisisfreegle".
    name('twitter:site', '@LendandTend'),
    name('author', LAT_SOCIAL_NAME),
    name('apple-mobile-web-app-title', LAT_SOCIAL_NAME),
  ]
}

/**
 * What makes two meta entries "the same tag": the property or name they set,
 * else their dedupe key (`key`, or upstream's legacy `hid`/`vmid`), else the
 * charset or http-equiv. null means "unique, never deduped".
 */
export function headMetaId(m) {
  if (!m || typeof m !== 'object') return null
  if (m.property) return `property:${m.property}`
  if (m.name) return `name:${m.name}`
  if (m['http-equiv']) return `http-equiv:${m['http-equiv']}`
  const key = m.key ?? m.hid ?? m.vmid
  if (key) return `key:${key}`
  if (m.charset !== undefined) return 'charset'
  return null
}

/**
 * The head meta list after layer merging, with `ours` in front and every
 * other entry that sets the same tag removed, so our values win regardless
 * of the order Nuxt merged the layers in. Entries we do not set are kept in
 * their original order.
 */
export function overrideHeadMeta(merged, ours) {
  const ids = new Set(ours.map(headMetaId).filter(Boolean))
  const rest = (merged || []).filter((m) => {
    const id = headMetaId(m)
    return !(id && ids.has(id))
  })
  return [...ours, ...rest]
}
