/*
 * Standalone Playwright driver that records the L&T walkthrough video with
 * natural, human pacing (NOT the test runner — runs via `node`).
 *
 * Flow techniques (generic; candidates for upstreaming into pr-walkthrough):
 *   - progressive typing (pressSequentially) — text appears, never dumped
 *   - smooth-only scrolling with generous settle (no instant scrollIntoView)
 *   - beige canvas + body fade-in so navigations don't flash white
 *   - settle() waits for a real element after every navigation before acting
 *   - captions fade in/out; long backend waits are covered by a caption
 *   - cross-actor state nudged via the batch job → single clean reveal
 *   - fresh context per actor (no auth re-hydration)
 * Segments are concatenated with crossfades by assemble.cjs.
 *
 *   LAT_BASE_URL=http://localhost:4002 node walkthrough-out/run-walkthrough.cjs
 */
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const { chromium, expect } = require('@playwright/test')
const {
  loginViaModal,
  markUserAsPaid,
  fillLocationPicker,
  generateTestEmail,
  LAT_BASE_URL,
} = require('../tests/e2e/lat/lat-fixtures')

const RAW_DIR = path.resolve(__dirname, 'raw')
const BATCH_CONTAINER =
  process.env.LAT_BATCH_CONTAINER || 'lend-and-tend-batch-worker'

/* On every navigation, the Nuxt layer briefly paints the upstream Freegle
 * layout / a logo splash / a blank frame before the L&T layer hydrates. We
 * mask that hydration window: beige canvas + a beige cover that holds over the
 * first ~1s of each page load then fades out, so transitions reveal cleanly. */
const FADE_INIT = () => {
  const apply = () => {
    const s = document.createElement('style')
    s.textContent =
      'html{background:#EDE5D6 !important}' +
      '@keyframes vofadein{from{opacity:0}to{opacity:1}}' +
      'body{animation:vofadein .5s ease both}' +
      '#lat-vo-cover{position:fixed;inset:0;z-index:2147483640;' +
      'background:#EDE5D6;pointer-events:none;transition:opacity .45s ease}'
    ;(document.head || document.documentElement).appendChild(s)
    const c = document.createElement('div')
    c.id = 'lat-vo-cover'
    document.body.appendChild(c)
    setTimeout(() => {
      c.style.opacity = '0'
      setTimeout(() => c.remove(), 500)
    }, 900)
  }
  if (document.body) apply()
  else document.addEventListener('DOMContentLoaded', apply)
}

function flushBatch() {
  try {
    execSync(
      `docker exec ${BATCH_CONTAINER} php /var/www/html/artisan chats:process-incoming`,
      { stdio: 'ignore', timeout: 30_000 }
    )
  } catch {
    /* best-effort */
  }
}

async function caption(page, text, dwell = 4200) {
  await page.evaluate((t) => {
    let el = document.getElementById('lat-vo-caption')
    if (!el) {
      el = document.createElement('div')
      el.id = 'lat-vo-caption'
      el.style.cssText = [
        'position:fixed',
        'left:0;right:0;bottom:0',
        'z-index:2147483647',
        'background:rgba(24,46,24,.94)',
        'color:#fff',
        'font:600 22px/1.45 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
        'padding:18px 32px',
        'text-align:center',
        'border-top:4px solid #CBCB00',
        'box-shadow:0 -2px 24px rgba(0,0,0,.3)',
        'pointer-events:none',
        'opacity:0',
        'transition:opacity .45s ease',
      ].join(';')
      document.body.appendChild(el)
    }
    el.textContent = t
    requestAnimationFrame(() => {
      el.style.opacity = '1'
    })
  }, text)
  await page.waitForTimeout(dwell)
}

async function fadeOutCaption(page) {
  await page
    .evaluate(() => {
      const el = document.getElementById('lat-vo-caption')
      if (el) el.style.opacity = '0'
    })
    .catch(() => {})
  await page.waitForTimeout(500)
}

const wait = (page, ms) => page.waitForTimeout(ms)

/* Wait for a navigation to land + a real element to be visible before acting,
 * so we never type/scroll/caption over a blank or half-painted page. */
