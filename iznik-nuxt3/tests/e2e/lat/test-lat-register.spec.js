// @ts-check
const { test, expect, signUpViaModal, openLoginModal, logoutLink, generateTestEmail } = require('./lat-fixtures')

test.describe('Sign-up flow', () => {
  test('sign-up modal shows name, email, password fields', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)
    const dialog = page.getByRole('dialog')

    // Switch to sign-up if needed
    const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await joinBtn.click()
    }
    await expect(dialog.locator('#lat-fullname')).toBeVisible()
    await expect(dialog.locator('#lat-email')).toBeVisible()
    await expect(dialog.locator('#lat-password')).toBeVisible()
  })

  test('sign-up with empty name shows validation error', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)
    const dialog = page.getByRole('dialog')

    const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await joinBtn.click()
    }

    await dialog.locator('#lat-email').fill(generateTestEmail())
    await dialog.locator('#lat-password').fill('TestPass123!')
    // Leave fullname empty
    await dialog.getByRole('button', { name: 'Join Lend & Tend' }).click()

    await expect(dialog.locator('.field-error').first()).toBeVisible()
  })

  test('sign-up with empty email shows validation error', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)
    const dialog = page.getByRole('dialog')

    const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await joinBtn.click()
    }

    await dialog.locator('#lat-fullname').fill('Test User')
    await dialog.locator('#lat-password').fill('TestPass123!')
    // Leave email empty
    await dialog.getByRole('button', { name: 'Join Lend & Tend' }).click()

    await expect(dialog.locator('.field-error').first()).toBeVisible()
  })

  test('full sign-up redirects to onboarding then map', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    // signUpViaModal navigates past onboarding to /map
    await expect(page).toHaveURL(/\/map/)
  })

  test('after sign-up, nav shows authenticated links', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await expect(page.getByRole('link', { name: 'Messages' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Lend', exact: true })).toBeVisible()
    await expect(logoutLink(page)).toBeVisible()
  })

  test('sign-up modal has L&T terms links', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)
    const dialog = page.getByRole('dialog')

    const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await joinBtn.click()
    }

    await expect(dialog.getByRole('link', { name: 'Terms' })).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Privacy Policy' })).toBeVisible()
  })

  test('marketing consent checkbox is checked by default', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)
    const dialog = page.getByRole('dialog')

    const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await joinBtn.click()
    }

    const checkbox = dialog.getByRole('checkbox')
    await expect(checkbox).toBeChecked()
  })

  test('can switch from sign-up to login view', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)
    const dialog = page.getByRole('dialog')

    // If already in sign-up view, check for "Already a member?" switch
    const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await joinBtn.click()
    }
    await expect(dialog.getByRole('heading', { name: 'Join Lend & Tend' })).toBeVisible()

    await dialog.getByRole('button', { name: 'Log in' }).click()
    await expect(dialog.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })
})
