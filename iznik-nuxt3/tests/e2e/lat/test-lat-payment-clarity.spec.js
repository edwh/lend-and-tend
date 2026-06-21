// @ts-check
// Regression tests for the "payment isn't obviously required" feedback.
//
// The complaint: a user fills in the garden form and clicks the (dead,
// disabled) submit button, doesn't realise a one-time fee is required, and
// only discovers it later by wandering into settings. These tests pin the
// fixed behaviour: the cost and the one-time *requirement* are stated up
// front, the price is printed on the submit button, and the payment request
// is raised at the END of the form (a modal) rather than silently blocking.
const {
  test,
  expect,
  signUpViaModal,
  logoutLink,
  fillLocationPicker,
} = require('./lat-fixtures')

test.describe('Payment clarity', () => {
  test('lend page tells unpaid users the fee is a one-time requirement, with the amount', async ({
    page,
  }) => {
    await page.goto('/')
    await signUpViaModal(page, { role: 'lender' })
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    const gate = page.locator('.pay-gate')
    await expect(gate).toBeVisible({ timeout: 10_000 })
    // States the price…
    await expect(gate).toContainText(/£\d+(\.\d{2})?/)
    // …that it is required…
    await expect(gate).toContainText(/required/i)
    // …and that it is a one-off, not a subscription.
    await expect(gate).toContainText(/one-?(time|off)|not a subscription/i)
  })

  test('lend submit button shows the price when the user has not paid', async ({
    page,
  }) => {
    await page.goto('/')
    await signUpViaModal(page, { role: 'lender' })
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    const submit = page.locator('button[type="submit"]')
    await expect(submit).toContainText(/Pay £\d+/i)
    await expect(submit).toContainText(/post my garden/i)
  })

  test('lend: clicking the priced submit raises the payment request at the end of the form', async ({
    page,
  }) => {
    await page.goto('/')
    await signUpViaModal(page, { role: 'lender' })
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    await page.locator('#subject').fill('Sunny plot needing love')
    await page.locator('#phone').fill('07700 900000')
    await fillLocationPicker(page)

    // With a location the button is enabled (no more dead disabled button).
    const submit = page.locator('button[type="submit"]')
    await expect(submit).toBeEnabled()
    await submit.click()

    // The payment request appears right where the user expects to post.
    await expect(page.locator('.payment-modal')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('.payment-modal')).toContainText(/£\d+/)
  })

  test('tend submit button shows the price when the user has not paid', async ({
    page,
  }) => {
    await page.goto('/')
    await signUpViaModal(page, { role: 'tender' })
    await page.goto('/tend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    const submit = page.locator('button[type="submit"]')
    await expect(submit).toContainText(/Pay £\d+/i)
    await expect(submit).toContainText(/post my interest/i)

    const gate = page.locator('.pay-gate')
    await expect(gate).toContainText(/required/i)
    await expect(gate).toContainText(/one-?(time|off)|not a subscription/i)
  })
})
