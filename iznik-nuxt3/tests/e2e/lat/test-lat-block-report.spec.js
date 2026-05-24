// @ts-check
const { test, expect, signUpViaModal, logoutLink, markUserAsPaid, fillLocationPicker } = require('./lat-fixtures')

async function signUpAndPostGarden(page, subject = 'E2E Report Test Garden') {
  await page.goto('/')
  await signUpViaModal(page)
  await markUserAsPaid(page)
  await page.goto('/lend')
  await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
  await page.locator('#subject').fill(subject)
  await fillLocationPicker(page)
  await page.locator('#phone').fill('07700 900020')

  const msgResponsePromise = page.waitForResponse(
    resp => resp.url().includes('/apiv2/message') && resp.request().method() === 'PUT'
  )
  await page.getByRole('button', { name: 'Post my garden' }).click()
  const msgResp = await msgResponsePromise
  const msgBody = await msgResp.json()
  await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 })
  return msgBody?.id ?? null
}

test.describe('Block and report on garden listing', () => {
  test('report button is visible to a different logged-in user', async ({ page, browser }) => {
    const gardenId = await signUpAndPostGarden(page)
    expect(gardenId).not.toBeNull()

    const tenderCtx = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })
    const tenderPage = await tenderCtx.newPage()
    try {
      await tenderPage.goto('/')
      await signUpViaModal(tenderPage)
      await markUserAsPaid(tenderPage)
      await tenderPage.goto(`/garden/${gardenId}`)
      await expect(tenderPage.getByText('⚑ Report listing')).toBeVisible({ timeout: 10_000 })
    } finally {
      await tenderCtx.close()
    }
  })

  test('report modal opens and has reason select', async ({ page, browser }) => {
    const gardenId = await signUpAndPostGarden(page, 'E2E Report Modal Garden')
    expect(gardenId).not.toBeNull()

    const tenderCtx = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })
    const tenderPage = await tenderCtx.newPage()
    try {
      await tenderPage.goto('/')
      await signUpViaModal(tenderPage)
      await markUserAsPaid(tenderPage)
      await tenderPage.goto(`/garden/${gardenId}`)
      await expect(tenderPage.getByText('⚑ Report listing')).toBeVisible({ timeout: 10_000 })
      await tenderPage.getByText('⚑ Report listing').click()
      await expect(tenderPage.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 })
      await expect(tenderPage.locator('select#report-reason')).toBeVisible()
    } finally {
      await tenderCtx.close()
    }
  })

  test('report button is hidden for own listing', async ({ page }) => {
    const gardenId = await signUpAndPostGarden(page, 'E2E Own Garden No Report')
    expect(gardenId).not.toBeNull()

    await page.goto(`/garden/${gardenId}`)
    await expect(page.locator('.garden-page')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('⚑ Report listing')).not.toBeVisible()
  })

  test('block button is visible to a different logged-in user', async ({ page, browser }) => {
    const gardenId = await signUpAndPostGarden(page, 'E2E Block Test Garden')
    expect(gardenId).not.toBeNull()

    const tenderCtx = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })
    const tenderPage = await tenderCtx.newPage()
    try {
      await tenderPage.goto('/')
      await signUpViaModal(tenderPage)
      await markUserAsPaid(tenderPage)
      await tenderPage.goto(`/garden/${gardenId}`)
      await expect(tenderPage.getByText('🚫 Block this user')).toBeVisible({ timeout: 10_000 })
    } finally {
      await tenderCtx.close()
    }
  })
})
