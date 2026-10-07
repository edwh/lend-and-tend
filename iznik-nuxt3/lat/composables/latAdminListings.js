/**
 * Helpers for the admin pages that count or filter listings by group and
 * collection.
 *
 * A message from the API carries its group memberships nested
 * (`groups: [{ groupid, collection, ... }]`); some store shapes flatten the
 * first one to top-level `groupid`/`collection`. Checking only the top level
 * matched nothing for real API data, which is why the dashboard showed 0
 * pending and 0 approved while the API returned dozens.
 */

/** True if `message` is in `groupid` with the given collection (e.g. 'Pending'). */
export function messageInCollection(message, groupid, collection) {
  if (!message) return false
  const gid = Number(groupid)
  const groups = Array.isArray(message.groups) ? message.groups : []
  if (
    groups.some(
      (g) => g && Number(g.groupid) === gid && g.collection === collection
    )
  ) {
    return true
  }
  return Number(message.groupid) === gid && message.collection === collection
}

/** True if a listing has a promise (an agreement in progress or confirmed). */
export function messageHasAgreement(message) {
  if (!message) return false
  if (Array.isArray(message.promises) && message.promises.length) return true
  return !!message.promised
}
