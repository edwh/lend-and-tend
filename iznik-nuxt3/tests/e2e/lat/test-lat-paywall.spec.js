// @ts-check
const {
  test,
  expect,
  signUpViaModal,
  logoutLink,
  markUserAsPaid,
  fillLocationPicker,
  clickUntilHydrated,
} = require('./lat-fixtures')

const API_BASE = process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2'
const WORLD_GROUPID = process.env.LAT_WORLD_GROUPID || 1000000

/** Posts the smallest valid garden and returns its id. */
async function postMinimalGarden(page) {
  await page.goto('/lend')
  await expect(logoutLink(page)).toBeVisible({ timeout: 15_000 })
  await page.locator('#subject').fill('Paywall test garden')
  await page.locator('#about').fill('A small plot for the paywall test.')
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

test.describe('Paywall', () => {
  test('join page renders tabs: Pay and Concession', async ({ page }) => {
    await page.goto('/join')
    // Use the join-tab class selector to target the tab buttons specifically (avoid the action button)
    await expect(page.locator('.join-tab', { hasText: /Pay £/ })).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.locator('.join-tab', { hasText: 'Concession' })
    ).toBeVisible()
  })

  test('join page shows fee amount', async ({ page }) => {
    await page.goto('/join')
    await expect(page.getByText(/£\d+\.\d{2}/).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('concession tab shows text area', async ({ page }) => {
    await page.goto('/join')
    await expect(
      page.locator('.join-tab', { hasText: 'Concession' })
    ).toBeVisible({ timeout: 10_000 })
    // Server-rendered tab: re-click until hydration has attached the handler
    // and the panel actually appears (same cure as the skip button above).
    await clickUntilHydrated(
      page.locator('.join-tab', { hasText: 'Concession' }),
      page.locator('textarea')
    )
    await expect(page.locator('textarea')).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByRole('button', { name: 'Apply for concession' })
    ).toBeVisible()
  })

  test('skip button redirects to map', async ({ page }) => {
    await page.goto('/join')
    // The button is server-rendered before Vue hydrates and attaches its
    // handler, so a single early click can be swallowed: re-click until the
    // navigation happens (same cure as clickUntilHydrated in the fixtures).
    const skip = page.getByRole('button', { name: /Skip for now/ })
    await expect(async () => {
      await skip.click()
      await expect(page).toHaveURL(/\/map/, { timeout: 1_500 })
    }).toPass({ timeout: 15_000 })
  })

  test('unpaid user sees "Join to send message" on garden page', async ({
    page,
    request,
  }) => {
    // Open a real approved garden (the world group lists them publicly),
    // posting one first if this stack has none yet.
    const res = await request.get(`${API_BASE}/messages`, {
      params: { groupid: WORLD_GROUPID, collection: 'Approved', limit: 10 },
    })
    let offer = ((await res.json()).messages || []).find(
      (m) => m.type === 'Offer'
    )
    if (!offer) {
      await page.goto('/')
      await signUpViaModal(page, { role: 'lender' })
      await markUserAsPaid(page)
      offer = { id: await postMinimalGarden(page) }
      await logoutLink(page).click()
    }

    await page.goto('/')
    await signUpViaModal(page) // a brand-new, unpaid member
    await page.goto(`/garden/${offer.id}`)

    // Unpaid: the join call to action, never the direct Send message button.
    await expect(
      page.getByRole('link', { name: /Join to send message/ })
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole('button', { name: 'Send message' })
    ).toHaveCount(0)
  })

  test('join success page renders', async ({ page }) => {
    await page.goto('/join/success')
    await expect(page.getByRole('heading', { name: /Welcome to/ })).toBeVisible(
      { timeout: 10_000 }
    )
    await expect(
      page.getByRole('link', { name: 'Explore the map' })
    ).toBeVisible()
  })
})
