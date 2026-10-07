/**
 * Lend & Tend documentation screenshot generator.
 *
 * Drives the real Lend & Tend app with Playwright and writes deterministic
 * screenshots into docs/lend-and-tend/<audience>/assets/. This is how the
 * images in the member and admin guides stay up to date: they are regenerated
 * from the running app rather than pasted in by hand.
 *
 * Unlike Freegle, the local L&T stack has no seeded listings, chats or
 * agreements, so the generator walks the real journey itself: it signs up a
 * lender and a tender (the passwordless magic-link flow, read from Mailpit),
 * posts a garden, starts a chat, proposes and accepts an agreement, and
 * photographs each screen as it goes. The admin shots sign in as the demo
 * admin the dev migration seeds (admin@test.com).
 *
 * It lives under iznik-nuxt3/tests/e2e/lat so that `@playwright/test` and the
 * L&T fixtures resolve from the app's own install. Run it from iznik-nuxt3:
 *
 *   LAT_BASE_URL=http://localhost:4002 \
 *   LAT_MAILPIT_URL=http://localhost:4025 \
 *   node tests/e2e/lat/docs-screenshots.mjs
 *
 * See docs/lend-and-tend/screenshots/README.md for the full guide.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { execSync } from 'node:child_process'

// Resolve Playwright and the L&T fixtures via CJS require (honours NODE_PATH
// and finds them whether installed locally or globally).
const require = createRequire(import.meta.url)
const { chromium, expect } = require('@playwright/test')
const {
  signUpViaModal,
  loginViaModal,
  openLoginModal,
  markUserAsPaid,
  fillLocationPicker,
  LAT_BASE_URL,
} = require('./lat-fixtures')

const __dirname = dirname(fileURLToPath(import.meta.url))
// DOCS_OUT lets CI write the assets to a known dir it can copy out of the
// container; locally it defaults to the repo's docs/lend-and-tend folder.
const DOCS_ROOT = process.env.DOCS_OUT
  ? resolve(process.env.DOCS_OUT)
  : resolve(__dirname, '../../../../docs/lend-and-tend')

const cfg = {
  base: LAT_BASE_URL,
  adminEmail: process.env.DOCS_ADMIN_EMAIL || 'admin@test.com',
  // The batch worker publishes chat messages once a minute; this container
  // name lets us flush the queue immediately instead of waiting.
  batchContainer: process.env.LAT_BATCH_CONTAINER || 'lat-batch-worker',
  // L&T is desktop-first, so the docs use a laptop viewport.
  viewport: { width: 1280, height: 900 },
  navTimeout: 45000,
}

// Fixed, recognisable names so the screenshots read the same on every run.
const LENDER = { fullname: 'Priya Lender', role: 'lender' }
const TENDER = { fullname: 'Sam Tender', role: 'tender' }
const GARDEN = {
  subject: 'Sunny back garden, ready for veg',
  about:
    'A south-facing plot with established beds and a shed. I love it but can no longer keep on top of it, and would love someone to grow here.',
  arrangement:
    'Help with the mowing in return for use of the veg patch, or pure goodwill.',
  restrictions: 'No commercial growing, and please no bonfires.',
  phone: '07700 900100',
}
const WANTED = {
  subject: 'Vegetables and herbs, happy to help with an existing garden',
  about:
    'Allotment gardener for ten years, now without a plot. Reliable, tidy, and happy to share what I grow.',
  whatToGrow: 'Grow veg and herbs; maintain an existing garden.',
  phone: '07700 900200',
}

/**
 * Selectors that vary run to run and are masked for determinism. The sign-up
 * emails are generated fresh each run (an address can only be registered
 * once), so anywhere they appear is masked. A wrong selector matches nothing,
 * so this is safe to keep broad.
 */
const MASK = [
  '.current-email',
  '.lat-admin-at td:has-text("@test.lat")',
  '.lat-admin-value:has-text("@")',
  '.info-row span:has-text("@")',
  // The redesigned member detail page lists fields as dt/dd pairs.
  'dd:has-text("@test.lat")',
]

/**
 * The manifest. Each entry maps one screenshot to one place in the docs.
 * Entries run IN ORDER because the app state evolves as the journey goes
 * (a lender must post before a tender can message, and so on). `as` names
 * the browser context (lender, tender, admin, or none for logged out), ids
 * learned along the way fill in `{GARDEN_ID}`-style placeholders in paths, and
 * `setup` is a function run on the page before the shot, which may change
 * app state for later entries. Add a shot here rather than capturing images
 * by hand.
 */
