<script setup lang="ts">
// Step 7 of the workflow (Executive Insights): a single-source-of-truth
// view of coverage, pass rate, and active bug severity across the project.
// Every widget here is read-only, so like Requirements/Test Cases/Bugs
// there is no canManage gate -- every active user can view and filter it.
//
// extracted out of pages/index.vue unchanged so it can sit alongside
// DeveloperDashboard.vue as one of two role-based views pages/index.vue
// switches between; QA Lead, Tester, and Admin all still land here.

interface ModuleOption {
  id: number
  name: string
}

interface ReleaseOption {
  id: number
  version: string
}

interface DashboardResponse {
  range: { key: string; start: string; end: string }
  snapshot: {
    total_requirements: number
    covered_requirements: number
    total_test_cases: number
    automated_test_cases: number
    open_bugs: number
    open_critical_high: number
    source: 'snapshot' | 'live'
  }
  passRate: {
    total_executions: number
    passed_executions: number
    pass_rate: number
    source: 'snapshot' | 'live'
  }
  trend: { day: string; pass_count: number; fail_count: number; blocked_count: number }[]
  bugBreakdown: {
    bySeverity: { key: string; count: number }[]
    byStatus: { key: string; count: number }[]
  }
  requirementsBreakdown: { key: string; count: number }[]
  criticalBugs: {
    id: number
    title: string
    severity: 'Critical' | 'High'
    status: string
    reported_at: string
    module_name: string
  }[]
  recentExecutions: {
    id: number
    result: string
    execution_date: string
    notes: string | null
    test_case_title: string
    module_name: string
    executed_by_email: string
    release_version: string
  }[]
}

const dropdownPt = useDropdownPt()

// -- global filter bar --
const RANGE_OPTIONS = [
  { label: '7 Days', value: '7d' },
  { label: '14 Days', value: '14d' },
  { label: '30 Days', value: '30d' },
  { label: 'All Time', value: 'all' }
]
const selectedRange = ref('7d')

const { data: moduleOptionsData } = await useFetch<ModuleOption[]>('/api/modules')
const moduleOptions = computed(() => [{ id: null, name: 'All Modules' }, ...(moduleOptionsData.value ?? [])])

const { data: releaseOptionsData } = await useFetch<ReleaseOption[]>('/api/releases')
const releaseOptions = computed(() => [
  { id: null, version: 'All Releases' },
  ...(releaseOptionsData.value ?? [])
])

const { data: scopeData } = await useFetch<{ moduleIds: number[] }>('/api/dashboard/scope')
const myModuleIds = computed(() => scopeData.value?.moduleIds ?? [])
// "My Modules" only means something as a single-select default when the
// person is scoped to exactly one module -- with 0 or several, there is no
// single id this dropdown could represent, so the quick toggle is hidden
// and the dashboard just starts on "All Modules" instead of guessing.
const hasSingleModuleScope = computed(() => myModuleIds.value.length === 1)

const selectedModuleId = ref<number | null>(hasSingleModuleScope.value ? myModuleIds.value[0] : null)
const selectedReleaseId = ref<number | null>(null)

function useMyModules() {
  if (hasSingleModuleScope.value) {
    selectedModuleId.value = myModuleIds.value[0]
  }
}

function useAllModules() {
  selectedModuleId.value = null
}

const { data, pending: loading } = await useFetch<DashboardResponse>('/api/dashboard/metrics', {
  query: computed(() => ({
    range: selectedRange.value,
    ...(selectedModuleId.value ? { moduleId: selectedModuleId.value } : {}),
    ...(selectedReleaseId.value ? { releaseId: selectedReleaseId.value } : {})
  }))
})

const snapshot = computed(
  () =>
    data.value?.snapshot ?? {
      total_requirements: 0,
      covered_requirements: 0,
      total_test_cases: 0,
      automated_test_cases: 0,
      open_bugs: 0,
      open_critical_high: 0,
      source: 'live' as const
    }
)
const passRate = computed(() => data.value?.passRate ?? { total_executions: 0, passed_executions: 0, pass_rate: 0, source: 'live' as const })
const trend = computed(() => data.value?.trend ?? [])
const bugBreakdown = computed(() => data.value?.bugBreakdown ?? { bySeverity: [], byStatus: [] })
const requirementsBreakdown = computed(() => data.value?.requirementsBreakdown ?? [])
const criticalBugs = computed(() => data.value?.criticalBugs ?? [])
const recentExecutions = computed(() => data.value?.recentExecutions ?? [])

// -- derived KPI percentages --
const requirementCoveragePct = computed(() =>
  snapshot.value.total_requirements > 0
    ? Math.round((snapshot.value.covered_requirements / snapshot.value.total_requirements) * 100)
    : 0
)
const automationCoveragePct = computed(() =>
  snapshot.value.total_test_cases > 0
    ? Math.round((snapshot.value.automated_test_cases / snapshot.value.total_test_cases) * 100)
    : 0
)

// -- chart data mappers --
const trendPoints = computed(() =>
  trend.value.map((t) => ({ day: t.day, pass: t.pass_count, fail: t.fail_count, blocked: t.blocked_count }))
)

