<template>
  <div class="profile-page">
    <div class="profile-container">
      <h1 class="page-title">My Profile</h1>

      <div v-if="!authStore.user" class="text-center py-5">
        <p class="text-muted">Please sign in to view your profile.</p>
      </div>

      <template v-else>
        <!-- Posted success banner -->
        <div v-if="postedSuccess" class="alert-success mb-3" style="margin-left:0;margin-right:0;margin-top:0;">
          <strong>Your listing is submitted!</strong>
          Once approved it will appear on the map.
          When someone gets in touch you'll see a message in <NuxtLink to="/chats">Messages</NuxtLink> and receive an email alert — check your spam folder if you don't see it.
        </div>

        <!-- Profile Photo -->
        <section class="profile-card">
          <h2 class="card-title">Profile photo</h2>
          <div class="photo-section">
            <div class="photo-display">
              <img
                v-if="profilePhotoUrl"
                :src="profilePhotoUrl"
                alt="Profile photo"
                class="profile-photo"
              />
              <div v-else class="profile-photo-placeholder">
                <VIcon :icon="['fas', 'user-circle']" />
              </div>
            </div>
            <div class="photo-actions">
              <div v-if="uploadingPhoto" class="uploader-wrapper">
                <OurUploader v-model="photoAttachments" type="User" />
              </div>
              <button
                v-else
                class="btn btn-outline"
                @click="uploadingPhoto = true"
              >
                <VIcon :icon="['fas', 'camera']" /> Upload photo
              </button>
            </div>
          </div>
        </section>

        <!-- Email change -->
        <section class="profile-card">
          <h2 class="card-title">Email address</h2>
          <div class="field">
            <label class="field-label" for="email">Current email</label>
            <div class="current-email">{{ authStore.user?.email }}</div>
          </div>

          <div class="field">
            <label class="field-label" for="newemail">New email address</label>
            <input
              id="newemail"
              v-model="newEmail"
              class="field-input"
              type="email"
              placeholder="Enter new email"
            />
          </div>

          <div v-if="emailError" class="alert-error">{{ emailError }}</div>
          <div v-if="emailSuccess" class="alert-success">
            <VIcon :icon="['fas', 'check-circle']" /> Email saved.
          </div>

          <button
            class="btn btn-outline mt-3"
            :disabled="changingEmail || !newEmail"
            @click="changeEmail"
          >
            {{ changingEmail ? 'Saving…' : 'Save email' }}
          </button>
        </section>

        <!-- Account details -->
        <section class="profile-card">
          <h2 class="card-title">Account details</h2>
          <div class="field">
            <label class="field-label" for="displayname">Display name</label>
            <input
              id="displayname"
              v-model="form.displayname"
              class="field-input"
              type="text"
              maxlength="80"
            />
          </div>

          <div class="field">
            <label class="field-label" for="aboutme"
              >About me
              <span class="field-hint"
                >(optional — visible to potential matches)</span
              ></label
            >
            <textarea
              id="aboutme"
              v-model="form.aboutme"
              class="field-textarea"
              rows="4"
              maxlength="500"
              placeholder="A few words about yourself and what you're hoping for…"
            />
          </div>

          <div class="field">
            <label class="field-label" for="role">I want to…</label>
            <select id="role" v-model="form.lat_role" class="field-select">
              <option value="">-- select --</option>
              <option value="lender">Lend my garden</option>
              <option value="tender">Tend someone's garden</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div class="field">
            <label class="field-label" for="radius"
              >Travel radius <span class="field-hint">(miles)</span></label
            >
            <select
              id="radius"
              v-model="form.lat_travelRadius"
              class="field-select"
            >
              <option value="2">Up to 2 miles</option>
              <option value="5">Up to 5 miles</option>
              <option value="10">Up to 10 miles</option>
              <option value="20">Up to 20 miles</option>
              <option value="50">Up to 50 miles</option>
            </select>
          </div>

          <div v-if="saveError" class="alert-error">{{ saveError }}</div>
          <div v-if="saveSuccess" class="alert-success">
            <VIcon :icon="['fas', 'check-circle']" /> Profile saved.
          </div>

          <button
            class="btn btn-primary mt-3"
            :disabled="saving"
            @click="saveProfile"
          >
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
        </section>

        <!-- My listings -->
        <section class="profile-card">
          <h2 class="card-title">My gardens</h2>
          <div v-if="loadingListings" class="text-muted" style="font-size:0.9rem;">Loading…</div>
          <div v-else-if="myListings.length === 0" class="text-muted" style="font-size:0.9rem;">
            You haven't posted any gardens yet.
            <div class="mt-2">
              <NuxtLink to="/lend" class="btn btn-outline" style="font-size:0.85rem;padding:6px 14px;">Post a garden to lend</NuxtLink>
              <NuxtLink to="/tend" class="btn btn-outline ms-2" style="font-size:0.85rem;padding:6px 14px;">Post a tender request</NuxtLink>
            </div>
          </div>
          <ul v-else class="listings-list">
            <li v-for="listing in myListings" :key="listing.id" class="listing-item">
              <div class="listing-meta">
                <span class="listing-badge" :class="listing.type === 'Offer' ? 'badge-lender' : 'badge-tender'">
                  {{ listing.type === 'Offer' ? 'Garden to lend' : 'Looking to tend' }}
                </span>
                <NuxtLink :to="`/garden/${listing.id}`" class="listing-title">{{ listing.subject }}</NuxtLink>
                <span class="listing-date">{{ formatDate(listing.arrival) }}</span>
              </div>
              <button class="btn-remove" :disabled="deletingId === listing.id" @click="deleteListing(listing.id)">
                {{ deletingId === listing.id ? 'Removing…' : 'Remove' }}
              </button>
            </li>
          </ul>
          <div v-if="deleteError" class="alert-error mt-2">{{ deleteError }}</div>
        </section>

        <!-- Notification settings link -->
        <section class="profile-card" style="display:flex;align-items:center;justify-content:space-between;padding:20px 28px;">
          <div>
            <strong style="font-size:0.95rem;">Notification settings</strong>
            <p class="status-note">Manage alerts for new gardens near you.</p>
          </div>
          <NuxtLink to="/settings" class="btn btn-outline" style="font-size:0.85rem;padding:8px 16px;white-space:nowrap;">Settings →</NuxtLink>
        </section>

        <!-- Payment status -->
        <section class="profile-card">
          <h2 class="card-title">Membership</h2>
          <div v-if="hasPaid" class="status-paid">
            <VIcon :icon="['fas', 'check-circle']" class="status-icon" />
            <div>
              <strong>Active member</strong>
              <p class="status-note">You can send and receive messages.</p>
            </div>
          </div>
          <div v-else class="status-unpaid">
            <VIcon
              :icon="['fas', 'lock']"
              class="status-icon status-icon--lock"
            />
            <div>
              <strong>Not yet joined</strong>
              <p class="status-note">
                Pay the one-off joining fee to send and receive messages.
              </p>
              <NuxtLink to="/join" class="btn btn-primary mt-2"
                >Join now — £{{ feeFormatted }}</NuxtLink
              >
            </div>
          </div>
        </section>

        <!-- Password change -->
        <section class="profile-card">
          <h2 class="card-title">Change password</h2>
          <div class="field">
            <label class="field-label" for="newpass">New password</label>
            <input
              id="newpass"
              v-model="newPassword"
              class="field-input"
              type="password"
              autocomplete="new-password"
            />
          </div>
          <div class="field">
            <label class="field-label" for="confirmpass"
              >Confirm password</label
            >
            <input
              id="confirmpass"
              v-model="confirmPassword"
              class="field-input"
              type="password"
              autocomplete="new-password"
            />
          </div>
          <div v-if="passwordError" class="alert-error">
            {{ passwordError }}
          </div>
          <div v-if="passwordSuccess" class="alert-success">
            <VIcon :icon="['fas', 'check-circle']" /> Password changed.
          </div>
          <button
            class="btn btn-outline mt-3"
            :disabled="changingPassword"
            @click="changePassword"
          >
            {{ changingPassword ? 'Saving…' : 'Change password' }}
          </button>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useImageStore } from '~/stores/image'
