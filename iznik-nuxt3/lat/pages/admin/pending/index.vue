<template>
  <div />
</template>

<script setup>
// /admin/pending was an older copy of the pending-gardens queue that nothing
// linked to. The maintained page is /admin/gardens/pending.
definePageMeta({ layout: 'admin', redirect: '/admin/gardens/pending' })
</script>
