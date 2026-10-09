import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LatCookieConsent from '~/lat/components/LatCookieConsent.vue'

// The banner is fixed to the bottom of the viewport. Without reserving space
// for it, the last control on a long page (e.g. the agreement form's "Send to
// tender" button) sits underneath it and cannot be clicked - which is how the
// walkthrough seeder found the bug. Padding <body> does not help: body is a
// fixed-height box the content overflows, so the document cannot scroll any
// further. The component must render an in-flow spacer the height of the bar
// (it sits after the page content in the layout) while showing, and remove
// it once a choice is made.

const hasChosen = ref(false)
const barHeight = ref(0)
const acceptAll = vi.fn(() => {
  hasChosen.value = true
})
const essentialOnly = vi.fn(() => {
  hasChosen.value = true
})

vi.mock('~/lat/composables/useCookieConsent', () => ({
  useCookieConsent: () => ({ hasChosen, acceptAll, essentialOnly, barHeight }),
}))
vi.mock('~/branding.config', () => ({ default: { siteName: 'Lend & Tend' } }))

const BANNER_HEIGHT = 132

function mountBanner() {
  return mount(LatCookieConsent, {
    attachTo: document.body,
    global: {
      stubs: {
        // Like Nuxt's real ClientOnly: the slot renders only AFTER the
        // component has mounted, so a parent reading the slot's ref in its own
        // onMounted sees null. That is exactly what hid the bug in the browser.
        ClientOnly: {
          data: () => ({ mounted: false }),
          mounted() {
            this.mounted = true
          },
          template: '<div><slot v-if="mounted" /></div>',
        },
        NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
      },
    },
  })
}

describe('LatCookieConsent', () => {
  let heightSpy
  beforeEach(() => {
    hasChosen.value = false
    barHeight.value = 0
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
  })

  it('reserves space at the bottom of the page while it is showing', async () => {
    const w = mountBanner()
    await nextTick()
    await nextTick()
    expect(w.find('.lat-cookie-consent').exists()).toBe(true)
    expect(barHeight.value).toBe(BANNER_HEIGHT)
    expect(document.documentElement.style.scrollPaddingBottom).toBe(
      `${BANNER_HEIGHT}px`
    )
    expect(
      document.documentElement.style.getPropertyValue('--lat-cookie-bar-height')
    ).toBe(`${BANNER_HEIGHT}px`)
    w.unmount()
  })

  it('gives the space back once a choice is made', async () => {
    const w = mountBanner()
    await nextTick()
    await nextTick()
    await w.find('button.lcc-btn').trigger('click') // Essential only
    await nextTick()
    expect(essentialOnly).toHaveBeenCalled()
    expect(w.find('.lat-cookie-consent').exists()).toBe(false)
    expect(barHeight.value).toBe(0)
    expect(document.documentElement.style.scrollPaddingBottom).toBe('')
    expect(
      document.documentElement.style.getPropertyValue('--lat-cookie-bar-height')
    ).toBe('0px')
    w.unmount()
  })

  it('clears the scroll padding when unmounted mid-decision (route change)', async () => {
    const w = mountBanner()
    await nextTick()
    await nextTick()
    expect(document.documentElement.style.scrollPaddingBottom).toBe(
      `${BANNER_HEIGHT}px`
    )
    w.unmount()
    expect(document.documentElement.style.scrollPaddingBottom).toBe('')
  })
})
