<template>
  <div class="location-picker">
    <!-- Step 1: postcode entry -->
    <template v-if="!postcodeConfirmed">
      <div class="location-row">
        <input
          id="lat-postcode-input"
          v-model="postcodeInput"
          type="text"
          placeholder="e.g. SW1A 1AA"
          @keypress.enter.prevent="lookupPostcode"
        />
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="lookingUp"
          @click="lookupPostcode"
        >
          {{ lookingUp ? 'Searching…' : 'Find →' }}
        </button>
      </div>
      <p v-if="postcodeError" class="status-err">{{ postcodeError }}</p>
    </template>

    <!-- Step 2: choose property or enter address -->
    <template v-else>
      <div class="postcode-bar">
        <span class="postcode-badge">{{ confirmedPostcode.name }}</span>
        <button type="button" class="btn-change" @click="changePostcode">
          Change
        </button>
      </div>

      <div v-if="loadingAddresses" class="status-info">Loading addresses…</div>

      <!-- PAF property dropdown (production) -->
      <template v-else-if="propertyList.length">
        <label for="lat-address-select" class="address-label">
          Select your property <span class="field-required">*</span>
        </label>
        <select
          id="lat-address-select"
          v-model="selectedPropertyId"
          @change="onPropertySelected"
        >
          <option value="">Please choose your property…</option>
          <option v-for="p in propertyList" :key="p.id" :value="p.id">
            {{ p.text }}
          </option>
        </select>
        <p v-if="selectedAddress" class="status-ok">✓ {{ selectedAddress }}</p>
      </template>

      <!-- Fallback: manual street address input (dev / no PAF data) -->
      <template v-else>
        <label for="lat-address-manual" class="address-label">
          House number &amp; street <span class="field-required">*</span>
        </label>
        <input
          id="lat-address-manual"
          v-model="manualAddress"
          type="text"
          :placeholder="`e.g. 10 Downing Street, ${confirmedPostcode.name}`"
          @input="onManualAddressInput"
        />
        <p v-if="manualAddress" class="status-ok">
          ✓ {{ manualAddress }}, {{ confirmedPostcode.name }}
        </p>
      </template>
    </template>
  </div>
</template>

<script setup>
import { convertStructuredToUnstructured } from 'postman-paf'
import api from '~/api'

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  // When editing an existing listing, prefill the postcode field so the
  // user doesn't have to retype it just to confirm their address.
  initialPostcode: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const config = useRuntimeConfig()

const postcodeInput = ref(props.initialPostcode || '')
const postcodeError = ref('')
const lookingUp = ref(false)
const postcodeConfirmed = ref(false)

watch(
  () => props.initialPostcode,
  (val) => {
    if (val && !postcodeInput.value && !postcodeConfirmed.value) {
      postcodeInput.value = val
    }
  }
)
const confirmedPostcode = ref(null)
const loadingAddresses = ref(false)
const propertyList = ref([])
const selectedPropertyId = ref('')
const selectedAddress = ref('')
const manualAddress = ref('')

function buildSingleline(address) {
  const toConvert = {
    postcode: address.postcode,
    buildingName: address.buildingname,
    buildingNumber: address.buildingnumber,
    subBuildingName: address.subbuildingname,
    departmentName: address.departmentname,
    dependentLocality: address.dependentlocality,
    doubleDependentLocality: address.doubledependentlocality,
    dependentThoroughfareDescriptor: address.dependentthoroughfaredescriptor,
    organisationName: address.organisationname,
    suOrganisationIndicator: address.suorganisationindicator,
    deliveryPointSuffix: address.deliverypointsuffix,
    udprn: address.udprn,
    postTown: address.posttown,
    postcodeType: address.postcodetype,
    poBoxNumber: address.pobox,
    thoroughfareName: address.thoroughfaredescriptor,
  }
  const converted = convertStructuredToUnstructured(toConvert)
  let line = ''
  for (let i = 1; i <= 5; i++) {
    if (converted['line' + i]) line += converted['line' + i] + ', '
  }
  return (line + (address.postcode || '')).replace(/,\s*$/, '').trim()
}

