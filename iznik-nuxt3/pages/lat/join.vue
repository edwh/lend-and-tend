<template>
  <div class="lat-join-container">
    <div class="join-header">
      <h1>Join Lend & Tend</h1>
      <p class="tagline">{{ branding.tagline }}</p>
    </div>

    <div class="join-content">
      <!-- Payment Info Card -->
      <div class="info-card">
        <h2>Joining Fee: £12.00</h2>
        <p class="description">
          Your declaration of intent — not a guarantee of a match. This helps us maintain the platform and support our community.
        </p>

        <!-- Concession Section -->
        <div class="concession-section">
          <label class="concession-toggle">
            <input v-model="showConcession" type="checkbox" />
            <span>I'm eligible for a concession</span>
          </label>

          <div v-if="showConcession" class="concession-form">
            <label for="concession-reason">Reason for concession:</label>
            <select v-model="concessionReason" id="concession-reason">
              <option value="">Select a reason...</option>
              <option value="universal_credit">I receive Universal Credit</option>
              <option value="pension_credit">I receive Pension Credit</option>
              <option value="financial_difficulty">I'm in financial difficulty</option>
            </select>

            <label class="declaration-checkbox">
              <input v-model="concessionDeclaration" type="checkbox" />
              <span>I declare that the above information is accurate</span>
            </label>

            <button
              class="btn btn-primary"
              :disabled="!concessionReason || !concessionDeclaration"
              @click="applyConcession"
            >
              Apply for Concession
            </button>
          </div>
        </div>

        <!-- Payment Form -->
        <div v-if="!isConcessionApplied" class="payment-form">
          <h3>Card Payment</h3>
          <p class="payment-note">{{ branding.fee.concessionText }}</p>

          <!-- Stripe Elements placeholder -->
          <div class="card-element-placeholder">
            <div class="card-input">
              <label for="card-number">Card Number</label>
              <input
                id="card-number"
                type="text"
                placeholder="4242 4242 4242 4242"
                readonly
              />
              <p class="hint">MVP: Using test card 4242 4242 4242 4242</p>
            </div>

            <div class="card-row">
              <div class="card-input">
                <label for="card-expiry">Expiry Date</label>
                <input id="card-expiry" type="text" placeholder="MM/YY" readonly />
              </div>
              <div class="card-input">
                <label for="card-cvc">CVC</label>
                <input id="card-cvc" type="text" placeholder="123" readonly />
              </div>
            </div>
          </div>

          <button
            class="btn btn-primary btn-pay"
            :disabled="processing"
            @click="processPayment"
          >
            <span v-if="processing">Processing...</span>
            <span v-else>Pay £12.00</span>
          </button>

          <p v-if="paymentMessage" class="payment-message" :class="paymentMessageType">
            {{ paymentMessage }}
          </p>
        </div>

        <!-- Concession Applied Message -->
        <div v-if="isConcessionApplied" class="concession-applied">
          <h3>Concession Approved</h3>
          <p>Your concession has been applied successfully. You're now ready to explore the map!</p>
        </div>
      </div>

      <!-- Browse Map Link -->
      <div class="browse-link">
        <NuxtLink to="/lat/map" class="link-text">
          Browse the map first →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { branding } from '~/branding.config'

const router = useRouter()

// Form state
const showConcession = ref(false)
const concessionReason = ref('')
const concessionDeclaration = ref(false)
const processing = ref(false)
const paymentMessage = ref('')
const paymentMessageType = ref('')
const isConcessionApplied = ref(false)

// Computed
const canApplyConcession = computed(() => concessionReason.value && concessionDeclaration.value)

// Apply for concession
const applyConcession = async () => {
  try {
    processing.value = true
    paymentMessage.value = ''

    const response = await $fetch('/apiv2/lat/payment/concession', {
      method: 'POST',
      body: {
        reason: concessionReason.value,
        declaration: concessionDeclaration.value,
      },
    })

    if (response.status === 'concession') {
      isConcessionApplied.value = true
      paymentMessage.value = 'Concession applied! You can now explore the map.'
      paymentMessageType.value = 'success'

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/lat/map')
      }, 2000)
    }
  } catch (error: any) {
    paymentMessage.value = error.data?.error || 'Failed to apply concession. Please try again.'
    paymentMessageType.value = 'error'
  } finally {
    processing.value = false
  }
}

