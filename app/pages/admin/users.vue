<script setup lang="ts">
// team & invites page: invite new people by email + role, and manage
// already-active team members (change role, deactivate). Admin and QA Lead both get
// this page -- same permission tier for this pilot, just two different
// labels -- gated by the manage-users middleware; Tester and Developer
// are bounced to the dashboard if they hit this route directly. there is
// no more "pending signup" state -- invite-only onboarding means a
// person is either an active team member or an outstanding invitation.
definePageMeta({ layout: 'default', title: 'Team & Invites', middleware: ['manage-users'] })

interface ActiveUserRow {
  id: number
  email: string
  role: 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
  active: boolean
  created_at: string
  avatar_id: string | null
}

interface OutstandingInviteRow {
  id: number
  email: string
  role: 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
  invited_by_email: string | null
  invited_by_avatar_id: string | null
  created_at: string
  expires_at: string
}

const ASSIGNABLE_ROLES = ['QA Lead', 'Tester', 'Developer', 'Admin']

const toast = useToast()
const dropdownPt = useDropdownPt()

const { data, refresh, pending: loadingUsers } = await useFetch<{
  active: ActiveUserRow[]
  inactive: ActiveUserRow[]
  invitations: OutstandingInviteRow[]
}>('/api/admin/users')

const activeUsers = computed(() => data.value?.active ?? [])
const inactiveUsers = computed(() => data.value?.inactive ?? [])
const outstandingInvites = computed(() => data.value?.invitations ?? [])

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
    day: 'numeric',
  })
}

const activeColumns = [
  { field: 'email', header: 'User' },
  { field: 'role', header: 'Role' },
  { field: 'created_at', header: 'Joined', sortable: true },
]

const inactiveColumns = [
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
    const result = await $fetch<{ emailSent: boolean }>('/api/invitations', {
      method: 'POST',
      body: { email, role: inviteRole.value },
    })
    if (result.emailSent) {
      toast.add({ severity: 'success', summary: 'Invite sent', life: 3000 })
    } else {
      toast.add({
        severity: 'warn',
        summary: 'Invite created, but the email could not be sent',
        detail: 'You can resend it from the Outstanding Invites table.',
        life: 5000,
      })
    }
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

// -- resend invite --
const resendingId = ref<number | null>(null)

async function resendInvite(invite: OutstandingInviteRow) {
  resendingId.value = invite.id
  try {
    const result = await $fetch<{ emailSent: boolean }>(`/api/invitations/${invite.id}/resend`, {
      method: 'POST',
    })
    if (result.emailSent) {
      toast.add({ severity: 'success', summary: 'Invite sent again', life: 3000 })
    } else {
      toast.add({ severity: 'warn', summary: 'The email could not be sent', life: 4000 })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not resend this invite',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 4000,
    })
  } finally {
    resendingId.value = null
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

// -- activate again --
const activatingId = ref<number | null>(null)

async function activate(user: ActiveUserRow) {
  const confirmed = await confirmDialogRef.value?.open({
    title: 'Activate this account?',
    message: `${user.email} will be able to sign in again right away, with the same password and the ${user.role} role.`,
    confirmLabel: 'Activate',
    danger: false,
  })
  if (!confirmed) return

  activatingId.value = user.id
  try {
    await $fetch('/api/admin/activate-user', { method: 'POST', body: { userId: user.id } })
    toast.add({ severity: 'success', summary: 'User access activated', life: 3000 })
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not activate this user',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 4000,
    })
  } finally {
    activatingId.value = null
  }
}

// -- change role --
// the dropdown in the table stays bound to the saved role, so if the request
// fails or the person cancels, it simply keeps showing the old role
const changingRoleId = ref<number | null>(null)

