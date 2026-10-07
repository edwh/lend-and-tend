import { signLatJwt, verifyLatJwt } from '../utils/latJwt'
import { markMemberPaid } from '../utils/stripePayment'

// DEV ONLY: "pretend to pay". Mirrors the client-side LAT_ALLOW_FAKE_PAYMENT
// gate (never in production, on by default elsewhere) and does not exist at
// all in a production build: it 404s. Writes lat_payment the same way the
// Stripe paths do, with a server-minted token, so it keeps working once the
// API protects that key from the member's own writes.
export default defineEventHandler(async (event) => {
  const allowed =
    process.env.NODE_ENV !== 'production' && process.env.LAT_ALLOW_FAKE_PAYMENT !== 'false'
  if (!allowed) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Not configured' })
  }

  const claims = verifyLatJwt(getHeader(event, 'authorization'), jwtSecret)
  if (!claims) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in first' })
  }

  const apiBase = process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2'
  await markMemberPaid({
    apiBase,
    token: signLatJwt({ id: claims.id, sessionid: claims.sessionid, service: true }, jwtSecret),
    payment: { status: 'paid', method: 'dev_bypass', paidAt: new Date().toISOString() },
    fetcher: (url, opts) => $fetch(url, opts as never),
  })

  return { ok: true }
})
