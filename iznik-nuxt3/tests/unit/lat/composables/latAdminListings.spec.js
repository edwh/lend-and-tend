import { describe, it, expect } from 'vitest'
import {
  messageInCollection,
  messageHasAgreement,
} from '~/lat/composables/latAdminListings'

describe('messageInCollection', () => {
  const apiShape = {
    id: 1,
    groups: [{ groupid: 1000000, collection: 'Pending' }],
  }

  it('reads the nested groups array the API returns', () => {
    expect(messageInCollection(apiShape, 1000000, 'Pending')).toBe(true)
    expect(messageInCollection(apiShape, 1000000, 'Approved')).toBe(false)
    expect(messageInCollection(apiShape, 999, 'Pending')).toBe(false)
  })

  it('accepts the group id as a string (runtime config values often are)', () => {
    expect(messageInCollection(apiShape, '1000000', 'Pending')).toBe(true)
  })

  it('still understands a flattened top-level groupid/collection', () => {
    const flat = { id: 2, groupid: 1000000, collection: 'Approved' }
    expect(messageInCollection(flat, 1000000, 'Approved')).toBe(true)
    expect(messageInCollection(flat, 1000000, 'Pending')).toBe(false)
  })

  it('copes with missing data', () => {
    expect(messageInCollection(null, 1000000, 'Pending')).toBe(false)
    expect(messageInCollection({}, 1000000, 'Pending')).toBe(false)
    expect(messageInCollection({ groups: [null] }, 1000000, 'Pending')).toBe(
      false
    )
  })
})

describe('messageHasAgreement', () => {
  it('is true for a listing with promises or the promised flag', () => {
    expect(messageHasAgreement({ promises: [{ userid: 2 }] })).toBe(true)
    expect(messageHasAgreement({ promised: true })).toBe(true)
  })

  it('is false otherwise', () => {
    expect(messageHasAgreement({ promises: [] })).toBe(false)
    expect(messageHasAgreement({})).toBe(false)
    expect(messageHasAgreement(null)).toBe(false)
  })
})
