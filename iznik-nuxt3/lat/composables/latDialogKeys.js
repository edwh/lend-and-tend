/**
 * Keyboard helpers for Lend & Tend's own dialogs (the sign-in modal).
 *
 * A dialog must keep Tab inside itself, open with focus on its first field and
 * give focus back to whatever opened it when it closes. Bootstrap's modals do
 * this for us; our hand-rolled modal did none of it.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Focusable elements inside `container`, in DOM order, visible ones only. */
export function focusableIn(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false
    // jsdom has no layout; treat elements as visible unless hidden explicitly.
    const style = el.ownerDocument.defaultView?.getComputedStyle?.(el)
    return !style || (style.display !== 'none' && style.visibility !== 'hidden')
  })
}

/**
 * Keep Tab / Shift+Tab cycling inside `container`. Call from a keydown
 * handler; returns true when it moved focus (and prevented the default).
 */
export function trapTab(event, container) {
  if (!event || event.key !== 'Tab') return false
  const items = focusableIn(container)
  if (!items.length) {
    event.preventDefault()
    return true
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = container.ownerDocument.activeElement
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault()
    last.focus()
    return true
  }
  if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault()
    first.focus()
    return true
  }
  return false
}

/** The element a freshly opened dialog should focus: the first field, else the first control. */
export function initialFocusTarget(container) {
  if (!container) return null
  return (
    container.querySelector(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
    ) ||
    focusableIn(container)[0] ||
    null
  )
}
