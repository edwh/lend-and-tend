import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ModMenuItemLeft from '~/lat/components/ModMenuItemLeft.vue'

// The admin sidebar (lat/layouts/admin.vue) renders every entry through this
// component. It was written against ModTools' ModMenuItemLeft, which the lat
// layer cannot resolve (it extends the root app, not modtools/), so until this
// stand-in existed the sidebar showed only its section headings.

const mockRoute = { path: '/admin' }
vi.mock('#imports', () => ({
  useRoute: () => mockRoute,
}))

const NuxtLink = {
  props: ['to'],
  emits: ['click'],
  template: '<a :href="to" @click="$emit(\'click\')"><slot /></a>',
}

function mountItem(props) {
  return mount(ModMenuItemLeft, {
    props,
    global: { stubs: { NuxtLink } },
  })
}

describe('ModMenuItemLeft (lat)', () => {
  it('renders a link with the given name and target', () => {
    const w = mountItem({ link: '/admin/pending', name: 'Pending' })
    const a = w.find('a')
    expect(a.text()).toBe('Pending')
    expect(a.attributes('href')).toBe('/admin/pending')
  })

  it('indents when asked', () => {
    expect(
      mountItem({ link: '/x', name: 'x', indent: true })
        .find('.lat-admin-menu-link--indent')
        .exists()
    ).toBe(true)
    expect(
      mountItem({ link: '/x', name: 'x' })
        .find('.lat-admin-menu-link--indent')
        .exists()
    ).toBe(false)
  })

  it('announces the current section to assistive tech', () => {
    mockRoute.path = '/admin/members'
    expect(
      mountItem({ link: '/admin/members', name: 'Members' })
        .find('a')
        .attributes('aria-current')
    ).toBe('page')
    expect(
      mountItem({ link: '/admin/chats', name: 'Chats' })
        .find('a')
        .attributes('aria-current')
    ).toBeUndefined()
  })

  it('marks the current section active, with the dashboard matching exactly', () => {
    mockRoute.path = '/admin/members/flagged'
    expect(
      mountItem({ link: '/admin/members/flagged', name: 'Flagged' }).classes()
    ).toContain('active')
    expect(
      mountItem({ link: '/admin/members', name: 'Members' }).classes()
    ).not.toContain('active')
    expect(
      mountItem({ link: '/admin/pending', name: 'Pending' }).classes()
    ).not.toContain('active')
    expect(
      mountItem({ link: '/admin', name: 'Dashboard' }).classes()
    ).not.toContain('active')

    mockRoute.path = '/admin'
    expect(
      mountItem({ link: '/admin', name: 'Dashboard' }).classes()
    ).toContain('active')
  })

  it('shows a badge only for a direct count', () => {
    expect(
      mountItem({ link: '/x', name: 'x', directcount: 3 })
        .find('.lat-admin-menu-badge')
        .text()
    ).toBe('3')
    expect(
      mountItem({ link: '/x', name: 'x', directcount: 0 })
        .find('.lat-admin-menu-badge')
        .exists()
    ).toBe(false)
    // ModTools work-count keys are accepted (the layout passes them) and ignored.
    expect(
      mountItem({ link: '/x', name: 'x', count: ['lat_gardens_pending'] })
        .find('.lat-admin-menu-badge')
        .exists()
    ).toBe(false)
  })

  it('tells the layout to hide the mobile menu when an item is chosen', async () => {
    const w = mountItem({ link: '/admin/chats', name: 'Chats' })
    await w.find('a').trigger('click')
    expect(w.emitted('mobilehidemenu')).toHaveLength(1)
  })
})