const SHOTS = [
  // ── Members ────────────────────────────────────────────────────────────
  { audience: 'members', name: 'homepage', as: 'none', path: '/' },
  {
    audience: 'members',
    name: 'sign-in',
    stay: true,
    as: 'none',
    path: '/',
    setup: openSignInModal,
  },
  { audience: 'members', name: 'map', as: 'none', path: '/map' },
  {
    audience: 'members',
    name: 'onboarding',
    as: 'lender',
    path: '/onboarding',
    setup: ensureSignedUp,
  },
  { audience: 'members', name: 'join', as: 'lender', path: '/join' },
  {
    audience: 'members',
    name: 'lend-form',
    stay: true,
    as: 'lender',
    path: '/lend',
    fullPage: true,
    setup: payThenFillLendForm,
    after: submitLendForm,
  },
  { audience: 'members', name: 'my-gardens', as: 'lender', path: '/profile' },
  {
    audience: 'members',
    name: 'garden-listing',
    as: 'tender',
    path: '/garden/{GARDEN_ID}',
    setup: ensureSignedUp,
  },
  {
    audience: 'members',
    name: 'tend-form',
    stay: true,
    as: 'tender',
    path: '/tend',
    fullPage: true,
    setup: payThenFillTendForm,
    after: submitTendForm,
  },
  {
    audience: 'members',
    name: 'chat',
    stay: true,
    as: 'tender',
    path: '/chats/{CHAT_ID}',
    setup: startChatFromListing,
  },
  {
    audience: 'members',
    name: 'agreement-draft',
    stay: true,
    as: 'lender',
    path: '/chats/{CHAT_ID}',
    fullPage: true,
    setup: replyThenDraftAgreement,
    after: sendAgreement,
  },
  {
    audience: 'members',
    name: 'agreement-proposed',
    stay: true,
    as: 'tender',
    path: '/chats/{CHAT_ID}',
    fullPage: true,
    setup: openProposedAgreement,
    after: acceptAgreement,
  },
  {
    audience: 'members',
    name: 'checkin',
    as: 'tender',
    path: '/checkin/{GARDEN_ID}',
  },
  {
    audience: 'members',
    name: 'my-gardens-matched',
    as: 'lender',
    path: '/profile',
  },
  {
    audience: 'members',
    name: 'settings',
    as: 'lender',
    path: '/settings',
    fullPage: true,
  },
  {
    audience: 'members',
    name: 'what-to-expect',
    as: 'none',
    path: '/what-to-expect',
  },
  // ── Admins ─────────────────────────────────────────────────────────────
  { audience: 'admins', name: 'dashboard', as: 'admin', path: '/admin' },
  {
    audience: 'admins',
    name: 'approved',
    as: 'admin',
    path: '/admin/gardens/approved',
  },
  { audience: 'admins', name: 'members', as: 'admin', path: '/admin/members' },
  {
    audience: 'admins',
    name: 'member-detail',
    as: 'admin',
    path: '/admin/users/{LENDER_ID}',
  },
  {
    audience: 'admins',
    name: 'review-queue',
    as: 'admin',
    path: '/admin/moderation',
  },
  {
    audience: 'admins',
    name: 'concessions',
    as: 'admin',
    path: '/admin/concessions',
  },
  {
    audience: 'admins',
    name: 'agreements',
    as: 'admin',
    path: '/admin/agreements',
  },
  {
    audience: 'admins',
    name: 'settings',
    as: 'admin',
    path: '/admin/settings',
  },
]

// Ids discovered as the journey runs, substituted into `{NAME}` in paths.
const ids = {}
// DOCS_IDS='{"LENDER_ID":154}' seeds ids the member journey would otherwise
// discover, so DOCS_AUDIENCE=admins can regenerate the admin set alone.
Object.assign(ids, JSON.parse(process.env.DOCS_IDS || '{}'))
function subst(s, { strict = true } = {}) {
  let missing = false
  const out = s.replace(/\{([A-Z_]+)\}/g, (_, k) => {
    if (ids[k] == null) {
      if (strict) throw new Error(`${k} is not known yet`)
      missing = true
      return ''
    }
    return String(ids[k])
  })
  return missing ? null : out
}

function flushBatch() {
  // Chat messages are queued with processingrequired=1 and published by the
  // batch worker once a minute. Flushing is best effort: without Docker
  // access the journey still works, it just waits for the schedule.
  try {
    execSync(
      `docker exec ${cfg.batchContainer} php /var/www/html/artisan chats:process-incoming`,
      { stdio: 'ignore', timeout: 30000 }
    )
  } catch {
    /* fall back to the once-a-minute schedule */
  }
}

