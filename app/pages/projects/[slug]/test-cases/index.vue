<script setup lang="ts">
// Step 4 of the workflow: once modules and requirements exist, QA team
// members author structured test cases here and link each one to a
// module plus (optionally) one or more requirements via
// requirement_test_case_links. access is non-restrictive for this pilot,
// same convention as requirements/index.vue: every active role can view,
// create, edit, duplicate, and delete test cases across all modules, so
// there is no canManage gate on the controls and the server routes match
// (server/api/test-cases/*, no requireRole calls there either).
definePageMeta({ layout: 'default', title: 'Test Cases' })

interface TestCaseRow {
  id: number
  title: string
  module_id: number
  module_name: string
  steps: string | null
  expected_result: string | null
  priority: 'High' | 'Medium' | 'Low' | null
  type: 'Manual' | 'Automated'
  created_by: number | null
  last_modified_by: number | null
  last_modified_at: string
  created_at: string
  linked_requirement_ids: number[]
  linked_release_ids: number[]
}

interface ModuleOption {
  id: number
  name: string
}

interface RequirementOption {
  id: number
  title: string
  module_id: number
}

interface ReleaseOption {
  id: number
  version: string
}

const toast = useToast()
const dropdownPt = useDropdownPt()
const { projectKey, isReadOnly } = useCurrentProject()

// -- filters: Module, Priority, Type (all default to "All") --
const selectedModuleId = ref<number | null>(null)
const selectedPriority = ref<string | null>(null)
const selectedType = ref<string | null>(null)
const selectedReleaseId = ref<number | null>(null)

const PRIORITY_FILTER_OPTIONS = [
  { label: 'All Priorities', value: null },
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' }
]
const TYPE_FILTER_OPTIONS = [
  { label: 'All Types', value: null },
  { label: 'Manual', value: 'Manual' },
  { label: 'Automated', value: 'Automated' }
]

// these four fetches are independent of each other, so they are kicked off
// together and only awaited once instead of one after another. useFetch
// returns its data and pending and refresh refs synchronously, so those are
// grabbed right away. Promise.all is only used to wait for all four
// requests to finish at once, never to read the resolved value itself,
// since destructuring straight off Promise.all was handing back undefined
// refs instead of the real composable objects.
const modulesFetch = useFetch<ModuleOption[]>('/api/modules', { key: projectKey('modules') })
const testCasesFetch = useFetch<TestCaseRow[]>('/api/test-cases', {
  key: projectKey('test-cases-list'),
  query: computed(() => ({
    ...(selectedModuleId.value ? { moduleId: selectedModuleId.value } : {}),
    ...(selectedPriority.value ? { priority: selectedPriority.value } : {}),
    ...(selectedType.value ? { type: selectedType.value } : {}),
    ...(selectedReleaseId.value ? { releaseId: selectedReleaseId.value } : {})
  }))
})
const requirementsFetch = useFetch<RequirementOption[]>('/api/requirements', { key: projectKey('requirements-all') })
const releasesFetch = useFetch<ReleaseOption[]>('/api/releases', { key: projectKey('releases') })

await Promise.all([modulesFetch, testCasesFetch, requirementsFetch, releasesFetch])

const { data: moduleOptionsData } = modulesFetch
const { data, refresh, pending: loadingTestCases } = testCasesFetch
const { data: allRequirementsData } = requirementsFetch
const { data: releaseOptionsData } = releasesFetch

const moduleOptions = computed(() => moduleOptionsData.value ?? [])
const moduleFilterOptions = computed(() => [{ id: null, name: 'All Modules' }, ...moduleOptions.value])
const testCases = computed(() => data.value ?? [])
const allRequirements = computed(() => allRequirementsData.value ?? [])
const releaseOptions = computed<ReleaseOption[]>(() => releaseOptionsData.value ?? [])
const releaseFilterOptions = computed(() => [
  { id: null, version: 'All Versions' },
  ...releaseOptions.value
])
function requirementTitle(id: number) {
  return allRequirements.value.find((r) => r.id === id)?.title ?? 'Unknown requirement'
}
function releaseVersion(id: number) {
  return releaseOptions.value.find((r) => r.id === id)?.version ?? 'Unknown version'
}