async function settle(page, readySelector, ms = 700) {
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  if (readySelector) {
    await page
      .locator(readySelector)
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => {})
  }
  await page.waitForLoadState('networkidle').catch(() => {})
  // Wait for the hydration cover to finish revealing so we never act/scroll
  // while the page is still masked.
  await page
    .locator('#lat-vo-cover')
    .waitFor({ state: 'detached', timeout: 3000 })
    .catch(() => {})
  await wait(page, ms)
}

/* Smooth-scroll an element to centre and let the animation finish (no instant
 * Playwright auto-scroll), then click + type character by character. */
async function typeField(page, selector, text, delay = 45) {
  await page
    .evaluate((s) => {
      const el = document.querySelector(s)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, selector)
    .catch(() => {})
  await wait(page, 850)
  const loc = page.locator(selector)
  await loc.click()
  await loc.pressSequentially(text, { delay })
  await wait(page, 500)
}

async function smoothScrollTo(page, selector) {
  await page
    .evaluate((s) => {
      const el = document.querySelector(s)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, selector)
    .catch(() => {})
  await wait(page, 850)
}

/* One gentle scroll down to reveal the lower part of a page, then back up. */
async function gentleScroll(page, frac = 0.55) {
  await page
    .evaluate(
      (f) =>
        window.scrollTo({
          top: Math.round(document.body.scrollHeight * f),
          behavior: 'smooth',
        }),
      frac
    )
    .catch(() => {})
  await wait(page, 1800)
  await page
    .evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    .catch(() => {})
  await wait(page, 1500)
}

/* Visible, progressively-typed sign-up via the modal. */
async function signUp(page, { email, password, fullname, role }) {
  await caption(
    page,
    `${fullname.split(' (')[0]} signs up — it only takes a moment.`,
    2600
  )
  await page.getByRole('button', { name: 'Sign in' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible', timeout: 10_000 })
  const joinSwitch = dialog.getByRole('button', { name: 'Join Lend & Tend' })
  if (await joinSwitch.isVisible({ timeout: 2000 }).catch(() => false)) {
    await joinSwitch.click()
  }
  await dialog
    .getByRole('heading', { name: 'Join Lend & Tend' })
    .waitFor({ timeout: 8000 })
    .catch(() => {})
  await wait(page, 500)
  for (const [sel, val, d] of [
    ['#lat-fullname', fullname, 45],
    ['#lat-email', email, 32],
    ['#lat-password', password, 32],
  ]) {
    const f = dialog.locator(sel)
    await f.click()
    await f.pressSequentially(val, { delay: d })
    await wait(page, 350)
  }
  const roleSel = dialog.locator('#lat-role')
  if (await roleSel.isVisible({ timeout: 1500 }).catch(() => false)) {
    await roleSel.selectOption(role)
    await wait(page, 400)
  }
  await fadeOutCaption(page)
  await dialog.getByRole('button', { name: 'Join Lend & Tend' }).click()
  await page
    .waitForURL(/\/(onboarding|map)/, { timeout: 15_000 })
    .catch(() => {})
  await wait(page, 800)
}

async function payUser(page, tries = 6) {
  await page.goto('/join').catch(() => {})
  await wait(page, 2500)
  for (let i = 0; i < tries; i++) {
    try {
      await markUserAsPaid(page)
      return
    } catch (e) {
      if (i === tries - 1) throw e
      await wait(page, 2500)
    }
  }
}

/* Navigate (fade-in) and confirm a target is present, nudging the batch worker
 * so cross-actor content is ready — a single clean reveal, not a flashing loop. */
async function reveal(page, url, readySelector, tries = 6) {
  for (let i = 0; i < tries; i++) {
    flushBatch()
    await page.goto(url)
    await settle(page, readySelector, 400)
    if (
      await page
        .locator(readySelector)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return
    }
    await wait(page, 5000)
  }
  await expect(page.locator(readySelector).first()).toBeVisible({
    timeout: 15_000,
  })
}

async function main() {
  const lender = {
    email: generateTestEmail(),
    password: 'TestPassword123!',
    fullname: 'Priya (garden lender)',
    role: 'lender',
  }
  const tender = {
    email: generateTestEmail(),
    password: 'TestPassword123!',
    fullname: 'Sam (garden tender)',
    role: 'tender',
  }
  let gardenId = null
  let chatId = null
  const segDirs = []

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })

  async function segment(name, fn) {
    const dir = path.join(RAW_DIR, name)
    fs.mkdirSync(dir, { recursive: true })
    const context = await browser.newContext({
      baseURL: LAT_BASE_URL,
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir, size: { width: 1280, height: 720 } },
    })
    await context.addInitScript(FADE_INIT)
    const page = await context.newPage()
    try {
      await fn(page)
    } finally {
      await fadeOutCaption(page).catch(() => {})
      await wait(page, 500)
      await context.close()
    }
    segDirs.push(dir)
  }

  try {
    /* ── Segment 1: lender lists a garden ──────────────────────────────── */
    await segment('1-lender-posts', async (page) => {
      await page.goto('/')
      await settle(page, 'button:has-text("Sign in")', 600)
      await caption(
        page,
        'Lend & Tend — neighbours share gardens. Priya has one she can no longer manage alone.',
        4600
      )
      await fadeOutCaption(page)

      await signUp(page, lender)
      await payUser(page)

      await page.goto('/lend')
      await settle(page, '#subject', 700)
      await caption(page, 'She lists her garden as one to share.', 3600)

      await typeField(page, '#subject', 'Sunny back garden, ready for veg')
      await typeField(
        page,
        '#about',
        'A south-facing plot with established beds and a shed. I love it but ' +
          "can't keep on top of it — I'd love someone to grow here.",
        22
      )

      await caption(
        page,
        'A postcode pins it on the map (location stays blurred).',
        3800
      )
      await smoothScrollTo(page, '#lat-postcode-input')
      await fillLocationPicker(page)
      await wait(page, 700)

      await typeField(page, '#phone', '07700 900100')
      const restrictions = page.locator('#restrictions')
      if (await restrictions.isVisible({ timeout: 1500 }).catch(() => false)) {
        await typeField(
          page,
          '#restrictions',
          'No commercial growing, and please no bonfires.',
          26
        )
      }

      await caption(page, '…and posts it.', 3000)
      await smoothScrollTo(page, 'button:has-text("Post my garden")')
      const resp = page.waitForResponse(
        (r) =>
          r.url().includes('/apiv2/message') && r.request().method() === 'PUT',
        { timeout: 30_000 }
      )
      await page.getByRole('button', { name: 'Post my garden' }).click()
      try {
        gardenId = (await (await resp).json())?.id ?? null
      } catch {
        /* ignore */
      }
      await settle(page, 'body', 600)
      await expect(page).toHaveURL(/\/profile/, { timeout: 25_000 })
      await wait(page, 1000)
      await caption(page, 'Posted! Her garden is now on the map.', 4200)
    })
    if (!gardenId) throw new Error('garden id not captured')

    /* ── Segment 2: tender finds it and gets in touch ──────────────────── */
    await segment('2-tender-messages', async (page) => {
      await page.goto('/')
      await settle(page, 'button:has-text("Sign in")', 600)
      await caption(
        page,
        'Across town, Sam is longing for space to grow veg.',
        4000
      )
      await fadeOutCaption(page)

      await signUp(page, tender)
      await payUser(page)

      await page.goto(`/garden/${gardenId}`)
      await settle(page, 'button:has-text("Send message")', 700)
      await caption(page, "Sam finds Priya's garden and takes a look.", 4000)
      await gentleScroll(page)

      await fadeOutCaption(page)
      await page.getByRole('button', { name: 'Send message' }).click()
      await settle(page, '#chatmessage', 700)
      chatId = (page.url().match(/chats\/(\d+)/) || [])[1] || null
      await caption(page, 'A friendly first message breaks the ice.', 3400)
      await typeField(
        page,
        '#chatmessage',
        "Hi Priya! I'd love to help bring your garden back to life.",
        40
      )
      await page.getByRole('button', { name: 'Send', exact: true }).click()
      await expect(
        page.getByText("I'd love to help bring your garden").first()
      ).toBeVisible({ timeout: 15_000 })
      await wait(page, 2000)
    })

    /* ── Segment 3: lender proposes the agreement ──────────────────────── */
    await segment('3-lender-agreement', async (page) => {
      await page.goto('/')
      await settle(page, 'button:has-text("Sign in")', 600)
      await caption(
        page,
        'Priya is delighted — they agree to share the garden.',
        4000
      )
      await fadeOutCaption(page)
      await loginViaModal(page, lender.email, lender.password)
      await settle(page, 'a:has-text("Logout")', 700)

      const chatUrl = chatId ? `/chats/${chatId}` : '/chats'
      await reveal(page, chatUrl, 'button:has-text("Sign agreement")')
      await wait(page, 800)
      await caption(page, "Priya reads Sam's message.", 3400)

      await fadeOutCaption(page)
      await page.getByRole('button', { name: 'Sign agreement' }).click()
      await settle(page, '#whatToGrow', 700)
      await caption(
        page,
        'They set out a simple garden-sharing agreement.',
        3800
      )

      await typeField(
        page,
        '#whatToGrow',
        'Tomatoes, courgettes, beans and herbs',
        38
      )
      await typeField(
        page,
        '#accessTimes',
        'Weekends and Wednesday evenings',
        38
      )

      await caption(
        page,
        'A few ground rules — agreed up front, not argued later.',
        4200
      )
      for (const [label, value] of [
        ['Pets allowed in the garden', 'no'],
        ['Tender may use the water supply', 'yes'],
        ['Some produce shared with the lender', 'yes'],
      ]) {
        const sel = page.getByLabel(label)
        await sel
          .evaluate((el) =>
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          )
          .catch(() => {})
        await wait(page, 800)
        await sel.selectOption(value)
        await wait(page, 350)
      }

      await caption(
        page,
        'And a gentle review date — a growing season to try it out.',
        4200
      )
      await smoothScrollTo(page, '#endDate')
      await page.getByRole('button', { name: 'Suggest 4 months' }).click()
      await wait(page, 1200)

      await caption(page, 'Priya sends the agreement to Sam.', 3400)
      await fadeOutCaption(page)
      await smoothScrollTo(page, 'button:has-text("Send to tender")')
      await page.getByRole('button', { name: 'Send to tender' }).click()
      await settle(page, 'body', 600)
      await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 20_000 })
      await wait(page, 1500)
    })

    /* ── Segment 4: tender accepts; sees what happens next ─────────────── */
    await segment('4-tender-accepts', async (page) => {
      await page.goto('/')
      await settle(page, 'button:has-text("Sign in")', 600)
      await caption(page, 'Sam reads the terms and is happy to go ahead.', 4000)
      await fadeOutCaption(page)
      await loginViaModal(page, tender.email, tender.password)
      await settle(page, 'a:has-text("Logout")', 700)

      const chatUrl = chatId ? `/chats/${chatId}` : '/chats'
      await reveal(page, chatUrl, 'a.btn-view-agreement')
      await wait(page, 800)
      await caption(page, 'Sam opens the agreement Priya proposed.', 3400)

      await fadeOutCaption(page)
      await page.locator('a.btn-view-agreement').first().click()
      await settle(page, '.status-banner.proposed', 700)
      await caption(page, 'Everything looks good — Sam reads the terms…', 3800)
      await gentleScroll(page)

      await smoothScrollTo(page, 'button:has-text("Accept and confirm")')
      await caption(page, '…and accepts.', 2600)
      await page.getByRole('button', { name: 'Accept and confirm' }).click()
      await expect(page.getByText(/Agreement confirmed/).first()).toBeVisible({
        timeout: 20_000,
      })
      await wait(page, 1200)
      await smoothScrollTo(page, '.next-steps')
      await wait(page, 600)
      await caption(
        page,
        "Agreed! And here's the timeline of what to expect over the season.",
        5200
      )
      await page
        .evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }))
        .catch(() => {})
      await wait(page, 2600)
      await caption(
        page,
        'Lend & Tend — share a garden, grow good things. 🌱',
        4800
      )
    })

    console.log('WALKTHROUGH_OK')
    const paths = segDirs
      .map((d) => {
        const f = fs.readdirSync(d).filter((x) => x.endsWith('.webm'))
        return f.length ? path.join(d, f[0]) : null
      })
      .filter(Boolean)
    console.log('WALKTHROUGH_SEGMENTS=' + paths.join('|'))
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error('WALKTHROUGH_FAILED:', e && e.message ? e.message : e)
  process.exit(1)
})
