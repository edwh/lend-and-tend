import { fileURLToPath } from 'node:url'

const latColorVarsPath = fileURLToPath(new URL('./assets/css/_color-vars.scss', import.meta.url))
const latGlobalCssPath = fileURLToPath(new URL('./assets/css/global.scss', import.meta.url))

export default defineNuxtConfig({
  extends: ['../'],

  modules: [
    // Remove Freegle's global.scss from the merged CSS array — it imports
    // Freegle-specific files (sticky-banner etc.) that don't exist in lat/.
    // Add lat's own global.scss (Bootstrap-only) in its place.
    function (_options: Record<string, never>, nuxt: { options: { css: string[] } }) {
      nuxt.options.css = [
        ...nuxt.options.css.filter((c) => !String(c).includes('global.scss')),
        latGlobalCssPath,
      ]
    },
  ],

  ssr: true,
  spaLoadingTemplate: false,

  routeRules: {
    '/map': { ssr: false },
    '/messages/**': { ssr: false },
    '/profile': { ssr: false },
    '/admin/**': { ssr: false },
    '/garden/**': { ssr: false },
  },

  runtimeConfig: {
    public: {
      APIv2: process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2',
    },
  },

  // Override Vite SCSS additionalData to use lat's (empty) colour vars file
  // This prevents Freegle's colour variable imports from being injected into every SCSS block
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "${latColorVarsPath}" as *;`,
          silenceDeprecations: ['import'],
        },
      },
    },
  },

  devServer: {
    host: '0.0.0.0',
    port: 4002,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Lend & Tend — Share a garden, grow good things',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'color-scheme', content: 'light' },
        {
          key: 'description',
          name: 'description',
          content: 'Lend & Tend connects garden owners who need help with gardeners who need space.',
        },
        { key: 'og:type', property: 'og:type', content: 'website' },
        { key: 'og:title', property: 'og:title', content: 'Lend & Tend — Share a garden, grow good things' },
        { key: 'og:site_name', property: 'og:site_name', content: 'Lend & Tend' },
      ],
    },
  },

  compatibilityDate: '2024-11-29',
})
