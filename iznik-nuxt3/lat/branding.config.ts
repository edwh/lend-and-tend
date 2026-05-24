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
  // Exact values from Wilder Gardens Style Tile PDF
  colors: {
    primary: '#329732',       // Brand green — primary CTA, nav, buttons
    primaryDark: '#4F6642',   // Forest green — headings, dark text on green
    primaryLight: '#8CC63F',  // Light green variant
    secondary: '#B868CA',     // Purple/lilac — tender role, secondary accent
    secondaryDark: '#903B18', // Dark terracotta — secondary dark
    secondaryLight: '#f3e8f7',// Light purple background tint
    accent: '#CBCB00',        // Yellow-lime — highlights, badges
    accentDark: '#CC3F00',    // Burnt orange — accent dark / warnings
    background: '#FFFFFF',    // White background
    surface: '#EDE5D6',       // Warm cream — page backgrounds, cards
    text: '#333322',          // Near-black — body text
    textDark: '#1F1F1F',      // Very dark — strong emphasis
    textMuted: '#5A3B1F',     // Dark brown — muted/secondary text
    error: '#CC3F00',         // Burnt orange — errors, alerts
    warning: '#CC3F00',       // Burnt orange
    success: '#329732',       // Brand green
    info: '#B868CA',          // Purple

    // Role-specific pill colours — match the map pins: lender = lilac
    // (offers garden), tender = green (does the growing).
    lenderBg: '#f3e8f7',      // Light purple background
    lenderText: '#B868CA',    // Purple text
    tenderBg: '#e8f5e9',      // Light green background
    tenderText: '#4F6642',    // Forest green text
    bothBg: '#eef5e9',        // Light green/cream mix
    bothText: '#4F6642',      // Forest green
  },

  // ── Typography ────────────────────────────────────────────────────────────
  // Use whatever Freegle's upstream typography.scss sets (Source Sans Pro
  // body, system fallbacks). `inherit` keeps existing `var(--lat-font-*)`
  // call-sites working without forcing a different family.
  fonts: {
    heading: 'inherit',
    body: 'inherit',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },

  // ── Map ───────────────────────────────────────────────────────────────────
  map: {
    // Piggybacking on Freegle's tile server for now; replace with own or
    // public OSM tiles when traffic warrants it.
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    defaultCenter: [52.4862, -1.8904] as [number, number], // England centroid
    defaultZoom: 6,
    // Blur radius in metres applied to user pin coordinates before display.
    pinBlurMetres: 400,
    // Pin colours for SVG map icons
    lenderPinColor: '#BB68CA',   // purple — lender (has a garden)
    lenderPinStroke: '#7a3a8a',  // dark purple
    tenderPinColor: '#329732',   // brand green — tender (wants to grow)
    tenderPinStroke: '#4F6642',  // forest green
    bothPinColor: '#8B5BA8',     // blended purple-green — both roles
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
