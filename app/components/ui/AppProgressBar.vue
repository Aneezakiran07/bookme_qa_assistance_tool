<script setup lang="ts">
// reusable single-value progress bar, matching the BaseButton/BaseModal
// wrapper pattern. Used on the Test Execution page for release progress.
// For the segmented pass/fail/blocked breakdown, the executions page uses
// its own bespoke markup rather than overloading this component.
const props = withDefaults(
  defineProps<{
    value: number
    max?: number
    label?: string
    size?: 'sm' | 'md'
    color?: 'primary' | 'success' | 'warning' | 'danger'
  }>(),
  {
    max: 100,
    label: undefined,
    size: 'md',
    color: 'primary'
  }
)

const pct = computed(() => {
  if (!props.max) return 0
  const p = (props.value / props.max) * 100
  return Math.max(0, Math.min(100, p))
})

const barClass = computed(() => {
  switch (props.color) {
    case 'success':
      return 'bg-green-500'
    case 'warning':
      return 'bg-amber-500'
    case 'danger':
      return 'bg-red-500'
    default:
      return 'bg-purple-600'
  }
})

const heightClass = computed(() => (props.size === 'sm' ? 'h-1.5' : 'h-2.5'))
</script>

<template>
  <div>
    <div v-if="label" class="mb-1 flex items-center justify-between text-xs">
      <span class="text-gray-600 dark:text-zinc-400">{{ label }}</span>
      <span class="font-medium text-gray-900 dark:text-white">{{ Math.round(pct) }}%</span>
    </div>
    <div
      class="w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
      :class="heightClass"
      role="progressbar"
      :aria-valuenow="pct"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="barClass"
        :style="{ width: `${pct}%` }"
      />
    </div>
  </div>
</template>
