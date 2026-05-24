import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Payment not configured' })
  }

  const body = await readBody<{ userId?: number }>(event)
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
            description: 'One-off fee — declaration of intent to find a garden match.',
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: body.userId ? String(body.userId) : '',
    },
    success_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:4002/join/success',
    cancel_url: process.env.STRIPE_CANCEL_URL || 'http://localhost:4002/join',
  })

  return { url: session.url }
})
