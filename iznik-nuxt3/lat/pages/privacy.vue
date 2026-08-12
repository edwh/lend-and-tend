<template>
  <div class="privacy-page">
    <div class="privacy-container">
      <h1 class="privacy-title">Privacy Policy</h1>
      <p class="privacy-updated">Last updated: May 2026</p>

      <section class="privacy-section">
        <h2>Who we are</h2>
        <p>
          {{ branding.siteName }} is operated by
          {{ branding.companyName }} (company no. {{ branding.companyNumber }},
          registered in England and Wales). Our contact email is
          <a :href="`mailto:${branding.email}`">{{ branding.email }}</a
          >.
        </p>
      </section>

      <section class="privacy-section">
        <h2>What data we collect</h2>
        <ul>
          <li>
            <strong>Account data</strong> — your name, email address, and the
            password you create when registering.
          </li>
          <li>
            <strong>Profile data</strong> — your role (lender/tender), a short
            "about me" text, and your preferred travel radius. These are
            optional beyond the role.
          </li>
          <li>
            <strong>Location data</strong> — an approximate location (postcode
            area, not full address) used to position your listing on the map and
            to suggest nearby matches. Your precise address is never stored or
            shown.
          </li>
          <li>
            <strong>Listing data</strong> — details you enter about your garden
            or what you're looking for, stored as structured data against your
            account.
          </li>
          <li>
            <strong>Message data</strong> — messages sent between users via the
            in-app chat. These are stored to provide the service.
          </li>
          <li>
            <strong>Payment data</strong> — whether you have paid the joining
            fee, and the date. Card details are processed by Stripe and never
            held by us.
          </li>
          <li>
            <strong>Technical data</strong> — IP address, browser type, and
            usage logs used for security and to diagnose problems.
          </li>
        </ul>
      </section>

      <section class="privacy-section">
        <h2>How we use your data</h2>
        <ul>
          <li>To provide and improve the service.</li>
          <li>
            To connect lenders and tenders who are geographically compatible.
          </li>
          <li>
            To send you transactional emails (e.g. new message notifications,
            password reset).
          </li>
          <li>To detect and prevent fraud and abuse.</li>
        </ul>
        <p>
          We do not use your data for advertising and we do not sell it to third
          parties.
        </p>
      </section>

      <section class="privacy-section">
        <h2>Legal basis for processing</h2>
        <p>
          We process your data on the basis of <strong>contract</strong> (to
          deliver the service you signed up for) and
          <strong>legitimate interests</strong> (to keep the platform safe and
          improve it). Where required, we will obtain your explicit consent.
        </p>
      </section>

      <section class="privacy-section">
        <h2>Who we share data with</h2>
        <ul>
          <li>
            <strong>Other users</strong> — your display name and approximate
            area are visible on your listing. Your email is never shown to other
            users.
          </li>
          <li>
            <strong>Stripe</strong> — for payment processing. Stripe's privacy
            policy applies to data they collect.
          </li>
          <li>
            <strong>Hosting providers</strong> — our infrastructure providers
            process data as data processors under appropriate agreements.
          </li>
        </ul>
        <p>
          We do not transfer your data outside the UK/EEA without appropriate
          safeguards.
        </p>
      </section>

      <section class="privacy-section">
        <h2>How long we keep data</h2>
        <p>
          We retain your account data for as long as your account is active. If
          you close your account we delete personal data within 30 days, except
          where we are legally required to retain it (e.g. financial records for
          7 years).
        </p>
      </section>

      <section class="privacy-section">
        <h2>Your rights</h2>
        <p>Under UK GDPR you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Correct inaccurate data.</li>
          <li>Request deletion of your data ("right to be forgotten").</li>
          <li>Restrict or object to processing in certain circumstances.</li>
          <li>
            Data portability — receive your data in a machine-readable format.
          </li>
          <li>Withdraw consent where processing is based on consent.</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at
          <a :href="`mailto:${branding.email}`">{{ branding.email }}</a
          >. We will respond within 30 days.
        </p>
      </section>

      <section class="privacy-section">
        <h2>Cookies</h2>
        <p>
          We use essential cookies only — to keep you signed in and to maintain
          your session. We do not use advertising or tracking cookies, and we do
          not use website analytics.
        </p>
        <p>
          When you first visit you can choose <strong>Accept</strong> or
          <strong>Essential only</strong>. With your consent (Accept) we may
          also use privacy-friendly error monitoring to help us find and fix
          problems faster; choosing Essential only turns that off. Your choice
          is stored in a first-party <code>lat_cookie_consent</code> cookie;
          clear it in your browser to be asked again.
        </p>
      </section>

      <section class="privacy-section">
        <h2>Security</h2>
        <p>
          Passwords are hashed before storage. All data is transmitted over
          HTTPS. We take reasonable technical and organisational measures to
          protect your data.
        </p>
      </section>

      <section class="privacy-section">
        <h2>Complaints</h2>
        <p>
          If you are unhappy with how we handle your data, you may lodge a
          complaint with the
          <a href="https://ico.org.uk/" target="_blank" rel="noopener"
            >Information Commissioner's Office (ICO)</a
          >.
        </p>
      </section>

      <section class="privacy-section">
        <h2>Changes</h2>
        <p>
          We may update this policy from time to time. We will notify you of
          material changes by email.
        </p>
      </section>

      <div class="privacy-contact">
        <p>Questions? <NuxtLink to="/contact">Contact us</NuxtLink>.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import branding from '~/branding.config'

definePageMeta({ layout: 'default' })
useHead({ title: `Privacy Policy — ${branding.siteName}` })
</script>

<style scoped>
.privacy-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
  padding: 48px 16px 64px;
}

.privacy-container {
  max-width: 720px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  padding: 48px 40px;
}

.privacy-title {
  font-family: var(--lat-font-heading);
  font-size: 2rem;
  color: var(--lat-color-text);
  margin: 0 0 8px;
}

.privacy-updated {
  color: var(--lat-color-text-muted);
  font-size: 0.85rem;
  margin: 0 0 40px;
}

.privacy-section {
  margin-bottom: 32px;
}

.privacy-section h2 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--lat-color-text);
  margin: 0 0 10px;
}

.privacy-section p,
.privacy-section li {
  color: var(--lat-color-text-muted);
  line-height: 1.7;
  font-size: 0.95rem;
}

.privacy-section ul {
  margin: 0 0 12px;
  padding-left: 24px;
}

.privacy-section li {
  margin-bottom: 8px;
}

.privacy-section a,
.privacy-contact a {
  color: var(--lat-color-primary);
  text-decoration: underline;
}

.privacy-contact {
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
  color: var(--lat-color-text-muted);
  font-size: 0.9rem;
}

@media (max-width: 600px) {
  .privacy-container {
    padding: 28px 20px;
  }
  .privacy-title {
    font-size: 1.5rem;
  }
}
</style>
