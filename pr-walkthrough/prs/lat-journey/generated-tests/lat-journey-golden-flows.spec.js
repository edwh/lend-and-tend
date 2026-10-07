// GOLDEN-FLOW regression tests generated from lat-journey/capture-plan.json by
// pr-walkthrough/src/plan-to-playwright.mjs. These are the same flows the walkthrough
// video shows. Drop into iznik-nuxt3/tests/e2e/. Each test asserts the golden state
// reached (the controls the video highlights). Seeded ids/emails come from env
// (see env-from-testenvs.mjs / test-envs.json); TEST_BASE_URL sets the target.
const { test, expect } = require('@playwright/test')
const { loginViaHomepage } = require('./utils/user')

test.describe('lat-journey golden flows (from walkthrough)', () => {
  test('golden flow: home', async ({ page }) => {
    await page.goto(`/`, { waitUntil: 'networkidle' })
    await expect(page.getByText("Patch Matched").first()).toBeVisible()
    await page.waitForTimeout(2500)
    await page.getByText("Essential only").first().click()
    await page.waitForTimeout(800)
    await expect(page.locator("button:has-text(\"Sign in\")").first()).toBeVisible() // Sign in or join
  })

  test('golden flow: signup', async ({ page }) => {
    await page.goto(`/`, { waitUntil: 'networkidle' })
    await expect(page.getByText("Patch Matched").first()).toBeVisible()
    await page.waitForTimeout(2500)
    await page.getByText("Essential only").first().click()
    await page.waitForTimeout(800)
    await page.locator("button:has-text(\"Sign in\")").first().click()
    await expect(page.locator("[role=dialog]").first()).toBeVisible()
    await page.waitForTimeout(800)
    await page.getByText("Join Lend & Tend").first().click()
    await expect(page.locator("#lat-fullname").first()).toBeVisible()
    await page.locator("#lat-fullname").first().fill(`Priya Shah`)
    await page.locator("#lat-email").first().fill(`priya.shah@example.com`)
    await page.locator("#lat-role").first().selectOption(`lender`)
    await page.waitForTimeout(500)
    await expect(page.locator("#lat-fullname").first()).toBeVisible() // Your name
    await expect(page.locator("#lat-email").first()).toBeVisible() // Your email - no password to remember
    await expect(page.locator("#lat-role").first()).toBeVisible() // Lending, tending, or both
    await expect(page.locator("[role=dialog] button.btn-submit").first()).toBeVisible() // Join
  })

  test('golden flow: signin-email', async ({ page }) => {
    await page.goto(`/view/${process.env.MAIL1_ID}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
  })

  test('golden flow: onboarding', async ({ page }) => {
    await loginViaHomepage(page, process.env.LENDER1_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/onboarding`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
  })

  test('golden flow: join', async ({ page }) => {
    await loginViaHomepage(page, process.env.UNPAID_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/join`, { waitUntil: 'networkidle' })
    await expect(page.locator(".join-tab").first()).toBeVisible()
    await page.waitForTimeout(1200)
    await expect(page.locator(".join-tab >> nth=0").first()).toBeVisible() // A small yearly membership keeps Lend & Tend running
    await expect(page.locator(".join-tab:has-text(\"Concession\")").first()).toBeVisible() // Or ask for a concession
  })

  test('golden flow: lend', async ({ page }) => {
    await loginViaHomepage(page, process.env.LENDER1_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/lend`, { waitUntil: 'networkidle' })
    await expect(page.locator("#subject").first()).toBeVisible()
    await page.locator("#subject").first().fill(`Sunny back garden with raised beds`)
    await page.locator("#about").first().fill(`Four raised beds, a small greenhouse and a water butt, in a south-facing back garden. I built it all a few years ago and now struggle to keep up. It would make me happy to see it full of veg again.`)
    await page.locator("#arrangement").first().fill(`Help with the mowing in return for use of the veg patch, or pure goodwill.`)
    await page.locator("#restrictions").first().fill(`No commercial growing, and please no bonfires.`)
    await page.waitForTimeout(600)
    await expect(page.locator("#subject").first()).toBeVisible() // Name your garden
    await expect(page.locator("#about").first()).toBeVisible() // Describe what it's like
    await expect(page.locator(".app-photo-uploader").first()).toBeVisible() // Add real photos of your garden
    await expect(page.locator("#arrangement").first()).toBeVisible() // What you're hoping for
    await expect(page.locator("#restrictions").first()).toBeVisible() // Any ground rules
  })

  test('golden flow: profile', async ({ page }) => {
    await loginViaHomepage(page, process.env.LENDER1_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/profile`, { waitUntil: 'networkidle' })
    await expect(page.locator(".garden-photo").first()).toBeVisible()
    await page.waitForTimeout(1200)
    await expect(page.locator(".garden-status").first()).toBeVisible() // Your listing, and where it is up to
    await expect(page.locator(".garden-photo").first()).toBeVisible() // Your photo, live on the listing
  })

  test('golden flow: map', async ({ page }) => {
    await loginViaHomepage(page, process.env.TENDER1_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/map`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(4000)
  })

  test('golden flow: garden', async ({ page }) => {
    await loginViaHomepage(page, process.env.TENDER1_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/garden/${process.env.GARDEN1_ID}`, { waitUntil: 'networkidle' })
    await expect(page.locator("button:has-text(\"Send message\")").first()).toBeVisible()
    await expect(page.locator(".garden-photo").first()).toBeVisible()
    await page.waitForTimeout(1200)
    await expect(page.locator("h1").first()).toBeVisible() // Priya's garden
    await expect(page.locator(".garden-photo").first()).toBeVisible() // A real photo of the garden
    await expect(page.locator("button:has-text(\"Send message\")").first()).toBeVisible() // Message Priya to get started
  })

  test('golden flow: chats-lender', async ({ page }) => {
    await loginViaHomepage(page, process.env.LENDER3_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/chats`, { waitUntil: 'networkidle' })
    await expect(page.getByText("Sam Okafor").first()).toBeVisible()
    await page.waitForTimeout(1500)
  })

  test('golden flow: chat-lender', async ({ page }) => {
    await loginViaHomepage(page, process.env.LENDER3_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/chats/${process.env.CHAT3_ID}`, { waitUntil: 'networkidle' })
    await expect(page.locator("#chatmessage").first()).toBeVisible()
    await expect(page.getByText("raised beds look wonderful").first()).toBeVisible()
    await page.waitForTimeout(1200)
    await expect(page.locator("#chatmessage").first()).toBeVisible() // Reply to Sam
    await expect(page.locator("button:has-text(\"Sign agreement\"):visible").first()).toBeVisible() // When you're both ready, propose an agreement
    await expect(page.locator("button:has-text(\"Send address\"):visible").first()).toBeVisible() // Share your address privately, only when you choose
  })

  test('golden flow: chat-tender', async ({ page }) => {
    await loginViaHomepage(page, process.env.TENDER1_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/chats/${process.env.CHAT1_ID}`, { waitUntil: 'networkidle' })
    await expect(page.locator("a.btn-view-agreement").first()).toBeVisible()
    await page.waitForTimeout(1200)
    await expect(page.locator("#chatmessage").first()).toBeVisible() // Chat back and forth
    await expect(page.locator("a.btn-view-agreement").first()).toBeVisible() // Priya has sent an agreement to look at
  })

  test('golden flow: agreement-proposed', async ({ page }) => {
    await loginViaHomepage(page, process.env.TENDER1_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/agreement/${process.env.GARDEN1_ID}?userId=${process.env.LENDER1_ID}`, { waitUntil: 'networkidle' })
    await expect(page.locator(".status-banner.proposed").first()).toBeVisible()
    await page.waitForTimeout(800)
    await expect(page.locator("#whatToGrow").first()).toBeVisible() // What you'll grow
    await expect(page.locator("#accessTimes").first()).toBeVisible() // When you'll visit
    await expect(page.locator(".ground-rule").first()).toBeVisible() // A few ground rules, agreed up front
    await expect(page.locator("#endDate").first()).toBeVisible() // A review date - a season to try it
    await expect(page.locator("button:has-text(\"Accept and confirm\")").first()).toBeVisible() // Accept when you're happy
  })

  test('golden flow: agreement-confirmed', async ({ page }) => {
    await loginViaHomepage(page, process.env.TENDER2_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/agreement/${process.env.GARDEN2_ID}?userId=${process.env.LENDER2_ID}`, { waitUntil: 'networkidle' })
    await expect(page.locator(".next-steps").first()).toBeVisible()
    await page.waitForTimeout(800)
    await expect(page.locator(".status-banner.confirmed").first()).toBeVisible() // Agreed - both of you are set
  })

  test('golden flow: timeline', async ({ page }) => {
    await loginViaHomepage(page, process.env.TENDER2_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/agreement/${process.env.GARDEN2_ID}?userId=${process.env.LENDER2_ID}`, { waitUntil: 'networkidle' })
    await expect(page.locator(".lat-timeline").first()).toBeVisible()
    await page.waitForTimeout(800)
  })

  test('golden flow: checkin', async ({ page }) => {
    await loginViaHomepage(page, process.env.TENDER2_EMAIL, process.env.TEST_PASSWORD || 'freegle')
    await page.goto(`/checkin/${process.env.GARDEN2_ID}`, { waitUntil: 'networkidle' })
    await expect(page.locator(".status-options").first()).toBeVisible()
    await page.waitForTimeout(800)
    await expect(page.locator(".status-options").first()).toBeVisible() // How's it going?
    await expect(page.locator("#checkin-note").first()).toBeVisible() // Add a note if you like
  })
})
