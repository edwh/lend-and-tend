<template>
  <b-modal
    ref="modal"
    scrollable
    size="lg"
    hide-header
    body-class="lat-photo-modal-body"
  >
    <template #default>
      <div class="lat-photo-wrap">
        <OurUploadedImage
          v-if="ouruid || externaluid"
          :src="ouruid || externaluid"
          :modifiers="modifiers"
          class="lat-photo-full"
          alt="Garden photo"
          :width="1200"
          :height="900"
        />
        <img
          v-else-if="src"
          :src="src"
          class="lat-photo-full"
          alt="Garden photo"
        />
      </div>
    </template>
    <template #footer>
      <b-button variant="primary" @click="hide">Close</b-button>
    </template>
  </b-modal>
</template>

<script setup>
import { useOurModal } from '~/composables/useOurModal'
import OurUploadedImage from '~/components/OurUploadedImage'

defineProps({
  // Use one OR the other:
  //  - ouruid / externaluid (+ optional modifiers) for Freegle-hosted images
  //    so the CDN can deliver an appropriate size.
  //  - src for arbitrary URLs.
  ouruid: { type: String, default: null },
  externaluid: { type: String, default: null },
  modifiers: { type: [String, Object], default: null },
  src: { type: String, default: null },
})

const emit = defineEmits(['hidden'])

const { modal, hide: hideModal } = useOurModal()

function hide() {
  hideModal()
  emit('hidden')
}
</script>

<style scoped>
.lat-photo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.lat-photo-full {
  display: block;
  max-width: 100%;
  max-height: 80vh;
  height: auto;
  width: auto;
  border-radius: 6px;
}

.lat-photo-full :deep(img) {
  display: block;
  max-width: 100%;
  max-height: 80vh;
  height: auto;
  width: auto;
  border-radius: 6px;
}
</style>
