/*
 * Accessibility + mobile probe for the conversation side of Lend & Tend.
 *
 * Runs axe-core (WCAG 2.1 A/AA + best practice) over each page at desktop and
 * phone widths, then checks two things axe does not: horizontal overflow and
 * tap targets smaller than 44x44 on the phone. Prints a readable report and
 * writes JSON next to it. Read-only apart from opening modals.
 *
 *   LAT_BASE_URL=http://localhost:4002 node tests/e2e/lat/tools/a11y-probe.cjs [outDir] [name,...]
 *
 * Seeded ids + storage states come from pr-walkthrough/prs/lat-journey
 * (see walkthrough-out/seed-journey.cjs).
 */
const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')
const { AxeBuilder } = require(path.resolve(
  __dirname,
  '../../../../lat/node_modules/@axe-core/playwright'
))

const BASE = process.env.LAT_BASE_URL || 'http://localhost:4002'
const SEED = path.resolve(
  __dirname,
  '../../../../../pr-walkthrough/prs/lat-journey'
)
const ids = JSON.parse(fs.readFileSync(path.join(SEED, 'ids.json'), 'utf8'))
const auth = (n) => path.join(SEED, `.auth-${n}.json`)
const OUT = path.resolve(process.argv[2] || '/tmp/lat-a11y')
const ONLY = (process.argv[3] || '').split(',').filter(Boolean)

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  phone: { width: 390, height: 844 },
}

const PAGES = [
  { name: 'chats-list', route: '/chats', auth: 'lender3' },
  {
    name: 'chat-plain',
    route: `/chats/${ids.CHAT3_ID}`,
    auth: 'lender3',
    waitFor: '#chatmessage',
  },
  {
    name: 'chat-agreement',
    route: `/chats/${ids.CHAT1_ID}`,
    auth: 'tender1',
    waitFor: '#chatmessage',
  },
  {
    name: 'agreement-proposed',
    route: `/agreement/${ids.GARDEN1_ID}?userId=${ids.LENDER1_ID}`,
    auth: 'tender1',
    waitFor: '.status-banner',
  },
  {
    name: 'agreement-confirmed',
    route: `/agreement/${ids.GARDEN2_ID}?userId=${ids.LENDER2_ID}`,
    auth: 'tender2',
    waitFor: '.status-banner',
  },
  {
    name: 'checkin',
    route: `/checkin/${ids.GARDEN2_ID}`,
    auth: 'tender2',
    waitFor: '.status-options',
  },
  {
    name: 'cookie-banner',
    route: '/',
    auth: null,
    waitFor: '.lat-cookie-consent',
    include: '.lat-cookie-consent',
  },
  {
    name: 'login-modal',
    route: '/',
    auth: null,
    steps: [{ click: 'button:has-text("Sign")' }],
    waitFor: '[role=dialog]',
    include: '.lat-modal-overlay',
  },
  {
    name: 'send-address-modal',
    route: `/chats/${ids.CHAT3_ID}`,
    auth: 'lender3',
    steps: [{ click: 'button:has-text("Send address"):visible' }],
    waitFor: '.modal.show, [role=dialog]',
    include: '.modal.show',
  },
]

function tapTargets(page) {
  return page.evaluate(() => {
    const out = []
    const els = document.querySelectorAll(
      'button, a[href], input, select, textarea, [role=button]'
    )
    for (const el of els) {
      const r = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      if (r.width === 0 || r.height === 0 || style.visibility === 'hidden')
        continue
      if (r.bottom < 0 || r.top > window.innerHeight * 3) continue
      if (r.width < 44 || r.height < 44) {
        const label = (
          el.getAttribute('aria-label') ||
          el.textContent ||
          el.value ||
          ''
        )
          .trim()
          .slice(0, 40)
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().split(' ').slice(0, 2).join('.'),
          label,
          w: Math.round(r.width),
          h: Math.round(r.height),
        })
      }
    }
    return out
  })
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const report = []
  try {
    for (const pg of PAGES) {
      if (ONLY.length && !ONLY.includes(pg.name)) continue
      for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
        const ctx = await browser.newContext({
          baseURL: BASE,
          viewport,
          ...(pg.auth ? { storageState: auth(pg.auth) } : {}),
        })
        const page = await ctx.newPage()
        const entry = {
          page: pg.name,
          viewport: vpName,
          violations: [],
          overflow: false,
          smallTargets: [],
          error: null,
        }
        try {
          await page.goto(pg.route, {
            waitUntil: 'networkidle',
            timeout: 45000,
          })
          for (const s of pg.steps || []) {
            if (s.click)
              await page.locator(s.click).first().click({ timeout: 15000 })
          }
          if (pg.waitFor)
            await page
              .locator(pg.waitFor)
              .first()
              .waitFor({ state: 'visible', timeout: 20000 })
          await page.waitForTimeout(1200)
          let builder = new AxeBuilder({ page }).withTags([
            'wcag2a',
            'wcag2aa',
            'wcag21a',
            'wcag21aa',
            'best-practice',
          ])
          if (pg.include) builder = builder.include(pg.include)
          const results = await builder.analyze()
          entry.violations = results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.length,
            targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
          }))
          entry.overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1
          )
          if (vpName === 'phone') entry.smallTargets = await tapTargets(page)
          await page.screenshot({
            path: path.join(OUT, `${pg.name}--${vpName}.png`),
            fullPage: vpName === 'phone',
          })
        } catch (e) {
          entry.error = String(e.message).split('\n')[0].slice(0, 160)
        }
        report.push(entry)
        const serious = entry.violations.filter((v) =>
          ['serious', 'critical'].includes(v.impact)
        )
        console.log(
          `${pg.name.padEnd(20)} ${vpName.padEnd(8)} ${
            entry.error
              ? 'ERROR ' + entry.error
              : `${entry.violations.length} violations (${serious.length} serious+)` +
                (entry.overflow ? ' | H-OVERFLOW' : '') +
                (entry.smallTargets.length
                  ? ` | ${entry.smallTargets.length} small targets`
                  : '')
          }`
        )
        for (const v of entry.violations) {
          console.log(
            `    [${v.impact}] ${v.id}: ${v.help} (${v.nodes}) -> ${v.targets[0]}`
          )
        }
        if (vpName === 'phone') {
          for (const t of entry.smallTargets.slice(0, 8))
            console.log(
              `    small: <${t.tag} .${t.cls}> "${t.label}" ${t.w}x${t.h}`
            )
        }
        await ctx.close()
      }
    }
  } finally {
    await browser.close()
  }
  fs.writeFileSync(
    path.join(OUT, 'report.json'),
    JSON.stringify(report, null, 2)
  )
  console.log(`\nreport: ${path.join(OUT, 'report.json')}`)
}

main().catch((e) => {
  console.error('PROBE_FAILED', e.message)
  process.exit(1)
})
