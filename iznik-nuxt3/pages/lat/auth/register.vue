<template>
  <div class="auth-page" :style="{ backgroundColor: branding.colors.background }">
    <div class="auth-container">
      <!-- Step 1: Email & Password Registration -->
      <div v-if="currentStep === 1" class="auth-card">
        <div class="auth-header">
          <h1 :style="{ color: branding.colors.primary }">{{ branding.siteName }}</h1>
          <p class="tagline">{{ branding.tagline }}</p>
        </div>

        <div class="auth-form">
          <h2>Create Your Account</h2>

          <div v-if="error" class="alert alert-danger" role="alert">
            {{ error }}
          </div>

          <form @submit.prevent="submitStep1">
            <div class="mb-3">
              <label for="email" class="form-label">Email Address</label>
              <input
                id="email"
                v-model="step1Form.email"
                type="email"
                class="form-control"
                placeholder="you@example.com"
                required
              />
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Password</label>
              <input
                id="password"
                v-model="step1Form.password"
                type="password"
                class="form-control"
                placeholder="At least 8 characters"
                required
              />
              <small class="form-text text-muted">At least 8 characters</small>
            </div>

            <div class="mb-3">
              <label for="confirmPassword" class="form-label">Confirm Password</label>
              <input
                id="confirmPassword"
                v-model="step1Form.confirmPassword"
                type="password"
                class="form-control"
                placeholder="Confirm your password"
                required
              />
            </div>

            <button
              type="submit"
              class="btn w-100"
              :style="{ backgroundColor: branding.colors.primary, color: branding.colors.background }"
              :disabled="isLoading"
            >
              <span v-if="!isLoading">Continue</span>
              <span v-else>Creating account...</span>
            </button>
          </form>

          <div class="text-center mt-3">
            <p>
              Already have an account?
              <NuxtLink to="/lat/auth/login" :style="{ color: branding.colors.primary }">
                Log in
              </NuxtLink>
            </p>
          </div>
        </div>
      </div>

      <!-- Step 2: Complete Profile -->
      <div v-if="currentStep === 2" class="auth-card">
        <div class="auth-header">
          <h1 :style="{ color: branding.colors.primary }">{{ branding.siteName }}</h1>
          <p class="tagline">{{ branding.tagline }}</p>
        </div>

        <div class="auth-form">
          <h2>Complete Your Profile</h2>

          <div v-if="error" class="alert alert-danger" role="alert">
            {{ error }}
          </div>

          <form @submit.prevent="submitStep2">
            <div class="mb-3">
              <label for="displayName" class="form-label">Display Name</label>
              <input
                id="displayName"
                v-model="step2Form.displayName"
                type="text"
                class="form-control"
                placeholder="Your name"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label">Role</label>
              <div class="role-selector">
                <button
                  type="button"
                  class="role-btn"
                  :class="{ active: step2Form.role === 'lender' }"
                  @click="step2Form.role = 'lender'"
                  :style="
                    step2Form.role === 'lender'
                      ? {
                          backgroundColor: branding.colors.lenderBg,
                          color: branding.colors.lenderText,
                          borderColor: branding.colors.lenderText,
                        }
                      : { borderColor: '#ccc' }
                  "
                >
                  <span class="role-icon">{{ branding.map.lenderIcon }}</span>
                  <span>Lender</span>
                  <span class="role-desc">(I have a garden)</span>
                </button>

                <button
                  type="button"
                  class="role-btn"
                  :class="{ active: step2Form.role === 'tender' }"
                  @click="step2Form.role = 'tender'"
                  :style="
                    step2Form.role === 'tender'
                      ? {
                          backgroundColor: branding.colors.tenderBg,
                          color: branding.colors.tenderText,
                          borderColor: branding.colors.tenderText,
                        }
                      : { borderColor: '#ccc' }
                  "
                >
                  <span class="role-icon">{{ branding.map.tenderIcon }}</span>
                  <span>Tender</span>
                  <span class="role-desc">(I need garden space)</span>
                </button>

                <button
                  type="button"
                  class="role-btn"
                  :class="{ active: step2Form.role === 'both' }"
                  @click="step2Form.role = 'both'"
                  :style="
                    step2Form.role === 'both'
                      ? {
                          backgroundColor: branding.colors.primaryLight,
                          color: branding.colors.text,
                          borderColor: branding.colors.primary,
                        }
                      : { borderColor: '#ccc' }
                  "
                >
                  <span class="role-icon">🌳</span>
                  <span>Both</span>
                  <span class="role-desc">(I can do both)</span>
                </button>
              </div>
            </div>

            <div class="mb-3">
              <label for="postcode" class="form-label">UK Postcode</label>
              <input
                id="postcode"
                v-model="step2Form.postcode"
                type="text"
                class="form-control"
                placeholder="e.g. SW1A 1AA"
                required
              />
            </div>

            <div class="mb-3">
              <label for="about" class="form-label">About You</label>
              <textarea
                id="about"
                v-model="step2Form.about"
                class="form-control"
                placeholder="Tell us a bit about yourself"
                rows="3"
              />
            </div>

            <div class="mb-3">
              <label for="travelRadius" class="form-label">How far can you travel? (km)</label>
              <input
                id="travelRadius"
                v-model.number="step2Form.travelRadius"
                type="range"
                class="form-range"
                min="1"
                max="50"
              />
              <div class="range-value">{{ step2Form.travelRadius }} km</div>
            </div>

            <button
              type="submit"
              class="btn w-100"
              :style="{ backgroundColor: branding.colors.primary, color: branding.colors.background }"
              :disabled="isLoading"
            >
              <span v-if="!isLoading">Complete Profile</span>
              <span v-else>Saving...</span>
            </button>
          </form>

          <button
            type="button"
            class="btn btn-outline-secondary w-100 mt-2"
            @click="currentStep = 1"
            :disabled="isLoading"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { branding } from '~/branding.config'
