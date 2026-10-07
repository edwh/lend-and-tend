import { describe, it, expect } from 'vitest'
import {
  PRIVATE_LISTING_FIELDS,
  splitListingBody,
  privateDetailsFor,
  withPrivateDetails,
} from '~/lat/composables/useLatPrivateGarden'

// A listing's textbody is public API data (anyone can GET /message/:id), so
// the member's street address, postcode and PAF id must never be in it. They
// live in the member's own settings.lat_gardens[msgid], which the API only
// returns to that member. These helpers are the split and the merge.

describe('splitListingBody', () => {
  it('separates the private fields from the public ones', () => {
    const { publicBody, privateDetails } = splitListingBody({
      description: 'Sunny patch',
      gardenSize: 'medium',
      address: '1 Secret Street, Sheffield',
      postcode: 'S1 2BS',
      pafid: 12345,
      phone: '07700 900123',
    })
    expect(publicBody).toEqual({
      description: 'Sunny patch',
      gardenSize: 'medium',
    })
    expect(privateDetails).toEqual({
      address: '1 Secret Street, Sheffield',
      postcode: 'S1 2BS',
      pafid: 12345,
      phone: '07700 900123',
    })
  })

  it('returns null private details when there is nothing private', () => {
    const { publicBody, privateDetails } = splitListingBody({
      description: 'x',
    })
    expect(publicBody).toEqual({ description: 'x' })
    expect(privateDetails).toBeNull()
  })

  it('drops empty private values rather than storing blanks', () => {
    const { privateDetails } = splitListingBody({
      description: 'x',
      address: '',
      postcode: 'S1 2BS',
      pafid: null,
    })
    expect(privateDetails).toEqual({ postcode: 'S1 2BS' })
  })

  it('does not mutate its input', () => {
    const input = { description: 'x', address: 'a' }
    splitListingBody(input)
    expect(input).toEqual({ description: 'x', address: 'a' })
  })

  it('names exactly the fields that are private', () => {
    expect(PRIVATE_LISTING_FIELDS).toEqual([
      'address',
      'postcode',
      'pafid',
      'phone',
    ])
  })
})

describe('privateDetailsFor', () => {
  it("reads a listing's private details out of the member's settings", () => {
    const settings = {
      lat_gardens: { 17: { address: '1 Secret Street', postcode: 'S1 2BS' } },
    }
    expect(privateDetailsFor(settings, 17)).toEqual({
      address: '1 Secret Street',
      postcode: 'S1 2BS',
    })
    expect(privateDetailsFor(settings, '17')).toEqual({
      address: '1 Secret Street',
      postcode: 'S1 2BS',
    })
  })

  it('accepts settings as the JSON string the API sometimes returns', () => {
    const settings = JSON.stringify({ lat_gardens: { 17: { address: 'a' } } })
    expect(privateDetailsFor(settings, 17)).toEqual({ address: 'a' })
  })

  it('returns null when there is nothing stored', () => {
    expect(privateDetailsFor({}, 17)).toBeNull()
    expect(privateDetailsFor(null, 17)).toBeNull()
    expect(privateDetailsFor(undefined, 17)).toBeNull()
    expect(
      privateDetailsFor({ lat_gardens: { 18: { address: 'a' } } }, 17)
    ).toBeNull()
    expect(privateDetailsFor('not json', 17)).toBeNull()
  })
})

describe('withPrivateDetails', () => {
  it("adds a listing's details without disturbing other settings or other listings", () => {
    const settings = {
      mylocation: { id: 1 },
      lat_payment: { status: 'paid' },
      lat_gardens: { 5: { address: 'other' } },
    }
    const next = withPrivateDetails(settings, 17, {
      address: '1 Secret Street',
      postcode: 'S1 2BS',
    })
    expect(next).toEqual({
      mylocation: { id: 1 },
      lat_payment: { status: 'paid' },
      lat_gardens: {
        5: { address: 'other' },
        17: { address: '1 Secret Street', postcode: 'S1 2BS' },
      },
    })
    expect(settings.lat_gardens).toEqual({ 5: { address: 'other' } })
  })

  it('starts from empty settings', () => {
    expect(withPrivateDetails(null, 17, { address: 'a' })).toEqual({
      lat_gardens: { 17: { address: 'a' } },
    })
    expect(withPrivateDetails('{"x":1}', 17, { address: 'a' })).toEqual({
      x: 1,
      lat_gardens: { 17: { address: 'a' } },
    })
  })

  it('removes the entry when given null details', () => {
    const settings = {
      lat_gardens: { 5: { address: 'other' }, 17: { address: 'gone' } },
    }
    expect(withPrivateDetails(settings, 17, null)).toEqual({
      lat_gardens: { 5: { address: 'other' } },
    })
  })
})
