import { describe, it, expect } from 'vitest'
import {
  ADMIN_MENU,
  adminMenuLinks,
  activeMenuLink,
} from '~/lat/composables/latAdminMenu'

describe('ADMIN_MENU', () => {
  it('lists every admin page once, with a name', () => {
    const links = adminMenuLinks()
    expect(new Set(links).size).toBe(links.length)
    for (const section of ADMIN_MENU) {
      for (const item of section.items) {
        expect(item.link).toMatch(/^\/admin(\/[a-z-]+)*$/)
        expect(item.name.trim().length).toBeGreaterThan(0)
      }
    }
    // The pages that used to be reachable only by typing the URL.
    expect(links).toContain('/admin/users')
    expect(links).toContain('/admin/settings')
  })
})

describe('activeMenuLink', () => {
  it('matches the dashboard exactly and sub-pages by their longest parent', () => {
    expect(activeMenuLink('/admin')).toBe('/admin')
    expect(activeMenuLink('/admin/')).toBe('/admin')
    expect(activeMenuLink('/admin/members')).toBe('/admin/members')
    expect(activeMenuLink('/admin/members/flagged')).toBe(
      '/admin/members/flagged'
    )
    expect(activeMenuLink('/admin/users/42')).toBe('/admin/users')
    expect(activeMenuLink('/admin/gardens/pending')).toBe(
      '/admin/gardens/pending'
    )
  })

  it('is null off the menu', () => {
    expect(activeMenuLink('/map')).toBe(null)
    expect(activeMenuLink('')).toBe(null)
  })
})
