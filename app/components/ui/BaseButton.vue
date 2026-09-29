<script setup lang="ts">
// wraps the primevue button with the shared button language of the app
// primary is the filled brand blue commit action such as save or create
// danger is filled red and only used at the point of no return in the confirm dialog
// outline is a blue border with neutral heading text for inline row actions and secondary actions
// dangerOutline is a red border with red text for destructive actions that open a confirm
// soft is a light blue tint with neutral text for selected filters and toggles
// the accent blue is only used for borders, backgrounds and focus rings and never for label text
// secondary is a neutral border for cancel and back style actions
// every variant is rounded and uses a brand blue focus ring in light and dark mode
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'dangerOutline' | 'soft'
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

// shared shape and focus ring used by every variant
const baseClass =
  '!rounded-lg focus:!ring-2 focus:!ring-[#245CB1] dark:focus:!ring-[#5B8FE0] focus:!ring-offset-0'

// the primevue severity system already swaps colors between light and dark through the primary preset so the variants below carry explicit classes and filled buttons darken on hover while lighter ones get a tint
const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return '!bg-[#245CB1] !border-[#245CB1] !text-white hover:!bg-[#1d4a8f] hover:!border-[#1d4a8f] dark:!bg-[#5B8FE0] dark:!border-[#5B8FE0] dark:hover:!bg-[#3a72cd] dark:hover:!border-[#3a72cd]'
    case 'secondary':
      return '!bg-transparent !text-gray-800 !border-black/15 hover:!bg-black/5 dark:!text-white dark:!border-white/25 dark:hover:!bg-white/10 focus:!ring-gray-400 dark:focus:!ring-white/40'
    case 'outline':
      return '!bg-transparent !border-[#245CB1]/50 !text-heading hover:!bg-[#245CB1]/10 hover:!border-[#245CB1] dark:!border-[#5B8FE0]/50 dark:hover:!bg-[#5B8FE0]/15 dark:hover:!border-[#5B8FE0]'
    case 'soft':
      return '!bg-[#245CB1]/10 !border-[#245CB1]/30 !text-gray-900 hover:!bg-[#245CB1]/20 dark:!bg-[#5B8FE0]/15 dark:!border-[#5B8FE0]/40 dark:!text-white dark:hover:!bg-[#5B8FE0]/25'
    case 'danger':
      return '!bg-red-600 !border-red-600 !text-white hover:!bg-red-700 hover:!border-red-700 focus:!ring-red-500 dark:focus:!ring-red-400'
    case 'dangerOutline':
      return '!bg-transparent !border-red-600/40 !text-red-600 hover:!bg-red-600/10 hover:!border-red-600 dark:!border-red-400/40 dark:!text-red-400 dark:hover:!bg-red-400/10 dark:hover:!border-red-400 focus:!ring-red-500 dark:focus:!ring-red-400'
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
    :class="[baseClass, variantClass, block ? 'w-full' : '', 'transition-colors duration-150']"
    @click="(e: MouseEvent) => $emit('click', e)"
  >
    <template v-if="$slots.default" #default>
      <slot />
    </template>
  </Button>
</template>
