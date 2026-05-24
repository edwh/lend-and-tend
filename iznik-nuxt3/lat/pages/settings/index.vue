<template>
  <div class="settings-page">
    <div class="settings-container">
      <h1 class="page-title">Account &amp; Settings</h1>

      <div v-if="!authStore.user" class="text-center py-5">
        <p class="text-muted">Please sign in to view your settings.</p>
      </div>

      <template v-else>
        <!-- Profile Photo -->
        <section class="settings-card">
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
                <OurUploader
                  v-model="photoAttachments"
                  type="User"
                  start-open
                />
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

        <!-- Account details -->
        <section class="settings-card">
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

          <div v-if="profileError" class="alert-error">{{ profileError }}</div>
          <div v-if="profileSuccess" class="alert-success">
            <VIcon :icon="['fas', 'check-circle']" /> Profile saved.
          </div>

          <button
            class="btn btn-primary mt-3"
            :disabled="savingProfile"
            @click="saveProfile"
          >
            {{ savingProfile ? 'Saving…' : 'Save changes' }}
          </button>
        </section>

        <!-- Email change -->
        <section class="settings-card">
          <h2 class="card-title">Email address</h2>
          <div class="field">
            <label class="field-label">Current email</label>
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

        <!-- Password change -->
        <section class="settings-card">
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

        <!-- Notification alerts -->
        <section class="settings-card">
          <h2 class="card-title">Local activity alerts</h2>
          <p class="card-desc">
            Get notified when new gardens or tenders appear near you.
          </p>

          <div class="toggle-row">
            <div class="toggle-info">
              <strong>Email me when new listings appear nearby</strong>
              <p class="toggle-note">
                Based on your travel radius ({{ displayMiles }} miles)
              </p>
            </div>
            <label class="toggle-switch">
              <input v-model="form.lat_alerts_enabled" type="checkbox" />
              <span class="toggle-track" />
            </label>
          </div>

          <div v-if="form.lat_alerts_enabled" class="field mt-3">
            <label class="field-label" for="alertFreq">Alert frequency</label>
            <select
              id="alertFreq"
              v-model="form.lat_alerts_frequency"
              class="field-select"
            >
              <option value="instant">
                As it happens (one email per new listing)
              </option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
            <p class="field-hint mt-1">
              In dense areas, digests prevent inbox overload.
            </p>
          </div>
        </section>

        <!-- Travel radius -->
        <section class="settings-card">
          <h2 class="card-title">Travel radius</h2>
          <p class="card-desc">
            How far are you willing to travel to reach a garden? This also
            controls which new listings trigger alerts for you.
          </p>
          <div class="field">
            <select
              id="radius"
              v-model="form.lat_travelRadius"
              class="field-select"
            >
              <option value="1">Up to 1 mile</option>
              <option value="2">Up to 2 miles</option>
              <option value="5">Up to 5 miles</option>
              <option value="10">Up to 10 miles</option>
              <option value="20">Up to 20 miles</option>
              <option value="50">Up to 50 miles</option>
            </select>
          </div>
        </section>

        <!-- Waiting list reminders -->
        <section class="settings-card">
          <h2 class="card-title">Waiting list reminders</h2>
          <p class="card-desc">
            If you haven't been matched yet, we'll check in every few months to
            make sure you're still looking. You can opt out here.
          </p>
          <div class="toggle-row">
            <div class="toggle-info">
              <strong>Send me "still interested?" reminders</strong>
              <p class="toggle-note">Approx. every 3 months while unmatched</p>
            </div>
            <label class="toggle-switch">
              <input v-model="form.lat_waitlist_reminders" type="checkbox" />
              <span class="toggle-track" />
            </label>
          </div>
        </section>

        <!-- Save settings (alerts/radius/reminders) -->
        <div v-if="settingsError" class="alert-error">{{ settingsError }}</div>
        <div v-if="settingsSuccess" class="alert-success">
          <VIcon :icon="['fas', 'check-circle']" /> Settings saved.
        </div>

        <button
          class="btn btn-primary"
          :disabled="savingSettings"
          @click="saveSettings"
        >
          {{ savingSettings ? 'Saving…' : 'Save settings' }}
        </button>

        <!-- Membership -->
        <section class="settings-card mt-4">
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

        <div class="settings-links">
          <NuxtLink to="/profile" class="text-link"
            >← Back to My Gardens</NuxtLink
          >
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import branding from '~/branding.config'
import Api from '~/api'
import OurUploader from '~/components/OurUploader'
import { useImageStore } from '~/stores/image'

