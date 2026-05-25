import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VisibilityHint from '~/lat/components/lat/VisibilityHint.vue'

describe('VisibilityHint', () => {
  it('renders the "Public" label for kind=public', () => {
    const w = mount(VisibilityHint, { props: { kind: 'public' } })
    expect(w.text()).toBe('Public')
    expect(w.classes()).toContain('vis-hint--public')
  })

  it('renders "Private" for kind=private', () => {
    const w = mount(VisibilityHint, { props: { kind: 'private' } })
    expect(w.text()).toBe('Private')
    expect(w.classes()).toContain('vis-hint--private')
  })

  it('renders "Approximate location only" for kind=approximate', () => {
    const w = mount(VisibilityHint, { props: { kind: 'approximate' } })
    expect(w.text()).toBe('Approximate location only')
    expect(w.classes()).toContain('vis-hint--approximate')
  })

  it('has a tooltip (title attr) explaining what the badge means', () => {
    const pub = mount(VisibilityHint, { props: { kind: 'public' } })
    expect(pub.attributes('title')).toMatch(/anyone can see this/i)

    const priv = mount(VisibilityHint, { props: { kind: 'private' } })
    expect(priv.attributes('title')).toMatch(/garden-sharing agreement/i)

    const appr = mount(VisibilityHint, { props: { kind: 'approximate' } })
    expect(appr.attributes('title')).toMatch(/1 km/i)
    expect(appr.attributes('title')).toMatch(/full address is only shared/i)
  })

  it('renders a coloured dot inside the badge', () => {
    const w = mount(VisibilityHint, { props: { kind: 'public' } })
    expect(w.find('.vis-hint__dot').exists()).toBe(true)
  })

  it('marks the dot aria-hidden so screen readers only get the label', () => {
    const w = mount(VisibilityHint, { props: { kind: 'public' } })
    expect(w.find('.vis-hint__dot').attributes('aria-hidden')).toBe('true')
  })
})
