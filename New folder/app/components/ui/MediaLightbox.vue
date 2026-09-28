<script setup lang="ts">
// full-size preview overlay for bug attachments, similar to gmail or
// google drive's attachment viewer. this is a dedicated near-fullscreen
// dark surface, not a reuse of BaseModal, since BaseModal is a small
// padded card built for forms and would not fit a large image or video.
// the overlay itself teleports to the body and stays dark regardless of
// the app's light or dark mode, the same way a photo viewer usually does,
// so it does not need the pt theming helpers used by PrimeVue overlays.
import type { MediaAttachment } from '~/components/form/MediaUploader.vue'

const props = defineProps<{
  modelValue: boolean
  attachments: MediaAttachment[]
  startIndex: number
}>()

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const currentIndex = ref(props.startIndex)

// keep the visible attachment in sync whenever the lightbox is reopened
// on a different thumbnail, without needing to unmount and remount it
watch(
  () => [props.modelValue, props.startIndex] as const,
  ([open, startIndex]) => {
    if (open) currentIndex.value = startIndex
  }
)

const current = computed(() => props.attachments[currentIndex.value] ?? null)

function close() {
  emit('update:modelValue', false)
}

function goPrev() {
  if (!props.attachments.length) return
  currentIndex.value = (currentIndex.value - 1 + props.attachments.length) % props.attachments.length
}

function goNext() {
  if (!props.attachments.length) return
  currentIndex.value = (currentIndex.value + 1) % props.attachments.length
}

function onKeydown(event: KeyboardEvent) {
  if (!props.modelValue) return
  if (event.key === 'Escape') close()
  else if (event.key === 'ArrowLeft') goPrev()
  else if (event.key === 'ArrowRight') goNext()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue && current"
      class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4 sm:p-8"
      @click.self="close"
    >
      <button
        type="button"
        aria-label="Close preview"
        class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full
               bg-white/10 text-white transition-colors hover:bg-white/20
               focus:outline-none focus:ring-2 focus:ring-purple-400"
        @click="close"
      >
        <i class="pi pi-times text-lg" />
      </button>

      <button
        v-if="attachments.length > 1"
        type="button"
        aria-label="Previous attachment"
        class="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center
               rounded-full bg-white/10 text-white transition-colors hover:bg-white/20
               focus:outline-none focus:ring-2 focus:ring-purple-400 sm:left-4"
        @click.stop="goPrev"
      >
        <i class="pi pi-chevron-left text-lg" />
      </button>

      <button
        v-if="attachments.length > 1"
        type="button"
        aria-label="Next attachment"
        class="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center
               rounded-full bg-white/10 text-white transition-colors hover:bg-white/20
               focus:outline-none focus:ring-2 focus:ring-purple-400 sm:right-4"
        @click.stop="goNext"
      >
        <i class="pi pi-chevron-right text-lg" />
      </button>

      <div class="flex max-h-full max-w-full flex-col items-center gap-3" @click.stop>
        <video
          v-if="current.file_type === 'video'"
          :key="current.id"
          :src="current.url"
          class="max-h-[80vh] max-w-[90vw] rounded-md"
          controls
        />
        <img
          v-else
          :key="current.id"
          :src="current.url"
          class="max-h-[80vh] max-w-[90vw] rounded-md object-contain"
          alt="Attachment preview"
        />

        <p v-if="attachments.length > 1" class="text-sm font-medium text-white/70">
          {{ currentIndex + 1 }} / {{ attachments.length }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
