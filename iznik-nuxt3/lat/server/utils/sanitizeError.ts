/**
 * Keep stack traces out of production error responses.
 *
 * Upstream Freegle's server/plugins/log-ssr-errors.js hooks every Nitro error
 * and copies `error.stack` into `error.data.stack` so its error page can relay
 * it to its own logs. Nitro's production error handler serialises
 * `error.data` for every deliberate error (only unhandled/fatal ones are
 * treated as sensitive), so on Lend & Tend a plain 401 from
 * /api/concession-claim went out with a full stack trace and internal file
 * paths. Nitro gives no ordering guarantee between the two hooks, so this
 * works either way round: it strips a stack that is already there, freezes
 * any data worth keeping, and makes `data` unsettable so a later assignment
 * is a silent no-op.
 *
 * Development is left alone: stacks in the error page are useful there.
 */
export function sanitizeErrorForClient(
  error: unknown,
  env: Record<string, string | undefined>
): void {
  if (env.NODE_ENV !== 'production') return
  if (!error || typeof error !== 'object') return
  const e = error as { data?: unknown }

  let keep: Record<string, unknown> | undefined
  if (e.data && typeof e.data === 'object' && !Array.isArray(e.data)) {
    const { stack: _stack, ...rest } = e.data as Record<string, unknown>
    if (Object.keys(rest).length) keep = Object.freeze(rest)
  }

  // A getter/setter pair: reads see the sanitised data (or nothing), writes
  // from a later hook are ignored. configurable so this can run twice.
  Object.defineProperty(e, 'data', {
    configurable: true,
    enumerable: true,
    get: () => keep,
    set: () => {},
  })
}