const columns = [
  { field: 'tc_id', sortField: 'id', header: 'TC ID', sortable: true },
  { field: 'title', header: 'Title' },
  { field: 'module_name', header: 'Module', sortable: true },
  { field: 'priority', header: 'Priority', sortable: true },
  { field: 'type', header: 'Type', sortable: true },
  { field: 'linked_reqs', header: 'Linked Reqs' },
  { field: 'linked_releases', header: 'Versions' }
]

function tcCode(id: number) {
  return `TC-${id.toString().padStart(3, '0')}`
}

function reqCode(id: number) {
  return `REQ-${id.toString().padStart(3, '0')}`
}

const PRIORITY_CLASSES: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30',
  Medium:
    'bg-[#245CB1]/10 text-[#245CB1] border-[#245CB1]/30 dark:bg-[#5B8FE0]/15 dark:text-[#5B8FE0] dark:border-[#5B8FE0]/30',
  Low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30'
}

function stripFormatting(value: string | null) {
  return (value ?? '').replace(/\*\*|\*/g, '').replace(/\n/g, ' ').trim()
}

// requirements and releases are fetched together with modules and test
// cases above (see the Promise.all block); allRequirements, releaseOptions,
// releaseFilterOptions, requirementTitle and releaseVersion are all defined
// there.

// -- linked releases popover --
const releasePopoverRef = ref()
const activeReleasePopoverIds = ref<number[]>([])
function toggleLinkedReleasesPopover(event: MouseEvent, row: TestCaseRow) {
  activeReleasePopoverIds.value = row.linked_release_ids
  releasePopoverRef.value?.toggle(event)
}

// -- linked reqs popover --
const popoverRef = ref()
const activePopoverIds = ref<number[]>([])
function toggleLinkedReqsPopover(event: MouseEvent, row: TestCaseRow) {
  activePopoverIds.value = row.linked_requirement_ids
  popoverRef.value?.toggle(event)
}

// -- add / edit modal --
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low']
const TYPE_OPTIONS = ['Manual', 'Automated']

const modalOpen = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const editingTestCase = ref<TestCaseRow | null>(null)
const saving = ref(false)

const form = reactive({
  title: '',
  moduleId: null as number | null,
  requirementIds: [] as number[],
  releaseIds: [] as number[],
  priority: 'Medium' as string,
  type: 'Manual' as string,
  steps: '',
  expectedResult: ''
})

// requirements offered in the modal's multi-select, narrowed to the
// selected module (per spec: "fetching active requirements from
// /api/requirements filtered by the selected module")
const { data: modalRequirementsData, refresh: refreshModalRequirements } = await useFetch<RequirementOption[]>(
  '/api/requirements',
  {
    key: projectKey('requirements-modal'),
    query: computed(() => (form.moduleId ? { moduleId: form.moduleId } : {})),
    immediate: false
  }
)
const modalRequirementOptions = computed(() => modalRequirementsData.value ?? [])

watch(
  () => form.moduleId,
  () => {
    if (modalOpen.value) refreshModalRequirements()
  }
)

const titleError = computed(() => (form.title.trim() ? null : 'Title is required.'))
const moduleError = computed(() => (form.moduleId ? null : 'Select a module.'))
const canSave = computed(() => !titleError.value && !moduleError.value && !saving.value)

function openAdd() {
  modalMode.value = 'add'
  editingTestCase.value = null
  form.title = ''
  form.moduleId = selectedModuleId.value ?? null
  form.requirementIds = []
  form.releaseIds = []
  form.priority = 'Medium'
  form.type = 'Manual'
  form.steps = ''
  form.expectedResult = ''
  modalOpen.value = true
  refreshModalRequirements()
}

function openEdit(row: TestCaseRow) {
  modalMode.value = 'edit'
  editingTestCase.value = row
  form.title = row.title
  form.moduleId = row.module_id
  form.requirementIds = [...row.linked_requirement_ids]
  form.releaseIds = [...row.linked_release_ids]
  form.priority = row.priority ?? 'Medium'
  form.type = row.type
  form.steps = row.steps ?? ''
  form.expectedResult = row.expected_result ?? ''
  modalOpen.value = true
  refreshModalRequirements()
}

