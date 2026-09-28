<script setup lang="ts">
// vertical audit-history timeline, used on the bug detail page to merge
// status changes and assignment events into a single chronological feed.
// wraps PrimeVue's Timeline with the app's dual-theme surface so callers
// never have to restyle markers or connector lines themselves.
export interface TimelineEntry {
  id: string
  icon: string
  iconClass?: string
  title: string
  detail?: string
  timestamp: string
}

const props = defineProps<{
  entries: TimelineEntry[]
  emptyMessage?: string
}>()

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
</script>

<template>
  <div v-if="entries.length === 0" class="p-4 text-center text-sm text-gray-400 dark:text-zinc-500">
    {{ emptyMessage ?? 'No history yet.' }}
  </div>

  <Timeline v-else :value="entries" align="left" class="w-full">
    <template #marker="{ item }">
      <span
        class="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white
               text-xs dark:border-white/10 dark:bg-black"
        :class="item.iconClass ?? 'text-purple-600 dark:text-purple-400'"
      >
        <i :class="item.icon" />
      </span>
    </template>

    <template #content="{ item }">
      <div class="pb-4">
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ item.title }}
        </p>
        <p v-if="item.detail" class="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
          {{ item.detail }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
          {{ formatTimestamp(item.timestamp) }}
        </p>
      </div>
    </template>
  </Timeline>
</template>
