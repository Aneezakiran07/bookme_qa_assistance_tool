<script setup lang="ts">
// streamlined "my queue" view for the Developer role: 4 summary cards,
// a table of bugs assigned to me with a direct status dropdown, and a
// compact module hotspot list. Everything here is scoped server-side to
// the signed-in developer (see server/api/dashboard/developer.get.ts) --
// there is no module/release filter bar like the QA/Admin dashboard,
// this view only ever shows "my stuff".

interface DeveloperBugRow {
  id: number
  title: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  status: string
  module_id: number
  module_name: string
  last_status_change_at: string
}

interface DeveloperHotspot {
  module_id: number
  module_name: string
  count: number
}

interface DeveloperSummary {
  my_open_bugs: number
  critical_high_open: number
  pending_retest: number
  resolved_today: number
}

interface DeveloperDashboardResponse {
  summary: DeveloperSummary
  bugs: DeveloperBugRow[]
  hotspots: DeveloperHotspot[]
}

const toast = useToast()
const dropdownPt = useDropdownPt()

const { data, refresh, pending: loading } = await useFetch<DeveloperDashboardResponse>('/api/dashboard/developer')

const summary = computed(
  () => data.value?.summary ?? { my_open_bugs: 0, critical_high_open: 0, pending_retest: 0, resolved_today: 0 }
)
const bugs = computed(() => data.value?.bugs ?? [])
const hotspots = computed(() => data.value?.hotspots ?? [])
const maxHotspotCount = computed(() => Math.max(1, ...hotspots.value.map((h) => h.count)))

// same fabricated "BUG-001" label used everywhere else in the app
// (bugs/index.vue, the executive dashboard's watchlist); AppDataTable's
// sortField lets the "Bug ID" column still sort by the real id column
function bugCode(id: number) {
  return `BUG-${id.toString().padStart(3, '0')}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// same palette bugs/index.vue uses for its severity pills, kept
// identical so a bug looks the same whether you're looking at your own
// queue here or the full tracker there
const SEVERITY_CLASSES: Record<string, string> = {
  Critical:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30 animate-pulse',
  High: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30',
  Medium:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  Low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
}

const columns = [
  { field: 'bug_id', sortField: 'id', header: 'Bug ID', sortable: true },
  { field: 'title', header: 'Title' },
  { field: 'severity', header: 'Severity', sortable: true },
  { field: 'module_name', header: 'Module', sortable: true },
  { field: 'status', header: 'Status' },
  { field: 'updated_at', sortField: 'last_status_change_at', header: 'Updated', sortable: true }
]

// per-row saving flag, keyed by bug id, so updating one row's status
// doesn't disable every dropdown in the table while it saves
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
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        My Dashboard
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
        Bugs assigned to you, and where they're concentrated.
      </p>
    </div>

    <!-- 4 summary cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="My Assigned Open Bugs"
        :value="summary.my_open_bugs"
        icon="pi pi-inbox"
      />

      <div
        class="rounded-lg border p-5"
        :class="
          summary.critical_high_open > 0
            ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
            : 'border-black/10 bg-white dark:border-white/10 dark:bg-black'
        "
      >
        <div class="flex items-start justify-between">
          <p
            class="text-sm font-medium"
            :class="summary.critical_high_open > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-500 dark:text-white/60'"
          >
            Critical / High Blockers
          </p>
          <i
            class="pi pi-exclamation-triangle text-lg"
            :class="summary.critical_high_open > 0 ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'"
          />
        </div>
        <p
          class="mt-2 text-3xl font-semibold"
          :class="summary.critical_high_open > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'"
        >
          {{ summary.critical_high_open }}
        </p>
      </div>

      <MetricCard
        label="Pending Re-Test / Verification"
        :value="summary.pending_retest"
        icon="pi pi-refresh"
      />

      <MetricCard
        label="Bugs Resolved Today"
        :value="summary.resolved_today"
        icon="pi pi-check-circle"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- my assigned bugs table -->
      <div class="lg:col-span-2">
        <AppDataTable
          :value="bugs"
          :columns="columns"
          :loading="loading"
          search-placeholder="Search my bugs..."
          empty-message="No open bugs assigned to you. Nice work."
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

          <template #cell-updated_at="{ data: row }">
            <span class="text-sm text-gray-500 dark:text-zinc-400">{{ formatDate(row.last_status_change_at) }}</span>
          </template>

          <template #actions="{ data: row }">
            <BaseButton
              variant="outline"
              size="sm"
              icon="pi pi-arrow-right"
              @click="navigateTo(`/bugs/${row.id}`)"
            />
          </template>
        </AppDataTable>
      </div>

      <!-- defect hotspots / module breakdown -->
      <div class="rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-black">
        <div class="border-b border-black/10 p-4 dark:border-white/10">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            Defect Hotspots
          </p>
        </div>
        <div v-if="hotspots.length === 0" class="p-6 text-center text-sm text-gray-400 dark:text-zinc-500">
          No open bugs assigned to you yet.
        </div>
        <div v-else class="space-y-3 p-4">
          <div v-for="hotspot in hotspots" :key="hotspot.module_id">
            <div class="mb-1 flex items-center justify-between text-sm">
              <span class="font-medium text-gray-900 dark:text-white">{{ hotspot.module_name }}</span>
              <span class="text-gray-500 dark:text-zinc-400">{{ hotspot.count }}</span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              <div
                class="h-full rounded-full bg-purple-500"
                :style="{ width: `${Math.round((hotspot.count / maxHotspotCount) * 100)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-if="loading" class="text-center text-xs text-gray-400 dark:text-zinc-500">Refreshing...</p>
  </div>
</template>
