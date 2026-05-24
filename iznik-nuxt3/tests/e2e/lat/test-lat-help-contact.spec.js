// @ts-check
const { test, expect } = require('./lat-fixtures')

test.describe('Help & Contact pages', () => {
  test('help page renders FAQ accordion', async ({ page }) => {
    await page.goto('/help')
    await expect(page.getByRole('heading', { name: /Help|FAQ/i })).toBeVisible({ timeout: 10_000 })
    // At least one FAQ question visible
    const questions = page.locator('.faq-question, button[class*="faq"], .accordion-button, details summary')
    await expect(questions.first()).toBeVisible({ timeout: 5_000 })
  })

  test('help page links to contact page', async ({ page }) => {
    await page.goto('/help')
    const contactLink = page.getByRole('link', { name: /[Cc]ontact/ }).first()
    await expect(contactLink).toBeVisible({ timeout: 10_000 })
  })

  test('help page has mailto link', async ({ page }) => {
    await page.goto('/help')
    const mailtoLink = page.locator('a[href^="mailto:"]')
    await expect(mailtoLink.first()).toBeVisible({ timeout: 10_000 })
  })

  test('contact page renders form', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: /[Cc]ontact/i }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()
    await expect(page.getByRole('button', { name: /[Ss]end/ })).toBeVisible()
  })

  test('terms page renders', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible({ timeout: 10_000 })
  })

  test('privacy page renders', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible({ timeout: 10_000 })
  })

  test('footer has Terms link', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.getByRole('link', { name: 'Terms' })).toBeVisible({ timeout: 10_000 })
  })

  test('footer has Privacy link', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible({ timeout: 10_000 })
  })

  test('footer has Help link', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.getByRole('link', { name: /Help/i })).toBeVisible({ timeout: 10_000 })
  })
})
