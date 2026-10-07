import { describe, it, expect, vi } from 'vitest'
import {
  membershipRows,
  normaliseMembership,
  memberDetailPath,
  paymentStatusOf,
  paymentLabel,
  searchResultIds,
  resolveUsers,
} from '~/lat/composables/latAdminMembers'

// Shapes come from the real API (checked against the local stack):
//   GET /memberships?groupid= -> { context, members: [{ id (MEMBERSHIP id),
//     userid, added, displayname, fullname, role, ourpostingstatus, ... }] }
//   GET /user/search?q=x       -> { users: [73, 71, ...] }  (ids only)
//   GET /user/:id?modtools=true -> { id, displayname, email, settings, ... }

const row = {
  id: 29,
  userid: 73,
  groupid: 1000000,
  role: 'Member',
  collection: 'Approved',
  added: '2026-10-07T11:41:28Z',
  fullname: 'Priya Shah',
  displayname: 'Priya Shah',
  ourpostingstatus: 'UNMODERATED',
}

describe('membershipRows', () => {
  it('reads the members array the API wraps, or a bare array', () => {
    expect(membershipRows({ context: 27, members: [row] })).toEqual([row])
    expect(membershipRows([row])).toEqual([row])
    expect(membershipRows(null)).toEqual([])
    expect(membershipRows({})).toEqual([])
  })
})

describe('normaliseMembership', () => {
  it('keys the member by USER id, not the membership id', () => {
    const m = normaliseMembership(row)
    expect(m.userid).toBe(73)
    expect(m.membershipId).toBe(29)
  })

  it('takes the joined date from `added` and the name from displayname/fullname', () => {
    expect(normaliseMembership(row).joined).toBe('2026-10-07T11:41:28Z')
    expect(normaliseMembership(row).name).toBe('Priya Shah')
    expect(
      normaliseMembership({ ...row, displayname: null, fullname: 'Full Name' })
        .name
    ).toBe('Full Name')
    expect(
      normaliseMembership({ ...row, displayname: null, fullname: null }).name
    ).toBe('—')
  })

  it('carries email only when present (the member list never has it)', () => {
    expect(normaliseMembership(row).email).toBe('')
    expect(normaliseMembership({ ...row, email: 'a@b.c' }).email).toBe('a@b.c')
  })

  it('still copes with a row that only has a user id', () => {
    const m = normaliseMembership({ id: 5, displayname: 'X' })
    expect(m.userid).toBe(5)
    expect(m.membershipId).toBe(null)
  })
})

describe('memberDetailPath', () => {
  it('points at the existing admin user detail page', () => {
    expect(memberDetailPath(73)).toBe('/admin/users/73')
  })
})

describe('payment helpers', () => {
  it('reads lat_payment status and labels it', () => {
    expect(
      paymentStatusOf({ settings: { lat_payment: { status: 'paid' } } })
    ).toBe('paid')
    expect(paymentStatusOf({ settings: null })).toBe(null)
    expect(paymentStatusOf(null)).toBe(null)
    expect(paymentLabel('paid')).toBe('Paid')
    expect(paymentLabel('concession')).toBe('Concession')
    expect(paymentLabel(null)).toBe('Not joined')
  })
})

describe('searchResultIds', () => {
  it('accepts the ids-only shape the API returns, and objects', () => {
    expect(searchResultIds({ users: [73, 71] })).toEqual([73, 71])
    expect(searchResultIds([{ id: 9 }, { id: 8 }])).toEqual([9, 8])
    expect(searchResultIds(null)).toEqual([])
  })
})

describe('resolveUsers', () => {
  it('fetches each user with modtools in small batches, dropping failures', async () => {
    const calls = []
    const fetcher = vi.fn((id) => {
      calls.push(id)
      if (id === 2) return Promise.reject(new Error('404'))
      return Promise.resolve({ id, displayname: `U${id}` })
    })
    const users = await resolveUsers([1, 2, 3], fetcher, { batch: 2 })
    expect(users.map((u) => u.id)).toEqual([1, 3])
    expect(calls).toEqual([1, 2, 3])
  })

  it('caps how many it resolves', async () => {
    const fetcher = vi.fn((id) => Promise.resolve({ id }))
    const users = await resolveUsers([1, 2, 3, 4], fetcher, { max: 2 })
    expect(users.map((u) => u.id)).toEqual([1, 2])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
