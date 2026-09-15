<script setup lang="ts">
// admin-only page: approve pending signups into a real role with module
// scope, and manage already-active team members (edit scope or deactivate)
definePageMeta({ layout: 'default', middleware: ['admin-only'] })

interface ModuleRef {
  id: number
  name: string
}

interface AdminUserRow {
  id: number
  email: string
  role: 'Pending' | 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
  active: boolean
  created_at: string
  modules: ModuleRef[]
}

const ASSIGNABLE_ROLES = ['QA Lead', 'Tester', 'Developer', 'Admin']

const toast = useToast()

const { data, refresh, pending: loadingUsers } = await useFetch<{
  pending: AdminUserRow[]
  active: AdminUserRow[]
}>('/api/admin/users')

const { data: moduleOptions } = await useFetch<ModuleRef[]>('/api/modules')

const pendingUsers = computed(() => data.value?.pending ?? [])
const activeUsers = computed(() => data.value?.active ?? [])

// -- avatar helpers, schema has no display name column so initials and a
// readable label are both derived from the email's local part --
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
    day: 'numeric',
  })
}

const pendingColumns = [
  { field: 'email', header: 'User' },
  { field: 'created_at', header: 'Registered On', sortable: true },
  { field: 'role', header: 'Status' },
]

const activeColumns = [
  { field: 'email', header: 'User' },
  { field: 'role', header: 'Role' },
  { field: 'modules', header: 'Modules' },
]

// -- approval / edit modal, shared by both tables --
const modalOpen = ref(false)
const modalMode = ref<'approve' | 'edit'>('approve')
const modalUser = ref<AdminUserRow | null>(null)
const selectedRole = ref<string>('Tester')
const selectedModuleIds = ref<number[]>([])
const saving = ref(false)

function openApprove(user: AdminUserRow) {
  modalMode.value = 'approve'
  modalUser.value = user
  selectedRole.value = user.role === 'Pending' ? 'Tester' : user.role
  selectedModuleIds.value = user.modules.map((m) => m.id)
  modalOpen.value = true
}

function openEdit(user: AdminUserRow) {
  modalMode.value = 'edit'
  modalUser.value = user
  selectedRole.value = user.role
  selectedModuleIds.value = user.modules.map((m) => m.id)
  modalOpen.value = true
}

async function confirmActivation() {
  if (!modalUser.value) return
  saving.value = true
  try {
    await $fetch('/api/admin/approve-user', {
      method: 'POST',
      body: {
        userId: modalUser.value.id,
        role: selectedRole.value,
        moduleIds: selectedModuleIds.value,
      },
    })
    toast.add({
      severity: 'success',
      summary: 'User approved and assigned successfully',
      life: 3000,
    })
    modalOpen.value = false
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not save this user',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 4000,
    })
  } finally {
    saving.value = false
  }
}

// -- deactivate flow --
const confirmDialogRef = ref<{ open: (opts: any) => Promise<boolean> }>()
const dropdownPt = useDropdownPt()

