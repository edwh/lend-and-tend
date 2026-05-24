<template>
  <div class="location-picker">
    <div class="location-row">
      <input
        :value="modelValue?.postcode || ''"
        type="text"
        placeholder="e.g. SW1A 1AA"
        @input="handleInput"
        @keypress.enter="lookupLocation"
      />
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="lookingUp"
        @click="lookupLocation"
      >
        Find location
      </button>
    </div>
    <p
      v-if="locationStatus"
      :class="locationStatus.ok ? 'status-ok' : 'status-err'"
    >
      {{ locationStatus.message }}
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const locationStatus = ref(null)
const lookingUp = ref(false)
const currentPostcode = ref(props.modelValue?.postcode || '')

function handleInput(event) {
  currentPostcode.value = event.target.value
}

async function lookupLocation() {
  if (!currentPostcode.value.trim()) return

  lookingUp.value = true
  locationStatus.value = null

  try {
    const pcResp = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(
        currentPostcode.value.trim()
      )}`
    )
    const pcData = await pcResp.json()

    if (pcData.status !== 200) {
      locationStatus.value = {
        ok: false,
        message: 'Location not found. Try again.',
      }
      return
    }

    const { latitude, longitude, postcode } = pcData.result
    const district = pcData.result.admin_district

    if (postcode) currentPostcode.value = postcode

    emit('update:modelValue', {
      postcode: postcode || currentPostcode.value,
      lat: latitude,
      lng: longitude,
      district,
    })

    locationStatus.value = {
      ok: true,
      message: `✓ ${district || postcode || currentPostcode.value}`,
    }
  } catch {
    locationStatus.value = {
      ok: false,
      message: 'Could not look up location.',
    }
  } finally {
    lookingUp.value = false
  }
}
</script>

<style scoped>
.location-picker {
  width: 100%;
}

.location-row {
  display: flex;
  gap: 8px;
}

.location-row input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  box-sizing: border-box;
  font-family: inherit;
}

.location-row input:focus {
  outline: none;
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 2px rgba(107, 158, 60, 0.15);
}

.btn {
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.btn-secondary {
  background: transparent;
  color: var(--lat-color-primary);
  border: 2px solid var(--lat-color-primary);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-ok {
  color: var(--lat-color-primary);
  font-size: 0.9rem;
  margin-top: 6px;
}

.status-err {
  color: #dc3545;
  font-size: 0.9rem;
  margin-top: 6px;
}
</style>
