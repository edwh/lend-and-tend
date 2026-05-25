import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

// Mock the chat composables — these provide the data backing
// ChatMessagePromised. The component awaits fetchReferencedMessage at
// script-setup time, so we return a resolved promise.
const refmsgRef = ref(null)
const otheruserRef = ref(null)
const messageIsFromCurrentUserRef = ref(false)
const refmsgidRef = ref(null)

vi.mock('~/composables/useChat', () => ({
  fetchReferencedMessage: vi.fn(() => Promise.resolve()),
  useChatMessageBase: () => ({
    refmsgid: refmsgidRef,
    refmsg: refmsgRef,
    otheruser: otheruserRef,
    messageIsFromCurrentUser: messageIsFromCurrentUserRef,
  }),
}))

vi.mock('~/components/ProfileImage.vue', () => ({
  default: defineComponent({
    name: 'ProfileImage',
    render() {
      return h('span', { class: 'profile-image-stub' })
    },
  }),
}))

import ChatMessagePromised from '~/lat/components/ChatMessagePromised.vue'

// The component has top-level await (fetchReferencedMessage at script
// setup), so it needs a <Suspense> boundary. Wrap it in a host component.
const Host = defineComponent({
  components: { ChatMessagePromised },
  props: ['chatid', 'id', 'pov'],
  template: `
    <Suspense>
      <ChatMessagePromised :chatid="chatid" :id="id" :pov="pov" />
    </Suspense>
  `,
})

async function makeWrapper() {
  const w = mount(Host, {
    props: { chatid: 1, id: 1, pov: 999 },
    global: {
      stubs: {
        NuxtLink: {
          template: '<a :href="to"><slot /></a>',
          props: ['to'],
        },
      },
    },
  })
  await flushPromises()
  return w
}

describe('ChatMessagePromised', () => {
  beforeEach(() => {
    refmsgRef.value = null
    otheruserRef.value = { id: 42, displayname: 'Tender User' }
    messageIsFromCurrentUserRef.value = false
    refmsgidRef.value = 100
  })

  it('shows the "removed listing" fallback when refmsg is missing', async () => {
    refmsgRef.value = null
    const w = await makeWrapper()
    expect(w.text()).toMatch(/garden listing that has been removed/i)
    expect(w.find('.promised-card').exists()).toBe(false)
  })

  it('strips the "Offer:" / "Wanted:" prefix from the garden title', async () => {
    refmsgRef.value = { subject: 'Offer: Sunny veg patch', promises: [] }
    const w = await makeWrapper()
    expect(w.find('.promised-garden').text()).toBe('Sunny veg patch')

    refmsgRef.value = { subject: 'Wanted: Help with shed', promises: [] }
    const w2 = await makeWrapper()
    expect(w2.find('.promised-garden').text()).toBe('Help with shed')
  })

  it('defaults garden title to "Garden" when subject is missing', async () => {
    refmsgRef.value = { promises: [] }
    const w = await makeWrapper()
    expect(w.find('.promised-garden').text()).toBe('Garden')
  })

  it('renders the title row "Garden agreement"', async () => {
    refmsgRef.value = { subject: 'Offer: x', promises: [{ id: 1 }] }
    const w = await makeWrapper()
    expect(w.find('.promised-title').text()).toBe('Garden agreement')
  })

  describe('status label + class', () => {
    it('no promise → "Agreement started"', async () => {
      refmsgRef.value = { subject: 'Offer: x', promises: [] }
      const w = await makeWrapper()
      expect(w.find('.promised-status').text()).toBe('Agreement started')
      // No status-- classes
      expect(w.find('.promised-status').classes()).not.toContain('status--pending')
      expect(w.find('.promised-status').classes()).not.toContain('status--confirmed')
    })

    it('promise without acceptedat → "Awaiting acceptance" (pending class)', async () => {
      refmsgRef.value = {
        subject: 'Offer: x',
        promises: [{ id: 1, acceptedat: null }],
      }
      const w = await makeWrapper()
      expect(w.find('.promised-status').text()).toBe('Awaiting acceptance')
      expect(w.find('.promised-status').classes()).toContain('status--pending')
    })

    it('promise with acceptedat → "Both parties agreed" (confirmed class)', async () => {
      refmsgRef.value = {
        subject: 'Offer: x',
        promises: [{ id: 1, acceptedat: '2026-05-25T10:00:00Z' }],
      }
      const w = await makeWrapper()
      expect(w.find('.promised-status').text()).toBe('Both parties agreed')
      expect(w.find('.promised-status').classes()).toContain('status--confirmed')
    })
  })

  describe('agreement link', () => {
    it('uses refmsgid + otheruser.id for the URL', async () => {
      refmsgRef.value = { subject: 'Offer: x', promises: [] }
      refmsgidRef.value = 555
      otheruserRef.value = { id: 77 }
      const w = await makeWrapper()
      const link = w.find('.btn-view-agreement')
      expect(link.attributes('href')).toBe('/agreement/555?userId=77')
    })

    it('renders "View →" when not confirmed', async () => {
      refmsgRef.value = { subject: 'Offer: x', promises: [{ id: 1 }] }
      const w = await makeWrapper()
      expect(w.find('.btn-view-agreement').text()).toBe('View →')
    })

    it('renders "View ✓" when confirmed', async () => {
      refmsgRef.value = {
        subject: 'Offer: x',
        promises: [{ id: 1, acceptedat: '2026-05-25T10:00:00Z' }],
      }
      const w = await makeWrapper()
      expect(w.find('.btn-view-agreement').text()).toBe('View ✓')
    })

    it('falls back to "#" when refmsgid or otheruser.id is missing', async () => {
      refmsgRef.value = { subject: 'Offer: x', promises: [] }
      otheruserRef.value = null
      const w = await makeWrapper()
      expect(w.find('.btn-view-agreement').attributes('href')).toBe('#')
    })
  })

  describe('layout', () => {
    it('adds myChatMessage class when the current user sent the promise', async () => {
      refmsgRef.value = { subject: 'Offer: x', promises: [] }
      messageIsFromCurrentUserRef.value = true
      const w = await makeWrapper()
      expect(w.find('.chatMessageWrapper').classes()).toContain('myChatMessage')
      // Profile pic only shown for the other party.
      expect(w.find('.chatMessageProfilePic').exists()).toBe(false)
    })

    it('shows the profile pic when the promise is from the other party', async () => {
      refmsgRef.value = { subject: 'Offer: x', promises: [] }
      messageIsFromCurrentUserRef.value = false
      const w = await makeWrapper()
      expect(w.find('.chatMessageProfilePic').exists()).toBe(true)
    })
  })
})
