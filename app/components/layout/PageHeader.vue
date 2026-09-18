<script setup lang="ts">
// builds a readable title straight from the current route path, so any
// new page automatically gets a header without extra wiring. there used
// to be a breadcrumb trail here too, but it was removed because several
// of the parent segments it linked to were not real routes, so clicking
// them led to broken or undefined pages. the app does not rely on deep
// nested routes anyway, so a single page title is enough.

const route = useRoute()

function toTitle(segment: string) {
  return segment
    .replace(/-/g, ' ')
    .replace(/\[(.+)\]/g, '$1')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const segments = computed(() => route.path.split('/').filter(Boolean))

const pageTitle = computed(() => {
  if (segments.value.length === 0) return 'Dashboard'
  return toTitle(segments.value[segments.value.length - 1])
})
</script>

<template>
  <header
    class="flex h-16 shrink-0 items-center justify-between border-b border-gray-200
           bg-white px-6 dark:border-zinc-800 dark:bg-black"
  >
    <div class="min-w-0">
      <h1 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
        {{ pageTitle }}
      </h1>
    </div>

    <div class="flex items-center gap-2">
      <ThemeToggle />
    </div>
  </header>
</template>
