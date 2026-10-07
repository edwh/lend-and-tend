import { describe, it, expect } from 'vitest'
import { sanitizeErrorForClient } from '~/lat/server/utils/sanitizeError'

// Upstream Freegle's server/plugins/log-ssr-errors.js hooks every Nitro error
// and copies the stack trace into error.data.stack so its error page can relay
// it to its own logs. Nitro's production error handler then serialises
// error.data for any deliberate 4xx/5xx (only unhandled errors are
// "sensitive"), so on Lend & Tend every "Sign in to apply" 401 and every
// "Payment not configured" 503 went out with a full stack trace and internal
// file paths. The sanitiser below runs in the same hook and makes that
// impossible whichever of the two hooks runs first.

// A faithful copy of what the upstream hook does to the error object.
function upstreamHook(error) {
  try {
    const stack = (error && (error.stack || error.message)) || String(error)
    if (error && typeof error === 'object') {
      if (!error.data || typeof error.data !== 'object') {
        error.data = {}
      }
      if (!error.data.stack) {
        error.data.stack = stack
      }
    }
  } catch {
    // best effort only (as upstream)
  }
}

function h3Error(extra = {}) {
  const e = new Error('Sign in to apply')
  Object.assign(
    e,
    { statusCode: 401, statusMessage: 'Sign in to apply' },
    extra
  )
  return e
}

const PROD = { NODE_ENV: 'production' }

describe('sanitizeErrorForClient', () => {
  it('leaves nothing for the upstream hook to attach a stack to when it runs first (production)', () => {
    const e = h3Error()
    sanitizeErrorForClient(e, PROD)
    upstreamHook(e)
    expect(e.data).toBeUndefined()
    expect(JSON.stringify({ data: e.data })).not.toMatch(/stack/)
  })

  it('removes a stack the upstream hook already attached (production)', () => {
    const e = h3Error()
    upstreamHook(e)
    expect(e.data.stack).toMatch(/Sign in to apply/)
    sanitizeErrorForClient(e, PROD)
    expect(e.data).toBeUndefined()
  })

  it('keeps meaningful error data for the client, minus any stack, and stops later additions', () => {
    const e = h3Error({ data: { field: 'email', stack: 'leak' } })
    sanitizeErrorForClient(e, PROD)
    upstreamHook(e)
    expect(e.data).toEqual({ field: 'email' })
  })

  it('does nothing outside production, so development keeps its stacks', () => {
    const e = h3Error()
    sanitizeErrorForClient(e, { NODE_ENV: 'development' })
    upstreamHook(e)
    expect(e.data.stack).toMatch(/Sign in to apply/)
  })

  it('tolerates non-object errors', () => {
    expect(() => sanitizeErrorForClient('boom', PROD)).not.toThrow()
    expect(() => sanitizeErrorForClient(null, PROD)).not.toThrow()
  })
})
