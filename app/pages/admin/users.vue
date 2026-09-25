<script setup lang="ts">
// team & invites page: invite new people by email + role, and manage
// already-active team members (deactivate). Admin and QA Lead both get
// this page -- same permission tier for this pilot, just two different
// labels -- gated by the manage-users middleware; Tester and Developer
// are bounced to the dashboard if they hit this route directly. there is
// no more "pending signup" state -- invite-only onboarding means a
// person is either an active team member or an outstanding invitation.
definePageMeta({ layout: 'default', middleware: ['manage-users'] })

interface ActiveUserRow {
  id: number
  email: string
  role: 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
  active: boolean
  created_at: string
}

interface OutstandingInviteRow {
  id: number
  email: string
  role: 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
  invited_by_email: string | null
  created_at: string
  expires_at: string
}

const ASSIGNABLE_ROLES = ['QA Lead', 'Tester', 'Developer', 'Admin']

const toast = useToast()
const dropdownPt = useDropdownPt()

const { data, refresh, pending: loadingUsers } = await useFetch<{
  active: ActiveUserRow[]
  invitations: OutstandingInviteRow[]
}>('/api/admin/users')

const activeUsers = computed(() => data.value?.active ?? [])
const outstandingInvites = computed(() => data.value?.invitations ?? [])

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

const activeColumns = [
  { field: 'email', header: 'User' },
  { field: 'role', header: 'Role' },
  { field: 'created_at', header: 'Joined', sortable: true },
]

const inviteColumns = [
  { field: 'email', header: 'Email' },
  { field: 'role', header: 'Role' },
  { field: 'invited_by_email', header: 'Invited By' },
  { field: 'expires_at', header: 'Expires', sortable: true },
]

// -- invite modal --
const inviteModalOpen = ref(false)
const inviteEmail = ref('')
const inviteRole = ref('Tester')
const sendingInvite = ref(false)

function openInviteModal() {
  inviteEmail.value = ''
  inviteRole.value = 'Tester'
  inviteModalOpen.value = true
}

async function sendInvite() {
  const email = inviteEmail.value.trim()
  if (!email) return

  sendingInvite.value = true
  try {
    await $fetch('/api/invitations', {
      method: 'POST',
      body: { email, role: inviteRole.value },
    })
    toast.add({ severity: 'success', summary: 'Invite sent', life: 3000 })
    inviteModalOpen.value = false
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not send this invite',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 4000,
    })
  } finally {
    sendingInvite.value = false
  }
}

// -- revoke invite --
const confirmDialogRef = ref<{ open: (opts: any) => Promise<boolean> }>()

async function revokeInvite(invite: OutstandingInviteRow) {
  const confirmed = await confirmDialogRef.value?.open({
    title: 'Revoke this invite?',
    message: `${invite.email} will no longer be able to use this invite link. You can invite them again later.`,
    confirmLabel: 'Revoke invite',
    danger: true,
  })
  if (!confirmed) return

  try {
    await $fetch(`/api/invitations/${invite.id}`, { method: 'DELETE' })
    toast.add({ severity: 'success', summary: 'Invite revoked', life: 3000 })
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not revoke this invite',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 4000,
    })
  }
}

// -- deactivate flow --
// the session, so a self-deactivation gets its own much louder warning
// -- an Admin or QA Lead deactivating their own account locks
// themselves out immediately, and unlike deactivating someone else,
// there is no one left signed in on this page to undo it afterward
const { user: sessionUser, fetch: refreshSession } = useUserSession()

