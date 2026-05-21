/**
 * Lend & Tend runtime configuration.
 * All environment-specific values live here; nuxt.config.ts reads this file.
 */
const CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_ENV: process.env.APP_ENV || 'development',

  // Go API base URL.  In production this will be set via IZNIK_API_V2 env var.
  APIv2: process.env.IZNIK_API_V2 || 'http://localhost:8192/apiv2',

  // Stripe publishable key — set in production via STRIPE_PUBLISHABLE_KEY env var.
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',

  // Sentry error tracking — set in production.
  SENTRY_DSN: process.env.SENTRY_DSN || '',

  // Site identity — used for meta tags.
  SITE_URL: process.env.SITE_URL || 'https://www.lendandtend.com',
}

export default CONFIG
