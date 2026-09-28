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

// clicking a slice or its legend row selects that segment, dimming the
// rest and swapping the center label for that segment's own count and
// share of the total, so the breakdown is visible without hovering.
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
  <div v-if="total === 0" class="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-zinc-500">
    {{ emptyMessage }}
  </div>

  <div v-else class="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
    <div class="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 100 100" class="h-36 w-36 -rotate-90">
        <circle cx="50" cy="50" :r="RADIUS" fill="none" stroke-width="14" class="stroke-gray-100 dark:stroke-white/5" />
        <circle
          v-for="arc in arcs"
          :key="arc.label"
          role="button"
          tabindex="0"
          cx="50"
          cy="50"
          :r="RADIUS"
          fill="none"
          stroke-width="14"
          stroke-linecap="butt"
          class="cursor-pointer transition-opacity focus:outline-none"
          :class="[
            arc.colorClass,
            selectedLabel && selectedLabel !== arc.label ? 'opacity-30' : 'opacity-100'
          ]"
          :stroke-dasharray="arc.dashArray"
          :stroke-dashoffset="arc.dashOffset"
          @click="toggleSegment(arc.label)"
          @keydown.enter="toggleSegment(arc.label)"
        />
      </svg>
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <template v-if="selectedSegment">
          <span class="text-lg font-semibold text-gray-900 dark:text-white">{{ selectedSegment.value }}</span>
          <span class="text-[11px] text-gray-500 dark:text-zinc-400">{{ selectedSegment.label }} &middot; {{ selectedPct }}%</span>
        </template>
        <template v-else>
          <span class="text-lg font-semibold text-gray-900 dark:text-white">{{ total }}</span>
          <span class="text-[11px] text-gray-500 dark:text-zinc-400">{{ centerLabel }}</span>
        </template>
      </div>
    </div>

    <div class="w-full space-y-1.5">
      <button
        v-for="segment in segments"
        :key="segment.label"
        type="button"
        class="flex w-full items-center justify-between gap-3 rounded px-1 py-0.5 text-left text-sm
               transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
        :class="selectedLabel && selectedLabel !== segment.label ? 'opacity-50' : ''"
        @click="toggleSegment(segment.label)"
      >
        <span class="flex items-center gap-2 text-gray-600 dark:text-zinc-300">
          <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="segment.dotClass" />
          {{ segment.label }}
        </span>
        <span class="font-medium text-gray-900 dark:text-white">{{ segment.value }}</span>
      </button>
    </div>
  </div>
</template>
