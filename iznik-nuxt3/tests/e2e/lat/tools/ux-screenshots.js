// @ts-check
/**
 * UX review tool (not a test): drives headless Chromium with the GPU disabled
 * through every Lend & Tend page as an anonymous visitor, a logged-in lender
 * and an admin, at desktop and phone widths, saving a full-page screenshot of
 * each plus a JSON report of console errors, page errors and failed requests.
 *
 *   node tests/e2e/lat/tools/ux-screenshots.js [outDir] [contexts]
 *
 *   contexts: comma-separated subset of anon,lender,admin (default: all)
 *
 * Needs the local L&T stack (LAT_BASE_URL, default http://localhost:4002),
 * Mailpit (LAT_MAILPIT_URL, default http://localhost:4025) for the sign-in
 * links, and the demo users the dev migration seeds (lend@test.com,
 * admin@test.com). Sign-in is the real passwordless flow: request a link,
 * read it from Mailpit, open it.
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('@playwright/test')
const { fetchMagicLink } = require('../lat-fixtures')

const BASE = process.env.LAT_BASE_URL || 'http://localhost:4002'
const OUT =
  process.argv[2] || path.join(__dirname, '..', '..', '..', '..', 'ux-review')
const CONTEXTS = (process.argv[3] || 'anon,lender,admin').split(',')

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
}

const PAGES = {
  anon: [
    '/',
    '/about',
    '/what-to-expect',
    '/ground-rules',
    '/help',
    '/contact',
    '/map',
    '/join/',
    '/lend/',
    '/tend/',
    '/profile',
    '/chats/',
    '/privacy',
    '/terms',
  ],
  lender: [
    '/map',
    '/profile',
    '/settings/',
    '/chats/',
    '/lend/',
    '/tend/',
    '/garden/new',
    '/join/',
    '/onboarding',
    '/share-another',
    '/still-looking',
  ],
  admin: [
    '/admin/',
    '/admin/users/',
    '/admin/pending/',
    '/admin/gardens/approved',
    '/admin/agreements/',
    '/admin/moderation',
    '/admin/concessions/',
    '/admin/members/flagged',
    '/admin/settings/',
  ],
}

const EMAILS = { lender: 'lend@test.com', admin: 'admin@test.com' }

const NOISE = [/\[Vue warn\]: <Suspense>/, /favicon/, /sourcemap/i]

function slug(p) {
  return (
    p
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/[^a-z0-9]+/gi, '-') || 'home'
  )
}

async function settle(page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  } catch {}
  await page.waitForTimeout(700)
}

function newSink() {
  return {
    console: [],
    pageErrors: [],
    failedRequests: [],
    httpErrors: [],
    hydration: [],
  }
}

function attachCollectors(page, sink) {
  const onConsole = (msg) => {
    const t = msg.type()
    const text = msg.text()
    if (/hydration/i.test(text)) sink.hydration.push(text.slice(0, 300))
    if (
      (t === 'error' || t === 'warning') &&
      !NOISE.some((re) => re.test(text))
    ) {
      sink.console.push(`${t}: ${text.slice(0, 300)}`)
    }
  }
  const onPageError = (err) => sink.pageErrors.push(String(err).slice(0, 300))
  const onFailed = (req) => {
    const u = req.url()
    if (!/favicon|sentry|hot-update|__nuxt_devtools/.test(u)) {
      sink.failedRequests.push(
        `${req.method()} ${u} (${req.failure()?.errorText})`
      )
    }
  }
  const onResponse = (res) => {
    if (
      res.status() >= 400 &&
      !/favicon|hot-update|__nuxt_devtools/.test(res.url())
    ) {
      sink.httpErrors.push(
        `${res.status()} ${res.request().method()} ${res.url()}`
      )
    }
  }
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  page.on('requestfailed', onFailed)
  page.on('response', onResponse)
  return () => {
    page.off('console', onConsole)
    page.off('pageerror', onPageError)
    page.off('requestfailed', onFailed)
    page.off('response', onResponse)
  }
}

async function dismissCookieBanner(page) {
  const btn = page.getByRole('button', { name: 'Essential only' })
  if (await btn.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(300)
  }
}

async function openModal(page) {
  const signIn = page.getByRole('button', { name: 'Sign in' }).first()
  await signIn.waitFor({ state: 'visible', timeout: 20_000 })
  const dialog = page.getByRole('dialog')
  for (
    let i = 0;
    i < 10 && !(await dialog.isVisible().catch(() => false));
    i++
  ) {
    await signIn.click().catch(() => {})
    await page.waitForTimeout(500)
  }
  return dialog
}

async function login(page, email) {
  const requestedAt = Date.now() - 2_000
  await page.goto(BASE + '/', {
    waitUntil: 'domcontentloaded',
    timeout: 90_000,
  })
  await settle(page)
  await dismissCookieBanner(page)
  const dialog = await openModal(page)
  const isSignUp = await dialog
    .getByRole('heading', { name: 'Join Lend & Tend' })
    .isVisible({ timeout: 2_000 })
    .catch(() => false)
  if (isSignUp)
    await dialog.locator('button.link-btn', { hasText: 'Sign in' }).click()
  await dialog
    .getByRole('heading', { name: 'Welcome back' })
    .waitFor({ state: 'visible', timeout: 10_000 })
  await dialog.locator('#lat-email').fill(email)
  await dialog.locator('button.btn-submit').click()
  await dialog
    .getByRole('heading', { name: 'Check your email' })
    .waitFor({ state: 'visible', timeout: 15_000 })
  console.log(`  requested sign-in link for ${email}; waiting for Mailpit…`)
  const link = await fetchMagicLink(email, { after: requestedAt })
  const url = new URL(link)
  await page.goto(`${BASE}${url.pathname}${url.search}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90_000,
  })
  await page
    .locator('a', { hasText: 'Logout' })
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })
  console.log(`  signed in as ${email}`)
}

async function capture(page, ctxName, vpName, urlPath, report, nameOverride) {
  const sink = newSink()
  const detach = attachCollectors(page, sink)
  const name = nameOverride || slug(urlPath)
  const file = path.join(OUT, ctxName, `${name}--${vpName}.png`)
  let finalUrl = ''
  let title = ''
  let h1 = ''
  let status = 0
  try {
    const res = await page.goto(BASE + urlPath, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    })
    status = res ? res.status() : 0
    await settle(page)
    await dismissCookieBanner(page)
    finalUrl = page.url().replace(BASE, '')
    title = await page.title()
    h1 =
      (await page
        .locator('h1')
        .first()
        .textContent({ timeout: 1_000 })
        .catch(() => '')) || ''
    await page.screenshot({ path: file, fullPage: true })
  } catch (err) {
    sink.pageErrors.push('CAPTURE FAILED: ' + String(err).slice(0, 300))
  }
  detach()
  report.push({
    ctx: ctxName,
    viewport: vpName,
    path: urlPath,
    finalUrl,
    status,
    title,
    h1: h1.trim(),
    file: path.relative(OUT, file),
    ...sink,
  })
  process.stdout.write(
    `  ${ctxName}/${vpName} ${urlPath} -> ${finalUrl || '?'} [${status}] ${
      sink.pageErrors.length ? 'ERR ' : ''
    }${sink.console.length ? `console:${sink.console.length} ` : ''}${
      sink.httpErrors.length ? `http:${sink.httpErrors.length}` : ''
    }\n`
  )
}

function writeReport(report) {
  fs.writeFileSync(
    path.join(OUT, 'report.json'),
    JSON.stringify(report, null, 2)
  )
}

async function runContext(browser, ctxName, report) {
  fs.mkdirSync(path.join(OUT, ctxName), { recursive: true })
  let storage
  if (EMAILS[ctxName]) {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop })
    const page = await ctx.newPage()
    await login(page, EMAILS[ctxName])
    storage = await ctx.storageState()
    await ctx.close()
  }
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({
      viewport,
      isMobile: vpName === 'mobile',
      hasTouch: vpName === 'mobile',
      storageState: storage,
    })
    const page = await ctx.newPage()
    console.log(`== ${ctxName} @ ${vpName}`)

    if (ctxName === 'anon' && vpName === 'desktop') {
      // The very first impression, cookie banner included.
      const sink = newSink()
      const detach = attachCollectors(page, sink)
      await page.goto(BASE + '/', {
        waitUntil: 'domcontentloaded',
        timeout: 90_000,
      })
      await settle(page)
      await page.screenshot({
        path: path.join(OUT, 'anon', 'home-first-visit--desktop.png'),
        fullPage: false,
      })
      detach()
      report.push({
        ctx: 'anon',
        viewport: 'desktop',
        path: '/ (first visit)',
        file: 'anon/home-first-visit--desktop.png',
        ...sink,
      })
    }

    for (const p of PAGES[ctxName]) {
      await capture(page, ctxName, vpName, p, report)
      writeReport(report)
    }

    if (ctxName === 'anon') {
      // Login modal, both views, plus the "check your email" state.
      await page.goto(BASE + '/', {
        waitUntil: 'domcontentloaded',
        timeout: 90_000,
      })
      await settle(page)
      await dismissCookieBanner(page)
      const dialog = await openModal(page)
      await page.waitForTimeout(400)
      await page.screenshot({
        path: path.join(OUT, 'anon', `login-modal--${vpName}.png`),
        fullPage: false,
      })
      const toSignIn = dialog.locator('button.link-btn', { hasText: 'Sign in' })
      if (await toSignIn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await toSignIn.click()
        await page.waitForTimeout(400)
        await page.screenshot({
          path: path.join(
            OUT,
            'anon',
            `login-modal-signin-view--${vpName}.png`
          ),
          fullPage: false,
        })
      }
    }

    if (ctxName === 'lender') {
      // A garden detail page, if any garden is listed.
      await page.goto(BASE + '/map', {
        waitUntil: 'domcontentloaded',
        timeout: 90_000,
      })
      await settle(page)
      const link = page.locator('a[href^="/garden/"]').first()
      const href = await link
        .getAttribute('href', { timeout: 3_000 })
        .catch(() => null)
      if (href)
        await capture(page, ctxName, vpName, href, report, 'garden-detail')
    }

    await ctx.close()
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
  })
  const report = []

  for (const ctxName of CONTEXTS) {
    try {
      await runContext(browser, ctxName, report)
    } catch (err) {
      console.error(
        `!! context ${ctxName} failed: ${String(err).slice(0, 400)}`
      )
      report.push({
        ctx: ctxName,
        viewport: '-',
        path: '(context)',
        file: '',
        ...newSink(),
        pageErrors: ['CONTEXT FAILED: ' + String(err).slice(0, 400)],
      })
    }
    writeReport(report)
  }

  await browser.close()
  writeReport(report)

  const problems = report.filter(
    (r) =>
      r.pageErrors.length ||
      r.console.length ||
      r.httpErrors.length ||
      r.hydration.length
  )
  console.log(
    `\nSaved ${report.length} captures to ${OUT}; ${problems.length} with problems.`
  )
  for (const r of problems) {
    console.log(
      `- ${r.ctx}/${r.viewport} ${r.path}: pageErrors=${r.pageErrors.length} console=${r.console.length} http=${r.httpErrors.length} hydration=${r.hydration.length}`
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
