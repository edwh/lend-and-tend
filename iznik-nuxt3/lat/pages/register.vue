<template>
  <div class="auth-page" :style="{ backgroundColor: branding.colors.background }">
    <div class="auth-container">
      <!-- Step 1: Email & Password Registration -->
      <div v-if="currentStep === 1" class="auth-card">
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
              <NuxtLink to="/login" :style="{ color: branding.colors.primary }">
                Log in
              </NuxtLink>
            </p>
          </div>
        </div>
      </div>

      <!-- Step 2: Complete Profile -->
      <div v-if="currentStep === 2" class="auth-card">
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
              <label class="form-label">What are you looking to do?</label>
              <p class="form-hint">You can select one or both.</p>
              <div class="role-toggles">
                <label class="role-toggle-row" :class="{ 'toggle-active-lender': step2Form.isLender }">
                  <div class="role-toggle-text">
                    <span class="role-toggle-icon">{{ branding.map.lenderIcon }}</span>
                    <div>
                      <strong>Share my garden</strong>
                      <span class="role-desc">I have garden space I'd like someone to tend</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="toggle-switch"
                    :class="{ 'toggle-on': step2Form.isLender }"
                    :style="step2Form.isLender ? { backgroundColor: branding.colors.lenderText } : {}"
                    @click="step2Form.isLender = !step2Form.isLender"
                    :aria-pressed="step2Form.isLender"
                  >
                    <span class="toggle-thumb" />
                  </button>
                </label>

                <label class="role-toggle-row" :class="{ 'toggle-active-tender': step2Form.isTender }">
                  <div class="role-toggle-text">
                    <span class="role-toggle-icon">{{ branding.map.tenderIcon }}</span>
                    <div>
                      <strong>Find a garden to tend</strong>
                      <span class="role-desc">I want to garden in someone else's space</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="toggle-switch"
                    :class="{ 'toggle-on': step2Form.isTender }"
                    :style="step2Form.isTender ? { backgroundColor: branding.colors.tenderText } : {}"
                    @click="step2Form.isTender = !step2Form.isTender"
                    :aria-pressed="step2Form.isTender"
                  >
                    <span class="toggle-thumb" />
                  </button>
                </label>
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
              <label for="travelRadius" class="form-label">How far can you travel?</label>
              <input
                id="travelRadius"
                v-model.number="step2Form.travelRadius"
                type="range"
                class="form-range"
                min="1"
                max="20"
              />
              <div class="range-value">{{ step2Form.travelRadius }} mile{{ step2Form.travelRadius !== 1 ? 's' : '' }}</div>
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
import { useAuthStore } from '~/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const currentStep = ref(1)
const error = ref<string | null>(null)
const isLoading = ref(false)

const step1Form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
})

const step2Form = reactive({
  displayName: '',
  isLender: true,
  isTender: false,
  postcode: '',
  about: '',
  travelRadius: 3,
})

const computedRole = computed(() => {
  if (step2Form.isLender && step2Form.isTender) return 'both'
  if (step2Form.isLender) return 'lender'
  if (step2Form.isTender) return 'tender'
  return null
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

  isLoading.value = true
  try {
    await authStore.register(step1Form.email, step1Form.password)
    currentStep.value = 2
    error.value = null
  } catch (err: any) {
    error.value = err.message || 'Registration failed'
  } finally {
    isLoading.value = false
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

  // Validate role selection
  if (!computedRole.value) {
    error.value = 'Please select at least one role'
    return
  }

  // Validate travel radius
  if (step2Form.travelRadius < 1 || step2Form.travelRadius > 20) {
    error.value = 'Travel radius must be between 1 and 20 miles'
    return
  }

  isLoading.value = true
  try {
    await authStore.updateProfile({
      displayName: step2Form.displayName,
      role: computedRole.value,
      postcode: step2Form.postcode,
      about: step2Form.about,
      travelRadius: step2Form.travelRadius,
    })
    await router.push('/map')
  } catch (err: any) {
    error.value = err.message || 'Profile update failed'
  } finally {
    isLoading.value = false
  }
}

definePageMeta({ layout: 'default' })
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: var(--lat-font-body);
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
}

.auth-header h1 {
  font-family: var(--lat-font-heading);
  font-size: 32px;
  margin-bottom: 8px;
  font-weight: 700;
}

.auth-header .tagline {
  font-size: 14px;
  color: var(--lat-color-text-muted);
  margin: 0;
}

.auth-form h2 {
  font-size: 24px;
  margin-bottom: 24px;
  color: var(--lat-color-text);
  font-weight: 600;
}

.auth-form form input,
.auth-form form textarea {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 14px;
}

.auth-form form input:focus,
.auth-form form textarea:focus {
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 3px rgba(107, 158, 60, 0.1);
}

.auth-form .btn {
  border: none;
  border-radius: 4px;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
}

.auth-form .btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-form .btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.auth-form .btn-outline-secondary {
  border: 1px solid #ddd;
  color: var(--lat-color-text);
}

.auth-form .btn-outline-secondary:not(:disabled):hover {
  background-color: #f5f5f5;
}

.form-hint {
  font-size: 13px;
  color: var(--lat-color-text-muted);
  margin: -8px 0 12px 0;
}

.role-toggles {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  background: white;
}

.toggle-active-lender {
  border-color: var(--lat-color-lender-text);
  background: var(--lat-color-lender-bg);
}

.toggle-active-tender {
  border-color: var(--lat-color-tender-text);
  background: var(--lat-color-tender-bg);
}

.role-toggle-text {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.role-toggle-icon {
  font-size: 26px;
  flex-shrink: 0;
}

.role-toggle-text strong {
  display: block;
  font-size: 14px;
  margin-bottom: 2px;
}

.role-desc {
  display: block;
  font-size: 12px;
  color: var(--lat-color-text-muted);
  font-weight: 400;
}

/* iOS-style toggle switch */
.toggle-switch {
  flex-shrink: 0;
  width: 48px;
  height: 28px;
  border-radius: 14px;
  background: #ccc;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  margin-left: 12px;
  padding: 0;
}

.toggle-switch.toggle-on {
  background: var(--lat-color-primary);
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s;
}

.toggle-on .toggle-thumb {
  transform: translateX(20px);
}

.range-value {
  margin-top: 8px;
  font-size: 14px;
  color: var(--lat-color-text-muted);
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
}

.text-center a {
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.3s;
}

.text-center a:hover {
  opacity: 0.8;
}

.form-range {
  height: 6px;
  border-radius: 3px;
  background: #e9ecef;
  outline: none;
  -webkit-appearance: none;
}

.form-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--lat-color-primary);
  cursor: pointer;
  transition: all 0.3s;
}

.form-range::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(107, 158, 60, 0.4);
}

.form-range::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--lat-color-primary);
  cursor: pointer;
  border: none;
  transition: all 0.3s;
}

.form-range::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(107, 158, 60, 0.4);
}
</style>
