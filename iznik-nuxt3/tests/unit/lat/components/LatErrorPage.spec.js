import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ErrorPage from '~/lat/error.vue'

// The L&T error page replaces upstream's, whose 404 says "Maybe it's been
// freegled?" and whose other states show raw error JSON and a Freegle
// fundraiser link.

const errorRef = ref(null)
const useHead = vi.fn()
vi.mock('#imports', () => ({
  useError: () => errorRef,
  useHead: (...a) => useHead(...a),
  useRuntimeConfig: () => ({
    public: { USER_SITE: 'https://new.lendandtend.com/' },
  }),
}))
vi.mock('~/branding.config', () => ({
  default: { email: 'hello@lendandtend.com' },
}))

const NuxtLink = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}
const mountPage = () =>
  mount(ErrorPage, { global: { stubs: { NuxtLink, 'nuxt-link': NuxtLink } } })

describe('Lend & Tend error page', () => {
  it('404: our wording, a way to the map and home, no Freegle words', () => {
    errorRef.value = { statusCode: 404, message: 'Page not found' }
    const w = mountPage()
    expect(w.text()).toContain("That page isn't here")
    expect(w.find('a[href="/map"]').exists()).toBe(true)
    expect(w.text()).toContain('hello@lendandtend.com')
    expect(w.text().toLowerCase()).not.toMatch(/freegle|freegled/)
  })

  it('other errors: a plain sentence and the status code, never the raw error', () => {
    errorRef.value = {
      statusCode: 500,
      message: 'TypeError: secret internal detail',
      data: { stack: 'at nitro.mjs:1' },
    }
    const w = mountPage()
    expect(w.text()).toContain('Something went wrong')
    expect(w.text()).toContain('Error 500')
    expect(w.text()).not.toContain('secret internal detail')
    expect(w.text()).not.toContain('nitro.mjs')
  })

  it('maintenance: says so and offers to try again', () => {
    errorRef.value = { statusCode: 503, message: 'Maintenance error' }
    const w = mountPage()
    expect(w.text()).toContain('maintenance')
    expect(w.find('a[href="/"]').exists()).toBe(true)
  })

  it('sets our own title and social tags, so a shared bad link previews as Lend & Tend', () => {
    errorRef.value = { statusCode: 404, message: 'Page not found' }
    useHead.mockClear()
    mountPage()
    expect(useHead).toHaveBeenCalledTimes(1)
    const head = useHead.mock.calls[0][0]
    expect(head.title).toMatch(/Lend & Tend/)
    const byKey = Object.fromEntries(head.meta.map((m) => [m.key, m.content]))
    expect(byKey['og:site_name']).toBe('Lend and Tend')
    expect(byKey['twitter:site']).toBe('@LendandTend')
    expect(byKey['og:url']).toBe('https://new.lendandtend.com')
  })
})