function currentUserId(page) {
  return page.evaluate(() => {
    try {
      const a = JSON.parse(localStorage.auth || '{}')
      return a?.auth?.persistent?.userid ?? null
    } catch {
      return null
    }
  })
}

// ── setup / after hooks ──────────────────────────────────────────────────

async function openSignInModal(page) {
  await openLoginModal(page)
  await page.waitForTimeout(500)
}

/** Sign the context's member up on first use (the lender or tender). */
async function ensureSignedUp(page, ctx) {
  if (ctx.signedUp) return
  const who = ctx.name === 'lender' ? LENDER : TENDER
  await page.goto(cfg.base + '/', { waitUntil: 'domcontentloaded' })
  await signUpViaModal(page, who)
  ctx.signedUp = true
  ids[ctx.name === 'lender' ? 'LENDER_ID' : 'TENDER_ID'] = await currentUserId(
    page
  )
}

async function ensurePaid(page, ctx) {
  if (ctx.paid) return
  await markUserAsPaid(page)
  ctx.paid = true
}

/**
 * Like the fixtures' fillLocationPicker, but copes with whichever path the
 * picker takes after "Find": a PAF address dropdown (when the database has
 * data for the postcode) or the manual-address fallback. postcodes.io can be
 * slow, so the wait is generous.
 */
async function fillLocationResilient(page, postcode = 'SW1A 1AA') {
  await page.locator('#lat-postcode-input').fill(postcode)
  await page.getByRole('button', { name: 'Find →' }).click()
  const select = page.locator('#lat-address-select')
  const manual = page.locator('#lat-address-manual')
  await expect(select.or(manual)).toBeVisible({ timeout: 45000 })
  if (await select.isVisible().catch(() => false)) {
    const value = await select
      .locator('option')
      .evaluateAll((opts) => (opts.find((o) => o.value) || {}).value || '')
    if (value) await select.selectOption(value)
  } else {
    await manual.fill('10 Test Street')
  }
  await expect(page.locator('.status-ok')).toBeVisible({ timeout: 10000 })
}

async function payThenFillLendForm(page, ctx) {
  await ensurePaid(page, ctx)
  await page.goto(cfg.base + '/lend', { waitUntil: 'networkidle' })
  await expect(page.locator('#subject')).toBeVisible({ timeout: 15000 })
  await page.locator('#subject').fill(GARDEN.subject)
  await fillLocationResilient(page)
  await page.locator('#phone').fill(GARDEN.phone)
  await page.locator('#about').fill(GARDEN.about)
  await page.locator('#gardenSize').selectOption('medium')
  await page.locator('#sunExposure').selectOption('full')
  await page.locator('#waterAccess').selectOption('yes')
  await page.locator('#accessRoute').selectOption('gate')
  await page.locator('#arrangement').fill(GARDEN.arrangement)
  await page.locator('#restrictions').fill(GARDEN.restrictions)
}

async function submitLendForm(page) {
  const resp = page.waitForResponse(
    (r) => r.url().includes('/apiv2/message') && r.request().method() === 'PUT',
    { timeout: 30000 }
  )
  await page.getByRole('button', { name: 'Post my garden' }).click()
  try {
    ids.GARDEN_ID = (await (await resp).json())?.id ?? null
  } catch {
    /* read it from the profile page below */
  }
  await expect(page).toHaveURL(/\/profile/, { timeout: 25000 })
  if (!ids.GARDEN_ID) {
    const href = await page
      .locator('a[href^="/garden/"]')
      .first()
      .getAttribute('href')
    ids.GARDEN_ID = Number((href || '').match(/\/garden\/(\d+)/)?.[1])
  }
  if (!ids.GARDEN_ID) throw new Error('could not learn the posted garden id')
}

async function payThenFillTendForm(page, ctx) {
  await ensurePaid(page, ctx)
  await page.goto(cfg.base + '/tend', { waitUntil: 'networkidle' })
  await expect(page.locator('#subject')).toBeVisible({ timeout: 15000 })
  await page.locator('#subject').fill(WANTED.subject)
  await fillLocationPicker(page, 'SW1A 2AA', '12 Test Street')
  await page.locator('#phone').fill(WANTED.phone)
  await page.locator('#about').fill(WANTED.about)
  await page.locator('#tools').selectOption('basic')
  await page.locator('#availability').selectOption('weekends')
  await page.locator('#whatToGrow').fill(WANTED.whatToGrow)
  await page.locator('.honesty-check').check()
}

async function submitTendForm(page) {
  await page.getByRole('button', { name: 'Post my interest' }).click()
  await expect(page).toHaveURL(/\/profile/, { timeout: 25000 })
}