import branding from '~/branding.config'
import Api from '~/api'
import OurUploader from '~/components/OurUploader'

definePageMeta({ layout: 'default' })
useHead({ title: `My Profile — ${branding.siteName}` })

const authStore = useAuthStore()
const imageStore = useImageStore()
const config = useRuntimeConfig()
const api = Api(config)

onMounted(async () => {
  if (!authStore.user) { navigateTo('/'); return }
  await loadMyListings()
})

/* My listings */
const myListings = ref<any[]>([])
const loadingListings = ref(false)
const deletingId = ref<number | null>(null)
const deleteError = ref('')

async function loadMyListings() {
  const uid = authStore.user?.id
  if (!uid) return
  loadingListings.value = true
  try {
    const groupid = parseInt(config.public.LAT_WORLD_GROUPID)
    const summaries = await api.message.fetchByUser(uid, true)
    const filtered = (Array.isArray(summaries) ? summaries : []).filter((m: any) => m.groupid === groupid)
    // Fetch full message details to get subject (MessageSummary lacks subject)
    const detailed = await Promise.all(
      filtered.map((m: any) => api.message.fetch(m.id).catch(() => null))
    )
    myListings.value = detailed.filter((m: any) => m !== null)
  } catch { /* silently show empty */ } finally {
    loadingListings.value = false
  }
}

