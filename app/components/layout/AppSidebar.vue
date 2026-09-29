<script setup lang="ts">
// this sidebar reads the logged in user's role from the session and
// decides which nav sections and links are visible, nothing here is
// hardcoded to a specific page, it all reacts to currentUser.role

interface NavLink {
  label: string
  to: string
  icon: string
}

interface ProfileData {
  id: number
  email: string
  role: string
  displayName: string | null
  avatarId: string
}

const { user, clear } = useUserSession()
const { collapsed, toggle: toggleSidebar } = useSidebarCollapsed()

// the session cookie only carries id/email/role/active (see
// server/middleware/00-syncSession.ts), not display name or avatar, so
// the avatar shown here comes from /api/profile instead. key:
// 'current-user-profile' matches the key app/pages/profile.vue uses for
// its own copy of this same fetch -- Nuxt shares one reactive data ref
// per key, so when the profile page saves a new avatar (or the display
// name), this ref updates too and the sidebar avatar/name reflect it
// immediately, without a page reload or any event bus. avatarId can be
// null for a user who has never opened the avatar picker; AppAvatar's
// getAvatarById already falls back to the first/default avatar (cat)
// in that case, so nothing extra is needed here for "no avatar set yet".
const { data: profileData } = await useFetch<ProfileData>('/api/profile', {
  key: 'current-user-profile'
})

const currentUser = computed(() => user.value as {
  email?: string
  role?: 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
} | null)

const isAdmin = computed(() => currentUser.value?.role === 'Admin')
const isQaLead = computed(() => currentUser.value?.role === 'QA Lead')
const canManageUsers = computed(() => isAdmin.value || isQaLead.value)
const isDeveloper = computed(() => currentUser.value?.role === 'Developer')

const { isProjectRoute, projectPath } = useCurrentProject()

const workflowLinks = computed<NavLink[]>(() => {
  // developers only get the dashboard and their own focused bug queue,
  // the full requirements, test case, execution, and bugs workflow is
  // reserved for qa lead, tester, and admin roles
  if (isDeveloper.value) {
    return [
      { label: 'Dashboard', to: projectPath('/'), icon: 'pi pi-home' },
      { label: 'Bugs Directory', to: projectPath('/developer/bugs'), icon: 'pi pi-inbox' },
    ]
  }
  return [
    { label: 'Dashboard', to: projectPath('/'), icon: 'pi pi-home' },
    { label: 'Requirements', to: projectPath('/requirements'), icon: 'pi pi-file-check' },
    { label: 'Test Cases', to: projectPath('/test-cases'), icon: 'pi pi-list-check' },
    { label: 'Test Executions', to: projectPath('/executions'), icon: 'pi pi-play-circle' },
    { label: 'Bugs', to: projectPath('/bugs'), icon: 'pi pi-exclamation-triangle' },
  ]
})

const managementLinks = computed<NavLink[]>(() => [
  { label: 'Modules', to: projectPath('/management/modules'), icon: 'pi pi-sitemap' },
])

// these links belong to the project in the url, so they only show on project pages
// on global pages such as the profile there is no project to point at, so the sidebar
// shows the global links alone instead of guessing a project
const projectSectionLinks = computed<NavLink[]>(() =>
  isProjectRoute.value ? [...workflowLinks.value, ...managementLinks.value] : []
)

// global links never change with the project, admins and qa leads also get the team and invites link
// which is the same permission tier with two labels, and never Tester or Developer
const globalLinks = computed<NavLink[]>(() => [
  { label: 'All Projects', to: '/projects', icon: 'pi pi-folder-open' },
  ...(canManageUsers.value ? [{ label: 'Team & Invites', to: '/admin/users', icon: 'pi pi-users' }] : []),
])

const roleBadgeClass = computed(() => {
  return isAdmin.value
    ? 'bg-[#245CB1]/15 dark:bg-[#5B8FE0]/15 text-heading'
    : 'bg-[#245CB1]/10 dark:bg-[#5B8FE0]/10 text-heading'
})

