<script setup lang="ts">
// create or rename a project, used by the projects page and by the header project picker
// pass a project to edit it, leave it empty to create a new one
// the server owns the slug, so it is never sent from here
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    project?: ProjectSummary | null
  }>(),
  { project: null }
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: [ProjectSummary]
}>()

const toast = useToast()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const isEdit = computed(() => !!props.project)
const name = ref('')
const description = ref('')
const saving = ref(false)
// the server message for a duplicate name, shown right under the field
const nameError = ref<string | null>(null)

const trimmedName = computed(() => name.value.trim())
const canSave = computed(() => !!trimmedName.value && !saving.value)

// fills the form each time the modal opens
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    name.value = props.project?.name ?? ''
    description.value = props.project?.description ?? ''
    nameError.value = null
  }
)

watch(name, () => {
  nameError.value = null
})

async function save() {
  if (!canSave.value) return
  saving.value = true
  nameError.value = null
  try {
    const body = { name: trimmedName.value, description: description.value.trim() }
    const saved = props.project
      ? await $fetch<ProjectSummary>(`/api/projects/${props.project.id}`, { method: 'PUT', body })
      : await $fetch<ProjectSummary>('/api/projects', { method: 'POST', body })

    toast.add({
      severity: 'success',
      summary: isEdit.value ? 'Project updated' : 'Project created',
      life: 3000
    })
    emit('saved', saved)
    visible.value = false
  } catch (error) {
    const status = (error as any)?.statusCode ?? (error as any)?.status
    const message = (error as any)?.data?.statusMessage ?? 'Please try again.'
    if (status === 409) {
      nameError.value = message
    } else {
      toast.add({
        severity: 'error',
        summary: 'Could not save this project',
        detail: message,
        life: 5000
      })
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal v-model="visible" :title="isEdit ? 'Edit Project' : 'New Project'" width="28rem">
    <div class="space-y-4">
      <div class="space-y-2">
        <label class="mb-1 block text-xs font-medium text-body">
          Project Name
        </label>
        <InputText
          v-model="name"
          placeholder="e.g. Bookme Web"
          class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
          :invalid="!!nameError"
          autofocus
          @keyup.enter="save"
        />
        <p v-if="nameError" class="text-xs text-red-600 dark:text-red-400">
          {{ nameError }}
        </p>
      </div>

      <div class="space-y-2">
        <label class="mb-1 block text-xs font-medium text-body">
          Description (optional)
        </label>
        <Textarea
          v-model="description"
          rows="3"
          placeholder="What is this project about?"
          class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
        />
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" label="Cancel" @click="visible = false" />
      <BaseButton
        variant="primary"
        :label="isEdit ? 'Save Changes' : 'Create Project'"
        :loading="saving"
        :disabled="!canSave"
        @click="save"
      />
    </template>
  </BaseModal>
</template>
