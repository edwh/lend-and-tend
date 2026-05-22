<template>
  <div class="profile-page">
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12">
          <h1 class="mb-4">My Profile</h1>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="row mb-3">
        <div class="col-12">
          <div class="alert alert-danger alert-dismissible fade show" role="alert">
            {{ error }}
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="alert"
              aria-label="Close"
              @click="error = null"
            />
          </div>
        </div>
      </div>

      <!-- Success Alert -->
      <div v-if="successMessage" class="row mb-3">
        <div class="col-12">
          <div class="alert alert-success alert-dismissible fade show" role="alert">
            {{ successMessage }}
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="alert"
              aria-label="Close"
              @click="successMessage = null"
            />
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="row mb-4">
        <div class="col-12">
          <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button
                id="my-details-tab"
                class="nav-link"
                :class="{ active: activeTab === 'details' }"
                type="button"
                role="tab"
                aria-controls="my-details"
                :aria-selected="activeTab === 'details'"
                @click="activeTab = 'details'"
              >
                My Details
              </button>
            </li>
            <li v-if="userRole === 'lender' || userRole === 'both'" class="nav-item" role="presentation">
              <button
                id="my-lending-tab"
                class="nav-link"
                :class="{ active: activeTab === 'garden' }"
                type="button"
                role="tab"
                aria-controls="my-lending"
                :aria-selected="activeTab === 'garden'"
                @click="activeTab = 'garden'"
              >
                My Lending
              </button>
            </li>
            <li v-if="userRole === 'tender' || userRole === 'both'" class="nav-item" role="presentation">
              <button
                id="my-tending-tab"
                class="nav-link"
                :class="{ active: activeTab === 'preferences' }"
                type="button"
                role="tab"
                aria-controls="my-tending"
                :aria-selected="activeTab === 'preferences'"
                @click="activeTab = 'preferences'"
              >
                My Tending
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- My Details Tab -->
        <div
          id="my-details"
          class="tab-pane fade"
          :class="{ 'show active': activeTab === 'details' }"
          role="tabpanel"
          aria-labelledby="my-details-tab"
        >
          <div class="row">
            <div class="col-lg-8">
              <div class="card border-0 shadow-sm">
                <div class="card-body p-4">
                  <form @submit.prevent="submitProfileUpdate">
                    <!-- Role Badge -->
                    <div class="mb-4">
                      <label class="form-label fw-bold">Your Role</label>
                      <div class="d-flex gap-2 align-items-center">
                        <span
                          class="badge fs-6 px-3 py-2"
                          :style="getRoleBadgeStyle()"
                        >
                          {{ getRoleLabel() }}
                        </span>
                      </div>
                      <small class="text-muted d-block mt-2">
                        Role set during registration. Visit join page to change role.
                      </small>
                    </div>

                    <!-- Avatar & Display Name -->
                    <div class="row mb-4">
                      <div class="col-md-auto mb-3 mb-md-0">
                        <div class="avatar-placeholder"
                          :style="{ backgroundColor: branding.colors.primary }"
                        >
                          {{ getInitials() }}
                        </div>
                      </div>
                      <div class="col-md">
                        <div class="mb-3">
                          <label for="displayName" class="form-label">Display Name</label>
                          <input
                            id="displayName"
                            v-model="formData.displayName"
                            type="text"
                            class="form-control"
                            placeholder="Your name as others will see it"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <!-- About -->
                    <div class="mb-4">
                      <label for="about" class="form-label">About You</label>
                      <textarea
                        id="about"
                        v-model="formData.about"
                        class="form-control"
                        rows="4"
                        placeholder="Tell other gardeners about yourself (hobbies, gardening experience, etc.)"
                      />
                      <small class="text-muted d-block mt-1">Optional</small>
                    </div>

                    <!-- Postcode -->
                    <div class="mb-4">
                      <label for="postcode" class="form-label">Postcode</label>
                      <input
                        id="postcode"
                        v-model="formData.postcode"
                        type="text"
                        class="form-control"
                        placeholder="e.g., B1 1AA"
                        required
                      />
                      <small class="text-muted d-block mt-1">
                        We use this to find local matches near you.
                      </small>
                    </div>

                    <!-- Travel Radius -->
                    <div class="mb-4">
                      <label for="travelRadius" class="form-label">
                        Travel Radius: <strong>{{ formData.travelRadius }} mile{{ formData.travelRadius !== 1 ? 's' : '' }}</strong>
                      </label>
                      <input
                        id="travelRadius"
                        v-model.number="formData.travelRadius"
                        type="range"
                        class="form-range"
                        min="1"
                        max="20"
                        step="1"
                      />
                      <small class="text-muted d-block mt-1">
                        How far can you travel? (1–20 miles)
                      </small>
                    </div>

                    <!-- Submit Button -->
                    <div class="d-grid gap-2 pt-3">
                      <button
                        type="submit"
                        class="btn btn-lg"
                        :style="{ backgroundColor: branding.colors.primary, color: 'white' }"
                        :disabled="isLoading"
                      >
                        <span v-if="!isLoading">Save Changes</span>
                        <span v-else>
                          <span
                            class="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          />
                          Saving...
                        </span>
                      </button>
                    </div>
                  </form>

                  <!-- Change Password -->
                  <hr class="my-4" />
                  <h6 class="fw-bold mb-3">Change Password</h6>
                  <div v-if="passwordSuccess" class="alert alert-success py-2 mb-3">Password changed.</div>
                  <div v-if="passwordError" class="alert alert-danger py-2 mb-3">{{ passwordError }}</div>
                  <form @submit.prevent="changePassword">
                    <div class="mb-3">
                      <label for="currentPassword" class="form-label">Current password</label>
                      <input
                        id="currentPassword"
                        v-model="pwForm.current"
                        type="password"
                        class="form-control"
                        autocomplete="current-password"
                        required
                      />
                    </div>
                    <div class="mb-3">
                      <label for="newPassword" class="form-label">New password</label>
                      <input
                        id="newPassword"
                        v-model="pwForm.newPw"
                        type="password"
                        class="form-control"
                        autocomplete="new-password"
                        minlength="8"
                        required
                      />
                    </div>
                    <div class="mb-3">
                      <label for="confirmPassword" class="form-label">Confirm new password</label>
                      <input
                        id="confirmPassword"
                        v-model="pwForm.confirm"
                        type="password"
                        class="form-control"
                        autocomplete="new-password"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      class="btn btn-outline-secondary"
                      :disabled="pwChanging"
                    >
                      {{ pwChanging ? 'Changing…' : 'Change Password' }}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <!-- Info Panel (Desktop) -->
            <div class="col-lg-4 d-none d-lg-block">
              <div class="card border-0 shadow-sm bg-light">
                <div class="card-body">
                  <h6 class="card-title fw-bold mb-3">Profile Tips</h6>
                  <ul class="list-unstyled small">
                    <li class="mb-2">
                      <span class="text-success">✓</span> A complete profile helps us find better matches
                    </li>
                    <li class="mb-2">
                      <span class="text-success">✓</span> Share a bit about yourself to build trust
                    </li>
                    <li class="mb-2">
                      <span class="text-success">✓</span> An accurate postcode ensures local matches
                    </li>
                    <li class="mb-2">
                      <span class="text-success">✓</span> Your email is never shown publicly
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- My Garden Tab -->
        <div
          v-if="userRole === 'lender' || userRole === 'both'"
          id="my-garden"
          class="tab-pane fade"
          :class="{ 'show active': activeTab === 'garden' }"
          role="tabpanel"
          aria-labelledby="my-garden-tab"
        >
          <div class="row">
            <div class="col-lg-8">
              <div class="card border-0 shadow-sm">
                <div class="card-body p-4">
                  <h5 class="card-title mb-3">Your Garden Details</h5>
                  <p class="text-muted mb-3">
                    Tell potential tenders about your garden space so we can find the right match.
                  </p>

                  <div v-if="gardenSaved" class="alert alert-success mb-3 py-2">Garden details saved!</div>
                  <div v-if="gardenError" class="alert alert-danger mb-3 py-2">{{ gardenError }}</div>

                  <form @submit.prevent="saveGardenProfile">
                    <div class="mb-3">
                      <label class="form-label">Garden size</label>
                      <div class="d-flex gap-2 flex-wrap">
                        <button
                          v-for="opt in [['small','Small (up to 20m²)'],['medium','Medium (20–60m²)'],['large','Large (60m²+)']]"
                          :key="opt[0]"
                          type="button"
                          class="btn btn-sm"
                          :class="gardenForm.gardenSize === opt[0] ? 'btn-success' : 'btn-outline-secondary'"
                          @click="gardenForm.gardenSize = opt[0]"
                        >{{ opt[1] }}</button>
                      </div>
                    </div>

                    <div class="mb-3">
                      <label class="form-label">Sun exposure</label>
                      <div class="d-flex gap-2 flex-wrap">
                        <button
                          v-for="opt in [['full_sun','Full sun'],['partial_shade','Part shade'],['full_shade','Full shade']]"
                          :key="opt[0]"
                          type="button"
                          class="btn btn-sm"
                          :class="gardenForm.sunExposure === opt[0] ? 'btn-success' : 'btn-outline-secondary'"
                          @click="gardenForm.sunExposure = opt[0]"
                        >{{ opt[1] }}</button>
                      </div>
                    </div>

                    <div class="mb-3">
                      <label class="form-label">What kind of arrangement are you open to?</label>
                      <div class="d-flex gap-2 flex-wrap">
                        <button
                          v-for="opt in [['exchange_tasks','Exchange tasks'],['goodwill','Goodwill only'],['flexible','Flexible']]"
                          :key="opt[0]"
                          type="button"
                          class="btn btn-sm"
                          :class="gardenForm.arrangementType === opt[0] ? 'btn-success' : 'btn-outline-secondary'"
                          @click="gardenForm.arrangementType = opt[0]"
                        >{{ opt[1] }}</button>
                      </div>
                    </div>

                    <div class="mb-3 form-check">
                      <input id="waterAccess" v-model="gardenForm.waterAccess" type="checkbox" class="form-check-input" />
                      <label for="waterAccess" class="form-check-label">Water access available</label>
                    </div>

                    <div class="mb-3">
                      <label for="gardenDesc" class="form-label">Describe your garden</label>
                      <textarea
                        id="gardenDesc"
                        v-model="gardenForm.description"
                        class="form-control"
                        rows="4"
                        placeholder="Tell tenders what your garden is like, what you'd like grown, any restrictions..."
                      />
                    </div>

                    <button
                      type="submit"
                      class="btn"
                      :style="{ backgroundColor: branding.colors.primary, color: 'white' }"
                      :disabled="gardenSaving"
                    >
                      {{ gardenSaving ? 'Saving…' : 'Save Garden Details' }}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- My Preferences Tab -->
        <div
          v-if="userRole === 'tender' || userRole === 'both'"
          id="my-preferences"
          class="tab-pane fade"
          :class="{ 'show active': activeTab === 'preferences' }"
          role="tabpanel"
          aria-labelledby="my-preferences-tab"
        >
          <div class="row">
            <div class="col-lg-8">
              <div class="card border-0 shadow-sm">
                <div class="card-body p-4">
                  <h5 class="card-title mb-3">Your Tender Preferences</h5>
                  <p class="text-muted mb-3">
                    Help us find gardens that suit what you want to grow.
                  </p>

                  <div v-if="tenderSaved" class="alert alert-success mb-3 py-2">Preferences saved!</div>
                  <div v-if="tenderError" class="alert alert-danger mb-3 py-2">{{ tenderError }}</div>

                  <form @submit.prevent="saveTenderProfile">
                    <div class="mb-3">
                      <label class="form-label">What do you want to grow? (select all that apply)</label>
                      <div class="d-flex gap-2 flex-wrap">
                        <button
                          v-for="interest in ['Vegetables','Fruit','Herbs','Flowers','Wildlife garden','Permaculture']"
                          :key="interest"
                          type="button"
                          class="btn btn-sm"
                          :class="tenderForm.growingInterestsArray.includes(interest) ? 'btn-success' : 'btn-outline-secondary'"
                          @click="toggleInterest(interest)"
                        >{{ interest }}</button>
                      </div>
                    </div>

                    <div class="mb-3">
                      <label class="form-label">Which days can you garden?</label>
                      <div class="d-flex gap-2 flex-wrap">
                        <button
                          v-for="day in ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']"
                          :key="day"
                          type="button"
                          class="btn btn-sm"
                          :class="tenderForm.availableDaysArray.includes(day) ? 'btn-success' : 'btn-outline-secondary'"
                          @click="toggleDay(day)"
                        >{{ day }}</button>
                      </div>
                    </div>

                    <div class="mb-3">
                      <label for="tenderDesc" class="form-label">About your gardening</label>
                      <textarea
                        id="tenderDesc"
                        v-model="tenderForm.description"
                        class="form-control"
                        rows="3"
                        placeholder="Tell lenders about your experience, what you'd like to grow, your goals..."
                      />
                    </div>

                    <button
                      type="submit"
                      class="btn"
                      :style="{ backgroundColor: branding.colors.primary, color: 'white' }"
                      :disabled="tenderSaving"
                    >
                      {{ tenderSaving ? 'Saving…' : 'Save Preferences' }}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import branding from '~/branding.config'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const authStore = useAuthStore()
