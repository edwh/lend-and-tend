/**
 * Helpers for the admin member pages. They exist because the API's shapes are
 * easy to misread (and were misread):
 *
 *   GET /memberships?groupid=   -> { context, members: [row] }; each row's
 *                                   `id` is the MEMBERSHIP id, the person is
 *                                   `userid`, and the join date is `added`.
 *                                   There is no email and no settings here.
 *   GET /user/search?q=x        -> { users: [73, 71, ...] } - ids only.
 *   GET /user/:id?modtools=true -> the full record (email, settings, role) for
 *                                   an Admin/Support caller or a moderator of a
 *                                   shared group.
 */

/** The rows of a members response, whatever wrapper the API used. */
export function membershipRows(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.members)) return data.members
  return []
}

/** One membership row -> a member keyed by USER id. */
export function normaliseMembership(row) {
  const r = row || {}
  const hasUserid = r.userid !== undefined && r.userid !== null
  return {
    userid: Number(hasUserid ? r.userid : r.id),
    membershipId:
      hasUserid && r.id !== undefined && r.id !== null ? Number(r.id) : null,
    name: r.displayname || r.fullname || '—',
    joined: r.added || r.joined || null,
    email: r.email || '',
    role: r.role || '',
    postingStatus: r.ourpostingstatus || '',
  }
}

/** Where an admin looks at one member (the only detail page that exists). */
export function memberDetailPath(userid) {
  return `/admin/users/${userid}`
}

export function paymentStatusOf(user) {
  return user?.settings?.lat_payment?.status || null
}

export function paymentLabel(status) {
  if (status === 'paid') return 'Paid'
  if (status === 'concession') return 'Concession'
  return 'Not joined'
}

export function paymentClass(status) {
  if (status === 'paid') return 'lat-admin-b-paid'
  if (status === 'concession') return 'lat-admin-b-conc'
  return 'lat-admin-b-none'
}

/** User ids from a search response (ids-only, or objects). */
export function searchResultIds(data) {
  if (!data) return []
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data.users)
    ? data.users
    : []
  return list
    .map((u) => (u && typeof u === 'object' ? u.id : u))
    .filter((id) => id !== undefined && id !== null && id !== '')
}

/**
 * Fetch full user records for a list of ids, a few at a time, dropping any
 * that fail (deleted users, transient errors). `fetcher(id)` resolves to the
 * user object; see adminUserFetcher.
 */
export async function resolveUsers(
  ids,
  fetcher,
  { batch = 10, max = 200 } = {}
) {
  const out = []
  const wanted = (ids || []).slice(0, max)
  for (let i = 0; i < wanted.length; i += batch) {
    const got = await Promise.all(
      wanted.slice(i, i + batch).map((id) => fetcher(id).catch(() => null))
    )
    for (const u of got) if (u) out.push(u)
  }
  return out
}

/** A fetcher for resolveUsers that reads a member as an admin (raw JWT, no Bearer). */
export function adminUserFetcher({ apiBase, token }) {
  return (id) =>
    $fetch(`${apiBase}/user/${id}`, {
      params: { modtools: true },
      headers: { Authorization: token },
    })
}
