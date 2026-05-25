/**
 * Pure distance + text helpers used by lat/pages/map.vue (list view).
 * Extracted so they can be unit-tested and reused (admin gardens
 * page, garden detail, etc.).
 */

/**
 * Great-circle distance between two lat/lng points in kilometres.
 * Uses the haversine formula (Earth-radius constant 6371 km).
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} kilometres
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Format a distance for display next to a pin. Returns null when
 * either the user's location or the pin's coords are missing.
 * Short distances (under 10 mi) keep 1 decimal place; longer ones
 * round to a whole number.
 *
 * @param {number|null} userLat
 * @param {number|null} userLng
 * @param {{lat?: number|null, lng?: number|null}} pin
 * @returns {string|null}
 */
export function distanceMilesFromUser(userLat, userLng, pin) {
  if (
    userLat === null ||
    userLng === null ||
    userLat === undefined ||
    userLng === undefined ||
    !pin?.lat ||
    !pin?.lng
  ) {
    return null
  }
  const km = haversineKm(userLat, userLng, pin.lat, pin.lng)
  const miles = km * 0.621371
  return miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()
}

/**
 * Extract the description from a pin's textbody (which may be JSON
 * with a `description` field, or plain text). Truncates to ~120
 * chars with an ellipsis. Returns "" when nothing's available.
 */
export function parsedDescription(pin, limit = 120) {
  if (!pin?.textbody) return ''
  try {
    const body = JSON.parse(pin.textbody)
    if (!body.description) return ''
    return body.description.length > limit
      ? body.description.substring(0, limit) + '…'
      : body.description
  } catch {
    return pin.textbody.substring(0, limit)
  }
}

// ── Unit conversion + snap-to-option helpers (used by /settings) ─────────────

/** Convert kilometres to miles. */
export function kmToMiles(km) {
  return km * 0.621371
}

/** Convert miles to kilometres (rounded to whole km). */
export function milesToKm(miles) {
  return Math.round(miles / 0.621371)
}

/**
 * The set of "round number" mile values offered in the L&T travel-radius
 * settings field. Other surfaces can show the closest option to a stored
 * value via {@link nearestMileOption}.
 */
export const MILE_OPTIONS = [1, 2, 5, 10, 20, 50]

/**
 * Snap a numeric mile value to the nearest option in {@link MILE_OPTIONS}.
 * Returns the result as a string (the settings form uses it directly as
 * a `<select>` value).
 */
export function nearestMileOption(miles) {
  return String(
    MILE_OPTIONS.reduce((prev, curr) =>
      Math.abs(curr - miles) < Math.abs(prev - miles) ? curr : prev
    )
  )
}