async function deactivate(user: AdminUserRow) {
  const confirmed = await confirmDialogRef.value?.open({
    title: 'Deactivate access?',
    message: `${user.email} will lose access immediately. You can reactivate them later from this page.`,
    confirmLabel: 'Deactivate',
    danger: true,
  })
  if (!confirmed) return

  await $fetch('/api/admin/deactivate-user', {
    method: 'POST',
    body: { userId: user.id },
  })
  toast.add({ severity: 'success', summary: 'User access deactivated', life: 3000 })
  await refresh()
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        User Approvals & Role Assignment
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
        Approve new signups into a role and module scope, and manage existing team access.
      </p>
    </div>

    <!-- summary metrics -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <MetricCard
        label="Pending Approvals"
        :value="pendingUsers.length"
        icon="pi pi-user-plus"
      />
      <MetricCard
        label="Active Team Members"
        :value="activeUsers.length"
        icon="pi pi-users"
      />
    </div>

    <!-- pending users -->
    <div>
      <h2 class="mb-3 text-sm font-semibold text-gray-700 dark:text-zinc-300">
        Pending Approval
      </h2>
      <AppDataTable
        :value="pendingUsers"
        :columns="pendingColumns"
        :loading="loadingUsers"
        search-placeholder="Search pending users..."
        empty-message="No users waiting for approval."
      >
        <template #cell-email="{ data: row }">
          <div class="flex items-center gap-3">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                     bg-purple-100 text-xs font-semibold text-purple-700
                     dark:bg-purple-500/20 dark:text-purple-300"
            >
              {{ initials(row.email) }}
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                {{ displayName(row.email) }}
              </p>
              <p class="truncate text-xs text-gray-500 dark:text-zinc-400">
                {{ row.email }}
              </p>
            </div>
          </div>
        </template>

        <template #cell-created_at="{ data: row }">
          <span class="text-sm text-gray-600 dark:text-zinc-300">
            {{ formatDate(row.created_at) }}
          </span>
        </template>

        <template #cell-role="{}">
          <StatusBadge status="PENDING" />
        </template>

        <template #actions="{ data: row }">
          <BaseButton
            label="Approve & Assign Role"
            variant="primary"
            size="sm"
            icon="pi pi-check"
            @click="openApprove(row)"
          />
        </template>
      </AppDataTable>
    </div>

    <!-- active team members -->
    <div>
      <h2 class="mb-3 text-sm font-semibold text-gray-700 dark:text-zinc-300">
        Active Team Members
      </h2>
      <AppDataTable
        :value="activeUsers"
        :columns="activeColumns"
        :loading="loadingUsers"
        search-placeholder="Search active users..."
        empty-message="No active team members yet."
      >
        <template #cell-email="{ data: row }">
          <div class="flex items-center gap-3">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                     bg-purple-100 text-xs font-semibold text-purple-700
                     dark:bg-purple-500/20 dark:text-purple-300"
            >
              {{ initials(row.email) }}
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                {{ displayName(row.email) }}
              </p>
              <p class="truncate text-xs text-gray-500 dark:text-zinc-400">
                {{ row.email }}
              </p>
            </div>
          </div>
        </template>

        <template #cell-role="{ data: row }">
          <span
            class="rounded-full bg-purple-600/10 px-2.5 py-1 text-xs font-medium
                   text-purple-600 dark:text-purple-400"
          >
            {{ row.role }}
          </span>
        </template>

        <template #cell-modules="{ data: row }">
          <div v-if="row.modules.length" class="flex flex-wrap gap-1">
            <span
              v-for="mod in row.modules"
              :key="mod.id"
              class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600
                     dark:bg-white/10 dark:text-zinc-300"
            >
              {{ mod.name }}
            </span>
          </div>
          <span v-else class="text-xs text-gray-400 dark:text-zinc-500">No modules</span>
        </template>

        <template #actions="{ data: row }">
          <div class="flex items-center gap-2">
            <BaseButton
              label="Edit"
              variant="outline"
              size="sm"
              icon="pi pi-pencil"
              @click="openEdit(row)"
            />
            <BaseButton
              label="Deactivate"
              variant="danger"
              size="sm"
              icon="pi pi-ban"
              @click="deactivate(row)"
            />
          </div>
        </template>
      </AppDataTable>
    </div>

    <!-- approval / edit modal -->
    <BaseModal
      v-model="modalOpen"
      :title="modalMode === 'approve' ? 'Approve & Assign Role' : 'Edit Role & Modules'"
      width="28rem"
    >
      <div v-if="modalUser" class="space-y-4">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            {{ displayName(modalUser.email) }}
          </p>
          <p class="text-xs text-gray-500 dark:text-zinc-400">{{ modalUser.email }}</p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
            Role
          </label>
          <Select
            v-model="selectedRole"
            :options="ASSIGNABLE_ROLES"
            class="w-full"
            :pt="dropdownPt"
          />
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
            Modules
          </label>
          <MultiSelect
            v-model="selectedModuleIds"
            :options="moduleOptions ?? []"
            option-label="name"
            option-value="id"
            display="chip"
            placeholder="Assign modules"
            class="w-full"
            :pt="dropdownPt"
          />
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" label="Cancel" @click="modalOpen = false" />
        <BaseButton
          variant="primary"
          :label="modalMode === 'approve' ? 'Confirm Activation' : 'Save Changes'"
          :loading="saving"
          @click="confirmActivation"
        />
      </template>
    </BaseModal>

    <AppConfirmDialog ref="confirmDialogRef" />
  </div>
</template>