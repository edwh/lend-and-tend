<template>
  <Teleport to="body">
    <div v-if="showModal" class="lat-modal-overlay" @click.self="onBackdropClick">
      <div class="lat-modal-dialog" role="dialog" aria-modal="true" :aria-label="signUp ? 'Join Lend & Tend' : 'Sign in'">
        <div class="lat-modal-header">
          <img src="/images/lat/logo.png" class="lat-modal-logo" alt="Lend & Tend" />
          <h2 class="lat-modal-title">{{ signUp ? 'Join Lend & Tend' : 'Welcome back' }}</h2>
          <button class="lat-modal-close" aria-label="Close" @click="hide">✕</button>
        </div>

        <form class="lat-modal-form" @submit.prevent="submitForm">
          <div v-if="signUp" class="field">
            <label for="lat-fullname">Your name</label>
            <input
              id="lat-fullname"
              v-model="fullname"
              type="text"
              autocomplete="name"
              placeholder="Your name"
              :class="{ 'input-error': errors.fullname }"
            />
            <p v-if="errors.fullname" class="field-error">Please enter your name.</p>
          </div>

          <div v-if="signUp" class="field">
            <label for="lat-role">I am joining as a…</label>
            <select
              id="lat-role"
              v-model="role"
              :class="{ 'input-error': errors.role }"
            >
              <option value="">Please select…</option>
              <option value="lender">Garden Lender — I have a garden to share</option>
              <option value="tender">Garden Tender — I want to tend a garden</option>
              <option value="both">Both — I may lend and tend</option>
            </select>
            <p v-if="errors.role" class="field-error">Please tell us why you're joining.</p>
          </div>

          <div class="field">
            <label for="lat-email">Email address</label>
            <input
              id="lat-email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="Email address"
              :class="{ 'input-error': errors.email }"
            />
            <p v-if="errors.email" class="field-error">Please enter a valid email address.</p>
          </div>

          <div class="field">
            <label for="lat-password">Password</label>
            <input
              id="lat-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :autocomplete="signUp ? 'new-password' : 'current-password'"
              :placeholder="signUp ? 'Choose a password' : 'Password'"
              :class="{ 'input-error': errors.password }"
            />
            <p v-if="errors.password" class="field-error">Please enter your password.</p>
          </div>

          <div v-if="loginError" class="alert-danger">{{ loginError }}</div>

          <button type="submit" class="btn-submit" :disabled="submitting">
            {{ submitting ? 'Please wait…' : (signUp ? 'Join Lend & Tend' : 'Log in') }}
          </button>
        </form>

        <div class="lat-modal-footer">
          <p v-if="signUp">
            Already a member?
            <button class="link-btn" @click="switchToLogin">Log in</button>
          </p>
          <p v-else>
            New here?
            <button class="link-btn" @click="switchToSignUp">Join Lend & Tend</button>
            &nbsp;·&nbsp;
            <nuxt-link to="/forgot" class="link-btn" @click="hide">Forgot password?</nuxt-link>
          </p>
        </div>

        <div v-if="signUp" class="lat-modal-terms">
          <label class="consent-label">
            <input v-model="marketingConsent" type="checkbox" />
            We'll keep in touch about what's happening at Lend &amp; Tend.
          </label>
          <p class="terms-note">
            Signing up accepts our
            <nuxt-link to="/terms" target="_blank" @click.stop>Terms</nuxt-link>
            and
            <nuxt-link to="/privacy" target="_blank" @click.stop>Privacy Policy</nuxt-link>.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { LoginError, SignUpError } from '~/api/BaseAPI'
import { useAuthStore } from '~/stores/auth'
import { useMiscStore } from '~/stores/misc'
import Api from '~/api'

const authStore = useAuthStore()
const miscStore = useMiscStore()
const config = useRuntimeConfig()
const router = useRouter()
const route = useRoute()
const api = Api(config)

const fullname = ref('')
const email = ref('')
const password = ref('')
const role = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const loginError = ref(null)
const errors = reactive({ fullname: false, email: false, password: false, role: false })
const showSignUp = ref(false)
const forceSignIn = ref(false)

const marketingConsent = computed({
  get: () => miscStore.marketingConsent ?? true,
  set: (v) => miscStore.setMarketingConsent(v),
})

const loggedIn = computed(() => !!authStore.user)
const forceLogin = computed(() => authStore.forceLogin)
const loggedInEver = computed(() => authStore.loggedInEver)

