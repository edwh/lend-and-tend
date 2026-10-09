/**
 * Finding the garden a chat is about, so "Propose agreement" knows which listing
 * to open.
 *
 * The API's `GET /user/:id/message?active=true` only lists a member's
 * listings once they are in the public spatial index, which the batch job
 * fills a few minutes after a garden is posted. Until then the lookup finds
 * nothing, so callers must treat `null` as "not yet" and tell the member,
 * rather than silently doing nothing (which is what the chat footer used to
 * do).
 */
// Relative so it resolves the same way in the Nuxt layer and in unit tests.
import { messageInGroup } from './latAdminListings'

export const AGREEMENT_LISTING_NOT_FOUND =
  "We couldn't find a garden listing for this conversation yet. A newly posted garden can take a few minutes to appear - please try again shortly."

/** The first L&T garden offer (type Offer in the world group) in a list, or null. */
export function pickAgreementListing(messages, groupid) {
  const list = Array.isArray(messages) ? messages : []
  const offer = list.find(
    (m) => m && m.type === 'Offer' && messageInGroup(m, groupid)
  )
  return offer ? offer.id : null
}

/**
 * Look through each participant's active listings for a garden offer.
 * `fetcher(url)` returns the parsed JSON list (defaults to $fetch).
 * Returns the listing id, or null if none of the participants has one yet.
 */
export async function findAgreementListing({
  apiBase,
  groupid,
  userIds,
  fetcher = (url) => $fetch(url, { params: { active: true } }),
}) {
  for (const userId of (userIds || []).filter(Boolean)) {
    try {
      const data = await fetcher(`${apiBase}/user/${userId}/message`)
      const id = pickAgreementListing(data, groupid)
      if (id) return { id, userId }
    } catch {
      /* try the next participant */
    }
  }
  return null
}
