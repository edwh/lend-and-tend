<template>
  <div class="help-page">
    <div class="container">
      <div class="page-header">
        <h1>Help & FAQ</h1>
        <p class="subtitle">Answers to common questions about Lend & Tend.</p>
      </div>

      <div class="faq-list">
        <div
          v-for="(item, i) in faqs"
          :key="i"
          class="faq-item"
          :class="{ open: openIndex === i }"
        >
          <button class="faq-question" @click="toggle(i)">
            <span>{{ item.q }}</span>
            <span class="faq-icon">{{ openIndex === i ? '−' : '+' }}</span>
          </button>
          <div v-show="openIndex === i" class="faq-answer">
            <p>{{ item.a }}</p>
          </div>
        </div>
      </div>

      <div class="contact-prompt">
        <h2>Still have a question?</h2>
        <p>Can't find what you need? Get in touch and we'll help.</p>
        <NuxtLink to="/contact" class="btn btn-primary">Contact us</NuxtLink>
        <p class="email-alternative">
          Or email us directly:
          <a href="mailto:hello@lendandtend.com">hello@lendandtend.com</a>
        </p>
      </div>
    </div>
    <LatSiteFooter />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' })
useHead({ title: 'Help & FAQ — Lend & Tend' })

const openIndex = ref(null)

function toggle(i) {
  openIndex.value = openIndex.value === i ? null : i
}

const faqs = [
  {
    q: 'What is Lend & Tend?',
    a: "Lend & Tend is a platform that connects people who have garden space they'd like to share (lenders) with people who want somewhere to garden (tenders). We're a moderated, safe service that helps both sides find each other and agree terms — without Joyce having to be in the middle of every introduction.",
  },
  {
    q: 'How do I sign up?',
    a: "Click \"Join Lend & Tend\" at the top of the page. You'll need an email address and password. During sign-up you'll tell us whether you're joining as a lender, a tender, or both. It takes about 2 minutes.",
  },
  {
    q: 'Is there a fee to join?',
    a: "Browsing the map and creating a profile are free. There's a one-off £12 joining fee before you can send or receive private messages. This is a declaration of intent — it shows you're serious about finding a match. Concessions are available for people on Universal Credit, Pension Credit, or other financial difficulty.",
  },
  {
    q: 'How do concessions work?',
    a: 'If the £12 fee is a barrier, you can self-declare a concession on the Join page. This is entirely honour-based in the current version. We may ask for evidence in future.',
  },
  {
    q: 'How do I list my garden (as a lender)?',
    a: 'Once signed in, click "Lend" in the navigation bar. Fill in your garden title, a description, key details (size, sun, water access), what you\'re hoping for, any restrictions, and your postcode. Your exact location is never shown — we blur it for privacy.',
  },
  {
    q: 'How do I find a garden to tend?',
    a: 'Browse the map or switch to the List view on the /map page. Click any pin or card to see the full listing, then click "Send message" to start a chat with the lender.',
  },
  {
    q: 'Are my messages private?',
    a: 'Messages are stored on our platform (not end-to-end encrypted) so they can be moderated if needed. Messages are scanned for suspicious content before delivery. Admins can view chats that have been flagged or reported.',
  },
  {
    q: 'When do I share my full address?',
    a: 'Your exact address is only shared through the Garden Sharing Agreement, once both parties have formally agreed to work together. Until that point, locations are blurred on the map.',
  },
  {
    q: 'What is the Garden Sharing Agreement?',
    a: "Once you've chatted and agreed on terms, either party can propose a formal agreement from within a garden listing. The agreement captures access times, what will be grown, and any other key terms. Once both the lender and tender have accepted, the agreement is sealed with a timestamp.",
  },
  {
    q: 'How do I block or report someone?',
    a: 'In any chat, use the Block or Report buttons at the top of the conversation. Blocking prevents that person from contacting you. Reporting flags the conversation for review by our team.',
  },
  {
    q: "What if a match isn't working out?",
    a: "Either party can withdraw from an agreement. If you're struggling, use the Contact form and we'll help mediate.",
  },
]
</script>

<style scoped>
.help-page {
  min-height: 100vh;
  background: var(--lat-color-surface);
}

.container {
  max-width: 760px;
  margin: 0 auto;
  padding: 60px 24px 80px;
}

.page-header {
  margin-bottom: 40px;
}

h1 {
  font-family: var(--lat-font-heading);
  font-size: 2.4rem;
  color: var(--lat-color-text);
  margin: 0 0 10px;
}

.subtitle {
  color: var(--lat-color-text-muted);
  font-size: 1.05rem;
  margin: 0;
}

.faq-list {
  margin-bottom: 60px;
}

.faq-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
  background: white;
}

.faq-question {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--lat-color-text);
  cursor: pointer;
  transition: background 0.15s;
}

.faq-question:hover {
  background: #f9faf5;
}
.faq-item.open .faq-question {
  background: #f9faf5;
}

.faq-icon {
  font-size: 1.2rem;
  font-weight: 400;
  color: var(--lat-color-primary);
  flex-shrink: 0;
}

.faq-answer {
  padding: 0 20px 16px;
  border-top: 1px solid #f0f0f0;
}

.faq-answer p {
  margin: 12px 0 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--lat-color-text-muted);
}

.contact-prompt {
  text-align: center;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.contact-prompt h2 {
  font-family: var(--lat-font-heading);
  font-size: 1.6rem;
  margin: 0 0 12px;
  color: var(--lat-color-text);
}

.contact-prompt p {
  color: var(--lat-color-text-muted);
  margin: 0 0 24px;
}

.btn {
  display: inline-block;
  padding: 12px 28px;
  border-radius: 4px;
  font-weight: 700;
  text-decoration: none;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-primary:hover {
  opacity: 0.9;
}

.email-alternative {
  margin-top: 20px;
  color: var(--lat-color-text-muted);
  font-size: 0.9rem;
}

.email-alternative a {
  color: var(--lat-color-primary);
  text-decoration: none;
  font-weight: 600;
}

.email-alternative a:hover {
  text-decoration: underline;
}
</style>