definePageMeta({ layout: 'default' })
useHead({ title: `Settings — ${branding.siteName}` })

const authStore = useAuthStore()
const config = useRuntimeConfig()
const api = Api(config)
const imageStore = useImageStore()

onMounted(() => {
  if (!authStore.user) navigateTo('/')
})

const user = computed(() => authStore.user)

function kmToMiles(km) {
  return km * 0.621371
}
function milesToKm(miles) {
  return Math.round(miles / 0.621371)
}

const MILE_OPTIONS = [1, 2, 5, 10, 20, 50]
function nearestMileOption(miles) {
  return String(
    MILE_OPTIONS.reduce((prev, curr) =>
      Math.abs(curr - miles) < Math.abs(prev - miles) ? curr : prev
    )
  )
}

const displayMiles = computed(() => parseFloat(form.lat_travelRadius))

const form = reactive({
  displayname: user.value?.displayname ?? '',
  aboutme: user.value?.aboutme?.text ?? '',
  lat_role: user.value?.settings?.lat_role ?? '',
  lat_travelRadius: nearestMileOption(
    kmToMiles(user.value?.settings?.lat_travelRadius ?? 16)
  ),
  lat_alerts_enabled: user.value?.settings?.lat_alerts?.enabled !== false,
  lat_alerts_frequency: user.value?.settings?.lat_alerts?.frequency ?? 'daily',
  lat_waitlist_reminders:
    user.value?.settings?.lat_waitlist_reminders !== false,
})

watch(
  user,
  (u) => {
    if (!u) return
    form.displayname = u.displayname ?? ''
    form.aboutme = u.aboutme?.text ?? ''
    form.lat_role = u.settings?.lat_role ?? ''
    form.lat_travelRadius = nearestMileOption(
      kmToMiles(u.settings?.lat_travelRadius ?? 16)
    )
    form.lat_alerts_enabled = u.settings?.lat_alerts?.enabled !== false
    form.lat_alerts_frequency = u.settings?.lat_alerts?.frequency ?? 'daily'
    form.lat_waitlist_reminders = u.settings?.lat_waitlist_reminders !== false
  },
  { immediate: true }
)

const hasPaid = computed(() => {
  const status = authStore.user?.settings?.lat_payment?.status
  return status === 'paid' || status === 'concession'
})

const feeFormatted = computed(() => (branding.fee.amountPence / 100).toFixed(2))

/* Profile photo */
const uploadingPhoto = ref(false)
const photoAttachments = ref([])
const photoCacheBust = ref(Date.now())

const profilePhotoUrl = computed(() => {
  if (authStore.user?.profile?.externaluid) {
    return authStore.user.profile.path
  } else if (authStore.user?.profile?.path) {
    return `${authStore.user.profile.path}?bust=${photoCacheBust.value}`
  }
  return null
})

watch(
  photoAttachments,
  async (newVal) => {
    uploadingPhoto.value = false
    if (newVal?.length && authStore.user?.id) {
      try {
        // The OurUploader has already POSTed /image with imgtype=User but
        // did NOT include the parent ID, so the row's userid ends up NULL.
        // Re-post the same image with `user: <id>` so the Go server's
        // resolveParentID() (which reads `user` for type=User) links it to
        // the user. This mirrors Freegle's ProfileSection.vue pattern.
        await imageStore.post({
          externaluid: newVal[0].ouruid,
          externalmods: newVal[0].externalmods,
          imgtype: 'User',
          user: authStore.user.id,
        })
        await authStore.fetchUser()
        photoCacheBust.value = Date.now()
      } catch (err) {
        console.error('Failed to save profile photo:', err)
      }
    }
  },
  { deep: true }
)

