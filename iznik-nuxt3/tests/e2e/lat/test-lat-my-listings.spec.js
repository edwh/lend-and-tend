// @ts-check
const { test, expect, signUpViaModal, logoutLink, markUserAsPaid, fillLocationPicker } = require('./lat-fixtures')

test.describe('My Listings on profile', () => {
  test('profile shows My gardens section', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: /My gardens/i })).toBeVisible({ timeout: 10_000 })
  })

  test('My gardens shows empty state for new user', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    await expect(page.getByText(/You haven't posted any gardens yet/i)).toBeVisible({ timeout: 10_000 })
  })

  test('posted garden appears in My gardens on profile', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await markUserAsPaid(page)

    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
    await page.locator('#subject').fill('E2E My Profile Garden')
    await fillLocationPicker(page)
    await page.locator('#phone').fill('07700 900040')
    await page.getByRole('button', { name: 'Post my garden' }).click()
    await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 })

    await page.goto('/profile')
    await expect(page.getByText('E2E My Profile Garden')).toBeVisible({ timeout: 15_000 })
  })

  test('remove button is shown next to each listing', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await markUserAsPaid(page)

    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
    await page.locator('#subject').fill('E2E Garden for Remove Test')
    await fillLocationPicker(page)
    await page.locator('#phone').fill('07700 900041')
    await page.getByRole('button', { name: 'Post my garden' }).click()
    await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 })

    await page.goto('/profile')
    await expect(page.getByText('E2E Garden for Remove Test')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /Remove/i })).toBeVisible()
  })

  test('profile page has notification settings link', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    await expect(page.getByRole('link', { name: 'Settings →' })).toBeVisible({ timeout: 10_000 })
  })
})
