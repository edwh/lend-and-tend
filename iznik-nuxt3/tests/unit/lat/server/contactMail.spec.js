import { describe, it, expect } from 'vitest'
import {
  validateContactBody,
  buildContactMail,
  CONTACT_LIMITS,
} from '~/lat/server/utils/contactMail'

// The contact form is public and unauthenticated. Anything a visitor types ends
// up in an email to the team, so: no header injection through name/email/topic,
// no HTML injection through the message, and bounded sizes.

const good = {
  name: 'Ada Lovelace',
  email: 'ada@example.org',
  topic: 'Gardens',
  message: 'Hello,\nI have a garden to share.',
}

describe('validateContactBody', () => {
  it('accepts a normal submission and trims whitespace', () => {
    const r = validateContactBody({
      ...good,
      name: '  Ada Lovelace  ',
      message: ' hi \n',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.name).toBe('Ada Lovelace')
      expect(r.value.message).toBe('hi')
      expect(r.value.topic).toBe('Gardens')
    }
  })

  it('requires name, email and message', () => {
    for (const missing of ['name', 'email', 'message']) {
      const r = validateContactBody({ ...good, [missing]: '   ' })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/required/i)
    }
  })

  it('tolerates a missing topic', () => {
    const { topic, ...rest } = good
    const r = validateContactBody(rest)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.topic).toBe('')
  })

  it('rejects non-object bodies', () => {
    expect(validateContactBody(null).ok).toBe(false)
    expect(validateContactBody('x').ok).toBe(false)
    expect(validateContactBody([]).ok).toBe(false)
  })

  it('rejects line breaks in the fields that reach mail headers (name, email, topic)', () => {
    for (const field of ['name', 'email', 'topic']) {
      for (const bad of ['a\r\nBcc: victim@example.org', 'a\nb', 'a\rb']) {
        const r = validateContactBody({ ...good, [field]: bad })
        expect(r.ok, `${field} with ${JSON.stringify(bad)}`).toBe(false)
      }
    }
    // The message body may legitimately contain newlines.
    expect(
      validateContactBody({ ...good, message: 'line one\nline two' }).ok
    ).toBe(true)
  })

  it('rejects an email address that is not an address', () => {
    for (const bad of [
      'not-an-email',
      'a@b',
      'a b@c.com',
      '<x@y.com>',
      'x@y.com, z@w.com',
    ]) {
      expect(validateContactBody({ ...good, email: bad }).ok, bad).toBe(false)
    }
    expect(
      validateContactBody({
        ...good,
        email: 'first.last+tag@sub.example.co.uk',
      }).ok
    ).toBe(true)
  })

  it('enforces maximum lengths', () => {
    expect(
      validateContactBody({
        ...good,
        name: 'x'.repeat(CONTACT_LIMITS.name + 1),
      }).ok
    ).toBe(false)
    expect(
      validateContactBody({
        ...good,
        topic: 'x'.repeat(CONTACT_LIMITS.topic + 1),
      }).ok
    ).toBe(false)
    expect(
      validateContactBody({
        ...good,
        message: 'x'.repeat(CONTACT_LIMITS.message + 1),
      }).ok
    ).toBe(false)
    expect(
      validateContactBody({
        ...good,
        message: 'x'.repeat(CONTACT_LIMITS.message),
      }).ok
    ).toBe(true)
  })

  it('coerces non-string fields to strings safely', () => {
    const r = validateContactBody({ ...good, name: 12345, topic: null })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.name).toBe('12345')
      expect(r.value.topic).toBe('')
    }
  })
})

describe('buildContactMail', () => {
  const opts = {
    from: 'noreply@lendandtend.com',
    to: 'hello@lendandtend.com',
    siteName: 'Lend & Tend',
  }

  it('escapes HTML in every visitor-supplied field in the HTML part', () => {
    const r = validateContactBody({
      name: 'Eve <b>bold</b>',
      email: 'eve@example.org',
      topic: '<img src=x onerror=alert(1)>',
      message: '<script>alert(1)</script> & "quotes"',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const mail = buildContactMail(r.value, opts)
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).not.toContain('<img')
    expect(mail.html).not.toContain('<b>')
    expect(mail.html).toContain(
      '&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;'
    )
    expect(mail.html).toContain('Eve &lt;b&gt;bold&lt;/b&gt;')
  })

  it('renders message newlines as <br> in the HTML part and keeps them in the text part', () => {
    const r = validateContactBody({ ...good, message: 'one\ntwo' })
    if (!r.ok) throw new Error(r.error)
    const mail = buildContactMail(r.value, opts)
    expect(mail.html).toContain('one<br>two')
    expect(mail.text).toContain('one\ntwo')
  })

  it('sets reply-to as a structured address, never an interpolated header string', () => {
    const r = validateContactBody(good)
    if (!r.ok) throw new Error(r.error)
    const mail = buildContactMail(r.value, opts)
    expect(mail.replyTo).toEqual({
      name: 'Ada Lovelace',
      address: 'ada@example.org',
    })
    expect(mail.from).toEqual({
      name: 'Lend & Tend',
      address: 'noreply@lendandtend.com',
    })
    expect(mail.to).toBe('hello@lendandtend.com')
  })

  it('builds the subject from topic and name, defaulting the topic', () => {
    const withTopic = validateContactBody(good)
    const noTopic = validateContactBody({ ...good, topic: '' })
    if (!withTopic.ok || !noTopic.ok) throw new Error('fixture')
    expect(buildContactMail(withTopic.value, opts).subject).toBe(
      '[Contact] Gardens — from Ada Lovelace'
    )
    expect(buildContactMail(noTopic.value, opts).subject).toBe(
      '[Contact] General enquiry — from Ada Lovelace'
    )
  })

  it('includes the sender details in both parts so the team can reply', () => {
    const r = validateContactBody(good)
    if (!r.ok) throw new Error(r.error)
    const mail = buildContactMail(r.value, opts)
    expect(mail.text).toContain('Name: Ada Lovelace')
    expect(mail.text).toContain('Email: ada@example.org')
    expect(mail.html).toContain('ada@example.org')
  })
})
