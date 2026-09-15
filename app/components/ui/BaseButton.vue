<script setup lang="ts">
// wraps PrimeVue's Button with the app's shared button language: a purple
// primary action, a neutral secondary action, and a bordered outline
// action, each themed for both light and dark surfaces.
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    label?: string
    icon?: string
    iconPos?: 'left' | 'right'
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    label: undefined,
    icon: undefined,
    iconPos: 'left',
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    block: false,
    type: 'button'
  }
)

defineEmits<{ click: [MouseEvent] }>()

// primevue's own severity system already swaps colors between light and
// dark via the primary preset, so only the variants this app defines on
// top of that (outline, danger, a themed secondary) need explicit classes.
const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return '!bg-purple-600 !border-purple-600 hover:!bg-purple-700 hover:!border-purple-700 !text-white focus:!ring-purple-400'
    case 'secondary':
      return 'dark:!bg-white/10 dark:!text-white dark:!border-white/10 dark:hover:!bg-white/20 !bg-gray-100 !text-gray-800 !border-gray-200 hover:!bg-gray-200'
    case 'outline':
      return '!bg-transparent !border-purple-600 !text-purple-600 hover:!bg-purple-50 dark:!text-purple-400 dark:hover:!bg-purple-950/40'
    case 'danger':
      return '!bg-red-600 !border-red-600 hover:!bg-red-700 hover:!border-red-700 !text-white'
    default:
      return ''
  }
})

const sizeProp = computed(() => (props.size === 'md' ? undefined : props.size))
</script>

<template>
  <Button
    :label="label"
    :icon="icon"
    :icon-pos="iconPos"
    :loading="loading"
    :disabled="disabled || loading"
    :type="type"
    :size="sizeProp"
    :class="[variantClass, block ? 'w-full' : '', 'transition-colors duration-150']"
    @click="(e: MouseEvent) => $emit('click', e)"
  >
    <template v-if="$slots.default" #default>
      <slot />
    </template>
  </Button>
</template>
