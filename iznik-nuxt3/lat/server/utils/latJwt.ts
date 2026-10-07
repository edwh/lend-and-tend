import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Minimal HS256 JWT sign/verify, shaped exactly for the Go API.
 *
 * iznik-server-go (auth.GetJWTFromRequest) accepts an HS256 token whose claims
 * carry `id` and `sessionid` as STRINGS and `exp` as seconds. Its auth
 * middleware then checks that `sessionid` is a live row in `sessions` for that
 * user, so a token minted here is only useful with a session id captured from
 * a real login (see /api/checkout). Shares JWT_SECRET with the API.
 *
 * No dependency: node:crypto only, so it runs identically in the Nitro server
 * and in unit tests.
 */

export interface LatJwtClaims {
  id: string
  sessionid: string
  exp: number
  /** True when the token carries the server-minted `svc: "1"` claim. */
  service: boolean
}

export interface LatJwtInput {
  id: number | string
  sessionid: number | string
  /** Seconds until expiry. Default 120: long enough for one API call. */
  ttlSeconds?: number
  /**
   * Mark the token as minted by this server (claim `svc: "1"`). The Go API
   * lets such tokens write PROTECTED_SETTINGS_KEYS (e.g. lat_payment) that
   * the member themselves may not; only a holder of JWT_SECRET can produce it.
   */
  service?: boolean
}

const DEFAULT_TTL_SECONDS = 120

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecode(input: string): Buffer {
  const normalised = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

function hmac(signingInput: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(signingInput).digest())
}

export function signLatJwt(input: LatJwtInput, secret: string): string {
  if (!secret) {
    throw new Error('signLatJwt: a secret is required')
  }
  const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const claims: Record<string, string | number> = {
    id: String(input.id),
    sessionid: String(input.sessionid),
    exp: Math.floor(Date.now() / 1000) + ttl,
  }
  if (input.service) claims.svc = '1'
  const payload = b64url(JSON.stringify(claims))
  const signingInput = `${header}.${payload}`
  return `${signingInput}.${hmac(signingInput, secret)}`
}

/**
 * Returns the claims if the token is well-formed, HS256, correctly signed with
 * `secret`, unexpired, and carries string id/sessionid; otherwise null. Never
 * throws. Strips one pair of surrounding double quotes, because the web client
 * sends `Authorization: JSON.stringify(jwt)` and the Go side strips them too.
 */
export function verifyLatJwt(token: unknown, secret: string): LatJwtClaims | null {
  try {
    if (!secret || typeof token !== 'string') return null
    let t = token.trim()
    if (t.startsWith('"')) t = t.slice(1)
    if (t.endsWith('"')) t = t.slice(0, -1)

    const parts = t.split('.')
    if (parts.length !== 3) return null
    const [h, p, s] = parts
    if (!h || !p || !s) return null

    const header = JSON.parse(b64urlDecode(h).toString('utf8'))
    if (!header || header.alg !== 'HS256') return null

    const expected = Buffer.from(hmac(`${h}.${p}`, secret))
    const actual = Buffer.from(s)
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

    const payload = JSON.parse(b64urlDecode(p).toString('utf8'))
    if (
      !payload ||
      typeof payload.id !== 'string' ||
      typeof payload.sessionid !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return null
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null

    return {
      id: payload.id,
      sessionid: payload.sessionid,
      exp: payload.exp,
      service: payload.svc === '1',
    }
  } catch {
    return null
  }
}
