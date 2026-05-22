<template>
  <div class="agreement-form">
    <div v-if="isLoading" class="loading">
      <span>Loading agreement...</span>
    </div>

    <div v-else-if="agreement" class="agreement-details">
      <h2>Garden Sharing Agreement</h2>

      <div class="status-section">
        <p class="status" :class="agreement.status">
          Status: {{ formatStatus(agreement.status) }}
        </p>
        <p v-if="agreement.lenderAgreedAt" class="agreement-time">
          Lender agreed: {{ formatDate(agreement.lenderAgreedAt) }}
        </p>
        <p v-if="agreement.tenderAgreedAt" class="agreement-time">
          Tender agreed: {{ formatDate(agreement.tenderAgreedAt) }}
        </p>
      </div>

      <form @submit.prevent="updateAgreement" class="form-section">
        <div class="form-group">
          <label>Garden Address</label>
          <input
            v-model="formData.gardenAddress"
            type="text"
            placeholder="123 Main Street, City"
            :disabled="!canEdit"
          />
        </div>

        <div class="form-group">
          <label>Gardening Hours</label>
          <input
            v-model="formData.gardeningHours"
            type="text"
            placeholder="e.g., Weekends only, 9am-5pm"
            :disabled="!canEdit"
          />
        </div>

        <div class="form-group">
          <label>Growing Purpose</label>
          <input
            v-model="formData.growingPurpose"
            type="text"
            placeholder="e.g., Vegetables, flowers, herbs"
            :disabled="!canEdit"
          />
        </div>

        <div class="form-group">
          <label>Max People</label>
          <input
            v-model.number="formData.maxPeople"
            type="number"
            min="1"
            :disabled="!canEdit"
          />
        </div>

        <div class="form-group">
          <label>Exchange Terms</label>
          <textarea
            v-model="formData.exchangeTerms"
            placeholder="e.g., Share of harvest, weekly maintenance, etc."
            :disabled="!canEdit"
          ></textarea>
        </div>

        <div class="form-group">
          <label>End Date</label>
          <input
            v-model="formData.endDate"
            type="date"
            :disabled="!canEdit"
          />
        </div>

        <div class="form-group">
          <label>Notice Period (months)</label>
          <input
            v-model.number="formData.noticePeriodMonths"
            type="number"
            min="0"
            :disabled="!canEdit"
          />
        </div>

        <div class="form-group checkbox">
          <input
            v-model="formData.allowAnimals"
            type="checkbox"
            :disabled="!canEdit"
          />
          <label>Allow Animals</label>
        </div>

        <div class="form-group checkbox">
          <input
            v-model="formData.allowCommercial"
            type="checkbox"
            :disabled="!canEdit"
          />
          <label>Allow Commercial Use</label>
        </div>

        <div class="form-group">
          <label>Additional Terms</label>
          <textarea
            v-model="formData.additionalTerms"
            placeholder="Any other terms or conditions"
            :disabled="!canEdit"
          ></textarea>
        </div>

        <div class="form-actions">
          <button
            v-if="canEdit && hasChanges"
            type="submit"
            class="btn btn-primary"
            :disabled="isUpdating"
          >
            {{ isUpdating ? 'Saving...' : 'Save Changes' }}
          </button>

          <button
            v-if="canAgree && !currentUserAgreed"
            type="button"
            class="btn btn-agree"
            @click="agreeToAgreement"
            :disabled="isAgreeing"
          >
            {{ isAgreeing ? 'Agreeing...' : 'I Agree to This Terms' }}
          </button>

          <button
            v-if="agreement.status !== 'draft'"
            type="button"
            class="btn btn-secondary"
            @click="downloadPDF"
          >
            Download PDF
          </button>
        </div>

        <div v-if="updateError" class="error-message">
          {{ updateError }}
        </div>
      </form>

      <div v-if="agreement.status === 'complete'" class="checkins-section">
        <h3>Upcoming Check-ins</h3>
        <p v-if="pendingCheckins.length === 0" class="no-checkins">
          No pending check-ins
        </p>
        <div v-else class="checkins-list">
          <div
            v-for="checkin in pendingCheckins"
            :key="checkin.id"
            class="checkin-card"
          >
            <p>Scheduled: {{ formatDate(checkin.scheduledAt) }}</p>
            <p v-if="checkin.sentAt">
              Sent: {{ formatDate(checkin.sentAt) }}
            </p>
            <div class="checkin-statuses">
              <p v-if="checkin.lenderStatus">
                Lender: <strong>{{ checkin.lenderStatus }}</strong>
              </p>
              <p v-if="checkin.tenderStatus">
                Tender: <strong>{{ checkin.tenderStatus }}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useLatAgreementsStore } from '~/stores/latAgreements'
