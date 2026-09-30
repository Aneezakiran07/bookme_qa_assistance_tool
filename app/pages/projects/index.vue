<script setup lang="ts">
// the list of every project, and the one place to create, rename, archive and unarchive them
// everyone can open a project, only Admin and QA Lead see the management controls
// and the server enforces the same rule on every write
definePageMeta({ layout: 'default', title: 'Projects' })

const toast = useToast()

const { user } = useUserSession()
const currentUser = computed(() => user.value as { role?: string } | null)
const canManage = computed(() => ['Admin', 'QA Lead'].includes(currentUser.value?.role ?? ''))

// the cross project numbers are only for Admin and QA Lead, everyone else never triggers the request
const canSeeKpis = computed(() => ['Admin', 'QA Lead'].includes(currentUser.value?.role ?? ''))

const { data: kpis } = await useFetch<{
  activeProjects: number
  openBugs: number
  criticalHighOpen: number
  passRate: number | null
}>('/api/projects/kpis', {
  key: 'projects-fleet-kpis',
  immediate: canSeeKpis.value
})

const { activeProjects, archivedProjects, refreshProjects } = useCurrentProject()

await loadProjects()

// picks up projects that other people created or archived since the list was first loaded
onMounted(() => {
  refreshProjects()
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// create and edit
const formOpen = ref(false)
const editingProject = ref<ProjectSummary | null>(null)

function openCreate() {
  editingProject.value = null
  formOpen.value = true
}

function openEdit(project: ProjectSummary) {
  editingProject.value = project
  formOpen.value = true
}

async function handleSaved() {
  await refreshProjects()
}

// archive and unarchive
const confirmDialogRef = ref<{ open: (opts: any) => Promise<boolean> }>()
const archivedOpen = ref(false)

async function archiveProject(project: ProjectSummary) {
  const confirmed = await confirmDialogRef.value?.open({
    title: 'Archive this project?',
    message: `"${project.name}" stays visible but becomes read only for everyone until it is unarchived.`,
    confirmLabel: 'Archive',
    danger: true
  })
  if (!confirmed) return
  await setArchived(project, true, 'Project archived', 'Could not archive this project')
}

async function unarchiveProject(project: ProjectSummary) {
  await setArchived(project, false, 'Project unarchived', 'Could not unarchive this project')
}

async function setArchived(project: ProjectSummary, archived: boolean, successText: string, failText: string) {
  try {
    await $fetch(`/api/projects/${project.id}`, { method: 'PUT', body: { archived } })
    toast.add({ severity: 'success', summary: successText, life: 3000 })
    await refreshProjects()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: failText,
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
          Projects
        </h1>
        <p class="mt-1 text-sm text-body">
          Every project keeps its own requirements, test cases, releases, and bugs.
        </p>
      </div>

      <BaseButton
        v-if="canManage"
        label=" New Project"
        variant="primary"
        icon="pi pi-plus"
        @click="openCreate"
      />
    </div>

    <!-- cross project numbers, Admin and QA Lead only -->
    <div v-if="canSeeKpis" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Active Projects" :value="kpis?.activeProjects ?? 0" icon="pi pi-briefcase" />
      <MetricCard label="Open Bugs" :value="kpis?.openBugs ?? 0" icon="pi pi-bug" />
      <MetricCard
        label="Critical / High Open"
        :value="kpis?.criticalHighOpen ?? 0"
        icon="pi pi-exclamation-triangle"
      />
      <MetricCard
        label="Overall Pass Rate"
        :value="kpis?.passRate != null ? `${kpis.passRate}%` : '—'"
        icon="pi pi-chart-line"
      />
    </div>

    <!-- empty state -->
    <div
      v-if="activeProjects.length === 0"
      class="rounded-lg border border-dashed border-border bg-foreground px-6 py-12 text-center"
    >
      <div
        class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full
               bg-[#245CB1]/10 text-heading dark:bg-[#5B8FE0]/10"
      >
        <i class="pi pi-folder-open text-xl" />
      </div>
      <p class="text-base font-semibold text-heading">
        {{ canManage ? 'Create your first project' : 'Ask your QA Lead to add a project' }}
      </p>
      <p class="mt-1 text-sm text-body">
        {{
          canManage
            ? 'Projects keep each product or team workspace separate.'
            : 'There are no active projects yet.'
        }}
      </p>
      <BaseButton
        v-if="canManage"
        class="mt-5"
        label=" New Project"
        variant="primary"
        icon="pi pi-plus"
        @click="openCreate"
      />
    </div>

    <!-- active projects -->
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="project in activeProjects"
        :key="project.id"
        class="flex flex-col rounded-lg border border-border bg-foreground p-5"
      >
        <NuxtLink :to="`/projects/${project.slug}`" class="group block min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <i class="pi pi-folder text-[#245CB1] dark:text-[#5B8FE0]" />
            <h2
              class="truncate text-base font-semibold text-heading group-hover:text-[#245CB1] dark:group-hover:text-[#5B8FE0]"
            >
              {{ project.name }}
            </h2>
          </div>
          <p class="mt-2 line-clamp-2 text-sm text-body">
            {{ project.description || 'No description yet.' }}
          </p>
          <p class="mt-3 text-xs text-gray-400 dark:text-zinc-500">
            Created {{ formatDate(project.created_at) }}
          </p>
        </NuxtLink>

        <div v-if="canManage" class="mt-4 flex items-center gap-2">
          <BaseButton label="Edit" variant="outline" size="sm" icon="pi pi-pencil" @click="openEdit(project)" />
          <BaseButton
            label="Archive"
            variant="secondary"
            size="sm"
            icon="pi pi-inbox"
            @click="archiveProject(project)"
          />
        </div>
      </div>
    </div>

    <!-- archived projects, collapsed until asked for -->
    <div v-if="archivedProjects.length > 0" class="space-y-3">
      <button
        type="button"
        class="flex items-center gap-2 text-sm font-medium text-body transition-colors
               hover:text-heading"
        :aria-expanded="archivedOpen"
        @click="archivedOpen = !archivedOpen"
      >
        <i :class="archivedOpen ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-xs" />
        Archived ({{ archivedProjects.length }})
      </button>

      <ul
        v-if="archivedOpen"
        class="divide-y divide-border rounded-lg border border-border bg-foreground"
      >
        <li
          v-for="project in archivedProjects"
          :key="project.id"
          class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <NuxtLink :to="`/projects/${project.slug}`" class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-body">
              {{ project.name }}
            </p>
            <p class="truncate text-xs text-gray-400 dark:text-zinc-500">
              {{ project.description || 'No description yet.' }}
            </p>
          </NuxtLink>

          <div class="flex items-center gap-2">
            <BaseButton
              label="Open"
              variant="outline"
              size="sm"
              icon="pi pi-eye"
              @click="navigateTo(`/projects/${project.slug}`)"
            />
            <BaseButton
              v-if="canManage"
              label="Unarchive"
              variant="secondary"
              size="sm"
              icon="pi pi-replay"
              @click="unarchiveProject(project)"
            />
          </div>
        </li>
      </ul>
    </div>

    <ProjectFormModal v-model="formOpen" :project="editingProject" @saved="handleSaved" />
    <AppConfirmDialog ref="confirmDialogRef" />
  </div>
</template>
