// @ts-check
//
// "Profile" in the post-restructure world is the user's account details
// page at /settings. The /profile route is now "My Gardens" (a list of
// the user's listings). Tests below target the actual account-details
// fields, which all live on /settings.
const { test, expect, signUpViaModal } = require('./lat-fixtures')

test.describe('Account settings page (formerly "Profile")', () => {
  test('account & settings page is accessible after sign-up', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    await expect(
      page.getByRole('heading', { name: 'Account & Settings', level: 1 })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('settings page shows display name field', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    await expect(page.locator('#displayname')).toBeVisible({ timeout: 10_000 })
  })

  test('settings page shows Membership section', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    await expect(
      page.getByRole('heading', { name: 'Membership', level: 2 })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('settings page shows "not yet joined" for a fresh user', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    await expect(page.getByText(/Not yet joined/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('settings page shows Join now link for unpaid users', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    const joinLink = page.getByRole('link', { name: /Join now/ })
    await expect(joinLink).toBeVisible({ timeout: 10_000 })
  })

  test('can update about me and save', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    await page.locator('#aboutme').fill('I love growing tomatoes.')
    // There are multiple Save buttons (one per card); the Account details
    // card uses "Save changes" — be explicit to dodge strict-mode errors.
    await page.getByRole('button', { name: 'Save changes' }).first().click()
    await expect(page.getByText(/Profile saved/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Change password section is present', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/settings')
    await expect(
      page.getByRole('heading', { name: 'Change password', level: 2 })
    ).toBeVisible()
    await expect(page.locator('#newpass')).toBeVisible()
  })

  test('/profile (My Gardens) is not the account-settings page', async ({ page }) => {
    // Regression guard: the route restructure means /profile must NOT
    // show the account-edit form. If somebody puts those fields back
    // here we should know.
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    // My Gardens heading should be visible…
    await expect(
      page.getByRole('heading', { name: 'My Gardens', level: 1 })
    ).toBeVisible({ timeout: 10_000 })
    // …and the account-form fields should NOT be here.
    await expect(page.locator('#displayname')).toHaveCount(0)
    await expect(page.locator('#newpass')).toHaveCount(0)
  })
})