async function lookupPostcode() {
  const q = postcodeInput.value.trim().toUpperCase()
  if (!q) return
  lookingUp.value = true
  postcodeError.value = ''

  try {
    /* First try the Freegle location DB (has data in production) */
    let locationId = null
    let lat = null
    let lng = null
    let name = q

    try {
      const results = await api(config).location.typeahead(q)
      if (results?.length) {
        const match = results[0]
        locationId = match.id
        lat = match.lat
        lng = match.lng
        name = match.name || q
      }
    } catch {
      /* Freegle DB unavailable — fall through to postcodes.io */
    }

    /* Fall back to postcodes.io if Freegle returned nothing */
    if (!lat || !lng) {
      const pcResp = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(q)}`
      )
      const pcData = await pcResp.json()
      if (pcData.status !== 200) {
        postcodeError.value = 'Postcode not found. Please try again.'
        return
      }
      lat = pcData.result.latitude
      lng = pcData.result.longitude
      name = pcData.result.postcode || q
    }

    confirmedPostcode.value = { id: locationId, name, lat, lng }
    postcodeConfirmed.value = true

    /* Try to fetch PAF property list (only works if Freegle DB has PAF data) */
    if (locationId) {
      await loadAddresses(locationId)
    }
  } catch {
    postcodeError.value = 'Could not look up postcode.'
  } finally {
    lookingUp.value = false
  }
}

async function loadAddresses(locationId) {
  loadingAddresses.value = true
  propertyList.value = []
  try {
    const addresses = await api(config).location.fetchAddresses(locationId)
    propertyList.value = (addresses || []).map((a) => ({
      id: a.id,
      text: buildSingleline(a),
    }))
  } catch {
    propertyList.value = []
  } finally {
    loadingAddresses.value = false
  }
}

function onPropertySelected() {
  if (!selectedPropertyId.value) {
    selectedAddress.value = ''
    emit('update:modelValue', null)
    return
  }
  // <select> values come back as strings even when bound to numeric ids,
  // so compare with loose equality.
  // eslint-disable-next-line eqeqeq
  const found = propertyList.value.find((p) => p.id == selectedPropertyId.value)
  if (!found) return
  selectedAddress.value = found.text
  emit('update:modelValue', {
    address: found.text,
    postcode: confirmedPostcode.value.name,
    lat: confirmedPostcode.value.lat,
    lng: confirmedPostcode.value.lng,
    // `pafid` is the PAF property id — used downstream by LatSendAddressModal
    // to create a real Freegle Address record so the chat message renders as
    // the proper map-card. Only populated when the user picks from the PAF
    // dropdown (not for the manual-entry fallback).
    pafid: found.id,
  })
}

function onManualAddressInput() {
  if (!manualAddress.value.trim()) {
    emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', {
    address: `${manualAddress.value.trim()}, ${confirmedPostcode.value.name}`,
    postcode: confirmedPostcode.value.name,
    lat: confirmedPostcode.value.lat,
    lng: confirmedPostcode.value.lng,
  })
}

function changePostcode() {
  postcodeConfirmed.value = false
  confirmedPostcode.value = null
  propertyList.value = []
  selectedPropertyId.value = ''
  selectedAddress.value = ''
  manualAddress.value = ''
  emit('update:modelValue', null)
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
  box-shadow: 0 0 0 2px rgba(50, 151, 50, 0.15);
}

select,
input[type='text'] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  box-sizing: border-box;
  font-family: inherit;
  background: white;
}

select:focus,
input[type='text']:focus {
  outline: none;
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 2px rgba(50, 151, 50, 0.15);
}

.postcode-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.postcode-badge {
  background: #e8f5e9;
  color: var(--lat-color-primary);
  border: 1px solid #c8e6c9;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.btn-change {
  background: none;
  border: none;
  color: var(--lat-color-primary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.address-label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 0.9rem;
  color: var(--lat-color-text);
}

.field-required {
  color: #dc3545;
  font-weight: 700;
  margin-left: 2px;
}

.btn {
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  white-space: nowrap;
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
  margin-top: 8px;
  margin-bottom: 0;
}

.status-err {
  color: #dc3545;
  font-size: 0.9rem;
  margin-top: 6px;
  margin-bottom: 0;
}

.status-info {
  color: var(--lat-color-text-muted);
  font-size: 0.9rem;
}
</style>
