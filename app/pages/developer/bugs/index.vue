<script setup lang="ts">
// streamlined, distraction-free bug queue for the Developer role: no
// release filter, no report-bug flow, no execution context -- just the
// bugs that need a developer's attention, with a status dropdown right
// in the row so a fix can be marked without leaving the page. QA's full
// tracker with all of that extra context still lives at /bugs.
definePageMeta({ layout: 'default' })

interface DeveloperBugRow {
  id: number
  title: string
  module_id: number
  module_name: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  status: string
  owner_id: number | null
  owner_email: string | null
  reported_by: number | null
  reported_by_email: string | null
  reported_at: string
}

interface ModuleOption {
  id: number
  name: string
}

interface DeveloperBugCounts {
  mine: number
  blockers: number
  pending: number
  team: number
}

type Scope = 'mine' | 'blockers' | 'pending' | 'team'

const toast = useToast()
const dropdownPt = useDropdownPt()

const TABS: { id: Scope; label: string; countKey: keyof DeveloperBugCounts }[] = [
  { id: 'mine', label: 'Assigned To Me', countKey: 'mine' },
  { id: 'blockers', label: 'High / Critical Blockers', countKey: 'blockers' },
  { id: 'pending', label: 'Pending Verification', countKey: 'pending' },
  { id: 'team', label: 'All Team Bugs', countKey: 'team' }
]

// "Assigned To Me" is the default tab per spec
const activeScope = ref<Scope>('mine')

const SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low']
const selectedModuleId = ref<number | null>(null)
const selectedSeverity = ref<string | null>(null)

const modulesFetch = useFetch<ModuleOption[]>('/api/modules')
const bugsFetch = useFetch<{ scope: Scope; bugs: DeveloperBugRow[]; counts: DeveloperBugCounts }>(
  '/api/developer/bugs',
  {
    query: computed(() => ({
      scope: activeScope.value,
      ...(selectedModuleId.value ? { moduleId: selectedModuleId.value } : {}),
      ...(selectedSeverity.value ? { severity: selectedSeverity.value } : {})
    }))
  }
)

await Promise.all([modulesFetch, bugsFetch])

const { data: moduleOptionsData } = modulesFetch
const { data, refresh, pending: loading } = bugsFetch

const moduleOptions = computed(() => [{ id: null, name: 'All Modules' }, ...(moduleOptionsData.value ?? [])])
const severityOptions = [{ label: 'All Severities', value: null }, ...SEVERITY_OPTIONS.map((s) => ({ label: s, value: s }))]

const bugs = computed(() => data.value?.bugs ?? [])
const counts = computed(() => data.value?.counts ?? { mine: 0, blockers: 0, pending: 0, team: 0 })

const SEVERITY_CLASSES: Record<string, string> = {
  Critical:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30 animate-pulse',
  High: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30',
  Medium:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  Low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
}

function bugCode(id: number) {
  return `BUG-${id.toString().padStart(3, '0')}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const columns = [
  { field: 'bug_id', sortField: 'id', header: 'ID', sortable: true },
  { field: 'severity', header: 'Severity', sortable: true },
  { field: 'title', header: 'Title' },
  { field: 'module_name', header: 'Module', sortable: true },
  { field: 'status', header: 'Status' },
  { field: 'reported_by_email', header: 'Reporter' },
  { field: 'created_on', sortField: 'reported_at', header: 'Created On', sortable: true }
]

// per-row saving flag, keyed by bug id, so updating one row doesn't
// disable every dropdown in the table while it saves
const savingBugId = ref<number | null>(null)

async function updateStatus(bug: DeveloperBugRow, status: string) {
  if (status === bug.status) return
  savingBugId.value = bug.id
  try {
    await $fetch(`/api/bugs/${bug.id}`, {
      method: 'PUT',
      body: { status }
    })
    toast.add({ severity: 'success', summary: `Marked as ${status}`, life: 2500 })
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not update status',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    savingBugId.value = null
  }
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        My Bugs
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
        Manage, filter, and resolve the bugs assigned to you.
      </p>
    </div>

    <!-- quick-filter tabs -->
    <div class="flex flex-wrap gap-1 border-b border-black/10 dark:border-white/10">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        type="button"
        class="-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors"
        :class="
          activeScope === tab.id
            ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
        "
        @click="activeScope = tab.id"
      >
        {{ tab.label }}
        <span
          class="rounded-full px-1.5 py-0.5 text-xs font-semibold"
          :class="
            activeScope === tab.id
              ? 'bg-purple-600/10 text-purple-600 dark:bg-purple-400/10 dark:text-purple-400'
              : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-zinc-400'
          "
        >
          {{ counts[tab.countKey] }}
        </span>
      </button>
    </div>

    <!-- secondary filters -->
    <div class="flex flex-wrap items-center gap-3">
      <Select
        v-model="selectedModuleId"
        :options="moduleOptions"
        option-label="name"
        option-value="id"
        placeholder="All Modules"
        class="w-44"
        :pt="dropdownPt"
      />
      <Select
        v-model="selectedSeverity"
        :options="severityOptions"
        option-label="label"
        option-value="value"
        placeholder="All Severities"
        class="w-44"
        :pt="dropdownPt"
      />
    </div>

    <AppDataTable
      :value="bugs"
      :columns="columns"
      :loading="loading"
      search-placeholder="Search bugs..."
      :empty-message="activeScope === 'mine' ? 'No bugs assigned to you. Nice work.' : 'No bugs match this view.'"
    >
      <template #cell-bug_id="{ data: row }">
        <span class="font-mono text-xs text-gray-500 dark:text-zinc-400">{{ bugCode(row.id) }}</span>
      </template>

      <template #cell-severity="{ data: row }">
        <span
          class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
          :class="SEVERITY_CLASSES[row.severity]"
        >
          {{ row.severity }}
        </span>
      </template>

      <template #cell-title="{ data: row }">
        <NuxtLink
          :to="`/bugs/${row.id}`"
          class="font-medium text-gray-900 hover:text-purple-600 hover:underline dark:text-white dark:hover:text-purple-400"
        >
          {{ row.title }}
        </NuxtLink>
      </template>

      <template #cell-status="{ data: row }">
        <Select
          :model-value="row.status"
          :options="ALL_BUG_STATUSES"
          :disabled="savingBugId === row.id"
          class="w-36"
          :pt="dropdownPt"
          @update:model-value="(status: string) => updateStatus(row, status)"
        />
      </template>

      <template #cell-reported_by_email="{ data: row }">
        <span class="text-sm text-gray-600 dark:text-zinc-300">{{ row.reported_by_email ?? 'Unknown' }}</span>
      </template>

      <template #cell-created_on="{ data: row }">
        <span class="text-sm text-gray-500 dark:text-zinc-400">{{ formatDate(row.reported_at) }}</span>
      </template>
    </AppDataTable>
  </div>
</template>
