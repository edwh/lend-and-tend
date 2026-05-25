// Tests for the landing-page section components: presentation + the
// few click handlers that go through useLatAuth.ctaClick (with intent).
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockCtaClick = vi.fn()
vi.mock('~/lat/composables/useLatAuth.js', () => ({
  useLatAuth: () => ({
    isLoggedIn: ref(false),
    hasPaid: ref(false),
    ctaClick: mockCtaClick,
  }),
}))

// LatSiteFooter still uses useNavbar — keep a minimal stub so its
// `useRoute()` call doesn't blow up under vitest (no Nuxt runtime).
vi.mock('~/composables/useNavbar', () => ({
  useNavbar: () => ({ requestLogin: vi.fn() }),
}))
// Sparse mock with just the fields LatSiteFooter actually reads.
vi.mock('~/branding.config', () => ({
  default: {
    tagline: '',
    social: { instagramUrl: '#', facebookUrl: '#' },
    contactEmail: '',
  },
}))

import LatHowItWorksSection from '~/lat/components/lat/LatHowItWorksSection.vue'
import LatTestimonialsSection from '~/lat/components/lat/LatTestimonialsSection.vue'
import LatRolesSection from '~/lat/components/lat/LatRolesSection.vue'
import LatSiteFooter from '~/lat/components/lat/LatSiteFooter.vue'

function makeWrapper(comp) {
  return mount(comp, {
    global: {
      stubs: {
        NuxtLink: true,
        VIcon: { template: '<span class="v-icon" />' },
      },
    },
  })
}

describe('LatHowItWorksSection', () => {
  it('renders the three step headings in order', () => {
    const w = makeWrapper(LatHowItWorksSection)
    const h3s = w.findAll('h3').map((n) => n.text())
    expect(h3s).toEqual(['Join & Register', 'Get Matched', 'Start Growing'])
  })

  it('uses the section heading "How Lend and Tend works"', () => {
    const w = makeWrapper(LatHowItWorksSection)
    expect(w.find('h2').text()).toBe('How Lend and Tend works')
  })
})

describe('LatTestimonialsSection', () => {
  it('uses the heading "What our members say"', () => {
    const w = makeWrapper(LatTestimonialsSection)
    expect(w.find('h2').text()).toBe('What our members say')
  })
})

describe('LatRolesSection', () => {
  it('renders both Tender and Lender headings', () => {
    const w = makeWrapper(LatRolesSection)
    const h2s = w.findAll('h2').map((n) => n.text())
    expect(h2s).toContain('No Garden? No Problem!')
    expect(h2s).toContain("Can't Garden? Find out who can.")
  })

  it('Tender CTA dispatches ctaClick with intent="tend"', async () => {
    mockCtaClick.mockClear()
    const w = makeWrapper(LatRolesSection)
    await w.get('.tender-cta').trigger('click')
    expect(mockCtaClick).toHaveBeenCalledWith('tend')
  })

  it('Lender CTA dispatches ctaClick with intent="lend"', async () => {
    mockCtaClick.mockClear()
    const w = makeWrapper(LatRolesSection)
    await w.get('.lender-cta').trigger('click')
    expect(mockCtaClick).toHaveBeenCalledWith('lend')
  })
})

describe('LatSiteFooter', () => {
  it('has Explore and Contact columns', () => {
    const w = makeWrapper(LatSiteFooter)
    const h3s = w.findAll('h3.footer-col-heading').map((n) => n.text())
    expect(h3s).toContain('Explore')
    expect(h3s).toContain('Contact')
  })
})
