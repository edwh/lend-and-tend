<template>
  <Teleport to="body">
    <div v-if="isOpen" class="auth-modal-backdrop" @click.self="close">
      <div class="auth-modal" role="dialog" aria-modal="true">
        <button class="auth-modal-close" aria-label="Close" @click="close">
          <VIcon :icon="['fas', 'times']" />
        </button>

        <!-- LOGIN -->
        <template v-if="currentView === 'login'">
          <div class="auth-modal-header">
            <h2>Log in to {{ branding.siteName }}</h2>
          </div>

          <div v-if="error" class="auth-alert">{{ error }}</div>

          <form @submit.prevent="submitLogin">
            <div class="auth-field">
              <label for="am-login-email">Email</label>
              <input id="am-login-email" v-model="loginForm.email" type="email" placeholder="you@example.com" required />
            </div>
            <div class="auth-field">
              <label for="am-login-pw">Password</label>
              <input id="am-login-pw" v-model="loginForm.password" type="password" placeholder="Your password" required />
            </div>
            <button type="submit" class="auth-btn-primary" :disabled="isLoading">
              {{ isLoading ? 'Logging in...' : 'Log in' }}
            </button>
          </form>

          <p class="auth-switch">
            Don't have an account?
            <button class="auth-link-btn" @click="currentView = 'register-step1'">Sign up</button>
          </p>
        </template>

        <!-- REGISTER STEP 1: email + password -->
        <template v-else-if="currentView === 'register-step1'">
          <div class="auth-modal-header">
            <h2>Join {{ branding.siteName }}</h2>
            <p class="auth-modal-sub">Share a garden, grow good things</p>
          </div>

          <div v-if="error" class="auth-alert">{{ error }}</div>

          <form @submit.prevent="submitRegisterStep1">
            <div class="auth-field">
              <label for="am-reg-email">Email address</label>
              <input id="am-reg-email" v-model="regForm.email" type="email" placeholder="you@example.com" required />
            </div>
            <div class="auth-field">
              <label for="am-reg-pw">Password</label>
              <input id="am-reg-pw" v-model="regForm.password" type="password" placeholder="At least 8 characters" required />
              <small>At least 8 characters</small>
            </div>
            <div class="auth-field">
              <label for="am-reg-pw2">Confirm password</label>
              <input id="am-reg-pw2" v-model="regForm.confirmPassword" type="password" placeholder="Confirm your password" required />
            </div>
            <button type="submit" class="auth-btn-primary" :disabled="isLoading">
              {{ isLoading ? 'Creating account...' : 'Continue' }}
            </button>
          </form>

          <p class="auth-switch">
            Already have an account?
            <button class="auth-link-btn" @click="currentView = 'login'">Log in</button>
          </p>
        </template>

        <!-- REGISTER STEP 2: profile completion -->
        <template v-else-if="currentView === 'register-step2'">
          <div class="auth-modal-header">
            <h2>Complete your profile</h2>
          </div>

          <div v-if="error" class="auth-alert">{{ error }}</div>

          <form @submit.prevent="submitRegisterStep2">
            <div class="auth-field">
              <label for="am-name">Your name</label>
              <input id="am-name" v-model="profileForm.displayName" type="text" placeholder="How should we call you?" required />
            </div>

            <div class="auth-field">
              <label>What are you looking to do?</label>
              <div class="role-toggles">
                <label class="role-row" :class="{ 'role-active-lender': profileForm.isLender }">
                  <div class="role-text">
                    <span class="role-icon">{{ branding.map.lenderIcon }}</span>
                    <div>
                      <strong>Share my garden</strong>
                      <span class="role-desc">I have space I'd like someone to tend</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="toggle-switch"
                    :class="{ 'toggle-on': profileForm.isLender }"
                    @click="profileForm.isLender = !profileForm.isLender"
                  >
                    <span class="toggle-thumb" />
                  </button>
                </label>

                <label class="role-row" :class="{ 'role-active-tender': profileForm.isTender }">
                  <div class="role-text">
                    <span class="role-icon">{{ branding.map.tenderIcon }}</span>
                    <div>
                      <strong>Find a garden to tend</strong>
                      <span class="role-desc">I want to garden in someone else's space</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="toggle-switch"
                    :class="{ 'toggle-on': profileForm.isTender }"
                    @click="profileForm.isTender = !profileForm.isTender"
                  >
                    <span class="toggle-thumb" />
                  </button>
                </label>
              </div>
            </div>

            <div class="auth-field">
              <label for="am-postcode">UK postcode</label>
              <input id="am-postcode" v-model="profileForm.postcode" type="text" placeholder="e.g. SW1A 1AA" required />
            </div>

            <div class="auth-field">
              <label for="am-about">About you (optional)</label>
              <textarea id="am-about" v-model="profileForm.about" placeholder="Tell us a bit about yourself" rows="2" />
            </div>

            <button type="submit" class="auth-btn-primary" :disabled="isLoading">
              {{ isLoading ? 'Saving...' : 'Get started' }}
            </button>
            <button type="button" class="auth-btn-back" :disabled="isLoading" @click="currentView = 'register-step1'">
              Back
            </button>
          </form>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { branding } from '~/branding.config'
import { useAuthModal } from '~/composables/useAuthModal'
import { useAuthStore } from '~/stores/auth'

type View = 'login' | 'register-step1' | 'register-step2'

const { isOpen, mode, close } = useAuthModal()
const authStore = useAuthStore()
const router = useRouter()

const currentView = ref<View>('login')
const error = ref<string | null>(null)
const isLoading = ref(false)

