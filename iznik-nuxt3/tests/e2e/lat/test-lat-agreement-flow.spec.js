// @ts-check
const {
  test,
  expect,
  signUpViaModal,
  logoutLink,
  waitForChatEntry,
  markUserAsPaid,
  fillLocationPicker,
} = require('./lat-fixtures')

/**
 * Sign up a new user, post a garden via /lend, and return the created message ID.
 * Captures the message ID by intercepting the PUT /message API response.
 */
async function signUpAndPostGarden(
  page,
  subject = 'E2E Agreement Test Garden'
) {
  await page.goto('/')
  await signUpViaModal(page)
  await markUserAsPaid(page)
  await page.goto('/lend')
  await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

  await page.locator('#subject').fill(subject)
  await page
    .locator('#about')
    .fill('A garden created for E2E agreement testing.')
  await fillLocationPicker(page)
  await page.locator('#phone').fill('07700 900010')

  // Intercept the PUT /message response to capture the new message ID
  const messageResponsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/apiv2/message') && resp.request().method() === 'PUT'
  )

  await page.getByRole('button', { name: 'Post my garden' }).click()

  const messageResp = await messageResponsePromise
  const messageBody = await messageResp.json()
  const gardenMessageId = messageBody?.id ?? null

  await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 })

  return gardenMessageId
}

