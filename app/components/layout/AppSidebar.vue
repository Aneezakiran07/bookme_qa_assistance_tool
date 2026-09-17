<script setup lang="ts">
// this sidebar reads the logged in user's role from the session and
// decides which nav sections and links are visible, nothing here is
// hardcoded to a specific page, it all reacts to currentUser.role

interface NavLink {
  label: string
  to: string
  icon: string
}

const { user, clear } = useUserSession()

const currentUser = computed(() => user.value as {
  email?: string
  role?: 'Pending' | 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
} | null)

const isAdmin = computed(() => currentUser.value?.role === 'Admin')
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
  { label: 'App Map', to: '/management/modules', icon: 'pi pi-sitemap' },
]

const managementLinksAdmin: NavLink[] = [
  { label: 'App Map', to: '/management/modules', icon: 'pi pi-sitemap' },
  { label: 'User Approvals', to: '/admin/users', icon: 'pi pi-users' },
]

// admins can see and use every page, including the full project workflow,
// the only thing gated by role is the User Approvals link, which only
// ever shows up for Admins, standard users never see it in the sidebar
const managementLinks = computed(() =>
  isAdmin.value ? managementLinksAdmin : managementLinksStandard
)

const initials = computed(() => {
  const email = currentUser.value?.email ?? ''
  const name = email.split('@')[0] ?? ''
  const parts = name.split(/[.\-_]/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '??'
})

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
    <nav class="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      <div>
        <p class="mb-2 px-3 text-xs font-semibold tracking-wider text-gray-400 dark:text-zinc-500">
          PROJECT
        </p>
        <ul class="space-y-1">
          <li v-for="link in projectLinks" :key="link.to">
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
      </div>

      <div>
        <p class="mb-2 px-3 text-xs font-semibold tracking-wider text-gray-400 dark:text-zinc-500">
          MANAGEMENT
        </p>
        <ul class="space-y-1">
          <li v-for="link in managementLinks" :key="link.to">
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
      </div>
    </nav>

    <!-- user profile -->
    <div class="border-t border-gray-200 p-3 dark:border-zinc-800">
      <NuxtLink
        to="/profile"
        class="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-900"
        active-class="!bg-purple-600/10"
      >
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                 bg-purple-600 text-xs font-semibold text-white"
        >
          {{ initials }}
        </div>
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