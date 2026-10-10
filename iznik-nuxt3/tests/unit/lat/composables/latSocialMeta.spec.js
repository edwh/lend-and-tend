import { describe, it, expect } from 'vitest'
import {
  latSiteUrl,
  latSocialMeta,
  headMetaId,
  overrideHeadMeta,
  LAT_SOCIAL_DESCRIPTION,
} from '~/lat/composables/latSocialMeta'

// Upstream Freegle registers og:/twitter:/author tags for every page. Only a
// layout (or the error page) that re-registers the same keys at runtime wins,
// so every L&T layout shares this one list. A page that forgets it is shared
// on Facebook or Twitter as "Freegle".

describe('latSiteUrl', () => {
  it('uses USER_SITE without a trailing slash', () => {
    expect(latSiteUrl({ USER_SITE: 'https://new.lendandtend.com/' })).toBe(
      'https://new.lendandtend.com'
    )
  })
  it('falls back to the live site when the config is missing', () => {
    expect(latSiteUrl({})).toBe('https://new.lendandtend.com')
    expect(latSiteUrl(undefined)).toBe('https://new.lendandtend.com')
  })
})

describe('latSocialMeta', () => {
  const meta = latSocialMeta('https://example.test')
  const byKey = Object.fromEntries(meta.map((m) => [m.key, m]))

  it('covers every tag upstream sets, keyed for dedupe', () => {
    for (const k of [
      'og:title',
      'og:site_name',
      'og:description',
      'og:image',
      'og:image:type',
      'og:image:width',
      'og:image:height',
      'og:url',
      'twitter:title',
      'twitter:description',
      'twitter:image',
      'twitter:image:alt',
      'twitter:site',
      'author',
      'apple-mobile-web-app-title',
    ]) {
      expect(byKey[k], k).toBeDefined()
      expect(byKey[k].key, k).toBe(byKey[k].property || byKey[k].name)
    }
  })

  it('names Lend and Tend everywhere and never Freegle', () => {
    expect(byKey['og:site_name'].content).toBe('Lend and Tend')
    expect(byKey['og:title'].content).toBe('Lend and Tend')
    expect(byKey.author.content).toBe('Lend and Tend')
    expect(byKey['og:description'].content).toBe(LAT_SOCIAL_DESCRIPTION)
    // Twitter treats an empty twitter:site as malformed and falls back to
    // whatever upstream set ("thisisfreegle").
    expect(byKey['twitter:site'].content).toMatch(/^@\S+$/)
    for (const m of meta) {
      expect(String(m.content)).not.toMatch(/freegle/i)
    }
  })

  it('points the images and canonical URL at the site that is serving', () => {
    expect(byKey['og:image'].content).toBe(
      'https://example.test/images/lat/logo.png?v=2'
    )
    expect(byKey['twitter:image'].content).toBe(
      'https://example.test/images/lat/logo.png?v=2'
    )
    expect(byKey['og:url'].content).toBe('https://example.test')
  })
})

describe('headMetaId', () => {
  it('treats entries setting the same property or name as the same tag', () => {
    expect(headMetaId({ hid: 'og:title', property: 'og:title' })).toBe(
      headMetaId({ key: 'og:title', property: 'og:title' })
    )
    expect(headMetaId({ name: 'twitter:site' })).toBe('name:twitter:site')
    expect(headMetaId({ charset: 'utf-8' })).toBe('charset')
    expect(headMetaId({ content: 'anonymous' })).toBeNull()
  })
})

describe('overrideHeadMeta', () => {
  // What Nuxt hands us after merging the layers: lat's entries first (with
  // `key`), then upstream Freegle's (with legacy `hid`).
  const ours = [
    { charset: 'utf-8' },
    { key: 'og:site_name', property: 'og:site_name', content: 'Lend and Tend' },
    { key: 'twitter:site', name: 'twitter:site', content: '@LendandTend' },
  ]
  const merged = [
    ...ours,
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width' },
    { hid: 'og:site_name', property: 'og:site_name', content: 'Freegle' },
    { hid: 'twitter:site', name: 'twitter:site', content: 'thisisfreegle' },
    { property: 'fb:app_id', content: '134980666550322' },
  ]
  const result = overrideHeadMeta(merged, ours)

  it("drops upstream's version of every tag we set, whatever its dedupe key", () => {
    const siteNames = result.filter((m) => m.property === 'og:site_name')
    expect(siteNames).toEqual([ours[1]])
    expect(result.filter((m) => m.name === 'twitter:site')).toEqual([ours[2]])
    expect(result.filter((m) => 'charset' in m)).toHaveLength(1)
  })

  it('keeps the tags we do not set, in their original order, after ours', () => {
    expect(result.slice(0, ours.length)).toEqual(ours)
    expect(result.slice(ours.length).map((m) => m.name || m.property)).toEqual([
      'viewport',
      'fb:app_id',
    ])
  })

  it('wins even if a future Nuxt merges upstream first', () => {
    const upstreamFirst = [...merged.slice(ours.length), ...ours]
    expect(
      overrideHeadMeta(upstreamFirst, ours).find(
        (m) => m.property === 'og:site_name'
      ).content
    ).toBe('Lend and Tend')
  })
})