async function deactivate(user: ActiveUserRow) {
  const isSelf = user.id === sessionUser.value?.id

  const confirmed = await confirmDialogRef.value?.open(
    isSelf
      ? {
          title: 'Deactivate your own access?',
          message:
            `This is your own account. Deactivating it will sign you out and lock you out of the ` +
            `app immediately -- you will NOT be able to undo this yourself, since deactivated users ` +
            `can't reach this page. Another Admin or QA Lead would have to reactivate you.`,
          confirmLabel: 'Deactivate my own account',
          danger: true,
        }
      : {
          title: 'Deactivate access?',
          message: `${user.email} will lose access immediately. You can invite them again later from this page.`,
          confirmLabel: 'Deactivate',
          danger: true,
        }
  )
  if (!confirmed) return

  await $fetch('/api/admin/deactivate-user', {
    method: 'POST',
    body: { userId: user.id },
  })

  if (isSelf) {
    toast.add({ severity: 'success', summary: 'Your access has been deactivated', life: 3000 })
    // the DB row is updated, but useUserSession()'s reactive state (what
    // the global auth middleware checks) doesn't know that yet -- refresh
    // it first, then navigate, so the middleware sees active: false and
    // redirects on its own instead of us guessing where it'll go
    await refreshSession()
    await navigateTo('/')
    return
  }

  toast.add({ severity: 'success', summary: 'User access deactivated', life: 3000 })
  await refresh()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
          Team & Invites
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          Invite new teammates by email and role, and manage existing team access.
        </p>
      </div>
      <BaseButton
        label="Invite User"
        variant="primary"
        icon="pi pi-user-plus"
        @click="openInviteModal"
      />
    </div>

    <!-- summary metrics -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <MetricCard
        label="Active Team Members"
        :value="activeUsers.length"
        icon="pi pi-users"
      />
      <MetricCard
        label="Outstanding Invites"
        :value="outstandingInvites.length"
        icon="pi pi-envelope"
      />
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
              <p class="flex items-center gap-1.5 truncate text-sm font-medium text-gray-900 dark:text-white">
                {{ displayName(row.email) }}
                <span
                  v-if="row.id === sessionUser?.id"
                  class="shrink-0 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700 dark:bg-purple-500/15 dark:text-purple-400"
                >
                  You
                </span>
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

        <template #cell-created_at="{ data: row }">
          <span class="text-sm text-gray-600 dark:text-zinc-300">
            {{ formatDate(row.created_at) }}
          </span>
        </template>

        <template #actions="{ data: row }">
          <BaseButton
            label="Deactivate"
            variant="danger"
            size="sm"
            icon="pi pi-ban"
            @click="deactivate(row)"
          />
        </template>
      </AppDataTable>
    </div>

    <!-- outstanding invites -->
    <div>
      <h2 class="mb-3 text-sm font-semibold text-gray-700 dark:text-zinc-300">
        Outstanding Invites
      </h2>
      <AppDataTable
        :value="outstandingInvites"
        :columns="inviteColumns"
        :loading="loadingUsers"
        search-placeholder="Search outstanding invites..."
        empty-message="No outstanding invites."
      >
        <template #cell-email="{ data: row }">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
              {{ displayName(row.email) }}
            </p>
            <p class="truncate text-xs text-gray-500 dark:text-zinc-400">
              {{ row.email }}
            </p>
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

        <template #cell-invited_by_email="{ data: row }">
          <span class="text-sm text-gray-600 dark:text-zinc-300">
            {{ row.invited_by_email ?? '--' }}
          </span>
        </template>

        <template #cell-expires_at="{ data: row }">
          <span class="text-sm text-gray-600 dark:text-zinc-300">
            {{ formatDate(row.expires_at) }}
          </span>
        </template>

        <template #actions="{ data: row }">
          <BaseButton
            label="Revoke"
            variant="outline"
            size="sm"
            icon="pi pi-times"
            @click="revokeInvite(row)"
          />
        </template>
      </AppDataTable>
    </div>

    <!-- invite modal -->
    <BaseModal v-model="inviteModalOpen" title="Invite User" width="28rem">
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
            Email
          </label>
          <InputText v-model="inviteEmail" type="email" placeholder="name@bookme.pk" class="w-full" />
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
            Role
          </label>
          <Select
            v-model="inviteRole"
            :options="ASSIGNABLE_ROLES"
            class="w-full"
            :pt="dropdownPt"
          />
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" label="Cancel" @click="inviteModalOpen = false" />
        <BaseButton
          variant="primary"
          label="Send Invite"
          :loading="sendingInvite"
          @click="sendInvite"
        />
      </template>
    </BaseModal>

    <AppConfirmDialog ref="confirmDialogRef" />
  </div>
</template>
