import { VitePWA } from 'vite-plugin-pwa'
import config from './config'

const production = config.APP_ENV === 'production'

// @ts-ignore
export default defineNuxtConfig({
  devtools: { enabled: true },

  ssr: true,
  spaLoadingTemplate: false,

  routeRules: {
    '/': { redirect: '/lat/map' },
    '/lat/**': { ssr: false },
  },

  nitro: {
    compressPublicAssets: production ? { brotli: true, gzip: true } : false,
    prerender: {
      routes: [],
      crawlLinks: false,
    },
  },

  experimental: {
    emitRouteChunkError: 'automatic',
    asyncContext: true,
    renderJsonPayloads: false,
    payloadExtraction: false,
    appManifest: false,
  },

  modules: [
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    ['@bootstrap-vue-next/nuxt', { css: false }],
  ],

  runtimeConfig: {
    public: {
      APIv2: config.APIv2,
      STRIPE_PUBLISHABLE_KEY: config.STRIPE_PUBLISHABLE_KEY,
      SENTRY_DSN: config.SENTRY_DSN,
      SITE_URL: config.SITE_URL,
    },
  },

  css: [
    '@fortawesome/fontawesome-svg-core/styles.css',
    '/assets/css/global.scss',
  ],

  build: {
    transpile: [
      '@fortawesome/vue-fontawesome',
      '@fortawesome/fontawesome-svg-core',
      '@fortawesome/free-solid-svg-icons',
      '@fortawesome/free-brands-svg-icons',
    ],
  },

  vite: {
    vue: {},
    optimizeDeps: {
      include: [
        'leaflet',
        'leaflet/dist/leaflet-src.esm',
        '@vue-leaflet/vue-leaflet',
        'dayjs',
        'dayjs/plugin/relativeTime',
        '@stripe/stripe-js',
        'bootstrap-vue-next/components/BAlert',
        'bootstrap-vue-next/components/BBadge',
        'bootstrap-vue-next/components/BButton',
        'bootstrap-vue-next/components/BCard',
        'bootstrap-vue-next/components/BForm',
        'bootstrap-vue-next/components/BFormCheckbox',
        'bootstrap-vue-next/components/BFormGroup',
        'bootstrap-vue-next/components/BFormInput',
        'bootstrap-vue-next/components/BFormSelect',
        'bootstrap-vue-next/components/BFormTextarea',
        'bootstrap-vue-next/components/BModal',
        'bootstrap-vue-next/components/BTable',
      ],
    },
    build: {
      minify: production ? 'esbuild' : false,
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/assets/css/_color-vars.scss" as *;',
          silenceDeprecations: ['import'],
        },
      },
    },
    plugins: production
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            workbox: { maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
          }),
        ]
      : [],
  },

  sourcemap: {
    client: production,
    server: production,
  },

  devServer: {
    host: '0.0.0.0',
    port: 3000,
    https: false,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Lend & Tend — Share a garden, grow good things',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'color-scheme', content: 'light' },
        {
          key: 'description',
          name: 'description',
          content:
            'Lend & Tend connects garden owners who need help with gardeners who need space.',
        },
        { key: 'og:type', property: 'og:type', content: 'website' },
        {
          key: 'og:title',
          property: 'og:title',
          content: 'Lend & Tend — Share a garden, grow good things',
        },
        {
          key: 'og:site_name',
          property: 'og:site_name',
          content: 'Lend & Tend',
        },
        {
          key: 'og:url',
          property: 'og:url',
          content: config.SITE_URL,
        },
        {
          key: 'twitter:card',
          name: 'twitter:card',
          content: 'summary_large_image',
        },
      ],
    },
  },

  compatibilityDate: '2024-11-29',
})
