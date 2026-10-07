/**
 * Validation and rendering for the public contact form (/api/contact).
 *
 * Everything here is visitor-supplied and ends up in an email to the team, so
 * the two things that must never happen are header injection (a line break in
 * a field that reaches a mail header) and HTML injection (markup in the
 * message rendered as markup in the team's mail client). Pure functions, no
 * Nuxt or nodemailer imports, so they are unit-tested directly.
 */

export const CONTACT_LIMITS = {
  name: 120,
  email: 254,
  topic: 120,
  message: 5000,
} as const

export interface ContactInput {
  name: string
  email: string
  topic: string
  message: string
}

export type ContactValidation =
  | { ok: true; value: ContactInput }
  | { ok: false; error: string }

// Deliberately strict rather than RFC-complete: one local part, one domain
// with a dot, and none of the characters that would let a value smuggle a
// second address or a display name into the header.
const EMAIL_RE = /^[^\s@<>,;"']+@[^\s@<>,;"']+\.[^\s@<>,;"'.]{2,}$/

const DEFAULT_TOPIC = 'General enquiry'

function asTrimmedString(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

function hasLineBreak(value: string): boolean {
  return /[\r\n]/.test(value)
}

export function validateContactBody(body: unknown): ContactValidation {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Invalid request' }
  }
  const b = body as Record<string, unknown>
  const name = asTrimmedString(b.name)
  const email = asTrimmedString(b.email)
  const topic = asTrimmedString(b.topic)
  const message = asTrimmedString(b.message)

  if (!name || !email || !message) {
    return { ok: false, error: 'name, email and message are required' }
  }

  // These three reach mail headers (Reply-To, Subject). A line break there is
  // a header-injection attempt, never legitimate input.
  for (const [label, value] of [
    ['name', name],
    ['email', email],
    ['topic', topic],
  ] as const) {
    if (hasLineBreak(value)) {
      return { ok: false, error: `${label} contains invalid characters` }
    }
  }

  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'email is not a valid address' }
  }

  for (const [label, value, limit] of [
    ['name', name, CONTACT_LIMITS.name],
    ['email', email, CONTACT_LIMITS.email],
    ['topic', topic, CONTACT_LIMITS.topic],
    ['message', message, CONTACT_LIMITS.message],
  ] as const) {
    if (value.length > limit) {
      return { ok: false, error: `${label} is too long (max ${limit} characters)` }
    }
  }

  return { ok: true, value: { name, email, topic, message } }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface ContactMailOptions {
  /** Envelope sender address (our own no-reply). */
  from: string
  /** Where the team reads contact mail. */
  to: string
  siteName: string
}

export interface ContactMail {
  from: { name: string; address: string }
  to: string
  replyTo: { name: string; address: string }
  subject: string
  text: string
  html: string
}

export function buildContactMail(value: ContactInput, opts: ContactMailOptions): ContactMail {
  const topic = value.topic || DEFAULT_TOPIC
  return {
    from: { name: opts.siteName, address: opts.from },
    to: opts.to,
    // A structured address: nodemailer encodes the display name itself, so the
    // visitor's name can never be interpreted as header syntax.
    replyTo: { name: value.name, address: value.email },
    subject: `[Contact] ${topic} — from ${value.name}`,
    text: `Name: ${value.name}\nEmail: ${value.email}\nTopic: ${topic}\n\n${value.message}`,
    html:
      `<p><strong>From:</strong> ${escapeHtml(value.name)} &lt;${escapeHtml(value.email)}&gt;</p>` +
      `<p><strong>Topic:</strong> ${escapeHtml(topic)}</p>` +
      `<hr>` +
      `<p>${escapeHtml(value.message).replace(/\n/g, '<br>')}</p>`,
  }
}
