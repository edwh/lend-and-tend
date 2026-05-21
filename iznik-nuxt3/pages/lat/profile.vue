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
                id="my-garden-tab"
                class="nav-link"
                :class="{ active: activeTab === 'garden' }"
                type="button"
                role="tab"
                aria-controls="my-garden"
                :aria-selected="activeTab === 'garden'"
                @click="activeTab = 'garden'"
              >
                My Garden
              </button>
            </li>
            <li v-if="userRole === 'tender' || userRole === 'both'" class="nav-item" role="presentation">
              <button
                id="my-preferences-tab"
                class="nav-link"
                :class="{ active: activeTab === 'preferences' }"
                type="button"
                role="tab"
                aria-controls="my-preferences"
                :aria-selected="activeTab === 'preferences'"
                @click="activeTab = 'preferences'"
              >
                My Preferences
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
                        We use this to find local matches and estimate distances.
                      </small>
                    </div>

                    <!-- Travel Radius -->
                    <div class="mb-4">
                      <label for="travelRadius" class="form-label">
                        Travel Radius: <strong>{{ formData.travelRadius }} km</strong>
                      </label>
                      <input
                        id="travelRadius"
                        v-model.number="formData.travelRadius"
                        type="range"
                        class="form-range"
                        min="1"
                        max="50"
                        step="1"
                      />
                      <small class="text-muted d-block mt-1">
                        How far are you willing to travel to meet someone? (1–50 km)
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
                  <p class="text-muted mb-4">
                    As a Garden Lender, you can share details about your garden space.
                  </p>
                  <NuxtLink
                    to="/lat/garden/details"
                    class="btn"
                    :style="{ backgroundColor: branding.colors.primary, color: 'white' }"
                  >
                    Edit Garden Details
                  </NuxtLink>
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
                  <p class="text-muted mb-4">
                    As a Garden Tender, you can set preferences for the gardens you'd like to work in.
                  </p>
                  <NuxtLink
                    to="/lat/tender/preferences"
                    class="btn"
                    :style="{ backgroundColor: branding.colors.primary, color: 'white' }"
                  >
                    Edit Tender Preferences
                  </NuxtLink>
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
import { useLatUserStore } from '~/stores/latUser'
import branding from '~/branding.config'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const latUserStore = useLatUserStore()
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

const userRole = computed(() => latUserStore.user?.role || 'both')

// Load current user data
onMounted(async () => {
  if (latUserStore.user) {
    formData.value = {
      displayName: latUserStore.user.displayName || '',
      about: latUserStore.user.about || '',
      postcode: latUserStore.user.postcode || '',
      travelRadius: latUserStore.user.travelRadius || 10,
    }
  }
})

function getInitials(): string {
  const name = latUserStore.user?.displayName || ''
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRoleLabel(): string {
  const role = latUserStore.user?.role || 'both'
  return branding.roles[role as keyof typeof branding.roles]?.labelShort || 'Both'
}

function getRoleBadgeStyle() {
  const role = latUserStore.user?.role || 'both'
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
