const { chromium } = require('playwright')
const crypto = require('crypto')

async function run() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ baseURL: 'http://localhost:4002', viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()

  page.on('console', msg => {
    if (msg.text().includes('[chat]')) {
      console.log('PAGE LOG:', msg.text())
    }
  })
  
  page.on('requestfinished', async req => {
    if (req.url().includes('/apiv2/chat') && !req.url().includes('messages')) {
      try {
        const resp = await req.response()
        const body = await resp.text()
        console.log(`NET [${req.method()}] ${req.url().split('?')[0]}?... → ${resp.status()} ${body.slice(0, 200)}`)
      } catch(e) {}
    }
  })

  // Sign up lender
  const lenderEmail = `lender-${crypto.randomBytes(4).toString('hex')}@test.lat`
  const tenderEmail = `tender-${crypto.randomBytes(4).toString('hex')}@test.lat`
  const pw = 'TestPassword123!'

  async function signUp(p, email) {
    await p.goto('/')
    await p.getByRole('button', { name: 'Sign in' }).first().click()
    await p.getByRole('dialog').waitFor({ state: 'visible' })
    const d = p.getByRole('dialog')
    const joinBtn = d.getByRole('button', { name: 'Join Lend & Tend' })
    if (await joinBtn.isVisible({ timeout: 2000 }).catch(() => false)) await joinBtn.click()
    await d.locator('#lat-fullname').fill('Test User ' + Date.now())
    await d.locator('#lat-email').fill(email)
    await d.locator('#lat-password').fill(pw)
    await d.getByRole('button', { name: 'Join' }).click()
    await p.waitForURL(/\/(map|$)/, { timeout: 30000 }).catch(() => {})
  }

  console.log('Sign up lender...')
  await signUp(page, lenderEmail)
  
  // Post garden
  await page.goto('/lend')
  await page.locator('#subject').fill('Debug Chat Test Garden')
  await page.locator('#about').fill('Test description')
  await page.locator('#location').fill('SW1A 1AA')
  await page.getByRole('button', { name: 'Find location' }).click()
  await page.locator('.status-ok').waitFor({ state: 'visible', timeout: 10000 })
  
  const msgRespP = page.waitForResponse(r => r.url().includes('/apiv2/message') && r.request().method() === 'PUT')
  await page.getByRole('button', { name: 'Post my garden' }).click()
  const msgResp = await msgRespP
  const msgBody = await msgResp.json()
  const gardenId = msgBody.id
  console.log('Garden ID:', gardenId)
  
  // Sign up tender in new context
  const ctx2 = await browser.newContext({ baseURL: 'http://localhost:4002', storageState: { cookies: [], origins: [] }, viewport: { width: 1280, height: 720 } })
  const tender = await ctx2.newPage()
  
  tender.on('console', msg => {
    if (msg.text().includes('[chat]')) console.log('TENDER PAGE LOG:', msg.text())
  })
  tender.on('requestfinished', async req => {
    if (req.url().includes('/apiv2/chat') && !req.url().includes('messages')) {
      try {
        const resp = await req.response()
        const body = await resp.text()
        console.log(`TENDER NET [${req.method()}] ${req.url().split('?')[0]} → ${resp.status()} ${body.slice(0, 300)}`)
      } catch(e) {}
    }
  })
  
  console.log('Sign up tender...')
  await signUp(tender, tenderEmail)
  
  console.log('Navigate to garden', gardenId)
  await tender.goto(`/garden/${gardenId}`)
  await tender.getByRole('button', { name: 'Send message' }).waitFor({ state: 'visible', timeout: 10000 })
  await tender.getByRole('button', { name: 'Send message' }).click()
  
  // Wait for navigation
  await tender.waitForURL(/\/chat\/\d+/, { timeout: 15000 })
  console.log('Navigated to:', tender.url())
  
  // Wait a bit for API calls
  await new Promise(r => setTimeout(r, 3000))
  
  const chatmsg = tender.locator('#chatmessage')
  const visible = await chatmsg.isVisible({ timeout: 100 }).catch(() => false)
  console.log('#chatmessage visible:', visible)
  
  const notVisible = tender.locator('text=That chat isn\'t for this account')
  const notVisibleShown = await notVisible.isVisible({ timeout: 100 }).catch(() => false)
  console.log('notVisible shown:', notVisibleShown)
  
  await browser.close()
}

run().catch(e => { console.error(e); process.exit(1) })