import type { Agreement } from '~/stores/latAgreements'

const props = defineProps<{
  agreementId: number
  role: 'lender' | 'tender'
}>()

const store = useLatAgreementsStore()

const formData = reactive({
  gardenAddress: '',
  gardeningHours: '',
  growingPurpose: '',
  maxPeople: null as number | null,
  exchangeTerms: '',
  endDate: '',
  noticePeriodMonths: 1,
  allowAnimals: false,
  allowCommercial: false,
  additionalTerms: ''
})

const originalData = reactive({...formData})
const isUpdating = ref(false)
const isAgreeing = ref(false)
const updateError = ref<string | null>(null)

const agreement = computed(() => store.current)
const error = computed(() => store.error)
const isLoading = computed(() => store.isLoading)
const pendingCheckins = computed(() =>
  store.pendingCheckins.filter(c => c.agreementId === props.agreementId)
)

const canEdit = computed(() => {
  if (!agreement.value) return false
  return agreement.value.status === 'draft' ||
    agreement.value.status === 'lender_agreed' ||
    agreement.value.status === 'tender_agreed'
})

const currentUserAgreed = computed(() => {
  if (!agreement.value) return false
  if (props.role === 'lender') {
    return !!agreement.value.lenderAgreedAt
  }
  return !!agreement.value.tenderAgreedAt
})

const canAgree = computed(() => {
  if (!agreement.value) return false
  if (props.role === 'lender') {
    return agreement.value.status !== 'complete' && !agreement.value.lenderAgreedAt
  }
  return agreement.value.status !== 'complete' && !agreement.value.tenderAgreedAt
})

const hasChanges = computed(() => {
  return JSON.stringify(formData) !== JSON.stringify(originalData)
})

const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    lender_agreed: 'Lender Agreed',
    tender_agreed: 'Tender Agreed',
    complete: 'Active',
    terminated: 'Terminated'
  }
  return statusMap[status] || status
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const loadAgreement = async () => {
  try {
    await store.fetchAgreement(props.agreementId)
    if (agreement.value) {
      // Populate form with agreement data
      formData.gardenAddress = agreement.value.gardenAddress || ''
      formData.gardeningHours = agreement.value.gardeningHours || ''
      formData.growingPurpose = agreement.value.growingPurpose || ''
      formData.maxPeople = agreement.value.maxPeople || null
      formData.exchangeTerms = agreement.value.exchangeTerms || ''
      formData.endDate = agreement.value.endDate ? agreement.value.endDate.split('T')[0] : ''
      formData.noticePeriodMonths = agreement.value.noticePeriodMonths || 1
      formData.allowAnimals = agreement.value.allowAnimals || false
      formData.allowCommercial = agreement.value.allowCommercial || false
      formData.additionalTerms = agreement.value.additionalTerms || ''

      // Store original data
      Object.assign(originalData, formData)
    }

    await store.fetchPendingCheckins()
  } catch (e) {
    console.error('Failed to load agreement:', e)
  }
}

