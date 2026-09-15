<script setup lang="ts">
// Step 2 of setup: define the app modules (Authentication, Booking Flow,
// Payments, etc) that Requirements, Test Cases, and Bugs all hang off of
// via module_id. visible to every active user (see AppSidebar — it's
// listed under both the standard and admin nav groups) so anyone can see
// what modules exist, but only Admin / QA Lead can add, rename, or
// delete one — enforced both here (hides the controls) and server-side
// in server/api/modules/*, so a non-privileged user can't just call the
// API directly.
definePageMeta({ layout: 'default' })

interface ModuleRow {
  id: number
  name: string
  created_by: number | null
  created_at: string
  created_by_email: string | null
  requirements_count: number
  test_cases_count: number
}

const toast = useToast()

const { user } = useUserSession()
const currentUser = computed(() => user.value as { role?: string } | null)
const canManage = computed(() => ['Admin', 'QA Lead'].includes(currentUser.value?.role ?? ''))

const { data, refresh, pending: loadingModules } = await useFetch<ModuleRow[]>('/api/modules')
const modules = computed(() => data.value ?? [])

const columns = [
  { field: 'name', header: 'Module Name' },
  { field: 'created_by_email', header: 'Created By' },
  { field: 'created_at', header: 'Registered On', sortable: true },
  { field: 'linked_items', header: 'Linked Items' }
]

// -- avatar helpers, schema has no display name column so initials and a
// readable label are both derived from the email's local part (same
// convention as admin/users.vue) --
function initials(email: string) {
  const name = email.split('@')[0] ?? ''
  const parts = name.split(/[.\-_]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '??'
}

function displayName(email: string) {
  const name = email.split('@')[0] ?? email
  return name
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
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
    message: `"${row.name}" will be permanently removed. This can't be undone.`,
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
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
          App Map / Module Taxonomy
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
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
        <span class="text-sm font-bold text-gray-900 dark:text-white">
          {{ row.name }}
        </span>
      </template>

      <template #cell-created_by_email="{ data: row }">
        <div v-if="row.created_by_email" class="flex items-center gap-2">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                   bg-purple-100 text-xs font-semibold text-purple-700
                   dark:bg-purple-500/20 dark:text-purple-300"
          >
            {{ initials(row.created_by_email) }}
          </span>
          <span class="truncate text-sm text-gray-700 dark:text-zinc-300">
            {{ displayName(row.created_by_email) }}
          </span>
        </div>
        <span v-else class="text-xs text-gray-400 dark:text-zinc-500">Unknown</span>
      </template>

      <template #cell-created_at="{ data: row }">
        <span class="text-sm text-gray-600 dark:text-zinc-300">
          {{ formatDate(row.created_at) }}
        </span>
      </template>

      <template #cell-linked_items="{ data: row }">
        <div class="flex flex-wrap gap-1.5">
          <span
            class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600
                   dark:bg-white/10 dark:text-zinc-300"
          >
            {{ row.requirements_count }} Requirement{{ row.requirements_count === 1 ? '' : 's' }}
          </span>
          <span
            class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600
                   dark:bg-white/10 dark:text-zinc-300"
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
            variant="danger"
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
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
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