async function handleLogout() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <aside
    class="flex h-screen shrink-0 flex-col border-r border-border bg-foreground
           transition-[width] duration-200 ease-in-out"
    :class="collapsed ? 'w-[4.5rem]' : 'w-64'"
  >
    <!-- brand + collapse toggle -->
    <div
      class="flex h-16 items-center gap-2 border-b border-border px-3"
      :class="collapsed ? 'justify-center' : 'justify-between'"
    >
      <div v-if="!collapsed" class="flex items-center gap-2 overflow-hidden">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#245CB1] dark:bg-[#5B8FE0] text-sm font-bold text-white">
          Q
        </div>
        <span class="truncate text-base font-semibold text-heading">
          Bookme QA Tool
        </span>
      </div>
      <div
        v-else
        class="flex h-8 w-8 items-center justify-center rounded-md bg-[#245CB1] dark:bg-[#5B8FE0] text-sm font-bold text-white"
      >
        Q
      </div>

      <button
        v-if="!collapsed"
        type="button"
        aria-label="Collapse sidebar"
        class="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors
               hover:bg-secondary hover:text-heading
               dark:text-zinc-500"
        @click="toggleSidebar"
      >
        <i class="pi pi-bars text-base" />
      </button>
    </div>

    <!-- collapsed state gets its own expand button under the logo, since
         there's no room next to it once the brand text is hidden -->
    <div v-if="collapsed" class="flex justify-center border-b border-border py-2">
      <button
        type="button"
        aria-label="Expand sidebar"
        title="Expand sidebar"
        class="rounded-md p-1.5 text-gray-400 transition-colors
               hover:bg-secondary hover:text-heading
               dark:text-zinc-500"
        @click="toggleSidebar"
      >
        <i class="pi pi-bars text-base" />
      </button>
    </div>

    <!-- nav -->
    <nav class="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-5">
      <ul v-if="projectSectionLinks.length" class="space-y-1">
        <li v-for="link in projectSectionLinks" :key="link.to">
          <NuxtLink
            :to="link.to"
            :title="collapsed ? link.label : undefined"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-body
                   transition-colors hover:bg-secondary"
            :class="collapsed ? 'justify-center' : ''"
            active-class="!bg-[#245CB1]/10 dark:!bg-[#5B8FE0]/10 !text-heading"
            exact-active-class="!bg-[#245CB1]/10 dark:!bg-[#5B8FE0]/10 !text-heading"
          >
            <i :class="link.icon" class="shrink-0 text-base" />
            <span v-if="!collapsed" class="truncate">{{ link.label }}</span>
          </NuxtLink>
        </li>
      </ul>

      <!-- global links, separated from the project links by a divider -->
      <ul
        class="space-y-1"
        :class="projectSectionLinks.length ? 'mt-4 border-t border-border pt-4' : ''"
      >
        <li v-for="link in globalLinks" :key="link.to">
          <NuxtLink
            :to="link.to"
            :title="collapsed ? link.label : undefined"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-body
                   transition-colors hover:bg-secondary"
            :class="collapsed ? 'justify-center' : ''"
            active-class="!bg-[#245CB1]/10 dark:!bg-[#5B8FE0]/10 !text-heading"
            exact-active-class="!bg-[#245CB1]/10 dark:!bg-[#5B8FE0]/10 !text-heading"
          >
            <i :class="link.icon" class="shrink-0 text-base" />
            <span v-if="!collapsed" class="truncate">{{ link.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <!-- user profile -->
    <div class="border-t border-border p-3">
      <NuxtLink
        to="/profile"
        :title="collapsed ? (currentUser?.email ?? 'Profile') : undefined"
        class="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-secondary"
        :class="collapsed ? 'justify-center' : ''"
      >
        <AppAvatar :avatar-id="profileData?.avatarId" size="sm" />
        <div v-if="!collapsed" class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-heading">
            {{ currentUser?.email ?? 'Unknown user' }}
          </p>
          <span
            class="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium"
            :class="roleBadgeClass"
          >
            {{ currentUser?.role ?? 'Unknown' }}
          </span>
        </div>
        <button
          v-if="!collapsed"
          type="button"
          aria-label="Log out"
          class="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors
                 hover:bg-secondary hover:text-heading
                 dark:text-zinc-500"
          @click.prevent="handleLogout"
        >
          <i class="pi pi-sign-out text-sm" />
        </button>
      </NuxtLink>
      <button
        v-if="collapsed"
        type="button"
        aria-label="Log out"
        title="Log out"
        class="mt-1 flex w-full items-center justify-center rounded-md p-1.5 text-gray-400 transition-colors
               hover:bg-secondary hover:text-heading
               dark:text-zinc-500"
        @click="handleLogout"
      >
        <i class="pi pi-sign-out text-sm" />
      </button>
    </div>
  </aside>
</template>