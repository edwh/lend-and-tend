// @ts-check
const { test, expect, signUpViaModal, logoutLink, generateTestEmail, waitForChatEntry, markUserAsPaid, fillLocationPicker } = require('./lat-fixtures')

/**
 * Sign up a new user, post a garden via /lend, and return the created message ID.
 * Captures the message ID by intercepting the PUT /message API response.
 */
async function signUpAndPostGarden(page, subject = 'E2E Chat Test Garden') {
  await page.goto('/')
  await signUpViaModal(page)
  await markUserAsPaid(page)
  await page.goto('/lend')
  await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

  await page.locator('#subject').fill(subject)
  await page.locator('#about').fill('A garden created for E2E chat testing.')
  await fillLocationPicker(page)
  await page.locator('#phone').fill('07700 900030')

  // Intercept the PUT /message response to capture the new message ID
  const messageResponsePromise = page.waitForResponse(
    resp =>
      resp.url().includes('/apiv2/message') &&
      resp.request().method() === 'PUT'
  )

  await page.getByRole('button', { name: 'Post my garden' }).click()

  const messageResp = await messageResponsePromise
  const messageBody = await messageResp.json()
  const gardenMessageId = messageBody?.id ?? null

  await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 })

  return gardenMessageId
}

test.describe('Chat: tender messages lender about a garden', () => {
  test('garden listing shows Send message button for authenticated users', async ({ page, browser }) => {
    // Lender posts a garden
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    // Tender signs up in a fresh context and navigates to the garden listing
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

      await expect(tenderPage.getByRole('button', { name: 'Send message' })).toBeVisible({ timeout: 10_000 })
    } finally {
      await tenderCtx.close()
    }
  })

  test('clicking Send message navigates to a chat room', async ({ page, browser }) => {
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
      await expect(logoutLink(tenderPage)).toBeVisible({ timeout: 10_000 })

      await expect(tenderPage.getByRole('button', { name: 'Send message' })).toBeVisible({ timeout: 15_000 })
      await tenderPage.getByRole('button', { name: 'Send message' }).click()

      // "Send message" navigates to /chats/{roomId} (Freegle chat page)
      await expect(tenderPage).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })
    } finally {
      await tenderCtx.close()
    }
  })

  test('tender can send a message and it appears in the chat', async ({ page, browser }) => {
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
      await expect(logoutLink(tenderPage)).toBeVisible({ timeout: 10_000 })

      await tenderPage.getByRole('button', { name: 'Send message' }).click()
      await expect(tenderPage).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      // Type and send a message
      const messageText = `Hello, I am interested in your garden! (${Date.now()})`
      await tenderPage.locator('#chatmessage').fill(messageText, { timeout: 30_000 })
      await tenderPage.getByRole('button', { name: 'Send', exact: true }).click()

      // The sent message should appear in the chat pane
      await expect(tenderPage.getByText(messageText).first()).toBeVisible({ timeout: 10_000 })
    } finally {
      await tenderCtx.close()
    }
  })

  test('lender sees message from tender in their chat list', async ({ page, browser }) => {
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    const tenderCtx = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })
    const tenderPage = await tenderCtx.newPage()

    const messageText = `Looking to tend your garden! (${Date.now()})`

    try {
      await tenderPage.goto('/')
      await signUpViaModal(tenderPage)
      await markUserAsPaid(tenderPage)
      await tenderPage.goto(`/garden/${gardenMessageId}`)
      await expect(logoutLink(tenderPage)).toBeVisible({ timeout: 10_000 })

      await tenderPage.getByRole('button', { name: 'Send message' }).click()
      await expect(tenderPage).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      await tenderPage.locator('#chatmessage').fill(messageText, { timeout: 30_000 })
      await tenderPage.getByRole('button', { name: 'Send', exact: true }).click()
      await expect(tenderPage.getByText(messageText).first()).toBeVisible({ timeout: 10_000 })
    } finally {
      await tenderCtx.close()
    }

    // Lender checks their chats. Messages are created with processingrequired=1 and
    // only become visible to recipients once the batch worker processes them (every 60s).
    // Poll with reloads until the entry appears.
    await waitForChatEntry(page, messageText)
  })

  test('lender can reply and tender sees the reply', async ({ page, browser }) => {
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()

    // Tender sends first message
    const tenderCtx = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })
    const tenderPage = await tenderCtx.newPage()

    const tenderMsg = `Tender message ${Date.now()}`
    const lenderReply = `Lender reply ${Date.now()}`

    try {
      await tenderPage.goto('/')
      await signUpViaModal(tenderPage)
      await markUserAsPaid(tenderPage)
      await tenderPage.goto(`/garden/${gardenMessageId}`)
      await expect(logoutLink(tenderPage)).toBeVisible({ timeout: 10_000 })

      await tenderPage.getByRole('button', { name: 'Send message' }).click()
      await expect(tenderPage).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      await tenderPage.locator('#chatmessage').fill(tenderMsg, { timeout: 30_000 })
      await tenderPage.getByRole('button', { name: 'Send', exact: true }).click()
      await expect(tenderPage.getByText(tenderMsg).first()).toBeVisible({ timeout: 10_000 })

      // Wait for the batch worker to process the tender's message, then click into the chat
      await waitForChatEntry(page, tenderMsg)
      await page.getByText(tenderMsg).first().click()
      await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 10_000 })

      await page.locator('#chatmessage').fill(lenderReply, { timeout: 20_000 })
      await page.getByRole('button', { name: 'Send', exact: true }).click()
      await expect(page.getByText(lenderReply).first()).toBeVisible({ timeout: 10_000 })

      // Tender sees lender's reply once it's processed. Poll with reloads.
      await waitForChatEntry(tenderPage, lenderReply)
    } finally {
      await tenderCtx.close()
    }
  })

  test('Profile button in chat opens the L&T modal, not the Freegle one', async ({ page, browser }) => {
    // Regression: explicit `import('~/components/ProfileModal')` was loading
    // upstream Freegle's ProfileInfo (with thumbs, "Freegler since",
    // offers/wanteds/replies/collected). Removing the explicit imports lets
    // Nuxt auto-import the lat override.
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
      await expect(logoutLink(tenderPage)).toBeVisible({ timeout: 10_000 })
      await tenderPage.getByRole('button', { name: 'Send message' }).click()
      await expect(tenderPage).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      // Click the Profile button in the chat header
      await tenderPage.getByRole('button', { name: 'Profile' }).click()

      // L&T modal shows "Member since" (not Freegle's "Freegler since")
      await expect(
        tenderPage.getByText(/Member since/i)
      ).toBeVisible({ timeout: 10_000 })

      // Freegle's stat boxes must NOT appear
      await expect(tenderPage.getByText(/Freegler since/i)).not.toBeVisible()
      await expect(tenderPage.getByText(/IN THE LAST 90 DAYS/i)).not.toBeVisible()
    } finally {
      await tenderCtx.close()
    }
  })

  test('Promised chat message renders L&T "Garden agreement" card (not Freegle "You promised X:")', async ({ page, browser }) => {
    // Ralph #7: Freegle's ChatMessagePromised shows "You promised <name>:" /
    // "Good news! You've been promised this:" with a ChatMessageCard. L&T's
    // override renders a minimal "Garden agreement" card with an agreement
    // status and a View button. Verify the lat override resolves correctly.
    const gardenMessageId = await signUpAndPostGarden(page)
    expect(gardenMessageId).not.toBeNull()
    // Capture the lender's JWT so we can POST /message {action:Promise} via
    // page.request later. We also need the lender's userid.
    const lenderAuth = await page.evaluate(() => {
      const a = JSON.parse(localStorage.auth || '{}')
      return { jwt: a?.auth?.jwt, userid: a?.auth?.persistent?.userid }
    })

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
      const tenderAuth = await tenderPage.evaluate(() => {
        const a = JSON.parse(localStorage.auth || '{}')
        return { jwt: a?.auth?.jwt, userid: a?.auth?.persistent?.userid }
      })

      await tenderPage.goto(`/garden/${gardenMessageId}`)
      await tenderPage.getByRole('button', { name: 'Send message' }).click()
      await expect(tenderPage).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })

      // Send a message so the lender has a conversation with the tender.
      await tenderPage.locator('#chatmessage').fill(`Hi, interested! ${Date.now()}`)
      await tenderPage.getByRole('button', { name: 'Send', exact: true }).click()

      // Lender makes a promise to the tender via POST /apiv2/message {action:Promise}
      const apiBase = process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2'
      // Re-read lender JWT in case it was refreshed during the flow.
      const freshLenderAuth = await page.evaluate(() => {
        const a = JSON.parse(localStorage.auth || '{}')
        return { jwt: a?.auth?.jwt, userid: a?.auth?.persistent?.userid }
      })
      const promiseResp = await page.request.post(
        `${apiBase}/message?jwt=${encodeURIComponent(freshLenderAuth.jwt)}`,
        {
          data: {
            id: gardenMessageId,
            userid: tenderAuth.userid,
            action: 'Promise',
          },
        }
      )
      if (!promiseResp.ok()) {
        const body = await promiseResp.text()
        console.error('Promise POST failed:', promiseResp.status(), body)
      }
      expect(promiseResp.ok()).toBeTruthy()

      // The Promised chat message goes through the batch worker (~60s) before
      // it's visible to the tender. Poll with reloads up to a few minutes.
      let found = false
      for (let attempt = 0; attempt < 8; attempt++) {
        await tenderPage.reload()
        try {
          await expect(
            tenderPage.locator('.lat-promised, .chat-message-promised')
          ).toBeVisible({ timeout: 20_000 })
          found = true
          break
        } catch {
          // not yet — try again
        }
      }
      expect(found, 'Promised card never appeared after 8 reload attempts').toBe(true)

      // L&T's card uses class `lat-promised`. Freegle's uses
      // `chat-message-promised`. Assert ONLY our class is present, AND none of
      // Freegle's wording appears.
      const latCount = await tenderPage.locator('.lat-promised').count()
      expect(latCount).toBeGreaterThan(0)

      await expect(tenderPage.getByText(/You promised/i)).not.toBeVisible()
      await expect(tenderPage.getByText(/Good news!.*been promised/i)).not.toBeVisible()
      await expect(tenderPage.getByText(/Garden agreement/i)).toBeVisible()
    } finally {
      await tenderCtx.close()
    }
  })

  test('Send address button opens the L&T modal (not Freegle AddressModal)', async ({ page, browser }) => {
    // Regression: ChatFooter used to load Freegle's AddressModal (postcode
    // entry + PAF dropdown). LatSendAddressModal pulls addresses straight from
    // the user's garden listings instead.
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

      // Click the "Send address" action chip (desktop variant — there's also
      // a mobile copy of the label which Playwright strict mode would refuse).
      await tenderPage.getByRole('button', { name: 'Send address' }).click()

      // L&T modal title — Freegle's AddressModal title is "Please choose an
      // address" / "Address Book". Ours is "Send your garden address".
      await expect(
        tenderPage.getByRole('heading', { name: 'Send your garden address' })
      ).toBeVisible({ timeout: 10_000 })

      // And the user has no gardens (they're the tender), so we expect the
      // empty-state message.
      await expect(
        tenderPage.getByText(/don't have any gardens with a saved address/i)
      ).toBeVisible()
    } finally {
      await tenderCtx.close()
    }
  })

  test('Send address uses chat type=Address when garden has a pafid', async ({ page, browser }) => {
    // End-to-end: lender posts a garden, tender signs up + opens a chat with
    // them, lender clicks Send address. The resulting chat message must use
    // Freegle's Address chat type (addressid set on the chat message) — NOT
    // a plain Default message — when the garden's textbody carries a pafid.
    //
    // If the location picker's PAF dropdown isn't available in this test env
    // (postcode has no PAF data, picker falls back to manual entry), no pafid
    // is captured and the test correctly verifies the plain-text fallback.
    const apiBase = process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2'

    // 1) Lender posts a garden.
    const gardenId = await signUpAndPostGarden(page)
    expect(gardenId).not.toBeNull()

    // Capture lender's JWT so we can read message details from the API.
    const lenderAuth = await page.evaluate(() => {
      const a = JSON.parse(localStorage.auth || '{}')
      return { jwt: a?.auth?.jwt, userid: a?.auth?.persistent?.userid }
    })

    // Read the garden's textbody — did the PAF picker emit a pafid?
    const apiResp = await page.request.get(
      `${apiBase}/message/${gardenId}?jwt=${encodeURIComponent(lenderAuth.jwt)}`
    )
    const apiBody = await apiResp.json()
    let textbody = {}
    try { textbody = JSON.parse(apiBody?.textbody || '{}') } catch { /* noop */ }
    const expectedPafid = textbody.pafid || null

    // 2) Tender signs up, opens a chat with the lender (so the lender has
    //    someone to send the address to).
    const tenderCtx = await browser.newContext({
      baseURL: process.env.LAT_BASE_URL || 'http://localhost:4002',
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })
    let chatId = null
    try {
      const tenderPage = await tenderCtx.newPage()
      await tenderPage.goto('/')
      await signUpViaModal(tenderPage)
      await markUserAsPaid(tenderPage)
      await tenderPage.goto(`/garden/${gardenId}`)
      await tenderPage.getByRole('button', { name: 'Send message' }).click()
      await expect(tenderPage).toHaveURL(/\/chats\/\d+/, { timeout: 15_000 })
      chatId = parseInt(tenderPage.url().match(/\/chats\/(\d+)/)[1], 10)
      await tenderPage.locator('#chatmessage').fill(`Interested! ${Date.now()}`)
      await tenderPage.getByRole('button', { name: 'Send', exact: true }).click()
    } finally {
      await tenderCtx.close()
    }
    expect(chatId).toBeTruthy()

    // 3) Lender opens the chat directly — we already know chatId from the
    //    tender side. (We used to wait for the chat to appear in the
    //    lender's chat-list view via the batch worker, but the chat list
    //    rendering uses non-link markup and the wait was unreliable. The
    //    chat itself exists immediately; only the tender's MESSAGE needs
    //    batch processing to be visible — and we don't need to see it for
    //    this test, we just need the chat room to send an address into.)
    await page.goto(`/chats/${chatId}`)
    await expect(page.locator('#chatmessage')).toBeVisible({ timeout: 15_000 })

    // Capture POST /apiv2/address if it happens, AND the chat send PATCH/POST.
    const addressPostPromise = page
      .waitForResponse(
        (r) =>
          r.url().includes('/apiv2/address') &&
          r.request().method() === 'POST',
        { timeout: 5_000 }
      )
      .catch(() => null)
    const chatSendPromise = page.waitForResponse(
      (r) =>
        r.url().match(/\/apiv2\/chat\/\d+\/message/) &&
        r.request().method() === 'POST'
    )

    await page.getByRole('button', { name: 'Send address' }).click()
    // The modal autoloads gardens. Wait for the Send-this-address button.
    await expect(
      page.getByRole('button', { name: 'Send this address' })
    ).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Send this address' }).click()

    const [addressPost, chatSend] = await Promise.all([
      addressPostPromise,
      chatSendPromise,
    ])

    const chatSendReq = chatSend.request().postData()
    const chatSendBody = JSON.parse(chatSendReq || '{}')

    if (expectedPafid) {
      // PAF was used at post time → modal MUST create a real Address record
      // and send with addressid (no message text).
      expect(addressPost, 'address create POST must fire').not.toBeNull()
      const addrBody = await addressPost.json()
      expect(addrBody?.id).toBeTruthy()
      expect(chatSendBody.addressid, 'chat.send must include addressid').toBe(
        addrBody.id
      )
      expect(chatSendBody.message ?? null).toBeNull()
    } else {
      // No pafid (manual-entry fallback) → plain-text message.
      expect(chatSendBody.message).toMatch(/My garden address:/i)
      expect(chatSendBody.addressid ?? null).toBeNull()
    }
  })
})
