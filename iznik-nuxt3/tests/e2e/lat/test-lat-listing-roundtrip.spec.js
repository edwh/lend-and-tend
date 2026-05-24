// @ts-check
//
// Round-trip tests for L&T garden listings.
//
// These assert that EVERY user-editable field on the lend, tend, and edit
// pages is persisted server-side (not just held in local component state).
// Bugs in this area have repeatedly slipped through because tests only
// verified UI rendering / form submission, not the server round trip.
//
// Approach:
//   1. Sign up + concession-pay a fresh user
//   2. Fill EVERY field on /lend (or /tend), submit
//   3. Reload the My Gardens page — assert each field is visible
//   4. Edit the listing, change EVERY field, submit
//   5. Reload again — assert the new values persisted
//
const {
  test,
  expect,
  signUpViaModal,
  logoutLink,
  markUserAsPaid,
} = require('./lat-fixtures')

// Fetch a message directly from the Go API. We use Playwright's request client
// (not the browser's `fetch`) so we avoid CORS issues — but the JWT is held in
// the browser's localStorage, so we read it out first.
const API_BASE = process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2'

// Resilient location picker: handles both PAF property dropdown (when the
// Freegle DB has data for the postcode) and the manual-address fallback.
async function fillLocationResilient(page, postcode, manualAddress) {
  await page.locator('#lat-postcode-input').fill(postcode)
  await page.getByRole('button', { name: 'Find →' }).click()

  // Whichever path the picker took, we'll see one of these. Bump timeout
  // because postcodes.io occasionally takes a while.
  const select = page.locator('#lat-address-select')
  const manual = page.locator('#lat-address-manual')
  await expect(select.or(manual)).toBeVisible({ timeout: 30_000 })

  if (await select.isVisible().catch(() => false)) {
    // PAF dropdown — pick the first non-empty option
    const opts = await select.locator('option').all()
    for (const opt of opts) {
      const val = await opt.getAttribute('value')
      if (val) {
        await select.selectOption(val)
        break
      }
    }
  } else {
    await manual.fill(manualAddress)
  }
  await expect(page.locator('.status-ok')).toBeVisible({ timeout: 5_000 })
}

async function fetchMessageFromApi(page, id) {
  const jwt = await page.evaluate(() => {
    const auth = JSON.parse(localStorage.auth || '{}')
    return auth?.auth?.jwt || ''
  })
  const r = await page.request.get(`${API_BASE}/message/${id}`, {
    headers: jwt ? { Authorization: 'Bearer ' + jwt } : {},
  })
  if (!r.ok()) {
    throw new Error(
      `fetchMessageFromApi(${id}) returned ${r.status()}: ${await r.text()}`
    )
  }
  return r.json()
}

const LEND_FIELDS = {
  subject: 'Sunny south-facing plot for veg',
  about: 'Lovely garden with established beds. Backs onto woodland.',
  gardenSize: { value: 'medium', label: /Medium/ },
  sunExposure: { value: 'full', label: /Full sun/ },
  waterAccess: { value: 'yes', label: /Tap.*water butt/i },
  accessRoute: { value: 'gate', label: /Side.*gate/i },
  arrangement: 'Share the veg you grow; no payment expected.',
  restrictions: 'No bonfires, no commercial growing.',
  phone: '07700 900001',
}

const LEND_EDITS = {
  subject: 'Updated sunny plot for veg',
  about: 'Updated description after edit.',
  gardenSize: { value: 'large', label: /Large/ },
  sunExposure: { value: 'partial', label: /Partial/ },
  waterAccess: { value: 'no', label: /None.*bring your own/i },
  accessRoute: { value: 'through_house', label: /Through the house/i },
  arrangement: 'Updated arrangement: share half the crop.',
  restrictions: 'Updated: no children unattended.',
}

const TEND_FIELDS = {
  subject: 'Tomatoes and herbs',
  about: '5 years of allotment experience; happy to do hard work.',
  tools: { value: 'full', label: /Full set/ },
  availability: { value: 'weekends', label: /Weekends/ },
  whatToGrow: 'Tomatoes, herbs, courgettes — and willing to weed.',
  phone: '07700 900002',
}

