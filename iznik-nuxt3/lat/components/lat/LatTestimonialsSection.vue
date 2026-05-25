<template>
  <section class="section-tinted">
    <div class="container">
      <h2 class="section-heading">What our members say</h2>
      <div class="testimonials">
        <blockquote class="testimonial">
          <p>"What with the allotment list being never-ending, it's 2 miles away from where I live anyway. I love having somewhere to grow at the end of my road."</p>
          <footer>Dan, Garden Tender</footer>
        </blockquote>
        <blockquote class="testimonial">
          <p>"I have a garden and never have the time or money to make it come in to fruition…what a great idea."</p>
          <footer>Sophie, Garden Owner</footer>
        </blockquote>
        <blockquote class="testimonial">
          <p>"My grandad loves this idea, an avid gardener but he's now in a wheelchair. Now he can enjoy his garden again whilst someone else helps."</p>
          <footer>Richie, Garden Tender &amp; Grandson of Garden Owner</footer>
        </blockquote>
        <blockquote class="testimonial">
          <p>"This is a win win situation! I have a garden that needs doing and there is someone nearby that wants to do it? Be my guest!"</p>
          <footer>Sunni, Garden Owner</footer>
        </blockquote>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import branding from '~/branding.config'
</script>

<style scoped>
/* ── Testimonials ─────────────────────────────────────────────────────────── */
.testimonials {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 640px) { .testimonials { grid-template-columns: 1fr; } }

/* White card on surface bg */
.testimonial {
  background: #fff;
  border-radius: 8px;
  padding: 28px;
  margin: 0;
  border-left: 4px solid var(--lat-color-primary);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.testimonial p {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--lat-color-text-muted);
  margin: 0;
  font-style: italic;
}

/* textMuted on white → 5.1:1 ✓ */
.testimonial footer {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--lat-color-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-tinted {
  background: var(--lat-color-surface);
  padding: 80px 24px;
}

.section-heading {
  font-family: var(--lat-font-heading);
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 700;
  color: var(--lat-color-text) !important;
  margin: 0 0 48px;
  text-align: center;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 640px) {
  .section-light, .section-tinted { padding: 48px 12px; }
  .container { padding: 0 12px; }
}
</style>
