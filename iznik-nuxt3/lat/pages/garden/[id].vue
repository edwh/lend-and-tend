<template>
  <div class="garden-page">
    <div class="container py-5" style="max-width: 720px">
      <div v-if="pending" class="text-center py-5">
        <div
          class="spinner-border"
          :style="{ color: branding.colors.primary }"
          role="status"
        />
        <p class="mt-3 text-muted">Loading…</p>
      </div>

      <div v-else-if="fetchError || !message" class="text-center py-5">
        <p class="text-muted">This listing could not be found.</p>
        <NuxtLink to="/map" class="btn-back">← Back to map</NuxtLink>
      </div>

      <template v-else>
        <NuxtLink to="/map" class="btn-back mb-4 d-inline-block"
          >← Back to map</NuxtLink
        >

        <div class="profile-card">
          <div class="profile-header">
            <div class="profile-header-text">
              <div
                class="role-badge"
                :class="
                  message.type === 'Offer' ? 'role-lender' : 'role-tender'
                "
              >
                {{
                  message.type === 'Offer'
                    ? 'Garden to lend'
                    : 'Looking to tend'
                }}
              </div>
              <h1 class="profile-name">{{ message.subject }}</h1>
              <p v-if="message.location?.name" class="profile-location">
                📍 {{ message.location.name }}
              </p>
            </div>
          </div>

          <!-- Photos -->
          <div
            v-if="message.attachments && message.attachments.length"
            class="garden-photos"
          >
            <OurUploadedImage
              v-for="photo in message.attachments"
              :key="photo.id"
              :src="photo.ouruid || photo.externaluid"
              :modifiers="photo.externalmods"
              class="garden-photo"
              alt="Garden photo"
              :width="400"
              :height="280"
            />
          </div>

          <!-- Free-text description -->
          <section v-if="parsedBody.description" class="profile-section">
            <h2 class="section-title">About this listing</h2>
            <p class="section-body">{{ parsedBody.description }}</p>
          </section>

          <!-- Lender structured fields -->
          <template v-if="message.type === 'Offer'">
            <section v-if="hasLenderDetails" class="profile-section">
              <h2 class="section-title">Garden details</h2>
              <dl class="detail-grid">
                <template v-if="parsedBody.gardenSize">
                  <dt>Size</dt>
                  <dd>{{ gardenSizeLabel(parsedBody.gardenSize) }}</dd>
                </template>
                <template v-if="parsedBody.sunExposure">
                  <dt>Sun</dt>
                  <dd>{{ sunLabel(parsedBody.sunExposure) }}</dd>
                </template>
                <template v-if="parsedBody.waterAccess">
                  <dt>Water</dt>
                  <dd>
                    {{
                      parsedBody.waterAccess === 'yes'
                        ? 'Tap / water butt available'
                        : 'None — bring your own'
                    }}
                  </dd>
                </template>
                <template v-if="parsedBody.accessRoute">
                  <dt>Access</dt>
                  <dd>{{ accessLabel(parsedBody.accessRoute) }}</dd>
                </template>
              </dl>
            </section>

            <section v-if="parsedBody.arrangement" class="profile-section">
              <h2 class="section-title">Arrangement</h2>
              <p class="section-body">{{ parsedBody.arrangement }}</p>
            </section>

            <section v-if="parsedBody.restrictions" class="profile-section">
              <h2 class="section-title">Restrictions</h2>
              <p class="section-body">{{ parsedBody.restrictions }}</p>
            </section>
          </template>

          <!-- Tender structured fields -->
          <template v-else>
            <section v-if="hasWhatToGrow" class="profile-section">
              <h2 class="section-title">What they want to grow</h2>
              <p class="section-body">{{ parsedBody.whatToGrow }}</p>
            </section>

            <section v-if="hasTenderDetails" class="profile-section">
              <h2 class="section-title">Availability & equipment</h2>
              <dl class="detail-grid">
                <template v-if="parsedBody.tools">
                  <dt>Tools</dt>
                  <dd>{{ toolsLabel(parsedBody.tools) }}</dd>
                </template>
                <template v-if="parsedBody.availability">
                  <dt>Available</dt>
                  <dd>{{ availabilityLabel(parsedBody.availability) }}</dd>
                </template>
                <template v-if="parsedBody.honestyDeclaration">
                  <dt>Declaration</dt>
                  <dd>✓ Confirmed not on any offender's register</dd>
                </template>
              </dl>
            </section>
          </template>

          <div class="profile-cta">
            <template v-if="isOwnListing">
              <div class="own-listing-actions">
                <p class="cta-note own-listing-note">This is your listing.</p>
                <div class="own-listing-btns">
                  <NuxtLink
                    :to="`/garden/${route.params.id}/edit`"
                    class="btn btn-primary"
                  >
                    Edit listing
                  </NuxtLink>
                  <NuxtLink to="/profile" class="btn btn-outline">
                    View in profile
                  </NuxtLink>
                </div>
              </div>
            </template>
            <template v-else-if="loggedIn && hasPaid">
              <button
                class="btn btn-primary btn-lg"
                :disabled="startingChat"
                @click="startChat"
              >
                {{ startingChat ? 'Opening chat…' : 'Send message' }}
              </button>
            </template>
            <template v-else-if="loggedIn && !hasPaid">
              <p class="cta-note">
                A one-off joining fee is required to send messages.
              </p>
              <NuxtLink
                :to="`/join?returnTo=/garden/${route.params.id}`"
                class="btn btn-primary btn-lg"
              >
                Join to send message
              </NuxtLink>
            </template>
            <template v-else>
              <p class="cta-note">
                Sign in to send a message about this listing.
              </p>
              <button class="btn btn-primary" @click="requestLogin()">
                Sign in to message
              </button>
            </template>

            <div v-if="loggedIn && !isOwnListing" class="safety-links">
              <button class="btn-safety" @click="showReport = true">
                ⚑ Report listing
              </button>
              <span class="safety-sep">·</span>
              <button
                class="btn-safety btn-block-user"
                :disabled="blocking"
                @click="blockUser"
              >
                {{ blocking ? 'Blocking…' : '🚫 Block this user' }}
              </button>
              <span v-if="blockDone" class="block-done">User blocked.</span>
            </div>
          </div>

          <LatReportModal
            :open="showReport"
            kind="listing"
            :on-report="reportListing"
            @close="showReport = false"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import { useNavbar } from '~/composables/useNavbar'
