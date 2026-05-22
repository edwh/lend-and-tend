<template>
  <Teleport to="body">
    <div class="pin-modal-backdrop" @click.self="$emit('close')">
      <div class="pin-modal" role="dialog" aria-modal="true">
        <button class="modal-close" aria-label="Close" @click="$emit('close')">
          <VIcon :icon="['fas', 'times']" />
        </button>

        <div class="modal-role-badge" :class="`role-${pin.role}`">
          {{ branding.roles[pin.role as keyof typeof branding.roles]?.labelShort ?? pin.role }}
        </div>

        <h2 class="modal-name">{{ pin.displayName }}</h2>

        <p v-if="pin.about" class="modal-about">{{ pin.about }}</p>
        <p v-else class="modal-about modal-about--empty">No description provided yet.</p>

        <div class="modal-actions">
          <NuxtLink :to="`/garden/${pin.id}`" class="btn btn-outline-primary">
            View full profile
          </NuxtLink>
          <button
            class="btn btn-primary"
            :disabled="!isAuthenticated"
            @click="$emit('message', pin)"
          >
            Send message
          </button>
        </div>

        <p v-if="!isAuthenticated" class="modal-auth-note">
          <NuxtLink to="/login">Sign in</NuxtLink> to send messages
        </p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { type MapPin } from '~/stores/latMap'
import branding from '~/branding.config'

defineProps<{ pin: MapPin }>()
defineEmits<{
  close: []
  message: [pin: MapPin]
}>()

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>

<style scoped>
.pin-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.pin-modal {
  background: white;
  border-radius: 12px;
  padding: 28px 28px 24px;
  max-width: 420px;
  width: 100%;
  position: relative;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--lat-color-text-muted);
  font-size: 1.1rem;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
.modal-close:hover { color: var(--lat-color-text); background: #f5f5f5; }

.modal-role-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 4px;
  margin-bottom: 12px;
}
.role-lender { background: var(--lat-color-lender-bg); color: var(--lat-color-lender-text); }
.role-tender { background: var(--lat-color-tender-bg); color: var(--lat-color-tender-text); }
.role-both   { background: var(--lat-color-both-bg);   color: var(--lat-color-both-text);   }

.modal-name {
  margin: 0 0 10px;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--lat-color-text);
}

.modal-about {
  margin: 0 0 20px;
  color: var(--lat-color-text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}
.modal-about--empty { font-style: italic; }

.modal-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 18px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-primary:hover { background: var(--lat-color-primary-dark); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-outline-primary {
  background: transparent;
  color: var(--lat-color-primary);
  border: 2px solid var(--lat-color-primary);
}
.btn-outline-primary:hover { background: rgba(107, 158, 60, 0.08); }

.modal-auth-note {
  margin: 12px 0 0;
  font-size: 0.82rem;
  color: var(--lat-color-text-muted);
}
.modal-auth-note a { color: var(--lat-color-primary); text-decoration: none; }

@media (max-width: 640px) {
  .pin-modal { padding: 20px; }
  .modal-actions { flex-direction: column; }
  .modal-actions .btn { width: 100%; }
}
</style>