const loginForm = reactive({ email: '', password: '' })
const regForm = reactive({ email: '', password: '', confirmPassword: '' })
const profileForm = reactive({
  displayName: '',
  isLender: true,
  isTender: false,
  postcode: '',
  about: '',
})

watch(isOpen, (open) => {
  if (open) {
    currentView.value = mode.value === 'register' ? 'register-step1' : 'login'
    error.value = null
  }
})

async function submitLogin() {
  error.value = null
  isLoading.value = true
  try {
    await authStore.login(loginForm.email, loginForm.password)
    close()
    loginForm.email = ''
    loginForm.password = ''
  } catch (err: any) {
    error.value = err?.data?.error || err.message || 'Login failed'
  } finally {
    isLoading.value = false
  }
}

async function submitRegisterStep1() {
  error.value = null
  if (regForm.password !== regForm.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }
  if (regForm.password.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }
  isLoading.value = true
  try {
    await authStore.register(regForm.email, regForm.password)
    currentView.value = 'register-step2'
    error.value = null
  } catch (err: any) {
    error.value = err?.data?.error || err.message || 'Registration failed'
  } finally {
    isLoading.value = false
  }
}

async function submitRegisterStep2() {
  error.value = null

  if (!profileForm.displayName.trim()) {
    error.value = 'Please enter your name'
    return
  }
  if (!profileForm.postcode.trim()) {
    error.value = 'Please enter your postcode'
    return
  }
  if (!profileForm.isLender && !profileForm.isTender) {
    error.value = 'Please select at least one role'
    return
  }

  isLoading.value = true
  try {
    const role = profileForm.isLender && profileForm.isTender ? 'both'
      : profileForm.isLender ? 'lender'
      : 'tender'

    let lat: number | undefined
    let lng: number | undefined
    try {
      const pc = profileForm.postcode.replace(/\s+/g, '')
      const pcRes = await $fetch<{ status: number; result: { latitude: number; longitude: number } }>(
        `https://api.postcodes.io/postcodes/${pc}`
      )
      if (pcRes.status === 200) {
        lat = pcRes.result.latitude
        lng = pcRes.result.longitude
      }
    } catch {
      /* non-fatal – we'll proceed without coords */
    }

    const currentSettings = authStore.latSettings || {}
    const newSettings = {
      ...currentSettings,
      lat_role: role,
      ...(profileForm.about ? { lat_about: profileForm.about } : {}),
    }

    await authStore.updateProfile({
      fullname: profileForm.displayName,
      settings: newSettings,
      ...(lat !== undefined ? { lat_lat: lat, lat_lng: lng } : {}),
    })

    close()
    router.push('/map')
  } catch (err: any) {
    error.value = err?.data?.error || err.message || 'Profile save failed'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.auth-modal {
  background: #fff;
  border-radius: 10px;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 32px 28px 28px;
  position: relative;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.auth-modal-close {
  position: absolute;
  top: 14px;
  right: 16px;
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #888;
  line-height: 1;
  padding: 4px 6px;
}

.auth-modal-close:hover {
  color: #333;
}

.auth-modal-header {
  margin-bottom: 22px;
}

.auth-modal-header h2 {
  font-family: var(--lat-font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--lat-color-text);
  margin: 0 0 4px;
}

.auth-modal-sub {
  font-size: 0.9rem;
  color: var(--lat-color-text-muted);
  margin: 0;
}

.auth-alert {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 0.875rem;
  margin-bottom: 16px;
}

.auth-field {
  margin-bottom: 16px;
}

.auth-field label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--lat-color-text);
  margin-bottom: 5px;
}

.auth-field input,
.auth-field textarea {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 9px 11px;
  font-size: 0.9rem;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.auth-field input:focus,
.auth-field textarea:focus {
  outline: none;
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 3px rgba(107, 158, 60, 0.12);
}

.auth-field small {
  display: block;
  margin-top: 4px;
  font-size: 0.78rem;
  color: var(--lat-color-text-muted);
}

.auth-btn-primary {
  width: 100%;
  background: var(--lat-color-primary);
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 11px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.auth-btn-primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.auth-btn-primary:not(:disabled):hover {
  opacity: 0.88;
}

.auth-btn-back {
  width: 100%;
  margin-top: 8px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 9px;
  font-size: 0.9rem;
  cursor: pointer;
  color: var(--lat-color-text-muted);
  transition: background 0.15s;
}

.auth-btn-back:hover {
  background: #f5f5f5;
}

.auth-switch {
  text-align: center;
  font-size: 0.875rem;
  color: var(--lat-color-text-muted);
  margin: 18px 0 0;
}

.auth-link-btn {
  background: none;
  border: none;
  color: var(--lat-color-primary);
  font-weight: 600;
  cursor: pointer;
  font-size: inherit;
  padding: 0;
  text-decoration: underline;
}

/* Role toggles */
.role-toggles {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.role-active-lender {
  border-color: var(--lat-color-lender-text);
  background: var(--lat-color-lender-bg);
}

.role-active-tender {
  border-color: var(--lat-color-tender-text);
  background: var(--lat-color-tender-bg);
}

.role-text {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.role-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.role-text strong {
  display: block;
  font-size: 0.875rem;
}

.role-desc {
  display: block;
  font-size: 0.75rem;
  color: var(--lat-color-text-muted);
  font-weight: 400;
}

.toggle-switch {
  flex-shrink: 0;
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background: #ccc;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  margin-left: 10px;
  padding: 0;
}

.toggle-switch.toggle-on {
  background: var(--lat-color-primary);
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s;
}

.toggle-on .toggle-thumb {
  transform: translateX(18px);
}
</style>
