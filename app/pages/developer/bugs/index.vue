<script setup lang="ts">
// Bugs Directory: streamlined bug list for the Developer role, with
// explicit scope control (mine / all team) instead of
// the old fixed quick-filter tabs, plus a period filter (all time /
// today / this week / this month) and module/severity/status/search
// filters. no release filter, no report-bug flow, no execution context
// -- just the bugs a developer needs to see. QA's full tracker with all
// of that extra context still lives at /bugs.
definePageMeta({ layout: 'default' })

interface DeveloperBugRow {
  id: number
  bug_code: string
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

type Scope = 'mine' | 'team'
type Period = 'all' | 'day' | 'week' | 'month'

const toast = useToast()
const dropdownPt = useDropdownPt()

const SCOPE_OPTIONS: { label: string; value: Scope }[] = [
  { label: 'Assigned to Me', value: 'mine' },
  { label: 'All Team Bugs', value: 'team' }
]

// "All time" is the default so the directory keeps showing its full
// history like before -- day/week/month just narrow it down to bugs
// with recent activity (last_status_change_at), same idea as the
// profile page's digest, just with a bit more range since this is the
// full directory, not a quick daily preview.
const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'day' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' }
]

const activePeriod = ref<Period>('all')

// "Assigned to Me" is the default scope per spec
const activeScope = ref<Scope>('mine')

// label-only rename for Critical -- still filters on the real severity
// value 'Critical' underneath
const SEVERITY_OPTIONS = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
  { label: 'Critical / Blocker', value: 'Critical' }
]

const selectedModuleId = ref<number | null>(null)
const selectedSeverity = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)

const modulesFetch = useFetch<ModuleOption[]>('/api/modules')
const bugsFetch = useFetch<{ scope: Scope; period: Period; bugs: DeveloperBugRow[] }>(
  '/api/developer/bugs',
  {
    query: computed(() => ({
      scope: activeScope.value,
      period: activePeriod.value,
      ...(selectedModuleId.value ? { moduleId: selectedModuleId.value } : {}),
      ...(selectedSeverity.value ? { severity: selectedSeverity.value } : {}),
      ...(selectedStatus.value ? { status: selectedStatus.value } : {})
    }))
  }
)

await Promise.all([modulesFetch, bugsFetch])

const { data: moduleOptionsData } = modulesFetch
const { data, refresh, pending: loading } = bugsFetch

const moduleOptions = computed(() => [{ id: null, name: 'All Modules' }, ...(moduleOptionsData.value ?? [])])

const bugs = computed(() => data.value?.bugs ?? [])

const PERIOD_LABELS: Record<Period, string> = {
  all: '',
  day: ' today',
  week: ' this week',
  month: ' this month'
}

const emptyMessage = computed(() => {
  if (activeScope.value === 'mine' && activePeriod.value === 'all') return 'No bugs assigned to you. Nice work.'
  return `No bugs match this view${PERIOD_LABELS[activePeriod.value]}.`
})

const SEVERITY_CLASSES: Record<string, string> = {
  Critical:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30 animate-pulse',
  High: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30',
  Medium:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  Low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const columns = [
  { field: 'bug_code', sortField: 'id', header: 'ID', sortable: true },
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

function viewBug(bug: DeveloperBugRow) {
  navigateTo(`/bugs/${bug.id}`)
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        Bugs Directory
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
        Manage, filter, and resolve tracking tickets.
      </p>
    </div>

    <!-- scope + filters toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <Select
        v-model="activeScope"
        :options="SCOPE_OPTIONS"
        option-label="label"
        option-value="value"
        class="w-44"
        :pt="dropdownPt"
      />
      <Select
        v-model="activePeriod"
        :options="PERIOD_OPTIONS"
        option-label="label"
        option-value="value"
        class="w-36"
        :pt="dropdownPt"
      />
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
        :options="SEVERITY_OPTIONS"
        option-label="label"
        option-value="value"
        placeholder="All Severities"
        show-clear
        class="w-48"
        :pt="dropdownPt"
      />
      <Select
        v-model="selectedStatus"
        :options="ALL_BUG_STATUSES.map((s) => ({ label: s, value: s }))"
        option-label="label"
        option-value="value"
        placeholder="All Statuses"
        show-clear
        class="w-44"
        :pt="dropdownPt"
      />
    </div>

    <AppDataTable
      :value="bugs"
      :columns="columns"
      :loading="loading"
      search-placeholder="Search by title or bug code..."
      actions-header="Actions"
      :empty-message="emptyMessage"
    >
      <template #cell-bug_code="{ data: row }">
        <span class="font-mono text-xs text-gray-500 dark:text-zinc-400">{{ row.bug_code }}</span>
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
        <span class="font-medium text-gray-900 dark:text-white">
          {{ row.title }}
        </span>
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

      <template #actions="{ data: row }">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border border-black/10 px-2.5 py-1.5
                 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50
                 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
          @click="viewBug(row)"
        >
          <i class="pi pi-eye text-xs" />
          View
        </button>
      </template>
    </AppDataTable>
  </div>
</template>
