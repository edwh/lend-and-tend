import { describe, it, expect } from 'vitest'
import {
  parsedBody,
  hasLenderDetails,
  hasTenderDetails,
  gardenSizeLabel,
  sunLabel,
  accessLabel,
  toolsLabel,
  availabilityLabel,
  hasAgreement,
  hasActiveAgreement,
  gardenStatus,
  gardenStatusClass,
  agreementLink,
  formatDate,
} from '~/lat/composables/useGardenStatus.js'

describe('parsedBody', () => {
  it('parses a JSON string into an object', () => {
    expect(parsedBody({ textbody: '{"postcode":"SW1A 1AA"}' })).toEqual({
      postcode: 'SW1A 1AA',
    })
  })
  it('returns {} for an empty / missing textbody', () => {
    expect(parsedBody({})).toEqual({})
    expect(parsedBody({ textbody: '' })).toEqual({})
    expect(parsedBody(null)).toEqual({})
  })
  it('returns { description } when textbody is plain text', () => {
    expect(parsedBody({ textbody: 'just prose' })).toEqual({ description: 'just prose' })
  })
})

describe('hasLenderDetails', () => {
  it('detects any of the four lender-specific fields', () => {
    expect(
      hasLenderDetails({ textbody: '{"gardenSize":"small"}' })
    ).toBe(true)
    expect(
      hasLenderDetails({ textbody: '{"sunExposure":"full"}' })
    ).toBe(true)
    expect(
      hasLenderDetails({ textbody: '{"waterAccess":"yes"}' })
    ).toBe(true)
    expect(
      hasLenderDetails({ textbody: '{"accessRoute":"gate"}' })
    ).toBe(true)
  })
  it('returns false when no lender fields present', () => {
    expect(hasLenderDetails({ textbody: '{"tools":"basic"}' })).toBe(false)
    expect(hasLenderDetails({ textbody: '' })).toBe(false)
  })
})

describe('hasTenderDetails', () => {
  it('detects any of the three tender-specific fields', () => {
    expect(hasTenderDetails({ textbody: '{"tools":"basic"}' })).toBe(true)
    expect(hasTenderDetails({ textbody: '{"availability":"weekends"}' })).toBe(true)
    expect(hasTenderDetails({ textbody: '{"honestyDeclaration":true}' })).toBe(true)
  })
  it('returns false when only lender fields present', () => {
    expect(hasTenderDetails({ textbody: '{"gardenSize":"small"}' })).toBe(false)
  })
})

describe('select-option labels', () => {
  it('gardenSizeLabel maps codes to human labels (falls back to input)', () => {
    expect(gardenSizeLabel('small')).toMatch(/up to 50 m²/)
    expect(gardenSizeLabel('medium')).toMatch(/50–200 m²/)
    expect(gardenSizeLabel('large')).toMatch(/200 m²\+/)
    expect(gardenSizeLabel('unknown-value')).toBe('unknown-value')
  })
  it('sunLabel', () => {
    expect(sunLabel('full')).toBe('Full sun')
    expect(sunLabel('partial')).toBe('Partial shade')
    expect(sunLabel('shade')).toBe('Mostly shade')
  })
  it('accessLabel', () => {
    expect(accessLabel('gate')).toMatch(/back gate/)
    expect(accessLabel('through_house')).toBe('Through the house')
    expect(accessLabel('other')).toBe('Other')
  })
  it('toolsLabel', () => {
    expect(toolsLabel('basic')).toBe('Basic hand tools')
    expect(toolsLabel('full')).toBe('Full set of garden tools')
    expect(toolsLabel('none')).toMatch(/access to lender's tools/)
  })
  it('availabilityLabel', () => {
    expect(availabilityLabel('weekends')).toBe('Weekends')
    expect(availabilityLabel('flexible')).toBe('Flexible')
  })
})

describe('agreement helpers', () => {
  const noPromise = { id: 1, promises: [] }
  const pending = { id: 2, promises: [{ id: 7, userid: 99, acceptedat: null }] }
  const confirmed = {
    id: 3,
    promises: [{ id: 7, userid: 99, acceptedat: '2026-05-25T10:00:00Z' }],
  }

  it('hasAgreement is true when promises[] is non-empty', () => {
    expect(hasAgreement(noPromise)).toBe(false)
    expect(hasAgreement(pending)).toBe(true)
    expect(hasAgreement(confirmed)).toBe(true)
    expect(hasAgreement({})).toBe(false)
  })

  it('hasActiveAgreement is true only when promised but NOT yet accepted', () => {
    expect(hasActiveAgreement(noPromise)).toBe(false)
    expect(hasActiveAgreement(pending)).toBe(true)
    expect(hasActiveAgreement(confirmed)).toBe(false)
  })

  it('gardenStatus reflects the lifecycle', () => {
    expect(gardenStatus(noPromise)).toBe('Looking for a tender')
    expect(gardenStatus(pending)).toBe('Agreement proposed')
    expect(gardenStatus(confirmed)).toBe('Agreement confirmed')
  })

  it('gardenStatusClass maps to CSS classes', () => {
    expect(gardenStatusClass(noPromise)).toBe('status-available')
    expect(gardenStatusClass(pending)).toBe('status-proposed')
    expect(gardenStatusClass(confirmed)).toBe('status-confirmed')
  })

  it('agreementLink builds the deep link with the tender userid', () => {
    expect(agreementLink(noPromise)).toBe('')
    expect(agreementLink(pending)).toBe('/agreement/2?userId=99')
    expect(agreementLink(confirmed)).toBe('/agreement/3?userId=99')
  })
})

describe('formatDate', () => {
  it('formats an ISO timestamp in en-GB short style', () => {
    expect(formatDate('2026-05-25T10:00:00Z')).toMatch(/25 May 2026/)
  })
  it('returns empty string for null/undefined', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
  })
})
