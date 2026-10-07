import { describe, it, expect, vi } from 'vitest'
import {
  paidCheckoutFromSession,
  mergePaidSettings,
  markMemberPaid,
} from '~/lat/server/utils/stripePayment'

// The Stripe webhook's two pure decisions: "did someone actually pay, and
// for which member/session?" and "what settings blob do we write back?".
// The second matters because PATCH /session REPLACES settings wholesale: a
// naive write of { lat_payment } would wipe the member's location, alert and
// notification preferences.

const paidSession = {
  id: 'cs_test_abc123',
  object: 'checkout.session',
  payment_status: 'paid',
  amount_total: 1200,
  currency: 'gbp',
  metadata: { userId: '42', sessionId: '7' },
}

describe('paidCheckoutFromSession', () => {
  it('extracts member, session and a payment record from a paid checkout', () => {
    const now = new Date('2026-10-07T10:00:00.000Z')
    expect(paidCheckoutFromSession(paidSession, now)).toEqual({
      userId: '42',
      sessionId: '7',
      payment: {
        status: 'paid',
        method: 'stripe',
        paidAt: '2026-10-07T10:00:00.000Z',
        stripeSessionId: 'cs_test_abc123',
        amount: 1200,
        currency: 'gbp',
      },
    })
  })

  it('ignores a checkout that is not paid (e.g. delayed payment methods)', () => {
    expect(
      paidCheckoutFromSession({ ...paidSession, payment_status: 'unpaid' })
    ).toBeNull()
    expect(
      paidCheckoutFromSession({
        ...paidSession,
        payment_status: 'no_payment_required',
      })
    ).toBeNull()
  })

  it('refuses a session without a usable member and session id', () => {
    expect(paidCheckoutFromSession({ ...paidSession, metadata: {} })).toBeNull()
    expect(
      paidCheckoutFromSession({ ...paidSession, metadata: { userId: '42' } })
    ).toBeNull()
    expect(
      paidCheckoutFromSession({
        ...paidSession,
        metadata: { userId: 'abc', sessionId: '7' },
      })
    ).toBeNull()
    expect(
      paidCheckoutFromSession({
        ...paidSession,
        metadata: { userId: '0', sessionId: '7' },
      })
    ).toBeNull()
    expect(
      paidCheckoutFromSession({ ...paidSession, metadata: null })
    ).toBeNull()
  })

  it('copes with garbage input', () => {
    expect(paidCheckoutFromSession(null)).toBeNull()
    expect(paidCheckoutFromSession('x')).toBeNull()
    expect(paidCheckoutFromSession({})).toBeNull()
  })

  it('omits amount and currency when Stripe does not supply them', () => {
    const rest = Object.fromEntries(
      Object.entries(paidSession).filter(
        ([key]) => key !== 'amount_total' && key !== 'currency'
      )
    )
    const r = paidCheckoutFromSession(rest)
    expect(r).not.toBeNull()
    expect(r.payment).not.toHaveProperty('amount')
    expect(r.payment).not.toHaveProperty('currency')
  })
})

describe('mergePaidSettings', () => {
  const payment = {
    status: 'paid',
    method: 'stripe',
    paidAt: '2026-10-07T10:00:00.000Z',
    stripeSessionId: 'cs_test_abc123',
  }

  it('keeps every other setting and replaces lat_payment', () => {
    const existing = {
      mylocation: { id: 1, name: 'S1 2BS', type: 'Postcode' },
      notifications: { email: true },
      lat_alert_frequency: 'daily',
      lat_payment: { status: 'concession', reason: 'student' },
    }
    const merged = mergePaidSettings(existing, payment)
    expect(merged).toEqual({
      mylocation: { id: 1, name: 'S1 2BS', type: 'Postcode' },
      notifications: { email: true },
      lat_alert_frequency: 'daily',
      lat_payment: payment,
    })
  })

  it('does not mutate the input', () => {
    const existing = { lat_payment: { status: 'concession' }, other: 1 }
    const snapshot = JSON.parse(JSON.stringify(existing))
    mergePaidSettings(existing, payment)
    expect(existing).toEqual(snapshot)
  })

  it('starts from an empty object when there are no settings yet', () => {
    expect(mergePaidSettings(undefined, payment)).toEqual({
      lat_payment: payment,
    })
    expect(mergePaidSettings(null, payment)).toEqual({ lat_payment: payment })
    expect(mergePaidSettings([], payment)).toEqual({ lat_payment: payment })
    expect(mergePaidSettings('oops', payment)).toEqual({ lat_payment: payment })
  })

  it('accepts settings delivered as a JSON string, as the API stores them', () => {
    const merged = mergePaidSettings(
      '{"mylocation":{"id":1},"lat_payment":{"status":"x"}}',
      payment
    )
    expect(merged).toEqual({ mylocation: { id: 1 }, lat_payment: payment })
  })
})

describe('markMemberPaid', () => {
  const payment = {
    status: 'paid',
    method: 'stripe',
    paidAt: '2026-10-07T10:00:00.000Z',
    stripeSessionId: 'cs_test_abc123',
  }

  it("reads the member's settings as them, then writes them back merged, as them", async () => {
    const calls = []
    const fetcher = vi.fn((url, opts = {}) => {
      calls.push({ url, ...opts })
      if (!opts.method) {
        return Promise.resolve({
          me: {
            id: 42,
            settings: {
              mylocation: { id: 1 },
              lat_payment: { status: 'concession' },
            },
          },
        })
      }
      return Promise.resolve({ ret: 0 })
    })

    await markMemberPaid({
      apiBase: 'http://api/apiv2',
      token: 'tok',
      payment,
      fetcher,
    })

    expect(calls).toHaveLength(2)
    expect(calls[0]).toMatchObject({
      url: 'http://api/apiv2/session',
      headers: { Authorization: 'tok' },
    })
    expect(calls[0].method).toBeUndefined()
    expect(calls[1]).toMatchObject({
      url: 'http://api/apiv2/session',
      method: 'PATCH',
      headers: { Authorization: 'tok' },
      body: { settings: { mylocation: { id: 1 }, lat_payment: payment } },
    })
  })

  it('still writes when the member has no settings yet', async () => {
    const fetcher = vi.fn((url, opts = {}) =>
      Promise.resolve(opts.method ? { ret: 0 } : { me: { id: 42 } })
    )
    await markMemberPaid({
      apiBase: 'http://api/apiv2',
      token: 'tok',
      payment,
      fetcher,
    })
    expect(fetcher.mock.calls[1][1].body).toEqual({
      settings: { lat_payment: payment },
    })
  })

  it('propagates an API failure so the caller can make Stripe retry', async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error('401 Unauthorized')))
    await expect(
      markMemberPaid({
        apiBase: 'http://api/apiv2',
        token: 'tok',
        payment,
        fetcher,
      })
    ).rejects.toThrow('401 Unauthorized')
    // Nothing is written if the read fails.
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
