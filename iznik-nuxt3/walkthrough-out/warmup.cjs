/*
 * Warm the Nuxt dev server before seeding or capturing: the first visit to each
 * route compiles it on demand (server bundle + Vite client chunks), which can
 * take longer than the e2e fixtures' 15 s budgets and makes a cold run fail on
 * the very first click. Visiting every route once in a real browser avoids
 * that. Harmless against a production build.
 *
 *   LAT_BASE_URL=http://localhost:4002 node walkthrough-out/warmup.cjs
 */
const { chromium } = require('@playwright/test')

const BASE = process.env.LAT_BASE_URL || 'http://localhost:4002'
const ROUTES = [
  '/',
  '/map',
  '/join',
  '/onboarding',
  '/lend',
  '/tend',
  '/profile',
  '/chats',
  '/chats/1',
  '/garden/1',
  '/garden/1/edit',
  '/agreement/1',
  '/checkin/1',
  '/settings',
  '/help',
  '/what-to-expect',
]

;(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const page = await browser.newPage()
  const t0 = Date.now()
  for (const r of ROUTES) {
    const t = Date.now()
    try {
      await page.goto(BASE + r, { waitUntil: 'networkidle', timeout: 90_000 })
      // Let the client bundle hydrate so its chunks are compiled too.
      await page.waitForTimeout(1500)
      console.log(`warm ${r} ${Date.now() - t}ms`)
    } catch (e) {
      console.log(`warm ${r} failed: ${String(e.message).slice(0, 80)}`)
    }
  }
  console.log(`WARM_OK ${Date.now() - t0}ms`)
  await browser.close()
})()
