/*
 * Shared helpers for seeding Lend & Tend demo states that the pr-walkthrough
 * framework then screenshots read-only. Used by seed-states.cjs (agreement
 * walkthrough) and seed-journey.cjs (full lender + tender journey).
 *
 * Everything here drives the real app through the browser exactly as a member
 * would, reusing the e2e fixtures (passwordless sign-in via Mailpit, the
 * concession route to become a paying member, the location picker).
 */
const { execSync } = require('child_process')
const { expect } = require('@playwright/test')
const {
  signUpViaModal,
  loginViaModal,
  markUserAsPaid,
  logoutLink,
  fillLocationPicker,
} = require('../tests/e2e/lat/lat-fixtures')

const BATCH = process.env.LAT_BATCH_CONTAINER || 'lat-batch-worker'
const MAILPIT_URL = process.env.LAT_MAILPIT_URL || 'http://localhost:4025'

const DEFAULT_ABOUT =
  'A south-facing plot with established beds and a shed. I love it but can no longer keep on top of it, and would love someone to grow here.'

/**
 * Chat messages only reach the other party once the batch worker has processed
 * them, and a new listing only reaches other members (map, agreement lookup)
 * once the spatial index job has run. Run both now rather than waiting for the
 * scheduler.
 */
function flushBatch() {
  for (const cmd of [
    'chats:process-incoming',
    'messages:update-spatial-index',
  ]) {
    try {
      execSync(`docker exec ${BATCH} php /var/www/html/artisan ${cmd}`, {
        stdio: 'ignore',
        timeout: 60_000,
      })
    } catch {
      /* best-effort: the scheduler also runs these */
    }
  }
}

/** Become a member able to message (concession route), retrying while the app settles. */
async function payUser(page, tries = 6) {
  await page.goto('/join').catch(() => {})
  await page.waitForTimeout(2000)
  for (let i = 0; i < tries; i++) {
    try {
      await markUserAsPaid(page)
      return
    } catch (e) {
      if (i === tries - 1) throw e
      await page.waitForTimeout(2500)
    }
  }
}

function userId(page) {
  return page.evaluate(() => {
    try {
      const a = JSON.parse(localStorage.auth || '{}')
      return a?.auth?.persistent?.userid ?? null
    } catch {
      return null
    }
  })
}

async function selectIfPresent(page, selector, value) {
  const el = page.locator(selector)
  if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
    await el.selectOption(value)
  }
}

async function fillIfPresent(page, selector, value) {
  const el = page.locator(selector)
  if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
    await el.fill(value)
  }
}

/**
 * Post a garden as the signed-in lender. With `photo` (a path), uploads it
 * through the real PhotoUploader (tus → lat-tusd → POST /apiv2/image) before
 * posting, so the listing carries a genuine attachment.
 * Returns the new message id.
 */
async function postGarden(page, subject, opts = {}) {
  await page.goto('/lend')
  await expect(logoutLink(page)).toBeVisible({ timeout: 15_000 })
  await page.locator('#subject').fill(subject)
  await page.locator('#about').fill(opts.about || DEFAULT_ABOUT)
  await selectIfPresent(page, '#gardenSize', { index: 2 })
  await selectIfPresent(page, '#sunExposure', { index: 1 })
  await selectIfPresent(page, '#waterAccess', { index: 1 })
  await selectIfPresent(page, '#accessRoute', { index: 1 })
  await fillLocationPicker(page, opts.postcode, opts.address)
  await page.locator('#phone').fill('07700 900100')
  await fillIfPresent(
    page,
    '#arrangement',
    opts.arrangement ||
      'Help with the mowing in return for use of the veg patch, or pure goodwill.'
  )
  await fillIfPresent(
    page,
    '#restrictions',
    opts.restrictions || 'No commercial growing, and please no bonfires.'
  )

  if (opts.photo) {
    const registered = page.waitForResponse(
      (x) =>
        x.url().includes('/apiv2/image') &&
        x.request().method() === 'POST' &&
        x.ok(),
      { timeout: 60_000 }
    )
    await page.locator('input[type="file"]').first().setInputFiles(opts.photo)
    await registered
    await expect(page.locator('.featured-photo img').first()).toBeVisible({
      timeout: 30_000,
    })
    await page.waitForTimeout(800)
  }

  const resp = page.waitForResponse(
    (x) => x.url().includes('/apiv2/message') && x.request().method() === 'PUT',
    { timeout: 30_000 }
  )
  await page.getByRole('button', { name: 'Post my garden' }).click()
  let id = null
  try {
    id = (await (await resp).json())?.id ?? null
  } catch {
    /* ignore */
  }
  await expect(page).toHaveURL(/\/profile/, { timeout: 25_000 })
  return id
}

