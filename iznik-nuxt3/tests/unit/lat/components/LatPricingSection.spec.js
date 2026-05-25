import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock the Freegle useNavbar composable — the component only uses
// its `requestLogin` function.
const mockRequestLogin = vi.fn()
vi.mock('~/composables/useNavbar', () => ({
  useNavbar: () => ({ requestLogin: mockRequestLogin }),
}))

// Mock branding.config — only needed for the import to resolve.
vi.mock('~/branding.config', () => ({ default: {} }))

import LatPricingSection from '~/lat/components/lat/LatPricingSection.vue'

function makeWrapper() {
  return mount(LatPricingSection, {
    global: {
      stubs: { NuxtLink: true },
    },
  })
}

describe('LatPricingSection', () => {
  it('displays the £12 joining fee', () => {
    const w = makeWrapper()
    expect(w.text()).toMatch(/£12/)
    expect(w.text()).toMatch(/one-time joining fee/i)
  })

  it('shows the concession blurb for Pension Credit / UC users', () => {
    const w = makeWrapper()
    expect(w.text()).toMatch(/Supported registration is free/i)
    expect(w.text()).toMatch(/Pension Credit/)
    expect(w.text()).toMatch(/Universal Credit/)
  })

  it('clicking "Join now" calls useNavbar().requestLogin()', async () => {
    mockRequestLogin.mockClear()
    const w = makeWrapper()
    await w.get('.price-cta').trigger('click')
    expect(mockRequestLogin).toHaveBeenCalledOnce()
  })

  it('uses the L&T headline "Simple, fair membership"', () => {
    const w = makeWrapper()
    expect(w.find('h2').text()).toBe('Simple, fair membership')
  })
})