/* Account details save */
const savingProfile = ref(false)
const profileError = ref('')
const profileSuccess = ref(false)

async function saveProfile() {
  savingProfile.value = true
  profileError.value = ''
  profileSuccess.value = false
  try {
    await api.user.save({
      displayname: form.displayname,
      aboutme: form.aboutme,
    })
    await api.session.save({
      settings: {
        ...(authStore.user?.settings ?? {}),
        lat_role: form.lat_role || undefined,
      },
    })
    await authStore.fetchUser()
    profileSuccess.value = true
    setTimeout(() => {
      profileSuccess.value = false
    }, 3000)
  } catch {
    profileError.value = 'Could not save changes. Please try again.'
  } finally {
    savingProfile.value = false
  }
}

/* Settings (alerts/radius/reminders) save */
const savingSettings = ref(false)
const settingsError = ref('')
const settingsSuccess = ref(false)

async function saveSettings() {
  savingSettings.value = true
  settingsError.value = ''
  settingsSuccess.value = false
  try {
    await api.session.save({
      settings: {
        ...(authStore.user?.settings ?? {}),
        lat_travelRadius: milesToKm(parseFloat(form.lat_travelRadius)),
        lat_alerts: {
          enabled: form.lat_alerts_enabled,
          frequency: form.lat_alerts_frequency,
        },
        lat_waitlist_reminders: form.lat_waitlist_reminders,
      },
    })
    await authStore.fetchUser()
    settingsSuccess.value = true
    setTimeout(() => {
      settingsSuccess.value = false
    }, 3000)
  } catch {
    settingsError.value = 'Could not save settings. Please try again.'
  } finally {
    savingSettings.value = false
  }
}

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

/* Password change */
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
</script>

<style scoped>
.settings-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
  padding: 40px 16px;
}

.settings-container {
  max-width: 600px;
  margin: 0 auto;
}

.page-title {
  font-family: var(--lat-font-heading);
  font-size: 1.8rem;
  color: var(--lat-color-text);
  margin: 0 0 28px;
}

.settings-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  padding: 28px;
  margin-bottom: 20px;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--lat-color-text);
  margin: 0 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.card-desc {
  font-size: 0.87rem;
  color: var(--lat-color-text-muted);
  margin: 0 0 20px;
  line-height: 1.5;
}

.photo-section {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.photo-display {
  flex-shrink: 0;
}

.profile-photo {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--lat-color-surface);
}

.profile-photo-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #aaa;
}

.photo-actions {
  flex: 1;
  min-width: 200px;
}

.uploader-wrapper {
  width: 100%;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toggle-info strong {
  font-size: 0.92rem;
  color: var(--lat-color-text);
  display: block;
}

.toggle-note {
  font-size: 0.8rem;
  color: var(--lat-color-text-muted);
  margin: 2px 0 0;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  position: absolute;
  inset: 0;
  background: #ccc;
  border-radius: 24px;
  transition: background 0.2s;
}

.toggle-track::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch input:checked + .toggle-track {
  background: var(--lat-color-primary);
}

.toggle-switch input:checked + .toggle-track::before {
  transform: translateX(20px);
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

.current-email {
  font-size: 0.95rem;
  color: var(--lat-color-text);
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  opacity: 0.9;
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

.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-3 {
  margin-top: 16px;
}
.mt-4 {
  margin-top: 24px;
}

.text-muted {
  color: var(--lat-color-text-muted);
}

.text-center {
  text-align: center;
}

.py-5 {
  padding-top: 48px;
  padding-bottom: 48px;
}

.settings-links {
  margin-top: 24px;
  text-align: center;
}

.text-link {
  color: var(--lat-color-primary);
  font-size: 0.9rem;
  text-decoration: none;
}

.text-link:hover {
  text-decoration: underline;
}
</style>
