/**
 * Shared auth + payment getters and a smart-CTA helper for L&T.
 *
 * Why: the landing page (and its section components) have several CTAs
 * — "Join to garden share", "Find a garden", "Share my garden", "Join
 * now" — that all call `requestLogin()` from useNavbar. When the user
 * is already logged in (and has paid), `requestLogin` just sets
 * `authStore.forceLogin = true`, which has no visible effect because
 * the login modal is suppressed for logged-in users. So the CTAs end
 * up silently doing nothing — they look broken.
 *
 * This composable lets a CTA say what its INTENT is (browse / lend /
 * tend / join) and dispatches correctly based on the visitor's state:
 *   - logged out          → open the login modal
 *   - logged in, unpaid   → /join (the membership page)
 *   - logged in, paid     → the intent destination (/map / /lend / /tend)
 */
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useNavbar } from '~/composables/useNavbar'

const PAID_STATUSES = new Set(['paid', 'concession'])

export function useLatAuth() {
  const authStore = useAuthStore()
  const { requestLogin } = useNavbar()

  const isLoggedIn = computed(() => !!authStore.user)
  const hasPaid = computed(() => {
    const s = authStore.user?.settings?.lat_payment?.status
    return PAID_STATUSES.has(s)
  })

  /**
   * Route a CTA click based on the visitor's auth + payment state.
   *
   * @param {'browse'|'lend'|'tend'|'join'} intent
   *   browse: paid users go to /map (the public listings)
   *   lend:   paid users go to /lend (post a garden to lend)
   *   tend:   paid users go to /tend (post asking to tend)
   *   join:   paid users land on /map (already members — nothing to join);
   *           unpaid logged-in users go to /join (the membership page);
   *           logged-out users see the login modal.
   */
  function ctaClick(intent = 'join') {
    if (!isLoggedIn.value) {
      requestLogin()
      return
    }
    if (!hasPaid.value) {
      navigateTo('/join')
      return
    }
    // Logged-in + paid: dispatch to the right page.
    switch (intent) {
      case 'lend':
        navigateTo('/lend')
        break
      case 'tend':
        navigateTo('/tend')
        break
      case 'browse':
      case 'join':
      default:
        navigateTo('/map')
    }
  }

  return { isLoggedIn, hasPaid, ctaClick }
}
