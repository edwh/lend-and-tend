<template>
  <div class="contact-page">
    <div class="container">
      <div class="page-header">
        <h1>Contact us</h1>
        <p class="subtitle">We aim to respond within one working day.</p>
      </div>

      <div class="contact-card">
        <form v-if="!sent" @submit.prevent="submit">
          <div class="field">
            <label for="c-name">Your name</label>
            <input
              id="c-name"
              v-model="form.name"
              type="text"
              placeholder="Your name"
              required
            />
          </div>

          <div class="field">
            <label for="c-email">Email address</label>
            <input
              id="c-email"
              v-model="form.email"
              type="email"
              placeholder="your@email.com"
              required
            />
          </div>

          <div class="field">
            <label for="c-topic">What is it about?</label>
            <select id="c-topic" v-model="form.topic">
              <option value="">Please select…</option>
              <option value="signing-up">Signing up</option>
              <option value="payment">Payment or joining fee</option>
              <option value="specific-person">A specific person or chat</option>
              <option value="agreement">Garden Sharing Agreement</option>
              <option value="account">My account</option>
              <option value="technical">Technical problem</option>
              <option value="other">Something else</option>
            </select>
          </div>

          <div class="field">
            <label for="c-message">Your message</label>
            <textarea
              id="c-message"
              v-model="form.message"
              rows="6"
              placeholder="Tell us what you need help with…"
              required
            />
          </div>

          <div v-if="error" class="form-error">{{ error }}</div>

          <div class="actions">
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="submitting"
            >
              {{ submitting ? 'Sending…' : 'Send message' }}
            </button>
          </div>
        </form>

        <div v-else class="sent-state">
          <div class="sent-icon">✓</div>
          <h2>Message sent</h2>
          <p>
            Thanks, {{ form.name }}. We'll get back to you at {{ form.email }}.
          </p>
          <p class="alternative-contact">
            You can also reach us at
            <a href="mailto:hello@lendandtend.com">hello@lendandtend.com</a>
          </p>
          <NuxtLink to="/" class="btn btn-primary">Back to home</NuxtLink>
        </div>
      </div>

      <div class="faq-link">
        <p>
          Looking for quick answers?
          <NuxtLink to="/help">Check our FAQ →</NuxtLink>
        </p>
      </div>
    </div>
    <LatSiteFooter />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' })
useHead({ title: 'Contact us — Lend & Tend' })

const form = reactive({ name: '', email: '', topic: '', message: '' })
const submitting = ref(false)
const sent = ref(false)
const error = ref('')

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: { ...form },
    })
    sent.value = true
  } catch (e) {
    error.value =
      'Failed to send your message. Please try again or email us directly.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.contact-page {
  min-height: 100vh;
  background: var(--lat-color-surface);
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 60px 24px 80px;
}

.page-header {
  margin-bottom: 32px;
}

h1 {
  font-family: var(--lat-font-heading);
  font-size: 2.2rem;
  color: var(--lat-color-text);
  margin: 0 0 10px;
}

.subtitle {
  color: var(--lat-color-text-muted);
  margin: 0;
}

.contact-card {
  background: white;
  border-radius: 12px;
  padding: 36px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  margin-bottom: 24px;
}

.field {
  margin-bottom: 20px;
}

label {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 6px;
  color: var(--lat-color-text);
}

input,
textarea,
select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: inherit;
  box-sizing: border-box;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 2px rgba(107, 158, 60, 0.12);
}

.form-error {
  background: #fff3cd;
  color: #856404;
  padding: 10px 14px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 0.875rem;
}

.actions {
  display: flex;
}

.btn {
  padding: 12px 28px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sent-state {
  text-align: center;
  padding: 24px 0;
}

.sent-icon {
  width: 56px;
  height: 56px;
  background: #d4edda;
  color: #155724;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  margin: 0 auto 16px;
}

.sent-state h2 {
  font-family: var(--lat-font-heading);
  font-size: 1.5rem;
  margin: 0 0 8px;
  color: var(--lat-color-text);
}

.sent-state p {
  color: var(--lat-color-text-muted);
  margin: 0 0 24px;
}

.alternative-contact {
  color: var(--lat-color-text-muted);
  font-size: 0.9rem;
  margin: 16px 0 24px;
}

.alternative-contact a {
  color: var(--lat-color-primary);
  text-decoration: none;
  font-weight: 600;
}

.alternative-contact a:hover {
  text-decoration: underline;
}

.faq-link {
  text-align: center;
  font-size: 0.9rem;
  color: var(--lat-color-text-muted);
}

.faq-link a {
  color: var(--lat-color-primary);
  font-weight: 600;
}
</style>
