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

    <!-- Fees & Membership -->
    <section class="about-section fee-section">
      <div class="container">
        <h2>Membership fees</h2>
        <div class="fee-card">
          <div class="fee-amount">
            £{{ (branding.fee.amountPence / 100).toFixed(2) }}
          </div>
          <p class="fee-description">
            One-time joining fee to verify members and keep our community safe
          </p>
          <p class="fee-concession">
            <strong>Financial hardship?</strong>
            {{ branding.fee.concessionText }}
          </p>
        </div>
      </div>
    </section>

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

    <!-- Company Info -->
    <section class="about-section company-section">
      <div class="container">
        <h2>Company information</h2>
        <div class="company-grid">
          <div class="company-info">
            <h4>{{ branding.companyName }}</h4>
            <p><strong>Company number:</strong> {{ branding.companyNumber }}</p>
          </div>
          <div class="company-info">
            <h4>Get in touch</h4>
            <p>
              <a :href="`mailto:${branding.email}`">{{ branding.email }}</a>
            </p>
            <p>
              <a :href="branding.social.instagramUrl" target="_blank"
                >Follow us on Instagram</a
              >
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="container">
        <h2>Ready to grow?</h2>
        <p>
          Join {{ branding.siteName }} and start your gardening journey today.
        </p>
        <NuxtLink to="/lat/auth/register" class="btn btn-primary btn-lg">
          Get started
        </NuxtLink>
      </div>
    </section>
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
  background-color: v-bind('branding.colors.background');
  color: v-bind('branding.colors.text');
  font-family: v-bind('branding.fonts.body');
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Hero Section */
.about-hero {
  background: linear-gradient(
    135deg,
    v-bind('branding.colors.primary'),
    v-bind('branding.colors.primaryDark')
  );
  color: white;
  padding: 80px 20px;
  text-align: center;
}

.about-hero h1 {
  font-family: v-bind('branding.fonts.heading');
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 16px 0;
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
  font-family: v-bind('branding.fonts.heading');
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 24px 0;
  color: v-bind('branding.colors.text');
}

.about-section h3 {
  font-size: 1.3rem;
  margin: 32px 0 16px 0;
  color: v-bind('branding.colors.text');
}

.about-section h4 {
  margin: 0 0 12px 0;
  font-size: 1.05rem;
  color: v-bind('branding.colors.text');
}

.about-section p {
  margin: 0 0 16px 0;
  color: v-bind('branding.colors.textMuted');
  line-height: 1.6;
  font-size: 1rem;
}

.about-section p:last-child {
  margin-bottom: 0;
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
  color: v-bind('branding.colors.textMuted');
  line-height: 1.5;
}

.rules-list li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: v-bind('branding.colors.primary');
  font-weight: bold;
}

/* Safety Section */
.safety-section {
  background-color: v-bind('branding.colors.surface');
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
  border-left: 4px solid v-bind('branding.colors.primary');
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

.trial-info h4 {
  color: v-bind('branding.colors.primary');
}

.trial-info p {
  margin: 0;
  color: v-bind('branding.colors.text');
}

/* Fee Section */
.fee-section {
  background: white;
}

.fee-card {
  background: linear-gradient(
    135deg,
    v-bind('branding.colors.primaryLight'),
    v-bind('branding.colors.primary')
  );
  color: white;
  padding: 40px;
  border-radius: 8px;
  text-align: center;
}

.fee-amount {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 12px 0;
}

.fee-description {
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 20px 0;
}

.fee-concession {
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 4px;
  margin: 0;
  font-size: 0.95rem;
}

/* FAQ Section */
.faq-section {
  background-color: v-bind('branding.colors.surface');
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
  color: v-bind('branding.colors.text');
  user-select: none;
  transition: background 0.2s;
}

.faq-item summary:hover {
  background: v-bind('branding.colors.surface');
}

.faq-item[open] summary {
  background: v-bind('branding.colors.surface');
  border-bottom: 1px solid #e0e0e0;
}

.faq-item p {
  padding: 0 20px 20px 20px;
  margin: 0;
  color: v-bind('branding.colors.textMuted');
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
  color: v-bind('branding.colors.primary');
  font-size: 1.1rem;
  margin: 0 0 12px 0;
}

.company-info p {
  margin: 0 0 8px 0;
}

.company-info a {
  color: v-bind('branding.colors.primary');
  text-decoration: none;
  font-weight: 600;
}

.company-info a:hover {
  text-decoration: underline;
}

/* CTA Section */
.cta-section {
  background: linear-gradient(
    135deg,
    v-bind('branding.colors.primary'),
    v-bind('branding.colors.primaryDark')
  );
  color: white;
  padding: 80px 20px;
  text-align: center;
}

.cta-section h2 {
  color: white;
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

.btn-primary {
  background: white;
  color: v-bind('branding.colors.primary');
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
