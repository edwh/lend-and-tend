/**
 * Whether a listing form may be submitted yet.
 *
 * PhotoUploader marks each photo `uploading: true` while the file travels to
 * lat-tusd, clears it when tus finishes, then registers the photo with the API
 * (POST /image) and sets its `id`; a failure sets `error`.
 * Posting before that silently drops the photo, because only photos with an
 * id are sent with the listing. So the Post / Save button waits for uploads.
 */
export function uploadsInProgress(attachments) {
  return (Array.isArray(attachments) ? attachments : []).some(
    // Still uploading, or uploaded but not yet registered with the API (no id
    // yet). A failed upload (error) is not in progress: it will not be sent.
    (a) => a && (a.uploading || (!a.id && !a.error))
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
