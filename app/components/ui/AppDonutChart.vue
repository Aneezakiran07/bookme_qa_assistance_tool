<script setup lang="ts">
// dependency-free donut chart built from stacked SVG circle strokes.
// colorClass values are Tailwind stroke-* utilities so light/dark theming
// is just CSS, no per-render color computation like a canvas chart needs.
export interface DonutSegment {
  label: string
  value: number
  colorClass: string
  dotClass: string
}

const props = withDefaults(
  defineProps<{
    segments: DonutSegment[]
    centerLabel?: string
    emptyMessage?: string
  }>(),
  { centerLabel: 'Total', emptyMessage: 'No data yet.' }
)

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0))

const arcs = computed(() => {
  let offset = 0
  return props.segments
    .filter((s) => s.value > 0)
    .map((segment) => {
      const fraction = total.value > 0 ? segment.value / total.value : 0
      const length = fraction * CIRCUMFERENCE
      const arc = {
        ...segment,
        length,
        dashArray: `${length} ${CIRCUMFERENCE - length}`,
        dashOffset: -offset
      }
      offset += length
      return arc
    })
})
</script>

<template>
  <div v-if="total === 0" class="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-zinc-500">
    {{ emptyMessage }}
  </div>

  <div v-else class="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
    <svg viewBox="0 0 100 100" class="h-36 w-36 shrink-0 -rotate-90">
      <circle cx="50" cy="50" :r="RADIUS" fill="none" stroke-width="14" class="stroke-gray-100 dark:stroke-white/5" />
      <circle
        v-for="arc in arcs"
        :key="arc.label"
        cx="50"
        cy="50"
        :r="RADIUS"
        fill="none"
        stroke-width="14"
        stroke-linecap="butt"
        :class="arc.colorClass"
        :stroke-dasharray="arc.dashArray"
        :stroke-dashoffset="arc.dashOffset"
      />
    </svg>

    <div class="w-full space-y-1.5">
      <div v-for="segment in segments" :key="segment.label" class="flex items-center justify-between gap-3 text-sm">
        <span class="flex items-center gap-2 text-gray-600 dark:text-zinc-300">
          <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="segment.dotClass" />
          {{ segment.label }}
        </span>
        <span class="font-medium text-gray-900 dark:text-white">{{ segment.value }}</span>
      </div>
    </div>
  </div>
</template>
