/*
 * Accessibility + mobile-layout audit of the member-facing pages.
 *
 * Runs axe-core (via @axe-core/playwright, a dev dependency of the lat layer)
 * on every page at desktop (1280x900) and phone (390x844) widths, signed out
 * and signed in, and reports violations by impact plus horizontal overflow.
 * Saves phone screenshots for a visual pass.
 *
 *   LAT_BASE_URL=http://localhost:4002 node tests/e2e/lat/tools/a11y-audit.cjs [outDir] [filter]
 *
 * Signed-in pages use the storage states seeded for the walkthrough
 * (pr-walkthrough/prs/lat-journey/.auth-*.json + ids.json); pass
 * LAT_AUTH_DIR to point elsewhere.
 */
const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')
const { AxeBuilder } = require(require.resolve('@axe-core/playwright', {
  paths: [path.resolve(__dirname, '../../../../lat')],
}))

const BASE = process.env.LAT_BASE_URL || 'http://localhost:4002'
const AUTH_DIR =
  process.env.LAT_AUTH_DIR ||
  path.resolve(__dirname, '../../../../../pr-walkthrough/prs/lat-journey')
const OUT = path.resolve(process.argv[2] || '/tmp/lat-a11y')
const FILTER = process.argv[3] || ''
const ids = fs.existsSync(path.join(AUTH_DIR, 'ids.json'))
  ? JSON.parse(fs.readFileSync(path.join(AUTH_DIR, 'ids.json'), 'utf8'))
  : {}

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 },
}

// auth: null (signed out) or the suffix of a .auth-<x>.json storage state.
const PAGES = [
  { name: 'home', route: '/', auth: null },
  { name: 'join-anon', route: '/join', auth: null },
  { name: 'join-unpaid', route: '/join', auth: 'unpaid' },
  { name: 'onboarding', route: '/onboarding', auth: 'lender1' },
  { name: 'lend', route: '/lend', auth: 'lender1' },
  { name: 'tend', route: '/tend', auth: 'tender1' },
  { name: 'garden-anon', route: `/garden/${ids.GARDEN1_ID}`, auth: null },
  { name: 'garden', route: `/garden/${ids.GARDEN1_ID}`, auth: 'tender1' },
  {
    name: 'garden-edit',
    route: `/garden/${ids.GARDEN1_ID}/edit`,
    auth: 'lender1',
  },
  { name: 'profile', route: '/profile', auth: 'lender1' },
  { name: 'settings', route: '/settings', auth: 'lender1' },
  { name: 'map-anon', route: '/map', auth: null },
  { name: 'map', route: '/map', auth: 'tender1' },
  { name: 'help', route: '/help', auth: null },
  { name: 'what-to-expect', route: '/what-to-expect', auth: null },
  { name: 'ground-rules', route: '/ground-rules', auth: null },
  { name: 'contact', route: '/contact', auth: null },
  { name: 'share-another', route: '/share-another', auth: 'lender1' },
  { name: 'still-looking', route: '/still-looking', auth: 'tender1' },
]

const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 }

async function auditPage(browser, page, vpName) {
  const vp = VIEWPORTS[vpName]
  const state = page.auth
    ? path.join(AUTH_DIR, `.auth-${page.auth}.json`)
    : null
  const ctx = await browser.newContext({
    baseURL: BASE,
    viewport: vp,
    ...(state && fs.existsSync(state) ? { storageState: state } : {}),
  })
  const p = await ctx.newPage()
  const result = {
    name: page.name,
    vp: vpName,
    route: page.route,
    violations: [],
    overflow: 0,
    error: null,
  }
  try {
    await p.goto(page.route, { waitUntil: 'networkidle', timeout: 60_000 })
    // Let hydration and data fetches settle so we audit the real page, not a skeleton.
    await p
      .locator('main h1, h1')
      .first()
      .waitFor({ timeout: 20_000 })
      .catch(() => {})
    await p.waitForTimeout(4000)
    result.overflow = await p.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
    const axe = await new AxeBuilder({ page: p })
      // The Nuxt dev-tools overlay is not part of the product.
      .exclude('nuxt-devtools-frame')
      .exclude('#nuxt-devtools-container')
      // A dev-server compile error overlay (someone else's broken import) is not the product either.
      .exclude('vite-error-overlay')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze()
    result.violations = axe.violations
      .map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
        html: v.nodes
          .slice(0, 2)
          .map((n) => (n.html || '').replace(/\s+/g, ' ').slice(0, 140)),
        count: v.nodes.length,
      }))
      .sort(
        (a, b) => (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9)
      )
    if (vpName === 'mobile') {
      await p.screenshot({
        path: path.join(OUT, `${page.name}-mobile.png`),
        fullPage: true,
      })
    }
  } catch (e) {
    result.error = String(e.message).split('\n')[0].slice(0, 160)
  } finally {
    await ctx.close()
  }
  return result
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })
  const results = []
  try {
    for (const page of PAGES) {
      if (FILTER && !page.name.includes(FILTER)) continue
      for (const vpName of Object.keys(VIEWPORTS)) {
        const r = await auditPage(browser, page, vpName)
        results.push(r)
        const sev = r.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        )
        const mod = r.violations.filter((v) => v.impact === 'moderate')
        console.log(
          `${r.name.padEnd(16)} ${vpName.padEnd(8)} ` +
            (r.error
              ? `ERROR ${r.error}`
              : `serious+:${sev.length} moderate:${mod.length} minor:${
                  r.violations.length - sev.length - mod.length
                } overflow:${r.overflow}px` +
                (sev.length || mod.length
                  ? ' | ' +
                    [...sev, ...mod]
                      .map((v) => `${v.id}(${v.impact},${v.count})`)
                      .join(' ')
                  : ''))
        )
      }
    }
  } finally {
    await browser.close()
  }
  fs.writeFileSync(
    path.join(OUT, 'report.json'),
    JSON.stringify(results, null, 2)
  )
  console.log(`\nreport: ${path.join(OUT, 'report.json')}`)
})().catch((e) => {
  console.error('AUDIT_FAILED', e.message)
  process.exit(1)
})
