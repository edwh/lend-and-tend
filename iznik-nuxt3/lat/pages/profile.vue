<template>
  <div class="profile-page">
    <div class="profile-container">
      <h1 class="page-title">My Gardens</h1>

      <div v-if="!authStore.user" class="text-center py-5">
        <p class="text-muted">Please sign in to view your gardens.</p>
      </div>

      <template v-else>
        <!-- Posted success banner -->
        <div v-if="postedSuccess" class="alert-success mb-3">
          <strong>Your listing is submitted!</strong>
          Once approved it will appear on the map.
          When someone gets in touch you'll see a message in <NuxtLink to="/chats">Messages</NuxtLink> and receive an email alert — check your spam folder if you don't see it.
        </div>

        <!-- My gardens -->
        <div v-if="loadingListings" class="text-center py-4">
          <div class="spinner-border" role="status" />
          <p class="mt-3 text-muted">Loading your gardens…</p>
        </div>

        <div v-else-if="myListings.length === 0" class="empty-state">
          <p class="text-muted">You haven't posted any gardens yet.</p>
          <div class="empty-state-actions">
            <NuxtLink to="/lend" class="btn btn-primary">Post a garden to lend</NuxtLink>
            <NuxtLink to="/tend" class="btn btn-outline">Ask for a garden to tend</NuxtLink>
          </div>
        </div>

        <article
          v-for="listing in myListings"
          :key="listing.id"
          class="garden-card"
        >
          <div class="garden-header">
            <div class="garden-header-text">
              <div
                class="role-badge"
                :class="listing.type === 'Offer' ? 'badge-lender' : 'badge-tender'"
              >
                {{ listing.type === 'Offer' ? 'Garden to lend' : 'Looking to tend' }}
              </div>
              <h2 class="garden-title">{{ listing.subject?.replace(/^(?:Offer|Wanted): /, '') }}</h2>
              <p v-if="listing.location?.name" class="garden-location">
                📍 {{ listing.location.name }}
              </p>
            </div>
            <div class="garden-status-wrap">
              <span
                v-if="hasAgreement(listing)"
                class="garden-status"
                :class="gardenStatusClass(listing)"
              >
                <NuxtLink :to="agreementLink(listing)" class="agreement-link">
                  {{ gardenStatus(listing) }} →
                </NuxtLink>
              </span>
              <span
                v-else
                class="garden-status"
                :class="gardenStatusClass(listing)"
              >{{ gardenStatus(listing) }}</span>
            </div>
          </div>

          <!-- Photos -->
          <div
            v-if="listing.attachments && listing.attachments.length"
            class="garden-photos"
          >
            <OurUploadedImage
              v-for="photo in listing.attachments"
              :key="photo.id"
              :src="photo.ouruid || photo.externaluid"
              :modifiers="photo.externalmods"
              class="garden-photo"
              alt="Garden photo"
              :width="400"
              :height="280"
            />
          </div>

          <!-- Description -->
          <section v-if="parsedBody(listing).description" class="garden-section">
            <h3 class="section-title">About this listing</h3>
            <p class="section-body">{{ parsedBody(listing).description }}</p>
          </section>

          <!-- Lender structured fields -->
          <template v-if="listing.type === 'Offer'">
            <section
              v-if="hasLenderDetails(listing)"
              class="garden-section"
            >
              <h3 class="section-title">Garden details</h3>
              <dl class="detail-grid">
                <template v-if="parsedBody(listing).gardenSize">
                  <dt>Size</dt>
                  <dd>{{ gardenSizeLabel(parsedBody(listing).gardenSize) }}</dd>
                </template>
                <template v-if="parsedBody(listing).sunExposure">
                  <dt>Sun</dt>
                  <dd>{{ sunLabel(parsedBody(listing).sunExposure) }}</dd>
                </template>
                <template v-if="parsedBody(listing).waterAccess">
                  <dt>Water</dt>
                  <dd>
                    {{
                      parsedBody(listing).waterAccess === 'yes'
                        ? 'Tap / water butt available'
                        : 'None — bring your own'
                    }}
                  </dd>
                </template>
                <template v-if="parsedBody(listing).accessRoute">
                  <dt>Access</dt>
                  <dd>{{ accessLabel(parsedBody(listing).accessRoute) }}</dd>
                </template>
              </dl>
            </section>

            <section v-if="parsedBody(listing).arrangement" class="garden-section">
              <h3 class="section-title">Arrangement</h3>
              <p class="section-body">{{ parsedBody(listing).arrangement }}</p>
            </section>

            <section v-if="parsedBody(listing).restrictions" class="garden-section">
              <h3 class="section-title">Restrictions</h3>
              <p class="section-body">{{ parsedBody(listing).restrictions }}</p>
            </section>
          </template>

          <!-- Tender structured fields -->
          <template v-else>
            <section v-if="parsedBody(listing).whatToGrow" class="garden-section">
              <h3 class="section-title">What I want to grow</h3>
              <p class="section-body">{{ parsedBody(listing).whatToGrow }}</p>
            </section>

            <section
              v-if="hasTenderDetails(listing)"
              class="garden-section"
            >
              <h3 class="section-title">Availability & equipment</h3>
              <dl class="detail-grid">
                <template v-if="parsedBody(listing).tools">
                  <dt>Tools</dt>
                  <dd>{{ toolsLabel(parsedBody(listing).tools) }}</dd>
                </template>
                <template v-if="parsedBody(listing).availability">
                  <dt>Available</dt>
                  <dd>{{ availabilityLabel(parsedBody(listing).availability) }}</dd>
                </template>
                <template v-if="parsedBody(listing).honestyDeclaration">
                  <dt>Declaration</dt>
                  <dd>✓ Confirmed not on any offender's register</dd>
                </template>
              </dl>
            </section>
          </template>

          <!-- Posted date -->
          <p v-if="listing.arrival" class="garden-date">
            Posted {{ formatDate(listing.arrival) }}
          </p>

          <!-- Actions -->
          <div v-if="confirmRemoveId === listing.id" class="remove-confirm">
            <template v-if="hasActiveAgreement(listing)">
              <p class="remove-confirm__warning">
                <VIcon icon="exclamation-triangle" /> This garden has an active agreement. What would you like to do?
              </p>
              <div class="remove-confirm__actions">
                <button class="btn-action" :disabled="deletingId === listing.id" @click="makeAvailableAgain(listing)">
                  <VIcon icon="rotate-left" /> Make available again
                </button>
                <button class="btn-action btn-action--danger" :disabled="deletingId === listing.id" @click="deleteListing(listing.id)">
                  <VIcon icon="trash" /> {{ deletingId === listing.id ? 'Removing…' : 'Remove entirely' }}
                </button>
                <button class="btn-action" @click="confirmRemoveId = null">Cancel</button>
              </div>
            </template>
            <template v-else>
              <p class="remove-confirm__warning">Remove this garden listing?</p>
              <div class="remove-confirm__actions">
                <button class="btn-action btn-action--danger" :disabled="deletingId === listing.id" @click="deleteListing(listing.id)">
                  <VIcon icon="trash" /> {{ deletingId === listing.id ? 'Removing…' : 'Yes, remove' }}
                </button>
                <button class="btn-action" @click="confirmRemoveId = null">Cancel</button>
              </div>
            </template>
          </div>
          <div v-else class="garden-actions">
            <button class="btn-action btn-action--danger" @click="confirmRemoveId = listing.id">
              <VIcon icon="trash" /> Remove
            </button>
            <NuxtLink :to="`/garden/${listing.id}/edit`" class="btn btn-primary">
              <VIcon icon="pen" /> Edit garden
            </NuxtLink>
          </div>
        </article>

        <div v-if="deleteError" class="alert-error">{{ deleteError }}</div>

        <!-- Post another garden -->
        <div v-if="myListings.length > 0" class="post-another">
          <NuxtLink to="/lend" class="btn btn-outline">Post another garden to lend</NuxtLink>
          <NuxtLink to="/tend" class="btn btn-outline">Ask for a garden to tend</NuxtLink>
        </div>

        <!-- Link to settings -->
        <div class="settings-link">
          <NuxtLink to="/settings">
            Account &amp; settings →
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useMessageStore } from '~/stores/message'
import branding from '~/branding.config'
import Api from '~/api'
import OurUploadedImage from '~/components/OurUploadedImage'

