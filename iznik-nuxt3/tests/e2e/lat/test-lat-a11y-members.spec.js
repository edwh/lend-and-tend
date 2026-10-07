// @ts-check
//
// Accessibility of the member-facing pages, checked with axe-core at desktop
// and phone widths. A test fails on any serious or critical violation (WCAG
// 2.1 A/AA + axe best practices), and on horizontal page overflow at phone
// width. Moderate/minor findings are reported but do not fail.
//
// Signed-in pages create their own member (passwordless sign-up via the
// fixtures) so the spec needs nothing seeded. One garden is posted once for
// the garden view/edit pages.
//
const path = require('path')
const {
  test,
  expect,
  signUpViaModal,
  markUserAsPaid,
  fillLocationPicker,
  logoutLink,
} = require('./lat-fixtures')

// @axe-core/playwright is a dev dependency of the lat layer, not the root app.
const { AxeBuilder } = require(require.resolve('@axe-core/playwright', {
  paths: [path.resolve(__dirname, '../../../lat')],
}))

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  phone: { width: 390, height: 844 },
}

async function auditCurrentPage(page, label) {
  // Let hydration and data fetches settle so we audit the page, not a skeleton.
  await page
    .locator('main h1, h1')
    .first()
    .waitFor({ timeout: 20_000 })
    .catch(() => {})
  await page.waitForTimeout(2_500)

  const results = await new AxeBuilder({ page })
    // The Nuxt dev-tools overlay is not part of the product.
    .exclude('nuxt-devtools-frame')
    .exclude('#nuxt-devtools-container')
    .exclude('vite-error-overlay')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze()

  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  )
  const describe = (v) =>
    `${v.id} (${v.impact}): ${v.help}\n` +
    v.nodes
      .slice(0, 5)
      .map((n) => `    ${n.target.join(' ')}  ${(n.html || '').slice(0, 100)}`)
      .join('\n')
  const others = results.violations.filter((v) => !blocking.includes(v))
  if (others.length) {
    console.log(
      `[a11y] ${label}: ${others.map((v) => v.id).join(', ')} (non-blocking)`
    )
  }
  expect(
    blocking,
    `${label}: serious/critical accessibility violations:\n` +
      blocking.map(describe).join('\n')
  ).toEqual([])

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  )
  expect(overflow, `${label}: page scrolls horizontally`).toBeLessThanOrEqual(0)
}

async function audit(page, route, label) {
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(vp)
    await page.goto(route, { waitUntil: 'networkidle' })
    await auditCurrentPage(page, `${label} @${name}`)
  }
}

/**
 * The cookie bar is fixed to the bottom of the viewport and sits over the last
 * control of a long form when Playwright scrolls that control just into view
 * (the Post button here). The signed-out audits cover the bar itself; once a
 * member is signed in, choose "Essential only" so it does not swallow clicks.
 */
async function dismissCookieBar(page) {
  const btn = page.getByRole('button', { name: 'Essential only' })
  if (await btn.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await btn.click()
    await expect(btn).toBeHidden({ timeout: 5_000 })
  }
}

async function postGarden(page) {
  await page.goto('/lend')
  await expect(logoutLink(page)).toBeVisible({ timeout: 15_000 })
  await page.locator('#subject').fill('Accessibility test garden')
  await page.locator('#about').fill('A plot used by the accessibility spec.')
  await fillLocationPicker(page)
  await page.locator('#phone').fill('07700 900100')
  const created = page.waitForResponse(
    (r) => r.url().includes('/apiv2/message') && r.request().method() === 'PUT',
    { timeout: 30_000 }
  )
  await page.getByRole('button', { name: 'Post my garden' }).click()
  const id = (await (await created).json())?.id
  await expect(page).toHaveURL(/\/profile/, { timeout: 25_000 })
  return id
}

test.describe('Accessibility: member pages', () => {
  test.setTimeout(6 * 60_000)

  // On the dev server, someone else's compile error pops a <vite-error-overlay>
  // over every page and swallows clicks. It is not part of the product (it
  // never exists in a production build), so clear it rather than let it fail
  // an accessibility audit of unrelated pages.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const clear = () =>
        document
          .querySelectorAll('vite-error-overlay')
          .forEach((e) => e.remove())
      new MutationObserver(clear).observe(document.documentElement, {
        childList: true,
        subtree: true,
      })
    })
  })

  test('signed-out pages', async ({ page }) => {
    for (const [route, label] of [
      ['/', 'home'],
      ['/join', 'join'],
      ['/map', 'map'],
      ['/help', 'help'],
      ['/what-to-expect', 'what to expect'],
      ['/ground-rules', 'ground rules'],
      ['/contact', 'contact'],
    ]) {
      await audit(page, route, label)
    }
  })

  test('signed-in lender pages', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page, { role: 'lender', fullname: 'A11y Lender' })
    await dismissCookieBar(page)
    await markUserAsPaid(page)
    const gardenId = await postGarden(page)

    for (const [route, label] of [
      ['/onboarding', 'onboarding'],
      ['/lend', 'lend form'],
      [`/garden/${gardenId}`, 'garden page'],
      [`/garden/${gardenId}/edit`, 'garden edit'],
      ['/profile', 'my gardens'],
      ['/settings', 'settings'],
      ['/share-another', 'share another'],
    ]) {
      await audit(page, route, label)
    }
  })

  test('signed-in tender pages', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page, { role: 'tender', fullname: 'A11y Tender' })
    await dismissCookieBar(page)
    for (const [route, label] of [
      ['/join', 'join (unpaid)'],
      ['/tend', 'tend form'],
      ['/map', 'map (signed in)'],
      ['/still-looking', 'still looking'],
    ]) {
      await audit(page, route, label)
    }
  })
})
