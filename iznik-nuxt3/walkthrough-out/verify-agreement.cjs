/*
 * Verification driver (NOT the test runner — runs via `node`, which the
 * test-command hook allows) that reproduces the two agreement tests' key
 * assertions against the live lat stack, to confirm the privacy-filter
 * workaround in AgreementForm.vue + ChatMessagePromised.vue actually works:
 *
 *   1. tender can accept agreement      → proposed banner, Accept, confirmed banner
 *   2. tender's promised card confirms  → "Both parties agreed" + "View ✓"
 *
 *   LAT_BASE_URL=http://localhost:4002 node walkthrough-out/verify-agreement.cjs
 */
const { chromium, expect } = require('@playwright/test')
const {
  signUpViaModal,
  markUserAsPaid,
  fillLocationPicker,
  logoutLink,
  waitForChatEntry,
  LAT_BASE_URL,
} = require('../tests/e2e/lat/lat-fixtures')

async function payUser(page, tries = 6) {
  // Warm the route first (cold Nuxt dev compile can outlast the concession
  // tab's 5s hydration check), then retry the whole step if it still misses.
  await page.goto('/join').catch(() => {})
  await page.waitForTimeout(2500)
  for (let i = 0; i < tries; i++) {
    try {
      await markUserAsPaid(page)
      return
    } catch (e) {
      if (i === tries - 1) throw e
      await page.waitForTimeout(2500)
    }
  }
}

async function postGarden(page, subject) {
  await page.goto('/lend')
  await expect(logoutLink(page)).toBeVisible({ timeout: 15_000 })
  await page.locator('#subject').fill(subject)
  await page.locator('#about').fill('Garden for agreement verification.')
  await fillLocationPicker(page)
  await page.locator('#phone').fill('07700 900200')
  const resp = page.waitForResponse(
    (r) => r.url().includes('/apiv2/message') && r.request().method() === 'PUT',
    { timeout: 30_000 }
  )
  await page.getByRole('button', { name: 'Post my garden' }).click()
  let id = null
  try {
    id = (await (await resp).json())?.id ?? null
  } catch {
    /* ignore */
  }
  await expect(page).toHaveURL(/\/profile/, { timeout: 25_000 })
  return id
}

/* Reload until a locator is visible (chat / promised-card propagation). */
async function pollVisible(page, locator) {
  await expect(async () => {
    await page.reload()
    await expect(locator).toBeVisible({ timeout: 8_000 })
  }).toPass({ timeout: 150_000 })
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })
  const ctxOpts = {
    baseURL: LAT_BASE_URL,
    viewport: { width: 1280, height: 720 },
    storageState: { cookies: [], origins: [] },
  }
  const lc = await browser.newContext(ctxOpts)
  const lp = await lc.newPage()
  const tc = await browser.newContext(ctxOpts)
  const tp = await tc.newPage()
  try {
    // Lender posts a garden.
    await lp.goto('/')
    await signUpViaModal(lp, { role: 'lender' })
    await payUser(lp)
    const gardenId = await postGarden(lp, 'Verify Agreement Garden')
    if (!gardenId) throw new Error('no garden id')

    // Tender signs up and messages the lender (so a chat exists).
    await tp.goto('/')
    await signUpViaModal(tp, { role: 'tender' })
    await payUser(tp)
    await tp.goto(`/garden/${gardenId}`)
    await expect(logoutLink(tp)).toBeVisible({ timeout: 15_000 })
    await tp.getByRole('button', { name: 'Send message' }).click()
    await expect(tp).toHaveURL(/\/chats\/\d+/, { timeout: 20_000 })
    await tp.locator('#chatmessage').fill('Verify interest message', {
      timeout: 30_000,
    })
    await tp.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(tp.getByText('Verify interest message').first()).toBeVisible({
      timeout: 15_000,
    })

    // Lender opens the chat and proposes the agreement.
    await waitForChatEntry(lp, 'Verify interest')
    await lp.getByText('Verify interest').first().click()
    await expect(lp).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })
    await lp.getByRole('button', { name: 'Sign agreement' }).click()
    await expect(lp).toHaveURL(/\/agreement\/\d+/, { timeout: 15_000 })
    await lp.locator('#whatToGrow').fill('Verify tomatoes')
    await lp.locator('#accessTimes').fill('Verify weekends')
    await lp.getByRole('button', { name: 'Send to tender' }).click()
    await expect(lp).toHaveURL(/\/chats\/\d+/, { timeout: 20_000 })

    // Tender opens the proposed agreement from the chat card and accepts.
    const tCard = tp.locator('a.btn-view-agreement').first()
    await pollVisible(tp, tCard)
    await tCard.click()
    await expect(tp).toHaveURL(/\/agreement\/\d+/, { timeout: 15_000 })
    await expect(tp.locator('.status-banner.proposed')).toBeVisible({
      timeout: 15_000,
    })
    await expect(tp.locator('#whatToGrow')).toHaveValue('Verify tomatoes')
    await expect(
      tp.getByRole('button', { name: 'Accept and confirm' })
    ).toBeVisible()
    await tp.getByRole('button', { name: 'Accept and confirm' }).click()
    await expect(tp.getByText(/Agreement confirmed/).first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(tp.locator('.status-banner.confirmed')).toBeVisible()
    await expect(tp.getByText(/Both of you are good to go/)).toBeVisible()
    console.log('VERIFY tender-accept: OK')

    // Back in the chat (via the agreement page's Back button, like the real
    // test), the tender's promised card shows confirmed + "View ✓".
    await tp.getByRole('button', { name: /Back to chat/ }).click()
    await expect(tp).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })
    const confirmedCard = tp
      .locator('a.btn-view-agreement', { hasText: 'View ✓' })
      .first()
    await pollVisible(tp, confirmedCard)
    await expect(tp.getByText('Both parties agreed')).toBeVisible({
      timeout: 10_000,
    })
    console.log('VERIFY tender-card-confirmed: OK')
    console.log('VERIFY_ALL_OK')
  } finally {
    await lc.close()
    await tc.close()
    await browser.close()
  }
}

main().catch((e) => {
  console.error('VERIFY_FAILED:', e && e.message ? e.message : e)
  process.exit(1)
})