definePageMeta({ layout: 'default' })
useHead({ title: `My Gardens — ${branding.siteName}` })

const authStore = useAuthStore()
const messageStore = useMessageStore()
const config = useRuntimeConfig()
const api = Api(config)
const route = useRoute()

const postedSuccess = computed(() => route.query.posted === '1')

onMounted(async () => {
  if (!authStore.user) { navigateTo('/'); return }
  await loadMyListings()
})

/* My listings */
const myListings = ref<any[]>([])
const loadingListings = ref(false)
const deletingId = ref<number | null>(null)
const deleteError = ref('')
const confirmRemoveId = ref<number | null>(null)

async function loadMyListings() {
  const uid = authStore.user?.id
  if (!uid) return
  loadingListings.value = true
  try {
    const groupid = parseInt(config.public.LAT_WORLD_GROUPID)
    // Use active=false so listings with outcomes (Taken, Received, Withdrawn)
    // also show — users want to see all their gardens in one place. We then
    // de-dupe by message id because a message in multiple groups produces
    // multiple summary rows.
    const summaries = await api.message.fetchByUser(uid, false)
    const arr = Array.isArray(summaries) ? summaries : []
    const ourGroup = arr.filter((m: any) => Number(m.groupid) === groupid)
    const seen = new Set<number>()
    const unique = ourGroup.filter((m: any) => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
    const detailed = await Promise.all(
      unique.map((m: any) => api.message.fetch(m.id).catch(() => null))
    )
    myListings.value = detailed.filter((m: any) => m !== null)
  } catch { /* silently show empty */ } finally {
    loadingListings.value = false
  }
}

async function deleteListing(id: number) {
  confirmRemoveId.value = null
  deletingId.value = id
  deleteError.value = ''
  try {
    await api.message.del(id)
    myListings.value = myListings.value.filter(m => m.id !== id)
  } catch {
    deleteError.value = 'Could not remove listing. Please try again.'
  } finally {
    deletingId.value = null
  }
}

function formatDate(ts: string | null) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function parsedBody(listing: any) {
  const raw = listing?.textbody
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return { description: raw }
  }
}

