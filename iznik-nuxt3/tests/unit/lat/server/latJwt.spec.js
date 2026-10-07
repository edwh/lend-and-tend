import crypto from 'node:crypto'
import { describe, it, expect } from 'vitest'
import { signLatJwt, verifyLatJwt } from '~/lat/server/utils/latJwt'

// The Go API (iznik-server-go auth.GetJWTFromRequest) accepts an HS256 JWT
// whose claims carry `id` and `sessionid` as STRINGS and `exp` as a number of
// seconds. Its auth middleware then requires that sessionid to be a real row
// in `sessions` belonging to that user. These tests pin the token shape the Go
// side needs, so the webhook's minted token is accepted.

const SECRET = 'unit-test-secret'

function b64urlDecode(part) {
  return Buffer.from(
    part.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  ).toString('utf8')
}

describe('signLatJwt', () => {
  it('produces a three-part base64url HS256 token with string id/sessionid and numeric exp', () => {
    const before = Math.floor(Date.now() / 1000)
    const token = signLatJwt({ id: 42, sessionid: 7 }, SECRET)
    const parts = token.split('.')
    expect(parts).toHaveLength(3)
    expect(token).not.toMatch(/[+/=]/)

    const header = JSON.parse(b64urlDecode(parts[0]))
    expect(header).toEqual({ alg: 'HS256', typ: 'JWT' })

    const payload = JSON.parse(b64urlDecode(parts[1]))
    expect(payload.id).toBe('42')
    expect(payload.sessionid).toBe('7')
    expect(typeof payload.exp).toBe('number')
    expect(payload.exp).toBeGreaterThanOrEqual(before + 120)
    expect(payload.exp).toBeLessThanOrEqual(before + 125)
  })

  it('signs the header and payload with HMAC-SHA256 over "header.payload"', () => {
    const token = signLatJwt(
      { id: '1', sessionid: '2', ttlSeconds: 60 },
      SECRET
    )
    const [h, p, s] = token.split('.')
    const expected = crypto
      .createHmac('sha256', SECRET)
      .update(`${h}.${p}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(s).toBe(expected)
  })

  it('honours a custom ttl', () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = JSON.parse(
      b64urlDecode(
        signLatJwt({ id: 1, sessionid: 1, ttlSeconds: 5 }, SECRET).split('.')[1]
      )
    )
    expect(payload.exp - now).toBeGreaterThanOrEqual(4)
    expect(payload.exp - now).toBeLessThanOrEqual(6)
  })

  it('refuses to sign without a secret', () => {
    expect(() => signLatJwt({ id: 1, sessionid: 1 }, '')).toThrow()
  })
})

describe('verifyLatJwt', () => {
  it('round-trips a token it signed', () => {
    const token = signLatJwt({ id: 42, sessionid: 7 }, SECRET)
    const claims = verifyLatJwt(token, SECRET)
    expect(claims).toEqual({
      id: '42',
      sessionid: '7',
      exp: expect.any(Number),
      service: false,
    })
  })

  it('marks a server-minted token with the svc claim, and reports it on verify', () => {
    const token = signLatJwt({ id: 42, sessionid: 7, service: true }, SECRET)
    const payload = JSON.parse(b64urlDecode(token.split('.')[1]))
    // The Go API accepts exactly svc === "1" (a string) as the service claim.
    expect(payload.svc).toBe('1')
    expect(verifyLatJwt(token, SECRET)).toMatchObject({
      id: '42',
      service: true,
    })

    // Absent unless asked for, so a member-shaped token never carries it.
    const plain = JSON.parse(
      b64urlDecode(signLatJwt({ id: 42, sessionid: 7 }, SECRET).split('.')[1])
    )
    expect(plain).not.toHaveProperty('svc')
  })

  it('accepts a token wrapped in double quotes, as the web client sends it', () => {
    // BaseAPI sends Authorization: JSON.stringify(jwt), i.e. with quotes; the
    // Go side strips them and so must we.
    const token = signLatJwt({ id: 42, sessionid: 7 }, SECRET)
    expect(verifyLatJwt(`"${token}"`, SECRET)).toMatchObject({
      id: '42',
      sessionid: '7',
    })
  })

  it('rejects a token signed with another secret', () => {
    const token = signLatJwt({ id: 42, sessionid: 7 }, 'other')
    expect(verifyLatJwt(token, SECRET)).toBeNull()
  })

  it('rejects an expired token', () => {
    const token = signLatJwt({ id: 42, sessionid: 7, ttlSeconds: -10 }, SECRET)
    expect(verifyLatJwt(token, SECRET)).toBeNull()
  })

  it('rejects a tampered payload', () => {
    const token = signLatJwt({ id: 42, sessionid: 7 }, SECRET)
    const [h, , s] = token.split('.')
    const forged = Buffer.from(
      JSON.stringify({ id: '1', sessionid: '7', exp: 9999999999 })
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(verifyLatJwt(`${h}.${forged}.${s}`, SECRET)).toBeNull()
  })

  it('rejects the "none" algorithm and malformed input', () => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' })
    ).toString('base64url')
    const payload = Buffer.from(
      JSON.stringify({ id: '42', sessionid: '7', exp: 9999999999 })
    ).toString('base64url')
    expect(verifyLatJwt(`${header}.${payload}.`, SECRET)).toBeNull()
    expect(verifyLatJwt('not-a-jwt', SECRET)).toBeNull()
    expect(verifyLatJwt('', SECRET)).toBeNull()
    expect(verifyLatJwt(undefined, SECRET)).toBeNull()
  })

  it('rejects a token whose claims are not strings', () => {
    // A JWT from elsewhere with numeric id would not be accepted by the Go side either.
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' })
    ).toString('base64url')
    const payload = Buffer.from(
      JSON.stringify({ id: 42, sessionid: 7, exp: 9999999999 })
    ).toString('base64url')
    const sig = crypto
      .createHmac('sha256', SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url')
    expect(verifyLatJwt(`${header}.${payload}.${sig}`, SECRET)).toBeNull()
  })

  it('returns null rather than throwing when the secret is empty', () => {
    const token = signLatJwt({ id: 42, sessionid: 7 }, SECRET)
    expect(verifyLatJwt(token, '')).toBeNull()
  })
})