test.describe('Lend listing — full round-trip', () => {
  test('every field persists from /lend → server → My Gardens', async ({
    page,
  }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await markUserAsPaid(page)

    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    // Fill EVERY field
    await page.locator('#subject').fill(LEND_FIELDS.subject)
    await fillLocationResilient(page, 'SW1A 1AA', '10 Test Street')
    await page.locator('#phone').fill(LEND_FIELDS.phone)
    await page.locator('#about').fill(LEND_FIELDS.about)
    await page.locator('#gardenSize').selectOption(LEND_FIELDS.gardenSize.value)
    await page
      .locator('#sunExposure')
      .selectOption(LEND_FIELDS.sunExposure.value)
    await page
      .locator('#waterAccess')
      .selectOption(LEND_FIELDS.waterAccess.value)
    await page
      .locator('#accessRoute')
      .selectOption(LEND_FIELDS.accessRoute.value)
    await page.locator('#arrangement').fill(LEND_FIELDS.arrangement)
    await page.locator('#restrictions').fill(LEND_FIELDS.restrictions)

    // Submit. The submit flow is multi-step (PUT + save lat/lng + joinAndPost)
    // and only navigates to /profile when the full flow has finished.
    // Race the PUT response against the URL change so we capture the id.
    const putPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/apiv2/message') && r.request().method() === 'PUT'
    )
    await page.getByRole('button', { name: 'Post my garden' }).click()
    const putResp = await putPromise
    const gardenId = (await putResp.json())?.id
    expect(gardenId).toBeTruthy()
    // Wait for the full submit flow to finish before doing anything else.
    await expect(page).toHaveURL(/\/profile/, { timeout: 30_000 })

    // Force a fresh fetch (the redirect may have ?posted=1 or stale state).
    await page.goto('/profile')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'My Gardens' })).toBeVisible(
      { timeout: 10_000 }
    )

    // Subject visible
    await expect(page.getByText(LEND_FIELDS.subject)).toBeVisible({
      timeout: 15_000,
    })

    // Description visible
    await expect(page.getByText(LEND_FIELDS.about)).toBeVisible()

    // Structured fields visible with their labels
    await expect(page.getByText(LEND_FIELDS.gardenSize.label)).toBeVisible()
    await expect(page.getByText(LEND_FIELDS.sunExposure.label)).toBeVisible()
    await expect(
      page.getByText(LEND_FIELDS.waterAccess.label).first()
    ).toBeVisible()
    await expect(page.getByText(LEND_FIELDS.accessRoute.label)).toBeVisible()
    await expect(page.getByText(LEND_FIELDS.arrangement)).toBeVisible()
    await expect(page.getByText(LEND_FIELDS.restrictions)).toBeVisible()

    // Address: server stores in textbody; assert it round-tripped by checking
    // a hard reload returns the address in /apiv2/message/{id}
    const apiResp = await fetchMessageFromApi(page, gardenId)
    expect(apiResp.lat).toBeTruthy()
    expect(apiResp.lng).toBeTruthy()
    const body = JSON.parse(apiResp.textbody || '{}')
    expect(body.description).toBe(LEND_FIELDS.about)
    expect(body.gardenSize).toBe(LEND_FIELDS.gardenSize.value)
    expect(body.sunExposure).toBe(LEND_FIELDS.sunExposure.value)
    expect(body.waterAccess).toBe(LEND_FIELDS.waterAccess.value)
    expect(body.accessRoute).toBe(LEND_FIELDS.accessRoute.value)
    expect(body.arrangement).toBe(LEND_FIELDS.arrangement)
    expect(body.restrictions).toBe(LEND_FIELDS.restrictions)
    expect(body.address, 'address should persist in textbody').toBeTruthy()
    expect(body.postcode).toBeTruthy()
  })
})

