<template>
  <div class="terms-page">
    <div class="terms-container">
      <h1 class="terms-title">Terms of Service</h1>
      <p class="terms-updated">Last updated: May 2026</p>

      <section class="terms-section">
        <h2>1. Who we are</h2>
        <p>
          {{ branding.siteName }} is operated by {{ branding.companyName }} (company no. {{ branding.companyNumber }}).
          We connect garden owners ("lenders") with people who want to tend a garden ("tenders").
        </p>
      </section>

      <section class="terms-section">
        <h2>2. The service</h2>
        <p>
          {{ branding.siteName }} provides a platform for lenders and tenders to find each other and communicate.
          We do not act as a landlord, employer, or party to any arrangement between users.
          All arrangements — including what is grown, how the garden is used, and any
          sharing of produce — are agreed directly between the lender and tender.
        </p>
      </section>

      <section class="terms-section">
        <h2>3. Joining fee</h2>
        <p>
          Browsing the map is free. To send and receive messages you pay a one-off joining fee of
          <strong>£{{ feeFormatted }}</strong>. This fee covers operating costs and helps ensure
          users are genuine. It is a declaration of intent — not a guarantee of a match.
          Refunds are available on request within 30 days if you have not been matched.
        </p>
        <p>
          Concessions are available for people on low incomes or receiving benefits.
          Apply via the <NuxtLink to="/join">join page</NuxtLink>.
        </p>
      </section>

      <section class="terms-section">
        <h2>4. Your responsibilities</h2>
        <ul>
          <li>You must be 18 or over to use this service.</li>
          <li>You must provide accurate information when registering and creating your listing.</li>
          <li>You must treat other users with respect. Harassment, abuse, or discrimination will result in immediate removal.</li>
          <li>Tenders declare that they are not on any sex offender or safeguarding register. We trust users to be honest; we do not carry out DBS checks.</li>
          <li>You are responsible for any arrangements you enter into with other users.</li>
          <li>You must not use the service for commercial purposes without our written consent.</li>
        </ul>
      </section>

      <section class="terms-section">
        <h2>5. Garden safety and access</h2>
        <p>
          Lenders should ensure their garden is reasonably safe for the tender to access and work in.
          Tenders should take reasonable care of the garden and any property on or adjacent to it.
          Neither party is liable to the other for accidental injury or damage unless caused by negligence.
          We strongly recommend both parties have appropriate home or garden insurance.
        </p>
      </section>

      <section class="terms-section">
        <h2>6. Privacy</h2>
        <p>
          We store only the information you provide us. Your precise address is never shown to other users —
          only a general area. Your contact details are only shared within an active chat.
          We do not sell your data to third parties.
          See our <NuxtLink to="/privacy">Privacy Policy</NuxtLink> for full details.
        </p>
      </section>

      <section class="terms-section">
        <h2>7. Ending your account</h2>
        <p>
          You can request deletion of your account and data at any time by contacting us at
          <a :href="`mailto:${branding.email}`">{{ branding.email }}</a>.
          We reserve the right to suspend or remove accounts that violate these terms.
        </p>
      </section>

      <section class="terms-section">
        <h2>8. Liability</h2>
        <p>
          {{ branding.siteName }} is provided "as is". We make no guarantees that you will find a match,
          or that any match will be suitable. Our liability is limited to the amount of the joining fee paid.
          Nothing in these terms limits liability for death or personal injury caused by our negligence.
        </p>
      </section>

      <section class="terms-section">
        <h2>9. Changes</h2>
        <p>
          We may update these terms from time to time. We will notify you by email of material changes.
          Continued use of the service after notification constitutes acceptance of the new terms.
        </p>
      </section>

      <section class="terms-section">
        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of England and Wales. Any disputes will be subject to
          the exclusive jurisdiction of the courts of England and Wales.
        </p>
      </section>

      <div class="terms-contact">
        <p>Questions about these terms? <NuxtLink to="/contact">Contact us</NuxtLink>.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import branding from '~/branding.config'

definePageMeta({ layout: 'default' })
useHead({ title: `Terms of Service — ${branding.siteName}` })

const feeFormatted = computed(() => (branding.fee.amountPence / 100).toFixed(2))
</script>

<style scoped>
.terms-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
  padding: 48px 16px 64px;
}

.terms-container {
  max-width: 720px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  padding: 48px 40px;
}

.terms-title {
  font-family: var(--lat-font-heading);
  font-size: 2rem;
  color: var(--lat-color-text);
  margin: 0 0 8px;
}

.terms-updated {
  color: var(--lat-color-text-muted);
  font-size: 0.85rem;
  margin: 0 0 40px;
}

.terms-section {
  margin-bottom: 32px;
}

.terms-section h2 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--lat-color-text);
  margin: 0 0 10px;
}

.terms-section p,
.terms-section li {
  color: var(--lat-color-text-muted);
  line-height: 1.7;
  font-size: 0.95rem;
}

.terms-section ul {
  margin: 0;
  padding-left: 24px;
}

.terms-section li { margin-bottom: 8px; }

.terms-section a,
.terms-contact a {
  color: var(--lat-color-primary);
  text-decoration: underline;
}

.terms-contact {
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
  color: var(--lat-color-text-muted);
  font-size: 0.9rem;
}

@media (max-width: 600px) {
  .terms-container { padding: 28px 20px; }
  .terms-title { font-size: 1.5rem; }
}
</style>
