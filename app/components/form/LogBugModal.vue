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
  }
)

const titleError = computed(() => (form.title.trim() ? null : 'Title is required.'))
const moduleError = computed(() => (form.moduleId ? null : 'Module is required.'))
const canSave = computed(() => !titleError.value && !moduleError.value && !saving.value)

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

    <template #footer>
      <BaseButton variant="secondary" label="Cancel" @click="visible = false" />
      <BaseButton
        variant="primary"
        label="Save Bug"
        :loading="saving"
        :disabled="!canSave"
        @click="save"
      />
    </template>
  </BaseModal>
</template>
