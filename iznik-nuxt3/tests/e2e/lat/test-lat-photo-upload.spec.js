// @ts-check
const {
  test,
  expect,
  signUpViaModal,
  logoutLink,
  markUserAsPaid,
  fillLocationPicker,
} = require('./lat-fixtures')

test.describe('Photo upload on listing forms', () => {
  test('lend form shows PhotoUploader component', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Photos/).first()).toBeVisible({
      timeout: 10_000,
    })
    // PhotoUploader renders a heading/area to add photos
    await expect(page.getByText(/Add photos of your garden/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('tend form shows PhotoUploader component', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/tend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Photos/).first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/Add photos of your gardening/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('lend form includes photo hint text', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/lend')
    await expect(page.getByText(/helps tenders see your garden/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('tend form includes photo hint text', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/tend')
    await expect(page.getByText(/show your previous work/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('garden listing page renders without error when no photos', async ({
    page,
  }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await markUserAsPaid(page)
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
    await page.locator('#subject').fill('E2E Photo Test Garden No Photos')
    await fillLocationPicker(page)
    await page.locator('#phone').fill('07700 900003')

    const msgResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/apiv2/message') &&
        resp.request().method() === 'PUT'
    )
    await page.getByRole('button', { name: 'Post my garden' }).click()
    const msgResp = await msgResponsePromise
    const msgBody = await msgResp.json()
    const gardenId = msgBody?.id
    expect(gardenId).not.toBeNull()

    await page.goto(`/garden/${gardenId}`)
    await expect(page.locator('.garden-page')).toBeVisible({ timeout: 10_000 })
    // No photos section shown when listing has no attachments
    await expect(page.locator('.garden-photos')).not.toBeVisible()
  })

  test('profile photo upload button shows file uploader', async ({ page }) => {
    await page.goto('/')
    await signUpViaModal(page)

    await page.goto('/profile')
    await expect(page.getByRole('button', { name: /Log out/ })).toBeVisible({
      timeout: 10_000,
    })

    // Find the Upload photo button in the profile photo section
    const uploadBtn = page
      .getByRole('button', { name: /[Uu]pload.*photo/i })
      .first()
    await expect(uploadBtn).toBeVisible({ timeout: 10_000 })
    await uploadBtn.click()

    // After clicking, the OurUploader/Uppy component should appear
    // Check for Uppy dashboard modal or uploader wrapper
    const uploader = page
      .locator('.uploader-wrapper, .uppy-Dashboard, [role="dialog"]')
      .first()
    await expect(uploader).toBeVisible({ timeout: 5_000 })
  })
})
