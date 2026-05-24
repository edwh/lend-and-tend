<template>
  <b-modal
    ref="modal"
    scrollable
    title="Agree to share a garden"
    size="lg"
    no-stacking
    @shown="onShow"
    @hidden="emit('hidden')"
  >
    <template #default>
      <div class="promise-content">
        <notice-message class="mb-3">
          This lets the other person know you're planning to share this garden
          with them. You can change your mind later using the
          <em>Unpromise</em> option.
        </notice-message>

        <div class="form-section">
          <div class="section-header">
            <v-icon icon="leaf" class="section-icon" />
            <span class="section-title">{{
              props.messages && props.messages.length > 1
                ? 'Which garden listing?'
                : "You're agreeing to share:"
            }}</span>
          </div>
          <b-form-select
            v-model="message"
            :options="messageOptions"
            class="form-select-modern"
          />
        </div>

        <div class="form-section">
          <div class="section-header">
            <v-icon icon="user" class="section-icon" />
            <span class="section-title">With:</span>
          </div>
          <div class="user-display">
            {{ selectedUserName }}
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="modal-actions">
        <b-button variant="link" class="cancel-btn" @click="hide">
          Cancel
        </b-button>
        <SpinButton
          variant="primary"
          icon-name="handshake"
          label="Agree"
          :disabled="buttonDisabled"
          @handle="promise"
        />
      </div>
    </template>
  </b-modal>
</template>
<script setup>
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import SpinButton from '~/components/SpinButton'
import { useMessageStore } from '~/stores/message'
import { useOurModal } from '~/composables/useOurModal'

const NoticeMessage = defineAsyncComponent(() =>
  import('~/components/NoticeMessage')
)

const props = defineProps({
  messages: {
    validator: (prop) => typeof prop === 'object' || prop === null,
    required: true,
  },
  selectedMessage: {
    type: Number,
    required: false,
    default: 0,
  },
  users: {
    validator: (prop) => typeof prop === 'object' || prop === null,
    required: true,
  },
  selectedUser: {
    type: Number,
    required: false,
    default: 0,
  },
  maybe: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const emit = defineEmits(['hide', 'hidden'])

const messageStore = useMessageStore()
const { modal, hide } = useOurModal()

const message = ref(null)

const buttonDisabled = computed(() => {
  return !props.messages || props.messages.length === 0 || !message.value
})

const messageOptions = computed(() => {
  const options = []

  if (props.messages) {
    if (props.messages.length > 1) {
      options.push({
        value: 0,
        text: '-- Please choose --',
      })
    }

    for (const messageItem of props.messages) {
      if (
        messageItem.type === 'Offer' &&
        (!messageItem.outcomes || messageItem.outcomes.length === 0)
      ) {
        options.push({
          value: messageItem.id,
          text: messageItem.subject,
        })
      }
    }
  } else {
    options.push({
      value: 0,
      text: '...Loading...',
      selected: true,
    })
  }

  return options
})

const selectedUserName = computed(() => {
  if (props.users && props.users.length > 0) {
    return props.users[0].displayname
  }
  return 'Someone'
})

watch(
  () => props.messages,
  (newVal) => {
    let selected = false

    if (newVal) {
      // Maybe the selected message we picked up from a chat no longer exists.
      newVal.forEach((m) => {
        if (
          (!m.outcomes || m.outcomes.length === 0) &&
          parseInt(m.id) === parseInt(message.value)
        ) {
          selected = true
          message.value = m.id
        }
      })

      if (!selected) {
        message.value = 0
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.selectedMessage,
  (newVal) => {
    message.value = newVal
  }
)

async function promise(callback) {
  if (message.value) {
    const userid = props.selectedUser
    await messageStore.promise(message.value, userid)

    if (props.maybe) {
      // Could add bandit tracking here if needed
    }

    emit('hide')
    hide()
  }

  callback()
}

function onShow() {
  message.value = props.selectedMessage

  // Auto-select if there's only one message
  if (props.messages && props.messages.length === 1) {
    const firstMsg = props.messages.find(
      (m) => m.type === 'Offer' && (!m.outcomes || m.outcomes.length === 0)
    )
    if (firstMsg) {
      message.value = firstMsg.id
    }
  }

  if (props.maybe) {
    // Could add bandit tracking here if needed
  }
}
</script>
<style scoped lang="scss">
@import 'assets/css/_color-vars.scss';

.promise-content {
  padding: 0;
}

.form-section {
  padding: 1rem 0;
  border-bottom: 1px solid $color-gray--lighter;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.section-icon {
  color: $color-success;
  font-size: 1rem;
}

.section-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: $color-gray--darker;
}

.section-description {
  font-size: 0.85rem;
  color: var(--color-gray-600);
  margin-bottom: 0.75rem;
}

.form-select-modern {
  font-weight: 600;
}

.user-display {
  padding: 0.75rem;
  background-color: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: 0.375rem;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.cancel-btn {
  color: var(--color-gray-600);
}
</style>
