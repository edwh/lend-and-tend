// Lend & Tend moderator console.
//
// A thin layer on top of the Lend & Tend layer (../lat), which itself extends
// Freegle. Extending lat rather than the Freegle root is what makes this
// build: lat already swaps Freegle's global.scss for its own, points the SCSS
// `additionalData` at its colour-variable file, ships the L&T public assets
// (/images/lat/logo.png) and the passwordless LoginModal, and blanks the
// Freegle ad/Sentry defaults. Everything here is only what the console does
// differently: client-only rendering, its own CSS, title and port.
import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

// `~/x` imports resolve across the three layers, nearest first. Nuxt's own
// layer aliasing maps `~` to the importing file's layer with no fallback, so
// in a three-layer chain a lat file's `~/stores/auth` (which only exists in
// the Freegle root) fails to resolve. In lat's own build it happens to work
// because lat's files also sit under the root directory. This resolver gives
// the console the same behaviour deliberately.
const layerDirs = [here, resolve(here, '../lat'), resolve(here, '..')]
const EXTENSIONS = ['', '.ts', '.js', '.mjs', '.vue', '.json', '.css', '.scss']
function findInLayers(rel: string): string | null {
  for (const dir of layerDirs) {
    for (const ext of EXTENSIONS) {
      const p = resolve(dir, rel) + ext
      if (isFile(p)) return p
    }
    for (const index of ['index.ts', 'index.js', 'index.mjs']) {
      const p = resolve(dir, rel, index)
      if (isFile(p)) return p
    }
  }
  return null
}

export default defineNuxtConfig({
  extends: ['../lat'],

  ssr: false,

  // Vite checks absolute asset URLs in templates against the top layer's
  // public dir, so point it at lat's (this layer ships no public files).
  dir: {
    public: '../lat/public',
  },

  css: ['/assets/css/admin.css'],

  vite: {
    plugins: [
      {
        name: 'lat-layer-fallback',
        enforce: 'pre',
        // By the time this runs, Vite's alias step has turned `~/x` into
        // `<this layer>/x`. If that file does not exist here, look it up in
        // lat, then in the Freegle root.
        resolveId(id: string) {
          // Raw form (`~/x`) if we run before the alias step, or the already
          // rewritten absolute form (`<layer>/x`) if after.
          let rel: string | null = null
          const raw = /^[~@]\/(.+)$/.exec(id)
          if (raw) {
            rel = raw[1]
          } else {
            for (const dir of layerDirs) {
              if (id.startsWith(dir + '/')) {
                if (isFile(id)) return null
                rel = id.slice(dir.length + 1)
                break
              }
            }
          }
          if (!rel || rel.includes('?') || rel.startsWith('.')) return null
          const found = findInLayers(rel)
          return found && found !== id ? found : null
        },
      },
    ],
  },

  runtimeConfig: {
    public: {
      APIv2: process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2',
      LAT_WORLD_GROUPID: parseInt(process.env.LAT_WORLD_GROUPID || '0'),
      SITE: 'modtools-lat',
    },
  },

  app: {
    head: {
      title: 'Lend & Tend Admin',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  devServer: {
    host: '0.0.0.0',
    port: 4003,
  },

  compatibilityDate: '2024-11-29',
})
