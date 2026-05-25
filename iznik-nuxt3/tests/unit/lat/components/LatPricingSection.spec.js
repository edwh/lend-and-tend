import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// useLatAuth provides ctaClick + hasPaid; the section delegates CTA
// dispatch to it. mockHasPaid is a real Vue ref so the template can
// auto-unwrap it — a plain { value: false } would be a truthy object
// in the template ternary and the label would always show "paid" text.
const mockCtaClick = vi.fn()
const mockHasPaid = ref(false)
vi.mock('~/lat/composables/useLatAuth.js', () => ({
  useLatAuth: () => ({
    isLoggedIn: ref(false),
    hasPaid: mockHasPaid,
    ctaClick: mockCtaClick,
  }),
}))

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
    mockHasPaid.value = false
    const w = makeWrapper()
    expect(w.text()).toMatch(/£12/)
    expect(w.text()).toMatch(/one-time joining fee/i)
  })

  it('shows the concession blurb for Pension Credit / UC users', () => {
    mockHasPaid.value = false
    const w = makeWrapper()
    expect(w.text()).toMatch(/Supported registration is free/i)
    expect(w.text()).toMatch(/Pension Credit/)
    expect(w.text()).toMatch(/Universal Credit/)
  })

  it('clicking the CTA dispatches ctaClick with intent="join"', async () => {
    mockHasPaid.value = false
    mockCtaClick.mockClear()
    const w = makeWrapper()
    await w.get('.price-cta').trigger('click')
    expect(mockCtaClick).toHaveBeenCalledWith('join')
  })

  it('CTA label is "Join now" when the visitor has not paid', () => {
    mockHasPaid.value = false
    const w = makeWrapper()
    expect(w.get('.price-cta').text()).toMatch(/Join now/i)
  })

  it('CTA label is "Browse gardens" when the visitor has paid', () => {
    mockHasPaid.value = true
    const w = makeWrapper()
    expect(w.get('.price-cta').text()).toMatch(/Browse gardens/i)
  })

  it('uses the L&T headline "Simple, fair membership"', () => {
    const w = makeWrapper()
    expect(w.find('h2').text()).toBe('Simple, fair membership')
  })
})
