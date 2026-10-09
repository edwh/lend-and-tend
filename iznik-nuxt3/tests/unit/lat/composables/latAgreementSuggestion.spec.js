import { describe, it, expect } from 'vitest'
import {
  suggestedChanges,
  suggestionMessage,
} from '~/lat/composables/latAgreementSuggestion'

// The tender's "Suggest changes" used to PATCH the lender's listing, which
// the API refuses (403, only the owner may edit), so the suggestion now goes
// to the lender as a chat message built from the changed terms.

const proposed = {
  whatToGrow: 'Tomatoes only',
  accessTimes: 'Mondays',
  endDate: '2027-02-07',
  groundRules: { pets: 'no', water: 'yes', produce: '' },
  otherTerms: '',
}

describe('suggestedChanges', () => {
  it('lists only the terms the tender changed, with before and after', () => {
    const changes = suggestedChanges(proposed, {
      ...proposed,
      whatToGrow: 'Tomatoes and herbs',
      accessTimes: 'Mondays and Thursdays',
      groundRules: { ...proposed.groundRules, produce: 'yes' },
    })
    expect(changes).toEqual([
      {
        label: 'What will be grown',
        from: 'Tomatoes only',
        to: 'Tomatoes and herbs',
      },
      { label: 'Access times', from: 'Mondays', to: 'Mondays and Thursdays' },
      {
        label: 'Some produce shared with the lender',
        from: '(blank)',
        to: 'yes',
      },
    ])
  })

  it('is empty when nothing differs (whitespace and null are not changes)', () => {
    expect(
      suggestedChanges(proposed, { ...proposed, otherTerms: null })
    ).toEqual([])
    expect(
      suggestedChanges(proposed, { ...proposed, accessTimes: ' Mondays ' })
    ).toEqual([])
  })
})

describe('suggestionMessage', () => {
  it('words the changes for the lender and asks them to update the terms', () => {
    const msg = suggestionMessage(proposed, {
      ...proposed,
      endDate: '2027-04-01',
    })
    expect(msg).toContain("I'd like to suggest some changes")
    expect(msg).toContain('• Review date: 2027-04-01 (was: 2027-02-07)')
    expect(msg).toContain('please update the terms')
  })

  it('is null when there is nothing to suggest', () => {
    expect(suggestionMessage(proposed, { ...proposed })).toBe(null)
  })
})