/** The tender opens a listing and sends the first message. Returns the chat id. */
async function tenderMessage(page, gardenId, text) {
  await page.goto(`/garden/${gardenId}`)
  await expect(logoutLink(page)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 20_000 })
  const chatId = (page.url().match(/chats\/(\d+)/) || [])[1] || null
  const msg = text || "Hi! I'd love to help bring your garden back to life."
  await page.locator('#chatmessage').fill(msg, { timeout: 30_000 })
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByText(msg.slice(0, 28)).first()).toBeVisible({
    timeout: 15_000,
  })
  return chatId
}

/** A reply from whoever is signed in, in an existing chat. */
async function replyInChat(page, chatId, text) {
  flushBatch()
  await page.goto(`/chats/${chatId}`)
  await expect(page.locator('#chatmessage')).toBeVisible({ timeout: 30_000 })
  await page.locator('#chatmessage').fill(text)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByText(text.slice(0, 28)).first()).toBeVisible({
    timeout: 15_000,
  })
}

const API_BASE = process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2'

/**
 * A new listing only becomes visible to OTHER members (map, and the chat's
 * "Propose agreement" lookup) once the batch job has added it to the spatial
 * index (`messages:update-spatial-index`, every few minutes). Poll the public
 * query until the listing is there.
 */
async function waitForListingIndexed(
  lenderId,
  gardenId,
  timeoutMs = 8 * 60_000
) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(
        `${API_BASE}/user/${lenderId}/message?active=true`
      )
      const list = await res.json()
      if (
        Array.isArray(list) &&
        list.some((m) => Number(m.id) === Number(gardenId))
      ) {
        return
      }
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000))
  }
  throw new Error(
    `listing ${gardenId} never appeared in the public index for user ${lenderId}`
  )
}

/** The lender proposes the garden-sharing agreement from the chat. */
async function lenderPropose(page, chatId, { lenderId, gardenId } = {}) {
  if (lenderId && gardenId) await waitForListingIndexed(lenderId, gardenId)
  flushBatch()
  await page.goto(`/chats/${chatId}`)
  await expect(
    page.getByRole('button', { name: 'Propose agreement' })
  ).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Propose agreement' }).click()
  await expect(page).toHaveURL(/\/agreement\/\d+/, { timeout: 15_000 })
  await page
    .locator('#whatToGrow')
    .fill('Tomatoes, courgettes, beans and herbs')
  await page.locator('#accessTimes').fill('Weekends and Wednesday evenings')
  await page.getByLabel('Pets allowed in the garden').selectOption('no')
  await page.getByLabel('Tender may use the water supply').selectOption('yes')
  await page
    .getByLabel('Some produce shared with the lender')
    .selectOption('yes')
  await page.getByRole('button', { name: 'Suggest 4 months' }).click()
  await page.getByRole('button', { name: 'Send to tender' }).click()
  await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 20_000 })
}

/** The tender opens the proposed agreement from the chat and confirms it. */
async function tenderAccept(page, chatId) {
  flushBatch()
  await page.goto(`/chats/${chatId}`)
  const card = page.locator('a.btn-view-agreement').first()
  await expect(card).toBeVisible({ timeout: 30_000 })
  await card.click()
  await expect(page).toHaveURL(/\/agreement\/\d+/, { timeout: 15_000 })
  await page.getByRole('button', { name: 'Accept and confirm' }).click()
  await expect(page.getByText(/Agreement confirmed/).first()).toBeVisible({
    timeout: 20_000,
  })
  await page.waitForTimeout(1500)
}

/**
 * Ask for a sign-in link as a returning member (so Mailpit holds a real
 * "sign-in link" email), finish signing in, and return the Mailpit message id
 * so the email itself can be screenshotted.
 */
async function requestSignInEmail(page, email) {
  const since = Date.now() - 2_000
  await page.goto('/')
  await loginViaModal(page, email)
  const res = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(
      `to:"${email}"`
    )}&limit=5`
  )
  const list = await res.json()
  const fresh = (list.messages || []).filter(
    (m) => new Date(m.Created).getTime() >= since
  )
  return (fresh[0] || (list.messages || [])[0] || {}).ID || null
}

/** Dismiss the cookie banner (fixed to the bottom) so it cannot cover buttons. */
async function dismissCookieBanner(page) {
  const btn = page.getByRole('button', { name: 'Essential only' })
  if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(300)
  }
}

/** Sign up a member in a fresh context. Returns { ctx, page, email, fullname }. */
async function newMember(browser, ctxOpts, { role, fullname, pay = true }) {
  const ctx = await browser.newContext(ctxOpts)
  const page = await ctx.newPage()
  await page.goto('/')
  const who = await signUpViaModal(page, { role, fullname })
  await dismissCookieBanner(page)
  if (pay) await payUser(page)
  return { ctx, page, email: who.email, fullname: who.fullname }
}

module.exports = {
  BATCH,
  MAILPIT_URL,
  DEFAULT_ABOUT,
  flushBatch,
  payUser,
  userId,
  postGarden,
  tenderMessage,
  replyInChat,
  lenderPropose,
  tenderAccept,
  requestSignInEmail,
  newMember,
  dismissCookieBanner,
}
