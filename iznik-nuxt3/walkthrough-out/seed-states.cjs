/*
 * Seed clean L&T states for the pr-walkthrough framework to screenshot, and
 * save tender auth storageStates. Two independent journeys so each captured
 * screen is clean:
 *   journey 1 → a PROPOSED agreement (for garden / chat / agreement-proposed)
 *   journey 2 → a CONFIRMED agreement (for the confirmed + timeline shot)
 *
 * Writes:
 *   pr-walkthrough/prs/lat-agreement/.auth-tender1.json
 *   pr-walkthrough/prs/lat-agreement/.auth-tender2.json
 *   pr-walkthrough/prs/lat-agreement/ids.json   { GARDEN1_ID, CHAT1_ID, LENDER1_ID, GARDEN2_ID, LENDER2_ID }
 *
 *   LAT_BASE_URL=http://localhost:4002 node walkthrough-out/seed-states.cjs
 */
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const { chromium, expect } = require('@playwright/test')
const {
  signUpViaModal,
  loginViaModal,
  markUserAsPaid,
  logoutLink,
  fillLocationPicker,
  generateTestEmail,
  LAT_BASE_URL,
} = require('../tests/e2e/lat/lat-fixtures')

const OUT = path.resolve(__dirname, '../../pr-walkthrough/prs/lat-agreement')
const BATCH = process.env.LAT_BATCH_CONTAINER || 'lend-and-tend-batch-worker'

function flushBatch() {
  try {
    execSync(`docker exec ${BATCH} php /var/www/html/artisan chats:process-incoming`, {
      stdio: 'ignore',
      timeout: 30_000,
    })
  } catch {
    /* best-effort */
  }
}

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

async function userId(page) {
  return page.evaluate(() => {
    try {
      const a = JSON.parse(localStorage.auth || '{}')
      return a?.auth?.persistent?.userid ?? null
    } catch {
      return null
    }
  })
}

async function postGarden(page, subject) {
  await page.goto('/lend')
  await expect(logoutLink(page)).toBeVisible({ timeout: 15_000 })
  await page.locator('#subject').fill(subject)
  await page
    .locator('#about')
    .fill(
      'A south-facing plot with established beds and a shed. Would love someone to grow here.'
    )
  await fillLocationPicker(page)
  await page.locator('#phone').fill('07700 900100')
  const r = page.locator('#restrictions')
  if (await r.isVisible({ timeout: 1500 }).catch(() => false)) {
    await r.fill('No commercial growing, and please no bonfires.')
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

async function tenderMessage(page, gardenId) {
  await page.goto(`/garden/${gardenId}`)
  await expect(logoutLink(page)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 20_000 })
  const chatId = (page.url().match(/chats\/(\d+)/) || [])[1] || null
  await page
    .locator('#chatmessage')
    .fill("Hi! I'd love to help bring your garden back to life.", { timeout: 30_000 })
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByText('bring your garden back to life').first()).toBeVisible({
    timeout: 15_000,
  })
  return chatId
}

async function lenderPropose(page, chatId) {
  flushBatch()
  await page.goto(`/chats/${chatId}`)
  await expect(page.getByRole('button', { name: 'Sign agreement' })).toBeVisible({
    timeout: 30_000,
  })
  await page.getByRole('button', { name: 'Sign agreement' }).click()
  await expect(page).toHaveURL(/\/agreement\/\d+/, { timeout: 15_000 })
  await page.locator('#whatToGrow').fill('Tomatoes, courgettes, beans and herbs')
  await page.locator('#accessTimes').fill('Weekends and Wednesday evenings')
  await page.getByLabel('Pets allowed in the garden').selectOption('no')
  await page.getByLabel('Tender may use the water supply').selectOption('yes')
  await page.getByLabel('Some produce shared with the lender').selectOption('yes')
  await page.getByRole('button', { name: 'Suggest 4 months' }).click()
  await page.getByRole('button', { name: 'Send to tender' }).click()
  await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 20_000 })
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })
  const ctxOpts = {
    baseURL: LAT_BASE_URL,
    viewport: { width: 1280, height: 720 },
    storageState: { cookies: [], origins: [] },
  }
  const ids = {}
  try {
    /* ── Journey 1: proposed ─────────────────────────────────────────── */
    const l1c = await browser.newContext(ctxOpts)
    const l1 = await l1c.newPage()
    await l1.goto('/')
    await signUpViaModal(l1, { role: 'lender', fullname: 'Priya (garden lender)' })
    await payUser(l1)
    ids.GARDEN1_ID = await postGarden(l1, 'Sunny back garden, ready for veg')
    ids.LENDER1_ID = await userId(l1)

    const t1c = await browser.newContext(ctxOpts)
    const t1 = await t1c.newPage()
    await t1.goto('/')
    await signUpViaModal(t1, { role: 'tender', fullname: 'Sam (garden tender)' })
    await payUser(t1)
    ids.CHAT1_ID = await tenderMessage(t1, ids.GARDEN1_ID)

    await lenderPropose(l1, ids.CHAT1_ID)
    // Tender1 just needs to be logged in (proposed view derives from textbody).
    await t1c.storageState({ path: path.join(OUT, '.auth-tender1.json') })

    /* ── Journey 2: confirmed ────────────────────────────────────────── */
    const l2c = await browser.newContext(ctxOpts)
    const l2 = await l2c.newPage()
    await l2.goto('/')
    await signUpViaModal(l2, { role: 'lender', fullname: 'Aisha (garden lender)' })
    await payUser(l2)
    ids.GARDEN2_ID = await postGarden(l2, 'Walled garden with greenhouse')
    ids.LENDER2_ID = await userId(l2)

    const t2c = await browser.newContext(ctxOpts)
    const t2 = await t2c.newPage()
    await t2.goto('/')
    await signUpViaModal(t2, { role: 'tender', fullname: 'Marco (garden tender)' })
    await payUser(t2)
    const chat2 = await tenderMessage(t2, ids.GARDEN2_ID)

    await lenderPropose(l2, chat2)

    // Tender2 accepts → confirmed.
    flushBatch()
    await t2.goto(`/chats/${chat2}`)
    const card = t2.locator('a.btn-view-agreement').first()
    await expect(card).toBeVisible({ timeout: 30_000 })
    await card.click()
    await expect(t2).toHaveURL(/\/agreement\/\d+/, { timeout: 15_000 })
    await t2.getByRole('button', { name: 'Accept and confirm' }).click()
    await expect(t2.getByText(/Agreement confirmed/).first()).toBeVisible({ timeout: 20_000 })
    await t2.waitForTimeout(1500)
    await t2c.storageState({ path: path.join(OUT, '.auth-tender2.json') })

    fs.writeFileSync(path.join(OUT, 'ids.json'), JSON.stringify(ids, null, 2))
    console.log('SEED_OK', JSON.stringify(ids))
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error('SEED_FAILED:', e && e.message ? e.message : e)
  process.exit(1)
})
