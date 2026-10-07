<template>
  <div :class="['lat-admin-menu-item', { active: isActive }]">
    <span v-if="indent" class="ps-3" />
    <NuxtLink :to="link" @click="onClick">{{ name }}</NuxtLink>
    <span v-if="badge > 0" class="lat-admin-menu-badge">{{ badge }}</span>
  </div>
</template>

<script setup>
// L&T stand-in for ModTools' ModMenuItemLeft. The admin layout (lat/layouts/
// admin.vue) was written against the ModTools component, but the lat layer
// extends the root app, not modtools/, so that component never resolved and
// the sidebar rendered only its section headings. Same props, no ModTools
// stores: `count`/`othercount` (ModTools work-count keys) are accepted and
// ignored; `directcount` shows as a badge.
import { computed } from 'vue'
import { useRoute } from '#imports'

const props = defineProps({
  link: { type: String, required: true },
  name: { type: String, required: true },
  count: { type: Array, required: false, default: null },
  othercount: { type: Array, required: false, default: null },
  countVariant: { type: String, required: false, default: 'danger' },
  directcount: { type: Number, required: false, default: 0 },
  indent: { type: Boolean, required: false, default: false },
})

const emit = defineEmits(['mobilehidemenu'])

const route = useRoute()

const isActive = computed(() => {
  const path = route?.path || ''
  if (props.link === '/admin') return path === '/admin' || path === '/admin/'
  return path === props.link || path.startsWith(props.link + '/')
})

const badge = computed(() => props.directcount || 0)

function onClick() {
  emit('mobilehidemenu')
}
</script>

<style scoped>
.lat-admin-menu-item {
  padding: 6px 4px;
  font-size: 1rem;
}
.lat-admin-menu-item a {
  color: var(--lat-color-text, #1a2e0d);
  text-decoration: none;
}
.lat-admin-menu-item a:hover {
  text-decoration: underline;
}
.lat-admin-menu-item.active a {
  font-weight: 600;
  color: var(--lat-color-primary-dark, #2f7d4a);
}
.lat-admin-menu-badge {
  display: inline-block;
  margin-left: 6px;
  min-width: 1.4em;
  padding: 0 6px;
  border-radius: 999px;
  background: #c62828;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}
</style>
