<script setup lang="ts">
// Step 6 of the workflow: manage reported defects across their lifecycle
// (Open -> In Progress -> Fixed -> Retest -> Closed / Reopened). access is
// non-restrictive for this pilot, same convention as requirements and
// test-cases: every active role can view, report, reassign, and transition
// bugs, so there is no canManage gate here and the server routes match.
definePageMeta({ layout: 'default' })

interface BugRow {
  id: number
  title: string
  module_id: number
  module_name: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  priority: 'High' | 'Medium' | 'Low' | null
  status: string
  owner_id: number | null
  owner_email: string | null
  environment_build: string | null
  linked_test_case_id: number | null
  linked_test_case_title: string | null
  release_id: number | null
  release_version: string | null
  reported_by: number | null
  reported_by_email: string | null
  reported_at: string
  last_status_change_at: string
}

interface ModuleOption {
  id: number
  name: string
}

interface ReleaseOption {
  id: number
  version: string
}

interface BugMetrics {
  total_open: number
  critical_high_open: number
  in_retest: number
  closed: number
}

const toast = useToast()
const dropdownPt = useDropdownPt()

const SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low']
const STATUS_OPTIONS = ['Open', 'In Progress', 'Fixed', 'Retest', 'Closed', 'Reopened']

type Period = 'all' | 'day' | 'week' | 'month'

// same activity-period filter as the Developer Bugs Directory
// (app/pages/developer/bugs/index.vue) -- "All Time" is the default so
// this keeps showing the full tracker like before; day/week/month just
// narrow it down to bugs with recent activity (last_status_change_at).
const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'day' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' }
]

// -- filters: Period, Module, Severity, Status, Release --
const activePeriod = ref<Period>('all')
const selectedModuleId = ref<number | null>(null)
const selectedSeverity = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const selectedReleaseId = ref<number | null>(null)

const severityFilterOptions = [{ label: 'All Severities', value: null }, ...SEVERITY_OPTIONS.map((s) => ({ label: s, value: s }))]
const statusFilterOptions = [{ label: 'All Statuses', value: null }, ...STATUS_OPTIONS.map((s) => ({ label: s, value: s }))]

// these four fetches are independent of each other, so they are kicked off
// together and only awaited once instead of one after another. useFetch
// returns its data and pending and refresh refs synchronously, so those are
// grabbed right away. Promise.all is only used to wait for all four
// requests to finish at once, never to read the resolved value itself,
// since destructuring straight off Promise.all was handing back undefined
// refs instead of the real composable objects.
const modulesFetch = useFetch<ModuleOption[]>('/api/modules')
const releasesFetch = useFetch<ReleaseOption[]>('/api/releases')
const bugsFetch = useFetch<BugRow[]>('/api/bugs', {
  query: computed(() => ({
    period: activePeriod.value,
    ...(selectedModuleId.value ? { moduleId: selectedModuleId.value } : {}),
    ...(selectedSeverity.value ? { severity: selectedSeverity.value } : {}),
    ...(selectedStatus.value ? { status: selectedStatus.value } : {}),
    ...(selectedReleaseId.value ? { releaseId: selectedReleaseId.value } : {})
  }))
})
const metricsFetch = useFetch<BugMetrics>('/api/bugs/metrics')

await Promise.all([modulesFetch, releasesFetch, bugsFetch, metricsFetch])

const { data: moduleOptionsData } = modulesFetch
const { data: releaseOptionsData } = releasesFetch
const { data, refresh, pending: loadingBugs } = bugsFetch
const { data: metricsData, refresh: refreshMetrics } = metricsFetch

const moduleOptions = computed(() => [{ id: null, name: 'All Modules' }, ...(moduleOptionsData.value ?? [])])
const releaseOptions = computed(() => [
  { id: null, version: 'All Releases' },
  ...(releaseOptionsData.value ?? [])
])
const bugs = computed(() => data.value ?? [])
const metrics = computed(() => metricsData.value ?? { total_open: 0, critical_high_open: 0, in_retest: 0, closed: 0 })

const PERIOD_LABELS: Record<Period, string> = {
  all: '',
  day: ' today',
  week: ' this week',
  month: ' this month'
}

const emptyMessage = computed(() =>
  activePeriod.value === 'all' ? 'No bugs reported yet.' : `No bugs match this view${PERIOD_LABELS[activePeriod.value]}.`
)

const columns = [
  { field: 'bug_id', sortField: 'id', header: 'Bug ID', sortable: true },
  { field: 'title', header: 'Title & Module' },
  { field: 'severity', header: 'Severity', sortable: true },
  { field: 'status', header: 'Status', sortable: true },
  { field: 'owner', header: 'Owner/Assignee', style: 'min-width: 12rem' },
  { field: 'release_link', header: 'Release / TC Link' }
]

function bugCode(id: number) {
  return `BUG-${id.toString().padStart(3, '0')}`
}

function tcCode(id: number) {
  return `TC-${id.toString().padStart(3, '0')}`
}

const SEVERITY_CLASSES: Record<string, string> = {
  Critical:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30 animate-pulse',
  High: 'bg-[#f3e6d8] text-[#7a5233] border-[#e2c9ab] dark:bg-[#a9784f]/15 dark:text-[#cfa77d] dark:border-[#a9784f]/30',
  Medium:
    'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
  Low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
}

// -- report bug modal (reuses the same LogBugModal the FAIL workflow uses) --
const reportModalOpen = ref(false)

