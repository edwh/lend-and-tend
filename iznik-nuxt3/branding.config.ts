/**
 * Lend & Tend branding configuration.
 *
 * All site-specific identity lives here — swap this file when the mood board
 * arrives or a white-label variant is needed.  Nothing else in the codebase
 * should hard-code any of these values.
 */

export const branding = {
  // ── Identity ──────────────────────────────────────────────────────────────
  siteName: 'Lend & Tend',
  siteNameShort: 'L&T',
  tagline: 'Share a garden, grow good things',
  subTagline: 'Get Patch Matched',
  description:
    'Lend & Tend connects garden owners who need help with gardeners who need space. Find your perfect patch-match in your community.',
  companyName: 'Lend and Tend Ltd',
  companyNumber: '15481570',
  email: 'hello@lendandtend.com',
  social: {
    instagram: '@LendandTend',
    instagramUrl: 'https://www.instagram.com/lendandtend',
  },
  homepage: 'https://www.lendandtend.com',

  // ── Colour palette ────────────────────────────────────────────────────────
  // Placeholder values derived from the PDF; will be replaced with exact hex
  // codes once the style tile arrives.
  colors: {
    primary: '#6B9E3C',       // lime-green (Lend & Tend green)
    primaryDark: '#4A7A26',
    primaryLight: '#8CC63F',
    secondary: '#C9A0DC',     // mauve-purple
    secondaryDark: '#9B6FB0',
    secondaryLight: '#DEC3EC',
    accent: '#C8D44E',        // yellow-green
    accentDark: '#A8B330',
    background: '#FFFFFF',
    surface: '#F9FAF5',       // very light green-tinted white
    text: '#1A2210',
    textMuted: '#5C6B4A',
    error: '#D32F2F',
    warning: '#F57C00',
    success: '#388E3C',
    info: '#1976D2',

    // Role-specific pill colours
    lenderBg: '#E8F5E0',
    lenderText: '#2E6B10',
    tenderBg: '#EDE0F5',
    tenderText: '#6B2E9B',
  },

  // ── Typography ────────────────────────────────────────────────────────────
  // Replace font names once the style tile confirms them.
  fonts: {
    heading: '"Playfair Display", Georgia, serif',
    body: '"Inter", "Helvetica Neue", Arial, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },

  // ── Map ───────────────────────────────────────────────────────────────────
  map: {
    // Piggybacking on Freegle's tile server for now; replace with own or
    // public OSM tiles when traffic warrants it.
    tileUrl: 'https://tiles.ilovefreegle.org/tile/{z}/{x}/{y}.png',
    tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    defaultCenter: [52.4862, -1.8904] as [number, number], // England centroid
    defaultZoom: 6,
    // Blur radius in metres applied to user pin coordinates before display.
    pinBlurMetres: 400,
    // Icons (colour overrides applied in CSS)
    lenderIcon: '🌿',
    tenderIcon: '🌱',
  },

  // ── Joining fee ───────────────────────────────────────────────────────────
  fee: {
    amountPence: 1200,   // £12.00
    currency: 'gbp',
    concessionText:
      'Free if you receive Universal Credit, Pension Credit, or are in financial difficulty. Just let us know.',
    paymentProvider: 'stripe',
  },

  // ── User roles ────────────────────────────────────────────────────────────
  roles: {
    lender: {
      label: 'Garden Lender',
      labelShort: 'Lender',
      description: 'I have garden space to share',
      icon: '🏡',
    },
    tender: {
      label: 'Garden Tender',
      labelShort: 'Tender',
      description: 'I want to garden in shared space',
      icon: '🌱',
    },
    both: {
      label: 'Lender & Tender',
      labelShort: 'Both',
      description: 'I want to both share and use garden space',
      icon: '🤝',
    },
  },

  // ── Content ───────────────────────────────────────────────────────────────
  content: {
    groundRules: {
      minAge: 18,
      trialPeriodWeeks: '2–4',
      safetyAdvice: [
        'Connect via email or video before any in-person meeting.',
        'Bring a companion to your first visit.',
        'Verify your personal insurance — Lend & Tend accepts no liability for injuries or damage.',
        'Start with a 2–4 week trial before committing long-term.',
      ],
      lenderChecklist: [
        'Decide access terms and who you are happy to lend to.',
        'Clear any hazards (glass, pet waste) before sharing.',
        'Ensure tools and equipment are safe to use.',
      ],
      tenderChecklist: [
        'Agree how and when you will contribute.',
        'Follow all equipment guides.',
        'Wear appropriate protective gear.',
      ],
    },
    checkinScheduleDays: [14, 30, 90, 180], // days after agreement is signed
    inactivityAlertDays: 90,                 // "still interested?" prompt
  },

  // ── Meta / SEO ────────────────────────────────────────────────────────────
  meta: {
    ogImage: '/images/og-default.jpg',
    twitterCard: 'summary_large_image',
  },
} as const

export type Branding = typeof branding
export default branding
