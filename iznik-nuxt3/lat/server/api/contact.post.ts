import nodemailer from 'nodemailer'

interface ContactBody {
  name: string
  email: string
  topic: string
  message: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ContactBody>(event)

  if (!body.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'name, email and message are required' })
  }

  const smtpHost = process.env.SMTP_HOST || '127.0.0.1'
  const smtpPort = parseInt(process.env.SMTP_PORT || '1025')
  const contactEmail = process.env.CONTACT_EMAIL || 'hello@lendandtend.com'

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    ignoreTLS: true,
  })

  await transporter.sendMail({
    from: `"Lend & Tend" <noreply@lendandtend.com>`,
    to: contactEmail,
    replyTo: `"${body.name}" <${body.email}>`,
    subject: `[Contact] ${body.topic || 'General enquiry'} — from ${body.name}`,
    text: `Name: ${body.name}\nEmail: ${body.email}\nTopic: ${body.topic}\n\n${body.message}`,
    html: `<p><strong>From:</strong> ${body.name} &lt;${body.email}&gt;</p>
<p><strong>Topic:</strong> ${body.topic || 'General'}</p>
<hr>
<p>${body.message.replace(/\n/g, '<br>')}</p>`,
  })

  return { ok: true }
})