const SEVERITY_DONUT_CLASSES: Record<string, { stroke: string; dot: string }> = {
  Critical: { stroke: 'stroke-red-500', dot: 'bg-red-500' },
  High: { stroke: 'stroke-orange-500', dot: 'bg-orange-500' },
  Medium: { stroke: 'stroke-amber-500', dot: 'bg-amber-500' },
  Low: { stroke: 'stroke-blue-500', dot: 'bg-blue-500' }
}
const severitySegments = computed(() => {
  const bySeverity = new Map(bugBreakdown.value.bySeverity.map((s) => [s.key, s.count]))
  return ['Critical', 'High', 'Medium', 'Low'].map((severity) => ({
    label: severity,
    value: bySeverity.get(severity) ?? 0,
    colorClass: SEVERITY_DONUT_CLASSES[severity].stroke,
    dotClass: SEVERITY_DONUT_CLASSES[severity].dot
  }))
})

const STATUS_BAR_CLASSES: Record<string, { bar: string; dot: string }> = {
  Open: { bar: 'bg-blue-500', dot: 'bg-blue-500' },
  'In Progress': { bar: 'bg-amber-500', dot: 'bg-amber-500' },
  Retest: { bar: 'bg-indigo-500', dot: 'bg-indigo-500' }
}
const statusSegments = computed(() => {
  const byStatus = new Map(bugBreakdown.value.byStatus.map((s) => [s.key, s.count]))
  return ['Open', 'In Progress', 'Retest'].map((status) => ({
    label: status,
    value: byStatus.get(status) ?? 0,
    barClass: STATUS_BAR_CLASSES[status].bar,
    dotClass: STATUS_BAR_CLASSES[status].dot
  }))
})

const REQ_STATUS_CLASSES: Record<string, { bar: string; dot: string }> = {
  Draft: { bar: 'bg-gray-400', dot: 'bg-gray-400' },
  Approved: { bar: 'bg-sky-500', dot: 'bg-sky-500' },
  'In Testing': { bar: 'bg-amber-500', dot: 'bg-amber-500' },
  Done: { bar: 'bg-emerald-500', dot: 'bg-emerald-500' }
}
const requirementsSegments = computed(() => {
  const byStatus = new Map(requirementsBreakdown.value.map((s) => [s.key, s.count]))
  return ['Draft', 'Approved', 'In Testing', 'Done'].map((status) => ({
    label: status,
    value: byStatus.get(status) ?? 0,
    barClass: REQ_STATUS_CLASSES[status].bar,
    dotClass: REQ_STATUS_CLASSES[status].dot
  }))
})

function initials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

function bugCode(id: number) {
  return `BUG-${id.toString().padStart(3, '0')}`
}