async function startChatFromListing(page) {
  await page.goto(cfg.base + subst('/garden/{GARDEN_ID}'), {
    waitUntil: 'networkidle',
  })
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 20000 })
  ids.CHAT_ID = Number(page.url().match(/chats\/(\d+)/)?.[1])
  await page
    .locator('#chatmessage')
    .fill(
      "Hi Priya! I'd love to help bring your garden back to life. I'm free most weekends.",
      { timeout: 30000 }
    )
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(
    page.getByText('bring your garden back to life').first()
  ).toBeVisible({ timeout: 15000 })
  flushBatch()
  await page.reload({ waitUntil: 'networkidle' })
}

async function replyThenDraftAgreement(page) {
  // The lender replies, then opens the agreement from the chat footer and
  // fills it in; the shot is the filled draft before it is sent.
  flushBatch()
  await page.goto(cfg.base + subst('/chats/{CHAT_ID}'), {
    waitUntil: 'networkidle',
  })
  await expect(page.locator('#chatmessage')).toBeVisible({ timeout: 30000 })
  await page
    .locator('#chatmessage')
    .fill('Lovely to hear from you, Sam. Shall we agree how it will work?')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByText('Lovely to hear from you').first()).toBeVisible({
    timeout: 15000,
  })
  flushBatch()
  await page.goto(
    cfg.base + subst('/agreement/{GARDEN_ID}?userId={TENDER_ID}'),
    { waitUntil: 'networkidle' }
  )
  await expect(page.locator('.status-banner.draft')).toBeVisible({
    timeout: 15000,
  })
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
  await page.waitForTimeout(500)
}

async function sendAgreement(page) {
  await page.getByRole('button', { name: 'Send to tender' }).click()
  await expect(page).toHaveURL(/\/chats\/\d+/, { timeout: 20000 })
  flushBatch()
}

async function openProposedAgreement(page) {
  await page.goto(cfg.base + subst('/chats/{CHAT_ID}'), {
    waitUntil: 'networkidle',
  })
  const card = page.locator('a.btn-view-agreement').first()
  await expect(card).toBeVisible({ timeout: 30000 })
  await card.click()
  await expect(page).toHaveURL(/\/agreement\/\d+/, { timeout: 15000 })
  await expect(page.locator('.status-banner.proposed')).toBeVisible({
    timeout: 15000,
  })
  await page.waitForTimeout(500)
}

async function acceptAgreement(page) {
  await page.getByRole('button', { name: 'Accept and confirm' }).click()
  await expect(page.getByText(/Agreement confirmed/).first()).toBeVisible({
    timeout: 20000,
  })
  await page.waitForTimeout(1000)
}

// ── capture ──────────────────────────────────────────────────────────────

/**
 * Dismiss the cookie banner (it would otherwise sit over every shot) and hide
 * the Nuxt dev-tools pill, which only exists on a dev server.
 */
async function tidyForShot(page) {
  const essential = page.getByRole('button', { name: 'Essential only' })
  if (await essential.isVisible().catch(() => false)) {
    await essential.click().catch(() => {})
    await page.waitForTimeout(300)
  }
  await page
    .addStyleTag({
      // The join page's "Pretend to pay" box (.dev-bypass) exists only on dev
      // stacks; a member guide must not show it.
      content:
        '#nuxt-devtools-container, #nuxt-devtools-anchor, nuxt-devtools-frame, [id^="nuxt-devtools"], .dev-bypass { display: none !important; }',
    })
    .catch(() => {})
}

/**
 * Something only a signed-in person sees. On member pages that is a visible
 * "Logout" control. The admin layout has no such control (its Log out is a
 * button), so there we use the admin sidebar.
 */
function signedInMarker(page, ctxName) {
  // The admin bar is server-rendered even for a signed-out visitor, so it
  // proves nothing; the sidebar only appears once the signed-in admin has
  // hydrated.
  if (ctxName === 'admin') {
    return page.getByRole('link', { name: 'Dashboard' }).first()
  }
  return page
    .getByText('Logout', { exact: true })
    .filter({ visible: true })
    .first()
}

