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
const popoverPt = usePopoverPt()

const SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low']
const STATUS_OPTIONS = ['Open', 'In Progress', 'Fixed', 'Retest', 'Closed', 'Reopened']

// -- filters: Module, Severity, Status, Release --
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

const columns = [
  { field: 'bug_id', sortField: 'id', header: 'Bug ID', sortable: true },
  { field: 'title', header: 'Title & Module' },
  { field: 'severity', header: 'Severity', sortable: true },
  { field: 'status', header: 'Status', sortable: true },
  { field: 'owner', header: 'Owner/Assignee' },
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
  High: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30',
  Medium:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  Low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
}

function initials(email: string) {
  const name = email.split('@')[0]
  return name.slice(0, 2).toUpperCase()
}

// -- report bug modal (reuses the same LogBugModal the FAIL workflow uses) --
const reportModalOpen = ref(false)

function onBugCreated() {
  refresh()
  refreshMetrics()
}

// -- quick status edit popover --
const quickEditPopover = ref()
const quickEditBug = ref<BugRow | null>(null)
const quickEditSaving = ref(false)

function statusTooltip(current: string, status: string): string | undefined {
  if (status === current) return 'This is the current status.'
  return undefined
}

function openQuickEdit(event: MouseEvent, row: BugRow) {
  quickEditBug.value = row
  quickEditPopover.value?.toggle(event)
}

async function applyQuickStatus(status: string) {
  if (!quickEditBug.value) return
  quickEditSaving.value = true
  try {
    await $fetch(`/api/bugs/${quickEditBug.value.id}`, {
      method: 'PUT',
      body: { status }
    })
    toast.add({ severity: 'success', summary: `Marked as ${status}`, life: 2500 })
    quickEditPopover.value?.hide()
    await Promise.all([refresh(), refreshMetrics()])
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not update status',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    quickEditSaving.value = false
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
      empty-message="No bugs reported yet."
      data-key="id"
    >
      <template #toolbar>
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
        <div class="max-w-sm">
          <p class="text-sm font-bold text-gray-900 dark:text-white">
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
        <StatusBadge :status="row.status" size="sm" />
      </template>

      <template #cell-owner="{ data: row }">
        <div v-if="row.owner_email" class="flex items-center gap-2">
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100
                   text-xs font-semibold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
          >
            {{ initials(row.owner_email) }}
          </span>
          <span class="text-sm text-gray-700 dark:text-zinc-300">{{ row.owner_email }}</span>
        </div>
        <span v-else class="text-xs text-gray-400 dark:text-zinc-500">Unassigned</span>
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
          <BaseButton
            label="Status"
            variant="secondary"
            size="sm"
            icon="pi pi-sync"
            @click="openQuickEdit($event, row)"
          />
        </div>
      </template>
    </AppDataTable>

    <!-- quick status edit popover -->
    <Popover ref="quickEditPopover" :pt="popoverPt">
      <div v-if="quickEditBug" class="w-56 space-y-1 p-1">
        <p class="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
          Move to
        </p>
        <span
          v-for="status in ALL_BUG_STATUSES"
          :key="status"
          :title="statusTooltip(quickEditBug.status, status)"
          class="block"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm
                   text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-white/10
                   disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent
                   dark:disabled:hover:bg-transparent"
            :disabled="quickEditSaving || status === quickEditBug.status"
            @click="applyQuickStatus(status)"
          >
            {{ status }}
          </button>
        </span>
      </div>
    </Popover>

    <!-- report bug modal, no pre-filled context since this isn't coming from a failed run -->
    <LogBugModal v-model="reportModalOpen" @created="onBugCreated" />
  </div>
</template>