const SEVERITY_TEXT_CLASSES: Record<string, string> = {
  Critical: 'text-red-600 dark:text-red-400',
  High: 'text-orange-600 dark:text-orange-400'
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// StatusBadge's alias map expects "Passed"/"Failed", not the raw db
// values "Pass"/"Fail" that test_executions.result actually stores.
// same translation executions/[id].vue already does before handing a
// result to StatusBadge, kept consistent here rather than touching the
// shared component's aliases.
function executionStatusKey(result: string): string {
  if (result === 'Pass') return 'Passed'
  if (result === 'Fail') return 'Failed'
  if (result === 'Blocked') return 'In Progress'
  return 'Not Started'
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        Executive Dashboard
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
        Coverage, pass rates, and active defects across the project.
      </p>
    </div>

    <!-- global filter bar -->
    <div class="flex flex-wrap items-center gap-3 rounded-lg border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-black">
      <div class="flex items-center gap-1.5">
        <BaseButton
          v-for="option in RANGE_OPTIONS"
          :key="option.value"
          :label="option.label"
          size="sm"
          :variant="selectedRange === option.value ? 'primary' : 'outline'"
          @click="selectedRange = option.value"
        />
      </div>

      <div class="h-6 w-px bg-black/10 dark:bg-white/10" />

      <Select
        v-model="selectedModuleId"
        :options="moduleOptions"
        option-label="name"
        option-value="id"
        placeholder="All Modules"
        class="w-44"
        :pt="dropdownPt"
      />
      <BaseButton
        v-if="hasSingleModuleScope"
        label="My Modules"
        size="sm"
        variant="outline"
        icon="pi pi-user"
        @click="useMyModules"
      />
      <BaseButton
        v-if="selectedModuleId !== null"
        label="All Modules"
        size="sm"
        variant="secondary"
        icon="pi pi-times"
        @click="useAllModules"
      />

      <Select
        v-model="selectedReleaseId"
        :options="releaseOptions"
        option-label="version"
        option-value="id"
        placeholder="All Releases"
        class="w-44"
        :pt="dropdownPt"
      />
    </div>

    <!-- 4 primary KPI cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Requirement Coverage"
        :value="`${requirementCoveragePct}%`"
        icon="pi pi-file-check"
        :trend-label="`${snapshot.covered_requirements} of ${snapshot.total_requirements} covered`"
        :trend="0"
      />

      <div class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
        <div class="flex items-start justify-between">
          <p class="text-sm font-medium text-gray-500 dark:text-white/60">Execution Pass Rate</p>
          <i class="pi pi-chart-line text-lg text-purple-600 dark:text-purple-400" />
        </div>
        <p class="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{{ passRate.pass_rate }}%</p>
        <AppProgressBar
          class="mt-3"
          :value="passRate.pass_rate"
          size="sm"
          :color="passRate.pass_rate >= 80 ? 'success' : passRate.pass_rate >= 50 ? 'warning' : 'danger'"
        />
        <p class="mt-2 text-xs text-gray-400 dark:text-zinc-500">
          {{ passRate.passed_executions }} of {{ passRate.total_executions }} executions
        </p>
      </div>

      <MetricCard
        label="Automation Coverage"
        :value="`${automationCoveragePct}%`"
        icon="pi pi-cog"
        :trend-label="`${snapshot.automated_test_cases} of ${snapshot.total_test_cases} automated`"
        :trend="0"
      />

      <div
        class="rounded-lg border p-5"
        :class="
          snapshot.open_critical_high > 0
            ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
            : 'border-black/10 bg-white dark:border-white/10 dark:bg-black'
        "
      >
        <div class="flex items-start justify-between">
          <p
            class="text-sm font-medium"
            :class="snapshot.open_critical_high > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-500 dark:text-white/60'"
          >
            Open Critical / High Bugs
          </p>
          <i
            class="pi pi-exclamation-triangle text-lg"
            :class="snapshot.open_critical_high > 0 ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'"
          />
        </div>
        <p
          class="mt-2 text-3xl font-semibold"
          :class="snapshot.open_critical_high > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'"
        >
          {{ snapshot.open_critical_high }}
        </p>
        <p class="mt-1 text-xs" :class="snapshot.open_critical_high > 0 ? 'text-red-600/80 dark:text-red-400/80' : 'text-gray-400 dark:text-zinc-500'">
          {{ snapshot.open_critical_high > 0 ? 'Needs attention' : 'Nothing urgent right now' }}
        </p>
      </div>
    </div>

    <!-- trend + severity donut -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="rounded-lg border border-black/10 bg-white p-5 lg:col-span-2 dark:border-white/10 dark:bg-black">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
          Test Execution Trend
        </p>
        <AppTrendChart :points="trendPoints" />
      </div>

      <div class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
          Active Bugs by Severity
        </p>
        <AppDonutChart :segments="severitySegments" empty-message="No active bugs in this scope." />
      </div>
    </div>

    <!-- status breakdowns -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
          Active Bugs by Status
        </p>
        <AppBreakdownBar :segments="statusSegments" empty-message="No Open, In Progress, or Retest bugs." />
      </div>

      <div class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
          Requirements Coverage Status
        </p>
        <AppBreakdownBar :segments="requirementsSegments" empty-message="No requirements in this scope." />
      </div>
    </div>

    <!-- watchlist + recent executions -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-black">
        <div class="border-b border-black/10 p-4 dark:border-white/10">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            Critical Bugs Watchlist
          </p>
        </div>
        <div v-if="criticalBugs.length === 0" class="p-6 text-center text-sm text-gray-400 dark:text-zinc-500">
          No active Critical or High bugs. Nice work.
        </div>
        <NuxtLink
          v-for="bug in criticalBugs"
          :key="bug.id"
          :to="`/bugs/${bug.id}`"
          class="flex items-center justify-between gap-3 border-b border-black/5 p-3 last:border-b-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ bug.title }}</p>
            <p class="text-xs text-gray-400 dark:text-zinc-500">
              {{ bugCode(bug.id) }} &middot; {{ bug.module_name }} &middot; {{ timeAgo(bug.reported_at) }}
            </p>
          </div>
          <span class="shrink-0 text-xs font-semibold" :class="SEVERITY_TEXT_CLASSES[bug.severity]">
            {{ bug.severity }}
          </span>
        </NuxtLink>
      </div>

      <div class="rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-black">
        <div class="border-b border-black/10 p-4 dark:border-white/10">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            Recent Executions
          </p>
        </div>
        <div v-if="recentExecutions.length === 0" class="p-6 text-center text-sm text-gray-400 dark:text-zinc-500">
          No executions recorded yet.
        </div>
        <div
          v-for="run in recentExecutions"
          :key="run.id"
          class="flex items-center justify-between gap-3 border-b border-black/5 p-3 last:border-b-0 dark:border-white/5"
        >
          <div class="flex min-w-0 items-center gap-2.5">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold
                     text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
            >
              {{ initials(run.executed_by_email) }}
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ run.test_case_title }}</p>
              <p class="text-xs text-gray-400 dark:text-zinc-500">
                {{ run.module_name }} &middot; {{ run.release_version }} &middot; {{ timeAgo(run.execution_date) }}
              </p>
            </div>
          </div>
          <StatusBadge :status="executionStatusKey(run.result)" size="sm" />
        </div>
      </div>
    </div>

    <p v-if="loading" class="text-center text-xs text-gray-400 dark:text-zinc-500">Refreshing...</p>
  </div>
</template>
