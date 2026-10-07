import { describe, it, expect } from 'vitest'
import {
  checkBrowserPost,
  clientIpFrom,
  createRateLimiter,
} from '~/lat/server/utils/requestGuard'

// The server routes are reached by two kinds of caller: our own pages (JSON,
// same origin, via $fetch) and Stripe's webhook (server to server, signed).
// Nothing else should be able to drive them. These guards close the gaps an
// outsider could use: a cross-site form POST (CSRF-shaped spam of the contact
// form), an oversized body, and simple flooding.

describe('checkBrowserPost', () => {
  const ok = {
    contentType: 'application/json',
    secFetchSite: 'same-origin',
    origin: 'https://new.lendandtend.com',
    host: 'new.lendandtend.com',
    contentLength: '120',
  }

  it('accepts what our own pages send: JSON, same origin', () => {
    expect(checkBrowserPost(ok, { maxBytes: 65536 })).toEqual({ ok: true })
  })

  it('accepts a request with no browser fetch metadata (curl, Stripe, old browsers) when the origin matches or is absent', () => {
    expect(
      checkBrowserPost(
        { contentType: 'application/json; charset=utf-8', host: 'x.test' },
        { maxBytes: 65536 }
      )
    ).toEqual({ ok: true })
  })

  it('refuses a cross-site request (CSRF shape) even with a JSON body', () => {
    const r = checkBrowserPost(
      { ...ok, secFetchSite: 'cross-site', origin: 'https://evil.example' },
      { maxBytes: 65536 }
    )
    expect(r.ok).toBe(false)
    expect(r.status).toBe(403)
  })

  it('refuses when Origin names another host, whatever Sec-Fetch-Site says', () => {
    const r = checkBrowserPost(
      { ...ok, secFetchSite: undefined, origin: 'https://evil.example' },
      { maxBytes: 65536 }
    )
    expect(r.ok).toBe(false)
    expect(r.status).toBe(403)
  })

  it('treats same-site and none as fine (subdomain, direct navigation)', () => {
    for (const s of ['same-site', 'none']) {
      expect(
        checkBrowserPost({ ...ok, secFetchSite: s }, { maxBytes: 65536 }).ok
      ).toBe(true)
    }
  })

  it('refuses a form-encoded or missing content type (a plain form cannot be made to send JSON)', () => {
    for (const ct of ['application/x-www-form-urlencoded', 'text/plain', '']) {
      const r = checkBrowserPost(
        { ...ok, contentType: ct },
        { maxBytes: 65536 }
      )
      expect(r.ok).toBe(false)
      expect(r.status).toBe(415)
    }
  })

  it('refuses a body larger than the route allows, by declared length', () => {
    const r = checkBrowserPost(
      { ...ok, contentLength: '70000' },
      { maxBytes: 65536 }
    )
    expect(r.ok).toBe(false)
    expect(r.status).toBe(413)
    expect(
      checkBrowserPost(
        { ...ok, contentLength: 'not-a-number' },
        { maxBytes: 65536 }
      ).ok
    ).toBe(true)
  })
})

describe('clientIpFrom', () => {
  it('prefers the Fly client header, then the first X-Forwarded-For hop, then the socket', () => {
    expect(
      clientIpFrom(
        {
          'fly-client-ip': '203.0.113.9',
          'x-forwarded-for': '198.51.100.1, 10.0.0.1',
        },
        '10.0.0.2'
      )
    ).toBe('203.0.113.9')
    expect(
      clientIpFrom({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }, '10.0.0.2')
    ).toBe('198.51.100.1')
    expect(clientIpFrom({}, '10.0.0.2')).toBe('10.0.0.2')
    expect(clientIpFrom({}, undefined)).toBe('unknown')
  })
})

describe('createRateLimiter', () => {
  it('allows up to max hits per key in a window, then refuses with a retry hint', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 })
    const t0 = 1_000_000
    expect(limiter.hit('a', t0)).toEqual({ allowed: true })
    expect(limiter.hit('a', t0 + 1)).toEqual({ allowed: true })
    expect(limiter.hit('a', t0 + 2)).toEqual({ allowed: true })
    const refused = limiter.hit('a', t0 + 3)
    expect(refused.allowed).toBe(false)
    expect(refused.retryAfterSeconds).toBe(60)
    // Other keys are unaffected.
    expect(limiter.hit('b', t0 + 3)).toEqual({ allowed: true })
  })

  it('forgets a key once its window has passed, and prunes old keys', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1_000 })
    expect(limiter.hit('a', 0).allowed).toBe(true)
    expect(limiter.hit('a', 500).allowed).toBe(false)
    expect(limiter.hit('a', 1_001).allowed).toBe(true)
    limiter.hit('b', 1_001)
    expect(limiter.size()).toBe(2)
    limiter.hit('c', 5_000)
    expect(limiter.size()).toBe(1) // a and b expired and were dropped
  })
})
