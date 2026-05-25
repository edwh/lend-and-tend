import { describe, it, expect, vi, beforeEach } from 'vitest'

// Module-level mutable state the mocks read on each call.
const mockAuthUser = { value: null }
const mockRequestLogin = vi.fn()
const mockNavigateTo = vi.fn()

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({
    get user() {
      return mockAuthUser.value
    },
  }),
}))

vi.mock('~/composables/useNavbar', () => ({
  useNavbar: () => ({
    requestLogin: mockRequestLogin,
  }),
}))

// `navigateTo` is a Nuxt auto-import (global). The composable references it
// directly without importing, so stub it on globalThis before the module is
// evaluated.
globalThis.navigateTo = (...args) => mockNavigateTo(...args)

import { useLatAuth } from '~/lat/composables/useLatAuth.js'

describe('useLatAuth', () => {
  beforeEach(() => {
    mockAuthUser.value = null
    mockRequestLogin.mockReset()
    mockNavigateTo.mockReset()
  })

  describe('isLoggedIn', () => {
    it('is false when no user', () => {
      const { isLoggedIn } = useLatAuth()
      expect(isLoggedIn.value).toBe(false)
    })

    it('is true when user is present', () => {
      mockAuthUser.value = { id: 1 }
      const { isLoggedIn } = useLatAuth()
      expect(isLoggedIn.value).toBe(true)
    })
  })

  describe('hasPaid', () => {
    it('is false when user is null', () => {
      const { hasPaid } = useLatAuth()
      expect(hasPaid.value).toBe(false)
    })

    it('is false when user has no settings', () => {
      mockAuthUser.value = { id: 1 }
      const { hasPaid } = useLatAuth()
      expect(hasPaid.value).toBe(false)
    })

    it('is false when lat_payment status is missing', () => {
      mockAuthUser.value = { id: 1, settings: {} }
      const { hasPaid } = useLatAuth()
      expect(hasPaid.value).toBe(false)
    })

    it('is true when lat_payment.status is "paid"', () => {
      mockAuthUser.value = {
        id: 1,
        settings: { lat_payment: { status: 'paid' } },
      }
      const { hasPaid } = useLatAuth()
      expect(hasPaid.value).toBe(true)
    })

    it('is true when lat_payment.status is "concession"', () => {
      mockAuthUser.value = {
        id: 1,
        settings: { lat_payment: { status: 'concession' } },
      }
      const { hasPaid } = useLatAuth()
      expect(hasPaid.value).toBe(true)
    })

    it('is false for any other status value', () => {
      mockAuthUser.value = {
        id: 1,
        settings: { lat_payment: { status: 'pending' } },
      }
      const { hasPaid } = useLatAuth()
      expect(hasPaid.value).toBe(false)
    })
  })

  describe('ctaClick', () => {
    it('opens the login modal when logged out', () => {
      const { ctaClick } = useLatAuth()
      ctaClick('join')
      expect(mockRequestLogin).toHaveBeenCalledTimes(1)
      expect(mockNavigateTo).not.toHaveBeenCalled()
    })

    it('navigates logged-in unpaid users to /join', () => {
      mockAuthUser.value = { id: 1 }
      const { ctaClick } = useLatAuth()
      ctaClick('join')
      expect(mockNavigateTo).toHaveBeenCalledWith('/join')
      expect(mockRequestLogin).not.toHaveBeenCalled()
    })

    it('navigates logged-in unpaid users to /join regardless of intent', () => {
      mockAuthUser.value = { id: 1 }
      const { ctaClick } = useLatAuth()
      ctaClick('lend')
      expect(mockNavigateTo).toHaveBeenCalledWith('/join')
    })

    it('routes paid lend intent to /lend', () => {
      mockAuthUser.value = {
        id: 1,
        settings: { lat_payment: { status: 'paid' } },
      }
      const { ctaClick } = useLatAuth()
      ctaClick('lend')
      expect(mockNavigateTo).toHaveBeenCalledWith('/lend')
    })

    it('routes paid tend intent to /tend', () => {
      mockAuthUser.value = {
        id: 1,
        settings: { lat_payment: { status: 'paid' } },
      }
      const { ctaClick } = useLatAuth()
      ctaClick('tend')
      expect(mockNavigateTo).toHaveBeenCalledWith('/tend')
    })

    it('routes paid browse intent to /map', () => {
      mockAuthUser.value = {
        id: 1,
        settings: { lat_payment: { status: 'paid' } },
      }
      const { ctaClick } = useLatAuth()
      ctaClick('browse')
      expect(mockNavigateTo).toHaveBeenCalledWith('/map')
    })

    it('routes paid join intent to /map (already a member)', () => {
      mockAuthUser.value = {
        id: 1,
        settings: { lat_payment: { status: 'concession' } },
      }
      const { ctaClick } = useLatAuth()
      ctaClick('join')
      expect(mockNavigateTo).toHaveBeenCalledWith('/map')
    })

    it('defaults to /map for paid users with no/unknown intent', () => {
      mockAuthUser.value = {
        id: 1,
        settings: { lat_payment: { status: 'paid' } },
      }
      const { ctaClick } = useLatAuth()
      ctaClick()
      expect(mockNavigateTo).toHaveBeenCalledWith('/map')
    })

    it('defaults to /map for paid users when intent is unrecognised', () => {
      mockAuthUser.value = {
        id: 1,
        settings: { lat_payment: { status: 'paid' } },
      }
      const { ctaClick } = useLatAuth()
      ctaClick('bogus')
      expect(mockNavigateTo).toHaveBeenCalledWith('/map')
    })
  })
})
