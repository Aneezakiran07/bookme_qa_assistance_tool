<script setup lang="ts">
// lightweight dependency-free trend chart: one stacked bar per day, scaled
// against the tallest day in the series. built with plain flex/CSS instead
// of a charting library so dark mode "just works" through Tailwind classes
// rather than needing to recompute canvas colors on theme toggle.
export interface TrendPoint {
  day: string
  pass: number
  fail: number
  blocked: number
}

const props = withDefaults(
  defineProps<{
    points: TrendPoint[]
    emptyMessage?: string
  }>(),
  { emptyMessage: 'No executions recorded in this range.' }
)

const maxTotal = computed(() => {
  const totals = props.points.map((p) => p.pass + p.fail + p.blocked)
  return Math.max(1, ...totals)
})

function segmentHeight(value: number) {
  return `${Math.max(0, (value / maxTotal.value) * 100)}%`
}

// day is expected to be a plain "YYYY-MM-DD" string, but this stays
// defensive against a full ISO timestamp ("2026-09-15T00:00:00.000Z")
// slipping through from an API change, since naively appending our own
// "T00:00:00" onto a string that already has a time component produces
// an unparseable date and renders as "Invalid Date".
function formatDay(day: string) {
  const datePart = day.includes('T') ? day.slice(0, 10) : day
  const d = new Date(`${datePart}T00:00:00`)
  if (Number.isNaN(d.getTime())) return day
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// clicking a bar selects it and pins a readable breakdown below the
// chart, since the native title tooltip this used to rely on doesn't
// show up at all on touch devices.
const selectedIndex = ref<number | null>(null)

function selectPoint(index: number) {
  selectedIndex.value = selectedIndex.value === index ? null : index
}

const selectedPoint = computed(() =>
  selectedIndex.value !== null ? props.points[selectedIndex.value] : null
)
</script>

<template>
  <div>
    <div class="mb-3 flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-500" /> Pass</span>
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-red-500" /> Fail</span>
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-purple-500" /> Blocked</span>
    </div>

    <div v-if="points.length === 0" class="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-zinc-500">
      {{ emptyMessage }}
    </div>

    <template v-else>
      <div class="overflow-x-auto">
        <div class="flex h-40 min-w-full items-end gap-2 pb-1" :style="{ minWidth: `${points.length * 28}px` }">
          <div v-for="(point, index) in points" :key="point.day" class="flex flex-1 flex-col items-center gap-1">
            <button
              type="button"
              class="flex w-full max-w-[22px] flex-1 flex-col-reverse overflow-hidden rounded-sm bg-gray-100
                     transition-[outline-color] focus:outline-none dark:bg-white/5"
              :class="
                selectedIndex === index
                  ? 'outline outline-2 outline-offset-1 outline-purple-500'
                  : 'outline outline-2 outline-offset-1 outline-transparent'
              "
              :title="`${formatDay(point.day)}: ${point.pass} pass, ${point.fail} fail, ${point.blocked} blocked`"
              :aria-label="`${formatDay(point.day)}: ${point.pass} pass, ${point.fail} fail, ${point.blocked} blocked`"
              @click="selectPoint(index)"
            >
              <div class="w-full bg-emerald-500" :style="{ height: segmentHeight(point.pass) }" />
              <div class="w-full bg-red-500" :style="{ height: segmentHeight(point.fail) }" />
              <div class="w-full bg-purple-500" :style="{ height: segmentHeight(point.blocked) }" />
            </button>
            <span class="whitespace-nowrap text-[10px] text-gray-400 dark:text-zinc-500">
              {{ formatDay(point.day) }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="selectedPoint"
        class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-gray-50 px-3 py-2 text-xs
               text-gray-600 dark:bg-white/5 dark:text-zinc-300"
      >
        <span class="font-medium text-gray-900 dark:text-white">{{ formatDay(selectedPoint.day) }}</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-500" /> {{ selectedPoint.pass }} pass</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-red-500" /> {{ selectedPoint.fail }} fail</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-purple-500" /> {{ selectedPoint.blocked }} blocked</span>
        <button
          type="button"
          class="ml-auto text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          @click="selectedIndex = null"
        >
          <i class="pi pi-times text-[10px]" />
        </button>
      </div>
      <p v-else class="mt-3 text-[11px] text-gray-400 dark:text-zinc-500">Tap a bar to see its breakdown.</p>
    </template>
  </div>
</template>
