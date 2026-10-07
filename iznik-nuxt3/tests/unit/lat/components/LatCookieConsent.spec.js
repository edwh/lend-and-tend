import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LatCookieConsent from '~/lat/components/LatCookieConsent.vue'

// The banner is fixed to the bottom of the viewport. Without reserving space
// for it, the last control on a long page (e.g. the agreement form's "Send to
// tender" button) sits underneath it and cannot be clicked - which is how the
// walkthrough seeder found the bug. The component must pad the page while the
// banner is showing and remove the padding once a choice is made.

const hasChosen = ref(false)
const acceptAll = vi.fn(() => {
  hasChosen.value = true
})
const essentialOnly = vi.fn(() => {
  hasChosen.value = true
})

vi.mock('~/lat/composables/useCookieConsent', () => ({
  useCookieConsent: () => ({ hasChosen, acceptAll, essentialOnly }),
}))
vi.mock('~/branding.config', () => ({ default: { siteName: 'Lend & Tend' } }))

const BANNER_HEIGHT = 132

function mountBanner() {
  return mount(LatCookieConsent, {
    attachTo: document.body,
    global: {
      stubs: {
        ClientOnly: { template: '<div><slot /></div>' },
        NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
      },
    },
  })
}

describe('LatCookieConsent', () => {
  let heightSpy
  beforeEach(() => {
    hasChosen.value = false
    document.body.style.paddingBottom = ''
    // jsdom has no layout; give the banner a height the way a browser would.
    heightSpy = vi
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockImplementation(function () {
        return this.classList?.contains('lat-cookie-consent')
          ? BANNER_HEIGHT
          : 0
      })
  })
  afterEach(() => {
    heightSpy.mockRestore()
    document.body.style.paddingBottom = ''
  })

  it('reserves space at the bottom of the page while it is showing', async () => {
    const w = mountBanner()
    await nextTick()
    expect(w.find('.lat-cookie-consent').exists()).toBe(true)
    expect(document.body.style.paddingBottom).toBe(`${BANNER_HEIGHT}px`)
    w.unmount()
  })

  it('gives the space back once a choice is made', async () => {
    const w = mountBanner()
    await nextTick()
    await w.find('button.lcc-btn').trigger('click') // Essential only
    await nextTick()
    expect(essentialOnly).toHaveBeenCalled()
    expect(w.find('.lat-cookie-consent').exists()).toBe(false)
    expect(document.body.style.paddingBottom).toBe('')
    w.unmount()
  })

  it('clears the padding when unmounted mid-decision (route change)', async () => {
    const w = mountBanner()
    await nextTick()
    expect(document.body.style.paddingBottom).toBe(`${BANNER_HEIGHT}px`)
    w.unmount()
    expect(document.body.style.paddingBottom).toBe('')
  })
})
