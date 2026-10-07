import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LatCookieSpacer from '~/lat/components/LatCookieSpacer.vue'

// Sits inside the page-content slot and pads the page by the cookie bar's
// measured height while the bar is showing, so the last control on a long
// page can be scrolled clear of the fixed bar.

const hasChosen = ref(false)
const barHeight = ref(0)
vi.mock('~/lat/composables/useCookieConsent', () => ({
  useCookieConsent: () => ({ hasChosen, barHeight }),
}))

const ClientOnly = {
  data: () => ({ mounted: false }),
  mounted() {
    this.mounted = true
  },
  template: '<div><slot v-if="mounted" /></div>',
}

async function mountSpacer() {
  const w = mount(LatCookieSpacer, { global: { stubs: { ClientOnly } } })
  await nextTick()
  await nextTick()
  return w
}

describe('LatCookieSpacer', () => {
  it('is the bar height while the bar is showing', async () => {
    hasChosen.value = false
    barHeight.value = 120
    const w = await mountSpacer()
    const s = w.find('.lcc-spacer')
    expect(s.exists()).toBe(true)
    expect(s.attributes('style')).toContain('height: 120px')
    expect(s.attributes('aria-hidden')).toBe('true')
  })

  it('renders nothing before the bar is measured or once a choice is made', async () => {
    hasChosen.value = false
    barHeight.value = 0
    expect((await mountSpacer()).find('.lcc-spacer').exists()).toBe(false)
    hasChosen.value = true
    barHeight.value = 120
    expect((await mountSpacer()).find('.lcc-spacer').exists()).toBe(false)
  })
})
