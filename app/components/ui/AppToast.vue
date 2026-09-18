<script setup lang="ts">
// thin themed wrapper around PrimeVue's Toast. mount this once in
// app.vue and then call the standard useToast() composable anywhere
// (toast.add({ severity: 'success', summary: '...' })) to surface
// success/error/warn feedback app-wide.
const toastPt = useToastPt()
</script>

<template>
  <Toast position="top-left" :pt="toastPt" />
</template>
