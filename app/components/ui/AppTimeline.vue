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
  titleAvatarId?: string | null
  detailAvatarId?: string | null
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
        class="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-foreground
               text-xs"
        :class="item.iconClass ?? 'text-[#245CB1] dark:text-[#5B8FE0]'"
      >
        <i :class="item.icon" />
      </span>
    </template>

    <template #content="{ item }">
      <div class="pb-4">
        <p class="flex items-center gap-1.5 text-sm font-medium text-heading">
          <AppAvatar v-if="item.titleAvatarId" :avatar-id="item.titleAvatarId" size="xs" />
          {{ item.title }}
        </p>
        <p v-if="item.detail" class="mt-0.5 flex items-center gap-1.5 text-xs text-body">
          <AppAvatar v-if="item.detailAvatarId" :avatar-id="item.detailAvatarId" size="xs" />
          {{ item.detail }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
          {{ formatTimestamp(item.timestamp) }}
        </p>
      </div>
    </template>
  </Timeline>
</template>
