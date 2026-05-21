<template>
  <div class="auth-page" :style="{ backgroundColor: branding.colors.background }">
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 :style="{ color: branding.colors.primary }">{{ branding.siteName }}</h1>
          <p class="tagline">{{ branding.tagline }}</p>
        </div>

        <div class="auth-form">
          <h2>Log In</h2>

          <div v-if="error" class="alert alert-danger" role="alert">
            {{ error }}
          </div>

          <form @submit.prevent="submitLogin">
            <div class="mb-3">
              <label for="email" class="form-label">Email Address</label>
              <input
                id="email"
                v-model="form.email"
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
                v-model="form.password"
                type="password"
                class="form-control"
                placeholder="Your password"
                required
              />
            </div>

            <button
              type="submit"
              class="btn w-100"
              :style="{ backgroundColor: branding.colors.primary, color: branding.colors.background }"
              :disabled="isLoading"
            >
              <span v-if="!isLoading">Log In</span>
              <span v-else>Logging in...</span>
            </button>
          </form>

          <div class="text-center mt-3">
            <p>
              Don't have an account?
              <NuxtLink to="/lat/auth/register" :style="{ color: branding.colors.primary }">
                Sign up
              </NuxtLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { branding } from '~/branding.config'
import { useLatAuth } from '~/composables/useLatAuth'

const router = useRouter()
const route = useRoute()
const { login, error: authError, isLoading } = useLatAuth()

const error = ref<string | null>(null)

const form = reactive({
  email: '',
  password: '',
})

watch(authError, (newError) => {
  error.value = newError
})

const submitLogin = async () => {
  error.value = null

  const redirect = route.query.redirect as string | undefined
  const success = await login(form.email, form.password)
  if (success) {
    await router.push(redirect || '/lat/map')
  }
}

definePageMeta({ layout: 'empty' })
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
    input {
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
    color: v-bind('branding.colors.primary');
    font-weight: 600;
    transition: opacity 0.3s;

    &:hover {
      opacity: 0.8;
    }
  }
}
</style>
