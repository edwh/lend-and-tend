/**
 * Whether a listing form may be submitted yet.
 *
 * PhotoUploader marks each photo `uploading: true` until the file has reached
 * lat-tusd and been registered with the API (which is when it gets an `id`).
 * Posting before that silently drops the photo, because only photos with an
 * id are sent with the listing. So the Post / Save button waits for uploads.
 */
export function uploadsInProgress(attachments) {
  return (Array.isArray(attachments) ? attachments : []).some(
    (a) => a && a.uploading
  )
}

/**
 * Returns { disabled, label } for the submit button.
 * `idleLabel` is what the button says when it can be pressed.
 */
export function listingSubmitState({
  submitting = false,
  hasLocation = true,
  attachments = [],
  idleLabel = 'Post my garden',
  busyLabel = 'Posting…',
} = {}) {
  if (submitting) return { disabled: true, label: busyLabel }
  if (uploadsInProgress(attachments)) {
    return { disabled: true, label: 'Uploading photo…' }
  }
  return { disabled: !hasLocation, label: idleLabel }
}