const updateAgreement = async () => {
  if (!hasChanges.value) return

  isUpdating.value = true
  updateError.value = null

  try {
    const updates: Partial<Agreement> = {}

    if (formData.gardenAddress !== originalData.gardenAddress) {
      updates.gardenAddress = formData.gardenAddress || undefined
    }
    if (formData.gardeningHours !== originalData.gardeningHours) {
      updates.gardeningHours = formData.gardeningHours || undefined
    }
    if (formData.growingPurpose !== originalData.growingPurpose) {
      updates.growingPurpose = formData.growingPurpose || undefined
    }
    if (formData.maxPeople !== originalData.maxPeople) {
      updates.maxPeople = formData.maxPeople || undefined
    }
    if (formData.exchangeTerms !== originalData.exchangeTerms) {
      updates.exchangeTerms = formData.exchangeTerms || undefined
    }
    if (formData.endDate !== originalData.endDate) {
      updates.endDate = formData.endDate ? new Date(formData.endDate).toISOString() : undefined
    }
    if (formData.noticePeriodMonths !== originalData.noticePeriodMonths) {
      updates.noticePeriodMonths = formData.noticePeriodMonths
    }
    if (formData.allowAnimals !== originalData.allowAnimals) {
      updates.allowAnimals = formData.allowAnimals
    }
    if (formData.allowCommercial !== originalData.allowCommercial) {
      updates.allowCommercial = formData.allowCommercial
    }
    if (formData.additionalTerms !== originalData.additionalTerms) {
      updates.additionalTerms = formData.additionalTerms || undefined
    }

    if (Object.keys(updates).length > 0) {
      await store.updateAgreement(props.agreementId, updates)
      Object.assign(originalData, formData)
    }
  } catch (e) {
    updateError.value = e instanceof Error ? e.message : 'Failed to update agreement'
  } finally {
    isUpdating.value = false
  }
}

const agreeToAgreement = async () => {
  isAgreeing.value = true
  updateError.value = null

  try {
    await store.agreeToAgreement(props.agreementId)
  } catch (e) {
    updateError.value = e instanceof Error ? e.message : 'Failed to agree to agreement'
  } finally {
    isAgreeing.value = false
  }
}

const downloadPDF = async () => {
  try {
    const blob = await store.getAgreementPDF(props.agreementId)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `agreement-${props.agreementId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    updateError.value = e instanceof Error ? e.message : 'Failed to download PDF'
  }
}

onMounted(() => {
  loadAgreement()
})
</script>

<style scoped>
.agreement-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.loading {
  text-align: center;
  padding: 2rem;
}

.agreement-details {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

h3 {
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #333;
}

.status-section {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 2rem;
}

.status {
  margin: 0;
  font-weight: bold;
  padding: 0.5rem 0;
}

.status.draft {
  color: #ff9800;
}

.status.lender_agreed,
.status.tender_agreed {
  color: #2196f3;
}

.status.complete {
  color: #4caf50;
}

.status.terminated {
  color: #f44336;
}

.agreement-time {
  margin: 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.form-section {
  margin: 2rem 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="date"],
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group input:disabled,
.form-group textarea:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #999;
}

.form-group.checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.form-group.checkbox input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.form-group.checkbox label {
  margin-bottom: 0;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #2196f3;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1976d2;
}

.btn-agree {
  background-color: #4caf50;
  color: white;
}

.btn-agree:hover:not(:disabled) {
  background-color: #45a049;
}

.btn-secondary {
  background-color: #607d8b;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #455a64;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.checkins-section {
  margin-top: 2rem;
  border-top: 1px solid #ddd;
  padding-top: 2rem;
}

.no-checkins {
  color: #999;
  font-style: italic;
}

.checkins-list {
  display: grid;
  gap: 1rem;
}

.checkin-card {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 1rem;
}

.checkin-card p {
  margin: 0.5rem 0;
  color: #333;
}

.checkin-statuses {
  margin-top: 0.75rem;
}

.checkin-statuses p {
  color: #666;
  font-size: 0.9rem;
}
</style>
