/*
 * Seed the full Lend & Tend journey, both sides, for the pr-walkthrough
 * framework to screenshot read-only (pr-walkthrough/prs/lat-journey/).
 *
 * Three independent journeys so every captured screen is clean:
 *   journey 1 → lender posts a garden WITH A REAL PHOTO, tender messages,
 *               lender replies, lender proposes the agreement (PROPOSED)
 *   journey 2 → the same, and the tender accepts (CONFIRMED + timeline)
 *   journey 3 → tender messages, lender replies, nothing proposed yet
 *               (the lender's "respond" screen with Propose agreement /
 *               Send address still available)
 * plus one unpaid member (the /join membership page before paying) and a
 * returning-member sign-in email in Mailpit (passwordless sign-in).
 *
 * Writes into pr-walkthrough/prs/lat-journey/:
 *   .auth-lender{1,2,3}.json .auth-tender{1,2,3}.json .auth-unpaid.json
 *   ids.json  { GARDEN1_ID, CHAT1_ID, LENDER1_ID, TENDER1_ID, GARDEN2_ID,
 *               CHAT2_ID, LENDER2_ID, TENDER2_ID, GARDEN3_ID, CHAT3_ID,
 *               LENDER3_ID, TENDER3_ID, MAIL1_ID, PHOTO }
 *
 *   LAT_BASE_URL=http://localhost:4002 node walkthrough-out/seed-journey.cjs
 */
const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')
const { LAT_BASE_URL } = require('../tests/e2e/lat/lat-fixtures')
const lib = require('./seed-lib.cjs')

const OUT = path.resolve(__dirname, '../../pr-walkthrough/prs/lat-journey')
const PHOTO =
  process.env.LAT_WALKTHROUGH_PHOTO || path.join(OUT, 'real-garden.jpg')
// LAT_SEED_ONLY=3 (or "1,3", "mail", "unpaid") re-seeds just those parts and
// merges their ids into the existing ids.json, so one broken journey can be
// redone without re-creating everything.
const ONLY = (process.env.LAT_SEED_ONLY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const wanted = (key) => ONLY.length === 0 || ONLY.includes(String(key))

async function journey(browser, ctxOpts, n, people, opts) {
  const lender = await lib.newMember(browser, ctxOpts, {
    role: 'lender',
    fullname: people.lender,
  })
  const gardenId = await lib.postGarden(lender.page, opts.subject, {
    about: opts.about,
    photo: PHOTO,
    postcode: opts.postcode,
    address: opts.address,
  })
  const lenderId = await lib.userId(lender.page)

  const tender = await lib.newMember(browser, ctxOpts, {
    role: 'tender',
    fullname: people.tender,
  })
  const chatId = await lib.tenderMessage(
    tender.page,
    gardenId,
    opts.firstMessage
  )
  const tenderId = await lib.userId(tender.page)

  await lib.replyInChat(lender.page, chatId, opts.reply)

  if (opts.propose) {
    await lib.lenderPropose(lender.page, chatId, { lenderId, gardenId })
  }
  if (opts.accept) await lib.tenderAccept(tender.page, chatId)

  lib.flushBatch()
  await lender.ctx.storageState({
    path: path.join(OUT, `.auth-lender${n}.json`),
  })
  await tender.ctx.storageState({
    path: path.join(OUT, `.auth-tender${n}.json`),
  })

  return {
    [`GARDEN${n}_ID`]: gardenId,
    [`CHAT${n}_ID`]: chatId,
    [`LENDER${n}_ID`]: lenderId,
    [`TENDER${n}_ID`]: tenderId,
    lenderEmail: lender.email,
    lenderPage: lender.page,
  }
}

async function main() {
  if (!fs.existsSync(PHOTO)) throw new Error(`photo not found: ${PHOTO}`)
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
  const idsPath = path.join(OUT, 'ids.json')
  const ids = { PHOTO }
  if (ONLY.length && fs.existsSync(idsPath)) {
    Object.assign(ids, JSON.parse(fs.readFileSync(idsPath, 'utf8')))
  }
  let j1 = null
  try {
    if (wanted(1))
      j1 = await journey(
        browser,
        ctxOpts,
        1,
        { lender: 'Priya Shah', tender: 'Sam Okafor' },
        {
          subject: 'Sunny back garden with raised beds',
          about:
            'Four raised beds, a small greenhouse and a water butt, in a south-facing back garden. I built it all a few years ago and now struggle to keep up. It would make me happy to see it full of veg again.',
          firstMessage:
            "Hi Priya! Your raised beds look wonderful. I've just moved to a flat with no outside space and would love to grow veg this year. Could I come and take a look?",
          reply:
            "Hi Sam, that sounds great. I'm around most weekends if you'd like to pop round and see the garden. Shall we agree a few simple ground rules first?",
          propose: true,
        }
      )
    if (j1) {
      Object.assign(ids, j1)
      ids.LENDER1_EMAIL = j1.lenderEmail
      delete ids.lenderEmail
      delete ids.lenderPage
    }

    if (wanted(2)) {
      const j2 = await journey(
        browser,
        ctxOpts,
        2,
        { lender: 'Aisha Khan', tender: 'Marco Rossi' },
        {
          subject: 'Walled garden with greenhouse',
          firstMessage:
            "Hello! I'm a keen grower without a garden and would love to help with yours.",
          reply: "Lovely to hear from you, Marco. Let's sort out an agreement.",
          propose: true,
          accept: true,
        }
      )
      Object.assign(ids, j2)
      delete ids.lenderEmail
      delete ids.lenderPage
    }

    // Same people, same garden, same opening messages as journey 1, but no
    // agreement proposed yet: this is the lender's "respond" screen, with the
    // Propose agreement / Send address actions still available. Separate accounts
    // under the same names keep the video's story coherent.
    if (wanted(3)) {
      const j3 = await journey(
        browser,
        ctxOpts,
        3,
        { lender: 'Priya Shah', tender: 'Sam Okafor' },
        {
          subject: 'Sunny back garden with raised beds',
          about:
            'Four raised beds, a small greenhouse and a water butt, in a south-facing back garden. I built it all a few years ago and now struggle to keep up. It would make me happy to see it full of veg again.',
          firstMessage:
            "Hi Priya! Your raised beds look wonderful. I've just moved to a flat with no outside space and would love to grow veg this year. Could I come and take a look?",
          reply:
            "Hi Sam, that sounds great. I'm around most weekends if you'd like to pop round and see the garden. Shall we agree a few simple ground rules first?",
        }
      )
      Object.assign(ids, j3)
      delete ids.lenderEmail
      delete ids.lenderPage
    }

    // The sign-in email for a returning member (passwordless sign-in).
    if (wanted('mail') && ids.LENDER1_EMAIL) {
      const ret = await browser.newContext(ctxOpts)
      const retPage = await ret.newPage()
      ids.MAIL1_ID = await lib.requestSignInEmail(retPage, ids.LENDER1_EMAIL)
      await ret.close()
    }

    // A brand-new member who has not paid yet: the /join membership page.
    if (wanted('unpaid')) {
      const unpaid = await lib.newMember(browser, ctxOpts, {
        role: 'tender',
        fullname: 'Jess Morgan',
        pay: false,
      })
      await unpaid.ctx.storageState({
        path: path.join(OUT, '.auth-unpaid.json'),
      })
    }

    fs.writeFileSync(idsPath, JSON.stringify(ids, null, 2))
    console.log('SEED_OK', JSON.stringify(ids))
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error('SEED_FAILED:', e && e.message ? e.message : e)
  process.exit(1)
})
