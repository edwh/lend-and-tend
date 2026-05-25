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
    // Strip Freegle's Prebid/GoogleTag/Playwire ad-init script from the
    // shared head. Upstream injects a ~5KB inline <script> that registers
    // dozens of Freegle ad-slot codes (/22794232631/freegle_sticky etc.)
    // and identifies the page as "26548_Freegle" to the ad broker. L&T
    // shows no ads, so this script is pure dead-weight AND a heavy brand
    // leak in view-source. Keep the other two upstream script entries
    // (__initSearch capture, globalThis polyfill) — they're tiny and
    // load-bearing for Nuxt hydration / Safari 12 polyfill.
    function (_options: Record<string, never>, nuxt: any) {
      const scripts = nuxt.options?.app?.head?.script
      if (!Array.isArray(scripts)) return
      nuxt.options.app.head.script = scripts.filter((s: any) => {
        const body = String(s?.innerHTML ?? '')
        return !(body.includes('pbjs') || body.includes('googletag'))
      })
    },
  ],

  ssr: true,
  spaLoadingTemplate: false,

  routeRules: {
    '/map': { ssr: false },
    '/admin/**': { ssr: false },
    '/garden/**': { ssr: false },
  },

  // Prerender disabled: the parent Freegle nuxt config crawls links and
  // tries to render UK-authority pages (e.g. /essex), which fail in L&T
  // because the authority data isn't in the L&T database. SSR per-request
  // still works.
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: [],
      failOnError: false,
    },
  },

  runtimeConfig: {
    public: {
      APIv2: process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2',
      LAT_WORLD_GROUPID: parseInt(process.env.LAT_WORLD_GROUPID || '0'),
      LAT_ALLOW_FAKE_PAYMENT: process.env.LAT_ALLOW_FAKE_PAYMENT !== 'false',
      LAT_USE_FREEGLE_GEOCODER: process.env.LAT_USE_FREEGLE_GEOCODER === 'true',
      LAT_MODERATION_ENABLED: process.env.LAT_MODERATION_ENABLED === 'true',
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
    resolve: {
      alias: [
        // ~/components/ChatFooter in lat files expands to /app/components/ChatFooter
        // (~ → /app/ in the lat build context). Override both with-and-without-extension
        // so the lat ChatFooter.vue is loaded instead of the upstream one.
        {
          find: /^\/app\/components\/ChatFooter(\.vue)?$/,
          replacement: fileURLToPath(new URL('./components/ChatFooter.vue', import.meta.url)),
        },
      ],
    },
  },

  devServer: {
    host: '0.0.0.0',
    port: 4002,
  },

  // Override @nuxt/image's weserv provider baseURL.
  //
  // The upstream Freegle config sets baseURL to TUS_UPLOADER (the public
  // hostname). For L&T with prefix routing on 443, that URL contains the
  // public hostname (e.g. https://lat.lend-and-tend.katapult.cloud/lat-uploads/
  // files/<id>) — which nginx-inside-lat-delivery can't reliably resolve.
  // (Docker DNS at 127.0.0.11 returns container names but NOT /etc/hosts
  // entries; public DNS returns the host's external IP whose hairpin path
  // back through Caddy is fragile.)
  //
  // baseURL is consumed ONLY inside lat-delivery's weserv when it fetches
  // the source bytes — the browser never resolves this hostname directly.
  // So we can safely point it at the docker-network alias, which Docker
  // DNS resolves cleanly and routes container-to-container.
  image: {
    weserv: {
      provider: 'weserv',
      baseURL: 'http://lat-tusd:8080/files/',
      // weservURL stays as the public-hostname IMAGE_DELIVERY env from
      // the upstream config; the browser does need to reach this one.
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Lend & Tend — Share a garden, grow good things',
      link: [
        { rel: 'icon', type: 'image/png', href: '/images/lat/logo.png?v=2' },
      ],
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'color-scheme', content: 'light' },
        // Use `hid` (not `key`) for dedupe — the upstream Freegle nuxt
        // config uses `hid` for its og:/twitter:/description meta tags.
        // Mismatched dedupe keys mean both Freegle's tags AND ours end
        // up in the final HTML, and Freegle's (registered later in the
        // layer chain) wins. With hid alignment our values replace
        // theirs and L&T branding is what social/SEO crawlers see.
        {
          hid: 'description',
          name: 'description',
          content:
            'Lend & Tend connects garden owners who need help with gardeners who need space.',
        },
        { hid: 'og:type', property: 'og:type', content: 'website' },
        {
          hid: 'og:title',
          property: 'og:title',
          content: 'Lend & Tend — Share a garden, grow good things',
        },
        {
          hid: 'og:site_name',
          property: 'og:site_name',
          content: 'Lend & Tend',
        },
        {
          hid: 'og:description',
          property: 'og:description',
          content:
            'Lend & Tend connects garden owners who need help with gardeners who need space. Find your perfect patch-match in your community.',
        },
        {
          hid: 'twitter:title',
          name: 'twitter:title',
          content: 'Lend & Tend — Share a garden, grow good things',
        },
        {
          hid: 'twitter:description',
          name: 'twitter:description',
          content:
            'Lend & Tend connects garden owners who need help with gardeners who need space. Find your perfect patch-match in your community.',
        },
      ],
      style: [
        /* Inline critical L&T CSS variables and Bootstrap reset to prevent FOUC */
        {
          children: `
            :root {
              --lat-color-primary: #329732;
              --lat-color-primary-dark: #4F6642;
              --lat-color-primary-light: #8CC63F;
              --lat-color-secondary: #BB68CA;
              --lat-color-secondary-dark: #7a3a8a;
              --lat-color-secondary-light: #f3e8f7;
              --lat-color-accent: #CBCB00;
              --lat-color-accent-dark: #A8B330;
              --lat-color-surface: #EDE5D6;
              --lat-color-background: #FFFFFF;
              --lat-color-text: #333322;
              --lat-color-text-muted: #5A3B1F;
              --lat-color-alert: #CC3F00;
              --lat-color-success: #329732;
              --lat-color-lender-bg: #f3e8f7;
              --lat-color-lender-text: #BB68CA;
              --lat-color-tender-bg: #e8f5e9;
              --lat-color-tender-text: #4F6642;
              --lat-font-body: inherit;
              --lat-font-heading: inherit;
              --radius-md: 0.5rem;
              --radius-xl: 1.25rem;
              --transition-fast: 150ms ease-in-out;
            }
            html {
              color: var(--lat-color-text);
              scroll-behavior: smooth;
            }
            body {
              margin: 0;
              padding: 0;
              background-color: var(--lat-color-background);
            }
            *, *::before, *::after {
              box-sizing: border-box;
              corner-shape: squircle;
            }
            .modal.show {
              display: block;
            }
          `,
          type: 'text/css',
        },
      ],
    },
  },

  nitro: {
    /* Disable app manifest which can interfere with CSS loading */
    experimental: {
      appManifest: false,
    },
  },

  compatibilityDate: '2024-11-29',
})
