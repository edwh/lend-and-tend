<template>
  <div :class="['lat-admin-menu-item', { active: isActive }]">
    <NuxtLink
      :to="link"
      class="lat-admin-menu-link"
      :class="{ 'lat-admin-menu-link--indent': indent }"
      :aria-current="isActive ? 'page' : null"
      @click="onClick"
    >
      <span>{{ name }}</span>
      <span
        v-if="badge > 0"
        class="lat-admin-menu-badge"
        :aria-label="`${badge} waiting`"
        >{{ badge }}</span
      >
    </NuxtLink>
  </div>
</template>

<script setup>
// L&T stand-in for ModTools' ModMenuItemLeft. The admin layout (lat/layouts/
// admin.vue) was written against the ModTools component, but the lat layer
// extends the root app, not modtools/, so that component never resolved and
// the sidebar rendered only its section headings. Same props, no ModTools
// stores: `count`/`othercount` (ModTools work-count keys) are accepted and
// ignored; `directcount` shows as a badge. The whole row is the link (a big
// tap target), and the current section is announced with aria-current.
import { computed } from 'vue'
import { activeMenuLink } from '../composables/latAdminMenu'
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

const isActive = computed(
  () => activeMenuLink(route?.path || '') === props.link
)

const badge = computed(() => props.directcount || 0)

function onClick() {
  emit('mobilehidemenu')
}
</script>

<style scoped>
.lat-admin-menu-item {
  margin: 2px 6px;
  border-radius: 6px;
}
.lat-admin-menu-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  color: #1a2e0d;
  text-decoration: none;
  font-size: 1rem;
}
.lat-admin-menu-link--indent {
  padding-left: 22px;
}
.lat-admin-menu-link:hover {
  background: #e4e9df;
  text-decoration: underline;
}
.lat-admin-menu-item.active .lat-admin-menu-link {
  background: #2f7d4a;
  color: #fff;
  font-weight: 600;
}
.lat-admin-menu-badge {
  display: inline-block;
  margin-left: auto;
  min-width: 1.4em;
  padding: 0 6px;
  border-radius: 999px;
  background: #b71c1c;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}
</style>
