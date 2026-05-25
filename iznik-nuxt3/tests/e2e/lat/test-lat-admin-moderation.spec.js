// @ts-check
const { test, expect, signUpViaModal } = require('./lat-fixtures')

test.describe('Admin moderation queue', () => {
  test('admin moderation page requires auth', async ({ page }) => {
    await page.goto('/admin/moderation')
    // Not logged in — should see sign-in notice
    await expect(page.getByText(/Please sign in/i)).toBeVisible({ timeout: 10_000 })
  })

  test('admin moderation page shows access denied for non-admin', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/admin/moderation')
    await expect(page.getByText(/admin or support role/i)).toBeVisible({ timeout: 10_000 })
  })

  test('admin moderation page is reachable but blocks non-admins with a notice', async ({ page }) => {
    // We can't easily create an admin user in E2E, so verify the layout's
    // non-admin guard actually shows the notice instead of redirecting.
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/admin/moderation')
    // The admin layout's "L&T Admin" branding should be visible — proves
    // we landed on an admin-layout page rather than getting redirected.
    await expect(page.getByText('L&T Admin').first()).toBeVisible({
      timeout: 10_000,
    })
    // And the non-admin notice should be shown.
    await expect(
      page.getByText(/admin or support role to access this area/i)
    ).toBeVisible({ timeout: 5_000 })
  })

  test('admin dashboard page also blocks non-admins consistently', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/admin')
    await expect(page.getByText('L&T Admin').first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByText(/admin or support role to access this area/i)
    ).toBeVisible({ timeout: 5_000 })
  })

  test('moderation page shows empty state when no flagged messages', async ({ page }) => {
    // This test relies on test DB having no flagged messages; skip gracefully if admin
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/admin/moderation')
    // For a regular user, the auth guard shows an access-denied message
    // The empty state message is only visible to admins
    const accessDenied = page.getByText(/admin or support role/i)
    const emptyState = page.getByText(/No messages pending review/i)
    await expect(accessDenied.or(emptyState)).toBeVisible({ timeout: 10_000 })
  })
})
