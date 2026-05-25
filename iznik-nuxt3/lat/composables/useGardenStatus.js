/**
 * Pure helpers for derived garden / listing display state.
 *
 * Extracted from `lat/pages/profile.vue` so they can be unit-tested
 * directly and reused by other lat surfaces (map list view, admin
 * dashboard, etc.) that need the same labels.
 *
 * IMPORTANT: the promise `acceptedat` field is lowercase to match the
 * Go API's JSON serialisation (`json:"acceptedat"` in messageOutcome.go).
 * Using `Acceptedat` here would silently fail to detect confirmed
 * agreements — a bug that already bit us once.
 */

export function parsedBody(listing) {
  const raw = listing?.textbody
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return { description: raw }
  }
}

export function hasLenderDetails(listing) {
  const b = parsedBody(listing)
  return Boolean(b.gardenSize || b.sunExposure || b.waterAccess || b.accessRoute)
}

export function hasTenderDetails(listing) {
  const b = parsedBody(listing)
  return Boolean(b.tools || b.availability || b.honestyDeclaration)
}

export function gardenSizeLabel(v) {
  return (
    { small: 'Small (up to 50 m²)', medium: 'Medium (50–200 m²)', large: 'Large (200 m²+)' }[
      v
    ] || v
  )
}

export function sunLabel(v) {
  return ({ full: 'Full sun', partial: 'Partial shade', shade: 'Mostly shade' }[v] || v)
}

export function accessLabel(v) {
  return (
    { gate: 'Side / back gate', through_house: 'Through the house', other: 'Other' }[v] || v
  )
}

export function toolsLabel(v) {
  return (
    {
      basic: 'Basic hand tools',
      full: 'Full set of garden tools',
      none: "None — needs access to lender's tools",
    }[v] || v
  )
}

export function availabilityLabel(v) {
  return (
    { weekends: 'Weekends', weekdays: 'Weekdays', flexible: 'Flexible', evenings: 'Evenings' }[
      v
    ] || v
  )
}

export function hasAgreement(listing) {
  return Boolean(listing?.promises && listing.promises.length > 0)
}

/**
 * True when there's a proposed agreement that isn't yet accepted.
 * (Lender's perspective: "tender has been sent terms and hasn't
 * accepted yet".)
 */
export function hasActiveAgreement(listing) {
  return (
    Boolean(listing?.promises) &&
    listing.promises.length > 0 &&
    !listing.promises[0].acceptedat
  )
}

export function gardenStatus(listing) {
  if (hasAgreement(listing)) {
    return listing.promises[0].acceptedat ? 'Agreement confirmed' : 'Agreement proposed'
  }
  return 'Looking for a tender'
}

export function gardenStatusClass(listing) {
  if (hasAgreement(listing)) {
    return listing.promises[0].acceptedat ? 'status-confirmed' : 'status-proposed'
  }
  return 'status-available'
}

export function agreementLink(listing) {
  if (!hasAgreement(listing)) return ''
  const tenderId = listing.promises[0].userid
  return `/agreement/${listing.id}?userId=${tenderId}`
}

export function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
