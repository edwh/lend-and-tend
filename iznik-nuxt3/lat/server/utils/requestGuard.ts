import { createError, getHeader, setResponseHeader, type H3Event } from 'h3'

/**
 * Request guards for the Lend & Tend server routes.
 *
 * The routes are driven by our own pages (JSON bodies, same origin, via
 * $fetch) and, for the webhook, by Stripe. The pure checks here close the
 * gaps an outsider could use and are unit-tested on plain header values; the
 * h3 wrappers at the bottom read the headers off the event and throw.
 *
 * - checkBrowserPost: JSON only (a plain HTML form cannot send JSON, so a
 *   cross-site form POST is refused outright), a declared-size cap, and no
 *   cross-site callers (Sec-Fetch-Site, with Origin vs Host as the fallback).
 * - createRateLimiter: a small in-memory limiter per key (IP or member id).
 *   One Nitro process per machine, so this is per machine; it is a brake on
 *   floods and scripted spam, not an accounting system.
 */

export interface BrowserPostHeaders {
  contentType?: string
  secFetchSite?: string
  origin?: string
  host?: string
  contentLength?: string
}

export interface GuardOptions {
  /** Largest declared body accepted, in bytes. */
  maxBytes: number
  /** Default true: the body must be application/json. */
  requireJson?: boolean
}

export type GuardResult =
  | { ok: true }
  | { ok: false; status: number; message: string }

export function checkBrowserPost(
  h: BrowserPostHeaders,
  opts: GuardOptions
): GuardResult {
  const requireJson = opts.requireJson ?? true
  if (requireJson) {
    const ct = (h.contentType || '').trim().toLowerCase()
    if (!ct.startsWith('application/json')) {
      return { ok: false, status: 415, message: 'Send JSON' }
    }
  }

  const declared = parseInt(h.contentLength || '', 10)
  if (Number.isFinite(declared) && declared > opts.maxBytes) {
    return { ok: false, status: 413, message: 'Request too large' }
  }

  if ((h.secFetchSite || '').trim().toLowerCase() === 'cross-site') {
    return {
      ok: false,
      status: 403,
      message: 'Cross-site requests are not allowed',
    }
  }

  if (h.origin && h.host) {
    let originHost = ''
    try {
      originHost = new URL(h.origin).host.toLowerCase()
    } catch {
      return {
        ok: false,
        status: 403,
        message: 'Cross-site requests are not allowed',
      }
    }
    if (originHost !== h.host.trim().toLowerCase()) {
      return {
        ok: false,
        status: 403,
        message: 'Cross-site requests are not allowed',
      }
    }
  }

  return { ok: true }
}

/** The caller's address behind Fly's edge or Caddy, else the socket's. */
export function clientIpFrom(
  headers: Record<string, string | undefined>,
  fallback?: string
): string {
  const fly = (headers['fly-client-ip'] || '').trim()
  if (fly) return fly
  const xff = (headers['x-forwarded-for'] || '').split(',')[0].trim()
  if (xff) return xff
  return (fallback || '').trim() || 'unknown'
}

export interface RateLimiter {
  hit(
    key: string,
    now?: number
  ): { allowed: true } | { allowed: false; retryAfterSeconds: number }
  size(): number
}

export function createRateLimiter({
  max,
  windowMs,
}: {
  max: number
  windowMs: number
}): RateLimiter {
  const hits = new Map<string, number[]>()
  let lastPrune = Number.NEGATIVE_INFINITY

  function prune(now: number) {
    for (const [key, times] of hits) {
      const kept = times.filter((t) => t > now - windowMs)
      if (kept.length) hits.set(key, kept)
      else hits.delete(key)
    }
    lastPrune = now
  }

  return {
    hit(key, now = Date.now()) {
      if (now - lastPrune >= windowMs) prune(now)
      const times = (hits.get(key) || []).filter((t) => t > now - windowMs)
      if (times.length >= max) {
        hits.set(key, times)
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((times[0] + windowMs - now) / 1000)
        )
        return { allowed: false, retryAfterSeconds }
      }
      times.push(now)
      hits.set(key, times)
      return { allowed: true }
    },
    size() {
      return hits.size
    },
  }
}

/* ── h3 wrappers ───────────────────────────────────────────────────────── */

/** Throws 415 / 413 / 403 unless the request looks like one of our own pages'. */
export function guardBrowserPost(event: H3Event, opts: GuardOptions): void {
  const r = checkBrowserPost(
    {
      contentType: getHeader(event, 'content-type'),
      secFetchSite: getHeader(event, 'sec-fetch-site'),
      origin: getHeader(event, 'origin'),
      host: getHeader(event, 'x-forwarded-host') || getHeader(event, 'host'),
      contentLength: getHeader(event, 'content-length'),
    },
    opts
  )
  if (!r.ok) {
    throw createError({ statusCode: r.status, statusMessage: r.message })
  }
}

export function clientIp(event: H3Event): string {
  return clientIpFrom(
    {
      'fly-client-ip': getHeader(event, 'fly-client-ip'),
      'x-forwarded-for': getHeader(event, 'x-forwarded-for'),
    },
    event.node?.req?.socket?.remoteAddress
  )
}

/** Throws 429 (with Retry-After) once `key` has used up the limiter's window. */
export function rateLimitOrThrow(
  event: H3Event,
  limiter: RateLimiter,
  key: string
): void {
  const r = limiter.hit(key)
  if (!r.allowed) {
    setResponseHeader(event, 'Retry-After', String(r.retryAfterSeconds))
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please wait a moment and try again.',
    })
  }
}