async function saveTestCase() {
  if (!canSave.value) return
  saving.value = true
  try {
    const body = {
      title: form.title.trim(),
      moduleId: form.moduleId,
      requirementIds: form.requirementIds,
      releaseIds: form.releaseIds,
      priority: form.priority,
      type: form.type,
      steps: form.steps || null,
      expectedResult: form.expectedResult || null
    }

    if (modalMode.value === 'add') {
      await $fetch('/api/test-cases', { method: 'POST', body })
      toast.add({ severity: 'success', summary: 'Test case created', life: 3000 })
    } else if (editingTestCase.value) {
      await $fetch(`/api/test-cases/${editingTestCase.value.id}`, { method: 'PUT', body })
      toast.add({ severity: 'success', summary: 'Test case updated', life: 3000 })
    }
    modalOpen.value = false
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not save this test case',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}

// -- duplicate --
const duplicatingId = ref<number | null>(null)
async function duplicateTestCase(row: TestCaseRow) {
  duplicatingId.value = row.id
  try {
    await $fetch(`/api/test-cases/${row.id}/duplicate`, { method: 'POST' })
    toast.add({ severity: 'success', summary: 'Test case duplicated', life: 3000 })
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not duplicate this test case',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    duplicatingId.value = null
  }
}

// -- delete flow --
const confirmDialogRef = ref<{ open: (opts: any) => Promise<boolean> }>()

async function deleteTestCase(row: TestCaseRow) {
  const confirmed = await confirmDialogRef.value?.open({
    title: 'Delete this test case?',
    message: `"${row.title}" will be removed from the active list. Its requirement links and execution history are kept.`,
    confirmLabel: 'Delete',
    danger: true
  })
  if (!confirmed) return

  try {
    await $fetch(`/api/test-cases/${row.id}`, { method: 'DELETE' })
    toast.add({ severity: 'success', summary: 'Test case deleted', life: 3000 })
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not delete this test case',
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
          Test Case Repository
        </h1>
        <p class="mt-1 text-sm text-body">
          Author, organize, and link test cases to product requirements.
        </p>
      </div>

      <BaseButton
        v-if="!isReadOnly"
        label=" Create Test Case"
        variant="primary"
        icon="pi pi-plus"
        @click="openAdd"
      />
    </div>

    <AppDataTable
      :value="testCases"
      :columns="columns"
      :loading="loadingTestCases"
      search-placeholder="Search test cases..."
      empty-message="No test cases authored yet."
      data-key="id"
    >
      <template #toolbar>
        <Select
          v-model="selectedModuleId"
          :options="moduleFilterOptions"
          option-label="name"
          option-value="id"
          placeholder="All Modules"
          class="w-44"
          :pt="dropdownPt"
          panel-class="!bg-foreground !text-heading !border !border-border"
        />
        <Select
          v-model="selectedPriority"
          :options="PRIORITY_FILTER_OPTIONS"
          option-label="label"
          option-value="value"
          placeholder="All Priorities"
          class="w-40"
          :pt="dropdownPt"
          panel-class="!bg-foreground !text-heading !border !border-border"
        />
        <Select
          v-model="selectedType"
          :options="TYPE_FILTER_OPTIONS"
          option-label="label"
          option-value="value"
          placeholder="All Types"
          class="w-36"
          :pt="dropdownPt"
          panel-class="!bg-foreground !text-heading !border !border-border"
        />
        <Select
          v-model="selectedReleaseId"
          :options="releaseFilterOptions"
          option-label="version"
          option-value="id"
          placeholder="All Versions"
          class="w-44"
          :pt="dropdownPt"
          panel-class="!bg-foreground !text-heading !border !border-border"
        />
      </template>

      <template #cell-tc_id="{ data: row }">
        <span
          class="inline-flex items-center rounded-full border border-[#245CB1]/30 bg-[#245CB1]/10 px-2 py-0.5
                 text-xs font-semibold text-[#245CB1] dark:border-[#5B8FE0]/30 dark:bg-[#5B8FE0]/15 dark:text-[#7FAEEB]"
        >
          {{ tcCode(row.id) }}
        </span>
      </template>

      <template #cell-title="{ data: row }">
        <div class="max-w-sm" :title="stripFormatting(row.steps) || 'No steps recorded.'">
          <p class="text-sm font-bold text-heading">
            {{ row.title }}
          </p>
          <p class="mt-0.5 truncate text-xs text-body">
            {{ stripFormatting(row.steps) || 'No steps recorded.' }}
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

      <template #cell-priority="{ data: row }">
        <span
          v-if="row.priority"
          class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
          :class="PRIORITY_CLASSES[row.priority]"
        >
          {{ row.priority }}
        </span>
        <span v-else class="text-xs text-gray-400 dark:text-zinc-500">Unset</span>
      </template>

      <template #cell-type="{ data: row }">
        <span
          class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
          :class="row.type === 'Automated'
            ? 'border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300'
            : 'border-border bg-secondary text-body'"
        >
          <i :class="row.type === 'Automated' ? 'pi pi-cog' : 'pi pi-user'" class="text-[10px]" />
          {{ row.type }}
        </span>
      </template>

      <template #cell-linked_reqs="{ data: row }">
        <button
          type="button"
          class="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700
                 transition-colors hover:bg-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25"
          :disabled="row.linked_requirement_ids.length === 0"
          @click="toggleLinkedReqsPopover($event, row)"
        >
          {{ row.linked_requirement_ids.length }}
        </button>
      </template>

      <template #cell-linked_releases="{ data: row }">
        <button
          v-if="row.linked_release_ids.length > 0"
          type="button"
          class="inline-flex items-center rounded-full bg-[#245CB1]/10 px-2 py-0.5 text-xs font-semibold text-[#245CB1]
                 transition-colors hover:bg-[#245CB1]/20 dark:bg-[#5B8FE0]/15 dark:text-[#7FAEEB] dark:hover:bg-[#5B8FE0]/25"
          @click="toggleLinkedReleasesPopover($event, row)"
        >
          {{ row.linked_release_ids.length }} version{{ row.linked_release_ids.length === 1 ? '' : 's' }}
        </button>
        <span v-else class="text-xs text-gray-400 dark:text-zinc-500">Unassigned</span>
      </template>

      <template v-if="!isReadOnly" #actions="{ data: row }">
        <div class="flex items-center gap-2">
          <BaseButton variant="outline" size="sm" icon="pi pi-pencil" label="Edit" @click="openEdit(row)" />
          <BaseButton
            variant="outline"
            size="sm"
            icon="pi pi-copy"
            label="Duplicate"
            :loading="duplicatingId === row.id"
            @click="duplicateTestCase(row)"
          />
          <BaseButton variant="dangerOutline" size="sm" icon="pi pi-trash" label="Delete" @click="deleteTestCase(row)" />
        </div>
      </template>
    </AppDataTable>

    <!-- linked requirements popover -->
    <Popover
      ref="popoverRef"
      :pt="{
        root: {
          class: '!bg-foreground !border !border-border !text-heading'
        }
      }"
    >
      <div class="max-w-xs space-y-1.5 p-1">
        <p class="text-xs font-semibold text-body">Linked Requirements</p>
        <ul v-if="activePopoverIds.length" class="space-y-1">
          <li v-for="reqId in activePopoverIds" :key="reqId" class="flex items-center gap-2 text-xs">
            <span
              class="inline-flex items-center rounded-full border border-[#245CB1]/30 bg-[#245CB1]/10 px-1.5 py-0.5
                     font-semibold text-[#245CB1] dark:border-[#5B8FE0]/30 dark:bg-[#5B8FE0]/15 dark:text-[#7FAEEB]"
            >
              {{ reqCode(reqId) }}
            </span>
            <span class="truncate text-body">{{ requirementTitle(reqId) }}</span>
          </li>
        </ul>
        <p v-else class="text-xs text-gray-400 dark:text-zinc-500">No requirements linked.</p>
      </div>
    </Popover>

    <!-- linked releases/versions popover -->
    <Popover
      ref="releasePopoverRef"
      :pt="{
        root: {
          class: '!bg-foreground !border !border-border !text-heading'
        }
      }"
    >
      <div class="max-w-xs space-y-1.5 p-1">
        <p class="text-xs font-semibold text-body">Assigned Versions</p>
        <ul v-if="activeReleasePopoverIds.length" class="space-y-1">
          <li v-for="releaseId in activeReleasePopoverIds" :key="releaseId" class="flex items-center gap-2 text-xs">
            <span
              class="inline-flex items-center rounded-full border border-[#245CB1]/30 bg-[#245CB1]/10 px-1.5 py-0.5
                     font-semibold text-[#245CB1] dark:border-[#5B8FE0]/30 dark:bg-[#5B8FE0]/15 dark:text-[#7FAEEB]"
            >
              {{ releaseVersion(releaseId) }}
            </span>
          </li>
        </ul>
        <p v-else class="text-xs text-gray-400 dark:text-zinc-500">Not assigned to any version.</p>
      </div>
    </Popover>

    <!-- add / edit modal -->
    <BaseModal
      v-model="modalOpen"
      :title="modalMode === 'add' ? 'Create Test Case' : 'Edit Test Case'"
      width="38rem"
    >
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-xs font-medium text-body">
            Title
          </label>
          <InputText
            v-model="form.title"
            placeholder="e.g. Verify guest can reschedule a confirmed booking"
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

        <div>
          <label class="mb-1 block text-xs font-medium text-body">
            Link Requirements
          </label>
          <MultiSelect
            v-model="form.requirementIds"
            :options="modalRequirementOptions"
            option-label="title"
            option-value="id"
            display="chip"
            filter
            :placeholder="form.moduleId ? 'Select requirements...' : 'Select a module first'"
            :disabled="!form.moduleId"
            class="w-full"
            :pt="dropdownPt"
            panel-class="!bg-foreground !text-heading !border !border-border"
          />
          <p v-if="form.moduleId && !modalRequirementOptions.length" class="mt-1 text-xs text-gray-400 dark:text-zinc-500">
            No active requirements exist for this module yet.
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-body">
            Assign to Releases
          </label>
          <MultiSelect
            v-model="form.releaseIds"
            :options="releaseOptions"
            option-label="version"
            option-value="id"
            display="chip"
            filter
            placeholder="Select releases..."
            class="w-full"
            :pt="dropdownPt"
            panel-class="!bg-foreground !text-heading !border !border-border"
          />
          <p v-if="!releaseOptions.length" class="mt-1 text-xs text-gray-400 dark:text-zinc-500">
            No releases exist yet. Create one from Test Executions &amp; Releases first.
          </p>
          <p v-else class="mt-1 text-xs text-gray-400 dark:text-zinc-500">
            Only releases this test case is assigned to will show it in their execution workspace.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-body">
              Priority
            </label>
            <Select
              v-model="form.priority"
              :options="PRIORITY_OPTIONS"
              class="w-full"
              :pt="dropdownPt"
              panel-class="!bg-foreground !text-heading !border !border-border"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-body">
              Type
            </label>
            <Select
              v-model="form.type"
              :options="TYPE_OPTIONS"
              class="w-full"
              :pt="dropdownPt"
              panel-class="!bg-foreground !text-heading !border !border-border"
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-body">
            Test Data
          </label>
          <RichTextEditor
            v-model="form.steps"
            placeholder="1. Log in as a guest&#10;2. Open an upcoming booking&#10;3. ..."
            :rows="5"
          />
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-body">
            Expected Result
          </label>
          <RichTextEditor
            v-model="form.expectedResult"
            placeholder="Describe the clear pass criteria..."
            :rows="4"
          />
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" label="Cancel" @click="modalOpen = false" />
        <BaseButton
          variant="primary"
          label="Save Test Case"
          :loading="saving"
          :disabled="!canSave"
          @click="saveTestCase"
        />
      </template>
    </BaseModal>

    <AppConfirmDialog ref="confirmDialogRef" />
  </div>
</template>