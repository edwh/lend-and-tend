<template>
  <div class="admin-page">
    <h1 class="page-title">Dashboard</h1>

    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-box__num">{{ stats.listings }}</div>
        <div class="stat-box__label">Total listings</div>
      </div>
      <div class="stat-box">
        <div class="stat-box__num">{{ stats.lenders }}</div>
        <div class="stat-box__label">Gardens to lend</div>
      </div>
      <div class="stat-box">
        <div class="stat-box__num">{{ stats.tenders }}</div>
        <div class="stat-box__label">Tenders</div>
      </div>
      <div class="stat-box">
        <div class="stat-box__num">{{ stats.concessions }}</div>
        <div class="stat-box__label">Concessions</div>
      </div>
    </div>

    <div class="admin-card">
      <div class="admin-card__title">Recent listings</div>
      <div v-if="loadingListings" class="text-muted">Loading…</div>
      <table v-else class="admin-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Type</th>
            <th>Posted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in recentListings" :key="m.id">
            <td>{{ m.subject }}</td>
            <td>
              <span class="badge" :class="m.type === 'Offer' ? 'badge-offer' : 'badge-wanted'">
                {{ m.type === 'Offer' ? 'Lender' : 'Tender' }}
              </span>
            </td>
            <td class="text-muted">{{ formatDate(m.arrival) }}</td>
            <td>
              <NuxtLink :to="`/admin/listings?id=${m.id}`" class="btn btn-sm btn-primary">View</NuxtLink>
            </td>
          </tr>
          <tr v-if="recentListings.length === 0">
            <td colspan="4" class="text-muted">No listings yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import Api from '~/api'

definePageMeta({ layout: 'default' })
useHead({ title: 'Dashboard — L&T Admin' })

const config = useRuntimeConfig()
const api = Api(config)

const loadingListings = ref(true)
const recentListings = ref<any[]>([])

const stats = reactive({ listings: 0, lenders: 0, tenders: 0, concessions: 0 })

onMounted(async () => {
  try {
    const groupid = config.public.LAT_WORLD_GROUPID
    const data = await $fetch(`${config.public.APIv2}/messages`, {
      params: { groupid, types: 'Offer,Wanted', limit: 20, collection: 'Approved' },
    })
    const messages = Array.isArray(data) ? data : (data as any)?.messages ?? []
    recentListings.value = messages.slice(0, 10)
    stats.listings = messages.length
    stats.lenders = messages.filter((m: any) => m.type === 'Offer').length
    stats.tenders = messages.filter((m: any) => m.type === 'Wanted').length
  } catch { /* noop */ }
  loadingListings.value = false
})

function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>
