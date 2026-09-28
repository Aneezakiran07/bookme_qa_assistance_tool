<script setup lang="ts">
// nuxt renders this instead of a blank stack trace whenever a page 404s,
// a server route throws, or something crashes during render. it's a
// single catch-all, not per-error-type pages, so the messaging below
// branches on the status code instead.
const props = defineProps<{
  error: { statusCode?: number; statusMessage?: string; message?: string }
}>()

const { loggedIn } = useUserSession()

const isAuthError = computed(() => props.error?.statusCode === 401 || props.error?.statusCode === 403)
const isNotFound = computed(() => props.error?.statusCode === 404)

const title = computed(() => {
  if (isAuthError.value) return loggedIn.value ? "You don't have access to that" : 'Please log in to continue'
  if (isNotFound.value) return "This page doesn't exist"
  return 'Something went wrong'
})

const description = computed(() => {
  if (isAuthError.value) {
    return loggedIn.value
      ? "Your account doesn't have permission to view that page."
      : 'Your session may have expired, or you followed a link that needs you to be signed in first.'
  }
  if (isNotFound.value) return "The page you're looking for may have moved or never existed."
  return 'This page seems broken on our end. It should be back shortly, try again in a moment.'
})

const primaryAction = computed(() => {
  if (isAuthError.value && !loggedIn.value) return { label: 'Go to login', to: '/login' }
  return { label: 'Go to dashboard', to: '/' }
})

function handlePrimaryAction() {
  clearError({ redirect: primaryAction.value.to })
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
    <div
      class="w-full max-w-sm rounded-lg border border-black/10 bg-white p-8 text-center
             dark:border-white/20 dark:bg-black"
    >
      <div
        class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full
               bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
      >
        <i class="pi pi-exclamation-triangle text-xl" />
      </div>

      <h1 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        {{ title }}
      </h1>
      <p class="mb-6 text-sm text-gray-600 dark:text-white/60">
        {{ description }}
      </p>

      <Button :label="primaryAction.label" class="w-full" @click="handlePrimaryAction" />

      <p v-if="error?.statusCode" class="mt-4 text-xs text-gray-400 dark:text-zinc-600">
        Error {{ error.statusCode }}
      </p>
    </div>
  </div>
</template>