test.describe('Tend listing — full round-trip', () => {
  test('every field persists from /tend → server → My Gardens', async ({
    page,
  }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await markUserAsPaid(page)

    await page.goto('/tend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    await page.locator('#subject').fill(TEND_FIELDS.subject)
    await fillLocationResilient(page, 'SW1A 1AA', '12 Tender Lane')
    await page.locator('#phone').fill(TEND_FIELDS.phone)
    await page.locator('#about').fill(TEND_FIELDS.about)
    await page.locator('#tools').selectOption(TEND_FIELDS.tools.value)
    await page
      .locator('#availability')
      .selectOption(TEND_FIELDS.availability.value)
    await page.locator('#whatToGrow').fill(TEND_FIELDS.whatToGrow)
    // Honesty declaration — checkbox
    await page.locator('.honesty-check').check()

    const putPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/apiv2/message') && r.request().method() === 'PUT'
    )
    await page.getByRole('button', { name: 'Post my interest' }).click()
    const putResp = await putPromise
    const tenderId = (await putResp.json())?.id
    expect(tenderId).toBeTruthy()
    await expect(page).toHaveURL(/\/profile/, { timeout: 30_000 })

    await page.goto('/profile')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(TEND_FIELDS.subject)).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(TEND_FIELDS.whatToGrow)).toBeVisible()
    await expect(page.getByText(TEND_FIELDS.tools.label)).toBeVisible()
    await expect(page.getByText(TEND_FIELDS.availability.label)).toBeVisible()
    await expect(
      page.getByText(/Confirmed not on any offender's register/i)
    ).toBeVisible()

    // Server round-trip check
    const apiResp = await fetchMessageFromApi(page, tenderId)
    const body = JSON.parse(apiResp.textbody || '{}')
    expect(body.description).toBe(TEND_FIELDS.about)
    expect(body.whatToGrow).toBe(TEND_FIELDS.whatToGrow)
    expect(body.tools).toBe(TEND_FIELDS.tools.value)
    expect(body.availability).toBe(TEND_FIELDS.availability.value)
    expect(body.honestyDeclaration).toBe(true)
    expect(body.address).toBeTruthy()
    expect(body.postcode).toBeTruthy()
  })
})

