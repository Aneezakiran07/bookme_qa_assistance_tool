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

// clicking a piece of the bar or its legend entry selects that segment
// and pins its count and share of the total in a small readout, so the
// breakdown is available without relying on hover.
const selectedLabel = ref<string | null>(null)

function toggleSegment(label: string) {
  selectedLabel.value = selectedLabel.value === label ? null : label
}

const selectedSegment = computed(() =>
  props.segments.find((s) => s.label === selectedLabel.value) ?? null
)

const selectedPct = computed(() =>
  selectedSegment.value && total.value > 0
    ? Math.round((selectedSegment.value.value / total.value) * 100)
    : 0
)
</script>

<template>
  <div v-if="total === 0" class="flex h-20 items-center justify-center text-sm text-gray-400 dark:text-zinc-500">
    {{ emptyMessage }}
  </div>

  <div v-else>
    <div class="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
      <button
        v-for="segment in segments.filter((s) => s.value > 0)"
        :key="segment.label"
        type="button"
        class="h-full cursor-pointer transition-opacity focus:outline-none"
        :class="[segment.barClass, selectedLabel && selectedLabel !== segment.label ? 'opacity-30' : 'opacity-100']"
        :style="{ width: widthPct(segment.value) }"
        :title="`${segment.label}: ${segment.value}`"
        @click="toggleSegment(segment.label)"
      />
    </div>

    <p v-if="selectedSegment" class="mt-2 text-xs text-gray-600 dark:text-zinc-300">
      <span class="font-medium text-gray-900 dark:text-white">{{ selectedSegment.label }}</span>
      : {{ selectedSegment.value }} ({{ selectedPct }}%)
    </p>

    <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
      <button
        v-for="segment in segments"
        :key="segment.label"
        type="button"
        class="flex items-center gap-1.5 rounded text-left text-xs transition-opacity"
        :class="selectedLabel && selectedLabel !== segment.label ? 'opacity-50' : ''"
        @click="toggleSegment(segment.label)"
      >
        <span class="h-2 w-2 shrink-0 rounded-full" :class="segment.dotClass" />
        <span class="text-gray-600 dark:text-zinc-400">{{ segment.label }}</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ segment.value }}</span>
      </button>
    </div>
  </div>
</template>