const activeTab = ref<'details' | 'garden' | 'preferences'>('details')
const isLoading = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const formData = ref({
  displayName: '',
  about: '',
  postcode: '',
  travelRadius: 10,
})

const userRole = computed(() => authStore.latRole || 'both')

// Load current user data — merged with garden/tender load below

function getInitials(): string {
  const name = authStore.displayName || ''
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRoleLabel(): string {
  const role = authStore.latRole || 'both'
  return branding.roles[role as keyof typeof branding.roles]?.labelShort || 'Both'
}

function getRoleBadgeStyle() {
  const role = authStore.latRole || 'both'
  if (role === 'lender') {
    return {
      backgroundColor: branding.colors.lenderBg,
      color: branding.colors.lenderText,
    }
  } else if (role === 'tender') {
    return {
      backgroundColor: branding.colors.tenderBg,
      color: branding.colors.tenderText,
    }
  }
  return {
    backgroundColor: branding.colors.primaryLight,
    color: 'white',
  }
}

// ── Garden profile ───────────────────────────────────────────────────────────
const gardenForm = ref({
  gardenSize: '',
  sunExposure: '',
  waterAccess: false,
  arrangementType: '',
  description: '',
})
const gardenSaving = ref(false)
const gardenSaved = ref(false)
const gardenError = ref<string | null>(null)

const tenderForm = ref({
  growingInterestsArray: [] as string[],
  availableDaysArray: [] as string[],
  description: '',
})
const tenderSaving = ref(false)
const tenderSaved = ref(false)
const tenderError = ref<string | null>(null)

// ── Change password ───────────────────────────────────────────────────────────
const pwForm = ref({ current: '', newPw: '', confirm: '' })
const pwChanging = ref(false)
const passwordSuccess = ref(false)
const passwordError = ref<string | null>(null)

async function changePassword() {
  passwordError.value = null
  passwordSuccess.value = false
  if (pwForm.value.newPw !== pwForm.value.confirm) {
    passwordError.value = 'New passwords do not match.'
    return
  }
  if (pwForm.value.newPw.length < 8) {
    passwordError.value = 'New password must be at least 8 characters.'
    return
  }
  pwChanging.value = true
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.APIv2}/lat/user/password`, {
      method: 'POST',
      credentials: 'include',
      headers: latUserStore.authHeaders(),
      body: { currentPassword: pwForm.value.current, newPassword: pwForm.value.newPw },
    })
    passwordSuccess.value = true
    pwForm.value = { current: '', newPw: '', confirm: '' }
    setTimeout(() => { passwordSuccess.value = false }, 5000)
  } catch (err: any) {
    passwordError.value = err.data?.error || err.message || 'Failed to change password.'
  } finally {
    pwChanging.value = false
  }
}

function toggleInterest(interest: string) {
  const idx = tenderForm.value.growingInterestsArray.indexOf(interest)
  if (idx === -1) tenderForm.value.growingInterestsArray.push(interest)
  else tenderForm.value.growingInterestsArray.splice(idx, 1)
}

function toggleDay(day: string) {
  const idx = tenderForm.value.availableDaysArray.indexOf(day)
  if (idx === -1) tenderForm.value.availableDaysArray.push(day)
  else tenderForm.value.availableDaysArray.splice(idx, 1)
}

async function saveGardenProfile() {
  gardenSaving.value = true
  gardenSaved.value = false
  gardenError.value = null
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.APIv2}/lat/lender/profile`, {
      method: 'POST',
      credentials: 'include',
      headers: latUserStore.authHeaders(),
      body: gardenForm.value,
    })
    gardenSaved.value = true
    setTimeout(() => { gardenSaved.value = false }, 4000)
  } catch (err: any) {
    gardenError.value = err.data?.error || err.message || 'Failed to save'
  } finally {
    gardenSaving.value = false
  }
}

