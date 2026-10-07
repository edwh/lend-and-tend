/*
 * Admin verification probe: signs in as the demo admin (passwordless, via
 * Mailpit), then screenshots the pages the UX sweep cannot reach without an
 * argument or an interaction - a member's detail page and the user search
 * with a query typed in - and prints what they show.
 *
 *   LAT_BASE_URL=http://localhost:4002 node tests/e2e/lat/tools/admin-detail-probe.cjs <outDir> <userId> <searchTerm>
 */
const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')
const { loginViaModal } = require('../lat-fixtures')

const BASE = process.env.LAT_BASE_URL || 'http://localhost:4002'
const OUT = process.argv[2] || '/tmp/lat-admin-probe'
const USER_ID = process.argv[3] || '73'
const TERM = process.argv[4] || 'Priya'

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const context = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  await page.goto(BASE + '/')
  await loginViaModal(page, process.env.DOCS_ADMIN_EMAIL || 'admin@test.com')

  await page.goto(`${BASE}/admin/users/${USER_ID}`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(2500)
  await page.screenshot({
    path: path.join(OUT, 'user-detail.png'),
    fullPage: true,
  })
  console.log(
    'DETAIL:',
    (
      await page
        .locator('.info-card')
        .first()
        .innerText()
        .catch(() => '?')
    )
      .replace(/\s+/g, ' ')
      .slice(0, 300)
  )

  await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle' })
  await page.locator('.sinput').fill(TERM)
  await page.getByRole('button', { name: 'Search' }).click()
  await page.waitForTimeout(6000)
  await page.screenshot({
    path: path.join(OUT, 'user-search.png'),
    fullPage: true,
  })
  const rows = await page.locator('table.at tbody tr').count()
  console.log('SEARCH rows:', rows)
  if (rows) {
    console.log(
      'SEARCH first row:',
      (await page.locator('table.at tbody tr').first().innerText()).replace(
        /\s+/g,
        ' '
      )
    )
  } else {
    console.log(
      'SEARCH note:',
      await page
        .locator('.admin-card p')
        .first()
        .innerText()
        .catch(() => '')
    )
  }

  await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Search' }).click()
  await page.waitForTimeout(800)
  console.log(
    'EMPTY-QUERY hint:',
    await page
      .getByText('Type a name or email address to search.')
      .first()
      .innerText()
      .catch(() => '(none)')
  )

  await browser.close()
})().catch((e) => {
  console.error('PROBE_FAILED', e.message)
  process.exit(1)
})
