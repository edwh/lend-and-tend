// @ts-check
//
// Outsider's view of the Lend & Tend server routes (no browser: Playwright's
// request client only). Pins the request guards: the routes answer our own
// pages (JSON, same origin) and Stripe, and refuse the shapes an attacker can
// produce from elsewhere.
const { test, expect } = require('./lat-fixtures')

const BASE = process.env.LAT_BASE_URL || 'http://localhost:4002'

test.describe('Server route guards', () => {
  test('contact form refuses a cross-site form POST (CSRF shape) and cross-site JSON', async ({
    request,
  }) => {
    const form = await request.post(`${BASE}/api/contact`, {
      headers: {
        Origin: 'https://evil.example',
        'Sec-Fetch-Site': 'cross-site',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: 'name=Eve&email=eve@example.com&message=probe',
    })
    expect(form.status()).toBe(415)

    const json = await request.post(`${BASE}/api/contact`, {
      headers: {
        Origin: 'https://evil.example',
        'Sec-Fetch-Site': 'cross-site',
      },
      data: { name: 'Eve', email: 'eve@example.com', message: 'probe' },
    })
    expect(json.status()).toBe(403)

    const originOnly = await request.post(`${BASE}/api/contact`, {
      headers: { Origin: 'https://evil.example' },
      data: { name: 'Eve', email: 'eve@example.com', message: 'probe' },
    })
    expect(originOnly.status()).toBe(403)
  })

  test('contact form still validates a same-origin JSON request', async ({
    request,
  }) => {
    const res = await request.post(`${BASE}/api/contact`, {
      headers: { Origin: BASE, 'Sec-Fetch-Site': 'same-origin' },
      data: {},
    })
    // Reached the validator (not a guard refusal).
    expect(res.status()).toBe(400)
    expect((await res.json()).statusMessage || (await res.text())).toMatch(
      /required/
    )
  })

  test('an oversized declared body is refused before it is read', async ({
    request,
  }) => {
    // A real 70 KB body (the client sets Content-Length from it).
    const res = await request.post(`${BASE}/api/contact`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ message: 'x'.repeat(70_000) }),
    })
    expect(res.status()).toBe(413)
  })

  test('member routes need a valid token, and the Stripe webhook needs a signature', async ({
    request,
  }) => {
    for (const path of ['/api/concession-claim', '/api/checkout-confirm']) {
      const res = await request.post(`${BASE}${path}`, {
        headers: { Authorization: 'not.a.token' },
        data: { reason: 'x', sessionId: 'cs_test_x' },
      })
      // 401 when configured, 503 'Not configured' when Stripe/JWT are absent
      // on this stack; never 200.
      expect([401, 503]).toContain(res.status())
    }
    const hook = await request.post(`${BASE}/api/stripe-webhook`, {
      data: { type: 'checkout.session.completed' },
    })
    expect([400, 503]).toContain(hook.status())
  })
})
