// @ts-check
const { test, expect, signUpViaModal } = require('./lat-fixtures')

test.describe('Check-in page', () => {
  test('check-in page requires sign-in', async ({ page }) => {
    await page.goto('/checkin/123')
    await expect(page.getByText(/Please sign in/i)).toBeVisible({ timeout: 10_000 })
  })

  test('check-in page shows status options after sign-in', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/checkin/123')
    await expect(page.getByText('Growing')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Going OK')).toBeVisible()
    await expect(page.getByText('Not working')).toBeVisible()
  })

  test('check-in page has submit button disabled until status selected', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/checkin/123')
    await expect(page.getByRole('button', { name: /Submit check-in/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Submit check-in/i })).toBeDisabled()
  })

  test('selecting a status enables submit button', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/checkin/123')
    await expect(page.getByText('Growing')).toBeVisible({ timeout: 10_000 })
    await page.getByText('Growing').click()
    await expect(page.getByRole('button', { name: /Submit check-in/i })).toBeEnabled({ timeout: 5_000 })
  })

  test('deep-link pre-selects status from query param', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/checkin/123?status=ok')
    await expect(page.getByRole('button', { name: /Submit check-in/i })).toBeEnabled({ timeout: 10_000 })
  })

  test('check-in page has back link to messages', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/checkin/123')
    await expect(page.getByRole('link', { name: /Back to messages/i })).toBeVisible({ timeout: 10_000 })
  })

  test('note textarea is visible', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/checkin/123')
    await expect(page.locator('textarea')).toBeVisible({ timeout: 10_000 })
  })
})
