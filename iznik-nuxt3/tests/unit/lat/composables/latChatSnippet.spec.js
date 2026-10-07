import { describe, it, expect } from 'vitest'
import { latChatSnippet, LAT_SNIPPETS } from '~/lat/composables/latChatSnippet'

describe('latChatSnippet', () => {
  it("turns the API's item-giving system snippets into garden-sharing words", () => {
    expect(latChatSnippet('Item promised')).toBe('Agreement sent')
    expect(latChatSnippet('Promise cancelled')).toBe('Agreement withdrawn')
    expect(latChatSnippet('Item is no longer available')).toBe(
      'Garden no longer available'
    )
    expect(latChatSnippet('No longer looking for this')).toBe(
      'No longer looking'
    )
  })

  it('leaves what members actually wrote alone', () => {
    expect(latChatSnippet('Hi Sam, that sounds great.')).toBe(
      'Hi Sam, that sounds great.'
    )
    expect(latChatSnippet('item promised')).toBe('item promised') // exact match only
    expect(latChatSnippet('')).toBe('')
  })

  it('passes through non-strings (the store sends null before a chat loads)', () => {
    expect(latChatSnippet(null)).toBe(null)
    expect(latChatSnippet(undefined)).toBe(undefined)
  })

  it('never maps to a Freegle word', () => {
    for (const v of Object.values(LAT_SNIPPETS)) {
      expect(v).not.toMatch(/item|freegle/i)
    }
  })
})
