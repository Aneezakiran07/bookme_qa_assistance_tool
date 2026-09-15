<script setup lang="ts">
// wraps PrimeVue's Dialog with the app's shared modal chrome: a blurred
// backdrop, a themed surface for both light and dark mode, a header slot,
// and an actions footer slot so callers never have to restyle a dialog.
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    width?: string
    closable?: boolean
    dismissableMask?: boolean
  }>(),
  {
    title: undefined,
    width: '32rem',
    closable: true,
    dismissableMask: true
  }
)

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const dialogPt = useDialogPt()
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :style="{ width }"
    :closable="closable"
    :dismissable-mask="dismissableMask"
    class="!bg-white !text-gray-900 dark:!bg-black dark:!text-white
           !border !border-black/10 dark:!border-white/10"
    :pt="dialogPt"
  >
    <template v-if="title || $slots.header" #header>
      <slot name="header">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ title }}
        </h2>
      </slot>
    </template>

    <div class="text-sm text-gray-700 dark:text-white/80">
      <slot />
    </div>

    <template v-if="$slots.footer" #footer>
      <div class="flex justify-end gap-2">
        <slot name="footer" />
      </div>
    </template>
  </Dialog>
</template>
