export const useSmartAddress = () => {
  /* Reverse-geocode lat/lng to postcode using postcodes.io API */
  const reverseGeocode = async (lat, lng) => {
    try {
      const resp = await fetch(
        `https://api.postcodes.io/postcodes?lat=${lat}&lon=${lng}`
      )
      const data = await resp.json()
      if (data.status === 200 && data.result && data.result.length > 0) {
        return {
          postcode: data.result[0].postcode,
          address: data.result[0],
        }
      }
      return null
    } catch (e) {
      console.error('Reverse geocoding failed:', e)
      return null
    }
  }

  /* Get the address string from textbody JSON */
  const getAddressFromTextbody = (textbody) => {
    try {
      if (typeof textbody === 'string') {
        const parsed = JSON.parse(textbody)
        return parsed.postcode || null
      }
      return textbody?.postcode || null
    } catch {
      return null
    }
  }

  /* Build a human-readable address message from postcode and offer details */
  const buildAddressMessage = (postcode, offerSubject) => {
    let msg = `My address is in postcode ${postcode}`
    if (offerSubject) {
      msg += `. This is for my garden listing: "${offerSubject}"`
    }
    msg += '.'
    return msg
  }

  return {
    reverseGeocode,
    getAddressFromTextbody,
    buildAddressMessage,
  }
}
