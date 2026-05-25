// @ts-check
//
// Tests for the public/private visibility hint badges on the lend/tend
// forms. These badges (lat/components/lat/VisibilityHint.vue) tell the
// user at a glance which fields will be visible to anyone on the public
// listing vs which stay private until they accept a sharing agreement.
const { test, expect, signUpViaModal } = require('./lat-fixtures')

test.describe('Visibility hints on post-a-garden forms', () => {
  test('lend form labels each field with a visibility badge', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)
    await page.goto('/lend')

    // Three flavours of badge must all appear at least once on /lend.
    // Public (most fields), Approximate (location), Private (phone).
    await expect(page.locator('.vis-hint--public').first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('.vis-hint--approximate').first()).toBeVisible()
    await expect(page.locator('.vis-hint--private').first()).toBeVisible()

    // Phone number is private — its label should contain a private badge.
    const phoneLabel = page.locator('label[for="phone"]')
    await expect(phoneLabel.locator('.vis-hint--private')).toBeVisible()

    // Garden title is public.
    const titleLabel = page.locator('label[for="subject"]')
    await expect(titleLabel.locator('.vis-hint--public')).toBeVisible()
  })

  test('tend form labels each field with a visibility badge', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page, { role: 'tender' })
    await page.goto('/tend')

    await expect(page.locator('.vis-hint--public').first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('.vis-hint--approximate').first()).toBeVisible()
    await expect(page.locator('.vis-hint--private').first()).toBeVisible()

    // Phone (private) and subject (public) — same as lend.
    const phoneLabel = page.locator('label[for="phone"]')
    await expect(phoneLabel.locator('.vis-hint--private')).toBeVisible()

    const subjectLabel = page.locator('label[for="subject"]')
    await expect(subjectLabel.locator('.vis-hint--public')).toBeVisible()
  })
})
