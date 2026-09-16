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

function formatDay(day: string) {
  const d = new Date(`${day}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div>
    <div class="mb-3 flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-500" /> Pass</span>
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-red-500" /> Fail</span>
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-amber-500" /> Blocked</span>
    </div>

    <div v-if="points.length === 0" class="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-zinc-500">
      {{ emptyMessage }}
    </div>

    <div v-else class="overflow-x-auto">
      <div class="flex h-40 min-w-full items-end gap-2 pb-1" :style="{ minWidth: `${points.length * 28}px` }">
        <div v-for="point in points" :key="point.day" class="flex flex-1 flex-col items-center gap-1">
          <div
            class="flex w-full max-w-[22px] flex-1 flex-col-reverse overflow-hidden rounded-sm bg-gray-100 dark:bg-white/5"
            :title="`${formatDay(point.day)}: ${point.pass} pass, ${point.fail} fail, ${point.blocked} blocked`"
          >
            <div class="w-full bg-emerald-500" :style="{ height: segmentHeight(point.pass) }" />
            <div class="w-full bg-red-500" :style="{ height: segmentHeight(point.fail) }" />
            <div class="w-full bg-amber-500" :style="{ height: segmentHeight(point.blocked) }" />
          </div>
          <span class="whitespace-nowrap text-[10px] text-gray-400 dark:text-zinc-500">
            {{ formatDay(point.day) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
