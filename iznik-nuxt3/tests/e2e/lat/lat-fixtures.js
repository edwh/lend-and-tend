// @ts-check
const crypto = require('crypto')
const { test: base, expect } = require('@playwright/test')

const LAT_BASE_URL = process.env.LAT_BASE_URL || 'http://localhost:4002'

function generateTestEmail() {
  const hash = crypto.randomBytes(4).toString('hex')
  return `lat-test-${hash}@test.lat`
}

const test = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      baseURL: LAT_BASE_URL,
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1280, height: 720 },
    })
    const page = await context.newPage()
    try {
      await use(page)
    } finally {
      await context.close()
    }
  },
})

/**
 * Clicks a server-rendered control and waits for its effect, retrying the click
 * until it lands. SSR markup is visible/enabled before Vue hydrates and attaches
 * the @click handler, so the first click is often swallowed (a no-op) and the
 * expected effect never happens — the classic Nuxt hydration race. Re-clicking
 * until the effect appears is the robust cure (idempotent clicks only).
 *
 * @param {import('@playwright/test').Locator} control  element to click
 * @param {import('@playwright/test').Locator} effect   element that proves the click landed
 */
async function clickUntilHydrated(control, effect, timeout = 15_000) {
  await expect(async () => {
    await control.click()
    await expect(effect).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout })
}

/**
 * Opens the login modal by clicking the "Sign in" button in the navbar.
 */
async function openLoginModal(page) {
  const signInBtn = page.getByRole('button', { name: 'Sign in' }).first()
  await expect(signInBtn).toBeVisible({ timeout: 10_000 })
  await clickUntilHydrated(signInBtn, page.getByRole('dialog'))
}

/**
 * Signs up a new user via the login modal.
 * Returns { email, password, fullname }.
 */
async function signUpViaModal(page, opts = {}) {
  const email = opts.email || generateTestEmail()
  const password = opts.password || 'TestPassword123!'
  const fullname = opts.fullname || `Test User ${Date.now()}`

  await openLoginModal(page)

  // Switch to sign-up view if we're on login view
  const dialog = page.getByRole('dialog')
  const joinBtn = dialog.getByRole('button', { name: 'Join Lend & Tend' })
  if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await joinBtn.click()
  }

  await expect(
    dialog.getByRole('heading', { name: 'Join Lend & Tend' })
  ).toBeVisible()

  await dialog.locator('#lat-fullname').fill(fullname)
  await dialog.locator('#lat-email').fill(email)
  await dialog.locator('#lat-password').fill(password)
  // Role is required for sign-up
  const role = opts.role || 'lender'
  const roleSelect = dialog.locator('#lat-role')
  if (await roleSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await roleSelect.selectOption(role)
  }
  await dialog.getByRole('button', { name: 'Join Lend & Tend' }).click()

  // Should redirect to /onboarding after sign-up
  await expect(page).toHaveURL(/\/(onboarding|map)/, { timeout: 15_000 })
  // Navigate past onboarding to /map for other tests
  if (page.url().includes('/onboarding')) {
    await page.goto('/map')
  }
  await expect(page).toHaveURL(/\/map/, { timeout: 10_000 })
  // Wait for nav to confirm auth is persisted before returning
  await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })

  return { email, password, fullname }
}

/**
 * Returns a locator for the Logout link in the navbar (nuxt-link renders as <a>).
 */
function logoutLink(page) {
  return page.locator('a', { hasText: 'Logout' })
}

/**
 * Logs in via the login modal.
 */
async function loginViaModal(page, email, password) {
  await openLoginModal(page)

  const dialog = page.getByRole('dialog')

  // If shown in sign-up view, switch to login via footer link
  const isSignUp = await dialog
    .getByRole('heading', { name: 'Join Lend & Tend' })
    .isVisible({ timeout: 2_000 })
    .catch(() => false)
  if (isSignUp) {
    await dialog.locator('.link-btn', { hasText: 'Log in' }).click()
  }

  await expect(
    dialog.getByRole('heading', { name: 'Welcome back' })
  ).toBeVisible()

  await dialog.locator('#lat-email').fill(email)
  await dialog.locator('#lat-password').fill(password)
  await dialog.locator('button.btn-submit').click()

  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 })
}

/**
 * Marks the currently signed-in user as paid (via concession route) so they can send messages.
 * Call this after signUpViaModal when the test needs messaging capability.
 */
async function markUserAsPaid(page) {
  await page.goto('/join')
  const concessionTab = page.locator('.join-tab', { hasText: 'Concession' })
  await expect(concessionTab).toBeVisible({ timeout: 15_000 })
  // Click the tab until it actually activates — it's server-rendered, so it's
  // clickable before Vue hydrates and the first click can be a no-op.
  await clickUntilHydrated(
    concessionTab,
    page.locator('.join-tab--active', { hasText: 'Concession' })
  )
  await expect(page.locator('#concessionReason')).toBeVisible({
    timeout: 10_000,
  })
  await page
    .locator('#concessionReason')
    .fill('E2E test user — automated concession')
  await page.getByRole('button', { name: 'Apply for concession' }).click()
  await expect(page.getByText(/Request received/)).toBeVisible({
    timeout: 10_000,
  })
}

/**
 * Navigates to /chats and polls until the given text appears in the chat list.
 *
 * Chat messages are created with processingrequired=1 (invisible to recipients until
 * the batch worker processes them). The batch-worker container runs chats:process-incoming
 * every 60 s. Each attempt reloads /chats so fetchChats() returns fresh data; the text
 * will appear once the batch job has set processingsuccessful=1.
 */
async function waitForChatEntry(page, textContent, maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto('/chats')
    await expect(logoutLink(page)).toBeVisible({ timeout: 10_000 })
    try {
      await expect(page.getByText(textContent).first()).toBeVisible({
        timeout: 10_000,
      })
      return
    } catch (e) {
      if (attempt === maxAttempts) throw e
    }
  }
}

/**
 * Fills the GardenLocationPicker component: enters postcode, confirms it,
 * then fills the manual address field (dev environment has no PAF data).
 */
async function fillLocationPicker(
  page,
  postcode = 'SW1A 1AA',
  address = '10 Test Street'
) {
  await page.locator('#lat-postcode-input').fill(postcode)
  await page.getByRole('button', { name: 'Find →' }).click()
  // Wait for Step 2: either PAF property dropdown or manual address input
  await expect(page.locator('#lat-address-manual')).toBeVisible({
    timeout: 15_000,
  })
  await page.locator('#lat-address-manual').fill(address)
  await expect(page.locator('.status-ok')).toBeVisible({ timeout: 5_000 })
}

module.exports = {
  test,
  expect,
  signUpViaModal,
  loginViaModal,
  openLoginModal,
  clickUntilHydrated,
  logoutLink,
  generateTestEmail,
  waitForChatEntry,
  markUserAsPaid,
  fillLocationPicker,
  LAT_BASE_URL,
}