async function deleteListing(id: number) {
  if (!confirm('Remove this listing? This cannot be undone.')) return
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

const user = computed(() => authStore.user)
const route = useRoute()
const postedSuccess = computed(() => route.query.posted === '1')

const form = reactive({
  displayname: user.value?.displayname ?? '',
  aboutme: user.value?.aboutme?.text ?? '',
  lat_role: user.value?.settings?.lat_role ?? '',
  lat_travelRadius: String(user.value?.settings?.lat_travelRadius ?? '10'),
})

watch(
  user,
  (u) => {
    if (!u) return
    form.displayname = u.displayname ?? ''
    form.aboutme = u.aboutme?.text ?? ''
    form.lat_role = u.settings?.lat_role ?? ''
    form.lat_travelRadius = String(u.settings?.lat_travelRadius ?? '10')
  },
  { immediate: true }
)

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

const hasPaid = computed(() => {
  const status = authStore.user?.settings?.lat_payment?.status
  return status === 'paid' || status === 'concession'
})

const feeFormatted = computed(() => (branding.fee.amountPence / 100).toFixed(2))

async function saveProfile() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await api.user.save({
      displayname: form.displayname,
      aboutme: form.aboutme,
    })
    await api.session.save({
      settings: {
        ...(authStore.user?.settings ?? {}),
        lat_role: form.lat_role || undefined,
        lat_travelRadius: parseInt(form.lat_travelRadius),
      },
    })
    await authStore.fetchUser()
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch {
    saveError.value = 'Could not save changes. Please try again.'
  } finally {
    saving.value = false
  }
}

const newPassword = ref('')
const confirmPassword = ref('')
const changingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref(false)

async function changePassword() {
  passwordError.value = ''
  passwordSuccess.value = false
  if (!newPassword.value || newPassword.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match.'
    return
  }
  changingPassword.value = true
  try {
    await api.user.save({ password: newPassword.value })
    newPassword.value = ''
    confirmPassword.value = ''
    passwordSuccess.value = true
    setTimeout(() => {
      passwordSuccess.value = false
    }, 3000)
  } catch {
    passwordError.value = 'Could not change password. Please try again.'
  } finally {
    changingPassword.value = false
  }
}

/* Profile photo */
const uploadingPhoto = ref(false)
const photoAttachments = ref<any[]>([])
const photoCacheBust = ref(Date.now())

const profilePhotoUrl = computed(() => {
  if (authStore.user?.profile?.externaluid) {
    // Use external photo (e.g. from social login)
    return authStore.user.profile.path
  } else if (authStore.user?.profile?.path && authStore.user?.profile?.ours) {
    // Use uploaded photo with cache bust
    return `${authStore.user.profile.path}?bust=${photoCacheBust.value}`
  }
  return null
})

watch(
  photoAttachments,
  async (newVal) => {
    uploadingPhoto.value = false
    if (newVal?.length) {
      try {
        const atts = {
          externaluid: newVal[0].ouruid,
          externalmods: newVal[0].externalmods,
          imgtype: 'User',
          msgid: authStore.user?.id,
        }
        await imageStore.post(atts)
        await authStore.fetchUser()
        photoCacheBust.value = Date.now()
      } catch (err) {
        console.error('Failed to upload photo:', err)
      }
    }
  },
  { deep: true }
)

/* Email change */
const newEmail = ref('')
const changingEmail = ref(false)
const emailError = ref('')
const emailSuccess = ref(false)

