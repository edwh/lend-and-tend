<template>
  <div
    class="chatMessageWrapper"
    :class="{ myChatMessage: messageIsFromCurrentUser }"
  >
    <div v-if="!messageIsFromCurrentUser" class="chatMessageProfilePic">
      <ProfileImage
        v-if="otheruser"
        :image="otheruser?.profile?.path"
        :name="otheruser?.displayname"
        class="inline"
        is-thumbnail
        size="sm"
      />
    </div>
    <div class="lat-promised">
      <div v-if="!refmsg" class="text-muted small">
        This message refers to a garden listing that has been removed.
      </div>
      <div v-else class="promised-card">
        <div class="promised-icon">🤝</div>
        <div class="promised-body">
          <div class="promised-title">Garden agreement</div>
          <div class="promised-garden">{{ gardenName }}</div>
          <div class="promised-status" :class="statusClass">{{ statusLabel }}</div>
        </div>
        <NuxtLink
          :to="agreementUrl"
          class="btn-view-agreement"
        >
          {{ isConfirmed ? 'View ✓' : 'View →' }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { fetchReferencedMessage, useChatMessageBase } from '~/composables/useChat'
import ProfileImage from '~/components/ProfileImage.vue'

const props = defineProps({
  chatid: { type: Number, required: true },
  id: { type: Number, required: true },
  last: { type: Boolean, default: false },
  pov: { type: Number, default: null },
  highlightEmails: { type: Boolean, default: false },
})

await fetchReferencedMessage(props.chatid, props.id)

const { refmsgid, refmsg, otheruser, messageIsFromCurrentUser } = useChatMessageBase(props.chatid, props.id, props.pov)

const gardenName = computed(() =>
  refmsg.value?.subject?.replace(/^(Offer|Wanted):\s*/i, '') || 'Garden'
)

const currentPromise = computed(() => refmsg.value?.promises?.[0] || null)
const isConfirmed = computed(() => !!currentPromise.value?.acceptedat)
const isProposed = computed(() => !!currentPromise.value && !currentPromise.value.acceptedat)

const statusLabel = computed(() => {
  if (isConfirmed.value) return 'Both parties agreed'
  if (isProposed.value) return 'Awaiting acceptance'
  return 'Agreement started'
})

const statusClass = computed(() => ({
  'status--confirmed': isConfirmed.value,
  'status--pending': isProposed.value && !isConfirmed.value,
}))

const agreementUrl = computed(() => {
  if (!refmsgid.value || !otheruser.value?.id) return '#'
  return `/agreement/${refmsgid.value}?userId=${otheruser.value.id}`
})
</script>

<style scoped>
.lat-promised {
  max-width: 380px;
}

.promised-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border: 1px solid #dde8d0;
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.promised-icon {
  font-size: 1.6rem;
  flex-shrink: 0;
}

.promised-body {
  flex: 1;
  min-width: 0;
}

.promised-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--lat-color-text-muted);
  margin-bottom: 2px;
  white-space: nowrap;
}

.promised-garden {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--lat-color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.promised-status {
  font-size: 0.8rem;
  margin-top: 3px;
  white-space: nowrap;
}

.status--confirmed { color: #155724; }
.status--pending { color: #856404; }

.btn-view-agreement {
  flex-shrink: 0;
  background: var(--lat-color-primary);
  color: white;
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.btn-view-agreement:hover {
  opacity: 0.85;
  color: white;
  text-decoration: none;
}
</style>