import { useChatStore } from '~/stores/chat'
import branding from '~/branding.config'
import OurUploadedImage from '~/components/OurUploadedImage'

definePageMeta({ layout: 'default' })

const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const chatStore = useChatStore()
const { requestLogin } = useNavbar()
const loggedIn = computed(() => authStore.user !== null)
const hasPaid = computed(() => {
  const status = authStore.user?.settings?.lat_payment?.status
  return status === 'paid' || status === 'concession'
})
const isOwnListing = computed(() => {
  const fromuser = message.value?.fromuser
  const ownerId = typeof fromuser === 'number' ? fromuser : fromuser?.id
  return ownerId && ownerId === authStore.user?.id
})
const showReport = ref(false)
const blocking = ref(false)
const blockDone = ref(false)

const {
  data: messageData,
  pending,
  error: fetchError,
} = await useFetch(() => `${config.public.APIv2}/message/${route.params.id}`, {
  server: false,
})

const message = computed(() => messageData.value ?? null)
const startingChat = ref(false)

const parsedBody = computed(() => {
  const raw = message.value?.textbody
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return { description: raw }
  }
})

const hasLenderDetails = computed(
  () =>
    parsedBody.value.gardenSize ||
    parsedBody.value.sunExposure ||
    parsedBody.value.waterAccess ||
    parsedBody.value.accessRoute
)

const hasTenderDetails = computed(
  () =>
    parsedBody.value.tools ||
    parsedBody.value.availability ||
    parsedBody.value.honestyDeclaration
)

const hasWhatToGrow = computed(() => !!parsedBody.value.whatToGrow)

function gardenSizeLabel(v) {
  return (
    {
      small: 'Small (up to 50 m²)',
      medium: 'Medium (50–200 m²)',
      large: 'Large (200 m²+)',
    }[v] || v
  )
}
function sunLabel(v) {
  return (
    { full: 'Full sun', partial: 'Partial shade', shade: 'Mostly shade' }[v] ||
    v
  )
}
function accessLabel(v) {
  return (
    {
      gate: 'Side / back gate',
      through_house: 'Through the house',
      other: 'Other',
    }[v] || v
  )
}
function toolsLabel(v) {
  return (
    {
      basic: 'Basic hand tools',
      full: 'Full set of garden tools',
      none: "None — needs access to lender's tools",
    }[v] || v
  )
}
function availabilityLabel(v) {
  return (
    {
      weekends: 'Weekends',
      weekdays: 'Weekdays',
      flexible: 'Flexible',
      evenings: 'Evenings',
    }[v] || v
  )
}