async function changeEmail() {
  emailError.value = ''
  emailSuccess.value = false

  if (!newEmail.value) {
    emailError.value = 'Please enter a new email address.'
    return
  }

  if (!newEmail.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    emailError.value = 'Please enter a valid email address.'
    return
  }

  changingEmail.value = true
  try {
    const data = await authStore.saveEmail(newEmail.value)
    newEmail.value = ''
    emailSuccess.value = true
    setTimeout(() => {
      emailSuccess.value = false
    }, 3000)

    // If confirmation needed, show a message
    if (data && data.ret === 10) {
      emailError.value = 'Check your email to confirm the change.'
      setTimeout(() => {
        emailError.value = ''
      }, 5000)
    }
  } catch (err) {
    emailError.value = 'Could not save email. Please try again.'
    console.error('Email change error:', err)
  } finally {
    changingEmail.value = false
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
  max-width: 600px;
  margin: 0 auto;
}

.page-title {
  font-family: var(--lat-font-heading);
  font-size: 1.8rem;
  color: var(--lat-color-text);
  margin: 0 0 28px;
}

.profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  padding: 28px;
  margin-bottom: 24px;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--lat-color-text);
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.field {
  margin-bottom: 16px;
}

.field-label {
  display: block;
  font-size: 0.87rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--lat-color-text);
}

.field-hint {
  font-weight: 400;
  color: var(--lat-color-text-muted);
}

.field-input,
.field-textarea,
.field-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.92rem;
  font-family: inherit;
  box-sizing: border-box;
  color: var(--lat-color-text);
  background: white;
}

.field-textarea {
  resize: vertical;
}

.field-input:focus,
.field-textarea:focus,
.field-select:focus {
  outline: none;
  border-color: var(--lat-color-primary);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: transparent;
  color: var(--lat-color-primary);
  border: 2px solid var(--lat-color-primary);
}
.btn-outline:hover {
  background: rgba(107, 158, 60, 0.07);
}
.btn-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mt-2 {
  margin-top: 8px;
}
.mt-3 {
  margin-top: 12px;
}

.alert-error {
  background: #fff0f0;
  color: #c0392b;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 0.88rem;
  margin-top: 12px;
}

.alert-success {
  background: var(--lat-color-tender-bg, #e8f5e9);
  color: var(--lat-color-tender-text, #2d5a27);
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 0.88rem;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-paid,
.status-unpaid {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.status-icon {
  font-size: 1.4rem;
  margin-top: 2px;
}

.status-paid .status-icon {
  color: var(--lat-color-primary);
}
.status-icon--lock {
  color: #aaa;
}

.status-note {
  color: var(--lat-color-text-muted);
  font-size: 0.88rem;
  margin: 4px 0 0;
}

.text-muted {
  color: var(--lat-color-text-muted);
}

/* My listings */
.listings-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.listing-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.listing-item:last-child { border-bottom: none; }

.listing-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.listing-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  width: fit-content;
}

.badge-lender { background: #e8f5e9; color: #2d5a27; }
.badge-tender { background: #e3f2fd; color: #1565c0; }

.listing-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--lat-color-text);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.listing-title:hover { text-decoration: underline; }

.listing-date {
  font-size: 0.75rem;
  color: var(--lat-color-text-muted);
}

.btn-remove {
  background: none;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.8rem;
  color: #c0392b;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-remove:hover { background: #fff0f0; border-color: #c0392b; }
.btn-remove:disabled { opacity: 0.5; cursor: not-allowed; }

.ms-2 { margin-left: 8px; }
.mt-2 { margin-top: 8px; }

/* Profile photo styles */
.photo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.photo-display {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #f5f5f5;
  overflow: hidden;
  border: 2px solid #e0e0e0;
}

.profile-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 3.5rem;
  color: #ccc;
}

.photo-actions {
  display: flex;
  justify-content: center;
}

.uploader-wrapper {
  width: 100%;
  max-width: 300px;
}

/* Email change styles */
.current-email {
  padding: 8px 12px;
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.92rem;
  color: var(--lat-color-text);
  font-weight: 500;
}

@media (max-width: 480px) {
  .profile-card {
    padding: 20px 16px;
  }
  .page-title {
    font-size: 1.4rem;
  }

  .photo-display {
    width: 100px;
    height: 100px;
  }

  .profile-photo-placeholder {
    font-size: 3rem;
  }
}
</style>
