<script setup lang="ts">
// the left side reads like a breadcrumb, project picker then page title. the picker only
// shows on project pages, global pages such as the profile show the title alone. the title
// comes from definePageMeta on each page, with a fallback built from the path for any page
// that has not set one yet, so a detail page never shows a raw id as its title
const route = useRoute()
const dropdownPt = useDropdownPt()

const { user } = useUserSession()
const canManage = computed(() => ['Admin', 'QA Lead'].includes((user.value as { role?: string } | null)?.role ?? ''))

const { slug, project, activeProjects, isProjectRoute, notFound, switchProject, refreshProjects } = useCurrentProject()

function toTitle(segment: string) {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

const pageTitle = computed(() => {
  const metaTitle = route.meta.title
  if (typeof metaTitle === 'string' && metaTitle) return metaTitle

  const parts = route.path.split('/').filter(Boolean)
  const rest = isProjectRoute.value ? parts.slice(2) : parts
  if (rest.length === 0) return 'Dashboard'

  const named = rest.filter((part) => !/^\d+$/.test(part))
  return toTitle(named[named.length - 1] ?? rest[0] ?? 'Dashboard')
})

// the current project stays in the list even when archived, so the picker never shows a blank value
const pickerOptions = computed(() => {
  const list = [...activeProjects.value]
  if (project.value?.archived) list.push(project.value)
  return list.map((item) => ({
    slug: item.slug,
    label: item.archived ? `${item.name} (archived)` : item.name
  }))
})

const selectRef = ref<{ hide: () => void } | null>(null)

function onPick(nextSlug: string | null) {
  if (!nextSlug || nextSlug === slug.value) return
  switchProject(nextSlug)
}

function goToAllProjects() {
  selectRef.value?.hide()
  navigateTo('/projects')
}

// new project from the picker footer, on success the person lands in the new project
const formOpen = ref(false)

function openNewProject() {
  selectRef.value?.hide()
  formOpen.value = true
}

async function handleSaved(saved: ProjectSummary) {
  await refreshProjects()
  await navigateTo(`/projects/${saved.slug}`)
}
</script>

<template>
  <header
    class="flex h-16 shrink-0 items-center justify-between border-b border-border
           bg-foreground px-6"
  >
    <div class="flex min-w-0 items-center gap-2">
      <template v-if="isProjectRoute && !notFound">
        <Select
          ref="selectRef"
          :model-value="slug"
          :options="pickerOptions"
          option-label="label"
          option-value="slug"
          placeholder="Select a project"
          class="w-56 max-w-[40vw] !border !border-black/15 !bg-transparent !shadow-none dark:!border-white/15
                 hover:!border-[#245CB1] hover:!bg-secondary dark:hover:!border-[#5B8FE0]"
          :pt="dropdownPt"
          panel-class="!bg-foreground !text-heading !border !border-border"
          aria-label="Project"
          @update:model-value="onPick"
        >
          <template #footer>
            <div class="space-y-1 border-t border-border p-2">
              <BaseButton
                v-if="canManage"
                label="New project"
                variant="outline"
                size="sm"
                icon="pi pi-plus"
                block
                @click="openNewProject"
              />
              <BaseButton
                label="All projects"
                variant="secondary"
                size="sm"
                icon="pi pi-folder-open"
                block
                @click="goToAllProjects"
              />
            </div>
          </template>
        </Select>
        <span class="text-gray-300 dark:text-zinc-600" aria-hidden="true">/</span>
      </template>

      <h1 class="min-w-0 truncate text-lg font-semibold text-heading">
        {{ pageTitle }}
      </h1>
    </div>

    <div class="flex items-center gap-2">
      <ThemeToggle />
    </div>

    <ProjectFormModal v-model="formOpen" @saved="handleSaved" />
  </header>
</template>
