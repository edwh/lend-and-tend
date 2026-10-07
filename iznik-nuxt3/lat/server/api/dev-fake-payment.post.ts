import { signLatJwt, verifyLatJwt } from '../utils/latJwt'
import { markMemberPaid } from '../utils/stripePayment'
import { fakePaymentAllowed } from '../utils/devGate'
import { guardBrowserPost } from '../utils/requestGuard'

// DEV ONLY: "pretend to pay". Exists only where ../utils/devGate says so
// (a development server, or an explicit LAT_ALLOW_FAKE_PAYMENT=true), and
// 404s everywhere else, including any environment that forgot to set
// NODE_ENV. Writes lat_payment the same way the Stripe paths do, with a
// server-minted token, so it keeps working once the API protects that key
// from the member's own writes.
export default defineEventHandler(async (event) => {
  if (!fakePaymentAllowed(process.env)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  guardBrowserPost(event, { maxBytes: 4 * 1024, requireJson: false })

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
    token: signLatJwt(
      { id: claims.id, sessionid: claims.sessionid, service: true },
      jwtSecret
    ),
    payment: {
      status: 'paid',
      method: 'dev_bypass',
      paidAt: new Date().toISOString(),
    },
    fetcher: (url, opts) => $fetch(url, opts as never),
  })

  return { ok: true }
})
