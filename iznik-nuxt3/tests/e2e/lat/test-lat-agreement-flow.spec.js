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

    // /agreement/[id].vue redirects unauthenticated users to /join in
    // onMounted (see pages/agreement/[id].vue).
    await expect(page).toHaveURL(/\/join/, { timeout: 10_000 })
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
      await unauthorizedPage.waitForSelector('.empty-state', {
        timeout: 15_000,
      })

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
      await tenderPage
        .getByRole('button', { name: 'Send', exact: true })
        .click()
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

    // Lender clicks "Sign agreement" button
    await expect(
      page.getByRole('button', { name: 'Sign agreement' })
    ).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Sign agreement' }).click()

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

  test('agreement terms persist after page reload', async ({
    page,
    browser,
  }) => {
    // We need a real tender userId — Send to tender calls promise/chat
    // APIs that require a valid counter-party.
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    const tenderCtx = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })
    try {
      const tenderPage = await tenderCtx.newPage()
      await tenderPage.goto('/')
      await signUpViaModal(tenderPage)
      await markUserAsPaid(tenderPage)
      // Read tender's userid from localStorage so we can address the
      // agreement directly without depending on chat propagation.
      // localStorage.auth.auth.persistent.userid is where Pinia stores it.
      const tenderId = await tenderPage.evaluate(() => {
        try {
          const a = JSON.parse(localStorage.auth || '{}')
          return a?.auth?.persistent?.userid ?? null
        } catch {
          return null
        }
      })
      expect(tenderId, 'tender userid from localStorage').toBeTruthy()

      // Lender navigates to agreement form addressed to the real tender.
      await page.goto(`/agreement/${gardenMessageId}?userId=${tenderId}`)
      await expect(page.locator('.status-banner.draft')).toBeVisible({
        timeout: 10_000,
      })

      const whatToGrow = 'Cucumbers and courgettes'
      const accessTimes = 'Sundays only'
      const otherTerms = 'Weekly visits required'

      await page.locator('#whatToGrow').fill(whatToGrow)
      await page.locator('#accessTimes').fill(accessTimes)
      await page.locator('#otherTerms').fill(otherTerms)

      // Send to tender — saves terms server-side AND navigates back to chat.
      await page.getByRole('button', { name: 'Send to tender' }).click()
      await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      // Reload the agreement page (clean fetch, not just history pop).
      await page.goto(`/agreement/${gardenMessageId}?userId=${tenderId}`)
      await expect(page.locator('#whatToGrow')).toHaveValue(whatToGrow, {
        timeout: 10_000,
      })
      await expect(page.locator('#accessTimes')).toHaveValue(accessTimes)
      await expect(page.locator('#otherTerms')).toHaveValue(otherTerms)
    } finally {
      await tenderCtx.close()
    }
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
      await tenderPage
        .getByRole('button', { name: 'Send', exact: true })
        .click()
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

    // Click "Sign agreement"
    await page.getByRole('button', { name: 'Sign agreement' }).click()
    await expect(page).toHaveURL(/\/agreement\/\d+/, { timeout: 10_000 })

    // Fill and send agreement
    await page.locator('#whatToGrow').fill('Tomatoes')
    await page.locator('#accessTimes').fill('Weekends')
    await page.getByRole('button', { name: 'Send to tender' }).click()

    // Back to chat, should see ChatMessagePromised
    await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

    // Look for the promised card with agreement details
    await expect(page.locator('.lat-promised')).toBeVisible({ timeout: 10_000 })
    // ChatMessagePromised renders "Garden agreement" as the title.
    await expect(page.getByText('Garden agreement')).toBeVisible()
    await expect(page.getByText('Awaiting acceptance')).toBeVisible()

    // Should have a link to view the agreement details — ChatMessagePromised
    // renders this as "View →" (or "View ✓" when confirmed).
    const viewAgreementBtn = page
      .locator('.lat-promised')
      .getByRole('link', { name: /^View/ })
    await expect(viewAgreementBtn).toBeVisible()
  })

  // The Go API privacy-filters `promises` out of GET /apiv2/message/{id} for
  // non-lender viewers, so the tender couldn't previously see proposed/accept
  // state. Worked around entirely in the lat layer (AgreementForm.vue +
  // ChatMessagePromised.vue): the lender stamps the agreement status into the
  // message textbody (readable by both parties) and the tender records their
  // acceptance in their own user settings — so neither relies on the
  // privacy-filtered promise.
  test('tender can accept agreement', async ({ page, browser }) => {
    // Read the lender's userid from localStorage so the tender can address
    // the agreement page directly — avoids a 60s+ wait on chat-promise
    // batch propagation, which is verified separately by the
    // "ChatMessagePromised card shows in chat after agreement is proposed"
    // test on the LENDER side.
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()
    const lenderId = await page.evaluate(() => {
      try {
        const a = JSON.parse(localStorage.auth || '{}')
        return a?.auth?.persistent?.userid ?? null
      } catch {
        return null
      }
    })
    expect(lenderId, 'lender userid from localStorage').toBeTruthy()

    const tenderCtx = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })

    try {
      const tenderPage = await tenderCtx.newPage()
      await tenderPage.goto('/')
      await signUpViaModal(tenderPage)
      await markUserAsPaid(tenderPage)
      const tenderId = await tenderPage.evaluate(() => {
        try {
          const a = JSON.parse(localStorage.auth || '{}')
          return a?.auth?.persistent?.userid ?? null
        } catch {
          return null
        }
      })
      expect(tenderId, 'tender userid from localStorage').toBeTruthy()

      // Lender proposes the agreement (using the real tenderId).
      await page.goto(`/agreement/${gardenMessageId}?userId=${tenderId}`)
      await expect(page.locator('.status-banner.draft')).toBeVisible({
        timeout: 10_000,
      })
      await page.locator('#whatToGrow').fill('Test vegetables')
      await page.locator('#accessTimes').fill('Test times')
      await page.getByRole('button', { name: 'Send to tender' }).click()
      await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      // Tender goes straight to the agreement page (skipping the chat-
      // navigation step that depends on batch propagation).
      await tenderPage.goto(`/agreement/${gardenMessageId}?userId=${lenderId}`)
      await expect(tenderPage.locator('.status-banner.proposed')).toBeVisible({
        timeout: 10_000,
      })
      await expect(tenderPage.locator('#whatToGrow')).toHaveValue(
        'Test vegetables'
      )
      await expect(tenderPage.locator('#accessTimes')).toHaveValue('Test times')

      await expect(
        tenderPage.getByRole('button', { name: 'Accept and confirm' })
      ).toBeVisible()
      await tenderPage
        .getByRole('button', { name: 'Accept and confirm' })
        .click()

      await expect(
        tenderPage.getByText(/Agreement confirmed/).first()
      ).toBeVisible({
        timeout: 10_000,
      })
      await expect(tenderPage.locator('.status-banner.confirmed')).toBeVisible()
      await expect(
        tenderPage.getByText(/Both of you are good to go/)
      ).toBeVisible()
    } finally {
      await tenderCtx.close()
    }
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
      await tenderPage
        .getByRole('button', { name: 'Send', exact: true })
        .click()
    } finally {
      await tenderCtx.close()
    }

    await waitForChatEntry(page, 'Hello!')
    await page.getByText('Hello!').first().click()

    // Lender proposes agreement
    await page.getByRole('button', { name: 'Sign agreement' }).click()
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

  // SKIPPED — same Go API privacy filter as "tender can accept agreement"
  // above. See plans/active/lat-adversarial-review.md.
  test.skip('tender can suggest changes to agreement', async ({
    page,
    browser,
  }) => {
    // Direct-nav pattern (same as "tender can accept agreement"):
    // sign up both parties, propose from lender, navigate tender straight
    // to the agreement page. Avoids fragile chat batch propagation.
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()
    const lenderId = await page.evaluate(() => {
      try {
        const a = JSON.parse(localStorage.auth || '{}')
        return a?.auth?.persistent?.userid ?? null
      } catch {
        return null
      }
    })
    expect(lenderId).toBeTruthy()

    const tenderCtx = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })

    try {
      const tenderPage = await tenderCtx.newPage()
      await tenderPage.goto('/')
      await signUpViaModal(tenderPage)
      await markUserAsPaid(tenderPage)
      const tenderId = await tenderPage.evaluate(() => {
        try {
          const a = JSON.parse(localStorage.auth || '{}')
          return a?.auth?.persistent?.userid ?? null
        } catch {
          return null
        }
      })
      expect(tenderId).toBeTruthy()

      // Lender proposes
      await page.goto(`/agreement/${gardenMessageId}?userId=${tenderId}`)
      await expect(page.locator('.status-banner.draft')).toBeVisible({
        timeout: 10_000,
      })
      await page.locator('#whatToGrow').fill('Tomatoes only')
      await page.locator('#accessTimes').fill('Mondays')
      await page.getByRole('button', { name: 'Send to tender' }).click()
      await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      // Tender views & modifies
      await tenderPage.goto(`/agreement/${gardenMessageId}?userId=${lenderId}`)
      await expect(tenderPage.locator('#whatToGrow')).toHaveValue(
        'Tomatoes only',
        { timeout: 10_000 }
      )
      await tenderPage.locator('#whatToGrow').fill('Tomatoes and herbs')
      await tenderPage.locator('#accessTimes').fill('Mondays and Thursdays')

      await expect(
        tenderPage.getByRole('button', { name: 'Suggest changes' })
      ).toBeVisible()
      await tenderPage.getByRole('button', { name: 'Suggest changes' }).click()

      await expect(tenderPage.getByText(/Changes sent/)).toBeVisible({
        timeout: 10_000,
      })
    } finally {
      await tenderCtx.close()
    }
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
      await tenderPage
        .getByRole('button', { name: 'Send', exact: true })
        .click()
    } finally {
      await tenderCtx.close()
    }

    await waitForChatEntry(page, 'Hi!')
    await page.getByText('Hi!').first().click()

    // Propose agreement
    await page.getByRole('button', { name: 'Sign agreement' }).click()
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

  test('"Back to chat" button navigates back', async ({ page }) => {
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    // Navigate to /chats first so router.back() has somewhere chat-y
    // to return to. (With a real conversation we'd use that chat's id;
    // userId=0 forces goBack() to fall through to router.back().)
    await page.goto('/chats')
    await page.goto(`/agreement/${gardenMessageId}?userId=0`)
    await expect(page.locator('.status-banner.draft')).toBeVisible({
      timeout: 10_000,
    })

    const backBtn = page.getByRole('button', { name: /Back to chat/ })
    await expect(backBtn).toBeVisible()
    await backBtn.click()

    // Should navigate back to /chats (where the user came from).
    await expect(page).toHaveURL(/\/chats/, { timeout: 10_000 })
  })

  // SKIPPED — depends on the tender being able to accept the agreement,
  // which in turn depends on the Go API change documented above (see
  // plans/active/lat-adversarial-review.md → "Tender can't see Garden
  // Sharing Agreement via /message API"). Un-skip when that's resolved.
  test.skip('ChatMessagePromised shows confirmed status with checkmark', async ({
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
      await tenderPage
        .getByRole('button', { name: 'Send', exact: true })
        .click()
    } finally {
      await tenderCtx.close()
    }

    await waitForChatEntry(page, 'Message')
    await page.getByText('Message').first().click()

    // Lender proposes and sends agreement
    await page.getByRole('button', { name: 'Sign agreement' }).click()
    await page.locator('#whatToGrow').fill('Confirmed test terms')
    await page.getByRole('button', { name: 'Send to tender' }).click()

    // Tender accepts. The promised card (ChatMessagePromised) renders "View →"
    // as a.btn-view-agreement; wait for it to propagate into the tender's chat.
    const agreementLink = tenderPage.locator('a.btn-view-agreement').first()
    await expect(async () => {
      await tenderPage.reload()
      await expect(agreementLink).toBeVisible({ timeout: 8_000 })
    }).toPass({ timeout: 120_000 })
    await agreementLink.click()
    await tenderPage.getByRole('button', { name: 'Accept and confirm' }).click()
    await expect(
      tenderPage.getByText(/Agreement confirmed/).first()
    ).toBeVisible({
      timeout: 10_000,
    })

    // Go back to chat, should see confirmed status in card
    await tenderPage.getByRole('button', { name: /Back to chat/ }).click()
    await expect(tenderPage).toHaveURL(/\/chats/, { timeout: 10_000 })

    // The Promised card should now show the confirmed status and "View ✓".
    await expect(tenderPage.getByText('Both parties agreed')).toBeVisible()
    const viewBtn = tenderPage.locator('a.btn-view-agreement', {
      hasText: 'View ✓',
    })
    await expect(viewBtn).toBeVisible()
  })

  test('agreement draft shows structured ground-rule toggles and a review date', async ({
    page,
  }) => {
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    await page.goto(`/agreement/${gardenMessageId}?userId=0`)
    await expect(page.locator('.status-banner.draft')).toBeVisible({
      timeout: 10_000,
    })

    // Three ground-rule toggles (addressed by aria-label) are present.
    await expect(page.getByLabel('Pets allowed in the garden')).toBeVisible()
    await expect(
      page.getByLabel('Tender may use the water supply')
    ).toBeVisible()
    await expect(
      page.getByLabel('Some produce shared with the lender')
    ).toBeVisible()

    // The review date can be set with the quick-suggest button.
    await expect(page.locator('#endDate')).toHaveValue('')
    await page.getByRole('button', { name: 'Suggest 4 months' }).click()
    await expect(page.locator('#endDate')).not.toHaveValue('')
  })

  test("agreement draft prefills 'other terms' from the listing restrictions", async ({
    page,
  }) => {
    const restrictions = 'No commercial growing, no bonfires, no dogs.'

    await page.goto('/')
    await signUpViaModal(page)
    await markUserAsPaid(page)
    await page.goto('/lend')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

    await page.locator('#subject').fill('Prefill Test Garden')
    await page.locator('#about').fill('Garden for prefill testing.')
    await fillLocationPicker(page)
    await page.locator('#phone').fill('07700 900011')
    await page.locator('#restrictions').fill(restrictions)

    const messageResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/apiv2/message') &&
        resp.request().method() === 'PUT'
    )
    await page.getByRole('button', { name: 'Post my garden' }).click()
    const messageResp = await messageResponsePromise
    const gardenMessageId = (await messageResp.json())?.id ?? null
    expect(gardenMessageId).not.toBeNull()
    await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 })

    // Opening a fresh draft should carry the listing restrictions into "other terms".
    await page.goto(`/agreement/${gardenMessageId}?userId=0`)
    await expect(page.locator('#otherTerms')).toHaveValue(restrictions, {
      timeout: 10_000,
    })
  })

  test('review date and ground rules persist after reload', async ({
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
    try {
      const tenderPage = await tenderCtx.newPage()
      await tenderPage.goto('/')
      await signUpViaModal(tenderPage)
      await markUserAsPaid(tenderPage)
      const tenderId = await tenderPage.evaluate(() => {
        try {
          const a = JSON.parse(localStorage.auth || '{}')
          return a?.auth?.persistent?.userid ?? null
        } catch {
          return null
        }
      })
      expect(tenderId, 'tender userid from localStorage').toBeTruthy()

      await page.goto(`/agreement/${gardenMessageId}?userId=${tenderId}`)
      await expect(page.locator('.status-banner.draft')).toBeVisible({
        timeout: 10_000,
      })

      await page.locator('#whatToGrow').fill('Beans and squash')
      await page.locator('#endDate').fill('2026-10-01')
      await page.getByLabel('Pets allowed in the garden').selectOption('yes')
      await page
        .getByLabel('Some produce shared with the lender')
        .selectOption('no')

      await page.getByRole('button', { name: 'Send to tender' }).click()
      await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      await page.goto(`/agreement/${gardenMessageId}?userId=${tenderId}`)
      await expect(page.locator('#endDate')).toHaveValue('2026-10-01', {
        timeout: 10_000,
      })
      await expect(page.getByLabel('Pets allowed in the garden')).toHaveValue(
        'yes'
      )
      await expect(
        page.getByLabel('Some produce shared with the lender')
      ).toHaveValue('no')
    } finally {
      await tenderCtx.close()
    }
  })
})

test.describe('Agreement guidance pages', () => {
  test('/what-to-expect renders the arrangement guide and timeline', async ({
    page,
  }) => {
    await page.goto('/what-to-expect')
    await expect(
      page.getByRole('heading', { name: 'What to expect', level: 1 })
    ).toBeVisible({ timeout: 10_000 })
    // Arrangement guide card + a timeline milestone heading.
    await expect(page.getByText('Introductions')).toBeVisible()
    await expect(page.getByText('Begin garden-sharing')).toBeVisible()
    await expect(page.getByText('Review & reflect')).toBeVisible()
  })

  test('/ground-rules renders the conditions of use', async ({ page }) => {
    await page.goto('/ground-rules')
    await expect(
      page.getByRole('heading', {
        name: 'Garden-sharing ground rules',
        level: 1,
      })
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Conditions of use')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'No excessive noise' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Unauthorised persons' })
    ).toBeVisible()
  })
})
