import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, Suspense, ref } from 'vue'
import DefaultLayout from '~/lat/layouts/default.vue'

// The default layout is where most pages get Lend & Tend's social tags.
// Upstream's nuxt.config registers Freegle's for every page, and only tags
// re-registered at runtime beat them (see lat/composables/latSocialMeta.js).

const authUser = ref(null)
const fetchUser = vi.fn()
const authStore = {
  get user() {
    return authUser.value
  },
  loginStateKnown: true,
  auth: { jwt: null, persistent: null },
  fetchUser,
}
const miscStore = { apiCount: 0 }

vi.mock('~/stores/auth', () => ({ useAuthStore: () => authStore }))
vi.mock('~/stores/misc', () => ({ useMiscStore: () => miscStore }))

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
          h(DefaultLayout, null, {
            default: () => h('div', { class: 'page' }, 'page'),
          }),
      })
    },
  })
  const w = mount(Wrapper, { global: { stubs } })
  await flushPromises()
  return w
}

const useHead = vi.fn()

describe('lat default layout', () => {
  beforeEach(() => {
    useHead.mockClear()
    fetchUser.mockReset().mockResolvedValue(null)
    vi.stubGlobal('useHead', useHead)
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { USER_SITE: 'https://new.lendandtend.com/' },
    }))
    authUser.value = null
  })

  it('renders the page with the cookie spacer after it and the banner outside', async () => {
    const w = await mountLayout()
    const children = w.find('main.pageContent').element.children
    expect(children[0].className).toBe('page')
    expect(children[1].className).toBe('lcc-spacer-stub')
    expect(w.find('.lat-cookie-consent-stub').exists()).toBe(true)
  })

  it("registers Lend & Tend's social tags against the serving host", async () => {
    await mountLayout()
    expect(useHead).toHaveBeenCalledTimes(1)
    const head = useHead.mock.calls[0][0]
    expect(head.bodyAttrs.style).toContain('background-color')
    const byKey = Object.fromEntries(head.meta.map((m) => [m.key, m.content]))
    expect(byKey['og:site_name']).toBe('Lend and Tend')
    expect(byKey['og:url']).toBe('https://new.lendandtend.com')
    expect(byKey['og:image']).toBe(
      'https://new.lendandtend.com/images/lat/logo.png?v=2'
    )
    expect(byKey['twitter:site']).toBe('@LendandTend')
  })
})
