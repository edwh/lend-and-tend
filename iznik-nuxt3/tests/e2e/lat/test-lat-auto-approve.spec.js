// @ts-check
//
// Regression test for the auto-approve flow.
//
// Backend setup that must be present for this test to pass:
//   1. `groups.settings.defaultpostingstatus = 'UNMODERATED'` on the L&T
//      world group (id 1000000).
//   2. BEFORE-INSERT trigger on `memberships` that flips a NULL/DEFAULT
//      ourPostingStatus to 'UNMODERATED' for group 1000000. Both are
//      installed by migration
//      `iznik-batch/database/migrations/2026_05_25_000001_lat_world_auto_unmoderated.php`.
//
// Without those, a brand-new user's first garden lands as
// `collection='Pending'` and never reaches the public listing API, so
// other users wouldn't see it on the map.
//
// This test does the whole flow against the public HTTP API rather than
// driving the UI — avoids flakiness in third-party services
// (postcodes.io) and the location-picker UI, and runs in a couple of
// seconds.
const { test, expect } = require('@playwright/test')

const LAT_BASE_URL = process.env.LAT_BASE_URL || 'http://localhost:4002'
const API_BASE = process.env.LAT_API_BASE || 'http://localhost:4001/apiv2'
const WORLD_GROUPID = 1000000

function uniqEmail() {
  return `e2e-autoapprove-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`
}

test.describe('Auto-approve regression (API-only)', () => {
  test('garden posted by a new user appears in the public Approved listing without admin action', async ({
    request,
  }) => {
    // --- Sign up a brand-new user via the API ---
    const email = uniqEmail()
    const password = 'TestPassword123!'
    const fullname = `E2E AutoApprove ${Date.now()}`

    // UserAPI.signUp uses PUT /user (see iznik-nuxt3/api/UserAPI.js:118).
    const signupResp = await request.put(`${API_BASE}/user`, {
      data: {
        email,
        password,
        firstname: 'E2E',
        lastname: 'AutoApprove',
        fullname,
      },
    })
    expect(signupResp.ok(), `signup should succeed: ${signupResp.status()}`).toBe(true)
    const signupBody = await signupResp.json()
    const persistent = signupBody.persistent
    const jwt = signupBody.jwt
    expect(persistent, 'signup returns persistent session token').toBeTruthy()
    expect(jwt, 'signup returns jwt').toBeTruthy()

    // BaseAPI.js sends Authorization = JSON.stringify(jwt) and
    // Authorization2 = JSON.stringify(persistent). The Go server expects
    // both to be JSON-string-quoted strings (i.e. wrapped in double quotes).
    const authHeaders = {
      Authorization: JSON.stringify(jwt),
      Authorization2: JSON.stringify(persistent),
    }

    // --- Create a draft message (PUT /message returns an id) ---
    // The PutMessage handler doesn't take lat/lng — those are set via a
    // subsequent PATCH /message. See iznik-server-go/message/message.go.
    const subject = `Offer: ${fullname}`
    const draftResp = await request.put(`${API_BASE}/message`, {
      headers: authHeaders,
      data: {
        type: 'Offer',
        subject,
        item: fullname,
        textbody: 'E2E auto-approve regression test — small garden in central London.',
        groupid: WORLD_GROUPID,
        availablenow: 1,
        availableinitially: 1,
      },
    })
    expect(draftResp.ok(), `draft PUT should succeed: ${draftResp.status()}`).toBe(true)
    const draft = await draftResp.json()
    const msgId = draft.id
    expect(msgId, 'PUT /message returns an id').toBeTruthy()

    // --- Attach a location via PATCH /message (lat/lng) ---
    const saveResp = await request.patch(`${API_BASE}/message`, {
      headers: authHeaders,
      data: { id: msgId, lat: 51.5014, lng: -0.1419 },
    })
    expect(saveResp.ok(), `PATCH /message location should succeed: ${saveResp.status()}`).toBe(true)

    // --- Publish: POST /message action=JoinAndPost ---
    const postResp = await request.post(`${API_BASE}/message`, {
      headers: authHeaders,
      data: { id: msgId, action: 'JoinAndPost', groupid: WORLD_GROUPID, email },
    })
    expect(postResp.ok(), `JoinAndPost should succeed: ${postResp.status()}`).toBe(true)

    // --- Verify the new garden appears in the public Approved listing ---
    // Anonymous request — no auth needed for the public map endpoint.
    // The cron runs every 60s, then contentcheck takes a couple of seconds
    // to scan ~hundreds of pending rows in the L&T world group. 150s
    // safely covers one full cron cycle (worst-case post-just-after-tick)
    // plus the contentcheck run itself.
    await expect
      .poll(
        async () => {
          const resp = await request.get(
            `${API_BASE}/messages?groupid=${WORLD_GROUPID}&collection=Approved&limit=200`,
            { headers: {} }
          )
          if (!resp.ok()) return []
          const j = await resp.json()
          return (j.messages || []).map((m) => m.id)
        },
        {
          timeout: 150_000,
          intervals: [500, 1000, 2000, 5000, 10_000],
          message: `expected message ${msgId} to appear in the public Approved listing within 150s (one scheduler cycle + contentcheck runtime)`,
        }
      )
      .toContain(msgId)
  })
})

// Silence the unused warning — the base URL is for documentation.
void LAT_BASE_URL
