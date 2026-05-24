import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretKey || !webhookSecret) {
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

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    if (userId) {
      const apiBase = process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2'
      await $fetch(`${apiBase}/session`, {
        method: 'PATCH',
        body: { id: parseInt(userId), settings: { lat_payment: { status: 'paid', paidAt: new Date().toISOString() } } },
      }).catch(() => {})
    }
  }

  return { received: true }
})
