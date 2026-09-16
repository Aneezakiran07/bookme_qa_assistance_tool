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
}

const props = withDefaults(
  defineProps<{ bugId: number; initialAttachments?: MediaAttachment[] }>(),
  { initialAttachments: () => [] }
)

const emit = defineEmits<{ 'update:attachments': [MediaAttachment[]] }>()

// seeded from the bug detail page so previously uploaded screenshots and
// videos show up immediately instead of starting from an empty dropzone
const attachments = ref<MediaAttachment[]>([...props.initialAttachments])
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
  } finally {
    uploading.value = false
  }
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

    <div v-if="attachments.length" class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
      <div
        v-for="attachment in attachments"
        :key="attachment.id"
        class="group relative overflow-hidden rounded-md border border-black/10 dark:border-white/10"
      >
        <video
          v-if="attachment.file_type === 'video'"
          :src="attachment.url"
          class="h-24 w-full object-cover"
          muted
        />
        <img v-else :src="attachment.url" class="h-24 w-full object-cover" alt="Attachment preview" />
        <button
          type="button"
          class="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center
                 rounded-full bg-black/70 text-white group-hover:flex"
          aria-label="Remove attachment"
          @click.stop="removeAttachment(attachment.id)"
        >
          <i class="pi pi-times text-xs" />
        </button>
      </div>
    </div>
  </div>
</template>
