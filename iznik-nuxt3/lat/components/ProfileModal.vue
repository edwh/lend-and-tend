<template>
  <b-modal
    ref="modal"
    scrollable
    size="lg"
    hide-header
    body-class="p-0"
    content-class="profile-modal-content"
  >
    <template #default>
      <div class="profile-modal-body">
        <!-- Profile Header -->
        <div class="profile-header">
          <ProfileImage
            :image="user?.profile?.image"
            :ouruid="user?.profile?.ouruid"
            :externaluid="user?.profile?.externaluid"
            size="xl"
            alt-text="Profile photo"
          />
          <div class="profile-info">
            <h3 class="user-name">{{ user?.displayname }}</h3>
            <p class="member-since">Member since {{ dateonly(user?.added) }}</p>
            <div class="role-badges">
              <span v-if="hasOffers" class="role-badge role-badge-lender">
                Lender
              </span>
              <span v-if="hasWanteds" class="role-badge role-badge-tender">
                Tender
              </span>
            </div>
          </div>
        </div>

        <!-- Active Listings -->
        <div v-if="listings.length > 0" class="listings-section">
          <h4 class="listings-title">Active Listings</h4>
          <div class="listings-container">
            <NuxtLink
              v-for="listing in listings"
              :key="listing.id"
              :to="`/garden/${listing.id}`"
              class="listing-card"
            >
              <div class="listing-badge">
                <span
                  v-if="listing.type === 'Offer'"
                  class="type-badge type-offer"
                >
                  Offer
                </span>
                <span
                  v-else-if="listing.type === 'Wanted'"
                  class="type-badge type-wanted"
                >
                  Wanted
                </span>
              </div>
              <div class="listing-text">
                {{ stripPrefix(listing.subject) }}
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <b-button variant="primary" @click="hide">Close</b-button>
    </template>
  </b-modal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '~/stores/user'
import { useOurModal } from '~/composables/useOurModal'
import { dateonly } from '~/composables/useTimeFormat'
/* $fetch and useRuntimeConfig are auto-imported globals in Nuxt 3 */
import ProfileImage from '~/components/ProfileImage'

const props = defineProps({
  id: {
    type: Number,
    required: false,
    default: 0,
  },
  closeOnMessage: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const emit = defineEmits(['hidden'])

const userStore = useUserStore()
const { modal, hide: hideModal } = useOurModal()
const listings = ref([])
const hasOffers = ref(false)
const hasWanteds = ref(false)

// Fetch user data at setup
await userStore.fetch(props.id)

// Get the user from store
const user = computed(() => userStore.list[props.id])

// Fetch active listings on mount
onMounted(async () => {
  try {
    const config = useRuntimeConfig()
    const baseURL = config.public.IZNIK_API_V2 || 'http://localhost:4001/apiv2'
    const groupid = config.public.LAT_WORLD_GROUPID

    // Fetch user's active listings
    const response = await $fetch(
      `${baseURL}/user/${props.id}/messages?active=true&groupid=${groupid}`,
      {
        method: 'GET',
      }
    )

    if (response?.messages) {
      listings.value = response.messages.filter(
        (msg) => msg.groupid === groupid
      )

      // Update hasOffers and hasWanteds based on actual data
      hasOffers.value = listings.value.some((m) => m.type === 'Offer')
      hasWanteds.value = listings.value.some((m) => m.type === 'Wanted')
    }
  } catch (e) {
    console.error('Failed to fetch user listings:', e)
  }
})

// Strip "Offer: " or "Wanted: " prefix from listing subject
function stripPrefix(subject) {
  if (!subject) return ''
  return subject.replace(/^(Offer|Wanted):\s*/i, '')
}

// Forward hidden event from modal
function hide() {
  hideModal()
  emit('hidden')
}
</script>

<style scoped>
.profile-modal-body {
  min-height: auto;
  padding: 2rem;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.user-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.member-since {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: #666;
}

.role-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.role-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-badge-lender {
  background: #e8f5e9;
  color: #4f6642;
}

.role-badge-tender {
  background: #f3e8f7;
  color: #bb68ca;
}

.listings-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.listings-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.listings-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.listing-card {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fafafa;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.listing-card:hover {
  background: #f0f0f0;
  border-color: #bbb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.listing-badge {
  flex-shrink: 0;
}

.type-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.type-offer {
  background: #c8e6c9;
  color: #2e7d32;
}

.type-wanted {
  background: #e1bee7;
  color: #6a1b9a;
}

.listing-text {
  flex: 1;
  font-size: 0.9375rem;
  color: #333;
  word-break: break-word;
}
</style>
