import Stripe from 'stripe'
import { verifyLatJwt } from '../utils/latJwt'
import {
  guardBrowserPost,
  createRateLimiter,
  rateLimitOrThrow,
} from '../utils/requestGuard'

// Starts a Stripe Checkout for the £12 joining fee.
//
// The member is identified from THEIR OWN session token (the same JWT the
// browser sends to the Go API), never from the request body: the webhook
// later marks exactly this user as paid, so the id must be one the caller
// actually holds. The session id travels alongside it in the Stripe metadata
// so the webhook can mint a token the API's auth middleware will accept (it
// requires a live `sessions` row for the JWT's sessionid).
//
// Every call creates a Checkout Session at Stripe, so the route is braked per
// member and must come from our own page (no body is needed, so only the
// cross-site and size checks apply).
const limiter = createRateLimiter({ max: 10, windowMs: 10 * 60 * 1000 })

export default defineEventHandler(async (event) => {
  guardBrowserPost(event, { maxBytes: 4 * 1024, requireJson: false })

  const secretKey = process.env.STRIPE_SECRET_KEY
  const jwtSecret = process.env.JWT_SECRET
  if (!secretKey || !jwtSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Payment not configured',
    })
  }

  const claims = verifyLatJwt(getHeader(event, 'authorization'), jwtSecret)
  if (!claims) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in to pay' })
  }
  rateLimitOrThrow(event, limiter, `user:${claims.id}`)

  const stripe = new Stripe(secretKey)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          unit_amount: 1200,
          product_data: {
            name: 'Lend & Tend joining fee',
            description:
              'One-off fee — declaration of intent to find a garden match.',
          },
        },
        quantity: 1,
      },
    ],
    client_reference_id: claims.id,
    metadata: {
      userId: claims.id,
      sessionId: claims.sessionid,
    },
    // Stripe substitutes the session id on return so /join/success can
    // confirm the payment itself via /api/checkout-confirm.
    success_url: withSessionId(
      process.env.STRIPE_SUCCESS_URL || 'http://localhost:4002/join/success'
    ),
    cancel_url: process.env.STRIPE_CANCEL_URL || 'http://localhost:4002/join',
  })

  return { url: session.url }
})

function withSessionId(url: string): string {
  return (
    url + (url.includes('?') ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}'
  )
}
