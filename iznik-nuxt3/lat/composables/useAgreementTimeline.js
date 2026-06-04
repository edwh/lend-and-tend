import { computed, unref } from 'vue'
import branding from '~/branding.config'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Derive check-in milestones for a confirmed garden-sharing agreement.
 *
 * The cadence comes from branding.content.checkinScheduleDays (days after the
 * agreement was confirmed) so the in-app prompts and any future emails stay in
 * lockstep with one source of truth.
 *
 * This is purely client-side: it reads when the agreement was confirmed and
 * when the current user last checked in (from their settings) to decide
 * whether a check-in is due. Actually *sending* reminder emails would belong in
 * the Laravel batch worker (out of scope here — see the design notes).
 *
 * @param {import('vue').Ref<string|null>|string|null} confirmedAt  ISO date the agreement was confirmed
 * @param {import('vue').Ref<string|null>|string|null} lastCheckinAt ISO date the user last checked in
 */
export function useAgreementTimeline(confirmedAt, lastCheckinAt) {
  const scheduleDays = branding.content?.checkinScheduleDays ?? []

  const startDate = computed(() => {
    const v = unref(confirmedAt)
    if (!v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  })

  const daysSinceStart = computed(() => {
    if (!startDate.value) return null
    return Math.floor((Date.now() - startDate.value.getTime()) / DAY_MS)
  })

  /* Each scheduled check-in with its due date and whether it's been reached. */
  const milestones = computed(() => {
    if (!startDate.value) return []
    return scheduleDays.map((day) => {
      const dueDate = new Date(startDate.value.getTime() + day * DAY_MS)
      return { day, dueDate, reached: Date.now() >= dueDate.getTime() }
    })
  })

  /* The most recent milestone that's due but not yet covered by a check-in. */
  const checkinDue = computed(() => {
    if (daysSinceStart.value === null) return null
    const reached = milestones.value.filter((m) => m.reached)
    if (!reached.length) return null
    const latest = reached[reached.length - 1]
    const last = unref(lastCheckinAt)
    const lastMs = last ? new Date(last).getTime() : 0
    return lastMs >= latest.dueDate.getTime() ? null : latest
  })

  return { startDate, daysSinceStart, milestones, checkinDue }
}
