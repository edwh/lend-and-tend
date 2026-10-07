import Stripe from 'stripe'
import { verifyLatJwt } from '../utils/latJwt'
import { paidCheckoutFromSession, markMemberPaid } from '../utils/stripePayment'

// Called by /join/success with the Checkout Session id Stripe put in the
// return URL. Confirms with Stripe that THIS member's checkout is paid and
// records it as them, using their own live token. This is what makes the
// unlock immediate on returning from Stripe (the webhook can lag by seconds),
// and it still works if the webhook could not (e.g. the member had logged out
// elsewhere and the webhook's minted token was refused).
export default defineEventHandler(async (event) => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const jwtSecret = process.env.JWT_SECRET
  if (!secretKey || !jwtSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Payment not configured' })
  }

  const rawToken = getHeader(event, 'authorization')
  const claims = verifyLatJwt(rawToken, jwtSecret)
  if (!claims || !rawToken) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in to confirm your payment' })
  }

  const body = await readBody<{ sessionId?: unknown }>(event)
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing checkout session' })
  }

  const stripe = new Stripe(secretKey)
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Checkout not found' })
  }

  const paid = paidCheckoutFromSession(session)
  if (!paid) {
    return { paid: false }
  }
  if (paid.userId !== claims.id) {
    // Someone else's checkout id. Never credit the caller for it.
    throw createError({ statusCode: 403, statusMessage: 'That payment is not yours' })
  }

  const apiBase = process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2'
  try {
    await markMemberPaid({
      apiBase,
      token: rawToken,
      payment: paid.payment,
      fetcher: (url, opts) => $fetch(url, opts as never),
    })
  } catch (err) {
    console.error('[checkout-confirm] failed to record payment', {
      userId: paid.userId,
      stripeSessionId: paid.payment.stripeSessionId,
      error: String(err),
    })
    throw createError({ statusCode: 502, statusMessage: 'Paid, but we could not update your account yet. Please refresh in a moment.' })
  }

  return { paid: true }
})
