import rawBranding from '~/branding.config'

export default defineNuxtPlugin(() => {
  useHead({
    style: [
      {
        key: 'lat-branding-vars',
        innerHTML: `:root {
  --lat-font-body: ${rawBranding.fonts.body};
  --lat-font-heading: ${rawBranding.fonts.heading};
  --lat-color-primary: ${rawBranding.colors.primary};
  --lat-color-primary-dark: ${rawBranding.colors.primaryDark};
  --lat-color-primary-light: ${rawBranding.colors.primaryLight};
  --lat-color-background: ${rawBranding.colors.background};
  --lat-color-surface: ${rawBranding.colors.surface};
  --lat-color-text: ${rawBranding.colors.text};
  --lat-color-text-muted: ${rawBranding.colors.textMuted};
  --lat-color-lender-bg: ${rawBranding.colors.lenderBg};
  --lat-color-lender-text: ${rawBranding.colors.lenderText};
  --lat-color-tender-bg: ${rawBranding.colors.tenderBg};
  --lat-color-tender-text: ${rawBranding.colors.tenderText};
  --lat-color-both-bg: ${rawBranding.colors.bothBg};
  --lat-color-both-text: ${rawBranding.colors.bothText};
}`,
      },
    ],
  })
})
