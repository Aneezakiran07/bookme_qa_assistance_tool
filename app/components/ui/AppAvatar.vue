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
    class="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-transparent"
    :class="SIZE_CLASSES[size]"
    :title="avatar.label"
  >
    <!--
      the wrapper used to be h-[72%] w-[72%] with no explicit sizing on
      the svg itself -- without a width/height (or a forced 100%), a raw
      <svg> falls back to its own intrinsic default box instead of
      filling this div, so only a sliver of it ever showed up inside the
      circle, cropped to whatever corner happened to land there. h-full
      w-full here + forcing the actual <svg> tag to 100%/100% below is
      what makes the whole character render inside the icon instead of
      a cropped fragment of it. background: transparent on the svg too,
      so nothing but the character itself ever paints -- the only
      background color anyone sees is whatever sits behind this
      component (the sidebar row, the profile card, etc), never a
      colored box baked into the avatar.
    -->
    <div class="avatar-svg h-full w-full" v-html="avatar.svg" />
  </div>
</template>

<style scoped>
.avatar-svg :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  background: transparent;
}
</style>