// Process payment
const processPayment = async () => {
  try {
    processing.value = true
    paymentMessage.value = ''

    // Step 1: Create payment intent
    const intentResponse = await $fetch('/apiv2/lat/payment/intent', {
      method: 'POST',
    })

    // Step 2: Confirm payment (MVP: simulated)
    const confirmResponse = await $fetch('/apiv2/lat/payment/confirm', {
      method: 'POST',
      body: {
        paymentIntentId: intentResponse.clientSecret,
      },
    })

    if (confirmResponse.status === 'paid') {
      paymentMessage.value = 'Payment successful! Payment simulated in MVP mode. Redirecting...'
      paymentMessageType.value = 'success'

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/lat/map')
      }, 2000)
    }
  } catch (error: any) {
    paymentMessage.value = error.data?.error || 'Payment failed. Please try again.'
    paymentMessageType.value = 'error'
  } finally {
    processing.value = false
  }
}

definePageMeta({ layout: 'default', middleware: 'auth' })
</script>

<style scoped lang="scss">
.lat-join-container {
  min-height: 100vh;
  padding: 2rem 1rem;
  background: linear-gradient(135deg, var(--color-surface) 0%, white 100%);
  color: var(--color-text);
}

.join-header {
  text-align: center;
  margin-bottom: 3rem;

  h1 {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    color: var(--color-primary);
  }

  .tagline {
    font-size: 1.1rem;
    color: var(--color-text-muted);
  }
}

.join-content {
  max-width: 600px;
  margin: 0 auto;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;

  h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: var(--color-primary);
  }

  h3 {
    font-size: 1.2rem;
    margin: 1.5rem 0 1rem 0;
    color: var(--color-text);
  }

  .description {
    font-size: 0.95rem;
    color: var(--color-text-muted);
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }
}

.concession-section {
  background: var(--color-lender-bg);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  border-left: 4px solid var(--color-primary);

  .concession-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: 500;

    input {
      cursor: pointer;
      width: 18px;
      height: 18px;
    }
  }

  .concession-form {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      font-size: 0.9rem;
    }

    select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.95rem;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(107, 158, 60, 0.1);
      }
    }

    .declaration-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.95rem;

      input {
        cursor: pointer;
        width: 18px;
        height: 18px;
      }
    }
  }
}

.payment-form {
  margin-top: 2rem;
}

.card-element-placeholder {
  background: #f9faff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card-input {
  margin-bottom: 1rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.9rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.95rem;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(107, 158, 60, 0.1);
    }

    &[readonly] {
      background: #f5f5f5;
      color: #999;
    }
  }

  .hint {
    font-size: 0.8rem;
    color: #999;
    margin-top: 0.25rem;
  }
}

.card-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.payment-note {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
  background: #fff9e6;
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #ffb800;
}

.concession-applied {
  background: var(--color-success);
  color: white;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;

  h3 {
    color: white;
    margin: 0 0 0.5rem 0;
  }

  p {
    margin: 0;
  }
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.btn-primary {
    background: var(--color-primary);
    color: white;

    &:hover:not(:disabled) {
      background: var(--color-primary-dark);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(107, 158, 60, 0.3);
    }
  }
}

.btn-pay {
  width: 100%;
  font-size: 1rem;
  padding: 1rem;
}

.payment-message {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  font-size: 0.95rem;

  &.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  &.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
}

.browse-link {
  text-align: center;
  padding: 2rem 0;

  .link-text {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.3s ease;

    &:hover {
      color: var(--color-primary-dark);
      text-decoration: underline;
    }
  }
}

/* CSS variables from branding config */
:root {
  --color-primary: v-bind('branding.colors.primary');
  --color-primary-dark: v-bind('branding.colors.primaryDark');
  --color-surface: v-bind('branding.colors.surface');
  --color-text: v-bind('branding.colors.text');
  --color-text-muted: v-bind('branding.colors.textMuted');
  --color-success: v-bind('branding.colors.success');
  --color-lender-bg: v-bind('branding.colors.lenderBg');
}

@media (max-width: 640px) {
  .join-header h1 {
    font-size: 1.8rem;
  }

  .info-card {
    padding: 1.5rem;
  }

  .card-row {
    grid-template-columns: 1fr;
  }
}
</style>
