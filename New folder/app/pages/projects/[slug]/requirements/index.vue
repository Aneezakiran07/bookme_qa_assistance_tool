<script setup lang="ts">
// Step 3 of the workflow: once modules exist in the App Map, team members
// write functional requirements here and map each one to a module. access
// is non-restrictive for this pilot: every active role (QA Lead, Tester,
// Developer, Admin) can view, create, edit, and archive requirements
// across all modules, so unlike management/modules.vue there is no
// canManage gate on the controls, and the server routes match that
// (see server/api/requirements/*, no requireRole calls there either).
definePageMeta({ layout: 'default', title: 'Requirements' })

interface RequirementRow {
  id: number
  title: string
  module_id: number
  module_name: string
  target_release: string | null
  status: 'Draft' | 'Approved' | 'In Testing' | 'Done'
  description: string | null
  created_by: number | null
  created_by_email: string | null
  created_at: string
  archived: boolean
  linked_test_cases_count: number
}

interface ModuleOption {
  id: number
  name: string
}

const toast = useToast()
const dropdownPt = useDropdownPt()
const { projectKey, isReadOnly } = useCurrentProject()

// -- module filter, defaults to All Modules --
const { data: moduleOptionsData } = await useFetch<ModuleOption[]>('/api/modules', { key: projectKey('modules') })
const moduleOptions = computed(() => moduleOptionsData.value ?? [])

const selectedModuleId = ref<number | null>(null)
const moduleFilterOptions = computed(() => [{ id: null, name: 'All Modules' }, ...moduleOptions.value])

const { data, refresh, pending: loadingRequirements } = await useFetch<RequirementRow[]>(
  '/api/requirements',
  {
    key: projectKey('requirements-list'),
    query: computed(() => (selectedModuleId.value ? { moduleId: selectedModuleId.value } : {}))
  }
)
const requirements = computed(() => data.value ?? [])

const columns = [
  { field: 'req_id', sortField: 'id', header: 'Req ID', sortable: true },
  { field: 'title', header: 'Title & Description' },
  { field: 'module_name', header: 'Module', sortable: true },
  { field: 'status', header: 'Status', sortable: true },
  { field: 'target_release', header: 'Target Release', sortable: true },
  { field: 'linked_test_cases_count', header: 'Linked Test Cases' }
]

function reqCode(id: number) {
  return `REQ-${id.toString().padStart(3, '0')}`
}

// -- add / edit modal --
const STATUS_OPTIONS = ['Draft', 'Approved', 'In Testing', 'Done']

const modalOpen = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const editingRequirement = ref<RequirementRow | null>(null)
const saving = ref(false)

const form = reactive({
  title: '',
  moduleId: null as number | null,
  status: 'Draft',
  targetRelease: '',
  description: ''
})

const titleError = computed(() => (form.title.trim() ? null : 'Title is required.'))
const moduleError = computed(() => (form.moduleId ? null : 'Select a module.'))
const canSave = computed(() => !titleError.value && !moduleError.value && !saving.value)

function openAdd() {
  modalMode.value = 'add'
  editingRequirement.value = null
  form.title = ''
  form.moduleId = selectedModuleId.value ?? null
  form.status = 'Draft'
  form.targetRelease = ''
  form.description = ''
  modalOpen.value = true
}

function openEdit(row: RequirementRow) {
  modalMode.value = 'edit'
  editingRequirement.value = row
  form.title = row.title
  form.moduleId = row.module_id
  form.status = row.status
  form.targetRelease = row.target_release ?? ''
  form.description = row.description ?? ''
  modalOpen.value = true
}

