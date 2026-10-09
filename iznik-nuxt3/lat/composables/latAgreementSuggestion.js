/**
 * Words a tender's suggested changes to an agreement as a chat message.
 *
 * A tender cannot edit the lender's listing (the API refuses non-owner edits
 * with 403), so suggestions travel to the lender in chat, who can then use
 * "Update terms". Only fields that differ from the proposed terms are listed.
 */
const FIELD_LABELS = {
  whatToGrow: 'What will be grown',
  accessTimes: 'Access times',
  endDate: 'Review date',
  otherTerms: 'Other terms',
}

const GROUND_RULE_LABELS = {
  pets: 'Pets allowed in the garden',
  water: 'Tender may use the water supply',
  produce: 'Some produce shared with the lender',
}

function show(value) {
  const v = value == null ? '' : String(value).trim()
  return v === '' ? '(blank)' : v
}

/** List of { label, from, to } for every term the tender changed. */
export function suggestedChanges(original, current) {
  const o = original || {}
  const c = current || {}
  const out = []
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    if (show(o[key]) !== show(c[key])) {
      out.push({ label, from: show(o[key]), to: show(c[key]) })
    }
  }
  const og = o.groundRules || {}
  const cg = c.groundRules || {}
  for (const key of new Set([...Object.keys(og), ...Object.keys(cg)])) {
    if (show(og[key]) !== show(cg[key])) {
      out.push({
        label: GROUND_RULE_LABELS[key] || key,
        from: show(og[key]),
        to: show(cg[key]),
      })
    }
  }
  return out
}

/** The chat message the lender receives, or null when nothing changed. */
export function suggestionMessage(original, current) {
  const changes = suggestedChanges(original, current)
  if (!changes.length) return null
  const lines = changes.map((ch) => `• ${ch.label}: ${ch.to} (was: ${ch.from})`)
  return [
    "I'd like to suggest some changes to the agreement terms:",
    ...lines,
    'If that works for you, please update the terms and I will accept.',
  ].join('\n')
}
