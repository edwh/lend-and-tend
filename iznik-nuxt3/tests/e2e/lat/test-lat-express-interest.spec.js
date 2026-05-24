// @ts-check
const { test, expect, signUpViaModal, logoutLink, generateTestEmail, markUserAsPaid, fillLocationPicker } = require('./lat-fixtures')

test.describe('Express interest (tend + chat) flow', () => {
  test('landing page has Find a garden CTA for tenders', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Find a garden/i })).toBeVisible()
  })

  test('landing page has Garden Tender card', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.tender-pill')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /No Garden\? No Problem/i })).toBeVisible()
  })

  test('unauthenticated user visiting /tend is prompted to sign in', async ({ page }) => {
    await page.goto('/tend')
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
  })

  test('tend page renders the interest form after login', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await page.goto('/tend')

    await expect(page.getByRole('heading', { name: 'Find a garden to tend' })).toBeVisible()
    await expect(page.locator('#subject')).toBeVisible()
    await expect(page.locator('#about')).toBeVisible()
    await expect(page.locator('#lat-postcode-input')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Find →' })).toBeVisible()
  })

  test('tend form submit button is disabled without location', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await page.goto('/tend')

    await page.locator('#subject').fill('Vegetables and herbs')
    await page.locator('#about').fill('I have years of gardening experience.')
    const submitBtn = page.getByRole('button', { name: 'Post my interest' })
    await expect(submitBtn).toBeDisabled()
  })

  test('complete tend flow posts interest and redirects to profile', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await markUserAsPaid(page)
    await page.goto('/tend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    await page.locator('#subject').fill('Vegetables and herbs (test)')
    await page.locator('#about').fill('Automated test tender post.')
    await fillLocationPicker(page, 'E1 6RF')
    await page.locator('#phone').fill('07700 900001')

    await page.getByRole('button', { name: 'Post my interest' }).click()
    await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 })
  })

  test('two users: lender posts, tender can navigate to messages', async ({ page, browser }) => {
    // User 1: lender signs up and posts a garden
    await page.goto('/')
    const lenderCreds = await signUpViaModal(page)
    await markUserAsPaid(page)
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
    await page.locator('#subject').fill('E2E test garden')
    await page.locator('#about').fill('Posted by lender for E2E test.')
    await fillLocationPicker(page)
    await page.locator('#phone').fill('07700 900002')
    await page.getByRole('button', { name: 'Post my garden' }).click()
    await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 })

    // Get the lender's user id from the auth store (via localStorage/sessionStorage)
    const lenderUserId = await page.evaluate(() => {
      try {
        const stored = localStorage.getItem('auth') || sessionStorage.getItem('auth')
        if (stored) return JSON.parse(stored)?.user?.id
      } catch {}
      return null
    })

    // User 2: tender in a fresh context
    const tenderContext = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })
    const tenderPage = await tenderContext.newPage()

    try {
      await tenderPage.goto('/')
      await signUpViaModal(tenderPage)

      // Tender navigates to messages — either via a known lender id or just checks /chats
      if (lenderUserId) {
        await tenderPage.goto(`/chats/${lenderUserId}`)
        await expect(tenderPage).not.toHaveURL(/\/login/)
      } else {
        // Without a known user id, just verify authenticated access to /chats works
        await tenderPage.goto('/chats')
        await expect(tenderPage.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 })
      }
    } finally {
      await tenderContext.close()
    }

    void lenderCreds
  })
})