async function saveRequirement() {
  if (!canSave.value) return
  saving.value = true
  try {
    const body = {
      title: form.title.trim(),
      moduleId: form.moduleId,
      status: form.status,
      targetRelease: form.targetRelease.trim() || null,
      description: form.description || null
    }

    if (modalMode.value === 'add') {
      await $fetch('/api/requirements', { method: 'POST', body })
      toast.add({ severity: 'success', summary: 'Requirement created', life: 3000 })
    } else if (editingRequirement.value) {
      await $fetch(`/api/requirements/${editingRequirement.value.id}`, { method: 'PUT', body })
      toast.add({ severity: 'success', summary: 'Requirement updated', life: 3000 })
    }
    modalOpen.value = false
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not save this requirement',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}

// -- archive flow --
const confirmDialogRef = ref<{ open: (opts: any) => Promise<boolean> }>()

async function archiveRequirement(row: RequirementRow) {
  const confirmed = await confirmDialogRef.value?.open({
    title: 'Archive this requirement?',
    message: `"${row.title}" will be moved out of the active list. Linked test cases stay intact.`,
    confirmLabel: 'Archive',
    danger: true
  })
  if (!confirmed) return

  try {
    await $fetch(`/api/requirements/${row.id}`, { method: 'DELETE' })
    toast.add({ severity: 'success', summary: 'Requirement archived', life: 3000 })
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not archive this requirement',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 6000
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-heading">
          Product Requirements
        </h1>
        <p class="mt-1 text-sm text-body">
          Manage feature specifications and link them to application modules.
        </p>
      </div>

      <BaseButton
        v-if="!isReadOnly"
        label=" Add New Requirement"
        variant="primary"
        icon="pi pi-plus"
        @click="openAdd"
      />
    </div>

    <AppDataTable
      :value="requirements"
      :columns="columns"
      :loading="loadingRequirements"
      search-placeholder="Search requirements..."
      empty-message="No requirements defined yet."
      data-key="id"
    >
      <template #toolbar>
        <Select
          v-model="selectedModuleId"
          :options="moduleFilterOptions"
          option-label="name"
          option-value="id"
          placeholder="All Modules"
          class="w-48"
          :pt="dropdownPt"
          panel-class="!bg-foreground !text-heading !border !border-border"
        />
      </template>

      <template #cell-req_id="{ data: row }">
        <span
          class="inline-flex items-center rounded-full border border-[#245CB1]/30 bg-[#245CB1]/10 px-2 py-0.5
                 text-xs font-semibold text-heading dark:border-[#5B8FE0]/30 dark:bg-[#5B8FE0]/15"
        >
          {{ reqCode(row.id) }}
        </span>
      </template>

      <template #cell-title="{ data: row }">
        <div class="max-w-sm">
          <p class="text-sm font-bold text-heading">
            {{ row.title }}
          </p>
          <p class="mt-0.5 truncate text-xs text-body">
            {{ row.description || 'No description provided.' }}
          </p>
        </div>
      </template>

      <template #cell-module_name="{ data: row }">
        <span
          class="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-body"
        >
          {{ row.module_name }}
        </span>
      </template>

      <template #cell-status="{ data: row }">
        <StatusBadge :status="row.status" size="sm" />
      </template>

      <template #cell-target_release="{ data: row }">
        <span
          v-if="row.target_release"
          class="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-body"
        >
          {{ row.target_release }}
        </span>
        <span v-else class="text-xs text-gray-400 dark:text-zinc-500">Unassigned</span>
      </template>

      <template #cell-linked_test_cases_count="{ data: row }">
        <span
          class="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700
                 dark:bg-sky-500/15 dark:text-sky-300"
        >
          {{ row.linked_test_cases_count }}
        </span>
      </template>

      <template v-if="!isReadOnly" #actions="{ data: row }">
        <div class="flex items-center gap-2">
          <BaseButton
            label="Edit"
            variant="outline"
            size="sm"
            icon="pi pi-pencil"
            @click="openEdit(row)"
          />
          <BaseButton
            label="Archive"
            variant="dangerOutline"
            size="sm"
            icon="pi pi-inbox"
            @click="archiveRequirement(row)"
          />
        </div>
      </template>
    </AppDataTable>

    <!-- add / edit modal -->
    <BaseModal
      v-model="modalOpen"
      :title="modalMode === 'add' ? 'Add New Requirement' : 'Edit Requirement'"
      width="34rem"
    >
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-xs font-medium text-body">
            Title
          </label>
          <InputText
            v-model="form.title"
            placeholder="e.g. Allow guests to reschedule a booking"
            class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
            :invalid="!!titleError"
          />
          <p v-if="titleError" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ titleError }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-body">
            Module
          </label>
          <ModuleSelect v-model="form.moduleId" :invalid="!!moduleError" />
          <p v-if="moduleError" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ moduleError }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-body">
              Status
            </label>
            <Select
              v-model="form.status"
              :options="STATUS_OPTIONS"
              class="w-full"
              :pt="dropdownPt"
              panel-class="!bg-foreground !text-heading !border !border-border"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-body">
              Target Release
            </label>
            <InputText
              v-model="form.targetRelease"
              placeholder="e.g. v2.4.0"
              class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-body">
            Description
          </label>
          <RichTextEditor
            v-model="form.description"
            placeholder="Describe the functional specification..."
            :rows="6"
          />
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" label="Cancel" @click="modalOpen = false" />
        <BaseButton
          variant="primary"
          label="Save Requirement"
          :loading="saving"
          :disabled="!canSave"
          @click="saveRequirement"
        />
      </template>
    </BaseModal>

    <AppConfirmDialog ref="confirmDialogRef" />
  </div>
</template>
