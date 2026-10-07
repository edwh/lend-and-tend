<template>
  <div>
    <NuxtLink to="/admin/members" class="lat-admin-btn-link"
      >← Back to members</NuxtLink
    >
    <h1 class="lat-admin-title lat-admin-title--spaced">
      {{ user?.displayname ? user.displayname : `Member #${userId}` }}
    </h1>

    <p v-if="loading" class="lat-admin-muted">Loading…</p>
    <p v-else-if="fetchError" class="lat-admin-error" role="alert">
      {{ fetchError }}
    </p>

    <template v-else-if="user">
      <dl class="lat-admin-card lat-admin-info">
        <div class="lat-admin-info-row">
          <dt>Member id</dt>
          <dd class="lat-admin-muted">{{ userId }}</dd>
        </div>
        <div class="lat-admin-info-row">
          <dt>Name</dt>
          <dd>{{ user.displayname }}</dd>
        </div>
        <div class="lat-admin-info-row">
          <dt>Email</dt>
          <dd class="lat-admin-muted">{{ user.email || '—' }}</dd>
        </div>
        <div class="lat-admin-info-row">
          <dt>Role</dt>
          <dd class="lat-admin-muted">{{ user.settings?.lat_role || '—' }}</dd>
        </div>
        <div class="lat-admin-info-row">
          <dt>Membership</dt>
          <dd>
            <span
              class="lat-admin-badge"
              :class="paymentClass(user.settings?.lat_payment?.status)"
              >{{ paymentLabel(user.settings?.lat_payment?.status) }}</span
            >
          </dd>
        </div>
        <div class="lat-admin-info-row">
          <dt>System role</dt>
          <dd class="lat-admin-muted">{{ user.systemrole || 'User' }}</dd>
        </div>
      </dl>

      <form class="lat-admin-card" @submit.prevent="savePayment">
        <h2 class="lat-admin-card-head">Set membership status</h2>
        <label for="lat-admin-payment-status" class="lat-admin-label"
          >Membership</label
        >
        <select
          id="lat-admin-payment-status"
          v-model="editStatus"
          class="lat-admin-input"
        >
          <option value="">Not joined</option>
          <option value="paid">Paid</option>
          <option value="concession">Concession</option>
        </select>
        <p v-if="saveError" class="lat-admin-error lat-admin-feedback" role="alert">
          {{ saveError }}
        </p>
        <p v-if="saveOk" class="lat-admin-ok lat-admin-feedback" role="status">
          Saved.
        </p>
        <div class="lat-admin-form-actions">
          <button type="submit" class="lat-admin-sbtn" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { paymentLabel, paymentClass } from '~/composables/latAdminMembers'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Member — L&T Admin' })

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
    // modtools=true returns settings (membership status, role) to a moderator.
    const data = await $fetch(`${config.public.APIv2}/user/${userId}`, {
      params: { modtools: true },
      headers: { Authorization: authStore.auth.jwt },
    })
    user.value = data?.user ?? data
    editStatus.value = user.value?.settings?.lat_payment?.status ?? ''
  } catch {
    fetchError.value = 'Could not load this member.'
  }
  loading.value = false
})

async function savePayment() {
  saving.value = true
  saveError.value = ''
  saveOk.value = false
  try {
    // PATCH /user edits ANOTHER member (moderator-only) and merges settings;
    // PATCH /session would have replaced the ADMIN's own settings instead.
    await $fetch(`${config.public.APIv2}/user`, {
      method: 'PATCH',
      body: {
        id: parseInt(userId as string),
        settings: {
          lat_payment: editStatus.value
            ? {
                status: editStatus.value,
                updatedByAdmin: true,
                updatedAt: new Date().toISOString(),
              }
            : null,
        },
      },
      headers: { Authorization: authStore.auth.jwt },
    })
    if (user.value) {
      user.value.settings = {
        ...user.value.settings,
        lat_payment: editStatus.value ? { status: editStatus.value } : null,
      }
    }
    saveOk.value = true
    setTimeout(() => {
      saveOk.value = false
    }, 3000)
  } catch {
    saveError.value = 'Save failed. You may not have permission.'
  }
  saving.value = false
}
</script>

<style scoped>
.lat-admin-title--spaced {
  margin: 12px 0 1rem;
}

.lat-admin-info {
  margin-bottom: 0;
}

.lat-admin-info-row {
  display: flex;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.9rem;
}

.lat-admin-info-row:last-child {
  border-bottom: none;
}

.lat-admin-info-row dt {
  font-weight: 600;
  width: 120px;
  flex-shrink: 0;
  color: #55654b;
}

.lat-admin-info-row dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.lat-admin-card-head {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: #1a2e0d;
}

.lat-admin-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 4px;
  color: #55654b;
}

.lat-admin-feedback {
  font-size: 0.88rem;
  margin: 8px 0 0;
}

.lat-admin-form-actions {
  margin-top: 12px;
}
</style>
