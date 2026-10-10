import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import AdminLayout from '~/lat/layouts/admin.vue'

// The admin area has its own layout, so it must register Lend & Tend's social
// tags itself (see lat/composables/latSocialMeta.js) or /admin links preview
// as Freegle.

const authUser = ref(null)
const authStore = {
  get user() {
    return authUser.value
  },
  forceLogin: false,
  fetchUser: vi.fn().mockResolvedValue(null),
  logout: vi.fn(),
}
vi.mock('~/stores/auth', () => ({ useAuthStore: () => authStore }))

const useHead = vi.fn()
vi.mock('#imports', async (importOriginal) => ({
  ...(await importOriginal()),
  useHead: (...a) => useHead(...a),
  useRuntimeConfig: () => ({
    public: { USER_SITE: 'https://new.lendandtend.com' },
  }),
}))

describe('lat admin layout', () => {
  beforeEach(() => {
    useHead.mockClear()
    authUser.value = null
  })

  it('hides the site navbars via a body class and registers our social tags', async () => {
    mount(AdminLayout, {
      slots: { default: '<div class="page">page</div>' },
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>' },
          LoginModal: { template: '<div class="login-modal-stub" />' },
          ModMenuItemLeft: { template: '<li class="menu-item-stub" />' },
          ClientOnly: { template: '<div><slot /></div>' },
        },
      },
    })
    await flushPromises()
    expect(useHead).toHaveBeenCalledTimes(1)
    const head = useHead.mock.calls[0][0]
    expect(head.bodyAttrs.class).toBe('lat-admin-mode')
    const byKey = Object.fromEntries(head.meta.map((m) => [m.key, m.content]))
    expect(byKey['og:site_name']).toBe('Lend and Tend')
    expect(byKey['twitter:site']).toBe('@LendandTend')
  })
})
