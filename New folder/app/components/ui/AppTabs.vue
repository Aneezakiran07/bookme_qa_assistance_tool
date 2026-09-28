<script setup lang="ts">
// reusable tab strip + panel host: a row of underline tabs plus a
// content area that shows whichever tab is active, styled once here so
// no page has to hand-roll its own tab markup. Follows the same
// prop/slot shape as AppDataTable's per-column slots: each tab gets a
// named slot keyed off its id (`tab-${id}`), so callers just declare
// their tabs array and drop content into the matching slot.
export interface AppTab {
  id: string
  label: string
}

const props = defineProps<{
  tabs: AppTab[]
  modelValue: string
}>()

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const active = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-1 border-b border-black/10 dark:border-white/10">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors"
        :class="active === tab.id
          ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'"
        @click="active = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="mt-4">
      <template v-for="tab in tabs" :key="tab.id">
        <div v-if="active === tab.id">
          <slot :name="`tab-${tab.id}`" />
        </div>
      </template>
    </div>
  </div>
</template>
