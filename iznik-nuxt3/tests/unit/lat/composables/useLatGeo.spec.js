import { describe, it, expect } from 'vitest'
import {
  haversineKm,
  distanceMilesFromUser,
  parsedDescription,
  kmToMiles,
  milesToKm,
  MILE_OPTIONS,
  nearestMileOption,
} from '~/lat/composables/useLatGeo.js'

describe('haversineKm', () => {
  it('returns 0 for two identical points', () => {
    expect(haversineKm(51.5, -0.1, 51.5, -0.1)).toBeCloseTo(0, 5)
  })

  it('London ↔ Edinburgh is roughly 535 km', () => {
    // London 51.5074,-0.1278 ; Edinburgh 55.9533,-3.1883
    const d = haversineKm(51.5074, -0.1278, 55.9533, -3.1883)
    expect(d).toBeGreaterThan(530)
    expect(d).toBeLessThan(545)
  })

  it('London ↔ Manchester is roughly 260 km', () => {
    // M1 5GD ≈ 53.4716,-2.2407
    const d = haversineKm(51.5074, -0.1278, 53.4716, -2.2407)
    expect(d).toBeGreaterThan(255)
    expect(d).toBeLessThan(270)
  })

  it('symmetry: swapping args gives the same distance', () => {
    const a = haversineKm(51.5, -0.1, 53.5, -2.2)
    const b = haversineKm(53.5, -2.2, 51.5, -0.1)
    expect(a).toBeCloseTo(b, 8)
  })
})

describe('distanceMilesFromUser', () => {
  it('returns null when user location is unset', () => {
    const pin = { lat: 51.5, lng: -0.1 }
    expect(distanceMilesFromUser(null, null, pin)).toBeNull()
    expect(distanceMilesFromUser(undefined, undefined, pin)).toBeNull()
    expect(distanceMilesFromUser(51.5, null, pin)).toBeNull()
  })

  it('returns null when pin has no coords', () => {
    expect(distanceMilesFromUser(51.5, -0.1, {})).toBeNull()
    expect(distanceMilesFromUser(51.5, -0.1, { lat: 51.5 })).toBeNull()
    expect(distanceMilesFromUser(51.5, -0.1, null)).toBeNull()
  })

  it('zero distance reads as "0.0"', () => {
    expect(distanceMilesFromUser(51.5, -0.1, { lat: 51.5, lng: -0.1 })).toBe('0.0')
  })

  it('short distance (<10 mi) keeps 1 decimal', () => {
    // ~2 km apart ≈ 1.2 miles
    const out = distanceMilesFromUser(51.5, -0.1, { lat: 51.515, lng: -0.115 })
    expect(out).toMatch(/^\d\.\d$/)
  })

  it('long distance (>=10 mi) rounds to whole number', () => {
    // London → Edinburgh ≈ 330+ miles
    const out = distanceMilesFromUser(51.5074, -0.1278, {
      lat: 55.9533,
      lng: -3.1883,
    })
    expect(out).toMatch(/^\d+$/)
    expect(Number(out)).toBeGreaterThan(300)
  })
})

describe('parsedDescription', () => {
  it('extracts description from JSON textbody', () => {
    const pin = { textbody: JSON.stringify({ description: 'A sunny patch' }) }
    expect(parsedDescription(pin)).toBe('A sunny patch')
  })

  it('returns "" when JSON has no description field', () => {
    const pin = { textbody: '{"postcode":"SW1A 1AA"}' }
    expect(parsedDescription(pin)).toBe('')
  })

  it('truncates to 120 chars + ellipsis by default', () => {
    const long = 'x'.repeat(200)
    const pin = { textbody: JSON.stringify({ description: long }) }
    const out = parsedDescription(pin)
    expect(out.length).toBe(121) // 120 + '…'
    expect(out.endsWith('…')).toBe(true)
  })

  it('keeps short descriptions unchanged', () => {
    const pin = { textbody: JSON.stringify({ description: 'short' }) }
    expect(parsedDescription(pin)).toBe('short')
  })

  it('falls back to plain-text textbody (truncated)', () => {
    const pin = { textbody: 'plain prose — no JSON here' }
    expect(parsedDescription(pin)).toBe('plain prose — no JSON here')
  })

  it('returns "" for null / missing textbody', () => {
    expect(parsedDescription({})).toBe('')
    expect(parsedDescription({ textbody: '' })).toBe('')
    expect(parsedDescription(null)).toBe('')
  })

  it('respects custom limit', () => {
    const pin = { textbody: JSON.stringify({ description: 'abcdefghij' }) }
    expect(parsedDescription(pin, 4)).toBe('abcd…')
  })
})

describe('km ↔ miles conversion', () => {
  it('kmToMiles uses 0.621371', () => {
    expect(kmToMiles(0)).toBeCloseTo(0)
    expect(kmToMiles(1)).toBeCloseTo(0.621371, 5)
    expect(kmToMiles(10)).toBeCloseTo(6.21371, 5)
  })
  it('milesToKm rounds to whole km', () => {
    expect(milesToKm(0)).toBe(0)
    expect(milesToKm(10)).toBe(16) // 10 / 0.621371 ≈ 16.09
    expect(milesToKm(50)).toBe(80) // ≈ 80.47
  })
})

describe('MILE_OPTIONS / nearestMileOption', () => {
  it('exposes the canonical option set', () => {
    expect(MILE_OPTIONS).toEqual([1, 2, 5, 10, 20, 50])
  })
  it('snaps an exact value to itself', () => {
    expect(nearestMileOption(10)).toBe('10')
  })
  it('snaps slightly-above to the nearest', () => {
    expect(nearestMileOption(11)).toBe('10')
    expect(nearestMileOption(13)).toBe('10') // 13 vs 20: 3 < 7
    expect(nearestMileOption(16)).toBe('20') // 16 vs 10: 6, vs 20: 4
  })
  it('snaps below-1 to 1', () => {
    expect(nearestMileOption(0)).toBe('1')
    expect(nearestMileOption(0.4)).toBe('1')
  })
  it('snaps above-50 to 50', () => {
    expect(nearestMileOption(100)).toBe('50')
  })
  it('returns the snapped value as a string', () => {
    expect(typeof nearestMileOption(7)).toBe('string')
  })
})
