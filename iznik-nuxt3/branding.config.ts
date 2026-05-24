// Re-export from the lat layer's branding.config so upstream files that
// still reference `@/branding.config` (e.g. `layouts/admin.vue`) continue to
// resolve. The single source of truth is `iznik-nuxt3/lat/branding.config.ts`.
export { default } from './lat/branding.config'
export * from './lat/branding.config'
