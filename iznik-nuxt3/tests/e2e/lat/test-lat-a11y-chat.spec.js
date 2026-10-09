// @ts-check
//
// Accessibility of the conversation side of Lend & Tend: the chat list, a
// conversation, the garden-sharing agreement, the check-in page, the sign-in
// modal and the cookie banner. Each page is audited with axe-core (WCAG 2.1
// A/AA + best practice) at desktop and phone widths and fails on any serious
// or critical violation. Keyboard and tap-target behaviour that axe cannot see
// is asserted directly.
//
// The data (two members, a garden, a conversation) is created here so the spec
// is self-sufficient; it does not depend on the walkthrough seed.
//
const path = require('path')
const fs = require('fs')
const os = require('os')
const {
  test,
  expect,
  signUpViaModal,
  logoutLink,
  markUserAsPaid,
  fillLocationPicker,
  LAT_BASE_URL,
} = require('./lat-fixtures')
const { AxeBuilder } = require(path.resolve(
  __dirname,
  '../../../lat/node_modules/@axe-core/playwright'
))

const DESKTOP = { width: 1280, height: 900 }
const PHONE = { width: 390, height: 844 }
// Dev-only chrome that is not part of the product.
const AXE_EXCLUDES = ['nuxt-devtools-frame', '#nuxt-devtools-container']

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lat-a11y-'))
const seeded = {
  gardenId: null,
  chatId: null,
  tenderId: null,
  lenderState: null,
  tenderState: null,
}

async function audit(page, include) {
  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'best-practice',
  ])
  for (const sel of AXE_EXCLUDES) builder = builder.exclude(sel)
  if (include) builder = builder.include(include)
  const { violations } = await builder.analyze()
  const serious = violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact)
  )
  const describe = (v) =>
    `[${v.impact}] ${v.id}: ${v.help} -> ${v.nodes
      .slice(0, 2)
      .map((n) => n.target.join(' '))
      .join(' | ')}`
  expect(serious.map(describe), 'serious/critical axe violations').toEqual([])
  return violations
}

function newContext(browser, viewport, storageState) {
  return browser.newContext({
    baseURL: LAT_BASE_URL,
    viewport,
    storageState: storageState || { cookies: [], origins: [] },
    reducedMotion: 'reduce', // see lat-fixtures: Bootstrap's smooth scroll
  })
}

/** The cookie banner sits over the bottom of every page; put it away. */
async function dismissCookies(page) {
  const btn = page.getByRole('button', { name: 'Essential only' })
  if (await btn.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await btn.click().catch(() => {})
  }
}

async function postGarden(page, subject) {
  await page.goto('/lend')
  await expect(logoutLink(page)).toBeVisible({ timeout: 15_000 })
  await page.locator('#subject').fill(subject)
  await page.locator('#about').fill('Raised beds and a shed, needs a tender.')
  await fillLocationPicker(page)
  await page.locator('#phone').fill('07700 900100')
  const created = page.waitForResponse(
    (r) => r.url().includes('/apiv2/message') && r.request().method() === 'PUT',
    { timeout: 30_000 }
  )
  await page.getByRole('button', { name: 'Post my garden' }).click()
  const id = (await (await created).json())?.id
  await expect(page).toHaveURL(/\/profile/, { timeout: 25_000 })
  return id
}

