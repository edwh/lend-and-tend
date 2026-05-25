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

  // Helper: extract the z/x/y from the first leaflet tile image so we can
  // detect a real map move. Leaflet's tile URLs look like
  // .../tile/${z}/${x}/${y}.png — when the map pans/zooms, the tile set
  // changes, so the first tile's z/x/y is a far more reliable "did the map
  // actually move?" signal than .leaflet-map-pane style.transform (which
  // Leaflet resets to translate3d(0,0,0) after flyTo finishes).
  /** @param {import('@playwright/test').Page} page */
  async function firstTileKey(page) {
    return page.evaluate(() => {
      const img = document.querySelector('.leaflet-tile')
      const src = img?.getAttribute('src') || ''
      const m = src.match(/(\d+)\/(\d+)\/(\d+)\.(?:png|jpg|jpeg|webp)/)
      return m ? `${m[1]}/${m[2]}/${m[3]}` : src
    })
  }

  test('map search input + Enter zooms the map to a valid postcode', async ({
    page,
  }) => {
    // Sign up first — when logged out the welcome overlay can intercept
    // clicks on the filter bar.
    await page.goto('/')
    await signUpViaModal(page)
    await page.goto('/map')
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    })
    // Wait until at least one tile has loaded so firstTileKey has something
    // to compare against.
    await expect(page.locator('.leaflet-tile').first()).toBeVisible({
      timeout: 10_000,
    })

    const before = await firstTileKey(page)

    const input = page.locator('.geocoder-input')
    await expect(input).toBeVisible()
    await input.fill('M1 5GD')
    await input.press('Enter')

    // Map should pan to Manchester (zoom 13 per searchLocation()) — tile set
    // changes, so the first tile's z/x/y differs from the initial UK view.
    await expect
      .poll(async () => firstTileKey(page), {
        timeout: 10_000,
        intervals: [200, 500, 1000],
      })
      .not.toBe(before)

    await expect(page.locator('.geocoder-error')).not.toBeVisible({
      timeout: 5_000,
    })
  })

  test('map search button click also pans the map (covers both UI paths)', async ({
    page,
  }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await page.goto('/map')
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('.leaflet-tile').first()).toBeVisible({
      timeout: 10_000,
    })

    const before = await firstTileKey(page)

    const input = page.locator('.geocoder-input')
    const button = page.locator('.geocoder-btn')
    await expect(input).toBeVisible()
    await expect(button).toBeVisible()

    await input.fill('SW1A 1AA')
    await button.click()

    await expect
      .poll(async () => firstTileKey(page), {
        timeout: 10_000,
        intervals: [200, 500, 1000],
      })
      .not.toBe(before)

    await expect(page.locator('.geocoder-error')).not.toBeVisible()
  })

  test('search box sits flush against the right edge of the filter bar', async ({
    page,
  }) => {
    await page.goto('/map')
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    })

    // Regression test for an earlier layout bug where `.tab-inner` had a
    // `max-width: 1200px` cap, leaving the geocoder floating in dead space
    // on wide viewports. The geocoder's right edge should be within ~32px
    // of the viewport's right edge (matching .tab-inner's 16px horizontal
    // padding, with a little slack for the rounded button).
    const geocoder = page.locator('.geocoder')
    await expect(geocoder).toBeVisible()
    const box = await geocoder.boundingBox()
    const viewport = page.viewportSize()
    if (!box || !viewport) throw new Error('Could not measure geocoder')
    const gapToRightEdge = viewport.width - (box.x + box.width)
    expect(gapToRightEdge).toBeLessThanOrEqual(32)
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
