import { useAuthStore } from '~/stores/auth'
import Api from '~/api'

/**
 * Private, per-listing details: the member's street address, postcode and
 * PAF id.
 *
 * A listing is a Freegle message, and a message's textbody is public API data
 * (anyone, signed in or not, can GET /message/:id and read it). So these
 * fields must never go in the textbody. They live in the member's own
 * `settings.lat_gardens[msgid]`, which the API returns only to that member,
 * and are shared with a specific person only through the agreement flow
 * (LatSendAddressModal).
 *
 * The pure helpers below are unit-tested; useLatPrivateGarden() wires them to
 * the auth store and the session API. PATCH /session replaces the whole
 * settings blob, so every write goes through withPrivateDetails() to keep
 * everything else the member has set.
 */

// phone is here too: the API masks phone numbers in public text anyway, so a
// phone in the textbody was collected and then lost; privately it is kept.
export const PRIVATE_LISTING_FIELDS = ['address', 'postcode', 'pafid', 'phone']

function parseSettings(settings) {
  let s = settings
  if (typeof s === 'string') {
    try {
      s = JSON.parse(s)
    } catch {
      s = null
    }
  }
  return s && typeof s === 'object' && !Array.isArray(s) ? s : {}
}

function isBlank(value) {
  return value === undefined || value === null || value === ''
}

/**
 * Split a full listing body into what may be published and what must stay
 * private. `privateDetails` is null when there is nothing private.
 */
export function splitListingBody(body) {
  const publicBody = {}
  const privateDetails = {}
  for (const [key, value] of Object.entries(body || {})) {
    if (PRIVATE_LISTING_FIELDS.includes(key)) {
      if (!isBlank(value)) privateDetails[key] = value
    } else {
      publicBody[key] = value
    }
  }
  return {
    publicBody,
    privateDetails: Object.keys(privateDetails).length ? privateDetails : null,
  }
}

/** The stored private details for one listing, or null. */
export function privateDetailsFor(settings, msgid) {
  const gardens = parseSettings(settings).lat_gardens
  if (!gardens || typeof gardens !== 'object') return null
  const entry = gardens[String(msgid)]
  return entry && typeof entry === 'object' ? { ...entry } : null
}

/**
 * A new settings object with this listing's private details set (or removed
 * when `details` is null). Never mutates its input.
 */
export function withPrivateDetails(settings, msgid, details) {
  const base = parseSettings(settings)
  const gardens = {
    ...(base.lat_gardens && typeof base.lat_gardens === 'object'
      ? base.lat_gardens
      : {}),
  }
  if (details && Object.keys(details).length) {
    gardens[String(msgid)] = { ...details }
  } else {
    delete gardens[String(msgid)]
  }
  return { ...base, lat_gardens: gardens }
}

export function useLatPrivateGarden() {
  const authStore = useAuthStore()
  const config = useRuntimeConfig()
  const api = Api(config)

  function get(msgid) {
    return privateDetailsFor(authStore.user?.settings, msgid)
  }

  async function save(msgid, details) {
    await api.session.save({
      settings: withPrivateDetails(authStore.user?.settings, msgid, details),
    })
    await authStore.fetchUser()
  }

  return { get, save }
}
