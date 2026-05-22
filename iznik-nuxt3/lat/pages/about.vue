<template>
  <div class="about-page">
    <!-- Hero Section -->
    <section class="about-hero">
      <div class="container">
        <h1>About Lend & Tend</h1>
        <p class="lead">
          Connecting gardeners. Building community. Growing good things.
        </p>
      </div>
    </section>

    <!-- What We Do -->
    <section class="about-section">
      <div class="container">
        <h2>What we do</h2>
        <p>
          {{ branding.description }}
        </p>
        <p>
          Whether you have a garden you'd like to share or you're looking for
          space to grow, Lend & Tend connects you with local gardeners. Think of
          it as Airbnb for gardens — a skills swap where both lenders and
          tenders benefit from a thriving gardening partnership.
        </p>
      </div>
    </section>

    <!-- Roles -->
    <LatRolesSection />

    <!-- Ground Rules & Safety -->
    <section class="about-section safety-section">
      <div class="container">
        <h2>Your safety is our priority</h2>
        <p>
          We've established clear ground rules to help you garden safely and
          responsibly. All members must be at least
          {{ branding.content.groundRules.minAge }} years old.
        </p>

        <h3>Safety advice for all members</h3>
        <ul class="rules-list">
          <li
            v-for="(advice, idx) in branding.content.groundRules.safetyAdvice"
            :key="`safety-${idx}`"
          >
            {{ advice }}
          </li>
        </ul>

        <div class="rules-grid">
          <div class="rules-card">
            <h3>For garden lenders</h3>
            <ul class="rules-list">
              <li
                v-for="(item, idx) in branding.content.groundRules
                  .lenderChecklist"
                :key="`lender-${idx}`"
              >
                {{ item }}
              </li>
            </ul>
          </div>
          <div class="rules-card">
            <h3>For garden tenders</h3>
            <ul class="rules-list">
              <li
                v-for="(item, idx) in branding.content.groundRules
                  .tenderChecklist"
                :key="`tender-${idx}`"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </div>

        <div class="trial-info">
          <h4>Getting started</h4>
          <p>
            We recommend a trial period of
            <strong>{{ branding.content.groundRules.trialPeriodWeeks }}</strong>
            weeks before making any long-term commitment. This gives both
            parties time to see if it's a good fit.
          </p>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <LatPricingSection />

    <!-- FAQs -->
    <section class="about-section faq-section">
      <div class="container">
        <h2>Frequently asked questions</h2>
        <div class="faq-list">
          <details
            v-for="(faq, idx) in faqs"
            :key="`faq-${idx}`"
            class="faq-item"
          >
            <summary>{{ faq.question }}</summary>
            <p>{{ faq.answer }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <LatHowItWorksSection />

    <!-- Testimonials -->
    <LatTestimonialsSection />

    <!-- CTA -->
    <section class="cta-section">
      <div class="container">
        <h2>Ready to grow?</h2>
        <p>
          Join {{ branding.siteName }} and start your gardening journey today.
        </p>
        <NuxtLink to="/register" class="btn btn-primary btn-lg">
          Get started
        </NuxtLink>
      </div>
    </section>

    <!-- Footer -->
    <LatSiteFooter />
  </div>
</template>

<script setup lang="ts">
import branding from '~/branding.config'

definePageMeta({
  layout: 'default',
})

useHead({
  title: `About | ${branding.siteName}`,
  meta: [
    {
      name: 'description',
      content: `Learn about ${branding.siteName}, how it works, and our community guidelines.`,
    },
  ],
})

const faqs = [
  {
    question: 'How do I know if someone is safe to meet?',
    answer:
      'All members go through our verification process to ensure a safe community. Always start with a 2–4 week trial period, connect via email or video before meeting, and bring a companion to your first visit.',
  },
  {
    question: "What happens if there's a disagreement?",
    answer:
      "We encourage clear communication from the start. Agree terms in writing through our agreement form, including access times, what you'll grow, and responsibilities. If issues arise, our team is here to help mediate.",
  },
  {
    question: 'Am I covered by insurance?',
    answer:
      'You are responsible for verifying your own personal insurance. Lend & Tend accepts no liability for injuries or damage to property. Always ensure you have appropriate coverage before gardening.',
  },
  {
    question: 'Can I be both a lender and a tender?',
    answer:
      'Absolutely! Many members both share their own garden space and tender elsewhere. When you sign up, you can select the "Lender & Tender" option to show both roles.',
  },
  {
    question: 'What should I do if I have concerns about another member?',
    answer:
      'If you have safety concerns, please contact us immediately at hello@lendandtend.com. We take all reports seriously and will investigate.',
  },
]
</script>

<style scoped>
.about-page {
  background-color: var(--lat-color-background);
  color: var(--lat-color-text);
  font-family: var(--lat-font-body);
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Hero Section */
/* #1A2210 bg + white text → 17:1 ✓ */
.about-hero {
  background: var(--lat-color-text);
  color: white;
  padding: 80px 20px;
  text-align: center;
}

.about-hero h1 {
  font-family: var(--lat-font-heading);
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: #fff !important;
}

.about-hero .lead {
  font-size: 1.3rem;
  margin: 0;
  opacity: 0.95;
}

/* About Sections */
.about-section {
  padding: 60px 20px;
}

.about-section h2 {
  font-family: var(--lat-font-heading);
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 24px 0;
  color: var(--lat-color-text);
}

.about-section h3 {
  font-size: 1.3rem;
  margin: 32px 0 16px 0;
  color: var(--lat-color-text);
}

.about-section h4 {
  margin: 0 0 12px 0;
  font-size: 1.05rem;
  color: var(--lat-color-text);
}

.about-section p {
  margin: 0 0 16px 0;
  color: var(--lat-color-text-muted);
  line-height: 1.6;
  font-size: 1rem;
}

.about-section p:last-child {
  margin-bottom: 0;
}

.social-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  font-weight: 600;
}

.social-link.instagram-link {
  color: #c13584;
}

.social-link.instagram-link:hover {
  color: #833ab4;
}

.social-icon {
  font-size: 1.1em;
}

/* Rules List */
.rules-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
}

