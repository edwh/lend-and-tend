<template>
  <div>
    <h1 class="lat-admin-title">Search members</h1>
    <p class="lat-admin-subtitle">Find a member by name or email address.</p>

    <form class="lat-admin-toolbar" role="search" @submit.prevent="search">
      <label for="lat-admin-user-search" class="visually-hidden"
        >Name or email address</label
      >
      <input
        id="lat-admin-user-search"
        v-model="query"
        class="lat-admin-input lat-admin-search-input"
        type="search"
        placeholder="Name or email address"
        autocomplete="off"
      />
      <button type="submit" class="lat-admin-sbtn" :disabled="searching">
        {{ searching ? 'Searching…' : 'Search' }}
      </button>
    </form>
    <p v-if="searchError" class="lat-admin-error" role="alert">
      {{ searchError }}
    </p>

    <div class="lat-admin-card">
      <div v-if="results.length" class="lat-admin-table-wrap">
        <table class="lat-admin-at">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Membership</th>
              <th scope="col">Role</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in results" :key="u.id">
              <td class="lat-admin-muted">{{ u.id }}</td>
              <td>{{ u.displayname }}</td>
              <td class="lat-admin-muted">{{ u.email || '—' }}</td>
              <td>
                <span
                  class="lat-admin-badge"
                  :class="paymentClass(u.settings?.lat_payment?.status)"
                  >{{ paymentLabel(u.settings?.lat_payment?.status) }}</span
                >
              </td>
              <td class="lat-admin-muted">{{ u.settings?.lat_role || '—' }}</td>
              <td>
                <NuxtLink
                  :to="`/admin/users/${u.id}`"
                  class="lat-admin-btn-link"
                  >View</NuxtLink
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p
        v-if="!results.length && searched && !searching"
        class="lat-admin-muted"
      >
        No members match that search.
      </p>
      <p v-else-if="!results.length" class="lat-admin-muted">
        Type a name or email address to search.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import {
  searchResultIds,
  resolveUsers,
  adminUserFetcher,
  paymentLabel,
  paymentClass,
} from '~/composables/latAdminMembers'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Search members — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()

const query = ref('')
const results = ref<any[]>([])
const searching = ref(false)
const searched = ref(false)
const searchError = ref('')

async function search() {
  const q = query.value.trim()
  searchError.value = ''
  if (!q) {
    searchError.value = 'Type a name or email address to search.'
    return
  }
  searching.value = true
  searched.value = false
  try {
    // /user/search returns ids only; resolve each as an admin for the details.
    const data = await $fetch(`${config.public.APIv2}/user/search`, {
      params: { q },
      headers: { Authorization: authStore.auth.jwt },
    })
    const ids = searchResultIds(data)
    results.value = await resolveUsers(
      ids,
      adminUserFetcher({
        apiBase: config.public.APIv2,
        token: authStore.auth.jwt,
      })
    )
    searched.value = true
  } catch (e: any) {
    results.value = []
    searchError.value =
      e?.response?.status === 400
        ? 'That search could not be understood. Try a name or an email address.'
        : 'Search failed. Please try again.'
  }
  searching.value = false
}
</script>

<style scoped>
.lat-admin-search-input {
  flex: 1 1 240px;
}
</style>
