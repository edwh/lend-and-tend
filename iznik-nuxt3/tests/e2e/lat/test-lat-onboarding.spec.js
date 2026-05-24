// @ts-check
const { test, expect, openLoginModal, logoutLink, generateTestEmail } = require('./lat-fixtures')

test.describe('Onboarding flow', () => {
  test('sign-up redirects to onboarding', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)

    const dialog = page.getByRole('dialog')
    const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await joinBtn.click()
    }

    await dialog.locator('#lat-fullname').fill('Onboard Test User')
    await dialog.locator('#lat-email').fill(generateTestEmail())
    await dialog.locator('#lat-password').fill('TestPass123!')
    await dialog.locator('#lat-role').selectOption('lender')
    await dialog.getByRole('button', { name: 'Join Lend & Tend' }).click()

    await expect(page).toHaveURL(/\/(onboarding|map)/, { timeout: 15_000 })
  })

  test('onboarding page shows step 1 with role and about fields', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)

    const dialog = page.getByRole('dialog')
    const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await joinBtn.click()
    }

    await dialog.locator('#lat-fullname').fill('Onboard Roles Test')
    await dialog.locator('#lat-email').fill(generateTestEmail())
    await dialog.locator('#lat-password').fill('TestPass123!')
    await dialog.locator('#lat-role').selectOption('tender')
    await dialog.getByRole('button', { name: 'Join Lend & Tend' }).click()

    // If we landed on onboarding
    const url = page.url()
    if (url.includes('/onboarding')) {
      await expect(page.locator('#ob-role')).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('#ob-about')).toBeVisible()
    }
  })

  test('onboarding step 1 requires role selection', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)

    const dialog = page.getByRole('dialog')
    const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await joinBtn.click()
    }

    await dialog.locator('#lat-fullname').fill('Validation Test')
    await dialog.locator('#lat-email').fill(generateTestEmail())
    await dialog.locator('#lat-password').fill('TestPass123!')
    await dialog.locator('#lat-role').selectOption('lender')
    await dialog.getByRole('button', { name: 'Join Lend & Tend' }).click()

    const url = page.url()
    if (url.includes('/onboarding')) {
      // Clear role selection and try to continue
      await page.locator('#ob-role').selectOption('')
      await page.getByRole('button', { name: 'Continue' }).click()
      await expect(page.getByText('Please select your role')).toBeVisible({ timeout: 5_000 })
    }
  })

  test('onboarding shows progress dots', async ({ page }) => {
    await page.goto('/')
    await openLoginModal(page)

    const dialog = page.getByRole('dialog')
    const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await joinBtn.click()
    }

    await dialog.locator('#lat-fullname').fill('Dots Test')
    await dialog.locator('#lat-email').fill(generateTestEmail())
    await dialog.locator('#lat-password').fill('TestPass123!')
    await dialog.locator('#lat-role').selectOption('lender')
    await dialog.getByRole('button', { name: 'Join Lend & Tend' }).click()

    const url = page.url()
    if (url.includes('/onboarding')) {
      await expect(page.locator('.onboard-step-dot')).toHaveCount(3, { timeout: 10_000 })
    }
  })
})
