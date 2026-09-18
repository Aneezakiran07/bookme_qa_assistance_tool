<script setup lang="ts">
// clean grid picker over the fixed AVATAR_OPTIONS catalog. purely a
// selection UI -- it doesn't save anything itself, it just emits the
// chosen id and lets the caller (the profile page) decide what to do
// with it, same as the rest of the app's form components.
const props = defineProps<{
  modelValue: boolean
  selectedId: string | null | undefined
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  select: [string]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})
</script>

<template>
  <BaseModal v-model="visible" title="Choose an avatar" width="28rem">
    <p class="mb-4 text-xs text-gray-400 dark:text-zinc-500">
      Pick the one that feels like you. It updates right away.
    </p>
    <div class="grid grid-cols-4 gap-3">
      <button
        v-for="option in AVATAR_OPTIONS"
        :key="option.id"
        type="button"
        :disabled="saving"
        class="group flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-colors
               disabled:cursor-not-allowed disabled:opacity-50"
        :class="option.id === selectedId
          ? 'border-purple-600 bg-purple-600/10'
          : 'border-transparent hover:border-purple-300 hover:bg-gray-50 dark:hover:border-purple-500/40 dark:hover:bg-white/5'"
        @click="$emit('select', option.id)"
      >
        <div
          class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full
                 bg-purple-600/10 dark:bg-white/5"
        >
          <div class="h-[72%] w-[72%]" v-html="option.svg" />
        </div>
        <span class="text-[11px] text-gray-500 dark:text-zinc-400">{{ option.label }}</span>
      </button>
    </div>
  </BaseModal>
</template>
