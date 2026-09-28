<script setup lang="ts">
// bug creation modal, opened by the FAIL button on the Test Execution page.
// It arrives pre-filled with the test case title, module, release link, the
// test's steps, and whatever the tester typed as the actual result on that
// failing run, so a tester can log a bug from a failing run in seconds.
const props = defineProps<{
  modelValue: boolean
  initialTitle?: string
  initialModuleId?: number | null
  initialReleaseId?: number | null
  initialTestCaseId?: number | null
  initialSteps?: string | null
  initialActualResult?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  created: [{ id: number; title: string }]
}>()

const toast = useToast()
const dropdownPt = useDropdownPt()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const PRIORITIES = ['High', 'Medium', 'Low']

const form = reactive({
  title: '',
  moduleId: null as number | null,
  severity: 'High',
  priority: 'High',
  environmentBuild: '',
  stepsToReproduce: '',
  actualResult: '',
  ownerId: null as number | null
})

const saving = ref(false)

// once the bug is created, the modal stays open briefly while any staged
// attachments upload, then closes on its own instead of forcing a second
// trip to the bug detail page
const createdBug = ref<{ id: number; title: string } | null>(null)
const uploadingAttachments = ref(false)

// a screenshot or video picked in the form, before the bug exists. Held as
// a plain File plus a local preview url so the picker can sit right in the
// form instead of only appearing after the bug is saved
interface StagedFile {
  localId: string
  file: File
  previewUrl: string
  type: 'image' | 'video'
}
const stagedFiles = ref<StagedFile[]>([])
const stagedDragOver = ref(false)
const stagedFileInput = ref<HTMLInputElement>()

function pickStagedFiles() {
  stagedFileInput.value?.click()
}

function addStagedFiles(fileList: FileList | null) {
  if (!fileList?.length) return
  for (const file of Array.from(fileList)) {
    stagedFiles.value.push({
      localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image'
    })
  }
  if (stagedFileInput.value) stagedFileInput.value.value = ''
}

function onStagedDrop(event: DragEvent) {
  stagedDragOver.value = false
  addStagedFiles(event.dataTransfer?.files ?? null)
}

function removeStagedFile(localId: string) {
  const match = stagedFiles.value.find((f) => f.localId === localId)
  if (match) URL.revokeObjectURL(match.previewUrl)
  stagedFiles.value = stagedFiles.value.filter((f) => f.localId !== localId)
}

// every staged file's preview url is a blob url tied to this modal
// instance, so they're released whichever way the form clears: reset on
// reopen, or cleared out after a successful save
function clearStagedFiles() {
  stagedFiles.value.forEach((f) => URL.revokeObjectURL(f.previewUrl))
  stagedFiles.value = []
}

// fires once the bug exists. best effort: a failed attachment does not
// block the bug itself from being logged, since it can always be added
// later from the bug's own detail page
async function uploadStagedFiles(bugId: number) {
  if (!stagedFiles.value.length) return
  uploadingAttachments.value = true
  let failures = 0
  try {
    for (const staged of stagedFiles.value) {
      try {
        const form = new FormData()
        form.append('bugId', String(bugId))
        form.append('file', staged.file)
        await $fetch('/api/bugs/attachments', { method: 'POST', body: form })
      } catch {
        failures += 1
      }
    }
  } finally {
    clearStagedFiles()
    uploadingAttachments.value = false
  }
  if (failures > 0) {
    toast.add({
      severity: 'warn',
      summary: failures === 1 ? '1 attachment failed to upload' : `${failures} attachments failed to upload`,
      detail: 'The bug was still logged. You can add attachments again from its detail page.',
      life: 6000
    })
  }
}

// the bug already open against this test case, if any. Set right after
// the modal opens; drives the duplicate warning banner below
interface ExistingBug {
  id: number
  title: string
  status: string
  severity: string
}
const existingBug = ref<ExistingBug | null>(null)
const checkingExisting = ref(false)
// lets a tester bypass the warning when the failure really is a new,
// distinct defect rather than a repeat of the linked one
const logAnywayConfirmed = ref(false)
const reopening = ref(false)

