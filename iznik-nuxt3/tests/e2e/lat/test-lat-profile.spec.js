// @ts-check
const { test, expect, signUpViaModal, loginViaModal, logoutLink, generateTestEmail } = require('./lat-fixtures')

test.describe('Profile page', () => {
  test('profile page is accessible after sign-up', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible({ timeout: 10_000 })
  })

  test('profile page shows display name field', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    await expect(page.locator('#displayname')).toBeVisible({ timeout: 10_000 })
  })

  test('profile page shows membership section', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Membership' })).toBeVisible()
  })

  test('profile page shows "not yet joined" for new user', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    await expect(page.getByText('Not yet joined')).toBeVisible({ timeout: 10_000 })
  })

  test('profile page shows join link for unpaid users', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    const joinLink = page.getByRole('link', { name: /Join now/ })
    await expect(joinLink).toBeVisible({ timeout: 10_000 })
  })

  test('can update about me and save', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    await page.locator('#aboutme').fill('I love growing tomatoes.')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Profile saved.')).toBeVisible({ timeout: 10_000 })
  })

  test('profile page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/profile')
    // Should redirect to home or stay on profile but not show form
    await page.waitForTimeout(2_000)
    const hasHeading = await page.getByRole('heading', { name: 'My Profile' }).isVisible().catch(() => false)
    // Either redirected or showing "sign in" message
    if (hasHeading) {
      await expect(page.getByText('sign in').or(page.getByText('Sign in'))).toBeVisible()
    }
  })

  test('change password section is present', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible()
    await expect(page.locator('#newpass')).toBeVisible()
  })
})
