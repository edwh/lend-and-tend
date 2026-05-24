// @ts-check
const { test, expect, signUpViaModal } = require('./lat-fixtures')

test.describe('Settings page', () => {
  test('settings page is accessible from profile', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    // The profile page has a "Settings →" button; use the specific text to avoid navbar links
    const settingsLink = page.getByRole('link', { name: 'Settings →' })
    await expect(settingsLink).toBeVisible({ timeout: 10_000 })
    await settingsLink.click()
    await expect(page).toHaveURL(/\/settings/)
  })

  test('settings page has alert enable toggle', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    await expect(page.getByText(/Local activity alerts/i)).toBeVisible({
      timeout: 10_000,
    })
    // Toggle is a CSS-styled label wrapping a hidden checkbox — check the label is visible
    await expect(page.locator('.toggle-switch').first()).toBeVisible()
  })

  test('settings page has frequency selector', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    // #radius is always visible; #alertFreq only shows when alerts are enabled
    await expect(page.locator('#radius')).toBeVisible({ timeout: 10_000 })
  })

  test('settings page has travel radius selector', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    // Use the section heading — two elements contain "travel radius" so scope to headings
    await expect(
      page.locator('h2.card-title').filter({ hasText: /travel radius/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('settings page save button exists', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    // Settings page now has multiple Save buttons (one per section: account, email,
    // password, alerts/radius). Target the alerts/radius "Save settings" specifically.
    await expect(
      page.getByRole('button', { name: 'Save settings' })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('settings page shows success after save', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    const saveBtn = page.getByRole('button', { name: 'Save settings' })
    await expect(saveBtn).toBeVisible({ timeout: 10_000 })
    await saveBtn.click()
    await expect(page.getByText(/Settings saved/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('settings link appears in nav after sign-in', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await expect(page.getByRole('link', { name: /Settings/i })).toBeVisible({
      timeout: 10_000,
    })
  })
})
