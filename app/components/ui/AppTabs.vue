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
    <div class="flex flex-wrap gap-1 border-b border-border">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors"
        :class="active === tab.id
          ? 'border-[#245CB1] text-heading dark:border-[#5B8FE0]'
          : 'border-transparent text-body hover:text-heading'"
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
