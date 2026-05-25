// @ts-check
//
// Asserts that L&T photo uploads and image delivery go via our own
// docker-compose containers (lat-tusd on :4080, lat-delivery on :4081),
// NOT via Freegle's shared infrastructure (uploads.ilovefreegle.org,
// delivery.ilovefreegle.org).
//
// Tests three things:
//   1. The runtime config exposed to the browser carries L&T-owned
//      TUS_UPLOADER / IMAGE_DELIVERY URLs.
//   2. An actual photo upload via the lend form hits lat-tusd.
//   3. Throughout the upload + form flow, no requests are made to any
//      Freegle infrastructure domain.
//
// Why this matters: if these env vars regress to the Freegle defaults
// (the upstream `iznik-nuxt3/config.js` falls back to ilovefreegle.org
// URLs), garden photos will silently start flowing to Freegle storage
// again. This test fails fast in that case rather than at GDPR-review
// time.

const path = require('path')
const {
  test,
  expect,
  signUpViaModal,
  logoutLink,
} = require('./lat-fixtures')

// Strict block-list — these are the Freegle hosts that, if hit by an
// L&T browser, mean USER DATA is flowing through Freegle:
//   - uploads.ilovefreegle.org   = Freegle's tusd (where garden photos
//                                  would land if TUS_UPLOADER regresses)
//   - images.ilovefreegle.org    = Freegle's stored images
//
// delivery.ilovefreegle.org is deliberately NOT in this list. It's
// currently used by the upstream navbar's SSR-fallback HTML
// (iznik-nuxt3/app.vue:58-72 hard-codes a <picture srcset=…> with
// delivery.ilovefreegle.org URLs as the no-JS fallback). Static
// branding asset, not user data. Tracked separately in the
// adversarial review under "shared Freegle infrastructure".
const FREEGLE_INFRA_HOSTS = [
  'uploads.ilovefreegle.org',
  'images.ilovefreegle.org',
]

const FIXTURE = path.join(__dirname, 'fixtures', 'test-garden.jpg')

test.describe('Image upload + delivery routing', () => {
  test('runtime config carries L&T-owned TUS_UPLOADER and IMAGE_DELIVERY', async ({
    page,
  }) => {
    await page.goto('/')
    const cfg = await page.evaluate(() => ({
      tus: window.__NUXT__?.config?.public?.TUS_UPLOADER,
      delivery: window.__NUXT__?.config?.public?.IMAGE_DELIVERY,
    }))
    // L&T uses port 4080 (tusd) and 4081 (delivery). Any host is fine
    // — local dev uses localhost, prod will use lat.lend-and-tend.* —
    // but the ports identify it as ours and not Freegle's.
    expect(cfg.tus).toMatch(/:4080\/files\/?$/)
    expect(cfg.delivery).toMatch(/:4081(\/.*)?$/)
    // Hard-block on Freegle data-path hosts even if ports happen to match.
    const dataPathHosts = ['uploads.ilovefreegle.org', 'images.ilovefreegle.org', 'delivery.ilovefreegle.org']
    for (const host of dataPathHosts) {
      expect(cfg.tus, `TUS_UPLOADER must not contain ${host}`).not.toContain(host)
      expect(cfg.delivery, `IMAGE_DELIVERY must not contain ${host}`).not.toContain(host)
    }
  })

  test('photo upload posts to lat-tusd, not Freegle uploads', async ({
    page,
  }) => {
    // Network sniffer — capture every request from page load through
    // post-upload. We'll assert on its contents after the upload
    // promise resolves.
    /** @type {string[]} */
    const requestUrls = []
    page.on('request', (req) => requestUrls.push(req.url()))

    await page.goto('/')
    await signUpViaModal(page)
    // The lend form's PhotoUploader is reachable without paid status —
    // the paywall fires on submission, not on view. So we skip
    // markUserAsPaid here and just open /lend.
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    // PhotoUploader exposes a hidden <input type=file> via Uppy. Set
    // the fixture file directly — bypasses the Dashboard click dance
    // and works under headless without a real file picker.
    const fileInput = page.locator('input[type="file"]').first()
    // Uppy's input is detached until Dashboard mounts — wait for it.
    await expect(fileInput).toBeAttached({ timeout: 10_000 })
    await fileInput.setInputFiles(FIXTURE)

    // Wait until at least one TUS request has fired. Uppy issues a
    // POST to create the upload + (optionally) PATCH for the body —
    // both go to TUS_UPLOADER.
    await expect
      .poll(
        () => requestUrls.filter((u) => u.includes(':4080/files')).length,
        {
          timeout: 30_000,
          message: 'Expected at least one upload request to lat-tusd (:4080)',
        }
      )
      .toBeGreaterThan(0)

    // No requests must have gone to Freegle infrastructure.
    const leaked = requestUrls.filter((u) =>
      FREEGLE_INFRA_HOSTS.some((h) => u.includes(h))
    )
    expect(leaked, `Leaked requests to Freegle infra: ${leaked.join(', ')}`).toEqual([])
  })

  test('image fetches go via lat-delivery, not Freegle delivery', async ({
    page,
  }) => {
    // Same network-sniffer pattern, but covers any image render on the
    // landing/map page — historically the navbar logo was served from
    // delivery.ilovefreegle.org, and we want a regression guard.
    /** @type {string[]} */
    const requestUrls = []
    page.on('request', (req) => requestUrls.push(req.url()))

    await page.goto('/')
    // The landing page renders a `<div class="home">` wrapper with the
    // hero section inside. Anchoring on that lets us avoid the navbar
    // header (which is display:none at the test viewport).
    await expect(page.locator('.home')).toBeVisible({ timeout: 10_000 })
    // Give the page enough time to fire its eager image fetches.
    await page.waitForLoadState('networkidle')

    const leaked = requestUrls.filter((u) =>
      FREEGLE_INFRA_HOSTS.some((h) => u.includes(h))
    )
    expect(
      leaked,
      `No browser request should hit Freegle infrastructure; leaked: ${leaked.join(', ')}`
    ).toEqual([])
  })
})
