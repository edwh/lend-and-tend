<template>
  <div>
    <NuxtLink to="/admin/users" style="color:#6b9e3c;text-decoration:none;font-size:.9rem;">← Back to users</NuxtLink>
    <h2 style="font-size:1.4rem;margin:16px 0;color:#1a2e0d;">User #{{ userId }}</h2>

    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="fetchError" style="color:#c62828;">{{ fetchError }}</p>

    <template v-else-if="user">
      <div class="info-card">
        <div class="info-row"><span class="info-lbl">Name</span><span>{{ user.displayname }}</span></div>
        <div class="info-row"><span class="info-lbl">Email</span><span class="muted">{{ user.email || '—' }}</span></div>
        <div class="info-row"><span class="info-lbl">Role</span><span class="muted">{{ user.settings?.lat_role || '—' }}</span></div>
        <div class="info-row"><span class="info-lbl">Payment</span>
          <span class="badge" :class="pclass(user.settings?.lat_payment?.status)">{{ plabel(user.settings?.lat_payment?.status) }}</span>
        </div>
        <div class="info-row"><span class="info-lbl">System role</span><span class="muted">{{ user.systemrole || 'User' }}</span></div>
      </div>

      <div class="info-card mt-3">
        <h3 style="font-size:1rem;font-weight:700;margin:0 0 16px;">Edit payment status</h3>
        <select v-model="editStatus" class="sinput" style="width:auto;max-width:200px;display:inline-block;">
          <option value="">Not joined</option>
          <option value="paid">Paid</option>
          <option value="concession">Concession</option>
        </select>
        <div v-if="saveError" style="color:#c62828;font-size:.88rem;margin-top:8px;">{{ saveError }}</div>
        <div v-if="saveOk" style="color:#2e7d32;font-size:.88rem;margin-top:8px;">Saved.</div>
        <div style="margin-top:12px;">
          <button class="sbtn" :disabled="saving" @click="savePayment">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()
const route = useRoute()
const userId = route.params.id

const loading = ref(true)
const fetchError = ref('')
const user = ref<any>(null)
const editStatus = ref('')
const saving = ref(false)
const saveError = ref('')
const saveOk = ref(false)

onMounted(async () => {
  try {
    const data = await $fetch(`${config.public.APIv2}/user/${userId}`, {
      params: { modtools: true },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    user.value = data?.user ?? data
    editStatus.value = user.value?.settings?.lat_payment?.status ?? ''
  } catch { fetchError.value = 'Could not load user.' }
  loading.value = false
})

async function savePayment() {
  saving.value = true
  saveError.value = ''
  saveOk.value = false
  try {
    await $fetch(`${config.public.APIv2}/session`, {
      method: 'PATCH',
      body: {
        id: parseInt(userId as string),
        settings: { lat_payment: editStatus.value ? { status: editStatus.value, updatedByAdmin: true, updatedAt: new Date().toISOString() } : null },
      },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    if (user.value) user.value.settings = { ...user.value.settings, lat_payment: editStatus.value ? { status: editStatus.value } : null }
    saveOk.value = true
    setTimeout(() => { saveOk.value = false }, 3000)
  } catch { saveError.value = 'Save failed. You may not have permission.' }
  saving.value = false
}

const plabel = (s?: string) => s === 'paid' ? 'Paid' : s === 'concession' ? 'Concession' : 'Not joined'
const pclass = (s?: string) => s === 'paid' ? 'b-paid' : s === 'concession' ? 'b-conc' : 'b-none'
</script>

<style scoped>
.info-card { background:white; border-radius:8px; box-shadow:0 1px 6px rgba(0,0,0,.07); padding:20px; }
.mt-3 { margin-top:16px; }
.info-row { display:flex; gap:16px; padding:8px 0; border-bottom:1px solid #f0f0f0; font-size:.9rem; }
.info-row:last-child { border:none; }
.info-lbl { font-weight:600; width:120px; color:#6b7c61; flex-shrink:0; }
.badge { display:inline-block; padding:2px 8px; border-radius:12px; font-size:.75rem; font-weight:600; }
.b-paid { background:#e8f5e9; color:#2e7d32; }
.b-conc { background:#fff3e0; color:#e65100; }
.b-none { background:#f5f5f5; color:#757575; }
.sinput { padding:8px 12px; border:1px solid #ddd; border-radius:6px; font-size:.92rem; font-family:inherit; }
.sinput:focus { outline:none; border-color:#6b9e3c; }
.sbtn { padding:8px 16px; background:#6b9e3c; color:white; border:none; border-radius:6px; font-weight:600; cursor:pointer; }
.sbtn:disabled { opacity:.6; cursor:not-allowed; }
.muted { color:#6b7c61; }
</style>