test.describe('Agreement flow: form, persistence, and chat integration', () => {
  test('unauthenticated user accessing agreement page is redirected', async ({
    page,
  }) => {
    // Try to access agreement page without being logged in
    await page.goto('/agreement/123?userId=456')

    // Should show login modal or redirect
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
  })

  test('unauthorized user cannot view agreement (wrong userId)', async ({
    page,
    browser,
  }) => {
    // Create a garden with lender1
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    // Switch to another user (lender2) in fresh context
    const unauthorizedCtx = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })
    const unauthorizedPage = await unauthorizedCtx.newPage()

    try {
      await unauthorizedPage.goto('/')
      await signUpViaModal(unauthorizedPage)

      // Try to view lender1's agreement (with wrong other user id)
      await unauthorizedPage.goto(`/agreement/${gardenMessageId}?userId=999999`)

      // Wait for the component to load and show authorization error
      await unauthorizedPage.waitForSelector('.empty-state', { timeout: 15_000 })

      // Should show "You don't have access to this agreement."
      await expect(unauthorizedPage.locator('.empty-state')).toBeVisible({
        timeout: 10_000,
      })
      await expect(
        unauthorizedPage.getByText("You don't have access to this agreement.")
      ).toBeVisible()
    } finally {
      await unauthorizedCtx.close()
    }
  })

  test('lender can fill in agreement terms and see draft status', async ({
    page,
  }) => {
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    // Navigate to agreement page
    await page.goto(`/agreement/${gardenMessageId}?userId=0`)

    // Should show "Draft" status banner
    await expect(page.locator('.status-banner.draft')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/Draft — fill in the terms/)).toBeVisible()

    // Fill in the agreement terms
    await page.locator('#whatToGrow').fill('Tomatoes, herbs, and lettuce')
    await page.locator('#accessTimes').fill('Weekends and Wednesday evenings')
    await page
      .locator('#otherTerms')
      .fill('Please water on Mondays if we cannot visit.')

    // Verify text was entered
    await expect(page.locator('#whatToGrow')).toHaveValue(
      'Tomatoes, herbs, and lettuce'
    )
    await expect(page.locator('#accessTimes')).toHaveValue(
      'Weekends and Wednesday evenings'
    )
    await expect(page.locator('#otherTerms')).toHaveValue(
      'Please water on Mondays if we cannot visit.'
    )
  })

  test('lender can send agreement to tender', async ({ page, browser }) => {
    // Lender posts a garden
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    // Tender signs up in fresh context
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

      // Tender initiates chat
      await tenderPage.goto(`/garden/${gardenMessageId}`)
      await expect(logoutLink(tenderPage)).toBeVisible({ timeout: 10_000 })
      await tenderPage.getByRole('button', { name: 'Send message' }).click()
      await expect(tenderPage).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      // Send a message so lender sees tender in chat list
      const messageText = `Interested in your garden! (${Date.now()})`
      await tenderPage
        .locator('#chatmessage')
        .fill(messageText, { timeout: 30_000 })
      await tenderPage.getByRole('button', { name: 'Send' }).click()
      await expect(tenderPage.getByText(messageText).first()).toBeVisible({
        timeout: 10_000,
      })
    } finally {
      await tenderCtx.close()
    }

    // Wait for batch processor to add tender message to lender's chat list
    await waitForChatEntry(page, 'Interested in your garden!')

    // Lender navigates to chat with tender
    await page.getByText('Interested in your garden!').first().click()
    await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 10_000 })

    // Lender clicks "Start agreement" button
    await expect(
      page.getByRole('button', { name: 'Start agreement' })
    ).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Start agreement' }).click()

    // Should navigate to agreement page
    await expect(page).toHaveURL(/\/agreement\/\d+/, { timeout: 10_000 })

    // Lender fills in terms
    await page.locator('#whatToGrow').fill('Vegetables and herbs')
    await page.locator('#accessTimes').fill('Tuesday evenings and Saturdays')
    await page.locator('#otherTerms').fill('No pesticides please.')

    // Lender sends agreement to tender
    await page.getByRole('button', { name: 'Send to tender' }).click()

    // Should show "Sending..." then navigate back to chat
    await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })
  })

  test('agreement terms persist after page reload', async ({ page }) => {
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    // Navigate to agreement page
    await page.goto(`/agreement/${gardenMessageId}?userId=0`)
    await expect(page.locator('.status-banner.draft')).toBeVisible({
      timeout: 10_000,
    })

    // Fill in terms
    const whatToGrow = 'Cucumbers and courgettes'
    const accessTimes = 'Sundays only'
    const otherTerms = 'Weekly visits required'

    await page.locator('#whatToGrow').fill(whatToGrow)
    await page.locator('#accessTimes').fill(accessTimes)
    await page.locator('#otherTerms').fill(otherTerms)

    // Click "Send to tender" to save terms
    await page.getByRole('button', { name: 'Send to tender' }).click()

    // Wait for navigation back to chat (implicitly saves terms)
    await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

    // Navigate back to agreement page
    await page.goBack()
    await expect(page).toHaveURL(/\/agreement\/\d+/, { timeout: 10_000 })

    // Terms should still be there
    await expect(page.locator('#whatToGrow')).toHaveValue(whatToGrow)
    await expect(page.locator('#accessTimes')).toHaveValue(accessTimes)
    await expect(page.locator('#otherTerms')).toHaveValue(otherTerms)
  })

  test('ChatMessagePromised card shows in chat after agreement is proposed', async ({
    page,
    browser,
  }) => {
    // Lender posts a garden
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    // Tender signs up and messages lender
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
      await tenderPage.goto(`/garden/${gardenMessageId}`)
      await expect(logoutLink(tenderPage)).toBeVisible({ timeout: 10_000 })
      await tenderPage.getByRole('button', { name: 'Send message' }).click()
      await expect(tenderPage).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      const messageText = `Interested! (${Date.now()})`
      await tenderPage
        .locator('#chatmessage')
        .fill(messageText, { timeout: 30_000 })
      await tenderPage.getByRole('button', { name: 'Send' }).click()
      await expect(tenderPage.getByText(messageText).first()).toBeVisible({
        timeout: 10_000,
      })
    } finally {
      await tenderCtx.close()
    }

    // Wait for message to appear on lender's chat list
    await waitForChatEntry(page, 'Interested!')

    // Lender opens chat and starts agreement
    await page.getByText('Interested!').first().click()
    await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 10_000 })

    // Click "Start agreement"
    await page.getByRole('button', { name: 'Start agreement' }).click()
    await expect(page).toHaveURL(/\/agreement\/\d+/, { timeout: 10_000 })

    // Fill and send agreement
    await page.locator('#whatToGrow').fill('Tomatoes')
    await page.locator('#accessTimes').fill('Weekends')
    await page.getByRole('button', { name: 'Send to tender' }).click()

    // Back to chat, should see ChatMessagePromised
    await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

    // Look for the promised card with agreement details
    await expect(page.locator('.lat-promised')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Garden sharing agreement')).toBeVisible()
    await expect(page.getByText('Awaiting acceptance')).toBeVisible()

    // Should have "View agreement" button
    const viewAgreementBtn = page.getByRole('link', { name: /View agreement/ })
    await expect(viewAgreementBtn).toBeVisible()
  })

  test('tender can accept agreement', async ({ page, browser }) => {
    // Lender posts garden and proposes agreement
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

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
      await tenderPage.goto(`/garden/${gardenMessageId}`)
      await tenderPage.getByRole('button', { name: 'Send message' }).click()
      await expect(tenderPage).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      const msg = `Tender message (${Date.now()})`
      await tenderPage.locator('#chatmessage').fill(msg)
      await tenderPage.getByRole('button', { name: 'Send' }).click()
      await expect(tenderPage.getByText(msg).first()).toBeVisible({
        timeout: 10_000,
      })
    } finally {
      await tenderCtx.close()
    }

    // Lender sets up agreement
    await waitForChatEntry(page, 'Tender message')
    await page.getByText('Tender message').first().click()
    await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 10_000 })

    await page.getByRole('button', { name: 'Start agreement' }).click()
    await expect(page).toHaveURL(/\/agreement\/\d+/, { timeout: 10_000 })

    await page.locator('#whatToGrow').fill('Test vegetables')
    await page.locator('#accessTimes').fill('Test times')
    await page.getByRole('button', { name: 'Send to tender' }).click()

    // Tender now accepts agreement
    await tenderPage.reload()
    await expect(tenderPage.locator('.lat-promised')).toBeVisible({
      timeout: 10_000,
    })

    // Click "View agreement" from the Promised card
    const agreementLink = tenderPage
      .getByRole('link', { name: /View agreement/ })
      .first()
    await agreementLink.click()
    await expect(tenderPage).toHaveURL(/\/agreement\/\d+/, { timeout: 10_000 })

    // Should see "proposed" status
    await expect(tenderPage.locator('.status-banner.proposed')).toBeVisible({
      timeout: 10_000,
    })

    // Should see the terms filled by lender
    await expect(tenderPage.locator('#whatToGrow')).toHaveValue(
      'Test vegetables'
    )
    await expect(tenderPage.locator('#accessTimes')).toHaveValue('Test times')

    // Should see "Accept and confirm" button
    await expect(
      tenderPage.getByRole('button', { name: 'Accept and confirm' })
    ).toBeVisible()

    // Tender accepts
    await tenderPage.getByRole('button', { name: 'Accept and confirm' }).click()

    // Should show success message
    await expect(tenderPage.getByText(/Agreement confirmed/)).toBeVisible({
      timeout: 10_000,
    })

    // Should show "confirmed" status banner
    await expect(tenderPage.locator('.status-banner.confirmed')).toBeVisible()
    await expect(
      tenderPage.getByText(/Both of you are good to go/)
    ).toBeVisible()
  })

  test('lender can update terms after proposing (before tender accepts)', async ({
    page,
    browser,
  }) => {
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

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
      await tenderPage.goto(`/garden/${gardenMessageId}`)
      await tenderPage.getByRole('button', { name: 'Send message' }).click()
      await expect(tenderPage).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      const msg = `Hello! (${Date.now()})`
      await tenderPage.locator('#chatmessage').fill(msg)
      await tenderPage.getByRole('button', { name: 'Send' }).click()
    } finally {
      await tenderCtx.close()
    }

    await waitForChatEntry(page, 'Hello!')
    await page.getByText('Hello!').first().click()

    // Lender proposes agreement
    await page.getByRole('button', { name: 'Start agreement' }).click()
    await page.locator('#whatToGrow').fill('Original terms')
    await page.locator('#accessTimes').fill('Original times')
    await page.getByRole('button', { name: 'Send to tender' }).click()
    await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

    // Lender goes back to agreement page
    await page.goBack()
    await expect(page).toHaveURL(/\/agreement\/\d+/, { timeout: 10_000 })

    // Should see "proposed" status with "Update terms" button
    await expect(page.locator('.status-banner.proposed')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Update terms' })
    ).toBeVisible()

    // Update the terms
    await page.locator('#whatToGrow').fill('Updated vegetables')
    await page.getByRole('button', { name: 'Update terms' }).click()

    // Should show success message
    await expect(page.getByText('Terms updated.')).toBeVisible({
      timeout: 10_000,
    })

    // Terms should still reflect the update
    await expect(page.locator('#whatToGrow')).toHaveValue('Updated vegetables')
  })

  test('tender can suggest changes to agreement', async ({ page, browser }) => {
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

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
      await tenderPage.goto(`/garden/${gardenMessageId}`)
      await tenderPage.getByRole('button', { name: 'Send message' }).click()

      const msg = `Interested! (${Date.now()})`
      await tenderPage.locator('#chatmessage').fill(msg)
      await tenderPage.getByRole('button', { name: 'Send' }).click()
    } finally {
      await tenderCtx.close()
    }

    await waitForChatEntry(page, 'Interested!')
    await page.getByText('Interested!').first().click()

    // Lender proposes
    await page.getByRole('button', { name: 'Start agreement' }).click()
    await page.locator('#whatToGrow').fill('Tomatoes only')
    await page.locator('#accessTimes').fill('Mondays')
    await page.getByRole('button', { name: 'Send to tender' }).click()
    await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

    // Tender views and modifies agreement
    await tenderPage.reload()
    await expect(tenderPage.locator('.lat-promised')).toBeVisible({
      timeout: 10_000,
    })
    const agreementLink = tenderPage
      .getByRole('link', { name: /View agreement/ })
      .first()
    await agreementLink.click()

    // Modify the terms
    await expect(tenderPage.locator('#whatToGrow')).toHaveValue('Tomatoes only')
    await tenderPage.locator('#whatToGrow').fill('Tomatoes and herbs')
    await tenderPage.locator('#accessTimes').fill('Mondays and Thursdays')

    // Suggest changes
    await expect(
      tenderPage.getByRole('button', { name: 'Suggest changes' })
    ).toBeVisible()
    await tenderPage.getByRole('button', { name: 'Suggest changes' }).click()

    // Should show success message
    await expect(tenderPage.getByText(/Changes sent/)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('lender can withdraw proposed agreement', async ({ page, browser }) => {
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

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
      await tenderPage.goto(`/garden/${gardenMessageId}`)
      await tenderPage.getByRole('button', { name: 'Send message' }).click()

      const msg = `Hi! (${Date.now()})`
      await tenderPage.locator('#chatmessage').fill(msg)
      await tenderPage.getByRole('button', { name: 'Send' }).click()
    } finally {
      await tenderCtx.close()
    }

    await waitForChatEntry(page, 'Hi!')
    await page.getByText('Hi!').first().click()

    // Propose agreement
    await page.getByRole('button', { name: 'Start agreement' }).click()
    await page.locator('#whatToGrow').fill('Some terms')
    await page.getByRole('button', { name: 'Send to tender' }).click()
    await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

    // Go back to agreement
    await page.goBack()
    await expect(page).toHaveURL(/\/agreement\/\d+/, { timeout: 10_000 })

    // Should see withdraw button
    await expect(page.getByRole('button', { name: 'Withdraw' })).toBeVisible()
    await page.getByRole('button', { name: 'Withdraw' }).click()

    // Should show success message
    await expect(page.getByText('Agreement withdrawn.')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('"Back to chat" button navigates to chat room', async ({ page }) => {
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    // Navigate to agreement page
    await page.goto(`/agreement/${gardenMessageId}?userId=0`)
    await expect(page.locator('.status-banner.draft')).toBeVisible({
      timeout: 10_000,
    })

    // Click back to chat
    const backBtn = page.getByRole('button', { name: /Back to chat/ })
    await expect(backBtn).toBeVisible()
    await backBtn.click()

    // Should navigate to /chats
    await expect(page).toHaveURL(/\/chats/, { timeout: 10_000 })
  })

  test('ChatMessagePromised shows confirmed status with checkmark', async ({
    page,
    browser,
  }) => {
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

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
      await tenderPage.goto(`/garden/${gardenMessageId}`)
      await tenderPage.getByRole('button', { name: 'Send message' }).click()

      const msg = `Message (${Date.now()})`
      await tenderPage.locator('#chatmessage').fill(msg)
      await tenderPage.getByRole('button', { name: 'Send' }).click()
    } finally {
      await tenderCtx.close()
    }

    await waitForChatEntry(page, 'Message')
    await page.getByText('Message').first().click()

    // Lender proposes and sends agreement
    await page.getByRole('button', { name: 'Start agreement' }).click()
    await page.locator('#whatToGrow').fill('Confirmed test terms')
    await page.getByRole('button', { name: 'Send to tender' }).click()

    // Tender accepts
    await tenderPage.reload()
    const agreementLink = tenderPage
      .getByRole('link', { name: /View agreement/ })
      .first()
    await agreementLink.click()
    await tenderPage.getByRole('button', { name: 'Accept and confirm' }).click()
    await expect(tenderPage.getByText(/Agreement confirmed/)).toBeVisible({
      timeout: 10_000,
    })

    // Go back to chat, should see confirmed status in card
    await tenderPage.getByRole('button', { name: /Back to chat/ }).click()
    await expect(tenderPage).toHaveURL(/\/chats/, { timeout: 10_000 })

    // The Promised card should show "Both parties have agreed" and "View agreement ✓"
    await expect(tenderPage.getByText('Both parties have agreed')).toBeVisible()
    const viewBtn = tenderPage.getByRole('link', { name: /View agreement ✓/ })
    await expect(viewBtn).toBeVisible()
  })
})
