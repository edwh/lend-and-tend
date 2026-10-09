import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, Suspense, ref } from 'vue'
import LoginLayout from '~/lat/layouts/login.vue'

// The chat pages use the `login` layout. Upstream's has no cookie banner, so
// /chats showed none; the lat override adds the banner, puts its in-flow
// spacer inside the page content (after the page, so the page can scroll
// clear of the fixed bar), and shows the L&T sign-in modal when signed out.

const authUser = ref(null)
const authStore = {
  get user() {
    return authUser.value
  },
  forceLogin: false,
}
const miscStore = { apiCount: 0 }
const bootSession = vi.fn()

vi.mock('~/stores/auth', () => ({ useAuthStore: () => authStore }))
vi.mock('~/stores/misc', () => ({ useMiscStore: () => miscStore }))
vi.mock('~/stores/mobile', () => ({ useMobileStore: () => ({ isApp: false }) }))
vi.mock('~/composables/useBootSession', () => ({
  bootSession: (...a) => bootSession(...a),
}))

const stubs = {
  LayoutCommon: {
    template:
      '<div class="layout-common"><main class="pageContent"><slot /></main></div>',
  },
  LatCookieSpacer: { template: '<div class="lcc-spacer-stub" />' },
  LatCookieConsent: { template: '<div class="lat-cookie-consent-stub" />' },
  LoginModal: { template: '<div class="login-modal-stub" />' },
  ClientOnly: { template: '<div><slot /></div>' },
}

async function mountLayout() {
  const Wrapper = defineComponent({
    render() {
      return h(Suspense, null, {
        default: () =>
          h(LoginLayout, null, {
            default: () => h('div', { class: 'page' }, 'page'),
          }),
      })
    },
  })
  const w = mount(Wrapper, { global: { stubs } })
  await flushPromises()
  return w
}

describe('lat login layout', () => {
  beforeEach(() => {
    vi.stubGlobal('useHead', vi.fn())
    authUser.value = null
    authStore.forceLogin = false
    bootSession.mockReset().mockResolvedValue(null)
  })

  it('renders the page inside the shared layout with the cookie spacer after it', async () => {
    const w = await mountLayout()
    const main = w.find('main.pageContent')
    expect(main.exists()).toBe(true)
    const children = main.element.children
    expect(children[0].className).toBe('page')
    expect(children[1].className).toBe('lcc-spacer-stub')
    // Spacer is inside the page content; the banner is outside it.
    expect(w.find('.layout-common .lat-cookie-consent-stub').exists()).toBe(
      false
    )
    expect(w.find('.lat-cookie-consent-stub').exists()).toBe(true)
  })

  it('shows the sign-in modal only when signed out, and boots the session once', async () => {
    const w = await mountLayout()
    expect(bootSession).toHaveBeenCalledTimes(1)
    expect(w.find('.login-modal-stub').exists()).toBe(true)
    expect(authStore.forceLogin).toBe(true)

    authUser.value = { id: 1 }
    const w2 = await mountLayout()
    expect(w2.find('.login-modal-stub').exists()).toBe(false)
  })
})
