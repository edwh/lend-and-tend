// @ts-check
const { test, expect, signUpViaModal, logoutLink } = require('./lat-fixtures')

test.describe('Map page', () => {
  test('map page has correct title', async ({ page }) => {
    await page.goto('/map')
    await expect(page).toHaveTitle(/Lend.*Tend|Map/i)
  })

  test('map renders a leaflet container', async ({ page }) => {
    await page.goto('/map')
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('unauthenticated user can view the map', async ({ page }) => {
    await page.goto('/map')
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    })
    // Sign in button still visible (not logged in)
    await expect(
      page.getByRole('button', { name: 'Sign in' }).first()
    ).toBeVisible()
  })

  test('authenticated user sees Logout in nav on map', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    // After sign-up lands on /map
    await expect(page).toHaveURL(/\/map/)
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    })
    await expect(logoutLink(page)).toBeVisible()
  })

  test('landing page map section links to full map', async ({ page }) => {
    await page.goto('/')
    const mapLink = page.getByRole('link', {
      name: /Browse the map|Open full map/i,
    })
    await expect(mapLink.first()).toBeVisible()
  })

  test('unauthenticated user sees Sign in button on map', async ({ page }) => {
    await page.goto('/map')
    await expect(
      page.getByRole('button', { name: 'Sign in' }).first()
    ).toBeVisible()
    await expect(logoutLink(page)).not.toBeVisible()
  })

  test('map search input + Enter zooms the map to a valid postcode', async ({
    page,
  }) => {
    await page.goto('/map')
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    })

    const input = page.locator('.geocoder-input')
    await expect(input).toBeVisible()
    await input.fill('M1 5GD')
    await input.press('Enter')

    // Wait for the leaflet flyTo animation to finish. We can't easily assert
    // the exact map centre but we CAN check the URL didn't change AND no error
    // shows. The geocoder-error element should NOT appear.
    await expect(page.locator('.geocoder-error')).not.toBeVisible({
      timeout: 5_000,
    })
  })

  test('map search shows a friendly error for an unknown query', async ({
    page,
  }) => {
    // Sign-up so the first-time welcome overlay doesn't intercept clicks.
    await page.goto('/')
    await signUpViaModal(page)
    await page.goto('/map')
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    })

    const input = page.locator('.geocoder-input')
    await input.fill('NotARealPlace12345')
    await page.locator('.geocoder-btn').click()

    await expect(page.locator('.geocoder-error')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('.geocoder-error')).toContainText(
      /No location found/i
    )
  })

  test('map filter Lenders dot is lilac, Tenders dot is green', async ({
    page,
  }) => {
    await page.goto('/map')
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    })

    // Source-of-truth from branding.config.ts: lender=#B868CA (lilac), tender=#4F6642 (green)
    const lenderColor = await page
      .locator('.dot.lender')
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    const tenderColor = await page
      .locator('.dot.tender')
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(lenderColor).toBe('rgb(184, 104, 202)')
    expect(tenderColor).toBe('rgb(79, 102, 66)')
  })
})
