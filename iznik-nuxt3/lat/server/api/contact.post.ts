import nodemailer from 'nodemailer'
import { validateContactBody, buildContactMail } from '../utils/contactMail'

// Public, unauthenticated. All validation and rendering lives in
// ../utils/contactMail (unit-tested): no line breaks in header-bound fields,
// HTML escaped, sizes bounded. This file only wires it to SMTP.
export default defineEventHandler(async (event) => {
  const result = validateContactBody(await readBody(event))
  if (!result.ok) {
    throw createError({ statusCode: 400, statusMessage: result.error })
  }

  const smtpHost = process.env.SMTP_HOST || '127.0.0.1'
  const smtpPort = parseInt(process.env.SMTP_PORT || '1025')
  const smtpUser = process.env.SMTP_USERNAME || ''
  const smtpPass = process.env.SMTP_PASSWORD || ''
  const contactEmail = process.env.CONTACT_EMAIL || 'hello@lendandtend.com'
  const fromEmail = process.env.CONTACT_FROM_EMAIL || 'noreply@lendandtend.com'

  // Dev sends to Mailpit (1025, plaintext, no auth); prod sends via Mailgun
  // SMTP, which REQUIRES auth + TLS. Force STARTTLS whenever credentials are
  // present (Mailgun on 587); port 465 is implicit TLS. Without creds we keep
  // the plaintext path so the local Mailpit catcher still works.
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    ...(smtpUser
      ? { requireTLS: true, auth: { user: smtpUser, pass: smtpPass } }
      : { ignoreTLS: true }),
  })

  await transporter.sendMail(
    buildContactMail(result.value, {
      from: fromEmail,
      to: contactEmail,
      siteName: 'Lend & Tend',
    })
  )

  return { ok: true }
})
