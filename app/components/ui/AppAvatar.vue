<script setup lang="ts">
// renders one avatar from the fixed AVATAR_OPTIONS catalog. the svg
// markup is entirely app-authored (see app/utils/avatarOptions.ts), not
// user input, so v-html here never renders anything a user typed.
const props = withDefaults(
  defineProps<{
    avatarId: string | null | undefined
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' }
)

const avatar = computed(() => getAvatarById(props.avatarId))

const SIZE_CLASSES: Record<string, string> = {
  sm: 'h-8 w-8',
  md: 'h-14 w-14',
  lg: 'h-20 w-20'
}
</script>

<template>
  <div
    class="flex shrink-0 items-center justify-center overflow-hidden rounded-full
           bg-purple-600/10 dark:bg-white/5"
    :class="SIZE_CLASSES[size]"
    :title="avatar.label"
  >
    <div class="h-[72%] w-[72%]" v-html="avatar.svg" />
  </div>
</template>