test.describe('Edit listing — every field persists after refresh', () => {
  test('lend → edit → reload — all values survive', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await markUserAsPaid(page)

    // Create the listing first
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    await page.locator('#subject').fill(LEND_FIELDS.subject)
    await fillLocationResilient(page, 'SW1A 1AA', '10 Edit Street')
    await page.locator('#phone').fill(LEND_FIELDS.phone)
    await page.locator('#about').fill(LEND_FIELDS.about)
    await page.locator('#gardenSize').selectOption(LEND_FIELDS.gardenSize.value)
    await page
      .locator('#sunExposure')
      .selectOption(LEND_FIELDS.sunExposure.value)
    await page
      .locator('#waterAccess')
      .selectOption(LEND_FIELDS.waterAccess.value)
    await page
      .locator('#accessRoute')
      .selectOption(LEND_FIELDS.accessRoute.value)
    await page.locator('#arrangement').fill(LEND_FIELDS.arrangement)
    await page.locator('#restrictions').fill(LEND_FIELDS.restrictions)

    const putPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/apiv2/message') && r.request().method() === 'PUT'
    )
    await page.getByRole('button', { name: 'Post my garden' }).click()
    const putResp = await putPromise
    const gardenId = (await putResp.json())?.id
    expect(gardenId).toBeTruthy()
    await expect(page).toHaveURL(/\/profile/, { timeout: 30_000 })

    // Now edit
    await page.goto(`/garden/${gardenId}/edit`)
    await expect(
      page.getByRole('heading', { name: 'Edit listing' })
    ).toBeVisible({ timeout: 10_000 })

    // Change every field. Address is re-entered via location picker.
    await page.locator('#subject').fill(LEND_EDITS.subject)
    await page.locator('#about').fill(LEND_EDITS.about)
    await page.locator('#gardenSize').selectOption(LEND_EDITS.gardenSize.value)
    await page
      .locator('#sunExposure')
      .selectOption(LEND_EDITS.sunExposure.value)
    await page
      .locator('#waterAccess')
      .selectOption(LEND_EDITS.waterAccess.value)
    await page
      .locator('#accessRoute')
      .selectOption(LEND_EDITS.accessRoute.value)
    await page.locator('#arrangement').fill(LEND_EDITS.arrangement)
    await page.locator('#restrictions').fill(LEND_EDITS.restrictions)
    // Re-enter address (different to original)
    await fillLocationResilient(page, 'EC1A 1BB', '99 New Edit Lane')

    const patchPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/apiv2/message') && r.request().method() === 'PATCH'
    )
    await page.getByRole('button', { name: 'Save changes' }).click()
    const patchResp = await patchPromise
    expect(patchResp.ok()).toBe(true)

    // Wait for the redirect that follows successful save.
    await expect(page).toHaveURL(new RegExp(`/garden/${gardenId}(?!/edit)`), {
      timeout: 10_000,
    })

    // Hit the API directly — source of truth.
    const apiResp = await fetchMessageFromApi(page, gardenId)
    expect(
      apiResp.subject,
      'subject should be reconstructed from new item'
    ).toContain(LEND_EDITS.subject)
    const body = JSON.parse(apiResp.textbody || '{}')
    expect(body.description).toBe(LEND_EDITS.about)
    expect(body.gardenSize).toBe(LEND_EDITS.gardenSize.value)
    expect(body.sunExposure).toBe(LEND_EDITS.sunExposure.value)
    expect(body.waterAccess).toBe(LEND_EDITS.waterAccess.value)
    expect(body.accessRoute).toBe(LEND_EDITS.accessRoute.value)
    expect(body.arrangement).toBe(LEND_EDITS.arrangement)
    expect(body.restrictions).toBe(LEND_EDITS.restrictions)
    expect(body.address).toContain('New Edit Lane')
    expect(body.postcode).toContain('EC1A')

    // Now confirm the UI reflects the new state too.
    await page.goto(`/profile`)
    await expect(page.getByRole('heading', { name: 'My Gardens' })).toBeVisible(
      { timeout: 10_000 }
    )
    await expect(page.getByText(LEND_EDITS.subject)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('edit page — adding an address persists across full page reload', async ({
    page,
  }) => {
    // Regression: user reported adding an address on the edit page "looks like
    // it saved" but disappears on refresh.
    await page.goto('/')
    await signUpViaModal(page)
    await markUserAsPaid(page)

    // Create a minimal listing WITH initial location (server requires lat/lng).
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
    await page.locator('#subject').fill('Minimal listing')
    await fillLocationResilient(page, 'SW1A 1AA', '5 Initial Lane')
    await page.locator('#phone').fill('07700 900003')

    const putPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/apiv2/message') && r.request().method() === 'PUT'
    )
    await page.getByRole('button', { name: 'Post my garden' }).click()
    const putResp = await putPromise
    const gardenId = (await putResp.json())?.id
    expect(gardenId).toBeTruthy()
    await expect(page).toHaveURL(/\/profile/, { timeout: 30_000 })

    // Now go to edit and CHANGE the address (re-enter).
    await page.goto(`/garden/${gardenId}/edit`)
    await expect(
      page.getByRole('heading', { name: 'Edit listing' })
    ).toBeVisible({ timeout: 10_000 })
    await fillLocationResilient(page, 'EC1A 1BB', '42 Persistence Avenue')

    const patchPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/apiv2/message') && r.request().method() === 'PATCH'
    )
    await page.getByRole('button', { name: 'Save changes' }).click()
    await patchPromise

    // Hard reload + read directly from API
    const apiResp = await fetchMessageFromApi(page, gardenId)
    const body = JSON.parse(apiResp.textbody || '{}')
    expect(body.address).toContain('Persistence Avenue')
    expect(body.postcode).toContain('EC1A')
  })

  test('edit page pre-fills postcode from existing listing', async ({
    page,
  }) => {
    // User shouldn't have to retype their postcode just to edit other fields.
    await page.goto('/')
    await signUpViaModal(page)
    await markUserAsPaid(page)

    // Create a garden with a known postcode.
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
    await page.locator('#subject').fill('Postcode-prefill test garden')
    await fillLocationResilient(page, 'SW1A 1AA', '7 Prefill Lane')
    await page.locator('#phone').fill('07700 900005')

    const putPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/apiv2/message') && r.request().method() === 'PUT'
    )
    await page.getByRole('button', { name: 'Post my garden' }).click()
    const putResp = await putPromise
    const gardenId = (await putResp.json())?.id
    expect(gardenId).toBeTruthy()
    await expect(page).toHaveURL(/\/profile/, { timeout: 30_000 })

    // Now go to edit and confirm the postcode input is pre-populated.
    await page.goto(`/garden/${gardenId}/edit`)
    await expect(
      page.getByRole('heading', { name: 'Edit listing' })
    ).toBeVisible({
      timeout: 10_000,
    })

    const postcode = page.locator('#lat-postcode-input')
    await expect(postcode).toBeVisible({ timeout: 10_000 })
    await expect(postcode).toHaveValue(/SW1A\s*1AA/i)
  })
})