async function checkForExistingBug() {
  existingBug.value = null
  logAnywayConfirmed.value = false
  if (!props.initialTestCaseId) return
  checkingExisting.value = true
  try {
    const { existing } = await $fetch<{ existing: ExistingBug | null }>(
      '/api/bugs/open-for-test-case',
      { query: { testCaseId: props.initialTestCaseId } }
    )
    existingBug.value = existing
  } catch {
    // non-critical: if the check fails, fall back to the normal create
    // flow rather than blocking the tester from logging a bug at all
    existingBug.value = null
  } finally {
    checkingExisting.value = false
  }
}

// reset the form every time the modal opens with fresh initial values
watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return
    form.title = props.initialTitle ?? ''
    form.moduleId = props.initialModuleId ?? null
    form.severity = 'High'
    form.priority = 'High'
    form.environmentBuild = ''
    form.stepsToReproduce = props.initialSteps ?? ''
    form.actualResult = props.initialActualResult ?? ''
    form.ownerId = null
    createdBug.value = null
    clearStagedFiles()
    checkForExistingBug()
  }
)

// a Retest bug that fails again is the classic duplicate case: the fix
// didn't hold, so the right move is reopening that ticket, not filing a
// second one. Other statuses (Open, In Progress, Fixed, Reopened) already
// have an active owner on them, so we just point back to the ticket.
const canReopenExisting = computed(() => existingBug.value?.status === 'Retest')

async function reopenExisting() {
  if (!existingBug.value) return
  reopening.value = true
  try {
    await $fetch(`/api/bugs/${existingBug.value.id}`, {
      method: 'PUT',
      body: { status: 'Reopened' }
    })
    toast.add({
      severity: 'success',
      summary: `Bug #${existingBug.value.id} reopened`,
      life: 3000
    })
    emit('created', { id: existingBug.value.id, title: existingBug.value.title })
    visible.value = false
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not reopen this bug',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    reopening.value = false
  }
}

const titleError = computed(() => (form.title.trim() ? null : 'Title is required.'))
const moduleError = computed(() => (form.moduleId ? null : 'Module is required.'))
// blocked while an open duplicate is showing, unless the tester has
// explicitly confirmed this failure is a separate defect
const blockedByDuplicate = computed(() => !!existingBug.value && !logAnywayConfirmed.value)
const canSave = computed(
  () => !titleError.value && !moduleError.value && !saving.value && !blockedByDuplicate.value
)

