import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Agreement {
  id: number
  lenderId: number
  tenderId: number
  status: 'draft' | 'lender_agreed' | 'tender_agreed' | 'complete' | 'terminated'
  gardenAddress?: string
  gardeningHours?: string
  growingPurpose?: string
  maxPeople?: number
  exchangeTerms?: string
  endDate?: string
  noticePeriodMonths: number
  allowAnimals: boolean
  allowCommercial: boolean
  additionalTerms?: string
  lenderAgreedAt?: string
  tenderAgreedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Checkin {
  id: number
  agreementId: number
  scheduledAt: string
  sentAt?: string
  lenderStatus?: 'growing' | 'ok' | 'not_working'
  tenderStatus?: 'growing' | 'ok' | 'not_working'
  needsMediation: boolean
}

export const useLatAgreementsStore = defineStore('latAgreements', () => {
  const agreements = ref<Agreement[]>([])
  const current = ref<Agreement | null>(null)
  const pendingCheckins = ref<Checkin[]>([])

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchMyAgreements = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch('/apiv2/agreement/my')
      if (!response.ok) {
        throw new Error(`Failed to fetch agreements: ${response.statusText}`)
      }
      agreements.value = await response.json()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('Error fetching agreements:', error.value)
    } finally {
      isLoading.value = false
    }
  }

  const createAgreement = async (lenderId: number, tenderId: number) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch('/apiv2/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lenderId, tenderId })
      })
      if (!response.ok) {
        throw new Error(`Failed to create agreement: ${response.statusText}`)
      }
      const newAgreement = await response.json()
      agreements.value.push(newAgreement)
      return newAgreement
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('Error creating agreement:', error.value)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const fetchAgreement = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(`/apiv2/agreement/${id}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch agreement: ${response.statusText}`)
      }
      current.value = await response.json()
      return current.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('Error fetching agreement:', error.value)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const updateAgreement = async (id: number, fields: Partial<Agreement>) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(`/apiv2/agreement/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      })
      if (!response.ok) {
        throw new Error(`Failed to update agreement: ${response.statusText}`)
      }
      const updated = await response.json()
      current.value = updated
      // Update in list
      const index = agreements.value.findIndex(a => a.id === id)
      if (index >= 0) {
        agreements.value[index] = updated
      }
      return updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('Error updating agreement:', error.value)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const agreeToAgreement = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(`/apiv2/agreement/${id}/agree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) {
        throw new Error(`Failed to agree to agreement: ${response.statusText}`)
      }
      const updated = await response.json()
      current.value = updated
      // Update in list
      const index = agreements.value.findIndex(a => a.id === id)
      if (index >= 0) {
        agreements.value[index] = updated
      }
      return updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('Error agreeing to agreement:', error.value)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const getAgreementPDF = async (id: number) => {
    try {
      const response = await fetch(`/apiv2/agreement/${id}/pdf`)
      if (!response.ok) {
        throw new Error(`Failed to get PDF: ${response.statusText}`)
      }
      return response.blob()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('Error getting PDF:', error.value)
      throw e
    }
  }

  const fetchPendingCheckins = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch('/apiv2/lat/checkin/pending')
      if (!response.ok) {
        throw new Error(`Failed to fetch pending checkins: ${response.statusText}`)
      }
      pendingCheckins.value = await response.json()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('Error fetching pending checkins:', error.value)
    } finally {
      isLoading.value = false
    }
  }

  const respondToCheckin = async (id: number, status: string, needsMediation: boolean) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(`/apiv2/lat/checkin/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, needsMediation })
      })
      if (!response.ok) {
        throw new Error(`Failed to respond to checkin: ${response.statusText}`)
      }
      const updated = await response.json()
      // Update in list
      const index = pendingCheckins.value.findIndex(c => c.id === id)
      if (index >= 0) {
        pendingCheckins.value[index] = updated
      }
      return updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('Error responding to checkin:', error.value)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    agreements,
    current,
    pendingCheckins,
    isLoading,
    error,
    fetchMyAgreements,
    createAgreement,
    fetchAgreement,
    updateAgreement,
    agreeToAgreement,
    getAgreementPDF,
    fetchPendingCheckins,
    respondToCheckin
  }
})