async function capture(ctx, shot) {
  const outDir = resolve(DOCS_ROOT, shot.audience, 'assets')
  await mkdir(outDir, { recursive: true })
  const page = ctx.page
  // Go to the page first (when its ids are already known), run the setup,
  // then make sure we are on the page. A `stay` shot is photographed
  // wherever the setup leaves the page (a filled form, an opened modal).
  const before = subst(shot.path, { strict: false })
  if (before && page.url() !== cfg.base + before) {
    await page.goto(cfg.base + before, {
      waitUntil: 'networkidle',
      timeout: cfg.navTimeout,
    })
  }
  // Clear the cookie banner before a setup opens a modal over it.
  if (before) await tidyForShot(page)
  if (shot.setup) await shot.setup(page, ctx)
  const url = cfg.base + subst(shot.path)
  if (!shot.stay && page.url() !== url) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: cfg.navTimeout })
  }
  if (ctx.name !== 'none') {
    // A page that rendered without the navbar (a transient render error)
    // gets one reload before we give up on it.
    const loggedIn = signedInMarker(page, ctx.name)
    if (!(await loggedIn.isVisible().catch(() => false))) {
      await page.waitForTimeout(2000)
      if (!(await loggedIn.isVisible().catch(() => false))) {
        await page.reload({ waitUntil: 'networkidle' })
      }
    }
    await expect(loggedIn).toBeVisible({ timeout: cfg.navTimeout })
  }
  await tidyForShot(page)
  // A full-page shot of a scrolled page paints the fixed navbar mid-image.
  await page.evaluate(() => window.scrollTo(0, 0))
  // Settle animations, maps and lazy content.
  await page.waitForTimeout(2500)
  if (shot.capture) {
    await page.screenshot({
      path: resolve(outDir, shot.name + '.png'),
      fullPage: !!shot.fullPage,
      animations: 'disabled',
      caret: 'hide',
      mask: MASK.map((sel) => page.locator(sel)),
    })
    console.log(`  captured ${shot.audience}/${shot.name}.png  (${shot.path})`)
  } else {
    console.log(`  skipped  ${shot.audience}/${shot.name}.png  (state only)`)
  }
  if (shot.after) await shot.after(page, ctx)
}

async function run() {
  console.log('Lend & Tend docs screenshots')
  console.log('  app     :', cfg.base)
  console.log('  output  :', DOCS_ROOT)

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })
  const ctxOpts = {
    baseURL: cfg.base,
    viewport: cfg.viewport,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    reducedMotion: 'reduce',
    storageState: { cookies: [], origins: [] },
  }

  // DOCS_SHOT=<name>[,<name>] writes just those images. The journey still
  // runs in full (later shots depend on the state earlier ones create), so
  // this saves a diff of twenty binaries, not time.
  const only = process.env.DOCS_SHOT
    ? new Set(process.env.DOCS_SHOT.split(',').map((s) => s.trim()))
    : null

  const contexts = {}
  async function contextFor(name) {
    if (name === 'none') {
      // Logged out: a fresh context per shot so no session leaks in.
      const c = await browser.newContext(ctxOpts)
      return { name, page: await c.newPage(), browserContext: c, oneShot: true }
    }
    if (!contexts[name]) {
      const c = await browser.newContext(ctxOpts)
      contexts[name] = { name, page: await c.newPage(), browserContext: c }
      if (name === 'admin') {
        await contexts[name].page.goto(cfg.base + '/', {
          waitUntil: 'domcontentloaded',
        })
        await loginViaModal(contexts[name].page, cfg.adminEmail)
      }
    }
    return contexts[name]
  }

  let failures = 0
  for (const shot of SHOTS) {
    // DOCS_AUDIENCE=members|admins runs one audience's shots only.
    if (
      process.env.DOCS_AUDIENCE &&
      shot.audience !== process.env.DOCS_AUDIENCE
    ) {
      continue
    }
    shot.capture = !only || only.has(shot.name)
    let ctx
    try {
      ctx = await contextFor(shot.as)
      // Under load the app's hydration races make a first attempt flaky
      // (a swallowed click, a slow sign-in link). Try each shot up to three
      // times before giving up; the setups are safe to repeat on test data.
      let lastErr = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await capture(ctx, shot)
          lastErr = null
          break
        } catch (e) {
          lastErr = e
          console.warn(
            `  retry ${attempt}/3 ${shot.audience}/${shot.name}: ${
              String(e.message).split('\n')[0]
            }`
          )
          await ctx.page.waitForTimeout(3000)
        }
      }
      if (lastErr) throw lastErr
    } catch (err) {
      failures++
      console.error(`  FAILED ${shot.audience}/${shot.name}: ${err.message}`)
    } finally {
      if (ctx?.oneShot) await ctx.browserContext.close()
    }
  }

  await browser.close()
  console.log(
    'ids:',
    JSON.stringify(ids),
    failures ? `\nDone with ${failures} failure(s).` : '\nDone.'
  )
  process.exit(failures ? 1 : 0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
