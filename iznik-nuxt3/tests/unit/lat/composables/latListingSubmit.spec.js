import { describe, it, expect } from 'vitest'
import {
  uploadsInProgress,
  listingSubmitState,
} from '~/lat/composables/latListingSubmit'

// Found by the walkthrough golden test: posting while a photo was still
// uploading produced a listing with no photo, because only registered photos
// (those with an id) are sent. The button must wait for uploads to finish.

describe('uploadsInProgress', () => {
  it('is true while any photo is still uploading', () => {
    expect(uploadsInProgress([{ id: 1 }, { uploading: true }])).toBe(true)
  })

  it('is true after the file has uploaded but before the API has registered it', () => {
    // PhotoUploader clears `uploading` when tus finishes, then registers the
    // photo (POST /image) and only then sets `id`. Posting in that window
    // drops the photo, because only photos with an id are sent.
    expect(uploadsInProgress([{ uploading: false }])).toBe(true)
    expect(uploadsInProgress([{ id: 1 }, {}])).toBe(true)
  })

  it('is false for a photo whose upload failed (it will not be sent anyway)', () => {
    expect(uploadsInProgress([{ uploading: false, error: true }])).toBe(false)
  })

  it('is false once every photo is registered, or with no photos', () => {
    expect(uploadsInProgress([{ id: 1, uploading: false }, { id: 2 }])).toBe(
      false
    )
    expect(uploadsInProgress([])).toBe(false)
    expect(uploadsInProgress(undefined)).toBe(false)
    expect(uploadsInProgress([null])).toBe(false)
  })
})

describe('listingSubmitState', () => {
  it('disables the button and says so while a photo uploads', () => {
    expect(listingSubmitState({ attachments: [{ uploading: true }] })).toEqual({
      disabled: true,
      label: 'Uploading photo…',
    })
  })

  it('shows the busy label while submitting, whatever else is going on', () => {
    expect(
      listingSubmitState({
        submitting: true,
        attachments: [{ uploading: true }],
        busyLabel: 'Saving…',
      })
    ).toEqual({ disabled: true, label: 'Saving…' })
  })

  it('still needs a location, and otherwise is ready', () => {
    expect(listingSubmitState({ hasLocation: false })).toEqual({
      disabled: true,
      label: 'Post my garden',
    })
    expect(
      listingSubmitState({
        attachments: [{ id: 9, uploading: false }],
        idleLabel: 'Save changes',
      })
    ).toEqual({ disabled: false, label: 'Save changes' })
  })
})
