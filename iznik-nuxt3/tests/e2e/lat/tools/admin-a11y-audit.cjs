/*
 * Admin area accessibility + link audit.
 *
 * Signs in as the demo admin (passwordless, via Mailpit), visits every admin
 * page at desktop and phone widths, runs axe-core on each, and crawls every
 * in-area link to make sure none 404s. Writes screenshots and a JSON report.
 *
 *   LAT_BASE_URL=http://localhost:4002 node tests/e2e/lat/tools/admin-a11y-audit.cjs [outDir]
 *
 * Read-only apart from the sign-in itself.
 */
const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')
const { AxeBuilder } = require(path.resolve(
  __dirname,
  '../../../../lat/node_modules/@axe-core/playwright'
))
const { loginViaModal, LAT_BASE_URL } = require('../lat-fixtures')

const OUT = path.resolve(process.argv[2] || '/tmp/lat-admin-a11y')
const ADMIN_EMAIL = process.env.DOCS_ADMIN_EMAIL || 'admin@test.com'
const PAGES = [
  '/admin',
  '/admin/gardens/pending',
  '/admin/gardens/approved',
  '/admin/members',
  '/admin/members/flagged',
  '/admin/moderation',
  '/admin/chats',
  '/admin/agreements',
  '/admin/concessions',
  '/admin/settings',
  '/admin/pending',
  '/admin/users',
  '/admin/messages',
]
const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  phone: { width: 390, height: 844 },
}

async function settle(page) {
  // Admin pages render on the client. On this host a docker container coming
  // or going makes Chromium abort in-flight chunk loads (ERR_NETWORK_CHANGED),
  // which can leave the page un-hydrated; reload once or twice if the admin
  // shell has not appeared.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page
      .waitForLoadState('networkidle', { timeout: 20_000 })
      .catch(() => {})
    const shell = await page
      .locator('.lat-admin-pageback')
      .first()
      .waitFor({ state: 'attached', timeout: 8_000 })
      .then(() => true)
      .catch(() => false)
    if (shell) break
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  }
  await page.waitForTimeout(800)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const ctx = await browser.newContext({
    baseURL: LAT_BASE_URL,
    viewport: VIEWPORTS.desktop,
    storageState: { cookies: [], origins: [] },
  })
  const page = await ctx.newPage()
  await page.goto('/')
  await loginViaModal(page, ADMIN_EMAIL)
  // Reuse the signed-in state for both widths.
  const state = await ctx.storageState()

  const report = { pages: {}, links: {} }
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const c = await browser.newContext({
      baseURL: LAT_BASE_URL,
      viewport,
      storageState: state,
    })
    const p = await c.newPage()
    for (const route of PAGES) {
      const key = `${vpName} ${route}`
      try {
        const res = await p.goto(route, { waitUntil: 'domcontentloaded' })
        await settle(p)
        const status = res ? res.status() : 0
        const results = await new AxeBuilder({ page: p })
          .withTags([
            'wcag2a',
            'wcag2aa',
            'wcag21a',
            'wcag21aa',
            'best-practice',
          ])
          .analyze()
        // The dev-server's devtools overlay is not the product: drop its nodes.
        results.violations = results.violations
          .map((v) => ({
            ...v,
            nodes: v.nodes.filter(
              (n) => !n.target.some((t) => /nuxt-devtools/.test(t))
            ),
          }))
          .filter((v) => v.nodes.length)
        // Real sideways scroll of the page (documentElement.scrollWidth also
        // counts a scrollable table wrapper's content in Chromium).
        const overflow = await p.evaluate(() => {
          window.scrollTo(10000, 0)
          const x = window.scrollX
          window.scrollTo(0, 0)
          return x > 0 || document.body.scrollWidth > window.innerWidth + 1
        })
        const slug = route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-')
        await p.screenshot({
          path: path.join(OUT, `${slug}--${vpName}.png`),
          fullPage: true,
        })
        report.pages[key] = {
          status,
          horizontalOverflow: overflow,
          violations: results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
            count: v.nodes.length,
          })),
        }
        const bad = results.violations.filter((v) =>
          ['serious', 'critical'].includes(v.impact)
        )
        console.log(
          `${key.padEnd(34)} http=${status} overflow=${overflow} violations=${
            results.violations.length
          } (serious/critical ${bad.length})`
        )
        for (const v of results.violations) {
          console.log(
            `    [${v.impact}] ${v.id}: ${v.help} x${
              v.nodes.length
            } e.g. ${v.nodes[0]?.target.join(' ')}`
          )
        }
      } catch (e) {
        report.pages[key] = { error: String(e.message).slice(0, 200) }
        console.log(
          `${key.padEnd(34)} ERROR ${String(e.message).slice(0, 120)}`
        )
      }
    }
    await c.close()
  }

  // Link crawl (desktop, signed in): every href inside the admin area must load.
  const c = await browser.newContext({
    baseURL: LAT_BASE_URL,
    viewport: VIEWPORTS.desktop,
    storageState: state,
  })
  const p = await c.newPage()
  const seen = new Set()
  for (const route of PAGES) {
    await p.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await settle(p)
    const hrefs = await p.$$eval('a[href]', (as) =>
      as
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && h.startsWith('/admin'))
    )
    for (const h of hrefs) {
      const clean = h.split('#')[0]
      if (seen.has(clean)) continue
      seen.add(clean)
      const res = await p
        .goto(clean, { waitUntil: 'domcontentloaded' })
        .catch(() => null)
      await settle(p)
      const status = res ? res.status() : 0
      const notFound = await p
        .getByText(/page not found|404/i)
        .first()
        .isVisible()
        .catch(() => false)
      report.links[clean] = { status, notFound, from: route }
      console.log(
        `link ${clean.padEnd(34)} http=${status}${
          notFound ? ' NOT FOUND TEXT' : ''
        } (from ${route})`
      )
    }
  }
  await c.close()
  fs.writeFileSync(
    path.join(OUT, 'report.json'),
    JSON.stringify(report, null, 2)
  )
  await browser.close()
  console.log(`report: ${path.join(OUT, 'report.json')}`)
}

main().catch((e) => {
  console.error('AUDIT_FAILED', e && e.message ? e.message : e)
  process.exit(1)
})
