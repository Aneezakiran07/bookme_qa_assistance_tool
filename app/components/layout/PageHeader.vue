<script setup lang="ts">
// builds a readable title and breadcrumb trail straight from the current
// route path, so any new page automatically gets a header without extra wiring

const route = useRoute()

function toTitle(segment: string) {
  return segment
    .replace(/-/g, ' ')
    .replace(/\[(.+)\]/g, '$1')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const segments = computed(() => route.path.split('/').filter(Boolean))

const breadcrumbs = computed(() => {
  const crumbs = segments.value.map((segment, index) => ({
    label: toTitle(segment),
    to: '/' + segments.value.slice(0, index + 1).join('/'),
  }))
  return [{ label: 'Dashboard', to: '/' }, ...crumbs]
})

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
      <nav class="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.to">
          <NuxtLink
            :to="crumb.to"
            class="truncate hover:text-purple-600 dark:hover:text-purple-400"
            :class="index === breadcrumbs.length - 1 ? 'text-gray-500 dark:text-zinc-400' : ''"
          >
            {{ crumb.label }}
          </NuxtLink>
          <i v-if="index < breadcrumbs.length - 1" class="pi pi-angle-right text-[10px]" />
        </template>
      </nav>
    </div>

    <div class="flex items-center gap-2">
      <ThemeToggle />
    </div>
  </header>
</template>
