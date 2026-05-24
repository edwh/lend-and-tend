<template>
  <div v-if="show" class="smart-address-overlay" @click.self="close">
    <div class="smart-address-modal">
      <div class="modal-header">
        <h3>Which garden?</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="modal-body">
        <p v-if="offers.length === 1" class="single-garden-text">
          You have one garden listing. Ready to share your address?
        </p>
        <p v-else class="multi-garden-text">
          You have {{ offers.length }} garden listings. Which one are you
          sharing the address for?
        </p>
        <div v-if="offers.length > 1" class="garden-list">
          <div
            v-for="(offer, idx) in offers"
            :key="offer.id"
            class="garden-item"
            :class="{ selected: selectedIdx === idx }"
            @click="selectedIdx = idx"
          >
            <div class="garden-title">{{ offer.subject }}</div>
            <div class="garden-location">{{ getLocationLabel(offer) }}</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Cancel</button>
        <button
          class="btn btn-primary"
          :disabled="!selectedOffer || sending"
          @click="sendAddress"
        >
          {{ sending ? 'Sending...' : 'Send my address' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSmartAddress } from '../composables/useSmartAddress'

const props = defineProps({
  show: { type: Boolean, default: false },
  offers: { type: Array, required: true },
})

const emit = defineEmits(['close', 'sent'])

const { getAddressFromTextbody, buildAddressMessage } = useSmartAddress()
const selectedIdx = ref(0)
const sending = ref(false)

const selectedOffer = computed(() => {
  return props.offers[selectedIdx.value] || null
})

const getLocationLabel = (offer) => {
  const postcode = getAddressFromTextbody(offer.textbody)
  return (
    postcode ||
    (offer.lat && offer.lng
      ? `${offer.lat.toFixed(2)}, ${offer.lng.toFixed(2)}`
      : 'Location unknown')
  )
}

const close = () => {
  emit('close')
}

const sendAddress = () => {
  if (!selectedOffer.value) return
  sending.value = true
  try {
    const msg = buildAddressMessage(
      getAddressFromTextbody(selectedOffer.value.textbody),
      selectedOffer.value.subject
    )
    emit('sent', msg, selectedOffer.value)
  } finally {
    sending.value = false
  }
}
</script>

<style scoped lang="scss">
.smart-address-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.smart-address-modal {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;

  h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 600;
    color: #333;
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #333;
  }
}

.modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;

  .single-garden-text,
  .multi-garden-text {
    margin: 0 0 16px;
    color: #666;
    font-size: 0.95rem;
  }
}

.garden-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.garden-item {
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #6b9e3c;
    background: #f5f9f1;
  }

  &.selected {
    border-color: #6b9e3c;
    background: #e8f4e8;
  }

  .garden-title {
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
  }

  .garden-location {
    font-size: 0.85rem;
    color: #999;
  }
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}

.btn {
  padding: 10px 20px;
  border-radius: 4px;
  border: none;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: #6b9e3c;
  color: white;

  &:hover:not(:disabled) {
    background: #5a8430;
  }
}

.btn-secondary {
  background: white;
  color: #333;
  border: 1px solid #ddd;

  &:hover {
    background: #f5f5f5;
  }
}
</style>