async function blockUser() {
  if (!confirm('Block this user? They will no longer be able to contact you.'))
    return
  blocking.value = true
  try {
    const fromuser = message.value?.fromuser
    const lenderUserId = typeof fromuser === 'number' ? fromuser : fromuser?.id
    if (!lenderUserId) return
    const groupid = parseInt(config.public.LAT_WORLD_GROUPID)
    const chatRoomId = await chatStore.openChatToUser({
      chattype: 'User2User',
      groupid,
      userid: lenderUserId,
    })
    if (chatRoomId) {
      await chatStore.block(chatRoomId)
      blockDone.value = true
    }
  } finally {
    blocking.value = false
  }
}

async function reportListing() {
  const fromuser = message.value?.fromuser
  const lenderUserId = typeof fromuser === 'number' ? fromuser : fromuser?.id
  if (!lenderUserId) return
  const groupid = parseInt(config.public.LAT_WORLD_GROUPID)
  const chatRoomId = await chatStore.openChatToUser({
    chattype: 'User2User',
    groupid,
    userid: lenderUserId,
  })
  if (chatRoomId) {
    await chatStore.report(
      chatRoomId,
      'Other',
      `Reported listing id ${route.params.id}`,
      null
    )
  }
}

async function startChat() {
  if (!authStore.user) {
    requestLogin()
    return
  }
  const fromuser = message.value?.fromuser
  const lenderUserId = typeof fromuser === 'number' ? fromuser : fromuser?.id
  if (!lenderUserId) return
  startingChat.value = true
  try {
    const groupid = parseInt(config.public.LAT_WORLD_GROUPID)
    const chatRoomId = await chatStore.openChatToUser({
      chattype: 'User2User',
      groupid,
      userid: lenderUserId,
    })
    if (chatRoomId) {
      await navigateTo('/chats/' + chatRoomId)
    }
  } finally {
    startingChat.value = false
  }
}

useHead({
  title: computed(() =>
    message.value?.subject
      ? `${message.value.subject} — ${branding.siteName}`
      : branding.siteName
  ),
})
</script>

<style scoped>
.garden-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
}

.btn-back {
  color: var(--lat-color-primary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}
.btn-back:hover {
  text-decoration: underline;
}

.profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 32px;
}

.profile-header {
  margin-bottom: 28px;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.role-lender {
  background: #e8f5e9;
  color: #2d5a27;
}
.role-tender {
  background: #e3f2fd;
  color: #1565c0;
}

.profile-name {
  font-family: var(--lat-font-heading);
  font-size: 1.8rem;
  margin: 0 0 8px;
  color: var(--lat-color-text);
}

.profile-location {
  color: var(--lat-color-text-muted);
  font-size: 0.9rem;
  margin: 0;
}

.profile-section {
  padding: 20px 0;
  border-top: 1px solid #f0f0f0;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 10px;
  color: var(--lat-color-text);
}

.section-body {
  color: var(--lat-color-text-muted);
  line-height: 1.6;
  margin: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 6px 16px;
  margin: 0;
}

.detail-grid dt {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--lat-color-text);
  align-self: start;
}

.detail-grid dd {
  font-size: 0.875rem;
  color: var(--lat-color-text-muted);
  margin: 0;
}

.profile-cta {
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 1rem;
}

.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-primary:hover {
  opacity: 0.9;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.text-muted {
  color: var(--lat-color-text-muted);
}
.mb-3 {
  margin-bottom: 12px;
}
.cta-note {
  color: var(--lat-color-text-muted);
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.own-listing-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.own-listing-btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.own-listing-note {
  background: #f0f7ed;
  color: var(--lat-color-text);
  padding: 12px 16px;
  border-radius: 6px;
  border-left: 3px solid var(--lat-color-primary);
  margin-bottom: 0;
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--lat-color-primary);
  color: var(--lat-color-primary);
}

.safety-links {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.safety-sep {
  color: #ccc;
  font-size: 0.8rem;
}

.btn-safety {
  background: none;
  border: none;
  color: var(--lat-color-text-muted);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.btn-safety:hover {
  color: #c0392b;
}
.btn-safety:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-block-user:hover {
  color: #c0392b;
}

.block-done {
  font-size: 0.78rem;
  color: var(--lat-color-primary);
}

.garden-photos {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.garden-photo {
  width: 200px;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}
</style>