async function saveTenderProfile() {
  tenderSaving.value = true
  tenderSaved.value = false
  tenderError.value = null
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.APIv2}/lat/tender/profile`, {
      method: 'POST',
      credentials: 'include',
      headers: latUserStore.authHeaders(),
      body: {
        growingInterests: tenderForm.value.growingInterestsArray.join(','),
        availableDays: tenderForm.value.availableDaysArray.join(','),
        description: tenderForm.value.description,
      },
    })
    tenderSaved.value = true
    setTimeout(() => { tenderSaved.value = false }, 4000)
  } catch (err: any) {
    tenderError.value = err.data?.error || err.message || 'Failed to save'
  } finally {
    tenderSaving.value = false
  }
}

// Load existing garden/tender profiles on mount
onMounted(async () => {
  // Load base profile form
  if (latUserStore.user) {
    formData.value = {
      displayName: latUserStore.user.displayName || '',
      about: latUserStore.user.about || '',
      postcode: latUserStore.user.postcode || '',
      travelRadius: latUserStore.user.travelRadius || 3,
    }
  }

  const config = useRuntimeConfig()
  const headers = latUserStore.authHeaders()
  const role = latUserStore.user?.role || ''
  if (role === 'lender' || role === 'both') {
    try {
      const lp: any = await $fetch(`${config.public.APIv2}/lat/lender/profile`, { credentials: 'include', headers })
      if (lp) {
        gardenForm.value.gardenSize = lp.gardenSize || ''
        gardenForm.value.sunExposure = lp.sunExposure || ''
        gardenForm.value.waterAccess = lp.waterAccess || false
        gardenForm.value.arrangementType = lp.arrangementType || ''
        gardenForm.value.description = lp.description || ''
      }
    } catch { /* 404 = no profile yet, ignore */ }
  }
  if (role === 'tender' || role === 'both') {
    try {
      const tp: any = await $fetch(`${config.public.APIv2}/lat/tender/profile`, { credentials: 'include', headers })
      if (tp) {
        tenderForm.value.growingInterestsArray = tp.growingInterests ? tp.growingInterests.split(',') : []
        tenderForm.value.availableDaysArray = tp.availableDays ? tp.availableDays.split(',') : []
        tenderForm.value.description = tp.description || ''
      }
    } catch { /* 404 = no profile yet, ignore */ }
  }
})

async function submitProfileUpdate() {
  error.value = null
  successMessage.value = null
  isLoading.value = true

  try {
    await latUserStore.completeProfile({
      displayName: formData.value.displayName,
      role: latUserStore.user?.role || 'both',
      postcode: formData.value.postcode,
      about: formData.value.about,
      travelRadius: formData.value.travelRadius,
    })

    successMessage.value = 'Profile updated successfully!'

    // Clear message after 5 seconds
    setTimeout(() => {
      successMessage.value = null
    }, 5000)
  } catch (err: any) {
    error.value = err.message || 'Failed to update profile. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.profile-page {
  background-color: v-bind('branding.colors.background');
  min-height: 100vh;
}

.avatar-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
  font-family: v-bind('branding.fonts.heading');
}

.nav-tabs .nav-link {
  color: v-bind('branding.colors.textMuted');
  border: none;
  border-bottom: 3px solid transparent;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-tabs .nav-link:hover {
  color: v-bind('branding.colors.primary');
  border-bottom-color: v-bind('branding.colors.primaryLight');
}

.nav-tabs .nav-link.active {
  color: v-bind('branding.colors.primary');
  border-bottom-color: v-bind('branding.colors.primary');
  background-color: transparent;
}

.card {
  border-radius: 8px;
}

.form-control,
.form-select,
.form-range {
  border-color: #ddd;
  border-radius: 6px;
}

.form-control:focus,
.form-select:focus {
  border-color: v-bind('branding.colors.primary');
  box-shadow: 0 0 0 0.2rem rgba(107, 158, 60, 0.25);
}

.btn {
  border-radius: 6px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.badge {
  font-family: v-bind('branding.fonts.body');
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .avatar-placeholder {
    width: 80px;
    height: 80px;
    font-size: 2rem;
  }

  .container-fluid {
    padding: 1rem;
  }

  h1 {
    font-size: 1.75rem;
  }
}
</style>
