/**
 * Whether the "pretend to pay" development bypass may exist at all.
 *
 * Fail-safe: never in production; otherwise only in a development server
 * (NODE_ENV=development, the Nuxt dev server) unless switched off, or with an
 * explicit LAT_ALLOW_FAKE_PAYMENT=true opt-in (a test stack). An environment
 * that forgot to set NODE_ENV gets the bypass OFF, not on. Shared by the
 * server route and the runtime config flag that shows the button.
 */
export function fakePaymentAllowed(
  env: Record<string, string | undefined>
): boolean {
  if (env.NODE_ENV === 'production') return false
  if (env.LAT_ALLOW_FAKE_PAYMENT === 'true') return true
  return (
    env.NODE_ENV === 'development' && env.LAT_ALLOW_FAKE_PAYMENT !== 'false'
  )
}