function onBugCreated() {
  refresh()
  refreshMetrics()
}

// -- inline owner/assignee dropdown, same PUT the bug detail page's
// reassignOwner uses -- kept in this table instead of a separate field
// so the existing Owner/Assignee column just becomes editable in place
const assigningBugId = ref<number | null>(null)

async function reassignOwner(bug: BugRow, ownerId: number | null) {
  assigningBugId.value = bug.id
  try {
    await $fetch(`/api/bugs/${bug.id}`, {
      method: 'PUT',
      body: { ownerId }
    })
    toast.add({ severity: 'success', summary: 'Owner updated', life: 2500 })
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not reassign this bug',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    assigningBugId.value = null
  }
}

// -- inline status dropdown, same pattern as the developer bugs page --
const savingBugId = ref<number | null>(null)

async function updateStatus(bug: BugRow, status: string) {
  if (status === bug.status) return
  savingBugId.value = bug.id
  try {
    await $fetch(`/api/bugs/${bug.id}`, {
      method: 'PUT',
      body: { status }
    })
    toast.add({ severity: 'success', summary: `Marked as ${status}`, life: 2500 })
    await Promise.all([refresh(), refreshMetrics()])
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
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
          Bug Tracker
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          Monitor, assign, and resolve reported application defects.
        </p>
      </div>

      <BaseButton
        label="Report Bug"
        variant="primary"
        icon="pi pi-plus"
        @click="reportModalOpen = true"
      />
    </div>

    <!-- metrics summary bar -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <MetricCard label="Total Open" :value="metrics.total_open" icon="pi pi-folder-open" />
      <MetricCard label="Critical/High Open" :value="metrics.critical_high_open" icon="pi pi-exclamation-triangle" />
      <MetricCard label="In Retest" :value="metrics.in_retest" icon="pi pi-refresh" />
      <MetricCard label="Closed" :value="metrics.closed" icon="pi pi-check-circle" />
    </div>

    <AppDataTable
      :value="bugs"
      :columns="columns"
      :loading="loadingBugs"
      search-placeholder="Search bugs..."
      :empty-message="emptyMessage"
      data-key="id"
    >
      <template #toolbar>
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
          class="w-40"
          :pt="dropdownPt"
        />
        <Select
          v-model="selectedSeverity"
          :options="severityFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="All Severities"
          class="w-40"
          :pt="dropdownPt"
        />
        <Select
          v-model="selectedStatus"
          :options="statusFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="All Statuses"
          class="w-40"
          :pt="dropdownPt"
        />
        <Select
          v-model="selectedReleaseId"
          :options="releaseOptions"
          option-label="version"
          option-value="id"
          placeholder="All Releases"
          class="w-40"
          :pt="dropdownPt"
        />
      </template>

      <template #cell-bug_id="{ data: row }">
        <span
          class="inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5
                 text-xs font-semibold text-purple-700
                 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-300"
        >
          {{ bugCode(row.id) }}
        </span>
      </template>

      <template #cell-title="{ data: row }">
        <div class="max-w-[16rem]">
          <p
            :title="row.title"
            class="truncate text-sm font-bold text-gray-900 dark:text-white"
          >
            {{ row.title }}
          </p>
          <span
            class="mt-0.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600
                   dark:bg-white/10 dark:text-zinc-300"
          >
            {{ row.module_name }}
          </span>
        </div>
      </template>

      <template #cell-severity="{ data: row }">
        <span
          class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
          :class="SEVERITY_CLASSES[row.severity]"
        >
          {{ row.severity }}
        </span>
      </template>

      <template #cell-status="{ data: row }">
        <Select
          :model-value="row.status"
          :options="ALL_BUG_STATUSES"
          :disabled="savingBugId === row.id"
          class="w-40"
          :pt="dropdownPt"
          @update:model-value="(status: string) => updateStatus(row, status)"
        />
      </template>

      <template #cell-owner="{ data: row }">
        <UserAvatarSelect
          :model-value="row.owner_id"
          placeholder="Unassigned"
          :disabled="assigningBugId === row.id"
          @update:model-value="(ownerId: number | null) => reassignOwner(row, ownerId)"
        />
      </template>

      <template #cell-release_link="{ data: row }">
        <div class="flex flex-wrap items-center gap-1.5">
          <span
            v-if="row.release_version"
            class="rounded-full border border-black/10 px-2 py-0.5 text-xs font-medium text-gray-700
                   dark:border-white/10 dark:text-zinc-300"
          >
            {{ row.release_version }}
          </span>
          <span
            v-if="row.linked_test_case_title"
            class="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700
                   dark:bg-sky-500/15 dark:text-sky-300"
          >
            {{ tcCode(row.linked_test_case_id) }}
          </span>
          <span v-if="!row.release_version && !row.linked_test_case_title" class="text-xs text-gray-400 dark:text-zinc-500">
            None
          </span>
        </div>
      </template>

      <template #actions="{ data: row }">
        <div class="flex items-center gap-2">
          <BaseButton
            label="View"
            variant="outline"
            size="sm"
            icon="pi pi-eye"
            @click="navigateTo(`/bugs/${row.id}`)"
          />
        </div>
      </template>
    </AppDataTable>

    <!-- report bug modal, no pre-filled context since this isn't coming from a failed run -->
    <LogBugModal v-model="reportModalOpen" @created="onBugCreated" />
  </div>
</template>