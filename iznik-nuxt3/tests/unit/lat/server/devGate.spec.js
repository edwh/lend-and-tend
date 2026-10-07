import { describe, it, expect } from 'vitest'
import { fakePaymentAllowed } from '~/lat/server/utils/devGate'

// The "pretend to pay" bypass hands out membership for free, so it must be
// impossible to reach by accident. The old rule was "on unless NODE_ENV is
// production", which is on in any environment that simply forgot to set
// NODE_ENV. The rule is now fail-safe: on only in a development server, or
// with an explicit opt-in.

describe('fakePaymentAllowed', () => {
  it('is on in a development server by default', () => {
    expect(fakePaymentAllowed({ NODE_ENV: 'development' })).toBe(true)
  })

  it('can be switched off in development', () => {
    expect(
      fakePaymentAllowed({
        NODE_ENV: 'development',
        LAT_ALLOW_FAKE_PAYMENT: 'false',
      })
    ).toBe(false)
  })

  it('is off in production, whatever the flag says', () => {
    expect(fakePaymentAllowed({ NODE_ENV: 'production' })).toBe(false)
    expect(
      fakePaymentAllowed({
        NODE_ENV: 'production',
        LAT_ALLOW_FAKE_PAYMENT: 'true',
      })
    ).toBe(false)
  })

  it('is off when NODE_ENV is unset or unexpected (a misconfigured deployment)', () => {
    expect(fakePaymentAllowed({})).toBe(false)
    expect(fakePaymentAllowed({ NODE_ENV: 'staging' })).toBe(false)
  })

  it('allows an explicit opt-in outside production, e.g. a test stack', () => {
    expect(
      fakePaymentAllowed({ NODE_ENV: 'test', LAT_ALLOW_FAKE_PAYMENT: 'true' })
    ).toBe(true)
    expect(fakePaymentAllowed({ LAT_ALLOW_FAKE_PAYMENT: 'true' })).toBe(true)
  })
})