import { useLatAuth } from '~/composables/useLatAuth'
import { useLatUserStore } from '~/stores/latUser'

const router = useRouter()
const { register, completeProfile, error: authError, isLoading } = useLatAuth()
const store = useLatUserStore()

const currentStep = ref(1)
const error = ref<string | null>(null)

const step1Form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
})

const step2Form = reactive({
  displayName: '',
  role: 'both',
  postcode: '',
  about: '',
  travelRadius: 5,
})

watch(authError, (newError) => {
  error.value = newError
})

const submitStep1 = async () => {
  error.value = null

  // Validate passwords match
  if (step1Form.password !== step1Form.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }

  // Validate password length
  if (step1Form.password.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  const success = await register(step1Form.email, step1Form.password)
  if (success) {
    currentStep.value = 2
    error.value = null
  }
}

const submitStep2 = async () => {
  error.value = null

  // Validate displayName is not empty
  if (!step2Form.displayName.trim()) {
    error.value = 'Display name is required'
    return
  }

  // Validate postcode is not empty
  if (!step2Form.postcode.trim()) {
    error.value = 'Postcode is required'
    return
  }

  // Validate travel radius
  if (step2Form.travelRadius < 1 || step2Form.travelRadius > 50) {
    error.value = 'Travel radius must be between 1 and 50 km'
    return
  }

  const success = await completeProfile({
    displayName: step2Form.displayName,
    role: step2Form.role,
    postcode: step2Form.postcode,
    about: step2Form.about,
    travelRadius: step2Form.travelRadius,
  })

  if (success) {
    // Redirect to map
    await router.push('/lat/map')
  }
}
</script>

<style scoped lang="scss">
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: v-bind('branding.fonts.body');
}

.auth-container {
  width: 100%;
  max-width: 500px;
}

.auth-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 40px 30px;
}

.auth-header {
  text-align: center;
  margin-bottom: 30px;

  h1 {
    font-family: v-bind('branding.fonts.heading');
    font-size: 32px;
    margin-bottom: 8px;
    font-weight: 700;
  }

  .tagline {
    font-size: 14px;
    color: v-bind('branding.colors.textMuted');
    margin: 0;
  }
}

.auth-form {
  h2 {
    font-size: 24px;
    margin-bottom: 24px;
    color: v-bind('branding.colors.text');
    font-weight: 600;
  }

  form {
    input,
    textarea {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px 12px;
      font-size: 14px;

      &:focus {
        border-color: v-bind('branding.colors.primary');
        box-shadow: 0 0 0 3px rgba(107, 158, 60, 0.1);
      }
    }
  }

  .btn {
    border: none;
    border-radius: 4px;
    padding: 12px 16px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  .btn-outline-secondary {
    border: 1px solid #ddd;
    color: v-bind('branding.colors.text');

    &:not(:disabled):hover {
      background-color: #f5f5f5;
    }
  }
}

.role-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.role-btn {
  padding: 16px;
  border: 2px solid;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;

  &.active {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .role-icon {
    font-size: 28px;
  }

  .role-desc {
    font-size: 11px;
    font-weight: 400;
    opacity: 0.7;
    display: block;
  }
}

.range-value {
  margin-top: 8px;
  font-size: 14px;
  color: v-bind('branding.colors.textMuted');
  text-align: center;
}

.alert {
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 4px;
  font-size: 14px;
}

.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.text-center {
  text-align: center;

  a {
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.3s;

    &:hover {
      opacity: 0.8;
    }
  }
}

.form-range {
  height: 6px;
  border-radius: 3px;
  background: #e9ecef;
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: v-bind('branding.colors.primary');
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: scale(1.1);
      box-shadow: 0 0 8px rgba(107, 158, 60, 0.4);
    }
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: v-bind('branding.colors.primary');
    cursor: pointer;
    border: none;
    transition: all 0.3s;

    &:hover {
      transform: scale(1.1);
      box-shadow: 0 0 8px rgba(107, 158, 60, 0.4);
    }
  }
}
</style>