function hasLenderDetails(listing: any) {
  const b = parsedBody(listing)
  return b.gardenSize || b.sunExposure || b.waterAccess || b.accessRoute
}

function hasTenderDetails(listing: any) {
  const b = parsedBody(listing)
  return b.tools || b.availability || b.honestyDeclaration
}

function gardenSizeLabel(v: string) {
  return ({ small: 'Small (up to 50 m²)', medium: 'Medium (50–200 m²)', large: 'Large (200 m²+)' }[v] || v)
}
function sunLabel(v: string) {
  return ({ full: 'Full sun', partial: 'Partial shade', shade: 'Mostly shade' }[v] || v)
}
function accessLabel(v: string) {
  return ({ gate: 'Side / back gate', through_house: 'Through the house', other: 'Other' }[v] || v)
}
function toolsLabel(v: string) {
  return ({ basic: 'Basic hand tools', full: 'Full set of garden tools', none: "None — needs access to lender's tools" }[v] || v)
}
function availabilityLabel(v: string) {
  return ({ weekends: 'Weekends', weekdays: 'Weekdays', flexible: 'Flexible', evenings: 'Evenings' }[v] || v)
}

function gardenStatus(listing: any): string {
  if (listing.promises && listing.promises.length > 0) {
    if (listing.promises[0].Acceptedat) {
      return 'Agreement confirmed'
    } else {
      return 'Agreement proposed'
    }
  }
  return 'Looking for a tender'
}

function gardenStatusClass(listing: any): string {
  if (listing.promises && listing.promises.length > 0) {
    if (listing.promises[0].Acceptedat) return 'status-confirmed'
    return 'status-proposed'
  }
  return 'status-available'
}

function hasAgreement(listing: any): boolean {
  return listing.promises && listing.promises.length > 0
}

function agreementLink(listing: any): string {
  if (listing.promises && listing.promises.length > 0) {
    const tenderId = listing.promises[0].userid
    return `/agreement/${listing.id}?userId=${tenderId}`
  }
  return ''
}

function hasActiveAgreement(listing: any): boolean {
  return listing.promises && listing.promises.length > 0 && !listing.promises[0].Acceptedat
}

async function makeAvailableAgain(listing: any) {
  confirmRemoveId.value = null
  deleteError.value = ''
  try {
    const tenderId = listing.promises?.[0]?.userid
    if (tenderId) {
      await messageStore.renege(listing.id, tenderId)
    }
    await loadMyListings()
  } catch {
    deleteError.value = 'Could not make garden available again. Please try again.'
  }
}
</script>

<style scoped>
.profile-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
  padding: 40px 16px;
}

.profile-container {
  max-width: 720px;
  margin: 0 auto;
}

.page-title {
  font-family: var(--lat-font-heading);
  font-size: 1.8rem;
  color: var(--lat-color-text);
  margin: 0 0 28px;
}

