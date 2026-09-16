<script setup lang="ts">
// single horizontal bar divided proportionally by segment, plus a legend
// with counts below. plain divs, same theming approach as AppTrendChart
// and AppDonutChart: Tailwind classes per segment, no canvas to re-theme.
export interface BreakdownSegment {
  label: string
  value: number
  barClass: string
  dotClass: string
}

const props = withDefaults(
  defineProps<{
    segments: BreakdownSegment[]
    emptyMessage?: string
  }>(),
  { emptyMessage: 'No data yet.' }
)

const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0))

function widthPct(value: number) {
  return total.value > 0 ? `${(value / total.value) * 100}%` : '0%'
}
</script>

<template>
  <div v-if="total === 0" class="flex h-20 items-center justify-center text-sm text-gray-400 dark:text-zinc-500">
    {{ emptyMessage }}
  </div>

  <div v-else>
    <div class="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
      <div
        v-for="segment in segments.filter((s) => s.value > 0)"
        :key="segment.label"
        :class="segment.barClass"
        :style="{ width: widthPct(segment.value) }"
        :title="`${segment.label}: ${segment.value}`"
      />
    </div>

    <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
      <div v-for="segment in segments" :key="segment.label" class="flex items-center gap-1.5 text-xs">
        <span class="h-2 w-2 shrink-0 rounded-full" :class="segment.dotClass" />
        <span class="text-gray-600 dark:text-zinc-400">{{ segment.label }}</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ segment.value }}</span>
      </div>
    </div>
  </div>
</template>
