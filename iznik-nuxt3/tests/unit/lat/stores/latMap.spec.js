import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// The store uses Nuxt's auto-imported `$fetch` and `useRuntimeConfig`
// globals. The repo's vitest setup already stubs useRuntimeConfig, but
// stubs $fetch per test so each can program its own response.
import { useLatMapStore } from '~/lat/stores/latMap.ts'

describe('latMap store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // The runtime config that the store reads. Override what's needed per
    // test by overwriting useRuntimeConfig.
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: {
        APIv2: 'http://test.local/apiv2',
        LAT_WORLD_GROUPID: 1000000,
      },
    }))
  })

  describe('flyTo', () => {
    it('sets searchCenter with the supplied coordinates and default zoom 13', () => {
      const store = useLatMapStore()
      expect(store.searchCenter).toBeNull()
      store.flyTo(51.5014, -0.1419)
      expect(store.searchCenter).toEqual({
        lat: 51.5014,
        lng: -0.1419,
        zoom: 13,
      })
    })

    it('honours an explicit zoom argument', () => {
      const store = useLatMapStore()
      store.flyTo(53.48, -2.24, 16)
      expect(store.searchCenter.zoom).toBe(16)
    })

    it('updates searchCenter on subsequent calls (new object reference)', () => {
      const store = useLatMapStore()
      store.flyTo(51, -0.1)
      const first = store.searchCenter
      store.flyTo(52, -0.2)
      expect(store.searchCenter).not.toBe(first)
      expect(store.searchCenter.lat).toBe(52)
    })
  })

  describe('fetchAll', () => {
    it('populates allPins with messages that have lat/lng', async () => {
      vi.stubGlobal(
        '$fetch',
        vi.fn().mockResolvedValue({
          messages: [
            { id: 1, lat: 51, lng: -0.1, type: 'Offer', fromuser: 7, subject: 'Garden A' },
            { id: 2, lat: 52, lng: -0.2, type: 'Wanted', fromuser: 8, subject: 'Garden B' },
            // No lat/lng — should be filtered out.
            { id: 3, type: 'Offer', fromuser: 9, subject: 'Garden C' },
          ],
        })
      )
      const store = useLatMapStore()
      await store.fetchAll()
      expect(store.allPins).toHaveLength(2)
      expect(store.allPins.map((p) => p.id)).toEqual([1, 2])
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
    })

    it('handles a network error gracefully (sets error, no pins)', async () => {
      vi.stubGlobal(
        '$fetch',
        vi.fn().mockRejectedValue(new Error('boom'))
      )
      const store = useLatMapStore()
      await store.fetchAll()
      expect(store.allPins).toEqual([])
      expect(store.error).toBe('boom')
      expect(store.loading).toBe(false)
    })

    it('short-circuits when LAT_WORLD_GROUPID is missing', async () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: { APIv2: 'http://test.local/apiv2', LAT_WORLD_GROUPID: 0 },
      }))
      const fetchSpy = vi.fn()
      vi.stubGlobal('$fetch', fetchSpy)
      const store = useLatMapStore()
      await store.fetchAll()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('skips messages whose lat or lng is zero/undefined/null', async () => {
      vi.stubGlobal(
        '$fetch',
        vi.fn().mockResolvedValue({
          messages: [
            { id: 1, lat: 51, lng: -0.1, type: 'Offer', fromuser: 7, subject: 'Has both' },
            { id: 2, lat: 0, lng: -0.1, type: 'Offer', fromuser: 7, subject: 'Zero lat' },
            { id: 3, lat: 51, lng: null, type: 'Offer', fromuser: 7, subject: 'Null lng' },
          ],
        })
      )
      const store = useLatMapStore()
      await store.fetchAll()
      expect(store.allPins.map((p) => p.id)).toEqual([1])
    })
  })

  describe('toPin (via fetchAll) — fromuser normalisation', () => {
    async function pinsFor(messages) {
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ messages }))
      const store = useLatMapStore()
      await store.fetchAll()
      return store.allPins
    }

    it('extracts id from object-shaped fromuser', async () => {
      const pins = await pinsFor([
        { id: 1, lat: 51, lng: -0.1, type: 'Offer', fromuser: { id: 42 } },
      ])
      expect(pins[0].ownerUserId).toBe(42)
    })

    it('extracts id from numeric fromuser', async () => {
      const pins = await pinsFor([
        { id: 1, lat: 51, lng: -0.1, type: 'Offer', fromuser: 99 },
      ])
      expect(pins[0].ownerUserId).toBe(99)
    })

    it('falls back to fromuserid when fromuser is missing', async () => {
      const pins = await pinsFor([
        { id: 1, lat: 51, lng: -0.1, type: 'Offer', fromuserid: 7 },
      ])
      expect(pins[0].ownerUserId).toBe(7)
    })

    it('preserves subject, type, location, textbody, promises through the mapping', async () => {
      const pins = await pinsFor([
        {
          id: 5,
          lat: 51,
          lng: -0.1,
          type: 'Offer',
          fromuser: 1,
          subject: 'Veg patch',
          location: 'SW1A',
          textbody: '{"pafid":12345}',
          promises: [{ id: 7, Acceptedat: '2026-01-01' }],
        },
      ])
      expect(pins[0]).toMatchObject({
        id: 5,
        type: 'Offer',
        subject: 'Veg patch',
        location: 'SW1A',
        textbody: '{"pafid":12345}',
        promises: [{ id: 7, Acceptedat: '2026-01-01' }],
      })
    })

    it('defaults subject to empty string when missing', async () => {
      const pins = await pinsFor([
        { id: 1, lat: 51, lng: -0.1, type: 'Offer', fromuser: 1 },
      ])
      expect(pins[0].subject).toBe('')
    })
  })

  describe('fetchOwnPending', () => {
    it('short-circuits when userId is 0', async () => {
      const fetchSpy = vi.fn()
      vi.stubGlobal('$fetch', fetchSpy)
      const store = useLatMapStore()
      await store.fetchOwnPending(0)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('short-circuits when LAT_WORLD_GROUPID is 0', async () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: { APIv2: 'http://test.local/apiv2', LAT_WORLD_GROUPID: 0 },
      }))
      const fetchSpy = vi.fn()
      vi.stubGlobal('$fetch', fetchSpy)
      const store = useLatMapStore()
      await store.fetchOwnPending(7)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('does nothing when the typeahead summary list is empty', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValueOnce([]))
      const store = useLatMapStore()
      await store.fetchOwnPending(7)
      // The typeahead call fired but no detail fetches happened, so the
      // store's pin list remains empty.
      expect(store.allPins).toEqual([])
    })

    it('filters non-L&T-world-group summaries out before fetching details', async () => {
      vi.stubGlobal(
        '$fetch',
        vi.fn().mockResolvedValueOnce([
          { id: 11, groupid: 999 }, // different group — skipped
        ])
      )
      const store = useLatMapStore()
      await store.fetchOwnPending(7)
      expect(store.allPins).toEqual([])
    })
  })
})
