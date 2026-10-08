<script setup lang="ts">
// Step 2 of setup: define the app modules (Authentication, Booking Flow,
// Payments, etc) that Requirements, Test Cases, and Bugs all hang off of
// via module_id. visible to every active user (see AppSidebar — it's
// listed under both the standard and admin nav groups) so anyone can see
// what modules exist, but only Admin / QA Lead can add, rename, or
// delete one — enforced both here (hides the controls) and server-side
// in server/api/modules/*, so a non-privileged user can't just call the
// API directly.
definePageMeta({ layout: 'default', title: 'Modules' })

interface ModuleRow {
  id: number
  name: string
  created_by: number | null
  created_at: string
  created_by_email: string | null
  created_by_avatar_id: string | null
  requirements_count: number
  test_cases_count: number
}

const toast = useToast()

const { user } = useUserSession()
const currentUser = computed(() => user.value as { role?: string } | null)
const { projectKey, isReadOnly } = useCurrentProject()
// an archived project is read only for everyone, so the management controls go away with it
const canManage = computed(() => ['Admin', 'QA Lead'].includes(currentUser.value?.role ?? '') && !isReadOnly.value)

const { data, refresh, pending: loadingModules } = await useFetch<ModuleRow[]>('/api/modules', {
  key: projectKey('modules')
})
const modules = computed(() => data.value ?? [])

const columns = [
  { field: 'name', header: 'Module Name' },
  { field: 'created_by_email', header: 'Created By' },
  { field: 'created_at', header: 'Registered On', sortable: true },
  { field: 'linked_items', header: 'Linked Items' }
]

// -- display name helper, schema has no display name column so a readable label
// is derived from the email local part --
function displayName(email: string) {
  const name = email.split('@')[0] ?? email
  return name
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((part) => (part[0] ?? '').toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// -- add / edit modal --
const modalOpen = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const editingModule = ref<ModuleRow | null>(null)
const moduleName = ref('')
const saving = ref(false)

// real-time, case-insensitive duplicate check against the list already
// on the page — same pattern ModuleSelect.vue uses for its inline
// "create this module" flow, no extra round trip needed per keystroke.
const trimmedName = computed(() => moduleName.value.trim())
const isDuplicate = computed(() => {
  if (!trimmedName.value) return false
  return modules.value.some(
    (m) => m.name.toLowerCase() === trimmedName.value.toLowerCase() && m.id !== editingModule.value?.id
  )
})
const nameError = computed(() => {
  if (!trimmedName.value) return null
  if (isDuplicate.value) return `A module named "${trimmedName.value}" already exists.`
  return null
})
const canSave = computed(() => !!trimmedName.value && !isDuplicate.value && !saving.value)

function openAdd() {
  modalMode.value = 'add'
  editingModule.value = null
  moduleName.value = ''
  modalOpen.value = true
}

function openEdit(row: ModuleRow) {
  modalMode.value = 'edit'
  editingModule.value = row
  moduleName.value = row.name
  modalOpen.value = true
}

async function saveModule() {
  if (!canSave.value) return
  saving.value = true
  try {
    if (modalMode.value === 'add') {
      await $fetch('/api/modules', { method: 'POST', body: { name: trimmedName.value } })
      toast.add({ severity: 'success', summary: 'Module created', life: 3000 })
    } else if (editingModule.value) {
      await $fetch(`/api/modules/${editingModule.value.id}`, {
        method: 'PUT',
        body: { name: trimmedName.value }
      })
      toast.add({ severity: 'success', summary: 'Module updated', life: 3000 })
    }
    modalOpen.value = false
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not save this module',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}

// -- delete flow --
const confirmDialogRef = ref<{ open: (opts: any) => Promise<boolean> }>()

async function deleteModule(row: ModuleRow) {
  const confirmed = await confirmDialogRef.value?.open({
    title: 'Delete this module?',
    message: `"${row.name}" will be removed from the active list. Anything already tagged to it (including any archived items) keeps that link.`,
    confirmLabel: 'Delete',
    danger: true
  })
  if (!confirmed) return

  try {
    await $fetch(`/api/modules/${row.id}`, { method: 'DELETE' })
    toast.add({ severity: 'success', summary: 'Module deleted', life: 3000 })
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not delete this module',
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
          Modules
        </h1>
        <p class="mt-1 text-sm text-body">
          Define core application modules to organize requirements, tests, and bugs.
        </p>
      </div>

      <BaseButton
        v-if="canManage"
        label=" Add New Module"
        variant="primary"
        icon="pi pi-plus"
        @click="openAdd"
      />
    </div>

    <AppDataTable
      :value="modules"
      :columns="columns"
      :loading="loadingModules"
      search-placeholder="Search modules..."
      empty-message="No modules defined yet."
      data-key="id"
    >
      <template #cell-name="{ data: row }">
        <span class="text-sm font-bold text-heading">
          {{ row.name }}
        </span>
      </template>

      <template #cell-created_by_email="{ data: row }">
        <div v-if="row.created_by_email" class="flex items-center gap-2">
          <AppAvatar :avatar-id="row.created_by_avatar_id" size="sm" />
          <span class="truncate text-sm text-body">
            {{ displayName(row.created_by_email) }}
          </span>
        </div>
        <span v-else class="text-xs text-gray-400 dark:text-zinc-500">Unknown</span>
      </template>

      <template #cell-created_at="{ data: row }">
        <span class="text-sm text-body">
          {{ formatDate(row.created_at) }}
        </span>
      </template>

      <template #cell-linked_items="{ data: row }">
        <div class="flex flex-wrap gap-1.5">
          <span
            class="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-body"
          >
            {{ row.requirements_count }} Requirement{{ row.requirements_count === 1 ? '' : 's' }}
          </span>
          <span
            class="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-body"
          >
            {{ row.test_cases_count }} Test Case{{ row.test_cases_count === 1 ? '' : 's' }}
          </span>
        </div>
      </template>

      <template v-if="canManage" #actions="{ data: row }">
        <div class="flex items-center gap-2">
          <BaseButton
            label="Edit"
            variant="outline"
            size="sm"
            icon="pi pi-pencil"
            @click="openEdit(row)"
          />
          <BaseButton
            label="Delete"
            variant="dangerOutline"
            size="sm"
            icon="pi pi-trash"
            @click="deleteModule(row)"
          />
        </div>
      </template>
    </AppDataTable>

    <!-- add / edit modal -->
    <BaseModal
      v-model="modalOpen"
      :title="modalMode === 'add' ? 'Add New Module' : 'Edit Module'"
      width="26rem"
    >
      <div class="space-y-2">
        <label class="mb-1 block text-xs font-medium text-body">
          Module Name
        </label>
        <InputText
          v-model="moduleName"
          placeholder="e.g. Seat Selection"
          class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
          :invalid="!!nameError"
          autofocus
          @keyup.enter="saveModule"
        />
        <p v-if="nameError" class="text-xs text-red-600 dark:text-red-400">
          {{ nameError }}
        </p>
      </div>

      <template #footer>
        <BaseButton variant="secondary" label="Cancel" @click="modalOpen = false" />
        <BaseButton
          variant="primary"
          label="Save Module"
          :loading="saving"
          :disabled="!canSave"
          @click="saveModule"
        />
      </template>
    </BaseModal>

    <AppConfirmDialog ref="confirmDialogRef" />
  </div>
</template>