async function changeRole(user: ActiveUserRow, role: string) {
  if (role === user.role) return
  const isSelf = user.id === sessionUser.value?.id

  const confirmed = await confirmDialogRef.value?.open({
    title: isSelf ? 'Change your own role?' : 'Change this role?',
    message: isSelf
      ? `Your role will change from ${user.role} to ${role}. If the new role cannot manage the team, you will lose access to this page right away.`
      : `${user.email} will change from ${user.role} to ${role} and their access updates right away.`,
    confirmLabel: 'Change role',
    danger: isSelf,
  })
  if (!confirmed) return

  changingRoleId.value = user.id
  try {
    await $fetch('/api/admin/change-role', {
      method: 'POST',
      body: { userId: user.id, role },
    })
    toast.add({ severity: 'success', summary: `Role changed to ${role}`, life: 3000 })
    await refresh()
    // the signed in person's own role lives in the session, so pull the
    // fresh copy and let the route middleware decide where they can go
    if (isSelf) {
      await refreshSession()
      await navigateTo('/')
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not change this role',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 4000,
    })
    await refresh()
  } finally {
    changingRoleId.value = null
  }
}

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
          message: `${user.email} will lose access immediately. You can activate them again later from the Deactivated Team Members list.`,
          confirmLabel: 'Deactivate',
          danger: true,
        }
  )
  if (!confirmed) return

  try {
    await $fetch('/api/admin/deactivate-user', {
      method: 'POST',
      body: { userId: user.id },
    })
  } catch (error) {
    // without this a refused request, such as the last admin guard, would
    // fail silently and the person would not know why nothing happened
    toast.add({
      severity: 'error',
      summary: 'Could not deactivate this user',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 4000,
    })
    return
  }

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
        <h1 class="text-xl font-semibold text-heading">
          Team & Invites
        </h1>
        <p class="mt-1 text-sm text-body">
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
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <MetricCard
        label="Active Team Members"
        :value="activeUsers.length"
        icon="pi pi-users"
      />
      <MetricCard
        label="Deactivated"
        :value="inactiveUsers.length"
        icon="pi pi-ban"
      />
      <MetricCard
        label="Outstanding Invites"
        :value="outstandingInvites.length"
        icon="pi pi-envelope"
      />
    </div>

    <!-- active team members -->
    <div>
      <h2 class="mb-3 text-sm font-semibold text-body">
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
            <AppAvatar :avatar-id="row.avatar_id" size="sm" />
            <div class="min-w-0">
              <p class="flex items-center gap-1.5 truncate text-sm font-medium text-heading">
                {{ displayName(row.email) }}
                <span
                  v-if="row.id === sessionUser?.id"
                  class="shrink-0 rounded-full bg-[#245CB1]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-heading dark:bg-[#5B8FE0]/15"
                >
                  You
                </span>
              </p>
              <p class="truncate text-xs text-body">
                {{ row.email }}
              </p>
            </div>
          </div>
        </template>

        <template #cell-role="{ data: row }">
          <Select
            :model-value="row.role"
            :options="ASSIGNABLE_ROLES"
            class="w-40"
            size="small"
            :pt="dropdownPt"
            panel-class="!bg-foreground !text-heading !border !border-border"
            :disabled="changingRoleId === row.id"
            @update:model-value="(role: string) => changeRole(row, role)"
          />
        </template>

        <template #cell-created_at="{ data: row }">
          <span class="text-sm text-body">
            {{ formatDate(row.created_at) }}
          </span>
        </template>

        <template #actions="{ data: row }">
          <BaseButton
            label="Deactivate"
            variant="dangerOutline"
            size="sm"
            icon="pi pi-ban"
            @click="deactivate(row)"
          />
        </template>
      </AppDataTable>
    </div>

    <!-- deactivated team members, shown only when there are some -->
    <div v-if="inactiveUsers.length">
      <h2 class="mb-3 text-sm font-semibold text-body">
        Deactivated Team Members
      </h2>
      <AppDataTable
        :value="inactiveUsers"
        :columns="inactiveColumns"
        :loading="loadingUsers"
        search-placeholder="Search deactivated users..."
        empty-message="No deactivated users."
      >
        <template #cell-email="{ data: row }">
          <div class="min-w-0">
            <p class="flex items-center gap-1.5 truncate text-sm font-medium text-heading">
              {{ displayName(row.email) }}
              <span class="shrink-0 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-500">
                Deactivated
              </span>
            </p>
            <p class="truncate text-xs text-body">
              {{ row.email }}
            </p>
          </div>
        </template>

        <template #cell-role="{ data: row }">
          <span class="rounded-full bg-[#245CB1]/10 dark:bg-[#5B8FE0]/10 px-2.5 py-1 text-xs font-medium text-heading">
            {{ row.role }}
          </span>
        </template>

        <template #cell-created_at="{ data: row }">
          <span class="text-sm text-body">
            {{ formatDate(row.created_at) }}
          </span>
        </template>

        <template #actions="{ data: row }">
          <BaseButton
            label="Activate"
            variant="secondary"
            size="sm"
            icon="pi pi-check"
            :loading="activatingId === row.id"
            @click="activate(row)"
          />
        </template>
      </AppDataTable>
    </div>

    <!-- outstanding invites -->
    <div>
      <h2 class="mb-3 text-sm font-semibold text-body">
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
            <p class="truncate text-sm font-medium text-heading">
              {{ displayName(row.email) }}
            </p>
            <p class="truncate text-xs text-body">
              {{ row.email }}
            </p>
          </div>
        </template>

        <template #cell-role="{ data: row }">
          <span
            class="rounded-full bg-[#245CB1]/10 dark:bg-[#5B8FE0]/10 px-2.5 py-1 text-xs font-medium
                   text-heading"
          >
            {{ row.role }}
          </span>
        </template>

        <template #cell-invited_by_email="{ data: row }">
          <div v-if="row.invited_by_email" class="flex items-center gap-2">
            <AppAvatar :avatar-id="row.invited_by_avatar_id" size="xs" />
            <span class="text-sm text-body">{{ row.invited_by_email }}</span>
          </div>
          <span v-else class="text-sm text-body">--</span>
        </template>

        <template #cell-expires_at="{ data: row }">
          <span class="text-sm text-body">
            {{ formatDate(row.expires_at) }}
          </span>
        </template>

        <template #actions="{ data: row }">
          <div class="flex justify-end gap-2">
          <BaseButton
            label="Resend"
            variant="secondary"
            size="sm"
            icon="pi pi-send"
            :loading="resendingId === row.id"
            @click="resendInvite(row)"
          />
          <BaseButton
            label="Revoke"
            variant="dangerOutline"
            size="sm"
            icon="pi pi-times"
            @click="revokeInvite(row)"
          />
          </div>
        </template>
      </AppDataTable>
    </div>

    <!-- invite modal -->
    <BaseModal v-model="inviteModalOpen" title="Invite User" width="28rem">
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-xs font-medium text-body">
            Email
          </label>
          <InputText v-model="inviteEmail" type="email" placeholder="name@bookme.pk" class="w-full" />
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-body">
            Role
          </label>
          <Select
            v-model="inviteRole"
            :options="ASSIGNABLE_ROLES"
            class="w-full"
            :pt="dropdownPt"
            panel-class="!bg-foreground !text-heading !border !border-border"
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
