// @ts-check
const { test, expect, signUpViaModal, loginViaModal, openLoginModal, logoutLink, generateTestEmail } = require('./lat-fixtures')

test.describe('Login / sign-up modal', () => {
  test('Sign in button opens the modal', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('#lat-email')).toBeVisible()
    await expect(dialog.locator('#lat-password')).toBeVisible()
  })

  test('modal defaults to login view when user has logged in before', async ({ page }) => {
    // Sign up first so loggedInEver is persisted, then log out (keeps loggedInEver=true)
    await page.goto('/')
    await signUpViaModal(page)
    // Log out — this navigates to / and keeps loggedInEver=true in localStorage
    await logoutLink(page).click()
    await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible({ timeout: 10_000 })
    // Open modal — should show login view because user has logged in before
    await openLoginModal(page)
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(dialog.locator('#lat-email')).toBeVisible()
  })

  test('switching to sign-up view shows fullname field', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)
    const dialog = page.getByRole('dialog')
    // If shown in login view, switch to sign-up
    const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await joinBtn.click()
    }
    await expect(dialog.getByRole('heading', { name: 'Join Lend & Tend' })).toBeVisible()
    await expect(dialog.locator('#lat-fullname')).toBeVisible()
  })

  test('close button dismisses the modal', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('wrong credentials shows error message', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)
    const dialog = page.getByRole('dialog')

    // Ensure we're in login mode
    const heading = dialog.getByRole('heading', { name: 'Welcome back' })
    if (!await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
      // In sign-up mode — switch to login
      await dialog.getByRole('button', { name: 'Log in' }).click()
    }

    await dialog.locator('#lat-email').fill('nobody@example.com')
    await dialog.locator('#lat-password').fill('WrongPassword!')
    await dialog.getByRole('button', { name: 'Log in' }).click()

    await expect(dialog.locator('.alert-danger')).toBeVisible()
  })

  test('successful sign-up redirects to map', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await expect(page).toHaveURL(/\/map/)
  })

  test('successful login closes modal and keeps page', async ({ page }) => {
    await page.goto('/')
    const { email, password } = await signUpViaModal(page)

    // Log out via the Logout nav link
    await logoutLink(page).click()
    await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible()

    // Log back in
    await loginViaModal(page, email, password)
    await expect(page.getByRole('dialog')).not.toBeVisible()
    // Auth confirmed: Logout link is visible again
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
  })

  test('nav shows Logout after login', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    // After sign-up lands on /map; Logout link is in nav
    await expect(logoutLink(page)).toBeVisible()
  })

  test('modal has no Freegle branding', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/Freegle/i)).not.toBeVisible()
    await expect(dialog.getByText(/Continue with Facebook/i)).not.toBeVisible()
    await expect(dialog.getByText(/Sign in with Google/i)).not.toBeVisible()
  })
})
