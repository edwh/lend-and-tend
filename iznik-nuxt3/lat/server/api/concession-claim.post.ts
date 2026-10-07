import { signLatJwt, verifyLatJwt } from '../utils/latJwt'
import { markMemberPaid } from '../utils/stripePayment'

// A member asking for a concession instead of paying the joining fee. Records
// lat_payment = { status: 'concession', ... } for an admin to review.
//
// Written here, as the server, rather than by the browser: with the API's
// PROTECTED_SETTINGS_KEYS switch on, a member's own PATCH cannot change
// lat_payment at all, so every write to it goes through a server-minted
// token. The status this route can set is fixed ('concession'); it can never
// grant 'paid'.
export default defineEventHandler(async (event) => {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Not configured' })
  }

  const claims = verifyLatJwt(getHeader(event, 'authorization'), jwtSecret)
  if (!claims) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in to apply' })
  }

  const body = await readBody<{ reason?: unknown }>(event)
  const reason = (typeof body?.reason === 'string' ? body.reason : '').trim().slice(0, 200) || 'not_specified'

  const apiBase = process.env.IZNIK_API_V2 || 'http://localhost:4001/apiv2'
  try {
    await markMemberPaid({
      apiBase,
      token: signLatJwt({ id: claims.id, sessionid: claims.sessionid, service: true }, jwtSecret),
      payment: { status: 'concession', reason, claimedAt: new Date().toISOString() },
      fetcher: (url, opts) => $fetch(url, opts as never),
    })
  } catch (err) {
    console.error('[concession-claim] failed to record claim', { userId: claims.id, error: String(err) })
    throw createError({ statusCode: 502, statusMessage: 'Could not record your request. Please try again.' })
  }

  return { ok: true }
})
