export default defineNuxtConfig({
  ssr: false,
  extends: ['../'],

  css: ['/assets/css/admin.css'],

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
