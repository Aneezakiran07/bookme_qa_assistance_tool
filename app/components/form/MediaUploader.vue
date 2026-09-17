<script setup lang="ts">
// screenshot/video dropzone for a bug, wired to the existing
// POST /api/bugs/attachments/index and DELETE /api/bugs/attachments/:id
// endpoints. shows thumbnails as files upload and lets the user remove
// one before or after submitting the bug.
export interface MediaAttachment {
  id: number
  url: string
  public_id: string
  file_type: 'image' | 'video'
  uploaded_by_role?: string | null
}

// readonly renders a plain gallery with no dropzone and no delete button,
// used for showing the other side's proof (qa looking at developer
// screenshots, or a developer looking at qa's). filterRoles narrows which
// bucket of attachments this instance displays and, implicitly, which
// bucket it's meant to be adding to, since the server always tags a new
// upload with the uploader's own session role rather than anything this
// component sends
const props = withDefaults(
  defineProps<{
    bugId: number
    initialAttachments?: MediaAttachment[]
    readonly?: boolean
    filterRoles?: string[]
  }>(),
  { initialAttachments: () => [], readonly: false, filterRoles: undefined }
)

const emit = defineEmits<{ 'update:attachments': [MediaAttachment[]] }>()

const toast = useToast()

// seeded from the bug detail page so previously uploaded screenshots and
// videos show up immediately instead of starting from an empty dropzone
const attachments = ref<MediaAttachment[]>([...props.initialAttachments])

// narrows the full attachment list down to this instance's bucket (qa
// reproduction proof vs developer fix proof); when no filterRoles is
// given every attachment is shown, same as before this prop existed
const visibleAttachments = computed(() => {
  if (!props.filterRoles?.length) return attachments.value
  return attachments.value.filter((a) => a.uploaded_by_role && props.filterRoles!.includes(a.uploaded_by_role))
})

const uploading = ref(false)
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

function pickFiles() {
  fileInput.value?.click()
}

async function handleFiles(fileList: FileList | null) {
  if (!fileList?.length) return
  uploading.value = true
  try {
    for (const file of Array.from(fileList)) {
      const form = new FormData()
      form.append('bugId', String(props.bugId))
      form.append('file', file)
      const created = await $fetch<MediaAttachment>('/api/bugs/attachments', {
        method: 'POST',
        body: form
      })
      attachments.value.push(created)
    }
    emit('update:attachments', attachments.value)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not upload this file',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    uploading.value = false
    // reset so selecting the exact same file again still fires @change
    if (fileInput.value) fileInput.value.value = ''
  }
}

// full-size lightbox preview, opened by clicking a thumbnail image or
// video anywhere in the grid, never by clicking the remove button
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

function openLightbox(index: number) {
  lightboxIndex.value = index
  lightboxOpen.value = true
}

async function removeAttachment(id: number) {
  await $fetch(`/api/bugs/attachments/${id}`, { method: 'DELETE' })
  attachments.value = attachments.value.filter((a) => a.id !== id)
  emit('update:attachments', attachments.value)
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  handleFiles(event.dataTransfer?.files ?? null)
}
</script>

<template>
  <div>
    <div
      v-if="!readonly"
      class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg
             border-2 border-dashed p-6 text-center transition-colors"
      :class="dragOver
        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
        : 'border-black/15 dark:border-white/15'"
      @click="pickFiles"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <i class="pi pi-image text-2xl text-gray-400 dark:text-white/40" />
      <p class="text-sm text-gray-600 dark:text-white/60">
        Drag & drop a screenshot or video, or click to browse
      </p>
      <ProgressSpinner v-if="uploading" style="width: 1.5rem; height: 1.5rem" stroke-width="6" />
      <input
        ref="fileInput"
        type="file"
        accept="image/*,video/*"
        multiple
        class="hidden"
        @change="handleFiles(($event.target as HTMLInputElement).files)"
      />
    </div>

    <p
      v-if="readonly && !visibleAttachments.length"
      class="text-sm text-gray-400 dark:text-white/40"
    >
      No attachments yet.
    </p>

    <div v-if="visibleAttachments.length" class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
      <div
        v-for="(attachment, index) in visibleAttachments"
        :key="attachment.id"
        class="group relative overflow-hidden rounded-md border border-black/10 dark:border-white/10"
      >
        <video
          v-if="attachment.file_type === 'video'"
          :src="attachment.url"
          class="h-24 w-full cursor-pointer object-cover"
          muted
          @click="openLightbox(index)"
        />
        <img
          v-else
          :src="attachment.url"
          class="h-24 w-full cursor-pointer object-cover"
          alt="Attachment preview"
          @click="openLightbox(index)"
        />
        <button
          v-if="!readonly"
          type="button"
          class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center
                 rounded-full bg-black/70 text-white opacity-0 transition-opacity
                 group-hover:opacity-100 group-focus-within:opacity-100
                 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-400
                 focus:ring-offset-1"
          aria-label="Remove attachment"
          @click.stop="removeAttachment(attachment.id)"
        >
          <i class="pi pi-times text-xs" />
        </button>
      </div>
    </div>

    <MediaLightbox
      v-model="lightboxOpen"
      :attachments="visibleAttachments"
      :start-index="lightboxIndex"
    />
  </div>
</template>
