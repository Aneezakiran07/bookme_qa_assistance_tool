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
  role?: 'Pending' | 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
} | null)

const isAdmin = computed(() => currentUser.value?.role === 'Admin')
const isQaLead = computed(() => currentUser.value?.role === 'QA Lead')
const canManageUsers = computed(() => isAdmin.value || isQaLead.value)
const isDeveloper = computed(() => currentUser.value?.role === 'Developer')

const projectLinks = computed<NavLink[]>(() => {
  // developers only get the dashboard and their own focused bug queue,
  // the full requirements, test case, execution, and bugs workflow is
  // reserved for qa lead, tester, and admin roles
  if (isDeveloper.value) {
    return [
      { label: 'Dashboard', to: '/', icon: 'pi pi-home' },
      { label: 'Bugs Directory', to: '/developer/bugs', icon: 'pi pi-inbox' },
    ]
  }
  return [
    { label: 'Dashboard', to: '/', icon: 'pi pi-home' },
    { label: 'Requirements', to: '/requirements', icon: 'pi pi-file-check' },
    { label: 'Test Cases', to: '/test-cases', icon: 'pi pi-list-check' },
    { label: 'Test Executions', to: '/executions', icon: 'pi pi-play-circle' },
    { label: 'Bugs', to: '/bugs', icon: 'pi pi-exclamation-triangle' },
  ]
})

const managementLinksStandard: NavLink[] = [
  { label: 'Modules', to: '/management/modules', icon: 'pi pi-sitemap' },
]

const managementLinksWithUsers: NavLink[] = [
  { label: 'Modules', to: '/management/modules', icon: 'pi pi-sitemap' },
  { label: 'User Approvals', to: '/admin/users', icon: 'pi pi-users' },
]

// admins and qa leads can see and use every page, including the full
// project workflow; the only thing gated by role is the User Approvals
// link, which shows up for both of those (same permission tier, two
// labels) and never for Tester or Developer
const managementLinks = computed(() =>
  canManageUsers.value ? managementLinksWithUsers : managementLinksStandard
)

// single flat nav list, no PROJECT / MANAGEMENT section split -- every
// role just sees its own set of links one after another
const navLinks = computed<NavLink[]>(() => [...projectLinks.value, ...managementLinks.value])

const roleBadgeClass = computed(() => {
  return isAdmin.value
    ? 'bg-purple-600/15 text-purple-600 dark:text-purple-400'
    : 'bg-purple-600/10 text-purple-600 dark:text-purple-400'
})

async function handleLogout() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <aside
    class="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white
           dark:border-zinc-800 dark:bg-black"
  >
    <!-- brand -->
    <div class="flex h-16 items-center gap-2 border-b border-gray-200 px-5 dark:border-zinc-800">
      <div class="flex h-8 w-8 items-center justify-center rounded-md bg-purple-600 text-sm font-bold text-white">
        Q
      </div>
      <span class="text-base font-semibold text-gray-900 dark:text-white">
        Bookme QA Tool
      </span>
    </div>

    <!-- nav -->
    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-5">
      <ul class="space-y-1">
        <li v-for="link in navLinks" :key="link.to">
          <NuxtLink
            :to="link.to"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600
                   transition-colors hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            active-class="!bg-purple-600/10 !text-purple-600 dark:!text-purple-400"
            exact-active-class="!bg-purple-600/10 !text-purple-600 dark:!text-purple-400"
          >
            <i :class="link.icon" class="text-base" />
            <span>{{ link.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <!-- user profile -->
    <div class="border-t border-gray-200 p-3 dark:border-zinc-800">
      <NuxtLink
        to="/profile"
        class="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-900"
      >
        <AppAvatar :avatar-id="profileData?.avatarId" size="sm" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
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
          type="button"
          aria-label="Log out"
          class="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors
                 hover:bg-gray-100 hover:text-gray-600
                 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
          @click.prevent="handleLogout"
        >
          <i class="pi pi-sign-out text-sm" />
        </button>
      </NuxtLink>
    </div>
  </aside>
</template>