async function save() {
  if (!canSave.value) return
  saving.value = true
  try {
    const created = await $fetch<{ id: number; title: string }>('/api/bugs', {
      method: 'POST',
      body: {
        title: form.title.trim(),
        moduleId: form.moduleId,
        severity: form.severity,
        priority: form.priority,
        environmentBuild: form.environmentBuild.trim() || null,
        linkedTestCaseId: props.initialTestCaseId ?? null,
        releaseId: props.initialReleaseId ?? null,
        stepsToReproduce: form.stepsToReproduce || null,
        actualResult: form.actualResult || null,
        ownerId: form.ownerId
      }
    })
    toast.add({
      severity: 'success',
      summary: `Bug #${created.id} logged`,
      life: 3000
    })
    createdBug.value = created
    await uploadStagedFiles(created.id)
    emit('created', created)
    visible.value = false
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not log this bug',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    v-model="visible"
    title="Log a bug from this failure"
    width="42rem"
  >
    <div class="space-y-4">
      <div
        v-if="existingBug"
        class="rounded-md border border-purple-300 bg-purple-50 p-3 text-sm dark:border-purple-500/30 dark:bg-purple-500/10"
      >
        <p class="font-medium text-purple-800 dark:text-purple-300">
          This test case already has an open bug: #{{ existingBug.id }} — {{ existingBug.title }}
          ({{ existingBug.status }})
        </p>
        <p class="mt-1 text-purple-700 dark:text-purple-400">
          Logging another bug here would create a duplicate ticket for the same defect.
        </p>
        <div class="mt-2 flex flex-wrap gap-2">
          <BaseButton
            variant="secondary"
            :label="`View bug #${existingBug.id}`"
            @click="navigateTo(`/bugs/${existingBug.id}`)"
          />
          <BaseButton
            v-if="canReopenExisting"
            variant="primary"
            label="Reopen this bug"
            :loading="reopening"
            @click="reopenExisting"
          />
          <BaseButton
            variant="secondary"
            label="This is a different bug — log anyway"
            @click="logAnywayConfirmed = true"
          />
        </div>
      </div>

      <div v-if="!blockedByDuplicate">
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
          Title
        </label>
        <InputText
          v-model="form.title"
          placeholder="Short summary of what broke"
          class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
          :invalid="!!titleError"
        />
        <p v-if="titleError" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ titleError }}
        </p>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
          Module
        </label>
        <ModuleSelect v-model="form.moduleId" :invalid="!!moduleError" />
        <p v-if="moduleError" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ moduleError }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
            Severity
          </label>
          <Select
            v-model="form.severity"
            :options="SEVERITIES"
            class="w-full"
            :pt="dropdownPt"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
            Priority
          </label>
          <Select
            v-model="form.priority"
            :options="PRIORITIES"
            class="w-full"
            :pt="dropdownPt"
          />
        </div>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
          Assign to
        </label>
        <UserAvatarSelect v-model="form.ownerId" placeholder="Unassigned" />
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
          Environment / Build
        </label>
        <InputText
          v-model="form.environmentBuild"
          placeholder="e.g. staging-v2.4.0-rc1"
          class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
        />
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
          Steps to reproduce
        </label>
        <RichTextEditor
          v-model="form.stepsToReproduce"
          placeholder="1. Open the page...&#10;2. Click...&#10;3. Observe..."
          :rows="6"
        />
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
          Actual result
        </label>
        <RichTextEditor
          v-model="form.actualResult"
          placeholder="What actually happened when you ran this..."
          :rows="4"
        />
        <p v-if="initialActualResult" class="mt-1 text-xs text-gray-400 dark:text-zinc-500">
          Carried over from the failing test run, edit if you want to add more detail.
        </p>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
          Attachments (optional)
        </label>
        <div
          class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg
                 border-2 border-dashed p-6 text-center transition-colors"
          :class="stagedDragOver
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
            : 'border-black/15 dark:border-white/15'"
          @click="pickStagedFiles"
          @dragover.prevent="stagedDragOver = true"
          @dragleave.prevent="stagedDragOver = false"
          @drop.prevent="onStagedDrop"
        >
          <i class="pi pi-image text-2xl text-gray-400 dark:text-white/40" />
          <p class="text-sm text-gray-600 dark:text-white/60">
            Drag & drop a screenshot or video, or click to browse
          </p>
          <input
            ref="stagedFileInput"
            type="file"
            accept="image/*,video/*"
            multiple
            class="hidden"
            @change="addStagedFiles(($event.target as HTMLInputElement).files)"
          />
        </div>

        <div v-if="stagedFiles.length" class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          <div
            v-for="staged in stagedFiles"
            :key="staged.localId"
            class="group relative overflow-hidden rounded-md border border-black/10 dark:border-white/10"
          >
            <video
              v-if="staged.type === 'video'"
              :src="staged.previewUrl"
              class="h-24 w-full object-cover"
              muted
            />
            <img
              v-else
              :src="staged.previewUrl"
              class="h-24 w-full object-cover"
              alt="Attachment preview"
            />
            <button
              type="button"
              class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center
                     rounded-full bg-black/70 text-white opacity-0 transition-opacity
                     group-hover:opacity-100 group-focus-within:opacity-100
                     focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-400
                     focus:ring-offset-1"
              aria-label="Remove attachment"
              @click.stop="removeStagedFile(staged.localId)"
            >
              <i class="pi pi-times text-xs" />
            </button>
          </div>
        </div>
        <p v-if="uploadingAttachments" class="mt-2 text-xs text-gray-400 dark:text-zinc-500">
          Uploading attachments...
        </p>
      </div>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" label="Cancel" :disabled="saving || uploadingAttachments" @click="visible = false" />
      <BaseButton
        v-if="!blockedByDuplicate"
        variant="primary"
        label="Save Bug"
        :loading="saving || uploadingAttachments"
        :disabled="!canSave"
        @click="save"
      />
    </template>
  </BaseModal>
</template>