test.describe('Conversation-side accessibility', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(6 * 60_000)

  test('seed: a lender, a tender and a conversation', async ({ browser }) => {
    const lenderCtx = await newContext(browser, DESKTOP)
    const lender = await lenderCtx.newPage()
    await lender.goto('/')
    await signUpViaModal(lender, { role: 'lender', fullname: 'A11y Lender' })
    await dismissCookies(lender)
    await markUserAsPaid(lender)
    seeded.gardenId = await postGarden(lender, 'A11y test garden')
    seeded.lenderState = path.join(tmp, 'lender.json')
    await lenderCtx.storageState({ path: seeded.lenderState })
    await lenderCtx.close()

    const tenderCtx = await newContext(browser, DESKTOP)
    const tender = await tenderCtx.newPage()
    await tender.goto('/')
    await signUpViaModal(tender, { role: 'tender', fullname: 'A11y Tender' })
    await dismissCookies(tender)
    await markUserAsPaid(tender)
    await tender.goto(`/garden/${seeded.gardenId}`)
    await tender.getByRole('button', { name: 'Send message' }).click()
    await expect(tender).toHaveURL(/\/chats\/\d+/, { timeout: 20_000 })
    seeded.chatId = tender.url().match(/chats\/(\d+)/)[1]
    await tender
      .locator('#chatmessage')
      .fill('Hello! Is the garden still free?')
    await tender.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(tender.getByText('still free').first()).toBeVisible({
      timeout: 15_000,
    })
    seeded.tenderState = path.join(tmp, 'tender.json')
    await tenderCtx.storageState({ path: seeded.tenderState })
    seeded.tenderId = await tender.evaluate(() => {
      try {
        return JSON.parse(localStorage.auth || '{}')?.auth?.persistent?.userid
      } catch {
        return null
      }
    })
    await tenderCtx.close()
    expect(seeded.gardenId && seeded.chatId && seeded.tenderId).toBeTruthy()
  })

  for (const [vpName, viewport] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ]) {
    test(`chat list and conversation pass axe (${vpName})`, async ({
      browser,
    }) => {
      const ctx = await newContext(browser, viewport, seeded.tenderState)
      const page = await ctx.newPage()
      await page.goto('/chats')
      // The list truncates names in the DOM, so wait for the message snippet.
      await expect(
        page.getByText('Is the garden still free').first()
      ).toBeVisible({ timeout: 20_000 })
      await audit(page)
      await page.goto(`/chats/${seeded.chatId}`)
      await expect(page.locator('#chatmessage')).toBeVisible({
        timeout: 20_000,
      })
      await audit(page)
      await ctx.close()
    })

    test(`agreement and check-in pass axe (${vpName})`, async ({ browser }) => {
      const ctx = await newContext(browser, viewport, seeded.lenderState)
      const page = await ctx.newPage()
      // The lender's draft agreement for this garden with this tender.
      await page.goto(`/agreement/${seeded.gardenId}?userId=${seeded.tenderId}`)
      await expect(page.locator('.status-banner')).toBeVisible({
        timeout: 20_000,
      })
      await audit(page)
      await page.goto(`/checkin/${seeded.gardenId}`)
      await expect(
        page.locator('.status-options').or(page.getByText(/sign in/i).first())
      ).toBeVisible({ timeout: 20_000 })
      await audit(page)
      await ctx.close()
    })
  }

  test('sign-in modal: axe clean, focus trapped, Escape closes and returns focus', async ({
    browser,
  }) => {
    const ctx = await newContext(browser, DESKTOP)
    const page = await ctx.newPage()
    await page.goto('/')
    const opener = page.getByRole('button', { name: 'Sign in' }).first()
    await expect(opener).toBeVisible({ timeout: 15_000 })
    await expect(async () => {
      await opener.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1_500 })
    }).toPass({ timeout: 15_000 })
    const dialog = page.getByRole('dialog')
    await expect(dialog).toHaveAttribute('aria-labelledby', 'lat-modal-title')
    await audit(page, '.lat-modal-overlay')

    // Focus starts on the first field.
    await expect(dialog.locator('#lat-fullname')).toBeFocused()
    // Tab never leaves the dialog: cycle through every control and back.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(
        () => !!document.activeElement?.closest('[role=dialog]')
      )
      expect(inside, `focus left the dialog after ${i + 1} tabs`).toBe(true)
    }
    // Escape closes it and focus goes back to the button that opened it.
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()
    await ctx.close()
  })

  test('cookie banner: axe clean, and it never covers the agreement buttons on a phone', async ({
    browser,
  }) => {
    const ctx = await newContext(browser, PHONE, seeded.lenderState)
    // The seed dismissed the bar; bring it back for this member.
    await ctx.clearCookies({ name: 'lat_cookie_consent' })
    const page = await ctx.newPage()
    await page.goto(`/agreement/${seeded.gardenId}?userId=${seeded.tenderId}`)
    const banner = page.locator('.lat-cookie-consent')
    await expect(banner).toBeVisible({ timeout: 20_000 })
    await audit(page, '.lat-cookie-consent')

    // Body is padded by the banner's height, so the last control can scroll
    // clear of it.
    const send = page
      .getByRole('button', { name: /Send to tender|Accept and confirm/ })
      .first()
    // The agreement page settles (auth boot, then the form) before we measure;
    // scrolling a page that is still navigating destroyed the evaluate context.
    await expect(send).toBeVisible({ timeout: 20_000 })
    await send.scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(send).toBeVisible()
    const [btn, bar] = await Promise.all([
      send.boundingBox(),
      banner.boundingBox(),
    ])
    expect(
      btn && bar && btn.y + btn.height <= bar.y + 1,
      'button hidden under the cookie banner'
    ).toBe(true)
    // No horizontal scrolling on a phone.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    expect(overflow).toBe(false)
    await ctx.close()
  })

  test('phone: chat footer actions are real buttons with 44px targets', async ({
    browser,
  }) => {
    const ctx = await newContext(browser, PHONE, seeded.lenderState)
    const page = await ctx.newPage()
    await page.goto(`/chats/${seeded.chatId}`)
    await expect(page.locator('#chatmessage')).toBeVisible({ timeout: 20_000 })
    for (const name of ['Propose agreement', 'Send address', 'Photo']) {
      const btn = page.getByRole('button', { name }).first()
      await expect(btn).toBeVisible()
      const box = await btn.boundingBox()
      expect(box.width, `${name} width`).toBeGreaterThanOrEqual(44)
      expect(box.height, `${name} height`).toBeGreaterThanOrEqual(44)
    }
    // The message box is reachable by keyboard and Send has a name.
    await page.locator('#chatmessage').focus()
    await expect(page.locator('#chatmessage')).toBeFocused()
    await expect(
      page.getByRole('button', { name: 'Send', exact: true })
    ).toBeVisible()
    await ctx.close()
  })
})
