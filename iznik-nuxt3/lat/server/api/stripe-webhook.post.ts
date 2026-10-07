import Stripe from 'stripe'
import { signLatJwt } from '../utils/latJwt'
import { paidCheckoutFromSession, markMemberPaid } from '../utils/stripePayment'

// Stripe calls this after a Checkout completes. We verify the signature, work
// out which member paid (from the metadata /api/checkout wrote), then act as
// that member for two API calls to record lat_payment. Any failure returns a
// non-2xx so Stripe retries delivery; /api/checkout-confirm (called from the
// success page) covers the same ground from the member's own browser, so the
// two paths are belt and braces for each other.
export default defineEventHandler(async (event) => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const jwtSecret = process.env.JWT_SECRET
  if (!secretKey || !webhookSecret || !jwtSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Payment not configured' })
  }

  const rawBody = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')
  if (!rawBody || !signature) {
    throw createError({ statusCode: 400, statusMessage: 'Missing body or signature' })
  }

  const stripe = new Stripe(secretKey)
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid signature' })
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    return { received: true }
  }

  const paid = paidCheckoutFromSession(stripeEvent.data.object)
  if (!paid) {
    // Completed but not paid (delayed payment methods), or started outside
    // /api/checkout so there is no member to credit. Nothing to record.
    console.warn('[stripe-webhook] completed checkout with nothing to record', {
      stripeSessionId: (stripeEvent.data.object as { id?: string }).id,
    })
    return { received: true }
  }

  const apiBase = process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2'
  try {
    await markMemberPaid({
      apiBase,
      token: signLatJwt({ id: paid.userId, sessionid: paid.sessionId }, jwtSecret),
      payment: paid.payment,
      fetcher: (url, opts) => $fetch(url, opts as never),
    })
  } catch (err) {
    // If the member logged out between paying and this call, their session
    // row is gone and the minted token is refused; retries will keep failing
    // and the success-page confirmation is the path that still works. Log
    // enough to find the payment either way.
    console.error('[stripe-webhook] failed to record payment', {
      userId: paid.userId,
      stripeSessionId: paid.payment.stripeSessionId,
      error: String(err),
    })
    throw createError({ statusCode: 502, statusMessage: 'Could not record payment; Stripe will retry' })
  }

  return { received: true }
})
