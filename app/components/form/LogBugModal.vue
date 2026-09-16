<script setup lang="ts">
// bug creation modal, opened by the FAIL button on the Test Execution page.
// It arrives pre-filled with the test case title, module, release link, and
// the test's steps so a tester can log a bug from a failing run in seconds.
const props = defineProps<{
  modelValue: boolean
  initialTitle?: string
  initialModuleId?: number | null
  initialReleaseId?: number | null
  initialTestCaseId?: number | null
  initialSteps?: string | null
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
  stepsToReproduce: ''
})

const saving = ref(false)

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
        stepsToReproduce: form.stepsToReproduce || null
      }
    })
    toast.add({
      severity: 'success',
      summary: `Bug #${created.id} logged`,
      life: 3000
    })
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
  <BaseModal v-model="visible" title="Log a bug from this failure" width="42rem">
    <div class="space-y-4">
      <div
        v-if="existingBug"
        class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        <p class="font-medium text-amber-800 dark:text-amber-300">
          This test case already has an open bug: #{{ existingBug.id }} — {{ existingBug.title }}
          ({{ existingBug.status }})
        </p>
        <p class="mt-1 text-amber-700 dark:text-amber-400">
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
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" label="Cancel" @click="visible = false" />
      <BaseButton
        v-if="!blockedByDuplicate"
        variant="primary"
        label="Save Bug"
        :loading="saving"
        :disabled="!canSave"
        @click="save"
      />
    </template>
  </BaseModal>
</template>
