<script setup lang="ts">
// Release health hub for a single release. Different job from
// /executions/[id] (the execution workspace): this page is about the
// release's overall state — its scoped suite, its bugs, its history, and
// a rolled-up summary — not about running tests one at a time. "Run Test
// Suite" routes into that workspace rather than duplicating it here.
definePageMeta({ layout: 'default' })

interface ReleaseInfo {
  id: number
  version: string
  release_date: string | null
  created_at: string
}

interface HealthStats {
  total_test_cases: number
  executed_count: number
  passed_count: number
  failed_count: number
  blocked_count: number
  pass_rate: number
  open_bugs: number
  resolved_bugs: number
  open_blockers: number
}

interface TestCaseRow {
  id: number
  title: string
  module_id: number
  module_name: string
  priority: 'High' | 'Medium' | 'Low' | null
  type: string
  linked_release_ids: number[]
}

interface BugRow {
  id: number
  title: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  status: string
  owner_email: string | null
  module_name: string
}

interface ExecutionHistoryRow {
  id: number
  test_case_id: number
  test_case_title_snapshot: string | null
  result: 'Pass' | 'Fail' | 'Blocked' | 'Not Run'
  executed_by_email: string | null
  execution_date: string
  notes: string | null
}

const route = useRoute()
const toast = useToast()
const releaseId = Number(route.params.id)

const { data, refresh, pending: loading } = await useFetch<{
  release: ReleaseInfo
  stats: HealthStats
  testCases: TestCaseRow[]
  bugs: BugRow[]
  executions: ExecutionHistoryRow[]
}>(`/api/releases/${releaseId}`)

const release = computed(() => data.value?.release)
const stats = computed(() => data.value?.stats)
const bugs = computed(() => data.value?.bugs ?? [])
const executions = computed(() => data.value?.executions ?? [])

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// -- tabs --
const TABS = [
  { id: 'suite', label: 'Scoped Test Suite' },
  { id: 'bugs', label: 'Release Bug Board' },
  { id: 'history', label: 'Execution History' },
  { id: 'summary', label: 'Automated Release Summary' }
]
const activeTab = ref('suite')

// -- scoped test suite tab --
const scopedSearch = ref('')
const checkedIds = ref<Set<number>>(new Set())
const savingSuite = ref(false)
let suiteInitialized = false

watch(
  () => data.value?.testCases,
  (testCases) => {
    if (!testCases || suiteInitialized) return
    checkedIds.value = new Set(
      testCases.filter((tc) => tc.linked_release_ids.includes(releaseId)).map((tc) => tc.id)
    )
    suiteInitialized = true
  },
  { immediate: true }
)

const filteredTestCases = computed(() => {
  const list = data.value?.testCases ?? []
  const q = scopedSearch.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (tc) => tc.title.toLowerCase().includes(q) || tc.module_name.toLowerCase().includes(q)
  )
})

const suiteDirty = computed(() => {
  const original = new Set(
    (data.value?.testCases ?? [])
      .filter((tc) => tc.linked_release_ids.includes(releaseId))
      .map((tc) => tc.id)
  )
  if (original.size !== checkedIds.value.size) return true
  for (const id of original) {
    if (!checkedIds.value.has(id)) return true
  }
  return false
})

function toggleTestCase(id: number) {
  const next = new Set(checkedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  checkedIds.value = next
}

async function saveSuite() {
  savingSuite.value = true
  try {
    await $fetch(`/api/releases/${releaseId}/test-cases`, {
      method: 'POST',
      body: { testCaseIds: [...checkedIds.value] }
    })
    toast.add({ severity: 'success', summary: 'Scoped test suite updated', life: 3000 })
    suiteInitialized = false
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not update the scoped suite',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    savingSuite.value = false
  }
}

const PRIORITY_CLASSES: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30',
  Medium:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  Low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30'
}

// -- release bug board tab --
const SEVERITY_ORDER: BugRow['severity'][] = ['Critical', 'High', 'Medium', 'Low']
const bugsBySeverity = computed(() => {
  const groups: Record<string, BugRow[]> = { Critical: [], High: [], Medium: [], Low: [] }
  for (const bug of bugs.value) {
    groups[bug.severity]?.push(bug)
  }
  return groups
})

// -- edit release modal --
const editOpen = ref(false)
const saving = ref(false)
const editForm = reactive({ releaseDate: '' })