.empty-state {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  padding: 40px 28px;
  text-align: center;
}

.empty-state-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 16px;
}

.garden-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  padding: 28px;
  margin-bottom: 20px;
}

.garden-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.garden-header-text {
  flex: 1;
  min-width: 0;
}

.role-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  margin-bottom: 6px;
}

.badge-lender { background: var(--lat-color-lender-bg); color: var(--lat-color-lender-text); }
.badge-tender { background: var(--lat-color-tender-bg); color: var(--lat-color-tender-text); }

.garden-title {
  font-family: var(--lat-font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--lat-color-text);
  margin: 0 0 4px;
  word-break: break-word;
}

.garden-location {
  color: var(--lat-color-text-muted);
  font-size: 0.88rem;
  margin: 0;
}

.garden-status-wrap {
  flex-shrink: 0;
}

.garden-status {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
}

.status-available { background: #e3f2fd; color: #1565c0; }
.status-proposed { background: #fff3e0; color: #e65100; }
.status-confirmed { background: #e8f5e9; color: #2d5a27; }

.agreement-link {
  color: inherit;
  text-decoration: none;
}

.agreement-link:hover {
  text-decoration: underline;
}

.garden-photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.garden-photo {
  display: block;
  width: 100%;
  height: 180px;
  border-radius: 8px;
  overflow: hidden;
}

/* `<NuxtPicture>` (rendered by `OurUploadedImage`) wraps the `<img>` in a
   `<picture>` — without constraining the inner img it renders at natural
   size and breaks the layout. */
.garden-photo :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.garden-section {
  margin-bottom: 18px;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--lat-color-text);
  margin: 0 0 8px;
}

.section-body {
  color: var(--lat-color-text);
  font-size: 0.92rem;
  line-height: 1.5;
  margin: 0;
  white-space: pre-line;
}

.detail-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 16px;
  margin: 0;
}

.detail-grid dt {
  font-weight: 600;
  color: var(--lat-color-text-muted);
  font-size: 0.85rem;
}

.detail-grid dd {
  margin: 0;
  font-size: 0.9rem;
  color: var(--lat-color-text);
}

.garden-date {
  font-size: 0.8rem;
  color: var(--lat-color-text-muted);
  margin: 12px 0 16px;
}

.garden-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-primary:hover {
  background: var(--lat-color-primary-dark);
}

.btn-outline {
  background: transparent;
  color: var(--lat-color-primary);
  border: 2px solid var(--lat-color-primary);
}
.btn-outline:hover {
  background: rgba(107, 158, 60, 0.07);
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--lat-color-primary);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
}

.btn-action:hover {
  background: rgba(107, 158, 60, 0.08);
  border-color: var(--lat-color-primary);
}

.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-action--danger {
  color: #c0392b;
}

.btn-action--danger:hover {
  background: #fff0f0;
  border-color: #c0392b;
}

.remove-confirm {
  margin-top: 16px;
  background: #fff8f0;
  border: 1px solid #f0c070;
  border-radius: 8px;
  padding: 14px;
}

.remove-confirm__warning {
  font-size: 0.9rem;
  font-weight: 600;
  color: #7a4800;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.remove-confirm__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.post-another {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin: 24px 0 12px;
}

.settings-link {
  text-align: center;
  margin-top: 20px;
}

.settings-link a {
  color: var(--lat-color-primary);
  font-size: 0.9rem;
  text-decoration: none;
  font-weight: 600;
}

.settings-link a:hover {
  text-decoration: underline;
}

.alert-success {
  background: var(--lat-color-tender-bg, #e8f5e9);
  color: var(--lat-color-tender-text, #2d5a27);
  border-radius: 6px;
  padding: 14px 18px;
  margin-bottom: 20px;
  font-size: 0.95rem;
  line-height: 1.5;
}

.alert-error {
  background: #fff0f0;
  color: #c0392b;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 0.9rem;
  margin: 12px 0;
}

.text-muted {
  color: var(--lat-color-text-muted);
}

.text-center { text-align: center; }
.py-4 { padding-top: 24px; padding-bottom: 24px; }
.py-5 { padding-top: 48px; padding-bottom: 48px; }
.mt-3 { margin-top: 12px; }
.mb-3 { margin-bottom: 12px; }

.spinner-border {
  display: inline-block;
  width: 36px;
  height: 36px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-right-color: var(--lat-color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
