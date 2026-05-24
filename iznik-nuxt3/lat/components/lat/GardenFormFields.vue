<template>
  <div class="form-fields">
    <!-- Title field (applies to both types) -->
    <div class="field">
      <label for="subject">
        {{
          type === 'Offer' ? 'Garden title' : 'What would you like to grow?'
        }}
      </label>
      <input
        id="subject"
        :value="modelValue.subject || ''"
        type="text"
        :placeholder="
          type === 'Offer'
            ? 'e.g. Sunny south-facing plot, great for vegetables'
            : 'e.g. Vegetables and herbs, or help with existing garden'
        "
        required
        @input="updateField('subject', $event.target.value)"
      />
    </div>

    <!-- Description field -->
    <div class="field">
      <label for="about">
        {{
          type === 'Offer' ? 'About your garden' : 'About you as a gardener'
        }}
      </label>
      <textarea
        id="about"
        :value="modelValue.about || ''"
        :rows="type === 'Offer' ? 4 : 3"
        :placeholder="
          type === 'Offer'
            ? 'Describe your garden — soil, access, anything a tender should know…'
            : 'Your experience, what you love growing, anything else a lender should know…'
        "
        @input="updateField('about', $event.target.value)"
      />
    </div>

    <!-- Offer (lender) only fields -->
    <template v-if="type === 'Offer'">
      <div class="field-row">
        <div class="field">
          <label for="gardenSize">Garden size</label>
          <select
            id="gardenSize"
            :value="modelValue.gardenSize || ''"
            @input="updateField('gardenSize', $event.target.value)"
          >
            <option value="">Not specified</option>
            <option value="small">Small (up to 50 m²)</option>
            <option value="medium">Medium (50–200 m²)</option>
            <option value="large">Large (200 m²+)</option>
          </select>
        </div>

        <div class="field">
          <label for="sunExposure">Sun exposure</label>
          <select
            id="sunExposure"
            :value="modelValue.sunExposure || ''"
            @input="updateField('sunExposure', $event.target.value)"
          >
            <option value="">Not specified</option>
            <option value="full">Full sun</option>
            <option value="partial">Partial shade</option>
            <option value="shade">Mostly shade</option>
          </select>
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="waterAccess">Water access</label>
          <select
            id="waterAccess"
            :value="modelValue.waterAccess || ''"
            @input="updateField('waterAccess', $event.target.value)"
          >
            <option value="">Not specified</option>
            <option value="yes">Yes — tap or water butt available</option>
            <option value="no">No — tender must bring their own</option>
          </select>
        </div>

        <div class="field">
          <label for="accessRoute">Access route</label>
          <select
            id="accessRoute"
            :value="modelValue.accessRoute || ''"
            @input="updateField('accessRoute', $event.target.value)"
          >
            <option value="">Not specified</option>
            <option value="gate">Side / back gate — no need to enter house</option>
            <option value="through_house">Through the house</option>
            <option value="other">Other (describe below)</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label for="arrangement">What are you hoping for?</label>
        <textarea
          id="arrangement"
          :value="modelValue.arrangement || ''"
          rows="2"
          placeholder="e.g. Help with mowing in return for use of the veg patch; or pure goodwill — grow what you like"
          @input="updateField('arrangement', $event.target.value)"
        />
      </div>

      <div class="field">
        <label for="restrictions">Any restrictions?</label>
        <textarea
          id="restrictions"
          :value="modelValue.restrictions || ''"
          rows="2"
          placeholder="e.g. No commercial growing, no children, no dogs, no bonfires"
          @input="updateField('restrictions', $event.target.value)"
        />
      </div>
    </template>

    <!-- Wanted (tender) only fields -->
    <template v-else>
      <div class="field-row">
        <div class="field">
          <label for="tools">Tools and equipment</label>
          <select
            id="tools"
            :value="modelValue.tools || ''"
            @input="updateField('tools', $event.target.value)"
          >
            <option value="">Not specified</option>
            <option value="basic">Basic hand tools</option>
            <option value="full">Full set of garden tools</option>
            <option value="none">None — would need access to lender's tools</option>
          </select>
        </div>

        <div class="field">
          <label for="availability">Availability</label>
          <select
            id="availability"
            :value="modelValue.availability || ''"
            @input="updateField('availability', $event.target.value)"
          >
            <option value="">Not specified</option>
            <option value="weekends">Weekends</option>
            <option value="weekdays">Weekdays</option>
            <option value="flexible">Flexible</option>
            <option value="evenings">Evenings</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label for="whatToGrow">What do you want to do?</label>
        <textarea
          id="whatToGrow"
          :value="modelValue.whatToGrow || ''"
          rows="2"
          placeholder="e.g. Grow veg and herbs; maintain an existing garden; flowers only; semi-commercial (sell at market)"
          @input="updateField('whatToGrow', $event.target.value)"
        />
      </div>

      <div class="field honesty-field">
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="modelValue.honestyDeclaration || false"
            @input="updateField('honestyDeclaration', $event.target.checked)"
          />
          I confirm I am not on any offender's register
        </label>
      </div>
    </template>

    <!-- Photos uploader -->
    <div class="field">
      <label>
        Photos
        <span class="field-hint">
          (optional —
          {{
            type === 'Offer'
              ? 'helps tenders see your garden'
              : 'show your previous work'
          }})
        </span>
      </label>
      <PhotoUploader
        :model-value="attachments"
        type="Message"
        :max-photos="5"
        :empty-title="
          type === 'Offer'
            ? 'Add photos of your garden'
            : 'Add photos of your gardening'
        "
        :empty-subtitle="
          type === 'Offer'
            ? 'Photos help tenders decide if it\'s right for them'
            : 'Show lenders what you can do'
        "
        @update:model-value="$emit('update:attachments', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import PhotoUploader from '~/components/PhotoUploader.vue'

defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  type: {
    type: String,
    enum: ['Offer', 'Wanted'],
    required: true,
  },
  attachments: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue', 'update:attachments'])

function updateField(field, value) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  type: {
    type: String,
    enum: ['Offer', 'Wanted'],
    required: true,
  },
  attachments: {
    type: Array,
    required: true,
  },
})
</script>

<style scoped>
.form-fields {
  width: 100%;
}

.field {
  margin-bottom: 20px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

@media (max-width: 540px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}

label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 0.9rem;
  color: var(--lat-color-text);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 400;
}

.checkbox-label input {
  margin: 0;
  width: auto;
}

.honesty-field {
  background: #f9faf5;
  border: 1px solid #dde8d0;
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 20px;
}

input,
textarea,
select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  box-sizing: border-box;
  font-family: inherit;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--lat-color-primary);
  box-shadow: 0 0 0 2px rgba(107, 158, 60, 0.15);
}

.field-hint {
  font-weight: 400;
  color: var(--lat-color-text-muted);
  font-size: 0.85rem;
}
</style>
