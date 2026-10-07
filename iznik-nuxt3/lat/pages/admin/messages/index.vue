<template>
  <div />
</template>

<script setup>
// /admin/messages was an older "all listings" table that nothing linked to.
// Pending and approved listings have their own maintained pages.
definePageMeta({ layout: 'admin', redirect: '/admin/gardens/approved' })
</script>
