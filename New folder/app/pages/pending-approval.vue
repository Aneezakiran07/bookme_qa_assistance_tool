<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const { data: currentUser } = await useFetch('/api/me')
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50">
    <div class="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 class="mb-2 text-xl font-semibold text-slate-900">Waiting for approval</h1>
      <p class="text-sm text-slate-500">
        Your account ({{ currentUser?.email }}) has been created and is waiting for an admin to
        assign you a role and modules. Check back soon.
      </p>
    </div>
  </div>
</template>