function openEdit() {
  if (!release.value) return
  editForm.releaseDate = release.value.release_date ?? ''
  editOpen.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    await $fetch(`/api/releases/${releaseId}`, {
      method: 'PUT',
      body: {
        releaseDate: editForm.releaseDate || null
      }
    })
    toast.add({ severity: 'success', summary: 'Release updated', life: 3000 })
    editOpen.value = false
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not update this release',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- header -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/releases"
          class="flex h-8 w-8 items-center justify-center rounded-md text-gray-500
                 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-white/5"
          aria-label="Back to releases"
        >
          <i class="pi pi-arrow-left text-sm" />
        </NuxtLink>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ release?.version ?? '—' }}
            </h1>
          </div>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
            Target date: {{ formatDate(release?.release_date ?? null) }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" label="Edit" icon="pi pi-pencil" @click="openEdit" />
        <BaseButton
          label="Run Test Suite"
          variant="primary"
          icon="pi pi-play"
          @click="navigateTo(`/executions/${releaseId}`)"
        />
      </div>
    </div>

    <div v-if="loading" class="p-8 text-center text-sm text-gray-400">Loading...</div>

    <AppTabs v-else v-model="activeTab" :tabs="TABS">
      <!-- Scoped Test Suite -->
      <template #tab-suite>
        <div class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <IconField icon-position="left" class="w-full max-w-xs">
              <InputIcon class="pi pi-search" />
              <InputText
                v-model="scopedSearch"
                placeholder="Search test cases..."
                class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
              />
            </IconField>
            <BaseButton
              label="Save Changes"
              variant="primary"
              :disabled="!suiteDirty"
              :loading="savingSuite"
              @click="saveSuite"
            />
          </div>

          <div class="rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-black">
            <div
              v-if="filteredTestCases.length === 0"
              class="p-8 text-center text-sm text-gray-500 dark:text-white/50"
            >
              No test cases match.
            </div>
            <ul v-else class="divide-y divide-black/5 dark:divide-white/5">
              <li
                v-for="tc in filteredTestCases"
                :key="tc.id"
                class="flex items-center gap-3 px-4 py-2.5"
              >
                <Checkbox
                  :model-value="checkedIds.has(tc.id)"
                  binary
                  @update:model-value="toggleTestCase(tc.id)"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {{ tc.title }}
                  </p>
                  <div class="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600
                             dark:bg-white/10 dark:text-zinc-300"
                    >
                      {{ tc.module_name }}
                    </span>
                    <span
                      v-if="tc.priority"
                      class="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                      :class="PRIORITY_CLASSES[tc.priority]"
                    >
                      {{ tc.priority }}
                    </span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <!-- Release Bug Board -->
      <template #tab-bugs>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="severity in SEVERITY_ORDER"
            :key="severity"
            class="rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-black"
          >
            <div class="flex items-center justify-between border-b border-black/10 p-3 dark:border-white/10">
              <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ severity }}</span>
              <span class="text-xs text-gray-400 dark:text-zinc-500">
                {{ bugsBySeverity[severity].length }}
              </span>
            </div>
            <div v-if="bugsBySeverity[severity].length === 0" class="p-4 text-center text-xs text-gray-400 dark:text-zinc-500">
              No bugs.
            </div>
            <ul v-else class="divide-y divide-black/5 dark:divide-white/5">
              <li v-for="bug in bugsBySeverity[severity]" :key="bug.id" class="space-y-1.5 p-3">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ bug.title }}</p>
                <div class="flex flex-wrap items-center gap-1.5">
                  <StatusBadge :status="bug.status" size="sm" />
                  <span class="text-xs text-gray-400 dark:text-zinc-500">{{ bug.module_name }}</span>
                </div>
                <p v-if="bug.owner_email" class="text-xs text-gray-400 dark:text-zinc-500">
                  Owner: {{ bug.owner_email }}
                </p>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <!-- Execution History -->
      <template #tab-history>
        <AppDataTable
          :value="executions"
          :columns="[
            { field: 'test_case_title_snapshot', header: 'Test Case' },
            { field: 'result', header: 'Result', sortable: true },
            { field: 'executed_by_email', header: 'Executed By' },
            { field: 'execution_date', header: 'Date', sortable: true },
            { field: 'notes', header: 'Notes' }
          ]"
          search-placeholder="Search execution history..."
          empty-message="No executions recorded yet for this release."
          data-key="id"
        >
          <template #cell-result="{ data: row }">
            <StatusBadge
              :status="row.result === 'Not Run' ? 'Not Started' : row.result === 'Pass' ? 'Passed' : row.result === 'Fail' ? 'Failed' : 'In Progress'"
              size="sm"
            />
          </template>
          <template #cell-executed_by_email="{ data: row }">
            <span class="text-sm text-gray-600 dark:text-zinc-300">{{ row.executed_by_email ?? '—' }}</span>
          </template>
          <template #cell-execution_date="{ data: row }">
            <span class="text-sm text-gray-600 dark:text-zinc-300">
              {{ new Date(row.execution_date).toLocaleString() }}
            </span>
          </template>
          <template #cell-notes="{ data: row }">
            <span class="text-sm text-gray-600 dark:text-zinc-300">{{ row.notes || '—' }}</span>
          </template>
        </AppDataTable>
      </template>

      <!-- Automated Release Summary -->
      <template #tab-summary>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Scoped Test Cases" :value="stats?.total_test_cases ?? 0" icon="pi pi-list-check" />
          <MetricCard
            label="Pass Rate"
            :value="stats?.executed_count ? `${stats.pass_rate}%` : '—'"
            icon="pi pi-chart-line"
          />
          <MetricCard label="Open Bugs" :value="stats?.open_bugs ?? 0" icon="pi pi-exclamation-circle" />
          <MetricCard label="Resolved Bugs" :value="stats?.resolved_bugs ?? 0" icon="pi pi-check-circle" />
        </div>
      </template>
    </AppTabs>

    <BaseModal v-model="editOpen" title="Edit Release" width="30rem">
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
            Release Date
          </label>
          <input
            v-model="editForm.releaseDate"
            type="date"
            class="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm
                   text-gray-900 outline-none transition-colors
                   focus:border-purple-500 focus:ring-1 focus:ring-purple-500
                   dark:border-white/10 dark:text-white dark:[color-scheme:dark]"
          />
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" label="Cancel" @click="editOpen = false" />
        <BaseButton variant="primary" label="Save" :loading="saving" @click="saveEdit" />
      </template>
    </BaseModal>
  </div>
</template>
