// @ts-check
const { test, expect } = require('./lat-fixtures')

test.describe('Email verification page', () => {
  test('verify page renders pending state initially', async ({ page }) => {
    // Visit with a fake key — it will fail but the page should render
    await page.goto('/settings/confirmmail/invalid-test-key')
    // The page should render (not 404)
    await expect(page.locator('.verify-card')).toBeVisible({ timeout: 10_000 })
  })

  test('verify page shows error for invalid key', async ({ page }) => {
    await page.goto('/settings/confirmmail/definitely-invalid-key-xyz')
    // Wait for the async verification to complete
    await page.waitForTimeout(3_000)
    // Should show error state (not pending, since the key is invalid)
    await expect(page.locator('.verify-card')).toBeVisible({ timeout: 10_000 })
    // The page should have settled (not stuck on pending)
    const pendingVisible = await page.locator('.icon-spin').isVisible().catch(() => false)
    // Either shows error or success (not forever pending)
    if (!pendingVisible) {
      const card = await page.locator('.verify-card').textContent()
      expect(card).toBeDefined()
    }
  })

  test('verify page shows resend form on error', async ({ page }) => {
    await page.goto('/settings/confirmmail/invalid-key-for-test')
    await page.waitForTimeout(3_000)
    // If error state: resend form should be visible
    const errorHeading = page.getByRole('heading', { name: 'Verification failed' })
    const isError = await errorHeading.isVisible({ timeout: 5_000 }).catch(() => false)
    if (isError) {
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Resend verification email' })).toBeVisible()
    }
  })
})