.rules-list li {
  padding: 12px 0;
  padding-left: 24px;
  position: relative;
  color: var(--lat-color-text-muted);
  line-height: 1.5;
}

.rules-list li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--lat-color-primary);
  font-weight: bold;
}

/* Safety Section */
.safety-section {
  background-color: var(--lat-color-surface);
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin: 40px 0;
}

.rules-card {
  background: white;
  padding: 30px;
  border-radius: 8px;
  border-left: 4px solid var(--lat-color-primary);
}

.rules-card h3 {
  margin-top: 0;
}

.trial-info {
  background: #f0fde4;
  border: 1px solid #c5e79f;
  padding: 20px;
  border-radius: 8px;
  margin-top: 24px;
}

/* primaryDark on #f0fde4 → 5.6:1 ✓ */
.trial-info h4 {
  color: var(--lat-color-primary-dark) !important;
}

.trial-info p {
  margin: 0;
  color: var(--lat-color-text);
}

/* FAQ Section */
.faq-section {
  background-color: var(--lat-color-surface);
}

.faq-list {
  display: grid;
  gap: 16px;
}

.faq-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.faq-item summary {
  padding: 20px;
  cursor: pointer;
  font-weight: 600;
  color: var(--lat-color-text);
  user-select: none;
  transition: background 0.2s;
}

.faq-item summary:hover {
  background: var(--lat-color-surface);
}

.faq-item[open] summary {
  background: var(--lat-color-surface);
  border-bottom: 1px solid #e0e0e0;
}

.faq-item p {
  padding: 16px 20px 20px 20px;
  margin: 0;
  color: var(--lat-color-text-muted);
  line-height: 1.6;
}

/* Company Section */
.company-section {
  background: white;
}

.company-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
  margin-top: 32px;
}

.company-info h4 {
  color: var(--lat-color-primary);
  font-size: 1.1rem;
  margin: 0 0 12px 0;
}

.company-info p {
  margin: 0 0 8px 0;
}

.company-info a {
  color: var(--lat-color-primary);
  text-decoration: none;
  font-weight: 600;
}

.company-info a:hover {
  text-decoration: underline;
}

/* CTA Section */
/* #1A2210 bg + white text → 17:1 ✓ */
.cta-section {
  background: var(--lat-color-text);
  color: white;
  padding: 80px 20px;
  text-align: center;
}

.cta-section h2 {
  color: #fff !important;
  font-size: 2rem;
  margin: 0 0 16px 0;
}

.cta-section p {
  color: rgba(255, 255, 255, 0.95);
  font-size: 1.1rem;
  margin: 0 0 32px 0;
}

.btn {
  padding: 14px 28px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  display: inline-block;
  border: none;
  cursor: pointer;
}

.btn-lg {
  padding: 16px 32px;
  font-size: 1.05rem;
}

/* white bg + #1A2210 text → 17:1 ✓ */
.btn-primary {
  background: white;
  color: var(--lat-color-text) !important;
}

.btn-primary:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Responsive Design */
@media (max-width: 768px) {
  .about-hero {
    padding: 50px 20px;
  }

  .about-hero h1 {
    font-size: 2rem;
  }

  .about-hero .lead {
    font-size: 1.1rem;
  }

  .about-section {
    padding: 40px 20px;
  }

  .about-section h2 {
    font-size: 1.7rem;
  }

  .rules-grid {
    grid-template-columns: 1fr;
  }

  .cta-section {
    padding: 50px 20px;
  }

  .cta-section h2 {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .about-hero h1 {
    font-size: 1.5rem;
  }

  .about-section h2 {
    font-size: 1.3rem;
  }

  .about-section h3 {
    font-size: 1.1rem;
  }

  .fee-amount {
    font-size: 2rem;
  }

  .faq-item summary {
    padding: 16px;
  }

  .faq-item p {
    padding: 0 16px 16px 16px;
  }
}
</style>
