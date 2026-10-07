/**
 * The Stripe side of the joining fee, as pure functions plus one injectable
 * API interaction, so every decision is unit-tested without Stripe or the API.
 *
 * Two routes use this: the Stripe webhook (checkout.session.completed) and
 * /api/checkout-confirm (the success page asking "did my payment go through?").
 * Both end in markMemberPaid, which reads the member's current settings and
 * writes them back with lat_payment set. That read-merge-write is essential:
 * PATCH /session REPLACES the settings blob, so writing { lat_payment } alone
 * would wipe the member's location and notification preferences.
 */

export interface LatPaymentRecord {
  status: 'paid'
  method: 'stripe'
  paidAt: string
  stripeSessionId: string
  amount?: number
  currency?: string
}

export interface PaidCheckout {
  userId: string
  sessionId: string
  payment: LatPaymentRecord
}

function isPositiveIntString(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9][0-9]*$/.test(value)
}

/**
 * From a Stripe Checkout Session object, the member/session it was started
 * for and the payment record to store, or null if it is not a paid checkout
 * we can attribute to a member.
 */
export function paidCheckoutFromSession(session: unknown, now: Date = new Date()): PaidCheckout | null {
  if (!session || typeof session !== 'object') return null
  const s = session as Record<string, unknown>
  if (s.payment_status !== 'paid') return null
  if (typeof s.id !== 'string' || !s.id) return null

  const metadata = s.metadata
  if (!metadata || typeof metadata !== 'object') return null
  const { userId, sessionId } = metadata as Record<string, unknown>
  if (!isPositiveIntString(userId) || !isPositiveIntString(sessionId)) return null

  const payment: LatPaymentRecord = {
    status: 'paid',
    method: 'stripe',
    paidAt: now.toISOString(),
    stripeSessionId: s.id,
  }
  if (typeof s.amount_total === 'number') payment.amount = s.amount_total
  if (typeof s.currency === 'string') payment.currency = s.currency

  return { userId, sessionId, payment }
}

/**
 * The settings blob to write back: everything the member already had, with
 * lat_payment replaced. Tolerates the API's representations (object, JSON
 * string, null) and never mutates its input.
 */
export function mergePaidSettings(existing: unknown, payment: LatPaymentRecord): Record<string, unknown> {
  let base: unknown = existing
  if (typeof base === 'string') {
    try {
      base = JSON.parse(base)
    } catch {
      base = null
    }
  }
  const obj = base && typeof base === 'object' && !Array.isArray(base) ? (base as Record<string, unknown>) : {}
  return { ...obj, lat_payment: { ...payment } }
}

export type Fetcher = (url: string, opts?: Record<string, unknown>) => Promise<unknown>

export interface MarkMemberPaidArgs {
  apiBase: string
  /** A token the API accepts for the member (their own, or one minted for them). */
  token: string
  payment: LatPaymentRecord
  fetcher: Fetcher
}

/**
 * Read-merge-write of lat_payment as the member. Throws if either call fails
 * so the caller can decide (the webhook returns non-2xx so Stripe retries).
 */
export async function markMemberPaid({ apiBase, token, payment, fetcher }: MarkMemberPaidArgs): Promise<void> {
  const headers = { Authorization: token }
  const current = (await fetcher(`${apiBase}/session`, { headers })) as { me?: { settings?: unknown } } | null
  const settings = mergePaidSettings(current?.me?.settings, payment)
  await fetcher(`${apiBase}/session`, { method: 'PATCH', headers, body: { settings } })
}
