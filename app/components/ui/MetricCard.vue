<script setup lang="ts">
// dashboard KPI tile: a label, a big number, and an optional trend
// indicator (e.g. "+4 this week" or "-2%"), themed for both surfaces.
const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    trend?: number
    trendLabel?: string
    icon?: string
  }>(),
  {
    trend: undefined,
    trendLabel: undefined,
    icon: undefined
  }
)

const trendDirection = computed(() => {
  if (props.trend === undefined) return null
  return props.trend > 0 ? 'up' : props.trend < 0 ? 'down' : 'flat'
})
</script>

<template>
  <div
    class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black"
  >
    <div class="flex items-start justify-between">
      <p class="text-sm font-medium text-gray-500 dark:text-white/60">{{ label }}</p>
      <i v-if="icon" :class="icon" class="text-lg text-purple-600 dark:text-purple-400" />
    </div>

    <p class="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
      {{ value }}
    </p>

    <p
      v-if="trendDirection"
      class="mt-1 flex items-center gap-1 text-xs font-medium"
      :class="{
        'text-green-600 dark:text-green-400': trendDirection === 'up',
        'text-red-600 dark:text-red-400': trendDirection === 'down',
        'text-gray-500 dark:text-white/50': trendDirection === 'flat'
      }"
    >
      <i
        v-if="trendDirection !== 'flat'"
        :class="trendDirection === 'up' ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"
      />
      {{ trendLabel ?? `${trend! > 0 ? '+' : ''}${trend}` }}
    </p>
  </div>
</template>
