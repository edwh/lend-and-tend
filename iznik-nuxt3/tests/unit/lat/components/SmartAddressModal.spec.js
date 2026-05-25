import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SmartAddressModal from '~/lat/components/SmartAddressModal.vue'

function makeWrapper(props = {}) {
  return mount(SmartAddressModal, {
    props: {
      show: true,
      offers: [],
      ...props,
    },
  })
}

const offerSW1A = {
  id: 1,
  subject: 'Sunny veg patch',
  textbody: '{"postcode": "SW1A 1AA"}',
  lat: 51.5014,
  lng: -0.1419,
}
const offerM15 = {
  id: 2,
  subject: 'Tiny back garden',
  textbody: '{"postcode": "M1 5GD"}',
  lat: 53.4716,
  lng: -2.2407,
}
const offerNoPostcode = {
  id: 3,
  subject: 'Mystery garden',
  textbody: 'plain text — no postcode',
  lat: 52.1,
  lng: -0.5,
}
const offerNoLocation = {
  id: 4,
  subject: 'Unknown location',
  textbody: '',
  lat: null,
  lng: null,
}

describe('SmartAddressModal', () => {
  it('renders nothing when show=false', () => {
    const w = makeWrapper({ show: false, offers: [offerSW1A] })
    expect(w.find('.smart-address-overlay').exists()).toBe(false)
  })

  it('renders the overlay when show=true', () => {
    const w = makeWrapper({ offers: [offerSW1A] })
    expect(w.find('.smart-address-overlay').exists()).toBe(true)
    expect(w.find('h3').text()).toBe('Which garden?')
  })

  describe('single-garden mode (offers.length === 1)', () => {
    it('shows the single-garden prompt', () => {
      const w = makeWrapper({ offers: [offerSW1A] })
      expect(w.find('.single-garden-text').text()).toMatch(
        /one garden listing/i
      )
      expect(w.find('.garden-list').exists()).toBe(false)
    })

    it('selectedOffer is the only offer', async () => {
      const w = makeWrapper({ offers: [offerSW1A] })
      // sendAddress button enabled (single offer auto-selected at idx 0)
      const send = w.get('button.btn-primary')
      expect(send.attributes('disabled')).toBeUndefined()
    })
  })

  describe('multi-garden mode (offers.length > 1)', () => {
    it('shows a list and the multi-garden prompt with the count', () => {
      const w = makeWrapper({ offers: [offerSW1A, offerM15] })
      expect(w.find('.multi-garden-text').text()).toMatch(/2 garden listings/)
      const items = w.findAll('.garden-item')
      expect(items).toHaveLength(2)
      expect(items[0].text()).toContain('Sunny veg patch')
      expect(items[1].text()).toContain('Tiny back garden')
    })

    it('clicking a garden item changes selection', async () => {
      const w = makeWrapper({ offers: [offerSW1A, offerM15] })
      const items = w.findAll('.garden-item')
      expect(items[0].classes()).toContain('selected')
      expect(items[1].classes()).not.toContain('selected')

      await items[1].trigger('click')
      const itemsAfter = w.findAll('.garden-item')
      expect(itemsAfter[1].classes()).toContain('selected')
      expect(itemsAfter[0].classes()).not.toContain('selected')
    })
  })

  describe('getLocationLabel', () => {
    it('shows the postcode parsed from textbody JSON', () => {
      const w = makeWrapper({ offers: [offerSW1A, offerM15] })
      const items = w.findAll('.garden-location')
      expect(items[0].text()).toBe('SW1A 1AA')
      expect(items[1].text()).toBe('M1 5GD')
    })

    it('falls back to lat/lng (2dp) when no postcode', () => {
      const w = makeWrapper({ offers: [offerNoPostcode, offerM15] })
      const items = w.findAll('.garden-location')
      expect(items[0].text()).toBe('52.10, -0.50')
    })

    it('shows "Location unknown" when neither postcode nor coords', () => {
      const w = makeWrapper({ offers: [offerNoLocation, offerM15] })
      const items = w.findAll('.garden-location')
      expect(items[0].text()).toBe('Location unknown')
    })
  })

  describe('events', () => {
    it('Cancel button emits close', async () => {
      const w = makeWrapper({ offers: [offerSW1A] })
      await w.get('button.btn-secondary').trigger('click')
      expect(w.emitted('close')).toHaveLength(1)
    })

    it('overlay click (outside the modal) emits close', async () => {
      const w = makeWrapper({ offers: [offerSW1A] })
      await w.get('.smart-address-overlay').trigger('click')
      expect(w.emitted('close')).toHaveLength(1)
    })

    it('Send button emits "sent" with the built message and the selected offer', async () => {
      const w = makeWrapper({ offers: [offerSW1A, offerM15] })
      await w.get('button.btn-primary').trigger('click')
      const sent = w.emitted('sent')
      expect(sent).toHaveLength(1)
      const [msg, offer] = sent[0]
      // useSmartAddress.buildAddressMessage formats the postcode + subject
      expect(msg).toMatch(/SW1A 1AA/)
      expect(msg).toMatch(/Sunny veg patch/)
      expect(offer).toEqual(offerSW1A)
    })

    it('Send button is disabled if there are no offers', () => {
      const w = makeWrapper({ offers: [] })
      const send = w.get('button.btn-primary')
      expect(send.attributes('disabled')).toBeDefined()
    })
  })
})
