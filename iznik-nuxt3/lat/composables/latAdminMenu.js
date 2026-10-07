/**
 * The admin area's navigation, as data. The layout renders it; the a11y and
 * link tests crawl it. Keep every page reachable from here (a page that is
 * not in the menu is a page nobody finds).
 */
import menu from './admin-menu.json'

// One source for the layout (ESM) and the e2e crawl (CommonJS): lat/composables/admin-menu.json.
export const ADMIN_MENU = Object.freeze(menu)

/** Every link in the menu, flattened. */
export function adminMenuLinks(menu = ADMIN_MENU) {
  return menu.flatMap((section) => section.items.map((i) => i.link))
}

/**
 * Which menu item is current for a path. The dashboard matches exactly; any
 * other item matches itself and its sub-pages (so /admin/users/42 lights up
 * "Search", and /admin/members/flagged lights up "Flagged", not "All members").
 */
export function activeMenuLink(path, menu = ADMIN_MENU) {
  const p = (path || '').replace(/\/$/, '') || '/'
  const links = adminMenuLinks(menu)
  if (p === '/admin') return '/admin'
  const matches = links
    .filter((l) => l !== '/admin' && (p === l || p.startsWith(l + '/')))
    .sort((a, b) => b.length - a.length)
  return matches[0] || null
}
