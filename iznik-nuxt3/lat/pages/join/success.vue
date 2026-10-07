<template>
  <div class="success-page">
    <div class="success-card">
      <div class="success-icon">🌱</div>

      <template v-if="state === 'confirming'">
        <h1 class="success-title">One moment…</h1>
        <p class="success-body">Confirming your payment with Stripe.</p>
      </template>

      <template v-else-if="state === 'confirmed'">
        <h1 class="success-title">Welcome to {{ branding.siteName }}!</h1>
        <p class="success-body">
          Your payment was successful. You can now send and receive messages
          with garden lenders and tenders.
        </p>
        <p v-if="stripeTestMode" class="test-note">
          🧪 This was a <strong>test payment</strong> — no real charge was made.
        </p>
        <NuxtLink to="/map" class="btn btn-primary btn-lg"
          >Explore the map</NuxtLink
        >
      </template>

      <template v-else-if="state === 'pending'">
        <h1 class="success-title">Thanks — nearly there</h1>
        <p class="success-body">
          Stripe hasn't confirmed the payment yet. This usually takes a few
          seconds. Refresh this page, or carry on and we'll unlock messaging as
          soon as it lands.
        </p>
        <button type="button" class="btn btn-primary btn-lg" @click="confirm">
          Check again
        </button>
      </template>

      <template v-else-if="state === 'signed-out'">
        <h1 class="success-title">Thanks for joining</h1>
        <p class="success-body">
          Sign in to finish setting up your membership.
        </p>
        <button
          type="button"
          class="btn btn-primary btn-lg"
          @click="requestLogin"
        >
          Sign in
        </button>
      </template>

      <template v-else>
        <h1 class="success-title">Thanks — we're updating your account</h1>
        <p class="success-body">
          Your payment went through but we couldn't update your account just
          now. Please refresh in a moment; if it still isn't sorted, email
          <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a
          >.
        </p>
        <button type="button" class="btn btn-primary btn-lg" @click="confirm">
          Try again
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import branding from '~/branding.config'
import { useAuthStore } from '~/stores/auth'
import { useNavbar } from '~/composables/useNavbar'

definePageMeta({ layout: 'default' })
useHead({ title: `Welcome — ${branding.siteName}` })

const authStore = useAuthStore()
const config = useRuntimeConfig()
const route = useRoute()
const { requestLogin } = useNavbar()

const stripeTestMode = computed(() => config.public.LAT_STRIPE_TEST_MODE)
const contactEmail = 'hello@lendandtend.com'

// 'confirming' | 'confirmed' | 'pending' | 'signed-out' | 'error'
const state = ref('confirming')

// Returning from Stripe with ?session_id=cs_…: ask our server to confirm the
// payment with Stripe and record it, as us. Without a session id (e.g. an old
// bookmark) fall back to whatever the account already says.
async function confirm() {
  state.value = 'confirming'
  await authStore.fetchUser().catch(() => {})
  if (!authStore.user) {
    state.value = 'signed-out'
    return
  }
  const sessionId =
    typeof route.query.session_id === 'string' ? route.query.session_id : ''
  if (!sessionId) {
    state.value =
      authStore.user?.settings?.lat_payment?.status === 'paid'
        ? 'confirmed'
        : 'pending'
    return
  }
  try {
    const res = await $fetch('/api/checkout-confirm', {
      method: 'POST',
      headers: { Authorization: authStore.auth.jwt },
      body: { sessionId },
    })
    await authStore.fetchUser().catch(() => {})
    state.value = res.paid ? 'confirmed' : 'pending'
  } catch {
    state.value = 'error'
  }
}

onMounted(confirm)
</script>

<style scoped>
.test-note {
  background: #fff8e1;
  border: 1px solid #f0c36d;
  color: #7a5b00;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 0 0 16px;
  font-size: 0.85rem;
}
.success-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.success-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.09);
  padding: 48px 36px;
  max-width: 480px;
  width: 100%;
  text-align: center;
}

.success-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.success-title {
  font-family: var(--lat-font-heading);
  font-size: 1.8rem;
  color: var(--lat-color-text);
  margin: 0 0 16px;
}

.success-body {
  color: var(--lat-color-text-muted);
  line-height: 1.6;
  margin: 0 0 28px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 1rem;
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
</style>
