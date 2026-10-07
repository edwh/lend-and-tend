// @ts-check
//
// Accessibility of the admin area: every admin page, at desktop and phone
// widths, must have no serious or critical axe-core violations, must not
// scroll sideways on a phone, must expose a main landmark and a level-one
// heading, and the phone menu must open from its toggle. The menu's links are
// crawled so no admin page can quietly 404.
//
const path = require('path')
// Same data the layout renders (lat/composables/latAdminMenu.js imports it).
const ADMIN_MENU = require('../../../lat/composables/admin-menu.json')
const { test, expect, loginViaModal } = require('./lat-fixtures')
const { AxeBuilder } = require(path.resolve(
  __dirname,
  '../../../lat/node_modules/@axe-core/playwright'
))
const adminMenuLinks = (menu) => menu.flatMap((s) => s.items.map((i) => i.link))

const ADMIN_EMAIL = process.env.DOCS_ADMIN_EMAIL || 'admin@test.com'
const PHONE = { width: 390, height: 844 }
// The Nuxt devtools overlay is dev-only chrome, not the product.
const IGNORE_SELECTORS = ['nuxt-devtools-frame', '#nuxt-devtools-container']

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

const isDevtoolsNode = (n) => n.target.some((t) => /nuxt-devtools/.test(t))

function seriousViolations(results) {
  return (
    results.violations
      .filter((v) => ['serious', 'critical'].includes(v.impact))
      // The dev-server's devtools overlay (shadow DOM) is not the product.
      .map((v) => ({ ...v, nodes: v.nodes.filter((n) => !isDevtoolsNode(n)) }))
      .filter((v) => v.nodes.length)
      .map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
      }))
  )
}

test.describe('Admin area accessibility', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(6 * 60_000)

  /** @type {import('@playwright/test').BrowserContextOptions['storageState']} */
  let adminState

  test('signs in as the admin', async ({ page }) => {
    await page.goto('/')
    await loginViaModal(page, ADMIN_EMAIL)
    adminState = await page.context().storageState()
  })

  for (const link of adminMenuLinks(ADMIN_MENU)) {
    test(`${link} has no serious accessibility violations at either width`, async ({
      browser,
    }) => {
      expect(adminState, 'admin sign-in must have succeeded').toBeTruthy()
      for (const viewport of [{ width: 1280, height: 900 }, PHONE]) {
        const ctx = await browser.newContext({
          baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
          viewport,
          storageState: adminState,
        })
        const page = await ctx.newPage()
        const res = await page.goto(link, { waitUntil: 'domcontentloaded' })
        expect(res?.status(), `${link} at ${viewport.width}px`).toBe(200)
        await settle(page)

        // Structure every page shares.
        await expect(page.locator('main')).toHaveCount(1)
        await expect(page.locator('h1')).toHaveCount(1)
        await expect(
          page.locator('nav[aria-label="Admin sections"]')
        ).toHaveCount(1)

        // No sideways scrolling of the page itself (tables scroll inside their
        // own wrapper). documentElement.scrollWidth is unreliable for this in
        // Chromium, so try to scroll and measure.
        const overflow = await page.evaluate(() => {
          window.scrollTo(10000, 0)
          const x = window.scrollX
          window.scrollTo(0, 0)
          return Math.max(x, document.body.scrollWidth - window.innerWidth)
        })
        expect(
          overflow,
          `${link} scrolls sideways by ${overflow}px at ${viewport.width}px`
        ).toBeLessThanOrEqual(1)

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .exclude(IGNORE_SELECTORS)
          .analyze()
        expect(
          seriousViolations(results),
          `${link} at ${viewport.width}px`
        ).toEqual([])
        await ctx.close()
      }
    })
  }

  test('the phone menu opens from its toggle and closes after choosing a page', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      viewport: PHONE,
      storageState: adminState,
    })
    const page = await ctx.newPage()
    await page.goto('/admin')
    await settle(page)
    const toggle = page.getByRole('button', { name: /menu/i })
    const menu = page.locator('#lat-admin-menu')
    await expect(toggle).toBeVisible()
    await expect(menu).toBeHidden()
    await toggle.click()
    await expect(menu).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await menu.getByRole('link', { name: 'All members' }).click()
    await expect(page).toHaveURL(/\/admin\/members$/)
    await expect(menu).toBeHidden()
    await ctx.close()
  })
})
