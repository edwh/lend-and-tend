// @ts-check
//
// Golden flows locked from the two-sided walkthrough video (pr-walkthrough/
// prs/lat-journey). These are the parts of the journey that broke while the
// video was being made, so they are pinned as regression tests:
//
//   1. A lender offers a garden with a REAL photo. The upload goes through
//      lat-tusd, the listing carries the attachment, and the garden page
//      actually renders it through lat-delivery (not a broken image).
//   2. A tender gets in touch, the lender replies, and "Sign agreement" in the
//      chat reaches the agreement page. That lookup depends on the batch job
//      `messages:update-spatial-index` (scheduled every minute in the L&T
//      worker). Until it has run, the button must TELL the member rather than
//      do nothing.
//
const path = require('path')
const {
  test,
  expect,
  signUpViaModal,
  logoutLink,
  markUserAsPaid,
  fillLocationPicker,
} = require('./lat-fixtures')

// CC0 photo (see pr-walkthrough/prs/lat-journey/PHOTO-CREDIT.md).
const PHOTO = path.join(__dirname, 'fixtures', 'garden-raised-beds.jpg')
const DELIVERY_HOST_RE = /:4081|lat-delivery|lend-and-tend/

async function postGardenWithPhoto(page, subject) {
  await page.goto('/lend')
  await expect(logoutLink(page)).toBeVisible({ timeout: 15_000 })
  await page.locator('#subject').fill(subject)
  await page
    .locator('#about')
    .fill('Four raised beds and a greenhouse, looking for someone to grow.')
  await fillLocationPicker(page)
  await page.locator('#phone').fill('07700 900100')

  // Upload through the real PhotoUploader: tus -> lat-tusd -> POST /apiv2/image.
  const registered = page.waitForResponse(
    (r) =>
      r.url().includes('/apiv2/image') &&
      r.request().method() === 'POST' &&
      r.ok(),
    { timeout: 60_000 }
  )
  await page.locator('input[type="file"]').first().setInputFiles(PHOTO)
  await registered
  await expect(page.locator('.featured-photo img').first()).toBeVisible({
    timeout: 30_000,
  })

  const created = page.waitForResponse(
    (r) => r.url().includes('/apiv2/message') && r.request().method() === 'PUT',
    { timeout: 30_000 }
  )
  await page.getByRole('button', { name: 'Post my garden' }).click()
  const id = (await (await created).json())?.id
  await expect(page).toHaveURL(/\/profile/, { timeout: 25_000 })
  expect(id, 'listing id from PUT /message').toBeTruthy()
  return id
}

test.describe('Walkthrough golden flows', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(8 * 60_000)

  let gardenId
  let lenderEmail

  test('a lender offers a garden with a real photo and it renders on the listing', async ({
    page,
  }) => {
    await page.goto('/')
    const lender = await signUpViaModal(page, {
      role: 'lender',
      fullname: 'Golden Lender',
    })
    lenderEmail = lender.email
    await markUserAsPaid(page)
    gardenId = await postGardenWithPhoto(page, 'Golden raised beds')

    await page.goto(`/garden/${gardenId}`)
    const photo = page.locator('.garden-photo').first()
    await expect(photo).toBeVisible({ timeout: 20_000 })
    // The image must be served by L&T's own delivery and must have decoded.
    const info = await photo.evaluate((img) => ({
      src: img.currentSrc || img.src,
      ok: img.complete && img.naturalWidth > 0,
    }))
    expect(info.src).toMatch(DELIVERY_HOST_RE)
    expect(info.ok, `photo did not load: ${info.src}`).toBe(true)
  })

  test('a tender gets in touch and the lender can reach the agreement from the chat', async ({
    browser,
  }) => {
    expect(gardenId, 'needs the listing from the previous test').toBeTruthy()

    // The tender, in their own browser context.
    const tenderCtx = await browser.newContext()
    const tender = await tenderCtx.newPage()
    await tender.goto('/')
    await signUpViaModal(tender, { role: 'tender', fullname: 'Golden Tender' })
    await markUserAsPaid(tender)
    await tender.goto(`/garden/${gardenId}`)
    await tender.getByRole('button', { name: 'Send message' }).click()
    await expect(tender).toHaveURL(/\/chats\/\d+/, { timeout: 20_000 })
    const chatId = tender.url().match(/chats\/(\d+)/)[1]
    await tender
      .locator('#chatmessage')
      .fill('Hi! Could I come and see your raised beds?')
    await tender.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(tender.getByText('Could I come and see').first()).toBeVisible({
      timeout: 15_000,
    })

    // The lender, signed in again by magic link in a fresh context.
    const lenderCtx = await browser.newContext()
    const lender = await lenderCtx.newPage()
    await lender.goto('/')
    const { loginViaModal } = require('./lat-fixtures')
    await loginViaModal(lender, lenderEmail)
    await lender.goto(`/chats/${chatId}`)
    await expect(lender.locator('#chatmessage')).toBeVisible({
      timeout: 30_000,
    })

    // "Sign agreement" either opens the agreement page, or (if the batch
    // spatial-index job has not run yet) explains itself. It must never do
    // nothing. Keep trying until the job has run (it is scheduled every minute).
    await expect(async () => {
      await lender
        .getByRole('button', { name: 'Sign agreement' })
        .first()
        .click()
      const notice = lender.getByTestId('agreement-notice')
      await expect(lender.locator('body').locator(':scope')).toHaveCount(1) // keeps the poll alive while we check the two outcomes
      const onAgreement = /\/agreement\/\d+/.test(lender.url())
      const noticeShown = await notice.isVisible().catch(() => false)
      expect(
        onAgreement || noticeShown,
        'Sign agreement neither navigated nor explained'
      ).toBe(true)
      expect(onAgreement, 'listing not indexed yet').toBe(true)
    }).toPass({ timeout: 4 * 60_000, intervals: [10_000] })

    await expect(lender.locator('#whatToGrow')).toBeVisible({ timeout: 15_000 })
    await tenderCtx.close()
    await lenderCtx.close()
  })
})
