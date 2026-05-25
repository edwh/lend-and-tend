// @ts-check
//
// Regression test for the landing-page map preview.
//
// Previously the landing page (`lat/pages/index.vue`) rendered its own
// inline `<l-map>` with just an `<l-tile-layer>` and zero markers — so
// visitors saw an empty UK map with no indication that there were
// gardens to share. The proper `lat/components/lat/MapView.vue`
// component (used by /map) was bypassed.
//
// Fixed by switching the landing page to `<MapView preview />`. The
// `preview` prop disables drag/zoom/popups so the teaser can't be
// hijacked into being a full map view, but pins still render. MapView
// is loaded via `defineAsyncComponent` because the underlying Leaflet
// library touches `window` at module load and the landing page is SSR'd.
const { test, expect } = require('@playwright/test')

test.describe('Landing-page map preview', () => {
  test('renders the Leaflet map with at least one garden marker', async ({ page }) => {
    await page.goto('/')

    // The MapView lives inside `.map-preview` on the landing page.
    const preview = page.locator('.map-preview')
    await expect(preview).toBeVisible({ timeout: 10_000 })

    // Leaflet's container + tiles
    await expect(preview.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    })
    await expect(preview.locator('.leaflet-tile').first()).toBeVisible({
      timeout: 15_000,
    })

    // The whole point of using MapView vs the previous tile-layer-only
    // teaser: pins must actually appear. Give Supercluster + fetchAll
    // time to settle before checking.
    await expect(
      preview.locator('.leaflet-marker-icon').first()
    ).toBeVisible({ timeout: 20_000 })

    const count = await preview.locator('.leaflet-marker-icon').count()
    expect(count).toBeGreaterThan(0)
  })

  test('preview map is non-interactive (no zoom controls, no drag)', async ({
    page,
  }) => {
    await page.goto('/')
    const preview = page.locator('.map-preview')
    await expect(preview.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    })

    // Zoom controls (the +/- buttons) shouldn't be rendered in preview mode.
    await expect(
      preview.locator('.leaflet-control-zoom')
    ).toHaveCount(0)

    // The "Open full map →" overlay link is still present so users
    // can transition to the real map.
    await expect(
      page.getByRole('link', { name: /Open full map/ })
    ).toBeVisible()
  })
})
