// @ts-check
const { test, expect, signUpViaModal, openLoginModal, logoutLink, markUserAsPaid, fillLocationPicker } = require('./lat-fixtures')

test.describe('Share a garden (lend) flow', () => {
  test('landing page has Share my garden CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Share my garden/i })).toBeVisible()
  })

  test('landing page has Garden Lender card', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('GARDEN LENDER')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Can't Garden/i })).toBeVisible()
  })

  test('unauthenticated user clicking Lend nav link is prompted to sign in', async ({ page }) => {
    await page.goto('/lend')
    // onMounted calls requestLogin() → modal appears
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
  })

  test('lend page renders the garden form after login', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await page.goto('/lend')

    await expect(page.getByRole('heading', { name: 'Share your garden' })).toBeVisible()
    await expect(page.locator('#subject')).toBeVisible()
    await expect(page.locator('#about')).toBeVisible()
    await expect(page.locator('#lat-postcode-input')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Find →' })).toBeVisible()
  })

  test('lend form validates location before allowing submit', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await page.goto('/lend')

    await page.locator('#subject').fill('Sunny south-facing plot')
    await page.locator('#about').fill('A great garden for growing vegetables.')
    // Do NOT look up location — submit button should be disabled
    const submitBtn = page.getByRole('button', { name: 'Post my garden' })
    await expect(submitBtn).toBeDisabled()
  })

  test('location lookup succeeds for a valid UK postcode', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    await fillLocationPicker(page)

    await expect(page.locator('.status-ok')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.status-ok')).toContainText('✓')
  })

  test('location lookup fails gracefully for invalid postcode', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    await page.locator('#lat-postcode-input').fill('INVALID999')
    await page.getByRole('button', { name: 'Find →' }).click()

    await expect(page.locator('.status-err')).toBeVisible({ timeout: 10_000 })
  })

  test('complete lend flow posts garden and redirects to profile', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await markUserAsPaid(page)
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    await page.locator('#subject').fill('Test garden for playwright')
    await page.locator('#about').fill('Automated test garden listing.')
    await fillLocationPicker(page)
    await page.locator('#phone').fill('07700 900000')

    await page.getByRole('button', { name: 'Post my garden' }).click()
    await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 })
  })
})