const signUp = computed(() => {
  if (forceSignIn.value) return false
  return !loggedInEver.value || showSignUp.value
})

const showModal = computed(() => {
  if (loggedIn.value) return false
  return forceLogin.value
})

function hide() {
  authStore.forceLogin = false
}

function onBackdropClick() {
  if (!forceLogin.value) {
    authStore.forceLogin = false
  }
}

function show() {
  authStore.forceLogin = true
}

function showLogin() {
  forceSignIn.value = true
  showSignUp.value = false
  authStore.forceLogin = true
}

function switchToLogin() {
  forceSignIn.value = true
  showSignUp.value = false
  loginError.value = null
  clearErrors()
}

function switchToSignUp() {
  showSignUp.value = true
  forceSignIn.value = false
  loginError.value = null
  clearErrors()
}

function clearErrors() {
  errors.fullname = false
  errors.email = false
  errors.password = false
  errors.role = false
}

function validate() {
  clearErrors()
  let valid = true
  if (signUp.value && !fullname.value.trim()) { errors.fullname = true; valid = false }
  if (!email.value.trim()) { errors.email = true; valid = false }
  if (!password.value) { errors.password = true; valid = false }
  if (signUp.value && !role.value) { errors.role = true; valid = false }
  return valid
}

async function submitForm() {
  loginError.value = null
  if (!validate()) return
  submitting.value = true

  try {
    if (signUp.value) {
      await authStore.signUp({ displayname: fullname.value, email: email.value, password: password.value })
      await authStore.fetchUser()
      if (role.value) {
        await api.session.save({ settings: { ...(authStore.user?.settings ?? {}), lat_role: role.value } })
        await authStore.fetchUser()
      }
      authStore.forceLogin = false
      router.push('/onboarding')
    } else {
      await authStore.login({ email: email.value, password: password.value })
      authStore.forceLogin = false
      if (route.path === '/') {
        router.push('/map')
      }
    }
  } catch (e) {
    if (e instanceof SignUpError || e instanceof LoginError) {
      loginError.value = e.status || 'Incorrect email or password.'
    } else {
      loginError.value = 'Something went wrong. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

watch(loggedIn, (v) => {
  if (v) authStore.forceLogin = false
})

defineExpose({ show, showLogin, hide, showModal })
</script>

<style scoped>
.lat-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.lat-modal-dialog {
  background: white;
  border-radius: 10px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.lat-modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e8e8e8;
}

.lat-modal-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 6px;
  flex-shrink: 0;
}

.lat-modal-title {
  flex: 1;
  font-family: var(--lat-font-heading);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--lat-color-text);
  margin: 0;
}

.lat-modal-close {
  background: none;
  border: none;
  font-size: 1.1rem;
  color: #888;
  cursor: pointer;
  padding: 4px 6px;
  line-height: 1;
  border-radius: 4px;
}

.lat-modal-close:hover { background: #f0f0f0; color: #333; }

.lat-modal-form {
  padding: 20px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field { display: flex; flex-direction: column; gap: 5px; }

.field label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--lat-color-text);
}

.field input,
.field select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.15s;
}

.field input:focus,
.field select:focus {
  outline: none;
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 3px rgba(107, 158, 60, 0.12);
}

.field input.input-error,
.field select.input-error { border-color: #dc3545; }

.field-error {
  font-size: 0.8rem;
  color: #dc3545;
  margin: 0;
}

.alert-danger {
  background: #fff3cd;
  color: #856404;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 0.875rem;
}

.btn-submit {
  background: var(--lat-color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s;
}

.btn-submit:hover:not(:disabled) { background: var(--lat-color-primary-dark); }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.lat-modal-footer {
  padding: 4px 24px 16px;
  text-align: center;
  font-size: 0.875rem;
  color: var(--lat-color-text-muted);
}

.lat-modal-footer p { margin: 0; }

.link-btn {
  background: none;
  border: none;
  color: var(--lat-color-primary);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  text-decoration: underline;
}

.link-btn:hover { color: var(--lat-color-primary-dark); }

.lat-modal-terms {
  padding: 12px 24px 20px;
  border-top: 1px solid #f0f0f0;
  font-size: 0.8rem;
  color: var(--lat-color-text-muted);
}

.consent-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  line-height: 1.4;
}

.consent-label input[type="checkbox"] { margin-top: 2px; flex-shrink: 0; }

.terms-note {
  margin: 8px 0 0;
  color: #aaa;
  font-size: 0.75rem;
}

.terms-note a { color: var(--lat-color-primary); }
</style>
