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
 *
 * The helpers live in seed-lib.cjs (shared with seed-journey.cjs).
 */
const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')
const { LAT_BASE_URL } = require('../tests/e2e/lat/lat-fixtures')
const lib = require('./seed-lib.cjs')

const OUT = path.resolve(__dirname, '../../pr-walkthrough/prs/lat-agreement')

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })
  const ctxOpts = {
    baseURL: LAT_BASE_URL,
    viewport: { width: 1280, height: 720 },
    storageState: { cookies: [], origins: [] },
  }
  const ids = {}
  try {
    /* ── Journey 1: proposed ─────────────────────────────────────────── */
    const l1 = await lib.newMember(browser, ctxOpts, {
      role: 'lender',
      fullname: 'Priya (garden lender)',
    })
    ids.GARDEN1_ID = await lib.postGarden(
      l1.page,
      'Sunny back garden, ready for veg'
    )
    ids.LENDER1_ID = await lib.userId(l1.page)

    const t1 = await lib.newMember(browser, ctxOpts, {
      role: 'tender',
      fullname: 'Sam (garden tender)',
    })
    ids.CHAT1_ID = await lib.tenderMessage(t1.page, ids.GARDEN1_ID)

    await lib.lenderPropose(l1.page, ids.CHAT1_ID)
    // Tender1 just needs to be logged in (proposed view derives from textbody).
    await t1.ctx.storageState({ path: path.join(OUT, '.auth-tender1.json') })

    /* ── Journey 2: confirmed ────────────────────────────────────────── */
    const l2 = await lib.newMember(browser, ctxOpts, {
      role: 'lender',
      fullname: 'Aisha (garden lender)',
    })
    ids.GARDEN2_ID = await lib.postGarden(
      l2.page,
      'Walled garden with greenhouse'
    )
    ids.LENDER2_ID = await lib.userId(l2.page)

    const t2 = await lib.newMember(browser, ctxOpts, {
      role: 'tender',
      fullname: 'Marco (garden tender)',
    })
    const chat2 = await lib.tenderMessage(t2.page, ids.GARDEN2_ID)

    await lib.lenderPropose(l2.page, chat2)
    await lib.tenderAccept(t2.page, chat2)
    await t2.ctx.storageState({ path: path.join(OUT, '.auth-tender2.json') })

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
