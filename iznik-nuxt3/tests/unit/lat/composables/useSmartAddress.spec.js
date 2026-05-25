import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSmartAddress } from '~/lat/composables/useSmartAddress.js'

describe('useSmartAddress', () => {
  const sa = useSmartAddress()

  describe('getAddressFromTextbody', () => {
    it('returns postcode from a JSON-string textbody', () => {
      expect(
        sa.getAddressFromTextbody('{"postcode": "SW1A 1AA"}')
      ).toBe('SW1A 1AA')
    })

    it('returns postcode from an already-parsed object', () => {
      expect(sa.getAddressFromTextbody({ postcode: 'M1 5GD' })).toBe('M1 5GD')
    })

    it('returns null when textbody is plain text (not JSON)', () => {
      expect(sa.getAddressFromTextbody('just some plain prose')).toBeNull()
    })

    it('returns null when textbody has no postcode field', () => {
      expect(sa.getAddressFromTextbody('{"other": "value"}')).toBeNull()
    })

    it('returns null when object lacks a postcode key', () => {
      expect(sa.getAddressFromTextbody({})).toBeNull()
    })

    it('returns null for null textbody', () => {
      expect(sa.getAddressFromTextbody(null)).toBeNull()
    })

    it('returns null for undefined textbody', () => {
      expect(sa.getAddressFromTextbody(undefined)).toBeNull()
    })
  })

  describe('buildAddressMessage', () => {
    it('includes the postcode in the message', () => {
      const msg = sa.buildAddressMessage('SW1A 1AA')
      expect(msg).toMatch(/postcode SW1A 1AA/)
    })

    it('mentions the garden listing subject when provided', () => {
      const msg = sa.buildAddressMessage('SW1A 1AA', 'Sunny veg patch')
      expect(msg).toContain('Sunny veg patch')
    })

    it('omits the subject phrase when not provided', () => {
      const msg = sa.buildAddressMessage('SW1A 1AA')
      expect(msg).not.toContain('listing')
    })

    it('always terminates with a full stop', () => {
      expect(sa.buildAddressMessage('SW1A 1AA').endsWith('.')).toBe(true)
      expect(
        sa.buildAddressMessage('SW1A 1AA', 'My garden').endsWith('.')
      ).toBe(true)
    })

    it('handles empty postcode gracefully (returns a sentence containing it)', () => {
      // Edge case: callers shouldn't pass '' but we shouldn't crash.
      const msg = sa.buildAddressMessage('')
      expect(typeof msg).toBe('string')
      expect(msg.length).toBeGreaterThan(0)
    })
  })

  describe('reverseGeocode', () => {
    // Replace global.fetch for each test so we don't actually hit the
    // postcodes.io endpoint during unit runs.
    let fetchSpy

    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              status: 200,
              result: [
                { postcode: 'SW1A 1AA', longitude: -0.1419, latitude: 51.5014 },
              ],
            }),
        })
      )
    })

    afterEach(() => {
      fetchSpy.mockRestore()
    })

    it('returns the postcode and the full address record on success', async () => {
      const out = await sa.reverseGeocode(51.5014, -0.1419)
      expect(out).toEqual({
        postcode: 'SW1A 1AA',
        address: { postcode: 'SW1A 1AA', longitude: -0.1419, latitude: 51.5014 },
      })
    })

    it('hits the postcodes.io URL with the expected query params', async () => {
      await sa.reverseGeocode(51.5014, -0.1419)
      expect(fetchSpy).toHaveBeenCalledOnce()
      const url = fetchSpy.mock.calls[0][0]
      expect(url).toMatch(/api\.postcodes\.io\/postcodes\?lat=51\.5014/)
      expect(url).toMatch(/lon=-0\.1419/)
    })

    it('returns null when the API reports no results', async () => {
      fetchSpy.mockImplementation(() =>
        Promise.resolve({ json: () => Promise.resolve({ status: 200, result: [] }) })
      )
      expect(await sa.reverseGeocode(0, 0)).toBeNull()
    })

    it('returns null when the API errors (non-200 status)', async () => {
      fetchSpy.mockImplementation(() =>
        Promise.resolve({ json: () => Promise.resolve({ status: 404 }) })
      )
      expect(await sa.reverseGeocode(0, 0)).toBeNull()
    })

    it('returns null when fetch throws', async () => {
      fetchSpy.mockImplementation(() => Promise.reject(new Error('network')))
      expect(await sa.reverseGeocode(0, 0)).toBeNull()
    })
  })
})
