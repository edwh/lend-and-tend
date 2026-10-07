import { describe, it, expect, vi } from 'vitest'
import {
  pickAgreementListing,
  findAgreementListing,
  AGREEMENT_LISTING_NOT_FOUND,
} from '~/lat/composables/latAgreementListing'
import { messageInGroup } from '~/lat/composables/latAdminListings'

const WORLD = 1000000

describe('messageInGroup', () => {
  it('matches the nested groups array the API returns, or a flat groupid', () => {
    expect(messageInGroup({ groups: [{ groupid: WORLD }] }, WORLD)).toBe(true)
    expect(messageInGroup({ groupid: '1000000' }, WORLD)).toBe(true)
    expect(messageInGroup({ groups: [{ groupid: 5 }] }, WORLD)).toBe(false)
    expect(messageInGroup(null, WORLD)).toBe(false)
  })
})

describe('pickAgreementListing', () => {
  it('returns the id of the first garden offer in the world group', () => {
    const msgs = [
      { id: 1, type: 'Wanted', groups: [{ groupid: WORLD }] },
      { id: 2, type: 'Offer', groups: [{ groupid: 42 }] },
      { id: 3, type: 'Offer', groups: [{ groupid: WORLD }] },
      { id: 4, type: 'Offer', groups: [{ groupid: WORLD }] },
    ]
    expect(pickAgreementListing(msgs, WORLD)).toBe(3)
  })

  it('is null when the list is empty or has no offer (listing not indexed yet)', () => {
    expect(pickAgreementListing([], WORLD)).toBe(null)
    expect(pickAgreementListing(undefined, WORLD)).toBe(null)
    expect(
      pickAgreementListing([{ id: 1, type: 'Wanted', groupid: WORLD }], WORLD)
    ).toBe(null)
  })
})

describe('findAgreementListing', () => {
  it('checks each participant in turn and reports whose listing it found', async () => {
    const fetcher = vi.fn(async (url) =>
      url.endsWith('/user/9/message')
        ? []
        : [{ id: 77, type: 'Offer', groups: [{ groupid: WORLD }] }]
    )
    const found = await findAgreementListing({
      apiBase: 'http://api',
      groupid: WORLD,
      userIds: [9, 5],
      fetcher,
    })
    expect(found).toEqual({ id: 77, userId: 5 })
    expect(fetcher.mock.calls.map((c) => c[0])).toEqual([
      'http://api/user/9/message',
      'http://api/user/5/message',
    ])
  })

  it('returns null, not an exception, when nobody has an indexed listing', async () => {
    const fetcher = vi.fn(async () => [])
    expect(
      await findAgreementListing({
        apiBase: 'http://api',
        groupid: WORLD,
        userIds: [1, 2],
        fetcher,
      })
    ).toBe(null)
  })

  it('skips a participant whose lookup fails and keeps going', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('401'))
      .mockResolvedValueOnce([{ id: 8, type: 'Offer', groupid: WORLD }])
    expect(
      await findAgreementListing({
        apiBase: 'http://api',
        groupid: WORLD,
        userIds: [1, null, 2],
        fetcher,
      })
    ).toEqual({ id: 8, userId: 2 })
  })

  it('has a plain-English message for the not-found case', () => {
    expect(AGREEMENT_LISTING_NOT_FOUND).toMatch(/few minutes/)
  })
})
