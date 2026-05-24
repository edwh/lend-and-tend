<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
    <div
      class="modal-box"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <h2 id="report-title" class="modal-title">Report this {{ kind }}</h2>
      <p class="modal-desc">
        Let us know if this {{ kind }} contains offensive content, personal
        contact details, or anything that makes you uncomfortable. We review all
        reports.
      </p>

      <div class="field">
        <label class="field-label" for="report-reason">Reason</label>
        <select id="report-reason" v-model="reason" class="field-select">
          <option value="">— please select —</option>
          <option value="Offensive">Offensive or inappropriate content</option>
          <option value="Spam">Spam or commercial advertising</option>
          <option value="Contact">Contains personal contact details</option>
          <option value="Fake">Appears to be fake or misleading</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div class="field mt-2">
        <label class="field-label" for="report-detail"
          >Additional details <span class="field-hint">(optional)</span></label
        >
        <textarea
          id="report-detail"
          v-model="detail"
          class="field-textarea"
          rows="3"
          placeholder="Any extra context that might help us review this…"
        />
      </div>

      <div v-if="error" class="alert-error">{{ error }}</div>
      <div v-if="sent" class="alert-success">
        <VIcon :icon="['fas', 'check-circle']" /> Report submitted — thank you.
      </div>

      <div v-if="!sent" class="modal-actions">
        <button class="btn btn-outline" @click="$emit('close')">Cancel</button>
        <button
          class="btn btn-danger"
          :disabled="!reason || submitting"
          @click="submit"
        >
          {{ submitting ? 'Sending…' : 'Submit report' }}
        </button>
      </div>
      <div v-else class="modal-actions">
        <button class="btn btn-primary" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useChatStore } from '~/stores/chat'

const props = defineProps({
  open: { type: Boolean, required: true },
  kind: { type: String, required: true },
  chatRoomId: { type: Number, default: null },
  onReport: { type: Function, default: null },
})

defineEmits(['close'])
const chatStore = useChatStore()

const reason = ref('')
const detail = ref('')
const submitting = ref(false)
const sent = ref(false)
const error = ref('')

watch(
  () => props.open,
  (v) => {
    if (!v) {
      reason.value = ''
      detail.value = ''
      sent.value = false
      error.value = ''
    }
  }
)

async function submit() {
  if (!reason.value) return
  submitting.value = true
  error.value = ''
  try {
    if (props.onReport) {
      await props.onReport()
    } else if (props.chatRoomId) {
      await chatStore.report(props.chatRoomId, reason.value, detail.value, null)
    }
    sent.value = true
  } catch {
    error.value = 'Could not submit report. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-box {
  background: white;
  border-radius: 12px;
  padding: 32px;
  max-width: 460px;
  width: 100%;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
}

.modal-title {
  font-family: var(--lat-font-heading);
  font-size: 1.3rem;
  color: var(--lat-color-text);
  margin: 0 0 8px;
}

.modal-desc {
  font-size: 0.88rem;
  color: var(--lat-color-text-muted);
  margin: 0 0 20px;
  line-height: 1.5;
}

.field {
  margin-bottom: 0;
}
.mt-2 {
  margin-top: 12px;
}

.field-label {
  display: block;
  font-size: 0.87rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--lat-color-text);
}

.field-hint {
  font-weight: 400;
  color: var(--lat-color-text-muted);
}

.field-select,
.field-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.92rem;
  font-family: inherit;
  box-sizing: border-box;
}

.field-textarea {
  resize: vertical;
}

.field-select:focus,
.field-textarea:focus {
  outline: none;
  border-color: var(--lat-color-primary);
}

.alert-error {
  background: #fff0f0;
  color: #c0392b;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 0.88rem;
  margin-top: 12px;
}

.alert-success {
  background: #e8f5e9;
  color: #2d5a27;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 0.88rem;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-outline {
  background: transparent;
  color: var(--lat-color-text-muted);
  border: 1px solid #ddd;
}
.btn-danger {
  background: #c0392b;
  color: white;
}
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
